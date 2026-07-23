import React from 'react';
import { format } from 'date-fns';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const DECISION_COLORS = {
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  needs_revision: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress_review: 'bg-blue-100 text-blue-700 border-blue-200',
  partially_completed: 'bg-orange-100 text-orange-700 border-orange-200',
  on_hold: 'bg-slate-100 text-slate-600 border-slate-200',
  escalated: 'bg-purple-100 text-purple-700 border-purple-200',
  pending_info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const STATUS_COLORS = {
  'مكتملة': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'ملغاة': 'bg-red-100 text-red-600 border-red-200',
  'معلقة': 'bg-amber-100 text-amber-700 border-amber-200',
  'جارية': 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function TaskListView({ tasks, employees, lang = 'ar', showDecision = false, showStatus = false, ribbonColor, ribbonIcon, ribbonLabel }) {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {tasks.map((task, idx) => {
        const emp = employees?.find(e => e.id === task.employee_id);
        const taskColor = task.color || '#6366f1';
        const dec = task.hr_evaluation?.decision;
        const decLabel = dec ? (lang === 'ku' ? DECISION_LABELS[dec]?.ku : DECISION_LABELS[dec]?.ar) : '';
        const decColor = dec ? DECISION_COLORS[dec] : '';

        return (
          <div
            key={task.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50',
              idx < tasks.length - 1 && 'border-b border-slate-100'
            )}
          >
            {/* Color dot */}
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: taskColor }} />

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-bold text-slate-800 truncate', task.status === 'مكتملة' && 'line-through text-slate-400')}
                style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif' }}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {emp && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <User className="w-3 h-3" />
                    {emp.full_name}
                  </span>
                )}
                {task.due_date && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.due_date), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              {/* Pending ribbon label */}
              {ribbonLabel && (
                <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white', ribbonColor)}>
                  {ribbonIcon}{ribbonLabel}
                </span>
              )}

              {/* HR Decision badge */}
              {showDecision && decLabel && (
                <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', decColor)}>
                  <Shield className="w-3 h-3" />
                  {decLabel}
                </span>
              )}

              {/* Status badge */}
              {showStatus && (
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUS_COLORS[task.status] || 'bg-slate-100 text-slate-500 border-slate-200')}>
                  {task.status}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}