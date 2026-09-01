// Optional cloud-TTS hook for CHINESE playback (AI explanations / example Cn).
// Ported from stem_digt_labs' use-speak (edge-tts + 腾讯云 SCF + Web Audio).
// WHY: Microsoft Edge TTS is the only free+keyless+mainland-accessible TTS, but
// browsers cannot connect directly (custom WebSocket headers blocked). A
// serverless proxy is required. OPTIONAL: appears only when VITE_TTS_URL is set.
// English TTS uses the native Web Speech API (tts.ts) and needs no backend.
import { useCallback, useEffect, useRef, useState } from 'react';

const TTS_URL: string = import.meta.env.VITE_TTS_URL ?? '';
export const ttsEnabled = Boolean(TTS_URL);

function splitForTTS(text: string, max = 800): string[] {
  if (!text) return [];
  const out: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if ('。！？!?；;'.includes(ch) && buf.length >= 4) { out.push(buf); buf = ''; }
    else if (buf.length >= max) { out.push(buf); buf = ''; }
  }
  if (buf) out.push(buf);
  return out;
}

function toMp3Blob(arrayBuffer: ArrayBuffer): Blob {
  const view = new Uint8Array(arrayBuffer);
  const isMp3 = view.length >= 2 && (view[0] & 0xff) === 0xff && (view[1] & 0xe0) === 0xe0;
  if (isMp3) return new Blob([arrayBuffer], { type: 'audio/mpeg' });
  const text = new TextDecoder().decode(view);
  const binary = atob(text.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/mpeg' });
}

export type SpeakState = 'idle' | 'synthesizing' | 'playing' | 'paused' | 'error';

export function useSpeak() {
  const [state, setState] = useState<SpeakState>('idle');
  const [error, setError] = useState('');
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
    const wasStoppedRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const idxRef = useRef(0);

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.onended = null; sourceRef.current.stop(); } catch { /* noop */ }
      sourceRef.current = null;
    }
  }, []);

  const playChunk = useCallback((idx: number) => {
    const chunks = chunksRef.current;
    if (idx >= chunks.length) { setState('idle'); return; }
    const blobUrl = URL.createObjectURL(chunks[idx]);
    const audioEl = new Audio();
    audioEl.src = blobUrl;
    audioEl.onended = () => {
      URL.revokeObjectURL(blobUrl);
      if (!wasStoppedRef.current) playChunk(idx + 1);
    };
    audioEl.play().catch((e) => { setError('播放失败：' + (e?.message || e)); setState('error'); });
    idxRef.current = idx;
    setState('playing');
  }, []);

  const speak = useCallback(async (text: string, voice = 'zh-CN-XiaoxiaoNeural') => {
    if (!ttsEnabled) return;
    setError(''); setState('synthesizing');
    try {
      const chunks = splitForTTS(text);
      const blobs: Blob[] = [];
      for (const c of chunks) {
        const res = await fetch(`${TTS_URL}?text=${encodeURIComponent(c)}&voice=${encodeURIComponent(voice)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.arrayBuffer();
        blobs.push(toMp3Blob(arr));
      }
      chunksRef.current = blobs;
      playChunk(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }, [playChunk]);

  const stop = useCallback(() => {
    wasStoppedRef.current = true;
    stopSource();
    if (ctxRef.current) { try { ctxRef.current.close(); } catch { /* noop */ } }
    ctxRef.current = null;
    setState('idle');
  }, [stopSource]);

  const pause = useCallback(() => {
    if (state !== 'playing') return;
    wasStoppedRef.current = true;
    stopSource();
    setState('paused');
  }, [state, stopSource]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    wasStoppedRef.current = false;
    playChunk(idxRef.current);
  }, [state, playChunk]);

  useEffect(() => () => stop(), [stop]);

  return { state, error, speak, stop, pause, resume, enabled: ttsEnabled };
}
