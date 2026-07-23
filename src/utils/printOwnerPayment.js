export function printOwnerPayment({ inv, contract, branch, property, rentInvoices, isPaid }) {
  const logoUrl = branch?.company_logo;
  const companyName = branch?.company_name || '';
  const companySlogan = branch?.invoice_slogan || '';
  const paymentDate = inv.paid_date || inv.due_date;
  const toEnglishDigits = (s) => String(s ?? '').replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
  const proxyName = property?.owner_proxy_name || '';
  const proxyPhone = toEnglishDigits(property?.owner_proxy_phone || '');
  const ownerPhone = toEnglishDigits(contract?.owner_phone || '');
  const coveredMonths = (rentInvoices || [])
    .filter(r => isPaid(r) && r.period_from)
    .sort((a, b) => new Date(a.period_from) - new Date(b.period_from));
  const noteParts = inv.notes ? inv.notes.split(' | ') : [];
  const payMethod = noteParts[0] || '';
  const receiver = noteParts[1] || '';
  const extraNote = noteParts[2] || '';

  const periodStr = coveredMonths.length
    ? `${coveredMonths[0].period_from} → ${coveredMonths[coveredMonths.length - 1].period_to}`
    : (inv.period_from ? `${inv.period_from} → ${inv.period_to || ''}` : '—');
  const status = inv.status || '—';
  const amountText = `${(inv.amount || 0).toLocaleString()} د.ع`;

  const printWindow = window.open('', '', 'height=800,width=700');
  printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>وصل دفع للمالك - ${inv.invoice_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
    @page { size: A5 portrait; margin: 8mm 10mm 8mm 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
    body { font-family:'Tajawal','Arial',sans-serif; direction:rtl; background:#fff; color:#1a2744; font-size:11px; min-height:194mm; display:flex; flex-direction:column; }
    .header { background:linear-gradient(135deg,#1a2744 0%,#1a2744 100%); padding:14px 16px; border-radius:10px; margin-bottom:10px; display:flex; align-items:center; gap:12px; }
    .logo-box { width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.12); border:1.5px solid rgba(232,183,72,0.5); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; }
    .logo-box img { width:100%; height:100%; object-fit:contain; border-radius:50%; }
    .logo-initial { font-size:22px; font-weight:900; color:#e8b748; }
    .header-center { flex:1; text-align:center; }
    .co-name { font-size:22px; font-weight:800; color:#fff; }
    .co-sub { font-size:12px; color:#b2ebf2; margin-top:2px; }
    .header-right { text-align:left; flex-shrink:0; }
    .doc-badge { background:linear-gradient(135deg,#e8b748,#f59e0b); color:#1a2744; font-size:9.5px; font-weight:900; padding:4px 12px; border-radius:20px; display:inline-block; margin-bottom:4px; }
    .inv-num { font-size:11px; font-weight:700; color:#e8b748; }
    .inv-date { font-size:8.5px; color:#b2ebf2; }

    .top-grid { display:grid; grid-template-columns:1.7fr 1.1fr 1fr; gap:8px; margin-bottom:10px; }
    .top-card { background:transparent; border:1px solid #1a2744; border-radius:10px; padding:9px 11px; text-align:center; }
    .top-card.accent { background:transparent; }
    .top-label { font-size:10px; color:#1a2744; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
    .top-value { font-size:13px; color:#1a2744; font-weight:800; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .top-sub { font-size:11px; color:#1a2744; font-weight:700; margin-top:2px; }

    .full-card { background:transparent; border:1px solid #1a2744; border-radius:10px; padding:9px 11px; margin-bottom:10px; }
    .full-card.proxy { background:transparent; }
    .full-label { font-size:8px; color:#1a2744; font-weight:800; margin-bottom:3px; }
    .full-value { font-size:11px; color:#1a2744; font-weight:700; }

    .detail-box { border:1px solid #000; border-radius:8px; overflow:hidden; margin-bottom:10px; }
    .detail-box table { width:100%; border-collapse:collapse; }
    .detail-box thead th { background:#1a2744; color:#e8b748; padding:7px 12px; font-size:10px; font-weight:800; text-align:right; border:1px solid #000; }
    .detail-box tbody tr:nth-child(even) { background:transparent; }
    .detail-box tbody td { padding:6px 12px; font-size:10px; border:1px solid #000; }
    .detail-box tbody td.label { color:#000; font-weight:700; width:40%; }
    .detail-box tbody td.val { color:#1a2744; font-weight:700; }

    .sig-row { display:flex; gap:10px; margin-bottom:8px; margin-top:170px; }
    .sig-box { flex:1; text-align:center; }
    .sig-line { height:1px; background:#1a2744; margin:0 18px 8px 18px; }
    .sig-label { font-size:10px; color:#1a2744; font-weight:600; }
    .footer { text-align:center; border-top:2px solid #1a2744; padding-top:6px; font-size:8.5px; color:#1a2744; margin-top:auto; }
    .footer .thanks { font-size:10px; font-weight:700; color:#1a2744; margin-bottom:2px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">${logoUrl ? `<img src="${logoUrl}" />` : `<span class="logo-initial">${companyName.charAt(0) || 'م'}</span>`}</div>
    <div class="header-center">
      <div class="co-name">${companyName}</div>
      ${companySlogan ? `<div class="co-sub" style="color:#e8b748;font-weight:700;">${companySlogan}</div>` : `<div class="co-sub">قسم المتابعة المالية</div>`}
    </div>
    <div class="header-right">
      <div class="doc-badge">وصل دفع للمالك</div>
      <div class="inv-num">#${inv.invoice_number}</div>
      <div class="inv-date">${paymentDate || new Date().toLocaleDateString('ar-IQ')}</div>
    </div>
  </div>

  <div class="top-grid">
    <div class="top-card accent">
      <div class="top-label">صاحب العقار</div>
      <div class="top-value">${contract.owner_name || '—'}</div>
      ${ownerPhone ? `<div class="top-sub">📞 ${ownerPhone}</div>` : ''}
    </div>
    <div class="top-card">
      <div class="top-label">العقار</div>
      <div class="top-value">${contract.property_name || '—'}</div>
    </div>
    <div class="top-card">
      <div class="top-label">رقم العقد</div>
      <div class="top-value">${contract.contract_number || '—'}</div>
    </div>
  </div>

  ${proxyName ? `<div class="full-card proxy"><div class="full-label">🤝 المخوّل (الوكيل) المُستلِم</div><div class="full-value">${proxyName}${proxyPhone ? ' — ' + proxyPhone : ''}</div></div>` : ''}
  ${extraNote ? `<div class="full-card"><div class="full-label">ملاحظات</div><div class="full-value">${extraNote}</div></div>` : ''}

  <div class="detail-box">
    <table>
      <thead><tr><th>البيان</th><th>التفاصيل</th></tr></thead>
      <tbody>
        <tr><td class="label">تاريخ الدفع</td><td class="val">${paymentDate || '—'}</td></tr>
        <tr><td class="label">طريقة الدفع</td><td class="val">${payMethod || 'نقداً'}</td></tr>
        <tr><td class="label">المُستلِم</td><td class="val">${receiver || '—'}</td></tr>
        <tr><td class="label">الفترة</td><td class="val">${periodStr}</td></tr>
        <tr><td class="label">الحالة</td><td class="val">${status}</td></tr>
        <tr><td class="label">المبلغ</td><td class="val" style="font-size:12px;font-weight:900">${amountText}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="sig-row">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع المُستلِم</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">توقيع إدارة الشركة</div></div>
  </div>

  <div class="footer">
    <p class="thanks">شكراً لتعاملكم معنا — وصل رسمي معتمد من الشركة</p>
    <p>${[branch?.name, branch?.company_phone && '📞 ' + branch.company_phone].filter(Boolean).join(' • ')}</p>
  </div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.print();
}