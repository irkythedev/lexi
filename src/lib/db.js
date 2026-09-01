// IndexedDB storage schema via Dexie.js.
// Stores: progress (per-item SRS + mastery), errors (error notebook), settings.
import Dexie from 'dexie';

export const db = new Dexie('english-vocab-pwa');

db.version(1).stores({
  // key = `${editionId}:${itemId}`  (itemId = v_xxx / p_xxx / s_xxx)
  progress: 'key, editionId, itemId, kind, dueDate, lastReviewed',
  // key = auto-increment; one row per logged mistake
  errors: '++id, key, kind, itemId, reason, createdAt',
  // singleton-ish key/value store for app settings & AI config
  settings: 'key',
});

// ---- Progress helpers ----

export async function getProgress(key) {
  return db.progress.get(key);
}

export async function getAllProgress() {
  return db.progress.toArray();
}

export async function putProgress(record) {
  return db.progress.put(record);
}

// Record an SRS review for one item and persist.
export async function recordReview({ key, editionId, itemId, kind, q }) {
  const existing = await db.progress.get(key);
  const prevSrs = existing?.srs || null;
  // lazy import to avoid circular dep
  const { review } = await import('./srs.js');
  const srs = review({ srs: prevSrs }, q);
  await db.progress.put({
    key,
    editionId,
    itemId,
    kind,
    srs,
    updatedAt: Date.now(),
  });
  return srs;
}

// ---- Error notebook helpers ----

export async function addError({ key, editionId, itemId, kind, prompt, answer, reason }) {
  return db.errors.add({
    key,
    editionId,
    itemId,
    kind,
    prompt: prompt || '',
    answer: answer || '',
    reason: reason || '答错',
    createdAt: Date.now(),
    resolved: 0,
  });
}

export async function getErrors() {
  return db.errors.orderBy('createdAt').reverse().toArray();
}

export async function markErrorResolved(id) {
  return db.errors.update(id, { resolved: 1 });
}

export async function clearResolvedErrors() {
  return db.errors.where('resolved').equals(1).delete();
}

// ---- Settings helpers ----

export async function getSetting(key, fallback = null) {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  return db.settings.put({ key, value });
}

export { SRS_DEFAULTS } from './srs.js';
