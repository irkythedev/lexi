// TTS URL configuration — edge-tts + SCF proxy
// Dev: localhost:3100 (local-server.mjs from stem-tts-fn)
// Prod: VITE_TTS_URL (e.g. SCF function URL)
// Web Speech API is the fallback when edge-tts is unreachable.

const DEV_URL = 'http://localhost:3100';
const PROD_URL = import.meta.env.VITE_TTS_URL ?? '';

export const TTS_BASE = import.meta.env.DEV ? DEV_URL : PROD_URL;

export const edgeTtsEnabled = Boolean(TTS_BASE);

// Voice mapping: accent → Microsoft Edge TTS voice name
export const EDGE_VOICE: Record<string, string> = {
  us: 'en-US-AriaNeural',
  uk: 'en-GB-SoniaNeural',
};

// Voice mapping for Web Speech API fallback
export const SPEECH_LANG: Record<string, string> = {
  us: 'en-US',
  uk: 'en-GB',
};