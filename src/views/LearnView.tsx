import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RectangleHorizontal, Puzzle, Timer, ChevronDown, Eye, EyeOff, BookText, ArrowRight, TextQuote, Sparkles, ListOrdered, CaseSensitive, Link2, Library, Asterisk, NotebookText, BookMarked } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { KIND_META } from '../lib/utils.ts';
import { Panel, Row, Tag } from '../components/ui/primitives.tsx';
import Flashcard from '../components/Flashcard.tsx';
import CollocationConnector from '../components/CollocationConnector.tsx';
import Sprint from '../components/Sprint.tsx';
import ReadingView from './ReadingView.tsx';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';
import UnitPickerSheet from '../components/UnitPickerSheet.tsx';
import SpeakButton from '../components/SpeakButton.tsx';
import AiAssistPanel, { type AssistContext } from '../components/AiAssistPanel.tsx';
import PaginationBar from '../components/PaginationBar.tsx';
import { usePagination } from '../lib/pagination.ts';
import { findQuote, truncateQuote } from '../data/textbooks/unit_texts.ts';
import { UNIT_READINGS } from '../data/textbooks/readings.ts';
import WordHighlight from '../components/WordHighlight.tsx';
import { StudyCardView } from '../components/AiAssistPanel.tsx';
import { listAiNotes, type AiNoteRecord } from '../db/db.ts';

export default function LearnView() {
  const { unit, studyItems, tts, locale } = useAppStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<null | 'flash' | 'connector' | 'sprint' | 'reading'>(null);
  const [filter, setFilter] = useState<'all' | 'vocab' | 'phrase' | 'notes' | 'ai'>('all');
  const [aiNotesList, setAiNotesList] = useState<AiNoteRecord[]>([]);
  const [hideCn, setHideCn] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<AssistContext | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quoteFull, setQuoteFull] = useState<Set<string>>(new Set());
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);

  // AI 讲义本卡片：进入页面与打开 AI 面板后刷新（生成/追问后回来即见最新）
  useEffect(() => { void listAiNotes().then(setAiNotesList); }, []);
  useEffect(() => { if (!aiOpen) void listAiNotes().then(setAiNotesList); }, [aiOpen]);

  // wordlist 视图: studyItems 本身已按教材词表混排序（flattenUnit seq 排序，句式追加末尾）
  // 单词/短语视图: 各自 kind 的 seq 序（保持 wordlist 相对顺序）
  const groups = [
    { kind: 'vocab' as const, items: studyItems.filter((i) => i.kind === 'vocab') },
    { kind: 'phrase' as const, items: studyItems.filter((i) => i.kind === 'phrase' || i.kind === 'pattern') },
  ];
  const notesList = unit?.notes ?? [];
  const visible = filter === 'all' ? studyItems : studyItems.filter((i) => i.kind === filter || (filter === 'phrase' && i.kind === 'pattern'));
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
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] pb-28 pt-4">
      {/* 单元封面卡（纸面 + 墨线，非绿满铺） */}
      <div className="relative overflow-hidden rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-panel)]">
        <div className="relative">
          <div className="text-[calc(12px*var(--type-scale))] font-semibold tracking-[0.12em] text-[var(--color-accent)]">{unit.editionName} · Unit {unit.unit}</div>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <h2 className="text-[calc(clamp(24px,5vw,34px)*var(--type-scale))] font-bold leading-tight tracking-[-0.03em] text-[var(--color-text)]">{unit.title}</h2>
            <button onClick={() => setUnitSheetOpen(true)} className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-pill)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-2.5 text-[calc(12px*var(--type-scale))] font-medium text-[var(--color-text-2)] shadow-[var(--shadow-card)] hover:bg-[var(--color-surface-2)]" aria-label={t('unitSwitch', locale)}>
              <Library size={13} strokeWidth={2.25} className="text-[var(--color-accent)]" /> {t('unitSwitch', locale)}
            </button>
          </div>
          {/* 2 张 KPI 小卡：大数字 + 脚下小胶囊（短语含句式） */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(
              [
                { kind: 'vocab' as const, n: groups[0].items.length, label: t('words', locale), tint: 'var(--color-vocab)', deep: 'var(--color-vocab-deep)' },
                { kind: 'phrase' as const, n: groups[1].items.length, label: t('phrasesWithPatterns', locale), tint: 'var(--color-phrase)', deep: 'var(--color-phrase-deep)' },
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
          {(['all', 'vocab', 'phrase', 'notes', 'ai'] as const).map((f) => {
            const n = f === 'all' ? studyItems.length : f === 'vocab' ? groups[0].items.length : f === 'phrase' ? groups[1].items.length : f === 'notes' ? notesList.length : aiNotesList.length;
            return (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => { setFilter(f); pager.reset(); }}>
              <span className="inline-flex items-center gap-1.5">
                {(() => {
                  const Icon = f === 'all' ? ListOrdered : f === 'vocab' ? CaseSensitive : f === 'phrase' ? Link2 : f === 'notes' ? NotebookText : BookMarked;
                  const label = f === 'all' ? t('wordlistOrder', locale) : f === 'notes' ? t('notesTab', locale) : f === 'ai' ? t('aiChipLabel', locale) : KIND_META[f].short[locale];
                  const tint = f === 'all' ? 'var(--color-text-3)' : f === 'notes' || f === 'ai' ? 'var(--color-ai)' : KIND_META[f].tint;
                  return <><Icon size={14} strokeWidth={2.25} color={tint} aria-hidden="true" /><span>{label}</span><span className="text-[calc(11px*var(--type-scale))] tabular-nums text-[var(--color-text-3)]">{n}</span></>;
                })()}
              </span>
            </button>
            );
          })}
        </div>
        <button onClick={() => setHideCn((v) => !v)} className="press flex items-center gap-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{hideCn ? <EyeOff size={15} strokeWidth={2.25} /> : <Eye size={15} strokeWidth={2.25} />}{hideCn ? t('showMeaning', locale) : t('hideMeaning', locale)}</button>
      </div>

      <Panel className="mt-3">
        {filter === 'ai' ? (
          /* AI 讲义本视图: 学习卡列表, 行展开只读回放主卡（复用 StudyCardView, 零请求） */
          aiNotesList.length === 0 ? (
            <p className="py-8 text-center text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-3)]">{t('aiChipEmpty', locale)}</p>
          ) : (
            aiNotesList.map((n) => {
              const expanded = expandedId === n.key;
              return (
                <Row key={n.key} onClick={() => setExpandedId(expanded ? null : n.key)}>
                  <div className="w-full">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]" style={{ border: '1.5px solid var(--color-hairline)', background: 'var(--color-surface-2)' }}>
                        <BookMarked size={16} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[calc(15px*var(--type-scale))] font-semibold leading-snug text-[var(--color-text)]">{n.label}</p>
                        <p className="mt-0.5 truncate text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{hideCn ? '————' : n.card.definition}</p>
                        <p className="mt-0.5 truncate text-[calc(11px*var(--type-scale))] text-[var(--color-text-3)]">{n.unitTitle || `Unit ${n.unit}`}{n.chain.length > 0 && ` · ${t('aiNotesFollowN', locale, { n: n.chain.length })}`}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center"><ChevronDown size={14} strokeWidth={2.25} className={`text-[var(--color-text-3)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} /></span>
                    </div>
                    {expanded && (
                      <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3">
                        <StudyCardView card={n.card} accent={tts.accent} rate={tts.rate} highlight={n.label} />
                      </div>
                    )}
                  </div>
                </Row>
              );
            })
          )
        ) : filter === 'notes' ? (
          /* Notes 视图: 原书注释条目列表, 行展开显示翻译+讲解 */
          notesList.map((note) => {
            const key = `note-${note.n}`;
            const expanded = expandedId === key;
            return (
              <Row key={key} onClick={() => setExpandedId(expanded ? null : key)}>
                <div className="w-full">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] px-1.5 text-[calc(11px*var(--type-scale))] font-semibold" style={{ background: 'var(--color-surface-2)', border: '1.5px solid var(--color-hairline)', color: 'var(--color-text-2)' }}>{note.n}</span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[calc(14.5px*var(--type-scale))] font-semibold leading-snug text-[var(--color-text)]">{note.quote}</p>
                      <p className="mt-1 truncate text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{hideCn ? '————' : note.zh}</p>
                      <p className="mt-0.5 text-[calc(11px*var(--type-scale))] text-[var(--color-text-3)]">{note.ref}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <SpeakButton text={note.quote} accent={tts.accent} rate={tts.rate} size={16} color="var(--color-ai)" compact />
                      <button onClick={(e) => { e.stopPropagation(); setAiTarget({ label: note.quote, meaning: note.zh, kind: 'notes', quote: note.quote, extra: note.expl.join('\n'), unitWords: unit ? [...unit.vocabularies.map((v) => v.word), ...unit.phrases.map((p) => p.phrase)] : undefined, grade: unit?.grade, unitTitle: unit?.title }); setAiOpen(true); }} className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)]" aria-label="问 AI"><Sparkles size={16} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} /></button>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center"><ChevronDown size={14} strokeWidth={2.25} className={`text-[var(--color-text-3)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} /></span>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                      <div className="border-l-4 py-1 pl-3 pr-2" style={{ borderLeftColor: 'var(--color-ai)' }}>
                        <span className="text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('notesTranslation', locale)}</span>
                        <p className="py-1 text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{note.zh}</p>
                        {note.expl.length > 0 && (
                          <>
                            <span className="mt-1 block text-[calc(11px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-3)]">{t('notesExpl', locale)}</span>
                            <div className="space-y-1.5 py-1">
                              {note.expl.map((p, pi) => <p key={pi} className="text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{p}</p>)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Row>
            );
          })
        ) : (
        pagedItems.map((item) => {
          const meta = KIND_META[item.kind];
          const expanded = expandedId === item.id;
          const quote = item.exampleEn ?? (unit ? findQuote(item, unit.unit) : null);
          return (
            <Row key={item.id} onClick={() => setExpandedId(expanded ? null : item.id)}>
              <div className="w-full">
                <div className="flex items-center gap-3">
                  <Tag kind={item.kind} icon />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <span className="break-words text-[calc(16px*var(--type-scale))] font-semibold leading-snug text-[var(--color-text)]">
                        {item.receptive && <Asterisk size={14} strokeWidth={2.75} className="mr-0.5 inline-block align-baseline text-[var(--color-accent)]" aria-label="只读词" />}
                        {item.label}
                      </span>
                      {item.phonetic && <span className="break-words font-mono text-[calc(12px*var(--type-scale))] leading-snug text-[var(--color-text-2)]">{item.phonetic}</span>}
                    </div>
                    {/* 词表行: 词性绑定词义(sense 串, 如 "n. 手机"); 无 sense 的句式回退 meaning; 有页码时尾注 */}
                    <p className="mt-1 truncate text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
                      {hideCn ? '————' : item.sense || item.meaning}
                      {item.page != null && !hideCn && <span className="ml-1.5 shrink-0 text-[calc(11px*var(--type-scale))] text-[var(--color-text-3)]">p.{item.page}</span>}
                    </p>
                  </div>
                  {/* 朗读 + AI + 展开指示 统一成组，gap 2px（紧凑可点）；每钮热区 36px */} 
                  <div className="flex shrink-0 items-center gap-0.5">
                    <SpeakButton text={item.label} accent={tts.accent} rate={tts.rate} size={16} color={meta.tint} compact />
                    <button onClick={(e) => { e.stopPropagation(); setAiTarget({ label: item.label, meaning: item.meaning, kind: item.kind, quote: quote ?? undefined }); setAiOpen(true); }} className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)]" aria-label="问 AI"><Sparkles size={16} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} /></button>
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
        })
        )}
      </Panel>
      {filter !== 'notes' && filter !== 'ai' && <PaginationBar page={pager.page} totalPages={pager.totalPages} onPrev={pager.prev} onNext={pager.next} />}
      <AiAssistPanel open={aiOpen} onClose={() => setAiOpen(false)} context={aiTarget} />
      <UnitPickerSheet open={unitSheetOpen} onClose={() => setUnitSheetOpen(false)} />
    </div>
  );
}
