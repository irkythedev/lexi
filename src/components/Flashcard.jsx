// 3D Flashcard — front shows target word/phrase/pattern + IPA + TTS + masked
// example; back shows translation, collocation split pills, and exam tips.
import { useState } from 'react';
import { Volume2, RotateCcw, Check, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { KIND_META, splitCollocation } from '../lib/utils.js';
import { Tag } from './ui/primitives.jsx';
import { recordReview } from '../lib/db.js';
import { requestSpeak } from './FloatingTTS.jsx';

export default function Flashcard({ items, onExit }) {
  const { tts, unit, selection } = useApp();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grade, setGrade] = useState(null); // 'good' | 'again'

  const item = items[idx];
  if (!item) return null;

  const meta = KIND_META[item.kind] || KIND_META.vocab;
  const speakTarget = () => {
    const text =
      item.kind === 'vocab' ? item.word : item.kind === 'phrase' ? item.phrase : item.pattern;
    requestSpeak(text, tts.accent, tts.rate);
  };

  const next = () => {
    setFlipped(false);
    setGrade(null);
    setIdx((i) => Math.min(i + 1, items.length - 1));
  };
  const prev = () => {
    setFlipped(false);
    setGrade(null);
    setIdx((i) => Math.max(i - 1, 0));
  };

  // On "know / don't know", record an SRS review (q=5 / q=2) and advance.
  const gradeCard = async (knows) => {
    setGrade(knows ? 'good' : 'again');
    const key = `${selection.editionId}:${item.id}`;
    await recordReview({
      key,
      editionId: selection.editionId,
      itemId: item.id,
      kind: item.kind,
      q: knows ? 5 : 2,
    });
    setTimeout(() => next(), 420);
  };

  const cols = item.collocations || (item.fixedPatterns ? [item.fixedPatterns] : item.examTips ? [] : []);
  const collos = item.collocations || (item.kind === 'phrase' && item.fixedPatterns ? [item.fixedPatterns] : []);

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[14px] text-[var(--text-2)]">
          <ArrowLeft size={18} /> 返回
        </button>
        <span className="tnum text-[13px] text-[var(--text-3)]">
          {idx + 1} / {items.length}
        </span>
      </div>

      {/* progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--track)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${((idx + 1) / items.length) * 100}%`, background: meta.tint }}
        />
      </div>

      <div className="flip-scene h-[420px]">
        <div className={`flip-inner h-full ${flipped ? 'is-flipped' : ''}`}>
          {/* FRONT */}
          <div
            className="flip-face absolute inset-0 flex flex-col rounded-[var(--r-hero)] border p-6 shadow-[var(--sh-panel)]"
            style={{ background: 'var(--surface)', borderColor: meta.border }}
          >
            <div className="flex items-center justify-between">
              <Tag kind={item.kind}>{meta.label}</Tag>
              <button onClick={speakTarget} className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5" aria-label="朗读">
                <Volume2 size={18} style={{ color: meta.tint }} />
              </button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h2 className="text-[clamp(28px,7vw,42px)] font-bold tracking-[-0.02em] text-[var(--text)]">
                {item.kind === 'vocab' ? item.word : item.kind === 'phrase' ? item.phrase : item.pattern}
              </h2>
              {(item.phonetic || item.kind === 'vocab') && (
                <p className="mt-2 font-mono text-[15px] text-[var(--text-3)]">{item.phonetic || ''}</p>
              )}
              {item.pos && <p className="mt-1 text-[13px] text-[var(--text-3)]">{item.pos}</p>}

              {(item.exampleEn || item.exampleCn) && (
                <div className="mt-5 w-full rounded-[var(--r-card)] bg-[var(--surface-2)] p-4 text-left">
                  {item.exampleEn && (
                    <p className="text-[14px] text-[var(--text-body)]">
                      例：{item.exampleEn.replace(new RegExp(`\\b(${targetWord(item)})\\b`, 'i'), '＿＿＿')}
                    </p>
                  )}
                  {item.exampleCn && <p className="mt-1 text-[13px] text-[var(--text-3)]">{item.exampleCn}</p>}
                </div>
              )}
            </div>

            <button
              onClick={() => setFlipped(true)}
              className="press mt-2 w-full rounded-full border border-[var(--hairline)] py-2.5 text-[14px] font-medium text-[var(--text-2)]"
            >
              看答案 / 翻转
            </button>
          </div>

          {/* BACK */}
          <div
            className="flip-face flip-back absolute inset-0 flex flex-col rounded-[var(--r-hero)] border p-6 shadow-[var(--sh-panel)]"
            style={{ background: meta.soft, borderColor: meta.border }}
          >
            <div className="flex items-center justify-between">
              <Tag kind={item.kind}>{meta.label}</Tag>
              <button onClick={speakTarget} className="press flex h-9 w-9 items-center justify-center rounded-full" aria-label="朗读">
                <Volume2 size={18} style={{ color: meta.tint }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="text-[13px] font-semibold text-[var(--text-3)]">释义</div>
              <p className="mt-1 text-[17px] font-semibold text-[var(--text)]">{item.meaning || '—'}</p>

              {collos.length > 0 && (
                <>
                  <div className="mt-4 text-[13px] font-semibold text-[var(--text-3)]">
                    {item.kind === 'vocab' ? '固定搭配' : '结构 / 搭配'}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {collos.map((c, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-1.5">
                        {splitCollocation(c).map((part, j) => (
                          <span
                            key={j}
                            className="rounded-full border px-3 py-1 text-[13px] font-medium"
                            style={{ borderColor: meta.border, background: 'var(--surface)', color: meta.text }}
                          >
                            {part}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {(item.grammarPoint || item.examTips) && (
                <>
                  <div className="mt-4 text-[13px] font-semibold text-[var(--text-3)]">考点 / 语法</div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-body)]">
                    {item.grammarPoint || item.examTips}
                  </p>
                </>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => gradeCard(false)}
                className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--trap-border)] bg-[var(--trap-soft)] py-2.5 text-[14px] font-semibold text-[var(--trap)]"
              >
                <X size={16} /> 没记住
              </button>
              <button
                onClick={() => gradeCard(true)}
                className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--vocab-border)] bg-[var(--vocab-soft)] py-2.5 text-[14px] font-semibold text-[var(--vocab)]"
              >
                <Check size={16} /> 记住了
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={prev} disabled={idx === 0} className="press flex items-center gap-1 rounded-full border border-[var(--hairline)] px-4 py-2 text-[14px] text-[var(--text-2)] disabled:opacity-40">
          <ArrowLeft size={16} /> 上一张
        </button>
        <button onClick={next} disabled={idx === items.length - 1} className="press flex items-center gap-1 rounded-full border border-[var(--hairline)] px-4 py-2 text-[14px] text-[var(--text-2)] disabled:opacity-40">
          下一张 <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function targetWord(item) {
  if (item.kind === 'vocab') return item.word || '';
  if (item.kind === 'phrase') return item.phrase || '';
  return item.pattern || '';
}
