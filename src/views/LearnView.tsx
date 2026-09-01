import { useState } from 'react';
import { Layers, Puzzle, Zap, Volume2, Eye, EyeOff, BookText } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { KIND_META } from '../lib/utils.ts';
import { Panel, Row, Tag } from '../components/ui/primitives.tsx';
import Flashcard from '../components/Flashcard.tsx';
import CollocationConnector from '../components/CollocationConnector.tsx';
import Sprint from '../components/Sprint.tsx';
import { requestSpeak } from '../components/FloatingTTS.tsx';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';

const MODES = [
  { id: 'flash', title: '3D 闪卡', desc: '单词 / 短语 / 句式 正面识别、背面释义与考点', icon: Layers, grad: 'var(--grad-cta)' },
  { id: 'connector', title: '搭配拼图', desc: '点选配对动词词干与正确搭配结构', icon: Puzzle, grad: 'var(--grad-cta)' },
  { id: 'sprint', title: '5 步微冲刺', desc: '输入→跟读→练习→AI→小测，一气呵成', icon: Zap, grad: 'var(--grad-cta)' },
];

export default function LearnView() {
  const { unit, studyItems, tts, locale } = useAppStore();
  const [mode, setMode] = useState<null | 'flash' | 'connector' | 'sprint'>(null);
  const [filter, setFilter] = useState<'all' | 'vocab' | 'phrase' | 'pattern'>('all');
  const [hideCn, setHideCn] = useState(false);

  if (!unit) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-6"><BookText size={42} className="mx-auto text-[var(--color-text-3)]" /><p className="mt-3 mb-4 text-center text-[15px] text-[var(--color-text-2)]">请先选择教材单元。</p><TextbookSwitcher onSelected={() => {}} /></div>;
  if (mode === 'flash') return <Flashcard items={studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;

  const groups = [
    { kind: 'vocab', items: studyItems.filter((i) => i.kind === 'vocab') },
    { kind: 'phrase', items: studyItems.filter((i) => i.kind === 'phrase') },
    { kind: 'pattern', items: studyItems.filter((i) => i.kind === 'pattern') },
  ];
  const visible = filter === 'all' ? studyItems : studyItems.filter((i) => i.kind === filter);

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white" style={{ background: 'var(--grad-cta)' }}>
        <div className="absolute h-64 w-64 rounded-full opacity-50" style={{ background: 'rgba(255,255,255,0.18)', filter: 'blur(46px)', top: '-80px', right: '-40px' }} />
        <div className="absolute h-48 w-48 rounded-full opacity-50" style={{ background: 'rgba(120,80,255,0.5)', filter: 'blur(50px)', bottom: '-90px', left: '12%' }} />
        <div className="relative">
          <div className="text-[12px] font-semibold tracking-[0.14em] opacity-80">{unit.editionName} · Unit {unit.unit}</div>
          <h2 className="mt-1.5 text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">{unit.title}</h2>
          <div className="mt-3 flex gap-4 text-[13px]">
            <span className="glass-chip rounded-full px-3 py-1">单词 {groups[0].items.length}</span>
            <span className="glass-chip rounded-full px-3 py-1">短语 {groups[1].items.length}</span>
            <span className="glass-chip rounded-full px-3 py-1">句式 {groups[2].items.length}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODES.map((m) => { const Icon = m.icon; return (
          <button key={m.id} onClick={() => setMode(m.id as 'flash')} className="press card flex flex-col items-start p-4 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] text-white" style={{ background: m.grad }}><Icon size={20} /></span>
            <span className="mt-3 text-[15px] font-semibold text-[var(--color-text)]">{m.title}</span>
            <span className="mt-1 text-[12.5px] leading-snug text-[var(--color-text-2)]">{m.desc}</span>
          </button>
        ); })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'vocab', 'phrase', 'pattern'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="press rounded-full px-3 py-1.5 text-[13px] font-medium" style={{ background: filter === f ? 'var(--color-accent)' : 'var(--color-track)', color: filter === f ? '#fff' : 'var(--color-text-2)' }}>{f === 'all' ? '全部' : KIND_META[f].label[locale]}</button>
          ))}
        </div>
        <button onClick={() => setHideCn((v) => !v)} className="press flex items-center gap-1 text-[13px] text-[var(--color-text-2)]">{hideCn ? <EyeOff size={15} /> : <Eye size={15} />}{hideCn ? '显示释义' : '隐藏释义'}</button>
      </div>

      <Panel className="mt-3">
        {visible.map((item) => {
          const meta = KIND_META[item.kind];
          return (
            <Row key={item.id}>
              <div className="flex items-center gap-3">
                <Tag kind={item.kind}>{meta.label[locale]}</Tag>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[16px] font-semibold text-[var(--color-text)]">{item.label}</span>
                    {item.phonetic && <span className="font-mono text-[12px] text-[var(--color-text-2)]">{item.phonetic}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--color-text-2)]">{hideCn ? '————' : item.meaning}</p>
                </div>
                <button onClick={() => requestSpeak(item.label, tts.accent, tts.rate)} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]" aria-label="朗读"><Volume2 size={16} style={{ color: meta.tint }} /></button>
              </div>
            </Row>
          );
        })}
      </Panel>
    </div>
  );
}
