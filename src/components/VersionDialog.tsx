// VersionDialog — 点击顶部版本号弹出的更新日志面板（面向用户，zh/en 双语）
import { X, Info, Plus, ArrowUp, Wrench } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { CHANGELOG, APP_VERSION } from '../lib/changelog.ts';

/** 变更类别 → 语义图标（zh + en 标签共用，accent 描边点 + 墨线文本）。
 *  注意：用 Plus/ArrowUp/Wrench 而非 Sparkles —— Sparkles 是本应用约定俗成的 AI 图标。 */
const CATEGORY_ICON: Record<string, typeof Plus> = {
  '[新增]': Plus, '[New]': Plus,
  '[优化]': ArrowUp, '[Improved]': ArrowUp,
  '[修复]': Wrench, '[Fixed]': Wrench,
};

export default function VersionDialog({ onClose }: { onClose: () => void }) {
  const locale = useAppStore((s) => s.locale);
  return (
    <div className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] right-4 left-4 z-[80] max-h-[70vh] overflow-hidden rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] sm:left-auto sm:w-[calc(100vw-2rem)] sm:max-w-sm" role="dialog" aria-modal="true" aria-label={t('changelogTitle', locale)}>
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
                const CatIcon = m ? CATEGORY_ICON[m[1]] : null;
                return (
                  <li key={i} className="flex gap-2 text-[calc(12.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">
                    <span className="mt-[3px] shrink-0">{CatIcon ? <CatIcon size={13} style={{ color: 'var(--color-accent)' }} /> : <span className="text-[var(--color-text-4)]">•</span>}</span>
                    <span>
                      {m ? m[2] : line}
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
