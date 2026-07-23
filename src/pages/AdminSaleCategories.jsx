import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Pencil, Trash2, Layers, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminSaleCategories() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();

  const t = {
    categories: L('تصنيفات المبيعات', 'پۆلەکانی فرۆشتن'),
    manageCategories: L('إدارة تصنيفات العقارات للمبيعات', 'بەڕێوەبردنی پۆلەکانی خانووبەر بۆ فرۆشتن'),
    addCategory: L('إضافة تصنيف', 'زیادکردنی پۆل'),
    editCategory: L('تعديل التصنيف', 'دەستکاریکردنی پۆل'),
    deleteCategory: L('حذف التصنيف', 'سڕینەوەی پۆل'),
    deleteConfirm: L('هل أنت متأكد من حذف هذا التصنيف؟', 'دڵنیایت لە سڕینەوەی ئەم پۆلە؟'),
    noCategories: L('لا توجد تصنيفات', 'هیچ پۆلێک نییە'),
    addFirstCategory: L('أضف تصنيفك الأول', 'یەکەم پۆڵت زیادکرد'),
    name: L('اسم التصنيف', 'ناوی پۆل'),
    nameKu: L('اسم التصنيف (كردي)', 'ناوی پۆل (کوردی)'),
    description: L('الوصف', 'وەسف'),
    descriptionKu: L('الوصف (كردي)', 'وەسف (کوردی)'),
    project: L('المشروع', 'پڕۆژە'),
    color: L('اللون', 'رەنگ'),
    order: L('الترتيب', 'ڕیزبەندی'),
    save: L('حفظ', 'پاشەکەوتکردن'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    delete: L('حذف', 'سڕینەوە'),
    active: L('نشط', 'چالاک'),
    inactive: L('غير نشط', 'ناچالاک'),
  };

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => firebaseApi.entities.Project.filter({ is_active: true }),
  });
  const projects = allProjects.filter(p => !p.usage_type || p.usage_type === 'sale' || p.usage_type === 'both');

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['sale-project-categories'],
    queryFn: () => firebaseApi.entities.ProjectCategory.list('-order'),
  });

  const categories = (activeBranch
    ? allCategories.filter(c => c.branch_id === activeBranch.id)
    : allCategories).filter(c => c.usage_type === 'sale' || c.usage_type === 'both');

  const filteredCategories = selectedProject
    ? categories.filter(c => c.project_id === selectedProject)
    : categories;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sale-project-categories'] });
    queryClient.invalidateQueries({ queryKey: ['project-categories'] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.ProjectCategory.create(data),
    onSuccess: () => { invalidateAll(); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.ProjectCategory.update(id, data),
    onSuccess: () => { invalidateAll(); setShowForm(false); setEditingCategory(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.ProjectCategory.delete(id),
    onSuccess: () => invalidateAll(),
  });

  const handleSubmit = (data) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: { ...data, usage_type: 'sale' } });
    } else {
      createMutation.mutate({ ...data, branch_id: activeBranch?.id || '', is_active: true, order: 0, usage_type: 'sale' });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({
      name: e.target.name.value,
      name_ku: e.target.name_ku.value,
      description: e.target.description.value,
      description_ku: e.target.description_ku.value,
      project_id: formProjectId,
      color: e.target.color.value,
      order: parseInt(e.target.order.value) || 0,
      usage_type: 'sale',
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title={t.categories}
        subtitle={t.manageCategories}
        actionLabel={t.addCategory}
        onAction={() => { setEditingCategory(null); setFormProjectId(''); setShowForm(true); }}
      />

      {/* Project Filter */}
      <div className="mb-6">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder={L('كل المشاريع', 'هەموو پڕۆژەکان')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>{L('كل المشاريع', 'هەموو پڕۆژەکان')}</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{L(p.name, p.name_ku)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">{editingCategory ? t.editCategory : t.addCategory}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.name} *</Label>
              <Input name="name" defaultValue={editingCategory?.name} required placeholder={L('مثال: شقق فاخرة', 'نموونە: شوقای لۆکس')} />
            </div>
            <div className="space-y-2">
              <Label>{t.nameKu}</Label>
              <Input name="name_ku" defaultValue={editingCategory?.name_ku} placeholder={L('نموونە: شوقای لۆکس', 'نموونە: شوقای لۆکس')} />
            </div>
            <div className="space-y-2">
              <Label>{t.project} *</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={L('اختر المشروع', 'پڕۆژە هەڵبژێرە')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{L(p.name, p.name_ku)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.color}</Label>
              <Input name="color" type="color" defaultValue={editingCategory?.color || '#3b82f6'} />
            </div>
            <div className="space-y-2">
              <Label>{t.order}</Label>
              <Input name="order" type="number" defaultValue={editingCategory?.order || 0} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.description}</Label>
              <Textarea name="description" defaultValue={editingCategory?.description} rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.descriptionKu}</Label>
              <Textarea name="description_ku" defaultValue={editingCategory?.description_ku} rows={2} />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t.cancel}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : t.save}
              </Button>
            </div>
          </form>
        </div>
      )}

      {filteredCategories.length === 0 && !showForm ? (
        <EmptyState icon={Layers} title={t.noCategories} description={t.addFirstCategory} actionLabel={t.addCategory} onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCategories.map(category => (
            <div key={category.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all overflow-hidden">
              <div className="h-3 flex" style={{ backgroundColor: category.color || '#3b82f6' }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg">{L(category.name, category.name_ku)}</h3>
                  <Badge className={category.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}>
                    {category.is_active ? t.active : t.inactive}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{L(category.description, category.description_ku)}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{L(projects.find(p => p.id === category.project_id)?.name || '', projects.find(p => p.id === category.project_id)?.name_ku || '')}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => { setEditingCategory(category); setFormProjectId(category.project_id || ''); setShowForm(true); }}>
                    <Pencil className="w-3.5 h-3.5" /> {L('تعديل', 'دەستکاری')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteCategory}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(category.id)} className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}