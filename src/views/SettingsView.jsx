// Settings view: theme, TTS accent/speed, re-select textbook, AI status, PWA note.
import { Moon, Sun, Volume2, BookOpen, Sparkles, Check } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { loadConfig } from '../lib/ai.js';
import { Segmented, GhostButton, PrimaryButton } from '../components/ui/primitives.jsx';
import TextbookSwitcher from '../components/TextbookSwitcher.jsx';

export default function SettingsView({ onClose }) {
  const { theme, toggleTheme, tts, setTtsPref, aiReady, refreshAiStatus, unit, selectUnit } = useApp();
  const [editingBook, setEditingBook] = useState(false);

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[clamp(20px,5vw,26px)] font-bold tracking-[-0.02em]">设置</h2>
        {onClose && <GhostButton onClick={onClose}>完成</GhostButton>}
      </div>

      {/* Appearance */}
      <Section icon={theme === 'dark' ? Moon : Sun} title="外观">
        <div className="flex items-center justify-between py-1">
          <span className="text-[14px] text-[var(--text-2)]">深色模式</span>
          <button onClick={toggleTheme} className="press relative h-7 w-12 rounded-full transition" style={{ background: theme === 'dark' ? 'var(--accent)' : 'var(--track)' }}>
            <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all" style={{ left: theme === 'dark' ? '26px' : '4px' }} />
          </button>
        </div>
      </Section>

      {/* TTS */}
      <Section icon={Volume2} title="朗读设置">
        <div className="py-1">
          <div className="mb-1.5 text-[13px] text-[var(--text-2)]">口音</div>
          <Segmented
            options={[{ value: 'us', label: '美式 (en-US)' }, { value: 'uk', label: '英式 (en-GB)' }]}
            value={tts.accent}
            onChange={(v) => setTtsPref({ accent: v })}
          />
        </div>
        <div className="mt-2 py-1">
          <div className="mb-1.5 text-[13px] text-[var(--text-2)]">语速</div>
          <Segmented
            options={[{ value: '0.8', label: '0.8x' }, { value: '1.0', label: '1.0x' }, { value: '1.2', label: '1.2x' }]}
            value={String(tts.rate)}
            onChange={(v) => setTtsPref({ rate: parseFloat(v) })}
          />
        </div>
      </Section>

      {/* Textbook */}
      <Section icon={BookOpen} title="当前教材">
        {unit ? (
          <div className="py-1">
            <p className="text-[14px] font-semibold text-[var(--text)]">{unit.editionName}</p>
            <p className="text-[13px] text-[var(--text-2)]">{unit.title}（Unit {unit.unit}）</p>
            <button onClick={() => setEditingBook(true)} className="press mt-2 rounded-full border border-[var(--hairline)] px-4 py-1.5 text-[13px] text-[var(--text-2)]">
              更换教材 / 单元
            </button>
          </div>
        ) : (
          <p className="py-1 text-[13px] text-[var(--text-3)]">尚未选择教材。</p>
        )}
        {editingBook && (
          <div className="mt-2 rounded-[var(--r-card)] border border-[var(--hairline)] p-3">
            <TextbookSwitcher onSelected={() => { setEditingBook(false); }} />
          </div>
        )}
      </Section>

      {/* AI */}
      <Section icon={Sparkles} title="AI 学习助手">
        <div className="flex items-center justify-between py-1">
          <span className="text-[14px] text-[var(--text-2)]">状态</span>
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: aiReady ? 'var(--vocab)' : 'var(--trap)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: aiReady ? 'var(--vocab)' : 'var(--trap)' }} />
            {aiReady ? '已配置' : '未配置'}
          </span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-[var(--text-3)]">
          配置您自己的服务商 API Key 后，即可使用智能造句批改、考点出题与情境对话。Key 仅存本机浏览器，对话不经任何服务器。
        </p>
      </Section>

      <p className="px-1 text-center text-[11.5px] text-[var(--text-4)]">
        智背单词 · 纯前端 PWA · 数据保存在本机 · v1.0.0
      </p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-[var(--r-panel)] bg-[var(--surface)] p-4 shadow-[var(--sh-panel)]">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-[var(--text-3)]">
        <Icon size={15} /> {title}
      </div>
      {children}
    </div>
  );
}
