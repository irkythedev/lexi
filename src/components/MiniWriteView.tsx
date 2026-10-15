import { useEffect, useMemo, useRef, useState } from 'react';
import { PenLine, Sparkles, ArrowLeft, ChevronDown } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import SpeakButton from './SpeakButton.tsx';
import { streamChat, buildCorrectionSystemPrompt, extractJson, sanitizeCorrection, isValidCorrection, loadConfig, parseRetryMessage, renderStreamFailure, TEMP_CORRECTION } from '../lib/ai.ts';
import { addError, getSetting, setSetting } from '../db/db.ts';
import { UNIT_READINGS } from '../data/textbooks/readings.ts';
import type { MiniPrompt } from '../types/index.ts';
import type { CorrectionResult } from '../types/index.ts';

const WORD_LIMIT = 300; // 约 30 词上限冗余（含空格标点的字符保护）
const WORD_SOFT = 30; // 词数软上限：超了变提示色，不禁提交
const DRAFT_KEY = (editionId: string, unitNum: number) => `miniwrite-draft:${editionId}:${unitNum}`;

/** 微写作批改 prompt（v3 收口）：评分锚点已收编到 buildCorrectionSystemPrompt(mode='miniwrite')，此处只传题面/参照/作答/课文四要素（v3.5：补课文原文，「依据本课课文」评分才有据；不传词表） */
function miniPromptCorrectionPrompt(text: string, question: string, useful: string[], passage?: string): string {
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
${passage ? `课文原文（评分「课文依据」以此为准）：\n${passage}\n` : ''}学生作答：${text}`;
}

/** 微写作卡（审核决策 1：独立模式卡，不塞进 Sprint；Sprint 完成后露出入口）
 *  结构收口（ba68ce5 之后）：输入框占主高度、喇叭贴题干、建议默认收起可点插入、
 *  草稿入 settings（换单元清旧草稿）、0 词禁批改。 */
export default function MiniWriteView({ miniPrompt, onExit, onBack, onViewReading, previewText, previewLoading, previewResult }: { miniPrompt: MiniPrompt; onExit: () => void; onBack?: () => void; onViewReading?: () => void; /** 视频模式（Remotion）：受控文本，默认 undefined = 行为与现在完全一致 */ previewText?: string; /** 受控批改进行中，默认 undefined = 行为与现在完全一致 */ previewLoading?: boolean; /** 受控批改结果卡，默认 undefined = 行为与现在完全一致 */ previewResult?: CorrectionResult | null }) {
  const locale = useAppStore((s) => s.locale);
  const { unit, selection, tts } = useAppStore();
  // 本课课文 paragraphs 全文（v3.5）：批改「依据本课课文」的评分依据；单元无 Reading 时缺省不传
  const passage = useMemo(() => {
    const r = unit ? UNIT_READINGS.find((x) => x.unit === unit.unit) : undefined;
    return r?.paragraphs.join('\n\n');
  }, [unit]);
  const hasReading = !!passage;
  const [text, setText] = useState('');
  // 受控预览态（视频）：传 previewText 就以外部值为准；草稿 IndexedDB effect 仍在但 stub 环境下无副作用
  const effText = previewText ?? text;
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  // 受控注入（视频）：批改 loading/结果以外部值为准（undefined = 原行为）
  const effResult = previewResult !== undefined ? previewResult : result;
  const effLoading = previewLoading ?? loading;
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [usefulOpen, setUsefulOpen] = useState(false);
  const cfg = loadConfig();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const wordCount = useMemo(() => effText.trim() ? effText.trim().split(/\s+/).length : 0, [effText]);
  const overLimit = wordCount > WORD_SOFT;

  // ── 草稿持久化（settings 通道）──
  const draftKey = selection ? DRAFT_KEY(selection.editionId, unit?.unit ?? 0) : null;
  // 进页读草稿：换单元时 key 变化 → 读到空串自然重置；旧单元草稿清零（用户拍板：不可恢复）
  useEffect(() => {
    let alive = true;
    if (!draftKey) return;
    void getSetting<string>(draftKey, '').then((v) => { if (alive) setText(v || ''); });
    return () => { alive = false; };
  }, [draftKey]);
  // 输入 debounce 写草稿
  useEffect(() => {
    if (!draftKey) return;
    const id = window.setTimeout(() => { void setSetting(draftKey, text); }, 400);
    return () => window.clearTimeout(id);
  }, [text, draftKey]);

  const clearDraft = () => {
    if (!draftKey) return;
    void setSetting(draftKey, '');
  };

  // useful 表达点击插入：光标处拼接，插入后焦点回输入框
  const insertUseful = (u: string) => {
    const ta = taRef.current;
    const en = u.replace(/^[·\s]+/, '');
    if (!ta) { setText((v) => (v ? `${v} ${en}` : en)); return; }
    const s = ta.selectionStart ?? text.length;
    const e = ta.selectionEnd ?? s;
    const needsSpaceBefore = s > 0 && !/[\s\n]$/.test(text.slice(0, s));
    const piece = `${needsSpaceBefore ? ' ' : ''}${en}`;
    const next = text.slice(0, s) + piece + text.slice(e);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = s + piece.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const band = (r: CorrectionResult): { label: string; color: string } => {
    const s = r.examCollocationScore;
    if (s >= 90) return { label: locale === 'zh' ? '优秀' : 'Excellent', color: 'var(--color-vocab)' };
    if (s >= 60) return { label: locale === 'zh' ? '合格' : 'Fair', color: 'var(--color-phrase-deep)' };
    return { label: locale === 'zh' ? '需改进' : 'Needs work', color: 'var(--color-trap-deep)' };
  };

  const run = async () => {
    if (!cfg) { setError(t('miniWriteNoConfig', locale)); return; }
    if (!text.trim()) { setError(locale === 'zh' ? '请先写几句再提交批改。' : 'Write a few sentences first.'); return; }
    // 发送前断言（prompt-v4）：微写作批改必填 题面 + 课文依据（本单元有 Reading 必有 passage）
    if (!miniPrompt.question) { setError(t('aiCtxMissing', locale, { field: locale === 'zh' ? '写作题面' : 'writing prompt' })); return; }
    if (!passage) { setError(t('aiCtxMissing', locale, { field: locale === 'zh' ? '课文原文' : 'unit text' })); return; }
    setLoading(true); setError(''); setResult(null); setSaved(false);
    try {
      const sysPrompt = buildCorrectionSystemPrompt({ mode: 'miniwrite', unitTitle: unit?.title, grade: unit?.grade });
      const msg = miniPromptCorrectionPrompt(text, miniPrompt.question, miniPrompt.useful, passage);
      // 请求纪律（prompt-v4）：首请求 + 最多 1 次解析失败补问（retryUsed 上限）
      const attempt = async (userMessage: string) => {
        const got = { latest: null as CorrectionResult | null }; // holder 承接流式结果：闭包写入安全，TS 控制流不误收窄
        let failure: Error | null = null;
        await streamChat({
          cfg, systemPrompt: sysPrompt, userMessage,
          temperature: TEMP_CORRECTION, // 批改判分低温 0.2
          onChunk: (_d, full) => {
            const j = extractJson(full);
            if (j && isValidCorrection(j)) { got.latest = sanitizeCorrection(j); setResult(got.latest); }
          },
          onError: (e) => { failure = e; }, // HTTP/网络/看门狗/空答错误（stem 加固口径）
        });
        return { latest: got.latest, failure };
      };
      let { latest: final, failure } = await attempt(msg);
      if (!final && !failure) {
        // 追加而非替换：补问必须携带原作文/题面上下文，否则真实模型无从重新批改
        const again = await attempt(`${msg}\n\n${parseRetryMessage()}`); // 补问 1 次（一次点击最多 2 次请求）
        if (again.latest) final = again.latest;
        else failure = again.failure;
      }
      if (!final) {
        // 两次均败：可见报错（失败分类文案），不展示 0 分
        setError(failure ? renderStreamFailure(failure, locale, t) : t('aiCorrectionParseError', locale));
        return;
      }
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
      // 提交成功 → 草稿清零
      clearDraft();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const b = effResult ? band(effResult) : null;

  return (
    <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-4"><div className="flex min-h-[calc(100dvh-13rem)] flex-col">
      {/* 头部：标签 + 返回 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[calc(12px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]"><PenLine size={14} strokeWidth={2.25} style={{ color: 'var(--color-accent)' }} /> {t('miniWriteLabel', locale)}</div>
        <button onClick={onBack ?? onExit} className="press flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 text-[calc(15px*var(--type-scale))] font-medium text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]"><ArrowLeft size={18} strokeWidth={2.25} /> {t('back', locale)}</button>
      </div>

      {/* 题干块：英文题干 + 喇叭（只读题干）+ 题意 + 查看课文 */}
      <h3 className="mt-4 flex items-start gap-1 text-[calc(17px*var(--type-scale))] font-semibold leading-relaxed text-[var(--color-text)]">
        <span className="min-w-0 flex-1">{miniPrompt.question}</span>
        <SpeakButton text={miniPrompt.question} accent={tts.accent} rate={tts.rate} size={16} compact className="-mr-2 -mt-1" />
      </h3>
      <p className="mt-1.5 text-[calc(13px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{t('miniWritePromptCn', locale)}：{miniPrompt.cn}</p>
      {hasReading && (
        <button onClick={onViewReading ?? onBack ?? onExit} className="press mt-2 inline-flex w-fit items-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-hairline)] px-3 py-1.5 text-[calc(12.5px*var(--type-scale))] text-[var(--color-accent)]">
          {t('miniWriteViewReading', locale)} <ArrowLeft size={12} strokeWidth={2.25} className="rotate-180" />
        </button>
      )}

      {/* 输入区：占主高度 */}
      <div className="relative mt-3 flex min-h-[9rem] flex-1 flex-col">
        <textarea ref={taRef} value={effText} onChange={(e) => setText(e.target.value)} maxLength={WORD_LIMIT}
          placeholder={t('miniWritePlaceholder', locale)}
          className="w-full flex-1 resize-none rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] bg-[var(--color-input-bg)] p-3 text-[calc(15px*var(--type-scale))] leading-relaxed outline-none focus:border-[var(--color-accent)]" />
        <div className="mt-1.5 flex justify-end">
          <span className={`tnum text-[calc(11.5px*var(--type-scale))] ${overLimit ? 'font-semibold text-[var(--color-trap-deep)]' : 'text-[var(--color-text-2)]'}`}>{wordCount}/{WORD_SOFT}</span>
        </div>
      </div>

      {/* 建议表达：默认收起，展开露前 2 条，可点插入 */}
      <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)]">
        <button onClick={() => setUsefulOpen((v) => !v)} className="press flex w-full items-center justify-between p-3 text-[calc(12px*var(--type-scale))] font-semibold text-[var(--color-text-2)]">
          {t('miniWriteUseful', locale)}
          <ChevronDown size={14} strokeWidth={2.25} className={`transition-transform ${usefulOpen ? 'rotate-180' : ''}`} />
        </button>
        {usefulOpen && (
          <ul className="space-y-1 px-3 pb-3">
            {miniPrompt.useful.slice(0, 2).map((u, i) => (
              <li key={i}>
                <button onClick={() => insertUseful(u)} className="press w-full rounded-[var(--radius-sm)] px-1 py-0.5 text-left text-[calc(13.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">· {u}</button>
              </li>
            ))}
            {miniPrompt.useful.length > 2 && (
              <li className="pt-1 text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-2)]">{locale === 'zh' ? '（其余表达供参照，不必全用）' : '(Rest for reference)'}</li>
            )}
          </ul>
        )}
      </div>

      {error && <p className="mt-2 text-[calc(13px*var(--type-scale))] text-[var(--color-trap-deep)]">{error}</p>}

      {!effResult ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={onExit} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(14px*var(--type-scale))] text-[var(--color-text-2)]">{t('miniWriteSkip', locale)}</button>
          <button onClick={run} disabled={effLoading || !effText.trim()} className="press flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] border-2 border-[var(--color-hairline)] px-5 py-2 text-[calc(14px*var(--type-scale))] font-semibold text-white disabled:opacity-50">
            {effLoading ? t('miniWriteLoading', locale) : <>{t('miniWriteSubmit', locale)} <PenLine size={14} strokeWidth={2.25} /></>}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-[var(--radius-md)] border-2 p-4" style={{ borderColor: b!.color }}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[calc(13px*var(--type-scale))] font-semibold" style={{ color: b!.color }}><Sparkles size={14} strokeWidth={2.25} style={{ color: 'var(--color-ai)' }} /> {b!.label} · <span className="tnum">{effResult.examCollocationScore}</span>/100</span>
            <span className="text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-2)]">{t('sprintAiEstimateNote', locale)}</span>
          </div>
          {effResult.correctedSentence && effResult.correctedSentence !== effResult.originalSentence && (
            <p className="mt-2.5 text-[calc(14.5px*var(--type-scale))] leading-relaxed text-[var(--color-text)]">{effResult.correctedSentence}</p>
          )}
          <p className="mt-2 whitespace-pre-wrap text-[calc(13px*var(--type-scale))] leading-relaxed text-[var(--color-text-2)]">{effResult.grammarBreakdown}</p>
          {saved && <p className="mt-2 text-[calc(12px*var(--type-scale))] text-[var(--color-trap-deep)]">{t('miniWriteSaved', locale)}</p>}
          <div className="mt-3 flex justify-end">
            <button onClick={() => { setText(''); setResult(null); setSaved(false); }} className="press rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)] px-4 py-2 text-[calc(14px*var(--type-scale))]">{t('miniWriteAgain', locale)}</button>
          </div>
        </div>
      )}
    </div></div>
  );
}
