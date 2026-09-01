import type { SrsState } from '../types/index.ts';

export const SRS_DEFAULTS: SrsState = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  dueDate: 0,
  lastReviewed: 0,
};

const DAY = 24 * 60 * 60 * 1000;

// Is the item due for review now?
export function isDue(srs?: SrsState | null): boolean {
  if (!srs) return true;
  return (srs.dueDate || 0) <= Date.now();
}

// SM-2 review. q ∈ 0..5 (0-2 fail, 3 hesitant, 4 some hesitation, 5 perfect).
// Returns a NEW srs object.
export function review(item: { srs?: SrsState | null }, q: number): SrsState {
  const prev: SrsState = { ...SRS_DEFAULTS, ...(item?.srs ?? {}) };
  let { easeFactor: ef, interval, repetitions } = prev;

  if (q < 3) {
    repetitions = 0;
    interval = 0; // due again immediately
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ef);
  }

  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < 1.3) ef = 1.3;

  const dueDate = q < 3 ? Date.now() : Date.now() + interval * DAY;
  return {
    easeFactor: Number(ef.toFixed(2)),
    interval,
    repetitions,
    dueDate,
    lastReviewed: Date.now(),
  };
}

export function intervalLabel(interval: number): string {
  if (!interval || interval <= 0) return '待巩固';
  if (interval < 1) return '今天';
  if (interval < 30) return `${interval} 天`;
  if (interval < 365) return `${Math.round(interval / 30)} 个月`;
  return `${Math.round(interval / 365)} 年`;
}
