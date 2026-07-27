import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Pencil, Trash2, Building2, X, Check, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function AdminProjects() {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formUsageType, setFormUsageType] = useState('both');
  const [formBranchIds, setFormBranchIds] = useState([]);
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { branches } = useBranch();
  const { activeBranch } = useBranch();

  const t = {
    projects: L('المشاريع', 'پڕۆژەکان'),
    manageProjects: L('إدارة المشاريع والمناطق', 'بەڕێوەبردنی پڕۆژە و ناوچەکان'),
    addProject: L('إضافة مشروع', 'زیادکردنی پڕۆژە'),
    editProject: L('تعديل المشروع', 'دەستکاریکردنی پڕۆژە'),
    deleteProject: L('حذف المشروع', 'سڕینەوەی پڕۆژە'),
    deleteConfirm: L('هل أنت متأكد من حذف هذا المشروع؟', 'دڵنیایت لە سڕینەوەی ئەم پڕۆژەیە؟'),
    noProjects: L('لا توجد مشاريع', 'هیچ پڕۆژەیەک نییە'),
    addFirstProject: L('أضف مشروعك الأول', 'یەکەم پڕۆژەت زیادکرد'),
    name: L('اسم المشروع', 'ناوی پڕۆژە'),
    nameKu: L('اسم المشروع (كردي)', 'ناوی پڕۆژە (کوردی)'),
    description: L('الوصف', 'وەسف'),
    descriptionKu: L('الوصف (كردي)', 'وەسف (کوردی)'),
    city: L('المدينة', 'شار'),
    cityKu: L('المدينة (كردي)', 'شار (کوردی)'),
    area: L('المنطقة', 'ناوچە'),
    areaKu: L('المنطقة (كردي)', 'ناوچە (کوردی)'),
    save: L('حفظ', 'پاشەکەوتکردن'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    delete: L('حذف', 'سڕینەوە'),
    active: L('نشط', 'چالاک'),
    inactive: L('غير نشط', 'ناچالاک'),
  };

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => firebaseApi.entities.Project.list('-created_date'),
  });

  const projects = activeBranch
    ? allProjects.filter(p => p.branch_id === activeBranch.id || (p.branch_ids || []).includes(activeBranch.id))
    : allProjects;

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Project.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Project.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); setEditingProject(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const handleSubmit = (data) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate({ ...data, is_active: true });
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title={t.projects}
        subtitle={t.manageProjects}
        actionLabel={t.addProject}
        onAction={() => { setEditingProject(null); setFormUsageType('both'); setFormBranchIds(activeBranch?.id ? [activeBranch.id] : []); setShowForm(true); }}
      />

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">{editingProject ? t.editProject : t.addProject}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit({
            name: e.target.name.value,
            name_ku: e.target.name_ku.value,
            description: e.target.description.value,
            description_ku: e.target.description_ku.value,
            city: e.target.city.value,
            city_ku: e.target.city_ku.value,
            area: e.target.area.value,
            area_ku: e.target.area_ku.value,
            image_url: e.target.image_url.value,
            notes: e.target.notes.value,
            usage_type: formUsageType,
            branch_id: formBranchIds[0] || '',
            branch_ids: formBranchIds,
          }); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>{L('الفروع', 'لقەکان')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {formBranchIds.length === 0
                        ? L('اختر الفروع...', 'لقەکان هەڵبژێرە...')
                        : branches.filter(b => formBranchIds.includes(b.id)).map(b => L(b.name, b.name_ku)).join('، ')}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-2" align="start">
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {branches.map(b => {
                      const checked = formBranchIds.includes(b.id);
                      return (
                        <label key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
                          <Checkbox checked={checked} onCheckedChange={v => setFormBranchIds(prev => v ? [...new Set([...prev, b.id])] : prev.filter(id => id !== b.id))} />
                          <span className="text-sm">{L(b.name, b.name_ku)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-between gap-2 pt-2 mt-1 border-t">
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setFormBranchIds(branches.map(b => b.id))}>{L('تحديد الكل', 'هەمووی دیاریبکە')}</button>
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setFormBranchIds([])}>{L('مسح', 'سڕینەوە')}</button>
                  </div>
                </PopoverContent>
              </Popover>
              {formBranchIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {branches.filter(b => formBranchIds.includes(b.id)).map(b => (
                    <Badge key={b.id} className="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer" onClick={() => setFormBranchIds(prev => prev.filter(id => id !== b.id))}>
                      {L(b.name, b.name_ku)} <X className="w-3 h-3 mr-1" />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{L('يمكنك تعيين عدة فروع — مستخدمو تلك الفروع سيتمكنون من إضافة العقارات لهذا المشروع', 'دەتوانیت چەند لق دیاری بکەیت — بەکارهێنەرانی ئەو لقانە دەتوانن خانووبەر بۆ ئەم پڕۆژە زیادبکەن')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t.name} *</Label>
              <Input name="name" defaultValue={editingProject?.name} required placeholder={L('مثال: حي الأندلس', 'نموونە: گەڕەکی ئەندەلوس')} />
            </div>
            <div className="space-y-2">
              <Label>{t.nameKu}</Label>
              <Input name="name_ku" defaultValue={editingProject?.name_ku} placeholder={L('نموونە: گەڕەکی ئەندەلوس', 'نموونە: گەڕەکی ئەندەلوس')} />
            </div>
            <div className="space-y-2">
              <Label>{t.city}</Label>
              <Input name="city" defaultValue={editingProject?.city} placeholder={L('المدينة', 'شار')} />
            </div>
            <div className="space-y-2">
              <Label>{t.cityKu}</Label>
              <Input name="city_ku" defaultValue={editingProject?.city_ku} placeholder={L('شار', 'شار')} />
            </div>
            <div className="space-y-2">
              <Label>{t.area}</Label>
              <Input name="area" defaultValue={editingProject?.area} placeholder={L('المنطقة', 'ناوچە')} />
            </div>
            <div className="space-y-2">
              <Label>{t.areaKu}</Label>
              <Input name="area_ku" defaultValue={editingProject?.area_ku} placeholder={L('ناوچە', 'ناوچە')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.description}</Label>
              <Textarea name="description" defaultValue={editingProject?.description} rows={2} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t.descriptionKu}</Label>
              <Textarea name="description_ku" defaultValue={editingProject?.description_ku} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{L('نوع الاستخدام', 'جۆری بەکارهێنان')}</Label>
              <Select value={formUsageType} onValueChange={setFormUsageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">{L('إيجار فقط', 'تەنها کرێ')}</SelectItem>
                  <SelectItem value="sale">{L('بيع فقط', 'تەنها فرۆشتن')}</SelectItem>
                  <SelectItem value="both">{L('إيجار وبيع', 'کرێ و فرۆشتن')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>صورة المشروع (رابط)</Label>
              <Input name="image_url" defaultValue={editingProject?.image_url} placeholder="https://..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>ملاحظات</Label>
              <Textarea name="notes" defaultValue={editingProject?.notes} rows={2} />
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

      {projects.length === 0 && !showForm ? (
        <EmptyState icon={Building2} title={t.noProjects} description={t.addFirstProject} actionLabel={t.addProject} onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(project => (
            <div key={project.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all overflow-hidden">
              <div className="h-40 bg-gradient-to-bl from-primary/10 to-primary/5 flex items-center justify-center relative">
                {project.image_url ? (
                  <img src={project.image_url} alt={project.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-12 h-12 text-primary/30" />
                )}
                <Badge className={`absolute top-3 right-3 text-xs ${project.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                  {project.is_active ? t.active : t.inactive}
                </Badge>
                <Badge className="absolute top-3 left-3 text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {project.usage_type === 'rent' ? L('إيجار', 'کرێ') : project.usage_type === 'sale' ? L('بيع', 'فرۆشتن') : L('إيجار+بيع', 'کرێ+فرۆشتن')}
                </Badge>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-1">{L(project.name, project.name_ku)}</h3>
                {(project.city || project.area) && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {project.city && <span>{L(project.city, project.city_ku)}</span>}
                    {project.city && project.area && ' • '}
                    {project.area && <span>{L(project.area, project.area_ku)}</span>}
                  </p>
                )}
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{L(project.description, project.description_ku)}</p>
                )}
                {(() => {
                  const projBranches = (project.branch_ids && project.branch_ids.length ? project.branch_ids : (project.branch_id ? [project.branch_id] : []));
                  if (projBranches.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {projBranches.map(bid => {
                        const br = branches.find(b => b.id === bid);
                        if (!br) return null;
                        return <Badge key={bid} className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{L(br.name, br.name_ku)}</Badge>;
                      })}
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => { setEditingProject(project); setFormUsageType(project.usage_type || 'both'); setFormBranchIds(project.branch_ids && project.branch_ids.length ? project.branch_ids : (project.branch_id ? [project.branch_id] : [])); setShowForm(true); }}>
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
                        <AlertDialogTitle>{t.deleteProject}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteConfirm}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(project.id)} className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
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