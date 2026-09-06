// 教材原声音频源解析（Lexi 音频架构：builtin 内置 → user 用户上传 → url 外链，演进式三档）。
//
// builtin：同源 public/audio/<book>/u{n}_reading.m4a（mono AAC 64k）。文件不进 git（.gitignore），
//   由 scripts/sync_audio.py 从本地教材 KB 同步；构建时 vite 插件生成
//   dist/audio-manifest.json（音频本体不进 SW precache，运行时走 HTTP 缓存）。
//   dev 下无 manifest，直接探测 public 同名路径（404 由 <audio> onError → toast 兜底）。
// user/url 两档接口预留：后续支持用户上传本地音频（IndexedDB 存 Blob）或引用外链。

export interface AudioSource {
  type: 'builtin' | 'user' | 'url';
  src: string;
}

const BOOK = 'yilin9a';
/** 远端音频源（COS+CDN）：构建时注入 VITE_AUDIO_CDN（如 https://lexi-audio.cos-xxx.cos.ap-xxx.myqcloud.com）；
 *  内置 public/audio 不进 git，云端构建环境无音频 → manifest 为空时回退远端。 */
const CDN_AUDIO_BASE = (import.meta.env.VITE_AUDIO_CDN as string | undefined)?.replace(/\/$/, '') ?? '';
let cachedManifest: Record<string, Record<string, string>> | null = null;

async function loadManifest(): Promise<Record<string, Record<string, string>>> {
  if (cachedManifest) return cachedManifest;
  try {
    const res = await fetch('/audio-manifest.json', { cache: 'no-store' });
    if (res.ok) cachedManifest = await res.json();
  } catch { /* 不可达 → 空 */ }
  cachedManifest = cachedManifest ?? {};
  return cachedManifest;
}

/** 解析某单元课文原声地址；不可用返回 null（原声入口隐藏）。
 *  manifest key 为 "1".."8"（vite 插件以 u(\d+) 捕获组写入），非 "u1"。 */
export async function readingAudioSrc(unit: number): Promise<string | null> {
  if (import.meta.env.DEV) {
    // dev：vite 直接伺服 public/，文件存在与否由 <audio> onError 兜底
    return `/audio/${BOOK}/u${unit}_reading.m4a`;
  }
  const manifest = await loadManifest();
  const bundled = manifest[BOOK]?.[String(unit)];
  if (bundled) return bundled;
  // 内置缺失 → 远端 CDN 回退（CORS 不影响 <audio> 播放；404 由 onError toast 兜底）
  if (CDN_AUDIO_BASE) return `${CDN_AUDIO_BASE}/${BOOK}/u${unit}_reading.m4a`;
  return null;
}

/** 预留：用户上传（IndexedDB Blob → objectURL）与外链（直接 URL）统一走此口 */
export function userAudioSource(objectUrl: string): AudioSource {
  return { type: 'user', src: objectUrl };
}
export function urlAudioSource(url: string): AudioSource {
  return { type: 'url', src: url };
}
