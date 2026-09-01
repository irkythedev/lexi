import { useEffect, useState } from 'react';
import { BookOpen, Layers, Brain, AlertTriangle, Sparkles, Sun, Moon, Settings } from 'lucide-react';
import { useAppStore, type Tab } from '../stores/useAppStore.ts';
import { I18N } from '../lib/utils.ts';

const TABS: { id: Tab; icon: typeof BookOpen }[] = [
  { id: 'learn', icon: BookOpen },
  { id: 'practice', icon: Layers },
  { id: 'review', icon: Brain },
  { id: 'errors', icon: AlertTriangle },
  { id: 'ai', icon: Sparkles },
];

export default function GlassNav() {
  const { theme, toggleTheme, aiReady, unit, tab, setTab } = useAppStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`glass-nav fixed inset-x-0 top-0 z-50 ${scrolled ? 'scrolled' : ''}`}>
        <div className="mx-auto flex h-14 max-w-[var(--max-grid)] items-center justify-between px-[var(--pad-x)]">
          <button onClick={() => setTab('learn')} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-[10px] text-white" style={{ background: 'var(--grad-cta)' }}>
              <BookOpen size={16} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-text)]">智背单词</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="hidden h-1.5 w-1.5 rounded-full sm:inline-block" style={{ background: unit ? 'var(--color-live)' : 'var(--color-text-4)' }} />
            <span className="hidden max-w-[200px] truncate text-[12px] text-[var(--color-text-2)] sm:inline">
              {unit ? `${unit.editionName} · ${unit.title}` : '未选择教材'}
            </span>
            <button onClick={toggleTheme} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)] dark:hover:bg-white/10" aria-label="切换主题">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setTab('settings')} className="press flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)] dark:hover:bg-white/10" aria-label="设置">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav className="glass-nav glass-nav-top fixed inset-x-0 bottom-0 z-50 safe-b">
        <div className="mx-auto flex max-w-[var(--max-grid)] items-center justify-around px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="press relative flex flex-1 flex-col items-center gap-0.5 py-2" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <span className="relative">
                  <Icon size={22} className={isActive ? '' : 'opacity-50'} style={isActive ? { color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }} />
                  {t.id === 'ai' && !aiReady && <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-[var(--color-trap)]" />}
                </span>
                <span className="text-[11px] font-medium" style={isActive ? { color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }}>{I18N[t.id][useAppStore.getState().locale]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
