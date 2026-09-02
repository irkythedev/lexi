// useSpeak — edge-tts (SCF proxy) primary + Web Speech API fallback
// Word-level progress callback for per-word highlight during playback.
// Ported lessons from stem_digt_labs: iOS audio unlock, base64/raw MP3 sniff,
// pause via stop+offset rebuild, onended race guard.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/useAppStore.ts';
import { TTS_BASE, getEdgeVoice, getChineseVoice } from './tts-config.ts';
import { scfUrlWithToken } from './scf-token.ts';
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

export function useSpeak() {
  const [state, setState] = useState<SpeakState>('idle');
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const idxRef = useRef(0);
  const wordsRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
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

  const stopSource = useCallback(() => {
    speakSeqRef.current += 1; // 使进行中的 speak 请求失效
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
      optsRef.current.onWordChange?.(wordsRef.current.length - 1, wordsRef.current.length);
      optsRef.current.onEnd?.();
      setState('idle');
      return;
    }
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
    // 自停：停止当前实例的任何遗留播放，避免重叠
    stopSource();
    const seq = speakSeqRef.current; // 本次请求序号（stopSource 已自增）
    optsRef.current = options;
    const { accent = 'us', rate = 1.0, lang = 'en', onEnd } = options;
    wasStoppedRef.current = false;
    setError('');
    setState('synthesizing');

    // Prefer edge-tts via SCF; fall back to Web Speech on any failure.
    if (TTS_BASE) {
      try {
        const gender = useAppStore.getState().tts.gender;
        const blobs: Blob[] = [];

        if (lang === 'auto') {
          // 中英混杂模式：清洗后按语言分段，每段用对应 voice 合成，串行播
          const cleaned = cleanTextForTTS(text);
          const segs = splitMixedLang(cleaned);
          wordsRef.current = splitWords(cleaned);
          for (const seg of segs) {
            const voice = seg.lang === 'zh' ? getChineseVoice(gender) : getEdgeVoice(accent, gender);
            const parts = splitForTTS(seg.text);
            for (const part of parts) {
              const url = scfUrlWithToken(`${TTS_BASE}/tts?text=${encodeURIComponent(part)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(String(rate))}`);
              const res = await fetch(url, { cache: 'no-store' });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              blobs.push(toMp3Blob(await res.arrayBuffer()));
            }
          }
        } else {
          // 单语言模式（现有行为）
          const parts = splitForTTS(text);
          const voice = getEdgeVoice(accent, gender);
          wordsRef.current = splitWords(text);
          for (const part of parts) {
            const url = scfUrlWithToken(`${TTS_BASE}/tts?text=${encodeURIComponent(part)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(String(rate))}`);
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            blobs.push(toMp3Blob(await res.arrayBuffer()));
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

    // Web Speech fallback
    const fallbackGender = useAppStore.getState().tts.gender;
    const fallbackText = lang === 'auto' ? cleanTextForTTS(text) : text;
    wordsRef.current = splitWords(fallbackText);
    const handle = webSpeak(fallbackText, {
      accent: accent as Accent,
      gender: fallbackGender,
      rate,
      onEnd: () => { optsRef.current.onWordChange?.(wordsRef.current.length - 1, wordsRef.current.length); onEnd?.(); setState('idle'); },
      onError: (err) => { setError(String(err)); setState('error'); },
    });
    webHandleRef.current = handle;
    setState('playing');
    // No reliable word timing on Web Speech — fire word 0 to mark start.
    optsRef.current.onWordChange?.(0, wordsRef.current.length);
  }, [playEdgeChunk]);

  const stop = useCallback(() => {
    wasStoppedRef.current = true;
    stopSource();
    setState('idle');
  }, [stopSource]);

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

  return { state, error, speak, stop, pause, resume, enabled: edgeTtsEnabled };
}
