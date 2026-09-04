// DisclaimerDialog — 免责声明弹窗：教材版权 + AI 内容免责 + 隐私说明
import { X, ShieldAlert } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';

export default function DisclaimerDialog({ onClose }: { onClose: () => void }) {
  const locale = useAppStore((s) => s.locale);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-[1px] sm:items-center" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-t-xl border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 text-left shadow-[var(--shadow-overlay)] sm:rounded-xl pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('footerDisclaimerLabel', locale)}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">
            <ShieldAlert size={16} style={{ color: 'var(--color-accent)' }} /> {t('footerDisclaimerLabel', locale)}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
        </div>

        <div className="space-y-3 text-[calc(12.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">
          <section>
            <h3 className="mb-0.5 text-[calc(12px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('disclaimerCopyrightTitle', locale)}</h3>
            <p>{t('disclaimerCopyright', locale)}</p>
          </section>

          <section>
            <h3 className="mb-0.5 text-[calc(12px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('disclaimerAiTitle', locale)}</h3>
            <p>{t('disclaimerAi', locale)}</p>
            <p className="mt-1">{t('disclaimerAiLimit', locale)}</p>
          </section>

          <section>
            <h3 className="mb-0.5 text-[calc(12px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('disclaimerPrivacyTitle', locale)}</h3>
            <p>{t('disclaimerPrivacy', locale)}</p>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="press mt-4 w-full rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]"
        >
          {t('close', locale)}
        </button>
      </div>
    </div>
  );
}
