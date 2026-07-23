import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, UserPlus, Phone, FolderOpen, DollarSign, StickyNote, CalendarClock, UserCog, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const SOURCES = ['فيسبوك', 'واتساب', 'إنستغرام', 'موقع إلكتروني', 'اتصال هاتفي', 'زيارة مكتب', 'توصية'];
const STATUSES = ['جديد', 'تم التواصل', 'مهتم', 'زيارة مشروع', 'تفاوض', 'حجز', 'تم البيع', 'غير مهتم', 'خسارة'];

export default function LeadForm({ lead, projects, properties, employees, lossReasons = [], onAddLossReason, onSubmit, onCancel, isLoading }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [form, setForm] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    phone2: lead?.phone2 || '',
    source: lead?.source || 'فيسبوك',
    project_id: lead?.project_id || '',
    property_id: lead?.property_id || '',
    budget: lead?.budget ? String(lead.budget) : '',
    assigned_employee_id: lead?.assigned_employee_id || '',
    assigned_employee_name: lead?.assigned_employee_name || '',
    status: lead?.status || 'جديد',
    next_followup_date: lead?.next_followup_date || '',
    notes: lead?.notes || '',
    loss_reason: lead?.loss_reason || '',
    loss_note: lead?.loss_note || '',
  });
  const [newReason, setNewReason] = useState('');
  const [lossNote, setLossNote] = useState(lead?.loss_note || '');

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const filteredProperties = form.project_id ? properties.filter(p => p.project_id === form.project_id) : properties;

  const isLoss = form.status === 'خسارة';
  const finalLossReason = form.loss_reason === '__new' ? newReason.trim() : form.loss_reason;

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return;
    if (isLoss && !finalLossReason) return;
    if (isLoss && form.loss_reason === '__new' && onAddLossReason) {
      await onAddLossReason(finalLossReason);
    }
    onSubmit({
      ...form,
      budget: Number(form.budget) || 0,
      loss_reason: isLoss ? finalLossReason : '',
      loss_note: isLoss ? lossNote.trim() : '',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden mb-6">
      <div className="bg-gradient-to-l from-primary via-primary to-primary/80 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">{lead ? L('تعديل عميل محتمل', 'دەستکاریکردنی کڕیاری ئەگەری') : L('إضافة عميل محتمل', 'زیادکردنی کڕیاری ئەگەری')}</h2>
        </div>
        <button onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Contact Info */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">{L('بيانات التواصل', 'زانیاری پەیوەندی')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="space-y-1.5">
              <Label>{L('الاسم *', 'ناو *')}</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{L('رقم الهاتف الأول *', 'ژمارەی تەلەفۆنی یەکەم *')}</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07501234567" />
            </div>
            <div className="space-y-1.5">
              <Label>{L('رقم الهاتف الثاني', 'ژمارەی تەلەفۆنی دووەم')}</Label>
              <Input value={form.phone2} onChange={e => set('phone2', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{L('مصدر العميل', 'سەرچاوەی کڕیار')}</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Interest */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">{L('الاهتمام والميزانية', 'حەز و بودجە')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="space-y-1.5">
              <Label>{L('المشروع المهتم به', 'پڕۆژەی حەز پێکراو')}</Label>
              <Select value={form.project_id || '__none'} onValueChange={v => set('project_id', v === '__none' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={L('اختر مشروع', 'پڕۆژە هەڵبژێرە')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{L('بدون', 'هیچ')}</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{lang === 'ku' ? (p.name_ku || p.name) : p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{L('الوحدة المهتم بها', 'یەکەی حەز پێکراو')}</Label>
              <Select value={form.property_id || '__none'} onValueChange={v => set('property_id', v === '__none' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder={L('اختر وحدة', 'یەکە هەڵبژێرە')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{L('بدون', 'هیچ')}</SelectItem>
                  {filteredProperties.map(p => <SelectItem key={p.id} value={p.id}>{lang === 'ku' ? (p.name_ku || p.name) : p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>{L('الميزانية', 'بودجە')}</Label>
              <Input type="text" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Assignment & Status */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">{L('المسؤول والمتابعة', 'بەرپرس و شوێنکەوتن')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="space-y-1.5">
              <Label>{L('الموظف المسؤول', 'کارمەندی بەرپرس')}</Label>
              <Select
                value={form.assigned_employee_id || '__none'}
                onValueChange={v => {
                  if (v === '__none') { set('assigned_employee_id', ''); set('assigned_employee_name', ''); return; }
                  const emp = employees.find(e => e.id === v);
                  set('assigned_employee_id', v);
                  set('assigned_employee_name', emp?.full_name || '');
                }}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder={L('اختر موظف', 'کارمەند هەڵبژێرە')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{L('بدون', 'هیچ')}</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{L('الحالة', 'دۆخ')}</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isLoss && (
              <div className="space-y-1.5 md:col-span-2">
                <Label>{L('سبب الخسارة *', 'هۆکاری دۆڕان *')}</Label>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {lossReasons.map(r => (
                    <React.Fragment key={r.id}>
                      <button
                        type="button"
                        onClick={() => set('loss_reason', r.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-right transition-colors ${form.loss_reason === r.name ? 'border-primary bg-primary/5 font-medium' : 'border-slate-200 hover:bg-slate-50'}`}
                      >
                        <span>{r.name}</span>
                        {form.loss_reason === r.name && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                      {form.loss_reason === r.name && (
                        <div className="space-y-1.5 pr-2">
                          <Label>{L('ملاحظة', 'تێبینی')}</Label>
                          <Textarea value={lossNote} onChange={e => setLossNote(e.target.value)} placeholder={L('اكتب ملاحظة (اختياري)...', 'تێبینی بنووسە (ئارەزوومەندانە)...')} rows={3} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  <button
                    type="button"
                    onClick={() => set('loss_reason', '__new')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-right transition-colors ${form.loss_reason === '__new' ? 'border-primary bg-primary/5 font-medium' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <span>{L('+ إضافة سبب جديد', '+ زیادکردنی هۆکاری نوێ')}</span>
                    {form.loss_reason === '__new' && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                  {form.loss_reason === '__new' && (
                    <div className="space-y-1.5 pr-2">
                      <Label>{L('السبب الجديد', 'هۆکاری نوێ')}</Label>
                      <Input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder={L('اكتب السبب...', 'هۆکار بنووسە...')} />
                      <Label>{L('ملاحظة', 'تێبینی')}</Label>
                      <Textarea value={lossNote} onChange={e => setLossNote(e.target.value)} placeholder={L('اكتب ملاحظة (اختياري)...', 'تێبینی بنووسە (ئارەزوومەندانە)...')} rows={3} />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="block text-center">{L('تاريخ المتابعة القادمة', 'بەرواری شوێنکەوتنی داهاتوو')}</Label>
              <div className="flex justify-center" dir="ltr">
                <Input
                  type="date"
                  value={form.next_followup_date}
                  onChange={e => set('next_followup_date', e.target.value)}
                  className="text-center w-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold">{L('ملاحظات', 'تێبینی')}</p>
          </div>
          <div className="p-4">
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
        <Button variant="outline" onClick={onCancel}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
        <Button onClick={handleSubmit} disabled={isLoading || !form.name || !form.phone || (isLoss && !finalLossReason)} className="gap-2">
          <Save className="w-4 h-4" />
          {isLoading ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('حفظ', 'پاشەکەوتکردن')}
        </Button>
      </div>
    </div>
  );
}