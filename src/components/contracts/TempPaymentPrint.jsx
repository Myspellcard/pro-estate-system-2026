import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { format, parseISO } from 'date-fns';
import { printTempPayment, STATUS_AR_KU, STATUS_BG } from '@/utils/printTempPayment';
import { useCurrencies } from '@/hooks/useCurrencies';

export default function TempPaymentPrint({ contract, onClose }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => (lang === 'ku' ? ku : ar);
  const { currencies } = useCurrencies();
  const [validityDays, setValidityDays] = useState('');
  const [tempCurrencySymbol, setTempCurrencySymbol] = useState('$');
  const symbol = tempCurrencySymbol;

  // Default currency to USD
  useEffect(() => {
    if (currencies.length > 0) {
      const usd = currencies.find(c => c.code === 'USD');
      if (usd) setTempCurrencySymbol(usd.symbol);
    }
  }, [currencies]);

  const { data: branch } = useQuery({
    queryKey: ['branch', contract?.branch_id],
    queryFn: () => contract?.branch_id ? firebaseApi.entities.Branch.get(contract.branch_id) : null,
    enabled: !!contract?.branch_id,
  });

  const companyName = branch?.company_name || L('نظام إدارة العقارات', 'بەڕێوەبردنی خانووبەرە');
  const companySlogan = lang === 'ku' ? (branch?.invoice_slogan_ku || branch?.company_slogan_ku || '') : (branch?.invoice_slogan || branch?.company_slogan || '');

  const status = contract.temp_payment_status || 'محتجز';
  const statusLabel = (s) => { const [ar, ku] = STATUS_AR_KU[s] || [s, s]; return L(ar, ku); };
  const fd = (d) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';
  const amount = Number(contract.temp_payment_amount || 0);

  const rows = [
    { labelAr: 'رقم العقد', labelKu: 'ژمارەی گرێبەست', value: contract.contract_number || '—' },
    { labelAr: 'العقار', labelKu: 'موڵک', value: contract.property_name || '—' },
    { labelAr: 'المستأجر', labelKu: 'کرێچی', value: contract.tenant_name || '—' },
    { labelAr: 'المالك', labelKu: 'خاوەن', value: contract.owner_name || '—' },
    { labelAr: 'تاريخ الاستلام', labelKu: 'بەرواری وەرگرتن', value: fd(contract.temp_payment_date) },
  ];

  const handlePrint = () => {
    printTempPayment({
      contract, branch, lang,
      amount: contract.temp_payment_amount,
      date: contract.temp_payment_date,
      status,
      notes: contract.temp_payment_notes,
      validityDays,
      currencySymbol: tempCurrencySymbol,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1a2744] rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-[#e8b748]" />
            </div>
            <span className="font-bold text-[#1a2744] text-lg">{L('وصل الدفعة المؤقتة', 'وەسڵی پارەی کاتی')}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm" dir="rtl">
          <div className="bg-[#1a2744] rounded-xl p-4 text-white">
            <p className="font-black text-base">{companyName}</p>
            {companySlogan && <p className="text-[#e8b748] text-xs mt-0.5">{companySlogan}</p>}
            <p className="text-blue-200 text-xs mt-1">{L('وصل الدفعة المؤقتة', 'وەسڵی پارەی کاتی')} — {contract.contract_number || ''}</p>
          </div>

          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center">
            <p className="text-xs font-bold text-amber-700 mb-1">{L('المبلغ المستلم', 'بڕی وەرگیراو')}</p>
            <p className="text-2xl font-black text-amber-900">{amount.toLocaleString()} <span className="text-sm">{symbol}</span></p>
          </div>

          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={i} className="flex justify-between border-b border-gray-100 py-1.5">
                <span className="text-gray-500 font-medium">{L(r.labelAr, r.labelKu)}</span>
                <span className="font-bold text-gray-800">{r.value || '—'}</span>
              </div>
            ))}
            {contract.temp_payment_resolution_date && (
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <span className="text-gray-500 font-medium">{L('تاريخ التسوية', 'بەرواری ڕێکخستن')}</span>
                <span className="font-bold text-gray-800">{fd(contract.temp_payment_resolution_date)}</span>
              </div>
            )}
          </div>

          {contract.temp_payment_notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600">
              <strong>{L('ملاحظات:', 'تێبینی:')}</strong> {contract.temp_payment_notes}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">{L('العملة', 'دراو')}</label>
              <select value={tempCurrencySymbol} onChange={e => setTempCurrencySymbol(e.target.value)} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white">
                {currencies.map(c => <option key={c.id} value={c.symbol}>{c.code} ({c.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">{L('مدة الصلاحية (أيام)', 'ماوەی بەسەرچوون (ڕۆژ)')}</label>
              <input type="number" min="0" value={validityDays} onChange={e => setValidityDays(e.target.value)} placeholder="0" className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-5 py-4 flex gap-3 justify-end bg-white">
          <Button variant="outline" onClick={onClose}>{L('إغلاق', 'داخستن')}</Button>
          <Button onClick={handlePrint} className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
            <Printer className="w-4 h-4" />
            {L('طباعة الوصل', 'چاپکردنی وەسڵ')}
          </Button>
        </div>
      </div>
    </div>
  );
}