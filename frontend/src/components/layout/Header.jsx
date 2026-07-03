import { Search, Menu } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
export function Header({ title, actions }) {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const onSearch = (e) => {
        e.preventDefault();
        if (query.trim())
            navigate(`/clipboard?search=${encodeURIComponent(query.trim())}`);
    };
    return (<header className="h-16 bg-gray-950/80 backdrop-blur-md flex items-center px-4 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-20">
      <button onClick={toggleSidebar} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 hover:text-gray-100 transition-colors lg:hidden shrink-0" aria-label="Open menu">
        <Menu className="w-5 h-5"/>
      </button>

      <h1 className="font-display text-sm sm:text-lg lg:text-xl tracking-wide text-gray-100 truncate mr-auto">{title}</h1>

      <form onSubmit={onSearch} className="relative hidden sm:block shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clipboard…" className="bg-black/5 border border-black/10 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-black/[0.07] focus:border-brand-600/50 w-40 md:w-56 transition-colors"/>
      </form>

      {actions}
    </header>);
}
