import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play, Repeat, Globe, Gauge, Loader2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useSpeak } from '../lib/useSpeak.ts';
import { t } from '../lib/i18n.ts';
import type { SpeakOptions } from '../lib/useSpeak.ts';

interface SpeakTarget { text: string; accent: 'us' | 'uk'; rate: number; onEnd?: () => void; }

const listeners = new Set<(t: SpeakTarget) => void>();
const stateListeners = new Set<(s: 'idle' | 'synthesizing' | 'playing') => void>();
let current: SpeakTarget | null = null;

export function requestSpeak(text: string, accent?: 'us' | 'uk', rate?: number, onEnd?: () => void): void {
  if (!text) return;
  // 默认取当前设置，避免任何调用点漏传时偏离用户配置。
  const tts = useAppStore.getState().tts;
  current = { text, accent: accent ?? tts.accent, rate: rate ?? tts.rate, onEnd };
  const c = current;
  if (c) listeners.forEach((fn) => fn(c));
}

/** 订阅全局 TTS 播放状态（供设置页试听按钮等外部 UI 显示加载/播放态）。返回取消订阅函数。 */
export function subscribeTtsState(fn: (s: 'idle' | 'synthesizing' | 'playing') => void): () => void {
  stateListeners.add(fn);
  return () => { stateListeners.delete(fn); };
}

function emitTtsState(s: 'idle' | 'synthesizing' | 'playing') {
  stateListeners.forEach((fn) => fn(s));
}

export default function FloatingTTS() {
  const { tts, setTts, locale } = useAppStore();
  const [active, setActive] = useState<SpeakTarget | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const { speak, stop, resume, state } = useSpeak();
  const playRef = useRef<(target: SpeakTarget, accent: 'us' | 'uk', rate: number, onEnd?: () => void) => void>(() => {});

  const play = useCallback((target: SpeakTarget | null, accent: 'us' | 'uk' = tts.accent, rate: number = tts.rate, onEnd?: () => void) => {
    if (!target?.text) return;
    stop();
    const opts: SpeakOptions = {
      accent,
      rate,
      onEnd: () => {
        if (loopRef.current) setTimeout(() => playRef.current(target, accent, rate, onEnd), 600);
        else { setPlaying(false); onEnd?.(); }
      },
    };
    playRef.current = play;
    void speak(target.text, opts);
    setPlaying(true);
  }, [speak, stop, tts.accent, tts.rate]);
  const loopRef = useRef(loop);
  loopRef.current = loop;

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  // 广播播放状态给订阅者（设置页试听等外部 UI）
  useEffect(() => { emitTtsState(state === 'playing' || state === 'paused' ? 'playing' : state === 'synthesizing' ? 'synthesizing' : 'idle'); }, [state]);

  useEffect(() => {
    // 用 playRef.current 而非闭包 play：play 会随 tts.accent/rate 重建，
    // 闭包捕获首次渲染的 play 会导致口音/语速切换不生效（陈旧默认值）。
    const fn = (t: SpeakTarget) => { setActive(t); playRef.current(t, t.accent, t.rate, t.onEnd); };
    listeners.add(fn);
    return () => { listeners.delete(fn); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (state === 'playing' || playing) { stop(); setPlaying(false); }
    else if (state === 'paused') { resume(); setPlaying(true); }
    else play(active);
  };
  if (!active) return null;

  return (
    <div className="glass-overlay fixed bottom-[4.7rem] left-4 z-40 flex items-center gap-0.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface)]/90 px-1.5 py-1 shadow-[var(--shadow-overlay)]">
      <span className="max-w-[120px] truncate px-2 text-[calc(12px*var(--type-scale))] font-medium text-[var(--color-text-2)]">{active.text}</span>
      <button onClick={toggle} disabled={state === 'synthesizing'} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-accent)] disabled:opacity-60" aria-label={state === 'synthesizing' ? t('synthesizing', locale) : t('playPause', locale)}>
        {state === 'synthesizing' ? <Loader2 size={16} className="animate-spin" /> : playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button onClick={() => setLoop((v) => !v)} className="press flex h-11 w-11 items-center justify-center rounded-full" style={{ color: loop ? 'var(--color-accent)' : 'var(--color-text-3)' }} aria-label={t('loop', locale)}>
        <Repeat size={15} />
      </button>
      <button onClick={() => { const a = tts.accent === 'us' ? 'uk' : 'us'; setTts({ accent: a }); play(active, a, tts.rate); }} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)]" aria-label={t('switchAccent', locale)} title={tts.accent === 'us' ? t('accentUs', locale) : t('accentUk', locale)}>
        <Globe size={15} />
      </button>
      <button onClick={() => { const next = tts.rate === 1.0 ? 1.2 : tts.rate === 1.2 ? 0.8 : 1.0; setTts({ rate: next }); if (playing) play(active, tts.accent, next); }} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)]" aria-label={t('speed', locale)} title={t('speedTitle', locale, { speed: tts.rate })}>
        <Gauge size={15} />
      </button>
    </div>
  );
}
