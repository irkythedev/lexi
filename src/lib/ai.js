// AI client — pure-frontend BYOK (Bring/Bring-your-own-Key) OpenAI-compatible
// client, adapted from stem_digt_labs' ai-config.ts.
//
// COMPLIANCE DESIGN (inherited from stem):
//  - Zero backend: browser -> AI provider API directly. Nothing is stored or
//    relayed server-side (physically cannot log conversations).
//  - Key + config stored ONLY in localStorage; conversations are not persisted.
//  - Three-party responsibility split (this site / user / provider).
//  - Student-safe system prompt; input length cap; no file uploads.
//
// Provider presets limited to mainland-accessible services (per user decision).

export const AI_PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-plus', 'qwen-turbo', 'qwen-max'] },
  { id: 'kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { id: 'zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-flash', 'glm-4-plus'] },
  { id: 'doubao', name: '豆包 (CORS 受限)', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: ['Doubao-pro-32k'], note: '浏览器直连可能受限，失败请用自定义端点' },
  { id: 'custom', name: '自定义端点', baseUrl: '', models: [] },
];

export const STORAGE_KEY = 'evp-ai-config';

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    // completeness gate: key + baseUrl + model + agreed all required
    if (cfg && cfg.key && cfg.baseUrl && cfg.model && cfg.agreed) return cfg;
    return null;
  } catch {
    return null;
  }
}

export function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

// Normalize user-entered Base URL (handles trailing slash, full /chat/completions).
export function normalizeBaseUrl(url) {
  if (!url) return '';
  let u = url.trim().replace(/\/+$/, '');
  u = u.replace(/\/chat\/completions$/i, '');
  u = u.replace(/\/v1$/i, '') || u; // keep root if empty
  return u;
}

export function isNetworkError(msg) {
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(msg || '');
}

// Validate connectivity. A fake key still returns a readable body (e.g.
// "Authentication Fails") proving the link works; we treat 200 or 401 as "reachable".
export async function testConnection(cfg) {
  const base = normalizeBaseUrl(cfg.baseUrl);
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    }),
  });
  return { ok: true, status: res.status };
}

// Dynamically fetch the real model list (OpenAI-compatible /models).
export async function fetchModels(baseUrl, apiKey) {
  const base = normalizeBaseUrl(baseUrl);
  const res = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`获取模型失败 HTTP ${res.status}`);
  const data = await res.json();
  return (data.data || []).map((m) => m.id).filter(Boolean);
}

// Build the student-safe system prompt for this English-vocab app.
export function buildSystemPrompt({ unitTitle, knowledge } = {}) {
  const k = knowledge ? `\n当前单元内容（请基于它作答，内容不足时说明并建议查阅教材）：\n${knowledge}` : '';
  return [
    '你是一名面向中国初中/高中学生的英语学霸辅导老师，专注课本词汇、短语、固定搭配与句式语法。',
    '职责范围：仅做知识讲解、概念辨析、造句批改、考点拓展与情境对话；',
    '拒绝医疗/法律/金融等非学习建议，拒绝违法违规内容，面向未成年人输出积极健康。',
    '回答用简体中文为主，英语例句附中文释义；条理清晰，便于记忆。',
    '若要求结构化 JSON，请只输出可解析的 JSON，不要额外解释文字。',
    `当前学习单元：${unitTitle || '未指定'}。${k}`,
    '免责：AI 生成内容仅供参考，请以学校教材和任课老师讲解为准。',
  ].join('\n');
}

// Streaming chat. onChunk receives incremental text; returns full text.
// Uses fetch + reader (SSE) and is abortable via the returned controller.
export function streamChat({ cfg, systemPrompt, userMessage, onChunk, signal }) {
  const base = normalizeBaseUrl(cfg.baseUrl);
  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: true,
    temperature: 0.5,
  };
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal) signal.addEventListener('abort', abort);

  (async () => {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              full += delta;
              onChunk && onChunk(delta, full);
            }
          } catch (_) {}
        }
      }
      onChunk && onChunk('', full); // finalize
    } catch (e) {
      if (e.name === 'AbortError') return;
      throw e;
    }
  })();

  return { abort };
}

// ---- Structured prompt wrappers (spec §4.4) ----

// 1) Sentence correction -> structured JSON
export function correctionPrompt(sentence, targetPhrases) {
  const list = (targetPhrases || []).map((p) => p.phrase || p).join('、');
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

// 2) Exam-point expansion -> 2 multiple-choice questions
export function examPointPrompt(phrase, meaning) {
  return `基于下列短语出 2 道典型的初中/高中选择题（单选），用于考点巩固，只返回 JSON：
{
  "questions": [
    { "stem": string, "options": [string,string,string,string], "answer": number, "explanation": string }
  ]
}
短语：${phrase}（${meaning || ''}）。题目考查该短语的固定搭配、介词或用法，难度贴近中考/高考。`;
}

// 3) Roleplay scenario system augmentation
export function roleplaySystemPrompt(unitTitle, targetVocab) {
  const words = (targetVocab || []).map((v) => v.word || v).join(', ');
  const base = buildSystemPrompt({ unitTitle });
  return (
    base +
    `\n情境对话模式：请用中文引导一场关于「${unitTitle || '本单元'}」的情境对话，` +
    `鼓励用户用英语、并尽量使用这些目标词：${words || '本单元词汇'}。` +
    `当用户说英语时，先自然回应，再温和指出可改进的搭配或语法。`
  );
}

// Helper: extract the first JSON object from a (possibly wrapped) model reply.
export function extractJson(text) {
  if (!text) return null;
  const s = text.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
