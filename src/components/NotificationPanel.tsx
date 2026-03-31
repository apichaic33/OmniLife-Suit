import React from 'react';
import { X, Bell, Trash2, CheckCircle } from 'lucide-react';
import { Notification } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationPanel({ 
  notifications, 
  onClose, 
  onMarkAsRead, 
  onClearAll 
}: NotificationPanelProps) {
  return (
    <div className="absolute top-16 right-8 w-80 bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col max-h-[500px]">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClearAll}
            className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-500 rounded-lg transition-colors"
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No new notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className={cn(
                "p-3 rounded-xl cursor-pointer transition-all border-l-4 group relative",
                n.read ? "bg-white opacity-60" : "bg-gray-50",
                n.type === 'info' ? "border-blue-500" : 
                n.type === 'success' ? "border-emerald-500" : 
                n.type === 'warning' ? "border-amber-500" : "border-rose-500"
              )}
              onClick={() => !n.read && onMarkAsRead(n.id)}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-bold text-gray-900">{n.title}</p>
                {!n.read && (
                  <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-gray-400">{formatDistanceToNow(n.timestamp)} ago</p>
                {!n.read && (
                  <button 
                    className="text-[10px] font-bold text-blue-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(n.id);
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-100 text-center">
        <button className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
          View History
        </button>
      </div>
    </div>
  );
}
