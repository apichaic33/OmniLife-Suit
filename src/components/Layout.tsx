import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Dumbbell, 
  Wallet, 
  Layout as LayoutIcon, 
  Leaf, 
  TrendingUp, 
  Bell, 
  Settings, 
  Menu, 
  X,
  Search,
  User,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CATEGORIES } from '../constants';
import { Category } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';
import { auth, logout } from '../firebase';

interface LayoutProps {
  children: React.ReactNode;
  activeCategory: Category;
  setActiveCategory: (category: Category) => void;
}

export default function Layout({ children, activeCategory, setActiveCategory }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const { notifications, unreadCount, addNotification, markAsRead, clearAll } = useNotifications();
  const user = auth.currentUser;

  // Auto-check simulation (every 1 minute)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const random = Math.random();
      if (random > 0.8) {
        addNotification({
          title: 'Task Reminder',
          message: 'You have a task due in 30 minutes: "Review monthly budget"',
          type: 'warning',
          category: 'tasks'
        });
      } else if (random > 0.6) {
        addNotification({
          title: 'Fitness Goal',
          message: 'Time for your muscle-building workout! Don\'t forget your protein shake.',
          type: 'info',
          category: 'fitness'
        });
      } else if (random > 0.4) {
        addNotification({
          title: 'Farm Alert',
          message: 'Water levels in the hydroponic system are low.',
          type: 'error',
          category: 'agriculture'
        });
      }
    }, 60000); // 1 minute

    return () => clearInterval(checkInterval);
  }, [addNotification]);

  const icons: Record<string, React.ReactNode> = {
    CheckSquare: <CheckSquare className="w-5 h-5" />,
    Dumbbell: <Dumbbell className="w-5 h-5" />,
    Wallet: <Wallet className="w-5 h-5" />,
    Layout: <LayoutIcon className="w-5 h-5" />,
    Leaf: <Leaf className="w-5 h-5" />,
    TrendingUp: <TrendingUp className="w-5 h-5" />,
  };

  return (
    <div className="flex h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-30",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-bottom border-gray-100">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">O</div>
          {isSidebarOpen && <span className="font-semibold text-lg tracking-tight">OmniLife Suit</span>}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                activeCategory === cat.id 
                  ? "bg-black text-white shadow-lg shadow-black/10" 
                  : "text-gray-500 hover:bg-gray-100 hover:text-black"
              )}
            >
              <div className={cn(
                "transition-colors",
                activeCategory === cat.id ? "text-white" : "text-gray-400 group-hover:text-black"
              )}>
                {icons[cat.icon]}
              </div>
              {isSidebarOpen && <span className="font-medium">{cat.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-black transition-all">
            <Settings className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Settings</span>}
          </button>
          <button 
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search everything..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-black/5 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-gray-400">Premium Plan</p>
              </div>
              <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#F8F9FA]">
          {children}
        </main>

        {/* Notification Panel Overlay */}
        {isNotificationPanelOpen && (
          <NotificationPanel 
            notifications={notifications}
            onClose={() => setIsNotificationPanelOpen(false)}
            onMarkAsRead={markAsRead}
            onClearAll={clearAll}
          />
        )}
      </div>
    </div>
  );
}
