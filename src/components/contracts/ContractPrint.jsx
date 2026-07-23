import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';

export default function ContractPrint({ contract, branch, onClose }) {
  const { data: defaultClauses = [] } = useQuery({
    queryKey: ['contract-clauses'],
    queryFn: () => firebaseApi.entities.ContractClause.list('order'),
  });
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => firebaseApi.entities.Property.list(),
  });
  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });
  const { data: barcodeSettingsList = [] } = useQuery({
    queryKey: ['barcode_settings'],
    queryFn: () => firebaseApi.entities.BarcodeSettings.list(),
  });
  const property = properties.find(p => p.id === contract.property_id);
  const barcodeSettings = barcodeSettingsList.find(s => s.doc_type === 'rent_contract') || {};
  const { lang } = useLanguage();
  const appSettings = settingsList.find(s => s.key === 'default') || {};
  const ps = appSettings.print_rent_contract || {}; // print settings shorthand
  const pGet = (key, fallback = true) => ps[key] !== undefined ? ps[key] : fallback;
  const pGetNum = (key, fallback) => ps[key] !== undefined ? ps[key] : fallback;

  // Build barcode URL for rent contract
  const buildRentContractBarcodeUrl = () => {
    if (barcodeSettings.enabled === false) return null;
    const cd = (barcodeSettings.custom_domain || '').replace(/\/$/, '');
    const origin = cd || window.location.origin;
    // Determine status key from contract status
    let statusKey = 'under_work';
    if (contract.status === 'ملغي' || contract.status === 'هەڵوەشێنراوەتەوە') statusKey = 'cancelled';
    else if (contract.status === 'منتهي' || contract.status === 'کۆتاییهاتو') statusKey = 'expired';
    else if (contract.is_verified) statusKey = 'verified';
    return `${origin}/barcode-view?doc=rent_contract&text=${encodeURIComponent(`${contract.contract_number || ''}|${statusKey}`)}`;
  };
  const rentContractBarcodeUrl = buildRentContractBarcodeUrl();
  const barcodeSize = barcodeSettings.size || 60;
  const barcodeBorderColor = barcodeSettings.border_color || '#1a2744';
  const barcodeShowBorder = barcodeSettings.show_border !== false;
  const marginTop = pGetNum('margin_top', 8);
  const marginBottom = pGetNum('margin_bottom', 8);
  const marginLeft = pGetNum('margin_left', 10);
  const marginRight = pGetNum('margin_right', 10);
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const logoUrl = branch?.company_logo || contract.company_logo;
  const companyName = branch?.company_name || contract.company_name || L('نظام إدارة العقارات', 'سیستەمی بەڕێوەبردنی خانووبەرە');
  const companySlogan = lang === 'ku' ? (branch?.contract_slogan_ku || branch?.company_slogan_ku || '') : (branch?.contract_slogan || branch?.company_slogan || '');
  
  // Kurdish translations with proper Sorani Kurdish
  const translations = {
    contractTitle: lang === 'ku' ? 'گرێبەستی کرێ' : 'عقد إيجار',
    contractNumber: lang === 'ku' ? 'ژمارەی گرێبەست' : 'رقم العقد',
    signatureDate: lang === 'ku' ? 'بەرواری واژۆ' : 'تاريخ التوقيع',
    parties: lang === 'ku' ? 'لایەنەکانی گرێبەست' : 'أطراف العقد',
    firstParty: lang === 'ku' ? 'لایەنی یەکەم' : 'الطرف الأول',
    secondParty: lang === 'ku' ? 'لایەنی دووەم' : 'الطرف الثاني',
    thirdParty: lang === 'ku' ? 'رێکخەری گرێبەست' : 'منظم العقد',
    tenant: lang === 'ku' ? 'کرێچی' : 'المستأجر',
    owner: lang === 'ku' ? 'خاوەن' : 'المالك',
    company: lang === 'ku' ? '' : '',
    name: lang === 'ku' ? 'ناو' : 'الاسم',
    phone: lang === 'ku' ? 'ژمارەی تەلەفۆن' : 'رقم الهاتف',
    email: lang === 'ku' ? 'ئیمەیڵ' : 'البريد الإلكتروني',
    nationality: lang === 'ku' ? 'نەتەوە' : 'الجنسية',
    address: lang === 'ku' ? 'ناونیشان' : 'العنوان',
    propertyInfo: lang === 'ku' ? 'زانیارییەکانی خانووبەرە و ماوە' : 'بيانات العقار والمدة',
    propertyName: lang === 'ku' ? 'ناوی خانووبەرە' : 'اسم العقار',
    propertyType: lang === 'ku' ? 'جۆری خانووبەرە' : 'نوع العقار',
    propertyLocation: lang === 'ku' ? 'شوێنی خانووبەرە' : 'موقع العقار',
    purpose: lang === 'ku' ? 'ئامانجی کرێ' : 'غرض الإيجار',
    paymentMethod: lang === 'ku' ? 'شێوازی پارەدان' : 'طريقة الدفع',
    startDate: lang === 'ku' ? 'بەرواری دەستپێکردن' : 'تاريخ البداية',
    endDate: lang === 'ku' ? 'بەرواری کۆتاییهاتن' : 'تاريخ الانتهاء',
    duration: lang === 'ku' ? 'ماوەی گرێبەست' : 'مدة العقد',
    month: lang === 'ku' ? 'مانگ' : 'شهر',
    financialInfo: lang === 'ku' ? 'زانیارییە داراییەکان' : 'البيانات المالية',
    monthlyRent: lang === 'ku' ? 'کرێی مانگانە' : 'الإيجار الشهري',
    totalRent: lang === 'ku' ? 'کۆی گشتی کرێ' : 'إجمالي الإيجار',
    dailyRent: lang === 'ku' ? 'کرێی رۆژانە' : 'إيجار اليوم الواحد',
    insurance: lang === 'ku' ? 'بڕی دڵنیایی' : 'مبلغ التأمين',
    insuranceWarning: lang === 'ku' ? `ئاگاداری: دەرچوون پێش تەواوبوونی گرێبەست بە (${contract.notice_period_months || 6} مانگ)، دڵنیایی (تأمینات) بۆ ناگەرێتەوە.` : `تنبيه: في حال مغادرة المستأجر للعقار قبل انتهاء مدة العقد بـ (${contract.notice_period_months || 6} أشهر)، لن يتم استرداد مبلغ التأمين.`,
    currency: lang === 'ku' ? 'دیناری عێراقی' : 'دينار عراقي',
    clauses: lang === 'ku' ? 'بەند و مەرجەکان' : 'البنود والشروط',
    signatures: lang === 'ku' ? 'واژۆکان' : 'التوقيعات',
    footerText: lang === 'ku' ? 'ئەم گرێبەستە دەەرێندراوە لە سیستەمی بەڕێوەبردنی خانووبەرە - هەموو مافەکان پارێزراوە' : 'تم إصدار هذا العقد من نظام إدارة العقارات - جميع الحقوق محفوظة',
    printContract: lang === 'ku' ? 'چاپکردنی گرێبەست' : 'طباعة العقد',
    close: lang === 'ku' ? 'داخستن' : 'إغلاق',
    preview: lang === 'ku' ? 'پێشبینی گرێبەست' : 'معاينة العقد',
  };
  // Use contract's saved clauses if available, otherwise fall back to default clauses
  const clausesToShow = (contract.clauses && contract.clauses.length > 0)
    ? contract.clauses
    : defaultClauses.filter(c => c.is_active !== false).map(c => ({ title: c.title, description: c.description }));

  const fd = (d) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const fontFamily = lang === 'ku' ? "'Noto Sans Arabic','Arial',sans-serif" : "'Tajawal','Arial',sans-serif";
    const clausesHtml = (pGet('show_clauses') && clausesToShow.length > 0)
      ? `<div class="section">
          <div class="section-head">${translations.clauses}</div>
          <div class="section-body">
            ${clausesToShow.map((c, i) => {
              const text = (c.title || '') + ' ' + (c.description || '');
              const startsNewPage = /تأمين|تأمین|دڵنیایی|insurance|رەزامەندی واژوو|رضا بالتوقيع/i.test(text);
              const allowBreak = /تایبەت بە موڵک|خاص بالعقار/i.test(text);
              const style = startsNewPage
                ? 'page-break-before: always; break-before: page; page-break-inside: avoid; break-inside: avoid;'
                : (allowBreak ? 'page-break-inside: auto !important; break-inside: auto !important;' : '');
              return `
              <div class="clause"${style ? ' style="' + style + '"' : ''}>
                <div class="clause-num">${i + 1}- ${c.title || ''}</div>
                <div class="clause-desc">${c.description || ''}</div>
              </div>`;
            }).join('')}
          </div>
        </div>`
      : '';

    const rcBarcode = (() => {
      if (!rentContractBarcodeUrl) return '';
      const sz = barcodeSize;
      const bc = barcodeBorderColor;
      const sb = barcodeShowBorder;
      const bstyle = sb ? `border:2px solid ${bc};padding:4px;border-radius:6px;display:inline-block;` : '';
      return `<div style="text-align:center;margin-top:10px;"><div style="${bstyle}"><img src="https://api.qrserver.com/v1/create-qr-code/?size=${sz}x${sz}&data=${encodeURIComponent(rentContractBarcodeUrl)}" style="width:${sz}px;height:${sz}px;" /></div></div>`;
    })();

    const signaturesHtml = pGet('show_signatures') ? `
      <div class="section">
        <div class="section-head">${translations.signatures}</div>
        <div class="section-body">
          <div class="sig-grid">
            <div class="sig-box">
              <div class="sig-label">${translations.firstParty} — ${translations.tenant}</div>
              <div class="sig-area"></div>
              <div class="sig-name">${contract.tenant_name || ''}</div>
            </div>
            <div class="sig-box">
              <div class="sig-label">${translations.thirdParty}</div>
              ${rcBarcode}
              <div class="sig-area">${contract.company_representative ? `<div class="sig-rep-name">${contract.company_representative}</div>` : ''}</div>
              <div class="sig-name">${companyName}</div>
            </div>
            <div class="sig-box">
              <div class="sig-label">${translations.secondParty} — ${translations.owner}</div>
              <div class="sig-area"></div>
              <div class="sig-name">${contract.owner_name || ''}</div>
            </div>
          </div>
        </div>
      </div>` : '';

    const branchName = lang === 'ku' ? (branch?.name_ku || branch?.name || '') : (branch?.name || '');
    const footerParts = [];
    if (branchName) footerParts.push(branchName);
    if (companyPhone) footerParts.push(`📞 ${companyPhone}`);
    const footerHtml = pGet('show_footer') ? `
      <div class="footer">
        <div>${translations.footerText}</div>
        ${footerParts.length > 0 ? `<div style="font-weight:700;color:#1a2744;margin-top:3px;">${footerParts.join(' • ')}</div>` : ''}
      </div>` : '';

    const logoHtml = (showLogo && pGet('show_logo'))
      ? `<div class="logo-wrap">${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : `<span class="logo-initial">${(companyName || 'ع').charAt(0)}</span>`}</div>`
      : `<div style="width:80px;flex-shrink:0;"></div>`;

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="${lang}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${translations.contractTitle} - ${contract.contract_number || ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Arabic:wght@300;400;500;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
body { font-family: ${fontFamily}; color: #1a2744; direction: rtl; background: white; padding: 0 ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; }
@page { margin: 0; size: A4; }
@media print { 
  .keep-together { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; }
  .keep-together > * { page-break-inside: avoid !important; break-inside: avoid !important; }
  .section { page-break-inside: avoid !important; break-inside: avoid !important; }
}
.page-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.page-table > tbody > tr > td { padding: 0; border: 0; vertical-align: top; }
.page-top-spacer { height: 10mm; }
.header { display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 15px; padding: 20px 24px; margin-bottom: 16px; border-radius: 20px; direction: rtl; background: linear-gradient(135deg, #4db8c4 0%, #2fa9b8 100%); box-shadow: 0 8px 24px rgba(77,184,196,0.25); }
.logo-wrap { width: 90px; height: 90px; flex-shrink: 0; border-radius: 24px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: white; box-shadow: none; }
.logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
.logo-initial { font-size: 44px; font-weight: 800; color: #0d9488; }
.company-info { flex: 1; text-align: center; }
.company-name { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 4px; }
.company-rep { font-size: 13px; color: #ffffff; font-weight: 500; }
.contract-badge { text-align: right; flex-shrink: 0; }
.badge-title { display: inline-block; background: white; color: #0d7377; font-size: 15px; font-weight: 700; padding: 10px 18px; border-radius: 12px; margin-bottom: 8px; box-shadow: none; }
.badge-num { font-size: 11px; color: #ffffff; margin-bottom: 2px; font-weight: 600; }
.badge-date { font-size: 11px; color: #ffffff; font-weight: 600; }
.section { margin-bottom: 12px; }
.section-head { display: flex; align-items: center; justify-content: flex-start; background: linear-gradient(135deg, #e0f7fa 0%, #f0fdfe 100%); color: #2fa9b8; padding: 12px 16px; font-size: 15px; font-weight: 700; margin-bottom: 14px; margin-top: 8px; border-radius: 12px; border: 1px solid #2fa9b8; text-align: right; direction: rtl; }
.section-head::before { content: '●●●'; color: #2fa9b8; font-size: 10px; font-weight: 700; letter-spacing: 3px; margin-left: 8px; }
.section-body { border: 0.5px solid #2fa9b8; padding: 16px; background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%); border-radius: 12px; text-align: right; }
.data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.data-cell { background: #ffffff; padding: 14px 16px; border-radius: 12px; border: 0.5px solid #2fa9b8; box-shadow: 0 4px 16px rgba(47,169,184,0.25); }
.data-cell.location-cell { grid-column: span 2; }
.data-lbl { font-size: 13px; color: #ffffff; font-weight: 700; margin-bottom: 4px; white-space: nowrap; background: #393d43; padding: 6px 10px; border-radius: 6px; border: none; display: flex; align-items: center; text-shadow: 0 1px 3px rgba(0,0,0,0.5); width: 100%; text-align: right; min-height: 32px; }
.data-val { font-size: 14px; font-weight: 700; color: #000000; word-wrap: break-word; background: linear-gradient(135deg,#ffffff 0%,#f0fdfa 100%); padding: 4px 12px; border-radius: 10px; border: 0.5px solid #2fa9b8; display: block; margin-top: 6px; min-height: 28px; }
.parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.party-card { border-radius: 12px; overflow: hidden; background: linear-gradient(135deg,#ffffff 0%,#f0fdfa 100%); border: 0.5px solid #2fa9b8; }
.party-header { padding: 12px 16px; background: linear-gradient(135deg,#e0f7fa 0%,#f0fdfe 100%); border-bottom: 1px solid #2fa9b8; text-align: center; }
.party-name-title { font-size: 16px; font-weight: 700; color: #0d7377; margin-bottom: 6px; }
.party-role-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 6px 16px; background: linear-gradient(135deg,#2fa9b8 0%,#4db8c4 100%); color: #ffffff; border-radius: 20px; }
.party-body { padding: 16px 20px; direction: rtl; background: linear-gradient(135deg,#ffffff 0%,#f9fafb 100%); }
.party-row { display: flex; gap: 10px; margin-bottom: 12px; font-size: 13px; align-items: flex-start; }
.party-label { color: #ffffff; font-weight: 700; flex-shrink: 0; width: 100px; font-size: 11px; background: #393d43; padding: 6px 10px; border-radius: 8px; min-height: 32px; display: flex; align-items: center; }
.party-value { color: #000000; font-weight: 700; flex: 1; font-size: 13px; background: linear-gradient(135deg,#ffffff 0%,#f0fdfa 100%); padding: 6px 10px; border-radius: 8px; border: 0.5px solid #2fa9b8; word-break: break-all; min-height: 32px; display: flex; align-items: center; }
.finance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
.finance-card { padding: 16px; text-align: center; border-radius: 16px; border: 1px solid #2fa9b8; background: linear-gradient(135deg,#ffffff 0%,#fafbfc 100%); }
.finance-lbl { font-size: 10px; color: #9ca3af; font-weight: 600; margin-bottom: 6px; }
.finance-val { font-size: 18px; font-weight: 700; color: #1f2937; }
.clause { margin-bottom: 16px; padding: 18px 20px; background: linear-gradient(135deg,#ffffff 0%,#fafbfc 100%); border: 1px solid #2fa9b8; border-radius: 16px; direction: rtl; text-align: right; }
.clause-num { font-size: 15px; font-weight: 800; color: #d97706; margin-bottom: 10px; display: block; }
.clause-desc { font-size: 14px; color: #424242; line-height: 2; text-align: justify; direction: rtl; display: block; margin-top: 8px; white-space: pre-line; font-weight: 500; }
.sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding-top: 16px; }
.sig-box { text-align: center; padding: 18px; border: 1.5px solid #94a3b8; border-radius: 16px; background: linear-gradient(135deg,#ffffff 0%,#fafbfc 100%); display: flex; flex-direction: column; }
.sig-label { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; }
.sig-area { flex: 1; min-height: 70px; border-bottom: 2px solid #1f2937; margin-bottom: 10px; display: flex; flex-direction: column; justify-content: flex-end; }
.sig-rep-name { font-size: 12px; font-weight: 700; color: #1f2937; text-align: center; padding-bottom: 4px; }
.sig-name { font-size: 12px; font-weight: 700; color: #1f2937; margin-bottom: 2px; }
.sig-company { font-size: 11px; color: #6b7280; }
.footer { margin-top: 20px; text-align: center; border-top: 2px solid #e5e7eb; padding-top: 16px; color: #6b7280; font-size: 11px; font-weight: 600; }
.footer-date { margin-top: 6px; color: #374151; font-size: 12px; font-weight: 700; }
</style>
</head>
<body>
  <table class="page-table"><thead><tr><td class="page-top-spacer"></td></tr></thead><tbody><tr><td>
  <div class="header">
    <div class="contract-badge">
      <div class="badge-title">${translations.contractTitle}</div>
      ${pGet('show_contract_number') ? `<div class="badge-num">${translations.contractNumber}: ${contract.contract_number || ''}</div>` : ''}
      ${pGet('show_signature_date') && contract.signature_date ? `<div class="badge-date">${translations.signatureDate}: ${fd(contract.signature_date)}</div>` : ''}
    </div>
    <div class="company-info">
      ${pGet('show_company_name') ? `<div class="company-name">${companyName}</div>` : ''}
      ${companySlogan ? `<div class="company-rep" style="color:#e8b748;font-weight:700;">${companySlogan}</div>` : ''}
      ${showSubtitle ? `<div class="company-rep">${displaySubtitle}</div>` : ''}
    </div>
    ${logoHtml}
  </div>

  <div class="section">
    <div class="section-head">${translations.parties}</div>
    <div class="section-body">
      <div class="parties-grid">
        <div class="party-card">
          <div class="party-header">
            <div class="party-name-title">${contract.tenant_name || translations.tenant}</div>
            <div class="party-role-badge">${translations.firstParty} — ${translations.tenant}</div>
          </div>
          <div class="party-body">
            ${pGet('show_tenant_phone') && contract.tenant_phone ? `<div class="party-row"><span class="party-label">${translations.phone}:</span><span class="party-value">${contract.tenant_phone}</span></div>` : ''}
            ${pGet('show_tenant_nationality') && contract.tenant_nationality ? `<div class="party-row"><span class="party-label">${translations.nationality}:</span><span class="party-value">${contract.tenant_nationality}</span></div>` : ''}
            ${pGet('show_tenant_address') && contract.tenant_address ? `<div class="party-row"><span class="party-label">${translations.address}:</span><span class="party-value">${contract.tenant_address}</span></div>` : ''}
            ${pGet('show_tenant_email') && contract.tenant_email ? `<div class="party-row"><span class="party-label">${translations.email}:</span><span class="party-value">${contract.tenant_email}</span></div>` : ''}
          </div>
        </div>
        <div class="party-card">
          <div class="party-header">
            <div class="party-name-title">${contract.owner_name || translations.owner}</div>
            <div class="party-role-badge">${translations.secondParty} — ${translations.owner}</div>
          </div>
          <div class="party-body">
            ${pGet('show_owner_phone') && contract.owner_phone ? `<div class="party-row"><span class="party-label">${translations.phone}:</span><span class="party-value">${contract.owner_phone}</span></div>` : ''}
            ${pGet('show_owner_nationality') && contract.owner_nationality ? `<div class="party-row"><span class="party-label">${translations.nationality}:</span><span class="party-value">${contract.owner_nationality}</span></div>` : ''}
            ${pGet('show_owner_address') && contract.owner_address ? `<div class="party-row"><span class="party-label">${translations.address}:</span><span class="party-value">${contract.owner_address}</span></div>` : ''}
            ${pGet('show_owner_email') && contract.owner_email ? `<div class="party-row"><span class="party-label">${translations.email}:</span><span class="party-value">${contract.owner_email}</span></div>` : ''}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-head">${translations.propertyInfo}</div>
    <div class="section-body">
      <div class="data-grid">
        <div class="data-cell"><div class="data-lbl">${translations.propertyName}</div><div class="data-val">${contract.property_name || '—'}</div></div>
        ${pGet('show_property_type') && property?.type ? `<div class="data-cell"><div class="data-lbl">${translations.propertyType}</div><div class="data-val">${property.type}</div></div>` : ''}
        ${pGet('show_property_location') && (property?.address || property?.address_ku) ? `<div class="data-cell location-cell"><div class="data-lbl">${translations.propertyLocation}</div><div class="data-val">${lang === 'ku' ? (property.address_ku || property.address) : property.address}</div></div>` : ''}
        ${pGet('show_purpose') && contract.purpose ? `<div class="data-cell"><div class="data-lbl">${translations.purpose}</div><div class="data-val">${contract.purpose}</div></div>` : ''}
        ${contract.payment_method ? `<div class="data-cell"><div class="data-lbl">${translations.paymentMethod}</div><div class="data-val">${contract.payment_method}</div></div>` : ''}
        <div class="data-cell"><div class="data-lbl">${translations.startDate}</div><div class="data-val">${contract.start_date ? fd(contract.start_date) : '—'}</div></div>
        <div class="data-cell"><div class="data-lbl">${translations.endDate}</div><div class="data-val">${contract.end_date ? fd(contract.end_date) : '—'}</div></div>
        <div class="data-cell"><div class="data-lbl">${translations.duration}</div><div class="data-val">${contract.duration_months || '—'} ${translations.month}</div></div>
      </div>
    </div>
  </div>



  <div style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:flex-start;background:linear-gradient(135deg,#fff7ed 0%,#fffbf5 100%);color:#f97316;padding:12px 16px;font-size:15px;font-weight:700;margin-bottom:14px;margin-top:8px;border-radius:12px;border:1.5px solid #f97316;text-align:right;direction:rtl;"><span style="font-size:10px;font-weight:700;letter-spacing:3px;margin-left:8px;">●●●</span> ${translations.financialInfo}</div>
    <div style="border:1.5px solid #f97316;padding:16px;background:linear-gradient(135deg,#fff7ed 0%,#fffbf5 100%);border-radius:12px;text-align:right;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;">
        <div style="background:#fff;padding:10px;border-radius:14px;border:1.5px solid #f97316;text-align:center;">
          <div style="font-size:11px;color:#fff;font-weight:700;background:#f97316;padding:4px 10px;border-radius:8px;margin-bottom:6px;">${translations.monthlyRent}</div>
          <div style="font-size:16px;font-weight:800;color:#1a2744;">${(contract.monthly_rent || 0).toLocaleString()}</div>
          <div style="font-size:11px;color:#f97316;font-weight:600;margin-top:2px;">${contract.currency_symbol || 'د.ع'}</div>
        </div>
        <div style="background:#fff;padding:10px;border-radius:14px;border:1.5px solid #ef4444;text-align:center;">
          <div style="font-size:11px;color:#fff;font-weight:700;background:#ef4444;padding:4px 10px;border-radius:8px;margin-bottom:6px;">${translations.totalRent}</div>
          <div style="font-size:16px;font-weight:800;color:#1a2744;">${(contract.total_rent || 0).toLocaleString()}</div>
          <div style="font-size:11px;color:#ef4444;font-weight:600;margin-top:2px;">${contract.currency_symbol || 'د.ع'}</div>
        </div>
        ${pGet('show_daily_rent') ? `<div style="background:#fff;padding:10px;border-radius:14px;border:1.5px solid #eab308;text-align:center;"><div style="font-size:11px;color:#fff;font-weight:700;background:#eab308;padding:4px 10px;border-radius:8px;margin-bottom:6px;">${translations.dailyRent}</div><div style="font-size:16px;font-weight:800;color:#1a2744;">${(contract.daily_rent || 0).toLocaleString()}</div><div style="font-size:11px;color:#a16207;font-weight:600;margin-top:2px;">${contract.currency_symbol || 'د.ع'}</div></div>` : ''}
        ${pGet('show_insurance') ? `<div style="background:#fff;padding:10px;border-radius:14px;border:1.5px solid #8b5cf6;text-align:center;"><div style="font-size:11px;color:#fff;font-weight:700;background:#8b5cf6;padding:4px 10px;border-radius:8px;margin-bottom:6px;">${translations.insurance}</div><div style="font-size:16px;font-weight:800;color:#1a2744;">${(contract.insurance_amount || 0).toLocaleString()}</div><div style="font-size:11px;color:#8b5cf6;font-weight:600;margin-top:2px;">${contract.currency_symbol || 'د.ع'}</div></div>` : ''}
      </div>
      <div style="margin-top:8px;padding:8px 12px;background:#fef2f2;border:1.5px solid #dc2626;border-radius:10px;color:#991b1b;font-size:12px;font-weight:700;">⚠️ ${translations.insuranceWarning}</div>
    </div>
  </div>

  ${clausesHtml}

  ${signaturesHtml}
  ${footerHtml}
  </td></tr></tbody></table>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  const companyPhone = branch?.company_phone || contract.company_phone;
  const showLogo = branch?.banner_show_logo !== false;
  const showPhone = branch?.banner_show_phone !== false;
  const showArabicSubtitle = branch?.banner_show_arabic_subtitle !== false;
  const showKurdishSubtitle = branch?.banner_show_kurdish_subtitle !== false;
  const arabicSubtitle = branch?.banner_arabic_subtitle || 'قسم الفواتير والمتابعة المالية';
  const kurdishSubtitle = branch?.banner_kurdish_subtitle || 'بەشی پسوولە و شوێنکەوتنی داراییەکان';
  const displaySubtitle = lang === 'ku' ? kurdishSubtitle : arabicSubtitle;
  const showSubtitle = lang === 'ku' ? showKurdishSubtitle : showArabicSubtitle;
  const bannerPrimaryColor = branch?.banner_primary_color || '#1a2744';
  const bannerSecondaryColor = branch?.banner_secondary_color || '#e8b748';
  const bannerGradientEnabled = branch?.banner_gradient_enabled !== false;
  const bannerGradientEndColor = branch?.banner_gradient_end_color || '#2a3f6e';


  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg text-[#1a2744]">{translations.preview}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2" variant="outline">
              <Printer className="w-4 h-4" />
              {translations.printContract}
            </Button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Document Body - EXACT copy of print HTML/CSS */}
        <div className="container" dir="rtl" style={{fontFamily: lang === 'ku' ? "'Noto Sans Arabic','Arial',sans-serif" : "'Tajawal','Arial',sans-serif", color:'#1a2744', width: '100%', maxWidth: '100%', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden'}}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Arabic:wght@300;400;500;700;800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            @media print {
              .no-print { display: none !important; }
              .container { padding: 0 !important; background: white !important; min-height: auto !important; height: auto !important; }
              .page-break, .print-page-break { display: none !important; visibility: hidden !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
              .keep-together { page-break-inside: avoid !important; break-inside: avoid !important; }
              .parties-grid { page-break-inside: avoid !important; }
              .contract-section { page-break-inside: avoid !important; break-inside: avoid !important; }
              .data-row { page-break-inside: avoid !important; }
              .section { page-break-inside: avoid !important; break-inside: avoid !important; page-break-after: auto !important; break-after: auto !important; }
              .section-body { page-break-inside: avoid !important; break-inside: avoid !important; }
              .data-grid { page-break-inside: avoid !important; break-inside: avoid !important; }
              .finance-grid { page-break-inside: avoid !important; break-inside: avoid !important; }
              .clause { page-break-inside: avoid !important; break-inside: avoid !important; }
              .sig-grid { page-break-inside: avoid !important; break-inside: avoid !important; }
              .party-card { page-break-inside: avoid !important; break-inside: avoid !important; }
              .data-cell { page-break-inside: avoid !important; break-inside: avoid !important; }
              .finance-card { page-break-inside: avoid !important; break-inside: avoid !important; }
              .party-label { min-height: 32px !important; display: flex !important; align-items: center !important; }
              .party-value { min-height: 32px !important; display: flex !important; align-items: center !important; }
              .party-row { display: flex !important; gap: 10px !important; margin-bottom: 12px !important; }
              .data-lbl { min-height: 22px !important; display: flex !important; align-items: center !important; }
              .data-val { min-height: 28px !important; display: flex !important; align-items: center !important; }
              .header { margin-top: 0 !important; padding-top: 15px !important; }
              .section:first-of-type { page-break-after: avoid !important; page-break-before: avoid !important; }
              .section:nth-of-type(2) { page-break-before: avoid !important; }
              .section-head { page-break-after: avoid !important; break-after: avoid !important; }
              .keep-together { page-break-inside: avoid !important; break-inside: avoid !important; page-break-after: avoid !important; display: block !important; }
              .keep-together > * { page-break-inside: avoid !important; break-inside: avoid !important; }
              body { margin: 0 !important; padding: 0 !important; }
              @page { margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; }
            }
            .page-break, .print-page-break { 
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .container { width: 100%; padding: 3mm; background: white; min-height: auto; height: auto; position: relative; direction: rtl; }
            .arabic-text { font-family: 'Tajawal', 'Noto Sans Arabic', sans-serif; }
            .kurdish-text { font-family: 'Noto Sans Arabic', 'Tajawal', sans-serif; }
            .header { display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 15px; padding: 20px 24px; margin-bottom: 16px; border-radius: 20px; direction: rtl; background: linear-gradient(135deg, #4db8c4 0%, #2fa9b8 100%); border: none; box-shadow: 0 8px 24px rgba(77, 184, 196, 0.25); }
            .logo-wrap { width: 90px; height: 90px; flex-shrink: 0; border-radius: 24px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: white; border: none; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); }
            .logo-wrap img { width: 100%; height: 100%; object-fit: contain; }
            .logo-initial { font-size: 44px; font-weight: 800; color: #0d9488; }
            .company-info { flex: 1; text-align: center; }
            .company-name { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 4px; text-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .company-rep { font-size: 13px; color: #ffffff; font-weight: 500; text-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .contract-badge { text-align: right; flex-shrink: 0; }
            .badge-title { display: inline-block; background: white; color: #0d7377; font-size: 15px; font-weight: 700; padding: 10px 18px; border: none; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
            .badge-num { font-size: 11px; color: #ffffff; margin-bottom: 2px; font-weight: 600; }
            .badge-date { font-size: 11px; color: #ffffff; font-weight: 600; }
            .section { margin-bottom: 12px; break-inside: avoid; }
            .keep-together { page-break-inside: avoid !important; break-inside: avoid !important; display: block; }
            .keep-together > * { page-break-inside: avoid !important; break-inside: avoid !important; }
            .section-body { break-inside: avoid; }
            .data-grid { break-inside: avoid; }
            .finance-grid { break-inside: avoid; }
            .section-head { display: flex; align-items: center; justify-content: flex-start; background: linear-gradient(135deg, #e0f7fa 0%, #f0fdfe 100%); color: #2fa9b8 !important; padding: 12px 16px; font-size: 15px; font-weight: 700; margin-bottom: 14px; margin-top: 8px; border-radius: 12px; border: 1px solid #2fa9b8; text-align: right; direction: rtl; }
            .section-head::before { content: '●●●'; color: #2fa9b8; font-size: 10px; font-weight: 700; letter-spacing: 3px; margin-left: 8px; margin-right: 0; }
            .section-body { border: 0.5px solid #2fa9b8; padding: 16px; background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%); border-radius: 12px; text-align: right; box-shadow: 0 1px 3px rgba(47, 169, 184, 0.08); }
            .data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .data-cell { background: #ffffff; padding: 14px 16px; border-radius: 12px; border: 0.5px solid #2fa9b8; position: relative; box-shadow: 0 4px 16px rgba(47, 169, 184, 0.25); }
            .data-cell.location-cell { grid-column: span 2; }
            .data-cell::before { display: none; }
            .data-lbl { font-size: 13px; color: #ffffff; font-weight: 700; margin-bottom: 4px; white-space: nowrap; background: #393d43; padding: 3px 10px; border-radius: 6px; border: none; display: flex; align-items: center; text-shadow: 0 1px 3px rgba(0,0,0,0.5); width: 100%; text-align: right; min-height: 22px; }
            .data-val { font-size: 14px; font-weight: 700; color: #000000; white-space: normal; word-wrap: break-word; background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%); padding: 4px 12px; border-radius: 10px; border: 0.5px solid #2fa9b8; display: block; margin-top: 6px; box-shadow: 0 1px 3px rgba(47, 169, 184, 0.08); text-shadow: 0 1px 2px rgba(255,255,255,0.8); min-height: 28px; }
.data-cell:first-child .data-val { font-size: 12px; font-weight: 700; color: #000000; background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%); border: 0.5px solid #2fa9b8; box-shadow: 0 1px 3px rgba(47, 169, 184, 0.08); text-shadow: 0 1px 2px rgba(255,255,255,0.8); padding: 4px 12px; min-height: 28px; }
            .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            @media (max-width: 600px) {
              .parties-grid { grid-template-columns: 1fr; }
              .data-grid { grid-template-columns: 1fr 1fr; }
              .data-cell.location-cell { grid-column: span 2; }
              .party-label { min-width: 60px; font-size: 11px; }
              .party-value { font-size: 12px; }
              .party-row { flex-wrap: wrap; }
              .header { flex-direction: column; align-items: center; text-align: center; gap: 10px; }
              .contract-badge { text-align: center; }
              .sig-grid { grid-template-columns: 1fr; }
            }
            @media print {
              .party-label { min-height: 32px !important; display: flex !important; align-items: center !important; }
              .party-value { min-height: 32px !important; display: flex !important; align-items: center !important; }
            }
            .party-card { min-height: 280px; }
            .party-card { border-radius: 12px; overflow: hidden; background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%); border: 0.5px solid #2fa9b8; box-shadow: 0 1px 3px rgba(47, 169, 184, 0.08); transition: all 0.3s ease; }
            .party-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(47, 169, 184, 0.12); border-color: #2fa9b8; }
            .party-header { padding: 12px 16px; background: linear-gradient(135deg, #e0f7fa 0%, #f0fdfe 100%); border-bottom: 1px solid #2fa9b8; text-align: center; }
            .party-title-box { display: inline-block; padding: 8px 16px; border: 0.5px solid #2fa9b8; border-radius: 8px; background: white; position: relative; box-shadow: 0 1px 3px rgba(47, 169, 184, 0.08); }
            .party-title-box::before { display: none; }
            .party-name-title { font-size: 16px; font-weight: 700; color: #0d7377; margin-bottom: 6px; font-family: 'Tajawal', sans-serif; letter-spacing: -0.3px; }
            .party-role-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 6px 16px; background: linear-gradient(135deg, #2fa9b8 0%, #4db8c4 100%); color: #ffffff; border-radius: 20px; box-shadow: 0 4px 12px rgba(47, 169, 184, 0.3); }
            .party-body { padding: 16px 20px; direction: rtl; background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); flex: 1; }
            .party-row { display: flex; gap: 10px; margin-bottom: 12px; font-size: 13px; align-items: flex-start; padding: 0; background: transparent; border-radius: 0; border: none; box-shadow: none; overflow: hidden; }
            .party-row:hover { transform: none; }
            .party-row:last-child { margin-bottom: 0; }
            .party-label { color: #ffffff; font-weight: 700; flex-shrink: 0; width: 100px; font-size: 11px; background: #393d43; padding: 6px 10px; border-radius: 8px; border: none; box-shadow: none; text-shadow: 0 1px 3px rgba(0,0,0,0.5); min-height: 32px; display: flex; align-items: center; }
            .party-value { color: #000000; font-weight: 700; flex: 1; font-size: 13px; background: linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%); padding: 6px 10px; border-radius: 8px; border: 0.5px solid #2fa9b8; word-break: break-all; overflow-wrap: break-word; min-width: 0; box-shadow: 0 1px 3px rgba(47, 169, 184, 0.08); text-shadow: 0 1px 2px rgba(255,255,255,0.8); min-height: 32px; display: flex; align-items: center; }
            .finance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
            .finance-card { padding: 16px; text-align: center; border-radius: 16px; border: 1px solid #2fa9b8; background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%); position: relative; box-shadow: 0 3px 12px rgba(47, 169, 184, 0.1); transition: all 0.3s ease; overflow: hidden; }
            .finance-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(47, 169, 184, 0.15); border-color: #0d7377; }
            .finance-card::before { display: none; }
            .finance-badge { display: none; }
            .finance-badge.orange { display: none; }
            .finance-badge.pink { display: none; }
            .finance-badge.green { display: none; }
            .finance-badge.gold { display: none; }
            .finance-lbl { font-size: 10px; color: #9ca3af; font-weight: 600; margin-bottom: 6px; letter-spacing: 0; }
            .finance-val { font-size: 18px; font-weight: 700; color: #1f2937; text-shadow: none; }
            .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 14px; margin-top: 12px; border-radius: 6px; font-size: 12px; color: #991b1b; line-height: 1.6; }
            .clause { margin-bottom: 16px; padding: 18px 20px; background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%); border: 1px solid #2fa9b8; border-radius: 16px; direction: rtl; text-align: right; box-shadow: 0 3px 12px rgba(47, 169, 184, 0.08); }
            .clause-num { font-size: 15px; font-weight: 800; color: #d97706; margin-bottom: 10px; display: block; text-align: right; }
            .clause-title { font-size: 14px; font-weight: 700; color: #1f2937; margin-bottom: 8px; display: block; text-align: right; }
            .clause-desc { font-size: 16px; color: #424242; line-height: 2; text-align: justify; direction: rtl; display: block; margin-top: 8px; white-space: pre-line; font-weight: 500; }
            .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding-top: 16px; }
            .sig-box { text-align: center; padding: 18px; border: 1px solid #e0f0f2; border-radius: 16px; background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%); box-shadow: 0 3px 12px rgba(47, 169, 184, 0.08); }
            .sig-label { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; }
            .sig-area { height: 50px; border-bottom: 2px solid #e5e7eb; margin-bottom: 10px; }
            .sig-name { font-size: 12px; font-weight: 700; color: #1f2937; margin-bottom: 2px; }
            .sig-company { font-size: 11px; color: #6b7280; }
            .footer { margin-top: 20px; text-align: center; border-top: 2px solid #e5e7eb; padding-top: 16px; color: #6b7280; font-size: 11px; font-weight: 600; }
            .footer-date { margin-top: 6px; color: #374151; font-size: 12px; font-weight: 700; }
          `}</style>
          
          {/* HEADER + PARTIES + PROPERTY together on first page */}
          <div className="keep-together">
          {/* HEADER: badge right, company center, logo left */}
          <div className="header" style={{direction:'rtl'}}>
            <div className="contract-badge" style={{textAlign:'right'}}>
              <div className="badge-title">{translations.contractTitle}</div>
              {pGet('show_contract_number') && <div className="badge-num">{translations.contractNumber}: {contract.contract_number}</div>}
              {pGet('show_signature_date') && contract.signature_date && <div className="badge-date">{translations.signatureDate}: {fd(contract.signature_date)}</div>}
            </div>
            <div className="company-info">
              {pGet('show_company_name') && <div className="company-name">{companyName}</div>}
              {companySlogan && <div className="company-rep" style={{color:'#e8b748',fontWeight:700}}>{companySlogan}</div>}
              {showSubtitle && <div className="company-rep">{displaySubtitle}</div>}
            </div>
            {(showLogo && pGet('show_logo')) ? (
              <div className="logo-wrap">
                {logoUrl
                  ? <img src={logoUrl} alt="logo" />
                  : <span className="logo-initial">{(companyName || 'ع').charAt(0)}</span>}
              </div>
            ) : <div style={{width:'80px',flexShrink:'0'}}></div>}
          </div>
          <div className="section">
            <div className={`section-head ${lang === 'ku' ? 'kurdish-text' : 'arabic-text'}`}>{translations.parties}</div>
            <div className="section-body">
              <div className="parties-grid">
                <div className="party-card">
                   <div className="party-header">
                     <div className="party-name-title">{contract.tenant_name || translations.tenant}</div>
                     <div className="party-role-badge">{translations.firstParty} — {translations.tenant}</div>
                   </div>
                   <div className="party-body">
                    {pGet('show_tenant_phone') && contract.tenant_phone && <div className="party-row"><span className="party-label">{translations.phone}:</span><span className="party-value">{contract.tenant_phone}</span></div>}
                    {pGet('show_tenant_nationality') && contract.tenant_nationality && <div className="party-row"><span className="party-label">{translations.nationality}:</span><span className="party-value">{contract.tenant_nationality}</span></div>}
                    {pGet('show_tenant_address') && contract.tenant_address && <div className="party-row"><span className="party-label">{translations.address}:</span><span className="party-value">{contract.tenant_address}</span></div>}
                    {pGet('show_tenant_email') && contract.tenant_email && <div className="party-row"><span className="party-label">{translations.email}:</span><span className="party-value" style={{wordBreak:'break-all',overflowWrap:'break-word',minWidth:0,maxWidth:'100%'}}>{contract.tenant_email}</span></div>}
                   </div>
                 </div>
                 <div className="party-card">
                   <div className="party-header">
                     <div className="party-name-title">{contract.owner_name || translations.owner}</div>
                     <div className="party-role-badge">{translations.secondParty} — {translations.owner}</div>
                   </div>
                   <div className="party-body">
                    {pGet('show_owner_phone') && contract.owner_phone && <div className="party-row"><span className="party-label">{translations.phone}:</span><span className="party-value">{contract.owner_phone}</span></div>}
                    {pGet('show_owner_nationality') && contract.owner_nationality && <div className="party-row"><span className="party-label">{translations.nationality}:</span><span className="party-value">{contract.owner_nationality}</span></div>}
                    {pGet('show_owner_address') && contract.owner_address && <div className="party-row"><span className="party-label">{translations.address}:</span><span className="party-value">{contract.owner_address}</span></div>}
                    {pGet('show_owner_email') && contract.owner_email && <div className="party-row"><span className="party-label">{translations.email}:</span><span className="party-value" style={{wordBreak:'break-all',overflowWrap:'break-word',minWidth:0,maxWidth:'100%'}}>{contract.owner_email}</span></div>}
                   </div>
                 </div>
              </div>
            </div>
          </div>

          {/* PROPERTY & DATES */}
          <div className="section">
            <div className={`section-head ${lang === 'ku' ? 'kurdish-text' : 'arabic-text'}`}>{translations.propertyInfo}</div>
            <div className="section-body">
              <div className="data-grid">
                <div className="data-cell"><div className="data-lbl">{translations.propertyName}</div><div className="data-val">{contract.property_name || '—'}</div></div>
                {pGet('show_property_type') && property?.type && <div className="data-cell"><div className="data-lbl">{translations.propertyType}</div><div className="data-val">{property.type}</div></div>}
                {pGet('show_property_location') && (property?.address || property?.address_ku) && <div className="data-cell location-cell"><div className="data-lbl">{translations.propertyLocation}</div><div className="data-val">{lang === 'ku' ? (property.address_ku || property.address) : property.address}</div></div>}
                {pGet('show_purpose') && contract.purpose && <div className="data-cell"><div className="data-lbl">{translations.purpose}</div><div className="data-val">{contract.purpose}</div></div>}
                {contract.payment_method && <div className="data-cell"><div className="data-lbl">{translations.paymentMethod}</div><div className="data-val">{contract.payment_method}</div></div>}
                <div className="data-cell"><div className="data-lbl">{translations.startDate}</div><div className="data-val">{contract.start_date ? fd(contract.start_date) : '—'}</div></div>
                <div className="data-cell"><div className="data-lbl">{translations.endDate}</div><div className="data-val">{contract.end_date ? fd(contract.end_date) : '—'}</div></div>
                <div className="data-cell"><div className="data-lbl">{translations.duration}</div><div className="data-val">{contract.duration_months || '—'} {translations.month}</div></div>
              </div>
            </div>
          </div>
          </div>{/* end keep-together */}

          {/* Removed page break - continuous flow */}

          {/* FINANCIAL INFO */}
          <div className="section">
            <div className={`section-head ${lang === 'ku' ? 'kurdish-text' : 'arabic-text'}`}>{translations.financialInfo}</div>
            <div className="section-body" style={{background:'linear-gradient(135deg,#fff7ed 0%,#fffbf5 100%)',border:'0.5px solid #f97316'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',gap:'12px'}}>
                <div style={{background:'#fff',padding:'10px',borderRadius:'14px',border:'1.5px solid #f97316',boxShadow:'0 4px 16px rgba(249,115,22,0.15)',textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#fff',fontWeight:'700',background:'#f97316',padding:'4px 10px',borderRadius:'8px',marginBottom:'6px'}}>{translations.monthlyRent}</div>
                  <div style={{fontSize:'16px',fontWeight:'800',color:'#1a2744'}}>{(contract.monthly_rent || 0).toLocaleString()}</div>
                  <div style={{fontSize:'11px',color:'#f97316',fontWeight:'600',marginTop:'2px'}}>{contract.currency_symbol || 'د.ع'}</div>
                </div>
                <div style={{background:'#fff',padding:'10px',borderRadius:'14px',border:'1.5px solid #ef4444',boxShadow:'0 4px 16px rgba(239,68,68,0.15)',textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#fff',fontWeight:'700',background:'#ef4444',padding:'4px 10px',borderRadius:'8px',marginBottom:'6px'}}>{translations.totalRent}</div>
                  <div style={{fontSize:'16px',fontWeight:'800',color:'#1a2744'}}>{(contract.total_rent || 0).toLocaleString()}</div>
                  <div style={{fontSize:'11px',color:'#ef4444',fontWeight:'600',marginTop:'2px'}}>{contract.currency_symbol || 'د.ع'}</div>
                </div>
                {pGet('show_daily_rent') && <div style={{background:'#fff',padding:'10px',borderRadius:'14px',border:'1.5px solid #eab308',boxShadow:'0 4px 16px rgba(234,179,8,0.15)',textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#fff',fontWeight:'700',background:'#eab308',padding:'4px 10px',borderRadius:'8px',marginBottom:'6px'}}>{translations.dailyRent}</div>
                  <div style={{fontSize:'16px',fontWeight:'800',color:'#1a2744'}}>{(contract.daily_rent || 0).toLocaleString()}</div>
                  <div style={{fontSize:'11px',color:'#eab308',fontWeight:'600',marginTop:'2px'}}>{contract.currency_symbol || 'د.ع'}</div>
                </div>}
                {pGet('show_insurance') && <div style={{background:'#fff',padding:'10px',borderRadius:'14px',border:'1.5px solid #8b5cf6',boxShadow:'0 4px 16px rgba(139,92,246,0.15)',textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#fff',fontWeight:'700',background:'#8b5cf6',padding:'4px 10px',borderRadius:'8px',marginBottom:'6px'}}>{translations.insurance}</div>
                  <div style={{fontSize:'16px',fontWeight:'800',color:'#1a2744'}}>{(contract.insurance_amount || 0).toLocaleString()}</div>
                  <div style={{fontSize:'11px',color:'#8b5cf6',fontWeight:'600',marginTop:'2px'}}>{contract.currency_symbol || 'د.ع'}</div>
                </div>}
              </div>
              <div style={{marginTop:'8px',padding:'8px 12px',background:'#fef2f2',border:'1.5px solid #dc2626',borderRadius:'10px',color:'#991b1b',fontSize:'12px',fontWeight:'700'}}>
                ⚠️ {translations.insuranceWarning}
              </div>
            </div>
          </div>

          {/* CLAUSES */}
          {pGet('show_clauses') && clausesToShow.length > 0 && (
            <div className="section">
              <div className={`section-head ${lang === 'ku' ? 'kurdish-text' : 'arabic-text'}`}>{translations.clauses}</div>
              <div className="section-body">
                {clausesToShow.map((c, i) => (
                  <div key={i} className="clause">
                    <div className="clause-num">{i + 1}- {c.title}</div>
                    <div className="clause-desc">{c.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed page break - continuous flow */}

          {/* SIGNATURES */}
          {pGet('show_signatures') && (
            <div className="section">
              <div className={`section-head ${lang === 'ku' ? 'kurdish-text' : 'arabic-text'}`}>{translations.signatures}</div>
              <div className="section-body">
                <div className="sig-grid">
                  <div className="sig-box">
                    <div className="sig-label tenant">{translations.firstParty} — {translations.tenant}</div>
                    <div className="sig-area">{contract.tenant_signature || ''}</div>
                    <div className="sig-name">{contract.tenant_name || ''}</div>
                  </div>
                  <div className="sig-box">
                    <div className="sig-label company">{translations.thirdParty}</div>
                    <div className="sig-area">{contract.company_signature || ''}</div>
                    <div className="sig-name">{companyName}</div>
                    {contract.company_representative && <div className="sig-company">{contract.company_representative}</div>}
                    {rentContractBarcodeUrl && (
                      <div style={{textAlign:'center',marginTop:'10px'}}>
                        <div style={barcodeShowBorder ? {border:`2px solid ${barcodeBorderColor}`,padding:'4px',borderRadius:'6px',display:'inline-block'} : {}}>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${barcodeSize}x${barcodeSize}&data=${encodeURIComponent(rentContractBarcodeUrl)}`} style={{width:barcodeSize,height:barcodeSize,display:'block'}} alt="QR" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="sig-box">
                    <div className="sig-label owner">{translations.secondParty} — {translations.owner}</div>
                    <div className="sig-area">{contract.owner_signature || ''}</div>
                    <div className="sig-name">{contract.owner_name || ''}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* FOOTER */}
          {pGet('show_footer') && <div className="footer">
            <div>{translations.footerText}</div>
            <div style={{fontWeight:'700',color:'#1a2744',marginTop:'3px'}}>{[lang === 'ku' ? (branch?.name_ku || branch?.name || '') : (branch?.name || ''), companyPhone && `📞 ${companyPhone}`].filter(Boolean).join(' • ')}</div>
          </div>}
        </div>

        {/* Actions */}
        <div className="no-print border-t border-gray-200 px-6 py-4 flex justify-end bg-white">
          <Button variant="outline" onClick={onClose}>{translations.close}</Button>
        </div>
      </div>
    </div>
  );
}