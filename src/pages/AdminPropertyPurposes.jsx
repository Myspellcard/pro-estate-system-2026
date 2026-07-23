import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Pencil, Trash2, Target, X, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function AdminPropertyPurposes() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const t = {
    title: L('مەبەستەکان', 'مەبەستەکان'),
    subtitle: L('إدارة مەبەست العقارات', 'بەڕێوەبردنی مەبەستی خانووبەرە'),
    add: L('إضافة مەبەست', 'زیادکردنی مەبەست'),
    edit: L('تعديل المەبەست', 'دەستکاریکردنی مەبەست'),
    delete: L('حذف المەبەست', 'سڕینەوەی مەبەست'),
    deleteConfirm: L('هل أنت متأكد من حذف هذا المەبەست؟', 'دڵنیایت لە سڕینەوەی ئەم مەبەستە؟'),
    none: L('لا توجد مەبەست', 'هیچ مەبەستێک نییە'),
    addFirst: L('أضف مەبەستك الأول', 'یەکەم مەبەستت زیادکرد'),
    name: L('الاسم (عربي)', 'ناو (عەرەبی)'),
    nameKu: L('الاسم (كردي)', 'ناو (کوردی)'),
    color: L('اللون', 'ڕەنگ'),
    order: L('الترتيب', 'ڕیزبەندی'),
    save: L('حفظ', 'پاشەکەوتکردن'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    deleteBtn: L('حذف', 'سڕینەوە'),
  };

  const { data: allPurposes = [], isLoading } = useQuery({
    queryKey: ['property-purposes'],
    queryFn: () => firebaseApi.entities.PropertyPurpose.list('-order'),
  });

  const purposes = allPurposes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.PropertyPurpose.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['property-purposes'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.PropertyPurpose.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['property-purposes'] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.PropertyPurpose.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['property-purposes'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (updates) => firebaseApi.entities.PropertyPurpose.bulkUpdate(updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['property-purposes'] }),
  });

  const move = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= purposes.length) return;
    const reordered = purposes.slice();
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const updates = reordered.map((p, i) => ({ id: p.id, order: i }));
    reorderMutation.mutate(updates);
  };

  const handleSubmit = (data) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate({ ...data, is_active: true });
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actionLabel={t.add}
        onAction={() => { setEditing(null); setShowForm(true); }}
      />

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">{editing ? t.edit : t.add}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit({
            name: e.target.name.value,
            name_ku: e.target.name_ku.value,
            color: e.target.color.value,
            order: Number(e.target.order.value) || 0,
          }); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.name} *</Label>
                <Input name="name" defaultValue={editing?.name} required placeholder={L('مثال: سكني', 'نموونە: نیشتەجێ')} />
              </div>
              <div className="space-y-2">
                <Label>{t.nameKu}</Label>
                <Input name="name_ku" defaultValue={editing?.name_ku} placeholder={L('نموونە: نیشتەجێ', 'نموونە: نیشتەجێ')} />
              </div>
              <div className="space-y-2">
                <Label>{t.color}</Label>
                <Input name="color" type="color" defaultValue={editing?.color || '#6366f1'} className="w-full h-10" />
              </div>
              <div className="space-y-2">
                <Label>{t.order}</Label>
                <Input name="order" type="number" defaultValue={editing?.order || 0} />
              </div>
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

      {purposes.length === 0 && !showForm ? (
        <EmptyState icon={Target} title={t.none} description={t.addFirst} actionLabel={t.add} onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {purposes.map((p, index) => (
            <div key={p.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all p-4">
              <div className="mb-3 w-full">
                <Badge style={{ backgroundColor: p.color || '#6366f1', color: '#fff' }} className="w-full justify-center text-sm px-3 py-1.5">
                  {L(p.name, p.name_ku || p.name)}
                </Badge>
              </div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => move(index, -1)} disabled={index === 0 || reorderMutation.isPending} title={L('تحريك لأعلى', 'بەرەو سەر')}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => move(index, 1)} disabled={index === purposes.length - 1 || reorderMutation.isPending} title={L('تحريك لأسفل', 'بەرەو خوار')}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditing(p); setShowForm(true); }}>
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
                      <AlertDialogTitle>{t.delete}</AlertDialogTitle>
                      <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} className="bg-destructive text-destructive-foreground">{t.deleteBtn}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}