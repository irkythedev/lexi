import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Puzzle, Zap, ChevronDown, Eye, EyeOff, BookText, ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { KIND_META } from '../lib/utils.ts';
import { Panel, Row, Tag } from '../components/ui/primitives.tsx';
import Flashcard from '../components/Flashcard.tsx';
import CollocationConnector from '../components/CollocationConnector.tsx';
import Sprint from '../components/Sprint.tsx';
import ReadingView from './ReadingView.tsx';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';
import SpeakButton from '../components/SpeakButton.tsx';
import AiAssistPanel, { type AssistContext } from '../components/AiAssistPanel.tsx';
import PaginationBar from '../components/PaginationBar.tsx';
import { usePagination } from '../lib/pagination.ts';
import { UNIT_READINGS } from '../data/textbooks/readings.ts';

export default function LearnView() {
  const { unit, studyItems, tts, locale } = useAppStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<null | 'flash' | 'connector' | 'sprint' | 'reading'>(null);
  const [filter, setFilter] = useState<'all' | 'vocab' | 'phrase' | 'pattern'>('all');
  const [hideCn, setHideCn] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<AssistContext | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const groups = [
    { kind: 'vocab', items: studyItems.filter((i) => i.kind === 'vocab') },
    { kind: 'phrase', items: studyItems.filter((i) => i.kind === 'phrase') },
    { kind: 'pattern', items: studyItems.filter((i) => i.kind === 'pattern') },
  ];
  const visible = filter === 'all' ? studyItems : studyItems.filter((i) => i.kind === filter);
  const pager = usePagination(visible, 20);
  const pagedItems = pager.slice;

  const MODES = [
    { id: 'flash', title: t('flashcard', locale), desc: t('flashcardDesc', locale), icon: Layers, grad: 'var(--grad-cta)' },
    { id: 'connector', title: t('connector', locale), desc: t('connectorDesc', locale), icon: Puzzle, grad: 'var(--grad-cta)' },
    { id: 'sprint', title: t('sprint', locale), desc: t('sprintDesc', locale), icon: Zap, grad: 'var(--grad-cta)' },
  ];

  if (!unit) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-6"><BookText size={42} className="mx-auto text-[var(--color-text-3)]" /><p className="mt-3 mb-4 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('learnEmpty', locale)}</p><TextbookSwitcher onSelected={() => {}} /></div>;
  if (mode === 'flash') return <Flashcard items={studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;
  if (mode === 'reading' && unit) return <ReadingView unit={unit.unit} onExit={() => setMode(null)} />;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white" style={{ background: 'var(--grad-cta)' }}>
        <div className="absolute h-64 w-64 rounded-full opacity-50" style={{ background: 'rgba(255,255,255,0.18)', filter: 'blur(46px)', top: '-80px', right: '-40px' }} />
        <div className="absolute h-48 w-48 rounded-full opacity-50" style={{ background: 'rgba(120,80,255,0.5)', filter: 'blur(50px)', bottom: '-90px', left: '12%' }} />
        <div className="relative">
          <div className="text-[calc(12px*var(--type-scale))] font-semibold tracking-[0.14em] opacity-80">{unit.editionName} · Unit {unit.unit}</div>
          <h2 className="mt-1.5 text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em]">{unit.title}</h2>
          <div className="mt-3 flex gap-4 text-[calc(13px*var(--type-scale))]">
            <span className="glass-chip rounded-[var(--radius-sm)] px-3 py-1">{t('words', locale)} {groups[0].items.length}</span>
            <span className="glass-chip rounded-[var(--radius-sm)] px-3 py-1">{t('phrases', locale)} {groups[1].items.length}</span>
            <span className="glass-chip rounded-[var(--radius-sm)] px-3 py-1">{t('patterns', locale)} {groups[2].items.length}</span>
          </div>
          <button onClick={() => navigate(`/session/${unit.unit}`)} className="press mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-white/20 px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold backdrop-blur">
            {t('startLearning', locale)} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 课文朗读卡片 */}
      {(() => {
        const reading = UNIT_READINGS.find((r) => r.unit === unit.unit);
        if (!reading) return null;
        return (
          <div className="mt-4 overflow-hidden rounded-[var(--radius-hero)] border border-[var(--color-hairline)]">
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white" style={{ background: 'var(--grad-cta)' }}><BookOpen size={20} /></span>
              <div className="min-w-0 flex-1">
                <span className="block text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t('reading', locale)}</span>
                <span className="mt-0.5 block truncate text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{reading.title}</span>
              </div>
              <button onClick={() => setMode('reading')} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-white">{t('enter', locale)} <ArrowRight size={14} /></button>
            </div>
          </div>
        );
      })()}

      {/* 练习入口：合并为一个可展开卡片 */}
      <div className="mt-4 overflow-hidden rounded-[var(--radius-hero)] border border-[var(--color-hairline)]">
        <button onClick={() => setModesOpen((v) => !v)} className="press flex w-full items-center gap-3 p-4 text-left">
          <span className="text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t('practiceModes', locale)}</span>
          <span className="ml-auto text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{t('tapToExpand', locale)}</span>
          <ChevronDown size={18} className="text-[var(--color-text-3)] transition-transform duration-200" style={{ transform: modesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
        <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: modesOpen ? '400px' : '0px' }}>
          <div className="border-t border-[var(--color-hairline)] p-3 space-y-2">
            {MODES.map((m) => { const Icon = m.icon; return (
              <div key={m.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white" style={{ background: m.grad }}><Icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{m.title}</span>
                  <span className="mt-0.5 block text-[calc(12.5px*var(--type-scale))] leading-snug text-[var(--color-text-2)]">{m.desc}</span>
                </span>
                <button onClick={() => setMode(m.id as 'flash')} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3.5 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-white"><span>{t('enter', locale)}</span><ArrowRight size={14} /></button>
              </div>
            ); })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'vocab', 'phrase', 'pattern'] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); pager.reset(); }} className="press rounded-[var(--radius-sm)] px-3 py-1.5 text-[calc(13px*var(--type-scale))] font-medium" style={{ background: filter === f ? 'var(--color-accent)' : 'var(--color-track)', color: filter === f ? '#fff' : 'var(--color-text-2)' }}>{f === 'all' ? t('all', locale) : KIND_META[f].label[locale]}</button>
          ))}
        </div>
        <button onClick={() => setHideCn((v) => !v)} className="press flex items-center gap-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{hideCn ? <EyeOff size={15} /> : <Eye size={15} />}{hideCn ? t('showMeaning', locale) : t('hideMeaning', locale)}</button>
      </div>

      <Panel className="mt-3">
        {pagedItems.map((item) => {
          const meta = KIND_META[item.kind];
          return (
            <Row key={item.id}>
              <div className="flex items-center gap-3">
                <Tag kind={item.kind}>{meta.label[locale]}</Tag>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{item.label}</span>
                    {item.phonetic && <span className="font-mono text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{item.phonetic}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{hideCn ? '————' : item.meaning}</p>
                </div>
                <SpeakButton text={item.label} accent={tts.accent} rate={tts.rate} size={16} color={meta.tint} />
                <button onClick={() => { setAiTarget({ label: item.label, meaning: item.meaning, kind: item.kind }); setAiOpen(true); }} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)]" aria-label="问 AI"><Sparkles size={15} /></button>
              </div>
            </Row>
          );
        })}
      </Panel>
      <PaginationBar page={pager.page} totalPages={pager.totalPages} onPrev={pager.prev} onNext={pager.next} />
      <AiAssistPanel open={aiOpen} onClose={() => setAiOpen(false)} context={aiTarget} />
    </div>
  );
}
