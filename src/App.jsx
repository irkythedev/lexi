import { useState } from 'react';
import { AppProvider, useApp } from './state/AppContext.jsx';
import GlassNav from './components/GlassNav.jsx';
import TextbookSwitcher from './components/TextbookSwitcher.jsx';
import LearnView from './views/LearnView.jsx';
import PracticeView from './views/PracticeView.jsx';
import ReviewView from './views/ReviewView.jsx';
import ErrorsView from './views/ErrorsView.jsx';
import AiView from './views/AiView.jsx';
import SettingsView from './views/SettingsView.jsx';
import FloatingTTS from './components/FloatingTTS.jsx';
import { loadConfig } from './lib/ai.js';

function Shell() {
  const { unit } = useApp();
  const [tab, setTab] = useState('learn');

  // If no unit is selected yet, force the switcher open on the learn tab.
  const effectiveTab = !unit ? 'learn' : tab;
  const showSwitcher = !unit && effectiveTab === 'learn';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]" style={{ paddingTop: '3.5rem', paddingBottom: '4.5rem' }}>
      <GlassNav active={effectiveTab} onNavigate={setTab} />

      <main>
        {showSwitcher ? (
          <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
            <div className="rounded-[var(--r-hero)] p-6 text-white" style={{ background: 'var(--grad-cta)' }}>
              <h2 className="text-[22px] font-bold tracking-[-0.02em]">先选一本教材</h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/85">
                选择学段、出版社、年级与单元，即可开始单词、短语、句式与考点的智能训练。
                数据完全保存在本机，无需登录。
              </p>
            </div>
            <div className="mt-4">
              <TextbookSwitcher onSelected={() => {}} />
            </div>
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
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
