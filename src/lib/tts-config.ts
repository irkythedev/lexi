// TTS URL configuration — edge-tts + SCF proxy
// Dev: port 3100 via same host (works for localhost and LAN IP)
// Prod: VITE_TTS_URL (e.g. SCF function URL)
// Web Speech API is the fallback when edge-tts is unreachable.

const DEV_PORT = 3100;
const PROD_URL = import.meta.env.VITE_TTS_URL ?? '';

// Use current hostname so LAN access (192.168.x.x) reaches the same server.
export const TTS_BASE = import.meta.env.DEV
  ? `http://${globalThis.location?.hostname ?? 'localhost'}:${DEV_PORT}`
  : PROD_URL;

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