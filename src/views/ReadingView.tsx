// ReadingView — 课文朗读：全屏显示课文正文，逐句高亮 + TTS 播放
// 入口：LearnView 中「课文朗读」卡片 → mode='reading' 触发
// 数据：UNIT_READINGS（阅读数据，按单元索引）
// 播放：useSpeak 单句 TTS；onEnd 自动播下一句
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Play, Pause, Loader2, Sparkles, Radio } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useSpeak, warmTtsCache } from '../lib/useSpeak.ts';
import { UNIT_READINGS } from '../data/textbooks/readings.ts';
import { flattenUnit } from '../data/textbooks/index.ts';
import { readingAudioSrc } from '../lib/audio-config.ts';
import { useToastStore } from '../stores/toastStore.ts';
import AiAssistPanel, { type AssistContext } from '../components/AiAssistPanel.tsx';
import { t } from '../lib/i18n.ts';

// 按句分割（引号感知）：引号必须跟它所包的话在一起——
//  1. 句末标点若在未闭引号内且下一个字符不是 ” → 不切（引号内多句保持一体）；
//  2. ” 紧跟句末标点 → 闭引号并入本句后切；
//  3. ” 后的短归属语（小写开头或 ≤3 词，如 asked Sue, as she…）→ 并入本句再切；
//  4. “…,” + 归属语, + 重开引号 → 归属语随前句切出（“…,” Father said,）。
function splitSentences(text: string): string[] {
  const TERM = '.!?”';
  const OPEN = '“';
  const CLOSE = '”';
  const out: string[] = [];
  let buf = '';
  let inQuote = false;
  const push = () => { const s = buf.trim(); if (s) out.push(s); buf = ''; };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    buf += ch;
    if (ch === OPEN) { inQuote = true; i++; continue; }
    if (ch === CLOSE) {
      inQuote = false;
      const prev = buf.length >= 2 ? buf[buf.length - 2] : '';
      if (prev === '.' || prev === '!' || prev === '?') {
        // 向后看归属语段（到下一句末标点或重开引号为止）
        let j = i + 1; let seg = '';
        while (j < text.length && !TERM.includes(text[j]) && text[j] !== OPEN) { seg += text[j]; j++; }
        const s = seg.trim();
        const hasQuote = s.includes(OPEN) || s.includes(CLOSE);
        const lower = s.length > 0 && s[0] >= 'a' && s[0] <= 'z';
        const words = s.split(/\s+/).filter(Boolean).length;
        if (s && !hasQuote && (lower || words <= 3)) { i++; continue; } // 归属语并入，到其标点再切
        push();
      } else if (prev === ',') {
        // “…,” + 归属语 + 重开引号：归属语随前句切出，重开引号内容独立成句
        let j = i + 1; let seg = '';
        while (j < text.length && text[j] !== OPEN && !TERM.includes(text[j])) { seg += text[j]; j++; }
        const s = seg.trim();
        if (s && !s.includes(OPEN) && !s.includes(CLOSE) && s.endsWith(',')) push();
      }
      i++; continue;
    }
    if (TERM.includes(ch)) {
      let j = i + 1;
      while (j < text.length && text[j] === ' ') j++;
      const nxt = j < text.length ? text[j] : '';
      if (inQuote && nxt !== CLOSE) { i++; continue; } // 引号内标点：后面不是 ” 就不切
      if (nxt === CLOSE) { i++; continue; }            // 闭引号紧跟标点：等 ” 到达时一起切
      push();
    }
    i++;
  }
  push();
  return out;
}

export default function ReadingView({ unit, onExit }: { unit: number; onExit: () => void }) {
  const { tts, locale, unit: unitInfo } = useAppStore();
  const { speak, stop, state: ttsState } = useSpeak();
  const [playing, setPlaying] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  // 教材原声模式：'tts' = 合成逐句朗读（默认） | 'orig' = 官方录音整篇串流
  const [audioMode, setAudioMode] = useState<'tts' | 'orig'>('tts');
  // 原声地址异步解析（构建期 manifest → /audio/yilin9a/u{n}_reading.m4a）
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    readingAudioSrc(unit).then((src: string | null) => { if (alive) setAudioUrl(src); });
    return () => { alive = false; };
  }, [unit]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [origPlaying, setOrigPlaying] = useState(false);
  const [origLoading, setOrigLoading] = useState(false);
  const [origProgress, setOrigProgress] = useState(0); // 0-1

  const reading = useMemo(() => UNIT_READINGS.find((r) => r.unit === unit), [unit]);

  // 整篇课文导读（prompt-v3.3）：context=标题+mode=reading+课文 paragraphs 全文。
  // prompt-v3.5：词表带 meaning（label+释义）；Notes 只传短列表（序号+quote/中文要点，不带 expl 全文）。
  // 禁止 slice(0,3)；超限截断按字数在 studyCardPrompt 内处理；课文不进 knowledge/passage 词表通道。
  const [aiOpen, setAiOpen] = useState(false);
  const aiContext: AssistContext | null = useMemo(() => {
    if (!reading || !unitInfo) return null;
    // 词表（词/短语/句式混排，label+meaning）——三通道里「本单元词表」的正文
    const wordlist = flattenUnit(unitInfo)
      .slice(0, 40)
      .map((i) => `${i.label}（${i.meaning}）`);
    // Notes 短列表：条目序号 + 原句 quote 或中文要点（zh），截首段，不传 expl 全文
    const notesBrief = unitInfo.notes
      .slice(0, 20)
      .map((nt) => `${nt.n}. ${nt.quote || nt.zh}`.slice(0, 120));
    return {
      label: reading.title,
      meaning: `Unit ${unit} 课文：${reading.title}`,
      kind: 'reading',
      mode: 'reading',
      fullText: reading.paragraphs.join('\n\n'),
      unitWords: wordlist,
      notesBrief,
      grade: unitInfo?.grade,
      unitTitle: unitInfo?.title,
    };
  }, [reading, unit, unitInfo]);

  // 展平为句子数组
  const sentences = useMemo(() => {
    if (!reading) return [];
    return reading.paragraphs.flatMap((p) => splitSentences(p));
  }, [reading]);

  const total = sentences.length;

  // 朗读当前句
  const playSentence = useCallback((idx: number) => {
    if (idx >= total) {
      setPlaying(false);
      return;
    }
    setSentenceIdx(idx);
    setPlaying(true);
    // 预取后两句进 TTS 缓存（滑动窗口；已缓存则 no-op，in-flight 自动去重），
    // 句间衔接从「1-2s 合成等待」降到「取缓存 ~50ms」，且只合成真正播到的句子。
    const ahead = sentences.slice(idx + 1, idx + 3);
    if (ahead.length) void warmTtsCache(ahead, { accent: tts.accent, rate: tts.rate });
    speak(sentences[idx], {
      accent: tts.accent,
      rate: tts.rate,
      onEnd: () => {
        // 自动播下一句
        const next = idx + 1;
        if (next < total) {
          setSentenceIdx(next);
          playSentence(next);
        } else {
          setPlaying(false);
        }
      },
    });
  }, [sentences, total, speak, tts.accent, tts.rate]);

  const toggle = useCallback(() => {
    if (playing) {
      stop();
      setPlaying(false);
    } else {
      // 如果已播完或未开始，从当句开始
      if (sentenceIdx >= total || sentenceIdx < 0) setSentenceIdx(0);
      playSentence(sentenceIdx < total ? sentenceIdx : 0);
    }
  }, [playing, stop, sentenceIdx, total, playSentence]);

  const handleSentenceClick = useCallback((idx: number) => {
    stop();
    setPlaying(false);
    setSentenceIdx(idx);
    // 点击后自动播放
    playSentence(idx);
  }, [stop, playSentence]);

  // 清理
  useEffect(() => () => { stop(); }, [stop]);

  // 原声播放控制（与 TTS 互斥：切换/播放任一方时停掉另一方）
  const stopOrig = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.pause(); }
    setOrigPlaying(false);
  }, []);

  const toggleOrig = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (origPlaying) {
      a.pause();
      setOrigPlaying(false);
    } else {
      stop(); // 停 TTS
      setPlaying(false);
      void a.play().then(() => setOrigPlaying(true)).catch(() => setOrigPlaying(false));
    }
  }, [origPlaying, stop]);

  // 切换音源：停掉当前正在播的一方
  const switchMode = useCallback((mode: 'tts' | 'orig') => {
    if (mode === audioMode) return;
    stop();
    setPlaying(false);
    stopOrig();
    setAudioMode(mode);
  }, [audioMode, stop, stopOrig]);

  // 卸载时停原声
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  if (!reading) {
    return (
      <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-16 text-center">
        <p className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('sessionNoUnit', locale)}</p>
        <button onClick={onExit} className="press mt-4 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-5 py-2.5 text-[calc(15px*var(--type-scale))]">{t('backToHome', locale)}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      {/* 顶部工具栏：返回样式与 SessionView 一致（左箭头+文本），右侧标题 */}
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="press flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 text-[calc(15px*var(--type-scale))] font-medium text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]"><ArrowLeft size={18} strokeWidth={2.25} /> {t('back', locale)}</button>
        <span className="tnum text-[calc(13px*var(--type-scale))] text-[var(--color-text-3)]">Unit {unit} · Reading</span>
      </div>

      {/* 播放控制栏：音源切换合并进栏内；标题仅此处一处（顶栏右侧不放标题，消重复） */}
      <div className="mt-4 flex items-center gap-1 rounded-[var(--radius-card)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] py-1 pl-1 pr-3 shadow-[var(--shadow-card)]">
        {audioMode === 'tts' ? (
          <button onClick={toggle} disabled={ttsState === 'synthesizing'} className="press flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] disabled:opacity-60" aria-label={playing ? t('playPause', locale) : t('play', locale)}>
            {ttsState === 'synthesizing' ? <Loader2 size={20} strokeWidth={2.25} className="animate-spin" /> : playing ? <Pause size={20} strokeWidth={2.25} /> : <Play size={20} strokeWidth={2.25} />}
          </button>
        ) : (
          <button onClick={toggleOrig} disabled={!audioUrl || origLoading} className="press flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] disabled:opacity-60" aria-label={t('origAudio', locale)}>
            {origLoading ? <Loader2 size={20} strokeWidth={2.25} className="animate-spin" /> : origPlaying ? <Pause size={20} strokeWidth={2.25} /> : <Play size={20} strokeWidth={2.25} />}
          </button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {/* 音源切换胶囊（合并进控制栏） */}
          <button onClick={() => switchMode('tts')} className={`press shrink-0 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[calc(11.5px*var(--type-scale))] transition-colors ${audioMode === 'tts' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]'}`}>{t('ttsMode', locale)}</button>
          {audioUrl && (
            <button onClick={() => switchMode('orig')} className={`press inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[calc(11.5px*var(--type-scale))] transition-colors ${audioMode === 'orig' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]'}`}><Radio size={11} strokeWidth={2.25} /> {t('origMode', locale)}</button>
          )}
          <span className="ml-auto shrink-0 text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">
            {audioMode === 'tts'
              ? <span className="tnum">{sentenceIdx + 1} / {total}{playing && ' · ' + t('readingNow', locale)}</span>
              : t('origAudio', locale) + (origPlaying ? ' · ' + t('readingNow', locale) : '')}
          </span>
        </div>
      </div>

      {/* 原声进度条（仅原声模式显示） */}
      {audioMode === 'orig' && audioUrl && (
        <input
          type="range" min={0} max={1000} value={Math.round(origProgress * 1000)}
          onChange={(e) => { const a = audioRef.current; if (a && a.duration) { a.currentTime = (Number(e.target.value) / 1000) * a.duration; setOrigProgress(Number(e.target.value) / 1000); } }}
          className="mt-2 h-1 w-full accent-[var(--color-accent)]"
          aria-label={t('origProgress', locale)}
        />
      )}

      {/* 教材原声 audio 元素（隐藏，串流 + Range） */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="none"
          onPlay={() => { setOrigLoading(false); setOrigPlaying(true); }}
          onPause={() => setOrigPlaying(false)}
          onWaiting={() => setOrigLoading(true)}
          onPlaying={() => setOrigLoading(false)}
          onTimeUpdate={(e) => { const a = e.currentTarget; if (a.duration) setOrigProgress(a.currentTime / a.duration); }}
          onEnded={() => { setOrigPlaying(false); setOrigProgress(0); }}
          onError={() => { setOrigLoading(false); setOrigPlaying(false); useToastStore.getState().show(t('origAudioError', locale), 'error'); }}
        />
      )}

      {/* 课文正文 */}
      <div className="mt-4 space-y-4">
        {reading.paragraphs.map((para, pi) => {
          const paraSentences = splitSentences(para);
          // 当前段落起始的全局句号 = 前面所有段落的句子数之和
          let localStart = 0;
          for (let j = 0; j < pi; j++) localStart += splitSentences(reading.paragraphs[j]).length;
          return (
            <p key={pi} className="leading-relaxed text-[calc(16px*var(--type-scale))]">
              {paraSentences.map((s, si) => {
                const globalIdx = localStart + si;
                const isActive = globalIdx === sentenceIdx && playing;
                const isDone = globalIdx < sentenceIdx;
                return (
                  <button
                    key={si}
                    onClick={() => handleSentenceClick(globalIdx)}
                    className={`inline cursor-pointer rounded px-0.5 text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-white'
                        : isDone
                          ? 'text-[var(--color-text-3)]'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                    }`}
                    style={{ borderRadius: 4, ...(isActive ? { fontSize: 'calc(18px*var(--type-scale))', fontWeight: 700 } : {}) }}
                  >
                    {s}{' '}
                  </button>
                );
              })}
            </p>
          );
        })}
      </div>

      {/* 整篇课文导读（prompt-v3.3）：入口在课文页文末，点开生成导读卡，不再有句子级 ✦ */}
      <button onClick={() => setAiOpen(true)} className="press mt-5 inline-flex items-center gap-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-ai)] hover:underline"><Sparkles size={14} strokeWidth={2.25} /> {t('aiReading', locale)}</button>
      <AiAssistPanel open={aiOpen} onClose={() => setAiOpen(false)} context={aiContext} />
    </div>
  );
}