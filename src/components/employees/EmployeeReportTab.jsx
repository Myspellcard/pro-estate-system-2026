import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, FileBarChart, X, ChevronDown, ChevronUp, CheckSquare, UserCheck, UserX, Zap } from 'lucide-react';
import { format } from 'date-fns';

export default function EmployeeReportTab({ employee }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [form, setForm] = useState({ title: '', report_date: new Date().toISOString().split('T')[0], tasks_completed: '', tasks_total: '', attendance_days: '', absence_days: '', performance_score: '', notes: '' });

  const { data: reports = [] } = useQuery({
    queryKey: ['employee-reports', employee.id],
    queryFn: () => firebaseApi.entities.EmployeeReport.filter({ employee_id: employee.id }, '-report_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeReport.create({ ...data, employee_id: employee.id }),
    onSuccess: () => { qc.invalidateQueries(['employee-reports', employee.id]); setShowForm(false); setForm({ title: '', report_date: new Date().toISOString().split('T')[0], tasks_completed: '', tasks_total: '', attendance_days: '', absence_days: '', performance_score: '', notes: '' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.EmployeeReport.delete(id),
    onSuccess: () => qc.invalidateQueries(['employee-reports', employee.id]),
  });

  const filtered = reports.filter(r => {
    if (fromDate && r.report_date < fromDate) return false;
    if (toDate && r.report_date > toDate) return false;
    return true;
  });

  const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
  const scoreBg = (s) => s >= 80 ? 'from-green-500/10 to-green-500/5 border-green-200' : s >= 60 ? 'from-yellow-500/10 to-yellow-500/5 border-yellow-200' : 'from-red-500/10 to-red-500/5 border-red-200';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-indigo-500/10 to-indigo-500/5 border border-indigo-200/60 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <FileBarChart className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{L('تقارير الموظف', 'ڕاپۆرتەکانی کارمەند')}</h3>
            <p className="text-xs text-muted-foreground">{filtered.length} {L('تقرير', 'ڕاپۆرت')}</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />{L('تقرير جديد', 'ڕاپۆرتی نوێ')}
        </Button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-3 items-center p-3 bg-muted/40 rounded-xl border border-border">
        <span className="text-xs font-medium text-muted-foreground">{L('تصفية:', 'فلتەر:')}</span>
        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-xs w-36" />
        <span className="text-xs text-muted-foreground">—</span>
        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-xs w-36" />
        {(fromDate || toDate) && <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }} className="text-xs">{L('مسح', 'پاككردنەوە')}</Button>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-lg">{L('تقرير جديد', 'ڕاپۆرتی نوێ')}</h4>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('عنوان التقرير', 'ناونیشانی ڕاپۆرت')}</label><Input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('تاريخ التقرير', 'بەرواری ڕاپۆرت')}</label><Input type="date" value={form.report_date} onChange={e => setForm(p=>({...p,report_date:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('المهام المنجزة', 'ئەرکی تەواوبوو')}</label><Input type="number" value={form.tasks_completed} onChange={e => setForm(p=>({...p,tasks_completed:e.target.value}))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('إجمالي المهام', 'کۆی ئەرکەکان')}</label><Input type="number" value={form.tasks_total} onChange={e => setForm(p=>({...p,tasks_total:e.target.value}))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('أيام الحضور', 'ڕۆژانی ئامادەبوون')}</label><Input type="number" value={form.attendance_days} onChange={e => setForm(p=>({...p,attendance_days:e.target.value}))} /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('أيام الغياب', 'ڕۆژانی نەهاتن')}</label><Input type="number" value={form.absence_days} onChange={e => setForm(p=>({...p,absence_days:e.target.value}))} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('نقاط الأداء (0-100)', 'خالی کارایی (0-100)')}</label><Input type="number" min={0} max={100} value={form.performance_score} onChange={e => setForm(p=>({...p,performance_score:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block font-medium">{L('ملاحظات', 'تێبینی')}</label><textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} rows={3} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none" /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowForm(false)}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button onClick={() => createMutation.mutate({ ...form, tasks_completed: Number(form.tasks_completed), tasks_total: Number(form.tasks_total), attendance_days: Number(form.attendance_days), absence_days: Number(form.absence_days), performance_score: Number(form.performance_score) })} disabled={!form.title}>{L('حفظ', 'پاشەکەوتکردن')}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className={`rounded-2xl border bg-gradient-to-br overflow-hidden transition-all hover:shadow-md ${r.performance_score != null ? scoreBg(r.performance_score) : 'from-muted/40 to-muted/20 border-border'}`}>
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shadow-sm">
                  <FileBarChart className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.report_date ? format(new Date(r.report_date), 'dd/MM/yyyy') : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.performance_score != null && r.performance_score !== '' && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2.5 rounded-full bg-white/60 overflow-hidden shadow-inner">
                      <div className="h-full rounded-full transition-all" style={{width: `${r.performance_score}%`, background: scoreColor(r.performance_score)}} />
                    </div>
                    <span className="text-sm font-bold" style={{color: scoreColor(r.performance_score)}}>{r.performance_score}%</span>
                  </div>
                )}
                {expanded === r.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {expanded === r.id && (
              <div className="border-t border-white/40 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: CheckSquare, label: L('المهام', 'ئەرکەکان'), val: `${r.tasks_completed ?? '—'} / ${r.tasks_total ?? '—'}`, color: 'text-green-600', bg: 'bg-green-50' },
                    { icon: UserCheck, label: L('أيام الحضور', 'ئامادەبوون'), val: r.attendance_days ?? '—', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { icon: UserX, label: L('أيام الغياب', 'نەهاتن'), val: r.absence_days ?? '—', color: 'text-red-500', bg: 'bg-red-50' },
                    { icon: Zap, label: L('الأداء', 'کارایی'), val: `${r.performance_score ?? '—'}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map(({ icon: Icon, label, val, color, bg }) => (
                    <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                      <p className={`font-bold text-lg ${color}`}>{val}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                {r.notes && <p className="mt-3 text-sm text-muted-foreground bg-white/50 rounded-xl px-3 py-2">{r.notes}</p>}
                <div className="flex justify-end mt-3">
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(r.id)} className="text-destructive gap-1 text-xs hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />{L('حذف', 'سڕینەوە')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <FileBarChart className="w-8 h-8 text-indigo-300" />
            </div>
            <p className="font-medium">{L('لا توجد تقارير', 'هیچ ڕاپۆرتێک نییە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}