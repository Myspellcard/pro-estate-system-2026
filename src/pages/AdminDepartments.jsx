import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Building2, Edit, Trash2, Users, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

export default function AdminDepartments() {
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deleteDept, setDeleteDept] = useState(null);

  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const { data: departments = [] } = useQuery({
    queryKey: ['departments', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Department.filter(
      activeBranch?.id ? { branch_id: activeBranch.id } : {}
    ),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Employee.filter(
      activeBranch?.id ? { branch_id: activeBranch.id, is_active: true } : { is_active: true }
    ),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingDept) {
        return firebaseApi.entities.Department.update(editingDept.id, data);
      }
      return firebaseApi.entities.Department.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsFormOpen(false);
      setEditingDept(null);
      toast.success(L('تم الحفظ بنجاح', 'بە سەرکەوتوویی پاشەکەوتکرا'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Department.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeleteDept(null);
      toast.success(L('تم الحذف بنجاح', 'بە سەرکەوتوویی سڕایەوە'));
    },
  });

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.name_ku && d.name_ku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    saveMutation.mutate({
      name: formData.get('name'),
      name_ku: formData.get('name_ku'),
      description: formData.get('description'),
      description_ku: formData.get('description_ku'),
      manager_id: formData.get('manager_id'),
      manager_name: employees.find(emp => emp.id === formData.get('manager_id'))?.full_name || '',
      color: formData.get('color') || '#3b82f6',
      branch_id: activeBranch?.id,
      is_active: true,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">{L('إدارة الأقسام', 'بەڕێوەبردنی بەشەکان')}</h1>
          <p className="text-sm text-gray-500">{L('هيكلية الأقسام والمديرين', 'ساختاری بەشەکان و بەڕێوەبەرەکان')}</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); setEditingDept(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
              <Plus className="w-4 h-4" />
              {L('إضافة قسم', 'زیادکردنی بەش')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDept ? L('تعديل القسم', 'دەستکاریکردنی بەش') : L('إضافة قسم جديد', 'زیادکردنی بەشی نوێ')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('اسم القسم (عربي)', 'ناوی بەش (عەرەبی)')}</label>
                  <Input name="name" required defaultValue={editingDept?.name} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('اسم القسم (كردي)', 'ناوی بەش (کوردی)')}</label>
                  <Input name="name_ku" defaultValue={editingDept?.name_ku} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('الوصف (عربي)', 'وەسف (عەرەبی)')}</label>
                  <Input name="description" defaultValue={editingDept?.description} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('الوصف (كردي)', 'وەسف (کوردی)')}</label>
                  <Input name="description_ku" defaultValue={editingDept?.description_ku} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{L('مدير القسم', 'بەڕێوەبەری بەش')}</label>
                <select name="manager_id" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">{L('اختر مدير...', 'بەڕێوەبەر هەڵبژێرە...')}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} selected={editingDept?.manager_id === emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{L('لون القسم', 'رەنگی بەش')}</label>
                <Input type="color" name="color" defaultValue={editingDept?.color || '#3b82f6'} className="w-20" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  {L('إلغاء', 'پاشگەزبوونەوە')}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-[#1a2744] hover:bg-[#2a3f6e]">
                  {L('حفظ', 'پاشەکەوتکردن')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder={L('بحث عن قسم...', 'گەڕان بەدوای بەش...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Departments Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDepts.map(dept => (
          <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: dept.color + '20' }}>
                  <Building2 className="w-5 h-5" style={{ color: dept.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1a2744]">{dept.name}</h3>
                  {dept.name_ku && <p className="text-xs text-gray-500">{dept.name_ku}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditingDept(dept); setIsFormOpen(true); }}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteDept(dept)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
            {dept.description && (
              <p className="text-sm text-gray-600 mb-3">{dept.description}</p>
            )}
            {dept.manager_name && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>{L('المدير:', 'بەڕێوەبەر:')}</span>
                <span className="font-medium">{dept.manager_name}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDepts.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{L('لا توجد أقسام', 'هیچ بەشێک نییە')}</p>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDept} onOpenChange={() => setDeleteDept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L('تأكيد الحذف', 'دڵنیاییکردنەوەی سڕینەوە')}</AlertDialogTitle>
            <AlertDialogDescription>
              {L('هل أنت متأكد من حذف هذا القسم؟', 'دڵنیایت لە سڕینەوەی ئەم بەشە؟')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDept.id)} className="bg-red-500 hover:bg-red-600">
              {L('حذف', 'سڕینەوە')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}