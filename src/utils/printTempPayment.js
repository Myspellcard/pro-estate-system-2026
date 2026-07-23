import { format, parseISO } from 'date-fns';

export const STATUS_AR_KU = {
  'محتجز': ['محتجز', 'ئامێرکراو'],
  'مسترد للمستأجر': ['مُسترد للمستأجر', 'گەڕێندراوە بۆ کرێچی'],
  'مدفوع للمالك': ['مُدفع للمالك', 'دراوە بە خاوەن'],
  'محوّل للتأمين': ['محوّل للتأمين', 'گۆڕدراو بۆ دڵنیایی'],
};

export const STATUS_BG = {
  'محتجز': '#f59e0b',
  'مسترد للمستأجر': '#10b981',
  'مدفوع للمالك': '#3b82f6',
  'محوّل للتأمين': '#0ea5e9',
};

export function printTempPayment({ contract, branch, lang, amount, date, status, notes, validityDays, currencySymbol }) {
  const L = (ar, ku) => (lang === 'ku' ? ku : ar);
  const symbol = currencySymbol || contract?.currency_symbol || 'د.ع';
  const companyName = branch?.company_name || (lang === 'ku' ? 'بەڕێوەبردنی خانووبەرە' : 'نظام إدارة العقارات');
  const companySlogan = lang === 'ku' ? (branch?.invoice_slogan_ku || branch?.company_slogan_ku || '') : (branch?.invoice_slogan || branch?.company_slogan || '');
  const logoUrl = contract?.company_logo || branch?.company_logo;
  const companyPhone = branch?.company_phone;
  const branchName = lang === 'ku' ? (branch?.name_ku || branch?.name || '') : (branch?.name || '');
  const branchAddress = lang === 'ku' ? (branch?.address_ku || branch?.address || '') : (branch?.address || '');

  const st = status || 'محتجز';
  const statusLabel = (s) => { const [ar, ku] = STATUS_AR_KU[s] || [s, s]; return L(ar, ku); };
  const fd = (d) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';
  const today = format(new Date(), 'dd/MM/yyyy');
  const amt = Number(amount || 0);

  const rows = [
    { labelAr: 'رقم العقد', labelKu: 'ژمارەی گرێبەست', value: contract?.contract_number || '—' },
    { labelAr: 'العقار', labelKu: 'موڵک', value: contract?.property_name || '—' },
    { labelAr: 'المستأجر', labelKu: 'کرێچی', value: contract?.tenant_name || '—' },
    { labelAr: 'تاريخ الاستلام', labelKu: 'بەرواری وەرگرتن', value: fd(date) },
  ].filter(r => st === 'مدفوع للمالك' ? r.labelAr !== 'المستأجر' : true);

  const statusBg = STATUS_BG[st] || '#f59e0b';
  const rowsHtml = rows.map(r => `<tr><td class="lbl">${L(r.labelAr, r.labelKu)}</td><td class="val">${r.value || '—'}</td></tr>`).join('');

  const printWindow = window.open('', '_blank', 'width=794,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="${lang === 'ku' ? 'ku' : 'ar'}">
    <head>
      <meta charset="UTF-8"/>
      <title>${L('وصل الدفعة المؤقتة', 'وەسڵی پارەی کاتی')} - ${contract?.contract_number || ''}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap');
        @page { size: A5 portrait; margin: 0; }
        * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
        html { margin:0; padding:0; height:200mm; max-height:200mm; overflow:hidden; }
        body { font-family: 'Noto Sans Arabic', Arial, sans-serif; direction: rtl; background:#fff; color:#111; font-size:10pt; line-height:1.5; padding:3mm 10px 10mm 10px; position:relative; height:200mm; max-height:200mm; overflow:hidden; }
        .header { display:flex; align-items:center; justify-content:space-between; background:#1a2744; color:#fff; padding:3px 14px; border-radius:12px; margin-top:6px; margin-bottom:6px; }
        .brand { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .brand .logo { width:48px; height:48px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .brand .logo img { width:100%; height:100%; object-fit:contain; }
        .brand .logo span { font-size:24px; font-weight:900; color:#e8b748; }
        .brand-text h1 { font-size:13pt; font-weight:900; color:#fff; margin:0; }
        .brand-text p { font-size:9pt; color:#e8b748; font-weight:700; margin-top:2px; }
        .meta { text-align:left; flex-shrink:0; }
        .meta .num { font-size:11pt; font-weight:900; color:#e8b748; }
        .meta .date { font-size:8pt; color:#a8c0e0; margin-top:2px; }
        .doc-title { text-align:center; font-size:14pt; font-weight:800; color:#1a2744; margin:6px 0 4px; }
        .divider { width:120px; height:3px; background:linear-gradient(90deg,transparent,#e8b748,transparent); margin:8px auto 10px; border:none; }
        .amount-box { text-align:center; background:#fef3c7; border:1.5px solid #f59e0b; border-radius:10px; padding:3px 10px; margin:4px 0 6px; }
        .amount-box .lbl { font-size:8pt; font-weight:700; color:#92400e; margin-bottom:0; }
        .amount-box .val { font-size:14pt; font-weight:900; color:#92400e; display:inline; }
        .amount-box .cur { font-size:11pt; font-weight:800; color:#92400e; display:inline; margin-right:10px; margin-left:6px; }
        .status-pill { display:inline-block; padding:4px 12px; border-radius:999px; font-size:9pt; font-weight:800; color:#fff; background:${statusBg}; }
        .status-row { text-align:center; margin:8px 0; }
        table { width:100%; border-collapse:collapse; margin:6px 0; }
        table td { border:1px solid #e5e7eb; padding:6px 10px; font-size:10pt; }
        table td.lbl { width:38%; font-weight:700; background:#f4f6fb; color:#1a2744; }
        table td.val { font-weight:600; color:#111; }
        .note { margin-top:8px; padding:10px 14px 10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-right:4px solid #64748b; border-radius:8px; font-size:9pt; color:#334155; line-height:1.7; }
        .note strong { color:#1e293b; font-weight:800; }
        .validity-note { margin-top:8px; padding:8px 10px; background:#fef3c7; border:1px solid #f59e0b; border-radius:8px; font-size:8pt; color:#92400e; font-weight:600; line-height:1.4; text-align:center; white-space:nowrap; }
        .days-box { font-weight:900; color:#92400e; margin:0 2px; font-size:11pt; }
        .signs { display:flex; gap:16px; position:absolute; bottom:44mm; left:10px; right:10px; }
        .sign { flex:1; text-align:center; }
        .sign .name { font-size:9pt; font-weight:700; color:#1a2744; margin-bottom:18px; }
        .sign .line { border-bottom:1.5px solid #1a2744; margin:0 8px; }
        .sign .role { font-size:8pt; color:#555; margin-top:4px; font-weight:600; }
        .footer { position:absolute; bottom:0mm; left:10px; right:10px; padding:6px 12px; text-align:center; background:#1a2744; color:#fff; font-size:7.5pt; font-weight:600; border-radius:0 0 12px 12px; }
        @media print { @page { size: A5 portrait; margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <div class="logo">${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : `<span>${companyName.charAt(0) || 'ر'}</span>`}</div>
          <div class="brand-text">
            <h1>${companyName}</h1>
            ${companySlogan ? `<p>${companySlogan}</p>` : ''}
          </div>
        </div>
        <div class="meta">
          <div class="num">${contract?.contract_number || ''}</div>
          <div class="date">${today}</div>
        </div>
      </div>

      <div class="doc-title">${
        st === 'مسترد للمستأجر' ? L('استرداد الدفعة الحجز', 'گەرانەوەی پارەی دەستبەسەرداگرتن')
        : st === 'مدفوع للمالك' ? L('تسليم الدفعة الحجز للمالك', 'پێدانی پارەی دەستبەسەرداگرتن بە خاوەن موڵک')
        : L('دفعة الحجز', 'پارەی دەستبەسەرداگرتن')
      }</div>
      <hr class="divider"/>

      <div class="amount-box">
        <div class="lbl">${L('المبلغ المستلم', 'بڕی وەرگیراو')}</div>
        <div><span class="val">${amt.toLocaleString()}</span><span class="cur">${symbol}</span></div>
      </div>

      <table>
        ${rowsHtml}
        ${contract?.temp_payment_resolution_date ? `<tr><td class="lbl">${L('تاريخ التسوية', 'بەرواری ڕێکخستن')}</td><td class="val">${fd(contract.temp_payment_resolution_date)}</td></tr>` : ''}
      </table>

      <div class="validity-note">
        ${lang === 'ku'
          ? `ئەم پسولەیە تاوەکو <span class="days-box">(${validityDays ? String(validityDays) : '&nbsp;&nbsp;'})</span> رۆژ کاری پێدەکرێت، دوای ئەم ماوەیە کۆمپانیا دەتوانێت ئەم موڵکە بەکرێبداتەوە.`
          : `يُعدّ هذا الإيصال نافذًا لمدة <span class="days-box">(${validityDays ? String(validityDays) : '&nbsp;&nbsp;'})</span> يومًا، وبعد انقضاء هذه المدة يحق للشركة إعادة تأجير العقار.`}
      </div>

      <div class="signs">
        <div class="sign">
          <div class="line"></div>
          <div class="role">${st === 'مدفوع للمالك' ? L('المالك', 'خاوەن') : L('المستأجر', 'کرێچی')}</div>
        </div>
        <div class="sign">
          <div class="line"></div>
          <div class="role">${L('إدارة الشركة', 'بەرێوەبەرایەتی کۆمپانیا')}</div>
        </div>
      </div>

      <div class="footer">
        ${branchName ? `${branchName}` : ''}
        ${companyPhone ? ` • 📞 ${companyPhone}` : ''}
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();

  let printed = false;
  const doPrint = () => { if (printed) return; printed = true; printWindow.print(); };
  const imgs = Array.from(printWindow.document.images || []);
  const pending = imgs.filter(img => !img.complete);
  if (pending.length === 0) { doPrint(); }
  else {
    let remaining = pending.length;
    const onDone = () => { remaining -= 1; if (remaining <= 0) doPrint(); };
    pending.forEach(img => { img.addEventListener('load', onDone); img.addEventListener('error', onDone); });
    setTimeout(doPrint, 3000);
  }
}