// SessionView — fullscreen learning session driven by useSessionEngine.
// Task chain per word: listen → recognize → recall → spell.
// Word-by-word highlight during TTS playback (听步骤的随字符跳动).
// Session state is snapshotted to a module-level cache on unmount, so
// navigating away (e.g. to Settings) and back preserves progress.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Volume2, ChevronRight, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import {
  useSessionEngine, type TaskResult,
  getSessionSnapshot, saveSessionSnapshot, clearSessionSnapshot,
} from '../lib/session-engine.ts';
import { useSpeak } from '../lib/useSpeak.ts';
import { KIND_META, shuffle } from '../lib/utils.ts';
import { t } from '../lib/i18n.ts';
import { Tag } from '../components/ui/primitives.tsx';
import AiAssistPanel from '../components/AiAssistPanel.tsx';

export default function SessionView() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const { selection, unit, studyItems, tts } = useAppStore();
  const locale = useAppStore(s => s.locale);
  const { speak, stop, state: ttsState } = useSpeak();

  const activeUnit = useMemo(() => {
    if (unit && unit.unit === Number(unitId)) return unit;
    return unit ?? undefined;
  }, [unit, unitId]);

  const [shownWord, setShownWord] = useState(0);
  const [spellInput, setSpellInput] = useState('');
  const [feedback, setFeedback] = useState<null | { ok: boolean; msg: string }>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const words = useMemo(() => studyItems, [studyItems]);

  // Snapshot key: tied to the unit so returning to the same unitId resumes
  // the session; a different unitId starts fresh.
  const snapshotKey = `session:${unitId}`;

  const {
    current: task, queue, pos, total, stats, mark, skip, reset, failedEntries,
  } = useSessionEngine({
    items: words,
    editionId: selection?.editionId ?? '',
    onComplete: () => setReviewDone(true),
    restoreKey: snapshotKey,
  });

  // Track latest state for the unmount snapshot. Refs are read at cleanup
  // time, so the snapshot always captures the newest values even though the
  // effect closure only runs once on mount.
  const queueRef = useRef(queue);
  const posRef = useRef(pos);
  const statsRef = useRef(stats);
  const failedRef = useRef(failedEntries);
  const reviewDoneRef = useRef(reviewDone);
  useEffect(() => { queueRef.current = queue; });
  useEffect(() => { posRef.current = pos; });
  useEffect(() => { statsRef.current = stats; });
  useEffect(() => { failedRef.current = failedEntries; });
  useEffect(() => { reviewDoneRef.current = reviewDone; }, [reviewDone]);

  // Restore reviewDone (completion screen) when a finished session is reopened.
  useEffect(() => {
    const snap = getSessionSnapshot(snapshotKey);
    if (snap?.reviewDone) setReviewDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save snapshot on unmount (route navigation away).
  useEffect(() => {
    return () => {
      saveSessionSnapshot(snapshotKey, {
        queue: queueRef.current,
        pos: posRef.current,
        stats: statsRef.current,
        failedEntries: [...failedRef.current.entries()],
        reviewDone: reviewDoneRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = useCallback(() => {
    clearSessionSnapshot(snapshotKey);
    setReviewDone(false);
    reset();
  }, [snapshotKey, reset]);

  // Build recognition options (correct + 3 distractors).
  const recognizeOptions = useMemo(() => {
    if (!task || task.type !== 'recognize') return [];
    const correct = task.item.meaning;
    const pool = words.filter((w) => w.id !== task.item.id && w.meaning && w.meaning !== correct);
    const distractors = [...new Set(shuffle(pool).map((w) => w.meaning))].slice(0, 3);
    const fillers = shuffle([t('recogDistractor1', locale), t('recogDistractor2', locale), t('recogDistractor3', locale), t('recogDistractor4', locale)]);
    let fi = 0;
    while (distractors.length < 3) distractors.push(fillers[fi++ % fillers.length]);
    return shuffle([correct, ...distractors]);
  }, [task, words]);

  const grade = useCallback(async (result: TaskResult, extra?: string) => {
    if (!task) return;
    const ok = result === 'correct' || result === 'hesitant';
    setSpellInput('');
    // Feedback duration: quick on success, prolonged on failure so the student
    // can actually read the correct answer before it advances.
    const delayMs = ok ? 500 : 1600;
    setFeedback({ ok, msg: extra ?? (ok ? '' : t('correctAnswer', locale, { answer: task.item.label })) });
    await new Promise((r) => setTimeout(r, delayMs));
    setFeedback(null);
    await mark(result);
  }, [task, mark]);

  const checkSpell = useCallback(() => {
    if (!task) return;
    const target = task.item.label.replace(/[^a-zA-Z\s'-]/g, '').trim();
    const user = spellInput.trim().replace(/\s+/g, ' ').toLowerCase();
    const ok = user === target.toLowerCase();
    if (ok) void grade('correct', t('spellCorrect', locale));
    else void grade('wrong', t('spellWrong', locale, { target }));
  }, [task, spellInput, grade]);

  if (reviewDone) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[var(--max-read)] flex-col items-center justify-center px-[var(--pad-x)] py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--grad-cta)' }}>
          <Check size={30} className="text-white" />
        </div>
        <h2 className="mt-5 text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('sessionComplete', locale)}</h2>
        <p className="mt-2 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('sessionStats', locale, { total: stats.total, correct: stats.correct, wrong: stats.wrong })}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate('/')} className="press rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-medium">{t('backToHome', locale)}</button>
          <button onClick={handleReset} className="press flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white" style={{ background: 'var(--grad-cta)' }}>
            <RotateCcw size={16} /> {t('anotherRound', locale)}
          </button>
        </div>
      </div>
    );
  }

  if (!activeUnit || !task) {
    return (
      <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-16 text-center">
        <p className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('sessionNoUnit', locale)}</p>
        <button onClick={() => navigate('/')} className="press mt-4 rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-[calc(15px*var(--type-scale))]">{t('backToHome', locale)}</button>
      </div>
    );
  }

  const meta = KIND_META[task.item.kind];
  const wordsArr = task.item.label.split(/\s+/);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[var(--max-read)] flex-col px-[var(--pad-x)] py-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { stop(); navigate('/learn'); }} className="press flex items-center gap-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]"><ArrowLeft size={18} /> {t('exitSession', locale)}</button>
        <span className="tnum text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{pos + 1} / {total}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-track)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${(pos / total) * 100}%`, background: meta.tint }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <Tag kind={task.item.kind}>{meta.label[locale]}</Tag>

        {task.type === 'listen' && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {wordsArr.map((w, i) => (
                <span key={i} className="text-[calc(clamp(26px,6vw,40px)*var(--type-scale))] font-bold transition-all duration-150"
                  style={{
                    color: i === shownWord ? 'var(--color-accent)' : 'var(--color-text)',
                    transform: i === shownWord ? 'translateY(-3px)' : 'none',
                    opacity: i < shownWord ? 0.45 : 1,
                  }}
                >{w}</span>
              ))}
            </div>
            {task.item.phonetic && <p className="mt-2 font-mono text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{task.item.phonetic}</p>}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={() => { setShownWord(0); speak(task.item.label, { accent: tts.accent, rate: tts.rate, onWordChange: (idx: number) => setShownWord(idx) }); }} disabled={ttsState === 'synthesizing'} className="press flex h-11 items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-4 text-[calc(14px*var(--type-scale))] disabled:opacity-60" aria-label={t('listenAgain', locale)}>{ttsState === 'synthesizing' ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />} {t('listenAgain', locale)}</button>
              <button onClick={() => void grade('correct')} className="press flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[calc(14px*var(--type-scale))] font-semibold text-white" style={{ background: 'var(--grad-cta)' }}>{t('doneListening', locale)} <ChevronRight size={16} /></button>
              <button onClick={() => setAiOpen(true)} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)]" aria-label="问 AI"><Sparkles size={16} /></button>
            </div>
          </div>
        )}

        {task.type === 'recognize' && (
          <div className="mt-6 w-full">
            <h2 className="text-[calc(clamp(28px,7vw,40px)*var(--type-scale))] font-bold tracking-[-0.02em]">{task.item.label}</h2>
            {task.item.phonetic && <p className="mt-2 font-mono text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{task.item.phonetic}</p>}
            <div className="mt-3 flex justify-center">
              <button onClick={() => speak(task.item.label, { accent: tts.accent, rate: tts.rate })} className="press flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)]" aria-label={t('cardListen', locale)}><Volume2 size={18} /></button>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-2.5">
              {recognizeOptions.map((opt, i) => (
                <button key={i} disabled={!!feedback} onClick={() => void grade(opt === task.item.meaning ? 'correct' : 'wrong')}
                  className={`press rounded-2xl border bg-[var(--color-surface)] px-4 py-3.5 text-left text-[calc(15px*var(--type-scale))] font-medium ${feedback && !feedback.ok && opt === task.item.meaning ? 'border-[var(--color-vocab-border)] ring-1 ring-[var(--color-vocab)]' : 'border-[var(--color-hairline)]'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {task.type === 'recall' && (
          <div className="mt-6 w-full">
            <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('recallHint', locale)}</p>
            <h2 className="mt-3 text-[calc(clamp(24px,6vw,36px)*var(--type-scale))] font-bold">{task.item.meaning}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => void grade('correct')} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] py-3 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-vocab)]"><Check size={17} /> {t('known', locale)}</button>
              <button onClick={() => void grade('wrong')} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] py-3 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-trap)]"><X size={17} /> {t('unknown', locale)}</button>
            </div>
            <p className="mt-3 text-[calc(13px*var(--type-scale))] text-[var(--color-text-3)]">{task.item.label} · {task.item.phonetic ?? ''}</p>
          </div>
        )}

        {task.type === 'spell' && (
          <div className="mt-6 w-full">
            <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('spellHint', locale)}</p>
            <div className="mt-3 flex justify-center">
              <button onClick={() => speak(task.item.label, { accent: tts.accent, rate: tts.rate })} className="press flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)]" aria-label={t('cardListen', locale)}><Volume2 size={18} /></button>
            </div>
            <div className="mx-auto mt-5 max-w-sm">
              <input autoFocus value={spellInput} onChange={(e) => setSpellInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') checkSpell(); }}
                placeholder={t('spellInput', locale)}
                className="w-full rounded-2xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3.5 text-center text-[calc(18px*var(--type-scale))] font-medium outline-none focus:border-[var(--color-accent)]" />
              <button onClick={checkSpell} className="press mt-3 w-full rounded-full px-6 py-3 text-[calc(15px*var(--type-scale))] font-semibold text-white" style={{ background: 'var(--grad-cta)' }}>{t('spellSubmit', locale)}</button>
            </div>
          </div>
        )}

        {feedback && (
          <div className={`mt-5 rounded-full px-4 py-2 text-[calc(14px*var(--type-scale))] font-medium ${feedback.ok ? 'bg-[var(--color-vocab-soft)] text-[var(--color-vocab)]' : 'bg-[var(--color-trap-soft)] text-[var(--color-trap)]'}`}>
            {feedback.msg || (feedback.ok ? t('correct', locale) : t('wrong', locale))}
          </div>
        )}

        {!feedback && task.type !== 'listen' && (
          <button onClick={skip} className="press mt-5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-3)]">{t('skipThis', locale)}</button>
        )}
      </div>
      {/* AI 辅助 — 当前词 */}
      {task && (
        <AiAssistPanel open={aiOpen} onClose={() => setAiOpen(false)} context={{
          label: task.item.label,
          extra: task.item.meaning ?? '',
          questions: [t('aiWordMeaning', locale), t('aiWordUsage', locale), t('aiWordExample', locale)],
        }} />
      )}
    </div>
  );
}