// useSpeak — edge-tts (SCF proxy) primary + Web Speech API fallback
// Word-level progress callback for per-word highlight during playback.
// Ported lessons from stem_digt_labs: iOS audio unlock, base64/raw MP3 sniff,
// pause via stop+offset rebuild, onended race guard.
import { useCallback, useEffect, useRef, useState } from 'react';
import { TTS_BASE, EDGE_VOICE } from './tts-config.ts';
import { scfUrlWithToken } from './scf-token.ts';
import { speak as webSpeak, type Accent, type SpeakHandle } from './tts.ts';

export const edgeTtsEnabled = Boolean(TTS_BASE);

export type SpeakState = 'idle' | 'synthesizing' | 'playing' | 'paused' | 'error';

export interface SpeakOptions {
  accent?: 'us' | 'uk';
  rate?: number;
  /** Called as playback progresses; wordIndex is 0-based. */
  onWordChange?: (wordIndex: number, totalWords: number) => void;
  onEnd?: () => void;
}

// Split into words (keep punctuation attached to preceding word for natural pacing).
function splitWords(text: string): string[] {
  const m = text.trim().match(/\S+/g);
  return m ?? [];
}

function toMp3Blob(arrayBuffer: ArrayBuffer): Blob {
  const view = new Uint8Array(arrayBuffer);
  const isMp3 = view.length >= 2 && (view[0] & 0xff) === 0xff && (view[1] & 0xe0) === 0xe0;
  if (isMp3) return new Blob([arrayBuffer], { type: 'audio/mpeg' });
  // SCF function URL returns base64 text with audio/mpeg content type
  const text = new TextDecoder().decode(view).replace(/\s/g, '');
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/mpeg' });
}

function splitForTTS(text: string, max = 800): string[] {
  if (!text) return [];
  const out: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if ('.!?;，。！？；'.includes(ch) && buf.length >= 4) { out.push(buf); buf = ''; }
    else if (buf.length >= max) { out.push(buf); buf = ''; }
  }
  if (buf) out.push(buf);
  return out;
}

// Resolve a blob's duration (ms). Falls back to 0 on failure so callers can
// fall through to the per-chunk `audio.duration` estimate.
function blobDurationMs(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = new Audio();
    el.preload = 'metadata';
    const done = (ms: number) => { URL.revokeObjectURL(url); resolve(ms); };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration * 1000 : 0);
    el.onerror = () => done(0);
    el.src = url;
  });
}

export function useSpeak() {
  const [state, setState] = useState<SpeakState>('idle');
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const idxRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const totalMsRef = useRef(0); // measured total playback ms across all chunks
  const wasStoppedRef = useRef(false);
  const optsRef = useRef<SpeakOptions>({});
  const webHandleRef = useRef<SpeakHandle | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const stopSource = useCallback(() => {
    clearTimer();
    if (audioRef.current) {
      try { audioRef.current.onended = null; audioRef.current.pause(); audioRef.current.src = ''; } catch { /* noop */ }
      audioRef.current = null;
    }
    if (webHandleRef.current) {
      try { webHandleRef.current.cancel(); } catch { /* noop */ }
      webHandleRef.current = null;
    }
  }, [clearTimer]);

  /** Start per-word progress timer proportional to estimated word durations. */
  const startWordTimer = useCallback((words: string[], totalMs: number) => {
    clearTimer();
    if (words.length <= 1) return;
    const totalChars = words.join(' ').length || 1;
    const bounds: number[] = [0];
    for (const w of words) bounds.push(bounds[bounds.length - 1] + (w.length / totalChars) * totalMs);
    const startAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startAt;
      let idx = 0;
      while (idx < bounds.length - 1 && elapsed >= bounds[idx + 1]) idx++;
      optsRef.current.onWordChange?.(Math.min(idx, words.length - 1), words.length);
    }, 60);
  }, [clearTimer]);

  const playEdgeChunk = useCallback((idx: number) => {
    const chunks = chunksRef.current;
    if (idx >= chunks.length) {
      clearTimer();
      optsRef.current.onWordChange?.(wordsRef.current.length - 1, wordsRef.current.length);
      optsRef.current.onEnd?.();
      setState('idle');
      return;
    }
    const audio = new Audio();
    const blobUrl = URL.createObjectURL(chunks[idx]);
    audio.src = blobUrl;
    audio.onended = () => {
      URL.revokeObjectURL(blobUrl);
      if (!wasStoppedRef.current) playEdgeChunk(idx + 1);
    };
    audio.onerror = () => { setError('播放失败'); setState('error'); };
    audio.play().then(() => {
      setState('playing');
      // Word-timing should span the WHOLE utterance: use measured cumulative
      // duration (all chunks) when available, else fall back to this chunk.
      const totalMs = totalMsRef.current > 0 ? totalMsRef.current : (audio.duration ? audio.duration * 1000 : 0);
      if (idx === 0 && totalMs > 0) {
        startWordTimer(wordsRef.current, totalMs);
      }
    }).catch((e) => { setError('播放失败：' + (e?.message || e)); setState('error'); });
    idxRef.current = idx;
    audioRef.current = audio;
  }, [clearTimer, startWordTimer]);

  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    if (!text) return;
    optsRef.current = options;
    const { accent = 'us', rate = 1.0, onEnd } = options;
    wasStoppedRef.current = false;
    wordsRef.current = splitWords(text);
    setError('');
    setState('synthesizing');

    // Prefer edge-tts via SCF; fall back to Web Speech on any failure.
    if (TTS_BASE) {
      try {
        const parts = splitForTTS(text);
        const blobs: Blob[] = [];
        const voice = EDGE_VOICE[accent] ?? EDGE_VOICE.us;
        for (const part of parts) {
          const url = scfUrlWithToken(`${TTS_BASE}/tts?text=${encodeURIComponent(part)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(String(rate))}`);
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          blobs.push(toMp3Blob(await res.arrayBuffer()));
        }
        chunksRef.current = blobs;
        // Measure cumulative playback time across ALL chunks so per-word
        // highlight pacing matches the real audio, not just the first chunk.
        const measured = await Promise.all(blobs.map(blobDurationMs));
        totalMsRef.current = measured.reduce((a, b) => a + b, 0);
        playEdgeChunk(0);
        return;
      } catch (e) {
        // fall through to Web Speech
        console.warn('edge-tts failed, falling back to Web Speech:', e);
      }
    }

    // Web Speech fallback
    const handle = webSpeak(text, {
      accent: accent as Accent,
      rate,
      onEnd: () => { optsRef.current.onWordChange?.(wordsRef.current.length - 1, wordsRef.current.length); onEnd?.(); setState('idle'); },
      onError: (err) => { setError(String(err)); setState('error'); },
    });
    webHandleRef.current = handle;
    setState('playing');
    // No reliable word timing on Web Speech — fire word 0 to mark start.
    optsRef.current.onWordChange?.(0, wordsRef.current.length);
  }, [playEdgeChunk]);

  const stop = useCallback(() => {
    wasStoppedRef.current = true;
    stopSource();
    setState('idle');
  }, [stopSource]);

  const pause = useCallback(() => {
    if (state !== 'playing') return;
    wasStoppedRef.current = true;
    clearTimer();
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* noop */ } }
    if (webHandleRef.current) { try { webHandleRef.current.cancel(); } catch { /* noop */ } }
    setState('paused');
  }, [state, clearTimer]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    wasStoppedRef.current = false;
    if (audioRef.current && audioRef.current.src) {
      setState('playing');
      audioRef.current.play().catch(() => setState('error'));
    } else {
      playEdgeChunk(idxRef.current);
    }
  }, [state, playEdgeChunk]);

  useEffect(() => () => { stopSource(); }, [stopSource]);

  return { state, error, speak, stop, pause, resume, enabled: edgeTtsEnabled };
}
