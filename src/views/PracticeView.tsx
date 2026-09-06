import { useState } from 'react';
import { RectangleHorizontal, Puzzle, Timer, PenLine, ArrowLeftRight } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import Flashcard from '../components/Flashcard.tsx';
import CollocationConnector from '../components/CollocationConnector.tsx';
import Sprint from '../components/Sprint.tsx';
import MiniWriteView from '../components/MiniWriteView.tsx';
import InflectionDrillView from '../components/InflectionDrillView.tsx';

type PracticeMode = 'flash' | 'connector' | 'sprint' | 'inflect' | 'miniwrite';

const ICON_STROKE = 2.5;

const MODES: { id: PracticeMode; titleKey: string; descKey: string; icon: typeof RectangleHorizontal }[] = [
  { id: 'flash', titleKey: 'modeFlash', descKey: 'modeFlashDesc', icon: RectangleHorizontal },
  { id: 'connector', titleKey: 'modeConnector', descKey: 'modeConnectorDesc', icon: Puzzle },
  { id: 'sprint', titleKey: 'modeSprint', descKey: 'modeSprintDesc', icon: Timer },
  { id: 'inflect', titleKey: 'modeInflect', descKey: 'modeInflectDesc', icon: ArrowLeftRight },
  { id: 'miniwrite', titleKey: 'modeMiniWrite', descKey: 'modeMiniWriteDesc', icon: PenLine },
];

export default function PracticeView() {
  const { unit, locale } = useAppStore();
  const [mode, setMode] = useState<PracticeMode | null>(null);
  if (!unit) return <div className="mx-auto flex min-h-[70vh] max-w-[var(--max-read)] items-center justify-center px-[var(--pad-x)] py-10 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('practiceEmpty', locale)}</div>;
  if (mode === 'flash') return <Flashcard items={useAppStore.getState().studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;
  // 词形变换：独立闭环（答题→判分→错题本→结束），不经过 Sprint
  if (mode === 'inflect') {
    const drills = unit.inflectionDrills ?? [];
    if (!drills.length) return null;
    return <InflectionDrillView drills={drills} onExit={() => setMode(null)} />;
  }
  // 微写作：无数据单元不渲染入口，故此处必有数据；兜底返回列表
  if (mode === 'miniwrite') {
    if (!unit.miniPrompt) return null;
    return <MiniWriteView miniPrompt={unit.miniPrompt} onExit={() => setMode(null)} />;
  }

  // 词形/微写作仅在有数据的单元渲染（8A 无此数据 → 两卡不出现）
  const drills = unit.inflectionDrills ?? [];
  const memorizeModes = MODES.filter((m) => m.id === 'flash' || m.id === 'connector' || m.id === 'sprint');
  const lessonModes = MODES.filter((m) => (m.id === 'inflect' && drills.length > 0) || (m.id === 'miniwrite' && !!unit.miniPrompt));

  const renderCard = (m: (typeof MODES)[number]) => {
    const Icon = m.icon;
    return (
      <button key={m.id} onClick={() => setMode(m.id)} className="press card flex items-center gap-4 p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: 'var(--grad-cta)' }}><Icon size={22} strokeWidth={ICON_STROKE} /></span>
        <span><span className="block text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t(m.titleKey, locale)}</span><span className="mt-0.5 block text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{t(m.descKey, locale)}</span></span>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3"><h2 className="text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('practiceTitle', locale)}</h2><p className="mt-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{unit.editionName} · {unit.title}</p></div>
      <div className="mb-2 text-[calc(13px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('practiceGroupMemorize', locale)}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {memorizeModes.map(renderCard)}
      </div>
      {lessonModes.length > 0 && (
        <>
          <div className="mb-2 mt-5 text-[calc(13px*var(--type-scale))] font-semibold tracking-wide text-[var(--color-text-2)]">{t('practiceGroupLesson', locale)}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lessonModes.map(renderCard)}
          </div>
        </>
      )}
    </div>
  );
}
