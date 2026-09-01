// ToastHost — fixed-position toast renderer with per-type icon + color.
import { CheckCircle2, Info, AlertTriangle, Sun, Moon, Check } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastType } from '../stores/toastStore.ts';

const TYPE_STYLE: Record<ToastType, { color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  success: { color: 'var(--color-vocab)', bg: 'var(--color-vocab-soft)', Icon: CheckCircle2 },
  info: { color: 'var(--color-accent)', bg: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', Icon: Info },
  error: { color: 'var(--color-trap)', bg: 'var(--color-trap-soft)', Icon: AlertTriangle },
};

function ToastIcon({ item }: { item: ToastItem }) {
  const { Icon } = TYPE_STYLE[item.type];
  if (item.icon === 'sun') return <Sun size={16} />;
  if (item.icon === 'moon') return <Moon size={16} />;
  if (item.icon === 'check') return <Check size={16} />;
  if (item.icon === 'alert') return <AlertTriangle size={16} />;
  return <Icon size={16} />;
}

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[5.4rem] z-[70] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => {
        const s = TYPE_STYLE[t.type];
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-medium shadow-[var(--shadow-lift)]"
            style={{ background: s.bg, color: s.color, border: '0.5px solid var(--color-hairline)', backdropFilter: 'blur(12px)' }}>
            <ToastIcon item={t} />
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
