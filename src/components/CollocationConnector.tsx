import { useState, useMemo } from 'react';
import { Check, Trophy, RefreshCw } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import type { Unit } from '../types/index.ts';
import { shuffle } from '../lib/utils.ts';
import { t } from '../lib/i18n.ts';
import { addError, recordReview } from '../db/db.ts';

function buildPairs(unit: Unit | null): { id: string; left: string; right: string }[] {
  const pairs: { id: string; left: string; right: string }[] = [];
  (unit?.phrases ?? []).forEach((p) => {
    const parts = (p.fixedPatterns || `${p.phrase} + ${p.meaning}`).split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) pairs.push({ id: p.id, left: parts[0], right: parts.slice(1).join(' + ') });
  });
  return pairs;
}

export default function CollocationConnector({ onExit }: { onExit: () => void }) {
  const { unit, selection } = useAppStore();
  const locale = useAppStore(s => s.locale);
  const pairs = useMemo(() => buildPairs(unit), [unit]);
  const rights = useMemo(() => shuffle(pairs.map((p) => ({ id: p.id, text: p.right }))), [pairs]);
  const [selectedLeft, setSelectedLeft] = useState<{ id: string; left: string; right: string } | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [wrong, setWrong] = useState<{ leftId: string; rightId: string } | null>(null);
  const [done, setDone] = useState(false);

  if (!pairs.length) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-8 text-center text-[var(--color-text-2)]">{t('connectorNoPairs', locale)}</div>;

  const pickLeft = (p: { id: string; left: string; right: string }) => { if (matched[p.id]) return; setSelectedLeft(p); setWrong(null); };

  const pickRight = async (r: { id: string; text: string }) => {
    if (!selectedLeft || matched[r.id]) return;
    if (selectedLeft.id === r.id) {
      setMatched((m) => ({ ...m, [r.id]: true }));
      setSelectedLeft(null);
      if (selection) await recordReview({ key: `${selection.editionId}:${selectedLeft.id}`, editionId: selection.editionId, itemId: selectedLeft.id, kind: 'phrase', q: 5 });
      if (Object.keys({ ...matched, [r.id]: true }).length === pairs.length) setDone(true);
    } else {
      setWrong({ leftId: selectedLeft.id, rightId: r.id });
      if (selection) await addError({ key: `${selection.editionId}:${selectedLeft.id}`, editionId: selection.editionId, itemId: selectedLeft.id, kind: 'phrase', prompt: `${selectedLeft.left} + ?`, answer: selectedLeft.right, reason: '搭配拼接错误' });
      setTimeout(() => setWrong(null), 600);
    }
  };

  const reset = () => { setMatched({}); setSelectedLeft(null); setWrong(null); setDone(false); };

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[15px] text-[var(--color-text-2)]"><span>←</span> {t('back', locale)}</button>
        <button onClick={reset} className="press flex items-center gap-1 text-[13px] text-[var(--color-text-2)]"><RefreshCw size={15} /> {t('connectorReset', locale)}</button>
      </div>
      <h2 className="text-[20px] font-bold tracking-[-0.01em]">搭配拼图</h2>
      <p className="mt-1 text-[13px] text-[var(--color-text-2)]">点击左侧词干，再点右侧正确搭配，组成完整结构。错误会自动记入错题本。</p>

      {done ? (
        <div className="mt-8 flex flex-col items-center rounded-[var(--radius-hero)] p-8 text-center" style={{ background: 'var(--color-vocab-soft)', border: '1px solid var(--color-vocab-border)' }}>
          <Trophy size={40} className="text-[var(--color-vocab)]" />
          <p className="mt-3 text-[18px] font-bold text-[var(--color-text)]">全部配对成功！</p>
          <button onClick={reset} className="press mt-4 rounded-[var(--radius-md)] bg-[var(--color-text)] px-5 py-2 text-[15px] font-semibold text-[var(--color-surface)]">再来一次</button>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div>
            <div className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--color-text-2)]">词干 / 结构前半</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pairs.map((p) => (
                <button key={p.id} disabled={matched[p.id]} onClick={() => pickLeft(p)}
                  className={`press rounded-[var(--radius-card)] border px-4 py-3 text-left text-[15px] font-semibold transition ${matched[p.id] ? 'opacity-40' : selectedLeft?.id === p.id ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]' : 'border-[var(--color-hairline)] bg-[var(--color-surface)]'} ${wrong?.leftId === p.id ? 'animate-shake' : ''}`}>
                  <span className="flex items-center justify-between">{p.left}{matched[p.id] && <Check size={16} className="text-[var(--color-vocab)]" />}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--color-text-2)]">搭配 / 介词 / 形式</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rights.map((r) => (
                <button key={r.id} disabled={matched[r.id]} onClick={() => pickRight(r)}
                  className={`press rounded-[var(--radius-card)] border px-4 py-3 text-left text-[15px] transition ${matched[r.id] ? 'border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] opacity-40' : wrong?.rightId === r.id ? 'border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] animate-shake' : selectedLeft ? 'border-[var(--color-hairline)] bg-[var(--color-surface)] hover:border-[var(--color-phrase-border)]' : 'border-[var(--color-hairline)] bg-[var(--color-surface)]'}`}>
                  <span className="flex items-center justify-between">{r.text}{matched[r.id] && <Check size={16} className="text-[var(--color-vocab)]" />}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
