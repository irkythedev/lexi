// Collocation Connector — tap-to-pair verb stems with correct prepositions or
// gerund/infinitive structures. Mobile-friendly (no drag needed). On wrong
// match, shake; correct pairs lock with a check. Failed items go to error notebook.
import { useState, useMemo } from 'react';
import { Check, X, RefreshCw, Trophy } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { shuffle } from '../lib/utils.js';
import { addError, recordReview } from '../lib/db.js';

// Build pair tasks from the unit's phrases (split fixedPatterns on " + ").
function buildPairs(unit) {
  const pairs = [];
  (unit.phrases || []).forEach((p) => {
    const parts = (p.fixedPatterns || `${p.phrase} + ${p.meaning}`)
      .split(/\s*\+\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      pairs.push({
        id: p.id,
        left: parts[0],
        right: parts.slice(1).join(' + '),
        // distractors pulled from other phrases' right-parts
      });
    }
  });
  return pairs;
}

export default function CollocationConnector({ onExit }) {
  const { unit, selection, tts } = useApp();
  const pairs = useMemo(() => buildPairs(unit || { phrases: [] }), [unit]);

  const rights = useMemo(() => shuffle(pairs.map((p) => ({ id: p.id, text: p.right }))), [pairs]);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matched, setMatched] = useState({}); // rightId -> true
  const [wrong, setWrong] = useState(null); // {leftId, rightId}
  const [done, setDone] = useState(false);

  if (!pairs.length) {
    return (
      <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-8 text-center text-[var(--text-2)]">
        本单元暂无可用于搭配拼接的短语结构。
      </div>
    );
  }

  const pickLeft = (p) => {
    if (matched[p.id]) return;
    setSelectedLeft(p);
    setWrong(null);
  };

  const pickRight = async (r) => {
    if (!selectedLeft || matched[r.id]) return;
    if (selectedLeft.id === r.id) {
      // correct
      setMatched((m) => ({ ...m, [r.id]: true }));
      setSelectedLeft(null);
      await recordReview({
        key: `${selection.editionId}:${selectedLeft.id}`,
        editionId: selection.editionId,
        itemId: selectedLeft.id,
        kind: 'phrase',
        q: 5,
      });
      if (Object.keys({ ...matched, [r.id]: true }).length === pairs.length) {
        setDone(true);
      }
    } else {
      // wrong
      setWrong({ leftId: selectedLeft.id, rightId: r.id });
      await addError({
        key: `${selection.editionId}:${selectedLeft.id}`,
        editionId: selection.editionId,
        itemId: selectedLeft.id,
        kind: 'phrase',
        prompt: `${selectedLeft.left} + ?`,
        answer: selectedLeft.right,
        reason: '搭配拼接错误',
      });
      setTimeout(() => setWrong(null), 600);
    }
  };

  const reset = () => {
    setMatched({});
    setSelectedLeft(null);
    setWrong(null);
    setDone(false);
  };

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[14px] text-[var(--text-2)]">
          ← 返回
        </button>
        <button onClick={reset} className="press flex items-center gap-1 text-[13px] text-[var(--text-2)]">
          <RefreshCw size={15} /> 重玩
        </button>
      </div>

      <h2 className="text-[20px] font-bold tracking-[-0.01em]">搭配拼图</h2>
      <p className="mt-1 text-[13px] text-[var(--text-3)]">
        点击左侧词干，再点右侧正确搭配，组成完整结构。错误会自动记入错题本。
      </p>

      {done ? (
        <div className="mt-8 flex flex-col items-center rounded-[var(--r-hero)] bg-[var(--vocab-soft)] p-8 text-center" style={{ border: '1px solid var(--vocab-border)' }}>
          <Trophy size={40} className="text-[var(--vocab)]" />
          <p className="mt-3 text-[18px] font-bold text-[var(--text)]">全部配对成功！</p>
          <button onClick={reset} className="press mt-4 rounded-full bg-[var(--vocab)] px-5 py-2 text-[14px] font-semibold text-white">
            再来一次
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* LEFT column */}
          <div>
            <div className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--text-3)]">词干 / 结构前半</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pairs.map((p) => (
                <button
                  key={p.id}
                  disabled={matched[p.id]}
                  onClick={() => pickLeft(p)}
                  className={`press rounded-[var(--r-card)] border px-4 py-3 text-left text-[15px] font-semibold transition ${
                    matched[p.id]
                      ? 'opacity-40'
                      : selectedLeft?.id === p.id
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                      : 'border-[var(--hairline)] bg-[var(--surface)]'
                  } ${wrong?.leftId === p.id ? 'animate-shake' : ''}`}
                >
                  <span className="flex items-center justify-between">
                    {p.left}
                    {matched[p.id] && <Check size={16} className="text-[var(--vocab)]" />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT column */}
          <div>
            <div className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--text-3)]">搭配 / 介词 / 形式</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rights.map((r) => (
                <button
                  key={r.id}
                  disabled={matched[r.id]}
                  onClick={() => pickRight(r)}
                  className={`press rounded-[var(--r-card)] border px-4 py-3 text-left text-[15px] transition ${
                    matched[r.id]
                      ? 'opacity-40 border-[var(--vocab-border)] bg-[var(--vocab-soft)]'
                      : wrong?.rightId === r.id
                      ? 'border-[var(--trap-border)] bg-[var(--trap-soft)] animate-shake'
                      : selectedLeft
                      ? 'border-[var(--hairline)] bg-[var(--surface)] hover:border-[var(--phrase-border)]'
                      : 'border-[var(--hairline)] bg-[var(--surface)]'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    {r.text}
                    {matched[r.id] && <Check size={16} className="text-[var(--vocab)]" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
