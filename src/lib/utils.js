// Small shared utilities.

// Knowledge-type semantic tokens (spec §3.1). Each maps to a Tailwind-friendly
// set of classes for tint/soft/border/text. Used consistently across cards.
export const KIND_META = {
  vocab: {
    label: '单词',
    tint: 'var(--vocab)',
    soft: 'var(--vocab-soft)',
    border: 'var(--vocab-border)',
    text: 'var(--vocab)',
    classes: 'bg-vocab-soft border-vocab-border text-vocab-deep',
  },
  phrase: {
    label: '短语/搭配',
    tint: 'var(--phrase)',
    soft: 'var(--phrase-soft)',
    border: 'var(--phrase-border)',
    text: 'var(--phrase)',
    classes: 'bg-phrase-soft border-phrase-border text-phrase-deep',
  },
  pattern: {
    label: '句式/语法',
    tint: 'var(--pattern)',
    soft: 'var(--pattern-soft)',
    border: 'var(--pattern-border)',
    text: 'var(--pattern)',
    classes: 'bg-pattern-soft border-pattern-border text-pattern-deep',
  },
  trap: {
    label: '考点/陷阱',
    tint: 'var(--trap)',
    soft: 'var(--trap-soft)',
    border: 'var(--trap-border)',
    text: 'var(--trap)',
    classes: 'bg-trap-soft border-trap-border text-trap-deep',
  },
};

// Inline style object for a knowledge type (for dynamic borders/tints).
export function kindStyle(kind, mode = 'soft') {
  const m = KIND_META[kind] || KIND_META.vocab;
  return {
    soft: { background: m.soft, borderColor: m.border, color: m.text },
    border: { borderColor: m.border },
    tint: { color: m.tint },
  }[mode];
}

// Split a collocation string like "look forward to + doing sth." into pill parts.
export function splitCollocation(text) {
  if (!text) return [];
  return text.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
}

// Mask a sentence, hiding target words/phrases for cloze-style practice.
export function maskSentence(sentence, targets = []) {
  if (!sentence) return sentence;
  let out = sentence;
  for (const t of targets) {
    if (!t) continue;
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    out = out.replace(re, '＿＿＿');
  }
  return out;
}

export function todayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
