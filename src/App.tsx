import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore, hydrateSettings, applyAccent } from './stores/useAppStore.ts';
import { getSetting, setSetting } from './db/db.ts';
import GlassNav from './components/GlassNav.tsx';
import FloatingTTS from './components/FloatingTTS.tsx';
import ToastHost from './components/ToastHost.tsx';
import Footer from './components/Footer.tsx';
import FeedbackPanel from './components/FeedbackPanel.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import NoticeDialog from './components/NoticeDialog.tsx';
import LearnView from './views/LearnView.tsx';
import PracticeView from './views/PracticeView.tsx';
import ReviewView from './views/ReviewView.tsx';
import ErrorsView from './views/ErrorsView.tsx';
import AiView from './views/AiView.tsx';
import SettingsView from './views/SettingsView.tsx';
import SessionView from './views/SessionView.tsx';
import PersonalListView from './views/PersonalListView.tsx';

function Shell() {
  const { tab, theme, accent, fontScale } = useAppStore();
  const [showNotice, setShowNotice] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    applyAccent(accent);
    document.documentElement.style.setProperty('--type-scale', String(fontScale));
  }, [tab, theme, accent, fontScale]);

  useEffect(() => {
    if (!settingsReady) return;
    void (async () => {
      const ack = await getSetting<boolean>('noticeAck', false);
      if (!ack) setShowNotice(true);
    })();
  }, [settingsReady]);

  useEffect(() => { hydrateSettings().then(() => setSettingsReady(true)); }, []);

  const dismissNotice = (forever: boolean) => {
    setShowNotice(false);
    if (forever) void setSetting('noticeAck', true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-ground)] text-[var(--color-text)] pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0" style={{ paddingTop: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
      <GlassNav />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
          <Route path="/" element={<Navigate to="/learn" replace />} />
          <Route path="/session/:unitId" element={<SessionView />} />
          <Route path="/learn" element={<LearnView />} />
          <Route path="/mylists/:batchId" element={<PersonalListView />} />
          <Route path="/practice" element={<PracticeView />} />
          <Route path="/review" element={<ReviewView />} />
          <Route path="/errors" element={<ErrorsView />} />
          <Route path="/ai" element={<AiView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <Footer onOpenFeedback={() => setShowFeedback(true)} />
      <FloatingTTS />
      <ToastHost />
      {showNotice && (
        <NoticeDialog
          onDismiss={dismissNotice}
          onFeedback={() => setShowFeedback(true)}
        />
      )}
      {showFeedback && <FeedbackPanel onClose={() => setShowFeedback(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
