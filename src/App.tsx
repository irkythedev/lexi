import { useEffect } from 'react';
import { useAppStore, hydrateSettings } from './stores/useAppStore.ts';
import GlassNav from './components/GlassNav.tsx';
import FloatingTTS from './components/FloatingTTS.tsx';
import TextbookSwitcher from './components/TextbookSwitcher.tsx';
import LearnView from './views/LearnView.tsx';
import PracticeView from './views/PracticeView.tsx';
import ReviewView from './views/ReviewView.tsx';
import ErrorsView from './views/ErrorsView.tsx';
import AiView from './views/AiView.tsx';
import SettingsView from './views/SettingsView.tsx';

function Shell() {
  const { unit, tab, setTab } = useAppStore();
  useEffect(() => { document.documentElement.classList.toggle('dark', useAppStore.getState().theme === 'dark'); }, [tab]);

  const effectiveTab = !unit && tab === 'learn' ? 'learn' : tab;
  const showSwitcher = !unit && effectiveTab === 'learn';

  return (
    <div className="min-h-screen bg-[var(--color-ground)] text-[var(--color-text)]" style={{ paddingTop: '3.5rem', paddingBottom: '4.5rem' }}>
      <GlassNav />
      <main>
        {showSwitcher ? (
          <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
            <div className="rounded-[var(--radius-hero)] p-6 text-white" style={{ background: 'var(--grad-cta)' }}>
              <h2 className="text-[22px] font-bold tracking-[-0.02em]">先选一本教材</h2>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/85">选择学段、出版社、年级与单元，即可开始单词、短语、句式与考点的智能训练。数据完全保存在本机，无需登录。</p>
            </div>
            <div className="mt-4"><TextbookSwitcher onSelected={() => {}} /></div>
          </div>
        ) : (
          <>
            {effectiveTab === 'learn' && <LearnView />}
            {effectiveTab === 'practice' && <PracticeView />}
            {effectiveTab === 'review' && <ReviewView />}
            {effectiveTab === 'errors' && <ErrorsView />}
            {effectiveTab === 'ai' && <AiView />}
            {effectiveTab === 'settings' && <SettingsView onClose={() => setTab('learn')} />}
          </>
        )}
      </main>
      <FloatingTTS />
    </div>
  );
}

export default function App() {
  useEffect(() => { hydrateSettings(); }, []);
  return <Shell />;
}
