// ToastHost — fixed-position toast renderer with per-type icon + color.
import { CheckCircle2, Info, AlertTriangle, Sun, Moon, Check } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastType } from '../stores/toastStore.ts';

const TYPE_STYLE: Record<ToastType, { color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  success: { color: 'var(--color-vocab)', bg: 'var(--color-vocab-soft)', Icon: CheckCircle2 },
  info: { color: 'var(--color-accent)', bg: 'var(--color-surface)', Icon: Info },
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
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex flex-col items-center gap-2 px-4 md:top-28">
      {toasts.map((t) => {
        const s = TYPE_STYLE[t.type];
        return (
          <div key={t.id} role="status" className="pointer-events-auto flex items-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(13.5px*var(--type-scale))] font-medium shadow-[var(--shadow-card)]"
            style={{ background: s.bg, color: s.color }}>
            <ToastIcon item={t} />
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
