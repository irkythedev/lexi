// Speech recognition for shadowing / oral input, via Web Speech API.
// Uses webkitSpeechRecognition (Chrome/Edge/Safari). Returns the transcript
// and a per-word match against the target sentence.
import { useCallback, useRef, useState } from 'react';

export function useSpeechRecognition({ lang = 'en-US', onResult } = {}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef(null);

  // Detect support once.
  if (typeof window !== 'undefined') {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR && !recRef.current) {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = lang;
      recRef.current = rec;
      setSupported(true);
    }
  }

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setListening(true);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult && onResult(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); } catch (_) { setListening(false); }
  }, [onResult]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) { try { rec.stop(); } catch (_) {} }
    setListening(false);
  }, []);

  return { listening, supported, start, stop };
}

// Compare the recognized transcript to the target sentence, word-by-word.
// Returns { words: [{text, ok}], score } where ok = normalized match.
export function compareWords(target, transcript) {
  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, '')
      .split(/\s+/)
      .filter(Boolean);
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
