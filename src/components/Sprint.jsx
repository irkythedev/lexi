// 5-Step Unit Sprint (spec §4.2.3): a guided flow through the unit's items.
//   1) Input   — card scan (quick flip-through of all items)
//   2) Shadowing — TTS plays target, user records & compares (word-level highlight)
//   3) Practice — cloze + matching mini exercises
//   4) AI Output — sentence drill: write a sentence using a target phrase, AI corrects
//   5) Sprint Quiz — 10-item mixed quiz, mistakes go to error notebook + SRS
import { useState, useMemo } from 'react';
import { Mic, Check, X, ArrowRight, RotateCcw, Trophy, Send, Volume2, Sparkles } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { useSpeechRecognition, compareWords } from '../lib/speechRecognition.js';
import { KIND_META, maskSentence, shuffle } from '../lib/utils.js';
import { addError, recordReview, getSetting } from '../lib/db.js';
import { loadConfig, buildSystemPrompt, correctionPrompt, extractJson, streamChat } from '../lib/ai.js';
import { requestSpeak } from '../components/FloatingTTS.jsx';

const STEP_META = [
  { id: 1, title: '输入', sub: '卡片速览' },
  { id: 2, title: '跟读', sub: '语音模仿' },
  { id: 3, title: '练习', sub: '填空配对' },
  { id: 4, title: 'AI 输出', sub: '造句批改' },
  { id: 5, title: '冲刺测', sub: '10 题小测' },
];

export default function Sprint({ onExit }) {
  const { unit, studyItems, selection, tts } = useApp();
  const [step, setStep] = useState(1);

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[14px] text-[var(--text-2)]">
          ← 返回
        </button>
        <span className="text-[13px] text-[var(--text-3)]">5 步微冲刺</span>
      </div>

      {/* Step rail */}
      <div className="mb-5 flex items-center justify-between">
        {STEP_META.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center">
            <button
              onClick={() => setStep(s.id)}
              className="press flex flex-col items-center gap-1"
              style={{ flex: '0 0 auto' }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold transition"
                style={{
                  background: step >= s.id ? 'var(--accent)' : 'var(--track)',
                  color: step >= s.id ? '#fff' : 'var(--text-3)',
                }}
              >
                {step > s.id ? <Check size={16} /> : s.id}
              </span>
              <span className="text-[10.5px] font-medium" style={{ color: step >= s.id ? 'var(--accent)' : 'var(--text-3)' }}>
                {s.title}
              </span>
            </button>
            {i < STEP_META.length - 1 && (
              <div className="mx-1 h-0.5 flex-1 rounded-full" style={{ background: step > s.id ? 'var(--accent)' : 'var(--track)' }} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && <StepInput items={studyItems} tts={tts} onNext={() => setStep(2)} />}
      {step === 2 && <StepShadow unit={unit} items={studyItems} tts={tts} onNext={() => setStep(3)} onPrev={() => setStep(1)} />}
      {step === 3 && <StepPractice items={studyItems} selection={selection} onNext={() => setStep(4)} onPrev={() => setStep(2)} />}
      {step === 4 && <StepAI items={studyItems} unit={unit} selection={selection} onNext={() => setStep(5)} onPrev={() => setStep(3)} />}
      {step === 5 && <StepQuiz items={studyItems} selection={selection} onPrev={() => setStep(4)} onExit={onExit} />}
    </div>
  );
}

// ---- Step 1: Input (card scan) ----
function StepInput({ items, tts, onNext }) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const meta = item ? KIND_META[item.kind] : null;
  const label = item ? (item.kind === 'vocab' ? item.word : item.kind === 'phrase' ? item.phrase : item.pattern) : '';
  return (
    <Panel>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold tracking-wide text-[var(--text-3)]">
            速览 {idx + 1}/{items.length}
          </span>
          <button onClick={() => requestSpeak(label, tts.accent, tts.rate)} className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">
            <Volume2 size={18} style={{ color: meta?.tint }} />
          </button>
        </div>
        <h3 className="mt-4 text-[clamp(24px,6vw,36px)] font-bold tracking-[-0.02em]">{label}</h3>
        {item?.phonetic && <p className="mt-1 font-mono text-[15px] text-[var(--text-3)]">{item.phonetic}</p>}
        {item?.pos && <p className="text-[13px] text-[var(--text-3)]">{item.pos}</p>}
        <p className="mt-3 text-[16px] font-semibold text-[var(--text)]">{item?.meaning}</p>
        {item?.examTips && <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-2)]">{item.examTips}</p>}
        <div className="mt-5 flex items-center justify-between">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="press rounded-full border border-[var(--hairline)] px-4 py-2 text-[14px] disabled:opacity-40">
            上一张
          </button>
          {idx < items.length - 1 ? (
            <button onClick={() => setIdx((i) => i + 1)} className="press flex items-center gap-1 rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white">
              下一张 <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={onNext} className="press flex items-center gap-1 rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white">
              进入跟读 <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ---- Step 2: Shadowing ----
function StepShadow({ unit, items, tts, onNext, onPrev }) {
  const targets = useMemo(
    () => items.filter((i) => i.exampleEn || (i.kind === 'vocab' ? i.word : i.kind === 'phrase' ? i.phrase : i.pattern)),
    [items]
  );
  const [idx, setIdx] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [comparison, setComparison] = useState(null);
  const target = targets[idx];
  const sentence = target?.exampleEn || (target ? (target.kind === 'vocab' ? target.word : target.kind === 'phrase' ? target.phrase : target.pattern) : '');

  const { listening, supported, start, stop } = useSpeechRecognition({
    lang: tts.accent === 'uk' ? 'en-GB' : 'en-US',
    onResult: (transcript) => {
      const c = compareWords(sentence, transcript);
      setComparison(c);
      setShowCompare(true);
    },
  });

  const play = () => requestSpeak(sentence, tts.accent, tts.rate);

  return (
    <Panel>
      <div className="p-5">
        <div className="text-[12px] font-semibold tracking-wide text-[var(--text-3)]">跟读 {idx + 1}/{targets.length}</div>
        <p className="mt-3 rounded-[var(--r-card)] bg-[var(--surface-2)] p-4 text-[17px] leading-relaxed text-[var(--text)]">
          {sentence}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={play} className="press flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[14px] font-semibold text-white">
            <Volume2 size={16} /> 听原句
          </button>
          {supported ? (
            <button
              onClick={() => (listening ? stop() : start())}
              className={`press flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold ${
                listening ? 'bg-[var(--trap)] text-white' : 'border border-[var(--hairline)] text-[var(--text-2)]'
              }`}
            >
              <Mic size={16} /> {listening ? '录音中…点此停止' : '开始跟读'}
            </button>
          ) : (
            <span className="text-[12px] text-[var(--text-3)]">当前浏览器不支持语音识别（可用 Chrome/Edge）</span>
          )}
        </div>

        {showCompare && comparison && (
          <div className="mt-4 rounded-[var(--r-card)] border border-[var(--hairline)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--text-2)]">逐词比对</span>
              <span className="tnum text-[13px] font-bold text-[var(--vocab)]">匹配 {comparison.score}%</span>
            </div>
            <p className="mt-2 text-[16px] leading-relaxed">
              {comparison.words.map((w, i) => (
                <span key={i} className={w.ok ? 'text-[var(--vocab)]' : 'text-[var(--trap)]'}>
                  {w.text}{' '}
                </span>
              ))}
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button onClick={onPrev} className="press rounded-full border border-[var(--hairline)] px-4 py-2 text-[14px]">上一步</button>
          <button
            onClick={() => {
              if (idx < targets.length - 1) { setIdx(idx + 1); setShowCompare(false); setComparison(null); }
              else onNext();
            }}
            className="press flex items-center gap-1 rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white"
          >
            {idx < targets.length - 1 ? '下一句' : '进入练习'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Panel>
  );
}

// ---- Step 3: Practice (cloze + match) ----
function StepPractice({ items, selection, onNext, onPrev }) {
  // Build 4 cloze questions from vocab/phrase meanings.
  const questions = useMemo(() => {
    const pool = items.filter((i) => i.exampleEn);
    return shuffle(pool).slice(0, Math.min(4, pool.length)).map((it) => {
      const label = it.kind === 'vocab' ? it.word : it.kind === 'phrase' ? it.phrase : it.pattern;
      return { item: it, label, masked: maskSentence(it.exampleEn, [label]), answer: label };
    });
  }, [items]);

  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  const allAnswered = questions.every((q) => (answers[q.item.id] || '').trim());

  const submit = async () => {
    setChecked(true);
    for (const q of questions) {
      const ok = (answers[q.item.id] || '').trim().toLowerCase() === q.answer.toLowerCase();
      await recordReview({
        key: `${selection.editionId}:${q.item.id}`,
        editionId: selection.editionId,
        itemId: q.item.id,
        kind: q.item.kind,
        q: ok ? 4 : 2,
      });
      if (!ok) {
        await addError({
          key: `${selection.editionId}:${q.item.id}`,
          editionId: selection.editionId,
          itemId: q.item.id,
          kind: q.item.kind,
          prompt: q.masked,
          answer: q.answer,
          reason: '填空练习错误',
        });
      }
    }
  };

  return (
    <Panel>
      <div className="p-5">
        <div className="text-[12px] font-semibold tracking-wide text-[var(--text-3)]">填空练习</div>
        {questions.length === 0 && <p className="mt-3 text-[14px] text-[var(--text-2)]">本单元暂无可练习例句。</p>}
        <div className="mt-3 space-y-4">
          {questions.map((q) => (
            <div key={q.item.id}>
              <p className="text-[15px] leading-relaxed text-[var(--text)]">{q.masked}</p>
              {q.item.exampleCn && <p className="mt-0.5 text-[12.5px] text-[var(--text-3)]">{q.item.exampleCn}</p>}
              <input
                value={answers[q.item.id] || ''}
                disabled={checked}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.item.id]: e.target.value }))}
                placeholder="填入原词 / 短语"
                className={`mt-2 w-full rounded-full border px-4 py-2 text-[14px] outline-none ${
                  checked
                    ? (answers[q.item.id] || '').trim().toLowerCase() === q.answer.toLowerCase()
                      ? 'border-[var(--vocab-border)] bg-[var(--vocab-soft)]'
                      : 'border-[var(--trap-border)] bg-[var(--trap-soft)]'
                    : 'border-[var(--hairline)] bg-[var(--surface-2)] focus:border-[var(--accent)]'
                }`}
              />
              {checked && (answers[q.item.id] || '').trim().toLowerCase() !== q.answer.toLowerCase() && (
                <p className="mt-1 text-[12.5px] text-[var(--trap)]">正确答案：{q.answer}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={onPrev} className="press rounded-full border border-[var(--hairline)] px-4 py-2 text-[14px]">上一步</button>
          {!checked ? (
            <button onClick={submit} disabled={!allAnswered} className="press rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-40">
              检查
            </button>
          ) : (
            <button onClick={onNext} className="press flex items-center gap-1 rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white">
              进入 AI 造句 <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ---- Step 4: AI Output (sentence drill) ----
function StepAI({ items, unit, selection, onNext, onPrev }) {
  const phrases = useMemo(() => items.filter((i) => i.kind === 'phrase' || i.kind === 'vocab').slice(0, 6), [items]);
  const [target, setTarget] = useState(phrases[0] || null);
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cfg = loadConfig();

  const run = async () => {
    if (!cfg) { setError('请先在「AI」页配置您自己的服务商 API Key。'); return; }
    if (!sentence.trim()) { setError('请先写一句包含目标短语的英语句子。'); return; }
    setLoading(true); setError(''); setResult(null);
    const prompt = correctionPrompt(sentence, [target]);
    const knowledge = `${unit.title}\n目标短语：${target?.phrase || target?.word} (${target?.meaning})`;
    const sys = buildSystemPrompt({ unitTitle: unit.title, knowledge });
    try {
      await streamChat({
        cfg,
        systemPrompt: sys,
        userMessage: prompt,
        onChunk: (_d, full) => {
          const j = extractJson(full);
          if (j) setResult(j);
        },
      });
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide text-[var(--text-3)]">
          <Sparkles size={14} /> 造句批改（AI）
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {phrases.map((p) => {
            const lbl = p.kind === 'vocab' ? p.word : p.phrase;
            const active = target?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setTarget(p)}
                className="press rounded-full border px-3 py-1.5 text-[13px] font-medium"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--hairline)',
                  background: active ? 'var(--accent)/10' : 'var(--surface)',
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                }}
              >
                {lbl}
              </button>
            );
          })}
        </div>

        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder={`用「${target?.phrase || target?.word}」写一句英语，例如：${target?.exampleEn || ''}`}
          rows={3}
          className="mt-3 w-full resize-none rounded-[var(--r-card)] border border-[var(--hairline)] bg-[var(--surface-2)] p-3 text-[15px] outline-none focus:border-[var(--accent)]"
        />

        <div className="mt-3 flex items-center justify-between">
          <button onClick={onPrev} className="press rounded-full border border-[var(--hairline)] px-4 py-2 text-[14px]">上一步</button>
          <button onClick={run} disabled={loading} className="press flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-50">
            {loading ? '批改中…' : <>批改 <Send size={15} /></>}
          </button>
        </div>

        {error && <p className="mt-3 text-[13px] text-[var(--trap)]">{error}</p>}

        {result && (
          <div className="mt-4 rounded-[var(--r-card)] border border-[var(--hairline)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--text-2)]">批改结果</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${result.isCorrect ? 'bg-[var(--vocab-soft)] text-[var(--vocab)]' : 'bg-[var(--trap-soft)] text-[var(--trap)]'}`}>
                搭配分 {result.examCollocationScore}
              </span>
            </div>
            <p className="mt-2 text-[14px] text-[var(--text-body)]">{result.correctedSentence}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-2)]">{result.grammarBreakdown}</p>
          </div>
        )}
        <p className="mt-3 text-[11.5px] text-[var(--text-3)]">
          AI 生成内容仅供参考，请以教材和老师讲解为准。配置仅存本机，对话不上传任何服务器。
        </p>
      </div>
    </Panel>
  );
}

// ---- Step 5: Sprint Quiz (10 items) ----
function StepQuiz({ items, selection, onPrev, onExit }) {
  const quiz = useMemo(() => {
    const pool = shuffle(items).slice(0, Math.min(10, items.length));
    return pool.map((it) => {
      const label = it.kind === 'vocab' ? it.word : it.kind === 'phrase' ? it.phrase : it.pattern;
      const opts = shuffle([
        it.meaning,
        ...shuffle(items.filter((x) => x.id !== it.id).map((x) => x.meaning)).slice(0, 3),
      ]);
      return { item: it, label, prompt: `「${label}」的意思是？`, answer: it.meaning, options: opts };
    });
  }, [items]);

  const [cur, setCur] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const choose = async (opt) => {
    if (picked) return;
    setPicked(opt);
    const ok = opt === quiz[cur].answer;
    if (ok) setScore((s) => s + 1);
    await recordReview({
      key: `${selection.editionId}:${quiz[cur].item.id}`,
      editionId: selection.editionId,
      itemId: quiz[cur].item.id,
      kind: quiz[cur].item.kind,
      q: ok ? 5 : 2,
    });
    if (!ok) {
      await addError({
        key: `${selection.editionId}:${quiz[cur].item.id}`,
        editionId: selection.editionId,
        itemId: quiz[cur].item.id,
        kind: quiz[cur].item.kind,
        prompt: quiz[cur].prompt,
        answer: quiz[cur].answer,
        reason: '冲刺小测错误',
      });
    }
  };

  const next = () => {
    if (cur < quiz.length - 1) { setCur(cur + 1); setPicked(null); }
    else setFinished(true);
  };

  if (finished) {
    return (
      <Panel>
        <div className="flex flex-col items-center p-8 text-center">
          <Trophy size={42} className="text-[var(--vocab)]" />
          <p className="mt-3 text-[20px] font-bold text-[var(--text)]">冲刺完成！</p>
          <p className="mt-1 tnum text-[15px] text-[var(--text-2)]">
            答对 {score} / {quiz.length}
          </p>
          <p className="mt-2 text-[13px] text-[var(--text-3)]">错题已自动进入错题本与复习队列。</p>
          <div className="mt-5 flex gap-3">
            <button onClick={onPrev} className="press rounded-full border border-[var(--hairline)] px-5 py-2 text-[14px]">查看练习</button>
            <button onClick={onExit} className="press rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white">完成</button>
          </div>
        </div>
      </Panel>
    );
  }

  const q = quiz[cur];
  return (
    <Panel>
      <div className="p-5">
        <div className="flex items-center justify-between text-[12px] text-[var(--text-3)]">
          <span>冲刺小测 {cur + 1}/{quiz.length}</span>
          <span className="tnum">已答对 {score}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--track)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${((cur + 1) / quiz.length) * 100}%` }} />
        </div>

        <h3 className="mt-4 text-[18px] font-semibold text-[var(--text)]">{q.prompt}</h3>
        <div className="mt-4 space-y-2.5">
          {q.options.map((opt, i) => {
            const isPicked = picked === opt;
            const isAnswer = opt === q.answer;
            const cls = picked
              ? isAnswer
                ? 'border-[var(--vocab-border)] bg-[var(--vocab-soft)]'
                : isPicked
                ? 'border-[var(--trap-border)] bg-[var(--trap-soft)] animate-shake'
                : 'border-[var(--hairline)] opacity-60'
              : 'border-[var(--hairline)] hover:border-[var(--accent)]';
            return (
              <button
                key={i}
                onClick={() => choose(opt)}
                disabled={!!picked}
                className={`press flex w-full items-center justify-between rounded-[var(--r-card)] border px-4 py-3 text-left text-[15px] ${cls}`}
              >
                <span>{opt}</span>
                {picked && isAnswer && <Check size={18} className="text-[var(--vocab)]" />}
                {picked && isPicked && !isAnswer && <X size={18} className="text-[var(--trap)]" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button onClick={onPrev} disabled={cur === 0} className="press rounded-full border border-[var(--hairline)] px-4 py-2 text-[14px] disabled:opacity-40">上一步</button>
          <button onClick={next} disabled={!picked} className="press flex items-center gap-1 rounded-full bg-[var(--accent)] px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-40">
            {cur < quiz.length - 1 ? '下一题' : '查看结果'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Panel>
  );
}
