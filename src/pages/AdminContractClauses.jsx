import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Pencil, Trash2, X, Save, FileText, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';

const emptyForm = { title: '', title_ku: '', description: '', description_ku: '', order: 0, is_active: true };

export default function AdminContractClauses() {
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: clauses = [], isLoading } = useQuery({
    queryKey: ['contract-clauses'],
    queryFn: () => firebaseApi.entities.ContractClause.list('order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.ContractClause.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contract-clauses'] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.ContractClause.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contract-clauses'] }); close(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.ContractClause.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-clauses'] }),
  });

  const close = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (clause) => {
    setEditing(clause);
    setForm({ 
      title: clause.title || '', 
      title_ku: clause.title_ku || '', 
      description: clause.description || '', 
      description_ku: clause.description_ku || '', 
      order: clause.order || 0, 
      is_active: clause.is_active !== false 
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, order: Number(form.order) || 0 };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const toggleActive = (clause) => {
    updateMutation.mutate({ id: clause.id, data: { ...clause, is_active: !clause.is_active } });
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{L('بنود العقود الافتراضية', 'بەندەکانی گرێبەستی بنەڕەت')}</h1>
          <p className="text-sm text-muted-foreground">{L('إدارة البنود والشروط التي تظهر افتراضياً في العقود', 'بەڕێوەبردنی بەندەکانی بنەڕەت کە لە گرێبەستەکاندا دەردەکەون')}</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { close(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> {L('إضافة بند', 'زیادکردنی بەند')}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{editing ? L('تعديل البند', 'دەستکاریکردنی بەند') : L('بند جديد', 'بەندی نوێ')}</h2>
            <button onClick={close}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label>{L('عنوان البند *', 'سەردێڕی بەند *')}</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder={L('مثال: التزام الدفع', 'نموونە: پابەندبوون بە پارەدان')} />
              </div>
              <div className="space-y-2">
                <Label>{L('الترتيب', 'ڕیزبەندی')}</Label>
                <Input type="number" min="0" value={form.order} onChange={e => setForm(p => ({ ...p, order: e.target.value }))} placeholder="1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{L('عنوان البند (كردي)', 'سەردێڕی بەند (کوردی)')}</Label>
              <Input value={form.title_ku} onChange={e => setForm(p => ({ ...p, title_ku: e.target.value }))} placeholder={L('نموونە: پابەندبوون بە پارەدان', 'نموونە: پابەندبوون بە پارەدان')} />
            </div>
            <div className="space-y-2">
              <Label>{L('نص البند *', 'دەقی بەند *')}</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required placeholder={L('اكتب تفاصيل البند هنا...', 'وردەکاریەکانی بەند لێرە بنووسە...')} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>{L('نص البند (كردي)', 'دەقی بەند (کوردی)')}</Label>
              <Textarea value={form.description_ku} onChange={e => setForm(p => ({ ...p, description_ku: e.target.value }))} placeholder={L('وردەکاریەکانی بەند لێرە بنووسە...', 'وردەکاریەکانی بەند لێرە بنووسە...')} rows={4} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={close}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {editing ? L('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری') : L('إضافة البند', 'زیادکردنی بەند')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {clauses.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-muted mb-4">
            <FileText className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{L('لا توجد بنود', 'بەند نییە')}</h3>
          <p className="text-sm text-muted-foreground mb-6">{L('أضف البنود الافتراضية للعقود', 'بەندەکانی بنەڕەت بۆ گرێبەستەکان زیاد بکە')}</p>
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> {L('إضافة بند', 'زیادکردنی بەند')}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {clauses.map((clause, idx) => (
            <div key={clause.id} className={`bg-card rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${clause.is_active === false ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-black text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold">{clause.title}</h3>
                    {clause.is_active === false && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border">{L('معطّل', 'ناچالاک')}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{clause.description}</p>
                  {clause.description_ku && (
                    <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">{clause.description_ku}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(clause)} className="text-xs px-2">
                    {clause.is_active === false ? L('تفعيل', 'چالاک') : L('تعطيل', 'ناچالاک')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(clause)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{L('حذف البند', 'سڕینەوەی بەند')}</AlertDialogTitle>
                        <AlertDialogDescription>{L(`هل أنت متأكد من حذف البند "${clause.title}"؟`, `دڵنیای لە سڕینەوەی بەندی "${clause.title}"؟`)}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(clause.id)} className="bg-destructive text-destructive-foreground">{L('حذف', 'سڕینەوە')}</AlertDialogAction>
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