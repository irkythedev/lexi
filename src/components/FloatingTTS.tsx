import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play, Repeat, Globe, Gauge } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useSpeak } from '../lib/useSpeak.ts';
import type { SpeakOptions } from '../lib/useSpeak.ts';

interface SpeakTarget { text: string; accent: 'us' | 'uk'; rate: number; }

const listeners = new Set<(t: SpeakTarget) => void>();
let current: SpeakTarget | null = null;

export function requestSpeak(text: string, accent: 'us' | 'uk' = 'us', rate = 1.0): void {
  if (!text) return;
  current = { text, accent, rate };
  const c = current;
  if (c) listeners.forEach((fn) => fn(c));
}

export default function FloatingTTS() {
  const { tts, setTts } = useAppStore();
  const [active, setActive] = useState<SpeakTarget | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const { speak, stop, resume, state } = useSpeak();
  const playRef = useRef<(target: SpeakTarget, accent: 'us' | 'uk', rate: number) => void>(() => {});

  const play = useCallback((target: SpeakTarget | null, accent: 'us' | 'uk' = tts.accent, rate: number = tts.rate) => {
    if (!target?.text) return;
    stop();
    const opts: SpeakOptions = {
      accent,
      rate,
      onEnd: () => {
        if (loopRef.current) setTimeout(() => playRef.current(target, accent, rate), 600);
        else setPlaying(false);
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

  useEffect(() => {
    const fn = (t: SpeakTarget) => { setActive(t); play(t); };
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
      <span className="max-w-[120px] truncate px-2 text-[12px] font-medium text-[var(--color-text-2)]">{active.text}</span>
      <button onClick={toggle} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-accent)]" aria-label="播放/暂停">
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button onClick={() => setLoop((v) => !v)} className="press flex h-11 w-11 items-center justify-center rounded-full" style={{ color: loop ? 'var(--color-accent)' : 'var(--color-text-3)' }} aria-label="循环">
        <Repeat size={15} />
      </button>
      <button onClick={() => { const a = tts.accent === 'us' ? 'uk' : 'us'; setTts({ accent: a }); play(active, a, tts.rate); }} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)]" aria-label="切换口音" title={tts.accent === 'us' ? '美式' : '英式'}>
        <Globe size={15} />
      </button>
      <button onClick={() => { const next = tts.rate === 1.0 ? 1.2 : tts.rate === 1.2 ? 0.8 : 1.0; setTts({ rate: next }); if (playing) play(active, tts.accent, next); }} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)]" aria-label="语速" title={`语速 ${tts.rate}x`}>
        <Gauge size={15} />
      </button>
    </div>
  );
}
