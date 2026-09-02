import { useState, useEffect, useMemo, useRef } from 'react';
import { Brain, AlertTriangle, Flame, Volume2, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import type { StudyItem, Kind } from '../types/index.ts';
import { getAllProgress, getErrors } from '../db/db.ts';
import { isDue, intervalLabel } from '../db/srs.ts';
import { KIND_META } from '../lib/utils.ts';
import { t } from '../lib/i18n.ts';
import { requestSpeak } from '../components/FloatingTTS.tsx';
import { Panel, Row, Tag } from '../components/ui/primitives.tsx';
import PaginationBar from '../components/PaginationBar.tsx';
import { usePagination } from '../lib/pagination.ts';
import { recordReview, clearResolvedErrors } from '../db/db.ts';

type Tab = 'due' | 'recent' | 'traps';

export default function ReviewView() {
  const { unit, studyItems, selection, tts } = useAppStore();
  const locale = useAppStore(s => s.locale);
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
  const pager = usePagination(normalizedList, 20);
  const pagedList = pager.slice;
  const lookupItem = (id: string) => studyItems.find((i) => i.id === id);

  if (!unit) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-10 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('reviewNoUnit', locale)}</div>;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3"><h2 className="text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('reviewTitle', locale)}</h2><p className="mt-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('reviewDesc', locale)}</p></div>

      <div className="mb-4 flex gap-2">
        <FilterTab active={tab === 'due'} onClick={() => setTab('due')} icon={Brain} label={t('reviewDue', locale)} count={dueItems.length} />
        <FilterTab active={tab === 'recent'} onClick={() => setTab('recent')} icon={AlertTriangle} label={t('reviewRecent', locale)} count={recentMistakes.length} />
        <FilterTab active={tab === 'traps'} onClick={() => setTab('traps')} icon={Flame} label={t('reviewTraps', locale)} count={traps.length} />
      </div>

      {list.length === 0 ? <Panel><div className="p-8 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">
        {tab === 'due' && t('reviewEmpty', locale)}
        {tab === 'recent' && t('reviewEmptyRecent', locale)}
        {tab === 'traps' && t('reviewEmptyTraps', locale)}</div></Panel>
      : <Panel>
        {pagedList.map((row, i) => {
          const item = lookupItem(row.itemId);
          if (!item) return null;
          const meta = KIND_META[item.kind];
          return (
            <Row key={(row.key || i) + '-' + i} onClick={() => setReviewItem(item)}>
              <div className="flex items-center gap-3">
                <Tag kind={item.kind}>{meta.label[useAppStore.getState().locale]}</Tag>
                <div className="min-w-0 flex-1"><div className="truncate text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{item.label}</div><p className="mt-0.5 truncate text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{item.meaning}</p></div>
                {row.srs && <span className="tnum shrink-0 text-[calc(11px*var(--type-scale))] text-[var(--color-text-2)]">{intervalLabel(row.srs.interval)}</span>}
                <button onClick={(e) => { e.stopPropagation(); requestSpeak(item.label, tts.accent, tts.rate); }} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"><Volume2 size={16} style={{ color: meta.tint }} /></button>
              </div>
            </Row>
          );
        })}
      </Panel>}

      <PaginationBar page={pager.page} totalPages={pager.totalPages} onPrev={pager.prev} onNext={pager.next} />

      {tab === 'recent' && recentMistakes.length > 0 && (
        <div className="mt-3 flex justify-end"><button onClick={async () => { await clearResolvedErrors(); load(); }} className="press rounded-full border border-[var(--color-hairline)] px-4 py-2 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('reviewClear', locale)}</button></div>
      )}

      {reviewItem && <QuickReview item={reviewItem} onClose={() => setReviewItem(null)} onGraded={load} selection={selection} />}
    </div>
  );
}

function FilterTab({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof Brain; label: string; count: number }) {
  return <button onClick={onClick} className="press flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-[calc(13px*var(--type-scale))] font-medium" style={{ borderColor: active ? 'var(--color-accent)' : 'var(--color-hairline)', background: active ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)', color: active ? 'var(--color-accent)' : 'var(--color-text-2)' }}>
      <Icon size={15} /> {label}<span className="tnum ml-0.5 rounded-full bg-[var(--color-track)] px-1.5 text-[calc(11px*var(--type-scale))] text-[var(--color-text-2)]">{count}</span></button>;
}

function QuickReview({ item, onClose, onGraded, selection }: { item: StudyItem; onClose: () => void; onGraded: () => void; selection: { editionId: string } | null }) {
  const [flip, setFlip] = useState(false);
  const locale = useAppStore(s => s.locale);
  const closeRef = useRef<HTMLButtonElement>(null);
  const meta = KIND_META[item.kind];
  const grade = async (q: number) => { if (selection) await recordReview({ key: `${selection.editionId}:${item.id}`, editionId: selection.editionId, itemId: item.id, kind: item.kind, q }); onGraded(); onClose(); };
  // Esc closes; focus lands on dismiss button on open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.label}>
      <div className="w-full max-w-sm rounded-[var(--radius-hero)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-overlay)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><Tag kind={item.kind}>{meta.label[locale]}</Tag><button ref={closeRef} onClick={onClose} aria-label={t('close', locale)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]">✕</button></div>
        <h3 className="mt-4 text-center text-[calc(28px*var(--type-scale))] font-bold tracking-[-0.02em]">{item.label}</h3>
        {item.phonetic && <p className="text-center font-mono text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{item.phonetic}</p>}
        {flip && <p className="mt-3 text-center text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{item.meaning}</p>}
        <button onClick={() => setFlip((v) => !v)} className="press mt-4 w-full rounded-full border border-[var(--color-hairline)] py-2.5 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{flip ? t('reviewHideAnswer', locale) : t('reviewShowAnswer', locale)}</button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={() => grade(2)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-trap-deep)]"><X size={16} /> {t('reviewStillWrong', locale)}</button>
          <button onClick={() => grade(5)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-vocab-deep)]">{t('known', locale)}</button>
        </div>
      </div>
    </div>
  );
}
