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

export type VoiceGender = 'female' | 'male';

// Voice mapping: accent + gender → Microsoft Edge TTS voice name.
// 已验证 SCF 支持全部四种组合（美/英 × 女/男）。
export function getEdgeVoice(accent: 'us' | 'uk', gender: VoiceGender): string {
  if (accent === 'uk') return gender === 'male' ? 'en-GB-RyanNeural' : 'en-GB-SoniaNeural';
  return gender === 'male' ? 'en-US-GuyNeural' : 'en-US-AriaNeural';
}

// Voice mapping for Web Speech API fallback
export const SPEECH_LANG: Record<string, string> = {
  us: 'en-US',
  uk: 'en-GB',
};
