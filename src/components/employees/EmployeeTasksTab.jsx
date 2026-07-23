import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, CheckCircle2, Clock, PlayCircle, XCircle, X, Flag, Calendar, Paperclip, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskDetailModal from '@/components/tasks/TaskDetailModal';

const STATUS_CONFIG = {
  'معلقة':   { icon: Clock,        color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
  'جارية':   { icon: PlayCircle,   color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-200',     badge: 'bg-blue-100 text-blue-700' },
  'مكتملة':  { icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-50 border-green-200',   badge: 'bg-green-100 text-green-700' },
  'ملغاة':   { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-50 border-red-200',       badge: 'bg-red-100 text-red-700' },
};
const PRIORITY_CONFIG = {
  'منخفضة': { badge: 'bg-slate-100 text-slate-600' },
  'متوسطة': { badge: 'bg-orange-100 text-orange-700' },
  'عالية':  { badge: 'bg-red-100 text-red-700' },
};
const STATUSES = ['معلقة', 'جارية', 'مكتملة', 'ملغاة'];
const PRIORITIES = ['منخفضة', 'متوسطة', 'عالية'];
const emptyForm = { title: '', description: '', status: 'معلقة', priority: 'متوسطة', due_date: '', notes: '', color: '' };

export default function EmployeeTasksTab({ employee }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();
  const qc = useQueryClient();

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-for-tasks', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Employee.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Employee.list(),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['employee-tasks', employee.id],
    queryFn: () => firebaseApi.entities.EmployeeTask.filter({ employee_id: employee.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeTask.create({ ...data, employee_id: employee.id, created_date: new Date().toISOString() }),
    onSuccess: (newTask) => {
      qc.invalidateQueries(['employee-tasks', employee.id]);
      qc.invalidateQueries(['all-employee-tasks']);
      setShowForm(false);
      setForm(emptyForm);
      setSelectedTask(newTask);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.EmployeeTask.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['employee-tasks', employee.id]); qc.invalidateQueries(['all-employee-tasks']); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeTask.delete(id),
    onSuccess: () => { qc.invalidateQueries(['employee-tasks', employee.id]); qc.invalidateQueries(['all-employee-tasks']); },
  });

  const cycleStatus = (e, task) => {
    e.stopPropagation();
    const idx = STATUSES.indexOf(task.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    const extra = next === 'مكتملة' ? { completed_date: new Date().toISOString().split('T')[0] } : {};
    updateMutation.mutate({ id: task.id, data: { status: next, ...extra } });
  };

  const filtered = filterStatus === 'الكل' ? tasks : tasks.filter(t => t.status === filterStatus);
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tasks.filter(t => t.status === s).length }), {});
  const completedPct = tasks.length ? Math.round((counts['مكتملة'] / tasks.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-indigo-500/10 to-indigo-500/5 border border-indigo-200/60 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{L('المهام', 'ئەرکەکان')}</h3>
            <p className="text-xs text-muted-foreground">{tasks.length} {L('مهمة', 'ئەرک')} · {completedPct}% {L('مكتملة', 'تەواوبووە')}</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />{L('مهمة جديدة', 'ئەرکی نوێ')}
        </Button>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="p-4 bg-gradient-to-l from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl">
          <div className="flex justify-between text-xs font-medium mb-2">
            <span className="text-muted-foreground">{L('التقدم', 'پێشکەوتن')}</span>
            <span className="text-indigo-700">{counts['مكتملة']} / {tasks.length}</span>
          </div>
          <div className="h-2.5 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all" style={{ width: `${completedPct}%` }} />
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {STATUSES.map(s => (
              <div key={s} className="flex items-center gap-1.5 text-xs">
                <div className={cn('w-2 h-2 rounded-full', STATUS_CONFIG[s].color.replace('text-', 'bg-'))} />
                <span className="text-muted-foreground">{s}: <span className="font-semibold text-foreground">{counts[s] || 0}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['الكل', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
              filterStatus === s ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted/40 text-muted-foreground border-transparent hover:border-border')}>
            {s} {s !== 'الكل' && counts[s] ? `(${counts[s]})` : s === 'الكل' ? `(${tasks.length})` : ''}
          </button>
        ))}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-lg">{L('مهمة جديدة', 'ئەرکی نوێ')}</h4>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('عنوان المهمة *', 'سەردێڕی ئەرک *')}</label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={L('أدخل عنوان المهمة', 'سەردێڕی ئەرک بنووسە')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('الأولوية', 'پێشینە')}</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('الحالة', 'دۆخ')}</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('الموعد النهائي', 'کۆتایی')}</label>
              <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('لون المهمة', 'رەنگی ئەرک')}</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.color || '#6366f1'} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="w-9 h-9 rounded-lg border cursor-pointer" />
                <span className="text-xs text-muted-foreground">{L('اختر لوناً مميزاً', 'رەنگێک هەڵبژێرە')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.title}>{L('إضافة', 'زیادکردن')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {filtered.map(task => {
          const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG['معلقة'];
          const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['متوسطة'];
          const StatusIcon = sc.icon;
          const isOverdue = task.due_date && task.status !== 'مكتملة' && task.status !== 'ملغاة' && new Date(task.due_date) < new Date();
          const subtasksDone = (task.subtasks || []).filter(s => s.done).length;
          const subtasksTotal = (task.subtasks || []).length;

          return (
            <div key={task.id}
              onClick={() => setSelectedTask(task)}
              style={{ borderRight: `4px solid ${task.color || 'transparent'}` }}
              className={cn('border rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md cursor-pointer group', task.status === 'مكتملة' && 'opacity-70')}>
              <div className="flex items-center gap-3 p-4">
                <button onClick={(e) => cycleStatus(e, task)}
                  className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all hover:scale-110', sc.bg)}
                  title={L('تغيير الحالة', 'گۆڕینی دۆخ')}>
                  <StatusIcon className={cn('w-5 h-5', sc.color)} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('font-semibold text-sm', task.status === 'مكتملة' && 'line-through text-muted-foreground')}>{task.title}</span>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', sc.badge)}>{task.status}</span>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5', pc.badge)}>
                      <Flag className="w-2.5 h-2.5" />{task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {task.due_date && (
                      <div className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-red-500 font-semibold' : 'text-muted-foreground')}>
                        <Calendar className="w-3 h-3" />
                        {isOverdue && L('متأخر · ', 'درەنگ · ')}{format(new Date(task.due_date), 'dd/MM/yyyy')}
                      </div>
                    )}
                    {subtasksTotal > 0 && (
                      <span className="text-xs text-muted-foreground">{subtasksDone}/{subtasksTotal} {L('فرعية', 'لاوەکی')}</span>
                    )}
                    {(task.attachments || []).length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="w-3 h-3" />{task.attachments.length}</span>
                    )}
                    {(task.comments || []).length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="w-3 h-3" />{task.comments.length}</span>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-indigo-200" />
            </div>
            <p className="font-medium">{L('لا توجد مهام', 'هیچ ئەرکێک نییە')}</p>
            <p className="text-xs mt-1">{L('أضف مهمة جديدة للبدء', 'ئەرکێکی نوێ زیاد بکە بۆ دەستپێکردن')}</p>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          employees={allEmployees.length > 0 ? allEmployees : [employee]}
          onClose={() => { setSelectedTask(null); qc.invalidateQueries(['employee-tasks', employee.id]); }}
          onTaskUpdate={(updated) => setSelectedTask(updated)}
          queryKey={['employee-tasks', employee.id]}
        />
      )}
    </div>
  );
}