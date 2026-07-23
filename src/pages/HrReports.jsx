import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import {
  Shield, CheckCircle2, XCircle, RefreshCw, Clock, AlertTriangle,
  PauseCircle, ArrowUpCircle, HelpCircle, Star, User, Calendar,
  BarChart3, TrendingUp, Filter, Search, ChevronLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskDetailModal from '@/components/tasks/TaskDetailModal';

const DECISIONS = [
  { key: 'approved',           ar: 'مكتملة — موافقة',       ku: 'تەواوبوو — موافەقەت',        icon: CheckCircle2,   color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'rejected',           ar: 'مرفوضة',                ku: 'ڕەتکراوەتەوە',              icon: XCircle,        color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     badge: 'bg-red-100 text-red-700' },
  { key: 'needs_revision',     ar: 'تحتاج مراجعة',          ku: 'پێویستی بە دووبارەبینینەوە', icon: RefreshCw,      color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
  { key: 'in_progress_review', ar: 'قيد المراجعة',           ku: 'لە بینینەوەدایە',            icon: Clock,          color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700' },
  { key: 'partially_completed',ar: 'مكتملة جزئياً',          ku: 'بەشێکی تەواوبوو',           icon: AlertTriangle,  color: 'text-orange-500',  bg: 'bg-orange-50',   border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700' },
  { key: 'on_hold',            ar: 'معلقة / موقوفة',         ku: 'هەڵوەشاوەتەوە',             icon: PauseCircle,    color: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-600' },
  { key: 'escalated',          ar: 'مُصعَّدة للإدارة',        ku: 'بردراوەتە بەڕێوەبەرایەتی',  icon: ArrowUpCircle,  color: 'text-purple-600',  bg: 'bg-purple-50',   border: 'border-purple-200',  badge: 'bg-purple-100 text-purple-700' },
  { key: 'pending_info',       ar: 'بانتظار معلومات',        ku: 'چاوەڕوانی زانیاری',          icon: HelpCircle,     color: 'text-cyan-600',    bg: 'bg-cyan-50',     border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700' },
];

const PERF_LABELS = { ar: ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'], ku: ['', 'خراپ', 'قابووڵ', 'باش', 'زۆر باش', 'نایاب'] };

export default function HrReports() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();

  const [filterDecision, setFilterDecision] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['all-employee-tasks-hr'],
    queryFn: () => firebaseApi.entities.EmployeeTask.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-hr', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Employee.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Employee.list(),
  });

  // Only tasks that have an HR evaluation
  const evaluatedTasks = tasks.filter(t => t.hr_evaluation?.decision);

  const filtered = evaluatedTasks.filter(t => {
    const decisionOk = filterDecision === 'all' || t.hr_evaluation.decision === filterDecision;
    const empOk = !filterEmployee || t.employee_id === filterEmployee;
    const searchOk = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return decisionOk && empOk && searchOk;
  });

  // Stats per decision type
  const stats = DECISIONS.map(d => ({
    ...d,
    count: evaluatedTasks.filter(t => t.hr_evaluation.decision === d.key).length,
  }));

  const avgRating = (() => {
    const rated = evaluatedTasks.filter(t => t.hr_evaluation?.rating > 0);
    if (!rated.length) return 0;
    return (rated.reduce((s, t) => s + t.hr_evaluation.rating, 0) / rated.length).toFixed(1);
  })();

  const getEmployee = (id) => employees.find(e => e.id === id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-purple-700 via-purple-600 to-indigo-700 px-6 py-8 lg:px-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 10% 50%, white 0%, transparent 50%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-purple-200 text-sm font-medium">{L('الموارد البشرية', 'سەرچاوەی مرۆیی')}</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">{L('تقارير تقييم HR', 'ڕاپۆرتەکانی هەڵسەنگاندنی HR')}</h1>
          <p className="text-purple-200 text-sm mt-1">{L(`${evaluatedTasks.length} مهمة مُقيَّمة`, `${evaluatedTasks.length} ئەرکی هەڵسەنگێنراو`)}</p>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 -mt-6">
          {/* Total evaluated */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-white/80 text-right">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="font-black text-2xl text-foreground">{evaluatedTasks.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{L('إجمالي المقيَّمة', 'کۆی هەڵسەنگێنراو')}</div>
          </div>
          {/* Approved */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-white/80 text-right">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-black text-2xl text-emerald-600">{stats.find(s=>s.key==='approved')?.count || 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{L('مكتملة / موافقة', 'تەواوبوو / موافەقەت')}</div>
          </div>
          {/* Rejected */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-white/80 text-right">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="font-black text-2xl text-red-600">{stats.find(s=>s.key==='rejected')?.count || 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{L('مرفوضة', 'ڕەتکراوەتەوە')}</div>
          </div>
          {/* Avg Rating */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-white/80 text-right">
            <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center mb-2">
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="font-black text-2xl text-yellow-600">{avgRating || '—'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{L('متوسط الأداء', 'تێکڕای ئەدا')}</div>
          </div>
        </div>

        {/* Decision breakdown */}
        <div className="bg-white rounded-2xl border shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-5">
          <h2 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            {L('توزيع القرارات', 'دابەشبوونی بڕیارەکان')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.filter(s => s.count > 0).map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setFilterDecision(filterDecision === s.key ? 'all' : s.key)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border-2 text-right transition-all hover:scale-[1.02]',
                    filterDecision === s.key ? `${s.bg} ${s.border} shadow-md` : 'border-slate-100 hover:border-slate-200'
                  )}
                >
                  <Icon className={cn('w-5 h-5 shrink-0', s.color)} />
                  <div>
                    <div className="font-black text-lg">{s.count}</div>
                    <div className="text-xs text-muted-foreground leading-tight">{L(s.ar, s.ku)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={L('البحث في المهام...', 'گەڕان لە ئەرکەکان...')}
              className="w-full h-9 rounded-xl border-2 border-muted bg-muted/20 pr-9 pl-3 text-sm outline-none focus:border-primary/40" />
          </div>
          <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
            className="h-9 rounded-xl border-2 border-muted bg-muted/20 px-3 text-sm outline-none cursor-pointer">
            <option value="">{L('كل الموظفين', 'هەموو کارمەندان')}</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <select value={filterDecision} onChange={e => setFilterDecision(e.target.value)}
            className="h-9 rounded-xl border-2 border-muted bg-muted/20 px-3 text-sm outline-none cursor-pointer">
            <option value="all">{L('كل القرارات', 'هەموو بڕیارەکان')}</option>
            {DECISIONS.map(d => <option key={d.key} value={d.key}>{L(d.ar, d.ku)}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-black text-slate-700 flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-500" />
              {L('سجل التقييمات', 'تۆماری هەڵسەنگاندنەکان')}
              <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">{L('جاري التحميل...', 'بارکردن...')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-muted-foreground">{L('لا توجد تقييمات بعد', 'هیچ هەڵسەنگاندنێک نییە')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(task => {
                const ev = task.hr_evaluation;
                const d = DECISIONS.find(x => x.key === ev.decision);
                const Icon = d?.icon || Shield;
                const emp = getEmployee(task.employee_id);
                return (
                  <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedTask(task)}>
                    <div className="flex flex-wrap gap-3 items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-slate-800 text-sm">{task.title}</span>
                          <span className={cn('flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border', d?.badge)}>
                            <Icon className="w-3 h-3" />
                            {L(d?.ar, d?.ku)}
                          </span>
                          {ev.rating > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-500" />
                              {ev.rating}/5 — {L(PERF_LABELS.ar[ev.rating], PERF_LABELS.ku[ev.rating])}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-indigo-500 font-semibold mt-0.5">
                          <ChevronLeft className="w-3 h-3" />
                          {L('انقر للعرض', 'کلیک بکە بۆ بینین')}
                        </span>
                        {ev.note && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg px-3 py-1.5 mt-1 border border-slate-100">
                            "{ev.note}"
                          </p>
                        )}
                        {ev.revision_deadline && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {L('موعد المراجعة:', 'کاتی دووبارەبینینەوە:')} {format(new Date(ev.revision_deadline), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground space-y-1 shrink-0">
                        {emp && (
                          <div className="flex items-center gap-1 justify-end">
                            <User className="w-3 h-3" />
                            <span>{emp.full_name}</span>
                          </div>
                        )}
                        {ev.evaluated_by && (
                          <div className="flex items-center gap-1 justify-end text-purple-600">
                            <Shield className="w-3 h-3" />
                            <span>{ev.evaluated_by}</span>
                          </div>
                        )}
                        {ev.evaluated_at && (
                          <div className="flex items-center gap-1 justify-end">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(ev.evaluated_at), 'dd/MM/yyyy HH:mm')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          employees={employees}
          queryKey={['all-employee-tasks-hr']}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updated) => {
            setSelectedTask(prev => ({ ...prev, ...updated }));
            queryClient.invalidateQueries({ queryKey: ['all-employee-tasks-hr'] });
          }}
        />
      )}
    </div>
  );
}