// token-usage — AI token 用量跨会话累计统计（localStorage，纯本地不触网）。
// 思路移植自 stem：按 模型 × 日期 两级分桶；口径 = estimateTokens（1 token ≈ 1.8 字符），
// 仅作量级参考，不等同服务商账单。lexi 调用点：学习卡片生成（AiAssistPanel）。

const STORAGE_KEY = 'lexi-ai-token-usage';

/** 按模型 × 日期分桶的用量数据（日期键格式 YYYY-MM-DD；'before' 为历史桶） */
export type TokenUsageData = Record<string, Record<string, number>>;

/** token 估算（唯一权威定义；AiAssistPanel 会话内累计同用此口径） */
export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 1.8);
}

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 读取累计统计（损坏/异常返回空对象，绝不拖垮调用方） */
export function loadTokenUsage(): TokenUsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: TokenUsageData = {};
    for (const [model, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number') out[model] = { before: v };          // 旧扁平格式 → 历史桶
      else if (v && typeof v === 'object' && !Array.isArray(v)) out[model] = v as Record<string, number>;
    }
    return out;
  } catch {
    return {};
  }
}

/** 累加一次请求的 token 消耗（按模型 + 当天分桶；模型名空用 'unknown'；写入时修剪保留窗口） */
export function addTokenUsage(model: string | undefined, tokens: number): void {
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  const key = (model || 'unknown').trim() || 'unknown';
  const usage = loadTokenUsage();
  const day = todayKey();
  usage[key] = usage[key] || {};
  usage[key][day] = (usage[key][day] ?? 0) + Math.round(tokens);
  const pruned = pruneTokenUsage(usage);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned)); } catch { /* 存储满等异常静默 */ }
}

/** 清零全部用量 */
export function clearTokenUsage(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

/** 合并总数 */
export function tokenUsageTotal(usage: TokenUsageData): number {
  let total = 0;
  for (const days of Object.values(usage)) {
    for (const tokens of Object.values(days)) {
      if (Number.isFinite(tokens)) total += tokens;
    }
  }
  return total;
}

/** 单模型总计 */
export function tokenUsageModelTotal(model: string, usage: TokenUsageData): number {
  let total = 0;
  for (const tokens of Object.values(usage[model] ?? {})) {
    if (Number.isFinite(tokens)) total += tokens;
  }
  return total;
}

/* ────────────────── 堆叠柱聚合（纯函数，移植自 stem buildDailyBars） ────────────────── */

/** 每日用量保留窗口（天）。超出即 FIFO 丢弃，防止日期键无限增长吃满配额。 */
export const RETENTION_DAYS = 90;

/** 堆叠柱参与分色的模型上限（第 6 名及以后合并为「其他」）。 */
export const CHART_MODEL_LIMIT = 5;

function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 修剪超出保留窗口的日期键（'before' 历史桶永不清除） */
export function pruneTokenUsage(usage: TokenUsageData, now: Date = new Date(), retainDays: number = RETENTION_DAYS): TokenUsageData {
  const cutoff = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - retainDays));
  const out: TokenUsageData = {};
  for (const [model, days] of Object.entries(usage)) {
    const kept: Record<string, number> = {};
    for (const [day, tokens] of Object.entries(days)) {
      if (day === 'before' || day >= cutoff) kept[day] = tokens;
    }
    if (Object.keys(kept).length > 0) out[model] = kept;
  }
  return out;
}

/** 堆叠柱的一段（某个模型在某一天的用量） */
export interface UsageBarSegment {
  /** 模型 id；合并段为 '__other__' */
  model: string;
  isOther: boolean;
  tokens: number;
  /** 相对「窗口内最大日总量」的高度百分比（可直接叠加成柱总高） */
  hPct: number;
  /** 占当日总量的比例百分比（仅用于读数条，不用于画高） */
  sharePct: number;
}

/** 堆叠柱的一根（一天） */
export interface UsageBar {
  day: string;
  /** false = 该日没有任何记录。注意：无记录 ≠ 用量为 0 */
  hasRecord: boolean;
  total: number;
  hPct: number;
  segments: UsageBarSegment[];
}

/** 堆叠柱总览所需的全部派生数据 */
export interface DailyBars {
  windowDays: number;
  /** 参与分色的模型（按窗口内总量降序，≤ CHART_MODEL_LIMIT） */
  models: string[];
  /** 被合并进「其他」的模型 id */
  otherModels: string[];
  maxDay: number;
  /** before 桶合计（无日期，须单列脚注，不进时间轴） */
  legacyTokens: number;
  bars: UsageBar[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 把两级分桶数据聚合成连续日历上的堆叠柱（纯函数）。
 * 1. 日历回填：断档日在数据里不存在，须按 windowDays 从 today 往前生成连续日期；
 * 2. 共同 y 轴：所有柱按同一个 maxDay 归一，柱高可横向比较；
 * 3. before 排除：无日期桶只汇总为 legacyTokens，绝不混进时间轴；
 * 4. 分色上限 CHART_MODEL_LIMIT，其余合并为「其他」。
 */
export function buildDailyBars(usage: TokenUsageData, windowDays: number, today: Date = new Date()): DailyBars {
  const modelTotals = Object.entries(usage)
    .map(([model, days]) => ({
      model,
      total: Object.entries(days).reduce(
        (s, [d, n]) => (d === 'before' ? s : s + (Number.isFinite(n) ? n : 0)),
        0,
      ),
    }))
    .filter((m) => m.total > 0)
    .sort((a, b) => b.total - a.total);

  const models = modelTotals.slice(0, CHART_MODEL_LIMIT).map((m) => m.model);
  const otherModels = modelTotals.slice(CHART_MODEL_LIMIT).map((m) => m.model);
  const legacyTokens = Object.values(usage).reduce(
    (s, days) => s + (Number.isFinite(days.before) ? days.before : 0),
    0,
  );

  const span = Math.max(1, Math.floor(windowDays));
  const days: string[] = [];
  for (let i = span - 1; i >= 0; i--) {
    days.push(dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
  }

  const bars: UsageBar[] = days.map((day) => {
    const segments: UsageBarSegment[] = models
      .map((model) => ({ model, tokens: usage[model]?.[day] ?? 0 }))
      .filter((s) => s.tokens > 0)
      .map((s) => ({ model: s.model, isOther: false, tokens: s.tokens, hPct: 0, sharePct: 0 }));
    const otherTokens = otherModels.reduce((s, m) => s + (usage[m]?.[day] ?? 0), 0);
    if (otherTokens > 0) {
      segments.push({ model: '__other__', isOther: true, tokens: otherTokens, hPct: 0, sharePct: 0 });
    }
    return {
      day,
      hasRecord: segments.length > 0,
      total: segments.reduce((s, x) => s + x.tokens, 0),
      hPct: 0,
      segments,
    };
  });

  const maxDay = bars.reduce((m, b) => Math.max(m, b.total), 0);
  for (const bar of bars) {
    bar.hPct = maxDay > 0 ? round2((bar.total / maxDay) * 100) : 0;
    for (const seg of bar.segments) {
      seg.hPct = maxDay > 0 ? round2((seg.tokens / maxDay) * 100) : 0;
      seg.sharePct = bar.total > 0 ? round1((seg.tokens / bar.total) * 100) : 0;
    }
  }

  return { windowDays: span, models, otherModels, maxDay, legacyTokens, bars };
}
