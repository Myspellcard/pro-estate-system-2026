import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { firebaseApi } from '@/api/firebaseClient';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Users, Phone, Mail, CreditCard, Pencil, Trash2, Download, MessageCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { generateTenantsPDF } from '@/utils/pdfExport';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import TenantForm from '@/components/tenants/TenantForm';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function Tenants() {
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { can } = useUserPermissions();
  
  const t = {
    tenants: L('المستأجرون', 'کرێچییەکان'),
    manageTenants: L('إدارة بيانات المستأجرين', 'بەڕێوەبردنی زانیاری کرێچییەکان'),
    downloadPDF: L('تحميل PDF', 'داگرتنی PDF'),
    addTenant: L('إضافة مستأجر', 'زیادکردنی کرێچی'),
    noTenants: L('لا يوجد مستأجرون', 'کرێچی نییە'),
    addFirstTenant: L('أضف أول مستأجر لبدء إنشاء العقود', 'یەکەم کرێچی زیاد بکە بۆ دەستپێکردنی دروستکردنی گرێبەست'),
    edit: L('تعديل', 'دەستکاری'),
    deleteTenant: L('حذف المستأجر', 'سڕینەوەی کرێچی'),
    confirmDelete: L('هل أنت متأكد من حذف هذا المستأجر؟', 'دڵنیای لە سڕینەوەی ئەم کرێچیە؟'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    delete: L('حذف', 'سڕینەوە'),
  };

  const { data: allTenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => firebaseApi.entities.Tenant.list('-created_date'),
  });

  const tenants = allTenants;

  const filteredTenants = search.trim()
    ? tenants.filter(t => {
        const q = search.trim().toLowerCase();
        const name = (lang === 'ku' ? (t.full_name_ku || t.full_name) : t.full_name) || '';
        return name.toLowerCase().includes(q) ||
          (t.phone || '').toLowerCase().includes(q) ||
          (t.id_number || '').toLowerCase().includes(q) ||
          (t.email || '').toLowerCase().includes(q);
      })
    : tenants;

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Tenant.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenants'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Tenant.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenants'] }); setShowForm(false); setEditingTenant(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Tenant.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const handleSubmit = (data) => {
    if (editingTenant && data.phone !== editingTenant.phone) {
      setPendingUpdate({ id: editingTenant.id, data });
      setShowUpdateDialog(true);
    } else if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data });
    } else {
      createMutation.mutate({ ...data, branch_id: activeBranch?.id || '' });
    }
  };

  const handleUpdatePhone = (updateContracts) => {
    if (updateContracts) {
      firebaseApi.functions.invoke('updateTenantPhoneInContracts', { tenantId: pendingUpdate.id, newPhone: pendingUpdate.data.phone });
    }
    updateMutation.mutate({ id: pendingUpdate.id, data: pendingUpdate.data });
    setShowUpdateDialog(false);
    setPendingUpdate(null);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.tenants}</h1>
          <p className="text-sm text-muted-foreground">{t.manageTenants}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => generateTenantsPDF(tenants)}>
            <Download className="w-4 h-4" /> {t.downloadPDF}
          </Button>
          {can('can_edit_tenants') && (
            <Button size="sm" className="gap-1" onClick={() => { setEditingTenant(null); setShowForm(true); }}>
              + {t.addTenant}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={L('بحث عن مستأجر بالاسم أو الهاتف أو الرقم الوطني...', 'گەڕان بۆ کرێچی بە ناو، تەلەفون یان ژمارەی نیشتمانی...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {showForm && (
        <TenantForm
          tenant={editingTenant}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingTenant(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {showUpdateDialog && (
        <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{L('تحديث رقم الهاتف', 'نوێکردنەوەی ژمارەی تەلەفون')}</AlertDialogTitle>
              <AlertDialogDescription>
                {L('هل تريد تحديث رقم الهاتف في العقود السابقة أيضاً؟', 'دەتەوێت ژمارەی تەلەفون لە گرێبەستە پێشووەکانیش نوێ بکەیتەوە؟')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => { setShowUpdateDialog(false); setPendingUpdate(null); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUpdatePhone(false)}>{L('تحديث المستأجر فقط', 'تەنها کرێچی نوێ بکەرەوە')}</AlertDialogAction>
              <AlertDialogAction onClick={() => handleUpdatePhone(true)} className="bg-primary">{L('تحديث المستأجر والعقود', 'نوێکردنەوەی کرێچی و گرێبەستەکان')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {tenants.length === 0 && !showForm ? (
        <EmptyState icon={Users} title={t.noTenants} description={t.addFirstTenant} actionLabel={t.addTenant} onAction={() => setShowForm(true)} />
      ) : filteredTenants.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">{L('لا توجد نتائج مطابقة للبحث', 'هیچ ئەنجامێکی هاوتا نییە')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTenants.map(tenant => (
            <div key={tenant.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                   <span className="text-lg font-bold text-primary">{(lang === 'ku' ? (tenant.full_name_ku || tenant.full_name) : tenant.full_name)?.[0]}</span>
                  </div>
                  <div>
                   <h3 className="font-bold">{lang === 'ku' ? (tenant.full_name_ku || tenant.full_name) : tenant.full_name}</h3>
                    {tenant.id_number && <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" />{tenant.id_number}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                {tenant.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{tenant.phone}</span>
                    {can('can_call_tenants') && (
                      <a href={`tel:${tenant.phone}`} className="w-7 h-7 rounded-full border border-blue-200 bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors" title={L('اتصال', 'پەیوەندی')}>
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                      </a>
                    )}
                    {can('can_whatsapp_tenants') && (
                      <a href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full border border-green-200 bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors" title="WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                      </a>
                    )}
                  </div>
                )}
                {tenant.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{tenant.email}</p>}
              </div>
              <div className="flex gap-2">
                {can('can_edit_tenants') && (
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => { setEditingTenant(tenant); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" /> {t.edit}
                  </Button>
                )}
                {can('can_delete_tenants') && <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.deleteTenant}</AlertDialogTitle>
                      <AlertDialogDescription>{t.confirmDelete}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(tenant.id)} className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}