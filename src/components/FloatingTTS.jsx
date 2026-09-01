// Floating TTS player — a glass chip that floats bottom-left (above the tab
// bar) and plays the currently-focused sentence/word with accent + speed
// toggles and auto-loop. It is the SINGLE owner of TTS playback via the native
// Web Speech API (English works fully offline). Any card calls requestSpeak().
import { useState, useEffect } from 'react';
import { Pause, Play, Repeat, Globe, Gauge } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { speak, cancelSpeech, getVoices } from '../lib/tts.js';

// Tiny pub-sub so any component can request playback.
const listeners = new Set();
let current = null; // { text, accent, rate }

export function requestSpeak(text, accent = 'us', rate = 1.0) {
  if (!text) return;
  current = { text, accent, rate };
  listeners.forEach((fn) => fn(current));
}

export default function FloatingTTS() {
  const { tts, setTtsPref } = useApp();
  const [active, setActive] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);

  const play = (target = active, accent = tts.accent, rate = tts.rate) => {
    if (!target?.text) return;
    cancelSpeech();
    const ctrl = speak(target.text, {
      accent,
      rate,
      onEnd: () => {
        if (loop) setTimeout(() => play(target, accent, rate), 600);
        else setPlaying(false);
      },
    });
    setPlaying(true);
    // expose cancel via closure for toggle
    play._cancel = ctrl.cancel;
  };

  useEffect(() => {
    const fn = (target) => { setActive(target); play(target); };
    listeners.add(fn);
    return () => listeners.delete(fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (playing) { cancelSpeech(); setPlaying(false); }
    else play(active);
  };

  if (!active) return null;

  return (
    <div className="glass-overlay fixed bottom-[4.7rem] left-4 z-40 flex items-center gap-0.5 rounded-full border border-[var(--hairline)] bg-[var(--surface)]/90 px-1.5 py-1 shadow-[var(--sh-overlay)]">
      <span className="max-w-[120px] truncate px-2 text-[12px] font-medium text-[var(--text-2)]">{active.text}</span>
      <button onClick={toggle} className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--accent)]" aria-label="播放/暂停">
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button onClick={() => setLoop((v) => !v)} className="press flex h-8 w-8 items-center justify-center rounded-full" style={{ color: loop ? 'var(--accent)' : 'var(--text-3)' }} aria-label="循环">
        <Repeat size={15} />
      </button>
      <button onClick={() => { const a = tts.accent === 'us' ? 'uk' : 'us'; setTtsPref({ accent: a }); play(active, a, tts.rate); }} className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)]" aria-label="切换口音" title={tts.accent === 'us' ? '美式' : '英式'}>
        <Globe size={15} />
      </button>
      <button onClick={() => { const next = tts.rate === 1.0 ? 1.2 : tts.rate === 1.2 ? 0.8 : 1.0; setTtsPref({ rate: next }); if (playing) play(active, tts.accent, next); }} className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)]" aria-label="语速" title={`语速 ${tts.rate}x`}>
        <Gauge size={15} />
      </button>
    </div>
  );
}
