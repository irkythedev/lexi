// Practice hub — quick-launch the interactive modes without the full Learn hub.
import { useState } from 'react';
import { Layers, Puzzle, Zap, Mic } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import Flashcard from '../components/Flashcard.jsx';
import CollocationConnector from '../components/CollocationConnector.jsx';
import Sprint from '../components/Sprint.jsx';

export default function PracticeView() {
  const { unit } = useApp();
  const [mode, setMode] = useState(null);

  if (!unit) {
    return (
      <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-10 text-center text-[15px] text-[var(--text-2)]">
        请先在「学习」页选择教材单元后再来练习。
      </div>
    );
  }

  const modes = [
    { id: 'flash', title: '3D 闪卡', desc: '记忆识别 + 即时 SRS 评分', icon: Layers, grad: 'var(--grad-cta)' },
    { id: 'connector', title: '搭配拼图', desc: '动词 + 介词 / 形式配对', icon: Puzzle, grad: 'linear-gradient(135deg,#ff9f0a,#ff375f)' },
    { id: 'sprint', title: '5 步微冲刺', desc: '输入→跟读→练习→AI→小测', icon: Zap, grad: 'linear-gradient(135deg,#30d158,#0a84ff)' },
  ];

  if (mode === 'flash') return <Flashcard items={useApp().studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3">
        <h2 className="text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">练习模式</h2>
        <p className="mt-1 text-[14px] text-[var(--text-2)]">{unit.editionName} · {unit.title}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.id} onClick={() => setMode(m.id)} className="press card flex items-center gap-4 p-4 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: m.grad }}>
                <Icon size={22} />
              </span>
              <span>
                <span className="block text-[16px] font-semibold text-[var(--text)]">{m.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-[var(--text-3)]">{m.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
