import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Plus, X, Calendar, Users, ArrowLeft, ClipboardList, Users as UsersIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import TaskPost from '@/components/tasks/TaskPost';

const PRIORITIES = ['منخفضة جداً', 'منخفضة', 'متوسطة', 'عالية', 'عالية جداً'];
const emptyForm = { title: '', status: 'معلقة', priority: 'متوسطة', due_date: '', employee_id: '', color: '#6366f1' };
const TASK_COLORS = [
  { color: '#6366f1', label: { ar: 'إدارة', ku: 'بەڕێوەبردن' } },
  { color: '#3b82f6', label: { ar: 'عام', ku: 'گشتی' } },
  { color: '#22c55e', label: { ar: 'مالية', ku: 'دارایی' } },
  { color: '#f59e0b', label: { ar: 'صيانة', ku: 'چاککردنەوە' } },
  { color: '#ef4444', label: { ar: 'عاجل', ku: 'پەلە' } },
  { color: '#ec4899', label: { ar: 'تسويق', ku: 'بازاڕگەری' } },
  { color: '#8b5cf6', label: { ar: 'تطوير', ku: 'گەشەپێدان' } },
  { color: '#14b8a6', label: { ar: 'عقود', ku: 'گرێبەستەکان' } },
  { color: '#f97316', label: { ar: 'متابعة', ku: 'دواییکەوتن' } },
];
const PRIORITY_CONFIG = {
  'منخفضة جداً': { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  'منخفضة': { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-400' },
  'متوسطة': { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  'عالية':  { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  'عالية جداً': { color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
};

export default function GroupTasks() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => firebaseApi.entities.EmployeeGroup.get(groupId),
    enabled: !!groupId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => firebaseApi.entities.Employee.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['group-tasks', groupId],
    queryFn: () => {
      const all = firebaseApi.entities.EmployeeTask.list('-created_date');
      return all.filter(t => t.group_id === groupId);
    },
    enabled: !!groupId,
  });

  useEffect(() => {
    if (group) {
      setForm(prev => ({ ...prev, color: group.color || '#6366f1' }));
    }
  }, [group]);

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeTask.create({
      ...data,
      group_id: groupId,
      group_name: group?.name,
      created_date: new Date().toISOString()
    }),
    onSuccess: () => {
      qc.invalidateQueries(['group-tasks']);
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.EmployeeTask.update(id, data),
    onSuccess: () => qc.invalidateQueries(['group-tasks']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeTask.delete(id),
    onSuccess: () => qc.invalidateQueries(['group-tasks']),
  });

  const handleTaskUpdate = (taskId, data) => {
    updateMutation.mutate({ id: taskId, data });
  };

  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, comment }) => {
      const task = tasks.find(t => t.id === taskId);
      const newComments = [...(task.comments || []), comment];
      return firebaseApi.entities.EmployeeTask.update(taskId, { comments: newComments });
    },
    onSuccess: () => qc.invalidateQueries(['group-tasks']),
  });

  const addReplyMutation = useMutation({
    mutationFn: ({ taskId, commentId, reply }) => {
      const task = tasks.find(t => t.id === taskId);
      const comments = (task.comments || []).map(c => {
        if (c.id === commentId) {
          return { ...c, replies: [...(c.replies || []), reply] };
        }
        return c;
      });
      return firebaseApi.entities.EmployeeTask.update(taskId, { comments });
    },
    onSuccess: () => qc.invalidateQueries(['group-tasks']),
  });

  const groupTasksCount = tasks.filter(t => t.group_id === groupId).length;
  const displayTasks = tasks.filter(t => t.group_id === groupId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-700 via-indigo-600 to-violet-700 px-6 py-8 lg:px-10">
        <div className="relative flex items-center gap-4">
          <button onClick={() => navigate('/employee-tasks')} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ background: group?.color || '#6366f1' }}>
              {(group?.name || '?').charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{group?.name || L('مهام المجموعة', 'ئەرکەکانی گروپ')}</h1>
              <p className="text-indigo-200 text-sm flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                {(group?.members || []).length} {L('أعضاء', 'ئەندام')} · {groupTasksCount} {L('مهام', 'ئەرک')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ClipboardList className="w-4 h-4" />
            {L('مهام المجموعة', 'ئەرکەکانی گروپ')}
          </div>
          <Button onClick={() => setShowForm(true)} className="rounded-xl">
            <Plus className="w-4 h-4" />
            {L('مهمة جديدة', 'ئەرکی نوێ')}
          </Button>
        </div>

        {/* Task Feed */}
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          {displayTasks.map(task => (
            <TaskPost
              key={task.id}
              task={task}
              employees={employees}
              onLike={() => {}}
              onDelete={() => deleteMutation.mutate(task.id)}
              onStatusChange={(taskId, newStatus) => {
                const extra = newStatus === 'مكتملة' ? { completed_date: new Date().toISOString().split('T')[0] } : {};
                updateMutation.mutate({ id: taskId, data: { status: newStatus, ...extra } });
              }}
              onTaskUpdate={handleTaskUpdate}
              onAddComment={(taskId, comment) => {
                addCommentMutation.mutate({ taskId, comment });
              }}
              onAddReply={(taskId, commentId, reply) => {
                addReplyMutation.mutate({ taskId, commentId, reply });
              }}
            />
          ))}

          {displayTasks.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <ClipboardList className="w-10 h-10 text-indigo-300" />
              </div>
              <p className="font-bold text-foreground/60 text-lg">{L('لا توجد مهام', 'هیچ ئەرکێک نییە')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {L('ابدأ بإضافة مهمة جديدة', 'دەست بکە بە زیادکردنی ئەرکی نوێ')}
              </p>
              <button onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold shadow-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />{L('مهمة جديدة', 'ئەرکی نوێ')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg flex flex-col" style={{ height: 'calc(100dvh - 60px)', maxHeight: 'calc(100dvh - 60px)' }}>

            {/* Modal Header */}
            <div className="relative p-6 pb-5 overflow-hidden" style={{ background: `linear-gradient(135deg, ${form.color}dd 0%, ${form.color}99 100%)` }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 60%)' }} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-lg leading-tight">{L('مهمة جديدة', 'ئەرکی نوێ')}</h4>
                    <p className="text-white/70 text-xs">{L('أضف تفاصيل المهمة', 'وردەکاری ئەرکەکە زیاد بکە')}</p>
                  </div>
                </div>
                <button onClick={() => { setShowForm(false); setForm(emptyForm); }}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Title */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('عنوان المهمة', 'سەردێڕی ئەرک')} <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder={L('ما الذي يجب إنجازه؟', 'چی دەبێت تەواو بکرێت؟')}
                  className="w-full text-base font-bold border-0 border-b-2 pb-2 bg-transparent outline-none placeholder:text-muted-foreground/40 transition-colors"
                  style={{ borderBottomColor: form.title ? form.color : '#e2e8f0' }}
                  autoFocus
                />
              </div>

              {/* Employee */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('الموظف المسؤول', 'کارمەندی بەرپرس')} <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {employees.map(emp => (
                    <button key={emp.id} onClick={() => setForm(p => ({ ...p, employee_id: emp.id }))}
                      className={cn('flex items-center gap-2.5 p-3 rounded-2xl border-2 text-right transition-all text-sm',
                        form.employee_id === emp.id
                          ? 'border-current shadow-md scale-[1.02]'
                          : 'border-muted hover:border-muted-foreground/30 hover:bg-muted/20')}
                      style={{ borderColor: form.employee_id === emp.id ? form.color : undefined, background: form.employee_id === emp.id ? `${form.color}0d` : undefined }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm transition-all"
                        style={{ background: form.employee_id === emp.id ? form.color : '#94a3b8' }}>
                        {emp.full_name.charAt(0)}
                      </div>
                      <span className="truncate font-semibold text-xs">{emp.full_name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('الأولوية', 'پێشینە')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map(p => {
                    const pc = PRIORITY_CONFIG[p];
                    const isSelected = form.priority === p;
                    return (
                      <button key={p} onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                        className={cn('flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border-2 text-xs font-bold transition-all',
                          isSelected ? `${pc.color} shadow-md scale-[1.03]` : 'border-muted text-muted-foreground hover:border-muted-foreground/30')}>
                        <span className={cn('w-2 h-2 rounded-full shrink-0', pc.dot)} />
                        <span className="truncate">{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('الموعد النهائي', 'کۆتایی')}</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full h-11 rounded-2xl border-2 border-muted bg-muted/20 px-3 pr-10 text-sm focus:outline-none focus:border-primary/40 transition-colors" />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('لون المهمة', 'رەنگی ئەرک')}</label>
                <div className="grid grid-cols-1 gap-1.5 mb-3">
                  {TASK_COLORS.map(({color,label}) => (
                    <button key={color} onClick={() => setForm(p => ({ ...p, color }))}
                      className={cn('flex items-center gap-2.5 p-2 rounded-xl transition-all border-2',
                        form.color === color ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300')}
                      style={{ background: form.color === color ? `${color}0d` : undefined }}>
                      <span className="w-7 h-7 rounded-full shadow-sm shrink-0" style={{ background: color }} />
                      <span className="text-sm font-bold text-slate-700">{L(label.ar,label.ku)}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <label className="text-xs text-slate-500 font-medium">{L('مخصص', 'تایبەت')}</label>
                  <label className="w-7 h-7 rounded-full cursor-pointer overflow-hidden shadow-sm hover:scale-110 transition-all ring-2 ring-white ring-offset-1 relative" title={L('لون مخصص', 'رەنگی تایبەت')}>
                    <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                    <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-xs" style={{ background: form.color }}>+</div>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-muted/10 flex justify-end gap-3">
              <button className="px-5 py-2.5 rounded-2xl border-2 border-muted text-sm font-bold text-muted-foreground hover:bg-muted/20 transition-colors"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</button>
              <button
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white font-bold text-sm shadow-lg hover:opacity-90 transition-all hover:scale-105 disabled:opacity-40 disabled:scale-100"
                style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.color}cc 100%)` }}
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || !form.employee_id || createMutation.isPending}>
                <Plus className="w-4 h-4" />
                {createMutation.isPending ? L('جاري الإضافة...', 'زیادکردن...') : L('إضافة المهمة', 'ئەرک زیادبکە')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}