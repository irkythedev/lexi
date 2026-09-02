import { useState, useMemo } from 'react';
import { Check, Trophy, RefreshCw } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import type { Unit } from '../types/index.ts';
import { shuffle } from '../lib/utils.ts';
import { t } from '../lib/i18n.ts';
import { addError, recordReview } from '../db/db.ts';

/** 仅接受英文结构片段：含中文字符的片段判定为无效（杜绝中文释义冒充搭配）。 */
const IS_CHINESE = /[\u4e00-\u9fff]/;

function buildPairs(unit: Unit | null): { id: string; left: string; right: string }[] {
  const pairs: { id: string; left: string; right: string }[] = [];
  (unit?.phrases ?? []).forEach((p) => {
    // 只认英文结构 fixedPatterns；无结构数据直接跳过（不拿中文 meaning 拼凑）
    if (!p.fixedPatterns || IS_CHINESE.test(p.fixedPatterns)) return;
    const parts = p.fixedPatterns.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2 && !parts.some((part) => IS_CHINESE.test(part))) {
      pairs.push({ id: p.id, left: parts[0], right: parts.slice(1).join(' + ') });
    }
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
        <button onClick={onExit} className="press flex items-center gap-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]"><span>←</span> {t('back', locale)}</button>
        <button onClick={reset} className="press flex items-center gap-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]"><RefreshCw size={15} /> {t('connectorReset', locale)}</button>
      </div>
      <h2 className="text-[calc(20px*var(--type-scale))] font-bold tracking-[-0.01em]">{t('connector', locale)}</h2>
      <p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('connectorHint', locale)}</p>

      {done ? (
        <div className="mt-8 flex flex-col items-center rounded-[var(--radius-hero)] p-8 text-center" style={{ background: 'var(--color-vocab-soft)', border: '1px solid var(--color-vocab-border)' }}>
          <Trophy size={40} className="text-[var(--color-vocab)]" />
          <p className="mt-3 text-[calc(18px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('connectorAllCorrect', locale)}</p>
          <button onClick={reset} className="press mt-4 rounded-[var(--radius-md)] bg-[var(--color-text)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-surface)]">{t('connectorAgain', locale)}</button>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div>
            <div className="mb-2 text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('connectorLeftLabel', locale)}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pairs.map((p) => (
                <button key={p.id} disabled={matched[p.id]} onClick={() => pickLeft(p)}
                  className={`press rounded-[var(--radius-card)] border-2 px-4 py-3 text-left text-[calc(15px*var(--type-scale))] font-semibold transition ${matched[p.id] ? 'opacity-40' : selectedLeft?.id === p.id ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]' : 'border-[var(--color-hairline)] bg-[var(--color-surface)]'} ${wrong?.leftId === p.id ? 'animate-shake' : ''}`}>
                  <span className="flex items-center justify-between">{p.left}{matched[p.id] && <Check size={16} className="text-[var(--color-vocab)]" />}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('connectorRightLabel', locale)}</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rights.map((r) => (
                <button key={r.id} disabled={matched[r.id]} onClick={() => pickRight(r)}
                  className={`press rounded-[var(--radius-card)] border-2 px-4 py-3 text-left text-[calc(15px*var(--type-scale))] transition ${matched[r.id] ? 'border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] opacity-40' : wrong?.rightId === r.id ? 'border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] animate-shake' : selectedLeft ? 'border-[var(--color-hairline)] bg-[var(--color-surface)] hover:border-[var(--color-phrase-border)]' : 'border-[var(--color-hairline)] bg-[var(--color-surface)]'}`}>
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
