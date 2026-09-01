// VersionDialog — 点击顶部版本号弹出的更新日志面板（面向用户，zh/en 双语）
import { X, Info } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { CHANGELOG, APP_VERSION } from '../lib/changelog.ts';

export default function VersionDialog({ onClose }: { onClose: () => void }) {
  const locale = useAppStore((s) => s.locale);
  return (
    <div className="fixed top-16 right-4 left-4 z-[80] max-h-[70vh] overflow-hidden rounded-[var(--radius-hero)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)] sm:left-auto sm:w-[calc(100vw-2rem)] sm:max-w-sm" role="dialog" aria-modal="true" aria-label={t('changelogTitle', locale)}>
      <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3">
        <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold tracking-[-0.01em] text-[var(--color-text)]">
          <Info size={16} style={{ color: 'var(--color-accent)' }} />
          {t('changelogTitle', locale)}
        </h2>
        <button type="button" onClick={onClose} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
      </div>
      <div className="max-h-[calc(70vh-3rem)] space-y-4 overflow-y-auto px-4 py-4">
        {CHANGELOG.map((entry) => (
          <div key={entry.version} className="border-t border-[var(--color-hairline)] pt-3 first:border-t-0 first:pt-0">
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="tnum text-[calc(12px*var(--type-scale))] font-bold text-[var(--color-text)]">v{entry.version}</span>
              <span className="tnum text-[calc(10px*var(--type-scale))] text-[var(--color-text-3)]">{entry.date}</span>
            </div>
            <ul className="space-y-1.5">
              {(locale === 'zh' ? entry.zh : entry.en).map((line, i) => {
                const m = line.match(/^(\[[^\]]+\])\s*(.*)$/);
                return (
                  <li key={i} className="flex gap-2 text-[calc(12.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">
                    <span className="shrink-0 text-[var(--color-text-4)]">•</span>
                    <span>
                      {m ? (
                        <>
                          <strong className="font-bold text-[var(--color-text)]">{m[1]}</strong>{' '}
                          {m[2]}
                        </>
                      ) : line}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="border-t border-[var(--color-hairline)] pt-3 text-center text-[calc(10.5px*var(--type-scale))] text-[var(--color-text-3)]">Lexi v{APP_VERSION} · {t('footerLicense', locale)}</p>
      </div>
    </div>
  );
}
