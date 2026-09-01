// Spaced repetition scheduler — SM-2 algorithm (the classic SuperMemo model).
// Each item keeps: easeFactor (EF), interval (days), repetitions (n),
// dueDate (ms timestamp). Quality q ∈ {0..5} is the user's recall grade:
//   0-2 = incorrect / forgot
//   3   = correct with serious hesitation
//   4   = correct with some hesitation
//   5   = perfect recall

export const SRS_DEFAULTS = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  dueDate: 0, // 0 => due immediately
  lastReviewed: 0,
};

const DAY = 24 * 60 * 60 * 1000;

export function isDue(item) {
  if (!item || !item.srs) return true;
  return (item.srs.dueDate || 0) <= Date.now();
}

// Apply an SM-2 review. Returns a NEW srs object (immutable update).
export function review(item, q) {
  const prev = { ...SRS_DEFAULTS, ...(item?.srs || {}) };
  let { easeFactor: ef, interval, repetitions } = prev;

  if (q < 3) {
    // Failed recall: reset the repetition chain but keep a slightly lowered EF.
    repetitions = 0;
    interval = 0; // due again (immediately / next session)
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
  }

  // EF update (never below 1.3).
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

// Short human label for the next interval.
export function intervalLabel(interval) {
  if (!interval || interval <= 0) return '待巩固';
  if (interval < 1) return '今天';
  if (interval < 30) return `${interval} 天`;
  if (interval < 365) return `${Math.round(interval / 30)} 个月`;
  return `${Math.round(interval / 365)} 年`;
}
