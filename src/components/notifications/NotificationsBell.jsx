import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { cn } from '@/lib/utils';
import NotificationsPanel from './NotificationsPanel';

export default function NotificationsBell({ variant = 'dark' }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => firebaseApi.entities.Notification.list('-created_date', 50),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Update app badge on home screen icon
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount);
      } else {
        navigator.clearAppBadge();
      }
    }
  }, [unreadCount]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
          variant === 'dark' ? "hover:bg-white/10" : "hover:bg-muted"
        )}
      >
        <Bell className={cn("w-5 h-5", variant === 'dark' ? "text-white/60" : "text-foreground")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationsPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}