import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Palette, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const defaultStatuses = [
  { ar: 'متاح', ku: 'بەردەست', rule_ar: 'يظهر في البحث والعرض', rule_ku: 'لە گەڕان و پیشانداندا دەردەکەوێت' },
  { ar: 'مؤجر', ku: 'کرێدراو', rule_ar: 'مخفي في العرض والبحث', rule_ku: 'لە پیشاندان و گەڕاندا شاراوەیە' },
  { ar: 'صيانة', ku: 'چاککردنەوە', rule_ar: 'يظهر مع علامة صيانة', rule_ku: 'لەگەڵ نیشانی چاککردنەوە دەردەکەوێت' },
  { ar: 'حجز مؤقت', ku: 'گرتنی کاتی', rule_ar: 'يظهر كحجز مؤقت', rule_ku: 'وەک گرتنێکی کاتی دەردەکەوێت' },
  { ar: 'قريباً', ku: 'بەزووی', rule_ar: 'يظهر كعقار قريب', rule_ku: 'وەک خانووبەرێکی نزیک دەردەکەوێت' },
  { ar: 'حجز', ku: 'گرتن', rule_ar: 'يظهر كحجز', rule_ku: 'وەک گرتن دەردەکەوێت' },
  { ar: 'تأمين', ku: 'دڵنیایی', rule_ar: 'يظهر كعقار مؤمن', rule_ku: 'وەک خانووبەرێکی دڵنیاییکراو دەردەکەوێت' },
  { ar: 'دفع', ku: 'پارەدان', rule_ar: 'يظهر كعقار مدفوع', rule_ku: 'وەک خانووبەرێکی پارەدراو دەردەکەوێت' },
  { ar: 'انذار الأخير', ku: 'ئاگادارکردنەوەی کۆتا', rule_ar: 'يظهر مع تحذير', rule_ku: 'لەگەڵ ئاگادارکردنەوە دەردەکەوێت' },
];

export default function AdminPropertyStatusColors() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const queryClient = useQueryClient();
  const [editingStatus, setEditingStatus] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: statusColors, isLoading } = useQuery({
    queryKey: ['property-status-colors'],
    queryFn: () => firebaseApi.entities.PropertyStatusColor.list(),
  });

  const createStatusColorMutation = useMutation({
    mutationFn: async (data) => {
      await firebaseApi.entities.PropertyStatusColor.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-status-colors'] });
      toast.success(L('تم إضافة اللون بنجاح', 'رەنگ بە سەرکەوتوویی زیادکرا'));
      setIsDialogOpen(false);
    },
  });

  const updateStatusColorMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await firebaseApi.entities.PropertyStatusColor.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-status-colors'] });
      toast.success(L('تم تحديث اللون بنجاح', 'رەنگ بە سەرکەوتوویی نوێکرایەوە'));
      setEditingStatus(null);
      setIsDialogOpen(false);
    },
  });

  const deleteStatusColorMutation = useMutation({
    mutationFn: async (id) => {
      await firebaseApi.entities.PropertyStatusColor.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-status-colors'] });
      toast.success(L('تم حذف اللون بنجاح', 'رەنگ بە سەرکەوتوویی سڕایەوە'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      status: formData.get('status'),
      status_ku: formData.get('status_ku'),
      bg_color: formData.get('bg_color'),
      text_color: formData.get('text_color'),
      border_color: formData.get('border_color'),
      is_active: true,
    };

    if (editingStatus) {
      updateStatusColorMutation.mutate({ id: editingStatus.id, data });
    } else {
      createStatusColorMutation.mutate(data);
    }
  };

  const handleEdit = (statusColor) => {
    setEditingStatus(statusColor);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingStatus(null);
    setIsDialogOpen(true);
  };

  const addAllDefaultStatusesMutation = useMutation({
    mutationFn: async () => {
      const defaultColors = [
        { status: 'متاح', status_ku: 'بەردەست', bg_color: '#10b981', text_color: '#ffffff', border_color: '#059669' },
        { status: 'مؤجر', status_ku: 'کرێدراو', bg_color: '#3b82f6', text_color: '#ffffff', border_color: '#2563eb' },
        { status: 'صيانة', status_ku: 'چاککردنەوە', bg_color: '#f59e0b', text_color: '#ffffff', border_color: '#d97706' },
        { status: 'حجز مؤقت', status_ku: 'گرتنی کاتی', bg_color: '#8b5cf6', text_color: '#ffffff', border_color: '#7c3aed' },
        { status: 'قريباً', status_ku: 'بەزووی', bg_color: '#6b7280', text_color: '#ffffff', border_color: '#4b5563' },
        { status: 'حجز', status_ku: 'گرتن', bg_color: '#ec4899', text_color: '#ffffff', border_color: '#db2777' },
        { status: 'تأمين', status_ku: 'دڵنیایی', bg_color: '#f97316', text_color: '#ffffff', border_color: '#ea580c' },
        { status: 'دفع', status_ku: 'پارەدان', bg_color: '#84cc16', text_color: '#ffffff', border_color: '#65a30d' },
        { status: 'انذار الأخير', status_ku: 'ئاگادارکردنەوەی کۆتا', bg_color: '#ef4444', text_color: '#ffffff', border_color: '#dc2626' },
      ];
      await Promise.all(
        defaultColors.map(color => 
          firebaseApi.entities.PropertyStatusColor.create({
            ...color,
            is_active: true,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-status-colors'] });
      toast.success(L('تم إضافة جميع الحالات الافتراضية', 'هەموو دۆخە بنەڕەتییەکان زیادکران'));
    },
  });

  const handleAddAllDefaults = () => {
    addAllDefaultStatusesMutation.mutate();
  };

  const getStatusColor = (status) => {
    const statusColor = statusColors?.find(s => s.status === status);
    if (statusColor) {
      return {
        backgroundColor: statusColor.bg_color,
        color: statusColor.text_color,
        borderColor: statusColor.border_color,
      };
    }
    return {};
  };

  return (
    <div className="p-6">
      <PageHeader
        title={L('ألوان حالات العقار', 'رەنگەکانی دۆخی خانووبەر')}
        subtitle={L('تخصيص ألوان الحالات المختلفة للعقارات', 'رەنگە جیاوازەکانی دۆخی خانووبەر دیاریبکە')}
        actionLabel={statusColors?.length === 0 ? L('إضافة جميع الحالات', 'زیادکردنی هەموو دۆخەکان') : L('إضافة حالة جديدة', 'دۆخی نوێ زیادبکە')}
        onAction={statusColors?.length === 0 ? handleAddAllDefaults : handleAddNew}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? L('تعديل لون الحالة', 'دەستکاریکردنی رەنگی دۆخ') : L('إضافة حالة جديدة', 'زیادکردنی دۆخی نوێ')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{L('اسم الحالة (عربي)', 'ناوی دۆخ (عەرەبی)')}</Label>
              <Input
                name="status"
                defaultValue={editingStatus?.status}
                required
                placeholder="متاح"
              />
            </div>
            <div>
              <Label>{L('اسم الحالة (كردي)', 'ناوی دۆخ (کوردی)')}</Label>
              <Input
                name="status_ku"
                defaultValue={editingStatus?.status_ku}
                required
                placeholder="بەردەست"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{L('لون الخلفية', 'رەنگی پاشبنەما')}</Label>
                <div className="flex gap-2">
                  <Input
                    name="bg_color"
                    type="color"
                    defaultValue={editingStatus?.bg_color || '#f5f5f5'}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    defaultValue={editingStatus?.bg_color || '#f5f5f5'}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>{L('لون النص', 'رەنگی دەق')}</Label>
                <div className="flex gap-2">
                  <Input
                    name="text_color"
                    type="color"
                    defaultValue={editingStatus?.text_color || '#333333'}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    defaultValue={editingStatus?.text_color || '#333333'}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>{L('لون الحدود', 'رەنگی سنوور')}</Label>
                <div className="flex gap-2">
                  <Input
                    name="border_color"
                    type="color"
                    defaultValue={editingStatus?.border_color || '#e0e0e0'}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    defaultValue={editingStatus?.border_color || '#e0e0e0'}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </Button>
              <Button type="submit" disabled={createStatusColorMutation.isPending || updateStatusColorMutation.isPending}>
                {editingStatus ? L('تحديث', 'نوێکردنەوە') : L('إضافة', 'زیادکردن')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      ) : statusColors?.length === 0 ? (
        <EmptyState
          icon={Palette}
          title={L('لا توجد ألوان مخصصة', 'هیچ رەنگێکی تایبەت نییە')}
          description={L('أضف ألوانًا مخصصة لحالات العقار المختلفة', 'رەنگی تایبەت بۆ دۆخە جیاوازەکانی خانووبەر زیادبکە')}
          actionLabel={L('إضافة حالة جديدة', 'زیادکردنی دۆخی نوێ')}
          onAction={handleAddNew}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statusColors?.map((statusColor) => (
            <Card key={statusColor.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {L(statusColor.status, statusColor.status_ku)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    style={{
                      backgroundColor: statusColor.bg_color,
                      color: statusColor.text_color,
                      borderColor: statusColor.border_color,
                    }}
                    className="border px-3 py-1"
                  >
                    {L(statusColor.status, statusColor.status_ku)}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(statusColor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteStatusColorMutation.mutate(statusColor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: statusColor.bg_color }}
                      />
                      <span className="text-muted-foreground">BG</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: statusColor.text_color }}
                      />
                      <span className="text-muted-foreground">TXT</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: statusColor.border_color }}
                      />
                      <span className="text-muted-foreground">BRD</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                      {L('قاعدة الحالة:', 'یاسای دۆخ:')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {L(
                        defaultStatuses.find(s => s.ar === statusColor.status)?.rule_ar || '',
                        defaultStatuses.find(s => s.ar === statusColor.status)?.rule_ku || ''
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">{L('الحالات الافتراضية', 'دۆخە بنەڕەتییەکان')}</h3>
          {statusColors?.length === 0 && (
            <Button
              size="sm"
              onClick={handleAddAllDefaults}
              disabled={addAllDefaultStatusesMutation.isPending}
              className="gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {L('إضافة جميع الألوان', 'زیادکردنی هەموو ڕەنگەکان')}
            </Button>
          )}
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {defaultStatuses.map((s) => {
            const existingColor = statusColors?.find(sc => sc.status === s.ar);
            const colorStyle = existingColor ? {
              backgroundColor: existingColor.bg_color,
              color: existingColor.text_color,
              borderColor: existingColor.border_color,
            } : {};
            return (
              <div key={s.ar} className="flex items-center gap-2">
                <Badge
                  className="flex-1 justify-center border px-3 py-2"
                  style={colorStyle}
                >
                  {L(s.ar, s.ku)}
                </Badge>
                {!existingColor && (
                  <Badge variant="secondary" className="text-xs">
                    {L('غير مضبوط', 'دیارینەکراو')}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}