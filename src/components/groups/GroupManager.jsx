import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, Plus, X, Edit2, Trash2, Check,
  UserPlus, Search, ClipboardList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const GROUP_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'
];

export default function GroupManager({ onCreateGroupTask }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState({
    name: '',
    name_ku: '',
    description: '',
    description_ku: '',
    color: '#6366f1',
    members: []
  });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showMembers, setShowMembers] = useState(false);

  const { data: groups = [] } = useQuery({
    queryKey: ['employee-groups', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.EmployeeGroup.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.EmployeeGroup.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Employee.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Employee.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeGroup.create({
      ...data,
      branch_id: activeBranch?.id,
      is_active: true
    }),
    onSuccess: () => {
      qc.invalidateQueries(['employee-groups']);
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.EmployeeGroup.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['employee-groups']);
      setShowForm(false);
      setEditingGroup(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeGroup.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['employee-groups']);
      setSelectedGroup(null);
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      name_ku: '',
      description: '',
      description_ku: '',
      color: '#6366f1',
      members: []
    });
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setForm({
      name: group.name,
      name_ku: group.name_ku || '',
      description: group.description || '',
      description_ku: group.description_ku || '',
      color: group.color || '#6366f1',
      members: group.members || []
    });
    setShowForm(true);
  };

  const handleAddMember = (employeeId) => {
    if (!employeeId || form.members.find(m => m.employee_id === employeeId)) return;
    const emp = employees.find(e => e.id === employeeId);
    setForm(prev => ({
      ...prev,
      members: [...prev.members, {
        employee_id: employeeId,
        employee_name: emp?.full_name || '',
        added_at: new Date().toISOString()
      }]
    }));
  };

  const handleRemoveMember = (employeeId) => {
    setForm(prev => ({
      ...prev,
      members: prev.members.filter(m => m.employee_id !== employeeId)
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    
    const data = {
      ...form,
      members: form.members
    };

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{L('إدارة المجموعات', 'بەڕێوەبردنی گروپەکان')}</h2>
            <p className="text-xs text-slate-500">{L('إنشاء وإدارة مجموعات الموظفين', 'دروستکردن و بەڕێوەبردنی گروپەکانی کارمەندان')}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingGroup(null); resetForm(); setShowForm(true); }} className="rounded-xl">
          <Plus className="w-4 h-4" />
          {L('مجموعة جديدة', 'گروپی نوێ')}
        </Button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => (
          <Card key={group.id} onClick={() => navigate(`/group-tasks/${group.id}`)} className="border-2 hover:shadow-lg transition-all cursor-pointer" style={{ borderColor: `${group.color}30` }}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: group.color }}>
                    {(group.name || '?').charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{group.name}</CardTitle>
                    {group.name_ku && <p className="text-xs text-slate-500">{group.name_ku}</p>}
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(group)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(group.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(group.description || group.description_ku) && (
                <p className="text-xs text-slate-600">{group.description || group.description_ku}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{(group.members || []).length} {L('أعضاء', 'ئەندام')}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/group-tasks/${group.id}`)} className="h-7 text-xs bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700">
                    <ClipboardList className="w-3 h-3" />
                    {L('مهام', 'ئەرکەکان')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); setShowMembers(true); }} className="h-7 text-xs">
                    <Users className="w-3 h-3" />
                    {L('عرض', 'نیشاندان')}
                  </Button>
                </div>
              </div>
              {(group.members || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(group.members || []).slice(0, 4).map((member, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {member.employee_name}
                    </Badge>
                  ))}
                  {(group.members || []).length > 4 && (
                    <Badge variant="outline" className="text-xs">+{(group.members || []).length - 4}</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">{L('لا توجد مجموعات', 'هیچ گروپێک نییە')}</p>
          <p className="text-xs text-slate-400 mt-1">{L('أنشئ أول مجموعة لإدارة المهام الجماعية', 'یەکەم گروپ دروست بکە بۆ بەڕێوەبردنی ئەرکەکانی گروپ')}</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? L('تعديل المجموعة', 'دەستکاری گروپ') : L('إنشاء مجموعة جديدة', 'دروستکردنی گروپی نوێ')}</DialogTitle>
            <DialogDescription>
              {L('أضف اسم المجموعة ووصفها وأعضاء الفريق', 'ناوی گروپ و وەسف و ئەندامانی تیم زیاد بکە')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{L('الاسم (عربي)', 'ناو (عربی)')}</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={L('اسم المجموعة', 'ناوی گروپ')} />
              </div>
              <div>
                <Label>{L('الاسم (كردي)', 'ناو (کوردی)')}</Label>
                <Input value={form.name_ku} onChange={e => setForm(p => ({ ...p, name_ku: e.target.value }))} placeholder={L('ناوی گروپ', 'ناوی گروپ')} />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{L('الوصف (عربي)', 'وەسف (عربی)')}</Label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={L('وصف المجموعة', 'وەسفی گروپ')} />
              </div>
              <div>
                <Label>{L('الوصف (كردي)', 'وەسف (کوردی)')}</Label>
                <Input value={form.description_ku} onChange={e => setForm(p => ({ ...p, description_ku: e.target.value }))} placeholder={L('وەسفی گروپ', 'وەسفی گروپ')} />
              </div>
            </div>

            {/* Color */}
            <div>
              <Label>{L('لون المجموعة', 'رەنگی گروپ')}</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {GROUP_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm(p => ({ ...p, color }))}
                    className={cn('w-8 h-8 rounded-full transition-all', form.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105')}
                    style={{ background: color }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  className="w-8 h-8 rounded-full cursor-pointer border-0"
                />
              </div>
            </div>

            {/* Members */}
            <div>
              <Label>{L('الأعضاء', 'ئەندامان')}</Label>
              <div className="flex gap-2 mt-2">
                <Select onValueChange={handleAddMember}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={L('اختر موظفاً...', 'کارمەندێک هەڵبژێرە...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => !form.members.find(m => m.employee_id === e.id)).map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.members.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.members.map((member, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {member.employee_name.charAt(0)}
                      </span>
                      {member.employee_name}
                      <button onClick={() => handleRemoveMember(member.employee_id)} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}>
              {editingGroup ? L('حفظ', 'پاشەکەوتکردن') : L('إنشاء', 'دروستکردن')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name || L('أعضاء المجموعة', 'ئەندامانی گروپ')}</DialogTitle>
            <DialogDescription>
              {(selectedGroup?.members || []).length} {L('أعضاء', 'ئەندام')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(selectedGroup?.members || []).map((member, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                  {member.employee_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm font-medium">{member.employee_name}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}