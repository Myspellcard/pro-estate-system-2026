import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Pencil, Trash2, X, Layers, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function CategoryForm({ editingCategory, projects, onSubmit, onCancel, isPending, L, t }) {
  const [formData, setFormData] = useState({
    name: editingCategory?.name || '',
    name_ku: editingCategory?.name_ku || '',
    project_id: editingCategory?.project_id || '',
    description: editingCategory?.description || '',
    description_ku: editingCategory?.description_ku || '',
    color: editingCategory?.color || '#3b82f6',
    order: editingCategory?.order || 0,
    branch_id: editingCategory?.branch_id || '',
  });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>{t.name} *</Label>
        <Input value={formData.name} onChange={e => handleChange('name', e.target.value)} required placeholder={L('مثال: شقق فاخرة', 'نموونە: شوقی لۆکس')} />
      </div>
      <div className="space-y-2">
        <Label>{t.nameKu}</Label>
        <Input value={formData.name_ku} onChange={e => handleChange('name_ku', e.target.value)} placeholder={L('نموونە: شوقی لۆکس', 'نموونە: شوقی لۆکس')} />
      </div>
      <div className="space-y-2">
        <Label>{t.project} *</Label>
        <Select value={formData.project_id} onValueChange={v => handleChange('project_id', v)}>
          <SelectTrigger>
            <SelectValue placeholder={t.selectProject} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>{L('بدون مشروع', 'بێ پڕۆژە')}</SelectItem>
            {projects.filter(p => !p.usage_type || p.usage_type === 'rent' || p.usage_type === 'both').map(p => (
              <SelectItem key={p.id} value={p.id}>{L(p.name, p.name_ku)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t.color}</Label>
        <Input type="color" value={formData.color} onChange={e => handleChange('color', e.target.value)} className="w-full h-10" />
      </div>
      <div className="space-y-2">
        <Label>{t.description}</Label>
        <Input value={formData.description} onChange={e => handleChange('description', e.target.value)} placeholder={L('وصف التصنيف', 'وەسفی پۆل')} />
      </div>
      <div className="space-y-2">
        <Label>{t.description_ku}</Label>
        <Input value={formData.description_ku} onChange={e => handleChange('description_ku', e.target.value)} placeholder={L('وەسفی پۆل', 'وەسفی پۆل')} />
      </div>
      <div className="space-y-2">
        <Label>{t.order}</Label>
        <Input type="number" value={formData.order} onChange={e => handleChange('order', e.target.value)} />
      </div>
      <div className="md:col-span-2 flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>{t.cancel}</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : t.save}
        </Button>
      </div>
    </form>
  );
}

export default function AdminProjectCategories() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const t = {
    categories: L('تصنيفات الإيجار', 'پۆلەکانی کرێ'),
    manageCategories: L('إدارة تصنيفات العقارات للإيجار', 'بەڕێوەبردنی پۆلەکانی خانووبەر بۆ کرێ'),
    addCategory: L('إضافة تصنيف', 'زیادکردنی پۆل'),
    editCategory: L('تعديل التصنيف', 'دەستکاریکردنی پۆل'),
    deleteCategory: L('حذف التصنيف', 'سڕینەوەی پۆل'),
    deleteConfirm: L('هل أنت متأكد من حذف هذا التصنيف؟', 'دڵنیایت لە سڕینەوەی ئەم پۆلە؟'),
    noCategories: L('لا توجد تصنيفات', 'هیچ پۆلێک نییە'),
    addFirstCategory: L('أضف تصنيفك الأول', 'یەکەم پۆلت زیادکرد'),
    name: L('اسم التصنيف', 'ناوی پۆل'),
    nameKu: L('اسم التصنيف (كردي)', 'ناوی پۆل (کوردی)'),
    project: L('المشروع', 'پڕۆژە'),
    color: L('اللون', 'ڕەنگ'),
    description: L('الوصف', 'وەسف'),
    order: L('الترتيب', 'ڕیزبەندی'),
    save: L('حفظ', 'پاشەکەوتکردن'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    delete: L('حذف', 'سڕینەوە'),
    selectProject: L('اختر مشروعاً...', 'پڕۆژەیەک هەڵبژێرە...'),
  };

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => firebaseApi.entities.Project.filter({ is_active: true }),
  });
  const projects = allProjects.filter(p => !p.usage_type || p.usage_type === 'rent' || p.usage_type === 'both');

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ['project-categories'],
    queryFn: () => firebaseApi.entities.ProjectCategory.list('-order'),
  });

  const categories = allCategories.filter(c => c.usage_type === 'rent' || c.usage_type === 'both' || !c.usage_type);

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.ProjectCategory.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project-categories'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.ProjectCategory.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project-categories'] }); setShowForm(false); setEditingCategory(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.ProjectCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-categories'] }),
  });

  const handleSubmit = (data) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: { ...data, usage_type: 'rent' } });
    } else {
      createMutation.mutate({ ...data, is_active: true, usage_type: 'rent' });
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title={t.categories}
        subtitle={t.manageCategories}
        actionLabel={t.addCategory}
        onAction={() => { setEditingCategory(null); setShowForm(true); }}
      />

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">{editingCategory ? t.editCategory : t.addCategory}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <CategoryForm
            editingCategory={editingCategory}
            projects={projects}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isPending={createMutation.isPending || updateMutation.isPending}
            L={L}
            t={t}
          />
        </div>
      )}

      {categories.length === 0 && !showForm ? (
        <EmptyState icon={Layers} title={t.noCategories} description={t.addFirstCategory} actionLabel={t.addCategory} onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {categories.map(cat => {
            const project = projects.find(p => p.id === cat.project_id);
            return (
              <div key={cat.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all p-5">
                <div className="flex items-center justify-between mb-3">
                  <Badge style={{ backgroundColor: cat.color, color: '#fff' }} className="text-sm px-3 py-1.5">
                    {L(cat.name, cat.name_ku)}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingCategory(cat); setShowForm(true); }}>
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
                          <AlertDialogTitle>{t.deleteCategory}</AlertDialogTitle>
                          <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(cat.id)} className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {project && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Layers className="w-3 h-3" />
                    <span>{L(project.name, project.name_ku)}</span>
                  </div>
                )}
                {cat.description && (
                  <p className="text-sm text-muted-foreground">{L(cat.description, cat.description_ku)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}