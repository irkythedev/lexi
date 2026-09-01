// TextbookSwitcher — flat card list of bundled editions, then unit picker.
// Replaces the old 6-step drill-down (region→stage→publisher→grade→volume→unit).
// Per user decision: 5 editions → flat cards, no unnecessary nesting.
import { useMemo, useState } from 'react';
import { ChevronRight, BookOpen, ExternalLink } from 'lucide-react';
import { BUNDLED_EDITIONS } from '../data/textbooks/index.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { Panel, GhostButton } from './ui/primitives.tsx';
import { getSetting, setSetting } from '../db/db.ts';
import type { Edition } from '../types/index.ts';

export default function TextbookSwitcher({ onSelected }: { onSelected?: () => void }) {
  const { selectUnit } = useAppStore();
  const [picking, setPicking] = useState<Edition | null>(null);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteMsg, setRemoteMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  const editions = useMemo(() => BUNDLED_EDITIONS, []);

  const handlePick = (ed: Edition) => {
    const g = ed.grades[0];
    if (!g || g.volumes.length === 0) return;
    const v = g.volumes[0];
    // If only one unit, select immediately; else show unit picker.
    if (ed.units.length === 1) {
      selectUnit({ editionId: ed.editionId, grade: g.grade, volume: v.volume, unit: ed.units[0].unit });
      useToastStore.getState().show(`已选择 ${ed.editionName} · ${ed.units[0].title}`, 'success', 'check');
      onSelected?.();
    } else {
      setPicking(ed);
    }
  };

  const handleUnit = (unitIdx: number) => {
    if (!picking) return;
    const g = picking.grades[0];
    if (!g || g.volumes.length === 0) return;
    const v = g.volumes[0];
    const unit = picking.units[unitIdx];
    if (!unit) return;
    selectUnit({ editionId: picking.editionId, grade: g.grade, volume: v.volume, unit: unit.unit });
    useToastStore.getState().show(`已选择 ${picking.editionName} · ${unit.title}`, 'success', 'check');
    setPicking(null);
    onSelected?.();
  };

  const handleRemoteLoad = async () => {
    setRemoteMsg(''); setLoadError('');
    if (!remoteUrl) return;
    try {
      const res = await fetch(remoteUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const existing = (await getSetting<unknown[]>('remoteEditions', [])) ?? [];
      const merged = [...(existing as unknown[]).filter((e: any) => e.editionId !== data.editionId), data];
      await setSetting('remoteEditions', merged);
      useToastStore.getState().show(`已加载《${data.editionName}》${data.units?.length ?? 0} 个单元`, 'success', 'check');
    } catch (e) { setLoadError('加载失败：' + (e instanceof Error ? e.message : String(e))); }
  };

  // Unit picker mode
  if (picking) {
    return (
      <div className="space-y-3">
        <button onClick={() => setPicking(null)} className="press text-[13px] text-[var(--color-text-2)]">&larr; 返回教材列表</button>
        <div className="text-[15px] font-semibold text-[var(--color-text)]">{picking.editionName}</div>
        <div className="text-[12px] text-[var(--color-text-2)]">{picking.units.length} 个单元</div>
        <Panel>
          {picking.units.map((u, i) => {
            const c = (u.vocabularies?.length ?? 0) + (u.phrases?.length ?? 0) + (u.sentencePatterns?.length ?? 0);
            return (
              <button key={u.unit} onClick={() => handleUnit(i)}
                className="press flex w-full items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-3 text-left last:border-b-0 hover:bg-[var(--color-surface-2)]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[12px] font-bold text-[var(--color-text-2)]">{u.unit}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-[var(--color-text)]">{u.title}</div>
                  <div className="text-[12px] text-[var(--color-text-2)]">{c} 项</div>
                </div>
                <ChevronRight size={16} className="text-[var(--color-text-3)]" />
              </button>
            );
          })}
        </Panel>
      </div>
    );
  }

  // Edition card list
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {editions.map((ed) => {
          const total = ed.units.length;
          const tag = ed.region === '全国通用' ? ed.stage : `${ed.region} · ${ed.stage}`;
          return (
            <button key={ed.editionId} onClick={() => handlePick(ed)}
              className="press card flex items-start gap-3 p-4 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: 'var(--grad-cta)' }}>
                <BookOpen size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-[var(--color-text)]">{ed.editionName}</div>
                <div className="mt-0.5 text-[12px] text-[var(--color-text-2)]">{tag}</div>
                <div className="mt-1.5 text-[12px] font-medium text-[var(--color-accent)]">{total} 个单元</div>
              </div>
              <ChevronRight size={16} className="mt-1 shrink-0 text-[var(--color-text-3)]" />
            </button>
          );
        })}
      </div>

      <Panel>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-2)]"><ExternalLink size={14} /> 加载外部教材</div>
          <p className="mt-1 text-[12px] text-[var(--color-text-2)]">粘贴教材 JSON 链接，可扩展更多单元。</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="https://example.com/edition.json"
              className="flex-1 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-2 text-[15px] outline-none focus:border-[var(--color-accent)]" />
            <GhostButton onClick={handleRemoteLoad}>加载</GhostButton>
          </div>
          {remoteMsg && <p className="mt-2 text-[12px] text-[var(--color-vocab)]">{remoteMsg}</p>}
          {loadError && <p className="mt-2 text-[12px] text-[var(--color-trap)]">{loadError}</p>}
        </div>
      </Panel>
    </div>
  );
}