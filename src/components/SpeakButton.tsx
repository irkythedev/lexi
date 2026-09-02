// SpeakButton — 朗读按钮（统一动画反馈）。
// 与 SessionView/FloatingTTS 对齐：合成中显示旋转 Loader，播放中显示
// 脉冲图标，结束恢复静态。通过订阅全局 TTS 状态驱动动画。
// 支持两种形态：默认圆形图标按钮；传入 children 时渲染为带文字按钮。
import { useEffect, useRef, useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { requestSpeak, subscribeTtsState } from '../components/FloatingTTS.tsx';

export default function SpeakButton({
  text, accent, rate, size = 16, color, className = '', children,
}: {
  text: string;
  accent: 'us' | 'uk';
  rate: number;
  size?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [phase, setPhase] = useState<'idle' | 'synth' | 'play'>('idle');
  const activeRef = useRef(false);
  const reqIdRef = useRef(0);

  // 全局 TTS 状态驱动：空闲时复位；活动期间区分合成中/播放中。
  useEffect(() => {
    return subscribeTtsState((s) => {
      if (s === 'idle') {
        activeRef.current = false;
        setPhase('idle');
      } else if (activeRef.current) {
        setPhase(s === 'synthesizing' ? 'synth' : 'play');
      }
    });
  }, []);

  const click = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRef.current) return; // 已在播放，忽略连点
    const id = ++reqIdRef.current;
    activeRef.current = true;
    setPhase('synth');
    requestSpeak(text, accent, rate, () => {
      // onEnd 在播放自然结束时触发（被其它播放抢占时不触发，由全局状态复位）
      if (reqIdRef.current === id) {
        activeRef.current = false;
        setPhase('idle');
      }
    });
  };

  // 图标随阶段变化：合成中旋转 Loader，播放中脉冲 Volume2，其余静态。
  const Icon = phase === 'synth'
    ? <Loader2 size={size} className="animate-spin" style={{ color }} />
    : <Volume2 size={size} className={phase === 'play' ? 'animate-pulse' : ''} style={{ color }} />;

  return (
    <button
      onClick={click}
      className={`press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)] ${className}`}
      aria-label="朗读"
    >
      {Icon}
      {children && <span className="ml-1.5">{children}</span>}
    </button>
  );
}
