// TTS via Web Speech API — multi-accent (UK/US) English speech synthesis.
// For ENGLISH text this works natively in all modern browsers (no backend).
export type Accent = 'us' | 'uk';

let voicesCache: SpeechSynthesisVoice[] | null = null;

export function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { resolve([]); return; }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) { voicesCache = existing; resolve(existing); return; }
    const onVoices = () => {
      const v = window.speechSynthesis.getVoices();
      voicesCache = v;
      resolve(v);
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 800);
  });
}

// Female/male voice-name hints, ranked so platform-specific names still match.
const FEMALE_HINTS = ['female', 'sonia', 'samantha', 'zira', 'hazel', 'kate', 'susan', 'victoria', 'moira', 'tessa', 'aria', 'jenny', 'libby', 'emma'];
const MALE_HINTS = ['male', 'ryan', 'daniel', 'david', 'george', 'guy', 'mark', 'oliver', 'fred', 'christopher', 'eric', 'alex'];

function voiceGenderHint(name: string): 'female' | 'male' | null {
  const n = name.toLowerCase();
  if (FEMALE_HINTS.some((h) => n.includes(h))) return 'female';
  if (MALE_HINTS.some((h) => n.includes(h))) return 'male';
  return null;
}

function pickVoice(accent: Accent, gender: 'female' | 'male' = 'female'): SpeechSynthesisVoice | null {
  const voices = voicesCache ?? (typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : []);
  if (!voices.length) return null;
  const target = accent === 'uk' ? 'en-GB' : 'en-US';
  const pool = voices.filter((v) => v.lang === target);
  if (!pool.length) return voices.find((v) => v.lang?.startsWith('en')) ?? null;
  // Prefer a voice whose name matches the requested gender, then exact-lang.
  const genderMatch = pool.find((v) => voiceGenderHint(v.name) === gender);
  return genderMatch ?? pool[0];
}

export interface SpeakHandle { cancel: () => void; }

export function speak(
  text: string,
  opts: { accent?: Accent; gender?: 'female' | 'male'; rate?: number; onEnd?: () => void; onError?: (e: unknown) => void } = {}
): SpeakHandle {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    opts.onError?.(new Error('当前浏览器不支持语音合成'));
    return { cancel() {} };
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const accent = opts.accent ?? 'us';
  const gender = opts.gender ?? 'female';
  const voice = pickVoice(accent, gender);
  if (voice) u.voice = voice;
  u.lang = accent === 'uk' ? 'en-GB' : 'en-US';
  u.rate = opts.rate ?? 1.0;
  u.pitch = 1;
  if (opts.onEnd) u.onend = opts.onEnd;
  if (opts.onError) u.onerror = (e) => opts.onError?.(e);
  ensureVoices().then(() => {
    const v = pickVoice(accent, gender);
    if (v) { u.voice = v; }
    window.speechSynthesis.speak(u);
  });
  return { cancel() { try { window.speechSynthesis.cancel(); } catch { /* noop */ } } };
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
  }
}
