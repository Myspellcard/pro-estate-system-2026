import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Percent, Calendar } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';

export default function CommissionForm({ open, onClose, onSave, editing, contracts = [] }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();
  const [form, setForm] = useState({
    contract_id: '',
    contract_type: 'rent',
    commission_date: new Date().toISOString().slice(0, 10),
    seller_commission: 0,
    buyer_commission: 0,
    seller_commission_paid: false,
    buyer_commission_paid: false,
    seller_commission_paid_date: '',
    buyer_commission_paid_date: '',
    notes: '',
    currency: 'IQD',
    currency_symbol: 'د.ع',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        contract_id: editing.contract_id || '',
        contract_type: editing.contract_type || 'rent',
        commission_date: editing.commission_date || new Date().toISOString().slice(0, 10),
        seller_commission: editing.seller_commission || 0,
        buyer_commission: editing.buyer_commission || 0,
        seller_commission_paid: editing.seller_commission_paid || false,
        buyer_commission_paid: editing.buyer_commission_paid || false,
        seller_commission_paid_date: editing.seller_commission_paid_date || '',
        buyer_commission_paid_date: editing.buyer_commission_paid_date || '',
        notes: editing.notes || '',
        currency: editing.currency || 'IQD',
        currency_symbol: editing.currency_symbol || 'د.ع',
      });
    } else {
      setForm({
        contract_id: '', contract_type: 'rent',
        commission_date: new Date().toISOString().slice(0, 10),
        seller_commission: 0, buyer_commission: 0,
        seller_commission_paid: false, buyer_commission_paid: false,
        seller_commission_paid_date: '', buyer_commission_paid_date: '',
        notes: '', currency: 'IQD', currency_symbol: 'د.ع',
      });
    }
  }, [editing, open]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filteredContracts = contracts.filter(c => {
    const ctype = form.contract_type;
    if (ctype === 'rent') return c.__rent;
    return c.__sale;
  });

  const handleContractChange = (cid) => {
    const c = contracts.find(x => x.id === cid);
    if (!c) { set('contract_id', ''); return; }
    if (c.__rent) {
      setForm(p => ({
        ...p, contract_id: cid, contract_number: c.contract_number || '',
        property_name: c.property_name || '',
        party1_name: c.owner_name || '', party1_role: 'owner', party1_phone: c.owner_phone || '',
        party2_name: c.tenant_name || '', party2_role: 'tenant', party2_phone: c.tenant_phone || '',
        currency: c.currency || 'IQD', currency_symbol: c.currency_symbol || 'د.ع',
      }));
    } else {
      setForm(p => ({
        ...p, contract_id: cid, contract_number: c.contract_number || '',
        property_name: c.property_name || '',
        party1_name: c.seller_name || '', party1_role: 'seller', party1_phone: c.seller_phone || '',
        party2_name: c.buyer_name || '', party2_role: 'buyer', party2_phone: c.buyer_phone || '',
        currency: c.currency || 'IQD', currency_symbol: c.currency_symbol || 'د.ع',
      }));
    }
  };

  const handleSubmit = () => {
    if (!form.contract_id) return;
    onSave({
      ...form,
      seller_commission: Number(form.seller_commission) || 0,
      buyer_commission: Number(form.buyer_commission) || 0,
      branch_id: activeBranch?.id,
      status: (form.seller_commission_paid && form.buyer_commission_paid) ? 'completed'
        : (form.seller_commission_paid || form.buyer_commission_paid) ? 'partial' : 'pending',
    });
  };

  const canSave = form.contract_id && form.commission_date;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg text-right">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-amber-600" />
            {editing ? L('تعديل العمولة', 'دەستکاری کرێ') : L('إضافة عمولة', 'زیادکردنی کرێ')}
          </DialogTitle>
          <DialogDescription>{L('اختر العقد وأدخل مبالغ العمولة للطرفين.', 'گرێبەست هەڵبژێرە و کرێی لایەنەکان بنووسە.')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contract type + selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{L('نوع العقد', 'جۆری گرێبەست')}</Label>
              <Select value={form.contract_type} onValueChange={(v) => { set('contract_type', v); set('contract_id', ''); }}>
                <SelectTrigger className="bg-slate-50/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">{L('عقد إيجار', 'گرێبەستی کرێ')}</SelectItem>
                  <SelectItem value="sale">{L('عقد بيع', 'گرێبەستی فرۆشتن')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{L('العقد', 'گرێبەست')}</Label>
              <Select value={form.contract_id} onValueChange={handleContractChange}>
                <SelectTrigger className="bg-slate-50/60"><SelectValue placeholder={L('اختر العقد...', 'گرێبەست هەڵبژێرە...')} /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredContracts.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">{L('لا توجد عقود.', 'هیچ گرێبەستێک نییە.')}</div>
                  )}
                  {filteredContracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.contract_number || '—') + ' · ' + (c.property_name || c.tenant_name || c.buyer_name || '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Party info (read-only autofill) */}
          {form.contract_id && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">{L('المالك/البائع:', 'خاوەن/فرۆشیار:')}</span> <span className="font-medium">{form.party1_name || '—'}</span></div>
              <div><span className="text-muted-foreground">{L('المستأجر/المشتري:', 'کرێچی/کڕیار:')}</span> <span className="font-medium">{form.party2_name || '—'}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">{L('العقار:', 'خانوو:')}</span> <span className="font-medium">{form.property_name || '—'}</span></div>
            </div>
          )}

          {/* Commission amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-700">{L('عمولة المالك/البائع', 'کرێی خاوەن/فرۆشیار')}</Label>
              <Input type="number" value={form.seller_commission} onChange={e => set('seller_commission', e.target.value)} className="bg-slate-50/60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-blue-700">{L('عمولة المستأجر/المشتري', 'کرێی کرێچی/کڕیار')}</Label>
              <Input type="number" value={form.buyer_commission} onChange={e => set('buyer_commission', e.target.value)} className="bg-slate-50/60" />
            </div>
          </div>

          {/* Paid toggles + dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={form.seller_commission_paid} onChange={e => set('seller_commission_paid', e.target.checked)} className="w-4 h-4 accent-amber-600" />
                {L('تم دفع عمولة المالك', 'کرێی خاوەن دراوە')}
              </label>
              {form.seller_commission_paid && (
                <Input type="date" value={form.seller_commission_paid_date} onChange={e => set('seller_commission_paid_date', e.target.value)} className="bg-slate-50/60 text-xs h-8" />
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" checked={form.buyer_commission_paid} onChange={e => set('buyer_commission_paid', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                {L('تم دفع عمولة المشتري', 'کرێی کڕیار دراوە')}
              </label>
              {form.buyer_commission_paid && (
                <Input type="date" value={form.buyer_commission_paid_date} onChange={e => set('buyer_commission_paid_date', e.target.value)} className="bg-slate-50/60 text-xs h-8" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" />{L('تاريخ العمولة', 'بەرواری کرێ')}</Label>
              <Input type="date" value={form.commission_date} onChange={e => set('commission_date', e.target.value)} className="bg-slate-50/60" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{L('رقم الوصل', 'ژمارەی وەسڵ')}</Label>
              <Input value={form.invoice_number || ''} onChange={e => set('invoice_number', e.target.value)} className="bg-slate-50/60" placeholder={L('اختياري', 'ئارەزوومەندانە')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{L('ملاحظات', 'تێبینی')}</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="resize-none bg-slate-50/60" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
          <Button onClick={handleSubmit} disabled={!canSave} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Percent className="w-4 h-4" />
            {editing ? L('حفظ', 'پاشەکەوت') : L('إضافة', 'زیادکردن')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}