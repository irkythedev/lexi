// SettingsView — 设置页：紧凑布局 + 大旗帜口音切换 + 性别(女/男声) + 试听 + i18n
import { useEffect, useState } from 'react';
import { Palette, Volume2, BookOpen, Upload, Check, Play, Loader2 } from 'lucide-react';
import { useAppStore, ACCENT_META, type Accent } from '../stores/useAppStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { Segmented } from '../components/ui/primitives.tsx';
import { requestSpeak, subscribeTtsState } from '../components/FloatingTTS.tsx';
import { t } from '../lib/i18n.ts';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';
import PersonalImport from '../components/PersonalImport.tsx';

const ACCENT_COLORS: Record<Accent, string> = {
  emerald: '#2F6F5E', berry: '#C45B7A', indigo: '#4F5FBF', coral: '#D45A3C',
};

const PREVIEW_TEXT = 'Hello! This is how I sound. Let us learn English together.';

export default function SettingsView() {
  const toast = useToastStore((s) => s.show);
  const { theme, toggleTheme, accent, setAccent, tts, setTts, unit, locale, fontScale, setFontScale } = useAppStore();
  const [editingBook, setEditingBook] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [dragRate, setDragRate] = useState(tts.rate);
  const [previewState, setPreviewState] = useState<'idle' | 'synthesizing' | 'playing'>('idle');

  // 试听时订阅全局 TTS 状态：合成完成 → 自动切换为播放中显示
  useEffect(() => {
    if (previewState === 'idle') return;
    const unsub = subscribeTtsState((s) => {
      if (s === 'playing' && previewState === 'synthesizing') setPreviewState('playing');
    });
    // 8 秒超时兜底（防止 onEnd 未触发导致按钮卡在合成/播放态）
    const t = setTimeout(() => setPreviewState('idle'), 8000);
    return () => { unsub(); clearTimeout(t); };
  }, [previewState]);

  const preview = () => {
    setPreviewState('synthesizing');
    requestSpeak(PREVIEW_TEXT, tts.accent, tts.rate, () => { setPreviewState('idle'); });
  };

  return (
    <div className="mx-auto max-w-[var(--max-read)] space-y-2.5 px-[var(--pad-x)] py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[calc(clamp(20px,5vw,26px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('settingsTitle', locale)}</h2>
      </div>

      {/* 外观：深色模式 + 主题色一行 */}
      <Section icon={Palette} title={t('appearance', locale)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('darkMode', locale)}</span>
            <button onClick={() => { toggleTheme(); toast(theme === 'dark' ? t('toastThemeLight', locale) : t('toastThemeDark', locale), 'info', theme === 'dark' ? 'sun' : 'moon'); }} className="press relative h-7 w-12 rounded-full border-2 transition" style={{ background: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-track)', borderColor: 'var(--color-hairline)' }}>
              <span className="absolute top-0.5 h-5 w-5 rounded-full border-2 border-[var(--color-hairline)] bg-white transition-all" style={{ left: theme === 'dark' ? '26px' : '4px' }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(ACCENT_META) as Accent[]).map((a) => (
              <button key={a} onClick={() => { setAccent(a); toast(t('toastThemeColor', locale, { name: ACCENT_META[a].name }), 'success', 'check'); }} title={ACCENT_META[a].name}
                className="press relative flex h-8 w-8 items-center justify-center rounded-full transition"
                style={{ background: ACCENT_COLORS[a], boxShadow: accent === a ? '0 0 0 2px var(--color-ground), 0 0 0 4px var(--color-accent)' : 'none' }}
                aria-label={ACCENT_META[a].name}>
                {accent === a && <span className="text-white"><Check size={13} strokeWidth={3} /></span>}
              </button>
            ))}
          </div>
        </div>
        <div className="py-1">
          <div className="mb-1.5 flex items-center justify-between text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
            <span>{t('fontSize', locale)}</span>
            <span className="tnum font-semibold text-[var(--color-accent)]">{t('fontSizeScale', locale, { scale: Math.round(fontScale * 100) })}</span>
          </div>
          <input
            type="range" min="0.9" max="1.4" step="0.1"
            value={fontScale}
            onChange={(e) => { setFontScale(snapToStep(parseFloat(e.target.value), 0.9, 0.1)); }}
            onMouseUp={(e) => toast(t('toastFontSize', locale, { scale: Math.round(parseFloat((e.target as HTMLInputElement).value) * 100) }), 'info')}
            onTouchEnd={(e) => toast(t('toastFontSize', locale, { scale: Math.round(parseFloat((e.target as HTMLInputElement).value) * 100) }), 'info')}
            aria-label={t('fontSize', locale)}
            className="w-full thumb-round cursor-pointer"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          {/* 字号档位：文本区间标注（无刻度），可点击选档 */}
          <div className="relative mt-1.5" style={{ height: '1.5rem' }}>
            {(() => {
              const tiers = t('fontSizeTiers', locale).split(',');
              const values = [0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
              const N = values.length;
              return values.map((v, i) => {
                const pct = N > 1 ? (i / (N - 1)) * 100 : 50;
                const active = Math.abs(fontScale - v) < 1e-9;
                return (
                  <button key={i} type="button" onClick={() => { setFontScale(v); toast(t('toastFontSize', locale, { scale: Math.round(v * 100) }), 'info'); }}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
                    <span className={`whitespace-nowrap rounded px-1 py-0.5 text-[calc(11px*var(--type-scale))] leading-tight transition ${active ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-text-3)] hover:text-[var(--color-text-2)]'}`}>
                      {tiers[i]}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </Section>

      <Section icon={Volume2} title={t('ttsSettings', locale)}>
        <div className="py-1">
          <div className="mb-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('accent', locale)}</div>
          {/* 大旗帜口音切换按钮 */}
          <div className="flex gap-2">
            {(['us', 'uk'] as const).map((v) => (
              <button key={v} onClick={() => { setTts({ accent: v }); toast(v === 'us' ? t('toastAccentUs', locale) : t('toastAccentUk', locale), 'info'); }}
                className={`press flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-[calc(15px*var(--type-scale))] font-semibold transition ${tts.accent === v ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'border-[var(--color-hairline)] text-[var(--color-text-2)]'}`}>
                <span className="text-[calc(2rem*var(--type-scale))] leading-none">{v === 'us' ? '🇺🇸' : '🇬🇧'}</span>
                <span>{v === 'us' ? t('accentUs', locale) : t('accentUk', locale)}</span>
              </button>
            ))}
          </div>
        </div>
        {/* 音色 + 试听同一行 */}
        <div className="flex items-end gap-2 py-1">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('voiceGender', locale)}</div>
            <Segmented options={[{ value: 'female', label: t('genderFemale', locale) }, { value: 'male', label: t('genderMale', locale) }]} value={tts.gender} onChange={(v) => { setTts({ gender: v as 'female' | 'male' }); toast(v === 'female' ? t('toastGenderFemale', locale) : t('toastGenderMale', locale), 'info'); }} />
          </div>
          {/* 试听当前口音 + 语速 */}
          <button onClick={preview} disabled={previewState === 'synthesizing'} className="press mb-0.5 flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3.5 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-accent)] disabled:opacity-60">
            {previewState === 'synthesizing' ? <Loader2 size={15} className="animate-spin" /> : previewState === 'playing' ? <Volume2 size={15} /> : <Play size={15} />}
            {previewState === 'synthesizing' ? t('synthesizing', locale) : previewState === 'playing' ? t('previewPlaying', locale) : t('previewVoice', locale)}
          </button>
        </div>
        <div className="mt-2 py-1">
          <div className="mb-1.5 flex items-center justify-between text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
            <span>{t('speed', locale)}</span>
            <span className="tnum font-semibold text-[var(--color-accent)]">{t('speedLabel', locale, { speed: dragRate.toFixed(1) })}</span>
          </div>
          <input
            type="range" min="0.8" max="2.0" step="0.1"
            value={dragRate}
            onChange={(e) => setDragRate(snapToStep(parseFloat(e.target.value), 0.8, 0.1))}
            onMouseUp={() => { setTts({ rate: dragRate }); toast(t('toastRate', locale, { rate: dragRate.toFixed(1) }), 'info'); }}
            onTouchEnd={() => { setTts({ rate: dragRate }); toast(t('toastRate', locale, { rate: dragRate.toFixed(1) }), 'info'); }}
            aria-label={t('speed', locale)}
            className="w-full thumb-round cursor-pointer"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <Scale min={0.8} max={2.0} step={0.1} majorStep={0.2} inset={8}
            onSelect={(v) => { setDragRate(v); setTts({ rate: v }); toast(t('toastRate', locale, { rate: v.toFixed(1) }), 'info'); }} />
        </div>
      </Section>

      <Section icon={BookOpen} title={t('textbook', locale)}>
        {unit ? (
          <div className="py-1">
            <p className="text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{unit.editionName}</p>
            <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{unit.title}（Unit {unit.unit}）</p>
            <button onClick={() => setEditingBook(true)} className="press mt-2 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('textbookChange', locale)}</button>
          </div>
        ) : <p className="py-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('textbookNone', locale)}</p>}
        {editingBook && <div className="mt-2 rounded-[var(--radius-card)] border-2 border-[var(--color-hairline)] p-3"><TextbookSwitcher onSelected={() => { setEditingBook(false); }} /></div>}
      </Section>

      <Section icon={Upload} title={t('personalImport', locale)}>
        <div className="flex items-center justify-between py-1">
          <span className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('personalImportDesc', locale)}</span>
          <button onClick={() => setShowImport(true)} className="press flex items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-1.5 text-[calc(13px*var(--type-scale))] font-medium text-[var(--color-text-2)]">{t('personalImportOpen', locale)}</button>
        </div>
      </Section>

      {showImport && <PersonalImport onClose={() => setShowImport(false)} />}
    </div>
  );
}

/** 吸附到步进值：把任意输入取整到最近的 step 倍数（用于滑块档位吸附） */
function snapToStep(v: number, min: number, step: number): number {
  const r = Math.round((v - min) / step) * step + min;
  return Math.min(1.4, Math.max(min, Math.round(r * 100) / 100));
}

/** 滑块刻度尺：主刻度向上三角+数字，次刻度短线；支持点击选档与档位标注 */
function Scale({ min, max, step, majorStep, majorAnchor = min, inset, captions, onSelect }: {
  min: number; max: number; step: number; majorStep: number; majorAnchor?: number; inset?: number;
  captions?: Record<number, string>; onSelect?: (v: number) => void;
}) {
  const ticks: { v: number; major: boolean }[] = [];
  for (let v = min; v <= max + 1e-9; v = Math.round((v + step) * 100) / 100) {
    const major = Math.abs((v - majorAnchor) / majorStep - Math.round((v - majorAnchor) / majorStep)) < 1e-9;
    ticks.push({ v, major });
  }
  const N = ticks.length;
  return (
    <div className="relative mt-1.5" style={{ height: '2.15rem', marginLeft: inset ? `${inset}px` : 0, marginRight: inset ? `${inset}px` : 0 }}>
      {ticks.map((t, i) => {
        const pct = N > 1 ? (i / (N - 1)) * 100 : 50;
        const caption = captions?.[t.v];
        return (
          <button key={i} type="button" onClick={() => onSelect?.(t.v)} disabled={!onSelect}
            className="absolute flex flex-col items-center disabled:cursor-default"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)', cursor: onSelect ? 'pointer' : 'default' }}
            aria-label={t.v.toFixed(1)}>
            {t.major ? (
              <>
                {/* 主刻度：向上三角箭头 + 数字 */}
                <div className="mx-auto" style={{
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderBottom: '8px solid var(--color-text-3)',
                }} />
                <span className="tnum mt-0.5 block text-center text-[calc(9.5px*var(--type-scale))] text-[var(--color-text-3)]">
                  {t.v.toFixed(1)}
                </span>
              </>
            ) : (
              // 次刻度：短线
              <div className="mx-auto mt-1.5 h-2 w-px bg-[var(--color-text-4)]" />
            )}
            {caption && (
              <span className="mt-0.5 block text-center text-[calc(10px*var(--type-scale))] text-[var(--color-text-2)]">{caption}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]"><Icon size={15} /> {title}</div>
      <div className="rounded-[var(--radius-card)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] p-2.5">{children}</div>
    </div>
  );
}