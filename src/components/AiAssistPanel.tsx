// AIAssistPanel — 轻量 AI 辅助面板（无自由输入）。
// 嵌入在 Learn/Reading/Session 等学习区域，预设问题按钮触发 AI 回答，
// 不使用自由输入框。对齐 stem 的 BYOK 纪律。
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { loadConfig, streamChat, buildSystemPrompt, isNetworkError } from '../lib/ai.ts';
import { t } from '../lib/i18n.ts';

export interface AssistContext {
  label: string;       // 当前词/句
  extra?: string;      // 额外上下文（如单元标题）
  questions: string[]; // 预设问题
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
  const [lastQ, setLastQ] = useState('');
  const [err, setErr] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [answer, busy]);

  // 关闭时重置
  useEffect(() => { if (!open) { setAnswer(''); setBusy(false); setLastQ(''); setErr(''); } }, [open]);

  const ask = useCallback(async (question: string) => {
    if (!cfg || busy) return;
    setBusy(true); setErr(''); setLastQ(question); setAnswer('');
    const text = context ? `当前词/句：${context.label}${context.extra ? `\n上下文：${context.extra}` : ''}\n\n问题：${question}` : question;
    try {
      const sysPrompt = buildSystemPrompt({ unitTitle: unit?.title, knowledge: context?.extra });
      await new Promise<void>((resolve) => {
        let settled = false;
        const handle = streamChat({
          cfg, systemPrompt: sysPrompt, userMessage: text,
          onChunk: (_d, f) => setAnswer(f),
          onEnd: (full) => { if (!settled) { settled = true; setAnswer(full); resolve(); } },
          signal: undefined,
        });
        // 网络错误时 streamChat 内部抛错但无回调——监听 AbortError 无法捕获，
        // 用兜底超时防止一直 loading。
        const timer = setTimeout(() => { if (!settled) { settled = true; resolve(); } }, 60000);
        void handle;
        void timer;
      });
    } catch (e) {
      setErr(isNetworkError((e as Error).message) ? t('aiNetUnreachable', locale) : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [cfg, busy, context, unit, locale]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-t-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-overlay)] sm:rounded-xl pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="AI 辅助">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">
            <Sparkles size={16} style={{ color: 'var(--color-accent)' }} /> AI 辅助
            {context && <span className="truncate text-[calc(12px*var(--type-scale))] font-normal text-[var(--color-text-2)]">· {context.label}</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
        </div>

        {/* 未配置 */}
        {!cfg ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiNotConfigured', locale)}</p>
            <a href="/ai" className="press inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-4 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-white">{t('aiConfigure', locale)} <ChevronRight size={14} /></a>
          </div>
        ) : (
          <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-y-auto" ref={scrollRef}>
            {/* 预设问题按钮 */}
            {!lastQ && context && (
              <div className="flex flex-wrap gap-2">
                {context.questions.map((q, i) => (
                  <button key={i} onClick={() => ask(q)} disabled={busy} className="press rounded-full border border-[var(--color-hairline)] px-3.5 py-2 text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* 回答区域 */}
            {lastQ && (
              <div className="space-y-2">
                <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-2)] p-3 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{lastQ}</p>
                {busy && !answer && (
                  <div className="flex items-center gap-2 p-2"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-accent)' }} /><span className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">思考中...</span></div>
                )}
                {answer && (
                  <div className="whitespace-pre-wrap rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-3 text-[calc(14px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{answer}</div>
                )}
                {err && <p className="rounded-[var(--radius-card)] bg-[var(--color-trap-soft)] p-3 text-[calc(12.5px*var(--type-scale))] text-[var(--color-trap)]">{err}</p>}
                {/* 再问一次按钮 */}
                <button onClick={() => { setLastQ(''); setAnswer(''); }} className="press text-[calc(12px*var(--type-scale))] text-[var(--color-accent)]">{t('aiAskAgain', locale)}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}