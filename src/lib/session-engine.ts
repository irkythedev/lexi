// SessionEngine — unified learning session state machine.
// Queue builds per-word task chains (listen → recognize → recall → spell),
// failure re-queue logic, progress persistence to IndexedDB.
// Module-level snapshot cache: survives SPA route navigation (unmount → remount).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyItem } from '../types/index.ts';
import { recordReview, addError } from '../db/db.ts';

export type TaskType = 'listen' | 'recognize' | 'recall' | 'spell';
export type TaskResult = 'correct' | 'hesitant' | 'wrong' | 'skip';

export interface Task {
  id: string;
  type: TaskType;
  item: StudyItem;
  index: number;
}

export interface SessionStats {
  total: number;
  done: number;
  correct: number;
  wrong: number;
  skipped: number;
}

export interface SessionSnapshot {
  queue: Task[];
  pos: number;
  stats: SessionStats;
  failedEntries: [string, number][];
  reviewDone: boolean;
}

const TASK_CHAIN: TaskType[] = ['listen', 'recognize', 'recall', 'spell'];

// Module-level snapshot cache — survives SPA navigation (component unmount).
const _snapshots = new Map<string, SessionSnapshot>();

export function saveSessionSnapshot(key: string, snap: SessionSnapshot): void {
  _snapshots.set(key, snap);
}

export function getSessionSnapshot(key: string): SessionSnapshot | undefined {
  return _snapshots.get(key);
}

export function clearSessionSnapshot(key: string): void {
  _snapshots.delete(key);
}

export function buildQueue(items: StudyItem[], includeSpell = true): Task[] {
  const chain = includeSpell ? TASK_CHAIN : TASK_CHAIN.slice(0, 3);
  const tasks: Task[] = [];
  items.forEach((item, index) => {
    for (const type of chain) {
      tasks.push({ id: `${item.id}:${type}`, type, item, index });
    }
  });
  return tasks;
}

export function resultToQ(result: TaskResult): number {
  switch (result) {
    case 'correct': return 5;
    case 'hesitant': return 4;
    case 'wrong': return 2;
    case 'skip': return 1;
  }
}

export function useSessionEngine(opts: {
  items: StudyItem[];
  editionId: string;
  includeSpell?: boolean;
  onComplete?: (stats: SessionStats) => void;
  restoreKey?: string;
}) {
  const { items, editionId, includeSpell = true, onComplete, restoreKey } = opts;

  // Restore from module-level cache if present (SPA navigation round-trip).
  const saved = restoreKey ? getSessionSnapshot(restoreKey) : undefined;

  const [queue, setQueue] = useState<Task[]>(() => {
    if (saved) return saved.queue;
    return buildQueue(items, includeSpell);
  });
  const [pos, setPos] = useState(() => saved?.pos ?? 0);
  const [stats, setStats] = useState<SessionStats>(() => {
    if (saved) return saved.stats;
    return { total: buildQueue(items, includeSpell).length, done: 0, correct: 0, wrong: 0, skipped: 0 };
  });
  const failedRef = useRef<Map<string, number>>(saved ? new Map(saved.failedEntries) : new Map());
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const current: Task | null = queue[pos] ?? null;

  const mark = useCallback(async (result: TaskResult) => {
    const task = queue[pos];
    if (!task) return;

    const q = resultToQ(result);
    const key = `${editionId}:${task.item.id}`;

    await recordReview({ key, editionId, itemId: task.item.id, kind: task.item.kind, q });

    if (result === 'wrong' || result === 'skip') {
      await addError({
        key, editionId, itemId: task.item.id, kind: task.item.kind,
        prompt: `${task.type}: ${task.item.label}`,
        answer: '', reason: result === 'wrong' ? '答错' : '跳过',
      });
    }

    setStats((s) => ({
      ...s,
      done: s.done + 1,
      correct: s.correct + (result === 'correct' ? 1 : 0),
      wrong: s.wrong + (result === 'wrong' || result === 'skip' ? 1 : 0),
      skipped: s.skipped + (result === 'skip' ? 1 : 0),
    }));

    const fails = (failedRef.current.get(task.item.id) ?? 0) + (result === 'wrong' ? 1 : 0);
    failedRef.current.set(task.item.id, fails);
    if (fails === 2 && task.type !== 'listen') {
      const replay: Task = { ...task, type: 'listen', id: `${task.item.id}:replay` };
      setQueue((q) => [...q.slice(0, pos + 1), replay, ...q.slice(pos + 1)]);
    }

    setPos((p) => p + 1);
  }, [queue, pos, editionId]);

  useEffect(() => {
    if (pos >= queue.length && queue.length > 0) {
      onComplete?.(statsRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, queue.length]);

  const skip = useCallback(() => { void mark('skip'); }, [mark]);

  const reset = useCallback(() => {
    failedRef.current.clear();
    const fresh = buildQueue(items, includeSpell);
    setQueue(fresh);
    setPos(0);
    setStats({ total: fresh.length, done: 0, correct: 0, wrong: 0, skipped: 0 });
  }, [items, includeSpell]);

  return {
    current, queue, pos, total: queue.length, stats, mark, skip, reset,
    failedEntries: failedRef.current,
  };
}