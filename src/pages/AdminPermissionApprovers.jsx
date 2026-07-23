import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Users, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

export default function AdminPermissionApprovers() {
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApprover, setEditingApprover] = useState(null);
  const [deleteApprover, setDeleteApprover] = useState(null);

  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const { data: approvers = [] } = useQuery({
    queryKey: ['permission_approvers', activeBranch?.id],
    queryFn: () => firebaseApi.entities.PermissionApprover.filter(
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
      if (editingApprover) {
        return firebaseApi.entities.PermissionApprover.update(editingApprover.id, data);
      }
      return firebaseApi.entities.PermissionApprover.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission_approvers'] });
      setIsFormOpen(false);
      setEditingApprover(null);
      toast.success(L('تم الحفظ بنجاح', 'بە سەرکەوتوویی پاشەکەوتکرا'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.PermissionApprover.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission_approvers'] });
      setDeleteApprover(null);
      toast.success(L('تم الحذف بنجاح', 'بە سەرکەوتوویی سڕایەوە'));
    },
  });

  const permissionTypes = [
    { value: 'loan', label: L('قرض', 'قەرز') },
    { value: 'material_request', label: L('طلب مواد', 'داواکاری کەلوپەل') },
    { value: 'delay', label: L('تأخير', 'دواکەوتن') },
    { value: 'absence', label: L('غياب', 'ئامادەنەبوون') },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const employee = employees.find(emp => emp.id === formData.get('employee_id'));

    saveMutation.mutate({
      employee_id: formData.get('employee_id'),
      employee_name: employee?.full_name || '',
      permission_types: formData.getAll('permission_types'),
      can_approve_loans: formData.get('permission_types')?.includes('loan'),
      can_approve_material_requests: formData.get('permission_types')?.includes('material_request'),
      can_approve_delay: formData.get('permission_types')?.includes('delay'),
      can_approve_absence: formData.get('permission_types')?.includes('absence'),
      branch_id: activeBranch?.id,
      is_active: true,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">{L('الموافقون على الأذونات', 'پەسەندکەرانی مۆڵەتەکان')}</h1>
          <p className="text-sm text-gray-500">{L('إدارة الأشخاص المخولين للموافقة على الطلبات', 'بەڕێوەبردنی ئەو کەسانەی مۆڵەتی پەسەندکردنی داواکارییان هەیە')}</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); setEditingApprover(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
              <Plus className="w-4 h-4" />
              {L('إضافة موافق', 'زیادکردنی پەسەندکەر')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingApprover ? L('تعديل الموافق', 'دەستکاریکردنی پەسەندکەر') : L('إضافة موافق جديد', 'زیادکردنی پەسەندکەری نوێ')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{L('الموظف', 'کارمەند')}</label>
                <select name="employee_id" required className="w-full border border-gray-200 rounded-lg px-3 py-2">
                  <option value="">{L('اختر موظف...', 'کارمەند هەڵبژێرە...')}</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{L('أنواع الطلبات المسموح بالموافقة عليها', 'جۆرەکانی داواکارییەکانی مۆڵەتی پەسەندکردنی هەیە')}</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {permissionTypes.map(type => (
                    <label key={type.value} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="permission_types"
                        value={type.value}
                        defaultChecked={editingApprover?.permission_types?.includes(type.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  {L('إلغاء', 'پاشگەزبوونەوە')}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-[#1a2744] hover:bg-[#2a3f6e]">
                  {L('إرسال', 'ناردن')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Approvers Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {approvers.map(approver => (
          <Card key={approver.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#1a2744]" />
                  <div>
                    <CardTitle className="text-base">{approver.employee_name}</CardTitle>
                  </div>
                </div>
                <Badge className="bg-green-500">{L('نشط', 'چالاک')}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {approver.permission_types?.map(type => {
                  const typeInfo = permissionTypes.find(t => t.value === type);
                  return typeInfo ? (
                    <Badge key={type} variant="outline" className="text-xs">
                      {typeInfo.label}
                    </Badge>
                  ) : null;
                })}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingApprover(approver); setIsFormOpen(true); }}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3" />
                  {L('تعديل', 'دەستکاریکردن')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteApprover(approver)}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {approvers.length === 0 && (
        <div className="text-center py-12">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{L('لا يوجد موافقون', 'هیچ پەسەندکەرێک نییە')}</p>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteApprover && (
        <Dialog open={!!deleteApprover} onOpenChange={() => setDeleteApprover(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{L('تأكيد الحذف', 'دڵنیاییکردنەوەی سڕینەوە')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              {L('هل أنت متأكد من حذف هذا الموافق؟', 'دڵنیایت لە سڕینەوەی ئەم پەسەندکەرە؟')}
            </p>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setDeleteApprover(null)}>
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </Button>
              <Button
                onClick={() => deleteMutation.mutate(deleteApprover.id)}
                className="bg-red-500 hover:bg-red-600"
              >
                {L('حذف', 'سڕینەوە')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}