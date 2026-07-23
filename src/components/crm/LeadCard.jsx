import React, { useState } from 'react';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import LossReasonDialog from '@/components/crm/LossReasonDialog';

const STATUS_HEADER_COLORS = {
  'جديد': 'bg-blue-500',
  'تم التواصل': 'bg-cyan-500',
  'مهتم': 'bg-amber-500',
  'زيارة مشروع': 'bg-purple-500',
  'تفاوض': 'bg-orange-500',
  'حجز': 'bg-indigo-500',
  'تم البيع': 'bg-emerald-500',
  'غير مهتم': 'bg-red-500',
  'خسارة': 'bg-red-600',
};

export default function LeadCard({ lead, L, STATUSES, STATUS_COLORS, onView, onStatusChange, onEdit, onDelete, lossReasons = [], onAddLossReason }) {
  const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;
  const [showLossDialog, setShowLossDialog] = useState(false);

  const handleStatusSelect = (v) => {
    if (v === 'خسارة') setShowLossDialog(true);
    else onStatusChange(lead, v);
  };

  const handleConfirmLoss = async (reason, isNew, note) => {
    if (isNew && onAddLossReason) await onAddLossReason(reason);
    onStatusChange(lead, 'خسارة', reason, note);
    setShowLossDialog(false);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer" onClick={() => onView(lead)}>
        <div className={`px-4 py-2 ${STATUS_HEADER_COLORS[lead.status] || 'bg-gray-400'}`}>
          <h3 className="font-bold text-sm text-white">{lead.name}</h3>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground" dir="ltr">{lead.phone}</p>
            </div>
          </div>
          <div className="mb-3" onClick={e => e.stopPropagation()}>
            <Select value={lead.status} onValueChange={handleStatusSelect}>
              <SelectTrigger className={`h-7 w-auto text-xs font-bold border-0 rounded-full px-2.5 py-0.5 ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 mb-4 text-xs text-muted-foreground">
            <p>{L('المصدر:', 'سەرچاوە:')} {lead.source}</p>
            {lead.assigned_employee_name && <p>{L('الموظف:', 'کارمەند:')} {lead.assigned_employee_name}</p>}
            {lead.budget > 0 && <p>{L('الميزانية:', 'بودجە:')} {lead.budget.toLocaleString()}</p>}
            {lead.created_date && <p>{L('تاريخ الإضافة:', 'بەرواری زیادکردن:')} {lead.created_date.slice(0, 10)}</p>}
          </div>
          {lead.status === 'خسارة' && (lead.loss_reason || lead.loss_note) && (
            <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
              {lead.loss_reason && <p className="text-xs"><span className="font-bold text-slate-700">{L('سبب الخسارة:', 'هۆکاری دۆڕان:')}</span> <span className="text-muted-foreground">{lead.loss_reason}</span></p>}
              {lead.loss_note && <p className="text-xs"><span className="font-bold text-slate-700">{L('ملاحظة:', 'تێبینی:')}</span> <span className="text-muted-foreground">{lead.loss_note}</span></p>}
            </div>
          )}
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            {lead.phone && (
              <a href={waLink(lead.phone)} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors">
                <MessageCircle className="w-4 h-4 text-green-600" />
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => onEdit(lead)}><Pencil className="w-3.5 h-3.5" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{L('حذف العميل المحتمل', 'سڕینەوەی کڕیاری ئەگەری')}</AlertDialogTitle>
                  <AlertDialogDescription>{L('هل أنت متأكد من حذف هذا العميل؟', 'دڵنیای لە سڕینەوەی ئەم کڕیارە؟')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(lead.id)} className="bg-destructive text-destructive-foreground">{L('حذف', 'سڕینەوە')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      <LossReasonDialog
        open={showLossDialog}
        onClose={() => setShowLossDialog(false)}
        onConfirm={handleConfirmLoss}
        reasons={lossReasons}
        L={L}
      />
    </>
  );
}