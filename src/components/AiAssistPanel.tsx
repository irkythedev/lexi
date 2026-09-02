// AIAssistPanel — 轻量 AI 学习面板（无自由输入）。
// 嵌入在 Learn/Reading/Session 等学习区域，单按钮一次生成学习卡片
// （释义/用法/例句/考点），纯文本限长。桌面端为可拖拽/缩放的浮窗，
// 移动端为底部 sheet。
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, Volume2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { loadConfig, streamChat, buildSystemPrompt, studyCardPrompt, isNetworkError } from '../lib/ai.ts';
import { useSpeak } from '../lib/useSpeak.ts';
import { t } from '../lib/i18n.ts';

export interface AssistContext {
  label: string;       // 当前词/句
  meaning?: string;    // 释义（可选）
  kind?: string;       // vocab | phrase | pattern
  extra?: string;      // 额外上下文（如课文段落）
}

/** 轻清洗 md：去掉加粗/斜体/代码/标题/列表符，留纯文本。 */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`\n]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '· ')
    .replace(/^>\s?/gm, '')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 按 CJK 切分文本：返回交替的中文/英文段。 */
function splitByLang(text: string): { lang: 'zh' | 'en'; text: string }[] {
  const segs: { lang: 'zh' | 'en'; text: string }[] = [];
  let cur = '';
  let curLang: 'zh' | 'en' | null = null;
  const flush = () => { if (cur) { segs.push({ lang: curLang === 'zh' ? 'zh' : 'en', text: cur }); cur = ''; } };
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    const isZh = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x3000 && code <= 0x303f) || (code >= 0xff00 && code <= 0xffef);
    const lang: 'zh' | 'en' = isZh ? 'zh' : 'en';
    if (curLang === null) curLang = lang;
    if (lang !== curLang) {
      if (cur.length <= 2) { cur += ch; continue; }
      flush();
      curLang = lang;
    }
    cur += ch;
  }
  flush();
  return segs;
}

/** 回答气泡：英文段落内嵌小喇叭逐句点播，中文原样。 */
function MixedSpeakText({ text, accent, rate }: { text: string; accent: 'us' | 'uk'; rate: number }) {
  const locale = useAppStore((s) => s.locale);
  const { speak, stop, state: ttsState } = useSpeak();
  const segs = splitByLang(text);

  return (
    <>
      {segs.map((seg, i) => {
        if (seg.lang === 'zh' || !/[A-Za-z]/.test(seg.text)) return <span key={i}>{seg.text}</span>;
        const active = ttsState === 'playing' || ttsState === 'synthesizing';
        return (
          <span key={i} className="inline-flex items-baseline gap-1">
            <button
              onClick={() => { if (active) stop(); else speak(seg.text.trim(), { accent, rate, lang: 'en' }); }}
              className="press -my-0.5 inline-flex h-5 w-5 shrink-0 translate-y-[1px] items-center justify-center rounded-full text-[var(--color-accent)] opacity-70 hover:opacity-100"
              aria-label={t('listenAgain', locale)}
              title={seg.text.trim().slice(0, 40)}
            >
              {ttsState === 'synthesizing' ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
            </button>
            <span className="font-medium text-[var(--color-text)]">{seg.text}</span>
          </span>
        );
      })}
    </>
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
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 桌面浮窗位置/尺寸（拖拽缩放）
  const [win, setWin] = useState({ x: 0, y: 0, w: 360, h: 480, dragging: false, resizing: false });
  const dragStart = useRef({ x: 0, y: 0, wx: 0, wy: 0 });

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [answer, busy]);
  useEffect(() => { if (!open) { setAnswer(''); setBusy(false); setErr(''); } }, [open]);

  // 生成学习卡片（一次请求四段合一）
  const study = useCallback(async () => {
    if (!cfg || busy || !context) return;
    setBusy(true); setErr(''); setAnswer('');
    const msg = studyCardPrompt(context.label, context.meaning, context.kind);
    const knowledge = context.extra ?? (unit ? `${unit.editionName} Unit ${unit.unit}` : undefined);
    try {
      await new Promise<void>((resolve) => {
        let settled = false;
        streamChat({
          cfg, systemPrompt: buildSystemPrompt({ unitTitle: unit?.title, knowledge }),
          userMessage: msg,
          onChunk: (_d, f) => setAnswer(stripMarkdown(f)),
          onEnd: (full) => { if (!settled) { settled = true; setAnswer(stripMarkdown(full)); resolve(); } },
        });
        const timer = setTimeout(() => { if (!settled) { settled = true; resolve(); } }, 60000);
        void timer;
      });
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
    const w = Math.max(300, Math.min(window.innerWidth - 40, dragStart.current.wx + (e.clientX - dragStart.current.x)));
    const h = Math.max(240, Math.min(window.innerHeight - 40, dragStart.current.wy + (e.clientY - dragStart.current.y)));
    setWin((s) => ({ ...s, w, h }));
  };
  const endGesture = () => setWin((w) => ({ ...w, dragging: false, resizing: false }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:bg-black/30 sm:backdrop-blur-[1px]" onClick={() => { if (window.innerWidth >= 640) onClose(); }}>
      {/* 桌面：可拖拽浮窗；移动：底部 sheet */}
      <div
        className={`fixed z-10 flex flex-col border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)]
          ${window.innerWidth < 640
            ? 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]'
            : 'rounded-xl'}`}
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
            <Sparkles size={16} style={{ color: 'var(--color-accent)' }} /> {t('aiStudyTitle', locale)}
            {context && <span className="truncate text-[calc(12px*var(--type-scale))] font-normal text-[var(--color-text-2)]">· {context.label}</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
        </div>

        {/* 未配置 */}
        {!cfg ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="px-4 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiNotConfigured', locale)}</p>
            <a href="/ai" className="press inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-white">{t('aiConfigure', locale)}</a>
          </div>
        ) : (
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-2">
            {/* 单按钮：一次生成学习卡片 */}
            {!answer && !busy && context && (
              <div className="flex flex-col gap-2 pt-1">
                <button onClick={() => void study()} className="press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2.5 text-[calc(13.5px*var(--type-scale))] font-semibold text-white">
                  <Sparkles size={14} /> {t('aiStudyGenerate', locale)}
                </button>
                <p className="text-center text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">{t('aiStudyHint', locale)}</p>
              </div>
            )}
            {busy && !answer && (
              <div className="flex items-center gap-2 p-2"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)' }} /><span className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiStudyBusy', locale)}</span></div>
            )}
            {answer && (
              <div className="whitespace-pre-wrap rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[calc(14px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">
                <MixedSpeakText text={answer} accent={useAppStore.getState().tts.accent} rate={useAppStore.getState().tts.rate} />
              </div>
            )}
            {err && <p className="rounded-[var(--radius-card)] bg-[var(--color-trap-soft)] p-3 text-[calc(12.5px*var(--type-scale))] text-[var(--color-trap)]">{err}</p>}
            {answer && (
              <button onClick={() => { setAnswer(''); }} className="press text-[calc(12px*var(--type-scale))] text-[var(--color-accent)]">{t('aiAskAgain', locale)}</button>
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
