// PaginationBar — 吸底翻页控件：上一页 / 页码 / 下一页。
// sticky bottom 保持可见，不随列表滚出视口。
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';

export default function PaginationBar({
  page, totalPages, onPrev, onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const locale = useAppStore((s) => s.locale);
  if (totalPages <= 1) return null;

  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 -mx-[var(--pad-x)] mt-3 px-[var(--pad-x)] pb-2 md:bottom-0">
      <div className="mx-auto flex max-w-[var(--max-grid)] items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-1.5 shadow-[var(--shadow-card)]">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="press flex h-9 items-center gap-1 rounded-[var(--radius-md)] px-3 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)] disabled:opacity-40"
          aria-label={t('pagePrev', locale)}
        >
          <ChevronLeft size={16} /> {t('pagePrev', locale)}
        </button>
        <span className="tnum text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
          {t('pageIndicator', locale, { page: page + 1, total: totalPages })}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="press flex h-9 items-center gap-1 rounded-[var(--radius-md)] px-3 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)] disabled:opacity-40"
          aria-label={t('pageNext', locale)}
        >
          {t('pageNext', locale)} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
