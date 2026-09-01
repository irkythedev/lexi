import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Kind, Locale } from '../../types/index.ts';
import { KIND_META } from '../../lib/utils.ts';

export function Panel({ children, className = '', ...rest }: { children: ReactNode; className?: string; [k: string]: unknown }) {
  return <div className={`panel ${className}`} {...rest}>{children}</div>;
}

export function Row({ children, onClick, className = '' }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onClick={onClick} className={`row ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Tag({ kind, locale = 'zh', children }: { kind: Kind; locale?: Locale; children?: ReactNode }) {
  const c = KIND_META[kind];
  return (
    <span style={{ background: c.soft, border: '1px solid var(--color-hairline)', color: c.text }}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[calc(11px*var(--type-scale))] font-semibold">
      {children ?? c.label[locale]}
    </span>
  );
}

export function PrimaryButton({ children, onClick, type = 'button', className = '', disabled }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; className?: string; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white shadow-[var(--shadow-cta)] transition hover:brightness-105 disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = '', active }: { children: ReactNode; onClick?: () => void; className?: string; active?: boolean }) {
  return (
    <button onClick={onClick}
      className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-[calc(15px*var(--type-scale))] font-medium transition ${
        active ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'border-[var(--color-hairline)] text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]'} ${className}`}>
      {children}
    </button>
  );
}

export function GlassButton({ children, onClick, className = '', title, ariaLabel }: { children: ReactNode; onClick?: () => void; className?: string; title?: string; ariaLabel?: string }) {
  return (
    <button title={title} aria-label={ariaLabel} onClick={onClick}
      className={`press glass-control glass-spec relative inline-flex items-center justify-center rounded-full text-[var(--color-text)] ${className}`}>
      {children}
    </button>
  );
}

export function Fab({ onClick, children, className = '', title }: { onClick: () => void; children: ReactNode; className?: string; title?: string }) {
  return (
    <button title={title} onClick={onClick}
      className={`press fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-overlay)] ${className}`}>
      {children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] pt-6 pb-3">
      {eyebrow && (
        <div className="flex items-center gap-2 text-[calc(12px*var(--type-scale))] font-semibold tracking-[0.14em] text-[var(--color-text-2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-live)] pulse-dot" /> {eyebrow}
        </div>
      )}
      <div className="mt-2 flex items-end justify-between gap-3">
        <h1 className="text-[calc(clamp(24px,5vw,34px)*var(--type-scale))] font-bold tracking-[-0.02em] text-[var(--color-text)]">{title}</h1>
        {right}
      </div>
      {subtitle && <p className="mt-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{subtitle}</p>}
    </div>
  );
}

export { motion };
