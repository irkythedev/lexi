// TokenUsageDialog — token 用量树状图弹窗（思路移植自 stem，样式转译纸面印刷风）。
// 组织：日期为第一维（可展开/收起）→ 该日各模型用量条形图；
// 顶部累计总数 + 各模型总计。纯展示 localStorage 数据，不触网。
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { tokenUsageModelTotal, tokenUsageTotal, type TokenUsageData } from '../lib/token-usage.ts';
import { t } from '../lib/i18n.ts';
import type { Locale } from '../types/index.ts';

export default function TokenUsageDialog({ usage, onClose, locale }: { usage: TokenUsageData; onClose: () => void; locale: Locale }) {
  // 展开的日期集合（默认全部收起；点击日期行切换）
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleDay = (day: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const total = tokenUsageTotal(usage);
  // 模型总计（顶部汇总行，按用量降序）
  const modelTotals = useMemo(
    () => Object.keys(usage)
      .map((model) => ({ model, total: tokenUsageModelTotal(model, usage) }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total),
    [usage],
  );

  // 按日期聚合：day → [{model, tokens}]，倒序（最新在前），'before' 历史桶排最后
  const byDay = useMemo(() => {
    const map = new Map<string, { model: string; tokens: number }[]>();
    for (const [model, days] of Object.entries(usage)) {
      for (const [day, tokens] of Object.entries(days)) {
        if (!Number.isFinite(tokens) || tokens <= 0) continue;
        const arr = map.get(day) ?? [];
        arr.push({ model, tokens });
        map.set(day, arr);
      }
    }
    const dayKeys = [...map.keys()];
    dayKeys.sort((a, b) => (a === 'before' ? 1 : b === 'before' ? -1 : b.localeCompare(a)));
    return dayKeys.map((day) => ({
      day,
      dayTotal: map.get(day)!.reduce((s, x) => s + x.tokens, 0),
      models: map.get(day)!.sort((a, b) => b.tokens - a.tokens),
    }));
  }, [usage]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t('usageDialogTitle', locale)}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="safe-b relative z-10 flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)] sm:max-w-md sm:rounded-[var(--radius-hero)]">
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3">
          <div>
            <h2 className="text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('usageDialogTitle', locale)}</h2>
            <p className="tnum text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">{t('usageDialogTotal', locale, { count: total.toLocaleString() })}</p>
          </div>
          <button onClick={onClose} aria-label={t('close', locale)} className="press -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={18} strokeWidth={2.25} /></button>
        </div>
        {/* 模型总计（一行一个，紧凑） */}
        {modelTotals.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-b border-[var(--color-hairline)] px-4 py-2">
            {modelTotals.map(({ model, total: mt }) => (
              <span key={model} className="tnum text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">
                {model}: <span className="font-semibold text-[var(--color-text)]">≈{mt.toLocaleString()}</span>
              </span>
            ))}
          </div>
        )}
        {/* 日期树状列表（滚动） */}
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
          {byDay.length === 0 && (
            <p className="py-8 text-center text-[calc(12.5px*var(--type-scale))] italic text-[var(--color-text-3)]">{t('usageEmpty', locale)}</p>
          )}
          {byDay.map(({ day, dayTotal, models }) => {
            const open = expanded.has(day);
            return (
              <div key={day} className="overflow-hidden rounded-[var(--radius-md)] border-2 border-[var(--color-hairline)]">
                {/* 日期行 */}
                <button onClick={() => toggleDay(day)} className="press flex w-full items-center gap-1.5 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]">
                  <ChevronDown size={14} strokeWidth={2.25} className={`shrink-0 text-[var(--color-text-3)] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                  <span className="text-[calc(13px*var(--type-scale))] font-bold text-[var(--color-text)]">{day === 'before' ? t('usageBefore', locale) : day}</span>
                  <span className="tnum ml-auto shrink-0 text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">≈{dayTotal.toLocaleString()}</span>
                </button>
                {/* 该日各模型用量（展开时） */}
                {open && (
                  <div className="space-y-1.5 border-t border-[var(--color-hairline)] px-3 py-2">
                    {models.map(({ model, tokens }) => (
                      <div key={model} className="flex items-center gap-2 text-[calc(11.5px*var(--type-scale))]">
                        <span className="w-24 shrink-0 truncate text-[var(--color-text-3)]">{model}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                          <span className="block h-full bg-[var(--color-ai)]" style={{ width: `${Math.max(4, Math.round((tokens / dayTotal) * 100))}%` }} />
                        </span>
                        <span className="tnum shrink-0 font-semibold text-[var(--color-text)]">≈{tokens.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
