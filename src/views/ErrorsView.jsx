// Dedicated Error Notebook view (spec §4.5). Lists every logged mistake with
// reason, prompt, your answer vs. correct, and lets the user mark resolved.
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, Volume2, BookOpen } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { getErrors, markErrorResolved, clearResolvedErrors } from '../lib/db.js';
import { KIND_META } from '../lib/utils.js';
import { requestSpeak } from '../components/FloatingTTS.jsx';
import { Panel, Row, Tag, GhostButton } from '../components/ui/primitives.jsx';

export default function ErrorsView() {
  const { unit, studyItems, selection, tts } = useApp();
  const [errors, setErrors] = useState([]);

  const load = async () => setErrors(await getErrors());
  useEffect(() => { load(); }, []);

  const unitErrors = errors.filter((e) => e.editionId === selection?.editionId);

  const resolve = async (id) => { await markErrorResolved(id); load(); };

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-[clamp(22px,5vw,30px)] font-bold tracking-[-0.02em]">错题本</h2>
          <p className="mt-1 text-[14px] text-[var(--text-2)]">
            {unit ? `${unit.editionName} · ${unit.title}` : '选择单元后可按本单元筛选'} · 共 {unitErrors.length} 条
          </p>
        </div>
        {unitErrors.length > 0 && (
          <GhostButton onClick={async () => { await clearResolvedErrors(); load(); }}>清除已掌握</GhostButton>
        )}
      </div>

      {unitErrors.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center p-10 text-center">
            <CheckCircle2 size={40} className="text-[var(--vocab)]" />
            <p className="mt-3 text-[15px] font-semibold text-[var(--text)]">本单元还没有错题</p>
            <p className="mt-1 text-[13px] text-[var(--text-3)]">练习和小测中答错的内容会自动出现在这里。</p>
          </div>
        </Panel>
      ) : (
        <Panel>
          {unitErrors.map((e) => {
            const item = studyItems.find((i) => i.id === e.itemId);
            const meta = item ? KIND_META[item.kind] : KIND_META.vocab;
            const label = item ? (item.kind === 'vocab' ? item.word : item.kind === 'phrase' ? item.phrase : item.pattern) : e.itemId;
            return (
              <Row key={e.id}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5"><AlertTriangle size={18} style={{ color: 'var(--trap)' }} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item && <Tag kind={item.kind}>{meta.label}</Tag>}
                      <span className="truncate text-[15px] font-semibold text-[var(--text)]">{label}</span>
                      {item && (
                        <button onClick={() => requestSpeak(label, tts.accent, tts.rate)} className="press ml-auto flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5">
                          <Volume2 size={14} style={{ color: meta.tint }} />
                        </button>
                      )}
                    </div>
                    {e.prompt && <p className="mt-1 text-[13px] text-[var(--text-2)]">题目：{e.prompt}</p>}
                    <p className="mt-1 text-[13px] text-[var(--trap)]">原因：{e.reason}</p>
                    <p className="mt-0.5 text-[13px] text-[var(--text-3)]">正确答案：{e.answer || item?.meaning || '—'}</p>
                    <div className="mt-2">
                      <button
                        onClick={() => resolve(e.id)}
                        className="press inline-flex items-center gap-1 rounded-full border border-[var(--vocab-border)] bg-[var(--vocab-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--vocab)]"
                      >
                        <CheckCircle2 size={13} /> 标记为已掌握
                      </button>
                    </div>
                  </div>
                </div>
              </Row>
            );
          })}
        </Panel>
      )}
    </div>
  );
}
