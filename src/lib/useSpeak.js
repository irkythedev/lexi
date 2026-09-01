// Optional cloud-TTS hook for CHINESE playback (AI explanations, example Cn).
// Ported from stem_digt_labs' use-speak.ts (edge-tts + 腾讯云 SCF + Web Audio).
//
// Why needed: Microsoft Edge TTS is the only free+keyless+mainland-accessible
// TTS, but browsers cannot connect directly (custom WebSocket headers blocked).
// So a serverless proxy is required. This hook is OPTIONAL — Chinese answer
// playback only appears when VITE_TTS_URL is configured. English TTS uses the
// native Web Speech API (see tts.js) and needs no backend.
//
// Set VITE_TTS_URL to your edge-tts proxy (returns audio/mpeg; may be base64
// text per Tencent SCF Function URL quirks — handled below).
import { useCallback, useEffect, useRef, useState } from 'react';

const TTS_URL = import.meta.env.VITE_TTS_URL || '';
const isEnabled = Boolean(TTS_URL);

// Split Chinese text into <=800 char chunks on sentence boundaries.
function splitForTTS(text, max = 800) {
  if (!text) return [];
  const out = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if ('。！？!?；;'.includes(ch) && buf.length >= 4) {
      out.push(buf);
      buf = '';
    } else if (buf.length >= max) {
      out.push(buf);
      buf = '';
    }
  }
  if (buf) out.push(buf);
  return out;
}

function toMp3Blob(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  const isMp3 =
    view.length >= 2 && (view[0] & 0xff) === 0xff && (view[1] & 0xe0) === 0xe0;
  if (isMp3) return new Blob([arrayBuffer], { type: 'audio/mpeg' });
  const text = new TextDecoder().decode(view);
  const binary = atob(text.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/mpeg' });
}

export function useSpeak() {
  const [state, setState] = useState('idle'); // idle|synthesizing|playing|paused|error
  const [error, setError] = useState('');
  const AudioCtx = useRef(null);
  const sourceRef = useRef(null);
  const ctxRef = useRef(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const wasStoppedRef = useRef(false);
  const chunksRef = useRef([]);
  const idxRef = useRef(0);

  const getCtx = () => {
    if (!AudioCtx.current) {
      const C = window.AudioContext || window.webkitAudioContext;
      AudioCtx.current = new C();
    }
    return AudioCtx.current;
  };

  const stopSource = () => {
    if (sourceRef.current) {
      try { sourceRef.current.onended = null; sourceRef.current.stop(); } catch (_) {}
      sourceRef.current = null;
    }
  };

  const playChunk = useCallback((idx) => {
    const chunks = chunksRef.current;
    if (idx >= chunks.length) {
      setState('idle');
      elapsedRef.current = 0;
      return;
    }
    const blobUrl = URL.createObjectURL(chunks[idx]);
    const audioEl = new Audio();
    audioEl.src = blobUrl;
    audioEl.onended = () => {
      URL.revokeObjectURL(blobUrl);
      if (!wasStoppedRef.current) playChunk(idx + 1);
    };
    audioEl.play().catch((e) => {
      setError('播放失败：' + (e?.message || e));
      setState('error');
    });
    idxRef.current = idx;
    setState('playing');
  }, []);

  const speak = useCallback(
    async (text, voice = 'zh-CN-XiaoxiaoNeural') => {
      if (!isEnabled) return;
      setError('');
      setState('synthesizing');
      try {
        const chunks = splitForTTS(text);
        const blobs = [];
        for (const c of chunks) {
          const res = await fetch(
            `${TTS_URL}?text=${encodeURIComponent(c)}&voice=${encodeURIComponent(voice)}`,
            { cache: 'no-store' }
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arr = await res.arrayBuffer();
          blobs.push(toMp3Blob(arr));
        }
        chunksRef.current = blobs;
        playChunk(0);
      } catch (e) {
        setError(e?.message || String(e));
        setState('error');
      }
    },
    [playChunk]
  );

  const stop = useCallback(() => {
    wasStoppedRef.current = true;
    stopSource();
    if (ctxRef.current) try { ctxRef.current.close(); } catch (_) {}
    ctxRef.current = null;
    setState('idle');
  }, []);

  const pause = useCallback(() => {
    if (state !== 'playing') return;
    wasStoppedRef.current = true;
    stopSource();
    setState('paused');
  }, [state]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    wasStoppedRef.current = false;
    playChunk(idxRef.current);
  }, [state, playChunk]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { state, error, speak, stop, pause, resume, enabled: isEnabled };
}
