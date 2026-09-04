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

/** 累加一次请求的 token 消耗（按模型 + 当天分桶；模型名空用 'unknown'） */
export function addTokenUsage(model: string | undefined, tokens: number): void {
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  const key = (model || 'unknown').trim() || 'unknown';
  const usage = loadTokenUsage();
  const day = todayKey();
  usage[key] = usage[key] || {};
  usage[key][day] = (usage[key][day] ?? 0) + Math.round(tokens);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(usage)); } catch { /* 存储满等异常静默 */ }
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
