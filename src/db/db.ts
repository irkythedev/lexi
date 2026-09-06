import Dexie, { type Table } from 'dexie';
import type { ProgressRecord, ErrorRecord, SrsState, Kind } from '../types/index.ts';
import type { StudyCard } from '../lib/ai.ts';
import type { ImportEntry } from '../lib/import.ts';
import { review } from './srs.ts';

// IndexedDB schema (spec §5.2). Five tables:
//  progress — per-item SRS + mastery
//  errors   — error notebook
//  settings — key/value (theme, tts prefs, ai config, remote editions)
//  personalImports — user-imported word/phrase/pattern batches
//  aiNotes  — AI 学习卡讲义本（prompt-v3.2）：主卡 + 追问链，仅存本机，可在 AI 页清除
export interface PersonalBatch {
  id: string;            // batch id
  name: string;          // user label
  entries: ImportEntry[]; // parsed entries
  createdAt: number;
}

/** AI 讲义本记录：按 edition:unit:kind:label 去重 upsert，同词重生成覆盖保留最新。 */
export interface AiNoteRecord {
  key: string;           // `${editionId}:u${unit}:${kind}:${label}`
  editionId: string;
  unit: number;
  unitTitle: string;
  label: string;         // 词条/句式
  kind: string;          // vocab | phrase | pattern
  meaning: string;
  card: StudyCard;       // 主卡
  chain: { segment: string; probe: string; card: StudyCard }[]; // 追问链（0-2 层）
  model: string;
  updatedAt: number;
}

export class VocabDB extends Dexie {
  progress!: Table<ProgressRecord, string>;
  errors!: Table<ErrorRecord, number>;
  settings!: Table<{ key: string; value: unknown }, string>;
  personalImports!: Table<PersonalBatch, string>;
  aiNotes!: Table<AiNoteRecord, string>;

  constructor() {
    super('lexi-pwa');
    this.version(1).stores({
      progress: 'key, editionId, itemId, kind, dueDate, lastReviewed',
      errors: '++id, key, kind, itemId, reason, createdAt, resolved',
      settings: 'key',
    });
    this.version(2).stores({
      progress: 'key, editionId, itemId, kind, dueDate, lastReviewed',
      errors: '++id, key, kind, itemId, reason, createdAt, resolved',
      settings: 'key',
      personalImports: 'id, createdAt',
    });
    this.version(3).stores({
      progress: 'key, editionId, itemId, kind, dueDate, lastReviewed',
      errors: '++id, key, kind, itemId, reason, createdAt, resolved',
      settings: 'key',
      personalImports: 'id, createdAt',
      aiNotes: 'key, editionId, unit, updatedAt',
    });
  }
}

export const db = new VocabDB();

// ── Progress helpers ──
export async function getProgress(key: string): Promise<ProgressRecord | undefined> {
  return db.progress.get(key);
}
export async function getAllProgress(): Promise<ProgressRecord[]> {
  return db.progress.toArray();
}
export async function putProgress(rec: ProgressRecord): Promise<void> {
  await db.progress.put(rec);
}

// Record an SRS review and persist (immutable update of nested srs).
export async function recordReview(args: {
  key: string; editionId: string; itemId: string; kind: Kind; q: number;
}): Promise<SrsState> {
  const existing = await db.progress.get(args.key);
  const srs = review({ srs: existing?.srs ?? null }, args.q);
  await db.progress.put({
    key: args.key, editionId: args.editionId, itemId: args.itemId, kind: args.kind,
    srs, updatedAt: Date.now(),
  });
  return srs;
}

// ── Error notebook helpers ──
export async function addError(args: {
  key: string; editionId: string; itemId: string; kind: Kind;
  prompt?: string; answer?: string; reason?: string;
}): Promise<number> {
  return db.errors.add({
    key: args.key, editionId: args.editionId, itemId: args.itemId, kind: args.kind,
    prompt: args.prompt ?? '', answer: args.answer ?? '', reason: args.reason ?? '答错',
    createdAt: Date.now(), resolved: 0,
  });
}
export async function getErrors(): Promise<ErrorRecord[]> {
  return db.errors.orderBy('createdAt').reverse().toArray();
}
export async function markErrorResolved(id: number): Promise<void> {
  await db.errors.update(id, { resolved: 1 });
}
export async function clearResolvedErrors(): Promise<void> {
  await db.errors.where('resolved').equals(1).delete();
}

// ── Personal import helpers ──
export async function savePersonalBatch(batch: PersonalBatch): Promise<void> {
  await db.personalImports.put(batch);
}
export async function getPersonalBatches(): Promise<PersonalBatch[]> {
  return db.personalImports.orderBy('createdAt').reverse().toArray();
}
export async function getPersonalBatch(id: string): Promise<PersonalBatch | undefined> {
  return db.personalImports.get(id);
}
export async function deletePersonalBatch(id: string): Promise<void> {
  await db.personalImports.delete(id);
}

// ── Settings helpers ──
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  return db.settings.get(key).then((r) => (r ? (r.value as T) : fallback));
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

// ── AI 讲义本 helpers（prompt-v3.2）──

/** 主卡生成成功后 upsert：同 edition:unit:kind:label 覆盖保留最新，追问链清零。 */
export async function upsertAiNote(note: Omit<AiNoteRecord, 'updatedAt'>): Promise<void> {
  try {
    await db.aiNotes.put({ ...note, updatedAt: Date.now() });
  } catch {
    /* 存储失败静默放弃，不影响面板主流程 */
  }
}

/** 追问答案成功后并入对应主记录的 chain（按 probe+segment 去重，链深上限 2）。 */
export async function appendAiNoteChain(key: string, entry: { segment: string; probe: string; card: StudyCard }): Promise<void> {
  try {
    const rec = await db.aiNotes.get(key);
    if (!rec) return; // 主卡还没存过（异常时序）：静默跳过
    const chain = [...rec.chain.filter((c) => c.probe !== entry.probe || c.segment !== entry.segment), entry].slice(-2);
    await db.aiNotes.update(key, { chain, updatedAt: Date.now() });
  } catch {
    /* 静默 */
  }
}

/** 讲义列表：updatedAt 倒序。 */
export async function listAiNotes(): Promise<AiNoteRecord[]> {
  return db.aiNotes.orderBy('updatedAt').reverse().toArray();
}

export async function deleteAiNote(key: string): Promise<void> {
  await db.aiNotes.delete(key);
}

export async function clearAiNotes(): Promise<void> {
  await db.aiNotes.clear();
}
