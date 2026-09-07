import { useMemo, useState } from 'react';
import { PenLine, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import { Panel } from './ui/primitives.tsx';
import { streamChat, buildCorrectionSystemPrompt, extractJson, sanitizeCorrection, isValidCorrection, loadConfig } from '../lib/ai.ts';
import { addError } from '../db/db.ts';
import type { MiniPrompt } from '../types/index.ts';
import type { CorrectionResult } from '../types/index.ts';

const WORD_LIMIT = 300; // 约 30 词上限冗余（含空格标点的字符保护）

/** 微写作批改 prompt（v3 收口）：评分锚点已收编到 buildCorrectionSystemPrompt(mode='miniwrite')，此处只传题面/参照/作答三要素 */
function miniPromptCorrectionPrompt(text: string, question: string, useful: string[]): string {
  return `学生根据本课课文回答了下面的微写作问题，请按系统评分标准批改并只返回 JSON：
{
  "isCorrect": boolean,
  "originalSentence": string,
  "correctedSentence": string,
  "grammarBreakdown": string,
  "examCollocationScore": number
}
grammarBreakdown 用中文从三方面点评：①是否切题 ②语言准确性 ③是否用上了本课表达或课文依据，并给 1 条升级建议。
本课问题：${question}
本课 useful 表达（供参照，学生不必全用）：${useful.slice(0, 5).join(' / ') || '（不限）'}
学生作答：${text}`;
}

/** 微写作卡（审核决策 1：独立模式卡，不塞进 Sprint；Sprint 完成后露出入口） */
export default function MiniWriteView({ miniPrompt, onExit, onBack }: { miniPrompt: MiniPrompt; onExit: () => void; onBack?: () => void }) {
  const locale = useAppStore((s) => s.locale);
  const { unit, selection } = useAppStore();
  const [text, setText] = useState('');
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const cfg = loadConfig();
  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);

  const band = (r: CorrectionResult): { label: string; color: string } => {
    const s = r.examCollocationScore;
    if (s >= 90) return { label: locale === 'zh' ? '优秀' : 'Excellent', color: 'var(--color-vocab)' };
    if (s >= 60) return { label: locale === 'zh' ? '合格' : 'Fair', color: 'var(--color-phrase-deep)' };
    return { label: locale === 'zh' ? '需改进' : 'Needs work', color: 'var(--color-trap-deep)' };
  };

  const run = async () => {
    if (!cfg) { setError(t('miniWriteNoConfig', locale)); return; }
    if (!text.trim()) { setError(locale === 'zh' ? '请先写几句再提交批改。' : 'Write a few sentences first.'); return; }
    setLoading(true); setError(''); setResult(null); setSaved(false);
    try {
      const got = { latest: null as CorrectionResult | null }; // holder 承接流式结果：闭包写入安全，TS 控制流不误收窄
      await streamChat({
        cfg,
        systemPrompt: buildCorrectionSystemPrompt({ mode: 'miniwrite', unitTitle: unit?.title, grade: unit?.grade }),
        userMessage: miniPromptCorrectionPrompt(text, miniPrompt.question, miniPrompt.useful),
        onChunk: (_d, full) => {
          const j = extractJson(full);
          if (j && isValidCorrection(j)) { got.latest = sanitizeCorrection(j); setResult(got.latest); }
        },
        onError: (e) => { setError(e.message || String(e)); },
      });
      const final = got.latest;
      if (!final) { setError(t('aiCorrectionParseError', locale)); return; } // 流正常结束但非 JSON/缺 isCorrect/缺 score：可见报错，不展示 0 分
      // 批改完成后按未达优秀档存入错题本（kind=miniwrite，ErrorsView 显示「微写作」标签）
      if (final.examCollocationScore < 90 && selection) {
        await addError({
          key: `${selection.editionId}:${miniPrompt.id}`,
          editionId: selection.editionId,
          itemId: miniPrompt.id,
          kind: 'miniwrite',
          prompt: miniPrompt.question,
          answer: final.correctedSentence || final.originalSentence,
          reason: final.grammarBreakdown?.slice(0, 200) || '微写作 AI 批改未达优秀档',
        });
        setSaved(true);
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const b = result ? band(result) : null;

  return (
    <Panel><div className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]"><PenLine size={14} strokeWidth={2.25} style={{ color: 'var(--color-accent)' }} /> {t('miniWriteLabel', locale)}</div>
        <button onClick={onBack ?? onExit} className="press flex items-center gap-1 rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-3 py-1.5 text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]"><ArrowLeft size={14} /> {t('back', locale)}</button>
      </div>

      <h3 className="mt-4 text-[calc(17px*var(--type-scale))] font-semibold leading-relaxed text-[var(--color-text)]">{miniPrompt.question}</h3>
      <p className="mt-1.5 text-[calc(13px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{t('miniWritePromptCn', locale)}：{miniPrompt.cn}</p>

      <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-3">
        <p className="text-[calc(12px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">{t('miniWriteUseful', locale)}</p>
        <ul className="mt-1.5 space-y-1">
          {miniPrompt.useful.map((u, i) => (
            <li key={i} className="text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">· {u}</li>
          ))}
        </ul>
      </div>

      <div className="relative mt-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={WORD_LIMIT}
          placeholder={t('miniWritePlaceholder', locale)}
          className="w-full resize-none rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] p-3 pb-7 text-[calc(15px*var(--type-scale))] leading-relaxed outline-none focus:border-[var(--color-accent)]" />
        <span className="tnum pointer-events-none absolute bottom-2 right-3 text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-2)]">{t('miniWriteWordCount', locale, { n: wordCount })}</span>
      </div>

      {error && <p className="mt-2 text-[calc(13px*var(--type-scale))] text-[var(--color-trap-deep)]">{error}</p>}

      {!result ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={onExit} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(14px*var(--type-scale))]">{t('miniWriteSkip', locale)}</button>
          <button onClick={run} disabled={loading || !text.trim()} className="press flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(14px*var(--type-scale))] font-semibold text-white disabled:opacity-50">
            {loading ? t('miniWriteLoading', locale) : <>{t('miniWriteSubmit', locale)} <Send size={14} strokeWidth={2.25} /></>}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-[var(--radius-md)] border-2 p-4" style={{ borderColor: b!.color }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[calc(13px*var(--type-scale))] font-semibold" style={{ color: b!.color }}><Sparkles size={14} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} /> {b!.label} · <span className="tnum">{result.examCollocationScore}</span>/100</span>
            <span className="text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprintAiEstimateNote', locale)}</span>
          </div>
          {result.correctedSentence && result.correctedSentence !== result.originalSentence && (
            <p className="mt-2.5 text-[calc(14.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{result.correctedSentence}</p>
          )}
          <p className="mt-2 whitespace-pre-wrap text-[calc(13px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{result.grammarBreakdown}</p>
          {saved && <p className="mt-2 text-[calc(12px*var(--type-scale))] text-[var(--color-trap-deep)]">{t('miniWriteSaved', locale)}</p>}
          <div className="mt-3 flex justify-end">
            <button onClick={() => { setText(''); setResult(null); setSaved(false); }} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(14px*var(--type-scale))]">{t('miniWriteAgain', locale)}</button>
          </div>
        </div>
      )}
    </div></Panel>
  );
}
