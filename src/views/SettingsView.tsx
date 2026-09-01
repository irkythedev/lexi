// SettingsView — 设置页：紧凑布局 + 大旗帜口音切换 + i18n
import { useState } from 'react';
import { Moon, Sun, Volume2, BookOpen, Sparkles, Upload, Check } from 'lucide-react';
import { useAppStore, ACCENT_META, type Accent } from '../stores/useAppStore.ts';
import type { Locale } from '../types/index.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { Segmented } from '../components/ui/primitives.tsx';
import { t } from '../lib/i18n.ts';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';
import PersonalImport from '../components/PersonalImport.tsx';

const ACCENT_COLORS: Record<Accent, string> = {
  emerald: '#1fa07a', berry: '#d94f86', indigo: '#5b6ee8', coral: '#f26d5b',
};

export default function SettingsView() {
  const toast = useToastStore((s) => s.show);
  const { theme, toggleTheme, accent, setAccent, tts, setTts, aiReady, unit, locale, setLocale, fontScale, setFontScale } = useAppStore();
  const [editingBook, setEditingBook] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [dragRate, setDragRate] = useState(tts.rate);

  return (
    <div className="mx-auto max-w-[var(--max-read)] space-y-2.5 px-[var(--pad-x)] py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[calc(clamp(20px,5vw,26px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('settingsTitle', locale)}</h2>
      </div>

      <Section icon={theme === 'dark' ? Moon : Sun} title={t('appearance', locale)}>
        <div className="flex items-center justify-between py-1">
          <span className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('darkMode', locale)}</span>
          <button onClick={() => { toggleTheme(); toast(theme === 'dark' ? t('toastThemeLight', locale) : t('toastThemeDark', locale), 'info', theme === 'dark' ? 'sun' : 'moon'); }} className="press relative h-7 w-12 rounded-full transition" style={{ background: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-track)' }}>
            <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: theme === 'dark' ? '26px' : '4px' }} />
          </button>
        </div>
        <div className="py-1">
          <div className="mb-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('langSwitch', locale)}</div>
          <Segmented options={[{ value: 'zh', label: t('langZh', locale) }, { value: 'en', label: t('langEn', locale) }]} value={locale} onChange={(v) => { setLocale(v as Locale); toast(v === 'en' ? 'Language: English' : '已切换语言：中文', 'info'); }} />
        </div>
        <div className="py-1">
          <div className="mb-2 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('themeColor', locale)}</div>
          <div className="flex items-center gap-3">
            {(Object.keys(ACCENT_META) as Accent[]).map((a) => (
              <button key={a} onClick={() => { setAccent(a); toast(t('toastThemeColor', locale, { name: ACCENT_META[a].name }), 'success', 'check'); }} title={ACCENT_META[a].name}
                className="press relative flex h-10 w-10 items-center justify-center rounded-full transition"
                style={{ background: ACCENT_COLORS[a], boxShadow: accent === a ? `0 0 0 2px var(--color-ground), 0 0 0 4px ${ACCENT_COLORS[a]}` : 'none', opacity: accent === a ? 1 : 0.75 }}
                aria-label={ACCENT_META[a].name}>
                {accent === a && <span className="text-white"><Check size={16} strokeWidth={3} /></span>}
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">{ACCENT_META[accent].name}</div>
        </div>
        <div className="py-1">
          <div className="mb-1.5 flex items-center justify-between text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
            <span>{t('fontSize', locale)}</span>
            <span className="tnum font-semibold text-[var(--color-accent)]">{t('fontSizeScale', locale, { scale: Math.round(fontScale * 100) })}</span>
          </div>
          <input
            type="range" min="0.85" max="1.4" step="0.05"
            value={fontScale}
            onChange={(e) => { const v = parseFloat(e.target.value); setFontScale(v); }}
            aria-label={t('fontSize', locale)}
            className="w-full cursor-pointer"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div className="mt-0.5 flex justify-between text-[calc(10.5px*var(--type-scale))] text-[var(--color-text-3)]"><span>{t('fontSizeMin', locale)}</span><span>{t('fontSizeMax', locale)}</span></div>
        </div>
      </Section>

      <Section icon={Volume2} title={t('ttsSettings', locale)}>
        <div className="py-1">
          <div className="mb-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('accent', locale)}</div>
          {/* 大旗帜口音切换按钮 */}
          <div className="flex gap-2">
            {(['us', 'uk'] as const).map((v) => (
              <button key={v} onClick={() => { setTts({ accent: v }); toast(v === 'us' ? t('toastAccentUs', locale) : t('toastAccentUk', locale), 'info'); }}
                className={`press flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border text-[calc(15px*var(--type-scale))] font-semibold transition ${tts.accent === v ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'border-[var(--color-hairline)] text-[var(--color-text-2)]'}`}>
                <span className="text-[2rem] leading-none">{v === 'us' ? '🇺🇸' : '🇬🇧'}</span>
                <span>{v === 'us' ? t('accentUs', locale) : t('accentUk', locale)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 py-1">
          <div className="mb-1.5 flex items-center justify-between text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
            <span>{t('speed', locale)}</span>
            <span className="tnum font-semibold text-[var(--color-accent)]">{t('speedLabel', locale, { speed: dragRate.toFixed(1) })}</span>
          </div>
          <input
            type="range" min="0.8" max="2.0" step="0.1"
            value={dragRate}
            onChange={(e) => setDragRate(parseFloat(e.target.value))}
            onMouseUp={() => { setTts({ rate: dragRate }); toast(t('toastSpeed', locale, { speed: dragRate.toFixed(1) }), 'info'); }}
            onTouchEnd={() => { setTts({ rate: dragRate }); toast(t('toastSpeed', locale, { speed: dragRate.toFixed(1) }), 'info'); }}
            aria-label={t('speed', locale)}
            className="w-full cursor-pointer"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div className="mt-0.5 flex justify-between text-[calc(10.5px*var(--type-scale))] text-[var(--color-text-3)]"><span>{t('speedRangeMin', locale)}</span><span>{t('speedRangeMax', locale)}</span></div>
        </div>
      </Section>

      <Section icon={BookOpen} title={t('textbook', locale)}>
        {unit ? (
          <div className="py-1">
            <p className="text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{unit.editionName}</p>
            <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{unit.title}（Unit {unit.unit}）</p>
            <button onClick={() => setEditingBook(true)} className="press mt-2 rounded-full border border-[var(--color-hairline)] px-4 py-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('textbookChange', locale)}</button>
          </div>
        ) : <p className="py-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('textbookNone', locale)}</p>}
        {editingBook && <div className="mt-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-3"><TextbookSwitcher onSelected={() => { setEditingBook(false); }} /></div>}
      </Section>

      <Section icon={Upload} title={t('personalImport', locale)}>
        <div className="flex items-center justify-between py-1">
          <span className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('personalImportDesc', locale)}</span>
          <button onClick={() => setShowImport(true)} className="press flex items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-4 py-1.5 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)]">{t('personalImportOpen', locale)}</button>
        </div>
      </Section>

      <Section icon={Sparkles} title={t('aiSettings', locale)}>
        <div className="flex items-center justify-between py-1">
          <span className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('aiStatus', locale)}</span>
          <span className="flex items-center gap-1.5 text-[calc(13px*var(--type-scale))]" style={{ color: aiReady ? 'var(--color-vocab)' : 'var(--color-trap)' }}><span className="h-2 w-2 rounded-full" style={{ background: aiReady ? 'var(--color-vocab)' : 'var(--color-trap)' }} />{aiReady ? t('aiStatusReady', locale) : t('aiStatusNotReady', locale)}</span>
        </div>
        <p className="text-[calc(12.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{t('aiStatusDesc', locale)}</p>
      </Section>

      {showImport && <PersonalImport onClose={() => setShowImport(false)} />}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]"><Icon size={15} /> {title}</div>
      <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-2.5">{children}</div>
    </div>
  );
}