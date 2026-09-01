import { useState } from 'react';
import { Moon, Sun, Volume2, BookOpen, Sparkles, Upload, Check } from 'lucide-react';
import { useAppStore, ACCENT_META, type Accent } from '../stores/useAppStore.ts';
import { Segmented, GhostButton } from '../components/ui/primitives.tsx';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';
import PersonalImport from '../components/PersonalImport.tsx';

const ACCENT_COLORS: Record<Accent, string> = {
  emerald: '#1fa07a', berry: '#d94f86', indigo: '#5b6ee8', coral: '#f26d5b',
};

export default function SettingsView({ onClose }: { onClose: () => void }) {
  const { theme, toggleTheme, accent, setAccent, tts, setTts, aiReady, unit } = useAppStore();
  const [editingBook, setEditingBook] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="mx-auto max-w-[var(--max-read)] space-y-4 px-[var(--pad-x)] py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[clamp(20px,5vw,26px)] font-bold tracking-[-0.02em]">设置</h2>
        {onClose && <GhostButton onClick={onClose}>完成</GhostButton>}
      </div>

      <Section icon={theme === 'dark' ? Moon : Sun} title="外观">
        <div className="flex items-center justify-between py-1">
          <span className="text-[15px] text-[var(--color-text-2)]">深色模式</span>
          <button onClick={toggleTheme} className="press relative h-7 w-12 rounded-full transition" style={{ background: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-track)' }}>
            <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: theme === 'dark' ? '26px' : '4px' }} />
          </button>
        </div>
        <div className="py-1">
          <div className="mb-2 text-[13px] text-[var(--color-text-2)]">主题色</div>
          <div className="flex items-center gap-3">
            {(Object.keys(ACCENT_META) as Accent[]).map((a) => (
              <button key={a} onClick={() => setAccent(a)} title={ACCENT_META[a].name}
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
          <Segmented options={[{ value: 'us', label: '美式 (en-US)' }, { value: 'uk', label: '英式 (en-GB)' }]} value={tts.accent} onChange={(v) => setTts({ accent: v as 'us' | 'uk' })} />
        </div>
        <div className="mt-2 py-1">
          <div className="mb-1.5 text-[13px] text-[var(--color-text-2)]">语速</div>
          <Segmented options={[{ value: '0.8', label: '0.8x' }, { value: '1.0', label: '1.0x' }, { value: '1.2', label: '1.2x' }]} value={String(tts.rate)} onChange={(v) => setTts({ rate: parseFloat(v) })} />
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

      <p className="px-1 text-center text-[12px] text-[var(--color-text-2)]">Lexi · 纯前端 PWA · 数据保存在本机 · v0.1.0</p>

      {showImport && <PersonalImport onClose={() => setShowImport(false)} />}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-panel)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-panel)]">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-2)]"><Icon size={15} /> {title}</div>
      {children}
    </div>
  );
}
