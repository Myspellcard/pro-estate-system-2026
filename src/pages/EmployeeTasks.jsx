import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { Button } from '@/components/ui/button';
import {
  Plus, Trash2, CheckCircle2, Clock, PlayCircle, XCircle,
  Flag, Calendar, User, Search, X, Paperclip,
  Sparkles, TrendingUp, Zap, Heart, Star, BookOpen, MessageSquare, MoreVertical, Users,
  SlidersHorizontal, ChevronDown, Tag, Hash, Shield, LayoutGrid, LayoutList
} from 'lucide-react';
import TaskListView from '@/components/tasks/TaskListView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import TaskPost from '@/components/tasks/TaskPost';
import GroupManager from '@/components/groups/GroupManager';
import HrTasksSection from '@/components/tasks/HrTasksSection';
import { useUserPermissions } from '@/hooks/useUserPermissions';


const STATUS_CONFIG = {
  'معلقة':  { icon: Clock,        color: 'text-amber-500',   badge: 'bg-amber-100 text-amber-700 border-amber-200',   bg: 'bg-amber-50',   glow: '#f59e0b' },
  'جارية':  { icon: PlayCircle,   color: 'text-blue-500',    badge: 'bg-blue-100 text-blue-700 border-blue-200',      bg: 'bg-blue-50',    glow: '#3b82f6' },
  'مكتملة': { icon: CheckCircle2, color: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', bg: 'bg-emerald-50', glow: '#22c55e' },
  'ملغاة':  { icon: XCircle,      color: 'text-red-400',     badge: 'bg-red-100 text-red-600 border-red-200',         bg: 'bg-red-50',     glow: '#ef4444' },
};
const PRIORITY_BADGE = {
  'منخفضة جداً': { cls: 'bg-slate-100 text-slate-500 border-slate-200',   dot: 'bg-slate-400' },
  'منخفضة': { cls: 'bg-green-100 text-green-600 border-green-200', dot: 'bg-green-400' },
  'متوسطة': { cls: 'bg-orange-100 text-orange-600 border-orange-200', dot: 'bg-orange-400' },
  'عالية':  { cls: 'bg-red-100 text-red-600 border-red-200',          dot: 'bg-red-500' },
  'عالية جداً': { cls: 'bg-purple-100 text-purple-600 border-purple-200', dot: 'bg-purple-500' },
};
const STATUSES = ['معلقة', 'جارية', 'مكتملة', 'ملغاة'];
const PRIORITIES = ['منخفضة جداً', 'منخفضة', 'متوسطة', 'عالية', 'عالية جداً'];
const emptyForm = { title: '', status: 'معلقة', priority: 'متوسطة', due_date: '', employee_id: '', color: '#6366f1', group_id: null, group_name: null, participants: [], tags: [] };
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

export default function EmployeeTasks() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();
  const qc = useQueryClient();
  const { isAdmin, can } = useUserPermissions();

  const [mainTab, setMainTab] = useState('tasks'); // 'tasks' | 'hr'
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [search, setSearch] = useState('');
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [groupForTask, setGroupForTask] = useState(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [taskViewMode, setTaskViewMode] = useState('card'); // 'card' | 'list'
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterParticipant, setFilterParticipant] = useState('');
  const [filterHrDecision, setFilterHrDecision] = useState('');
  const [filterHasComments, setFilterHasComments] = useState(false);

  const handleCreateGroupTask = (group) => {
    setGroupForTask(group);
    setForm(prev => ({
      ...prev,
      group_id: group.id,
      group_name: group.name,
      color: group.color
    }));
    setShowGroupManager(false);
    setShowForm(true);
  };

  const initializeForm = () => {
    const currentEmp = employees?.find(e => e.user_email === currentUser?.email);
    setForm({
      ...emptyForm,
      employee_id: currentEmp?.id || '',
      participants: [],
      color: currentUser?.avatar_color || '#6366f1'
    });
  };


  const getEmployee = (id) => employees.find(e => e.id === id);

  const { data: employees = [], error: employeesError } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Employee.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Employee.list(),
    retry: 2,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => firebaseApi.auth.me().catch(() => null),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => firebaseApi.entities.User.list().catch(() => []),
  });

  const { data: groups = [], error: groupsError } = useQuery({
    queryKey: ['employee-groups', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.EmployeeGroup.filter({ branch_id: activeBranch.id, is_active: true })
      : firebaseApi.entities.EmployeeGroup.list(),
    retry: 2,
  });

  const { data: tasks = [], error: tasksError } = useQuery({
    queryKey: ['all-employee-tasks'],
    queryFn: () => firebaseApi.entities.EmployeeTask.list('-created_date'),
    retry: 2,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Convert empty string group_id to undefined (no group)
      const { group_id, group_name, ...rest } = data;
      const taskData = {
        ...rest,
        created_date: new Date().toISOString(),
        group_id: group_id || null,
        group_name: group_name || null
      };
      return firebaseApi.entities.EmployeeTask.create(taskData);
    },
    onSuccess: (newTask) => {
      qc.invalidateQueries(['all-employee-tasks']);
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.EmployeeTask.update(id, data),
    onSuccess: () => qc.invalidateQueries(['all-employee-tasks']),
  });

  const handleTaskUpdate = (taskId, data) => {
    // If status is being set to done/cancelled and hr_evaluation is not explicitly set,
    // clear it so the task goes to HR pending queue
    const isFinishing = (data.status === 'مكتملة' || data.status === 'ملغاة') && !('hr_evaluation' in data);
    const finalData = isFinishing ? { ...data, hr_evaluation: null } : data;
    updateMutation.mutate({ id: taskId, data: finalData });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeTask.delete(id),
    onSuccess: () => qc.invalidateQueries(['all-employee-tasks']),
  });

  const cycleStatus = (taskId, newStatus) => {
    const extra = newStatus === 'مكتملة' ? { completed_date: new Date().toISOString().split('T')[0] } : {};
    // When task becomes done or cancelled, clear HR evaluation so it goes to HR pending queue
    const hrExtra = (newStatus === 'مكتملة' || newStatus === 'ملغاة') ? { hr_evaluation: null } : {};
    updateMutation.mutate({ id: taskId, data: { status: newStatus, ...extra, ...hrExtra } });
  };

  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, comment }) => {
      const task = tasks.find(t => t.id === taskId);
      const newComments = [...(task.comments || []), comment];
      return firebaseApi.entities.EmployeeTask.update(taskId, { comments: newComments });
    },
    onSuccess: () => qc.invalidateQueries(['all-employee-tasks']),
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
    onSuccess: () => qc.invalidateQueries(['all-employee-tasks']),
  });

  // Collect all unique tags from tasks
  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))].sort();

  // Filter tasks based on showAllTasks toggle
  const displayTasks = showAllTasks ? tasks : tasks.filter(t => !t.group_id || t.group_id === '');

  const filtered = displayTasks.filter(t => {
    // Hide done/cancelled tasks that are pending HR evaluation from non-HR users
    // They will reappear once HR has submitted an evaluation
    const isAwaitingHR = (t.status === 'مكتملة' || t.status === 'ملغاة') && !t.hr_evaluation;
    if (isAwaitingHR && !(isAdmin || can('can_hr_tasks'))) return false;

    // If a specific terminal status is explicitly selected, don't hide it
    const explicitTerminal = ['مكتملة', 'ملغاة'].includes(filterStatus);
    const activeOk = explicitTerminal || !showActiveOnly || !['مكتملة', 'ملغاة'].includes(t.status);
    const statusOk = (filterStatus === 'الكل' || t.status === filterStatus) && activeOk;
    const empOk = !filterEmployee || t.employee_id === filterEmployee;
    const priorityOk = !filterPriority || t.priority === filterPriority;
    const groupOk = !filterGroup || t.group_id === filterGroup;
    const tagOk = !filterTag || (t.tags || []).includes(filterTag);
    const ratingOk = !filterMinRating || (t.rating || 0) >= filterMinRating;
    const participantOk = !filterParticipant || (t.participants || []).some(p => p.employee_id === filterParticipant);
    const hrOk = !filterHrDecision || t.hr_evaluation?.decision === filterHrDecision;
    const commentsOk = !filterHasComments || (t.comments || []).length > 0;
    const searchOk = !search || 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').replace(/<[^>]*>/g,'').toLowerCase().includes(search.toLowerCase()) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
      (t.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.group_name || '').toLowerCase().includes(search.toLowerCase());
    return statusOk && empOk && priorityOk && groupOk && tagOk && ratingOk && participantOk && hrOk && commentsOk && searchOk;
  });

  const activeFiltersCount = [filterPriority, filterGroup, filterTag, filterParticipant, filterHrDecision].filter(Boolean).length + (filterMinRating > 0 ? 1 : 0) + (filterHasComments ? 1 : 0);

  const clearAllFilters = () => {
    setSearch(''); setFilterStatus('الكل'); setFilterEmployee('');
    setFilterPriority(''); setFilterGroup(''); setFilterTag('');
    setFilterMinRating(0); setFilterParticipant(''); setFilterHrDecision('');
    setFilterHasComments(false);
    setShowActiveOnly(false);
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: displayTasks.filter(t => t.status === s).length }), {});
  const completedPct = displayTasks.length ? Math.round((counts['مكتملة'] / displayTasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-200">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-700 via-indigo-600 to-violet-700 px-6 py-8 lg:px-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 10% 50%, white 0%, transparent 50%), radial-gradient(circle at 90% 20%, white 0%, transparent 40%)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-indigo-200 text-sm font-medium">{L('لوحة التحكم', 'پانێلی کنترۆل')}</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">{L('المهام غير المصنفة', 'ئەرکەکانی پۆلێن نەکراو')}</h1>
            <p className="text-indigo-200 text-sm mt-1">{L('المهام التي لم تُضف إلى مجموعة', 'ئەرکەکانی زیاد نەکراون بۆ گروپ')}</p>
          </div>
          {mainTab === 'tasks' && (
            <button
              onClick={() => { initializeForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', backdropFilter: 'blur(10px)' }}>
              <Plus className="w-5 h-5" />
              {L('مهمة جديدة', 'ئەرکی نوێ')}
            </button>
          )}
        </div>

        {/* Progress bar inside hero */}
        {tasks.length > 0 && (
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-indigo-200 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{L('نسبة الإنجاز', 'ڕێژەی تەواوکردن')}</span>
              <span className="text-white font-bold text-sm">{completedPct}%  <span className="text-indigo-300 font-normal">({counts['مكتملة']}/{displayTasks.length})</span></span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-700 shadow-lg" style={{ width: `${completedPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Switcher */}
      <div className="px-4 pt-4 pb-4 flex gap-2 bg-slate-200">
        <button
          onClick={() => setMainTab('tasks')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm transition-all',
            mainTab === 'tasks'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
          )}
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span>{L('المهام', 'ئەرکەکان')}</span>
        </button>
        <button
          onClick={() => setMainTab('hr')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm transition-all',
            mainTab === 'hr'
              ? 'bg-violet-600 text-white shadow-lg'
              : 'bg-white text-slate-500 hover:bg-violet-50 hover:text-violet-600 border border-slate-200'
          )}
        >
          <Shield className="w-4 h-4 shrink-0" />
          <span>{L('الموارد البشرية', 'سەرچاوە مرۆییەکان')}</span>
          {tasks.filter(t => (t.status === 'مكتملة' || t.status === 'ملغاة') && !t.hr_evaluation).length > 0 && (
            <span className="bg-amber-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shrink-0">
              {tasks.filter(t => (t.status === 'مكتملة' || t.status === 'ملغاة') && !t.hr_evaluation).length}
            </span>
          )}
        </button>
      </div>

      <div className="p-4 pb-24 lg:p-8 lg:pb-24 max-w-5xl mx-auto space-y-6">

        {/* HR Section */}
        {mainTab === 'hr' && (
          <HrTasksSection
            tasks={tasks}
            employees={employees}
            users={allUsers}
            onTaskUpdate={handleTaskUpdate}
            onDelete={(id) => deleteMutation.mutate(id)}
            onStatusChange={(taskId, newStatus) => cycleStatus(taskId, newStatus)}
            onAddComment={(taskId, comment) => addCommentMutation.mutate({ taskId, comment })}
            onAddReply={(taskId, commentId, reply) => addReplyMutation.mutate({ taskId, commentId, reply })}
          />
        )}

        {mainTab === 'tasks' && (
        <div className="space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATUSES.map(s => {
            const sc = STATUS_CONFIG[s];
            const Icon = sc.icon;
            const isActive = filterStatus === s;
            return (
              <button key={s}
                onClick={() => setFilterStatus(filterStatus === s ? 'الكل' : s)}
                className={cn(
                  'relative bg-white rounded-2xl p-4 text-right shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.10)] border border-white/80 transition-all hover:-translate-y-0.5 overflow-hidden',
                  isActive ? 'border-current shadow-md -translate-y-0.5' : 'border-transparent'
                )}
                style={{ borderColor: isActive ? sc.glow : undefined }}>
                <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl" style={{ background: sc.glow, opacity: isActive ? 1 : 0.3 }} />
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${sc.glow}18` }}>
                    <Icon className={cn('w-4.5 h-4.5', sc.color)} style={{ width: 18, height: 18 }} />
                  </div>
                  {isActive && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: sc.glow }} />}
                </div>
                <div className="font-black text-2xl text-foreground">{counts[s] || 0}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{s}</div>
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Top row: search + toggles */}
          <div className="p-3 flex flex-wrap gap-2 items-center border-b border-slate-100">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={L('البحث في العنوان، الوسوم، الوصف...', 'گەڕان لە سەردێڕ، تاگ، وەسف...')}
                className="w-full h-9 rounded-xl border-2 border-muted bg-muted/20 pr-9 pl-3 text-sm outline-none focus:border-indigo-400 transition-colors" />
              {search && <button onClick={() => setSearch('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <button
              onClick={() => setShowAdvancedSearch(p => !p)}
              className={cn('flex items-center gap-2 h-9 px-3 rounded-xl border-2 text-xs font-bold transition-all',
                showAdvancedSearch || activeFiltersCount > 0
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-muted text-muted-foreground hover:border-indigo-300 hover:text-indigo-600')}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {L('فلترة متقدمة', 'فلتەری پێشکەوتوو')}
              {activeFiltersCount > 0 && <span className="bg-white text-indigo-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black">{activeFiltersCount}</span>}
            </button>
            <button
              onClick={() => setShowAllTasks(!showAllTasks)}
              className={cn('h-9 px-3 rounded-xl border-2 text-xs font-bold transition-all',
                showAllTasks ? 'bg-violet-600 text-white border-violet-600' : 'border-muted text-muted-foreground hover:border-violet-300 hover:text-violet-600')}>
              {showAllTasks ? L('غير المصنفة فقط', 'پۆلێن نەکراو') : L('عرض الكل', 'هەمووی')}
            </button>
            <button
              onClick={() => { setShowActiveOnly(p => !p); if (!showActiveOnly) setFilterStatus('الكل'); }}
              className={cn('h-9 px-3 rounded-xl border-2 text-xs font-bold transition-all',
                showActiveOnly ? 'bg-emerald-600 text-white border-emerald-600' : 'border-muted text-muted-foreground hover:border-emerald-300 hover:text-emerald-600')}>
              {showActiveOnly ? L('عرض الكل', 'هەمووی') : L('النشطة فقط', 'چالاکەکان تەنها')}
            </button>
            <Button variant="outline" size="sm" onClick={() => setShowGroupManager(true)} className="gap-1 h-9">
              <Users className="w-4 h-4" />{L('المجموعات', 'گروپەکان')}
            </Button>
            {/* View toggle */}
            <div className="flex gap-1 border-2 border-muted rounded-xl overflow-hidden">
              <button
                onClick={() => setTaskViewMode('card')}
                className={cn('p-2 transition-all', taskViewMode === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100')}
                title={L('عرض البطاقات', 'دیمەنی کارت')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTaskViewMode('list')}
                className={cn('p-2 transition-all', taskViewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100')}
                title={L('عرض القائمة', 'دیمەنی لیست')}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
            {(activeFiltersCount > 0 || search || filterStatus !== 'الكل' || filterEmployee) && (
              <button onClick={clearAllFilters} className="h-9 px-3 rounded-xl border-2 border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status pills — always visible */}
          <div className="px-3 py-2 flex gap-1.5 flex-wrap border-b border-slate-100">
            {['الكل', ...STATUSES].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn('px-3 py-1 rounded-xl text-xs font-bold border-2 transition-all',
                  filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'border-muted text-muted-foreground hover:border-indigo-300 hover:text-indigo-600')}>
                {s}{s !== 'الكل' && counts[s] ? ` (${counts[s]})` : ''}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedSearch && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 border-t border-slate-100">

              {/* Employee */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{L('الموظف', 'کارمەند')}</label>
                <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
                  className="w-full h-9 rounded-xl border-2 border-muted bg-white px-2 text-xs outline-none cursor-pointer focus:border-indigo-400">
                  <option value="">{L('الكل', 'هەمووی')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{L('الأولوية', 'پێشینە')}</label>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                  className="w-full h-9 rounded-xl border-2 border-muted bg-white px-2 text-xs outline-none cursor-pointer focus:border-indigo-400">
                  <option value="">{L('الكل', 'هەمووی')}</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Group */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{L('المجموعة', 'گروپ')}</label>
                <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
                  className="w-full h-9 rounded-xl border-2 border-muted bg-white px-2 text-xs outline-none cursor-pointer focus:border-indigo-400">
                  <option value="">{L('الكل', 'هەمووی')}</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              {/* Tag */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{L('الوسم', 'تاگ')}</label>
                <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                  className="w-full h-9 rounded-xl border-2 border-muted bg-white px-2 text-xs outline-none cursor-pointer focus:border-indigo-400">
                  <option value="">{L('الكل', 'هەمووی')}</option>
                  {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
                </select>
              </div>

              {/* Participant */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{L('المشارك', 'بەشدار')}</label>
                <select value={filterParticipant} onChange={e => setFilterParticipant(e.target.value)}
                  className="w-full h-9 rounded-xl border-2 border-muted bg-white px-2 text-xs outline-none cursor-pointer focus:border-indigo-400">
                  <option value="">{L('الكل', 'هەمووی')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>

              {/* HR Decision */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{L('قرار HR', 'بڕیاری HR')}</label>
                <select value={filterHrDecision} onChange={e => setFilterHrDecision(e.target.value)}
                  className="w-full h-9 rounded-xl border-2 border-muted bg-white px-2 text-xs outline-none cursor-pointer focus:border-indigo-400">
                  <option value="">{L('الكل', 'هەمووی')}</option>
                  <option value="approved">{L('موافق', 'مووافاقەت')}</option>
                  <option value="rejected">{L('مرفوض', 'ڕەتکراو')}</option>
                  <option value="needs_revision">{L('يحتاج مراجعة', 'پێویستی بە پێداچوونەوە')}</option>
                  <option value="in_progress_review">{L('قيد المراجعة', 'لە پێداچوونەوە')}</option>
                  <option value="partially_completed">{L('مكتمل جزئياً', 'بەشێک تەواو')}</option>
                  <option value="on_hold">{L('موقوف', 'ڕاوەستاو')}</option>
                  <option value="escalated">{L('مصعّد', 'بەرزکراوەتەوە')}</option>
                  <option value="pending_info">{L('ينتظر معلومات', 'چاوەڕوانی زانیاری')}</option>
                </select>
              </div>

              {/* Min Rating */}
              <div className="col-span-2 sm:col-span-3">
                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">{L('الحد الأدنى للتقييم', 'کەمترین هەلسەنگاندن')}</label>
                <div className="flex items-center gap-1 flex-wrap">
                  {[0,1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setFilterMinRating(n === filterMinRating ? 0 : n)}
                      className={cn('flex items-center justify-center h-8 px-2 rounded-lg border-2 text-xs font-bold transition-all whitespace-nowrap',
                        filterMinRating === n && n > 0 ? 'bg-yellow-400 border-yellow-400 text-white' : 'border-muted bg-white text-slate-500 hover:border-yellow-300')}>
                      {n === 0 ? L('الكل', 'هەمووی') : `${n}★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Has Comments */}
              <div className="flex items-end">
                <button onClick={() => setFilterHasComments(p => !p)}
                  className={cn('h-9 px-4 rounded-xl border-2 text-xs font-bold flex items-center gap-2 transition-all',
                    filterHasComments ? 'bg-indigo-600 text-white border-indigo-600' : 'border-muted bg-white text-slate-500 hover:border-indigo-300')}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  {L('لها تعليقات', 'لێدوانی هەیە')}
                </button>
              </div>

            </div>
          )}

          {/* Active filter chips */}
          {(filterTag || filterGroup || filterPriority || filterParticipant || filterHrDecision || filterMinRating > 0) && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {filterTag && <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">#{filterTag}<button onClick={() => setFilterTag('')}><X className="w-3 h-3 ml-0.5" /></button></span>}
              {filterGroup && <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">{groups.find(g=>g.id===filterGroup)?.name}<button onClick={() => setFilterGroup('')}><X className="w-3 h-3 ml-0.5" /></button></span>}
              {filterPriority && <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">{filterPriority}<button onClick={() => setFilterPriority('')}><X className="w-3 h-3 ml-0.5" /></button></span>}
              {filterParticipant && <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">{employees.find(e=>e.id===filterParticipant)?.full_name}<button onClick={() => setFilterParticipant('')}><X className="w-3 h-3 ml-0.5" /></button></span>}
              {filterHrDecision && <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">HR: {filterHrDecision}<button onClick={() => setFilterHrDecision('')}><X className="w-3 h-3 ml-0.5" /></button></span>}
              {filterMinRating > 0 && <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">{'★'.repeat(filterMinRating)}+<button onClick={() => setFilterMinRating(0)}><X className="w-3 h-3 ml-0.5" /></button></span>}
            </div>
          )}
        </div>

        {/* Task Feed */}
        <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
          {taskViewMode === 'list' && filtered.length > 0 && (
            <TaskListView tasks={filtered} employees={employees} lang={lang} showStatus />
          )}
          {taskViewMode === 'card' && filtered.map((task) => (
            <TaskPost
              key={task.id}
              task={task}
              employees={employees}
              users={allUsers}
              onLike={() => {}}
              onDelete={() => deleteMutation.mutate(task.id)}
              onStatusChange={(taskId, newStatus) => cycleStatus(taskId, newStatus)}
              onTaskUpdate={handleTaskUpdate}
              onAddComment={(taskId, comment) => {
                addCommentMutation.mutate({ taskId, comment });
              }}
              onAddReply={(taskId, commentId, reply) => {
                addReplyMutation.mutate({ taskId, commentId, reply });
              }}
            />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-indigo-300" />
              </div>
              <p className="font-bold text-foreground/60 text-lg">{L('لا توجد مهام', 'هیچ ئەرکێک نییە')}</p>
              <p className="text-sm text-muted-foreground mt-1">{showAllTasks ? L('لا توجد مهام', 'هیچ ئەرکێک نییە') : L('ابدأ بإضافة مهمة جديدة', 'دەست بکە بە زیادکردنی ئەرکی نوێ')}</p>
              <button onClick={() => { initializeForm(); setShowForm(true); }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold shadow-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />{L('مهمة جديدة', 'ئەرکی نوێ')}
              </button>
            </div>
          )}
        </div>
        </div>
        )}

      </div>

      {/* Add Task Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ overflow: 'hidden' }}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg flex flex-col" style={{ height: 'calc(100dvh - 60px)', maxHeight: 'calc(100dvh - 60px)' }}>

            {/* Modal Header */}
            <div className="relative p-4 sm:p-6 pb-5 overflow-hidden" style={{ background: `linear-gradient(135deg, ${form.color}dd 0%, ${form.color}99 100%)` }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 60%)' }} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/25 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <Sparkles className="w-5 h-5 text-white" />
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

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 w-full" style={{ overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
              {/* Title */}
              <div className="w-full">
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

              {/* Creator (Read-only, auto-set) */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('المنشئ', 'دروستکار')} </label>
                <div className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: currentUser?.avatar_color || form.color }}>
                      {(employees.find(e => e.id === form.employee_id)?.full_name || currentUser?.full_name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-indigo-700">{employees.find(e => e.id === form.employee_id)?.full_name || currentUser?.full_name || L('الموظف الحالي', 'کارمەندی ئێستا')}</p>
                      {currentUser?.username && <p className="text-xs text-indigo-500">@{currentUser.username}</p>}
                      {currentUser?.email && <p className="text-xs text-indigo-400">{currentUser.email}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="relative">
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('المشاركون', 'بەشدارەکان')}</label>
                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setShowParticipantsDropdown(p => !p)}
                  className="w-full flex items-center justify-between gap-2 h-11 px-4 rounded-2xl border-2 border-muted bg-muted/20 text-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {form.participants.length === 0 ? (
                      <span className="text-muted-foreground">{L('اختر المشاركين...', 'بەشدارەکان هەڵبژێرە...')}</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {form.participants.map(p => (
                          <span key={p.employee_id} className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: form.color }}>
                            {p.employee_name}
                            <button type="button" onClick={(e) => { e.stopPropagation(); setForm(prev => ({ ...prev, participants: prev.participants.filter(pt => pt.employee_id !== p.employee_id) })); }} className="hover:opacity-70">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
                {/* Dropdown list */}
                {showParticipantsDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border-2 border-muted rounded-2xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                    {employees.filter(e => e.id !== form.employee_id).map((emp, idx, arr) => {
                      const isSelected = !!form.participants.find(p => p.employee_id === emp.id);
                      return (
                        <button key={emp.id} type="button" onClick={() => {
                          if (isSelected) {
                            setForm(p => ({ ...p, participants: p.participants.filter(part => part.employee_id !== emp.id) }));
                          } else {
                            setForm(p => ({ ...p, participants: [...p.participants, { employee_id: emp.id, employee_name: emp.full_name }] }));
                          }
                          setShowParticipantsDropdown(false);
                        }}
                          className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors',
                            idx < arr.length - 1 && 'border-b border-muted',
                            isSelected ? 'bg-indigo-50' : 'hover:bg-muted/30'
                          )}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ background: isSelected ? form.color : '#94a3b8' }}>
                            {emp.full_name.charAt(0)}
                          </div>
                          <span className="flex-1 text-sm font-semibold text-slate-700">{emp.full_name}</span>
                          <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all')}
                            style={{ borderColor: isSelected ? form.color : '#d1d5db', background: isSelected ? form.color : 'transparent' }}>
                            {isSelected && <span className="text-white text-xs font-black">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Group */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('المجموعة', 'گروپ')}</label>
                <Select value={form.group_id} onValueChange={(val) => {
                  const group = groups.find(g => g.id === val);
                  setForm(p => ({ ...p, group_id: val, group_name: group?.name || '' }));
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={L('اختر مجموعة (اختياري)', 'گروپێک هەڵبژێرە (ئیختیاری)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>{L('بدون مجموعة', 'بێ گروپ')}</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                          {g.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.group_id && (
                  <div className={cn('flex items-center gap-2 mt-2 p-2 rounded-lg', groupForTask ? 'bg-indigo-50 border-2 border-indigo-200' : '')} style={{ background: groupForTask ? undefined : `${(groups.find(g => g.id === form.group_id)?.color) || '#6366f1'}10` }}>
                    <Users className="w-3.5 h-3.5" style={{ color: groups.find(g => g.id === form.group_id)?.color || '#6366f1' }} />
                    <span className="text-xs font-bold" style={{ color: groups.find(g => g.id === form.group_id)?.color || '#6366f1' }}>{form.group_name}</span>
                    {groupForTask && <span className="text-xs text-indigo-600 font-bold mr-auto">(من المجموعة)</span>}
                    <button onClick={() => { setForm(p => ({ ...p, group_id: '', group_name: '' })); setGroupForTask(null); }} className="ml-auto">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
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

              {/* Tags */}
              <div>
                <label className="text-base font-black text-slate-800 block mb-2" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('الوسوم', 'تاگەکان')}</label>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                        e.preventDefault();
                        const tag = tagInput.trim().replace(/,$/, '');
                        if (tag && !form.tags.includes(tag)) {
                          setForm(p => ({ ...p, tags: [...p.tags, tag] }));
                        }
                        setTagInput('');
                      }
                    }}
                    placeholder={L('اكتب وسماً ثم اضغط Enter', 'تاگێک بنووسە پاشان Enter بکە')}
                    className="flex-1 h-10 rounded-xl border-2 border-muted bg-muted/20 px-3 text-sm outline-none focus:border-primary/40 transition-colors"
                  />
                  <button type="button"
                    onClick={() => {
                      const tag = tagInput.trim();
                      if (tag && !form.tags.includes(tag)) {
                        setForm(p => ({ ...p, tags: [...p.tags, tag] }));
                      }
                      setTagInput('');
                    }}
                    className="h-10 px-3 rounded-xl border-2 border-muted bg-muted/20 text-sm font-bold text-slate-600 hover:bg-muted/40 transition-colors">
                    +
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                        style={{ background: `${form.color}15`, borderColor: `${form.color}40`, color: form.color }}>
                        #{tag}
                        <button type="button" onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} className="hover:opacity-70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/10 flex justify-end gap-2 sm:gap-3">
              <button className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border-2 border-muted text-xs sm:text-sm font-bold text-muted-foreground hover:bg-muted/20 transition-colors"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</button>
              <button
                className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-white font-bold text-xs sm:text-sm shadow-lg hover:opacity-90 transition-all hover:scale-105 disabled:opacity-40 disabled:scale-100"
                style={{ background: `linear-gradient(135deg, ${form.color} 0%, ${form.color}cc 100%)` }}
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || createMutation.isPending}>
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {createMutation.isPending ? L('جاري الإضافة...', 'زیادکردن...') : L('إضافة المهمة', 'ئەرک زیادبکە')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Manager Modal */}
      <Dialog open={showGroupManager} onOpenChange={setShowGroupManager}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{L('إدارة المجموعات', 'بەڕێوەبردنی گروپەکان')}</DialogTitle>
            <DialogDescription>{L('إنشاء وإدارة مجموعات الموظفين', 'دروستکردن و بەڕێوەبردنی گروپەکانی کارمەندان')}</DialogDescription>
          </DialogHeader>
          <GroupManager onCreateGroupTask={handleCreateGroupTask} />
        </DialogContent>
      </Dialog>
    </div>
  );
}