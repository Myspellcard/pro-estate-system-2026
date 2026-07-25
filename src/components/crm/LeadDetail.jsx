import React, { useState } from 'react';
import { X, Phone, MessageCircle, Building2, FolderOpen, DollarSign, User, Calendar, Plus, CheckCircle2, ClipboardList, CalendarPlus, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/LanguageContext';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  'جديد': 'bg-blue-100 text-blue-700',
  'تم التواصل': 'bg-cyan-100 text-cyan-700',
  'مهتم': 'bg-amber-100 text-amber-700',
  'زيارة مشروع': 'bg-purple-100 text-purple-700',
  'تفاوض': 'bg-orange-100 text-orange-700',
  'حجز': 'bg-indigo-100 text-indigo-700',
  'تم البيع': 'bg-emerald-100 text-emerald-700',
  'غير مهتم': 'bg-red-100 text-red-700',
  'خسارة': 'bg-slate-200 text-slate-700',
};

export default function LeadDetail({ lead, project, property, isAdmin, allUsers = [], onClose, onEdit, onAddFollowup, onConvert, onUpdateSharing, onUpdateLossNote, canSeePhone = true }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().split('T')[0]);
  const [followupNote, setFollowupNote] = useState('');
  const [lossNote, setLossNote] = useState(lead.loss_note || '');
  const [savingLossNote, setSavingLossNote] = useState(false);

  const handleSaveLossNote = async () => {
    setSavingLossNote(true);
    await onUpdateLossNote(lead, lossNote.trim());
    setSavingLossNote(false);
  };

  const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;

  const handleAddFollowup = () => {
    if (!followupNote.trim()) return;
    onAddFollowup(lead, { date: followupDate, note: followupNote, created_date: new Date().toISOString() });
    setFollowupNote('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{lead.name}</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-700'}`}>{lead.status}</span>
          </div>
        </div>
        <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground" />
          {canSeePhone ? (
            <>
              <span dir="ltr">{lead.phone}</span>
              <a href={waLink(lead.phone)} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors">
                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
              </a>
            </>
          ) : (
            <span className="text-muted-foreground">{L('مخفي 🔒', 'شاراوە 🔒')}</span>
          )}
        </div>
        {lead.phone2 && canSeePhone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span dir="ltr">{lead.phone2}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <span>{project ? (lang === 'ku' ? (project.name_ku || project.name) : project.name) : L('لا يوجد مشروع', 'پڕۆژە نییە')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span>{property ? (lang === 'ku' ? (property.name_ku || property.name) : property.name) : L('لا توجد وحدة', 'یەکە نییە')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span>{lead.budget ? lead.budget.toLocaleString() : '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-muted-foreground" />
          <span>{lead.assigned_employee_name || L('غير محدد', 'دیاری نەکراو')}</span>
        </div>
        {lead.next_followup_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{L('المتابعة القادمة:', 'شوێنکەوتنی داهاتوو:')} {format(parseISO(lead.next_followup_date), 'dd/MM/yyyy')}</span>
          </div>
        )}
        <div className="text-sm text-muted-foreground">{L('المصدر:', 'سەرچاوە:')} {lead.source}</div>
      </div>

      {lead.status === 'خسارة' && lead.loss_reason && (
        <div className="bg-slate-50 rounded-xl p-3 mb-5 text-sm">
          <p className="text-xs text-muted-foreground mb-1">{L('سبب الخسارة', 'هۆکاری دۆڕان')}</p>
          <p>{lead.loss_reason}</p>
          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><MessageSquareText className="w-3 h-3" />{L('ملاحظة الخسارة', 'تێبینی دۆڕان')}</Label>
            <Textarea value={lossNote} onChange={e => setLossNote(e.target.value)} placeholder={L('اكتب ملاحظة الخسارة هنا...', 'تێبینی دۆڕان لێرە بنووسە...')} rows={2} className="resize-none w-full bg-white" />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveLossNote} disabled={savingLossNote}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {L('حفظ الملاحظة', 'پاشەکەوتی تێبینی')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {lead.notes && (
        <div className="bg-slate-50 rounded-xl p-3 mb-5 text-sm">
          <p className="text-xs text-muted-foreground mb-1">{L('ملاحظات', 'تێبینی')}</p>
          <p>{lead.notes}</p>
        </div>
      )}

      {/* Follow-ups */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">{L('سجل المتابعات', 'تۆماری شوێنکەوتن')}</p>
        </div>

        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
          {(lead.followups || []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4 bg-slate-50 rounded-lg">{L('لا توجد متابعات بعد', 'هێشتا شوێنکەوتن نییە')}</p>
          )}
          {[...(lead.followups || [])].reverse().map((f, idx) => (
            <div key={idx} className="border border-slate-100 rounded-lg p-3 text-sm bg-white shadow-sm">
              <div className="flex items-center gap-1.5 mb-1.5 text-primary">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-semibold text-xs">{f.date ? format(parseISO(f.date), 'dd/MM/yyyy') : ''}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{f.note}</p>
            </div>
          ))}
        </div>

        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-slate-700">{L('إضافة متابعة جديدة', 'زیادکردنی شوێنکەوتنی نوێ')}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{L('التاريخ', 'بەروار')}</Label>
            <Input type="date" dir="ltr" value={followupDate} onChange={e => setFollowupDate(e.target.value)} className="w-full bg-white" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><MessageSquareText className="w-3 h-3" />{L('الملاحظة', 'تێبینی')}</Label>
            <Textarea value={followupNote} onChange={e => setFollowupNote(e.target.value)} placeholder={L('ملاحظة المتابعة...', 'تێبینی شوێنکەوتن...')} rows={2} className="resize-none w-full bg-white" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddFollowup} className="gap-1"><Plus className="w-4 h-4" />{L('إضافة', 'زیادکردن')}</Button>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-5">
          <p className="text-sm font-bold mb-2">{L('مشاركة مع مستخدمين آخرين', 'هاوبەشکردن لەگەڵ بەکارهێنەرانی تر')}</p>
          <div className="flex flex-wrap gap-2">
            {allUsers.filter(u => u.id !== lead.created_by_id).map(u => {
              const selected = (lead.shared_with_user_ids || []).includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    const current = lead.shared_with_user_ids || [];
                    const updated = selected ? current.filter(id => id !== u.id) : [...current, u.id];
                    onUpdateSharing(lead, updated);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-muted-foreground border-slate-200 hover:border-slate-300'}`}
                >
                  {u.full_name || u.email}
                </button>
              );
            })}
            {allUsers.length === 0 && <p className="text-xs text-muted-foreground">{L('لا يوجد مستخدمون آخرون', 'بەکارهێنەری تر نییە')}</p>}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        {lead.status !== 'تم البيع' && (
          <Button variant="outline" className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => onConvert(lead)}>
            <CheckCircle2 className="w-4 h-4" /> {L('تحويل إلى حجز/بيع', 'گۆڕین بۆ حجز/فرۆشتن')}
          </Button>
        )}
        <Button onClick={() => onEdit(lead)}>{L('تعديل', 'دەستکاریکردن')}</Button>
      </div>
    </div>
  );
}