// PersonalListView — 导入清单学习页（打通消费）：把导入批次转成 StudyItem[] 后，
// 提供闪卡 / 拼写自测 / 例句填空三种闭环。数据源独立于教材（editionId='personal'）。
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RectangleHorizontal, PenLine, ListOrdered } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { getPersonalBatch } from '../db/db.ts';
import { batchToStudyItems } from '../lib/import.ts';
import type { StudyItem } from '../types/index.ts';
import { KIND_META } from '../lib/utils.ts';
import { t } from '../lib/i18n.ts';
import Flashcard from '../components/Flashcard.tsx';
import SpeakButton from '../components/SpeakButton.tsx';
import { Panel, Tag } from '../components/ui/primitives.tsx';

type Mode = 'flash' | 'spell' | 'cloze';

const ICON_STROKE = 2.5;

const MODES: { id: Mode; titleKey: string; descKey: string; icon: typeof RectangleHorizontal }[] = [
  { id: 'flash', titleKey: 'myListsStudyFlash', descKey: 'myListsStudyFlashDesc', icon: RectangleHorizontal },
  { id: 'spell', titleKey: 'myListsStudySpell', descKey: 'myListsStudySpellDesc', icon: PenLine },
  { id: 'cloze', titleKey: 'myListsStudyCloze', descKey: 'myListsStudyClozeDesc', icon: ListOrdered },
];

/** 拼写判定：忽略大小写与首尾空格，精确匹配字母顺序。 */
function normalize(v: string): string {
  return v.trim().toLowerCase();
}

export default function PersonalListView() {
  const { batchId = '' } = useParams();
  const navigate = useNavigate();
  const locale = useAppStore((s) => s.locale);
  const [name, setName] = useState('');
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    void (async () => {
      const batch = await getPersonalBatch(batchId);
      if (batch) {
        setName(batch.name);
        setItems(batchToStudyItems(batch.id, batch.entries));
      }
      setLoaded(true);
    })();
  }, [batchId]);

  const spellItems = useMemo(() => items.filter((i) => i.kind !== 'pattern'), [items]);
  const clozeItems = useMemo(() => items.filter((i) => !!i.exampleEn), [items]);

  if (!loaded) return null;
  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[var(--max-read)] flex-col items-center justify-center px-[var(--pad-x)] py-10 text-center">
        <p className="text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('personalImportParseError', locale)}</p>
        <button onClick={() => navigate('/learn')} className="press mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text-2)]"><ArrowLeft size={16} /> {t('back', locale)}</button>
      </div>
    );
  }

  if (mode === 'flash') return <Flashcard items={items} onExit={() => setMode(null)} editionId="personal" />;
  if (mode === 'spell') return <SpellQuiz items={spellItems} onExit={() => setMode(null)} />;
  if (mode === 'cloze') return <ClozeQuiz items={clozeItems} onExit={() => setMode(null)} />;

  const countByKind = (arr: StudyItem[]) => {
    const c: Record<string, number> = { vocab: 0, phrase: 0, pattern: 0 };
    for (const i of arr) c[i.kind]++;
    return c;
  };
  const total = countByKind(items);

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] pb-28 pt-4">
      <button onClick={() => navigate('/learn')} className="press mb-3 flex items-center gap-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]"><ArrowLeft size={18} strokeWidth={2.25} /> {t('back', locale)}</button>
      <div className="mb-4">
        <h2 className="break-words text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em] text-[var(--color-text)]">{name}</h2>
        <p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">
          {total.vocab > 0 && <span className="mr-2">{total.vocab} {t('words', locale)}</span>}
          {total.phrase > 0 && <span className="mr-2">{total.phrase} {t('phrasesWithPatterns', locale)}</span>}
          {total.pattern > 0 && <span>{total.pattern} {KIND_META.pattern.short[locale]}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button key={m.id} onClick={() => setMode(m.id)} className="press card flex items-center gap-4 p-4 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: 'var(--grad-cta)' }}><Icon size={22} strokeWidth={ICON_STROKE} /></span>
              <span>
                <span className="block text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t(m.titleKey, locale)}</span>
                <span className="mt-0.5 block text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{t(m.descKey, locale)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 拼写自测：看释义 → 输入拼写 → 精确匹配（忽略大小写/首尾空格）。 */
function SpellQuiz({ items, onExit }: { items: StudyItem[]; onExit: () => void }) {
  const locale = useAppStore((s) => s.locale);
  const tts = useAppStore((s) => s.tts);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [state, setState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const item = items[idx];
  const meta = item ? KIND_META[item.kind] : null;

  const check = () => {
    if (!item) return;
    if (normalize(input) === normalize(item.label)) {
      setCorrect((c) => c + 1);
      setState('correct');
    } else {
      setState('wrong');
    }
  };

  const next = () => {
    if (idx < items.length - 1) {
      setIdx((i) => i + 1);
      setInput('');
      setState('idle');
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[var(--max-read)] flex-col items-center justify-center px-[var(--pad-x)] py-10 text-center">
        <p className="text-[calc(18px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('quizDone', locale, { correct, total: items.length })}</p>
        <button onClick={onExit} className="press mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('back', locale)}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]"><ArrowLeft size={18} strokeWidth={2.25} /> {t('back', locale)}</button>
        <span className="tnum text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{idx + 1} / {items.length}</span>
      </div>
      <Panel>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('quizSpellPrompt', locale)}</span>
            <SpeakButton text={item.label} accent={tts.accent} rate={tts.rate} size={18} color={meta?.tint} />
          </div>
          <p className="mt-4 text-[calc(17px*var(--type-scale))] font-semibold text-[var(--color-text)]">{item.meaning}</p>
          {item.pos && <p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{item.pos}</p>}
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setState('idle'); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { if (state === 'idle') check(); else next(); } }}
            autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
            placeholder={t('quizInputPlaceholder', locale)}
            className="mt-5 w-full rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] px-4 py-3 text-[calc(16px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]"
          />
          {state !== 'idle' && (
            <div className={`mt-3 rounded-[var(--radius-md)] border-2 p-3 text-[calc(14px*var(--type-scale))] ${state === 'correct' ? 'border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] text-[var(--color-vocab)]' : 'border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] text-[var(--color-trap)]'}`}>
              {state === 'correct' ? t('quizCorrect', locale) : t('quizAnswer', locale, { answer: item.label })}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            {state === 'idle'
              ? <button onClick={check} disabled={!input.trim()} className="press inline-flex min-h-11 items-center rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white disabled:opacity-50">{t('quizCheck', locale)}</button>
              : <button onClick={next} className="press inline-flex min-h-11 items-center rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">{idx < items.length - 1 ? t('quizNext', locale) : t('sprintViewResult', locale)}</button>}
          </div>
        </div>
      </Panel>
    </div>
  );
}

/** 例句填空：例句挖空 label，看上下文补全（仅含例句的条目）。 */
function ClozeQuiz({ items, onExit }: { items: StudyItem[]; onExit: () => void }) {
  const locale = useAppStore((s) => s.locale);
  const tts = useAppStore((s) => s.tts);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [state, setState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const item = items[idx];
  const meta = item ? KIND_META[item.kind] : null;

  const cloze = useMemo(() => {
    if (!item?.exampleEn) return '';
    const esc = item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return item.exampleEn.replace(new RegExp(`\\b(${esc})\\b`, 'i'), '＿＿＿');
  }, [item]);

  const check = () => {
    if (!item) return;
    if (normalize(input) === normalize(item.label)) {
      setCorrect((c) => c + 1);
      setState('correct');
    } else {
      setState('wrong');
    }
  };

  const next = () => {
    if (idx < items.length - 1) {
      setIdx((i) => i + 1);
      setInput('');
      setState('idle');
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[var(--max-read)] flex-col items-center justify-center px-[var(--pad-x)] py-10 text-center">
        <p className="text-[calc(18px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('quizDone', locale, { correct, total: items.length })}</p>
        <button onClick={onExit} className="press mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('back', locale)}</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onExit} className="press flex items-center gap-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]"><ArrowLeft size={18} strokeWidth={2.25} /> {t('back', locale)}</button>
        <span className="tnum text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{idx + 1} / {items.length}</span>
      </div>
      <Panel>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('quizClozePrompt', locale)}</span>
            <SpeakButton text={item.exampleEn || item.label} accent={tts.accent} rate={tts.rate} size={18} color={meta?.tint} />
          </div>
          <p className="mt-4 text-[calc(17px*var(--type-scale))] font-semibold leading-relaxed text-[var(--color-text)]">{cloze}</p>
          <div className="mt-2 flex items-center gap-1.5"><Tag kind={item.kind} /><span className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{item.meaning}</span></div>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setState('idle'); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { if (state === 'idle') check(); else next(); } }}
            autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
            placeholder={t('quizInputPlaceholder', locale)}
            className="mt-5 w-full rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] px-4 py-3 text-[calc(16px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]"
          />
          {state !== 'idle' && (
            <div className={`mt-3 rounded-[var(--radius-md)] border-2 p-3 text-[calc(14px*var(--type-scale))] ${state === 'correct' ? 'border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] text-[var(--color-vocab)]' : 'border-[var(--color-trap-border)] bg-[var(--color-trap-soft)] text-[var(--color-trap)]'}`}>
              {state === 'correct' ? t('quizCorrect', locale) : t('quizAnswer', locale, { answer: item.label })}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            {state === 'idle'
              ? <button onClick={check} disabled={!input.trim()} className="press inline-flex min-h-11 items-center rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white disabled:opacity-50">{t('quizCheck', locale)}</button>
              : <button onClick={next} className="press inline-flex min-h-11 items-center rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">{idx < items.length - 1 ? t('quizNext', locale) : t('sprintViewResult', locale)}</button>}
          </div>
        </div>
      </Panel>
    </div>
  );
}
