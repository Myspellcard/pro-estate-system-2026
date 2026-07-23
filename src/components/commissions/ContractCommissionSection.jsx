import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Percent, Plus, Printer, Pencil, Trash2, CheckCircle2, Clock, Banknote } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { printCommissionInvoice } from './CommissionPrint';
import { generateCommissionInvoiceNumber } from '@/utils/commissionNumber';

/**
 * Reusable commission section embedded inside a rent or sale contract detail.
 * props:
 *   contract: the Contract or SaleContract object
 *   contractType: 'rent' | 'sale'
 */
export default function ContractCommissionSection({ contract, contractType }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { can, isAdmin } = useUserPermissions();
  const canEdit = isAdmin || can('can_edit_commissions');
  const canDelete = isAdmin || can('can_delete_commissions');
  const canPrint = isAdmin || can('can_print_commissions');
  const canViewSeller = isAdmin || can('can_view_seller_commissions');
  const canViewBuyer = isAdmin || can('can_view_buyer_commissions');
  const queryClient = useQueryClient();

  const currencySymbol = contract.currency_symbol || (contract.currency === 'USD' ? '$' : contract.currency === 'EUR' ? '€' : 'د.ع');

  // Derive party info from the contract
  const partyInfo = contractType === 'rent'
    ? { party1_name: contract.owner_name, party1_role: 'owner', party1_phone: contract.owner_phone, party2_name: contract.tenant_name, party2_role: 'tenant', party2_phone: contract.tenant_phone }
    : { party1_name: contract.seller_name, party1_role: 'seller', party1_phone: contract.seller_phone, party2_name: contract.buyer_name, party2_role: 'buyer', party2_phone: contract.buyer_phone };

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions', contract.id],
    queryFn: () => firebaseApi.entities.Commission.filter({ contract_id: contract.id }),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => firebaseApi.entities.Branch.list(),
  });
  const branch = branches.find(b => b.id === contract.branch_id) || branches[0] || null;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [form, setForm] = useState(defaultForm());

  function defaultForm() {
    return {
      commission_date: new Date().toISOString().slice(0, 10),
      seller_commission: 0,
      buyer_commission: 0,
      seller_commission_paid: false,
      buyer_commission_paid: false,
      seller_commission_paid_date: '',
      buyer_commission_paid_date: '',
      invoice_number: '',
      notes: '',
    };
  }

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      commission_date: c.commission_date || new Date().toISOString().slice(0, 10),
      seller_commission: c.seller_commission || 0,
      buyer_commission: c.buyer_commission || 0,
      seller_commission_paid: c.seller_commission_paid || false,
      buyer_commission_paid: c.buyer_commission_paid || false,
      seller_commission_paid_date: c.seller_commission_paid_date || '',
      buyer_commission_paid_date: c.buyer_commission_paid_date || '',
      invoice_number: c.invoice_number || '',
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        contract_id: contract.id,
        contract_number: contract.contract_number || '',
        contract_type: contractType,
        branch_id: contract.branch_id,
        property_id: contract.property_id,
        property_name: contract.property_name || '',
        ...partyInfo,
        currency: contract.currency || 'IQD',
        currency_symbol: currencySymbol,
        currency_rate_to_iqd: contract.currency_rate_to_iqd || 1,
        seller_commission: Number(data.seller_commission) || 0,
        buyer_commission: Number(data.buyer_commission) || 0,
        status: (data.seller_commission_paid && data.buyer_commission_paid) ? 'completed'
          : (data.seller_commission_paid || data.buyer_commission_paid) ? 'partial' : 'pending',
      };
      if (editing) return firebaseApi.entities.Commission.update(editing.id, payload);
      if (!payload.invoice_number) {
        try { payload.invoice_number = await generateCommissionInvoiceNumber(contractType); } catch (_) {}
      }
      return firebaseApi.entities.Commission.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commissions', contract.id] });
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Commission.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['commissions', contract.id] });
      setDeleteTarget(null);
    },
  });

  const totalSeller = commissions.reduce((s, c) => s + (c.seller_commission || 0), 0);
  const totalBuyer = commissions.reduce((s, c) => s + (c.buyer_commission || 0), 0);

  const party1Label = contractType === 'rent' ? L('المالك', 'خاوەن') : L('البائع', 'فرۆشیار');
  const party2Label = contractType === 'rent' ? L('المستأجر', 'کرێچی') : L('المشتري', 'کڕیار');

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{
      background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)`,
      boxShadow: '0 25px 80px rgba(0,0,0,0.15)'
    }}>
      <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl mb-5" style={{
          background: `linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1))`,
        }}>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-md">
            <Percent className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-amber-900 text-lg">{contractType === 'sale' ? L('العمولات', 'دەلالیەکان') : L('العمولات', 'کرێکان')}</h2>
            <p className="text-sm text-amber-700">{contractType === 'sale' ? L('عمولات هذا العقد', 'دەلالیەکانی ئەم گرێبەستە') : L('عمولات هذا العقد', 'کرێی ئەم گرێبەستە')}</p>
          </div>
          {canEdit && (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1" onClick={openAdd}>
              <Plus className="w-4 h-4" />
              {L('إضافة عمولة', 'زیادکردنی کرێ')}
            </Button>
          )}
        </div>

        {/* Summary */}
        {commissions.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {canViewSeller && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-semibold mb-1">{L('عمولة', 'کرێی')} {party1Label}</p>
                <p className="text-base font-bold text-amber-900 leading-tight">{totalSeller.toLocaleString()}</p>
                <p className="text-xs text-amber-600 font-semibold mt-0.5">{currencySymbol}</p>
              </div>
            )}
            {canViewBuyer && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 font-semibold mb-1">{L('عمولة', 'کرێی')} {party2Label}</p>
                <p className="text-base font-bold text-blue-900 leading-tight">{totalBuyer.toLocaleString()}</p>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">{currencySymbol}</p>
              </div>
            )}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center">
              <Percent className="w-8 h-8 text-amber-300" />
            </div>
            <p className="text-sm text-muted-foreground">{L('لا توجد عمولات لهذا العقد بعد', 'هیچ کرێیەک بۆ ئەم گرێبەستە نییە هێشتا')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {commissions.map((c) => {
              const sellerPaid = c.seller_commission_paid;
              const buyerPaid = c.buyer_commission_paid;
              return (
                <div key={c.id} className="border border-amber-200 rounded-xl p-3 bg-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-amber-800 text-sm">{c.invoice_number || (L('عمولة', 'کرێ') + ' ' + (c.commission_date || ''))}</span>
                      <span className="text-xs text-muted-foreground">{c.commission_date}</span>
                    </div>
                    {canViewSeller && Number(c.seller_commission) > 0 && (
                      <div className="flex items-center gap-1.5 text-xs flex-wrap">
                        <span className="text-amber-700 font-medium">{party1Label}: {Number(c.seller_commission).toLocaleString()} {currencySymbol}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sellerPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {sellerPaid ? L('مدفوع', 'دراوە') : L('غير مدفوع', 'نەدراوە')}
                        </span>
                      </div>
                    )}
                    {canViewBuyer && Number(c.buyer_commission) > 0 && (
                      <div className="flex items-center gap-1.5 text-xs flex-wrap">
                        <span className="text-blue-700 font-medium">{party2Label}: {Number(c.buyer_commission).toLocaleString()} {currencySymbol}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${buyerPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {buyerPaid ? L('مدفوع', 'دراوە') : L('غير مدفوع', 'نەدراوە')}
                        </span>
                      </div>
                    )}
                    {c.notes && <p className="text-xs text-muted-foreground truncate">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canPrint && (
                      <Button size="sm" variant="outline" onClick={() => setPrintTarget(c)} className="text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50 h-7 px-2">
                        <Printer className="w-3 h-3" />
                        {L('طباعة', 'چاپ')}
                      </Button>
                    )}
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="text-xs gap-1 h-7 px-2">
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(c)} className="text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50 h-7 px-2">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => !v && setShowForm(false)}>
        <DialogContent dir="rtl" className="max-w-lg text-right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-600" />
              {editing ? L('تعديل العمولة', 'دەستکاری کرێ') : L('إضافة عمولة', 'زیادکردنی کرێ')}
            </DialogTitle>
            <DialogDescription>{L('أدخل مبالغ العمولة للطرفين.', 'کرێی لایەنەکان بنووسە.')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">{party1Label}:</span> <span className="font-medium">{partyInfo.party1_name || '—'}</span></div>
              <div><span className="text-muted-foreground">{party2Label}:</span> <span className="font-medium">{partyInfo.party2_name || '—'}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">{L('العقار:', 'خانوو:')}</span> <span className="font-medium">{contract.property_name || '—'}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {canViewSeller && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-amber-700">{L('عمولة', 'کرێی')} {party1Label} <span className="text-muted-foreground">({currencySymbol})</span></Label>
                  <Input type="number" value={form.seller_commission} onChange={e => set('seller_commission', e.target.value)} className="bg-slate-50/60" />
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input type="checkbox" checked={form.seller_commission_paid} onChange={e => set('seller_commission_paid', e.target.checked)} className="w-4 h-4 accent-amber-600" />
                    {L('تم الدفع', 'دراوە')}
                  </label>
                  {form.seller_commission_paid && (
                    <Input type="date" value={form.seller_commission_paid_date} onChange={e => set('seller_commission_paid_date', e.target.value)} className="bg-slate-50/60 text-xs h-8" />
                  )}
                </div>
              )}
              {canViewBuyer && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-blue-700">{L('عمولة', 'کرێی')} {party2Label} <span className="text-muted-foreground">({currencySymbol})</span></Label>
                  <Input type="number" value={form.buyer_commission} onChange={e => set('buyer_commission', e.target.value)} className="bg-slate-50/60" />
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input type="checkbox" checked={form.buyer_commission_paid} onChange={e => set('buyer_commission_paid', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    {L('تم الدفع', 'دراوە')}
                  </label>
                  {form.buyer_commission_paid && (
                    <Input type="date" value={form.buyer_commission_paid_date} onChange={e => set('buyer_commission_paid_date', e.target.value)} className="bg-slate-50/60 text-xs h-8" />
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1"><Banknote className="w-3 h-3" />{L('تاريخ العمولة', 'بەرواری کرێ')}</Label>
                <Input type="date" value={form.commission_date} onChange={e => set('commission_date', e.target.value)} className="bg-slate-50/60" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{L('رقم الوصل', 'ژمارەی وەسڵ')}</Label>
                <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} className="bg-slate-50/60" placeholder={L('اختياري', 'ئارەزوومەندانە')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{L('ملاحظات', 'تێبینی')}</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="resize-none bg-slate-50/60" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.commission_date || saveMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Percent className="w-4 h-4" />
              {editing ? L('حفظ', 'پاشەکەوت') : L('إضافة', 'زیادکردن')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print selection */}
      <Dialog open={!!printTarget} onOpenChange={(v) => !v && setPrintTarget(null)}>
        <DialogContent dir="rtl" className="max-w-sm text-right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-600" />
              {contractType === 'sale' ? L('طباعة العمولة', 'دەلالی کرین') : L('طباعة العمولة', 'چاپی کرێ')}
            </DialogTitle>
            <DialogDescription>{contractType === 'sale' ? L('اختر جهة العمولة التي تريد طباعتها.', 'لایەنی دەلالی هەڵبژێرە') : L('اختر جهة العمولة التي تريد طباعتها.', 'لایەنی کرێی چاپ بکە هەڵبژێرە.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {Number(printTarget?.seller_commission) > 0 && canViewSeller && (
              <button onClick={() => { printCommissionInvoice(printTarget, L, branch, 'seller'); setPrintTarget(null); }}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 transition-colors text-right">
                <span className="text-sm font-bold text-amber-800">{party1Label}</span>
                <span className="text-xs font-semibold text-amber-700">{Number(printTarget.seller_commission).toLocaleString()} {currencySymbol}</span>
              </button>
            )}
            {Number(printTarget?.buyer_commission) > 0 && canViewBuyer && (
              <button onClick={() => { printCommissionInvoice(printTarget, L, branch, 'buyer'); setPrintTarget(null); }}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 transition-colors text-right">
                <span className="text-sm font-bold text-blue-800">{party2Label}</span>
                <span className="text-xs font-semibold text-blue-700">{Number(printTarget.buyer_commission).toLocaleString()} {currencySymbol}</span>
              </button>
            )}
            {Number(printTarget?.seller_commission) > 0 && Number(printTarget?.buyer_commission) > 0 && canViewSeller && canViewBuyer && (
              <button onClick={() => { printCommissionInvoice(printTarget, L, branch, 'both'); setPrintTarget(null); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700">
                {L('الطرفين معاً', 'هەردوو لایەن')}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent dir="rtl" className="max-w-sm text-right">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {L('حذف العمولة', 'سڕینەوەی کرێ')}
            </DialogTitle>
            <DialogDescription>{L('هل أنت متأكد من حذف هذه العمولة؟', 'دڵنیایت لە سڕینەوەی ئەم کرێیە؟')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {L('حذف', 'سڕینەوە')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}