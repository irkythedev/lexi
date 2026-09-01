import { useState, useEffect, useRef } from 'react';
import { Sparkles, Settings2, X, Send, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import type { AiConfig, AiProviderId, CorrectionResult, ExamPointResult } from '../types/index.ts';
import {
  AI_PROVIDERS, loadConfig, saveConfig, clearConfig, normalizeBaseUrl, isNetworkError,
  testConnection, fetchModels, buildSystemPrompt, correctionPrompt, examPointPrompt,
  roleplaySystemPrompt, extractJson, streamChat,
} from '../lib/ai.ts';

const CAPS = [
  { id: 'correction', title: '智能造句批改', desc: '输入含本单元短语的句子，AI 结构化批改' },
  { id: 'exam', title: '考点联想出题', desc: '基于短语生成 2 道中考/高考选择题' },
  { id: 'roleplay', title: '情境对话练口语', desc: 'AI 用目标词汇与你英语对话' },
] as const;
type Cap = typeof CAPS[number]['id'];

export default function AiView() {
  const { unit, refreshAiStatus } = useAppStore();
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [view, setView] = useState<'terms' | 'settings' | 'chat'>('terms');

  useEffect(() => { const c = loadConfig(); setCfg(c); setView(c ? 'chat' : 'terms'); }, []);

  const onSaved = (c: AiConfig) => { setCfg(c); refreshAiStatus(); setView('chat'); };

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[calc(clamp(20px,5vw,28px)*var(--type-scale))] font-bold tracking-[-0.02em]"><Sparkles size={22} style={{ color: 'var(--color-accent)' }} /> AI 学习助手</h2>
        {cfg && <button onClick={() => setView('settings')} className="press flex items-center gap-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]"><Settings2 size={15} /> 配置</button>}
      </div>
      {view === 'terms' && <ConsentView onAgree={() => setView('settings')} />}
      {view === 'settings' && <SettingsViewInline onSaved={onSaved} initial={cfg} />}
      {view === 'chat' && cfg && <ChatView cfg={cfg} />}
      {!unit && view === 'chat' && <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-3 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">提示：未选择教材单元时，AI 缺少页面上下文，批改与出题将基于你手动输入的内容。</div>}
    </div>
  );
}

function ConsentView({ onAgree }: { onAgree: () => void }) {
  const TERMS = [
    { t: '服务性质与费用', b: '本站仅提供对话界面，不提供任何 AI 大模型服务，也不收取任何 AI 费用。你需要自行配置自己的服务商 API Key，相关费用与服务均由你与所选服务商结算。' },
    { t: '数据与隐私安全', b: '本应用无后端服务器，不采集、不存储、不中转你的 API Key 与对话内容；所有请求由你的浏览器直接发往你选择的服务商。' },
    { t: '学习辅助声明', b: 'AI 生成内容仅供参考，请务必以学校教材和任课老师的讲解为准。本功能面向中小学生辅助学习，建议在老师或家长指导下使用。' },
    { t: '合规与责任限制', b: '对话内容的生成、处理、计费与留存，由你与所选 AI 服务商依其服务条款自行承担，与本站无关。' },
  ];
  return (
    <div className="rounded-[var(--radius-hero)] border p-6 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2 text-[calc(15px*var(--type-scale))] font-bold text-[var(--color-text)]"><AlertCircle size={18} style={{ color: 'var(--color-accent)' }} /> 使用须知</div>
      <ol className="mt-4 space-y-3">
        {TERMS.map((x, i) => <li key={i} className="text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]"><span className="font-semibold text-[var(--color-text)]">{i + 1}. {x.t}：</span>{x.b}</li>)}
      </ol>
      <button onClick={onAgree} className="press mt-5 w-full rounded-full bg-[var(--color-accent)] py-3 text-[calc(15px*var(--type-scale))] font-semibold text-white">我已阅读并同意，继续配置 →</button>
    </div>
  );
}

function SettingsViewInline({ onSaved, initial }: { onSaved: (c: AiConfig) => void; initial: AiConfig | null }) {
  const [provider, setProvider] = useState<AiProviderId>(initial?.provider ?? 'deepseek');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? AI_PROVIDERS[0].baseUrl);
  const [apiKey, setApiKey] = useState(initial?.key ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [liveModels, setLiveModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [error, setError] = useState('');

  const onProvider = (pid: AiProviderId) => {
    const p = AI_PROVIDERS.find((x) => x.id === pid)!;
    setProvider(pid); setBaseUrl(p.baseUrl || ''); setModel(''); setLiveModels([]); setTestMsg('');
  };
  const runTest = async () => {
    setTesting(true); setError(''); setTestMsg('');
    try {
      const res = await testConnection({ provider, baseUrl, key: apiKey, model } as AiConfig);
      if (res.status === 401) setTestMsg('链路已通（服务商返回鉴权失败，属正常：填入正确 Key 即可）。');
      else if (res.status === 200) setTestMsg('连接成功。');
      try { const models = await fetchModels(baseUrl, apiKey); setLiveModels(models); if (models.length && !model) setModel(models[0]); } catch { /* keep manual */ }
    } catch (e) { setError(isNetworkError((e as Error).message) ? '无法访问该端点（网络不可达或浏览器直连被限制），请改用预设服务商或自建代理。' : (e as Error).message); }
    finally { setTesting(false); }
  };
  const save = () => {
    if (!apiKey.trim() || !baseUrl.trim() || !model.trim()) { setError('请填写 Key、Base URL 与模型名称后再保存。'); return; }
    const c: AiConfig = { provider, baseUrl: normalizeBaseUrl(baseUrl), key: apiKey.trim(), model: model.trim(), agreed: true };
    saveConfig(c); onSaved(c);
  };
  const clearAll = () => { clearConfig(); setApiKey(''); setModel(''); setLiveModels([]); };

  const currentProvider = AI_PROVIDERS.find((p) => p.id === provider);

  return (
    <div className="rounded-[var(--radius-hero)] border p-5 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
      <div className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">① 选择服务商（仅限大陆可用）</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {AI_PROVIDERS.map((p) => <button key={p.id} onClick={() => onProvider(p.id)} className="press rounded-full border px-3.5 py-1.5 text-[calc(13px*var(--type-scale))] font-medium" style={{ borderColor: provider === p.id ? 'var(--color-accent)' : 'var(--color-hairline)', background: provider === p.id ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)', color: provider === p.id ? 'var(--color-accent)' : 'var(--color-text-2)' }}>{p.name}</button>)}
      </div>
      {currentProvider?.note && <p className="mt-1.5 text-[calc(12px*var(--type-scale))] text-[var(--color-trap)]">{currentProvider.note}</p>}

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">② API Key</div>
      <div className="relative mt-2">
        <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] py-2.5 pl-4 pr-11 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
        <button onClick={() => setShowKey((v) => !v)} className="press absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-text-2)]" aria-label="显示/隐藏 Key">{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">③ Base URL</div>
      <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com 或完整端点" className="mt-2 w-full rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">④ 模型</div>
      {liveModels.length > 0 ? (
        <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-2 w-full rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]">
          {liveModels.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      ) : (
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="或手动输入模型名，如 deepseek-chat" className="mt-2 w-full rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
      )}
      <p className="mt-1 text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">测试连接成功后会自动列出可用模型，也可手动输入。</p>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={runTest} disabled={testing} className="press flex items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-4 py-2 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)] disabled:opacity-50">{testing ? '测试中…' : '测试连接'}</button>
        {testMsg && <span className="text-[calc(12px*var(--type-scale))] text-[var(--color-vocab)]">{testMsg}</span>}
      </div>
      {error && <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-trap-soft)] p-3 text-[calc(12.5px*var(--type-scale))] text-[var(--color-trap)]">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <button onClick={clearAll} className="press text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">清除所有 AI 数据</button>
        <button onClick={save} className="press rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">保存配置</button>
      </div>
    </div>
  );
}

function ChatView({ cfg }: { cfg: AiConfig }) {
  const { unit, studyItems } = useAppStore();
  const [cap, setCap] = useState<Cap>('correction');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; data?: CorrectionResult | ExamPointResult }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<{ abort: () => void } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [messages, loading]);

  const buildContext = () => {
    if (!unit) return '';
    const vocab = studyItems.filter((i) => i.kind === 'vocab').map((v) => `${v.label} (${v.meaning})`).join('、');
    const phrases = studyItems.filter((i) => i.kind === 'phrase').map((p) => `${p.label} (${p.meaning})`).join('、');
    const patterns = studyItems.filter((i) => i.kind === 'pattern').map((s) => s.label).join('、');
    return `单元：${unit.title}\n单词：${vocab}\n短语：${phrases}\n句式：${patterns}`;
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setError(''); setInput('');
    let userMsg: string; let sysPrompt: string; let placeholder: string;
    const ctx = buildContext();
    if (cap === 'correction') { userMsg = correctionPrompt(text, studyItems.filter((i) => i.kind === 'phrase').map((i) => i.label)); sysPrompt = buildSystemPrompt({ unitTitle: unit?.title, knowledge: ctx }); placeholder = '正在批改…'; }
    else if (cap === 'exam') { const phrase = studyItems.find((i) => i.kind === 'phrase' && text.includes(i.label)) || studyItems.find((i) => i.kind === 'phrase'); userMsg = examPointPrompt(phrase?.label || text, phrase?.meaning || ''); sysPrompt = buildSystemPrompt({ unitTitle: unit?.title, knowledge: ctx }); placeholder = '正在出题…'; }
    else { userMsg = text || '我们开始用英语聊一聊这个单元的话题吧。'; sysPrompt = roleplaySystemPrompt(unit?.title, studyItems.map((i) => i.label)); placeholder = '正在回应…'; }

    setMessages((m) => [...m, { role: 'user', content: text || (cap === 'roleplay' ? '（开始对话）' : '') }, { role: 'assistant', content: placeholder }]);
    setLoading(true);
    try {
      const ctrl = streamChat({ cfg, systemPrompt: sysPrompt, userMessage: userMsg, onChunk: (_d, full) => {
        setMessages((m) => { const n = [...m]; n[n.length - 1] = { role: 'assistant', content: full }; return n; });
      } });
      abortRef.current = ctrl;
      setTimeout(() => {
        setMessages((m) => { const n = [...m]; const last = n[n.length - 1];
          if (cap === 'exam') { const j = extractJson(last.content) as ExamPointResult | null; if (j?.questions) n[n.length - 1] = { ...last, content: '', data: j }; }
          else if (cap === 'correction') { const j = extractJson(last.content) as CorrectionResult | null; if (j && 'isCorrect' in j) n[n.length - 1] = { ...last, content: '', data: j }; }
          else n[n.length - 1] = { ...last };
          return n; });
        setLoading(false);
      }, 80);
    } catch (e) { setError(isNetworkError((e as Error).message) ? '网络不可达或直连被限制，请检查端点或改用预设服务商。' : (e as Error).message); setLoading(false); setMessages((m) => { const n = [...m]; n[n.length - 1] = { role: 'assistant', content: '（请求失败：' + ((e as Error).message || '未知错误') + '）' }; return n; }); }
  };
  const stop = () => { abortRef.current?.abort(); setLoading(false); };

  return (
    <div className="rounded-[var(--radius-hero)] border shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
      <div className="flex gap-1.5 border-b border-[var(--color-hairline)] p-3">
        {CAPS.map((c) => <button key={c.id} onClick={() => { setCap(c.id); setMessages([]); }} className="press flex-1 rounded-full px-2 py-2 text-[calc(12.5px*var(--type-scale))] font-medium" style={{ background: cap === c.id ? 'var(--color-accent)' : 'var(--color-track)', color: cap === c.id ? '#fff' : 'var(--color-text-2)' }}>{c.title}</button>)}
      </div>
      <div ref={scrollRef} className="h-[52vh] space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <div className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]"><p className="font-semibold text-[var(--color-text-2)]">{CAPS.find((c) => c.id === cap)?.title}</p><p className="mt-1">{CAPS.find((c) => c.id === cap)?.desc}</p>
          {cap === 'correction' && <p className="mt-2">示例：用本单元短语写一句英语，例如 “I look forward to meeting you.”</p>}
          {cap === 'exam' && <p className="mt-2">输入或提及一个短语，例如 “look forward to”。</p>}
          {cap === 'roleplay' && <p className="mt-2">直接开始用英语对话即可，AI 会引导你使用目标词汇。</p>}</div>}
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        <p className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">AI 生成内容仅供参考，请以教材和老师讲解为准。对话不保存、关页即清。</p>
      </div>
      <div className="border-t border-[var(--color-hairline)] p-3">
        {error && <p className="mb-2 text-[calc(12px*var(--type-scale))] text-[var(--color-trap)]">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={cap === 'roleplay' ? '用英语回复 AI…' : '输入内容…'} className="flex-1 resize-none rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
          {loading ? <button onClick={stop} className="press flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-trap)] text-white"><X size={18} /></button>
            : <button onClick={() => send()} className="press flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-white"><Send size={18} /></button>}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: { role: 'user' | 'assistant'; content: string; data?: CorrectionResult | ExamPointResult } }) {
  if (msg.role === 'user') return <div className="flex justify-end"><div className="max-w-[85%] rounded-[var(--radius-card)] bg-[var(--color-accent)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] text-white">{msg.content}</div></div>;
  if (msg.data && 'questions' in msg.data) return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-4">
      <div className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">考点选择题</div>
      {msg.data.questions.map((q, qi) => (
        <div key={qi} className="mt-3"><p className="text-[calc(15px*var(--type-scale))] font-medium text-[var(--color-text)]">{qi + 1}. {q.stem}</p>
          <ol className="mt-1.5 space-y-1">{q.options.map((o, oi) => <li key={oi} className={`rounded-[10px] border px-3 py-1.5 text-[calc(13px*var(--type-scale))] ${oi === q.answer ? 'border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)]' : 'border-[var(--color-hairline)]'}`}>{String.fromCharCode(65 + oi)}. {o}</li>)}
          </ol><p className="mt-1.5 text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">解析：{q.explanation}</p></div>
      ))}
    </div>);
  if (msg.data && 'isCorrect' in msg.data) { const d = msg.data; return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-center justify-between"><span className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">批改结果</span><span className={`rounded-full px-2.5 py-0.5 text-[calc(12px*var(--type-scale))] font-bold ${d.isCorrect ? 'bg-[var(--color-vocab-soft)] text-[var(--color-vocab-deep)]' : 'bg-[var(--color-trap-soft)] text-[var(--color-trap-deep)]'}`}>搭配分 {d.examCollocationScore}</span></div>
      <p className="mt-2 text-[calc(15px*var(--type-scale))] text-[var(--color-text-body)]">{d.correctedSentence}</p>
      <p className="mt-1.5 text-[calc(13px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{d.grammarBreakdown}</p>
    </div>); }
  return <div className="whitespace-pre-wrap rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-4 text-[calc(15px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]">{msg.content}</div>;
}
