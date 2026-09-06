// AiHistorySection — AI 问答历史（与错题本同页整合）：本机存储的学习卡记录 + 只读回放（零 token）
// 语义定位：AI 与用户的一问一答历史，随错题/学习记录一起查看，非「讲义」收藏。
import { useState, useEffect } from 'react';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { t } from '../lib/i18n.ts';
import { listAiNotes, deleteAiNote, clearAiNotes, type AiNoteRecord } from '../db/db.ts';
import { StudyCardView } from './AiAssistPanel.tsx';

export default function AiHistorySection() {
  const locale = useAppStore((s) => s.locale);
  const tts = useAppStore((s) => s.tts);
  const [notes, setNotes] = useState<AiNoteRecord[]>([]);
  const [replay, setReplay] = useState<AiNoteRecord | null>(null);
  const [chainIdx, setChainIdx] = useState(0); // 0=主卡，1..n=追问层

  useEffect(() => { void listAiNotes().then(setNotes); }, []);

  const removeNote = async (key: string) => {
    await deleteAiNote(key);
    setNotes(await listAiNotes());
    if (replay?.key === key) setReplay(null);
    useToastStore.getState().show(t('aiNotesDeleted', locale), 'info', 'check');
  };
  const clearAllNotes = async () => {
    if (!window.confirm(t('aiNotesClearConfirm', locale))) return;
    await clearAiNotes();
    setNotes([]); setReplay(null);
    useToastStore.getState().show(t('aiNotesCleared', locale), 'info', 'check');
  };
  const relTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return locale === 'zh' ? '刚刚' : 'just now';
    if (diff < 3_600_000) return locale === 'zh' ? `${Math.floor(diff / 60_000)} 分钟前` : `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return locale === 'zh' ? `${Math.floor(diff / 3_600_000)} 小时前` : `${Math.floor(diff / 3_600_000)}h ago`;
    return locale === 'zh' ? `${Math.floor(diff / 86_400_000)} 天前` : `${Math.floor(diff / 86_400_000)}d ago`;
  };

  return (
    <>
      <div className="mt-4 rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between gap-2">
          <p className="tnum text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">{t('aiNotesCount', locale, { count: notes.length })}</p>
          {notes.length > 0 && (
            <button onClick={() => void clearAllNotes()} aria-label={t('aiNotesClear', locale)} title={t('aiNotesClear', locale)} className="press inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-3 py-1.5 text-[calc(12px*var(--type-scale))] font-medium text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]"><Trash2 size={13} strokeWidth={2.25} /> {t('aiNotesClear', locale)}</button>
          )}
        </div>
        {notes.length === 0 ? (
          <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-surface-2)] p-3 text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-3)]">{t('aiNotesEmpty', locale)}</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--color-hairline)]">
            {notes.map((n) => (
              <li key={n.key} className="flex items-center gap-2 py-2.5">
                <button onClick={() => { setReplay(n); setChainIdx(0); }} className="press min-w-0 flex-1 text-left">
                  <span className="block truncate text-[calc(14.5px*var(--type-scale))] font-semibold text-[var(--color-text)]">{n.label}</span>
                  <span className="mt-0.5 block truncate text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">
                    {n.unitTitle || `Unit ${n.unit}`} · {relTime(n.updatedAt)}
                    {n.chain.length > 0 && ` · ${t('aiNotesFollowN', locale, { n: n.chain.length })}`}
                  </span>
                </button>
                <button onClick={() => void removeNote(n.key)} aria-label={t('aiNotesDelete', locale)} title={t('aiNotesDelete', locale)} className="press flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><Trash2 size={14} strokeWidth={2.25} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* 只读回放弹窗（居中）：复用面板的 StudyCardView，追问层间可切换 */}
      {replay && (() => {
        const cur = chainIdx === 0 ? replay.card : replay.chain[chainIdx - 1].card;
        const seg = chainIdx === 0 ? '' : replay.chain[chainIdx - 1].segment;
        const probe = chainIdx === 0 ? '' : replay.chain[chainIdx - 1].probe;
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('aiNotesTitle', locale)}>
            <button aria-label="close" className="absolute inset-0 bg-black/40" onClick={() => setReplay(null)} />
            <div className="relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)] sm:max-w-[560px]">
              <div className="flex shrink-0 items-center justify-between border-b-2 border-[var(--color-hairline)] px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[calc(15px*var(--type-scale))] font-bold text-[var(--color-text)]">{replay.label}</div>
                  <div className="truncate text-[calc(11px*var(--type-scale))] text-[var(--color-text-3)]">{replay.unitTitle || `Unit ${replay.unit}`} · {replay.model}</div>
                </div>
                <button onClick={() => setReplay(null)} aria-label="close" className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]"><X size={17} strokeWidth={2.25} /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {chainIdx > 0 && (
                  <button onClick={() => setChainIdx(0)} className="press mb-3 flex items-center gap-1 text-[calc(12px*var(--type-scale))] font-medium text-[var(--color-ai)]">
                    <ChevronLeft size={14} strokeWidth={2.25} /> {t('aiNotesMain', locale)}
                  </button>
                )}
                <StudyCardView card={cur} accent={tts.accent} rate={tts.rate} highlight={chainIdx === 0 ? replay.label : undefined} />
                {chainIdx > 0 && (
                  <p className="mt-3 rounded-[var(--radius-card)] bg-[var(--color-surface-2)] p-3 text-[calc(12px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">
                    <span className="font-semibold">{seg}</span> — {probe}
                  </p>
                )}
              </div>
              {replay.chain.length > 0 && (
                <div className="flex shrink-0 items-center justify-center gap-2 border-t-2 border-[var(--color-hairline)] px-5 py-2.5">
                  {replay.chain.map((c, i) => (
                    <button key={i} onClick={() => setChainIdx(i + 1)} aria-current={chainIdx === i + 1} className={`press max-w-[42vw] truncate rounded-full border-2 px-3 py-1 text-[calc(11.5px*var(--type-scale))] font-medium sm:max-w-[180px] ${chainIdx === i + 1 ? 'border-[var(--color-ai)] text-[var(--color-ai)]' : 'border-[var(--color-hairline)] text-[var(--color-text-3)]'}`}>
                      {i + 1}. {c.probe}
                    </button>
                  ))}
                  {chainIdx > 0 && <ChevronRight size={14} className="text-[var(--color-text-3)]" aria-hidden="true" />}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
