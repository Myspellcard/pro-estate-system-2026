import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Megaphone, Plus, Pencil, Trash2, X, Save, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';

const emptyForm = {
  title_ar: '',
  title_ku: '',
  text_ar: '',
  text_ku: '',
  bg_color_start: '#fbbf24',
  bg_color_end: '#f59e0b',
  text_color: '#000000',
  is_active: true,
  branch_id: '',
};

export default function AdminAdvertisements() {
  const queryClient = useQueryClient();
  const { branches } = useBranch();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  
  const t = {
    manageAdvertisements: L('إدارة الإعلانات', 'بەڕێوەبردنی ڕیکلامەکان'),
    addEditAdvertisements: L('إضافة وتعديل الإعلانات', 'زیادکردن و دەستکاریکردنی ڕیکلامەکان'),
    addAdvertisement: L('إضافة إعلان', 'زیادکردنی ڕیکلام'),
    editAdvertisement: L('تعديل الإعلان', 'دەستکاریکردنی ڕیکلام'),
    newAdvertisement: L('إعلان جديد', 'ڕیکلامی نوێ'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    saveChanges: L('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری'),
    createAdvertisement: L('إنشاء الإعلان', 'دروستکردنی ڕیکلام'),
    noAdvertisements: L('لا توجد إعلانات', 'ڕیکلام نییە'),
    addFirstAdvertisement: L('قم بإضافة أول إعلان', 'یەکەم ڕیکلام زیاد بکە'),
    edit: L('تعديل', 'دەستکاری'),
    delete: L('حذف', 'سڕینەوە'),
    deleteAdvertisement: L('حذف الإعلان', 'سڕینەوەی ڕیکلام'),
    confirmDelete: (title) => L(`هل أنت متأكد من حذف "${title}"؟`, `دڵنیای لە سڕینەوەی "${title}"؟`),
    titleAr: L('عنوان الإعلان (عربي)', 'سەردەڕی ڕیکلام (عەرەبی)'),
    titleKu: L('عنوان الإعلان (كردي)', 'سەردەڕی ڕیکلام (کوردی)'),
    textAr: L('نص الإعلان (عربي)', 'دەقی ڕیکلام (عەرەبی)'),
    textKu: L('نص الإعلان (كردي)', 'دەقی ڕیکلام (کوردی)'),
    branch: L('الفرع', 'لق'),
    bgColorStart: L('لون بداية الخلفية', 'ڕەنگی دەستپێکی پاشبنەما'),
    bgColorEnd: L('لون نهاية الخلفية', 'ڕەنگی کۆتایی پاشبنەما'),
    textColor: L('لون النص', 'ڕەنگی دەق'),
    isActive: L('نشط', 'چالاک'),
    preview: L('معاينة', 'پێشبینین'),
  };
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: advertisements = [], isLoading } = useQuery({
    queryKey: ['advertisements'],
    queryFn: () => firebaseApi.entities.AdvertisementBanner.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.AdvertisementBanner.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['advertisements'] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.AdvertisementBanner.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['advertisements'] }); close(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.AdvertisementBanner.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['advertisements'] }); },
  });

  const close = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (ad) => {
    setEditing(ad);
    setForm({ ...emptyForm, ...ad });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.manageAdvertisements}</h1>
          <p className="text-sm text-muted-foreground">{t.addEditAdvertisements}</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { close(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> {t.addAdvertisement}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{editing ? t.editAdvertisement : t.newAdvertisement}</h2>
            <button onClick={close}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.titleAr} *</Label>
                <Input value={form.title_ar} onChange={e => setForm(p => ({ ...p, title_ar: e.target.value }))} required placeholder={L('مثال: عرض خاص', 'نموونە: پێشکەشکردنی تایبەت')} />
              </div>
              <div className="space-y-2">
                <Label>{t.titleKu}</Label>
                <Input value={form.title_ku} onChange={e => setForm(p => ({ ...p, title_ku: e.target.value }))} placeholder={L('نموونە: پێشکەشکردنی تایبەت', 'نموونە: پێشکەشکردنی تایبەت')} />
              </div>
              <div className="space-y-2">
                <Label>{t.textAr} *</Label>
                <Input value={form.text_ar} onChange={e => setForm(p => ({ ...p, text_ar: e.target.value }))} required placeholder={L('نص الإعلان', 'دەقی ڕیکلام')} />
              </div>
              <div className="space-y-2">
                <Label>{t.textKu}</Label>
                <Input value={form.text_ku} onChange={e => setForm(p => ({ ...p, text_ku: e.target.value }))} placeholder={L('دەقی ڕیکلام', 'دەقی ڕیکلام')} />
              </div>
              <div className="space-y-2">
                <Label>{t.branch}</Label>
                <select
                  value={form.branch_id}
                  onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">{L('كل الفروع', 'هەموو لقەکان')}</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{lang === 'ku' ? (b.name_ku || b.name) : b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <Label className="mb-0">{t.isActive}</Label>
              </div>
            </div>

            {/* Color Settings */}
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">{L('ألوان الإعلان', 'ڕەنگەکانی ڕیکلام')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.bgColorStart}</Label>
                  <div className="flex gap-2">
                    <input type="color" value={form.bg_color_start} onChange={e => setForm(p => ({ ...p, bg_color_start: e.target.value }))} className="w-12 h-9 border rounded cursor-pointer" />
                    <Input value={form.bg_color_start} onChange={e => setForm(p => ({ ...p, bg_color_start: e.target.value }))} placeholder="#fbbf24" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.bgColorEnd}</Label>
                  <div className="flex gap-2">
                    <input type="color" value={form.bg_color_end} onChange={e => setForm(p => ({ ...p, bg_color_end: e.target.value }))} className="w-12 h-9 border rounded cursor-pointer" />
                    <Input value={form.bg_color_end} onChange={e => setForm(p => ({ ...p, bg_color_end: e.target.value }))} placeholder="#f59e0b" className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.textColor}</Label>
                  <div className="flex gap-2">
                    <input type="color" value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} className="w-12 h-9 border rounded cursor-pointer" />
                    <Input value={form.text_color} onChange={e => setForm(p => ({ ...p, text_color: e.target.value }))} placeholder="#000000" className="flex-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border border-border rounded-xl p-4">
              <h4 className="text-sm font-bold mb-3">{t.preview}</h4>
              <div
                className="rounded-lg p-4 text-center"
                style={{
                  background: `linear-gradient(135deg, ${form.bg_color_start}, ${form.bg_color_end})`,
                  color: form.text_color,
                }}
              >
                <h3 className="font-bold text-lg mb-1">{form.title_ar || L('عنوان الإعلان', 'سەردەڕی ڕیکلام')}</h3>
                <p className="text-sm">{form.text_ar || L('نص الإعلان', 'دەقی ڕیکلام')}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={close}>{t.cancel}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {editing ? t.saveChanges : t.createAdvertisement}
              </Button>
            </div>
          </form>
        </div>
      )}

      {advertisements.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-muted mb-4">
            <Megaphone className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{t.noAdvertisements}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t.addFirstAdvertisement}</p>
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> {t.addAdvertisement}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {advertisements.map(ad => (
            <div key={ad.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div
                className="p-5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${ad.bg_color_start || '#fbbf24'}, ${ad.bg_color_end || '#f59e0b'})`,
                  color: ad.text_color || '#000000',
                }}
              >
                <h3 className="font-bold text-lg mb-1">{lang === 'ku' && ad.title_ku ? ad.title_ku : ad.title_ar}</h3>
                <p className="text-sm">{lang === 'ku' && ad.text_ku ? ad.text_ku : ad.text_ar}</p>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${ad.is_active !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="text-xs text-muted-foreground">{branches.find(b => b.id === ad.branch_id)?.name || L('كل الفروع', 'هەموو لقەکان')}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(ad)}>
                    <Pencil className="w-3.5 h-3.5" /> {t.edit}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.deleteAdvertisement}</AlertDialogTitle>
                        <AlertDialogDescription>{t.confirmDelete(lang === 'ku' && ad.title_ku ? ad.title_ku : ad.title_ar)}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(ad.id)} className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
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