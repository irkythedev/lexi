// AIAssistPanel — 轻量 AI 学习面板（无自由输入）。
// 嵌入在 Learn/Reading/Session 等学习区域，单按钮一次生成学习卡片
// （释义/用法/例句/考点），模型输出结构化 JSON，前端按类型渲染：
//   type:"speak" 段 = 整段一个朗读按钮（完整词/短语/句子），文本不可再拆。
// 桌面端为可拖拽/缩放的浮窗，移动端为底部 sheet。
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, ShieldCheck, HelpCircle } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import {
  loadConfig, streamChat, buildSystemPrompt, studyCardPrompt, followUpPrompt, isNetworkError, isReasoningModel,
  parseStudyCard, type StudyCard, type StudySegment,
} from '../lib/ai.ts';
import { addTokenUsage, estimateTokens } from '../lib/token-usage.ts';
import { upsertAiNote, appendAiNoteChain } from '../db/db.ts';
import SpeakButton from './SpeakButton.tsx';
import { t } from '../lib/i18n.ts';
import WordHighlight from './WordHighlight.tsx';
import DisclaimerDialog from './DisclaimerDialog.tsx';

export interface AssistContext {
  label: string;       // 当前词/句/课文标题
  meaning?: string;    // 释义（可选）
  kind?: string;       // vocab | phrase | pattern | notes | reading
  mode?: 'word' | 'reading'; // reading = 整篇课文导读（prompt-v3.3），不复用词卡口径
  quote?: string;      // 教材原文例句（可选，命中课文时 AI 例句优先采用）
  extra?: string;      // 额外上下文（课文/注释原文，经 passage 通道下发，不进词表标签）
  fullText?: string;   // reading 模式：课文 paragraphs 全文（按字数超限截断在 prompt 内处理）
  unitWords?: string[]; // 本单元词表（词+短语），用于讲解对齐与例句 i+1 约束
  notesBrief?: string[]; // reading 模式（prompt-v3.5）：本单元 Notes 短列表（序号+quote/中文要点，不含 expl 全文）
  grade?: number;      // 年级（学段锚定：≥10 高中，否则初中）
  unitTitle?: string;  // 单元标题
}

/** 追问链视图（prompt-v3.1）：每层答案入栈缓存。segment/probe 记录生成该层的来源
 *  （主卡为空串），用于"点同一 chip 直接回看缓存"的命中判断与面包屑展示。 */
interface ChainView { card: StudyCard; segment: string; probe: string; }

/** 朗读按钮：整段一个喇叭 + 文本同行，中间不拆。
 *  统一走 SpeakButton（全局状态机）：合成中 Loader 不可点、播放中 Pause=停止。 */
function SpeakInline({ text, accent, rate, fontSize = 'inherit', bold = false }: {
  text: string; accent: 'us' | 'uk'; rate: number; fontSize?: string; bold?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <SpeakButton text={text.trim()} accent={accent} rate={rate} size={12} compact className="h-5 w-5" />
      <span className={bold ? 'font-semibold text-[var(--color-text)]' : ''} style={{ fontSize }}>{text}</span>
    </span>
  );
}

/** 学习卡片展示（AI 面板与讲义本回放共用）。onProbe：点击段上的追问 chip（probe 非空时才渲染）。
 *  variant='reading'：课文导读四段标签（主旨/脉络/好句/难词难句），不显示词卡的「释义/考点」。 */
export function StudyCardView({ card, accent, rate, highlight, onProbe, variant }: { card: StudyCard; accent: 'us' | 'uk'; rate: number; highlight?: string; onProbe?: (segText: string, probe: string) => void; variant?: 'word' | 'reading' }) {
  const locale = useAppStore((s) => s.locale);
  const reading = variant === 'reading';
  const labels = reading
    ? { def: t('aiGuideGist', locale), usage: t('aiGuideFlow', locale), example: t('aiGuideQuote', locale), exam: t('aiGuideHard', locale) }
    : { def: t('aiCardDefinition', locale), usage: t('aiCardUsage', locale), example: t('aiCardExample', locale), exam: t('aiCardExam', locale) };

  const renderSeg = (s: StudySegment, i: number) => (
    <li key={i} className="text-[calc(14px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]">
      {s.type === 'speak'
        ? <SpeakInline text={s.text} accent={accent} rate={rate} bold />
        : <span>{s.text}</span>}
      {s.probe && onProbe && (
        <button
          onClick={() => onProbe(s.text, s.probe!)}
          className="press mt-1 flex w-full items-start gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-ai)]/40 bg-[var(--color-ai)]/[0.06] px-2.5 py-1.5 text-left"
        >
          <HelpCircle size={13} strokeWidth={2.25} className="mt-0.5 shrink-0" style={{ color: 'var(--color-ai)' }} />
          <span className="text-[calc(12.5px*var(--type-scale))] leading-snug" style={{ color: 'var(--color-ai)' }}>{s.probe}</span>
        </button>
      )}
    </li>
  );

  return (
    <div className="space-y-3">
      {/* 释义 / 导读主旨 */}
      <div>
        <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{labels.def}</div>
        <p className="mt-0.5 text-[calc(14.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{card.definition}</p>
      </div>

      {/* 用法 / 段落脉络 */}
      {card.usage.length > 0 && (
        <div>
          <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{labels.usage}</div>
          <ul className="mt-1 space-y-1">
            {card.usage.map(renderSeg)}
          </ul>
        </div>
      )}

      {/* 例句 / 原文好句（整句一个按钮） */}
      {card.example.en && (
        <div>
          <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{labels.example}</div>
          <div className="mt-1 flex items-start gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-2.5">
            <SpeakButton text={card.example.en.trim()} accent={accent} rate={rate} size={13} compact className="mt-0.5 h-6 w-6" color="var(--color-accent)" />
            <div className="min-w-0">
              <p className="text-[calc(14.5px*var(--type-scale))] font-medium leading-relaxed text-[var(--color-text)]"><WordHighlight text={card.example.en} word={highlight ?? card.word} /></p>
              {card.example.zh && <p className="mt-0.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{card.example.zh}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 考点 / 难词难句 */}
      {card.examTips.length > 0 && (
        <div>
          <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{labels.exam}</div>
          <ul className="mt-1 space-y-1">
            {card.examTips.map(renderSeg)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AiAssistPanel({
  open, onClose, context,
}: {
  open: boolean;
  onClose: () => void;
  context: AssistContext | null;
}) {
  const { locale, unit, selection } = useAppStore();
  const cfg = loadConfig();
  const [card, setCard] = useState<StudyCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tokens, setTokens] = useState(0); // 本次打开面板的会话累计（估算）
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  // 追问链（prompt-v3.1）：views 缓存链上每层答案（index 0=主卡），idx 为当前查看层。
  // 回看走缓存不发请求；主卡/切词/关面板整体清空。
  const [views, setViews] = useState<ChainView[]>([]);
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 桌面浮窗位置/尺寸（拖拽缩放）
  const [win, setWin] = useState({ x: 0, y: 0, w: 380, h: 520, dragging: false, resizing: false });
  const dragStart = useRef({ x: 0, y: 0, wx: 0, wy: 0 });

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [card, busy]);
  useEffect(() => { if (!open) { setCard(null); setBusy(false); setErr(''); setTokens(0); setViews([]); setIdx(0); } }, [open]);

  // 讲义本去重键：edition:unit:kind:label（ReadingView 场景 selection 由 Learn 单元入口保证非空）。
  // reading 模式（课文导读）不入讲义本：不与词/短语/句式/注释卡混列（prompt-v3.3 拍板）。
  const noteKey = context && context.mode !== 'reading' && unit && selection
    ? `${selection.editionId}:u${selection.unit}:${context.kind ?? 'vocab'}:${context.label}`
    : null;

  // 统一请求入口：mode='study' 主卡 / mode='follow' 追问（prompt-v3）
  const requestCard = useCallback(async (mode: 'study' | 'follow', parent?: { segment: string; probe: string; depth: number }) => {
    if (!cfg || busy || !context) return;
    setBusy(true); setErr(''); setCard(null);
    if (mode === 'study') { setViews([]); setIdx(0); } // 主卡/重试/切词：追问链归零
    const msg = mode === 'follow' && parent
      ? followUpPrompt(parent.segment, parent.probe, context.label, parent.depth)
      : studyCardPrompt(context.label, context.meaning, context.kind, context.quote, context.unitWords, { mode: context.mode, fullText: context.fullText });
    // prompt-v3.2 knowledge 通道分离：词表进 knowledge（词表标签），课文/注释原文进
    // passage（原句标签）。废除 v1 的 `extra ?? 词表字符串` 混装——曾把整段课文
    // 标注成「当前单元词表」，模型据此错判语料性质。
    // reading 模式（v3.3）：课文全文走 user prompt（studyCardPrompt fullText），
    // system 的 passage 通道留空，避免同一篇课文在 system/user 里重复占 token。
    // prompt-v3.5 三语料三标签：词表→knowledge（「本单元词表」）、Notes 短列表→notes
    // （「本单元注释要点」）、课文全文→user prompt（「课文原文」），禁止混用同一字段。
    const unitWordsStr = context.unitWords?.length ? `本单元词表：${context.unitWords.slice(0, 40).join('、')}` : undefined;
    const notesStr = context.mode === 'reading' && context.notesBrief?.length
      ? context.notesBrief.join('\n')
      : undefined;
    const knowledge = unit
      ? [unitWordsStr].filter(Boolean).join('\n') || undefined
      : unitWordsStr;
    const passage = context.mode === 'reading' ? undefined : (context.extra ?? context.quote);
    const sysPrompt = buildSystemPrompt({ unitTitle: unit?.title ?? context.unitTitle, knowledge, notes: notesStr, passage, mode: context.mode, grade: context.grade });
    setTokens((n) => n + estimateTokens(sysPrompt) + estimateTokens(msg));
    addTokenUsage(cfg.model, estimateTokens(sysPrompt) + estimateTokens(msg));
    try {
      let full = '';
      let failure: string | null = null;
      let timedOut = false;
      let reasoningChars = 0;
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
        const timer = setTimeout(() => { timedOut = true; done(); }, 60000);
        streamChat({
          cfg, systemPrompt: sysPrompt,
          userMessage: msg,
          maxTokens: 1800, // 卡片 JSON + probe；推理类模型 streamChat 内部自动翻倍
          onChunk: (_d, f) => { full = f; },
          onEnd: (f, meta) => { full = f; reasoningChars = meta.reasoningChars; done(); },
          onError: (e) => { failure = e.message || String(e); done(); }, // HTTP/网络错误直达用户（prompt-v3）
        });
      });
      setTokens((n) => n + estimateTokens(full));
      addTokenUsage(cfg.model, estimateTokens(full));
      if (timedOut) setErr(t('aiBusyGone', locale));
      else if (failure) setErr(failure);
      else {
        const parsed = parseStudyCard(full);
        if (parsed) {
          setCard(parsed);
          if (mode === 'follow' && parent) {
            // 新答案入链缓存并跳到该层；更深层的旧缓存（回看后另点别的 probe 产生分叉）一并截断
            const next = { card: parsed, segment: parent.segment, probe: parent.probe };
            setViews((vs) => [...vs.slice(0, parent.depth), next]);
            setIdx(parent.depth);
            if (noteKey) void appendAiNoteChain(noteKey, { segment: parent.segment, probe: parent.probe, card: parsed });
          } else {
            setViews([{ card: parsed, segment: '', probe: '' }]);
            setIdx(0);
            // 主卡入讲义本（默认开，仅存本机；追问链随主卡清零）
            if (noteKey) {
              void upsertAiNote({
                key: noteKey,
                editionId: selection!.editionId,
                unit: selection!.unit,
                unitTitle: unit?.title ?? context.unitTitle ?? '',
                label: context.label,
                kind: context.kind ?? 'vocab',
                meaning: context.meaning ?? '',
                card: parsed,
                chain: [],
                model: cfg.model,
              });
            }
          }
        } else if (!full.trim()) {
          // 空回复分流（prompt-v3.4）：有思考痕迹或模型名像推理类 → 现有推理耗尽文案；
          // 普通模型 → 短句不点名 deepseek-reasoner。AbortError 已在 streamChat 内静默。
          setErr(reasoningChars > 0 || isReasoningModel(cfg.model)
            ? t('aiEmptyReply', locale)
            : t('aiEmptyReplyGeneric', locale));
        } else setErr(t('aiCardParseError', locale));
      }
    } catch (e) {
      setErr(isNetworkError((e as Error).message) ? t('aiNetUnreachable', locale) : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [cfg, busy, context, unit, selection, noteKey, locale]);

  const study = useCallback(() => requestCard('study'), [requestCard]);

  // 点 probe chip：目标层已缓存 → 直接回看（零请求）；未缓存 → 发起追问。
  // 链深限 2：depth 2 的追问答案不再渲染 probe（onProbe 传 undefined）。
  const onProbe = useCallback((segment: string, probe: string) => {
    if (busy) return;
    const hit = views.findIndex((v, i) => i > 0 && i <= idx + 1 && v.probe === probe && v.segment === segment);
    if (hit > 0) { setIdx(hit); return; }
    if (idx >= 2) return;
    void requestCard('follow', { segment, probe, depth: idx + 1 });
  }, [busy, views, idx, requestCard]);

  // 打开即自动生成学习卡片（词条切换时自动再来一张）。
  // reading 例外：关掉再开同一课文（autoKey 相同）面板会空白，此时重新生成。
  const autoKey = open ? context?.label : undefined;
  const lastAutoKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    const reading = context?.mode === 'reading';
    if (open && autoKey && (autoKey !== lastAutoKey.current || (reading && !card && !busy && !err))) {
      lastAutoKey.current = autoKey;
      void study();
    }
  }, [open, autoKey, study, context?.mode, card, busy, err]);

  // 拖拽 / 缩放（桌面端 pointer 事件）
  const startDrag = (e: React.PointerEvent) => {
    if (window.innerWidth < 640) return;
    dragStart.current = { x: e.clientX, y: e.clientY, wx: win.x, wy: win.y };
    setWin((w) => ({ ...w, dragging: true }));
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!win.dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setWin((w) => ({ ...w, x: Math.max(-w.w / 2, Math.min(window.innerWidth - 80, dragStart.current.wx + dx)), y: Math.max(0, Math.min(window.innerHeight - 48, dragStart.current.wy + dy)) }));
  };
  const startResize = (e: React.PointerEvent) => {
    if (window.innerWidth < 640) return;
    dragStart.current = { x: e.clientX, y: e.clientY, wx: win.w, wy: win.h };
    setWin((w) => ({ ...w, resizing: true }));
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!win.resizing) return;
    const w = Math.max(320, Math.min(window.innerWidth - 40, dragStart.current.wx + (e.clientX - dragStart.current.x)));
    const h = Math.max(280, Math.min(window.innerHeight - 40, dragStart.current.wy + (e.clientY - dragStart.current.y)));
    setWin((s) => ({ ...s, w, h }));
  };
  const endGesture = () => setWin((w) => ({ ...w, dragging: false, resizing: false }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:bg-black/30 sm:backdrop-blur-[1px]" onClick={() => { if (window.innerWidth >= 640 && !showDisclaimer) onClose(); }}>
      {/* 桌面：可拖拽浮窗；移动：底部 sheet */}
      <div
        className={`fixed z-10 flex flex-col border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)]
          ${window.innerWidth < 640
            ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-[var(--radius-lg)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]'
            : 'rounded-[var(--radius-lg)]'}`}
        style={window.innerWidth >= 640 ? { left: win.x, top: win.y, width: win.w, height: win.h, cursor: win.dragging ? 'grabbing' : 'default' } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('aiStudyTitle', locale)}
      >
        {/* 头部（拖拽手柄） */}
        <div
          onPointerDown={startDrag}
          onPointerMove={onDragMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0 select-none"
          style={{ cursor: 'grab' }}
        >
          <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">
            <Sparkles size={16} strokeWidth={2.5} className="ai-breathe" style={{ color: 'var(--color-ai)' }} /> {t('aiStudyTitle', locale)}
            {context && <span className="truncate text-[calc(12px*var(--type-scale))] font-normal text-[var(--color-text-2)]">· {context.label}</span>}
          </h2>
          <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
        </div>

        {/* 未配置 */}
        {!cfg ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="px-4 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiNotConfigured', locale)}</p>
            <a href="/ai" className="press inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-white">{t('aiConfigure', locale)}</a>
          </div>
        ) : (
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-2">
            {busy && !card && (
              <div className="flex items-center gap-2 p-2"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)' }} /><span className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiStudyBusy', locale)}</span></div>
            )}
            {/* 追问链面包屑：主卡 + 各层追问，点任意一级直接回看缓存（不发请求） */}
            {views.length > 1 && (
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[calc(12px*var(--type-scale))]">
                <button
                  onClick={() => setIdx(0)}
                  className="press font-semibold"
                  style={{ color: 'var(--color-ai)', opacity: idx === 0 ? 1 : 0.55 }}
                >
                  {context?.label}
                </button>
                {views.slice(1).map((v, i) => (
                  <span key={i} className="inline-flex min-w-0 items-center gap-1">
                    <span className="text-[var(--color-text-3)]">›</span>
                    <button
                      onClick={() => setIdx(i + 1)}
                      className="press max-w-[46vw] truncate sm:max-w-[240px]"
                      style={{ color: 'var(--color-ai)', opacity: idx === i + 1 ? 1 : 0.55 }}
                      title={v.probe}
                    >
                      {v.probe}
                    </button>
                  </span>
                ))}
              </div>
            )}
            {card && <StudyCardView card={card} accent={useAppStore.getState().tts.accent} rate={useAppStore.getState().tts.rate} highlight={context?.label} onProbe={idx >= 2 ? undefined : onProbe} variant={context?.mode === 'reading' ? 'reading' : 'word'} />}
            {err && (
              <div className="min-w-0 rounded-[var(--radius-md)] bg-[var(--color-trap-soft)] p-3">
                <p className="max-h-40 overflow-y-auto break-all text-[calc(12.5px*var(--type-scale))] leading-relaxed text-[var(--color-trap)]" style={{ overflowWrap: 'anywhere' }}>{err}</p>
                <button onClick={() => void study()} className="press mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-3.5 py-1.5 text-[calc(12.5px*var(--type-scale))] font-semibold text-[var(--color-text)]">
                  <Sparkles size={13} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} /> {t('aiRetry', locale)}
                </button>
              </div>
            )}
            {card && idx === 0 && (
              <button onClick={() => { setCard(null); void study(); }} className="press text-[calc(12px*var(--type-scale))] text-[var(--color-accent)]">{t('aiAskAgain', locale)}</button>
            )}
          </div>
        )}

        {/* 底部常驻条：免责 + 模型 + 本次会话 token 估算（米纸墨线转译 stem 同款结构） */}
        {cfg && (
          <div className="shrink-0 border-t-2 border-[var(--color-hairline)] px-4 pb-1 pt-2">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowDisclaimer(true)}
                className="press flex min-w-0 flex-1 items-center gap-1.5 text-left text-[calc(11px*var(--type-scale))] leading-snug text-[var(--color-text-3)]"
                title={t('disclaimerAiTitle', locale)}
              >
                <ShieldCheck size={12} strokeWidth={2.25} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{t('aiStripDisclaimer', locale)}</span>
              </button>
              <p className="flex shrink-0 items-center gap-2 tabular-nums whitespace-nowrap">
                {cfg.model && <span className="max-w-[38vw] truncate text-[calc(11px*var(--type-scale))] font-semibold text-[var(--color-ai)]">{cfg.model}</span>}
                {tokens > 0 && (
                  <span className="text-[calc(11px*var(--type-scale))] text-[var(--color-text-2)]">
                    {t('aiStripTokens', locale, { count: tokens.toLocaleString() })}
                    {busy && <span className="text-[var(--color-text-3)]"> · {t('aiStripGenerating', locale)}</span>}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {showDisclaimer && <DisclaimerDialog onClose={() => setShowDisclaimer(false)} />}

        {/* 桌面缩放手柄 */}
        {window.innerWidth >= 640 && (
          <div
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            className="absolute bottom-1 right-1 h-4 w-4 cursor-nwse-resize opacity-40"
            style={{ background: 'linear-gradient(135deg, transparent 50%, var(--color-text-3) 50%)' }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}