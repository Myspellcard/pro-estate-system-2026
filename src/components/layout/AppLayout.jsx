import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranch } from '@/context/BranchContext';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import NotificationsBell from '@/components/notifications/NotificationsBell';

function NoBranchBanner() {
  const { branches, activeBranch, loading } = useBranch();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const location = useLocation();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const hiddenOnSetupPages = location.pathname.startsWith('/admin/branches')
    || location.pathname.startsWith('/admin/users')
    || location.pathname.startsWith('/profile')
    || location.pathname.startsWith('/backup');
  if (hiddenOnSetupPages) return null;
  if (loading || activeBranch || branches.length > 0) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>{L('لم يتم إعداد أي فرع بعد.', 'هێشتا هیچ لقێک دانەنراوە.')}</span>
      {user?.role === 'admin' && (
        <Link to="/admin/branches" className="underline font-medium hover:text-amber-900">{L('إضافة فرع الآن', 'ئێستا لق زیاد بکە')}</Link>
      )}
    </div>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 right-0 left-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-primary">نظام إدارة الإيجارات</h1>
        <div className="mr-auto flex items-center gap-2">
          <NotificationsBell variant="light" />
        </div>
      </div>

      {/* Desktop notification bell - fixed bottom-left */}
      <div className="hidden lg:flex fixed bottom-6 left-6 z-40 items-center justify-center w-11 h-11 rounded-xl bg-primary shadow-lg">
        <NotificationsBell />
      </div>

      <main className={cn(
        "transition-all duration-300 pt-16 lg:pt-0",
        collapsed ? "lg:mr-20" : "lg:mr-64"
      )}>
        <NoBranchBanner />
        <div className="p-4 pb-24 lg:p-8 lg:pb-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
