import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, Edit, Trash2, Search, Calendar, Download, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { jsPDF } from 'jspdf';

export default function EmployeePermissions() {
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState(null);
  const [deletePerm, setDeletePerm] = useState(null);
  const [selectedPerm, setSelectedPerm] = useState(null);
  
  // Get filter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const typeFilter = urlParams.get('filter');
  
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions', activeBranch?.id],
    queryFn: () => firebaseApi.entities.EmployeePermission.filter(
      activeBranch?.id ? { branch_id: activeBranch.id } : {}
    ),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Employee.filter(
      activeBranch?.id ? { branch_id: activeBranch.id, is_active: true } : { is_active: true }
    ),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingPerm) {
        return firebaseApi.entities.EmployeePermission.update(editingPerm.id, data);
      }
      return firebaseApi.entities.EmployeePermission.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setIsFormOpen(false);
      setEditingPerm(null);
      toast.success(L('تم الحفظ بنجاح', 'بە سەرکەوتوویی پاشەکەوتکرا'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeePermission.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setDeletePerm(null);
      toast.success(L('تم الحذف بنجاح', 'بە سەرکەوتوویی سڕایەوە'));
    },
  });

  const filteredPerms = permissions.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.employee_name && p.employee_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by type if specified in URL
    if (typeFilter) {
      const typeMap = {
        'loans': 'loan',
        'products': 'material_request',
        'permissions': ['delay', 'absence']
      };
      const filterType = typeMap[typeFilter];
      if (Array.isArray(filterType)) {
        if (!filterType.includes(p.permission_type)) return false;
      } else if (p.permission_type !== filterType) {
        return false;
      }
    }
    
    return matchesSearch;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    let permType = formData.get('permission_type');
    
    // Auto-set permission type based on URL filter if not selected
    if (typeFilter) {
      const typeMap = {
        'loans': 'loan',
        'products': 'material_request',
        'permissions': 'delay'
      };
      permType = typeMap[typeFilter] || permType;
    }
    
    const employee = employees.find(emp => emp.id === formData.get('employee_id'));

    saveMutation.mutate({
      employee_id: formData.get('employee_id'),
      employee_name: employee?.full_name || '',
      permission_type: permType,
      title: formData.get('title'),
      title_ku: formData.get('title_ku'),
      description: formData.get('description'),
      description_ku: formData.get('description_ku'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      reason: formData.get('reason'),
      amount: permType === 'loan' ? parseFloat(formData.get('amount') || 0) : null,
      material_items: permType === 'material_request' ? [] : null,
      status: 'pending',
      branch_id: activeBranch?.id,
      submitted_at: new Date().toISOString(),
      required_approvals: 2,
      current_step: 1,
      approval_steps: [],
    });
  };

  const handleExportPDF = (perm) => {
    const doc = new jsPDF({ align: 'right' });
    doc.setFont('Tajawal');
    
    doc.setFontSize(18);
    doc.text(L('طلب إذن', 'داواکاری مۆڵەت'), 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`${L('الموظف:', 'کارمەند:')} ${perm.employee_name}`, 20, 40);
    doc.text(`${L('النوع:', 'جۆر:')} ${perm.permission_type}`, 20, 50);
    doc.text(`${L('العنوان:', 'ناونیشان:')} ${perm.title}`, 20, 60);
    doc.text(`${L('من:', 'لە:')} ${perm.start_date}`, 20, 70);
    doc.text(`${L('إلى:', 'بۆ:')} ${perm.end_date || L('غير محدد', 'دیارینەکراو')}`, 20, 80);
    doc.text(`${L('الحالة:', 'دۆخ:')} ${perm.status}`, 20, 90);
    
    doc.save(`permission_${perm.id}.pdf`);
    toast.success(L('تم تحميل PDF', 'PDF داگیرا'));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'in_review': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'delay': return '⏰';
      case 'absence': return '📅';
      case 'loan': return '💰';
      case 'material_request': return '📦';
      default: return '📄';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">
            {typeFilter === 'loans' && L('القروض', 'قەرزەکان')}
            {typeFilter === 'products' && L('طلبات المنتجات', 'داواکاری بەرهەمەکان')}
            {typeFilter === 'permissions' && L('الأذونات', 'مۆڵەتەکان')}
            {!typeFilter && L('الأذونات والطلبات', 'مۆڵەتەکان و داواکارییەکان')}
          </h1>
          <p className="text-sm text-gray-500">
            {typeFilter === 'loans' && L('إدارة طلبات القروض', 'بەڕێوەبردنی داواکارییەکانی قەرز')}
            {typeFilter === 'products' && L('إدارة طلبات شراء المنتجات', 'بەڕێوەبردنی داواکارییەکانی کڕینی بەرهەم')}
            {typeFilter === 'permissions' && L('إدارة الأذونات والغيابات', 'بەڕێوەبردنی مۆڵەتەکان و ئامادەنەبوون')}
            {!typeFilter && L('إدارة طلبات الإجازات، القروض، والمواد', 'بەڕێوەبردنی داواکارییەکانی پشو، قەرز، و کەلوپەلەکان')}
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); setEditingPerm(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
              <Plus className="w-4 h-4" />
              {L('طلب جديد', 'داواکاری نوێ')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPerm ? L('تعديل الطلب', 'دەستکاریکردنی داواکاری') : L('طلب جديد', 'داواکاری نوێ')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="text-sm font-medium text-gray-700">{L('نوع الطلب', 'جۆری داواکاری')}</label>
                  <select name="permission_type" required className="w-full border border-gray-200 rounded-lg px-3 py-2" disabled={!!typeFilter}>
                    {(!typeFilter || typeFilter === 'permissions') && (
                      <>
                        <option value="delay">{L('تأخير', 'دواکەوتن')}</option>
                        <option value="absence">{L('غياب', 'ئامادەنەبوون')}</option>
                      </>
                    )}
                    {(!typeFilter || typeFilter === 'loans') && (
                      <option value="loan">{L('قرض', 'قەرز')}</option>
                    )}
                    {(!typeFilter || typeFilter === 'products') && (
                      <option value="material_request">{L('طلب مواد', 'داواکاری کەلوپەل')}</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('العنوان (عربي)', 'ناونیشان (عەرەبی)')}</label>
                  <Input name="title" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('العنوان (كردي)', 'ناونیشان (کوردی)')}</label>
                  <Input name="title_ku" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('من تاريخ', 'لە بەرواری')}</label>
                  <Input type="date" name="start_date" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('إلى تاريخ', 'بۆ بەرواری')}</label>
                  <Input type="date" name="end_date" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{L('السبب', 'هۆکار')}</label>
                <Textarea name="reason" required rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{L('المبلغ (للقروض)', 'بڕ (بۆ قەرز)')}</label>
                <Input type="number" name="amount" step="0.01" />
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder={L('بحث عن طلب...', 'گەڕان بەدوای داواکاری...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Permissions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPerms.map(perm => (
          <Card key={perm.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(perm.permission_type)}</span>
                  <div>
                    <CardTitle className="text-base">{perm.title}</CardTitle>
                    <p className="text-xs text-gray-500">{perm.employee_name}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(perm.status)}>{perm.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{perm.start_date} {perm.end_date ? `- ${perm.end_date}` : ''}</span>
              </div>
              {perm.permission_type === 'loan' && perm.amount && (
                <p className="text-sm font-bold text-green-600">{L('المبلغ:', 'بڕ:')} {perm.amount.toLocaleString()} د.ع</p>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPerm(perm)} className="flex-1">
                  <MessageSquare className="w-3 h-3" />
                  {L('التعليقات', 'سەرنجەکان')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPDF(perm)}>
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPerms.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{L('لا توجد طلبات', 'هیچ داواکارییەک نییە')}</p>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deletePerm} onOpenChange={() => setDeletePerm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L('تأكيد الحذف', 'دڵنیاییکردنەوەی سڕینەوە')}</AlertDialogTitle>
            <AlertDialogDescription>
              {L('هل أنت متأكد من حذف هذا الطلب؟', 'دڵنیایت لە سڕینەوەی ئەم داواکارییە؟')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deletePerm.id)} className="bg-red-500 hover:bg-red-600">
              {L('حذف', 'سڕینەوە')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}