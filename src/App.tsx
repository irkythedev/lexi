import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore, hydrateSettings, applyAccent } from './stores/useAppStore.ts';
import GlassNav from './components/GlassNav.tsx';
import FloatingTTS from './components/FloatingTTS.tsx';
import TextbookSwitcher from './components/TextbookSwitcher.tsx';
import ToastHost from './components/ToastHost.tsx';
import Footer from './components/Footer.tsx';
import LearnView from './views/LearnView.tsx';
import PracticeView from './views/PracticeView.tsx';
import ReviewView from './views/ReviewView.tsx';
import ErrorsView from './views/ErrorsView.tsx';
import AiView from './views/AiView.tsx';
import SettingsView from './views/SettingsView.tsx';
import SessionView from './views/SessionView.tsx';

function Home() {
  const { unit } = useAppStore();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-[var(--max-grid)] px-[var(--pad-x)] py-4">
      {!unit && (
        <div className="rounded-[var(--radius-hero)] p-6 text-white" style={{ background: 'var(--grad-cta)' }}>
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">先选一本教材</h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-white/85">选择学段、出版社、年级与单元，即可开始单词、短语、句式与考点的智能训练。数据完全保存在本机，无需登录。</p>
        </div>
      )}
      {unit && (
        <div className="flex items-center justify-between rounded-[var(--radius-hero)] p-5 text-white" style={{ background: 'var(--grad-cta)' }}>
          <div>
            <div className="text-[12px] font-semibold tracking-[0.14em] opacity-80">{unit.editionName} · Unit {unit.unit}</div>
            <h2 className="mt-1 text-[clamp(20px,4vw,26px)] font-bold tracking-[-0.02em]">{unit.title}</h2>
          </div>
          <button onClick={() => navigate(`/session/${unit.unit}`)} className="press rounded-full bg-white/20 px-5 py-2.5 text-[15px] font-semibold backdrop-blur">继续学习 →</button>
        </div>
      )}
      <div className="mt-4"><TextbookSwitcher onSelected={() => {}} /></div>
    </div>
  );
}

function Shell() {
  const { tab, setTab, theme, accent } = useAppStore();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    applyAccent(accent);
  }, [tab, theme, accent]);

  return (
    <div className="min-h-screen bg-[var(--color-ground)] text-[var(--color-text)]" style={{ paddingTop: '3.5rem', paddingBottom: '4.5rem' }}>
      <GlassNav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session/:unitId" element={<SessionView />} />
          <Route path="/learn" element={<LearnView />} />
          <Route path="/practice" element={<PracticeView />} />
          <Route path="/review" element={<ReviewView />} />
          <Route path="/errors" element={<ErrorsView />} />
          <Route path="/ai" element={<AiView />} />
          <Route path="/settings" element={<SettingsView onClose={() => setTab('learn')} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <FloatingTTS />
      <ToastHost />
    </div>
  );
}

export default function App() {
  useEffect(() => { hydrateSettings(); }, []);
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
