import { useState, useEffect } from 'react';
import { Sparkles, Settings2, AlertCircle, EyeOff, Eye } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { t } from '../lib/i18n.ts';
import type { AiConfig, AiProviderId } from '../types/index.ts';
import {
  AI_PROVIDERS, loadConfig, saveConfig, clearConfig, normalizeBaseUrl, isNetworkError,
  testConnection, fetchModels,
} from '../lib/ai.ts';

export default function AiView() {
  const { refreshAiStatus, locale } = useAppStore();
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [view, setView] = useState<'terms' | 'settings'>('terms');

  useEffect(() => { const c = loadConfig(); setCfg(c); setView(c ? 'settings' : 'terms'); }, []);

  const onSaved = (c: AiConfig) => { setCfg(c); refreshAiStatus(); setView('settings'); };

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[calc(clamp(20px,5vw,28px)*var(--type-scale))] font-bold tracking-[-0.02em]"><Sparkles size={22} style={{ color: 'var(--color-accent)' }} /> {t('aiTitle', locale)}</h2>
        {cfg && <button onClick={() => setView('settings')} className="press flex items-center gap-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]"><Settings2 size={15} /> {t('aiConfigure', locale)}</button>}
      </div>
      {view === 'terms' && <ConsentView onAgree={() => setView('settings')} />}
      {view === 'settings' && <SettingsViewInline onSaved={onSaved} initial={cfg} />}
    </div>
  );
}

function ConsentView({ onAgree }: { onAgree: () => void }) {
  const locale = useAppStore((s) => s.locale);
  const TERMS = [
    { tk: 'aiTermNature', bk: 'aiTermNatureDesc' },
    { tk: 'aiTermPrivacy', bk: 'aiTermPrivacyDesc' },
    { tk: 'aiTermStudy', bk: 'aiTermStudyDesc' },
    { tk: 'aiTermCompliance', bk: 'aiTermComplianceDesc' },
  ];
  return (
    <div className="rounded-[var(--radius-hero)] border p-6 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
      <div className="flex items-center gap-2 text-[calc(15px*var(--type-scale))] font-bold text-[var(--color-text)]"><AlertCircle size={18} style={{ color: 'var(--color-accent)' }} /> {t('aiNoticeTitle', locale)}</div>
      <ol className="mt-4 space-y-3">
        {TERMS.map((x, i) => <li key={i} className="text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]"><span className="font-semibold text-[var(--color-text)]">{i + 1}. {t(x.tk, locale)}：</span>{t(x.bk, locale)}</li>)}
      </ol>
      <button onClick={onAgree} className="press mt-5 w-full rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] py-3 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('aiAgree', locale)}</button>
    </div>
  );
}

export function SettingsViewInline({ onSaved, initial }: { onSaved: (c: AiConfig) => void; initial: AiConfig | null }) {
  const locale = useAppStore((s) => s.locale);
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
      if (res.status === 401) setTestMsg(t('aiTestAuthFailMsg', locale));
      else if (res.status === 200) setTestMsg(t('aiTestOkMsg', locale));
      try { const models = await fetchModels(baseUrl, apiKey); setLiveModels(models); if (models.length && !model) setModel(models[0]); } catch { /* keep manual */ }
    } catch (e) { setError(isNetworkError((e as Error).message) ? t('aiTestUnreachable', locale) : (e as Error).message); }
    finally { setTesting(false); }
  };
  const save = () => {
    if (!apiKey.trim() || !baseUrl.trim() || !model.trim()) { setError(t('aiSaveHint', locale)); return; }
    const c: AiConfig = { provider, baseUrl: normalizeBaseUrl(baseUrl), key: apiKey.trim(), model: model.trim(), agreed: true };
    saveConfig(c); onSaved(c);
    useToastStore.getState().show(t('aiSavedToast', locale), 'success', 'check');
  };
  const clearAll = () => { clearConfig(); setApiKey(''); setModel(''); setLiveModels([]); useToastStore.getState().show(t('aiClearedToast', locale), 'info', 'alert'); };

  const currentProvider = AI_PROVIDERS.find((p) => p.id === provider);
  const providerName = (pid: AiProviderId): string => {
    const key = `aiProvider${pid.charAt(0).toUpperCase()}${pid.slice(1)}`;
    return t(key, locale);
  };

  return (
    <div className="rounded-[var(--radius-hero)] border p-5 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
      <div className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiChooseProvider', locale)}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {AI_PROVIDERS.map((p) => <button key={p.id} onClick={() => onProvider(p.id)} className="press rounded-[var(--radius-sm)] border px-3.5 py-1.5 text-[calc(13px*var(--type-scale))] font-medium" style={{ borderColor: provider === p.id ? 'var(--color-accent)' : 'var(--color-hairline)', background: provider === p.id ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface)', color: provider === p.id ? 'var(--color-accent)' : 'var(--color-text-2)' }}>{providerName(p.id)}</button>)}
      </div>
      {currentProvider?.id === 'doubao' && <p className="mt-1.5 text-[calc(12px*var(--type-scale))] text-[var(--color-trap)]">{t('aiProviderDoubaoNote', locale)}</p>}

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiApiKeyLabel', locale)}</div>
      <div className="relative mt-2">
        <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full rounded-[12px] border border-[var(--color-input-border)] bg-[var(--color-input-bg)] py-2.5 pl-4 pr-11 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
        <button onClick={() => setShowKey((v) => !v)} className="press absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-text-2)]" aria-label={t('aiToggleKey', locale)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </div>

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiBaseUrlLabel', locale)}</div>
      <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={t('aiBaseUrlPlaceholder', locale)} className="mt-2 w-full rounded-[12px] border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiModelLabel', locale)}</div>
      {liveModels.length > 0 ? (
        <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-2 w-full rounded-[12px] border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]">
          {liveModels.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      ) : (
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('aiModelPlaceholder', locale)} className="mt-2 w-full rounded-[12px] border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
      )}
      <p className="mt-1 text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiTestHint', locale)}</p>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={runTest} disabled={testing} className="press flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-hairline)] px-4 py-2 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)] disabled:opacity-50">{testing ? t('aiTesting', locale) : t('aiTestConnection', locale)}</button>
        {testMsg && <span className="text-[calc(12px*var(--type-scale))] text-[var(--color-vocab)]">{testMsg}</span>}
      </div>
      {error && <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-trap-soft)] p-3 text-[calc(12.5px*var(--type-scale))] text-[var(--color-trap)]">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <button onClick={clearAll} className="press text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiClearAll', locale)}</button>
        <button onClick={save} className="press rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-6 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('aiSaveConfig', locale)}</button>
      </div>
    </div>
  );
}