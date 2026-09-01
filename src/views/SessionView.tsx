// SessionView — fullscreen learning session driven by useSessionEngine.
// Task chain per word: listen → recognize → recall → spell.
// Word-by-word highlight during TTS playback (听步骤的随字符跳动).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Volume2, ChevronRight, RotateCcw } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useSessionEngine, type TaskResult } from '../lib/session-engine.ts';
import { useSpeak } from '../lib/useSpeak.ts';
import { KIND_META, shuffle } from '../lib/utils.ts';
import { Tag } from '../components/ui/primitives.tsx';

export default function SessionView() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const { selection, unit, studyItems, tts } = useAppStore();
  const { speak, stop } = useSpeak();

  const activeUnit = useMemo(() => {
    if (unit && unit.unit === Number(unitId)) return unit;
    return unit ?? undefined;
  }, [unit, unitId]);

  const [shownWord, setShownWord] = useState(0);
  const [spellInput, setSpellInput] = useState('');
  const [feedback, setFeedback] = useState<null | { ok: boolean; msg: string }>(null);
  const [reviewDone, setReviewDone] = useState(false);

  const words = useMemo(() => studyItems, [studyItems]);

  const { current: task, pos, total, stats, mark, skip, reset } = useSessionEngine({
    items: words,
    editionId: selection?.editionId ?? '',
    onComplete: () => setReviewDone(true),
  });

  // Auto-play TTS on listen task.
  useEffect(() => {
    if (!task || task.type !== 'listen') return;
    setShownWord(0);
    speak(task.item.label, {
      accent: tts.accent,
      rate: tts.rate,
      onWordChange: (idx: number) => setShownWord(idx),
    });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // Build recognition options (correct + 3 distractors).
  const recognizeOptions = useMemo(() => {
    if (!task || task.type !== 'recognize') return [];
    const correct = task.item.meaning;
    const pool = words.filter((w) => w.id !== task.item.id && w.meaning && w.meaning !== correct);
    const distractors = [...new Set(shuffle(pool).map((w) => w.meaning))].slice(0, 3);
    // Pad with distinctive placeholders when the pool is small; dedupe first
    // so identical fillers never appear twice in one row.
    const fillers = shuffle(['常见搭配', '固定短语', '固定用法', '重点句式']);
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
    setFeedback({ ok, msg: extra ?? (ok ? '' : `正确答案：${task.item.label}`) });
    await new Promise((r) => setTimeout(r, delayMs));
    setFeedback(null);
    await mark(result);
  }, [task, mark]);

  const checkSpell = useCallback(() => {
    if (!task) return;
    const target = task.item.label.replace(/[^a-zA-Z\s'-]/g, '').trim();
    const user = spellInput.trim().replace(/\s+/g, ' ').toLowerCase();
    const ok = user === target.toLowerCase();
    if (ok) void grade('correct', '拼对了！');
    else void grade('wrong', `正确拼写：${target}`);
  }, [task, spellInput, grade]);

  if (reviewDone) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[var(--max-read)] flex-col items-center justify-center px-[var(--pad-x)] py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--grad-cta)' }}>
          <Check size={30} className="text-white" />
        </div>
        <h2 className="mt-5 text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">本单元学完啦</h2>
        <p className="mt-2 text-[15px] text-[var(--color-text-2)]">共 {stats.total} 步 · 答对 {stats.correct} · 待巩固 {stats.wrong}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate('/')} className="press rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-[15px] font-medium">回到首页</button>
          <button onClick={() => { setReviewDone(false); reset(); }} className="press flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[15px] font-semibold text-white" style={{ background: 'var(--grad-cta)' }}>
            <RotateCcw size={16} /> 再来一轮
          </button>
        </div>
      </div>
    );
  }

  if (!activeUnit || !task) {
    return (
      <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-16 text-center">
        <p className="text-[15px] text-[var(--color-text-2)]">请先在首页选择教材单元。</p>
        <button onClick={() => navigate('/')} className="press mt-4 rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-[15px]">返回首页</button>
      </div>
    );
  }

  const meta = KIND_META[task.item.kind];
  const wordsArr = task.item.label.split(/\s+/);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[var(--max-read)] flex-col px-[var(--pad-x)] py-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { stop(); navigate('/'); }} className="press flex items-center gap-1 text-[15px] text-[var(--color-text-2)]"><ArrowLeft size={18} /> 退出</button>
        <span className="tnum text-[13px] text-[var(--color-text-2)]">{pos + 1} / {total}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-track)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${(pos / total) * 100}%`, background: meta.tint }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        <Tag kind={task.item.kind}>{meta.label[useAppStore.getState().locale]}</Tag>

        {task.type === 'listen' && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {wordsArr.map((w, i) => (
                <span key={i} className="text-[clamp(26px,6vw,40px)] font-bold transition-all duration-150"
                  style={{
                    color: i === shownWord ? 'var(--color-accent)' : 'var(--color-text)',
                    transform: i === shownWord ? 'translateY(-3px)' : 'none',
                    opacity: i < shownWord ? 0.45 : 1,
                  }}
                >{w}</span>
              ))}
            </div>
            <p className="mt-4 text-[14px] text-[var(--color-text-2)]">听发音，跟读</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => speak(task.item.label, { accent: tts.accent, rate: tts.rate })} className="press flex items-center gap-2 rounded-full border border-[var(--color-hairline)] px-5 py-2.5 text-[15px]"><Volume2 size={17} /> 再听一遍</button>
              <button onClick={() => void grade('correct')} className="press flex items-center gap-1.5 rounded-full px-6 py-2.5 text-[15px] font-semibold text-white" style={{ background: 'var(--grad-cta)' }}>听完了 <ChevronRight size={17} /></button>
            </div>
          </div>
        )}

        {task.type === 'recognize' && (
          <div className="mt-6 w-full">
            <h2 className="text-[clamp(28px,7vw,40px)] font-bold tracking-[-0.02em]">{task.item.label}</h2>
            {task.item.phonetic && <p className="mt-2 font-mono text-[15px] text-[var(--color-text-2)]">{task.item.phonetic}</p>}
            <div className="mt-3 flex justify-center">
              <button onClick={() => speak(task.item.label, { accent: tts.accent, rate: tts.rate })} className="press flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)]"><Volume2 size={18} /></button>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-2.5">
              {recognizeOptions.map((opt, i) => (
                <button key={i} disabled={!!feedback} onClick={() => void grade(opt === task.item.meaning ? 'correct' : 'wrong')}
                  className={`press rounded-2xl border bg-[var(--color-surface)] px-4 py-3.5 text-left text-[15px] font-medium ${feedback && !feedback.ok && opt === task.item.meaning ? 'border-[var(--color-vocab-border)] ring-1 ring-[var(--color-vocab)]' : 'border-[var(--color-hairline)]'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {task.type === 'recall' && (
          <div className="mt-6 w-full">
            <p className="text-[13px] text-[var(--color-text-2)]">看释义，说出对应的英文</p>
            <h2 className="mt-3 text-[clamp(24px,6vw,36px)] font-bold">{task.item.meaning}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => void grade('correct')} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] py-3 text-[15px] font-semibold text-[var(--color-vocab)]"><Check size={17} /> 会了</button>
              <button onClick={() => void grade('wrong')} className="press flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] py-3 text-[15px] font-semibold text-[var(--color-trap)]"><X size={17} /> 没想出来</button>
            </div>
            <p className="mt-3 text-[13px] text-[var(--color-text-3)]">{task.item.label} · {task.item.phonetic ?? ''}</p>
          </div>
        )}

        {task.type === 'spell' && (
          <div className="mt-6 w-full">
            <p className="text-[13px] text-[var(--color-text-2)]">听写单词</p>
            <div className="mt-3 flex justify-center">
              <button onClick={() => speak(task.item.label, { accent: tts.accent, rate: tts.rate })} className="press flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-hairline)]"><Volume2 size={18} /></button>
            </div>
            <div className="mx-auto mt-5 max-w-sm">
              <input autoFocus value={spellInput} onChange={(e) => setSpellInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') checkSpell(); }}
                placeholder="输入英文"
                className="w-full rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-3.5 text-center text-[18px] font-medium outline-none focus:border-[var(--color-accent)]" />
              <button onClick={checkSpell} className="press mt-3 w-full rounded-full px-6 py-3 text-[15px] font-semibold text-white" style={{ background: 'var(--grad-cta)' }}>确认</button>
            </div>
          </div>
        )}

        {feedback && (
          <div className={`mt-5 rounded-full px-4 py-2 text-[14px] font-medium ${feedback.ok ? 'bg-[var(--color-vocab-soft)] text-[var(--color-vocab)]' : 'bg-[var(--color-trap-soft)] text-[var(--color-trap)]'}`}>
            {feedback.msg || (feedback.ok ? '回答正确！' : '再想想')}
          </div>
        )}

        {!feedback && task.type !== 'listen' && (
          <button onClick={skip} className="press mt-5 text-[13px] text-[var(--color-text-3)]">跳过此题</button>
        )}
      </div>
    </div>
  );
}