import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play, Repeat, Globe, Gauge, Loader2, ChevronLeft, Volume2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { useSpeak } from '../lib/useSpeak.ts';
import { t } from '../lib/i18n.ts';
import type { SpeakOptions } from '../lib/useSpeak.ts';

/** 广播停止播放信号（供 SessionView 等组件在自动播放前调用，避免跨实例重叠） */
export function requestStopTts(): void {
  current = null;
  listeners.forEach((fn) => fn({ text: '', accent: 'us', rate: 1, _stop: true }));
}

interface SpeakTarget { text: string; accent: 'us' | 'uk'; rate: number; onEnd?: () => void; _stop?: boolean; }

const listeners = new Set<(t: SpeakTarget) => void>();
const stateListeners = new Set<(s: TtsBroadcastState) => void>();
let current: SpeakTarget | null = null;
// 全局请求序号：每次 requestSpeak 递增。SpeakButton 据此判断"当前播放
// 是否还属于自己"，被新请求抢占的按钮立即复位，不再跟随全局状态闪烁。
let speakReqSeq = 0;

export function requestSpeak(text: string, accent?: 'us' | 'uk', rate?: number, onEnd?: () => void): number {
  if (!text) return speakReqSeq;
  // 默认取当前设置，避免任何调用点漏传时偏离用户配置。
  const tts = useAppStore.getState().tts;
  speakReqSeq += 1;
  current = { text, accent: accent ?? tts.accent, rate: rate ?? tts.rate, onEnd };
  const c = current;
  if (c) listeners.forEach((fn) => fn(c));
  return speakReqSeq;
}

/** 当前全局播放请求 id（仍拥有播放权的按钮 = 它最近一次 requestSpeak 的返回值）。 */
export function getActiveSpeakId(): number {
  return speakReqSeq;
}

/** 订阅全局 TTS 播放状态（供设置页试听按钮等外部 UI 显示加载/播放态）。
 *  synthesizing-slow = 合成等待超 4 秒（SCF 冷启动），UI 可变暖色提示。
 *  返回取消订阅函数。 */
export type TtsBroadcastState = 'idle' | 'synthesizing' | 'synthesizing-slow' | 'playing';
export function subscribeTtsState(fn: (s: TtsBroadcastState) => void): () => void {
  stateListeners.add(fn);
  return () => { stateListeners.delete(fn); };
}

function emitTtsState(s: TtsBroadcastState) {
  stateListeners.forEach((fn) => fn(s));
}

export default function FloatingTTS() {
  const { tts, setTts, locale } = useAppStore();
  const toast = useToastStore((s) => s.show);
  const [active, setActive] = useState<SpeakTarget | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [open, setOpen] = useState(false); // 默认收起
  const { speak, stop, resume, state, waitingLong } = useSpeak();
  const playRef = useRef<(target: SpeakTarget, accent: 'us' | 'uk', rate: number, onEnd?: () => void) => void>(() => {});
  const loopTimerRef = useRef<number | null>(null);
  const autoHideRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const clearAutoHide = useCallback(() => {
    if (autoHideRef.current !== null) { clearTimeout(autoHideRef.current); autoHideRef.current = null; }
  }, []);

  // 展开后闲置 6 秒自动收起：仅正在播放/合成(有声音)不收起，暂停/空闲即收
  const resetAutoHide = useCallback(() => {
    clearAutoHide();
    autoHideRef.current = window.setTimeout(() => {
      const s = stateRef.current;
      if (s === 'synthesizing' || s === 'playing') resetAutoHide(); // 仍在出声 → 等更久
      else setOpen(false); // idle/paused/error → 收起
    }, 6000);
  }, [clearAutoHide]);

  useEffect(() => {
    if (open) resetAutoHide();
    else clearAutoHide();
    return () => clearAutoHide();
  }, [open, resetAutoHide, clearAutoHide]);

  const clearLoopTimer = useCallback(() => {
    if (loopTimerRef.current !== null) { clearTimeout(loopTimerRef.current); loopTimerRef.current = null; }
  }, []);

  const play = useCallback((target: SpeakTarget | null, accent: 'us' | 'uk' = tts.accent, rate: number = tts.rate, onEnd?: () => void) => {
    if (!target?.text) return;
    clearLoopTimer();
    stop();
    const opts: SpeakOptions = {
      accent,
      rate,
      onEnd: () => {
        if (loopRef.current) {
          loopTimerRef.current = window.setTimeout(() => playRef.current(target, accent, rate, onEnd), 600);
        } else {
          setPlaying(false); onEnd?.();
        }
      },
    };
    playRef.current = play;
    void speak(target.text, opts);
    setPlaying(true);
  }, [speak, stop, clearLoopTimer, tts.accent, tts.rate]);
  const loopRef = useRef(loop);
  loopRef.current = loop;

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  // 广播播放状态给订阅者（设置页试听等外部 UI）；合成超 4 秒广播 slow 态
  useEffect(() => {
    emitTtsState(state === 'playing' || state === 'paused' ? 'playing' : state === 'synthesizing' ? (waitingLong ? 'synthesizing-slow' : 'synthesizing') : 'idle');
  }, [state, waitingLong]);

  useEffect(() => {
    // 用 playRef.current 而非闭包 play：play 会随 tts.accent/rate 重建，
    // 闭包捕获首次渲染的 play 会导致口音/语速切换不生效（陈旧默认值）。
    const fn = (t: SpeakTarget) => {
      // 停止信号：仅停止当前播放，不切换 active 文本
      if (t._stop) { stop(); setPlaying(false); return; }
      setActive(t); playRef.current(t, t.accent, t.rate, t.onEnd);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (state === 'playing' || playing) { clearLoopTimer(); stop(); setPlaying(false); }
    else if (state === 'paused') { resume(); setPlaying(true); }
    else play(active);
  };
  if (!active) return null;

  return (
    <>
      {/* 收起态：贴左缘窄条手柄，露出约18px，圆角朝左，点开向左展开面板；icon 与展开态同尺寸同粗细 */}
      <button
        onClick={() => { setOpen(true); resetAutoHide(); }}
        aria-label={t('ttsExpand', locale)}
        className={`press fixed left-[-8px] z-40 flex h-12 w-7 items-center rounded-r-full border-2 border-l-0 border-[var(--color-hairline)] bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-card)] transition-opacity duration-300 ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        style={{ top: 'calc(50% - 24px)', paddingLeft: '10px' }}
      >
        <Volume2 size={16} strokeWidth={2.25} />
      </button>
      {/* 展开态：面板从左侧滑出，闲置6秒自动收起（播放中不收起） */}
      <div
        onMouseDown={() => resetAutoHide()}
        className={`fixed left-4 z-40 flex items-center gap-0.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-1 py-0.5 shadow-[var(--shadow-card)] transition-[transform,opacity] duration-300 ease-in-out ${open ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-[120%] opacity-0'}`}
        style={{ top: 'calc(50% - 22px)' }}
      >
        <span className="hidden max-w-[110px] truncate px-1.5 text-[calc(11px*var(--type-scale))] font-medium text-[var(--color-text-2)] sm:inline">{active.text}</span>
        <button onClick={toggle} disabled={state === 'synthesizing'} className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-accent)] disabled:opacity-60" aria-label={state === 'synthesizing' ? t('synthesizing', locale) : t('playPause', locale)}>
          {state === 'synthesizing' ? <Loader2 size={14} strokeWidth={2.25} className={`animate-spin ${waitingLong ? 'text-[#d97706]' : ''}`} /> : playing ? <Pause size={14} strokeWidth={2.25} /> : <Play size={14} strokeWidth={2.25} />}
        </button>
        <button onClick={() => { clearLoopTimer(); const v = !loop; setLoop(v); toast(v ? t('toastLoopOn', locale) : t('toastLoopOff', locale), 'info'); }} className="press flex h-8 w-8 items-center justify-center rounded-full" style={{ color: loop ? 'var(--color-accent)' : 'var(--color-text-3)' }} aria-label={t('loop', locale)}>
          <Repeat size={13} strokeWidth={2.25} />
        </button>
        <button onClick={() => { const a = tts.accent === 'us' ? 'uk' : 'us'; setTts({ accent: a }); toast(a === 'us' ? t('toastAccentUs', locale) : t('toastAccentUk', locale), 'info'); if (state === 'playing' || playing) play(active, a, tts.rate); }} className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]" aria-label={t('switchAccent', locale)} title={tts.accent === 'us' ? t('accentUs', locale) : t('accentUk', locale)}>
          <Globe size={13} strokeWidth={2.25} />
        </button>
        <button onClick={() => { const next = tts.rate === 1.0 ? 1.2 : tts.rate === 1.2 ? 0.8 : 1.0; setTts({ rate: next }); toast(t('toastRate', locale, { rate: next }), 'info'); if (playing) play(active, tts.accent, next); }} className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]" aria-label={t('speed', locale)} title={t('speedTitle', locale, { speed: tts.rate })}>
          <Gauge size={13} strokeWidth={2.25} />
        </button>
        <button onClick={() => { clearAutoHide(); setOpen(false); }} className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)]" aria-label={t('ttsCollapse', locale)}>
          <ChevronLeft size={14} strokeWidth={2.25} />
        </button>
      </div>
    </>
  );
}
