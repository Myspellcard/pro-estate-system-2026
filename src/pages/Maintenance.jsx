import React, { useState } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle2, AlertCircle, Clock, Wrench } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MaintenanceForm from '@/components/maintenance/MaintenanceForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusConfig = {
  'معلق': { icon: Clock, color: 'bg-amber-100 text-amber-800', label: 'معلق' },
  'قيد التنفيذ': { icon: Wrench, color: 'bg-blue-100 text-blue-800', label: 'قيد التنفيذ' },
  'مكتمل': { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800', label: 'مكتمل' },
  'ملغي': { icon: AlertCircle, color: 'bg-red-100 text-red-800', label: 'ملغي' },
};

const priorityConfig = {
  'عالي': 'bg-red-100 text-red-800',
  'متوسط': 'bg-amber-100 text-amber-800',
  'منخفض': 'bg-blue-100 text-blue-800',
};

export default function MaintenancePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [filter, setFilter] = useState('معلق');
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { can } = useUserPermissions();
  
  const t = {
    edit: L('تعديل', 'دەستکاریکردن'),
    delete: L('حذف', 'سڕینەوە'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    deleteRequest: L('حذف طلب الصيانة', 'سڕینەوەی داواکاری چاککردنەوە'),
    deleteConfirm: L('هل أنت متأكد من حذف هذا الطلب؟', 'دڵنیایی لە سڕینەوەی ئەم داواکارییە؟'),
  };

  const { data: maintenance = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => firebaseApi.entities.Maintenance.list(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => firebaseApi.entities.Property.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Maintenance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setShowForm(false);
      setEditingMaintenance(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Maintenance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setShowForm(false);
      setEditingMaintenance(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Maintenance.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] }),
  });

  const filteredMaintenance = filter === 'الكل' || filter === 'هەمووی'
    ? maintenance 
    : maintenance.filter(m => m.status === filter);

  const handleSubmit = (data) => {
    if (editingMaintenance) {
      updateMutation.mutate({ id: editingMaintenance.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const statusIcons = {
    'معلق': <Clock className="w-4 h-4" />,
    'قيد التنفيذ': <Wrench className="w-4 h-4" />,
    'مكتمل': <CheckCircle2 className="w-4 h-4" />,
    'ملغي': <AlertCircle className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={L('إدارة الصيانة', 'بەڕێوەبردنی چاککردنەوە')} 
        subtitle={L('تتبع طلبات الصيانة والإصلاحات', 'شوێنکەوتنی داواکارییەکانی چاککردنەوە')}
        actionLabel={can('can_edit_maintenance') ? L('طلب صيانة جديد', 'داواکاری چاککردنەوەی نوێ') : undefined}
        onAction={can('can_edit_maintenance') ? () => { setEditingMaintenance(null); setShowForm(true); } : undefined}
      />

      {showForm && (
        <MaintenanceForm
          maintenance={editingMaintenance}
          properties={properties}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['الكل', 'معلق', 'قيد التنفيذ', 'مكتمل', 'ملغي'].map(statusAr => {
          const statusKu = { 'الكل': 'هەمووی', 'معلق': 'مەوقوف', 'قيد التنفيذ': 'لە ژێر جێبەجێکردندا', 'مكتمل': 'تەواوبوو', 'ملغي': 'هەڵوەشێنراوەتەوە' }[statusAr];
          const status = lang === 'ku' ? statusKu : statusAr;
          return (
          <button
            key={statusAr}
            onClick={() => setFilter(statusAr)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === statusAr
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {status}
          </button>
        );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredMaintenance.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={L('لا توجد طلبات صيانة', 'هیچ داواکارییەکی چاککردنەوە نییە')}
          description={L('ابدأ بإضافة طلب صيانة جديد', 'دەست بکە بە زیادکردنی داواکاری چاککردنەوەی نوێ')}
          actionLabel={L('طلب صيانة جديد', 'داواکاری چاککردنەوەی نوێ')}
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid gap-4">
          {filteredMaintenance.map(item => {
            const Config = statusConfig[item.status];
            const Icon = Config?.icon || Clock;
            return (
              <div key={item.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-5 h-5 ${Config?.color.split(' ')[1]}`} />
                      <h3 className="font-bold text-lg">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={priorityConfig[item.priority]}>{item.priority}</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge className={Config?.color}>{item.status}</Badge>
                      <Badge variant="outline">{item.property_name}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    {item.cost && <p className="text-lg font-bold text-secondary">{item.cost?.toLocaleString()} د.ع</p>}
                    <p className="text-xs text-muted-foreground">{item.request_date && format(parseISO(item.request_date), 'dd/MM/yyyy')}</p>
                    <div className="flex gap-2">
                      {can('can_edit_maintenance') && (
                        <Button size="sm" variant="outline" onClick={() => { setEditingMaintenance(item); setShowForm(true); }}>
                          {t.edit}
                        </Button>
                      )}
                      {can('can_delete_maintenance') && <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>{t.deleteRequest}</AlertDialogTitle>
                          <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                          <div className="flex gap-3 justify-end">
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)} className="bg-destructive">{t.delete}</AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}