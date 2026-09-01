import { useState, useEffect, useMemo } from 'react';
import { Brain, AlertTriangle, Flame, Volume2, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import type { StudyItem, Kind } from '../types/index.ts';
import { getAllProgress, getErrors } from '../db/db.ts';
import { isDue, intervalLabel } from '../db/srs.ts';
import { KIND_META } from '../lib/utils.ts';
import { requestSpeak } from '../components/FloatingTTS.tsx';
import { Panel, Row, Tag } from '../components/ui/primitives.tsx';
import { recordReview, clearResolvedErrors } from '../db/db.ts';

type Tab = 'due' | 'recent' | 'traps';

export default function ReviewView() {
  const { unit, studyItems, selection, tts } = useAppStore();
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof getAllProgress>>>([]);
  const [errors, setErrors] = useState<Awaited<ReturnType<typeof getErrors>>>([]);
  const [tab, setTab] = useState<Tab>('due');
  const [reviewItem, setReviewItem] = useState<StudyItem | null>(null);

  const load = async () => { const [p, e] = await Promise.all([getAllProgress(), getErrors()]); setProgress(p); setErrors(e); };
  useEffect(() => { load(); }, []);

  const unitProgress = useMemo(() => progress.filter((p) => p.editionId === selection?.editionId && studyItems.some((i) => i.id === p.itemId)), [progress, selection, studyItems]);
  const dueItems = unitProgress.filter((p) => isDue(p.srs));
  const recentMistakes = errors.filter((e) => e.editionId === selection?.editionId).slice(0, 20);
  const traps = [...unitProgress].filter((p) => p.srs && p.srs.repetitions > 0 && p.srs.interval <= 6).sort((a, b) => (a.srs?.interval ?? 0) - (b.srs?.interval ?? 0)).slice(0, 20);
  const list = tab === 'due' ? dueItems : tab === 'recent' ? recentMistakes : traps;
  const normalizedList = list.map((row: any) => ({
    key: row.key ?? String(row.id),
    itemId: row.itemId,
    kind: row.kind as Kind,
    srs: row.srs,
  }));
  const lookupItem = (id: string) => studyItems.find((i) => i.id === id);

  if (!unit) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-10 text-center text-[15px] text-[var(--color-text-2)]">请先选择教材单元。复习队列会基于你在本单元的练习记录生成。</div>;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3"><h2 className="text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">复习与错题</h2><p className="mt-1 text-[15px] text-[var(--color-text-2)]">间隔重复会自动安排回顾时间；错题本记录每次失误。</p></div>

      <div className="mb-4 flex gap-2">
        <FilterTab active={tab === 'due'} onClick={() => setTab('due')} icon={Brain} label="今日待复习" count={dueItems.length} />
        <FilterTab active={tab === 'recent'} onClick={() => setTab('recent')} icon={AlertTriangle} label="最近错题" count={recentMistakes.length} />
        <FilterTab active={tab === 'traps'} onClick={() => setTab('traps')} icon={Flame} label="高频易错" count={traps.length} />
      </div>

      {list.length === 0 ? <Panel><div className="p-8 text-center text-[15px] text-[var(--color-text-2)]">
        {tab === 'due' && '太棒了，今天没有待复习项。去练习里制造一些记忆吧！'}
        {tab === 'recent' && '还没有错题记录。'}
        {tab === 'traps' && '暂无明显高频易错项。'}</div></Panel>
      : <Panel>
        {normalizedList.map((row, i) => {
          const item = lookupItem(row.itemId);
          if (!item) return null;
          const meta = KIND_META[item.kind];
          return (
            <Row key={(row.key || i) + '-' + i} onClick={() => setReviewItem(item)}>
              <div className="flex items-center gap-3">
                <Tag kind={item.kind}>{meta.label[useAppStore.getState().locale]}</Tag>
                <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold text-[var(--color-text)]">{item.label}</div><p className="mt-0.5 truncate text-[13px] text-[var(--color-text-2)]">{item.meaning}</p></div>
                {row.srs && <span className="tnum shrink-0 text-[11px] text-[var(--color-text-2)]">{intervalLabel(row.srs.interval)}</span>}
                <button onClick={(e) => { e.stopPropagation(); requestSpeak(item.label, tts.accent, tts.rate); }} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"><Volume2 size={16} style={{ color: meta.tint }} /></button>
              </div>
            </Row>
          );
        })}
      </Panel>}

      {tab === 'recent' && recentMistakes.length > 0 && (
        <div className="mt-3 flex justify-end"><button onClick={async () => { await clearResolvedErrors(); load(); }} className="press rounded-full border border-[var(--color-hairline)] px-4 py-2 text-[13px] text-[var(--color-text-2)]">清除已掌握错题</button></div>
      )}

      {reviewItem && <QuickReview item={reviewItem} onClose={() => setReviewItem(null)} onGraded={load} selection={selection} />}
    </div>
  );
}

function FilterTab({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof Brain; label: string; count: number }) {
  return <button onClick={onClick} className="press flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-[13px] font-medium" style={{ borderColor: active ? 'var(--color-accent)' : 'var(--color-hairline)', background: active ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)', color: active ? 'var(--color-accent)' : 'var(--color-text-2)' }}>
      <Icon size={15} /> {label}<span className="tnum ml-0.5 rounded-full bg-[var(--color-track)] px-1.5 text-[11px] text-[var(--color-text-2)]">{count}</span></button>;
}

function QuickReview({ item, onClose, onGraded, selection }: { item: StudyItem; onClose: () => void; onGraded: () => void; selection: { editionId: string } | null }) {
  const [flip, setFlip] = useState(false);
  const meta = KIND_META[item.kind];
  const grade = async (q: number) => { if (selection) await recordReview({ key: `${selection.editionId}:${item.id}`, editionId: selection.editionId, itemId: item.id, kind: item.kind, q }); onGraded(); onClose(); };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[var(--radius-hero)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-overlay)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><Tag kind={item.kind}>{meta.label[useAppStore.getState().locale]}</Tag><button onClick={onClose} className="text-[var(--color-text-2)]">✕</button></div>
        <h3 className="mt-4 text-center text-[28px] font-bold tracking-[-0.02em]">{item.label}</h3>
        {item.phonetic && <p className="text-center font-mono text-[15px] text-[var(--color-text-2)]">{item.phonetic}</p>}
        {flip && <p className="mt-3 text-center text-[16px] font-semibold text-[var(--color-text)]">{item.meaning}</p>}
        <button onClick={() => setFlip((v) => !v)} className="press mt-4 w-full rounded-full border border-[var(--color-hairline)] py-2.5 text-[15px] text-[var(--color-text-2)]">{flip ? '隐藏释义' : '显示释义'}</button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={() => grade(2)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] py-2.5 text-[15px] font-semibold text-[var(--color-trap-deep)]"><X size={16} /> 还不会</button>
          <button onClick={() => grade(5)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] py-2.5 text-[15px] font-semibold text-[var(--color-vocab-deep)]">会了</button>
        </div>
      </div>
    </div>
  );
}
