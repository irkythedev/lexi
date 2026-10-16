// TokenUsageDialog — token 用量弹窗（结构移植自 stem：纯图形仪表盘，无列表、无滚动区）。
//
// 结构：
//   ① 原生 SVG 堆叠柱总览（按模型分色 / 断档日发丝短横条 / 7-14-30 天窗口）
//   ② 图表下方常驻「固定高度读数条」——刻意不做浮动 tooltip：投影稳定、零抖动、零裁切。
//      悬停或点柱给「日期 · 合计 ≈N · 各模型 ≈绝对值 (百分比)」；未选中时回落最近一个
//      有记录的日子，打开即有价值，不出现空读数。
//   ③ 分色图例（全期模型总量收进 title，避免窄屏折行）
//   before 桶没有日期，一律不进时间轴，作为底部独立脚注。
//
// 面板高度随内容自适应：max-h + overflow-y-auto 只作「极矮视口」的兜底。
// 纯展示本地 localStorage 数据，不触网；视觉沿用 lexi 纸面印刷风（CSS 变量）。
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { buildDailyBars, tokenUsageModelTotal, tokenUsageTotal, type TokenUsageData } from '../lib/token-usage.ts';
import { t } from '../lib/i18n.ts';
import type { Locale } from '../types/index.ts';
import TokenUsageChart, { OTHER_COLOR } from './TokenUsageChart.tsx';

interface TokenUsageDialogProps {
  usage: TokenUsageData;
  onClose: () => void;
  locale: Locale;
}

/** 可选统计窗口（天）。14 天在 360px 屏节距 ≈21px，是触控最舒服的密度。 */
const WINDOWS = [7, 14, 30] as const;

/** 窗口默认值：桌面 30 天、窄屏 14 天 */
function defaultWindowDays(): number {
  if (typeof window === 'undefined') return 14;
  return window.innerWidth >= 640 ? 30 : 14;
}

export default function TokenUsageDialog({ usage, onClose, locale }: TokenUsageDialogProps) {
  const [windowDays, setWindowDays] = useState<number>(defaultWindowDays);
  // 当前读数日期（悬停或点柱驱动）。null = 用户未指定 → 回落最近一个有记录的日子
  const [pickDay, setPickDay] = useState<string | null>(null);

  // Esc 关闭（lexi 弹窗惯例：UnitPickerSheet / ReviewView 同款）+ 背景滚动锁
  // （stem 移植项：弹窗开着时页面不跟着滚）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const total = tokenUsageTotal(usage);
  // 堆叠柱总览（日历回填、共同 y 轴、before 排除都由纯函数负责）
  const daily = useMemo(() => buildDailyBars(usage, windowDays), [usage, windowDays]);
  const hasDated = daily.bars.some((b) => b.hasRecord);
  /** 最近一个有记录的柱（未选中时的默认读数；打开弹窗即有意义） */
  const latestBar = useMemo(() => [...daily.bars].reverse().find((b) => b.hasRecord) ?? null, [daily]);
  const activeBar = (pickDay ? daily.bars.find((b) => b.day === pickDay) : null) ?? latestBar;
  const drawn = daily.models.length + (daily.otherModels.length > 0 ? 1 : 0);
  // X 轴时间标尺（左 / 中 / 右）——只取日期的 MM-DD，避免柱子悬空
  const axisLabels = useMemo(() => {
    const all = daily.bars;
    if (all.length === 0) return ['', '', ''];
    const mmdd = (day: string) => (day.length >= 10 ? day.slice(5) : day);
    const mid = all[Math.floor((all.length - 1) / 2)];
    return [mmdd(all[0].day), mmdd(mid.day), mmdd(all[all.length - 1].day)];
  }, [daily]);

  // 读数条完整文案（含各模型绝对值与百分比），窄屏放不下时由 title 兜底
  const segmentText = (bar: NonNullable<typeof activeBar>) =>
    bar.hasRecord
      ? bar.segments
          .map((s) => `${s.isOther ? t('usageOther', locale) : s.model} ≈${s.tokens.toLocaleString()} (${s.sharePct}%)`)
          .join(' · ')
      : t('usageNoRecord', locale);
  const readoutTitle = activeBar
    ? `${activeBar.day} · ${t('usageDayTotal', locale)} ≈${activeBar.total.toLocaleString()} · ${segmentText(activeBar)}`
    : t('usageChartHint', locale);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('usageDialogTitle', locale)}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-[var(--radius-hero)] border-2 border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-panel)] sm:max-w-md">
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3">
          <div>
            <h2 className="text-[calc(14px*var(--type-scale))] font-bold text-[var(--color-text)]">{t('usageDialogTitle', locale)}</h2>
            <p className="tnum text-[calc(12px*var(--type-scale))] text-[var(--color-text-3)]">{t('usageDialogTotal', locale, { count: total.toLocaleString() })}</p>
          </div>
          <button onClick={onClose} aria-label={t('close', locale)} className="press -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-surface-2)]"><X size={18} strokeWidth={2.25} /></button>
        </div>

        {/* 堆叠柱总览（没有任何按天记录时不渲染空图，只留空态文案） */}
        {hasDated && (
          <div>
            <div className="flex items-center justify-between gap-2 px-3 pt-2">
              <p className="truncate text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">{t('usageDailyTitle', locale, { n: windowDays })}</p>
              <div className="seg shrink-0" role="group" aria-label={t('usageWindowAria', locale)}>
                {WINDOWS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWindowDays(d)}
                    aria-pressed={windowDays === d}
                    className={`press ${windowDays === d ? 'active' : ''}`}
                  >
                    {d === 7 ? t('usageDays7', locale) : d === 14 ? t('usageDays14', locale) : t('usageDays30', locale)}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-3 pt-1">
              <TokenUsageChart
                bars={daily.bars}
                models={daily.models}
                hasOther={daily.otherModels.length > 0}
                activeDay={activeBar?.day ?? null}
                onHover={setPickDay}
                onSelect={setPickDay}
                ariaLabel={t('usageChartA11y', locale, { n: windowDays })}
              />
            </div>
            {/* X 轴时间标尺：左 / 中 / 右三点，避免柱子悬空（窄屏也只占一行） */}
            <div className="tnum grid grid-cols-3 px-3 text-[calc(10.5px*var(--type-scale))] text-[var(--color-text-3)]">
              <span className="text-left">{axisLabels[0]}</span>
              <span className="text-center">{axisLabels[1]}</span>
              <span className="text-right">{axisLabels[2]}</span>
            </div>
            {/* 固定高度读数条：高度写死 → 悬停 / 切换窗口 / 换日都不抖动、不裁切 */}
            <div className="flex h-12 flex-col justify-center gap-0.5 overflow-hidden border-t border-[var(--color-hairline)]/30 px-3" title={readoutTitle} data-usage-readout="1">
              {activeBar ? (
                <>
                  <p className="tnum truncate text-[calc(11.5px*var(--type-scale))] font-semibold text-[var(--color-text)]">
                    {activeBar.day} · {t('usageDayTotal', locale)} ≈{activeBar.total.toLocaleString()}
                  </p>
                  <p className="text-[calc(11px*var(--type-scale))] leading-snug text-[var(--color-text-3)]">{segmentText(activeBar)}</p>
                </>
              ) : (
                <p className="truncate text-[calc(11.5px*var(--type-scale))] text-[var(--color-text-3)]">{t('usageChartHint', locale)}</p>
              )}
            </div>
            {/* 图例（只有多模型分色时才出现；单模型沿用 --color-ai，无需图例） */}
            {drawn > 1 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--color-hairline)]/30 px-3 py-1.5">
                {daily.models.map((model, i) => (
                  <span
                    key={model}
                    className="tnum inline-flex items-center gap-1 text-[calc(11px*var(--type-scale))] text-[var(--color-text-3)]"
                    title={`${t('usageModelTotal', locale)}${tokenUsageModelTotal(model, usage).toLocaleString()}`}
                  >
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: `var(--chart-${Math.min(i + 1, 5)})` }} />
                    {model}
                  </span>
                ))}
                {daily.otherModels.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[calc(11px*var(--type-scale))] text-[var(--color-text-3)]">
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: OTHER_COLOR }} />
                    {t('usageOther', locale)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 空态：完全没有任何记录（连旧版本累计也没有）时才出现 */}
        {!hasDated && daily.legacyTokens === 0 && (
          <p className="px-4 py-8 text-center text-[calc(12.5px*var(--type-scale))] italic text-[var(--color-text-3)]">{t('usageEmpty', locale)}</p>
        )}

        {/* before 脚注：无日期桶不进时间轴，只在此单列 */}
        {daily.legacyTokens > 0 && (
          <div className="border-t border-[var(--color-hairline)]/30 px-3 py-1.5">
            <p className="text-[calc(11px*var(--type-scale))] leading-snug text-[var(--color-text-3)]">
              {t('usageLegacyPrefix', locale)}{daily.legacyTokens.toLocaleString()}{t('usageLegacySuffix', locale)}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
