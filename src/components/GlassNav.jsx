// Sticky glass top nav + bottom tab bar. Glass only here (overlaps content).
import { useEffect, useState } from 'react';
import { BookOpen, Layers, Brain, AlertTriangle, Sparkles, Sun, Moon, Settings } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';

const TABS = [
  { id: 'learn', label: '学习', icon: BookOpen },
  { id: 'practice', label: '冲刺', icon: Layers },
  { id: 'review', label: '复习', icon: Brain },
  { id: 'errors', label: '错题', icon: AlertTriangle },
  { id: 'ai', label: 'AI', icon: Sparkles },
];

export default function GlassNav({ active, onNavigate }) {
  const { theme, toggleTheme, aiReady, unit } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={`glass-nav fixed inset-x-0 top-0 z-50 ${scrolled ? 'scrolled' : ''}`}
      >
        <div className="mx-auto flex h-14 max-w-[var(--max-grid)] items-center justify-between px-[var(--pad-x)]">
          <button
            className="flex items-center gap-2"
            onClick={() => onNavigate('learn')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-[10px] text-white"
              style={{ background: 'var(--grad-cta)' }}
            >
              <BookOpen size={16} />
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]">
              智背单词
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <span
              className="hidden h-1.5 w-1.5 rounded-full sm:inline-block"
              style={{ background: unit ? 'var(--live)' : 'var(--faint)' }}
              title={unit ? '已选教材单元' : '未选单元'}
            />
            <span className="hidden max-w-[180px] truncate text-[12px] text-[var(--text-3)] sm:inline">
              {unit ? `${unit.editionName} · ${unit.title}` : '未选择教材'}
            </span>
            <button
              onClick={toggleTheme}
              className="press flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="切换主题"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="press relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="设置"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav className="glass-nav fixed inset-x-0 bottom-0 z-50 safe-b">
        <div className="mx-auto flex max-w-[var(--max-grid)] items-center justify-around px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onNavigate(t.id)}
                className="press relative flex flex-1 flex-col items-center gap-0.5 py-2"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <span className="relative">
                  <Icon
                    size={22}
                    className={isActive ? '' : 'opacity-50'}
                    style={isActive ? { color: 'var(--accent)' } : { color: 'var(--text-2)' }}
                  />
                  {t.id === 'ai' && !aiReady && (
                    <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-[var(--trap)]" />
                  )}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={isActive ? { color: 'var(--accent)' } : { color: 'var(--text-3)' }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
