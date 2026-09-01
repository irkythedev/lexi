// Textbook & syllabus switcher — multi-tier cascading selector:
// Region -> Stage(初中/高中) -> Publisher -> Grade & Volume -> Unit.
// Uses the bundled catalog (buildCatalog) plus optional dynamic fetch.
import { useMemo, useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { buildCatalog, fetchEdition, getEdition } from '../data/textbooks/index.js';
import { Panel, Row, PrimaryButton, GhostButton } from './ui/primitives.jsx';
import { getSetting, setSetting } from '../lib/db.js';

const EMPTY = { region: null, stage: null, publisher: null, grade: null, volume: null, unit: null };

export default function TextbookSwitcher({ onSelected }) {
  const { selectUnit, unit } = useApp();
  const catalog = useMemo(() => buildCatalog(), []);
  const [path, setPath] = useState(EMPTY);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteMsg, setRemoteMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  const region = catalog.find((r) => r.region === path.region);
  const stage = region?.stages.find((s) => s.stage === path.stage);
  const publisher = stage?.publishers.find((p) => p.publisher === path.publisher);

  const set = (patch) => setPath((p) => ({ ...p, ...patch }));

  const grades = publisher?.grades || [];
  const volumes = grades.find((g) => g.grade === path.grade)?.volumes || [];

  // Units for the selected edition/grade/volume.
  const unitList = useMemo(() => {
    if (!path.publisher || path.grade == null || path.volume == null) return [];
    // find edition bundle
    const ed = catalog
      .flatMap((r) => r.stages)
      .flatMap((s) => s.publishers)
      .find((p) => p.publisher === path.publisher && p.editionId);
    if (!ed) return [];
    // ed only has grades meta; get full units from data layer
    const full = getEdition(ed.editionId);
    return (full?.units || []).filter(
      (u) => u.grade === path.grade && u.volume === path.volume
    );
  }, [catalog, path.publisher, path.grade, path.volume]);

  const canConfirm =
    path.region && path.stage && path.publisher && path.grade != null && path.volume != null && path.unit != null;

  const handleConfirm = () => {
    if (!canConfirm) return;
    selectUnit({
      editionId: publisher.editionId,
      grade: path.grade,
      volume: path.volume,
      unit: path.unit,
    });
    onSelected && onSelected();
  };

  const handleRemoteLoad = async () => {
    setRemoteMsg('');
    setLoadError('');
    if (!remoteUrl) return;
    try {
      const data = await fetchEdition(remoteUrl);
      // Persist the fetched edition so it can be selected later.
      const existing = (await getSetting('remoteEditions', [])) || [];
      const merged = [...existing.filter((e) => e.editionId !== data.editionId), data];
      await setSetting('remoteEditions', merged);
      setRemoteMsg(`已加载《${data.editionName}》${data.units?.length || 0} 个单元，可在上方选择器中选用。`);
    } catch (e) {
      setLoadError('加载失败：' + (e?.message || e) + '（请确认链接返回合法的教材 JSON）');
    }
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
        {['region', 'stage', 'publisher', 'grade', 'volume', 'unit'].map((step, i) => {
          const labels = {
            region: path.region || '地区',
            stage: path.stage || '学段',
            publisher: path.publisher || '出版社',
            grade: path.grade != null ? `${path.grade}年级` : '年级',
            volume: path.volume != null ? `册${path.volume}` : '册数',
            unit: path.unit != null ? `单元${path.unit}` : '单元',
          };
          return (
            <span key={step} className="flex items-center gap-1.5">
              <span
                className="rounded-full px-3 py-1"
                style={{
                  background: path[step] != null ? 'var(--accent)' : 'var(--track)',
                  color: path[step] != null ? '#fff' : 'var(--text-3)',
                }}
              >
                {labels[step]}
              </span>
              {i < 5 && <ChevronRight size={14} className="text-[var(--text-4)]" />}
            </span>
          );
        })}
      </div>

      {/* Cascading pickers */}
      <Panel>
        <Row onClick={() => set({ stage: null, publisher: null, grade: null, volume: null, unit: null })}>
          <div className="text-[13px] font-semibold text-[var(--text-3)]">① 地区</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {catalog.map((r) => (
              <Chip key={r.region} active={path.region === r.region} onClick={() => set({ region: r.region })}>
                {r.region}
              </Chip>
            ))}
          </div>
        </Row>

        {region && (
          <Row onClick={() => set({ publisher: null, grade: null, volume: null, unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--text-3)]">② 学段</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {region.stages.map((s) => (
                <Chip key={s.stage} active={path.stage === s.stage} onClick={() => set({ stage: s.stage })}>
                  {s.stage}
                </Chip>
              ))}
            </div>
          </Row>
        )}

        {stage && (
          <Row onClick={() => set({ grade: null, volume: null, unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--text-3)]">③ 出版社</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {stage.publishers.map((p) => (
                <Chip
                  key={p.publisher}
                  active={path.publisher === p.publisher}
                  onClick={() =>
                    set({
                      publisher: p.publisher,
                      grade: p.grades[0]?.grade ?? null,
                      volume: p.grades[0]?.volumes[0]?.volume ?? null,
                      unit: null,
                    })
                  }
                >
                  {p.publisher}
                </Chip>
              ))}
            </div>
          </Row>
        )}

        {publisher && (
          <Row onClick={() => set({ volume: null, unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--text-3)]">④ 年级</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {grades.map((g) => (
                <Chip
                  key={g.grade}
                  active={path.grade === g.grade}
                  onClick={() => set({ grade: g.grade, volume: g.volumes[0]?.volume ?? null, unit: null })}
                >
                  {g.grade === 0 ? '必修' : `${g.grade}年级`}
                </Chip>
              ))}
            </div>
          </Row>
        )}

        {volumes.length > 0 && (
          <Row onClick={() => set({ unit: null })}>
            <div className="text-[13px] font-semibold text-[var(--text-3)]">⑤ 册数</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {volumes.map((v) => (
                <Chip
                  key={v.volume}
                  active={path.volume === v.volume}
                  onClick={() => set({ volume: v.volume, unit: null })}
                >
                  {v.title}
                </Chip>
              ))}
            </div>
          </Row>
        )}

        {unitList.length > 0 && (
          <Row>
            <div className="text-[13px] font-semibold text-[var(--text-3)]">⑥ 单元</div>
            <div className="mt-2 space-y-2">
              {unitList.map((u) => (
                <button
                  key={u.unit}
                  onClick={() => set({ unit: u.unit })}
                  className="press flex w-full items-center justify-between rounded-[var(--r-card)] border px-4 py-3 text-left transition"
                  style={{
                    borderColor: path.unit === u.unit ? 'var(--accent)' : 'var(--hairline)',
                    background: path.unit === u.unit ? 'var(--accent)/8' : 'var(--surface-2)',
                  }}
                >
                  <span>
                    <span className="text-[12px] text-[var(--text-3)]">Unit {u.unit} · </span>
                    <span className="text-[15px] font-semibold text-[var(--text)]">{u.title}</span>
                  </span>
                  {path.unit === u.unit && <Check size={18} className="text-[var(--accent)]" />}
                </button>
              ))}
            </div>
          </Row>
        )}
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <GhostButton onClick={() => path.unit != null && set({ unit: null })}>重置</GhostButton>
        <PrimaryButton onClick={handleConfirm} disabled={!canConfirm}>
          确认并开始 <Check size={16} />
        </PrimaryButton>
      </div>

      {/* Dynamic fetch */}
      <Panel>
        <div className="px-4 py-3">
          <div className="text-[13px] font-semibold text-[var(--text-2)]">加载外部教材 JSON（可选）</div>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">
            粘贴一个返回教材 JSON（符合数据 schema）的链接，可动态扩充单元。格式见数据文档。
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://example.com/edition.json"
              className="flex-1 rounded-full border border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-2 text-[14px] outline-none focus:border-[var(--accent)]"
            />
            <GhostButton onClick={handleRemoteLoad}>加载</GhostButton>
          </div>
          {remoteMsg && <p className="mt-2 text-[12px] text-[var(--vocab)]">{remoteMsg}</p>}
          {loadError && <p className="mt-2 text-[12px] text-[var(--trap)]">{loadError}</p>}
        </div>
      </Panel>
    </div>
  );
}

function Chip({ children, active, onClick }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="press rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--hairline)',
        background: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-2)',
      }}
    >
      {children}
    </button>
  );
}
