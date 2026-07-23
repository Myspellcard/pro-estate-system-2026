import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import GeneralDashboard from '@/components/dashboard/GeneralDashboard';
import BranchDashboard from '@/components/dashboard/BranchDashboard';
import { Globe, Building2, LayoutDashboard, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { lang } = useLanguage();
  const { activeBranch } = useBranch();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const [view, setView] = useState('general');

  return (
    <div className="space-y-5">
      {/* ══ Premium Hero Header ══ */}
      <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #0f2040 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <div className="absolute -bottom-8 left-10 w-52 h-52 rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
          <div className="absolute top-1/2 right-1/3 w-96 h-16 opacity-[0.04]" style={{ background: 'radial-gradient(ellipse, #a78bfa, transparent)' }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative px-6 py-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          {/* Left: Title */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{L('لوحة التحكم', 'داشبۆرد')}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{L('نظام إدارة العقارات والإيجارات', 'سیستەمی بەڕێوەبردنی خانووبەرە و کرێ')}</p>
            </div>
          </div>

          {/* Right: View switcher */}
          <div className="flex gap-1.5 p-1.5 rounded-2xl self-start md:self-auto" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setView('general')}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                view === 'general'
                  ? 'bg-white text-slate-800 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              )}>
              <Globe className="w-4 h-4" />
              {L('عام', 'گشتی')}
            </button>
            <button
              onClick={() => setView('branch')}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                view === 'branch'
                  ? 'bg-white text-slate-800 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              )}>
              <Building2 className="w-4 h-4" />
              {activeBranch ? (lang === 'ku' ? (activeBranch.name_ku || activeBranch.name) : activeBranch.name) : L('الفرع', 'لق')}
            </button>
          </div>
        </div>
      </div>

      {view === 'general' ? <GeneralDashboard /> : <BranchDashboard />}
    </div>
  );
}