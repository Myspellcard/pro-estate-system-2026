import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Award, X } from 'lucide-react';
import { format } from 'date-fns';

const BADGE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
const BADGE_ICONS = ['🏆','⭐','🎯','💡','🔥','🚀','💎','🎖️','👑','🌟','✅','🤝'];

export default function EmployeeBadgesTab({ employee }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', title_ku: '', description: '', icon: '🏆', color: '#3b82f6', awarded_date: new Date().toISOString().split('T')[0] });

  const { data: badges = [] } = useQuery({
    queryKey: ['employee-badges', employee.id],
    queryFn: () => firebaseApi.entities.EmployeeBadge.filter({ employee_id: employee.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeBadge.create({ ...data, employee_id: employee.id }),
    onSuccess: () => { qc.invalidateQueries(['employee-badges', employee.id]); setShowForm(false); setForm({ title: '', title_ku: '', description: '', icon: '🏆', color: '#3b82f6', awarded_date: new Date().toISOString().split('T')[0] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeBadge.delete(id),
    onSuccess: () => qc.invalidateQueries(['employee-badges', employee.id]),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-amber-500/10 to-amber-500/5 border border-amber-200/60 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{L('الشارات والإنجازات', 'نیشانەکان و دەستکەوتەکان')}</h3>
            <p className="text-xs text-muted-foreground">{badges.length} {L('شارة', 'نیشان')}</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />{L('إضافة شارة', 'زیادکردنی نیشان')}
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-lg">{L('شارة جديدة', 'نیشانی نوێ')}</h4>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('العنوان (عربي)', 'ناونیشان (عەرەبی)')}</label><Input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('العنوان (كردي)', 'ناونیشان (کوردی)')}</label><Input value={form.title_ku} onChange={e => setForm(p=>({...p,title_ku:e.target.value}))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('الوصف', 'وەسف')}</label><Input value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('تاريخ المنح', 'بەرواری دانان')}</label><Input type="date" value={form.awarded_date} onChange={e => setForm(p=>({...p,awarded_date:e.target.value}))} /></div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">{L('الأيقونة', 'ئایکۆن')}</label>
              <div className="flex flex-wrap gap-2">{BADGE_ICONS.map(ic => <button key={ic} onClick={() => setForm(p=>({...p,icon:ic}))} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${form.icon===ic?'ring-2 ring-primary bg-primary/10 scale-110':'bg-muted hover:bg-accent'}`}>{ic}</button>)}</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">{L('اللون', 'رەنگ')}</label>
              <div className="flex gap-2">{BADGE_COLORS.map(c => <button key={c} onClick={() => setForm(p=>({...p,color:c}))} className={`w-8 h-8 rounded-full transition-all shadow-sm ${form.color===c?'ring-2 ring-offset-2 ring-gray-600 scale-110':''}`} style={{background:c}} />)}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={!form.title}>{L('إضافة الشارة', 'زیادکردنی نیشان')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {badges.map(badge => (
          <div key={badge.id} className="relative group rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all hover:-translate-y-1 hover:shadow-xl cursor-default"
            style={{ background: `linear-gradient(135deg, ${badge.color}15, ${badge.color}08)`, border: `2px solid ${badge.color}30` }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner" style={{ background: `${badge.color}20`, border: `2px solid ${badge.color}40` }}>
              {badge.icon || '🏆'}
            </div>
            <div className="w-full">
              <p className="font-bold text-sm text-foreground">{lang === 'ku' ? (badge.title_ku || badge.title) : badge.title}</p>
              {badge.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>}
            </div>
            {badge.awarded_date && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${badge.color}20`, color: badge.color }}>
                {format(new Date(badge.awarded_date), 'dd/MM/yyyy')}
              </span>
            )}
            <button onClick={() => deleteMutation.mutate(badge.id)} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/80 hover:bg-destructive/10 text-destructive shadow-sm">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {badges.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-amber-300" />
            </div>
            <p className="font-medium">{L('لا توجد شارات بعد', 'هیچ نیشانێک نییە')}</p>
            <p className="text-xs mt-1">{L('أضف أول شارة للموظف', 'یەکەم نیشان زیاد بکە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}