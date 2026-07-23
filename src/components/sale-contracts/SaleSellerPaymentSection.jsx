import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Banknote, Plus, Printer, Pencil, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCurrencies } from '@/hooks/useCurrencies';

const L = (ar, ku, lang) => (lang === 'ku' ? ku : ar);

function fmtDate(d) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear())}`;
  } catch { return d; }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function printSellerPayment({ spent, contract, branch, lang }) {
  const Lc = (ar, ku) => (lang === 'ku' ? ku : ar);
  const NAVY = '#1a2744';
  const GOLD = '#e8b748';
  const BROWN = '#92400e';
  const TEXT = '#2D2D2D';

  const sym = spent.currency_symbol || contract?.currency_symbol || 'د.ع';
  const amt = Number(spent.amount || 0).toLocaleString('en-US');
  const companyName = branch?.company_name || '';
  const branchName = Lc(branch?.name || '', branch?.name_ku || '');
  const phone = branch?.company_phone || '';
  const logo = branch?.company_logo || '';
  const today = fmtDate(new Date().toISOString());

  const sellerName = lang === 'ku' ? (contract?.seller_name_ku || contract?.seller_name) : contract?.seller_name;
  const propName = lang === 'ku' ? (contract?.property_name_ku || contract?.property_name) : contract?.property_name;

  const docTitle = Lc('وصل دفع للمالك', 'وەسڵی پارەدانی بۆ خاوەن');

  const rows = [
    { lbl: Lc('رقم العقد', 'ژمارەی گرێبەست'), val: contract?.contract_number || '—' },
    { lbl: Lc('العقار', 'موڵک'), val: propName || '—' },
    { lbl: Lc('البائع', 'فرۆشیار'), val: sellerName || '—' },
    { lbl: Lc('نوع الدفع', 'جۆری پارەدان'), val: spent.type || '—' },
    { lbl: Lc('تاريخ الدفع', 'بەرواری پارەدان'), val: fmtDate(spent.paid_date) || '—' },
  ];
  if (spent.payment_method) rows.push({ lbl: Lc('طريقة الدفع', 'شێوازی پارەدان'), val: spent.payment_method });

  const rowsHtml = rows.map(r => `<tr><td class="lbl">${escapeHtml(r.lbl)}</td><td class="val">${escapeHtml(r.val)}</td></tr>`).join('');

  const logoHtml = logo
    ? `<div class="logo"><img src="${escapeHtml(logo)}" /></div>`
    : `<div class="logo logo-fallback">${escapeHtml((companyName || 'RV').slice(0, 2))}</div>`;

  const notesHtml = (spent.notes || '').trim() ? `<div class="notes"><span>${Lc('ملاحظات:', 'تێبینی:')}</span> ${escapeHtml(spent.notes)}</div>` : '';

  const html = `<!DOCTYPE html>
<html lang="${lang === 'ku' ? 'ku' : 'ar'}" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;700;800;900&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html, body { font-family:'Noto Sans Arabic',sans-serif; background:#fff; color:${TEXT}; }
  .sheet { width:148mm; height:210mm; margin:0 auto; background:#fff; overflow:hidden; display:flex; flex-direction:column; }
  .header { background:${NAVY}; padding:14px 22px 12px; border-radius:0 0 20px 20px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
  .logo { width:54px; height:54px; border-radius:50%; background:#fff; border:2px solid ${GOLD}; padding:4px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
  .logo img { width:100%; height:100%; object-fit:contain; border-radius:50%; }
  .logo-fallback { background:${NAVY}; color:${GOLD}; font-weight:800; font-size:20px; border:2px solid ${GOLD}; }
  .h-center { flex:1; text-align:center; }
  .brand-name { color:#fff; font-weight:800; font-size:20px; }
  .h-right { text-align:left; flex-shrink:0; }
  .inv-num { font-size:11px; font-weight:800; color:${GOLD}; white-space:nowrap; }
  .inv-date { font-size:9px; color:#a8b8d8; margin-top:2px; }
  .gold-line { height:3px; background:linear-gradient(90deg,transparent,${GOLD},transparent); margin:10px 22px 0; border-radius:2px; }
  .title-wrap { text-align:center; margin-top:4px; margin-bottom:2px; }
  .title { color:${NAVY}; font-weight:700; font-size:16px; }
  .title-accent { width:42px; height:2px; background:${GOLD}; margin:5px auto 0; border-radius:2px; }
  .body { padding:6px 22px; flex:1; }
  .amount-box { text-align:center; background:#fef3c7; border:1.5px solid #f59e0b; border-radius:10px; padding:8px 10px; margin-bottom:12px; }
  .amount-lbl { font-size:10px; font-weight:700; color:${BROWN}; margin-bottom:2px; }
  .amount-val { font-size:22px; font-weight:900; color:${BROWN}; }
  .amount-sign { font-size:14px; font-weight:800; color:${BROWN}; margin-right:6px; }
  table { width:100%; border-collapse:collapse; margin:6px 0; }
  table td { border:1px solid #e5e7eb; padding:7px 10px; font-size:12px; }
  table td.lbl { width:40%; font-weight:700; background:#f4f6fb; color:${NAVY}; }
  table td.val { font-weight:600; color:#111; }
  .notes { margin-top:10px; padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-right:4px solid #64748b; border-radius:8px; font-size:11px; color:#334155; line-height:1.6; }
  .notes span { font-weight:800; color:#1e293b; }
  .signs { display:flex; gap:24px; margin-top:130px; }
  .sign { flex:1; text-align:center; }
  .sign-line { border-bottom:1.5px dotted #000; margin:0 14px; }
  .sign-role { font-size:11px; font-weight:700; color:${NAVY}; margin-top:8px; }
  .footer { background:${NAVY}; border-radius:20px 20px 0 0; padding:10px 22px; display:flex; justify-content:space-between; align-items:center; color:#fff; flex-shrink:0; }
  .foot-item { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; }
  .foot-item svg { width:13px; height:13px; fill:${GOLD}; }
  @page { size:A5 portrait; margin:0; }
  @media print { body { background:#fff; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      ${logoHtml}
      <div class="h-center">
        <div class="brand-name">${escapeHtml(companyName || '')}</div>
      </div>
      <div class="h-right">
        <div class="inv-num">${escapeHtml(spent.receipt_number || '—')}</div>
        <div class="inv-date">${escapeHtml(today)}</div>
      </div>
    </div>
    <div class="gold-line"></div>

    <div class="title-wrap">
      <div class="title">${escapeHtml(docTitle)}</div>
      <div class="title-accent"></div>
    </div>

    <div class="body">
      <div class="amount-box">
        <div class="amount-lbl">${Lc('المبلغ', 'بڕ')}</div>
        <div><span class="amount-val">${escapeHtml(amt)}</span><span class="amount-sign">${escapeHtml(sym)}</span></div>
      </div>
      <table>${rowsHtml}</table>
      ${notesHtml}
      <div class="signs">
        <div class="sign"><div class="sign-line"></div><div class="sign-role">${Lc('المستلم', 'وەرگر')}</div></div>
        <div class="sign"><div class="sign-line"></div><div class="sign-role">${Lc('إدارة الشركة', 'بەڕێوەبەرایەتی کۆمپانیا')}</div></div>
      </div>
    </div>

    <div class="footer">
      <div class="foot-item"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z"/></svg><span>${escapeHtml(branchName || '—')}</span></div>
      <div class="foot-item"><svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.25 1l-2.25 2.2z"/></svg><span>${escapeHtml(phone || '—')}</span></div>
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 400);
  };
}

function SpentForm({ spent, contract, currencies, settings, onSubmit, onCancel, isLoading, lang }) {
  const numbering = settings?.numbering || {};
  const nextNum = numbering.sale_owner_spent_start ?? 1;
  const prefix = numbering.sale_owner_spent_prefix ?? '';
  const autoNumber = `${prefix}${nextNum}`;

  const [form, setForm] = useState({
    receipt_number: spent?.receipt_number || autoNumber,
    type: spent?.type || 'دفعة للمالك',
    amount: spent?.amount || '',
    currency: spent?.currency || contract?.currency || 'IQD',
    currency_symbol: spent?.currency_symbol || contract?.currency_symbol || 'د.ع',
    paid_date: spent?.paid_date || new Date().toISOString().split('T')[0],
    payment_method: spent?.payment_method || 'نقد',
    notes: spent?.notes || '',
  });
  const h = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!Number(form.amount) || Number(form.amount) <= 0) return;
    onSubmit({
      ...form,
      amount: Number(form.amount) || 0,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      seller_name: lang === 'ku' ? (contract.seller_name_ku || contract.seller_name) : contract.seller_name,
      property_name: lang === 'ku' ? (contract.property_name_ku || contract.property_name) : contract.property_name,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-[#1a2744]">{spent ? L('تعديل دفعة للمالك', 'دەستکاریکردنی پارەدان بۆ خاوەن', lang) : L('دفعة للمالك جديد', 'پارەدانی نوێ بۆ خاوەن', lang)}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('رقم الإيصال', 'ژمارەی پسوولە', lang)}</label>
              <Input value={form.receipt_number} onChange={e => h('receipt_number', e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('نوع الدفع', 'جۆری پارەدان', lang)}</label>
              <Select value={form.type} onValueChange={v => h('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['دفعة للمالك', 'عمولة', 'مصاريف إدارية', 'أخرى'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
              <label className="text-xs font-medium text-gray-600">{L('العملة', 'دراو', lang)}</label>
              <Select value={form.currency} onValueChange={(v) => {
                const c = currencies.find(c => c.code === v);
                h('currency', v);
                h('currency_symbol', c?.symbol || (v === 'USD' ? '$' : v === 'EUR' ? '€' : 'د.ع'));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(currencies.length ? currencies : [{ code: 'IQD', symbol: 'د.ع' }]).map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol || 'د.ع'})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('تاريخ الدفع', 'بەرواری پارەدان', lang)}</label>
              <Input type="date" value={form.paid_date} onChange={e => h('paid_date', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">{L('طريقة الدفع', 'شێوازی پارەدان', lang)}</label>
              <Select value={form.payment_method} onValueChange={v => h('payment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['نقد', 'تحويل بنكي', 'شيك'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
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

const typeColors = {
  'دفعة للمالك': 'bg-emerald-100 text-emerald-800',
  'عمولة': 'bg-amber-100 text-amber-800',
  'مصاريف إدارية': 'bg-blue-100 text-blue-800',
  'أخرى': 'bg-gray-100 text-gray-800',
};

export default function SaleSellerPaymentSection({ contract }) {
  const { lang } = useLanguage();
  const { currencies } = useCurrencies();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editSpent, setEditSpent] = useState(null);

  const { data: spentList = [] } = useQuery({
    queryKey: ['sale-owner-spent', 'contract', contract?.id],
    queryFn: () => contract?.id ? firebaseApi.entities.SaleOwnerSpent.filter({ contract_id: contract.id }) : [],
    enabled: !!contract?.id,
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });
  const settings = settingsList.find(s => s.key === 'default');

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => firebaseApi.entities.Branch.list(),
  });
  const branch = branches.find(b => b.id === contract?.branch_id) || branches[0] || null;

  const createMut = useMutation({
    mutationFn: async (data) => {
      const s = await firebaseApi.entities.SaleOwnerSpent.create({ ...data, branch_id: contract?.branch_id, created_date: new Date().toISOString() });
      const num = settings?.numbering?.sale_owner_spent_start ?? 1;
      if (settings?.id) {
        await firebaseApi.entities.AppSettings.update(settings.id, { numbering: { ...(settings.numbering || {}), sale_owner_spent_start: num + 1 } });
      }
      return s;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sale-owner-spent'] });
      qc.invalidateQueries({ queryKey: ['app_settings'] });
      setShowForm(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.SaleOwnerSpent.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sale-owner-spent'] }); setEditSpent(null); setShowForm(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => firebaseApi.entities.SaleOwnerSpent.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sale-owner-spent'] }),
  });

  const handleSubmit = (data) => {
    if (editSpent) updateMut.mutate({ id: editSpent.id, data });
    else createMut.mutate(data);
  };

  const totalPaid = spentList.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="mt-2">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-indigo-600" />
            <p className="text-sm font-bold text-indigo-900">{L('دفعات للمالك', 'پارەدان بۆ خاوەن', lang)}</p>
          </div>
          <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditSpent(null); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" />
            {L('دفعة للمالك', 'پارەدان بۆ خاوەن', lang)}
          </Button>
        </div>

        <div className="p-4">
          {spentList.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">{L('لا توجد دفعات للمالك بعد', 'هێچ پارەدانێک بۆ خاوەن نییە', lang)}</p>
          ) : (
            <>
              <div className="mb-3 text-xs text-gray-500 flex items-center gap-2">
                <span>{L('عدد الدفعات:', 'ژمارەی پارەدانەکان:', lang)} {spentList.length}</span>
                <span>•</span>
                <span>{L('إجمالي المدفوع:', 'کۆی پارەدراو:', lang)} <span className="font-bold text-indigo-700">{totalPaid.toLocaleString()} {contract?.currency_symbol || 'د.ع'}</span></span>
              </div>
              <div className="space-y-2">
                {spentList.map(sp => (
                  <div key={sp.id} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between hover:shadow-sm transition-shadow">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#1a2744] font-mono">{sp.receipt_number}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[sp.type] || 'bg-gray-100 text-gray-800'}`}>{sp.type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-bold text-indigo-700 text-sm">{Number(sp.amount || 0).toLocaleString()} {sp.currency_symbol || 'د.ع'}</span>
                        <span>• {fmtDate(sp.paid_date)}</span>
                        {sp.payment_method && <span>• {sp.payment_method}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => printSellerPayment({ spent: sp, contract, branch, lang })} title={L('طباعة', 'چاپکردن', lang)} className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditSpent(sp); setShowForm(true); }} title={L('تعديل', 'دەستکاریکردن', lang)} className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm(L('حذف الدفعة؟', 'پارەدانەکە بسڕێتەوە؟', lang))) deleteMut.mutate(sp.id); }} title={L('حذف', 'سڕینەوە', lang)} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {(showForm || editSpent) && (
        <SpentForm
          spent={editSpent}
          contract={contract}
          currencies={currencies}
          settings={settings}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditSpent(null); }}
          isLoading={createMut.isPending || updateMut.isPending}
          lang={lang}
        />
      )}
    </div>
  );
}