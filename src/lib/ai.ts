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
export function buildSystemPrompt(args: { unitTitle?: string; knowledge?: string; passage?: string; notes?: string; mode?: 'word' | 'reading'; grade?: number } = {}): string {
  const stage = args.grade ? (args.grade >= 10 ? '高中' : '初中') : '初中/高中';
  // knowledge 与 passage 是两种性质的语料，标签必须分开（prompt-v3.2）：
  // knowledge = 单元词表（约束讲解深度与例句用词 i+1）；
  // passage = 课文/原句原文（只做语境与例句来源，禁止当成词表）。
  // mode='reading'（prompt-v3.3）：整篇课文导读人设，不复用词卡句式人设。
  const reading = args.mode === 'reading';
  const persona = reading
    ? `你是一名面向中国${stage}学生的英语老师，正在带学生精读本教材的一篇课文。`
    : `你是一名面向中国${stage}学生的英语学霸辅导老师，专注课本词汇、短语、固定搭配与句式语法。`;
  const duty = reading
    ? '职责范围：仅做课文导读——概括主旨、梳理段落脉络、点评原文好句、按教材注释口径提示难词难句。导读纪律：好句与难词难句优先选自本单元词表或注释要点在课文中出现的项；可以点明「本课在练哪些表达」；不要逐段翻译，不要文学鉴赏；词表没有但影响理解的生词可少量补充，不要展开成课外词汇课。'
    : '职责范围：仅做知识讲解、概念辨析、造句批改与考点拓展；';
  const k = args.knowledge ? `\n当前单元词表（讲解深度、例句用词请对齐这个范围，内容不足时说明并建议查阅教材）：\n${args.knowledge}` : '';
  // notesCtx（prompt-v3.5）：注释要点是第三种语料（教材注释口径），不与词表混一个字段
  const n = args.notes ? `\n本单元注释要点（教材 Notes 口径，讲解难词难句时对齐这些条目）：\n${args.notes}` : '';
  const p = args.passage ? `\n课文/原句原文（仅作语境与例句来源，这不是词表，讲解时不要把它当单词罗列）：\n${args.passage}` : '';
  return [
    persona,
    duty,
    '拒绝医疗/法律/金融等非学习建议，拒绝违法违规内容，面向未成年人输出积极健康。',
    '回答用简体中文为主，英语例句附中文释义；条理清晰，便于记忆。',
    '若要求结构化 JSON，请只输出可解析的 JSON，不要额外解释文字。',
    `当前学习单元：${args.unitTitle || '未指定'}。${k}${n}${p}`,
    '免责：AI 生成内容仅供参考，请以学校教材和任课老师讲解为准。',
  ].join('\n');
}

/** 批改专用 system prompt（v2→v3）：与卡片职责分离；mode 区分造句批改（sentence）与微写作（miniwrite）两种评分口径。 */
export function buildCorrectionSystemPrompt(args: { mode: 'sentence' | 'miniwrite'; unitTitle?: string; grade?: number }): string {
  const stage = args.grade ? (args.grade >= 10 ? '高中' : '初中') : '初中/高中';
  const miniwrite = args.mode === 'miniwrite';
  return [
    miniwrite
      ? `你是一名中国${stage}英语老师，正在批改学生根据本课课文问题写的约 30 词英语短文（微写作）。`
      : `你是一名中国${stage}英语老师，正在批改学生用本单元目标短语造的句子。`,
    miniwrite
      ? '职责范围：仅做微写作批改——判断是否切题、给出修改参考、用简体中文从切题/语言准确性/是否用上本课表达三方面点评；拒绝其他话题。'
      : '职责范围：仅做句子批改——判断正误、给出修正句、用简体中文简要说明错误理由；拒绝其他话题。',
    '评分锚定（examCollocationScore 为 0-100 的粗估分，非精确评分）：',
    miniwrite ? '- 90-100 = 优秀：切题且约 30 词，语言基本无误，用上了课文依据或本课表达；' : '- 90-100 = 优秀：句子正确自然，目标短语使用准确；',
    miniwrite ? '- 60-89 = 合格：切题但有过半数以上拼写/冠词/单复数/时态小错，或表达平淡；' : '- 60-89 = 合格：意思可达，有小错误（拼写/冠词/单复数等）；',
    miniwrite ? '- 0-59 = 需改进：偏题、明显过短（少于 15 词）或语言错误影响理解。' : '- 0-59 = 需改进：短语误用或句子结构错误。',
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

// 推理类模型名探测（reasoner/o1/o3/qwq/r1/thinking）：空回复文案分流与 max_tokens 提档共用
export function isReasoningModel(model: string): boolean {
  return /reasoner|deepseek-r1|\bo1\b|\bo3\b|qwq|thinking/i.test(model);
}

// Streaming chat. onChunk receives (delta, full). Abortable.
// onError（prompt-v3 加固）：fetch/HTTP/流中断错误通过此回调抵达调用方。
// 此前错误在 detached async 内 rethrow，永远无人接收 → 调用方误报"解析失败"。
export function streamChat(args: {
  cfg: AiConfig; systemPrompt: string; userMessage: string;
  onChunk?: (delta: string, full: string) => void; onEnd?: (full: string, meta: { reasoningChars: number }) => void;
  onError?: (e: Error) => void; signal?: AbortSignal; maxTokens?: number;
}): StreamHandle {
  const base = normalizeBaseUrl(args.cfg.baseUrl);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (args.signal) args.signal.addEventListener('abort', abort);
  // 推理类模型（reasoner/o1/qwq/r1/thinking）思考会消耗输出额度：本次请求提高一档，
  // 只对命中模型名的请求生效，不对所有模型一刀切加大。
  const reasoningModel = isReasoningModel(args.cfg.model);
  const maxTokens = reasoningModel ? (args.maxTokens ?? 800) * 2 : (args.maxTokens ?? 800);

  (async () => {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.cfg.key}` },
        body: JSON.stringify({
          model: args.cfg.model,
          messages: [{ role: 'system', content: args.systemPrompt }, { role: 'user', content: args.userMessage }],
          stream: true, temperature: 0.5,
          max_tokens: maxTokens, // 批改足够；卡片请求传更大值（推理模型在上方自动翻倍）
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
      // 推理模型兼容：同收 delta.reasoning_content / message.reasoning_content，
      // 只计数不进学习卡、不进 UI（解析与展示只用 content）。
      let reasoningChars = 0;
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
            const json = JSON.parse(payload) as { choices?: { delta?: { content?: string; reasoning_content?: string; reasoning?: string } }[] };
            const delta = json.choices?.[0]?.delta;
            const think = delta?.reasoning_content ?? delta?.reasoning; // deepseek/qwen 与 openrouter 两种字段名
            if (think) reasoningChars += think.length;
            if (delta?.content) { full += delta.content; args.onChunk?.(delta.content, full); }
          } catch { /* ignore malformed chunk */ }
        }
      }
      args.onChunk?.('', full);
      args.onEnd?.(full, { reasoningChars });
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
export function studyCardPrompt(
  label: string,
  meaning?: string,
  kind?: string,
  quote?: string,
  peerWords?: string[],
  opts?: { mode?: 'word' | 'reading'; fullText?: string },
): string {
  // prompt-v3.3 整篇课文导读：不复用词卡 kindLabel 口径，四段含义固定为主旨/脉络/好句/难词难句。
  // 课文全文按字数截断（>4000 字符截断并注明），不按段数；标注「课文原文，不是词表」。
  if (opts?.mode === 'reading') {
    const full = opts.fullText ?? '';
    const LIMIT = 4000;
    const cut = full.length > LIMIT;
    const text = cut ? `${full.slice(0, LIMIT)}\n（课文过长，已截断至前 ${LIMIT} 字符）` : full;
    return `这是${label}的课文原文，请生成一份整篇课文导读卡，只输出 JSON，不要任何多余文字或 markdown。课文原文（这不是词表）：

${text}

{
  "word": "${label}",
  "definition": "这篇在讲什么：1-2 句中文概括主旨（点明本课人物/主题）",
  "usage": [
    { "type": "text", "text": "段落怎么串：按段落顺序用中文梳理人物/要点脉络，一段一条" }
  ],
  "example": { "en": "原文好句：从课文里挑 2-3 句值得品读的英文原句，优先含本单元词表或注释要点中的词", "zh": "对应中文翻译" },
  "examTips": [
    { "type": "text", "text": "难词难句提示：按教材注释口径（词义/用法/语法点）对齐本单元注释要点，不要考场答题口径", "probe": "（可选）针对该难点的中文追问句" },
    { "type": "speak", "text": "需要朗读的英文难词/短语（可选，单独列，不要嵌在中文句子里）" }
  ]
}

要求：
- usage 2-4 条，每条对应课文一个段落要点；example 用课文原句，不要自拟，可给 2-3 句。
- 好句和难词难句优先选自「本单元词表」「本单元注释要点」在课文中出现的项；可点明本课在练哪些表达。
- 不要逐段翻译，不要文学鉴赏；词表没有但影响理解的生词可少量补充，不要展开成课外词汇课。
- 讲解对齐本单元词表范围，浅显易记。`;
  }
  const kindLabel = kind === 'phrase' ? '短语' : kind === 'pattern' ? '句式' : kind === 'notes' ? '教材注释句子' : '单词';
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
请针对这个追问展开讲解（${depth === 1 ? '第一层：把该点讲清楚' : '第二层：在上一层基础上给应用层面的深化，此后不再设新问题'}），只输出 JSON，格式与学习卡片相同（word 填「${label}」，definition 一句话直接回答追问，usage 2-3 条是展开：具体例子、常见搭配或易混对比，每条内容各不相同，禁止复述 definition 的原句，examTips 可为空数组）。只输出 JSON，不要任何多余文字。`;
}

/** 批改结果净化：score clamp 0-100 + 非数字容错、字符串字段强转。（prompt-v2 加固；score 缺失的判定在 isValidCorrection，不在此兜底为 0） */
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

/** 批改解析门槛（v3 收口）：isCorrect 与 score（可转数字）缺一即视为解析失败，走可见报错，不展示 0 分。 */
export function isValidCorrection(j: unknown): j is CorrectionResult {
  if (!j || typeof j !== 'object' || !('isCorrect' in j)) return false;
  const raw = (j as { examCollocationScore?: unknown }).examCollocationScore;
  const score = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  return Number.isFinite(score);
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

/** 归一化用于复述判重：去空白/标点 + 英文小写，模型换个标点或加个空格也能命中。 */
function normalizeDup(s: string): string {
  return s
    .replace(/[\s\u3000]+/g, '')
    .replace(/[，。、；：？！「」『』（）《》"'“”‘’…—,.;:?!()<>]/g, '')
    .toLowerCase();
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
    const definitionNorm = normalizeDup(String(raw.definition));
    // 复述剔除（确定性兜底，不依赖模型自律）：usage/examTips 段与 definition 文本
    // 归一化后相同或互为包含 → 丢弃（definition 已含该信息，展示层不重复）。
    // 全部被剔时 usage/examTips 留空数组，UI 相应整节隐藏。
    const dedupe = (segs: StudySegment[]): StudySegment[] =>
      segs.filter((x) => {
        const n = normalizeDup(x.text);
        return n.length > 0 && n !== definitionNorm && !definitionNorm.includes(n) && !n.includes(definitionNorm);
      });
    const usageSegs = dedupe(seg(raw.usage));
    const examSegs = dedupe(seg(raw.examTips));
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
