// AI client — pure-frontend BYOK (Bring-Your-Own-Key) OpenAI-compatible client.
// Ported/adapted from stem_digt_labs' ai-config.ts (compliance + CORS lessons).
//
// COMPLIANCE: zero backend. Browser -> provider API directly. Key + config in
// localStorage only. Generated study cards are persisted locally (IndexedDB
// `aiNotes` table, on-device only, clearable in the AI notes section) so the
// student can review them offline; nothing is ever uploaded. Three-party
// responsibility split (site / user / provider). Student-safe system prompt;
// input length cap.
import type { AiConfig, AiProviderId, CorrectionResult } from '../types/index.ts';

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

// Persist the fetched model list without clobbering the rest of the config
// (e.g. after 获取模型, we want to keep the models for next visit).
export function saveModels(models: string[], baseUrl?: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const cfg = raw ? (JSON.parse(raw) as AiConfig) : null;
    if (!cfg) return;
    const next = { ...cfg, models };
    if (baseUrl) next.baseUrl = baseUrl;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function normalizeBaseUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim().split('?')[0].replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed;
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

// prompt-v2 (2026-09-04): 拆分卡片/批改两套 system prompt（v1 单套混杂两种职责）。
// 批改口径：三档评价（好/可/需改）+ 0-100 粗估分，明确"AI 估算"性质，禁止伪精度。
// 卡片口径：knowledge 支持传单元词表（词+释义），例句词汇受已学词约束（i+1）。
export function buildSystemPrompt(args: { unitTitle?: string; knowledge?: string; grade?: number } = {}): string {
  const stage = args.grade ? (args.grade >= 10 ? '高中' : '初中') : '初中/高中';
  const k = args.knowledge ? `\n当前单元词表（讲解深度、例句用词请对齐这个范围，内容不足时说明并建议查阅教材）：\n${args.knowledge}` : '';
  return [
    `你是一名面向中国${stage}学生的英语学霸辅导老师，专注课本词汇、短语、固定搭配与句式语法。`,
    '职责范围：仅做知识讲解、概念辨析、造句批改、考点拓展与情境对话；',
    '拒绝医疗/法律/金融等非学习建议，拒绝违法违规内容，面向未成年人输出积极健康。',
    '回答用简体中文为主，英语例句附中文释义；条理清晰，便于记忆。',
    '若要求结构化 JSON，请只输出可解析的 JSON，不要额外解释文字。',
    `当前学习单元：${args.unitTitle || '未指定'}。${k}`,
    '免责：AI 生成内容仅供参考，请以学校教材和任课老师讲解为准。',
  ].join('\n');
}

/** 批改专用 system prompt（v2）：与卡片职责分离，评分锚定三档语义。 */
export function buildCorrectionSystemPrompt(args: { unitTitle?: string; grade?: number } = {}): string {
  const stage = args.grade ? (args.grade >= 10 ? '高中' : '初中') : '初中/高中';
  return [
    `你是一名中国${stage}英语老师，正在批改学生用本单元目标短语造的句子。`,
    '职责范围：仅做句子批改——判断正误、给出修正句、用简体中文简要说明错误理由；拒绝其他话题。',
    '评分锚定（examCollocationScore 为 0-100 的粗估分，非精确评分）：',
    '- 90-100 = 优秀：句子正确自然，目标短语使用准确；',
    '- 60-89 = 合格：意思可达，有小错误（拼写/冠词/单复数等）；',
    '- 0-59 = 需改进：短语误用或句子结构错误。',
    'examCollocationScore 必须是 0-100 的整数，与上述三档语义一致。',
    '若要求结构化 JSON，请只输出可解析的 JSON，不要额外解释文字。',
    `当前学习单元：${args.unitTitle || '未指定'}。`,
    '免责：AI 生成内容仅供参考，请以学校教材和任课老师讲解为准。',
  ].join('\n');
}

export interface StreamHandle { abort: () => void; }

/** 把 HTTP 状态映射为可读中文提示，保留服务商原始响应体（用户要求展示供应商报错）。 */
export function friendlyHttpError(status: number, body: string): string {
  const hint = status === 401 || status === 403
    ? '密钥无效或无权限，请检查 API Key'
    : status === 402
      ? '余额不足，请前往服务商控制台充值'
      : status === 404
        ? '模型名或端点地址不对，请检查模型与 Base URL'
        : status === 429
          ? '请求过快或配额用尽，请稍后再试'
          : status >= 500
            ? '服务商暂时不可用，请稍后再试'
            : '请求被服务商拒绝';
  return `HTTP ${status}：${hint}${body ? `｜服务商返回：${body.slice(0, 200)}` : ''}`;
}

// Streaming chat. onChunk receives (delta, full). Abortable.
// onError（prompt-v3 加固）：fetch/HTTP/流中断错误通过此回调抵达调用方。
// 此前错误在 detached async 内 rethrow，永远无人接收 → 调用方误报"解析失败"。
export function streamChat(args: {
  cfg: AiConfig; systemPrompt: string; userMessage: string;
  onChunk?: (delta: string, full: string) => void; onEnd?: (full: string) => void;
  onError?: (e: Error) => void; signal?: AbortSignal; maxTokens?: number;
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
          max_tokens: args.maxTokens ?? 800, // 批改足够；卡片请求传更大值（推理模型需余量）
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(friendlyHttpError(res.status, txt));
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
      args.onEnd?.(full);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      args.onError?.(e as Error);
      if (!args.onEnd) throw e; // 无 onError 的旧调用方：仍走 onEnd 空串 + rethrow（保持兼容）
      // 有 onError 的调用方已接住错误，这里静默结束（不调 onEnd，避免当成空回复）
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

/** 学习卡片渲染段：text = 普通文本，speak = 整段一个朗读按钮（不再拆词）。
 *  probe（可选，prompt-v3）：AI 对该段内容自评"值得追问"时给出的预设追问句。
 *  渲染为段尾可点 chip，点击后由 app 构造固定追问请求——用户零输入（合规红线）。 */
export interface StudySegment { type: 'text' | 'speak'; text: string; probe?: string; }

export interface StudyCard {
  word: string;
  definition: string;
  usage: StudySegment[];
  example: { en: string; zh: string };
  examTips: StudySegment[];
}

/**
 * 合并学习卡片 prompt：一次请求生成 释义/用法/例句/考点 四段，输出 JSON。
 * 结构化输出避免前端用字符串替换插朗读按钮（那是破坏性分词）。
 * quote：教材原文例句（存在时要求 AI 优先采用，可微调时态/人称但保留句式骨架），
 * 缺失时 AI 自拟例句，必须自然、必须包含目标词。
 * probe（prompt-v3）：AI 对讲解中特别值得学生追问的具体内容点，可在该段附一个
 * 预设追问句（0-2 个/卡，宁缺勿滥）。追问由用户点 chip 触发、app 构造请求，无自由输入。
 */
export function studyCardPrompt(label: string, meaning?: string, kind?: string, quote?: string, peerWords?: string[]): string {
  const kindLabel = kind === 'phrase' ? '短语' : kind === 'pattern' ? '句式' : '单词';
  const peerRule = !quote && peerWords && peerWords.length
    ? `- 例句除目标词外，用词尽量取自本单元已学词表：${peerWords.slice(0, 30).join('、')}；可用少量基础功能词（冠词/介词/代词等），不引入超纲难词。`
    : '';
  const quoteRule = quote
    ? `例句必须采用下面的教材原文（可微调时态/人称适配语境，但保留句式结构与原词形，不要改写含义）：「${quote}」`
    : `例句必须自然地道、像教材或考试题，长度 8-15 词，且必须包含目标词「${label}」。`;
  return `请针对这个${kindLabel}「${label}」${meaning ? `（${meaning}）` : ''}生成一份学习卡片，只输出 JSON，不要任何多余文字或 markdown：

{
  "word": "${label}",
  "definition": "一句话中文释义（可用更易记的说法）",
  "usage": [
    { "type": "text", "text": "一句话说明常见用法或搭配，含中文解释", "probe": "（可选）针对这条内容的一个中文追问句" },
    { "type": "speak", "text": "英语示例短语，完整词/短语，不要拆开" }
  ],
  "example": { "en": "一个完整英语例句", "zh": "对应中文翻译" },
  "examTips": [
    { "type": "text", "text": "中文考点提示", "probe": "（可选）针对这条考点的中文追问句" },
    { "type": "speak", "text": "需要朗读的英文词/短语（可选，单独列，不要嵌在中文句子里）" }
  ]
}

要求：
- usage 和 examTips 各 2-4 项；speak 项的 text 必须是完整英文词/短语（如 "be energetic"、"more energetic"），禁止拆成字母或词缀。
- 若英文示例是单个字母（如考点里提示别漏字母 e），单独给一个 { "type": "speak", "text": "e" }。
- example.en 是完整句子，朗读时整句播，不拆词。
- ${quoteRule}${peerRule ? `\n${peerRule}` : ''}
- probe（可省略）：只对讲解中特别值得追问的具体内容点给——该点确实有易混点/易错点/引申空间时，在该段 JSON 对象上加一个 "probe" 字段，内容为面向该点的一个简短中文追问句（学生点它即可展开讲解）。整卡最多 2 个 probe；内容平淡无疑问点时一律不加，宁缺勿滥。
- 总量控制在 180 字以内，每个字段简短。`;
}

/**
 * 追问请求 prompt（prompt-v3）：用户点卡片上的 probe chip 后，由 app 用此构造固定请求。
 * parentSegment 是被追问的原始内容——追问答案必须围绕它展开，不允许发散。
 * 追问答案同样走学习卡片 JSON schema（可再带 probe），由 followUpDepth 限制链深。
 */
export function followUpPrompt(parentSegment: string, probe: string, label: string, depth: number): string {
  return `学生针对「${label}」讲解卡里的这条内容提了一个追问：
原内容：${parentSegment}
追问：${probe}
请针对这个追问展开讲解（${depth === 1 ? '第一层：把该点讲清楚' : '第二层：在上一层基础上给应用层面的深化，此后不再设新问题'}），只输出 JSON，格式与学习卡片相同（word 填「${label}」，definition 一句话直接回答追问，usage 是 2-3 条展开说明，examTips 可为空数组）。只输出 JSON，不要任何多余文字。`;
}

/** 批改结果净化：score clamp 0-100 + 非数字容错、字符串字段强转。（prompt-v2 加固） */
export function sanitizeCorrection(r: CorrectionResult): CorrectionResult {
  const raw = (r as { examCollocationScore?: unknown }).examCollocationScore;
  let score = 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) score = Math.round(raw);
  else if (typeof raw === 'string') { const n = parseInt(raw, 10); if (Number.isFinite(n)) score = n; }
  score = Math.max(0, Math.min(100, score));
  return {
    isCorrect: !!r.isCorrect,
    originalSentence: String(r.originalSentence ?? ''),
    correctedSentence: String(r.correctedSentence ?? ''),
    grammarBreakdown: String(r.grammarBreakdown ?? ''),
    examCollocationScore: score,
  };
}

export function extractJson(text: string): CorrectionResult | null {
  if (!text) return null;
  const s = text.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(s.slice(start, end + 1)) as CorrectionResult;
  } catch {
    return null;
  }
}

/** 解析学习卡片 JSON，容错降级（字段缺失时返回 null，由调用方回退纯文本）。 */
export function parseStudyCard(text: string): StudyCard | null {
  if (!text) return null;
  const s = text.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    const raw = JSON.parse(s.slice(start, end + 1)) as Partial<StudyCard>;
    if (!raw.word || !raw.definition) return null;
    const seg = (v: unknown): StudySegment[] => {
      if (!Array.isArray(v)) return [];
      return v
        .filter((x): x is StudySegment => !!x && typeof (x as StudySegment).text === 'string')
        .map((x) => ({
          type: (x as StudySegment).type === 'speak' ? 'speak' : 'text',
          text: String((x as StudySegment).text),
          // probe 净化：仅保留非空字符串，探针文本与段文本不同才有效；多级对象/超长截断
          ...(typeof (x as { probe?: unknown }).probe === 'string' && (x as { probe: string }).probe.trim() && (x as { probe: string }).probe.trim() !== String((x as StudySegment).text)
            ? { probe: (x as { probe: string }).probe.trim().slice(0, 80) }
            : {}),
        }));
    };
    const usageSegs = seg(raw.usage).length ? seg(raw.usage) : [{ type: 'text' as const, text: String(raw.definition) }];
    const examSegs = seg(raw.examTips);
    // 整卡 probe 上限 2（prompt-v3 宁缺勿滥的硬兜底，不依赖 AI 自律）：按出现顺序保留前 2 个
    let probeBudget = 2;
    const capProbes = (segs: StudySegment[]): StudySegment[] =>
      segs.map((s) => {
        if (s.probe && probeBudget > 0) { probeBudget -= 1; return s; }
        return s.probe ? { type: s.type, text: s.text } : s;
      });
    // 字段长度 clamp（纵深防御：异常/恶意模型输出不撑爆 UI 与 IndexedDB）
    const clamp = (v: unknown, max: number): string => String(v ?? '').slice(0, max);
    return {
      word: clamp(raw.word, 120),
      definition: clamp(raw.definition, 2000),
      usage: capProbes(usageSegs).map((x) => ({ ...x, text: x.text.slice(0, 2000) })),
      example: {
        en: clamp(raw.example?.en, 1200),
        zh: clamp(raw.example?.zh, 1200),
      },
      examTips: capProbes(examSegs).map((x) => ({ ...x, text: x.text.slice(0, 2000) })),
    };
  } catch {
    return null;
  }
}
