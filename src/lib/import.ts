// Personal import — parse, validate, and store user-imported word/phrase/pattern lists.
// Supports: TSV (word|meaning|phonetic|example), JSON array, and raw text paste.

export interface ImportEntry {
  label: string;
  type: 'vocab' | 'phrase' | 'pattern';
  meaning: string;
  phonetic?: string;
  example?: string;
}

export interface ImportResult {
  ok: ImportEntry[];
  errors: { line: number; text: string; reason: string }[];
}

// Parse TSV lines: word|meaning|phonetic|example
// Auto-detect type: if contains space → phrase, if contains pattern keyword → pattern
function detectType(label: string): 'vocab' | 'phrase' | 'pattern' {
  const trimmed = label.trim();
  if (trimmed.includes('...') || trimmed.includes('___') || /^(what|how|where|when|why|do|does|did|is|are|was|were|have|has|had|will|would|can|could|shall|should|may|might|must|there|it)\s/i.test(trimmed)) {
    return 'pattern';
  }
  if (/\s/.test(trimmed)) return 'phrase';
  return 'vocab';
}

function normalizeType(t: string): 'vocab' | 'phrase' | 'pattern' {
  if (t === 'phrase') return 'phrase';
  if (t === 'pattern' || t === 'sentence') return 'pattern';
  return 'vocab';
}

export function parseImport(text: string): ImportResult {
  const ok: ImportEntry[] = [];
  const errors: { line: number; text: string; reason: string }[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#')) continue;

    // Try JSON
    if (raw.startsWith('[') || raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        items.forEach((item: Record<string, string>) => {
          const label = item.word || item.phrase || item.pattern || item.label || '';
          if (!label) { errors.push({ line: i + 1, text: raw.slice(0, 60), reason: '缺少 label 字段' }); return; }
          ok.push({
            label: label.trim(),
            type: item.type ? normalizeType(item.type) : detectType(label),
            meaning: item.meaning || item.释义 || '',
            phonetic: item.phonetic || item.音标 || '',
            example: item.example || item.例句 || item.exampleEn || '',
          });
        });
      } catch { errors.push({ line: i + 1, text: raw.slice(0, 60), reason: 'JSON 解析失败' }); }
      continue;
    }

    // TSV: word|meaning|phonetic|example
    const parts = raw.split('|');
    if (parts.length >= 2) {
      const label = parts[0].trim();
      if (!label) { errors.push({ line: i + 1, text: raw.slice(0, 60), reason: '缺少单词/短语' }); continue; }
      ok.push({
        label,
        type: detectType(label),
        meaning: parts[1].trim(),
        phonetic: (parts[2] || '').trim(),
        example: (parts[3] || '').trim(),
      });
      continue;
    }

    // Single word on a line — add to errors (needs at least meaning)
    if (raw.length > 1 && !raw.includes(' ')) {
      errors.push({ line: i + 1, text: raw.slice(0, 60), reason: '缺少释义，格式：word|meaning' });
    } else {
      errors.push({ line: i + 1, text: raw.slice(0, 60), reason: '无法解析' });
    }
  }

  return { ok, errors };
}

// Generate a unique import ID
let importCounter = 0;
export function generateImportId(): string { return `import_${Date.now()}_${++importCounter}`; }

// Convert ImportEntry to study item IDs
export function entryToStudyItemId(entry: ImportEntry, batchId: string, idx: number): string {
  const suffix = entry.type === 'phrase' ? 'p' : entry.type === 'pattern' ? 's' : 'v';
  return `${batchId}_${suffix}${idx}`;
}