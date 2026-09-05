// useSpeak — edge-tts (SCF proxy) primary + Web Speech API fallback
// Word-level progress callback for per-word highlight during playback.
// Ported lessons from stem_digt_labs: iOS audio unlock, base64/raw MP3 sniff,
// pause via stop+offset rebuild, onended race guard.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/useAppStore.ts';
import { TTS_BASE, getEdgeVoice, getChineseVoice } from './tts-config.ts';
import { scfUrlWithToken } from './scf-token.ts';
import { getOrFetchTts, ttsCacheKey } from './tts-cache.ts';
import { speak as webSpeak, type Accent, type SpeakHandle } from './tts.ts';

export const edgeTtsEnabled = Boolean(TTS_BASE);

export type SpeakState = 'idle' | 'synthesizing' | 'playing' | 'paused' | 'error';

export interface SpeakOptions {
  accent?: 'us' | 'uk';
  gender?: 'female' | 'male';
  rate?: number;
  /** 语言模式：'auto' 时按 CJK 检测自动分段，中文段用中文 voice，英文段用 en voice。 */
  lang?: 'zh' | 'en' | 'auto';
  /** Called as playback progresses; wordIndex is 0-based. */
  onWordChange?: (wordIndex: number, totalWords: number) => void;
  onEnd?: () => void;
}

// Split into words (keep punctuation attached to preceding word for natural pacing).
function splitWords(text: string): string[] {
  const m = text.trim().match(/\S+/g);
  return m ?? [];
}

function toMp3Blob(arrayBuffer: ArrayBuffer): Blob {
  const view = new Uint8Array(arrayBuffer);
  const isMp3 = view.length >= 2 && (view[0] & 0xff) === 0xff && (view[1] & 0xe0) === 0xe0;
  if (isMp3) return new Blob([arrayBuffer], { type: 'audio/mpeg' });
  // SCF function URL returns base64 text with audio/mpeg content type
  const text = new TextDecoder().decode(view).replace(/\s/g, '');
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'audio/mpeg' });
}

function splitForTTS(text: string, max = 800): string[] {
  if (!text) return [];
  const out: string[] = [];
  let buf = '';
  // 按句末标点优先切，无标点时按空格切（保证词边界），绝不从单词中间硬切。
  for (const ch of text) {
    buf += ch;
    // 句末标点 -> 切句
    if ('.!?;，。！？；'.includes(ch) && buf.length >= 4) {
      out.push(buf); buf = '';
      continue;
    }
    // 超过 max 时回退到最近空格切，不切单词
    if (buf.length >= max) {
      const lastSpace = buf.lastIndexOf(' ', max);
      if (lastSpace > 0) {
        out.push(buf.slice(0, lastSpace));
        buf = buf.slice(lastSpace + 1);
      } else {
        // 无空格（超长无空格字符串，如 URL），冒风险切
        out.push(buf); buf = '';
      }
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** 是否 CJK 字符（中文/日文/韩文统一判为中文字段）。 */
function isCJK(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf)
    || (c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef);
}

export interface LangSeg { lang: 'zh' | 'en'; text: string; }

/** 清洗 markdown/结构符号：去加粗/斜体/行内代码/标题/列表符/引用/链接标记/JSON 括号，只留正文。 */
export function cleanTextForTTS(text: string): string {
  let t = text
    .replace(/```[\s\S]*?```/g, ' ')          // 代码块整体跳过
    .replace(/`([^`\n]*)`/g, '$1')            // 行内代码保留内容
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // markdown 链接 → 文字
    .replace(/[#>*_~|]/g, ' ')                // 标题/粗斜体/引用/删除线/表格符
    .replace(/\{\s*"[^}]*\}/g, ' ')           // JSON 对象
    .replace(/[{}\[\]]/g, ' ')                // 残余括号
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

/** 合成前流水线：净化 → IPA 删除 → 缩写扩展（三条路径共用，顺序：弯引号先删避免音标边界误判） */
function prepareSpeech(text: string): string {
  return expandSpeechAbbreviations(stripIpa(sanitizeForSpeech(text)));
}

/**
 * SCF 冷启动容错（stem 同思路）：失败/非 200 时 600ms 退避自动重试一次。
 */
async function fetchWithRetry(url: string): Promise<Response> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (e) {
    await new Promise((r) => setTimeout(r, 600));
    return fetch(url, { cache: 'no-store' });
  }
}

/**
 * SCF 单段合成 → MP3 Blob（含冷启动重试）。
 * 缓存优先（tts-cache 两级：内存 LRU + Cache API 持久），未命中才真正请求 SCF；
 * 预取与立即播放同键并发时由 getOrFetchTts 合并为一次合成。
 */
async function synthSegment(text: string, voice: string, rate: number): Promise<Blob> {
  return getOrFetchTts(ttsCacheKey(voice, rate, text), async () => {
    const url = scfUrlWithToken(`${TTS_BASE}/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(String(rate))}`);
    const res = await fetchWithRetry(url);
    const buf = await res.arrayBuffer();
    return toMp3Blob(buf);
  });
}

/**
 * 课文朗读预取：按句合成进缓存但不播放（Phase 2，ReadingView 调度）。
 * 与播放共用 synthSegment（缓存优先 + in-flight 去重）——预取和立即播放同句
 * 竞态时自动合并为一次 SCF 请求。每次取一个 token，防止外部无限并发。
 */
export async function warmTtsCache(
  texts: string[],
  opts: { accent?: 'us' | 'uk'; rate?: number } = {},
): Promise<void> {
  if (!TTS_BASE) return;
  const { accent = 'us', rate = 1.0 } = opts;
  const gender = useAppStore.getState().tts.gender;
  const voice = getEdgeVoice(accent, gender);
  for (const text of texts) {
    const t = tokenPool.pop();
    if (!t) return; // 令牌耗尽：让位给后续交互
    try {
      await synthSegment(prepareSpeech(text), voice, rate);
    } catch {
      return; // 预取失败静默放弃（播放路径有自己的重试+Web Speech 兜底）
    } finally {
      tokenPool.push(t);
    }
  }
}

export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/[\u201c\u201d\u201e\u201f\u00ab\u00bb]/g, '')   // “ ” „ ‟ « » → 删
    .replace(/[\u2018\u2019\u201b]/g, '\u0027')                // ‘ ’ ‚ → 直撇号（don't）
    .replace(/[\u2013\u2014]/g, ', ')                          // – — → 逗号停顿
    .replace(/\u2026/g, '...')                                 // … → ...
    .replace(/\u00b7/g, ' ')                                   // · → 空
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * IPA 音标段删除（stem「视觉信息不进 TTS」同思路）：
 * AI 解释单词时常带 /ɡʊd/ 式音标，合成器会念乱码；
 * 且闭斜杠会被斜杠规则误读成 "or"。检测 /.../ 内含 IPA 特征字符即整段删除。
 * 特征字符（ˈˌːəɪʊɔæʌʃʒθðŋɡɑɒɛɜ playground 无关字符）在正常英文文本中不出现，零误伤。
 */
export function stripIpa(text: string): string {
  const IPA_CHARS = '\u02c8\u02cc\u02d0\u0259\u026a\u028a\u0254\u00e6\u028c\u0283\u0292\u03b8\u00f0\u014b\u0261\u0251\u0252\u025b\u025c\u0250';
  return text
    .replace(new RegExp(`/[^/\\s]*[${IPA_CHARS}][^/\\s]*/`, 'g'), ' ')
    .replace(new RegExp(`[${IPA_CHARS}]`, 'g'), ' ')   // 残余散落音标字符兜底
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 教材缩写/符号朗读扩展（显示层不处理，仅送合成前调用）：
 * sb/sth 这类词典缩写按字母读出来不可懂，展开为完整词；
 * 斜杠/等号/箭头等符号按其语义读。
 */
export function expandSpeechAbbreviations(text: string): string {
  return text
    .replace(/\bsb's\b/g, "somebody's")
    .replace(/\bsth's\b/g, "something's")
    .replace(/\bsb\b/g, 'somebody')
    .replace(/\bsth\b/g, 'something')
    .replace(/\bs\.b\.\b/gi, 'somebody')
    .replace(/\bs\.t\.h\.\b/gi, 'something')
    .replace(/\be\.g\./gi, 'for example,')
    .replace(/\bi\.e\./gi, 'that is,')
    .replace(/\betc\b/gi, 'etcetera')
    .replace(/\bvs\.?\b/gi, 'versus')
    .replace(/\bMr\b/g, 'Mister')
    .replace(/\bMrs\b/g, 'Misses')
    .replace(/\bMs\b/g, 'Miss')
    .replace(/\bDr\b/g, 'Doctor')
    .replace(/&/g, ' and ')
    .replace(/→|=>/g, ', ')
    .replace(/=/g, ' equals ')
    .replace(/(?<=\S)\/(?=\S)/g, ' or ')   // if/whether、sb/sth 展开后的 somebody/something → "or"
    .replace(/(?<=[a-zA-Z,])\/(?=\s|$)/g, ' or ')  // 句尾斜杠
    .replace(/\(([^)]*)\)/g, ' $1 ')           // 英文括号删符号留内容（(to sb) → to somebody）
    .replace(/（([^）]*)）/g, ' $1 ')            // 中文括号同规则：删符号留注释
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 按语言切分文本为交替的中文/英文段（CJK 检测）。
 * 相邻极短段（≤2 字符）并入前一段，避免单个标点/字母造成频繁换 voice。
 */
export function splitMixedLang(text: string, max = 800): LangSeg[] {
  const segs: LangSeg[] = [];
  let cur = '';
  let curLang: 'zh' | 'en' | null = null;

  const flush = () => {
    if (!cur) return;
    segs.push({ lang: curLang === 'zh' ? 'zh' : 'en', text: cur });
    cur = '';
  };

  for (const ch of text) {
    const lang: 'zh' | 'en' = isCJK(ch) ? 'zh' : 'en';
    if (curLang === null) { curLang = lang; }
    if (lang !== curLang) {
      // 极短段（≤2 字符，常见为标点/单个字母）并入前段，不换 voice
      if (cur.length <= 2) { cur += ch; continue; }
      flush();
      curLang = lang;
    }
    cur += ch;
    if (cur.length >= max) { flush(); curLang = null; }
  }
  flush();
  return segs;
}

// 预取并发闸：全局并发令牌池（2 个）。预取循环每合成一句前取一枚令牌，
// 用完即还——保证用户交互触发的合成永远有令牌可用，预取最多占 2 路。
const tokenPool: symbol[] = [Symbol('t1'), Symbol('t2')];

// Resolve a blob's duration (ms). Falls back to 0 on failure so callers can
// fall through to the per-chunk `audio.duration` estimate.
function blobDurationMs(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = new Audio();
    el.preload = 'metadata';
    const done = (ms: number) => { URL.revokeObjectURL(url); resolve(ms); };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration * 1000 : 0);
    el.onerror = () => done(0);
    el.src = url;
  });
}

// 全局音频仲裁：全项目所有 useSpeak 实例共享一个"当前实例"引用。
// 任何实例 speak/stop 时先停掉上一个实例的播放，防止跨组件音频叠加
// （如 SessionView 听词与 Learn 词条 SpeakButton 走的是不同实例）。
type StopFn = () => void;
let activeStop: StopFn | null = null;

export function useSpeak() {
  const [state, setState] = useState<SpeakState>('idle');
  const [error, setError] = useState('');
  /** 合成等待计时（stem 同思路）：>4 秒 UI 变暖色提示"仍在唤醒服务" */
  const [waitingLong, setWaitingLong] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const idxRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  const synthStartRef = useRef(0);
  const totalMsRef = useRef(0); // measured total playback ms across all chunks
  const wasStoppedRef = useRef(false);
  const optsRef = useRef<SpeakOptions>({});
  const webHandleRef = useRef<SpeakHandle | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // 请求序号：每次 speak 递增，stop 也递增使其失效。
  // 防止 React StrictMode 开发模式双调用 effect 时，第一次 speak 的
  // 异步 fetch 完成后仍创建 audio（导致两次读音重叠）。
  const speakSeqRef = useRef(0);

  // 本实例的全局停止句柄：speak 时注册到 activeStop，供其它实例仲裁。
  const stopFnRef = useRef<StopFn>(() => {});

  const stopSource = useCallback(() => {
    speakSeqRef.current += 1; // 使进行中的 speak 请求失效
    if (activeStop === stopFnRef.current) activeStop = null; // 清掉指向自己的全局引用
    clearTimer();
    if (audioRef.current) {
      try { audioRef.current.onended = null; audioRef.current.pause(); audioRef.current.src = ''; } catch { /* noop */ }
      audioRef.current = null;
    }
    if (webHandleRef.current) {
      try { webHandleRef.current.cancel(); } catch { /* noop */ }
      webHandleRef.current = null;
    }
  }, [clearTimer]);

  /** Start per-word progress timer proportional to estimated word durations. */
  const startWordTimer = useCallback((words: string[], totalMs: number) => {
    clearTimer();
    if (words.length <= 1) return;
    const totalChars = words.join(' ').length || 1;
    const bounds: number[] = [0];
    for (const w of words) bounds.push(bounds[bounds.length - 1] + (w.length / totalChars) * totalMs);
    const startAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startAt;
      let idx = 0;
      while (idx < bounds.length - 1 && elapsed >= bounds[idx + 1]) idx++;
      optsRef.current.onWordChange?.(Math.min(idx, words.length - 1), words.length);
    }, 60);
  }, [clearTimer]);

  const playEdgeChunk = useCallback((idx: number) => {
    const chunks = chunksRef.current;
    if (idx >= chunks.length) {
      clearTimer();
      setWaitingLong(false);
      optsRef.current.onWordChange?.(wordsRef.current.length - 1, wordsRef.current.length);
      optsRef.current.onEnd?.();
      setState('idle');
      return;
    }
    // 首段开始出声：结束等待计时
    if (idx === 0) { clearTimer(); setWaitingLong(false); }
    const audio = new Audio();
    const blobUrl = URL.createObjectURL(chunks[idx]);
    audio.src = blobUrl;
    audio.onended = () => {
      URL.revokeObjectURL(blobUrl);
      if (!wasStoppedRef.current) playEdgeChunk(idx + 1);
    };
    audio.onerror = () => { setError('播放失败'); setState('error'); };
    audio.play().then(() => {
      setState('playing');
      // Word-timing should span the WHOLE utterance: use measured cumulative
      // duration (all chunks) when available, else fall back to this chunk.
      const totalMs = totalMsRef.current > 0 ? totalMsRef.current : (audio.duration ? audio.duration * 1000 : 0);
      if (idx === 0 && totalMs > 0) {
        startWordTimer(wordsRef.current, totalMs);
      }
    }).catch((e) => { setError('播放失败：' + (e?.message || e)); setState('error'); });
    idxRef.current = idx;
    audioRef.current = audio;
  }, [clearTimer, startWordTimer]);

  const speak = useCallback(async (text: string, options: SpeakOptions = {}) => {
    if (!text) return;
    // 全局仲裁：停掉其它 useSpeak 实例正在进行的播放，防止跨组件音频叠加。
    if (activeStop && activeStop !== stopFnRef.current) activeStop();
    // 自停：停止当前实例的任何遗留播放，避免重叠
    stopSource();
    // 注册本实例为全局当前播放者（登记公开 stop：仲裁停它时同步复位其 UI 状态）
    stopFnRef.current = stop;
    activeStop = stopFnRef.current;
    const seq = speakSeqRef.current; // 本次请求序号（stopSource 已自增）
    optsRef.current = options;
    const { accent = 'us', rate = 1.0, lang = 'en', onEnd } = options;
    wasStoppedRef.current = false;
    setError('');
    setState('synthesizing');
    // 合成等待计时：>4 秒置 waitingLong（UI 变暖色），播放/结束/失败即复位
    synthStartRef.current = Date.now();
    setWaitingLong(false);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      if (Date.now() - synthStartRef.current > 4000) setWaitingLong(true);
    }, 500);

    // Prefer edge-tts via SCF; fall back to Web Speech on any failure.
    if (TTS_BASE) {
      try {
        const gender = useAppStore.getState().tts.gender;
        const blobs: Blob[] = [];

        if (lang === 'auto') {
          // 中英混杂模式：统一流水线（净化+IPA+缩写）后按语言分段，每段用对应 voice 合成，串行播
          const cleaned = prepareSpeech(cleanTextForTTS(text));
          const segs = splitMixedLang(cleaned);
          wordsRef.current = splitWords(cleaned);
          for (const seg of segs) {
            const voice = seg.lang === 'zh' ? getChineseVoice(gender) : getEdgeVoice(accent, gender);
            const parts = splitForTTS(seg.text);
            for (const part of parts) {
              blobs.push(await synthSegment(part, voice, rate));
            }
          }
        } else {
          // 单语言模式：统一流水线（净化+IPA+缩写），词高亮对齐处理后文本
          const prepared = prepareSpeech(text);
          const parts = splitForTTS(prepared);
          const voice = getEdgeVoice(accent, gender);
          wordsRef.current = splitWords(prepared);
          for (const part of parts) {
            blobs.push(await synthSegment(part, voice, rate));
          }
        }

        // 请求已失效（被新的 speak/stop 取代）：丢弃结果，不创建 audio
        if (seq !== speakSeqRef.current) {
          setState('idle');
          return;
        }
        chunksRef.current = blobs;
        // Measure cumulative playback time across ALL chunks so per-word
        // highlight pacing matches the real audio, not just the first chunk.
        const measured = await Promise.all(blobs.map(blobDurationMs));
        totalMsRef.current = measured.reduce((a, b) => a + b, 0);
        // 测量期间可能又失效
        if (seq !== speakSeqRef.current) {
          setState('idle');
          return;
        }
        playEdgeChunk(0);
        return;
      } catch (e) {
        // fall through to Web Speech
        console.warn('edge-tts failed, falling back to Web Speech:', e);
      }
    }

    // Web Speech fallback：与 edge 路径同一套净化+IPA+缩写，避免退化为原文直读
    const fallbackGender = useAppStore.getState().tts.gender;
    const fallbackText = prepareSpeech(lang === 'auto' ? cleanTextForTTS(text) : text);
    wordsRef.current = splitWords(fallbackText);
    const handle = webSpeak(fallbackText, {
      accent: accent as Accent,
      gender: fallbackGender,
      rate,
      onEnd: () => { clearTimer(); setWaitingLong(false); optsRef.current.onWordChange?.(wordsRef.current.length - 1, wordsRef.current.length); onEnd?.(); setState('idle'); },
      onError: (err) => { clearTimer(); setWaitingLong(false); setError(String(err)); setState('error'); },
    });
    webHandleRef.current = handle;
    setState('playing');
    clearTimer(); setWaitingLong(false);
    // No reliable word timing on Web Speech — fire word 0 to mark start.
    optsRef.current.onWordChange?.(0, wordsRef.current.length);
  }, [playEdgeChunk]);

  const stop = useCallback(() => {
    wasStoppedRef.current = true;
    stopSource();
    clearTimer();
    setWaitingLong(false);
    setState('idle');
  }, [stopSource, clearTimer]);

  const pause = useCallback(() => {
    if (state !== 'playing') return;
    wasStoppedRef.current = true;
    clearTimer();
    if (audioRef.current) { try { audioRef.current.pause(); } catch { /* noop */ } }
    if (webHandleRef.current) { try { webHandleRef.current.cancel(); } catch { /* noop */ } }
    setState('paused');
  }, [state, clearTimer]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    wasStoppedRef.current = false;
    if (audioRef.current && audioRef.current.src) {
      setState('playing');
      audioRef.current.play().catch(() => setState('error'));
    } else {
      playEdgeChunk(idxRef.current);
    }
  }, [state, playEdgeChunk]);

  useEffect(() => () => { stopSource(); }, [stopSource]);

  return { state, error, waitingLong, speak, stop, pause, resume, enabled: edgeTtsEnabled };
}
