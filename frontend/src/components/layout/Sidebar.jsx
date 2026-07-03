import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Clipboard, LayoutDashboard, Users, KeyRound, Video, RefreshCw, X, } from 'lucide-react';
import { clsx } from 'clsx';
import { Logo } from '../ui/Logo';
import { useUIStore } from '../../store/uiStore';
const nav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clipboard', icon: Clipboard, label: 'Clipboard' },
    { to: '/share', icon: KeyRound, label: 'Share' },
    { to: '/convert', icon: RefreshCw, label: 'Quick Convert' },
    { to: '/meetings', icon: Video, label: 'Meetings' },
    { to: '/workspaces', icon: Users, label: 'Workspaces' },
];
export function Sidebar() {
    const { sidebarOpen, closeSidebar } = useUIStore();
    const { pathname } = useLocation();
    useEffect(() => { closeSidebar(); }, [pathname, closeSidebar]);
    return (<>
      {/* Backdrop — mobile/tablet only, shown while drawer is open */}
      {sidebarOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={closeSidebar}/>)}

      <aside className={clsx('fixed inset-y-0 left-0 w-72 sm:w-64 bg-gray-950/95 backdrop-blur-sm flex flex-col z-50', 'transition-transform duration-200 ease-out', 'lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 shrink-0">
          <Logo className="w-9 h-9"/>
          <div className="min-w-0 flex-1">
            <span className="font-display text-sm tracking-wide text-gray-100 leading-none block">CLIPNINJA</span>
            <p className="text-[11px] text-gray-500 leading-none mt-1.5">Sync · Share · Convert</p>
          </div>
          <button onClick={closeSidebar} className="p-1.5 text-gray-500 hover:text-gray-200 lg:hidden shrink-0">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (<NavLink key={to} to={to} className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive
                ? 'bg-brand-600/12 text-brand-700'
                : 'text-gray-400 hover:bg-black/5 hover:text-gray-100')}>
              {({ isActive }) => (<>
                  <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-brand-600' : 'text-gray-500')}/>
                  {label}
                </>)}
            </NavLink>))}
        </nav>

        {/* Footer note */}
        <div className="p-4 shrink-0">
          <p className="text-[11px] text-gray-600 leading-relaxed px-1">
            Open sharing — no login required. Everything posted here is visible to all visitors.
          </p>
        </div>
      </aside>
    </>);
}
