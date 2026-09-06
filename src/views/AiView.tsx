import { useState, useEffect, useRef } from 'react';
import { Sparkles, Settings2, AlertCircle, EyeOff, Eye, ChevronDown, Check, BarChart3, Trash2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { t } from '../lib/i18n.ts';
import type { AiConfig, AiProviderId } from '../types/index.ts';
import { loadTokenUsage, clearTokenUsage, tokenUsageTotal, type TokenUsageData } from '../lib/token-usage.ts';
import TokenUsageDialog from '../components/TokenUsageDialog.tsx';
import {
  AI_PROVIDERS, loadConfig, saveConfig, clearConfig, saveModels, normalizeBaseUrl, isNetworkError,
  testConnection, fetchModels,
} from '../lib/ai.ts';

function ModelSelect({ models, value, onChange }: { models: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="press flex w-full items-center justify-between rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
      >
        <span className="truncate text-left">{value || '—'}</span>
        <ChevronDown size={18} strokeWidth={2.25} className={`ml-2 shrink-0 text-[var(--color-text-3)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-auto rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-overlay)]">
          {models.map((m) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={m === value}
                onClick={() => { onChange(m); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[calc(14px*var(--type-scale))] transition-colors ${m === value ? 'bg-[var(--color-surface-2)] font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]'}`}
              >
                <span className="truncate">{m}</span>
                {m === value && <Check size={16} strokeWidth={2.5} className="ml-2 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AiView() {
  const { refreshAiStatus, locale } = useAppStore();
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [view, setView] = useState<'terms' | 'settings'>('terms');
  const [usage, setUsage] = useState<TokenUsageData>({});
  const [showUsage, setShowUsage] = useState(false);

  useEffect(() => { const c = loadConfig(); setCfg(c); setView(c ? 'settings' : 'terms'); setUsage(loadTokenUsage()); }, []);

  const onSaved = (c: AiConfig) => { setCfg(c); refreshAiStatus(); setView('settings'); };

  const resetUsage = () => {
    clearTokenUsage(); setUsage({});
    useToastStore.getState().show(t('usageResetDone', locale), 'info', 'check');
  };
  const usageTotal = tokenUsageTotal(usage);

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[calc(clamp(20px,5vw,28px)*var(--type-scale))] font-bold tracking-[-0.02em]"><Sparkles size={22} strokeWidth={2.5} className="ai-breathe" style={{ color: 'var(--color-ai)' }} /> {t('aiTitle', locale)}</h2>
        {cfg && <button onClick={() => setView('settings')} className="press flex items-center gap-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]"><Settings2 size={15} strokeWidth={2.25} /> {t('aiConfigure', locale)}</button>}
      </div>
      {view === 'terms' && <ConsentView onAgree={() => setView('settings')} />}
      {view === 'settings' && <SettingsViewInline onSaved={onSaved} initial={cfg} />}
      {/* 累计用量（有记录才显示；纸面印刷风同款结构） */}
      {usageTotal > 0 && (
        <div className="mt-4 rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">
                <BarChart3 size={14} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} aria-hidden="true" /> {t('usageSectionTitle', locale)}
              </div>
              <p className="tnum mt-1 text-[calc(15px*var(--type-scale))] font-bold text-[var(--color-text)]">≈{usageTotal.toLocaleString()} <span className="text-[calc(12px*var(--type-scale))] font-normal text-[var(--color-text-3)]">tokens</span></p>
              <p className="mt-0.5 text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">{t('usageEmptyLine', locale)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => setShowUsage(true)} className="press flex items-center gap-1 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-3 py-1.5 text-[calc(12.5px*var(--type-scale))] font-medium text-[var(--color-text-2)]">{t('usageDetail', locale)}</button>
              <button onClick={resetUsage} aria-label={t('usageReset', locale)} title={t('usageReset', locale)} className="press flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><Trash2 size={15} strokeWidth={2.25} /></button>
            </div>
          </div>
        </div>
      )}
      {showUsage && <TokenUsageDialog usage={usage} locale={locale} onClose={() => { setShowUsage(false); setUsage(loadTokenUsage()); }} />}
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
    <div className="rounded-[var(--radius-hero)] border-2 p-6 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
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
  const [liveModels, setLiveModels] = useState<string[]>(initial?.models ?? []);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const onProvider = (pid: AiProviderId) => {
    const p = AI_PROVIDERS.find((x) => x.id === pid)!;
    setProvider(pid); setBaseUrl(p.baseUrl || ''); setModel(''); setLiveModels([]); setError('');
  };
  const runFetchModels = async () => {
    if (!baseUrl.trim() || !apiKey.trim()) { useToastStore.getState().show(t('aiFetchNeedAuth', locale), 'info', 'alert'); return; }
    setFetching(true); setError('');
    try {
      const models = await fetchModels(baseUrl, apiKey);
      setLiveModels(models);
      if (models.length && !model) setModel(models[0]);
      saveModels(models, normalizeBaseUrl(baseUrl));
      useToastStore.getState().show(t('aiFetchOkMsg', locale, { count: models.length }), 'success', 'check');
    } catch (e) {
      useToastStore.getState().show(isNetworkError((e as Error).message) ? t('aiTestUnreachable', locale) : (e as Error).message, 'error', 'alert');
    } finally { setFetching(false); }
  };
  const runTest = async () => {
    setTesting(true); setError('');
    try {
      const res = await testConnection({ provider, baseUrl, key: apiKey, model } as AiConfig);
      if (res.status === 401) useToastStore.getState().show(t('aiTestAuthFailMsg', locale), 'error', 'alert');
      else if (res.status === 200) useToastStore.getState().show(t('aiTestOkMsg', locale), 'success', 'check');
      try { const models = await fetchModels(baseUrl, apiKey); setLiveModels(models); if (models.length && !model) setModel(models[0]); saveModels(models, normalizeBaseUrl(baseUrl)); } catch { /* keep manual */ }
    } catch (e) { useToastStore.getState().show(isNetworkError((e as Error).message) ? t('aiTestUnreachable', locale) : (e as Error).message, 'error', 'alert'); }
    finally { setTesting(false); }
  };
  const save = () => {
    if (!apiKey.trim() || !baseUrl.trim() || !model.trim()) { setError(t('aiSaveHint', locale)); return; }
    const c: AiConfig = { provider, baseUrl: normalizeBaseUrl(baseUrl), key: apiKey.trim(), model: model.trim(), agreed: true, models: liveModels };
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
    <div className="rounded-[var(--radius-hero)] border-2 p-5 shadow-[var(--shadow-panel)]" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-hairline)' }}>
      <div className="text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiChooseProvider', locale)}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {AI_PROVIDERS.map((p) => <button key={p.id} onClick={() => onProvider(p.id)} className="press rounded-[var(--radius-md)] border-2 px-3.5 py-1.5 text-[calc(13px*var(--type-scale))] font-medium" style={{ borderColor: provider === p.id ? 'var(--color-accent)' : 'var(--color-hairline)', background: provider === p.id ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'var(--color-surface)', color: provider === p.id ? 'var(--color-accent)' : 'var(--color-text-2)' }}>{providerName(p.id)}</button>)}
      </div>
      {currentProvider?.id === 'doubao' && <p className="mt-1.5 text-[calc(12px*var(--type-scale))] text-[var(--color-trap)]">{t('aiProviderDoubaoNote', locale)}</p>}

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiBaseUrlLabel', locale)}</div>
      <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={t('aiBaseUrlPlaceholder', locale)} className="mt-2 w-full rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiApiKeyLabel', locale)}</div>
      <div className="relative mt-2">
        <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] py-2.5 pl-4 pr-11 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
        <button onClick={() => setShowKey((v) => !v)} className="press absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-text-2)]" aria-label={t('aiToggleKey', locale)}>{showKey ? <EyeOff size={16} strokeWidth={2.25} /> : <Eye size={16} strokeWidth={2.25} />}</button>
      </div>

      <div className="mt-4 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('aiModelLabel', locale)}</div>
      {liveModels.length > 0 ? (
        <ModelSelect models={liveModels} value={model} onChange={setModel} />
      ) : (
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('aiModelPlaceholder', locale)} className="mt-2 w-full rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] px-4 py-2.5 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]" />
      )}
      <p className="mt-1 text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiTestHint', locale)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={runTest} disabled={testing || fetching} className="press flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)] disabled:opacity-50">{testing ? t('aiTesting', locale) : t('aiTestConnection', locale)}</button>
        <button onClick={runFetchModels} disabled={testing || fetching} className="press flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)] disabled:opacity-50">{fetching ? t('aiFetching', locale) : (liveModels.length > 0 ? t('aiRefreshModels', locale) : t('aiFetchModels', locale))}</button>
        {liveModels.length > 0 && <span className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">{t('aiModelCount', locale, { count: liveModels.length })}</span>}
      </div>
      {error && <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-trap-soft)] p-3 text-[calc(12.5px*var(--type-scale))] text-[var(--color-trap)]">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <button onClick={clearAll} className="press text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiClearAll', locale)}</button>
        <button onClick={save} className="press rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-6 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white shadow-[var(--shadow-card)] transition hover:brightness-105 hover:translate-x-[1px] hover:translate-y-[1px]">{t('aiSaveConfig', locale)}</button>
      </div>
    </div>
  );
}