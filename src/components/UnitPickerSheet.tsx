// UnitPickerSheet — 底部弹层：当前教材单元列表 + 跨教材切换入口。
// 复用 TextbookSwitcher 的数据（BUNDLED_EDITIONS + remoteEditions），选中即切、toast 确认。
import { useEffect, useState } from 'react';
import { Check, ChevronRight, ChevronLeft, Library, X } from 'lucide-react';
import { BUNDLED_EDITIONS } from '../data/textbooks/index.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { getSetting } from '../db/db.ts';
import type { Edition } from '../types/index.ts';
import { t } from '../lib/i18n.ts';

type Locale = 'zh' | 'en';

export default function UnitPickerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selection, selectUnit, locale } = useAppStore();
  const [editions, setEditions] = useState<Edition[]>(BUNDLED_EDITIONS);
  const [pickingEdition, setPickingEdition] = useState<Edition | null>(null);

  // 打开时合并远端教材；重置为单元列表层
  useEffect(() => {
    if (!open) return;
    setPickingEdition(null);
    (async () => {
      const remote = ((await getSetting<unknown[]>('remoteEditions', [])) ?? []) as Edition[];
      setEditions([...BUNDLED_EDITIONS, ...remote]);
    })();
  }, [open]);

  // esc 关闭
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const handleUnit = (ed: Edition, unitIdx: number) => {
    const g = ed.grades[0];
    if (!g || g.volumes.length === 0) return;
    const unit = ed.units[unitIdx];
    if (!unit) return;
    selectUnit({ editionId: ed.editionId, grade: g.grade, volume: g.volumes[0].volume, unit: unit.unit });
    useToastStore.getState().show(`已切换 ${ed.editionName} · ${unit.title}`, 'success', 'check');
    onClose();
  };

  const handleSwitchEdition = (ed: Edition) => {
    if (ed.units.length === 1) { handleUnit(ed, 0); return; }
    setPickingEdition(ed);
  };

  const currentEd = editions.find((e) => e.editionId === selection?.editionId) ?? null;
  const listEd = pickingEdition ?? currentEd;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t('unitSwitch', locale)}>
      {/* 遮罩：点空白关闭 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* 底部面板：纸面卡 + 硬阴影，圆角只在顶部 */}
      <div className="safe-b absolute inset-x-0 bottom-0 max-h-[72vh] overflow-hidden rounded-t-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)]">
        {/* 头部：标题 + 关闭 */}
        <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-4 py-3">
          {pickingEdition && (
            <button onClick={() => setPickingEdition(null)} className="press -ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]" aria-label={t('back', locale)}><ChevronLeft size={18} strokeWidth={2.25} /></button>
          )}
          <span className="text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">
            {pickingEdition ? pickingEdition.editionName : t('unitSwitch', locale)}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">
            <Library size={13} strokeWidth={2.25} /> {listEd ? `${listEd.units.length} ${t('unitCount', locale)}` : ''}
          </span>
          <button onClick={onClose} className="press -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]" aria-label={t('close', locale)}><X size={18} strokeWidth={2.25} /></button>
        </div>

        <div className="max-h-[calc(72vh-52px)] overflow-y-auto p-2">
          {/* 单元列表（当前教材或正在挑选的教材） */}
          {listEd && (
            <div className="space-y-0.5">
              {listEd.units.map((u, i) => {
                const active = selection?.editionId === listEd.editionId && selection.unit === u.unit;
                const c = (u.vocabularies?.length ?? 0) + (u.phrases?.length ?? 0) + (u.sentencePatterns?.length ?? 0);
                return (
                  <button key={u.unit} onClick={() => handleUnit(listEd, i)}
                    className={`press flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left ${active ? 'bg-[var(--color-surface-2)]' : 'hover:bg-[var(--color-surface-2)]'}`}>
                    <span className={`tnum flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-2 text-[calc(12px*var(--type-scale))] font-bold ${active ? 'border-[var(--color-hairline)] bg-[var(--color-accent)] text-white' : 'border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[var(--color-text-2)]'}`}>{u.unit}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[calc(15px*var(--type-scale))] font-semibold ${active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>{u.title}</div>
                      <div className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{c} {t('unitItemCount', locale)}</div>
                    </div>
                    {active && <Check size={16} strokeWidth={2.5} className="shrink-0 text-[var(--color-accent)]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* 更换教材（非单教材挑选态时展示） */}
          {!pickingEdition && (
            <div className="mt-2 border-t border-[var(--color-hairline)] pt-2">
              <div className="px-3 pb-1 pt-1 text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('switchEdition', locale)}</div>
              {editions.filter((e) => e.editionId !== currentEd?.editionId).map((ed) => (
                <button key={ed.editionId} onClick={() => handleSwitchEdition(ed)}
                  className="press flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left hover:bg-[var(--color-surface-2)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[var(--color-accent)]"><Library size={16} strokeWidth={2.25} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[calc(14px*var(--type-scale))] font-semibold text-[var(--color-text)]">{ed.editionName}</div>
                    <div className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{ed.units.length} {t('unitCount', locale)}</div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-[var(--color-text-3)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { Locale };
