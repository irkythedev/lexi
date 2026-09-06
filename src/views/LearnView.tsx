import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Eye, EyeOff, BookText, ArrowRight, TextQuote, Sparkles, ListOrdered, CaseSensitive, Link2, Library, Asterisk, NotebookText, ArrowLeftRight, PenLine, Upload, Trash2, Play, ClipboardList, Info, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { KIND_META } from '../lib/utils.ts';
import { Panel, Row, Tag } from '../components/ui/primitives.tsx';
import { getPersonalBatches, deletePersonalBatch, type PersonalBatch } from '../db/db.ts';
import { useToastStore } from '../stores/toastStore.ts';
import ReadingView from './ReadingView.tsx';
import InflectionDrillView from '../components/InflectionDrillView.tsx';
import MiniWriteView from '../components/MiniWriteView.tsx';
import TextbookSwitcher from '../components/TextbookSwitcher.tsx';
import UnitPickerSheet from '../components/UnitPickerSheet.tsx';
import PersonalImport from '../components/PersonalImport.tsx';
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
  const [mode, setMode] = useState<null | 'reading' | 'inflect' | 'miniwrite'>(null);
  const [filter, setFilter] = useState<'all' | 'vocab' | 'phrase' | 'notes'>('all');
  const [hideCn, setHideCn] = useState(false);
  const [aiTarget, setAiTarget] = useState<AssistContext | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quoteFull, setQuoteFull] = useState<Set<string>>(new Set());
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGuideInfo, setShowGuideInfo] = useState(false);
  const [showGuideList, setShowGuideList] = useState(false);
  const [myLists, setMyLists] = useState<PersonalBatch[]>([]);
  const toast = useToastStore((s) => s.show);

  const loadMyLists = () => { void getPersonalBatches().then(setMyLists); };
  useEffect(() => { loadMyLists(); }, []);

  const removeMyList = async (id: string) => {
    await deletePersonalBatch(id);
    toast(t('personalImportDeleted', locale), 'info', 'alert');
    loadMyLists();
  };

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

  // 导读单卡（常驻功能：导入词表 → 生成口语练习导读单；无教材空态与已选教材都显示）
  const guideCard = (
    <div className="mt-4 rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]"><ClipboardList size={16} strokeWidth={2.25} style={{ color: 'var(--color-accent)' }} /> {t('learnImportCard', locale)}</div>
          <p className="mt-0.5 text-[calc(13px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{t('learnImportCardDesc', locale)}</p>
        </div>
        <button onClick={() => setShowImport(true)} className="press inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-4 py-2.5 text-[calc(14px*var(--type-scale))] font-semibold text-white"><Upload size={16} strokeWidth={2.25} /> {t('personalImportOpen', locale)}</button>
      </div>

      {myLists.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('personalImportSavedLists', locale)}</div>
          <div className="space-y-2">
            {myLists.map((b) => {
              const c = { vocab: 0, phrase: 0, pattern: 0 };
              for (const e of b.entries) c[e.type]++;
              return (
                <div key={b.id} className="flex items-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-3 py-2.5">
                  <button onClick={() => navigate(`/mylists/${b.id}`)} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: 'var(--grad-cta)' }}><Play size={16} strokeWidth={2.5} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-[calc(14px*var(--type-scale))] font-semibold text-[var(--color-text)]">{b.name}</span>
                      <span className="mt-0.5 block text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">{c.vocab} {t('words', locale)} · {c.phrase} {KIND_META.phrase.short[locale]} · {c.pattern} {KIND_META.pattern.short[locale]}</span>
                    </span>
                  </button>
                  <button onClick={() => void removeMyList(b.id)} className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-trap)] hover:bg-[var(--color-trap-soft)]" aria-label={t('personalImportDeleted', locale)}><Trash2 size={15} strokeWidth={2.25} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showImport && <PersonalImport onClose={() => setShowImport(false)} onSaved={loadMyLists} />}
    </div>
  );

  if (!unit) return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-6">
      <BookText size={42} strokeWidth={2} className="mx-auto text-[var(--color-text-3)]" />
      <p className="mt-3 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('learnEmpty', locale)}</p>

      {/* 选教材卡 */}
      <div className="mt-4 rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-panel)]">
        <div className="mb-3 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('textbook', locale)}</div>
        <TextbookSwitcher onSelected={() => {}} />
      </div>

      {/* 导读单卡（常驻） */}
      {guideCard}
    </div>
  );
  if (mode === 'reading' && unit) return <ReadingView unit={unit.unit} onExit={() => setMode(null)} />;
  if (mode === 'inflect' && unit.inflectionDrills?.length) return <InflectionDrillView drills={unit.inflectionDrills} onExit={() => setMode(null)} />;
  if (mode === 'miniwrite' && unit.miniPrompt) return <MiniWriteView miniPrompt={unit.miniPrompt} onExit={() => setMode(null)} />;

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
          {/* 3 张 KPI 小卡：大数字 + 脚下小胶囊（短语含句式；Notes 卡可点直达筛选） */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                { kind: 'vocab' as const, n: groups[0].items.length, label: t('words', locale), tint: 'var(--color-vocab)', deep: 'var(--color-vocab-deep)', target: 'vocab' as const },
                { kind: 'phrase' as const, n: groups[1].items.length, label: t('phrasesWithPatterns', locale), tint: 'var(--color-phrase)', deep: 'var(--color-phrase-deep)', target: 'phrase' as const },
                { kind: 'notes' as const, n: notesList.length, label: t('notesTab', locale), tint: 'var(--color-ai)', deep: 'var(--color-ai)', target: 'notes' as const },
              ]
            ).map((k) => (
              <button key={k.kind} onClick={() => { setFilter(k.target); pager.reset(); }} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-3 text-center shadow-[var(--shadow-card)] transition hover:bg-[var(--color-surface-2)]" aria-label={`${k.label} · ${k.n}`}>
                <div className="tnum text-[calc(clamp(24px,5vw,32px)*var(--type-scale))] font-extrabold leading-none" style={{ color: k.tint }}>{k.n}</div>
                <span className="mt-2 inline-block rounded-[var(--radius-pill)] px-2 py-0.5 text-[calc(10px*var(--type-scale))] font-semibold" style={{ background: 'var(--color-track)', color: k.deep }}>{k.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => navigate(`/session/${unit.unit}`)} className="press inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white shadow-[var(--shadow-card)] transition hover:brightness-105 hover:translate-x-[1px] hover:translate-y-[1px]">
              {t('startLearning', locale)} <ArrowRight size={16} />
            </button>
            <button onClick={() => setShowImport(true)} className="press inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-2.5 text-[calc(14px*var(--type-scale))] font-semibold text-[var(--color-text)] shadow-[var(--shadow-card)] transition hover:bg-[var(--color-surface-2)] hover:translate-x-[1px] hover:translate-y-[1px]">
              <Upload size={15} strokeWidth={2.25} style={{ color: 'var(--color-accent)' }} /> {t('personalImportOpen', locale)}
            </button>
            <button onClick={() => setShowGuideInfo(true)} aria-label={t('guideInfoTitle', locale)} title={t('guideInfoTitle', locale)} className="press self-center shrink-0 text-[var(--color-text-3)] transition hover:text-[var(--color-accent)]"><Info size={18} strokeWidth={2.25} /></button>
          </div>
          {myLists.length > 0 && (
            <button onClick={() => setShowGuideList(true)} className="press mt-3 inline-flex items-center gap-1 text-[calc(12.5px*var(--type-scale))] font-medium text-[var(--color-accent)]">
              <ClipboardList size={13} strokeWidth={2.25} /> {t('personalImportSavedLists', locale)} · {myLists.length} <ChevronRight size={13} />
            </button>
          )}
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
              <div className="flex shrink-0 items-center gap-2">
                {unit.miniPrompt && (
                  <button onClick={() => setMode('miniwrite')} className="press flex items-center gap-1 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3.5 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-[var(--color-text)]"><PenLine size={14} strokeWidth={2.25} className="text-[var(--color-accent)]" /> {t('modeMiniWrite', locale)}</button>
                )}
                <button onClick={() => setMode('reading')} className="press flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-3.5 py-2 text-[calc(13px*var(--type-scale))] font-semibold text-white">{t('enter', locale)} <ArrowRight size={14} strokeWidth={2.25} /></button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 练习入口已收口至 /practice（v0.6.0）：Learn 只保留学习内容 */}

      <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="seg seg--bare">
          {(['all', 'vocab', 'phrase', 'notes'] as const).map((f) => {
            const n = f === 'all' ? studyItems.length : f === 'vocab' ? groups[0].items.length : f === 'phrase' ? groups[1].items.length : notesList.length;
            return (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => { setFilter(f); pager.reset(); }}>
              <span className="inline-flex items-center gap-1.5">
                {(() => {
                  const Icon = f === 'all' ? ListOrdered : f === 'vocab' ? CaseSensitive : f === 'phrase' ? Link2 : NotebookText;
                  const label = f === 'all' ? t('wordlistOrder', locale) : f === 'notes' ? t('notesTab', locale) : KIND_META[f].short[locale];
                  const tint = f === 'all' ? 'var(--color-text-3)' : f === 'notes' ? 'var(--color-ai)' : KIND_META[f].tint;
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
        {filter === 'notes' ? (
          <>
          {unit.inflectionDrills && unit.inflectionDrills.length > 0 && (
            <div className="border-b-2 border-[var(--color-hairline)] p-3">
              <button onClick={() => setMode('inflect')} className="press flex w-full items-center gap-3 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-white" style={{ background: 'var(--grad-cta)' }}><ArrowLeftRight size={18} strokeWidth={2.5} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t('modeInflect', locale)}</span>
                  <span className="mt-0.5 block text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{t('modeInflectDesc', locale)}</span>
                </span>
                <ArrowRight size={15} strokeWidth={2.25} className="text-[var(--color-text-3)]" />
              </button>
            </div>
          )}
          {notesList.map((note) => {
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
          })}
          </>
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
      {filter !== 'notes' && <PaginationBar page={pager.page} totalPages={pager.totalPages} onPrev={pager.prev} onNext={pager.next} />}
      <AiAssistPanel open={aiOpen} onClose={() => setAiOpen(false)} context={aiTarget} />
      <UnitPickerSheet open={unitSheetOpen} onClose={() => setUnitSheetOpen(false)} />
      {showImport && <PersonalImport onClose={() => setShowImport(false)} onSaved={loadMyLists} />}
      {showGuideInfo && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('guideInfoTitle', locale)}>
          <button aria-label="close" className="absolute inset-0 bg-black/40" onClick={() => setShowGuideInfo(false)} />
          <div className="relative w-full max-w-sm rounded-xl border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-overlay)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]"><Info size={16} style={{ color: 'var(--color-accent)' }} /> {t('guideInfoTitle', locale)}</h2>
              <button type="button" onClick={() => setShowGuideInfo(false)} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
            </div>
            <p className="text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text-body)]">{t('guideInfoBody', locale)}</p>
          </div>
        </div>
      )}
      {showGuideList && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('personalImportSavedLists', locale)}>
          <button aria-label="close" className="absolute inset-0 bg-black/40" onClick={() => setShowGuideList(false)} />
          <div className="relative flex max-h-[78dvh] w-full max-w-sm flex-col overflow-hidden rounded-xl border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)]">
            <div className="flex items-center justify-between border-b-2 border-[var(--color-hairline)] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]"><ClipboardList size={16} style={{ color: 'var(--color-accent)' }} /> {t('personalImportSavedLists', locale)}</h2>
              <button type="button" onClick={() => setShowGuideList(false)} aria-label={t('close', locale)} className="press -m-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={16} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {myLists.map((b) => {
                const c = { vocab: 0, phrase: 0, pattern: 0 };
                for (const e of b.entries) c[e.type]++;
                return (
                  <div key={b.id} className="flex items-center gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-3 py-2.5">
                    <button onClick={() => navigate(`/mylists/${b.id}`)} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: 'var(--grad-cta)' }}><Play size={16} strokeWidth={2.5} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-[calc(14px*var(--type-scale))] font-semibold text-[var(--color-text)]">{b.name}</span>
                        <span className="mt-0.5 block text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">{c.vocab} {t('words', locale)} · {c.phrase} {KIND_META.phrase.short[locale]} · {c.pattern} {KIND_META.pattern.short[locale]}</span>
                      </span>
                    </button>
                    <button onClick={() => void removeMyList(b.id)} className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-trap)] hover:bg-[var(--color-trap-soft)]" aria-label={t('personalImportDeleted', locale)}><Trash2 size={15} strokeWidth={2.25} /></button>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 border-t-2 border-[var(--color-hairline)] p-3">
              <button onClick={() => { setShowGuideList(false); setShowImport(true); }} className="press flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-4 py-2.5 text-[calc(14px*var(--type-scale))] font-semibold text-white"><Upload size={15} strokeWidth={2.25} /> {t('personalImportOpen', locale)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
