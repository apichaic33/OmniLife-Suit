import { ReactNode, useState, useEffect } from 'react';
import { type Page } from '../App';
import {
  LayoutDashboard, TrendingUp, Wallet, CheckSquare,
  Dumbbell, FolderKanban, Sprout, Package, Fish, BarChart2, Menu, X
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem { id: Page; label: string; icon: ReactNode; mirofish?: boolean; }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={18} /> },
  { id: 'trade',       label: 'Trade',       icon: <TrendingUp size={18} /> },
  { id: 'finance',     label: 'Finance',     icon: <Wallet size={18} /> },
  { id: 'tasks',       label: 'Tasks',       icon: <CheckSquare size={18} /> },
  { id: 'fitness',     label: 'Fitness',     icon: <Dumbbell size={18} /> },
  { id: 'projects',    label: 'Projects',    icon: <FolderKanban size={18} /> },
  { id: 'agriculture', label: 'Agriculture', icon: <Sprout size={18} /> },
  { id: 'assets',      label: 'Assets',      icon: <Package size={18} /> },
  { id: 'mirofish',    label: 'MiroFish AI', icon: <Fish size={18} />, mirofish: true },
  { id: 'analytics',   label: 'Analytics',   icon: <BarChart2 size={18} /> },
];

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: Props) {
  const [open, setOpen] = useState(false);

  // Close sidebar when resizing to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close on navigate (mobile)
  const navigate = (page: Page) => { onNavigate(page); setOpen(false); };

  const Sidebar = () => (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r h-full"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {/* Logo */}
      <div className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭕</span>
          <div>
            <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>OmniLife Suit</div>
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Personal OS</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden p-1 rounded-lg hover:bg-white/10 transition"
          style={{ color: 'var(--color-muted)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
              currentPage === item.id ? 'text-white font-medium' : 'hover:bg-white/5',
              item.mirofish && currentPage !== item.id && 'border border-dashed'
            )}
            style={{
              background: currentPage === item.id
                ? (item.mirofish ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--color-accent)')
                : undefined,
              color: currentPage === item.id ? '#fff' : item.mirofish ? '#a78bfa' : 'var(--color-muted)',
              borderColor: item.mirofish && currentPage !== item.id ? '#6366f133' : undefined,
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.mirofish && currentPage !== item.id && (
              <span className="ml-auto text-xs px-1 rounded"
                style={{ background: '#6366f122', color: '#a78bfa' }}>AI</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t text-xs"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
        MiroFish on localhost:5001
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>

      {/* ── Desktop sidebar (always visible ≥ md) ── */}
      <div className="hidden md:flex md:flex-col md:w-56 md:flex-shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* ── Mobile: backdrop overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile: slide-in sidebar ── */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col md:hidden transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <Sidebar />
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-30"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            style={{ color: 'var(--color-text)' }}
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {NAV_ITEMS.find(n => n.id === currentPage)?.label ?? 'OmniLife Suit'}
          </span>
          <span className="text-xl ml-auto">⭕</span>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
