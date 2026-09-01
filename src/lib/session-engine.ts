// SessionEngine — unified learning session state machine.
// Queue builds per-word task chains (listen → recognize → recall → spell),
// failure re-queue logic, progress persistence to IndexedDB.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyItem } from '../types/index.ts';
import { recordReview, addError } from '../db/db.ts';

export type TaskType = 'listen' | 'recognize' | 'recall' | 'spell';
export type TaskResult = 'correct' | 'hesitant' | 'wrong' | 'skip';

export interface Task {
  id: string;
  type: TaskType;
  item: StudyItem;
  index: number; // position in the original queue
}

export interface SessionStats {
  total: number;
  done: number;
  correct: number;
  wrong: number;
  skipped: number;
}

const TASK_CHAIN: TaskType[] = ['listen', 'recognize', 'recall', 'spell'];

// Build the full task queue: each item gets the chain once.
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

// q mapping: correct=5, hesitant=4, wrong=2, skip=1 (SM-2: <3 = fail)
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
}) {
  const { items, editionId, includeSpell = true, onComplete } = opts;
  const [queue, setQueue] = useState<Task[]>(() => buildQueue(items, includeSpell));
  const [pos, setPos] = useState(0);
  const [stats, setStats] = useState<SessionStats>(() => ({ total: buildQueue(items, includeSpell).length, done: 0, correct: 0, wrong: 0, skipped: 0 }));
  const failedRef = useRef<Map<string, number>>(new Map());
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const current: Task | null = queue[pos] ?? null;

  const mark = useCallback(async (result: TaskResult) => {
    const task = queue[pos];
    if (!task) return;

    const q = resultToQ(result);
    const key = `${editionId}:${task.item.id}`;

    // Persist SRS review immediately (per-item).
    await recordReview({ key, editionId, itemId: task.item.id, kind: task.item.kind, q });

    // Error notebook for wrong/skip results.
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

    // Failure re-queue: fail×2 → insert listen replay before next task.
    const fails = (failedRef.current.get(task.item.id) ?? 0) + (result === 'wrong' ? 1 : 0);
    failedRef.current.set(task.item.id, fails);
    if (fails === 2 && task.type !== 'listen') {
      const replay: Task = { ...task, type: 'listen', id: `${task.item.id}:replay` };
      setQueue((q) => [...q.slice(0, pos + 1), replay, ...q.slice(pos + 1)]);
    }

    setPos((p) => p + 1);
  }, [queue, pos, editionId]);

  // Completion detection.
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

  return { current, pos, total: queue.length, stats, mark, skip, reset };
}
