// AIAssistPanel — 轻量 AI 学习面板（无自由输入）。
// 嵌入在 Learn/Reading/Session 等学习区域，单按钮一次生成学习卡片
// （释义/用法/例句/考点），模型输出结构化 JSON，前端按类型渲染：
//   type:"speak" 段 = 整段一个朗读按钮（完整词/短语/句子），文本不可再拆。
// 桌面端为可拖拽/缩放的浮窗，移动端为底部 sheet。
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, Volume2, Pause } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import {
  loadConfig, streamChat, buildSystemPrompt, studyCardPrompt, isNetworkError,
  parseStudyCard, type StudyCard,
} from '../lib/ai.ts';
import { useSpeak } from '../lib/useSpeak.ts';
import { t } from '../lib/i18n.ts';
import WordHighlight from './WordHighlight.tsx';

export interface AssistContext {
  label: string;       // 当前词/句
  meaning?: string;    // 释义（可选）
  kind?: string;       // vocab | phrase | pattern
  quote?: string;      // 教材原文例句（可选，命中课文时 AI 例句优先采用）
  extra?: string;      // 额外上下文（如课文段落）
}

/** 朗读按钮：整段一个喇叭 + 文本同行，中间不拆。 */
function SpeakInline({ text, accent, rate, size = 12, fontSize = 'inherit', bold = false }: {
  text: string; accent: 'us' | 'uk'; rate: number; size?: number; fontSize?: string; bold?: boolean;
}) {
  const locale = useAppStore((s) => s.locale);
  const { speak, stop, state: ttsState } = useSpeak();
  const active = ttsState === 'playing' || ttsState === 'synthesizing';
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <button
        onClick={() => { if (active) stop(); else speak(text.trim(), { accent, rate, lang: 'en' }); }}
        className="press inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--color-accent)] opacity-80 hover:opacity-100"
        aria-label={t('listenAgain', locale)}
        title={text.trim().slice(0, 60)}
      >
        {ttsState === 'synthesizing' ? <Loader2 size={size} className="animate-spin" /> : (active ? <Pause size={size} className="animate-pulse" /> : <Volume2 size={size} />)}
      </button>
      <span className={bold ? 'font-semibold text-[var(--color-text)]' : ''} style={{ fontSize }}>{text}</span>
    </span>
  );
}

/** 学习卡片展示。 */
function StudyCardView({ card, accent, rate, highlight }: { card: StudyCard; accent: 'us' | 'uk'; rate: number; highlight?: string }) {
  const locale = useAppStore((s) => s.locale);
  const { speak, stop, state: ttsState } = useSpeak();
  const active = ttsState === 'playing' || ttsState === 'synthesizing';

  return (
    <div className="space-y-3">
      {/* 释义 */}
      <div>
        <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('aiCardDefinition', locale)}</div>
        <p className="mt-0.5 text-[calc(14.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{card.definition}</p>
      </div>

      {/* 用法 */}
      {card.usage.length > 0 && (
        <div>
          <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('aiCardUsage', locale)}</div>
          <ul className="mt-1 space-y-1">
            {card.usage.map((s, i) => (
              <li key={i} className="text-[calc(14px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]">
                {s.type === 'speak'
                  ? <SpeakInline text={s.text} accent={accent} rate={rate} bold />
                  : <span>{s.text}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 例句（整句一个按钮） */}
      {card.example.en && (
        <div>
          <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('aiCardExample', locale)}</div>
          <div className="mt-1 flex items-start gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-2.5">
            <button
              onClick={() => { if (active) stop(); else speak(card.example.en.trim(), { accent, rate, lang: 'en' }); }}
              className={`press mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--color-accent)] ${active ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
              aria-label={t('listenAgain', locale)}
            >
              {ttsState === 'synthesizing' ? <Loader2 size={13} className="animate-spin" /> : (active ? <Pause size={13} className="animate-pulse" /> : <Volume2 size={13} />)}
            </button>
            <div className="min-w-0">
              <p className="text-[calc(14.5px*var(--type-scale))] font-medium leading-relaxed text-[var(--color-text)]"><WordHighlight text={card.example.en} word={highlight ?? card.word} /></p>
              {card.example.zh && <p className="mt-0.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{card.example.zh}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 考点 */}
      {card.examTips.length > 0 && (
        <div>
          <div className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('aiCardExam', locale)}</div>
          <ul className="mt-1 space-y-1">
            {card.examTips.map((s, i) => (
              <li key={i} className="text-[calc(14px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]">
                {s.type === 'speak'
                  ? <SpeakInline text={s.text} accent={accent} rate={rate} bold />
                  : <span>{s.text}</span>}
              </li>
            ))}
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
  const { locale, unit } = useAppStore();
  const cfg = loadConfig();
  const [card, setCard] = useState<StudyCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 桌面浮窗位置/尺寸（拖拽缩放）
  const [win, setWin] = useState({ x: 0, y: 0, w: 380, h: 520, dragging: false, resizing: false });
  const dragStart = useRef({ x: 0, y: 0, wx: 0, wy: 0 });

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [card, busy]);
  useEffect(() => { if (!open) { setCard(null); setBusy(false); setErr(''); } }, [open]);

  // 生成学习卡片（一次请求，JSON 结构化）
  const study = useCallback(async () => {
    if (!cfg || busy || !context) return;
    setBusy(true); setErr(''); setCard(null);
    const msg = studyCardPrompt(context.label, context.meaning, context.kind, context.quote);
    const knowledge = context.extra ?? (unit ? `${unit.editionName} Unit ${unit.unit}` : undefined);
    try {
      let full = '';
      await new Promise<void>((resolve) => {
        let settled = false;
        streamChat({
          cfg, systemPrompt: buildSystemPrompt({ unitTitle: unit?.title, knowledge }),
          userMessage: msg,
          onChunk: (_d, f) => { full = f; },
          onEnd: (f) => { if (!settled) { settled = true; full = f; resolve(); } },
        });
        const timer = setTimeout(() => { if (!settled) { settled = true; resolve(); } }, 60000);
        void timer;
      });
      const parsed = parseStudyCard(full);
      if (parsed) setCard(parsed);
      else setErr(t('aiCardParseError', locale));
    } catch (e) {
      setErr(isNetworkError((e as Error).message) ? t('aiNetUnreachable', locale) : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [cfg, busy, context, unit, locale]);

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
    <div className="fixed inset-0 z-50 sm:bg-black/30 sm:backdrop-blur-[1px]" onClick={() => { if (window.innerWidth >= 640) onClose(); }}>
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
            {/* 单按钮：一次生成学习卡片 */}
            {!card && !busy && context && (
              <div className="flex flex-col gap-2 pt-1">
                <button onClick={() => void study()} className="press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-4 py-2.5 text-[calc(13.5px*var(--type-scale))] font-semibold text-white">
                  <Sparkles size={14} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} /> {t('aiStudyGenerate', locale)}
                </button>
                <p className="text-center text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">{t('aiStudyHint', locale)}</p>
              </div>
            )}
            {busy && !card && (
              <div className="flex items-center gap-2 p-2"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)' }} /><span className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiStudyBusy', locale)}</span></div>
            )}
            {card && <StudyCardView card={card} accent={useAppStore.getState().tts.accent} rate={useAppStore.getState().tts.rate} highlight={context?.label} />}
            {err && <p className="rounded-[var(--radius-md)] bg-[var(--color-trap-soft)] p-3 text-[calc(12.5px*var(--type-scale))] text-[var(--color-trap)]">{err}</p>}
            {card && (
              <button onClick={() => { setCard(null); }} className="press text-[calc(12px*var(--type-scale))] text-[var(--color-accent)]">{t('aiAskAgain', locale)}</button>
            )}
          </div>
        )}

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