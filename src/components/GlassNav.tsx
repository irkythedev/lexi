import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, PencilLine, RotateCcw, AlertTriangle, Settings, Sparkles, Sun, Moon } from 'lucide-react';
import { useAppStore, type Tab } from '../stores/useAppStore.ts';
import type { Locale } from '../types/index.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { t } from '../lib/i18n.ts';
import { FOOTER } from '../lib/footer.ts';
import VersionDialog from './VersionDialog.tsx';

const ICON_STROKE = 2.5; // 导航/工具图标统一线宽，贴近 2px 墨线卡（纸面笔触）

const TABS: { id: Tab; icon: typeof BookOpen; path: string }[] = [
  { id: 'learn', icon: BookOpen, path: '/learn' },
  { id: 'practice', icon: PencilLine, path: '/practice' },
  { id: 'review', icon: RotateCcw, path: '/review' },
  { id: 'errors', icon: AlertTriangle, path: '/errors' },
  { id: 'settings', icon: Settings, path: '/settings' },
];

export default function GlassNav() {
  const { theme, toggleTheme, aiReady, setTab, locale, setLocale } = useAppStore();
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
            <img src="/icon-192.png" alt="Lexi" className="h-10 w-10 shrink-0 rounded-[12px] border-2 border-[var(--color-hairline)] shadow-[var(--shadow-card)]" style={{ background: '#FAEFD9' }} />
            <span className="flex flex-col items-start gap-[2px]">
              <span className="text-[calc(20px*var(--type-scale))] font-bold leading-none tracking-[-0.02em] text-[var(--color-text)]">Lexi</span>
              <button type="button" onClick={() => setShowChangelog(true)} title={t('changelogTitle', locale)} className="tnum text-[calc(11px*var(--type-scale))] font-medium leading-none text-[var(--color-text-3)] transition-colors hover:text-[var(--color-accent)]">v{FOOTER.version}</button>
            </span>
          </div>
          {/* 桌面端导航：顶部横排，替代底部 tab 栏 */}
          <nav className="hidden h-full items-center gap-1 md:flex" aria-label="主导航">
            {TABS.map((tabItem) => {
              const Icon = tabItem.icon;
              const isActive = activeTab === tabItem.id || (location.pathname === '/' && tabItem.id === 'learn');
              return (
                <button key={tabItem.id} onClick={() => go(tabItem.id)} className={`press relative flex h-9 items-center gap-1.5 rounded-full border-2 px-3.5 transition ${isActive ? 'border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]' : 'border-transparent bg-transparent'}`} style={{ cursor: 'pointer', color: isActive ? 'var(--color-accent)' : 'var(--color-text-2)' }}>
                  <Icon size={16} strokeWidth={ICON_STROKE} style={isActive ? { color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }} />
                  <span className={`text-[calc(14px*var(--type-scale))] ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(`tab${tabItem.id.charAt(0).toUpperCase() + tabItem.id.slice(1)}`, locale)}</span>
                  {isActive && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {/* 主题切换：40px 圆，1.5px hairline，图标 text */}
            <button onClick={() => { const cur = useAppStore.getState().theme; toggleTheme(); useToastStore.getState().show(cur === 'dark' ? t('toastThemeLight', locale) : t('toastThemeDark', locale), 'info', cur === 'dark' ? 'sun' : 'moon'); }} className="press flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--color-hairline)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]" aria-label={t('switchTheme', locale)}>
              {theme === 'dark' ? <Sun size={18} strokeWidth={ICON_STROKE} /> : <Moon size={18} strokeWidth={ICON_STROKE} />}
            </button>
            {/* AI 配置入口：32px 圆，未配置红点保留；AI 主识别用原始闪光星（Sparkles） */}
            <button onClick={() => navigate('/ai')} className="press relative flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--color-hairline)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]" aria-label={t('aiConfigure', locale)}>
              <Sparkles size={18} strokeWidth={ICON_STROKE} className="ai-breathe" style={{ color: 'var(--color-ai)' }} />
              {!aiReady && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--color-trap)]" />}
            </button>
            {/* 语言切换：与主题/AI 同规格 32px 圆，文字随当前语言（zh→EN / en→中） */}
            <button onClick={() => { const next: Locale = locale === 'zh' ? 'en' : 'zh'; setLocale(next); useToastStore.getState().show(next === 'en' ? 'Language: English' : '已切换语言：中文', 'info'); }} className="press flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-[var(--color-hairline)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]" aria-label={t('langSwitch', locale)}>
              <span className="text-[calc(12px*var(--type-scale))] font-semibold leading-none">{locale === 'zh' ? 'EN' : '中'}</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="glass-nav glass-nav-top fixed inset-x-0 bottom-0 z-50 safe-b md:hidden">
        <div className="mx-auto flex max-w-[var(--max-grid)] items-center justify-around px-2 pb-2">
          {TABS.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = activeTab === tabItem.id || (location.pathname === '/' && tabItem.id === 'learn');
            return (
              <button key={tabItem.id} onClick={() => go(tabItem.id)} className={`press relative mx-1 flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius-md)] py-2 transition ${isActive ? 'border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]' : 'border-2 border-transparent'}`} style={{ cursor: 'pointer' }}>
                <span className="relative">
                  <Icon size={22} strokeWidth={ICON_STROKE} style={isActive ? { color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }} />
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
