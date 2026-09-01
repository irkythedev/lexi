import Dexie, { type Table } from 'dexie';
import type { ProgressRecord, ErrorRecord, SrsState, Kind } from '../types/index.ts';
import { review } from './srs.ts';

// IndexedDB schema (spec §5.2). Three tables:
//  progress — per-item SRS + mastery
//  errors   — error notebook
//  settings — key/value (theme, tts prefs, ai config, remote editions)
export class VocabDB extends Dexie {
  progress!: Table<ProgressRecord, string>;
  errors!: Table<ErrorRecord, number>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('english-vocab-pwa');
    this.version(1).stores({
      progress: 'key, editionId, itemId, kind, dueDate, lastReviewed',
      errors: '++id, key, kind, itemId, reason, createdAt, resolved',
      settings: 'key',
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

// ── Settings helpers ──
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return (row ? (row.value as T) : fallback);
}
export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}
