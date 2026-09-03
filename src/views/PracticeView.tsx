import { useState } from 'react';
import { Layers, Puzzle, Zap } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore.ts';
import { t } from '../lib/i18n.ts';
import Flashcard from '../components/Flashcard.tsx';
import CollocationConnector from '../components/CollocationConnector.tsx';
import Sprint from '../components/Sprint.tsx';

type PracticeMode = 'flash' | 'connector' | 'sprint';

const MODES: { id: PracticeMode; titleKey: string; descKey: string; icon: typeof Layers; grad: string }[] = [
  { id: 'flash', titleKey: 'modeFlash', descKey: 'modeFlashDesc', icon: Layers, grad: 'var(--grad-cta)' },
  { id: 'connector', titleKey: 'modeConnector', descKey: 'modeConnectorDesc', icon: Puzzle, grad: 'var(--grad-cta)' },
  { id: 'sprint', titleKey: 'modeSprint', descKey: 'modeSprintDesc', icon: Zap, grad: 'var(--grad-cta)' },
];

export default function PracticeView() {
  const { unit, locale } = useAppStore();
  const [mode, setMode] = useState<PracticeMode | null>(null);
  if (!unit) return <div className="mx-auto flex min-h-[70vh] max-w-[var(--max-read)] items-center justify-center px-[var(--pad-x)] py-10 text-center text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{t('practiceEmpty', locale)}</div>;
  if (mode === 'flash') return <Flashcard items={useAppStore.getState().studyItems} onExit={() => setMode(null)} />;
  if (mode === 'connector') return <CollocationConnector onExit={() => setMode(null)} />;
  if (mode === 'sprint') return <Sprint onExit={() => setMode(null)} />;

  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      <div className="mb-3"><h2 className="text-[calc(clamp(22px,5vw,30px)*var(--type-scale))] font-bold tracking-[-0.02em]">{t('practiceTitle', locale)}</h2><p className="mt-1 text-[calc(15px*var(--type-scale))] text-[var(--color-text-2)]">{unit.editionName} · {unit.title}</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODES.map((m) => { const Icon = m.icon; return (
          <button key={m.id} onClick={() => setMode(m.id)} className="press card flex items-center gap-4 p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: m.grad }}><Icon size={22} /></span>
            <span><span className="block text-[calc(16px*var(--type-scale))] font-semibold text-[var(--color-text)]">{t(m.titleKey, locale)}</span><span className="mt-0.5 block text-[calc(12.5px*var(--type-scale))] text-[var(--color-text-2)]">{t(m.descKey, locale)}</span></span>
          </button>
        ); })}
      </div>
    </div>
  );
}