import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function InsuranceRefundPrint({ contract, branch, onClose }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const companyName = branch?.company_name || contract.company_name || '';
  const companySlogan = lang === 'ku' ? (branch?.insurance_slogan_ku || branch?.company_slogan_ku || '') : (branch?.insurance_slogan || branch?.company_slogan || '');
  const logoUrl = branch?.company_logo || contract.company_logo;
  const companyPhone = branch?.company_phone || contract.company_phone || '';

  const totalInsurance = contract.insurance_amount || 0;
  const refundAmount = contract.insurance_refund_amount ?? (contract.insurance_status === 'مسترد' ? totalInsurance : 0);
  const confiscatedAmount = contract.insurance_confiscated_amount ?? (contract.insurance_status === 'مصادر' ? totalInsurance : 0);
  const isPartial = refundAmount > 0 && confiscatedAmount > 0;

  const today = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=600');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<title>${L('وثيقة تسوية التأمين', 'بەڵگەی ڕێکخستنی دڵنیایی')}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&family=Noto+Sans+Arabic:wght@400;700;800&display=swap" rel="stylesheet">
<style>
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
body { font-family:'Noto Sans Arabic','Tajawal',sans-serif; direction:rtl; background:#fff; color:#1a2744; }
@page { size:A5; margin:10mm 12mm; }
@media print { body { padding:0; } }
.header { background:linear-gradient(135deg,#1a2744,#2a3f6e); color:#fff; padding:12px 16px; border-radius:10px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; direction:ltr; }
.logo-wrap { width:48px; height:48px; border-radius:8px; background:rgba(255,255,255,0.12); border:1.5px solid rgba(232,183,72,0.4); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; }
.logo-wrap img { width:100%; height:100%; object-fit:contain; }
.logo-init { font-size:20px; font-weight:900; color:#e8b748; }
.company-info { flex:1; text-align:center; }
.company-name { font-size:13px; font-weight:800; color:#fff; margin-bottom:2px; }
.company-phone { font-size:9px; color:#a8b8d8; }
.doc-badge { background:#e8b748; color:#1a2744; font-size:10px; font-weight:800; padding:4px 12px; border-radius:16px; display:inline-block; white-space:nowrap; }
.amounts-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px; }
.amount-card { border-radius:8px; padding:10px 12px; text-align:center; border:2px solid; }
.amount-card.refund { border-color:#059669; background:#f0fdf4; }
.amount-card.confiscated { border-color:#dc2626; background:#fef2f2; }
.amount-card.full { grid-column:span 2; }
.amount-emoji { font-size:18px; margin-bottom:4px; display:block; }
.amount-lbl { font-size:9px; font-weight:700; margin-bottom:4px; }
.amount-lbl.refund { color:#059669; }
.amount-lbl.confiscated { color:#dc2626; }
.amount-val { font-size:18px; font-weight:900; color:#1a2744; }
.amount-val small { font-size:10px; font-weight:400; color:#6b7a99; margin-right:3px; }
.total-row { background:#1a2744; color:#e8b748; border-radius:8px; padding:8px 14px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:11px; }
.total-row span:last-child { font-size:16px; font-weight:900; }
.info-table { width:100%; border-collapse:collapse; border:1.5px solid #dde2ee; border-radius:6px; overflow:hidden; margin-bottom:10px; }
.info-table th { background:#1a2744; color:#e8b748; padding:6px 10px; font-size:9px; font-weight:700; text-align:right; }
.info-table td { padding:6px 10px; font-size:10px; border-bottom:1px solid #edf0f7; }
.info-table td.lbl { color:#6b7a99; font-weight:600; width:40%; }
.info-table td.val { font-weight:700; color:#1a2744; }
.info-table tr:last-child td { border-bottom:none; }
.info-table tr:nth-child(even) { background:#f7f9fd; }
.notes-box { background:#f7f9fd; border:1px solid #dde2ee; border-radius:6px; padding:8px 12px; margin-bottom:10px; font-size:10px; color:#374151; }
.notes-label { font-weight:700; color:#1a2744; margin-bottom:3px; font-size:9px; }
.sig-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:10px; }
.sig-box { border:1px solid #dde2ee; border-radius:6px; padding:8px; text-align:center; }
.sig-label { font-size:9px; color:#6b7a99; font-weight:600; margin-bottom:20px; }
.sig-line { border-top:1.5px solid #1a2744; padding-top:5px; font-size:9px; font-weight:700; color:#1a2744; }
.footer { text-align:center; border-top:1.5px solid #edf0f7; padding-top:8px; margin-top:10px; color:#8a94aa; font-size:8px; }
.footer .date { font-weight:700; color:#1a2744; font-size:9px; margin-bottom:2px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-wrap">
      ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : `<span class="logo-init">${(companyName || 'ع').charAt(0)}</span>`}
    </div>
    <div class="company-info">
      <div class="company-name">${companyName}</div>
      ${companySlogan ? `<div class="company-phone" style="color:#e8b748;font-weight:700;font-size:10px;">${companySlogan}</div>` : ''}
      ${companyPhone ? `<div class="company-phone">${companyPhone}</div>` : ''}
    </div>
    <div class="doc-badge">${L('وثيقة تسوية التأمين', 'بەڵگەی ڕێکخستنی دڵنیایی')}</div>
  </div>

  <div class="amounts-grid">
    ${refundAmount > 0 ? `
    <div class="amount-card refund${!isPartial ? ' full' : ''}">
      <span class="amount-emoji">✅</span>
      <div class="amount-lbl refund">${L('المبلغ المُسترد للمستأجر', 'بڕی دەگەڕێتەوە بۆ کرێچی')}</div>
      <div class="amount-val">${refundAmount.toLocaleString()} <small>${L('د.ع', 'د.ع')}</small></div>
    </div>` : ''}
    ${confiscatedAmount > 0 ? `
    <div class="amount-card confiscated${!isPartial ? ' full' : ''}">
      <span class="amount-emoji">🚫</span>
      <div class="amount-lbl confiscated">${L('المبلغ المُصادر', 'بڕی مووچەکراو')}</div>
      <div class="amount-val">${confiscatedAmount.toLocaleString()} <small>${L('د.ع', 'د.ع')}</small></div>
    </div>` : ''}
  </div>

  <div class="total-row">
    <span>${L('إجمالي مبلغ التأمين الأصلي', 'کۆی گشتی بڕی دڵنیایی')}</span>
    <span>${totalInsurance.toLocaleString()} ${L('د.ع', 'د.ع')}</span>
  </div>

  <table class="info-table">
    <thead><tr><th>${L('البيان', 'زانیاری')}</th><th>${L('التفاصيل', 'وردەکاری')}</th></tr></thead>
    <tbody>
      <tr><td class="lbl">${L('رقم العقد', 'ژمارەی گرێبەست')}</td><td class="val">${contract.contract_number || '—'}</td></tr>
      <tr><td class="lbl">${L('العقار', 'خانووبەرە')}</td><td class="val">${contract.property_name || '—'}</td></tr>
      <tr><td class="lbl">${L('المستأجر', 'کرێچی')}</td><td class="val">${contract.tenant_name || '—'}</td></tr>
      ${contract.tenant_phone ? `<tr><td class="lbl">${L('هاتف المستأجر', 'مۆبایلی کرێچی')}</td><td class="val">${contract.tenant_phone}</td></tr>` : ''}
      <tr><td class="lbl">${L('تاريخ البدء', 'بەرواری دەستپێکردن')}</td><td class="val">${contract.start_date || '—'}</td></tr>
      <tr><td class="lbl">${L('تاريخ الانتهاء', 'بەرواری کۆتایی')}</td><td class="val">${contract.end_date || '—'}</td></tr>
      <tr><td class="lbl">${L('تاريخ التسوية', 'بەرواری ڕێکخستن')}</td><td class="val">${contract.insurance_refund_date || today}</td></tr>
    </tbody>
  </table>

  ${contract.insurance_refund_notes ? `
  <div class="notes-box">
    <div class="notes-label">${L('ملاحظات:', 'تێبینی:')}</div>
    <div>${contract.insurance_refund_notes}</div>
  </div>` : ''}

  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-label">${L('توقيع المستأجر', 'واژۆی کرێچی')}</div>
      <div class="sig-line">${contract.tenant_name || ''}</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">${L('توقيع الشركة', 'واژۆی کۆمپانیا')}</div>
      <div class="sig-line">${companyName}</div>
    </div>
  </div>

  <div class="footer">
    <div class="date">${today}</div>
    <div>${L('تم إصدار هذه الوثيقة من نظام إدارة العقارات', 'ئەم بەڵگەنامەیە لە سیستەمی بەڕێوەبردنی خانووبەرە دەرکراوە')}</div>
  </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 600);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a2744] flex items-center justify-center">
              <Printer className="w-4 h-4 text-[#e8b748]" />
            </div>
            <h2 className="font-bold text-[#1a2744]">{L('معاينة وثيقة التأمين', 'پێشبینی بەڵگەی دڵنیایی')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 flex-1" dir="rtl" style={{ fontFamily: "'Noto Sans Arabic','Tajawal',sans-serif" }}>

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1a2744] to-[#2a3f6e] rounded-xl p-4 mb-4 flex flex-row-reverse justify-between items-center gap-3" dir="ltr">
            <div className="w-11 h-11 rounded-lg bg-white/10 border border-[#e8b748]/40 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                : <span className="text-lg font-black text-[#e8b748]">{(companyName || 'ع').charAt(0)}</span>}
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-black text-white">{companyName}</p>
              {companySlogan && <p className="text-[10px] text-[#e8b748] font-semibold">{companySlogan}</p>}
              {companyPhone && <p className="text-[9px] text-blue-300">{companyPhone}</p>}
            </div>
            <div className="bg-[#e8b748] text-[#1a2744] text-xs font-black px-3 py-1.5 rounded-full whitespace-nowrap">
              {L('وثيقة تسوية التأمين', 'بەڵگەی ڕێکخستنی دڵنیایی')}
            </div>
          </div>

          {/* Amount Cards */}
          <div className={`grid gap-3 mb-4 ${isPartial ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {refundAmount > 0 && (
              <div className="text-center p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-xs font-bold text-emerald-700 mb-1">{L('المبلغ المُسترد للمستأجر', 'بڕی دەگەڕێتەوە بۆ کرێچی')}</p>
                <p className="text-xl font-black text-[#1a2744]">{refundAmount.toLocaleString()} <span className="text-xs font-normal text-gray-500">{L('د.ع', 'د.ع')}</span></p>
              </div>
            )}
            {confiscatedAmount > 0 && (
              <div className="text-center p-4 rounded-xl border-2 border-red-500 bg-red-50">
                <div className="text-2xl mb-1">🚫</div>
                <p className="text-xs font-bold text-red-700 mb-1">{L('المبلغ المُصادر', 'بڕی مووچەکراو')}</p>
                <p className="text-xl font-black text-[#1a2744]">{confiscatedAmount.toLocaleString()} <span className="text-xs font-normal text-gray-500">{L('د.ع', 'د.ع')}</span></p>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-[#1a2744] rounded-xl px-4 py-3 flex justify-between items-center mb-4 text-sm">
            <span className="text-blue-200 font-semibold">{L('إجمالي التأمين الأصلي', 'کۆی گشتی دڵنیایی')}</span>
            <span className="text-[#e8b748] font-black text-base">{totalInsurance.toLocaleString()} {L('د.ع', 'د.ع')}</span>
          </div>

          {/* Info Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#1a2744] text-[#e8b748]">
                  <th className="p-2.5 text-right text-xs font-bold">{L('البيان', 'زانیاری')}</th>
                  <th className="p-2.5 text-right text-xs font-bold">{L('التفاصيل', 'وردەکاری')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [L('رقم العقد', 'ژمارەی گرێبەست'), contract.contract_number],
                  [L('العقار', 'خانووبەرە'), contract.property_name],
                  [L('المستأجر', 'کرێچی'), contract.tenant_name],
                  contract.tenant_phone && [L('هاتف المستأجر', 'مۆبایلی کرێچی'), contract.tenant_phone],
                  [L('تاريخ البدء', 'بەرواری دەستپێکردن'), contract.start_date],
                  [L('تاريخ الانتهاء', 'بەرواری کۆتایی'), contract.end_date],
                  [L('تاريخ التسوية', 'بەرواری ڕێکخستن'), contract.insurance_refund_date || today],
                ].filter(Boolean).map(([label, value], i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-2.5 text-xs text-gray-400 font-semibold">{label}</td>
                    <td className="p-2.5 text-xs font-bold text-[#1a2744]">{value || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {contract.insurance_refund_notes && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-700">
              <p className="text-xs font-bold text-[#1a2744] mb-1">{L('ملاحظات:', 'تێبینی:')}</p>
              <p>{contract.insurance_refund_notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 font-semibold mb-5">{L('توقيع المستأجر', 'واژۆی کرێچی')}</p>
              <div className="border-t border-gray-700 pt-2 text-xs font-bold text-[#1a2744]">{contract.tenant_name}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 font-semibold mb-5">{L('توقيع الشركة', 'واژۆی کۆمپانیا')}</p>
              <div className="border-t border-gray-700 pt-2 text-xs font-bold text-[#1a2744]">{companyName}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center border-t border-gray-100 pt-4 mt-4">
            <p className="text-xs font-bold text-[#1a2744] mb-1">{today}</p>
            <p className="text-[10px] text-gray-400">{L('تم إصدار هذه الوثيقة من نظام إدارة العقارات', 'ئەم بەڵگەنامەیە لە سیستەمی بەڕێوەبردنی خانووبەرە دەرکراوە')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 px-5 py-4 flex gap-3 justify-end bg-white">
          <Button variant="outline" onClick={onClose}>{L('إغلاق', 'داخستن')}</Button>
          <Button onClick={handlePrint} className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
            <Printer className="w-4 h-4" />
            {L('طباعة', 'چاپکردن')}
          </Button>
        </div>
      </div>
    </div>
  );
}