import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Shield, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, AlertTriangle, LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import TaskPost from './TaskPost';
import TaskListView from './TaskListView';

const DECISION_GRADIENTS = {
  approved:            'from-emerald-500 to-teal-500',
  rejected:            'from-red-500 to-rose-600',
  needs_revision:      'from-amber-500 to-orange-500',
  in_progress_review:  'from-blue-500 to-indigo-500',
  partially_completed: 'from-orange-400 to-amber-500',
  on_hold:             'from-slate-400 to-slate-500',
  escalated:           'from-purple-500 to-violet-600',
  pending_info:        'from-cyan-500 to-sky-500',
};

const DECISION_LABELS = {
  approved: { ar: 'موافقة', ku: 'موافەقەت' },
  rejected: { ar: 'مرفوضة', ku: 'ڕەتکراوەتەوە' },
  needs_revision: { ar: 'تحتاج مراجعة', ku: 'پێویستی بە دووبارەبینینەوە' },
  in_progress_review: { ar: 'قيد المراجعة', ku: 'لە بینینەوەدایە' },
  partially_completed: { ar: 'مكتملة جزئياً', ku: 'بەشێکی تەواوبوو' },
  on_hold: { ar: 'موقوفة', ku: 'هەڵوەشاوەتەوە' },
  escalated: { ar: 'مُصعَّدة', ku: 'بردراوەتە بەڕێوەبەرایەتی' },
  pending_info: { ar: 'بانتظار معلومات', ku: 'چاوەڕوانی زانیاری' },
};

export default function HrTasksSection({ tasks, employees, users, onTaskUpdate, onDelete, onStatusChange, onAddComment, onAddReply }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [activeTab, setActiveTab] = useState('pending');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

  // Tasks awaiting HR evaluation (completed or cancelled, no HR eval)
  const pendingHr = tasks.filter(t =>
    (t.status === 'مكتملة' || t.status === 'ملغاة') && !t.hr_evaluation
  );

  // Tasks that have been HR evaluated but are NOT done/cancelled (still in progress)
  const evaluated = tasks.filter(t =>
    !!t.hr_evaluation && t.status !== 'مكتملة' && t.status !== 'ملغاة'
  );

  // Closed/finished tasks: HR evaluated AND final status set (مكتملة or ملغاة)
  const closed = tasks.filter(t =>
    !!t.hr_evaluation && (t.status === 'مكتملة' || t.status === 'ملغاة')
  );

  const tabs = [
    {
      key: 'pending',
      label: L('بانتظار التقييم', 'چاوەڕوانی هەڵسەنگاندن'),
      count: pendingHr.length,
      icon: AlertTriangle,
      color: 'text-amber-600',
      activeBg: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    {
      key: 'evaluated',
      label: L('تم التقييم', 'هەڵسەنگاندراو'),
      count: evaluated.length,
      icon: Shield,
      color: 'text-violet-600',
      activeBg: 'bg-violet-500',
      badge: 'bg-violet-100 text-violet-700 border-violet-200',
    },
    {
      key: 'closed',
      label: L('مغلقة / منتهية', 'داخراو / تەواوبوو'),
      count: closed.length,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
  ];

  const displayTasks = activeTab === 'pending' ? pendingHr : activeTab === 'evaluated' ? evaluated : closed;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-violet-700 via-purple-700 to-indigo-700 px-6 py-6 rounded-2xl shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 10% 50%, white 0%, transparent 50%)' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{L('قسم الموارد البشرية', 'بەشی سەرچاوە مرۆییەکان')}</h2>
            <p className="text-white/60 text-sm mt-0.5">{L('مراجعة وتقييم المهام المكتملة والملغاة', 'پێداچوونەوە و هەڵسەنگاندنی ئەرکەکانی تەواوبوو و هەڵوەشاوەتەوە')}</p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="relative flex gap-3 mt-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-xl border border-white/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-white text-xs font-bold">{pendingHr.length} {L('بانتظار', 'چاوەڕوان')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-xl border border-white/20">
            <Shield className="w-3.5 h-3.5 text-violet-300" />
            <span className="text-white text-xs font-bold">{evaluated.length} {L('مُقيَّم', 'هەڵسەنگاندراو')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/15 rounded-xl border border-white/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-white text-xs font-bold">{closed.length} {L('مغلق', 'داخراو')}</span>
          </div>
        </div>
      </div>

      {/* Tabs + View Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex gap-1.5 items-center">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                isActive
                  ? `${tab.activeBg} text-white shadow-md`
                  : `text-slate-500 hover:bg-slate-50`
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  'text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                  isActive ? 'bg-white/30 text-white' : tab.badge
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
        {/* View mode toggle */}
        <div className="flex gap-1 mr-1 border-r border-slate-200 pr-2">
          <button
            onClick={() => setViewMode('card')}
            className={cn('p-2 rounded-xl transition-all', viewMode === 'card' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100')}
            title={L('عرض البطاقات', 'دیمەنی کارت')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2 rounded-xl transition-all', viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100')}
            title={L('عرض القائمة', 'دیمەنی لیست')}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending: no evaluation yet — show simplified card with HR badge */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingHr.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <p className="font-bold text-slate-500">{L('لا توجد مهام بانتظار التقييم', 'هیچ ئەرکێک چاوەڕوانی هەڵسەنگاندن نییە')}</p>
            </div>
          ) : viewMode === 'list' ? (
            <TaskListView tasks={pendingHr} employees={employees} ribbonColor="bg-amber-500" ribbonIcon={<AlertTriangle className="w-3 h-3" />} ribbonLabel={L('بانتظار HR', 'چاوەڕوانی HR')} />
          ) : (
            pendingHr.map(task => (
              <div key={task.id} className="relative">
                <div className="absolute -top-1 right-3 z-10 flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-b-xl shadow-md">
                  <AlertTriangle className="w-3 h-3" />
                  {L('بانتظار تقييم HR', 'چاوەڕوانی هەڵسەنگاندنی HR')}
                </div>
                <TaskPost task={task} employees={employees} users={users} onLike={() => {}} onDelete={onDelete} onStatusChange={onStatusChange} onTaskUpdate={onTaskUpdate} onAddComment={onAddComment} onAddReply={onAddReply} />
              </div>
            ))
          )}
        </div>
      )}

      {/* Evaluated: show with decision summary */}
      {activeTab === 'evaluated' && (
        <div className="space-y-3">
          {evaluated.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-200">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-500">{L('لا توجد مهام مُقيَّمة', 'هیچ ئەرکێکی هەڵسەنگاندراو نییە')}</p>
            </div>
          ) : viewMode === 'list' ? (
            <TaskListView tasks={evaluated} employees={employees} lang={lang} showDecision />
          ) : (
            evaluated.map(task => {
              const dec = task.hr_evaluation?.decision;
              const grad = DECISION_GRADIENTS[dec] || 'from-slate-400 to-slate-500';
              const decLabel = dec ? (lang === 'ku' ? DECISION_LABELS[dec]?.ku : DECISION_LABELS[dec]?.ar) : '';
              return (
                <div key={task.id} className="relative">
                  <div className={cn('absolute -top-1 right-3 z-10 flex items-center gap-1.5 px-3 py-1 text-white text-[10px] font-black rounded-b-xl shadow-md bg-gradient-to-l', grad)}>
                    <Shield className="w-3 h-3" />
                    {L('HR: ', 'HR: ')}{decLabel}
                  </div>
                  <TaskPost task={task} employees={employees} users={users} onLike={() => {}} onDelete={onDelete} onStatusChange={onStatusChange} onTaskUpdate={onTaskUpdate} onAddComment={onAddComment} onAddReply={onAddReply} />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Closed/Finished */}
      {activeTab === 'closed' && (
        <div className="space-y-3">
          {closed.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-200">
              <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-500">{L('لا توجد مهام مغلقة', 'هیچ ئەرکێکی داخراو نییە')}</p>
            </div>
          ) : viewMode === 'list' ? (
            <TaskListView tasks={closed} employees={employees} lang={lang} showStatus />
          ) : (
            closed.map(task => {
              const isFinished = task.status === 'مكتملة';
              return (
                <div key={task.id} className="relative">
                  <div className={cn(
                    'absolute -top-1 right-3 z-10 flex items-center gap-1.5 px-3 py-1 text-white text-[10px] font-black rounded-b-xl shadow-md',
                    isFinished ? 'bg-emerald-500' : 'bg-slate-500'
                  )}>
                    {isFinished
                      ? <><CheckCircle2 className="w-3 h-3" />{L('مكتملة ✓', 'تەواوبوو ✓')}</>
                      : <><XCircle className="w-3 h-3" />{L('ملغاة', 'هەڵوەشاوەتەوە')}</>
                    }
                  </div>
                  <TaskPost task={task} employees={employees} users={users} onLike={() => {}} onDelete={onDelete} onStatusChange={onStatusChange} onTaskUpdate={onTaskUpdate} onAddComment={onAddComment} onAddReply={onAddReply} />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}