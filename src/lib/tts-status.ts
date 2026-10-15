/**
 * TTS 通道状态源（移植自 stem 77adcff 的 tts-status.ts）。
 *
 * 只记「本次会话内实测过一次」的结果，刻意**不落盘、不跨会话沿用**：
 * 未经核验就点亮绿灯等于虚报状态，所以初始态是 unknown（界面显示「未检测」），
 * 由一次真实合成（朗读 / 试听 / 打开设置页时的轻量探测）把它变成 ready / fallback。
 *
 * 状态说明一律不含 HTTP 状态码与异常原文，与全站错误文案纪律一致。
 *   ready    = 本次会话内 edge-tts（SCF）通道成功出过声
 *   fallback = 本次会话内出现过 edge 失败、回退系统语音（用户听到的声音质量降级是事实，要可见）
 */
import { useSyncExternalStore } from 'react';

export type TtsChannelStatus = 'unknown' | 'ready' | 'fallback';

let status: TtsChannelStatus = 'unknown';
const listeners = new Set<() => void>();

export function getTtsChannelStatus(): TtsChannelStatus {
  return status;
}

/** 上报状态：同值空转，避免无谓渲染 */
export function setTtsChannelStatus(next: TtsChannelStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

export function subscribeTtsChannelStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 组件内读取：字符串快照，稳定无重渲染环 */
export function useTtsChannelStatus(): TtsChannelStatus {
  return useSyncExternalStore(subscribeTtsChannelStatus, getTtsChannelStatus, getTtsChannelStatus);
}
