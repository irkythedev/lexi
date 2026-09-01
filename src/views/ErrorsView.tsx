import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Volume2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { getErrors, markErrorResolved, clearResolvedErrors } from '../db/db.ts';
import { KIND_META } from '../lib/utils.ts';
import { requestSpeak } from '../components/FloatingTTS.tsx';
import { Panel, Row, Tag, GhostButton } from '../components/ui/primitives.tsx';

export default function ErrorsView() {
  const { unit, studyItems, selection, tts, locale } = useAppStore();
  const [errors, setErrors] = useState<Awaited<ReturnType<typeof getErrors>>>([]);
  const load = async () => setErrors(await getErrors());
  useEffect(() => { load(); }, []);

  const unitErrors = errors.filter((e) => e.editionId === selection?.editionId);
  const resolve = async (id: number) => { await markErrorResolved(id); load(); };

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-end justify-between">
        <div><h2 className="text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">错题本</h2><p className="mt-1 text-[15px] text-[var(--color-text-2)]">{unit ? `${unit.editionName} · ${unit.title}` : '选择单元后可按本单元筛选'} · 共 {unitErrors.length} 条</p></div>
        {unitErrors.length > 0 && <GhostButton onClick={async () => { await clearResolvedErrors(); load(); }}>清除已掌握</GhostButton>}
      </div>

      {unitErrors.length === 0 ? <Panel><div className="flex flex-col items-center p-10 text-center"><CheckCircle2 size={40} className="text-[var(--color-vocab)]" /><p className="mt-3 text-[15px] font-semibold text-[var(--color-text)]">本单元还没有错题</p><p className="mt-1 text-[13px] text-[var(--color-text-2)]">练习和小测中答错的内容会自动出现在这里。</p></div></Panel>
      : <Panel>
        {unitErrors.map((e) => {
          const item = studyItems.find((i) => i.id === e.itemId);
          const meta = item ? KIND_META[item.kind] : KIND_META.vocab;
          const label = item ? item.label : e.itemId;
          return (
            <Row key={e.id}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5"><AlertTriangle size={18} style={{ color: 'var(--color-trap)' }} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {item && <Tag kind={item.kind}>{meta.label[locale]}</Tag>}
                    <span className="truncate text-[15px] font-semibold text-[var(--color-text)]">{label}</span>
                    {item && <button onClick={() => requestSpeak(item.label, tts.accent, tts.rate)} className="press ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"><Volume2 size={14} style={{ color: meta.tint }} /></button>}
                  </div>
                  {e.prompt && <p className="mt-1 text-[13px] text-[var(--color-text-2)]">题目：{e.prompt}</p>}
                  <p className="mt-1 text-[13px] text-[var(--color-trap-deep)]">原因：{e.reason}</p>
                  <p className="mt-0.5 text-[13px] text-[var(--color-text-2)]">正确答案：{e.answer || item?.meaning || '—'}</p>
                  <div className="mt-2"><button onClick={() => resolve(e.id!)} className="press inline-flex items-center gap-1 rounded-full border border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--color-vocab-deep)]"><CheckCircle2 size={13} /> 标记为已掌握</button></div>
                </div>
              </div>
            </Row>
          );
        })}
      </Panel>}
    </div>
  );
}
