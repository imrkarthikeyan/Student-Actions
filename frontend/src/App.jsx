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
export function App() {

function RootRedirect() {
    const location = useLocation();
    const redirectPath = new URLSearchParams(location.search).get('redirect');
    return <Navigate to={redirectPath || '/dashboard'} replace />;
}

    return (<BrowserRouter>
      <Toaster position="top-right" toastOptions={{
            style: { background: '#ffffff', color: '#0f0f11', border: '2px solid #e01414', fontWeight: 600 },
            success: { iconTheme: { primary: '#e01414', secondary: '#fff' } },
            error: { iconTheme: { primary: '#e01414', secondary: '#fff' } },
        }}/>
      <Routes>
        <Route path="/meetings/:roomCode" element={<MeetingRoomPage />}/>
        <Route element={<AppLayout />}>
          <Route index element={<RootRedirect />}/>
          <Route path="/dashboard" element={<DashboardPage />}/>
          <Route path="/clipboard" element={<ClipboardPage />}/>
          <Route path="/workspaces" element={<WorkspacesPage />}/>
          <Route path="/share" element={<SharePage />}/>
          <Route path="/convert" element={<ConvertPage />}/>
          <Route path="/meetings" element={<MeetingsPage />}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Route>
      </Routes>
    </BrowserRouter>);
}
