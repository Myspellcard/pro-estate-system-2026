import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Banknote, Plus, Undo2, RotateCcw, ArrowLeftRight, Shield, Printer, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrencies } from '@/hooks/useCurrencies';
import { printTempPayment } from '@/utils/printTempPayment';

const STATUS_AR_KU = {
  'محتجز': ['محتجز', 'ئامێرکراو'],
  'مسترد للمستأجر': ['مُسترد للمستأجر', 'گەڕێندراوە بۆ کرێچی'],
  'مدفوع للمالك': ['مُدفع للمالك', 'دراوە بە خاوەن'],
  'محوّل للتأمين': ['محوّل للتأمين', 'گۆڕدراو بۆ دڵنیایی'],
};
const STATUS_STYLE = {
  'محتجز': 'bg-amber-100 text-amber-700 border-amber-300',
  'مسترد للمستأجر': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'مدفوع للمالك': 'bg-blue-100 text-blue-700 border-blue-300',
  'محوّل للتأمين': 'bg-sky-100 text-sky-700 border-sky-300',
};

const RESOLVE_META = {
  'مسترد للمستأجر': { Icon: Undo2, btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', titleAr: 'استرداد الدفعة للمستأجر', titleKu: 'گەڕاندنەوەی پارە بۆ کرێچی', iconColor: 'text-emerald-600' },
  'مدفوع للمالك': { Icon: ArrowLeftRight, btn: 'bg-blue-600 hover:bg-blue-700 text-white', titleAr: 'تحويل الدفعة للمالك', titleKu: 'دانی پارە بە خاوەن', iconColor: 'text-blue-600' },
  'محوّل للتأمين': { Icon: Shield, btn: 'bg-sky-600 hover:bg-sky-700 text-white', titleAr: 'خصم الدفعة من التأمين', titleKu: 'دابەزاندنی پارە لە دڵنیایی', iconColor: 'text-sky-600' },
};

export default function TempPaymentSection({ contract }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => (lang === 'ku' ? ku : ar);
  const { can, isAdmin } = useUserPermissions();
  const canEdit = isAdmin || can('can_edit_contracts');
  const queryClient = useQueryClient();
  const { currencies } = useCurrencies();
  const symbol = contract.currency_symbol || 'د.ع';
  const fd = (d) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';

  const { data: branch } = useQuery({
    queryKey: ['branch', contract.branch_id],
    queryFn: () => contract.branch_id ? firebaseApi.entities.Branch.get(contract.branch_id) : null,
    enabled: !!contract.branch_id,
  });

  const { data: contractInvoices = [] } = useQuery({
    queryKey: ['invoices', 'contract', contract.id],
    queryFn: () => firebaseApi.entities.Invoice.filter({ contract_id: contract.id }),
    enabled: !!contract.id,
  });
  const tempInvoices = contractInvoices.filter(inv => (inv.invoice_number || '').startsWith('TMP-'));
  const refundInvoices = contractInvoices.filter(inv => (inv.invoice_number || '').startsWith('RFD-'));
  const ownerInvoices = contractInvoices.filter(inv => (inv.invoice_number || '').startsWith('OWN-'));

  const [showRecord, setShowRecord] = useState(false);
  const [resolveAction, setResolveAction] = useState(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState(symbol);
  const [validityDays, setValidityDays] = useState(contract.temp_payment_validity_days ? String(contract.temp_payment_validity_days) : '');

  const [editingTempId, setEditingTempId] = useState(null);
  const [tempInvAmount, setTempInvAmount] = useState('');
  const [tempInvDate, setTempInvDate] = useState('');
  const [editingRefundId, setEditingRefundId] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [editingOwnerId, setEditingOwnerId] = useState(null);
  const [ownerAmount, setOwnerAmount] = useState('');
  const [ownerDate, setOwnerDate] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const recordMut = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      await firebaseApi.entities.Invoice.create({
        invoice_number: `TMP-${contract.contract_number}-${Date.now().toString().slice(-6)}`,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        tenant_name: contract.tenant_name,
        owner_name: contract.owner_name,
        property_name: contract.property_name,
        type: 'أخرى',
        type_ku: 'پارەی کاتی',
        status: 'معلقة',
        status_ku: 'چاوەڕوان',
        amount: amt,
        due_date: date,
        notes: notes || L('دفعة مؤقتة محتجزة', 'پارەی کاتی ئامێرکراو'),
        created_date: new Date().toISOString(),
      });
      await firebaseApi.entities.Contract.update(contract.id, {
        temp_payment_amount: amt,
        temp_payment_date: date,
        temp_payment_status: 'محتجز',
        temp_payment_validity_days: Number(validityDays) || null,
        temp_payment_notes: notes || null,
      });
    },
    onSuccess: () => { invalidate(); setShowRecord(false); setAmount(''); setNotes(''); setDate(new Date().toISOString().split('T')[0]); },
  });

  const resolveMut = useMutation({
    mutationFn: (data) => firebaseApi.entities.Contract.update(contract.id, data),
    onSuccess: () => { invalidate(); setResolveAction(null); setNotes(''); },
  });

  const revertMut = useMutation({
    mutationFn: () => firebaseApi.entities.Contract.update(contract.id, {
      temp_payment_status: 'محتجز',
      temp_payment_resolution_date: null,
    }),
    onSuccess: () => invalidate(),
  });

  const hasPayment = Number(contract.temp_payment_amount) > 0;
  const status = contract.temp_payment_status || 'محتجز';
  const isHeld = status === 'محتجز';
  const statusLabel = (s) => { const [ar, ku] = STATUS_AR_KU[s] || [s, s]; return L(ar, ku); };

  const isCancelled = contract.status === 'ملغي' || contract.status === 'هەڵوەشاوە';
  const isApproved = !!contract.is_verified;
  const showRefund = !isApproved || isCancelled;
  const showPostApproval = isApproved && !isCancelled;

  const handleRecord = () => {
    if (!Number(amount) || Number(amount) <= 0) return;
    recordMut.mutate();
  };

  const handleResolve = async () => {
    const amt = Number(contract.temp_payment_amount);
    const todayStr = new Date().toISOString().split('T')[0];
    if (resolveAction === 'مسترد للمستأجر') {
      await firebaseApi.entities.Invoice.create({
        invoice_number: `RFD-${contract.contract_number}-${Date.now().toString().slice(-6)}`,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        tenant_name: contract.tenant_name,
        owner_name: contract.owner_name,
        property_name: contract.property_name,
        type: 'استرداد',
        type_ku: 'گەڕاندنەوە',
        status: 'مدفوعة',
        status_ku: 'پارەدراو',
        amount: amt,
        due_date: todayStr,
        paid_date: todayStr,
        notes: L('استرداد الدفعة المؤقتة للمستأجر', 'گەڕاندنەوەی پارەی کاتی بۆ کرێچی'),
        created_date: new Date().toISOString(),
      });
    } else if (resolveAction === 'مدفوع للمالك') {
      await firebaseApi.entities.Invoice.create({
        invoice_number: `OWN-${contract.contract_number}-${Date.now().toString().slice(-6)}`,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        tenant_name: contract.tenant_name,
        owner_name: contract.owner_name,
        property_name: contract.property_name,
        type: 'دفع_للمالك',
        type_ku: 'پارەدان بۆ خاوەن',
        status: 'مدفوعة',
        status_ku: 'پارەدراو',
        amount: amt,
        due_date: todayStr,
        paid_date: todayStr,
        notes: L('تحويل الدفعة المؤقتة للمالك', 'دانی پارەی کاتی بە خاوەن'),
        created_date: new Date().toISOString(),
      });
    } else if (resolveAction === 'محوّل للتأمين') {
      await firebaseApi.entities.Invoice.create({
        invoice_number: `INV-${contract.contract_number}-INS-${Date.now().toString().slice(-6)}`,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        tenant_name: contract.tenant_name,
        property_name: contract.property_name,
        type: 'تأمين',
        type_ku: 'دڵنیایی',
        status: 'مدفوعة',
        status_ku: 'پارەدراو',
        amount: amt,
        due_date: todayStr,
        paid_date: todayStr,
        notes: L('تحويل الدفعة المؤقتة للتأمين', 'گۆڕینی پارەی کاتی بۆ دڵنیایی'),
        created_date: new Date().toISOString(),
      });
    }
    resolveMut.mutate({
      temp_payment_status: resolveAction,
      temp_payment_resolution_date: todayStr,
      temp_payment_notes: [contract.temp_payment_notes, notes].filter(Boolean).join(' | '),
    });
  };

  const doPrint = (amt, d, st, invNotes) => {
    printTempPayment({ contract, branch, lang, amount: amt, date: d, status: st, notes: invNotes, validityDays: contract.temp_payment_validity_days, currencySymbol: symbol });
  };

  // Temp invoices list actions
  const handleStartTempEdit = (inv) => { setEditingTempId(inv.id); setTempInvAmount(String(inv.amount || '')); setTempInvDate(inv.due_date || inv.paid_date || new Date().toISOString().split('T')[0]); };
  const handleSaveTempEdit = async (inv) => {
    const amt = Number(tempInvAmount);
    if (!amt || amt <= 0) return;
    await firebaseApi.entities.Invoice.update(inv.id, { amount: amt, due_date: tempInvDate });
    const latest = tempInvoices.filter(t => t.id !== inv.id).concat([{ ...inv, amount: amt, due_date: tempInvDate }]);
    const top = latest.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))[0];
    if (top) await firebaseApi.entities.Contract.update(contract.id, { temp_payment_amount: top.amount, temp_payment_date: top.due_date });
    invalidate();
    setEditingTempId(null);
  };
  const handleDeleteTemp = async (inv) => {
    try { await firebaseApi.entities.Invoice.delete(inv.id); } catch (err) { if (!String(err?.message || '').includes('not found')) throw err; }
    const remaining = tempInvoices.filter(t => t.id !== inv.id);
    if (remaining.length === 0) {
      await firebaseApi.entities.Contract.update(contract.id, { temp_payment_amount: null, temp_payment_date: null, temp_payment_status: 'محتجز', temp_payment_resolution_date: null });
    }
    invalidate();
  };

  // Refund invoices list actions
  const handleStartRefundEdit = (inv) => { setEditingRefundId(inv.id); setRefundAmount(String(inv.amount || '')); setRefundDate(inv.paid_date || inv.due_date || new Date().toISOString().split('T')[0]); };
  const handleSaveRefundEdit = async (inv) => {
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) return;
    await firebaseApi.entities.Invoice.update(inv.id, { amount: amt, due_date: refundDate, paid_date: refundDate });
    invalidate();
    setEditingRefundId(null);
  };
  const handleDeleteRefund = async (inv) => {
    try { await firebaseApi.entities.Invoice.delete(inv.id); } catch (err) { if (!String(err?.message || '').includes('not found')) throw err; }
    const remaining = refundInvoices.filter(r => r.id !== inv.id);
    if (remaining.length === 0) await firebaseApi.entities.Contract.update(contract.id, { temp_payment_status: 'محتجز', temp_payment_resolution_date: null });
    invalidate();
  };

  // Owner invoices list actions
  const handleStartOwnerEdit = (inv) => { setEditingOwnerId(inv.id); setOwnerAmount(String(inv.amount || '')); setOwnerDate(inv.paid_date || inv.due_date || new Date().toISOString().split('T')[0]); };
  const handleSaveOwnerEdit = async (inv) => {
    const amt = Number(ownerAmount);
    if (!amt || amt <= 0) return;
    await firebaseApi.entities.Invoice.update(inv.id, { amount: amt, due_date: ownerDate, paid_date: ownerDate });
    invalidate();
    setEditingOwnerId(null);
  };
  const handleDeleteOwner = async (inv) => {
    try { await firebaseApi.entities.Invoice.delete(inv.id); } catch (err) { if (!String(err?.message || '').includes('not found')) throw err; }
    const remaining = ownerInvoices.filter(o => o.id !== inv.id);
    if (remaining.length === 0) await firebaseApi.entities.Contract.update(contract.id, { temp_payment_status: 'محتجز', temp_payment_resolution_date: null });
    invalidate();
  };

  const meta = resolveAction ? RESOLVE_META[resolveAction] : null;

  const renderInvoiceList = (title, icon, list, colorClasses, statusForPrint, editingId, editAmount, editDate, setEditAmount, setEditDate, onStartEdit, onSaveEdit, onDelete, canDelete = true) => {
    if (list.length === 0) return null;
    return (
      <div className={`px-5 py-4 border-t ${colorClasses.wrap}`}>
        <div className="flex items-center gap-2 mb-2">
          <Banknote className={`w-5 h-5 ${colorClasses.icon}`} />
          <h3 className={`font-bold text-sm ${colorClasses.title}`}>{title}</h3>
        </div>
        <div className="space-y-2">
          {list.map(inv => (
            <div key={inv.id} className={`bg-white rounded-lg border p-3 ${colorClasses.border}`}>
              {editingId === inv.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${colorClasses.title}`}>{L('المبلغ', 'بڕ')}</label>
                      <input type="number" min="0" value={editAmount} onChange={e => setEditAmount(e.target.value)} className={`w-full rounded-lg px-2 py-1.5 text-sm bg-white border ${colorClasses.border}`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${colorClasses.title}`}>{L('التاريخ', 'بەروار')}</label>
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className={`w-full rounded-lg px-2 py-1.5 text-sm bg-white border ${colorClasses.border}`} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => (editingId === inv.id ? (list === tempInvoices ? setEditingTempId(null) : list === refundInvoices ? setEditingRefundId(null) : setEditingOwnerId(null)) : null)} className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-500 text-white hover:bg-gray-600 transition-colors">{L('إلغاء', 'هەڵوەشاندنەوە')}</button>
                    <button onClick={() => onSaveEdit(inv)} disabled={!Number(editAmount)} className={`px-3 py-1 rounded-lg text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${colorClasses.btn}`}>{L('حفظ', 'پاشەکەوت')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-xs font-bold ${colorClasses.title}`}>{inv.invoice_number}</span>
                    <span className="text-xs text-gray-500">{fd(inv.due_date || inv.paid_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className={`text-sm font-black ${colorClasses.title}`}>{Number(inv.amount || 0).toLocaleString()}</span>
                      <span className={`text-xs mr-1 ${colorClasses.title}`}>{symbol}</span>
                    </div>
                    <button onClick={() => doPrint(inv.amount, inv.due_date || inv.paid_date, statusForPrint, inv.notes)} title={L('طباعة', 'چاپکردن')} className={`p-1.5 rounded-lg transition-colors ${colorClasses.iconBg}`}>
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onStartEdit(inv)} title={L('تعديل', 'دەستکاریکردن')} className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button onClick={() => onDelete(inv)} title={L('حذف', 'سڕینەوە')} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="temp-payment-section" className="relative rounded-3xl overflow-hidden shadow-2xl" style={{
      background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)`,
      boxShadow: '0 25px 80px rgba(0,0,0,0.15)'
    }}>
      <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl mb-5" style={{
          background: `linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1))`,
        }}>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-md">
            <Banknote className="w-6 h-6 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-amber-900 text-lg">{L('الدفعة المؤقتة', 'پارەی کاتی')}</h2>
            <p className="text-sm text-amber-700">{L('تُحتجز قبل اعتماد الإذن، وبعد الاعتماد يمكن تحويلها للمالك أو خصمها من التأمين، وفي حال الإلغاء تُسترد للمستأجر', 'پێش دڵنیاکردنەوەی مۆڵەت ئامێرکراوە، دوای دڵنیاکردنەوە دەکرێت بدرێت بە خاوەن یان دابەزێنرێت لە دڵنیایی، و لە هەڵوەشاندنەوە دەگەڕێنرێتەوە بۆ کرێچی')}</p>
          </div>
          {hasPayment && canEdit && isHeld && (
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setResolveAction('مسترد للمستأجر')}>
              <RotateCcw className="w-3.5 h-3.5" />
              {L('إلغاء الدفعة', 'سڕینەوەی پارە')}
            </Button>
          )}
        </div>

        {!hasPayment ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-4">{L('لم تُسجل دفعة مؤقتة بعد', 'هیچ پارەیەکی کاتی تۆمار نەکراوە')}</p>
            {canEdit && (
              <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-1" onClick={() => setShowRecord(true)}>
                <Plus className="w-4 h-4" />
                {L('تسجيل دفعة مؤقتة', 'تۆمارکردنی پارەی کاتی')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-semibold mb-1">{L('المبلغ', 'بڕ')}</p>
                <p className="text-base font-bold text-amber-900">{Number(contract.temp_payment_amount).toLocaleString()}</p>
                <p className="text-xs text-amber-600 font-semibold mt-0.5">{symbol}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 font-semibold mb-1">{L('تاريخ الاستلام', 'بەرواری وەرگرتن')}</p>
                <p className="text-sm font-bold text-slate-800">{contract.temp_payment_date || '—'}</p>
              </div>
              <div className={`border rounded-xl p-3 text-center ${STATUS_STYLE[status] || 'bg-slate-100 border-slate-300'}`}>
                <p className="text-xs font-semibold mb-1">{L('الحالة', 'دۆخ')}</p>
                <p className="text-sm font-bold">{statusLabel(status)}</p>
              </div>
            </div>

            {contract.temp_payment_notes && (
              <div className="mb-4 p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-sm text-amber-800">
                <span className="font-semibold">{L('ملاحظات: ', 'تێبینی: ')}</span>{contract.temp_payment_notes}
              </div>
            )}

            {contract.temp_payment_resolution_date && !isHeld && (
              <p className="text-xs text-slate-400 mb-3">{L('تاريخ التسوية: ', 'بەرواری ڕێکخستن: ')}{contract.temp_payment_resolution_date}</p>
            )}

            {isHeld && (
              <div className="mb-3 text-xs text-slate-500">
                {showPostApproval
                  ? L('بعد اعتماد الإذن: حوّل المبلغ للمالك (لإنشاء العقد) أو خصمه من التأمين.', 'دوای دڵنیاکردنەوەی مۆڵەت: پارەکە بدە بە خاوەن (بۆ دروستکردنی گرێبەست) یان دابەزێنە لە دڵنیایی.')
                  : L('في حال الإلغاء أو عدم الحصول على الإذن: استرد المبلغ للمستأجر.', 'لە هەڵوەشاندنەوە یان نەواندنی مۆڵەت: پارەکە بگەڕێنەوە بۆ کرێچی.')}
              </div>
            )}

            {isHeld && canEdit && (
              <div className="flex flex-wrap gap-2">
                {showRefund && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => setResolveAction('مسترد للمستأجر')}>
                    <Undo2 className="w-4 h-4" />
                    {L('استرداد للمستأجر', 'گەڕاندنەوە بۆ کرێچی')}
                  </Button>
                )}
                {showPostApproval && (
                  <>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1" onClick={() => setResolveAction('مدفوع للمالك')}>
                      <ArrowLeftRight className="w-4 h-4" />
                      {L('تحويل للمالك', 'دانی بە خاوەن')}
                    </Button>
                    {Number(contract.insurance_amount) > 0 && (
                      <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-1" onClick={() => setResolveAction('محوّل للتأمين')}>
                        <Shield className="w-4 h-4" />
                        {L('خصم من التأمين', 'دابەزاندن لە دڵنیایی')}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {!isHeld && (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-xs text-slate-500">{L('تمت تسوية هذه الدفعة.', 'ئەم پارەیە ڕێکخراوە.')}</p>
                {canEdit && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => revertMut.mutate()} disabled={revertMut.isPending}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    {L('إرجاع للدفعة المؤقتة', 'گەڕاندنەوە بۆ پارەی کاتی')}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Temp payment invoices history */}
      {renderInvoiceList(
        L('وصولات الدفعة المؤقتة', 'وەسڵەکانی پارەی کاتی'), null, tempInvoices,
        { wrap: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', title: 'text-amber-800', border: 'border-amber-200', iconBg: 'bg-amber-100 text-amber-700 hover:bg-amber-200', btn: 'bg-amber-600 hover:bg-amber-700' },
        'محتجز', editingTempId, tempInvAmount, tempInvDate, setTempInvAmount, setTempInvDate, handleStartTempEdit, handleSaveTempEdit, handleDeleteTemp,
        !(contract.temp_payment_status === 'مسترد للمستأجر' || contract.temp_payment_status === 'مدفوع للمالك')
      )}

      {/* Refund invoices history */}
      {renderInvoiceList(
        L('وصولات الاسترداد للمستأجر', 'وەسڵەکانی گەڕاندنەوە بۆ کرێچی'), null, refundInvoices,
        { wrap: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600', title: 'text-emerald-800', border: 'border-emerald-200', iconBg: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700' },
        'مسترد للمستأجر', editingRefundId, refundAmount, refundDate, setRefundAmount, setRefundDate, handleStartRefundEdit, handleSaveRefundEdit, handleDeleteRefund
      )}

      {/* Owner transfer invoices history */}
      {renderInvoiceList(
        L('وصولات التحويل للمالك', 'وەسڵەکانی دان بە خاوەن'), null, ownerInvoices,
        { wrap: 'bg-blue-50 border-blue-200', icon: 'text-blue-600', title: 'text-blue-800', border: 'border-blue-200', iconBg: 'bg-blue-100 text-blue-700 hover:bg-blue-200', btn: 'bg-blue-600 hover:bg-blue-700' },
        'مدفوع للمالك', editingOwnerId, ownerAmount, ownerDate, setOwnerAmount, setOwnerDate, handleStartOwnerEdit, handleSaveOwnerEdit, handleDeleteOwner
      )}

      {/* Record dialog */}
      {showRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Banknote className="w-8 h-8 text-amber-600" />
              <h2 className="font-bold text-lg">{L('تسجيل دفعة مؤقتة', 'تۆمارکردنی پارەی کاتی')}</h2>
            </div>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-1 block">{L('المبلغ', 'بڕ')} *</label>
                  <input type="number" min="1" className="w-full border border-border rounded-xl p-3 text-sm bg-background" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">{L('العملة', 'دراو')}</label>
                  <select value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className="w-full border border-border rounded-xl p-3 text-sm bg-background">
                    {currencies.map(c => <option key={c.id} value={c.symbol}>{c.code} ({c.symbol})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('تاريخ الاستلام', 'بەرواری وەرگرتن')}</label>
                <input type="date" className="w-full border border-border rounded-xl p-3 text-sm bg-background" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('مدة الصلاحية (أيام)', 'ماوەی بەسەرچوون (ڕۆژ)')}</label>
                <input type="number" min="0" className="w-full border border-border rounded-xl p-3 text-sm bg-background" value={validityDays} onChange={e => setValidityDays(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('ملاحظات', 'تێبینی')}</label>
                <textarea className="w-full border border-border rounded-xl p-3 text-sm bg-background min-h-[60px] resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder={L('ملاحظات اختيارية...', 'تێبینیی ئارەزوومەندانە...')} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowRecord(false); setAmount(''); setNotes(''); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleRecord} disabled={recordMut.isPending || !amount || Number(amount) <= 0}>
                {recordMut.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('تأكيد', 'دڵنیاکردنەوە')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve dialog */}
      {resolveAction && meta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <meta.Icon className={`w-8 h-8 ${meta.iconColor}`} />
              <h2 className="font-bold text-lg">{L(meta.titleAr, meta.titleKu)}</h2>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 mb-4 text-sm flex justify-between items-center">
              <span className="text-muted-foreground font-medium">{L('مبلغ الدفعة:', 'بڕی پارە:')}</span>
              <span className="font-bold">{Number(contract.temp_payment_amount).toLocaleString()} {symbol}</span>
            </div>
            {resolveAction !== 'مسترد للمستأجر' && (
              <p className="text-xs text-slate-500 mb-3">
                {resolveAction === 'مدفوع للمالك'
                  ? L('سيتم تسجيل دفعة مدفوعة للمالك بقيمة الدفعة المؤقتة.', 'پارەیەکی دراو بۆ خاوەن بە بڕی پارەی کاتی تۆمار دەکرێت.')
                  : L('سيتم تسجيل دفعة تأمين مدفوعة بقيمة الدفعة المؤقتة (تُخصم من المتبقي من التأمين).', 'پارەیەکی دڵنیایی دراو بە بڕی پارەی کاتی تۆمار دەکرێت (دابەزێنرێت لە ماوەتەی دڵنیایی).')}
              </p>
            )}
            <div className="mb-4">
              <label className="text-sm font-semibold mb-1 block">{L('ملاحظات (اختياري)', 'تێبینی (ئارەزوومەندانە)')}</label>
              <textarea className="w-full border border-border rounded-xl p-3 text-sm bg-background min-h-[60px] resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder={L('سبب التسوية...', 'هۆکاری ڕێکخستن...')} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setResolveAction(null); setNotes(''); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button className={meta.btn} onClick={handleResolve} disabled={resolveMut.isPending}>
                {resolveMut.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('تأكيد', 'دڵنیاکردنەوە')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}