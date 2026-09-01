import { useCallback, useEffect, useRef, useState } from 'react';

interface WordResult { text: string; ok: boolean; }

export interface CompareResult { words: WordResult[]; score: number; }

// Speech recognition for shadowing / oral input via Web Speech API.
export function useSpeechRecognition(opts: { lang?: string; onResult?: (t: string) => void } = {}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SR && !recRef.current) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = opts.lang ?? 'en-US';
      recRef.current = rec;
      setSupported(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      opts.onResult?.(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); } catch { setListening(false); }
  }, [opts]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

const norm = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9\s']/g, '').split(/\s+/).filter(Boolean);

// Compare recognized transcript to target sentence, word-by-word.
export function compareWords(target: string, transcript: string): CompareResult {
  const tgt = norm(target);
  const got = norm(transcript);
  const gotSet = new Set(got);
  let hit = 0;
  const words = tgt.map((w) => {
    const ok = gotSet.has(w);
    if (ok) hit += 1;
    return { text: w, ok };
  });
  const score = tgt.length ? Math.round((hit / tgt.length) * 100) : 0;
  return { words, score };
}
