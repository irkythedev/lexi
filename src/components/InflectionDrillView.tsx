import { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { Panel } from './ui/primitives.tsx';
import { addError } from '../db/db.ts';
import type { InflectionDrill } from '../types/index.ts';

/** 词形变换独立练习：答题 → 精确判分 → 错题本 → 结束（不进 Sprint 闭环）。 */
export default function InflectionDrillView({ drills, onExit }: { drills: InflectionDrill[]; onExit: () => void }) {
  const locale = useAppStore((s) => s.locale);
  const { selection } = useAppStore();
  const queue = useMemo(() => drills, [drills]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [judged, setJudged] = useState<null | { ok: boolean; drill: InflectionDrill }>(null);
  const [wrong, setWrong] = useState(0);

  const drill = queue[idx];
  if (!drill) return null;

  // 判分纪律：精确实匹配 + 去尾空格 + 大小写容错，禁止模糊匹配
  const judge = async () => {
    if (judged) return;
    const ok = input.trim().toLowerCase() === drill.answer.toLowerCase();
    setJudged({ ok, drill });
    if (!ok) {
      setWrong((w) => w + 1);
      if (selection) {
        await addError({
          key: `${selection.editionId}:${drill.id}`,
          editionId: selection.editionId,
          itemId: drill.id,
          kind: 'inflection',
          prompt: drill.sentence,
          answer: drill.answer,
          reason: '词形变换错误',
        });
      }
    }
  };

  const next = () => {
    if (idx < queue.length - 1) { setIdx(idx + 1); setInput(''); setJudged(null); }
    else onExit();
  };

  // 挖空渲染：句子中目标词替换为下划线空位（答案在句中已由管线校验）
  const masked = (() => {
    const re = new RegExp(`\\b${drill.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const m = drill.sentence.match(re);
    if (!m || m.index === undefined) return { before: drill.sentence, after: '' };
    return { before: drill.sentence.slice(0, m.index), after: drill.sentence.slice(m.index + m[0].length) };
  })();
  const tagLabel = { tense: '时态', plural: '单复数', conversion: '词性转换', irregular: '不规则' }[drill.tag];

  if (idx === queue.length - 1 && judged) {
    // 完成态：本轮对错小结，做完即结束
    const right = queue.length - wrong;
    return (
      <Panel><div className="flex flex-col items-center p-8 text-center">
        <ArrowLeftRight size={40} strokeWidth={2} style={{ color: 'var(--color-inflection)' }} />
        <p className="mt-3 text-[calc(20px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('inflectDone', locale)}</p>
        <p className="mt-1 tnum text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('inflectScore', locale, { right, total: queue.length })}</p>
        {wrong > 0 && selection && <p className="mt-2 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('inflectErrorsSaved', locale)}</p>}
        <button onClick={onExit} className="press mt-5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-6 py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white">{t('done', locale)}</button>
      </div></Panel>
    );
  }

  return (
    <Panel><div className="p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]"><ArrowLeftRight size={14} strokeWidth={2.25} style={{ color: 'var(--color-inflection)' }} /> {t('inflectTitle', locale)}</span>
        <span className="tnum text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{idx + 1}/{queue.length}</span>
      </div>

      <p className="mt-4 text-[calc(12px*var(--type-scale))] text-[var(--color-text-2)]">{t('inflectPrompt', locale, { tag: tagLabel })}</p>
      <p className="mt-2 text-[calc(16.5px*var(--type-scale))] leading-loose text-[var(--color-text)]">
        {masked.before}<span className="mx-1 inline-block min-w-24 border-b-2 border-dashed border-[var(--color-inflection)]">&nbsp;</span>{masked.after}
        <span className="ml-2 inline-block rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-2 py-0.5 align-middle font-mono text-[calc(13.5px*var(--type-scale))] text-[var(--color-text-2)]">({drill.base})</span>
      </p>

      {judged ? (
        <div className={`mt-3 rounded-[var(--radius-md)] border-2 p-3`} style={{ borderColor: judged.ok ? 'var(--color-vocab-border)' : 'var(--color-trap-border)', background: judged.ok ? 'var(--color-vocab-soft)' : 'var(--color-trap-soft)' }}>
          <div className="flex items-center gap-2 text-[calc(14px*var(--type-scale))] font-semibold" style={{ color: judged.ok ? 'var(--color-vocab-deep)' : 'var(--color-trap-deep)' }}>
            {judged.ok ? <Check size={15} strokeWidth={2.5} /> : <X size={15} strokeWidth={2.5} />}
            {judged.ok ? t('inflectCorrect', locale) : t('inflectWrong', locale, { answer: drill.answer })}
          </div>
          <p className="mt-1 text-[calc(13.5px*var(--type-scale))] text-[var(--color-text-2)]">{drill.sentence}</p>
        </div>
      ) : (
        <div className="mt-4">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) judge(); }}
            placeholder={t('inflectPlaceholder', locale)} autoFocus
            className="w-full rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] p-3 text-[calc(15px*var(--type-scale))] outline-none focus:border-[var(--color-inflection)]" />
          <div className="mt-3 flex items-center justify-between">
            <button onClick={onExit} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(14px*var(--type-scale))] text-[var(--color-text-2)]">{t('miniWriteSkip', locale)}</button>
            <button onClick={judge} disabled={!input.trim()} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2 text-[calc(14px*var(--type-scale))] font-semibold text-white disabled:opacity-50">{t('inflectCheck', locale)}</button>
          </div>
        </div>
      )}

      {judged && (
        <div className="mt-4 flex justify-end">
          <button onClick={next} className="press flex items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-accent)] px-5 py-2 text-[calc(14px*var(--type-scale))] font-semibold text-white">
            {idx < queue.length - 1 ? t('next', locale) : t('done', locale)}
          </button>
        </div>
      )}
    </div></Panel>
  );
}
