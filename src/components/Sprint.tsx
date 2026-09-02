import { useState, useMemo } from 'react';
import { Mic, Check, X, ArrowRight, Trophy, Send, Sparkles } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import type { StudyItem, Unit } from '../types/index.ts';
import SpeakButton from './SpeakButton.tsx';
import { useSpeechRecognition, compareWords } from '../lib/speechRecognition.ts';
import { KIND_META, maskSentence, shuffle } from '../lib/utils.ts';
import { addError, recordReview } from '../db/db.ts';
import { loadConfig, buildSystemPrompt, correctionPrompt, extractJson, streamChat } from '../lib/ai.ts';
import { t } from '../lib/i18n.ts';
import { Panel } from './ui/primitives.tsx';

const STEP_META = [
  { id: 1, titleKey: 'sprintStep1Title', subKey: 'sprintStep1Sub' },
  { id: 2, titleKey: 'sprintStep2Title', subKey: 'sprintStep2Sub' },
  { id: 3, titleKey: 'sprintStep3Title', subKey: 'sprintStep3Sub' },
  { id: 4, titleKey: 'sprintStep4Title', subKey: 'sprintStep4Sub' },
  { id: 5, titleKey: 'sprintStep5Title', subKey: 'sprintStep5Sub' },
];

export default function Sprint({ onExit }: { onExit: () => void }) {
  const { unit, studyItems, selection, tts, locale } = useAppStore();
  const [step, setStep] = useState(1);
  if (!unit) return null;

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('back', locale)}</button>
        <span className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprint', locale)}</span>
      </div>

      <div className="mb-5 flex items-center justify-between">
        {STEP_META.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <button onClick={() => setStep(s.id)} className="press flex flex-col items-center gap-1" style={{ flex: '0 0 auto' }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-[calc(14px*var(--type-scale))] font-bold transition" style={{ background: step >= s.id ? 'var(--color-accent)' : 'var(--color-track)', color: step >= s.id ? '#fff' : 'var(--color-text-2)' }}>
                {step > s.id ? <Check size={16} /> : s.id}
              </span>
              <span className="text-[calc(11px*var(--type-scale))] font-medium" style={{ color: step >= s.id ? 'var(--color-accent)' : 'var(--color-text-2)' }}>{t(s.titleKey, locale)}</span>
            </button>
            {i < STEP_META.length - 1 && <div className="mx-1 h-0.5 flex-1 rounded-full" style={{ background: step > s.id ? 'var(--color-accent)' : 'var(--color-track)' }} />}
          </div>
        ))}
      </div>

      {step === 1 && <StepInput items={studyItems} tts={tts} onNext={() => setStep(2)} />}
      {step === 2 && <StepShadow items={studyItems} tts={tts} onNext={() => setStep(3)} onPrev={() => setStep(1)} />}
      {step === 3 && <StepPractice items={studyItems} selection={selection} onNext={() => setStep(4)} onPrev={() => setStep(2)} />}
      {step === 4 && <StepAI items={studyItems} unit={unit} onPrev={() => setStep(3)} onNext={() => setStep(5)} />}
      {step === 5 && <StepQuiz items={studyItems} selection={selection} onPrev={() => setStep(4)} onExit={onExit} />}
    </div>
  );
}

type TtsPrefs = { accent: 'us' | 'uk'; rate: number };

function StepInput({ items, tts, onNext }: { items: StudyItem[]; tts: TtsPrefs; onNext: () => void }) {
  const locale = useAppStore(s => s.locale);
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const meta = item ? KIND_META[item.kind] : null;
  return (
    <Panel><div className="p-5">
      <div className="flex items-center justify-between"><span className="text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('sprintQuickView', locale)} {idx + 1}/{items.length}</span>
        <SpeakButton text={item.label} accent={tts.accent} rate={tts.rate} size={18} color={meta?.tint} /></div>
      <h3 className="mt-4 text-[calc(clamp(24px,6vw,36px)*var(--type-scale))] font-bold tracking-[-0.02em]">{item.label}</h3>
      {item.phonetic && <p className="mt-1 font-mono text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{item.phonetic}</p>}
      {item.pos && <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{item.pos}</p>}
      <p className="mt-3 text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{item.meaning}</p>
      {item.examTips && <p className="mt-2 text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{item.examTips}</p>}
      <div className="mt-5 flex items-center justify-between">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(15px*var(--type-scale))] disabled:opacity-40">{t('cardPrev', locale)}</button>
        {idx < items.length - 1 ? <button onClick={() => setIdx((i) => i + 1)} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('cardNext', locale)} <ArrowRight size={16} /></button>
          : <button onClick={onNext} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('sprintEnterShadow', locale)} <ArrowRight size={16} /></button>}
      </div>
    </div></Panel>
  );
}

function StepShadow({ items, tts, onNext, onPrev }: { items: StudyItem[]; tts: TtsPrefs; onNext: () => void; onPrev: () => void }) {
  const locale = useAppStore(s => s.locale);
  const targets = useMemo(() => items.filter((i) => i.exampleEn || i.label), [items]);
  const [idx, setIdx] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [comparison, setComparison] = useState<ReturnType<typeof compareWords> | null>(null);
  const target = targets[idx];
  const sentence = target?.exampleEn || target?.label || '';

  const { listening, supported, start, stop } = useSpeechRecognition({
    lang: tts.accent === 'uk' ? 'en-GB' : 'en-US',
    onResult: (transcript) => { const c = compareWords(sentence, transcript); setComparison(c); setShowCompare(true); },
  });

  return (
    <Panel><div className="p-5">
      <div className="text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('sprintShadowLabel', locale)} {idx + 1}/{targets.length}</div>
      <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-surface-2)] p-4 text-[calc(17px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{sentence}</p>
      <div className="mt-4 flex items-center gap-3">
        <SpeakButton text={sentence} accent={tts.accent} rate={tts.rate} size={16} color="#fff" className="h-auto rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-4 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white hover:bg-[var(--color-accent)]">{t('sprintListen', locale)}</SpeakButton>
        {supported ? <button onClick={() => (listening ? stop() : start())} className={`press flex items-center gap-1.5 rounded-[var(--radius-md)] px-4 py-2 text-[calc(15px*var(--type-scale))] font-semibold ${listening ? 'bg-[var(--color-trap)] text-white' : 'border-2 border-[var(--color-hairline)] text-[var(--color-text-2)]'}`}><Mic size={16} /> {listening ? t('sprintRecording', locale) : t('sprintStartShadow', locale)}</button>
          : <span className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprintNoSpeechRecognition', locale)}</span>}
      </div>
      {showCompare && comparison && (
        <div className="mt-4 rounded-[var(--radius-card)] border-2 border-[var(--color-hairline)] p-4">
          <div className="flex items-center justify-between"><span className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('sprintWordComparison', locale)}</span><span className="tnum text-[calc(13px*var(--type-scale))] font-bold text-[var(--color-vocab)]">{t('sprintMatch', locale)} {comparison.score}%</span></div>
          <p className="mt-2 text-[calc(16px*var(--type-scale))] leading-relaxed">{comparison.words.map((w, i) => <span key={i} className={w.ok ? 'text-[var(--color-vocab)]' : 'text-[var(--color-trap)]'}>{w.text}{' '}</span>)}</p>
        </div>
      )}
      <div className="mt-5 flex items-center justify-between">
        <button onClick={onPrev} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(15px*var(--type-scale))]">{t('sprintPrev', locale)}</button>
        <button onClick={() => { if (idx < targets.length - 1) { setIdx(idx + 1); setShowCompare(false); setComparison(null); } else onNext(); }} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white">{idx < targets.length - 1 ? t('sprintNext', locale) : t('sprintEnter', locale)} <ArrowRight size={16} /></button>
      </div>
    </div></Panel>
  );
}

function StepPractice({ items, selection, onNext, onPrev }: { items: StudyItem[]; selection: { editionId: string } | null; onNext: () => void; onPrev: () => void }) {
  const locale = useAppStore(s => s.locale);
  const questions = useMemo(() => {
    const pool = items.filter((i) => i.exampleEn);
    return shuffle(pool).slice(0, Math.min(4, pool.length)).map((it) => ({ item: it, label: it.label, masked: maskSentence(it.exampleEn!, [it.label]), answer: it.label }));
  }, [items]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const allAnswered = questions.every((q) => (answers[q.item.id] || '').trim());

  const submit = async () => {
    setChecked(true);
    for (const q of questions) {
      const ok = (answers[q.item.id] || '').trim().toLowerCase() === q.answer.toLowerCase();
      if (selection) await recordReview({ key: `${selection.editionId}:${q.item.id}`, editionId: selection.editionId, itemId: q.item.id, kind: q.item.kind, q: ok ? 4 : 2 });
      if (!ok && selection) await addError({ key: `${selection.editionId}:${q.item.id}`, editionId: selection.editionId, itemId: q.item.id, kind: q.item.kind, prompt: q.masked, answer: q.answer, reason: '填空练习错误' });
    }
  };

  return (
    <Panel><div className="p-5">
      <div className="text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('sprintPracticeLabel', locale)}</div>
      {questions.length === 0 && <p className="mt-3 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprintNoPractice', locale)}</p>}
      <div className="mt-3 space-y-4">
        {questions.map((q) => (
          <div key={q.item.id}>
            <p className="text-[calc(15px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{q.masked}</p>
            {q.item.exampleCn && <p className="mt-0.5 text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{q.item.exampleCn}</p>}
            <input value={answers[q.item.id] || ''} disabled={checked} onChange={(e) => setAnswers((a) => ({ ...a, [q.item.id]: e.target.value }))} placeholder={t('sprintFillHint', locale)}
              className={`mt-2 w-full rounded-[var(--radius-md)] border px-4 py-2 text-[calc(15px*var(--type-scale))] outline-none ${checked ? (answers[q.item.id] || '').trim().toLowerCase() === q.answer.toLowerCase() ? 'border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)]' : 'border-[var(--color-trap-border)] bg-[var(--color-trap-soft)]' : 'border-[var(--color-input-border)] bg-[var(--color-input-bg)] focus:border-[var(--color-accent)]'}`} />
            {checked && (answers[q.item.id] || '').trim().toLowerCase() !== q.answer.toLowerCase() && <p className="mt-1 text-[calc(12.5px*var(--type-scale))] text-[var(--color-trap-deep)]">{t('sprintCorrectAnswer', locale)}：{q.answer}</p>}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <button onClick={onPrev} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(15px*var(--type-scale))]">{t('sprintPrev', locale)}</button>
        {!checked ? <button onClick={submit} disabled={!allAnswered} className="press rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white disabled:opacity-40">{t('sprintCheck', locale)}</button>
          : <button onClick={onNext} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('sprintEnterAi', locale)} <ArrowRight size={16} /></button>}
      </div>
    </div></Panel>
  );
}

function StepAI({ items, unit, onPrev, onNext }: { items: StudyItem[]; unit: Unit; onPrev: () => void; onNext: () => void }) {
  const locale = useAppStore(s => s.locale);
  const phrases = useMemo(() => items.filter((i) => i.kind === 'phrase' || i.kind === 'vocab').slice(0, 6), [items]);
  const [target, setTarget] = useState<StudyItem | null>(phrases[0] ?? null);
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState<import('../types/index.ts').CorrectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cfg = loadConfig();

  const run = async () => {
    if (!cfg) { setError(t('sprintAiNoConfig', locale)); return; }
    if (!sentence.trim()) { setError(t('sprintAiNoSentence', locale)); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      await streamChat({
        cfg, systemPrompt: buildSystemPrompt({ unitTitle: unit.title, knowledge: `${unit.title}\n目标短语：${target?.label} (${target?.meaning})` }),
        userMessage: correctionPrompt(sentence, [target?.label ?? '']),
        onChunk: (_d, full) => { const j = extractJson(full); if (j && 'isCorrect' in j) setResult(j as import('../types/index.ts').CorrectionResult); },
      });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  return (
    <Panel><div className="p-5">
      <div className="flex items-center gap-2 text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]"><Sparkles size={14} /> {t('sprintAiLabel', locale)}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {phrases.map((p) => (
          <button key={p.id} onClick={() => setTarget(p)} className="press rounded-[var(--radius-md)] border px-3 py-1.5 text-[calc(13px*var(--type-scale))] font-medium"
            style={{ borderColor: target?.id === p.id ? 'var(--color-accent)' : 'var(--color-hairline)', background: target?.id === p.id ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)', color: target?.id === p.id ? 'var(--color-accent)' : 'var(--color-text-2)' }}>{p.label}</button>
        ))}
      </div>
      <textarea value={sentence} onChange={(e) => setSentence(e.target.value)} rows={3} placeholder={t('sprintAiPlaceholder', locale, { word: target?.label ?? '', example: target?.exampleEn ?? '' })}
        className="mt-3 w-full resize-none rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] p-3 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
      <div className="mt-3 flex items-center justify-between">
        <button onClick={onPrev} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(15px*var(--type-scale))]">{t('sprintPrev', locale)}</button>
        <div className="flex items-center gap-2">
          <button onClick={run} disabled={loading} className="press flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white disabled:opacity-50">{loading ? t('sprintAiLoading', locale) : <>{t('sprintAiSubmit', locale)} <Send size={15} /></>}</button>
          <button onClick={onNext} className="press flex items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-accent)]">{t('sprintEnterQuiz', locale)} <ArrowRight size={16} /></button>
        </div>
      </div>
      {error && <p className="mt-3 text-[calc(13px*var(--type-scale))] text-[var(--color-trap)]">{error}</p>}
      {result && (
        <div className="mt-4 rounded-[var(--radius-card)] border-2 border-[var(--color-hairline)] p-4">
          <div className="flex items-center justify-between"><span className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('sprintAiResult', locale)}</span>
            <span className={`rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[calc(12px*var(--type-scale))] font-bold ${result.isCorrect ? 'bg-[var(--color-vocab-soft)] text-[var(--color-vocab)]' : 'bg-[var(--color-trap-soft)] text-[var(--color-trap)]'}`}>{t('sprintCollocationScore', locale)} {result.examCollocationScore}</span></div>
          <p className="mt-2 text-[calc(15px*var(--type-scale))] text-[var(--color-text-body)]">{result.correctedSentence}</p>
          <p className="mt-1.5 text-[calc(13px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{result.grammarBreakdown}</p>
        </div>
      )}
      <p className="mt-3 text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprintAiDisclaimer', locale)}</p>
    </div></Panel>
  );
}

function StepQuiz({ items, selection, onPrev, onExit }: { items: StudyItem[]; selection: { editionId: string } | null; onPrev: () => void; onExit: () => void }) {
  const locale = useAppStore(s => s.locale);
  const quiz = useMemo(() => {
    const pool = shuffle(items).slice(0, Math.min(10, items.length));
    return pool.map((it) => {
      const opts = shuffle([it.meaning, ...shuffle(items.filter((x) => x.id !== it.id).map((x) => x.meaning)).slice(0, 3)]);
      return { item: it, label: it.label, prompt: t('sprintQuizPrompt', locale, { label: it.label }), answer: it.meaning, options: opts };
    });
  }, [items]);
  const [cur, setCur] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const choose = async (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const ok = opt === quiz[cur].answer;
    if (ok) setScore((s) => s + 1);
    if (selection) await recordReview({ key: `${selection.editionId}:${quiz[cur].item.id}`, editionId: selection.editionId, itemId: quiz[cur].item.id, kind: quiz[cur].item.kind, q: ok ? 5 : 2 });
    if (!ok && selection) await addError({ key: `${selection.editionId}:${quiz[cur].item.id}`, editionId: selection.editionId, itemId: quiz[cur].item.id, kind: quiz[cur].item.kind, prompt: quiz[cur].prompt, answer: quiz[cur].answer, reason: '冲刺小测错误' });
  };
  const next = () => { if (cur < quiz.length - 1) { setCur(cur + 1); setPicked(null); } else setFinished(true); };

  if (finished) return (
    <Panel><div className="flex flex-col items-center p-8 text-center">
      <Trophy size={42} className="text-[var(--color-vocab)]" />
      <p className="mt-3 text-[calc(20px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('sprintQuizComplete', locale)}</p>
      <p className="mt-1 tnum text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprintQuizScore', locale, { score, total: quiz.length })}</p>
      <p className="mt-2 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprintQuizErrorsSaved', locale)}</p>
      <div className="mt-5 flex gap-3">
        <button onClick={onPrev} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))]">{t('sprintReviewPractice', locale)}</button>
        <button onClick={onExit} className="press rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('done', locale)}</button>
      </div>
    </div></Panel>
  );

  const q = quiz[cur];
  return (
    <Panel><div className="p-5">
      <div className="flex items-center justify-between text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]"><span>{t('sprintQuizLabel', locale)} {cur + 1}/{quiz.length}</span><span className="tnum">{t('sprintCorrectCount', locale)} {score}</span></div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-track)]"><div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${((cur + 1) / quiz.length) * 100}%` }} /></div>
      <h3 className="mt-4 text-[calc(18px*var(--type-scale))] font-semibold text-[var(--color-text)]">{q.prompt}</h3>
      <div className="mt-4 space-y-2.5">
        {q.options.map((opt, i) => {
          const isPicked = picked === opt; const isAnswer = opt === q.answer;
          const cls = picked ? isAnswer ? 'border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)]' : isPicked ? 'border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] animate-shake' : 'border-[var(--color-hairline)] opacity-60' : 'border-[var(--color-hairline)] hover:border-[var(--color-accent)]';
          return (
            <button key={i} onClick={() => choose(opt)} disabled={!!picked} className={`press flex w-full items-center justify-between rounded-[var(--radius-card)] border px-4 py-3 text-left text-[calc(15px*var(--type-scale))] ${cls}`}>
              <span>{opt}</span>{picked && isAnswer && <Check size={18} className="text-[var(--color-vocab)]" />}{picked && isPicked && !isAnswer && <X size={18} className="text-[var(--color-trap)]" />}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <button onClick={onPrev} disabled={cur === 0} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(15px*var(--type-scale))] disabled:opacity-40">{t('sprintPrev', locale)}</button>
        <button onClick={next} disabled={!picked} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(15px*var(--type-scale))] font-semibold text-white disabled:opacity-40">{cur < quiz.length - 1 ? t('sprintNextQuestion', locale) : t('sprintViewResult', locale)} <ArrowRight size={16} /></button>
      </div>
    </div></Panel>
  );
}
