import { useState } from 'react';
import { Layers, Puzzle, Zap } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import Flashcard from '../components/Flashcard.tsx';
import CollocationConnector from '../components/CollocationConnector.tsx';
import Sprint from '../components/Sprint.tsx';

type PracticeMode = 'flash' | 'connector' | 'sprint';

const MODES: { id: PracticeMode; title: string; desc: string; icon: typeof Layers; grad: string }[] = [
  { id: 'flash', title: '3D 闪卡', desc: '记忆识别 + 即时 SRS 评分', icon: Layers, grad: 'var(--grad-cta)' },
  { id: 'connector', title: '搭配拼图', desc: '动词 + 介词 / 形式配对', icon: Puzzle, grad: 'var(--grad-cta)' },
  { id: 'sprint', title: '5 步微冲刺', desc: '输入→跟读→练习→AI→小测', icon: Zap, grad: 'var(--grad-cta)' },
];

export default function PracticeView() {
  const { unit } = useAppStore();
  const [mode, setMode] = useState<PracticeMode | null>(null);
  if (!unit) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-10 text-center text-[15px] text-[var(--color-text-2)]">请先在「学习」页选择教材单元后再来练习。</div>;
  if (mode === 'flash') return <Flashcard items={useAppStore.getState().studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3"><h2 className="text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">练习模式</h2><p className="mt-1 text-[15px] text-[var(--color-text-2)]">{unit.editionName} · {unit.title}</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODES.map((m) => { const Icon = m.icon; return (
          <button key={m.id} onClick={() => setMode(m.id)} className="press card flex items-center gap-4 p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: m.grad }}><Icon size={22} /></span>
            <span><span className="block text-[16px] font-semibold text-[var(--color-text)]">{m.title}</span><span className="mt-0.5 block text-[12.5px] text-[var(--color-text-2)]">{m.desc}</span></span>
          </button>
        ); })}
      </div>
    </div>
  );
}
