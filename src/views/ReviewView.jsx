// SRS Review & Error Notebook hub (spec §4.5).
//   - "Ready for Review Today": items whose SRS dueDate <= now
//   - "Recent Mistakes": from the error notebook
//   - "High-Frequency Traps": items reviewed many times / repeated errors
// Tapping an item opens a quick re-flashcard review.
import { useState, useEffect, useMemo } from 'react';
import { Brain, AlertTriangle, Flame, RefreshCw, Check, X, Volume2 } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { getAllProgress, getErrors, getSetting } from '../lib/db.js';
import { isDue, intervalLabel } from '../lib/srs.js';
import { KIND_META } from '../lib/utils.js';
import { requestSpeak } from '../components/FloatingTTS.jsx';
import { Panel, Row, Tag, PrimaryButton } from '../components/ui/primitives.jsx';
import { recordReview, markErrorResolved, clearResolvedErrors } from '../lib/db.js';

export default function ReviewView() {
  const { unit, studyItems, selection, tts } = useApp();
  const [progress, setProgress] = useState([]);
  const [errors, setErrors] = useState([]);
  const [tab, setTab] = useState('due');
  const [reviewItem, setReviewItem] = useState(null);

  const load = async () => {
    const [p, e] = await Promise.all([getAllProgress(), getErrors()]);
    setProgress(p);
    setErrors(e);
  };
  useEffect(() => { load(); }, []);

  // Only progress belonging to the current unit.
  const unitProgress = useMemo(
    () => progress.filter((p) => p.editionId === selection?.editionId && studyItems.some((i) => i.id === p.itemId)),
    [progress, selection, studyItems]
  );

  const dueItems = unitProgress.filter((p) => isDue(p));
  const recentMistakes = errors.filter((e) => e.editionId === selection?.editionId).slice(0, 20);

  // High-frequency traps: items with repetitions but short interval (struggling).
  const traps = [...unitProgress]
    .filter((p) => p.srs && p.srs.repetitions > 0 && p.srs.interval <= 6)
    .sort((a, b) => (a.srs.interval) - (b.srs.interval))
    .slice(0, 20);

  const list = tab === 'due' ? dueItems : tab === 'recent' ? recentMistakes.map((e) => ({ ...e, itemId: e.itemId, kind: e.kind })) : traps;

  if (!unit) {
    return (
      <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-10 text-center text-[15px] text-[var(--text-2)]">
        请先选择教材单元。复习队列会基于你在本单元的练习记录生成。
      </div>
    );
  }

  const lookupItem = (itemId) => studyItems.find((i) => i.id === itemId);

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3">
        <h2 className="text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">复习与错题</h2>
        <p className="mt-1 text-[14px] text-[var(--text-2)]">间隔重复会自动安排回顾时间；错题本记录每次失误。</p>
      </div>

      <div className="mb-4 flex gap-2">
        <FilterTab active={tab === 'due'} onClick={() => setTab('due')} icon={Brain} label="今日待复习" count={dueItems.length} />
        <FilterTab active={tab === 'recent'} onClick={() => setTab('recent')} icon={AlertTriangle} label="最近错题" count={recentMistakes.length} />
        <FilterTab active={tab === 'traps'} onClick={() => setTab('traps')} icon={Flame} label="高频易错" count={traps.length} />
      </div>

      {list.length === 0 ? (
        <Panel>
          <div className="p-8 text-center text-[14px] text-[var(--text-3)]">
            {tab === 'due' && '太棒了，今天没有待复习项。去练习里制造一些记忆吧！'}
            {tab === 'recent' && '还没有错题记录。'}
            {tab === 'traps' && '暂无明显高频易错项。'}
          </div>
        </Panel>
      ) : (
        <Panel>
          {list.map((row, i) => {
            const item = lookupItem(row.itemId);
            if (!item) return null;
            const meta = KIND_META[item.kind];
            const label = item.kind === 'vocab' ? item.word : item.kind === 'phrase' ? item.phrase : item.pattern;
            return (
              <Row key={(row.key || row.id || i) + '-' + i} onClick={() => setReviewItem(item)}>
                <div className="flex items-center gap-3">
                  <Tag kind={item.kind}>{meta.label}</Tag>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-[var(--text)]">{label}</div>
                    <p className="mt-0.5 truncate text-[13px] text-[var(--text-2)]">{item.meaning}</p>
                  </div>
                  {row.srs && (
                    <span className="tnum shrink-0 text-[11px] text-[var(--text-3)]">{intervalLabel(row.srs.interval)}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); requestSpeak(label, tts.accent, tts.rate); }}
                    className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
                  >
                    <Volume2 size={16} style={{ color: meta.tint }} />
                  </button>
                </div>
              </Row>
            );
          })}
        </Panel>
      )}

      {tab === 'recent' && recentMistakes.length > 0 && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={async () => { await clearResolvedErrors(); load(); }}
            className="press rounded-full border border-[var(--hairline)] px-4 py-2 text-[13px] text-[var(--text-2)]"
          >
            清除已掌握错题
          </button>
        </div>
      )}

      {reviewItem && (
        <QuickReview item={reviewItem} onClose={() => setReviewItem(null)} onGraded={load} selection={selection} />
      )}
    </div>
  );
}

function FilterTab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className="press flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-[13px] font-medium"
      style={{
        borderColor: active ? 'var(--accent)' : 'var(--hairline)',
        background: active ? 'var(--accent)/10' : 'var(--surface)',
        color: active ? 'var(--accent)' : 'var(--text-2)',
      }}
    >
      <Icon size={15} /> {label}
      <span className="tnum ml-0.5 rounded-full bg-[var(--track)] px-1.5 text-[11px]">{count}</span>
    </button>
  );
}

function QuickReview({ item, onClose, onGraded, selection }) {
  const [flip, setFlip] = useState(false);
  const meta = KIND_META[item.kind];
  const label = item.kind === 'vocab' ? item.word : item.kind === 'phrase' ? item.phrase : item.pattern;
  const grade = async (q) => {
    await recordReview({ key: `${selection.editionId}:${item.id}`, editionId: selection.editionId, itemId: item.id, kind: item.kind, q });
    onGraded();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[var(--r-hero)] bg-[var(--surface)] p-6 shadow-[var(--sh-overlay)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <Tag kind={item.kind}>{meta.label}</Tag>
          <button onClick={onClose} className="text-[var(--text-3)]">✕</button>
        </div>
        <h3 className="mt-4 text-center text-[28px] font-bold tracking-[-0.02em]">{label}</h3>
        {item.phonetic && <p className="text-center font-mono text-[14px] text-[var(--text-3)]">{item.phonetic}</p>}
        {flip && <p className="mt-3 text-center text-[16px] font-semibold text-[var(--text)]">{item.meaning}</p>}
        <button onClick={() => setFlip((v) => !v)} className="press mt-4 w-full rounded-full border border-[var(--hairline)] py-2.5 text-[14px] text-[var(--text-2)]">
          {flip ? '隐藏释义' : '显示释义'}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={() => grade(2)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--trap-border)] bg-[var(--trap-soft)] py-2.5 text-[14px] font-semibold text-[var(--trap)]">
            <X size={16} /> 还不会
          </button>
          <button onClick={() => grade(5)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--vocab-border)] bg-[var(--vocab-soft)] py-2.5 text-[14px] font-semibold text-[var(--vocab)]">
            <Check size={16} /> 会了
          </button>
        </div>
      </div>
    </div>
  );
}
