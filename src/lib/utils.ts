import type { Kind, Locale } from '../types/index.ts';
import { CaseSensitive, Link2, AlignLeft, type LucideIcon } from 'lucide-react';

// Knowledge-type semantic tokens (spec §3). Used as accent only.
export const KIND_META: Record<Kind, { label: Record<Locale, string>; short: Record<Locale, string>; icon: LucideIcon; tint: string; soft: string; border: string; text: string; classes: string }> = {
  vocab: {
    label: { zh: '单词', en: 'Vocab' }, short: { zh: '单词', en: 'Word' }, icon: CaseSensitive,
    tint: 'var(--color-vocab)', soft: 'var(--color-vocab-soft)', border: 'var(--color-vocab-border)', text: 'var(--color-vocab-deep)',
    classes: 'bg-[var(--color-vocab-soft)] border-[var(--color-vocab-border)] text-[var(--color-vocab-deep)]',
  },
  phrase: {
    label: { zh: '短语/搭配', en: 'Phrase' }, short: { zh: '短语', en: 'Phrase' }, icon: Link2,
    tint: 'var(--color-phrase)', soft: 'var(--color-phrase-soft)', border: 'var(--color-phrase-border)', text: 'var(--color-phrase-deep)',
    classes: 'bg-[var(--color-phrase-soft)] border-[var(--color-phrase-border)] text-[var(--color-phrase-deep)]',
  },
  pattern: {
    label: { zh: '句式/语法', en: 'Pattern' }, short: { zh: '句式', en: 'Pattern' }, icon: AlignLeft,
    tint: 'var(--color-pattern)', soft: 'var(--color-pattern-soft)', border: 'var(--color-pattern-border)', text: 'var(--color-pattern-deep)',
    classes: 'bg-[var(--color-pattern-soft)] border-[var(--color-pattern-border)] text-[var(--color-pattern-deep)]',
  },
  // 'trap' is a display-only kind (exam traps), not a study item kind
};

export function kindStyle(kind: Kind, mode: 'soft' | 'border' | 'tint' = 'soft') {
  const m = KIND_META[kind];
  return { soft: { background: m.soft, borderColor: m.border, color: m.text }, border: { borderColor: m.border }, tint: { color: m.tint } }[mode];
}

// Split "look forward to + doing sth." into pill parts.
export function splitCollocation(text: string): string[] {
  if (!text) return [];
  return text.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
}

// Mask a sentence, hiding target words for cloze practice.
export function maskSentence(sentence: string, targets: string[] = []): string {
  if (!sentence) return sentence;
  let out = sentence;
  for (const t of targets) {
    if (!t) continue;
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    out = out.replace(re, '＿＿＿');
  }
  return out;
}

export function todayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
