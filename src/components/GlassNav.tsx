import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Dumbbell, Brain, AlertTriangle, Sparkles, Sun, Moon, Settings } from 'lucide-react';
import { useAppStore, type Tab } from '../stores/useAppStore.ts';
import type { Locale } from '../types/index.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { t } from '../lib/i18n.ts';
import { FOOTER } from '../lib/footer.ts';
import VersionDialog from './VersionDialog.tsx';

const TABS: { id: Tab; icon: typeof BookOpen; path: string }[] = [
  { id: 'learn', icon: BookOpen, path: '/learn' },
  { id: 'practice', icon: Dumbbell, path: '/practice' },
  { id: 'review', icon: Brain, path: '/review' },
  { id: 'errors', icon: AlertTriangle, path: '/errors' },
  { id: 'settings', icon: Settings, path: '/settings' },
];

export default function GlassNav() {
  const { theme, toggleTheme, aiReady, unit, setTab, locale, setLocale } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeTab: Tab | null = (TABS.find((t) => location.pathname === t.path)?.id ?? null) as Tab | null;

  const go = (t: Tab) => { setTab(t); navigate(TABS.find((x) => x.id === t)!.path); };

  return (
    <>
      <header className={`glass-nav fixed inset-x-0 top-0 z-50 ${scrolled ? 'scrolled' : ''}`}>
        <div className="mx-auto flex h-14 max-w-[var(--max-grid)] items-center justify-between px-[var(--pad-x)]">
          <div role="button" tabIndex={0} onClick={() => navigate('/')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/'); } }} className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-[10px] text-white" style={{ background: 'var(--grad-cta)' }}>
              <BookOpen size={16} />
            </span>
            <span className="flex items-baseline gap-1">
              <span className="text-[calc(15px*var(--type-scale))] font-semibold tracking-[-0.01em] text-[var(--color-text)]">Lexi</span>
              <button type="button" onClick={() => setShowChangelog(true)} title={t('changelogTitle', locale)} className="tnum press text-[calc(10px*var(--type-scale))] font-medium text-[var(--color-text-3)] hover:text-[var(--color-accent)] transition-colors">v{FOOTER.version}</button>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden h-1.5 w-1.5 rounded-full sm:inline-block" style={{ background: unit ? 'var(--color-live)' : 'var(--color-text-4)' }} />
            <span className="hidden max-w-[200px] truncate text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)] sm:inline">
              {unit ? `${unit.editionName} · ${unit.title}` : t('noTextbook', locale)}
            </span>
            <button onClick={() => { toggleTheme(); useToastStore.getState().show(useAppStore.getState().theme === 'dark' ? t('toastThemeLight', locale) : t('toastThemeDark', locale), 'info', useAppStore.getState().theme === 'dark' ? 'sun' : 'moon'); }} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)] dark:hover:bg-white/10" aria-label={t('switchTheme', locale)}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {/* AI 配置入口：未配置时显示红点 */}
            <button onClick={() => navigate('/ai')} className="press relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)] dark:hover:bg-white/10" aria-label={t('aiConfigure', locale)}>
              <Sparkles size={16} />
              {!aiReady && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-trap)]" />}
            </button>
            {/* 语言切换 */}
            <button onClick={() => { const next: Locale = locale === 'zh' ? 'en' : 'zh'; setLocale(next); useToastStore.getState().show(next === 'en' ? 'Language: English' : '已切换语言：中文', 'info'); }} className="press flex h-11 items-center justify-center rounded-full px-2 text-[13px] font-bold text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)] dark:hover:bg-white/10" aria-label={t('langSwitch', locale)}>
              {locale === 'zh' ? 'EN' : '中文'}
            </button>
          </div>
        </div>
      </header>

      <nav className="glass-nav glass-nav-top fixed inset-x-0 bottom-0 z-50 safe-b">
        <div className="mx-auto flex max-w-[var(--max-grid)] items-center justify-around px-2">
          {TABS.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = activeTab === tabItem.id || (location.pathname === '/' && tabItem.id === 'learn');
            return (
              <button key={tabItem.id} onClick={() => go(tabItem.id)} className="press relative flex flex-1 flex-col items-center gap-0.5 py-2" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="relative">
                  <Icon size={22} className={isActive ? '' : 'opacity-50'} style={isActive ? { color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }} />
                </span>
                <span className="text-[calc(11px*var(--type-scale))] font-medium" style={isActive ? { color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }}>{t(`tab${tabItem.id.charAt(0).toUpperCase() + tabItem.id.slice(1)}`, locale)}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {showChangelog && <VersionDialog onClose={() => setShowChangelog(false)} />}
    </>
  );
}