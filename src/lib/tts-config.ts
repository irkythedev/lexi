// TTS URL configuration — edge-tts + 腾讯云 SCF 代理（复用 stem 现有函数实例）
// Dev 和 Prod 均走 SCF（用户不需要本地 TTS 服务器）。
// 本地 3100 配置保留仅作后备（VITE_TTS_DEV_LOCAL=true 时启用）。
// Web Speech API is the fallback when edge-tts is unreachable.

const PROD_URL = import.meta.env.VITE_TTS_URL ?? 'https://1307683613-fg2n0ky3me.ap-shanghai.tencentscf.com';

// Always use SCF in both dev and prod.  Set VITE_TTS_DEV_LOCAL=true to force
// dev back to localhost:3100 (for offline work or SCF unavailable).
const DEV_LOCAL = import.meta.env.VITE_TTS_DEV_LOCAL === 'true';
const hostname = globalThis.location?.hostname ?? 'localhost';

export const TTS_BASE = import.meta.env.DEV && DEV_LOCAL
  ? `http://${hostname}:3100`
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
