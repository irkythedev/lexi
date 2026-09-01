import { useMemo, useState } from 'react';
import { ChevronRight, Check, RefreshCw } from 'lucide-react';
import { buildCatalog, getEdition, type RegionNode } from '../data/textbooks/index.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { Panel, Row, PrimaryButton, GhostButton } from './ui/primitives.tsx';
import { getSetting, setSetting } from '../db/db.ts';

interface Path { region: string | null; stage: string | null; publisher: string | null; grade: number | null; volume: number | null; unit: number | null; }

const EMPTY: Path = { region: null, stage: null, publisher: null, grade: null, volume: null, unit: null };

export default function TextbookSwitcher({ onSelected }: { onSelected?: () => void }) {
  const { selectUnit } = useAppStore();
  const catalog = useMemo<RegionNode[]>(() => buildCatalog(), []);
  const [path, setPath] = useState<Path>(EMPTY);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteMsg, setRemoteMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  const region = catalog.find((r) => r.region === path.region);
  const stage = region?.stages.find((s) => s.stage === path.stage);
  const publisher = stage?.publishers.find((p) => p.publisher === path.publisher);
  const grades = publisher?.grades ?? [];
  const volumes = grades.find((g) => g.grade === path.grade)?.volumes ?? [];

  const unitList = useMemo(() => {
    if (!path.publisher || path.grade == null || path.volume == null) return [];
    const ed = catalog.flatMap((r) => r.stages).flatMap((s) => s.publishers)
      .find((p) => p.publisher === path.publisher);
    if (!ed) return [];
    const full = getEdition(ed.editionId);
    return (full?.units ?? []).filter((u) => u.grade === path.grade && u.volume === path.volume);
  }, [catalog, path.publisher, path.grade, path.volume]);

  const set = (patch: Partial<Path>) => setPath((p) => ({ ...p, ...patch }));
  const canConfirm = !!(path.region && path.stage && path.publisher && path.grade != null && path.volume != null && path.unit != null);

  const handleConfirm = () => {
    if (!canConfirm || !publisher) return;
    selectUnit({ editionId: publisher.editionId, grade: path.grade!, volume: path.volume!, unit: path.unit! });
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
      setRemoteMsg(`已加载《${data.editionName}》${data.units?.length ?? 0} 个单元。`);
    } catch (e) { setLoadError('加载失败：' + (e instanceof Error ? e.message : String(e))); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
        {(['region', 'stage', 'publisher', 'grade', 'volume', 'unit'] as (keyof Path)[]).map((step, i) => {
          const labels: Record<string, string> = {
            region: path.region || '地区', stage: path.stage || '学段', publisher: path.publisher || '出版社',
            grade: path.grade != null ? `${path.grade}年级` : '年级', volume: path.volume != null ? `册${path.volume}` : '册数', unit: path.unit != null ? `单元${path.unit}` : '单元',
          };
          return (
            <span key={step} className="flex items-center gap-1.5">
              <span className="rounded-full px-3 py-1" style={{ background: path[step] != null ? 'var(--color-accent)' : 'var(--color-track)', color: path[step] != null ? '#fff' : 'var(--color-text-2)' }}>
                {labels[step]}
              </span>
              {i < 5 && <ChevronRight size={14} className="text-[var(--color-text-4)]" />}
            </span>
          );
        })}
      </div>

      <Panel>
        <Row onClick={() => set({ stage: null, publisher: null, grade: null, volume: null, unit: null })}>
          <div className="text-[13px] font-semibold text-[var(--color-text-2)]">① 地区</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalog.map((r) => <Chip key={r.region} active={path.region === r.region} onClick={() => set({ region: r.region })}>{r.region}</Chip>)}
          </div>
        </Row>
        {region && (
          <Row onClick={() => set({ publisher: null, grade: null, volume: null, unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--color-text-2)]">② 学段</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {region.stages.map((s) => <Chip key={s.stage} active={path.stage === s.stage} onClick={() => set({ stage: s.stage })}>{s.stage}</Chip>)}
            </div>
          </Row>
        )}
        {stage && (
          <Row onClick={() => set({ grade: null, volume: null, unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--color-text-2)]">③ 出版社</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {stage.publishers.map((p) => (
                <Chip key={p.publisher} active={path.publisher === p.publisher}
                  onClick={() => set({ publisher: p.publisher, grade: p.grades[0]?.grade ?? null, volume: p.grades[0]?.volumes[0]?.volume ?? null, unit: null })}>
                  {p.publisher}
                </Chip>
              ))}
            </div>
          </Row>
        )}
        {publisher && (
          <Row onClick={() => set({ volume: null, unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--color-text-2)]">④ 年级</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {grades.map((g) => (
                <Chip key={g.grade} active={path.grade === g.grade}
                  onClick={() => set({ grade: g.grade, volume: g.volumes[0]?.volume ?? null, unit: null })}>
                  {g.grade === 0 ? '必修' : `${g.grade}年级`}
                </Chip>
              ))}
            </div>
          </Row>
        )}
        {volumes.length > 0 && (
          <Row onClick={() => set({ unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--color-text-2)]">⑤ 册数</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {volumes.map((v) => <Chip key={v.volume} active={path.volume === v.volume} onClick={() => set({ volume: v.volume, unit: null })}>{v.title}</Chip>)}
            </div>
          </Row>
        )}
        {unitList.length > 0 && (
          <Row>
            <div className="text-[13px] font-semibold text-[var(--color-text-2)]">⑥ 单元</div>
            <div className="mt-2 space-y-2">
              {unitList.map((u) => (
                <button key={u.unit} onClick={() => set({ unit: u.unit })}
                  className="press flex w-full items-center justify-between rounded-[var(--radius-card)] border px-4 py-3 text-left transition"
                  style={{ borderColor: path.unit === u.unit ? 'var(--color-accent)' : 'var(--color-hairline)', background: path.unit === u.unit ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'var(--color-surface-2)' }}>
                  <span>
                    <span className="text-[12px] text-[var(--color-text-2)]">Unit {u.unit} · </span>
                    <span className="text-[15px] font-semibold text-[var(--color-text)]">{u.title}</span>
                  </span>
                  {path.unit === u.unit && <Check size={18} className="text-[var(--color-accent)]" />}
                </button>
              ))}
            </div>
          </Row>
        )}
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <GhostButton onClick={() => set({ unit: null })}><RefreshCw size={14} /> 重置</GhostButton>
        <PrimaryButton onClick={handleConfirm} disabled={!canConfirm}>确认并开始 <Check size={16} /></PrimaryButton>
      </div>

      <Panel>
        <div className="px-4 py-3">
          <div className="text-[13px] font-semibold text-[var(--color-text-2)]">加载外部教材 JSON（可选）</div>
          <p className="mt-1 text-[12px] text-[var(--color-text-2)]">粘贴一个返回教材 JSON（符合数据 schema）的链接，可动态扩充单元。</p>
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

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="press rounded-full border px-4 py-2 text-[13px] font-medium transition"
      style={{ borderColor: active ? 'var(--color-accent)' : 'var(--color-hairline)', background: active ? 'var(--color-accent)' : 'var(--color-surface)', color: active ? '#fff' : 'var(--color-text-2)' }}>
      {children}
    </button>
  );
}
