// SpeakButton — 朗读按钮（统一动画反馈）。
// 与 SessionView/FloatingTTS 对齐：合成中显示旋转 Loader，播放中显示
// Pause（可点击停止），结束恢复静态。通过订阅全局 TTS 状态驱动动画。
// 支持两种形态：默认圆形图标按钮；传入 children 时渲染为带文字按钮。
import { useEffect, useRef, useState } from 'react';
import { Volume2, Loader2, Pause } from 'lucide-react';
import { requestSpeak, requestStopTts, subscribeTtsState, getActiveSpeakId } from '../components/FloatingTTS.tsx';

export default function SpeakButton({
  text, accent, rate, size = 16, color, className = '', children, compact = false,
}: {
  text: string;
  accent: 'us' | 'uk';
  rate: number;
  size?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<'idle' | 'synth' | 'play'>('idle');
  const activeRef = useRef(false);
  const reqIdRef = useRef(0);

  // 全局 TTS 状态驱动：空闲时复位；活动期间区分合成中/播放中。
  // 关键：只有"当前全局播放请求仍属于本按钮"（reqIdRef === 全局最新请求 id）
  // 才显示活动图标。被新请求抢占的按钮立即复位为静态喇叭，
  // 否则旧按钮会在新词合成的一瞬间误显 Loader、随后又误显 Pause。
  useEffect(() => {
    return subscribeTtsState((s) => {
      if (s === 'idle') {
        activeRef.current = false;
        setPhase('idle');
      } else if (activeRef.current) {
        if (reqIdRef.current !== getActiveSpeakId()) {
          // 已被其它请求抢占：本按钮让出活动态
          activeRef.current = false;
          setPhase('idle');
        } else {
          setPhase(s === 'synthesizing' ? 'synth' : 'play');
        }
      }
    });
  }, []);

  const click = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRef.current) { requestStopTts(); return; } // 播放中点击 = 停止
    const id = requestSpeak(text, accent, rate, () => {
      // onEnd 在播放自然结束时触发（被其它播放抢占时不触发，由全局状态复位）
      if (reqIdRef.current === id) {
        activeRef.current = false;
        setPhase('idle');
      }
    });
    reqIdRef.current = id;
    activeRef.current = true;
    setPhase('synth');
  };

  // 图标随阶段变化：合成中旋转 Loader，播放中 Pause（点击停止），其余静态。
  const Icon = phase === 'synth'
    ? <Loader2 size={size} strokeWidth={2.25} className="animate-spin" style={{ color }} />
    : phase === 'play'
      ? <Pause size={size} strokeWidth={2.25} style={{ color }} />
      : <Volume2 size={size} strokeWidth={2.25} style={{ color }} />;

  return (
    <button
      onClick={click}
      className={`press flex shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)] ${compact ? 'h-9 w-9' : 'h-11 w-11'} ${className}`}
      aria-label="朗读"
    >
      {Icon}
      {children && <span className="ml-1.5">{children}</span>}
    </button>
  );
}
