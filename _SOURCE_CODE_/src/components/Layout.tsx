import { ReactNode } from 'react';
import { type Page } from '../App';
import {
  LayoutDashboard, TrendingUp, Wallet, CheckSquare,
  Dumbbell, FolderKanban, Sprout, Package, Fish, BarChart2
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem { id: Page; label: string; icon: ReactNode; mirofish?: boolean; }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',    icon: <LayoutDashboard size={18} /> },
  { id: 'trade',       label: 'Trade',        icon: <TrendingUp size={18} /> },
  { id: 'finance',     label: 'Finance',      icon: <Wallet size={18} /> },
  { id: 'tasks',       label: 'Tasks',        icon: <CheckSquare size={18} /> },
  { id: 'fitness',     label: 'Fitness',      icon: <Dumbbell size={18} /> },
  { id: 'projects',    label: 'Projects',     icon: <FolderKanban size={18} /> },
  { id: 'agriculture', label: 'Agriculture',  icon: <Sprout size={18} /> },
  { id: 'assets',      label: 'Assets',       icon: <Package size={18} /> },
  { id: 'mirofish',    label: 'MiroFish AI',  icon: <Fish size={18} />, mirofish: true },
  { id: 'analytics',   label: 'Analytics',    icon: <BarChart2 size={18} /> },
];

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: Props) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭕</span>
            <div>
              <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>OmniLife Suit</div>
              <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Personal OS</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                currentPage === item.id
                  ? 'text-white font-medium'
                  : 'hover:bg-white/5',
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
                <span className="ml-auto text-xs px-1 rounded" style={{ background: '#6366f122', color: '#a78bfa' }}>AI</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
          MiroFish on localhost:5001
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
