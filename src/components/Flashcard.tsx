import { useState } from 'react';
import { Volume2, Check, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import type { StudyItem } from '../types/index.ts';
import { KIND_META, splitCollocation } from '../lib/utils.ts';
import { t } from '../lib/i18n.ts';
import { requestSpeak } from './FloatingTTS.tsx';
import { recordReview } from '../db/db.ts';
import { Tag } from './ui/primitives.tsx';

export default function Flashcard({ items, onExit }: { items: StudyItem[]; onExit: () => void }) {
  const { tts, selection } = useAppStore();
  const locale = useAppStore(s => s.locale);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const item = items[idx];
  if (!item) return null;
  const meta = KIND_META[item.kind];

  const speakTarget = () => requestSpeak(item.label, tts.accent, tts.rate);
  const next = () => { setFlipped(false); setIdx((i) => Math.min(i + 1, items.length - 1)); };
  const prev = () => { setFlipped(false); setIdx((i) => Math.max(i - 1, 0)); };

  const gradeCard = async (knows: boolean) => {
    if (selection) await recordReview({ key: `${selection.editionId}:${item.id}`, editionId: selection.editionId, itemId: item.id, kind: item.kind, q: knows ? 5 : 2 });
    setTimeout(next, 420);
  };

  const collos = item.collocations ?? (item.kind === 'phrase' && item.fixedPatterns ? [item.fixedPatterns] : []);

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]"><ArrowLeft size={18} /> {t('back', locale)}</button>
        <span className="tnum text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{idx + 1} / {items.length}</span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-track)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${((idx + 1) / items.length) * 100}%`, background: meta.tint }} />
      </div>

      <div className="flip-scene h-[420px]">
        <div className={`flip-inner h-full ${flipped ? 'is-flipped' : ''}`}>
          {/* FRONT */}
          <div className="flip-face absolute inset-0 flex flex-col rounded-[var(--radius-hero)] border p-6 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: meta.border }}>
            <div className="flex items-center justify-between">
              <Tag kind={item.kind}>{meta.label[locale]}</Tag>
              <button onClick={speakTarget} className="press flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]" aria-label={t('cardListen', locale)}><Volume2 size={18} style={{ color: meta.tint }} /></button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h2 className="text-[calc(clamp(28px,7vw,42px)*var(--type-scale))] font-bold tracking-[-0.02em] text-[var(--color-text)]">{item.label}</h2>
              {item.phonetic && <p className="mt-2 font-mono text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{item.phonetic}</p>}
              {item.pos && <p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{item.pos}</p>}
              {(item.exampleEn || item.exampleCn) && (
                <div className="mt-5 w-full rounded-[var(--radius-card)] bg-[var(--color-surface-2)] p-4 text-left">
                  {item.exampleEn && <p className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-body)]">例：{item.exampleEn.replace(new RegExp(`\\b(${item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i'), '＿＿＿')}</p>}
                  {item.exampleCn && <p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{item.exampleCn}</p>}
                </div>
              )}
            </div>
            <button onClick={() => setFlipped(true)} className="press mt-2 w-full rounded-full border border-[var(--color-hairline)] py-2.5 text-[calc(15px*var(--type-scale))] font-medium text-[var(--color-text-2)]">{t('cardShowAnswerOrFlip', locale)}</button>
          </div>
          {/* BACK */}
          <div className="flip-face flip-back absolute inset-0 flex flex-col rounded-[var(--radius-hero)] border p-6 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
            <div className="flex items-center justify-between">
              <Tag kind={item.kind}>{meta.label[locale]}</Tag>
              <button onClick={speakTarget} className="press flex h-11 w-11 items-center justify-center rounded-full" aria-label={t('cardListen', locale)}><Volume2 size={18} style={{ color: meta.tint }} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('cardMeaning', locale)}</div>
              <p className="mt-1 text-[calc(17px*var(--type-scale))] font-semibold text-[var(--color-text)]">{item.meaning}</p>
              {collos.length > 0 && (
                <>
                  <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{item.kind === 'vocab' ? t('cardCollocation', locale) : t('cardCollocationPattern', locale)}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {collos.map((c, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-1.5">
                        {splitCollocation(c).map((part, j) => (
                          <span key={j} className="rounded-full border px-3 py-1 text-[calc(13px*var(--type-scale))] font-medium" style={{ borderColor: meta.border, background: 'var(--color-surface)', color: meta.text }}>{part}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {(item.grammarPoint || item.examTips) && (
                <>
                  <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('cardGrammar', locale)}</div>
                  <p className="mt-1 text-[calc(15px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]">{item.grammarPoint || item.examTips}</p>
                </>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={() => gradeCard(false)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-trap)]"><X size={16} /> {t('cardForgot', locale)}</button>
              <button onClick={() => gradeCard(true)} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-vocab)]"><Check size={16} /> {t('cardRemember', locale)}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={prev} disabled={idx === 0} className="press flex items-center gap-1 rounded-full border border-[var(--color-hairline)] px-4 py-2 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)] disabled:opacity-40"><ArrowLeft size={16} /> {t('cardPrev', locale)}</button>
        <button onClick={next} disabled={idx === items.length - 1} className="press flex items-center gap-1 rounded-full border border-[var(--color-hairline)] px-4 py-2 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)] disabled:opacity-40">{t('cardNext', locale)} <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}
