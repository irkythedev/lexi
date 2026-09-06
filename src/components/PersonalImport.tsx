// PersonalImport — 个人导入弹窗（纯导入流程）：粘贴 → 解析预览 → 命名 → 保存到 IndexedDB。
// 清单的管理与学习入口在 Learn 页空态（ImportSection）；保存成功后通过 onSaved 通知父组件刷新清单。
// Step 1: paste text (TSV: word|meaning|phonetic|example, or JSON array)
// Step 2: review parsed rows with error report
// Step 3: name + save to IndexedDB
import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { parseImport, generateImportId, type ImportResult } from '../lib/import.ts';
import { savePersonalBatch } from '../db/db.ts';
import { useToastStore } from '../stores/toastStore.ts';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { KIND_META } from '../lib/utils.ts';
import { GhostButton, PrimaryButton } from './ui/primitives.tsx';

const PLACEHOLDER = `# 每行一个，竖线分隔：单词|释义|音标|例句
perseverance|n. 毅力；坚持|/ˌpɜːsɪˈvɪərəns/|Perseverance is the key to success.
make a difference|v. 产生影响；有作用||Small actions can make a big difference.
not only...but also|不仅...而且||She speaks not only English but also French.
# 也支持 JSON： [{"word":"...","meaning":"...","phonetic":"...","example":"..."}]
`;

export default function PersonalImport({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const locale = useAppStore((s) => s.locale);
  const [text, setText] = useState('');
  const [step, setStep] = useState<0 | 1>(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [name, setName] = useState('');

  const parse = () => {
    const r = parseImport(text);
    setResult(r);
    if (r.ok.length > 0) { setStep(1); setName(t('personalImportDefaultName', locale)); }
  };

  const save = async () => {
    if (!result || result.ok.length === 0) return;
    const finalName = name.trim() || t('personalImportDefaultName', locale);
    await savePersonalBatch({
      id: generateImportId(),
      name: finalName,
      entries: result.ok,
      createdAt: Date.now(),
    });
    useToastStore.getState().show(t('personalImportSaved', locale, { count: result.ok.length, name: finalName }), 'success', 'check');
    onSaved?.();
    // Reset to step 0 for another import.
    setStep(0); setText(''); setResult(null); setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-panel)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b-2 border-[var(--color-hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2 text-[calc(15px*var(--type-scale))] font-semibold"><Upload size={17} style={{ color: 'var(--color-accent)' }} /> {t('personalImportTitle', locale)}</div>
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
              className="w-full resize-y rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] px-4 py-3 text-[calc(13px*var(--type-scale))] leading-relaxed outline-none focus:border-[var(--color-accent)]"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">支持 TSV（word|meaning|phonetic|example）与 JSON</span>
              <PrimaryButton onClick={parse} disabled={!text.trim()}>解析预览</PrimaryButton>
            </div>
          </div>
        )}

        {/* Step 1: review */}
        {step === 1 && result && (
          <div className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center gap-2 text-[calc(13px*var(--type-scale))]">
              <span className="rounded-[var(--radius-sm)] px-3 py-1" style={{ background: 'var(--color-vocab-soft)', color: 'var(--color-vocab)' }}>可导入 {result.ok.length}</span>
              <span className="rounded-[var(--radius-sm)] px-3 py-1" style={{ background: 'var(--color-trap-soft)', color: 'var(--color-trap)' }}>待修正 {result.errors.length}</span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-2xl border-2 border-[var(--color-hairline)]">
              {result.ok.map((e, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-3 py-1.5 text-[calc(13px*var(--type-scale))] last:border-b-0">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[calc(10px*var(--type-scale))] font-bold" style={{ background: KIND_META[e.type].soft, color: KIND_META[e.type].text }}>{KIND_META[e.type].label.zh.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{e.label}</span>
                  <span className="max-w-[40%] truncate text-[var(--color-text-3)]">{e.meaning}</span>
                </div>
              ))}
              {result.errors.map((er, i) => (
                <div key={`e${i}`} className="flex items-center gap-2 border-b border-[var(--color-hairline)] px-3 py-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-trap)] last:border-b-0">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-trap)]" />
                  <span className="min-w-0 flex-1 truncate">{er.text}</span>
                  <span className="shrink-0 text-[calc(11px*var(--type-scale))]">{er.reason}</span>
                </div>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('personalImportName', locale)}
              maxLength={40}
              className="flex-1 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] px-4 py-2.5 text-[calc(14px*var(--type-scale))] outline-none focus:border-[var(--color-accent)]"
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
