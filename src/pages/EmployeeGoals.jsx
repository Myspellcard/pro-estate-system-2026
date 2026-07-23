import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Target, Edit, Trash2, Users, Search, Calendar, BarChart3, MessageSquare, Tag } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

import GoalDetailModal from '@/components/goals/GoalDetailModal';
import GoalFormModal from '@/components/goals/GoalFormModal';

export default function EmployeeGoals() {
  const { activeBranch } = useBranch();
  const { lang, T } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [selectedForComparison, setSelectedForComparison] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [detailGoal, setDetailGoal] = useState(null);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', activeBranch?.id],
    queryFn: () => firebaseApi.entities.EmployeeGoal.filter(
      activeBranch?.id ? { branch_id: activeBranch.id } : {}
    ),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Employee.filter(
      activeBranch?.id ? { branch_id: activeBranch.id, is_active: true } : { is_active: true }
    ),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', activeBranch?.id],
    queryFn: () => firebaseApi.entities.EmployeeGroup.filter(
      activeBranch?.id ? { branch_id: activeBranch.id, is_active: true } : { is_active: true }
    ),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingGoal) {
        return firebaseApi.entities.EmployeeGoal.update(editingGoal.id, data);
      }
      return firebaseApi.entities.EmployeeGoal.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsFormOpen(false);
      setEditingGoal(null);
      toast.success(T('goals.saved_success', 'تم الحفظ بنجاح', 'بە سەرکەوتوویی پاشەکەوتکرا'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setDeleteGoal(null);
      toast.success(T('goals.deleted_success', 'تم الحذف بنجاح', 'بە سەرکەوتوویی سڕایەوە'));
    },
  });

  const filteredGoals = goals.filter(g =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.employee_name && g.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.group_name && g.group_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleFormSubmit = (data) => {
    saveMutation.mutate({
      ...data,
      status: 'active',
      current_score: 0,
      current_level: 1,
      branch_id: activeBranch?.id,
      is_active: true,
    });
  };

  const levelGradients = [
    'from-slate-500 to-slate-700',
    'from-emerald-500 to-teal-700',
    'from-blue-500 to-indigo-700',
    'from-violet-500 to-purple-700',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-700',
  ];

  const getLevelGradient = (goal) => {
    const lvl = (goal.current_level || 1) - 1;
    return levelGradients[Math.min(lvl, levelGradients.length - 1)];
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const comparisonData = filteredGoals
    .filter(g => selectedForComparison.includes(g.id))
    .map(g => ({
      name: g.employee_name || g.group_name,
      score: g.current_score || 0,
      target: g.target_score
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">{T('goals.page_title', 'أهداف الموظفين', 'ئامانجەکانی کارمەندان')}</h1>
          <p className="text-sm text-gray-500">{T('goals.page_subtitle', 'تتبع وتقييم أهداف الموظفين الفردية والجماعية', 'شوێنکەوتن و هەڵسەنگاندنی ئامانجەکانی کارمەندان')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showComparison ? 'default' : 'outline'}
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {T('goals.compare', 'المقارنة', 'بەراوردکردن')}
          </Button>
          <Button
            className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]"
            onClick={() => { setEditingGoal(null); setIsFormOpen(true); }}
          >
            <Plus className="w-4 h-4" />
            {T('goals.add_goal', 'إضافة هدف', 'زیادکردنی ئامانج')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder={T('goals.search_placeholder', 'بحث عن هدف...', 'گەڕان بەدوای ئامانج...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Comparison Chart */}
      {showComparison && comparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {T('goals.compare_title', 'مقارنة الأهداف', 'بەراوردکردنی ئامانجەکان')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparisonData.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-500">{item.score} / {item.target}</span>
                  </div>
                  <Progress value={(item.score / item.target) * 100} className="h-3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredGoals.map(goal => {
          const progress = Math.min(((goal.current_score || 0) / (goal.target_score || 100)) * 100, 100);
          const gradient = getLevelGradient(goal);
          const currentLvl = goal.current_level || 1;
          return (
          <div
            key={goal.id}
            className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
            onClick={() => setDetailGoal(goal)}
          >
            <div className={`bg-gradient-to-br ${gradient} px-4 pt-4 pb-6 relative`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    {goal.goal_type === 'group'
                      ? <Users className="w-5 h-5 text-white" />
                      : <Target className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-1">{lang === 'ku' ? (goal.title_ku || goal.title) : goal.title}</h3>
                    <p className="text-xs text-white/70 mt-0.5">{goal.employee_name || goal.group_name || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingGoal(goal); setIsFormOpen(true); }}
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/35 flex items-center justify-center transition-all"
                  >
                    <Edit className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    onClick={() => setDeleteGoal(goal)}
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-red-500/60 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-white/80">
                  <span>{T('goals.progress', 'التقدم', 'پێشکەوتن')}</span>
                  <span className="font-bold text-white">{goal.current_score || 0} / {goal.target_score}</span>
                </div>
                <div className="h-2 bg-white/25 rounded-full overflow-hidden">
                  <div className="h-full bg-white/80 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="px-4 pt-3 pb-4 space-y-3 -mt-2 bg-white rounded-t-2xl relative">
              {goal.levels?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
              {goal.levels.map((lvl, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all ${
                    idx < currentLvl
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {lang === 'ku' ? (lvl.level_name_ku || `ئاست ${lvl.level_number}`) : (lvl.level_name_ar || `المستوى ${lvl.level_number}`)}
                </span>
              ))}
              </div>
              )}

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(goal.end_date).toLocaleDateString('ar-IQ')}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getStatusBadge(goal.status)}`}>
                  {goal.status === 'active' ? T('goals.status_active', 'نشط', 'چالاک') : goal.status === 'completed' ? T('goals.status_completed', 'مكتمل', 'تەواو') : T('goals.status_cancelled', 'ملغي', 'هەڵوەشاو')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  {goal.comments?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MessageSquare className="w-3.5 h-3.5" /> {goal.comments.length}
                    </span>
                  )}
                  {goal.tags?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-indigo-400">
                      <Tag className="w-3.5 h-3.5" /> {goal.tags.length}
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedForComparison.includes(goal.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedForComparison([...selectedForComparison, goal.id]);
                      else setSelectedForComparison(selectedForComparison.filter(id => id !== goal.id));
                    }}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span className="text-[11px] text-slate-400">{T('goals.compare_checkbox', 'مقارنة', 'بەراورد')}</span>
                </label>
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {filteredGoals.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{T('goals.no_goals', 'لا توجد أهداف', 'هیچ ئامانجێک نییە')}</p>
        </div>
      )}

      <GoalFormModal
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingGoal(null); }}
        editingGoal={editingGoal}
        employees={employees}
        groups={groups}
        onSubmit={handleFormSubmit}
        isSaving={saveMutation.isPending}
      />

      {detailGoal && (
        <GoalDetailModal
          goal={detailGoal}
          open={!!detailGoal}
          onClose={() => setDetailGoal(null)}
          onGoalUpdate={(updated) => setDetailGoal(updated)}
        />
      )}

      <AlertDialog open={!!deleteGoal} onOpenChange={() => setDeleteGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T('goals.confirm_delete_title', 'تأكيد الحذف', 'دڵنیاییکردنەوەی سڕینەوە')}</AlertDialogTitle>
            <AlertDialogDescription>
              {T('goals.confirm_delete_desc', 'هل أنت متأكد من حذف هذا الهدف؟', 'دڵنیایت لە سڕینەوەی ئەم ئامانجە؟')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T('general.cancel', 'إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteGoal.id)} className="bg-red-500 hover:bg-red-600">
              {T('general.delete', 'حذف', 'سڕینەوە')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}