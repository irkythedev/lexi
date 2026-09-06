// FeedbackPanel — 精简反馈弹窗（供 Footer 内嵌按钮使用）。
// 参考 stem 的 FeedbackPanel，仅保留消息 + 分类，去掉了实验评分/身份字段。
import { useState } from 'react';
import { MessageSquareText, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { submitFeedback, type FeedbackCategory } from '../lib/feedback.ts';

const CATEGORIES: FeedbackCategory[] = ['bug', 'suggestion', 'content', 'other'];

const CATEGORY_KEYS: Record<FeedbackCategory, string> = {
  bug: 'feedbackCategoryBug',
  suggestion: 'feedbackCategorySuggestion',
  content: 'feedbackCategoryContent',
  other: 'feedbackCategoryOther',
};

export default function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const locale = useAppStore((s) => s.locale);
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const submit = async () => {
    if (sending || !message.trim() || !category) return;
    setSending(true);
    setError(false);
    const ok = await submitFeedback(category, message.trim(), locale);
    if (ok) {
      setDone(true);
    } else {
      setError(true);
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-xl border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('feedbackTitle', locale)}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">
            <MessageSquareText size={16} style={{ color: 'var(--color-accent)' }} /> {t('feedbackTitle', locale)}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-[calc(14px*var(--type-scale))] font-semibold text-[var(--color-vocab)]">{t('feedbackSent', locale)}</p>
            <button onClick={onClose} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('close', locale)}</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('feedbackCategory', locale)}</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`press rounded-[var(--radius-sm)] border-2 px-3 py-1.5 text-[calc(12px*var(--type-scale))] transition ${category === c ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'border-[var(--color-hairline)] text-[var(--color-text-2)] hover:border-[var(--color-accent)]'}`}>
                    {t(CATEGORY_KEYS[c], locale)}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">
              {t('feedbackMessage', locale)}
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('feedbackPlaceholder', locale)}
                rows={3} maxLength={2000}
                className="mt-1.5 w-full resize-none rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] p-3 text-[calc(14px*var(--type-scale))] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
            </label>
            {error && <p className="text-[calc(12px*var(--type-scale))] text-[var(--color-trap)]">{t('feedbackError', locale)}</p>}
            <button type="button" onClick={submit} disabled={sending || !message.trim() || !category}
              className="press flex w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white disabled:opacity-50">
              {sending ? t('feedbackSending', locale) : t('feedbackSubmit', locale)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}