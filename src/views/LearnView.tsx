import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RectangleHorizontal, Puzzle, Timer, ChevronDown, Eye, EyeOff, BookText, ArrowRight, TextQuote, ScanText, LayoutGrid } from 'lucide-react';
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
import { findQuote, truncateQuote } from '../data/textbooks/unit_texts.ts';
import { UNIT_READINGS } from '../data/textbooks/readings.ts';
import WordHighlight from '../components/WordHighlight.tsx';

export default function LearnView() {
  const { unit, studyItems, tts, locale } = useAppStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<null | 'flash' | 'connector' | 'sprint' | 'reading'>(null);
  const [filter, setFilter] = useState<'all' | 'vocab' | 'phrase' | 'pattern'>('all');
  const [hideCn, setHideCn] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<AssistContext | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quoteFull, setQuoteFull] = useState<Set<string>>(new Set());

  const groups = [
    { kind: 'vocab', items: studyItems.filter((i) => i.kind === 'vocab') },
    { kind: 'phrase', items: studyItems.filter((i) => i.kind === 'phrase') },
    { kind: 'pattern', items: studyItems.filter((i) => i.kind === 'pattern') },
  ];
  const visible = filter === 'all' ? studyItems : studyItems.filter((i) => i.kind === filter);
  const pager = usePagination(visible, 20);
  const pagedItems = pager.slice;

  const MODES = [
    { id: 'flash', title: t('flashcard', locale), desc: t('flashcardDesc', locale), icon: RectangleHorizontal },
    { id: 'connector', title: t('connector', locale), desc: t('connectorDesc', locale), icon: Puzzle },
    { id: 'sprint', title: t('sprint', locale), desc: t('sprintDesc', locale), icon: Timer },
  ];

  if (!unit) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-6"><BookText size={42} strokeWidth={2} className="mx-auto text-[var(--color-text-3)]" /><p className="mt-3 mb-4 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('learnEmpty', locale)}</p><TextbookSwitcher onSelected={() => {}} /></div>;
  if (mode === 'flash') return <Flashcard items={studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;
  if (mode === 'reading' && unit) return <ReadingView unit={unit.unit} onExit={() => setMode(null)} />;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      {/* 单元封面卡（纸面 + 墨线，非绿满铺） */}
      <div className="relative overflow-hidden rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-panel)]">
        <div className="relative">
          <div className="text-[calc(12px*var(--type-scale))] font-semibold tracking-[0.12em] text-[var(--color-accent)]">{unit.editionName} · Unit {unit.unit}</div>
          <h2 className="mt-1.5 text-[calc(clamp(24px,5vw,34px)*var(--type-scale))] font-bold leading-tight tracking-[-0.03em] text-[var(--color-text)]">{unit.title}</h2>
          {/* 3 张 KPI 小卡：大数字 + 脚下小胶囊 */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                { kind: 'vocab' as const, n: groups[0].items.length, label: t('words', locale), tint: 'var(--color-vocab)', deep: 'var(--color-vocab-deep)' },
                { kind: 'phrase' as const, n: groups[1].items.length, label: t('phrases', locale), tint: 'var(--color-phrase)', deep: 'var(--color-phrase-deep)' },
                { kind: 'pattern' as const, n: groups[2].items.length, label: t('patterns', locale), tint: 'var(--color-pattern)', deep: 'var(--color-pattern-deep)' },
              ]
            ).map((k) => (
              <div key={k.kind} className="rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-3 text-center shadow-[var(--shadow-card)]">
                <div className="tnum text-[calc(clamp(26px,6vw,36px)*var(--type-scale))] font-extrabold leading-none" style={{ color: k.tint }}>{k.n}</div>
                <span className="mt-2 inline-block rounded-[var(--radius-pill)] px-2 py-0.5 text-[calc(10px*var(--type-scale))] font-semibold" style={{ background: 'var(--color-track)', color: k.deep }}>{k.label}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate(`/session/${unit.unit}`)} className="press mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white shadow-[var(--shadow-card)] transition hover:brightness-105 hover:translate-x-[1px] hover:translate-y-[1px]">
            {t('startLearning', locale)} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 课文朗读卡片 */}
      {(() => {
        const reading = UNIT_READINGS.find((r) => r.unit === unit.unit);
        if (!reading) return null;
        return (
          <div className="mt-4 overflow-hidden rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-accent)] shadow-[var(--shadow-card)]" style={{ background: 'var(--color-surface)', border: '2px solid var(--color-hairline)' }}><TextQuote size={20} strokeWidth={2.5} /></span>
              <div className="min-w-0 flex-1">
                <span className="block text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t('reading', locale)}</span>
                <span className="mt-0.5 block truncate text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{reading.title}</span>
              </div>
              <button onClick={() => setMode('reading')} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-3.5 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-white">{t('enter', locale)} <ArrowRight size={14} strokeWidth={2.25} /></button>
            </div>
          </div>
        );
      })()}

      {/* 练习入口：合并为一个可展开卡片 */}
      <div className="mt-4 overflow-hidden rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <button onClick={() => setModesOpen((v) => !v)} className="press flex w-full items-center gap-3 p-4 text-left">
          <span className="text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t('practiceModes', locale)}</span>
          <span className="ml-auto text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{t('tapToExpand', locale)}</span>
          <ChevronDown size={18} strokeWidth={2.25} className="text-[var(--color-text-3)] transition-transform duration-200" style={{ transform: modesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
        <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: modesOpen ? '400px' : '0px' }}>
          <div className="border-t border-[var(--color-hairline)] p-3 space-y-2">
            {MODES.map((m) => { const Icon = m.icon; return (
              <div key={m.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-[var(--color-hairline)] p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-accent)] shadow-[var(--shadow-card)]" style={{ background: 'var(--color-surface)', border: '2px solid var(--color-hairline)' }}><Icon size={20} strokeWidth={2.5} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{m.title}</span>
                  <span className="mt-0.5 block text-[calc(12.5px*var(--type-scale))] leading-snug text-[var(--color-text-2)]">{m.desc}</span>
                </span>
                <button onClick={() => setMode(m.id as 'flash')} className="press inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-3.5 py-1.5 text-[calc(13px*var(--type-scale))] font-semibold text-white shadow-[var(--shadow-card)]"><span>{t('enter', locale)}</span><ArrowRight size={14} strokeWidth={2.25} /></button>
              </div>
            ); })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="seg seg--bare">
          {(['all', 'vocab', 'phrase', 'pattern'] as const).map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => { setFilter(f); pager.reset(); }}>
              <span className="inline-flex items-center gap-1.5">
                {(() => { const Icon = f === 'all' ? LayoutGrid : KIND_META[f].icon; return <Icon size={14} strokeWidth={2.25} color={f === 'all' ? 'var(--color-text-3)' : KIND_META[f].tint} aria-hidden="true" />; })()}
                <span>{f === 'all' ? t('all', locale) : KIND_META[f].short[locale]}</span>
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => setHideCn((v) => !v)} className="press flex items-center gap-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{hideCn ? <EyeOff size={15} strokeWidth={2.25} /> : <Eye size={15} strokeWidth={2.25} />}{hideCn ? t('showMeaning', locale) : t('hideMeaning', locale)}</button>
      </div>

      <Panel className="mt-3">
        {pagedItems.map((item) => {
          const meta = KIND_META[item.kind];
          const expanded = expandedId === item.id;
          const quote = unit ? findQuote(item, unit.unit) : null;
          return (
            <Row key={item.id} onClick={() => setExpandedId(expanded ? null : item.id)}>
              <div className="w-full">
                <div className="flex items-center gap-3">
                  <Tag kind={item.kind} icon />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <span className="break-words text-[calc(16px*var(--type-scale))] font-semibold leading-snug text-[var(--color-text)]">{item.label}</span>
                      {item.phonetic && <span className="break-words font-mono text-[calc(12px*var(--type-scale))] leading-snug text-[var(--color-text-2)]">{item.phonetic}</span>}
                    </div>
                    <p className="mt-1 truncate text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{hideCn ? '————' : item.meaning}</p>
                  </div>
                  {/* 朗读 + AI + 展开指示 统一成组，gap 2px（紧凑可点）；每钮热区 36px */} 
                  <div className="flex shrink-0 items-center gap-0.5">
                    <SpeakButton text={item.label} accent={tts.accent} rate={tts.rate} size={16} color={meta.tint} compact />
                    <button onClick={(e) => { e.stopPropagation(); setAiTarget({ label: item.label, meaning: item.meaning, kind: item.kind, quote: quote ?? undefined }); setAiOpen(true); }} className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)]" aria-label="问 AI"><ScanText size={16} strokeWidth={2.25} /></button>
                    {/* 展开指示：仅当词条在课文实际出现时显示，放最右；无 quote 时用同宽占位保持图标对齐 */}
                    {quote
                      ? <span className="flex h-9 w-9 shrink-0 items-center justify-center"><ChevronDown size={14} strokeWidth={2.25} className={`text-[var(--color-text-3)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} /></span>
                      : <span className="h-9 w-9 shrink-0" aria-hidden="true" />}
                  </div>
                </div>
                {/* 课文原句展开区：仅当词条在课文实际出现时显示；内嵌浅底条 + 左 kind tint 竖线 */}
                {expanded && quote && (
                  <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                    <div className="flex items-center justify-between border-l-4 py-1 pl-3 pr-2" style={{ borderLeftColor: meta.tint }}>
                      <span className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('textbookQuote', locale)}</span>
                      <SpeakButton text={quote} accent={tts.accent} rate={tts.rate} size={13} color={meta.tint} compact />
                    </div>
                    {/* 长句默认只展示高亮词所在片段，点击展开全文 */}
                    {(() => {
                      const full = quoteFull.has(item.id);
                      const short = truncateQuote(quote, item.label);
                      const long = short !== quote;
                      return (
                        <>
                          <p className="px-3 pb-3 pt-1 text-[calc(14px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">
                            <WordHighlight text={full ? quote : short} word={item.label} color={meta.tint} />
                          </p>
                          {long && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setQuoteFull((prev) => { const n = new Set(prev); if (full) n.delete(item.id); else n.add(item.id); return n; }); }}
                              className="press ml-3 mb-3 text-[calc(12px*var(--type-scale))] font-medium text-[var(--color-accent)]"
                            >
                              {full ? t('quoteCollapse', locale) : t('quoteExpand', locale)}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
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
