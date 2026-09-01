// PersonalImport — import user word/phrase/pattern lists in Settings.
// Step 1: paste text (TSV: word|meaning|phonetic|example, or JSON array)
// Step 2: review parsed rows with error report
// Step 3: name + save to IndexedDB
import { useEffect, useState } from 'react';
import { X, Upload, FileText, Trash2 } from 'lucide-react';
import { parseImport, generateImportId, type ImportResult, type ImportEntry } from '../lib/import.ts';
import { savePersonalBatch, getPersonalBatches, deletePersonalBatch, type PersonalBatch } from '../db/db.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { KIND_META } from '../lib/utils.ts';
import { GhostButton, PrimaryButton } from './ui/primitives.tsx';

const PLACEHOLDER = `# 每行一个，竖线分隔：单词|释义|音标|例句
perseverance|n. 毅力；坚持|/ˌpɜːsɪˈvɪərəns/|Perseverance is the key to success.
make a difference|v. 产生影响；有作用||Small actions can make a big difference.
not only...but also|不仅...而且||She speaks not only English but also French.
# 也支持 JSON： [{"word":"...","meaning":"...","phonetic":"...","example":"..."}]
`;

export default function PersonalImport({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [step, setStep] = useState<0 | 1>(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [name, setName] = useState('');
  const [batches, setBatches] = useState<PersonalBatch[]>([]);

  // Load existing batches once.
  useEffect(() => { void getPersonalBatches().then(setBatches); }, []);

  const parse = () => {
    const r = parseImport(text);
    setResult(r);
    if (r.ok.length > 0) { setStep(1); setName(`导入 ${new Date().toLocaleDateString()}`); }
  };

  const save = async () => {
    if (!result || result.ok.length === 0) return;
    const batch: PersonalBatch = {
      id: generateImportId(),
      name: name.trim() || '未命名清单',
      entries: result.ok,
      createdAt: Date.now(),
    };
    await savePersonalBatch(batch);
    setBatches(await getPersonalBatches());
    useToastStore.getState().show(`已保存 ${result.ok.length} 条到「${batch.name}」`, 'success', 'check');
    // Reset to step 0 for another import.
    setStep(0); setText(''); setResult(null);
  };

  const remove = async (id: string) => {
    await deletePersonalBatch(id);
    useToastStore.getState().show('已删除该清单', 'info', 'alert');
    setBatches(await getPersonalBatches());
  };

  const countByKind = (entries: ImportEntry[]) => {
    const c = { vocab: 0, phrase: 0, pattern: 0 };
    for (const e of entries) c[e.type]++;
    return c;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-panel)] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)] sm:rounded-[var(--radius-panel)]"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2 text-[15px] font-semibold"><Upload size={17} style={{ color: 'var(--color-accent)' }} /> 个人导入</div>
          <button onClick={onClose} className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]" aria-label="关闭"><X size={17} /></button>
        </div>

        {/* Step 0: paste */}
        {step === 0 && (
          <div className="flex flex-col gap-3 p-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={10}
              className="w-full resize-y rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-ground)] px-4 py-3 text-[13px] leading-relaxed outline-none focus:border-[var(--color-accent)]"
            />
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--color-text-3)]">支持 TSV（word|meaning|phonetic|example）与 JSON</span>
              <PrimaryButton onClick={parse} disabled={!text.trim()}>解析预览</PrimaryButton>
            </div>
            {batches.length > 0 && (
              <div className="mt-1">
                <div className="mb-1.5 text-[13px] font-semibold text-[var(--color-text-2)]">已导入清单</div>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {batches.map((b) => {
                    const c = countByKind(b.entries);
                    return (
                      <div key={b.id} className="flex items-center justify-between rounded-xl border border-[var(--color-hairline)] px-3 py-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[14px] font-medium">
                            <span className="truncate">{b.name}</span>
                            <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--color-text-3)]">
                              {c.vocab}词 {c.phrase}短 {c.pattern}句
                            </span>
                          </div>
                        </div>
                        <button onClick={() => void remove(b.id)} className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-trap)] hover:bg-[var(--color-trap-soft)]" aria-label="删除"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: review */}
        {step === 1 && result && (
          <div className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="rounded-full px-3 py-1" style={{ background: 'var(--color-vocab-soft)', color: 'var(--color-vocab)' }}>可导入 {result.ok.length}</span>
              <span className="rounded-full px-3 py-1" style={{ background: 'var(--color-trap-soft)', color: 'var(--color-trap)' }}>待修正 {result.errors.length}</span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-[var(--color-hairline)]">
              {result.ok.map((e, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-3 py-1.5 text-[13px] last:border-b-0">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: KIND_META[e.type].soft, color: KIND_META[e.type].text }}>{KIND_META[e.type].label.zh.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{e.label}</span>
                  <span className="max-w-[40%] truncate text-[var(--color-text-3)]">{e.meaning}</span>
                </div>
              ))}
              {result.errors.map((er, i) => (
                <div key={`e${i}`} className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-3 py-1.5 text-[13px] text-[var(--color-trap)] last:border-b-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-trap)]" />
                  <span className="min-w-0 flex-1 truncate">{er.text}</span>
                  <span className="shrink-0 text-[11px]">{er.reason}</span>
                </div>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="清单名称（可选）"
              maxLength={40}
              className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-ground)] px-4 py-2.5 text-[14px] outline-none focus:border-[var(--color-accent)]"
            />
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setStep(0)}>返回修改</GhostButton>
              <PrimaryButton onClick={() => void save()} disabled={result.ok.length === 0}>
                <FileText size={16} /> 保存 {result.ok.length} 条
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}