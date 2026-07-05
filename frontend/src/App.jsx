import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ClipboardPage } from './pages/ClipboardPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { SharePage } from './pages/SharePage';
import { MeetingsPage } from './pages/MeetingsPage';
import { MeetingRoomPage } from './pages/MeetingRoomPage';
import { ConvertPage } from './pages/ConvertPage';
import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

function IntroSplash() {
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#f7f7f8] text-[#0f0f11]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(224,20,20,0.12),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f7f7f8_100%)]" />
      <div className="ambient-bg opacity-70" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-gray-800/10 bg-white/80 px-4 py-2 shadow-soft animate-rise">
          <span className="inline-flex h-3 w-3 rounded-full bg-brand-600 animate-glow" />
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Loading workspace</span>
        </div>

        <div className="relative h-44 w-full max-w-4xl overflow-hidden">
          <div className="absolute inset-x-0 bottom-12 h-px bg-gradient-to-r from-transparent via-brand-600/40 to-transparent" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 animate-sprint">
            <div className="relative flex items-center gap-3">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-soft-lg border border-gray-800/10">
                <GraduationCap className="h-8 w-8 text-brand-600" />
              </div>
              <div className="relative">
                <div className="absolute -left-6 top-6 h-2 w-12 rounded-full bg-brand-600/20 blur-sm" />
                <svg viewBox="0 0 72 72" className="h-16 w-16 text-gray-100 drop-shadow-md" fill="none">
                  <circle cx="36" cy="18" r="8" fill="currentColor" />
                  <path d="M24 64c2-12 7-20 12-24 5 4 10 12 12 24" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <path d="M25 34l-10 14" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <path d="M47 34l11 10" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <path d="M28 58l-8 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <path d="M44 58l10 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <path d="M18 52h18" stroke="#e01414" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 max-w-2xl animate-rise">
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-gray-100">ClipNinja</h1>
          <p className="mt-3 text-sm sm:text-base text-gray-500">
            Clipboard, sharing, and meetings in a polished workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
export function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  function RootRedirect() {
    const location = useLocation();
    const redirectPath = new URLSearchParams(location.search).get('redirect');
    return <Navigate to={redirectPath || '/dashboard'} replace />;
  }

  return (<BrowserRouter>
    {showIntro && <IntroSplash />}
    <Toaster position="top-right" toastOptions={{
      style: { background: '#ffffff', color: '#0f0f11', border: '2px solid #e01414', fontWeight: 600 },
      success: { iconTheme: { primary: '#e01414', secondary: '#fff' } },
      error: { iconTheme: { primary: '#e01414', secondary: '#fff' } },
    }} />
    <Routes>
      <Route path="/meetings/:roomCode" element={<MeetingRoomPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<RootRedirect />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clipboard" element={<ClipboardPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/convert" element={<ConvertPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>);
}
