// Learn hub: a clean index of the current unit's items grouped by kind, plus
// entry cards into the three interactive modes (flashcards, collocation
// connector, 5-step sprint). Apple-style: unified panels, hairline dividers.
import { useState } from 'react';
import { Layers, Puzzle, Zap, Volume2, Eye, EyeOff, Star, BookText } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { KIND_META } from '../lib/utils.js';
import { Panel, Row, Tag } from './ui/primitives.jsx';
import Flashcard from './Flashcard.jsx';
import CollocationConnector from './CollocationConnector.jsx';
import Sprint from './Sprint.jsx';
import { requestSpeak } from '../components/FloatingTTS.jsx';

const MODES = [
  { id: 'flash', title: '3D 闪卡', desc: '单词 / 短语 / 句式 正面识别、背面释义与考点', icon: Layers, grad: 'var(--grad-cta)' },
  { id: 'connector', title: '搭配拼图', desc: '点选配对动词词干与正确搭配结构', icon: Puzzle, grad: 'linear-gradient(135deg,#ff9f0a,#ff375f)' },
  { id: 'sprint', title: '5 步微冲刺', desc: '输入→跟读→练习→AI 输出→小测，一气呵成', icon: Zap, grad: 'linear-gradient(135deg,#30d158,#0a84ff)' },
];

export default function LearnView() {
  const { unit, studyItems, tts } = useApp();
  const [mode, setMode] = useState(null); // 'flash' | 'connector' | 'sprint' | null
  const [filter, setFilter] = useState('all');
  const [hideCn, setHideCn] = useState(false);

  if (!unit) {
    return (
      <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-10 text-center">
        <BookText size={42} className="mx-auto text-[var(--text-4)]" />
        <p className="mt-3 text-[15px] text-[var(--text-2)]">请先在底部「学习」页选择教材单元。</p>
      </div>
    );
  }

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
      {/* Unit hero */}
      <div className="rounded-[var(--r-hero)] p-6 text-white" style={{ background: 'var(--grad-cta)' }}>
        <div className="text-[12px] font-semibold tracking-[0.14em] opacity-80">
          {unit.editionName} · 七年级起 · Unit {unit.unit}
        </div>
        <h2 className="mt-1.5 text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">{unit.title}</h2>
        <div className="mt-3 flex gap-4 text-[13px]">
          <span className="rounded-full bg-white/15 px-3 py-1">单词 {groups[0].items.length}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">短语 {groups[1].items.length}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">句式 {groups[2].items.length}</span>
        </div>
      </div>

      {/* Mode cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="press card flex flex-col items-start p-4 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] text-white" style={{ background: m.grad }}>
                <Icon size={20} />
              </span>
              <span className="mt-3 text-[15px] font-semibold text-[var(--text)]">{m.title}</span>
              <span className="mt-1 text-[12.5px] leading-snug text-[var(--text-3)]">{m.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Quick study list with kind filter */}
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'vocab', 'phrase', 'pattern'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="press rounded-full px-3 py-1 text-[13px] font-medium"
              style={{
                background: filter === f ? 'var(--accent)' : 'var(--track)',
                color: filter === f ? '#fff' : 'var(--text-2)',
              }}
            >
              {f === 'all' ? '全部' : KIND_META[f].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setHideCn((v) => !v)}
          className="press flex items-center gap-1 text-[13px] text-[var(--text-2)]"
        >
          {hideCn ? <EyeOff size={15} /> : <Eye size={15} />}
          {hideCn ? '显示释义' : '隐藏释义'}
        </button>
      </div>

      <Panel className="mt-3">
        {visible.map((item, i) => {
          const meta = KIND_META[item.kind];
          const label =
            item.kind === 'vocab' ? item.word : item.kind === 'phrase' ? item.phrase : item.pattern;
          const sub =
            item.kind === 'vocab'
              ? item.phonetic
              : item.kind === 'phrase'
              ? item.meaning
              : item.grammarPoint;
          return (
            <Row key={item.id}>
              <div className="flex items-center gap-3">
                <Tag kind={item.kind}>{meta.label}</Tag>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[16px] font-semibold text-[var(--text)]">{label}</span>
                    {item.phonetic && <span className="font-mono text-[12px] text-[var(--text-3)]">{item.phonetic}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--text-2)]">
                    {hideCn ? '————' : item.meaning || sub}
                  </p>
                </div>
                <button
                  onClick={() => requestSpeak(label, tts.accent, tts.rate)}
                  className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
                  aria-label="朗读"
                >
                  <Volume2 size={16} style={{ color: meta.tint }} />
                </button>
              </div>
            </Row>
          );
        })}
      </Panel>
    </div>
  );
}
