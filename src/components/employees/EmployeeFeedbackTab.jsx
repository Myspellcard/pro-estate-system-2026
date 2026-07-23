import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, MessageSquare, Star, X, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['أداء', 'تواصل', 'الوقت', 'العمل الجماعي', 'المهارات التقنية', 'أخرى'];
const CAT_COLORS = { 'أداء': 'bg-blue-100 text-blue-700', 'تواصل': 'bg-purple-100 text-purple-700', 'الوقت': 'bg-orange-100 text-orange-700', 'العمل الجماعي': 'bg-green-100 text-green-700', 'المهارات التقنية': 'bg-cyan-100 text-cyan-700', 'أخرى': 'bg-gray-100 text-gray-700' };

export default function EmployeeFeedbackTab({ employee }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reviewer_name: '', rating: 5, category: 'أداء', comment: '', feedback_date: new Date().toISOString().split('T')[0] });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['employee-feedback', employee.id],
    queryFn: () => firebaseApi.entities.EmployeeFeedback.filter({ employee_id: employee.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeFeedback.create({ ...data, employee_id: employee.id }),
    onSuccess: () => { qc.invalidateQueries(['employee-feedback', employee.id]); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeFeedback.delete(id),
    onSuccess: () => qc.invalidateQueries(['employee-feedback', employee.id]),
  });

  const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : null;

  return (
    <div className="space-y-5">
      {/* Header with avg */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-yellow-500/10 to-yellow-500/5 border border-yellow-200/60 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{L('التغذية الراجعة', 'فیدباک')}</h3>
            <p className="text-xs text-muted-foreground">{feedbacks.length} {L('تقييم', 'هەڵسەنگاندن')}</p>
          </div>
          {avgRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/20 border border-yellow-300/50">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="font-bold text-yellow-700 text-base">{avgRating}</span>
              <span className="text-xs text-yellow-600">/ 5</span>
            </div>
          )}
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />{L('إضافة', 'زیادکردن')}
        </Button>
      </div>

      {/* Avg bar */}
      {avgRating && (
        <div className="p-4 bg-gradient-to-l from-yellow-50 to-amber-50 border border-yellow-100 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">{L('متوسط التقييم', 'ناوەندی هەڵسەنگاندن')}</span>
            <span className="text-xs font-bold text-yellow-700">{avgRating} / 5</span>
          </div>
          <div className="w-full h-2.5 bg-yellow-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all" style={{width: `${(avgRating / 5) * 100}%`}} />
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-lg">{L('تغذية راجعة جديدة', 'فیدباکی نوێ')}</h4>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('اسم المقيّم', 'ناوی هەڵسەنگێنەر')}</label><Input value={form.reviewer_name} onChange={e => setForm(p=>({...p,reviewer_name:e.target.value}))} /></div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">{L('التقييم', 'هەڵسەنگاندن')}</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(p=>({...p,rating:n}))} className="p-1 hover:scale-110 transition-transform">
                    <Star className={`w-7 h-7 transition-colors ${n <= form.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">{L('الفئة', 'پۆل')}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setForm(p=>({...p,category:c}))} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2 ${form.category === c ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-muted text-muted-foreground hover:border-muted-foreground/30'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('التعليق', 'بیرۆکە')}</label>
              <textarea value={form.comment} onChange={e => setForm(p=>({...p,comment:e.target.value}))} rows={3} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none" />
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('التاريخ', 'بەروار')}</label><Input type="date" value={form.feedback_date} onChange={e => setForm(p=>({...p,feedback_date:e.target.value}))} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button onClick={() => createMutation.mutate(form)}>{L('إضافة', 'زیادکردن')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {feedbacks.map(fb => (
          <div key={fb.id} className="group border border-border rounded-2xl overflow-hidden bg-card hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary text-sm">{(fb.reviewer_name || '?').charAt(0)}</span>
                </div>
                <div>
                  <span className="font-semibold text-sm">{fb.reviewer_name || L('مجهول', 'نەناسراو')}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLORS[fb.category] || 'bg-gray-100 text-gray-700'}`}>{fb.category}</span>
                    <span className="text-xs text-muted-foreground">{fb.feedback_date ? format(new Date(fb.feedback_date), 'dd/MM/yyyy') : ''}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n => <Star key={n} className={`w-4 h-4 ${n <= fb.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}
                </div>
                <button onClick={() => deleteMutation.mutate(fb.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {fb.comment && (
              <div className="px-4 pb-4">
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">{fb.comment}</p>
              </div>
            )}
          </div>
        ))}
        {feedbacks.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-yellow-50 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-8 h-8 text-yellow-300" />
            </div>
            <p className="font-medium">{L('لا توجد تغذية راجعة بعد', 'هیچ فیدباکێک نییە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}