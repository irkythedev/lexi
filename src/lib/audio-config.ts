// 教材原声（官方录音）串流服务配置。
// 音频由独立轻量服务提供（~/lexi-audio，PM2/守护进程托管），带 Referer 同源校验。
// VITE_AUDIO_URL 覆盖公网地址；开发默认走内网 8316。
const PROD_AUDIO_URL = import.meta.env.VITE_AUDIO_URL ?? 'https://lexi.irky.dev/audio-svc';

const hostname = globalThis.location?.hostname ?? 'localhost';
const isLan = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.|^localhost$/.test(hostname);

export const AUDIO_BASE = import.meta.env.DEV || isLan
  ? `http://LAN-HOST:8316`
  : PROD_AUDIO_URL;

/** 单元课文原声 URL（u{n}_reading.mp3）；服务不可达或无该单元返回 null */
export function readingAudioUrl(unit: number): string | null {
  if (!AUDIO_BASE) return null;
  return `${AUDIO_BASE}/audio/u${unit}_reading.mp3`;
}
