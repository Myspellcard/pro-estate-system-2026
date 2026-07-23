import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { Receipt, Plus, Search, Trash2, Edit2, X, Save, DollarSign, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/shared/EmptyState';

const L = (ar, ku, lang) => lang === 'ku' ? ku : ar;

const statusColors = {
  'مدفوعة': 'bg-green-100 text-green-800',
  'معلقة': 'bg-yellow-100 text-yellow-800',
  'متأخرة': 'bg-red-100 text-red-800'
};

const typeColors = {
  'دفعة أولى': 'bg-blue-100 text-blue-800',
  'قسط': 'bg-purple-100 text-purple-800',
  'دفعة نهائية': 'bg-green-100 text-green-800',
  'أخرى': 'bg-gray-100 text-gray-800',
  'دفعة للمالك': 'bg-teal-100 text-teal-800',
  'عمولة': 'bg-orange-100 text-orange-800',
  'مصاريف إدارية': 'bg-indigo-100 text-indigo-800',
};

function InvoiceForm({ invoice, contracts, settings, onSubmit, onCancel, isLoading }) {
  const { lang } = useLanguage();
  const numbering = settings?.numbering || {};
  const nextNum = (numbering.sale_invoice_start ?? 1);
  const prefix = numbering.sale_invoice_prefix ?? '';
  const autoNumber = `${prefix}${nextNum}`;

  const [form, setForm] = useState({
    invoice_number: invoice?.invoice_number || autoNumber,
    contract_id: invoice?.contract_id || '',
    type: invoice?.type || 'قسط',
    amount: invoice?.amount || '',
    currency: invoice?.currency || 'IQD',
    currency_symbol: invoice?.currency_symbol || 'د.ع',
    due_date: invoice?.due_date || '',
    paid_date: invoice?.paid_date || '',
    status: invoice?.status || 'معلقة',
    payment_method: invoice?.payment_method || '',
    notes: invoice?.notes || '',
  });

  const selectedContract = contracts.find(c => c.id === form.contract_id);

  const h = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: Number(form.amount) || 0,
      buyer_name: selectedContract?.buyer_name || invoice?.buyer_name || '',
      property_name: selectedContract?.property_name || invoice?.property_name || '',
      contract_number: selectedContract?.contract_number || invoice?.contract_number || '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-[#1a2744]">{invoice ? L('تعديل الفاتورة', 'دەستکاریکردنی وەسڵ', lang) : L('فاتورة بيع جديدة', 'وەسڵی فرۆشتنی نوێ', lang)}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('رقم الفاتورة', 'ژمارەی وەسڵ', lang)}</label>
              <Input value={form.invoice_number} onChange={e => h('invoice_number', e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('عقد البيع', 'گرێبەستی فرۆشتن', lang)}</label>
              <Select value={form.contract_id} onValueChange={v => h('contract_id', v)}>
                <SelectTrigger><SelectValue placeholder={L('اختر العقد', 'گرێبەست هەڵبژێرە', lang)} /></SelectTrigger>
                <SelectContent>
                  {contracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.contract_number} — {c.buyer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('نوع الفاتورة', 'جۆری وەسڵ', lang)}</label>
              <Select value={form.type} onValueChange={v => h('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['دفعة أولى','قسط','دفعة نهائية','أخرى'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('الحالة', 'دۆخ', lang)}</label>
              <Select value={form.status} onValueChange={v => h('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['معلقة','مدفوعة','متأخرة'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('المبلغ', 'بڕ', lang)}</label>
              <Input type="number" value={form.amount} onChange={e => h('amount', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('طريقة الدفع', 'شێوازی پارەدان', lang)}</label>
              <Select value={form.payment_method} onValueChange={v => h('payment_method', v)}>
                <SelectTrigger><SelectValue placeholder={L('اختر', 'هەڵبژێرە', lang)} /></SelectTrigger>
                <SelectContent>
                  {['نقد','تحويل بنكي','شيك'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('تاريخ الاستحقاق', 'بەرواری پێویست', lang)}</label>
              <Input type="date" value={form.due_date} onChange={e => h('due_date', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('تاريخ الدفع', 'بەرواری پارەدان', lang)}</label>
              <Input type="date" value={form.paid_date} onChange={e => h('paid_date', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">{L('ملاحظات', 'تێبینی', lang)}</label>
            <Textarea value={form.notes} onChange={e => h('notes', e.target.value)} rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">{L('إلغاء', 'پاشگەز', lang)}</Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-[#1a2744] hover:bg-[#2a3f6e]">
              <Save className="w-4 h-4 ml-1" />{L('حفظ', 'پاشەکەوت', lang)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SpentForm({ spent, contracts, settings, onSubmit, onCancel, isLoading }) {
  const { lang } = useLanguage();
  const numbering = settings?.numbering || {};
  const nextNum = numbering.sale_owner_spent_start ?? 1;
  const prefix = numbering.sale_owner_spent_prefix ?? '';
  const autoNumber = `${prefix}${nextNum}`;

  const [form, setForm] = useState({
    receipt_number: spent?.receipt_number || autoNumber,
    contract_id: spent?.contract_id || '',
    type: spent?.type || 'دفعة للمالك',
    amount: spent?.amount || '',
    currency: spent?.currency || 'IQD',
    currency_symbol: spent?.currency_symbol || 'د.ع',
    paid_date: spent?.paid_date || '',
    payment_method: spent?.payment_method || '',
    notes: spent?.notes || '',
  });

  const selectedContract = contracts.find(c => c.id === form.contract_id);
  const h = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: Number(form.amount) || 0,
      seller_name: selectedContract?.seller_name || spent?.seller_name || '',
      property_name: selectedContract?.property_name || spent?.property_name || '',
      contract_number: selectedContract?.contract_number || spent?.contract_number || '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-[#1a2744]">{spent ? L('تعديل المصروف', 'دەستکاریکردنی مەسروف', lang) : L('مصروف جديد للمالك', 'مەسروفی نوێ بۆ خاوەن', lang)}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('رقم الإيصال', 'ژمارەی پسوولە', lang)}</label>
              <Input value={form.receipt_number} onChange={e => h('receipt_number', e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('عقد البيع', 'گرێبەستی فرۆشتن', lang)}</label>
              <Select value={form.contract_id} onValueChange={v => h('contract_id', v)}>
                <SelectTrigger><SelectValue placeholder={L('اختر العقد', 'گرێبەست هەڵبژێرە', lang)} /></SelectTrigger>
                <SelectContent>
                  {contracts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.contract_number} — {c.seller_name || c.buyer_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('نوع المصروف', 'جۆری مەسروف', lang)}</label>
              <Select value={form.type} onValueChange={v => h('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['دفعة للمالك','عمولة','مصاريف إدارية','أخرى'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('طريقة الدفع', 'شێوازی پارەدان', lang)}</label>
              <Select value={form.payment_method} onValueChange={v => h('payment_method', v)}>
                <SelectTrigger><SelectValue placeholder={L('اختر', 'هەڵبژێرە', lang)} /></SelectTrigger>
                <SelectContent>
                  {['نقد','تحويل بنكي','شيك'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('المبلغ', 'بڕ', lang)}</label>
              <Input type="number" value={form.amount} onChange={e => h('amount', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('تاريخ الدفع', 'بەرواری پارەدان', lang)}</label>
              <Input type="date" value={form.paid_date} onChange={e => h('paid_date', e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">{L('ملاحظات', 'تێبینی', lang)}</label>
            <Textarea value={form.notes} onChange={e => h('notes', e.target.value)} rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">{L('إلغاء', 'پاشگەز', lang)}</Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-[#1a2744] hover:bg-[#2a3f6e]">
              <Save className="w-4 h-4 ml-1" />{L('حفظ', 'پاشەکەوت', lang)}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaleInvoices() {
  const { lang } = useLanguage();
  const { activeBranch } = useBranch();
  const qc = useQueryClient();
  const [tab, setTab] = useState('invoices');
  const [search, setSearch] = useState('');
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showSpentForm, setShowSpentForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editSpent, setEditSpent] = useState(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ['sale-invoices', activeBranch?.id],
    queryFn: () => firebaseApi.entities.SaleInvoice.filter(activeBranch ? { branch_id: activeBranch.id } : {}),
  });
  const { data: spentList = [] } = useQuery({
    queryKey: ['sale-owner-spent', activeBranch?.id],
    queryFn: () => firebaseApi.entities.SaleOwnerSpent.filter(activeBranch ? { branch_id: activeBranch.id } : {}),
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ['sale-contracts', activeBranch?.id],
    queryFn: () => firebaseApi.entities.SaleContract.filter(activeBranch ? { branch_id: activeBranch.id } : {}),
  });
  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });
  const settings = settingsList.find(s => s.key === 'default');

  // Invoice mutations
  const createInvoiceMut = useMutation({
    mutationFn: async (data) => {
      const inv = await firebaseApi.entities.SaleInvoice.create({ ...data, branch_id: activeBranch?.id, created_date: new Date().toISOString() });
      // increment counter
      const num = settings?.numbering?.sale_invoice_start ?? 1;
      if (settings?.id) await firebaseApi.entities.AppSettings.update(settings.id, { numbering: { ...(settings.numbering || {}), sale_invoice_start: num + 1 } });
      return inv;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-invoices'] }); qc.invalidateQueries({ queryKey: ['app_settings'] }); setShowInvoiceForm(false); },
  });
  const updateInvoiceMut = useMutation({
    mutationFn: (data) => firebaseApi.entities.SaleInvoice.update(editInvoice.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-invoices'] }); setEditInvoice(null); },
  });
  const deleteInvoiceMut = useMutation({
    mutationFn: (id) => firebaseApi.entities.SaleInvoice.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-invoices'] }),
  });

  // Spent mutations
  const createSpentMut = useMutation({
    mutationFn: async (data) => {
      const s = await firebaseApi.entities.SaleOwnerSpent.create({ ...data, branch_id: activeBranch?.id, created_date: new Date().toISOString() });
      const num = settings?.numbering?.sale_owner_spent_start ?? 1;
      if (settings?.id) await firebaseApi.entities.AppSettings.update(settings.id, { numbering: { ...(settings.numbering || {}), sale_owner_spent_start: num + 1 } });
      return s;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-owner-spent'] }); qc.invalidateQueries({ queryKey: ['app_settings'] }); setShowSpentForm(false); },
  });
  const updateSpentMut = useMutation({
    mutationFn: (data) => firebaseApi.entities.SaleOwnerSpent.update(editSpent.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-owner-spent'] }); setEditSpent(null); },
  });
  const deleteSpentMut = useMutation({
    mutationFn: (id) => firebaseApi.entities.SaleOwnerSpent.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-owner-spent'] }),
  });

  const filteredInvoices = invoices.filter(i =>
    !search || i.buyer_name?.includes(search) || i.invoice_number?.includes(search) || i.contract_number?.includes(search)
  );
  const filteredSpent = spentList.filter(s =>
    !search || s.seller_name?.includes(search) || s.receipt_number?.includes(search) || s.contract_number?.includes(search)
  );

  const totalInvoices = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'مدفوعة').reduce((s, i) => s + (i.amount || 0), 0);
  const totalSpent = spentList.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">{L('فواتير المبيعات والمصاريف', 'وەسڵ و مەسروفەکانی فرۆشتن', lang)}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{L('إدارة فواتير البيع ومصاريف المالك', 'بەڕێوەبردنی وەسڵەکانی فرۆشتن و مەسروفەکانی خاوەن', lang)}</p>
        </div>
        <Button
          onClick={() => tab === 'invoices' ? setShowInvoiceForm(true) : setShowSpentForm(true)}
          className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2"
        >
          <Plus className="w-4 h-4" />
          {tab === 'invoices' ? L('فاتورة جديدة', 'وەسڵی نوێ', lang) : L('مصروف جديد', 'مەسروفی نوێ', lang)}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">{L('إجمالي الفواتير', 'کۆی وەسڵەکان', lang)}</p>
          <p className="text-xl font-bold text-[#1a2744] mt-1">{totalInvoices.toLocaleString()} <span className="text-sm font-normal">د.ع</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">{L('المدفوع', 'پارەدراو', lang)}</p>
          <p className="text-xl font-bold text-green-600 mt-1">{totalPaid.toLocaleString()} <span className="text-sm font-normal">د.ع</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">{L('مصاريف المالك', 'مەسروفی خاوەن', lang)}</p>
          <p className="text-xl font-bold text-teal-600 mt-1">{totalSpent.toLocaleString()} <span className="text-sm font-normal">د.ع</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'invoices' ? 'border-[#1a2744] text-[#1a2744]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Receipt className="w-4 h-4" />
          {L('فواتير البيع', 'وەسڵەکانی فرۆشتن', lang)} ({invoices.length})
        </button>
        <button
          onClick={() => setTab('spent')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === 'spent' ? 'border-[#1a2744] text-[#1a2744]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 className="w-4 h-4" />
          {L('مصاريف المالك', 'مەسروفی خاوەن', lang)} ({spentList.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder={L('بحث...', 'گەڕان...', lang)}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        filteredInvoices.length === 0 ? (
          <EmptyState icon={Receipt} title={L('لا توجد فواتير', 'هیچ وەسڵێک نییە', lang)} description={L('أضف فاتورة بيع جديدة', 'وەسڵێکی فرۆشتنی نوێ زیاد بکە', lang)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#1a2744] font-mono">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{inv.contract_number}</p>
                  </div>
                  <Badge className={statusColors[inv.status] || 'bg-gray-100 text-gray-800'}>{inv.status}</Badge>
                </div>
                <Badge className={`${typeColors[inv.type] || 'bg-gray-100 text-gray-800'} mb-3`}>{inv.type}</Badge>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{L('المشتري:', 'کڕیار:', lang)}</span><span className="font-medium">{inv.buyer_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{L('المبلغ:', 'بڕ:', lang)}</span><span className="font-bold text-[#1a2744]">{inv.amount?.toLocaleString()} {inv.currency_symbol || 'د.ع'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{L('الاستحقاق:', 'پێویست:', lang)}</span><span>{inv.due_date}</span></div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setEditInvoice(inv)}>
                    <Edit2 className="w-3 h-3" />{L('تعديل', 'دەستکاری', lang)}
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200 gap-1" onClick={() => { if(confirm(L('حذف الفاتورة؟','وەسڵەکە بسڕێتەوە؟',lang))) deleteInvoiceMut.mutate(inv.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Spent Tab */}
      {tab === 'spent' && (
        filteredSpent.length === 0 ? (
          <EmptyState icon={DollarSign} title={L('لا توجد مصاريف', 'هیچ مەسروفێک نییە', lang)} description={L('أضف مصروفاً للمالك', 'مەسروفێکی نوێ بۆ خاوەن زیاد بکە', lang)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpent.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-[#1a2744] font-mono">{s.receipt_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.contract_number}</p>
                  </div>
                  <Badge className={typeColors[s.type] || 'bg-gray-100 text-gray-800'}>{s.type}</Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{L('البائع:', 'فرۆشیار:', lang)}</span><span className="font-medium">{s.seller_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{L('المبلغ:', 'بڕ:', lang)}</span><span className="font-bold text-teal-600">{s.amount?.toLocaleString()} {s.currency_symbol || 'د.ع'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{L('التاريخ:', 'بەروار:', lang)}</span><span>{s.paid_date}</span></div>
                  {s.payment_method && <div className="flex justify-between"><span className="text-gray-500">{L('طريقة الدفع:', 'شێواز:', lang)}</span><span>{s.payment_method}</span></div>}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setEditSpent(s)}>
                    <Edit2 className="w-3 h-3" />{L('تعديل', 'دەستکاری', lang)}
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 border-red-200 gap-1" onClick={() => { if(confirm(L('حذف المصروف؟','مەسروفەکە بسڕێتەوە؟',lang))) deleteSpentMut.mutate(s.id); }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modals */}
      {(showInvoiceForm || editInvoice) && (
        <InvoiceForm
          invoice={editInvoice}
          contracts={contracts}
          settings={settings}
          onSubmit={editInvoice ? updateInvoiceMut.mutate : createInvoiceMut.mutate}
          onCancel={() => { setShowInvoiceForm(false); setEditInvoice(null); }}
          isLoading={createInvoiceMut.isPending || updateInvoiceMut.isPending}
        />
      )}
      {(showSpentForm || editSpent) && (
        <SpentForm
          spent={editSpent}
          contracts={contracts}
          settings={settings}
          onSubmit={editSpent ? updateSpentMut.mutate : createSpentMut.mutate}
          onCancel={() => { setShowSpentForm(false); setEditSpent(null); }}
          isLoading={createSpentMut.isPending || updateSpentMut.isPending}
        />
      )}
    </div>
  );
}