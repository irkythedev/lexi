// Reusable UI primitives in the Apple "liquid glass" idiom:
//  - white surfaces, hairline dividers, two-layer shadows
//  - glass only for nav / overlays
//  - semantic accent colors used as small tags, never as fills for whole surfaces
import { motion } from 'framer-motion';

export function Panel({ children, className = '', ...rest }) {
  return (
    <div className={`panel ${className}`} {...rest}>
      {children}
    </div>
  );
}

// A single row inside a Panel (adjacent rows get a hairline divider via CSS).
export function Row({ children, onClick, className = '' }) {
  return (
    <div
      className={`row ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// Segmented control (pill). options: [{value,label}]
export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Small knowledge-type tag. kind ∈ vocab|phrase|pattern|trap.
export function Tag({ kind = 'vocab', children, style }) {
  const colorMap = {
    vocab: { bg: 'var(--vocab-soft)', bd: 'var(--vocab-border)', tx: 'var(--vocab)' },
    phrase: { bg: 'var(--phrase-soft)', bd: 'var(--phrase-border)', tx: 'var(--phrase)' },
    pattern: { bg: 'var(--pattern-soft)', bd: 'var(--pattern-border)', tx: 'var(--pattern)' },
    trap: { bg: 'var(--trap-soft)', bd: 'var(--trap-border)', tx: 'var(--trap)' },
  };
  const c = colorMap[kind] || colorMap.vocab;
  return (
    <span
      style={{ background: c.bg, border: `1px solid ${c.bd}`, color: c.tx }}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
    >
      {children}
    </span>
  );
}

// Primary action button (Apple-blue CTA w/ two-layer tinted shadow on color).
export function PrimaryButton({ children, onClick, type = 'button', className = '', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`press inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(0,113,227,0.22)] transition hover:brightness-105 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

// Secondary / ghost button.
export function GhostButton({ children, onClick, className = '', active }) {
  return (
    <button
      onClick={onClick}
      className={`press inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium transition ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'border-[var(--hairline)] text-[var(--text-2)] hover:bg-[var(--surface-2)]'
      } ${className}`}
    >
      {children}
    </button>
  );
}

// Floating action button (glass chip).
export function Fab({ onClick, children, className = '', title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`press fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text)] shadow-[var(--sh-overlay)] ${className}`}
    >
      {children}
    </button>
  );
}

// Page header eyebrow + title block.
export function PageHeader({ eyebrow, title, subtitle, right }) {
  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] pt-6 pb-3">
      {eyebrow && (
        <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-[var(--text-3)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--live)] pulse-dot" />
          {eyebrow}
        </div>
      )}
      <div className="mt-2 flex items-end justify-between gap-3">
        <h1 className="text-[clamp(24px,5vw,34px)] font-bold tracking-[-0.02em] text-[var(--text)]">
          {title}
        </h1>
        {right}
      </div>
      {subtitle && <p className="mt-1 text-[14px] text-[var(--text-2)]">{subtitle}</p>}
    </div>
  );
}

export { motion };
