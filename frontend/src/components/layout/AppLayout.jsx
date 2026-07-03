import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useWebSocket } from '../../hooks/useWebSocket';
export function AppLayout() {
    useWebSocket();
    return (<div className="min-h-screen bg-gray-950 flex">
      <div className="ambient-bg"/>
      <Sidebar />
      <main className="relative z-10 flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        <Outlet />
      </main>
    </div>);
}
