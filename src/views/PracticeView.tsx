import { useState } from 'react';
import { Layers, Puzzle, Zap, ChevronDown, ArrowRight } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import Flashcard from '../components/Flashcard.tsx';
import CollocationConnector from '../components/CollocationConnector.tsx';
import Sprint from '../components/Sprint.tsx';
import { KIND_META } from '../lib/utils.ts';

type PracticeMode = 'flash' | 'connector' | 'sprint';

const MODES: { id: PracticeMode; titleKey: string; descKey: string; icon: typeof Layers; grad: string }[] = [
  { id: 'flash', titleKey: 'modeFlash', descKey: 'modeFlashDesc', icon: Layers, grad: 'var(--grad-cta)' },
  { id: 'connector', titleKey: 'modeConnector', descKey: 'modeConnectorDesc', icon: Puzzle, grad: 'var(--grad-cta)' },
  { id: 'sprint', titleKey: 'modeSprint', descKey: 'modeSprintDesc', icon: Zap, grad: 'var(--grad-cta)' },
];

export default function PracticeView() {
  const { unit, locale } = useAppStore();
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!unit) return <div className="mx-auto max-w-[var(--max-read)] px-[var(--pad-x)] py-10 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('practiceEmpty', locale)}</div>;
  if (mode === 'flash') return <Flashcard items={useAppStore.getState().studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;

  const items = useAppStore.getState().studyItems;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-4"><h2 className="text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('practiceTitle', locale)}</h2><p className="mt-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{unit.editionName} · {unit.title}</p></div>

      <div className="space-y-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isOpen = expanded === m.id;

          return (
            <div key={m.id} className="overflow-hidden rounded-[var(--radius-hero)] border border-[var(--color-hairline)] transition-all">
              {/* 卡头 */}
              <button
                onClick={() => setExpanded(isOpen ? null : m.id)}
                className="press flex w-full items-center gap-4 p-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: m.grad }}>
                  <Icon size={22} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t(m.titleKey, locale)}</span>
                  <span className="mt-0.5 block text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{t(m.descKey, locale)}</span>
                </span>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-[var(--color-text-3)] transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* 展开内容 */}
              <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: isOpen ? '320px' : '0px' }}
              >
                <div className="border-t border-[var(--color-hairline)] px-4 py-4">
                  <ModePreview modeId={m.id} items={items} unit={unit} locale={locale} />
                  <button
                    onClick={() => setMode(m.id)}
                    className="press mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--color-accent)] py-2.5 text-[calc(15px*var(--type-scale))] font-semibold text-white"
                  >
                    {t('enter', locale)} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModePreview({ modeId, items, unit, locale }: { modeId: PracticeMode; items: import('../types/index.ts').StudyItem[]; unit: import('../types/index.ts').Unit; locale: import('../types/index.ts').Locale }) {
  if (modeId === 'flash') {
    if (!items.length) return <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">本单元暂无词汇数据</p>;
    const sample = items[0];
    const meta = KIND_META[sample.kind];
    return (
      <div>
        <p className="text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">共 {items.length} 张卡片 · 点击翻转 · SRS 评分</p>
        <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3">
          <span className="rounded-full px-2 py-0.5 text-[calc(11px*var(--type-scale))] font-semibold" style={{ background: meta.soft, color: meta.text }}>{meta.label[locale]}</span>
          <span className="text-[calc(15px*var(--type-scale))] font-semibold text-[var(--color-text)]">{sample.label}</span>
          <span className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">{sample.meaning}</span>
        </div>
      </div>
    );
  }
  if (modeId === 'connector') {
    const pairs = (unit.phrases ?? []).filter((p) => (p.fixedPatterns || '').split(/\s*\+\s*/).filter(Boolean).length >= 2);
    if (!pairs.length) return <p className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">本单元暂无可拼搭的搭配</p>;
    const parts = (pairs[0].fixedPatterns || '').split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
    return (
      <div>
        <p className="text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">共 {pairs.length} 组搭配 · 点击左侧词干 → 匹配右侧形式</p>
        <div className="mt-2 flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3">
          {parts.map((p, i) => (
            <span key={i} className="rounded-full border px-3 py-1 text-[calc(13px*var(--type-scale))] font-medium" style={{ borderColor: 'var(--color-phrase-border)', background: 'var(--color-surface)', color: 'var(--color-phrase)' }}>
              {p}
            </span>
          ))}
          <span className="text-[calc(13px*var(--type-scale))] text-[var(--color-text-2)]">→ 配对</span>
        </div>
      </div>
    );
  }
  if (modeId === 'sprint') {
    const steps = ['卡片速览', '语音模仿', '填空配对', '造句批改', '10 题小测'];
    return (
      <div>
        <p className="text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{items.length} 个词汇 · 5 步递进</p>
        <div className="mt-2 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[calc(11px*var(--type-scale))] text-[var(--color-text-2)]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[calc(9px*var(--type-scale))] font-bold text-white">{i + 1}</span>
              {s}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return null;
}