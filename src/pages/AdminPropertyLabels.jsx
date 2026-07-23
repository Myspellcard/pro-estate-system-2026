import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Pencil, Trash2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function AdminPropertyLabels() {
  const [showForm, setShowForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();

  const t = {
    labels: L('التسميات', 'برچەسبەکان'),
    manageLabels: L('إدارة تسميات العقارات', 'بەڕێوەبردنی برچەسبەکانی خانووبەرە'),
    addLabel: L('إضافة تسمية', 'زیادکردنی برچەسب'),
    editLabel: L('تعديل التسمية', 'دەستکاریکردنی برچەسب'),
    deleteLabel: L('حذف التسمية', 'سڕینەوەی برچەسب'),
    deleteConfirm: L('هل أنت متأكد من حذف هذه التسمية؟', 'دڵنیایت لە سڕینەوەی ئەم برچەسبە؟'),
    noLabels: L('لا توجد تسميات', 'هیچ برچەسبێک نییە'),
    addFirstLabel: L('أضف تسميتك الأولى', 'یەکەم برچەسبت زیادکرد'),
    name: L('اسم التسمية', 'ناوی برچەسب'),
    nameKu: L('اسم التسمية (كردي)', 'ناوی برچەسب (کوردی)'),
    color: L('اللون', 'ڕەنگ'),
    description: L('الوصف', 'وەسف'),
    descriptionKu: L('الوصف (كردي)', 'وەسف (کوردی)'),
    detailedDescription: L('الوصف التفصيلي', 'وەسفی ورد'),
    detailedDescriptionKu: L('الوصف التفصيلي (كردي)', 'وەسفی ورد (کوردی)'),
    usageGuidelines: L('إرشادات الاستخدام', 'ڕێنماییەکانی بەکارهێنان'),
    usageGuidelinesKu: L('إرشادات الاستخدام (كردي)', 'ڕێنماییەکانی بەکارهێنان (کوردی)'),
    save: L('حفظ', 'پاشەکەوتکردن'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    delete: L('حذف', 'سڕینەوە'),
  };

  const { data: allLabels = [], isLoading } = useQuery({
    queryKey: ['property-labels'],
    queryFn: () => firebaseApi.entities.PropertyLabel.list('-created_date'),
  });

  const labels = activeBranch
    ? allLabels.filter(l => l.branch_id === activeBranch.id)
    : allLabels;

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.PropertyLabel.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['property-labels'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.PropertyLabel.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['property-labels'] }); setShowForm(false); setEditingLabel(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.PropertyLabel.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['property-labels'] }),
  });

  const handleSubmit = (data) => {
    if (editingLabel) {
      updateMutation.mutate({ id: editingLabel.id, data });
    } else {
      createMutation.mutate({ ...data, branch_id: activeBranch?.id || '', is_active: true });
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title={t.labels}
        subtitle={t.manageLabels}
        actionLabel={t.addLabel}
        onAction={() => { setEditingLabel(null); setShowForm(true); }}
      />

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">{editingLabel ? t.editLabel : t.addLabel}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit({
            name: e.target.name.value,
            name_ku: e.target.name_ku.value,
            color: e.target.color.value,
            description: e.target.description.value,
            description_ku: e.target.description_ku.value,
            detailed_description: e.target.detailed_description.value,
            detailed_description_ku: e.target.detailed_description_ku.value,
            usage_guidelines: e.target.usage_guidelines.value,
            usage_guidelines_ku: e.target.usage_guidelines_ku.value,
          }); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.name} *</Label>
                <Input name="name" defaultValue={editingLabel?.name} required placeholder={L('مثال: مميز', 'نموونە: تایبەت')} />
              </div>
              <div className="space-y-2">
                <Label>{t.nameKu}</Label>
                <Input name="name_ku" defaultValue={editingLabel?.name_ku} placeholder={L('نموونە: تایبەت', 'نموونە: تایبەت')} />
              </div>
              <div className="space-y-2">
                <Label>{t.color}</Label>
                <Input name="color" type="color" defaultValue={editingLabel?.color || '#3b82f6'} className="w-full h-10" />
              </div>
              <div className="space-y-2">
                <Label>{t.description}</Label>
                <Input name="description" defaultValue={editingLabel?.description} placeholder={L('وصف مختصر', 'وەسفی کورت')} />
              </div>
              <div className="space-y-2">
                <Label>{t.descriptionKu}</Label>
                <Input name="description_ku" defaultValue={editingLabel?.description_ku} placeholder={L('وەسفی کورت', 'وەسفی کورت')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.detailedDescription}</Label>
              <textarea
                name="detailed_description"
                defaultValue={editingLabel?.detailed_description}
                placeholder={L('وصف موسع ومفصل للتسمية يشمل الحالات التي تُستخدم فيها وأمثلة تطبيقية', 'وەسفی فراوانی وردی برچەسبەکە')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.detailedDescriptionKu}</Label>
              <textarea
                name="detailed_description_ku"
                defaultValue={editingLabel?.detailed_description_ku}
                placeholder={L('وەسفی فراوانی وردی برچەسبەکە', 'وەسفی فراوانی وردی برچەسبەکە')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>{t.usageGuidelines}</Label>
              <textarea
                name="usage_guidelines"
                defaultValue={editingLabel?.usage_guidelines}
                placeholder={L('إرشادات استخدام التسمية ومتى يجب تطبيقها', 'ڕێنماییەکانی بەکارهێنانی برچەسب')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.usageGuidelinesKu}</Label>
              <textarea
                name="usage_guidelines_ku"
                defaultValue={editingLabel?.usage_guidelines_ku}
                placeholder={L('ڕێنماییەکانی بەکارهێنانی برچەسب', 'ڕێنماییەکانی بەکارهێنانی برچەسب')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t.cancel}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : t.save}
              </Button>
            </div>
          </form>
        </div>
      )}

      {labels.length === 0 && !showForm ? (
        <EmptyState icon={Tag} title={t.noLabels} description={t.addFirstLabel} actionLabel={t.addLabel} onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {labels.map(label => (
            <div key={label.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all p-5">
              <div className="flex items-center justify-between mb-3">
                <Badge style={{ backgroundColor: label.color, color: '#fff' }} className="text-sm px-3 py-1.5">
                  {L(label.name, label.name_ku)}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingLabel(label); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteLabel}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(label.id)} className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {label.description && (
                <p className="text-sm font-medium text-foreground mb-2">{L(label.description, label.description_ku)}</p>
              )}
              {label.detailed_description && (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-foreground mb-1">{t.detailedDescription}:</p>
                  <p className="text-sm text-muted-foreground">{L(label.detailed_description, label.detailed_description_ku)}</p>
                </div>
              )}
              {label.usage_guidelines && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">{t.usageGuidelines}:</p>
                  <p className="text-sm text-muted-foreground">{L(label.usage_guidelines, label.usage_guidelines_ku)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}