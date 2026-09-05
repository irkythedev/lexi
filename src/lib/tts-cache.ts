// tts-cache.ts — TTS 合成音频两级缓存（write-through）。
// 目的：重听单词/句子/AI 卡片段零合成成本，SCF 调用次数大幅下降。
//   L1：内存 Map（LRU，100 条 ≈ 4MB 封顶），会话内热数据。
//   L2：Cache API（'lexi-tts-v1'，FIFO 500 条，超限砍最旧一半），跨会话持久。
// 铁律：缓存任何一层失败都静默降级（iOS 无痕等场景 Cache API 可能不可用），
//       未命中/写失败一律回原合成路径——缓存永不成为故障面。
// 键口径：voice|rate|prepareSpeech 之后的文本——与实际合成内容严格一致；
//       edge-tts 同参数同文本输出确定性音频，无失效问题（将来换供应商时在键里加版本号）。
// 存储：本机合成音频 blob，纯本机无上传，与隐私叙事一致。

const L1_MAX = 100;
const L2_MAX = 500;
const L2_NAME = 'lexi-tts-v1';
// Cache API 键用合成 URL（该地址仅作键，从不请求）。
const L2_PREFIX = 'https://tts-cache.lexi.internal/v1/';

const l1 = new Map<string, Blob>();
const inflight = new Map<string, Promise<Blob>>();

/**
 * 缓存键：双车道 FNV-1a（正向 + 反向）+ 长度后缀，等效 64 位抗碰撞。
 * 同步计算、无 crypto 依赖；键空间 ≤600 条，碰撞概率可忽略。
 */
function hashKey(input: string): string {
  const n = input.length;
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < n; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 0x01000193);
    h2 = Math.imul(h2 ^ input.charCodeAt(n - 1 - i), 0x01000193);
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}${n.toString(36)}`;
}

/** 合成参数 → 缓存键（voice 含性别/口音，rate 含语速，text 为净化后送合成的文本）。 */
export function ttsCacheKey(voice: string, rate: number, text: string): string {
  return hashKey(`${voice}|${rate}|${text}`);
}

async function l2(): Promise<Cache | null> {
  try {
    if (typeof caches === 'undefined') return null; // Node 测试 / 极老浏览器
    return await caches.open(L2_NAME);
  } catch {
    return null; // iOS 无痕模式等：Cache API 抛异常 → 视作未启用
  }
}

function l1Put(key: string, blob: Blob): void {
  if (l1.has(key)) l1.delete(key); // 刷新 LRU 位次
  l1.set(key, blob);
  if (l1.size > L1_MAX) {
    const oldest = l1.keys().next().value;
    if (oldest !== undefined) l1.delete(oldest);
  }
}

/** 取缓存：L1 命中即回；否则查 L2，命中回填 L1。任何失败按未命中处理。 */
export async function getCachedTts(key: string): Promise<Blob | null> {
  const hit = l1.get(key);
  if (hit) {
    l1.delete(key);
    l1.set(key, hit);
    return hit;
  }
  try {
    const cache = await l2();
    if (!cache) return null;
    const res = await cache.match(`${L2_PREFIX}${key}`);
    if (!res) return null;
    const blob = await res.blob();
    l1Put(key, blob);
    return blob;
  } catch {
    return null;
  }
}

/** 写缓存：write-through（L1 必写，L2 尽力写），超限逐层修剪。 */
export async function putCachedTts(key: string, blob: Blob): Promise<void> {
  l1Put(key, blob);
  try {
    const cache = await l2();
    if (!cache) return;
    await cache.put(`${L2_PREFIX}${key}`, new Response(blob));
    // FIFO：Cache API keys() 按插入序，砍最旧一半保留新热数据
    const keys = await cache.keys();
    if (keys.length > L2_MAX) {
      const keep = Math.floor(L2_MAX / 2);
      for (const k of keys.slice(0, keys.length - keep)) {
        await cache.delete(k);
      }
    }
  } catch {
    /* 静默：缓存写失败不影响合成主流程 */
  }
}

/**
 * 缓存优先取用；未命中调用 fetcher 合成并 write-through。
 * 并发同键自动合并为一次合成（预取与立即播放同句竞态时零重复请求）。
 */
export async function getOrFetchTts(key: string, fetcher: () => Promise<Blob>): Promise<Blob> {
  const hit = await getCachedTts(key);
  if (hit) return hit;
  const running = inflight.get(key);
  if (running) return running;
  const p = (async () => {
    const blob = await fetcher();
    await putCachedTts(key, blob);
    return blob;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}
