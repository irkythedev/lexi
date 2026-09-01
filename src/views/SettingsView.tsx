import { useState } from 'react';
import { Moon, Sun, Volume2, BookOpen, Sparkles, Upload, Check } from 'lucide-react';
import { useAppStore, ACCENT_META, type Accent } from '../stores/useAppStore.ts';
import type { Locale } from '../types/index.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { Segmented } from '../components/ui/primitives.tsx';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';
import PersonalImport from '../components/PersonalImport.tsx';

const ACCENT_COLORS: Record<Accent, string> = {
  emerald: '#1fa07a', berry: '#d94f86', indigo: '#5b6ee8', coral: '#f26d5b',
};

export default function SettingsView() {
  const toast = useToastStore((s) => s.show);
  const { theme, toggleTheme, accent, setAccent, tts, setTts, aiReady, unit, locale, setLocale } = useAppStore();
  const [editingBook, setEditingBook] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [dragRate, setDragRate] = useState(tts.rate);

  return (
    <div className="mx-auto max-w-[var(--max-read)] space-y-2.5 px-[var(--pad-x)] py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[clamp(20px,5vw,26px)] font-bold tracking-[-0.02em]">设置</h2>
      </div>

      <Section icon={theme === 'dark' ? Moon : Sun} title="外观">
        <div className="flex items-center justify-between py-1">
          <span className="text-[15px] text-[var(--color-text-2)]">深色模式</span>
          <button onClick={() => { toggleTheme(); toast(theme === 'dark' ? '已切换到浅色模式' : '已切换到深色模式', 'info', theme === 'dark' ? 'sun' : 'moon'); }} className="press relative h-7 w-12 rounded-full transition" style={{ background: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-track)' }}>
            <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: theme === 'dark' ? '26px' : '4px' }} />
          </button>
        </div>
        <div className="py-1">
          <div className="mb-1.5 text-[13px] text-[var(--color-text-2)]">语言 / Language</div>
          <Segmented options={[{ value: 'zh', label: '中文' }, { value: 'en', label: 'EN' }]} value={locale} onChange={(v) => { setLocale(v as Locale); toast(v === 'en' ? 'Language: English' : '已切换语言：中文', 'info'); }} />
        </div>
        <div className="py-1">
          <div className="mb-2 text-[13px] text-[var(--color-text-2)]">主题色</div>
          <div className="flex items-center gap-3">
            {(Object.keys(ACCENT_META) as Accent[]).map((a) => (
              <button key={a} onClick={() => { setAccent(a); toast(`已切换主题色：${ACCENT_META[a].name}`, 'success', 'check'); }} title={ACCENT_META[a].name}
                className="press relative flex h-10 w-10 items-center justify-center rounded-full transition"
                style={{ background: ACCENT_COLORS[a], boxShadow: accent === a ? `0 0 0 2px var(--color-ground), 0 0 0 4px ${ACCENT_COLORS[a]}` : 'none', opacity: accent === a ? 1 : 0.75 }}
                aria-label={ACCENT_META[a].name}>
                {accent === a && <span className="text-white"><Check size={16} strokeWidth={3} /></span>}
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-[12px] text-[var(--color-text-3)]">{ACCENT_META[accent].name}</div>
        </div>
      </Section>

      <Section icon={Volume2} title="朗读设置">
        <div className="py-1">
          <div className="mb-1.5 text-[13px] text-[var(--color-text-2)]">口音</div>
          <Segmented options={[{ value: 'us', label: '🇺🇸' }, { value: 'uk', label: '🇬🇧' }]} value={tts.accent} onChange={(v) => { setTts({ accent: v as 'us' | 'uk' }); toast(v === 'us' ? '已切换美式口音' : '已切换英式口音', 'info'); }} />
        </div>
        <div className="mt-2 py-1">
          <div className="mb-1.5 flex items-center justify-between text-[13px] text-[var(--color-text-2)]">
            <span>语速</span>
            <span className="tnum font-semibold text-[var(--color-accent)]">{dragRate.toFixed(1)}x</span>
          </div>
          <input
            type="range" min="0.8" max="2.0" step="0.1"
            value={dragRate}
            onChange={(e) => setDragRate(parseFloat(e.target.value))}
            onMouseUp={() => { setTts({ rate: dragRate }); toast(`语速已调整为 ${dragRate.toFixed(1)}x`, 'info'); }}
            onTouchEnd={() => { setTts({ rate: dragRate }); toast(`语速已调整为 ${dragRate.toFixed(1)}x`, 'info'); }}
            aria-label="语速"
            className="w-full cursor-pointer"
            style={{ accentColor: 'var(--color-accent)' }}
          />
          <div className="mt-0.5 flex justify-between text-[10.5px] text-[var(--color-text-3)]"><span>0.8x</span><span>2.0x</span></div>
        </div>
      </Section>

      <Section icon={BookOpen} title="当前教材">
        {unit ? (
          <div className="py-1">
            <p className="text-[15px] font-semibold text-[var(--color-text)]">{unit.editionName}</p>
            <p className="text-[13px] text-[var(--color-text-2)]">{unit.title}（Unit {unit.unit}）</p>
            <button onClick={() => setEditingBook(true)} className="press mt-2 rounded-full border border-[var(--color-hairline)] px-4 py-1.5 text-[13px] text-[var(--color-text-2)]">更换教材 / 单元</button>
          </div>
        ) : <p className="py-1 text-[13px] text-[var(--color-text-2)]">尚未选择教材。</p>}
        {editingBook && <div className="mt-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-3"><TextbookSwitcher onSelected={() => { setEditingBook(false); }} /></div>}
      </Section>

      <Section icon={Upload} title="个人导入">
        <div className="flex items-center justify-between py-1">
          <span className="text-[15px] text-[var(--color-text-2)]">导入自己的单词 / 短语 / 句式清单</span>
          <button onClick={() => setShowImport(true)} className="press flex items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-4 py-1.5 text-[13px] font-medium text-[var(--color-text-2)]">打开导入</button>
        </div>
      </Section>

      <Section icon={Sparkles} title="AI 学习助手">
        <div className="flex items-center justify-between py-1">
          <span className="text-[15px] text-[var(--color-text-2)]">状态</span>
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: aiReady ? 'var(--color-vocab)' : 'var(--color-trap)' }}><span className="h-2 w-2 rounded-full" style={{ background: aiReady ? 'var(--color-vocab)' : 'var(--color-trap)' }} />{aiReady ? '已配置' : '未配置'}</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-[var(--color-text-2)]">配置您自己的服务商 API Key 后，即可使用智能造句批改、考点出题与情境对话。Key 仅存本机浏览器，对话不经任何服务器。</p>
      </Section>

      {showImport && <PersonalImport onClose={() => setShowImport(false)} />}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-2)]"><Icon size={15} /> {title}</div>
      <div className="rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-2.5">{children}</div>
    </div>
  );
}
