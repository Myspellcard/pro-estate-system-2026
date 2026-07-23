import React from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { generateCommissionInvoiceNumber } from '@/utils/commissionNumber';

const NAVY = '#002147';
const GOLD = '#C5A059';
const GREEN = '#28A745';
const TEXT = '#2D2D2D';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDate(d, lang) {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = String(dt.getFullYear()).slice(2);
    return `${dd}/${mm}/${yy}`;
  } catch { return d; }
}

/**
 * Render and print a commission invoice matching the provided design.
 * Two identical copies are laid out side-by-side on a single A4 landscape page.
 * @param commission - the Commission record
 * @param L - language helper (ar, ku) => string
 * @param branch - the Branch record (company info)
 * @param party - 'seller' | 'buyer' | 'both'
 */
export async function printCommissionInvoice(commission, L, branch, party = 'seller') {
  // Ensure the invoice number from the numbering settings is shown. If the record
  // predates the auto-numbering (or the number was cleared), generate one now and
  // persist it so the settings counter stays in sync.
  let invoiceNumber = commission.invoice_number || '';
  if (!invoiceNumber && commission.id) {
    try {
      invoiceNumber = await generateCommissionInvoiceNumber(commission.contract_type || 'rent');
      await firebaseApi.entities.Commission.update(commission.id, { invoice_number: invoiceNumber });
      commission.invoice_number = invoiceNumber;
    } catch (_) {}
  }

  let propertyName = commission.property_name || '';
  let contractNumber = commission.contract_number || '';

  const isRent = commission.contract_type === 'rent';

  const party1Label = isRent ? L('المالك', 'خاوەن') : L('البائع', 'فرۆشیار');
  const party2Label = isRent ? L('المستأجر', 'کرێچی') : L('المشتري', 'کڕیار');

  let entityLabel = party1Label;
  let entityName = commission.party1_name || '';
  let entityPhone = commission.party1_phone || '';
  if (party === 'buyer') {
    entityLabel = party2Label;
    entityName = commission.party2_name || '';
    entityPhone = commission.party2_phone || '';
  }

  const typeText = isRent ? L('عمولة ايجار', 'کرێی کرێ') : (party === 'buyer' ? L('عمولة بيع', 'دەلالی کڕیار') : L('عمولة بيع', 'دەلالی فرۆشتن'));

  const sym = commission.currency_symbol || 'د.ع';
  const notesText = (commission.notes || '').trim();
  const rows = [];
  if (party === 'seller' || party === 'both') {
    rows.push({
      desc: isRent ? L('عمولة المالك', 'کرێی خاوەن') : L('عمولة البائع', 'دەلالی فرۆشیار'),
      amount: Number(commission.seller_commission || 0).toLocaleString('en-US'),
      currency: sym,
      paid: !!commission.seller_commission_paid,
    });
  }
  if (party === 'buyer' || party === 'both') {
    rows.push({
      desc: isRent ? L('عمولة المستأجر', 'کرێی کرێچی') : L('عمولة المشتري', 'دەلالی کڕیار'),
      amount: Number(commission.buyer_commission || 0).toLocaleString('en-US'),
      currency: sym,
      paid: !!commission.buyer_commission_paid,
    });
  }

  const docTitle = isRent ? L('وصل استلام العمولة', 'وەسڵی وەرگرتنی کرێ') : L('وصل استلام العمولة', 'وەرگرتنی دەلالی');
  const now = fmtDate(new Date().toISOString(), L);
  const companyName = branch?.company_name || '';
  const companySlogan = L(branch?.commission_slogan || '', branch?.commission_slogan_ku || '');
  const phone = branch?.company_phone || '';
  const address = L(branch?.address || '', branch?.address_ku || '');
  const branchName = L(branch?.name || '', branch?.name_ku || '');
  const logo = branch?.company_logo || '';

  const rowsHtml = rows.map((r) => `
    <tr>
      <td style="padding:10px 14px;font-size:13px;color:${TEXT};font-weight:600;">${escapeHtml(r.desc)}</td>
      <td style="padding:10px 14px;font-size:15px;color:${NAVY};font-weight:800;text-align:center;">${escapeHtml(r.amount)}</td>
      <td style="padding:10px 14px;font-size:13px;color:${TEXT};text-align:center;">${escapeHtml(r.currency)}</td>
      <td style="padding:10px 14px;text-align:center;">
        ${r.paid
          ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:${GREEN};"><span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:${GREEN};color:#fff;font-size:10px;">✓</span>${L('مدفوع', 'دراوە')}</span>`
          : `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#DC2626;"><span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#DC2626;color:#fff;font-size:12px;">×</span>${L('غير مدفوع', 'نەدراوە')}</span>`}
      </td>
    </tr>`).join('');

  const logoHtml = logo
    ? `<div style="height:104px;width:104px;border-radius:50%;background:#fff;border:2px solid ${GOLD};padding:6px;display:flex;align-items:center;justify-content:center;"><img src="${escapeHtml(logo)}" style="height:100%;width:100%;object-fit:contain;border-radius:50%;" /></div>`
    : `<div style="height:104px;width:104px;border-radius:50%;background:${NAVY};border:2px solid ${GOLD};color:${GOLD};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:32px;font-family:Tajawal,sans-serif;">${escapeHtml((companyName || 'RV').slice(0, 2))}</div>`;

  // One invoice copy. Rendered twice inside .sheet for the A4 landscape duplicate layout.
  const pageHtml = `
  <div class="page">
    <div class="page-inner">
    <div class="header">
      <div class="header-top">
        ${logoHtml}
        <div class="header-center">
          <div class="brand-name">${escapeHtml(companyName || '')}</div>
          ${companySlogan ? `<div class="brand-sub" style="color:#e8b748;font-weight:700;font-size:13px;">${escapeHtml(companySlogan)}</div>` : ''}
        </div>
        <div class="header-chips">
          <div class="inv-num">#${escapeHtml(commission.invoice_number || '—')}</div>
          <div class="inv-date">${escapeHtml(now)}</div>
        </div>
      </div>
      <div class="gold-line"></div>
    </div>

    <div class="title-wrap">
      <div class="title">${escapeHtml(docTitle)}</div>
      <div class="title-accent"></div>
    </div>

    <div class="body">
      <div class="cards">
        <div class="card">
          <div class="card-icon"><svg viewBox="0 0 24 24"><path d="M21 7H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-7 9h-4v-2h4v2zm5-4H5v-2h14v2z"/></svg></div>
          <div class="card-text">
            <div class="card-label">${L('النوع', 'جۆر')}</div>
            <div class="card-value" style="font-size:13px;">${escapeHtml(typeText)}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-icon"><svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg></div>
          <div class="card-text">
            <div class="card-label">${L('العقار', 'خانوو')}</div>
            <div class="card-value green">${escapeHtml(propertyName || '—')}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zM13 9V3.5L18.5 9H13z"/></svg></div>
          <div class="card-text">
            <div class="card-label">${L('رقم العقد', 'ژمارەی گرێبەست')}</div>
            <div class="card-value" style="font-size:11px;white-space:nowrap;">${escapeHtml(contractNumber || '—')}</div>
          </div>
        </div>
      </div>

      <div class="entity">
        <div class="entity-icon"><svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg></div>
        <div class="entity-left">
          <div class="entity-label">${escapeHtml(entityLabel)}</div>
          <div class="entity-name">${escapeHtml(entityName || '—')}</div>
          ${entityPhone ? `<div class="entity-sub">${escapeHtml(entityPhone)}</div>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${L('الوصف', 'وەسف')}</th>
            <th>${L('المبلغ', 'بڕ')}</th>
            <th>${L('العملة', 'دراو')}</th>
            <th>${L('الحالة', 'دۆخ')}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      ${notesText ? `
      <div class="notes">
        <div class="notes-head">
          <svg viewBox="0 0 24 24"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 12H7v-2h10v2zm0-4H7V9h10v2zm0-4H7V5h10v2z"/></svg>
          <span>${L('ملاحظات:', 'تێبینی:')}</span>
        </div>
        <div class="notes-text">${escapeHtml(notesText)}</div>
      </div>` : ''}

      <div class="signatures ${notesText ? '' : 'sig-spaced'}">
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-label">${L('الدافع', 'پارەدەر')}</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-label">${L('إدارة الشركة', 'بەڕێوەبەرایەتی کۆمپانیا')}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="foot-item">
        <svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z"/></svg>
        <span>${escapeHtml(branchName || '—')}</span>
      </div>
      <div class="foot-item">
        <svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.25 1l-2.25 2.2z"/></svg>
        <span>${escapeHtml(phone || '—')}</span>
      </div>
    </div>
    <div class="foot-accent"></div>
    </div>
  </div>`;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(docTitle)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Noto+Sans+Arabic:wght@400;500;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { font-family: 'Noto Sans Arabic','Tajawal',sans-serif; background:#fff; color:${TEXT}; }
  .sheet { width: 148mm; height: 210mm; margin: 0 auto; background:#fff; overflow:hidden; }
  .page { width: 148mm; height: 210mm; position: relative; padding: 0; background:#fff; overflow:hidden; }
  .page-inner { display:flex; flex-direction:column; height: 210mm; transform-origin: top center; }
  .header { background:${NAVY}; padding: 14px 22px 12px; position: relative; border-radius: 0 0 20px 20px; flex-shrink:0; }
  .header-top { display:flex; justify-content:space-between; align-items:center; }
  .header-center { flex:1; text-align:center; }
  .header-chips { text-align:left; flex-shrink:0; margin-top:6px; }
  .inv-num { font-size:7px; font-weight:700; color:#e8b748; white-space:nowrap; }
  .inv-date { font-size:9px; color:#a8b8d8; margin-top:1px; }
  .brand { display:flex; align-items:center; gap:10px; }
  .brand-text { text-align:start; }
  .brand-name { color:#fff; font-weight:800; font-size:26px; line-height:1.1; }
  .brand-sub { color:${GOLD}; font-size:12px; font-weight:500; margin-top:3px; }
  .title-wrap { text-align:center; margin-top:8px; margin-bottom:10px; }
  .title { color:${NAVY}; font-weight:700; font-size:16px; letter-spacing:0.3px; }
  .title-accent { width:42px; height:2px; background:${GOLD}; margin:5px auto 0; border-radius:2px; }
  .gold-line { height:3px; background:linear-gradient(90deg, transparent, ${GOLD}, transparent); margin:10px 22px 0; border-radius:2px; }
  .body { padding: 16px 22px; flex:1 1 auto; }
  .cards { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:14px; }
  .card { border:1.5px solid #000; border-radius:12px; padding:12px; display:flex; align-items:center; gap:10px; }
  .card-text { flex:1; min-width:0; }
  .card-label { font-size:11px; color:#6B7280; font-weight:600; margin-bottom:4px; }
  .card-value { font-size:15px; font-weight:800; color:${NAVY}; line-height:1.25; }
  .card-value.green { color:${GREEN}; }
  .card-icon { width:38px; height:38px; border-radius:10px; background:${NAVY}; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .card-icon svg { width:18px; height:18px; fill:${GOLD}; }
  .entity { border:1.5px solid #000; border-radius:12px; padding:12px 14px; margin-bottom:14px; display:flex; align-items:center; justify-content:flex-start; gap:12px; }
  .entity-left { }
  .entity-label { font-size:12px; color:#6B7280; font-weight:600; margin-bottom:4px; }
  .entity-name { font-size:15px; font-weight:800; color:${NAVY}; line-height:1.3; }
  .entity-sub { font-size:12px; color:#6B7280; margin-top:2px; }
  .entity-icon { width:38px; height:38px; border-radius:12px; background:#F3F4F6; display:flex; align-items:center;justify-content:center; }
  .entity-icon svg { width:18px; height:18px; fill:${NAVY}; }
  table { width:100%; border-collapse:collapse; border:none; border-radius:12px; overflow:hidden; margin-bottom:16px; background:#fff; }
  thead th { background:${NAVY}; color:#fff; font-size:12px; font-weight:700; padding:9px 12px; text-align:center; border:1px solid #000; }
  thead th:first-child { text-align:start; }
  tbody td { border:1px solid #000; }
  .notes { border:1.5px solid #000; border-radius:12px; padding:12px 14px; margin-bottom:18px; }
  .notes-head { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:${NAVY}; margin-bottom:8px; }
  .notes-head svg { width:16px; height:16px; fill:${GOLD}; }
  .notes-text { font-size:12px; color:${TEXT}; line-height:1.5; white-space:pre-wrap; }
  .signatures { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:12px; margin-top:56px; }
  .signatures.sig-spaced { margin-top:120px; }
  .sig { text-align:center; }
  .sig-label { font-size:12px; font-weight:700; color:${NAVY}; margin-top:18px; }
  .sig-line { border-bottom:1.5px dotted #000; margin:0 22px; height:1px; }
  .footer { background:${NAVY}; border-radius:20px 20px 0 0; padding:12px 22px; display:flex; justify-content:space-between; align-items:center; color:#fff; flex-shrink:0; margin-top:auto; }
  .foot-item { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:500; }
  .foot-item svg { width:14px; height:14px; fill:${GOLD}; }
  .foot-accent { height:3px; background:linear-gradient(90deg, transparent, ${GOLD}, transparent); }
  @page { size: A5 portrait; margin: 0; }
  @media print { .page { box-shadow:none; } .sheet { box-shadow:none; } body { background:#fff; } }
</style>
</head>
<body>
  <div class="sheet">
${pageHtml}
  </div>
</body>
</html>`;

  printHtml(html);
}

function printHtml(html) {
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
      const win = iframe.contentWindow;
      try {
        win.document.querySelectorAll('.page-inner').forEach((el) => {
          const h = el.clientHeight;
          const sh = el.scrollHeight;
          if (sh > h) { el.style.transform = `scale(${(h / sh).toFixed(4)})`; }
        });
      } catch (e) {}
      win.focus();
      win.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    }, 400);
  };
}

export default function CommissionPrintPlaceholder() { return null; }