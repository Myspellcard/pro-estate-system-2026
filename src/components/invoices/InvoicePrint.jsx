import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';

export default function InvoicePrint({ invoice, invoices, branch, onClose }) {
  const { lang } = useLanguage();
  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });
  const isMultiple = invoices && Array.isArray(invoices);
  const currentInvoices = isMultiple ? invoices : [invoice];
  const contractId = currentInvoices[0]?.contract_id;
  const { data: contract } = useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => firebaseApi.entities.Contract.get(contractId),
    enabled: !!contractId,
  });
  const toEnglishDigits = (s) => String(s ?? '').replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
  const tenantPhone = toEnglishDigits(contract?.tenant_phone || '');
  const appSettings = settingsList.find(s => s.key === 'default') || {};
  const invType = currentInvoices[0]?.type;
  const isInsurance = invType === 'تأمين';
  const isRent = invType === 'إيجار';
  const themePrimary = isInsurance ? '#8B0000' : '#1a2744';
  const themePrimaryEnd = isInsurance ? '#B71C1C' : '#2a3f6e';
  const darkLabels = isInsurance || invType === 'إيجار';
  const lblColor = darkLabels ? '#000' : '#8a94aa';
  const tdLblColor = darkLabels ? '#000' : '#6b7a99';
  const docLineColor = darkLabels ? '#000' : '#b0bac9';
  const lblClass = darkLabels ? 'text-black' : 'text-gray-400';
  const lblClassLight = darkLabels ? 'text-black' : 'text-gray-300';
  const settingsKey = invType === 'تأمين' ? 'print_insurance_invoice' : (invType === 'إيجار' ? 'print_rent_invoice' : 'print_other_invoice');
  const ps = appSettings[settingsKey] || {};
  const pGet = (key, fallback = true) => ps[key] !== undefined ? ps[key] : fallback;
  const marginTop = ps.margin_top ?? 6;
  const marginBottom = ps.margin_bottom ?? 6;
  const marginLeft = ps.margin_left ?? 10;
  const marginRight = ps.margin_right ?? 10;
  // Prefer branch logo/name over what's stored on invoice
  const logoUrl = branch?.company_logo || currentInvoices[0]?.company_logo;
  const companyName = branch ? (branch.company_name) : (currentInvoices[0]?.company_name || 'نظام إدارة العقارات');
  const showLogo = branch?.banner_show_logo !== false;
  const showPhone = branch?.banner_show_phone !== false;
  const showArabicSubtitle = branch?.banner_show_arabic_subtitle !== false;
  const showKurdishSubtitle = branch?.banner_show_kurdish_subtitle !== false;
  const arabicSubtitle = branch?.banner_arabic_subtitle || 'قسم الفواتير والمتابعة المالية';
  const kurdishSubtitle = branch?.banner_kurdish_subtitle || 'بەشی پسوولە و شوێنکەوتنی داراییەکان';
  const displaySubtitle = lang === 'ku' ? kurdishSubtitle : arabicSubtitle;
  const showSubtitle = lang === 'ku' ? showKurdishSubtitle : showArabicSubtitle;
  const companySlogan = isInsurance
    ? (lang === 'ku' ? (branch?.insurance_slogan_ku || '') : (branch?.insurance_slogan || ''))
    : (lang === 'ku' ? (branch?.invoice_slogan_ku || '') : (branch?.invoice_slogan || ''));
  const totalAmount = currentInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const fd = (d) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=700,width=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8"/>
          <title>فاتورة ${isMultiple ? 'متعددة' : invoice.invoice_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
            @page { size: A5 portrait; margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            body { font-family: 'Tajawal','Arial',sans-serif; direction: rtl; background: #fff; color: ${themePrimary}; font-size: 11px; line-height: 1.4; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .copy-wrapper { min-height: calc(210mm - ${marginTop}mm - ${marginBottom}mm); display: flex; flex-direction: column; }
            .copy { flex: 1; display: flex; flex-direction: column; }

            /* HEADER BANNER */
            .header { background: linear-gradient(135deg, ${themePrimary} 0%, ${themePrimaryEnd} 100%); color: #fff; padding: 12px 16px; border-radius: 8px; margin-bottom: 10px; display: flex; flex-direction: row-reverse; justify-content: space-between; align-items: center; gap: 10px; direction: rtl; }
            .header-center { flex: 1; text-align: center; }
            .header-center h1 { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 4px; }
            .header-center .subtitle { font-size: 12px; color: #a8b8d8; display: block; margin-bottom: 1px; }
            .header-center .subtitle-en { font-size: 8px; color: #8090b0; display: block; }
            .logo-wrap { width: 52px; height: 52px; border-radius: 50%; overflow: hidden; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(232,183,72,0.4); flex-shrink: 0; }
            .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
            .logo-initial { font-size: 22px; font-weight: 900; color: #e8b748; }
            .header-left { text-align: left; flex-shrink: 0; }
            .inv-badge { background: #e8b748; color: #1a2744; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 20px; margin-bottom: 4px; display: inline-block; }
            .inv-num { font-size: 12px; font-weight: 700; color: #e8b748; }
            .inv-date { font-size: 9px; color: rgba(255,255,255,0.65); margin-top: 1px; }

            /* STATUS STRIP */
            .status-strip { display: flex; gap: 6px; margin-bottom: 10px; }
            .status-chip { flex: 1; background: #f0f3f9; border-radius: 6px; padding: 6px 8px; text-align: center; border: 2px solid ${themePrimary}; }
            .chip-lbl { font-size: 12px; color: ${lblColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
            .chip-val { font-size: 11px; font-weight:800; color: ${themePrimary}; }
            .chip-phone { font-size: 11px; color: ${lblColor}; font-weight: 600; margin-top: 3px; }

            /* TABLE */
            .detail-box { border: 2px solid ${themePrimary}; border-radius: 6px; overflow: hidden; margin-bottom: 10px; }
            .detail-box table { width: 100%; border-collapse: collapse; }
            .detail-box thead th { background: ${themePrimary}; color: #e8b748; padding: 6px 10px; font-size: 10px; font-weight: 700; text-align: right; }
            .detail-box tbody tr:nth-child(even) { background: ${themePrimary}0a; }
            .detail-box tbody td { padding: 6px 10px; font-size: 10px; border-bottom: 1.5px solid #94a3b8; color: ${themePrimary}; }
            .detail-box tbody td.label { color: ${tdLblColor}; font-weight: 600; width: 35%; }
            .detail-box tbody td.val { font-weight: 700; }
            .detail-box tbody td.amount-val { font-weight: 800; color: ${themePrimary}; }

            /* TOTAL */
            .total-box { background: linear-gradient(135deg, ${themePrimary} 0%, ${themePrimaryEnd} 100%); border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .total-lbl { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.65); }
            .total-val { font-size: 20px; font-weight: 900; color: #e8b748; }
            .total-unit { font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.65); margin-right: 3px; }

            /* FOOTER */
            .footer { text-align: center; border-top: 2px solid ${themePrimary}; padding-top: 8px; color: ${lblColor}; font-size: 9px; margin-top: auto; }
            ${(isRent || isInsurance) ? `
            .sig-row { display: flex; gap: 10px; margin-top: 150px; margin-bottom: 10px; }
            .sig-box { flex: 1; text-align: center; }
            .sig-line { height: 1px; background: ${themePrimary}; margin: 0 20px 8px 20px; }
            .sig-label { font-size: 10px; color: ${themePrimary}; font-weight: 600; }
            ` : `
            .sig-row { display: flex; gap: 10px; margin-top: 150px; margin-bottom: 10px; }
            .sig-box { flex: 1; border: 2px dashed ${themePrimary}; border-radius: 8px; padding: 10px; text-align: center; min-height: 50px; }
            .sig-label { font-size: 9px; color: #8a94aa; font-weight: 600; }
            `}
            .footer p { margin-bottom: 2px; }
            .footer .thanks { font-size: 11px; font-weight: 700; color: ${themePrimary}; margin-bottom: 3px; }

            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="copy-wrapper">
          <div class="copy">
          <!-- HEADER -->
          <div class="header">
            <div class="header-left">
              <div class="inv-badge">${isMultiple ? 'فواتير متعددة' : 'فاتورة'}</div>
              <div class="inv-num">${isMultiple ? `${currentInvoices.length} فواتير` : '#' + invoice.invoice_number}</div>
              <div class="inv-date">${darkLabels ? '' : 'تاريخ الإصدار: '}${new Date().toLocaleDateString('en-GB')}</div>
            </div>
            <div class="header-center">
              <h1>${companyName}</h1>
              ${companySlogan ? `<span class="subtitle" style="color:#e8b748;font-weight:700;">${companySlogan}</span>` : ''}
            </div>
            ${showLogo ? `<div class="logo-wrap">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="logo" />`
                : `<span class="logo-initial">${(companyName || currentInvoices[0].tenant_name || 'ع').charAt(0)}</span>`}
            </div>` : ''}
          </div>

          <!-- CHIPS -->
          <div class="status-strip">
            ${pGet('show_tenant') ? `<div class="status-chip"><div class="chip-lbl">المستأجر</div><div class="chip-val">${currentInvoices[0].tenant_name || '—'}</div>${tenantPhone ? `<div class="chip-phone">📞 ${tenantPhone}</div>` : ''}</div>` : ''}
            ${pGet('show_property') ? `<div class="status-chip"><div class="chip-lbl">العقار</div><div class="chip-val">${currentInvoices[0].property_name || '—'}</div></div>` : ''}
            ${pGet('show_contract_number') ? `<div class="status-chip"><div class="chip-lbl">رقم العقد</div><div class="chip-val">${currentInvoices[0].contract_number || '—'}</div></div>` : ''}
          </div>

          <!-- DETAILS TABLE -->
          <div class="detail-box">
            <table>
              <thead><tr><th>البيان</th><th>التفاصيل</th></tr></thead>
              <tbody>
                <tr><td class="label">نوع الفاتورة</td><td class="val">${isMultiple ? 'إيجارات متعددة' : currentInvoices[0].type}</td></tr>
                ${isMultiple ? `
                <tr><td class="label">الفترة من</td><td class="val">${currentInvoices[0].period_from ? fd(currentInvoices[0].period_from) : '—'}</td></tr>
                <tr><td class="label">الفترة إلى</td><td class="val">${currentInvoices[currentInvoices.length - 1].period_to ? fd(currentInvoices[currentInvoices.length - 1].period_to) : '—'}</td></tr>
                ` : `
                <tr><td class="label">تاريخ الاستحقاق</td><td class="val">${currentInvoices[0].due_date ? fd(currentInvoices[0].due_date) : '—'}</td></tr>
                ${currentInvoices[0].period_from ? `<tr><td class="label">الفترة</td><td class="val">${fd(currentInvoices[0].period_from)} → ${currentInvoices[0].period_to ? fd(currentInvoices[0].period_to) : ''}</td></tr>` : ''}
                `}
                ${pGet('show_status') ? `<tr><td class="label">الحالة</td><td class="val">${currentInvoices[0].status || '—'}</td></tr>` : ''}
              </tbody>
            </table>
          </div>

          ${isMultiple ? `
          <!-- MULTI INVOICE TABLE -->
          <div class="detail-box">
            <table>
              <thead><tr><th>رقم الفاتورة</th><th>الفترة</th><th>المبلغ</th></tr></thead>
              <tbody>
                ${currentInvoices.map(inv => `
                <tr>
                  <td>${inv.invoice_number}</td>
                  <td>${inv.period_from ? fd(inv.period_from) : ''} - ${inv.period_to ? fd(inv.period_to) : ''}</td>
                  <td class="amount-val">${inv.amount?.toLocaleString()} د.ع</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}

          <!-- TOTAL -->
          <div class="total-box">
            <div class="total-lbl">المبلغ الإجمالي المستحق</div>
            <div><span class="total-val">${totalAmount.toLocaleString()}</span><span class="total-unit">د.ع</span></div>
          </div>

          <!-- SIGNATURES -->
          <div class="sig-row">
            ${(isRent || isInsurance) ? `
            <div class="sig-box"><div class="sig-line"></div><div class="sig-label">المستأجر</div></div>
            <div class="sig-box"><div class="sig-line"></div><div class="sig-label">إدارة الشركة</div></div>
            ` : `
            <div class="sig-box"><div class="sig-label">توقيع المستأجر</div></div>
            <div class="sig-box"><div class="sig-label">توقيع ممثل الشركة</div></div>
            `}
          </div>

          ${pGet('show_footer') ? `<!-- FOOTER -->
          <div class="footer">
            <p class="thanks">شكراً لسداد المبالغ في مواعيدها المحددة</p>
            <p>للاستفسار يرجى التواصل مع إدارة الشركة</p>
            ${(isRent || isInsurance) ? `<p style="margin-top:6px;font-size:9px;color:${docLineColor}">${[branch?.name, branch?.company_phone && '📞 ' + branch.company_phone].filter(Boolean).join(' • ')}</p>` : `<p style="margin-top:6px;font-size:9px;color:${docLineColor}">تم إصدار هذه الوثيقة من نظام إدارة العقارات</p>`}
          </div>` : ''}
          </div><!-- end copy -->
          </div><!-- end copy-wrapper -->
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col" style={{ '--inv-primary': themePrimary, '--inv-primary-end': themePrimaryEnd }}>
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--inv-primary)] rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-[#e8b748]" />
            </div>
            <h2 className="font-bold text-[var(--inv-primary)]">معاينة الفاتورة</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Document */}
        <div className="p-6 flex-1" dir="rtl" style={{fontFamily:"'Tajawal','Arial',sans-serif"}}>

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[var(--inv-primary)] to-[var(--inv-primary-end)] rounded-xl p-4 mb-4 flex flex-row justify-between items-center gap-3" dir="rtl">
            <div className="text-right flex-shrink-0">
              <div className="bg-[#e8b748] text-[var(--inv-primary)] text-xs font-black px-3 py-1 rounded-full mb-1.5 text-center">
                {isMultiple ? 'فواتير متعددة' : 'فاتورة'}
              </div>
              <p className="text-sm font-bold text-[#e8b748]">{isMultiple ? `${currentInvoices.length} فواتير` : '#' + invoice.invoice_number}</p>
              <p className="text-[10px] text-white/60 mt-0.5">{new Date().toLocaleDateString('en-GB')}</p>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-black text-white mb-1">{companyName}</h1>
              {companySlogan && <p className="text-xs text-[#e8b748] font-semibold">{companySlogan}</p>}
            </div>
            {showLogo && (
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-[#e8b748]/40 flex items-center justify-center flex-shrink-0">
                {logoUrl
                  ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                  : <span className="text-xl font-black text-[#e8b748]">{(companyName || currentInvoices[0].tenant_name || 'ع').charAt(0)}</span>}
              </div>
            )}
          </div>

          {/* Info Chips */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {pGet('show_tenant') && <div className="bg-gray-50 border-2 border-[var(--inv-primary)] rounded-lg p-2.5 text-center"><p className={`text-[12px] ${lblClass} font-semibold uppercase tracking-wide mb-1`}>المستأجر</p><p className="text-xs font-bold text-[var(--inv-primary)] truncate">{currentInvoices[0].tenant_name || '—'}</p>{tenantPhone && <p className={`text-[11px] ${lblClass} font-semibold mt-1`}>📞 {tenantPhone}</p>}</div>}
            {pGet('show_property') && <div className="bg-gray-50 border-2 border-[var(--inv-primary)] rounded-lg p-2.5 text-center"><p className={`text-[12px] ${lblClass} font-semibold uppercase tracking-wide mb-1`}>العقار</p><p className="text-xs font-bold text-[var(--inv-primary)] truncate">{currentInvoices[0].property_name || '—'}</p></div>}
            {pGet('show_contract_number') && <div className="bg-gray-50 border-2 border-[var(--inv-primary)] rounded-lg p-2.5 text-center"><p className={`text-[12px] ${lblClass} font-semibold uppercase tracking-wide mb-1`}>رقم العقد</p><p className="text-xs font-bold text-[var(--inv-primary)] truncate">{currentInvoices[0].contract_number || '—'}</p></div>}
          </div>

          {/* Details Table */}
          <div className="border-2 border-[var(--inv-primary)] rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--inv-primary)] text-[#e8b748]">
                  <th className="p-2.5 text-right font-bold text-xs">البيان</th>
                  <th className="p-2.5 text-right font-bold text-xs">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-white">
                  <td className={`p-2.5 text-xs ${lblClass} font-semibold`}>نوع الفاتورة</td>
                  <td className="p-2.5 text-xs font-bold text-[var(--inv-primary)]">{isMultiple ? 'إيجارات متعددة' : currentInvoices[0].type}</td>
                </tr>
                {isMultiple ? (
                  <>
                    {pGet('show_period') && <tr className="border-b border-gray-100 bg-gray-50">
                      <td className={`p-2.5 text-xs ${lblClass} font-semibold`}>الفترة من</td>
                      <td className="p-2.5 text-xs font-bold text-[var(--inv-primary)]">{fd(currentInvoices[0].period_from)}</td>
                    </tr>}
                    {pGet('show_period') && <tr className="border-b border-gray-100 bg-white">
                      <td className={`p-2.5 text-xs ${lblClass} font-semibold`}>الفترة إلى</td>
                      <td className="p-2.5 text-xs font-bold text-[var(--inv-primary)]">{fd(currentInvoices[currentInvoices.length - 1].period_to)}</td>
                    </tr>}
                  </>
                ) : (
                  <>
                    {pGet('show_due_date') && <tr className="border-b border-gray-100 bg-gray-50">
                      <td className={`p-2.5 text-xs ${lblClass} font-semibold`}>تاريخ الاستحقاق</td>
                      <td className="p-2.5 text-xs font-bold text-[var(--inv-primary)]">{fd(currentInvoices[0].due_date)}</td>
                    </tr>}
                    {pGet('show_period') && currentInvoices[0].period_from && (
                      <tr className="border-b border-gray-100 bg-white">
                        <td className={`p-2.5 text-xs ${lblClass} font-semibold`}>الفترة</td>
                        <td className="p-2.5 text-xs font-bold text-[var(--inv-primary)]">{fd(currentInvoices[0].period_from)} → {fd(currentInvoices[0].period_to)}</td>
                      </tr>
                    )}
                  </>
                )}
                {pGet('show_status') && <tr className="bg-gray-50">
                  <td className={`p-2.5 text-xs ${lblClass} font-semibold`}>الحالة</td>
                  <td className="p-2.5 text-xs font-bold text-[var(--inv-primary)]">{currentInvoices[0].status || '—'}</td>
                </tr>}
              </tbody>
            </table>
          </div>

          {/* Multi invoices table */}
          {isMultiple && (
            <div className="border-2 border-[var(--inv-primary)] rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[var(--inv-primary)] text-[#e8b748]">
                    <th className="p-2.5 text-right font-bold text-xs">رقم الفاتورة</th>
                    <th className="p-2.5 text-right font-bold text-xs">الفترة</th>
                    <th className="p-2.5 text-right font-bold text-xs">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInvoices.map((inv, i) => (
                    <tr key={inv.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-2.5 text-xs text-[var(--inv-primary)]">{inv.invoice_number}</td>
                      <td className="p-2.5 text-xs text-gray-500">{inv.period_from ? fd(inv.period_from) : ''} - {inv.period_to ? fd(inv.period_to) : ''}</td>
                      <td className="p-2.5 text-xs font-bold text-[var(--inv-primary)]">{inv.amount?.toLocaleString()} د.ع</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total */}
          <div className="bg-gradient-to-l from-[var(--inv-primary)] to-[var(--inv-primary-end)] rounded-xl p-4 mb-5 flex justify-between items-center">
            <span className="text-sm font-bold text-white/80">المبلغ الإجمالي المستحق</span>
            <div className="text-left">
              <span className="text-2xl font-black text-[#e8b748]">{totalAmount.toLocaleString()}</span>
              <span className="text-xs text-white/60 mr-1">د.ع</span>
            </div>
          </div>

          {/* Footer */}
          {pGet('show_footer') && (
            <div className="text-center border-t-2 border-[var(--inv-primary)] pt-4">
              <p className="text-sm font-bold text-[var(--inv-primary)] mb-1">شكراً لسداد المبالغ في مواعيدها</p>
              <p className={`text-xs ${lblClass}`}>للاستفسار يرجى التواصل مع إدارة الشركة</p>
              <p className={`text-[10px] ${lblClassLight} mt-2`}>{(isRent || isInsurance) ? [branch?.name, branch?.company_phone && '📞 ' + branch.company_phone].filter(Boolean).join(' • ') : 'تم إصدار هذه الوثيقة من نظام إدارة العقارات'}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 px-5 py-4 flex gap-3 justify-end bg-white">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
          <Button onClick={handlePrint} className="gap-2 bg-[var(--inv-primary)] hover:bg-[var(--inv-primary-end)]">
            <Printer className="w-4 h-4" />
            {isMultiple ? `طباعة ${currentInvoices.length} فواتير` : 'طباعة'}
          </Button>
        </div>
      </div>
    </div>
  );
}