// TTS via Web Speech API — multi-accent (UK/US) English speech synthesis,
// plus speed control. Ported/adapted to this English-vocab app.
// Note: for ENGLISH text, speechSynthesis works natively in all modern browsers
// (unlike Chinese, which requires a cloud proxy on the mainland — see useSpeak.js).

let voicesCache = null;

export function getVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

// Load voices (they populate asynchronously in some browsers).
export function ensureVoices() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) {
      voicesCache = existing;
      resolve(existing);
      return;
    }
    const onVoices = () => {
      const v = window.speechSynthesis.getVoices();
      voicesCache = v;
      resolve(v);
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    // Fallback timeout
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 800);
  });
}

function pickVoice(accent, langPref) {
  const voices = getVoices();
  if (!voices.length) return null;
  const target = accent === 'uk' ? 'en-GB' : 'en-US';
  // Prefer the exact locale, then fall back to any English voice.
  return (
    voices.find((v) => v.lang === target) ||
    voices.find((v) => v.lang && v.lang.startsWith('en')) ||
    voices.find((v) => /en/i.test(v.lang || '')) ||
    null
  );
}

// Speak the given text. Returns a controller with .cancel().
export function speak(text, { accent = 'us', rate = 1.0, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError && onError(new Error('当前浏览器不支持语音合成'));
    return { cancel() {} };
  }
  window.speechSynthesis.cancel(); // stop any current speech
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(accent);
  if (voice) u.voice = voice;
  u.lang = accent === 'uk' ? 'en-GB' : 'en-US';
  u.rate = rate;
  u.pitch = 1;
  if (onEnd) u.onend = onEnd;
  if (onError) u.onerror = (e) => onError(e);
  window.speechSynthesis.speak(u);
  return {
    cancel() {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    },
  };
}

export function cancelSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }
}
