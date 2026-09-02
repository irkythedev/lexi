// ErrorsView — 错题本：展示本单元错题记录，i18n 全覆盖
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { getErrors, markErrorResolved, clearResolvedErrors } from '../db/db.ts';
import { KIND_META } from '../lib/utils.ts';
import { t } from '../lib/i18n.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { Panel, Row, Tag, GhostButton } from '../components/ui/primitives.tsx';
import SpeakButton from '../components/SpeakButton.tsx';
import PaginationBar from '../components/PaginationBar.tsx';
import { usePagination } from '../lib/pagination.ts';

export default function ErrorsView() {
  const { unit, studyItems, selection, tts, locale } = useAppStore();
  const toast = useToastStore((s) => s.show);
  const [errors, setErrors] = useState<Awaited<ReturnType<typeof getErrors>>>([]);
  const load = async () => setErrors(await getErrors());
  useEffect(() => { load(); }, []);

  const unitErrors = errors.filter((e) => e.editionId === selection?.editionId);
  const pager = usePagination(unitErrors, 20);
  const pagedErrors = pager.slice;
  const resolve = async (id: number) => { await markErrorResolved(id); load(); toast(t('errorsResolvedToast', locale), 'success', 'check'); };

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-end justify-between">
        <div><h2 className="text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('errorsTitle', locale)}</h2><p className="mt-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{unit ? `${unit.editionName} · ${unit.title}` : t('errorsFilterHint', locale)} · {t('errorsCount', locale, { count: unitErrors.length })}</p></div>
        {unitErrors.length > 0 && <GhostButton onClick={async () => { await clearResolvedErrors(); load(); toast(t('errorsClearedToast', locale), 'success', 'check'); }}>{t('errorsClear', locale)}</GhostButton>}
      </div>

      {unitErrors.length === 0 ? <Panel><div className="flex flex-col items-center p-10 text-center"><CheckCircle2 size={40} className="text-[var(--color-vocab)]" /><p className="mt-3 text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t('errorsEmptyUnit', locale)}</p><p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('errorsEmptyDesc', locale)}</p></div></Panel>
      : <Panel>
        {pagedErrors.map((e) => {
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
                    <span className="truncate text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{label}</span>
                    {item && <SpeakButton text={item.label} accent={tts.accent} rate={tts.rate} size={14} color={meta.tint} />}
                  </div>
                  {e.prompt && <p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('errorsPrompt', locale, { prompt: e.prompt })}</p>}
                  <p className="mt-1 text-[calc(13px*var(--type-scale))] text-[var(--color-trap-deep)]">{t('errorsReason', locale, { reason: e.reason })}</p>
                  <p className="mt-0.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{t('errorsAnswer', locale, { answer: e.answer || item?.meaning || '—' })}</p>
                  <div className="mt-2"><button onClick={() => resolve(e.id!)} className="press inline-flex items-center gap-1 rounded-[var(--radius-md)] border-2 border-[var(--color-vocab-border)] bg-[var(--color-vocab-soft)] px-3 py-1 text-[calc(12px*var(--type-scale))] font-semibold text-[var(--color-vocab-deep)]"><CheckCircle2 size={13} /> {t('errorsMarkResolved', locale)}</button></div>
                </div>
              </div>
            </Row>
          );
        })}
      </Panel>}
      <PaginationBar page={pager.page} totalPages={pager.totalPages} onPrev={pager.prev} onNext={pager.next} />
    </div>
  );
}