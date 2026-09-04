// PaginationBar — 紧凑型翻页控件：‹ 页码/总数 › 吸底右对齐。
// 精简 icon 按钮，不占横贯全宽，不与左下角 FloatingTTS 朗读球重叠。
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
    <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-10 mt-3 flex justify-end pb-2 pr-[var(--pad-x)] md:bottom-0">
      <div className="flex items-center gap-1 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-1.5 py-0.5 shadow-[var(--shadow-card)] md:px-2 md:py-1">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="press flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-30 md:h-8 md:w-8"
          aria-label={t('pagePrev', locale)}
        >
          <ChevronLeft size={12} className="md:hidden" />
          <ChevronLeft size={14} className="hidden md:block" />
        </button>
        <span className="tnum min-w-[3em] text-center text-[calc(11px*var(--type-scale))] text-[var(--color-text-2)] md:text-[calc(12px*var(--type-scale))]">
          {t('pageIndicator', locale, { page: page + 1, total: totalPages })}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="press flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] disabled:opacity-30 md:h-8 md:w-8"
          aria-label={t('pageNext', locale)}
        >
          <ChevronRight size={12} className="md:hidden" />
          <ChevronRight size={14} className="hidden md:block" />
        </button>
      </div>
    </div>
  );
}