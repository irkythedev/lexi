// NoticeDialog — 首启「还在打磨中」提示：说明打磨期状态 + 邀请反馈。
// 勾选「以后不再提示」→ 写 settings.noticeAck；未勾选 → 仅本次会话关闭，下次启动再弹。
import { useState } from 'react';
import { Rocket, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { APP_VERSION } from '../lib/changelog.ts';

interface Props {
  onDismiss: (forever: boolean) => void;
  onFeedback: () => void;
}

export default function NoticeDialog({ onDismiss, onFeedback }: Props) {
  const locale = useAppStore((s) => s.locale);
  const [hideForever, setHideForever] = useState(false);

  const dismiss = () => onDismiss(hideForever);
  const dismissAndFeedback = () => {
    onDismiss(hideForever);
    onFeedback();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4" onClick={dismiss}>
      <div
        className="relative w-full max-w-sm rounded-xl border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('noticeTitle', locale)}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">
            <Rocket size={16} style={{ color: 'var(--color-accent)' }} /> {t('noticeTitle', locale)}
            <span className="tnum ml-0.5 text-[calc(10.5px*var(--type-scale))] font-semibold" style={{ color: 'var(--color-accent)' }}>v{APP_VERSION}</span>
          </h2>
          <button type="button" onClick={dismiss} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
        </div>

        <p className="text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]">
          {t('noticeBody', locale)}
        </p>

        <div className="mt-4 space-y-2">
          <button type="button" onClick={dismissAndFeedback}
            className="press flex w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">
            {t('noticeActionFeedback', locale)}
          </button>
          <button type="button" onClick={dismiss}
            className="press flex w-full items-center justify-center rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-2 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
            {t('noticeDismiss', locale)}
          </button>
          <label className="flex cursor-pointer items-center justify-center gap-1.5 pt-1 text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">
            <input type="checkbox" checked={hideForever} onChange={(e) => setHideForever(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-accent)]" />
            {t('noticeHide', locale)}
          </label>
        </div>
      </div>
    </div>
  );
}
