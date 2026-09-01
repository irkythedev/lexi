// AI client — pure-frontend BYOK (Bring-Your-Own-Key) OpenAI-compatible client.
// Ported/adapted from stem_digt_labs' ai-config.ts (compliance + CORS lessons).
//
// COMPLIANCE: zero backend. Browser -> provider API directly. Key + config in
// localStorage only; conversations are not persisted. Three-party responsibility
// split (site / user / provider). Student-safe system prompt; input length cap.
import type { AiConfig, AiProviderId, CorrectionResult, ExamPointResult } from '../types/index.ts';

interface Provider { id: AiProviderId; name: string; baseUrl: string; models: string[]; note?: string; }

export const AI_PROVIDERS: Provider[] = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-turbo', 'qwen-max'] },
  { id: 'kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { id: 'zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-flash', 'glm-4-plus'] },
  { id: 'doubao', name: '豆包 (CORS 受限)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: ['Doubao-pro-32k'], note: '浏览器直连可能受限，失败请用自定义端点' },
  { id: 'custom', name: '自定义端点', baseUrl: '', models: [] },
];

export const STORAGE_KEY = 'evp-ai-config';

export function loadConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as AiConfig;
    if (cfg && cfg.key && cfg.baseUrl && cfg.model && cfg.agreed) return cfg;
    return null;
  } catch {
    return null;
  }
}

export function saveConfig(cfg: AiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function normalizeBaseUrl(url: string): string {
  if (!url) return '';
  let u = url.trim().replace(/\/+$/, '');
  u = u.replace(/\/chat\/completions$/i, '');
  u = u.replace(/\/v1$/i, '') || u;
  return u;
}

export function isNetworkError(msg?: string): boolean {
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(msg || '');
}

export async function testConnection(cfg: AiConfig): Promise<{ status: number }> {
  const base = normalizeBaseUrl(cfg.baseUrl);
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
  });
  return { status: res.status };
}

export async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const base = normalizeBaseUrl(baseUrl);
  const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`获取模型失败 HTTP ${res.status}`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((m) => m.id).filter(Boolean);
}

export function buildSystemPrompt(args: { unitTitle?: string; knowledge?: string } = {}): string {
  const k = args.knowledge ? `\n当前单元内容（请基于它作答，内容不足时说明并建议查阅教材）：\n${args.knowledge}` : '';
  return [
    '你是一名面向中国初中/高中学生的英语学霸辅导老师，专注课本词汇、短语、固定搭配与句式语法。',
    '职责范围：仅做知识讲解、概念辨析、造句批改、考点拓展与情境对话；',
    '拒绝医疗/法律/金融等非学习建议，拒绝违法违规内容，面向未成年人输出积极健康。',
    '回答用简体中文为主，英语例句附中文释义；条理清晰，便于记忆。',
    '若要求结构化 JSON，请只输出可解析的 JSON，不要额外解释文字。',
    `当前学习单元：${args.unitTitle || '未指定'}。${k}`,
    '免责：AI 生成内容仅供参考，请以学校教材和任课老师讲解为准。',
  ].join('\n');
}

export interface StreamHandle { abort: () => void; }

// Streaming chat. onChunk receives (delta, full). Abortable.
export function streamChat(args: {
  cfg: AiConfig; systemPrompt: string; userMessage: string;
  onChunk?: (delta: string, full: string) => void; signal?: AbortSignal;
}): StreamHandle {
  const base = normalizeBaseUrl(args.cfg.baseUrl);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (args.signal) args.signal.addEventListener('abort', abort);

  (async () => {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.cfg.key}` },
        body: JSON.stringify({
          model: args.cfg.model,
          messages: [{ role: 'system', content: args.systemPrompt }, { role: 'user', content: args.userMessage }],
          stream: true, temperature: 0.5,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta) { full += delta; args.onChunk?.(delta, full); }
          } catch { /* ignore malformed chunk */ }
        }
      }
      args.onChunk?.('', full);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      throw e;
    }
  })();

  return { abort };
}

// ── Structured prompt wrappers (spec §4.4) ──
export function correctionPrompt(sentence: string, targetPhrases: string[]): string {
  const list = targetPhrases.join('、');
  return `请批改下面这个包含本单元目标短语的英语句子，并只返回 JSON：
{
  "isCorrect": boolean,
  "originalSentence": string,
  "correctedSentence": string,
  "grammarBreakdown": string,
  "examCollocationScore": number
}
要求：examCollocationScore 为 0-100 的搭配/语法得分；grammarBreakdown 用中文简要说明错误与修正理由。
本单元目标短语：${list || '（不限）'}。
待批改句子：${sentence}`;
}

export function examPointPrompt(phrase: string, meaning: string): string {
  return `基于下列短语出 2 道典型的初中/高中选择题（单选），用于考点巩固，只返回 JSON：
{
  "questions": [
    { "stem": string, "options": [string,string,string,string], "answer": number, "explanation": string }
  ]
}
短语：${phrase}（${meaning || ''}）。题目考查该短语的固定搭配、介词或用法，难度贴近中考/高考。`;
}

export function roleplaySystemPrompt(unitTitle: string | undefined, targetVocab: string[]): string {
  const base = buildSystemPrompt({ unitTitle });
  const words = targetVocab.join(', ');
  return (
    base +
    `\n情境对话模式：请用中文引导一场关于「${unitTitle || '本单元'}」的情境对话，` +
    `鼓励用户用英语、并尽量使用这些目标词：${words || '本单元词汇'}。` +
    `当用户说英语时，先自然回应，再温和指出可改进的搭配或语法。`
  );
}

export function extractJson(text: string): CorrectionResult | ExamPointResult | null {
  if (!text) return null;
  const s = text.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as CorrectionResult | ExamPointResult;
  } catch {
    return null;
  }
}
