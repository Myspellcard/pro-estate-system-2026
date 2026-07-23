import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { X, Printer, Edit, FileText, User, Building2, DollarSign, Calendar, Phone, Mail, Globe, MapPin, PenLine, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import ContractCommissionSection from '@/components/commissions/ContractCommissionSection';
import SalePaymentInvoiceSection from '@/components/sale-contracts/SalePaymentInvoiceSection';
import SaleSellerPaymentSection from '@/components/sale-contracts/SaleSellerPaymentSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const L = (ar, ku, lang) => lang === 'ku' ? ku : ar;
const toEnDigits = (str) => String(str || '')
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, color = 'from-primary/10 to-primary/5', children }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
      <div className={`bg-gradient-to-r ${color} px-4 py-2.5`}>
        <p className="text-sm font-bold">{title}</p>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function SaleContractDetail({ contract, onClose, onEdit }) {
  const { lang } = useLanguage();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewKey, setPreviewKey] = useState(0);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });
  const appSettings = settingsList.find(s => s.key === 'default') || {};
  const sps = appSettings.print_sale_contract || {};
  const spGet = (key, fallback = true) => sps[key] !== undefined ? sps[key] : fallback;

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => firebaseApi.entities.Branch.list(),
  });
  const currentBranch = branches.find(b => b.id === contract.branch_id) || branches[0];
  const logoUrl = currentBranch?.company_logo || appSettings.company_logo || '';

  const { data: propertiesList = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => firebaseApi.entities.Property.list(),
  });
  const property = propertiesList.find(p => p.id === contract.property_id) || {};

  const { data: projectsList = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => firebaseApi.entities.Project.list(),
  });
  const project = projectsList.find(p => p.id === property.project_id) || {};

  const buildPrintHtml = () => {
    const date = contract.sale_date ? new Date(contract.sale_date).toLocaleDateString('en-GB') : '';
    const price = contract.sale_price ? `${contract.sale_price.toLocaleString()} ${contract.currency_symbol || 'د.ع'}` : '';
    const buyerName = lang === 'ku' ? (contract.buyer_name_ku || contract.buyer_name) : contract.buyer_name;
    const sellerName = lang === 'ku' ? (contract.seller_name_ku || contract.seller_name) : contract.seller_name;
    const propName = lang === 'ku' ? (contract.property_name_ku || contract.property_name) : contract.property_name;
    const clauses = contract.clauses || [];

    const installments = contract.installment_plan || [];
    const paidAmt = contract.paid_amount ? `${Number(contract.paid_amount).toLocaleString()} ${contract.currency_symbol || 'د.ع'}` : '';
    const remAmt = contract.remaining_amount ? `${Number(contract.remaining_amount).toLocaleString()} ${contract.currency_symbol || 'د.ع'}` : '';

    const installmentsHtml = installments.length > 0 ? `
      <table class="it">
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th>${L('المبلغ', 'بڕ', lang)}</th>
            <th>${L('تاريخ الاستحقاق', 'بەرواری کردنی', lang)}</th>
            <th>${L('الحالة', 'دۆخ', lang)}</th>
          </tr>
        </thead>
        <tbody>
          ${installments.map((inst, i) => `
            <tr>
              <td><span class="it-n">${i + 1}</span></td>
              <td style="font-weight:700;">${Number(inst.amount).toLocaleString()} ${contract.currency_symbol || 'د.ع'}</td>
              <td>${inst.due_date ? new Date(inst.due_date).toLocaleDateString('en-GB') : '—'}</td>
              <td><span class="it-s ${inst.status === 'مدفوع' ? 'paid' : 'pending'}">${inst.status === 'مدفوع' ? L('مدفوع','دراو',lang) : L('معلق','راگیراو',lang)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>` : '';

    const clausesHtml = clauses.length > 0 ? clauses.map((c, i) => `
      <div class="cl">
        <div class="cl-num">${i + 1}</div>
        <div>
          ${c.title ? `<div class="cl-title">${c.title}</div>` : ''}
          ${c.description ? `<div class="cl-body">${c.description}</div>` : ''}
        </div>
      </div>`).join('') : '';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>${L('عقد بيع وشراء عقار', 'گرێبەستی فرۆشتن و کڕینی خانوو', lang)} - ${contract.contract_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap');
    @font-face { font-family: 'Rabar'; src: url('https://fonts.cdnfonts.com/css/rabar') format('woff2'); }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans Arabic', sans-serif; direction: rtl; background: #f1f5f9; color: #1e293b; font-size: 12px; line-height: 1.65; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #f1f5f9; display: flex; flex-direction: column; }

    /* ══ HEADER ══ */
    .header {
      background: #fff;
      margin: 0 12mm 0;
      border-radius: 14px;
      padding: 18px 20px 18px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid #000000;
    }
    .hdr-accent {
      width: 6px; min-height: 60px; border-radius: 4px; flex-shrink: 0; align-self: stretch;
      background: #f59e0b;
    }
    .hdr-logo { width: 80px; height: 80px; object-fit: contain; flex-shrink: 0; }
    .hdr-title { font-size: 28px; font-weight: 900; color: #0f172a; }
    .hdr-title-ku { font-family: 'Rabar', 'Noto Sans Arabic', sans-serif; }
    .hdr-sub { font-size: 16px; color: #000000; margin-top: 6px; font-weight: 800; }
    .hdr-sub2 { font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600; }
    .hdr-right {
      margin-right: auto;
      background: #f8fafc;
      border: 1px solid #000000;
      border-radius: 10px;
      padding: 8px 16px;
      text-align: center;
      min-width: 120px;
    }
    .hdr-num-lbl { font-size: 9px; font-weight: 800; letter-spacing: 1.8px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .hdr-num { font-size: 13px; font-weight: 900; color: #1e293b; }
    .hdr-date { font-size: 10px; color: #64748b; margin-top: 3px; font-weight: 600; }

    /* ══ STRIPS CONTAINER ══ */
    .strips { padding: 14px 12mm; display: flex; flex-direction: column; gap: 8px; flex: 1; position: relative; z-index: 1; }

    /* ══ SINGLE STRIP (matches the infographic style) ══ */
    .strip {
      background: #fff;
      border-radius: 14px;
      display: flex;
      align-items: stretch;
      border: 1px solid #000000;
      min-height: 60px;
    }
    /* colored left tab (RTL: left = start side — number side) */
    .strip-tab {
      width: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 10px 6px;
      margin: 12px 10px 12px 12px;
      border-radius: 12px;
    }
    .tab-num  { font-size: 18px; font-weight: 900; color: #fff; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .tab-lbl  { font-size: 11px; font-weight: 800; letter-spacing: 0.5px; color: #fff; margin-top: 4px; text-align: center; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }

    /* vertical divider */
    .vdiv { width: 1px; background: #f0f0f0; margin: 10px 0; flex-shrink: 0; }

    /* icon column */
    .strip-icon { width: 46px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; color: #94a3b8; }

    /* content */
    .strip-content { flex: 1; padding: 12px 18px 12px 16px; display: flex; flex-direction: column; justify-content: center; }
    .sc-head { font-size: 11.5px; font-weight: 800; margin-bottom: 8px; }
    .sc-grid {
      display: flex; flex-wrap: wrap; gap: 8px;
    }
    .sc-row  {
      display: flex; flex-direction: column; gap: 4px;
      border-radius: 8px; padding: 10px 16px; min-width: 110px; flex: 1;
      font-size: 11.5px; line-height: 1.35;
    }
    .sc-row-blue   { background:#f5f9ff; border:1px solid #bfdbfe; color:#1e3a8a; }
    .sc-row-indigo { background:#f5f3ff; border:1px solid #c7d2fe; color:#4338ca; }
    .sc-row-green  { background:#f0fdf5; border:1px solid #a7f3d0; color:#15803d; }
    .sc-row-amber  { background:#fffbeb; border:1px solid #fde68a; color:#92400e; }
    .sc-lbl  {
      font-size: 10px; font-weight: 800; letter-spacing: 0.3px; padding: 3px 12px;
      border-radius: 20px; display: inline-block; width: auto;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06); margin-bottom: 2px;
    }
    .sc-lbl-blue   { background: #bfdbfe; color: #1e3a8a; }
    .sc-lbl-green  { background: #a7f3d0; color:#14532d; }
    .sc-lbl-amber  { background:#fde68a; color:#78350f; }
    .sc-val  {
      font-size: 15px; font-weight: 700; color: #1e293b; line-height: 1.2;
      position: relative;
    }
    .sc-val.big { font-size: 13px; font-weight: 900; color: #1e3a8a; }
    .sc-val.green { color: #15803d; }
    .sc-val.amber { color: #92400e; }

    /* property+price cards layout */
    .prop-grid { display: flex; gap: 8px; flex-wrap: wrap; }
    .prop-card {
      display: flex; flex-direction: column; gap: 6px;
      background: #fff; border-radius: 8px; padding: 10px 16px 10px 14px; min-width: 80px; flex: 1;
      border: 1px solid #000000;
    }
    .prop-card-blue   {} .prop-card-indigo {} .prop-card-green  {} .prop-card-amber  {}
    .prop-card-lbl {
      font-size: 13px; font-weight: 800; letter-spacing: 0.3px; padding: 3px 12px; margin: 0 0 5px;
      border-radius: 4px; display: inline-block; width: auto;
    }
    .card-lbl-blue   { background: #dbeafe; color: #1e40af; }
    .card-lbl-indigo { background: #e0e7ff; color: #4338ca; }
    .card-lbl-green  { background: #d1fae5; color: #15803d; }
    .card-lbl-amber  { background: #fef3c7; color: #92400e; }
    .prop-card-val {
      font-size: 12px; font-weight: 700; color: #475569; line-height: 1.25;
      position: relative; width: 100%;
    }
    .prop-card-val.prop  { font-size: 14px; font-weight: 900; color: #0f172a; }
    .prop-card-val.price { font-size: 15px; font-weight: 900; color: #1e40af; }
    .prop-card-val.paid  { font-size: 13px; font-weight: 900; color: #16a34a; }
    .prop-card-val.rem   { font-size: 13px; font-weight: 900; color: #c2410c; }

    /* colored right accent tab */
    .strip-accent {
      width: 8px;
      flex-shrink: 0;
      border-radius: 0 14px 14px 0;
    }

    /* ══ WIDE STRIP (for tables/clauses) ══ */
    .wstrip {
      background: #fff;
      border-radius: 12px;
      border: 1px solid #000000;
    }
    .wstrip-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-bottom: 1px solid #000000;
    }
    .wstrip-tab { width: 34px; height: 34px; border-radius: 9px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
    .wstrip-tab .tab-num { font-size: 15px; }
    .wstrip-vdiv { width: 1px; height: 24px; background: #e8eaed; flex-shrink: 0; }
    .wstrip-icon { font-size: 16px; color: #64748b; }
    .wstrip-title { flex: 1; font-size: 14px; font-weight: 800; color: #0f172a; }
    .wstrip-accent { width: 8px; height: 28px; border-radius: 5px; flex-shrink: 0; }

    /* ══ INSTALLMENTS ══ */
    .it { width: 100%; border-collapse: collapse; font-size: 13px; }
    .it thead tr { background: #e0f2fe; }
    .it th { padding: 10px 16px; text-align: right; font-weight: 900; color: #0369a1; border-bottom: 1px solid #000000; font-size: 12px; letter-spacing: 0.3px; }
    .it td { padding: 10px 16px; border-bottom: 1px solid #000000; color: #1e293b; font-size: 13px; }
    .it tr:last-child td { border-bottom: none; }
    .it tr:nth-child(even) td { background: #f8fafc; }
    .it-n { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 900; }
    .it-s { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; }
    .it-s.paid    { background: #dcfce7; color: #15803d; }
    .it-s.pending { background: #fef9c3; color: #a16207; }

    /* ══ CLAUSES ══ */
    .cl-wrap { padding: 8px 16px; }
    .cl { display: flex; gap: 10px; padding: 8px 0; }
    .cl-num { width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0; margin-top: 2px; background: #1e3a8a; color: #fff; font-size: 9px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
    .cl-title { font-size: 15px; font-weight: 900; color: #000000; margin-bottom: 5px; }
    .cl-body  { font-size: 14px; font-weight: 500; color: #000000; line-height: 1.9; }

    /* ══ SIGNATURES ══ */
    .sig-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; padding: 12px 16px; }
    .sig-c { border: 1px solid #000000; border-radius: 8px; overflow: hidden; }
    .sig-role { font-size: 13px; font-weight: 900; color: #475569; padding: 8px 10px; background: #f8fafc; border-bottom: 1px solid #000000; text-align: center; }
    .sig-name { font-size: 12px; font-weight: 700; color: #1e293b; padding: 10px 10px 0; text-align: center; min-height: 22px; }
    .sig-line { border-top: 1.5px dashed #cbd5e1; margin: 18px 10px 10px; padding-top: 5px; font-size: 12px; font-weight: 700; color: #64748b; text-align: center; }

    /* ══ FOOTER ══ */
    .footer {
      background: #fff;
      margin: 0 12mm 16px;
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid #000000;
    }
    .footer::before { display: none; }
    .ft-accent {
      width: 6px; min-height: 36px; border-radius: 4px; flex-shrink: 0; align-self: stretch;
      background: #f59e0b;
    }
    .ft-content { flex: 1; display: flex; justify-content: space-between; align-items: center; }
    .sig-c {
      border-radius: 10px; overflow: hidden; position: relative;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .sig-c-buyer   { border:1px solid #000000; }
    .sig-c-seller  { border:1px solid #000000; }
    .sig-c-company { border:1px solid #000000; }
    .sig-c-accent { width:4px; flex-shrink:0; border-radius:0 0 0 0; }
    .sig-accent-buyer   { background:#4ade80; }
    .sig-accent-seller  { background:#fb923c; }
    .sig-accent-company { background:#a78bfa; }
    .sig-role {
      font-size: 13px; font-weight: 900; padding: 8px 10px; text-align: center;
    }
    .sig-role-buyer   { background:#f0fdf4; color:#15803d; }
    .sig-role-seller  { background:#fff7ed; color:#c2410c; }
    .sig-role-company { background:#f5f3ff; color:#5b21b6; }
    .sig-name { font-size: 10px; font-weight: 600; color: #64748b; padding: 8px 10px; text-align: center; }
    .sig-line { font-size: 13px; font-weight: 700; color: #1e293b; padding: 10px; text-align: center; min-height: 24px; }
    .ft-l { font-size: 9px; font-weight: 700; color: #000000; }
    .ft-r { font-size: 9px; color: #000000; font-weight: 600; }

    @page { margin: 0; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { background: #f1f5f9; }
      .page { width: 100%; }
      .strip, .wstrip, .cl { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER CARD -->
  <div style="height: 12mm; flex-shrink: 0;"></div>
  <div class="header">
    <div class="hdr-accent"></div>
    ${logoUrl ? `<img class="hdr-logo" src="${logoUrl}" alt="Logo" />` : ''}
    <div style="flex:1;">
      <div class="hdr-title${lang === 'ku' ? ' hdr-title-ku' : ''}">${currentBranch ? (lang === 'ku' ? (currentBranch.company_name_ku || currentBranch.company_name || '') : (currentBranch.company_name || '')) : ''}</div>
      <div class="hdr-sub">${L('عقد بيع وشراء عقار', 'گرێبەستی فرۆشتن و کڕینی خانوو', lang)}</div>
    </div>
    <div class="hdr-right">
      <div class="hdr-num-lbl">${L('رقم العقد', 'ژمارەی گرێبەست', lang)}</div>
      <div class="hdr-num">${contract.contract_number || '—'}</div>
      <div class="hdr-date">${date}</div>
    </div>
  </div>

  <!-- STRIPS -->
  <div class="strips">

    <!-- STRIP 1: Property Info -->
    <div class="strip">
      <div class="strip-content" style="padding:16px 18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(to bottom,#fbbf24,#d97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:11px;font-weight:900;color:#fff;">01</span>
            </div>
            <div class="sc-head" style="color:#92400e;font-size:15px;margin-bottom:0;">${L('زانیاری موڵک', 'زانیاری موڵک', lang)}</div>
          </div>
          <div style="width:8px;height:32px;border-radius:6px;background:linear-gradient(to bottom,#fbbf24,#d97706);flex-shrink:0;"></div>
        </div>
        <div class="prop-grid">
          <div class="prop-card prop-card-amber" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('کۆد', 'کۆد', lang)}</span>
              <span class="prop-card-val" style="font-size:14px;font-weight:900;color:#0f172a;padding:10px 14px;display:block;text-align:center;background:#ffffff;">${(lang==='ku'?(property.name_ku||property.name):property.name) || '—'}</span>
            </div>
          </div>
          <div class="prop-card prop-card-amber" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;flex:0 0 auto;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('شوێن', 'شوێن', lang)}</span>
              <span class="prop-card-val" style="font-size:13px;font-weight:700;color:#0f172a;padding:10px 14px;display:block;text-align:center;background:#ffffff;white-space:nowrap;">${(lang==='ku'?(project.name_ku||project.name):project.name) || (lang==='ku'?(property.project_or_area_ku||property.project_or_area):property.project_or_area) || '—'}</span>
            </div>
          </div>
          <div class="prop-card prop-card-amber" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('جۆر', 'جۆر', lang)}</span>
              <span class="prop-card-val" style="font-size:13px;font-weight:700;color:#0f172a;padding:10px 14px;display:block;text-align:center;background:#ffffff;">${property.type || '—'}</span>
            </div>
          </div>
          <div class="prop-card prop-card-amber" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('رووبەر', 'رووبەر', lang)}</span>
              <span class="prop-card-val" style="font-size:13px;font-weight:700;color:#0f172a;padding:10px 14px;display:block;text-align:center;background:#ffffff;">${property.area_sqm ? `${property.area_sqm} ${L('م²', 'م²', lang)}` : '—'}</span>
            </div>
          </div>
          <div class="prop-card prop-card-amber" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('مەبەست', 'مەبەست', lang)}</span>
              <span class="prop-card-val" style="font-size:13px;font-weight:700;color:#0f172a;padding:10px 14px;display:block;text-align:center;background:#ffffff;">${(lang==='ku'?(property.purpose_ku||property.purpose):property.purpose) || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- STRIP 3+4: Buyer & Seller side by side -->
    <div style="display:flex;gap:12px;position:relative;z-index:2;">

      <!-- Buyer Card (03) -->
      <div style="flex:1;background:#cabcbc;border-radius:16px;margin-top:30px;position:relative;border:1px solid #000000;">
        <!-- Buyer Header -->
        <div style="position:absolute;top:-34px;left:50%;transform:translateX(-50%);width:74px;height:74px;border-radius:50%;background:#c26e8d;border:4px solid #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2;">
          <span style="font-size:19px;font-weight:900;color:#fff;line-height:1;">03</span>
          <span style="font-size:11px;font-weight:800;color:#fff;line-height:1.2;margin-top:3px;">${L('المشتري','کڕیار',lang)}</span>
        </div>
        <div style="padding:38px 20px 16px;text-align:center;">
          <div style="font-size:23px;font-weight:900;color:#0f172a;">${buyerName || '—'}</div>
          <div style="height:2px;background:linear-gradient(to right, rgba(194,110,141,0), #c26e8d, rgba(194,110,141,0));width:72%;margin:10px auto;"></div>
          <div style="font-size:13px;font-weight:600;color:#334155;">/ ${L('المشتري','کڕیار',lang)}</div>
        </div>
        <!-- Buyer Content -->
        <div style="padding:0 20px 18px;">
          <!-- Buyer info rows -->
          <div style="background:#ede3e3;border-radius:12px;overflow:hidden;">
            ${[
              contract.buyer_phone ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">📞</span><span dir="ltr" style="font-size:14px;font-weight:700;color:#1e293b;font-family:Arial,sans-serif;">${toEnDigits(contract.buyer_phone)}</span></div>` : '',
              contract.buyer_nationality ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">🌍</span><span style="font-size:14px;font-weight:700;color:#1e293b;">${lang==='ku'?(contract.buyer_nationality_ku||contract.buyer_nationality):contract.buyer_nationality}</span></div>` : '',
              contract.buyer_email ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">✉️</span><span style="font-size:14px;font-weight:700;color:#1e293b;">${contract.buyer_email}</span></div>` : '',
              contract.buyer_address ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">📍</span><span style="font-size:14px;font-weight:700;color:#1e293b;">${lang==='ku'?(contract.buyer_address_ku||contract.buyer_address):contract.buyer_address}</span></div>` : '',
            ].filter(Boolean).join('<div style="border-top:1px solid #eef0f2;"></div>')}
          </div>
        </div>
      </div>

      <!-- Seller Card (04) -->
      <div style="flex:1;background:#cabcbc;border-radius:16px;margin-top:30px;position:relative;border:1px solid #000000;">
        <!-- Seller Header -->
        <div style="position:absolute;top:-34px;left:50%;transform:translateX(-50%);width:74px;height:74px;border-radius:50%;background:#c26e8d;border:4px solid #fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2;">
          <span style="font-size:19px;font-weight:900;color:#fff;line-height:1;">04</span>
          <span style="font-size:11px;font-weight:800;color:#fff;line-height:1.2;margin-top:3px;">${L('البائع','فرۆشیار',lang)}</span>
        </div>
        <div style="padding:38px 20px 16px;text-align:center;">
          <div style="font-size:23px;font-weight:900;color:#0f172a;">${sellerName || '—'}</div>
          <div style="height:2px;background:linear-gradient(to right, rgba(194,110,141,0), #c26e8d, rgba(194,110,141,0));width:72%;margin:10px auto;"></div>
          <div style="font-size:13px;font-weight:600;color:#334155;">/ ${L('البائع','فرۆشیار',lang)}</div>
        </div>
        <!-- Seller Content -->
        <div style="padding:0 20px 18px;">
          <!-- Seller info rows -->
          <div style="background:#ede3e3;border-radius:12px;overflow:hidden;">
            ${[
              contract.seller_phone ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">📞</span><span dir="ltr" style="font-size:14px;font-weight:700;color:#1e293b;font-family:Arial,sans-serif;">${toEnDigits(contract.seller_phone)}</span></div>` : '',
              contract.seller_nationality ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">🌍</span><span style="font-size:14px;font-weight:700;color:#1e293b;">${lang==='ku'?(contract.seller_nationality_ku||contract.seller_nationality):contract.seller_nationality}</span></div>` : '',
              contract.seller_email ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">✉️</span><span style="font-size:14px;font-weight:700;color:#1e293b;">${contract.seller_email}</span></div>` : '',
              contract.seller_address ? `<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
              <span style="font-size:15px;flex-shrink:0;">📍</span><span style="font-size:14px;font-weight:700;color:#1e293b;">${lang==='ku'?(contract.seller_address_ku||contract.seller_address):contract.seller_address}</span></div>` : '',
            ].filter(Boolean).join('<div style="border-top:1px solid #eef0f2;"></div>')}
          </div>
        </div>
      </div>

    </div>

    <!-- STRIP 2: Property & Price -->
    <div class="strip">
      <div class="strip-content" style="padding:16px 18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(to bottom,#38bdf8,#0284c7);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:11px;font-weight:900;color:#fff;">02</span>
            </div>
            <div class="sc-head" style="color:#0369a1;font-size:15px;margin-bottom:0;">${L('السعر', 'نرخ', lang)}</div>
          </div>
          <div style="width:8px;height:32px;border-radius:6px;background:linear-gradient(to bottom,#38bdf8,#0284c7);flex-shrink:0;"></div>
        </div>
        <div class="prop-grid">
          <div class="prop-card prop-card-indigo" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('سعر البيع', 'نرخ', lang)}</span>
              <span class="prop-card-val price" style="font-size:15px;font-weight:900;color:#1e40af;padding:10px 14px;display:block;text-align:center;background:#ffffff;direction:rtl;">${price || '—'}</span>
            </div>
          </div>
          ${paidAmt ? `<div class="prop-card prop-card-green" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('المدفوع', 'دراو', lang)}</span>
              <span class="prop-card-val paid" style="font-size:13px;font-weight:900;color:#16a34a;padding:10px 14px;display:block;text-align:center;background:#ffffff;direction:rtl;">${paidAmt}</span>
            </div>
          </div>` : ''}
          ${remAmt ? `<div class="prop-card prop-card-amber" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('المتبقي', 'ماوە', lang)}</span>
              <span class="prop-card-val rem" style="font-size:13px;font-weight:900;color:#c2410c;padding:10px 14px;display:block;text-align:center;background:#ffffff;direction:rtl;">${remAmt}</span>
            </div>
          </div>` : ''}
          <div class="prop-card prop-card-blue" style="padding:0;border:none;box-shadow:none;background:transparent;overflow:visible;">
            <div style="background:#ffffff;border:1px solid #000000;border-radius:8px;overflow:hidden;">
              <span class="prop-card-lbl" style="margin:0;font-size:12px;font-weight:900;display:block;text-align:center;padding:6px 10px;background:#ffffff;color:#92400e;border-bottom:1px solid #000000;">${L('الدفع', 'پارەدان', lang)}</span>
              <span class="prop-card-val" style="font-size:13px;font-weight:700;color:#0f172a;padding:10px 14px;display:block;text-align:center;background:#ffffff;direction:rtl;">${contract.payment_method || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- INSTALLMENTS -->
    ${installmentsHtml ? `
    <div class="wstrip">
      <div class="wstrip-head">
        <div class="wstrip-tab" style="background:#ccfbf1;">
          <div class="tab-num" style="color:#0f766e;font-size:14px;">05</div>
        </div>
        <div class="wstrip-vdiv"></div>
        <div class="wstrip-icon">&#128202;</div>
        <div class="wstrip-title">${contract.payment_method === 'نقد' ? L('جدول الدفع النقدي', 'خشتەی پارەدانی نەقد', lang) : L('جدول الأقساط', 'خشتەی قستەکان', lang)}</div>
        <div class="wstrip-accent" style="background:linear-gradient(to bottom,#2dd4bf,#0f766e);"></div>
      </div>
      ${installmentsHtml}
    </div>` : ''}

    <div style="page-break-after: always;"></div>
    <div style="height: 12mm; flex-shrink: 0;"></div>

    <!-- CLAUSES -->
    ${clausesHtml ? `
    <div class="wstrip">
      <div class="wstrip-head">
        <div class="wstrip-tab" style="background:#fce7f3;">
          <div class="tab-num" style="color:#9d174d;font-size:14px;">${installmentsHtml?'06':'05'}</div>
        </div>
        <div class="wstrip-vdiv"></div>
        <div class="wstrip-icon">&#128221;</div>
        <div class="wstrip-title">${L('بنود وشروط العقد', 'بەندەکان و مەرجەکانی گرێبەست', lang)}</div>
        <div class="wstrip-accent" style="background:linear-gradient(to bottom,#f472b6,#9d174d);"></div>
      </div>
      <div class="cl-wrap">${clausesHtml}</div>
    </div>` : ''}

    <!-- NOTES -->
    ${(contract.notes || contract.notes_ku) ? `
    <div class="wstrip">
      <div class="wstrip-head">
        <div class="wstrip-tab" style="background:#f1f5f9;">
          <div class="tab-num" style="color:#475569;font-size:14px;">N</div>
        </div>
        <div class="wstrip-vdiv"></div>
        <div class="wstrip-icon">&#128203;</div>
        <div class="wstrip-title">${L('ملاحظات', 'تێبینییەکان', lang)}</div>
        <div class="wstrip-accent" style="background:linear-gradient(to bottom,#94a3b8,#475569);"></div>
      </div>
      <div style="padding:10px 16px;font-size:10.5px;color:#64748b;line-height:1.8;">${lang==='ku'?(contract.notes_ku||contract.notes):contract.notes}</div>
    </div>` : ''}

    <!-- SIGNATURES -->
    ${spGet('show_signatures') ? `
    <div class="wstrip">
      <div class="wstrip-head">
        <div class="wstrip-tab" style="background:#ede9fe;">
          <div class="tab-num" style="color:#5b21b6;font-size:14px;">S</div>
        </div>
        <div class="wstrip-vdiv"></div>
        <div class="wstrip-icon">&#9997;</div>
        <div class="wstrip-title">${L('التوقيعات والأختام', 'واژۆکان و مووری', lang)}</div>
        <div class="wstrip-accent" style="background:linear-gradient(to bottom,#a78bfa,#5b21b6);"></div>
      </div>
      <div class="sig-grid">
        <div class="sig-c">
          <div class="sig-role">${L('المشتري', 'کڕیار', lang)}</div>
          <div style="height:140px;"></div>
          <div class="sig-name" style="font-size:13px;font-weight:700;color:#1e293b;">${contract.buyer_name||''}</div>
        </div>
        <div class="sig-c">
          <div class="sig-role">${L('الشركة', 'کۆمپانیا', lang)}</div>
          <div style="height:100px;"></div>
          <div class="sig-name" style="font-size:13px;font-weight:700;color:#1e293b;">${contract.company_signature||''}</div>
          <div style="display:flex;justify-content:center;padding:10px 0 4px;">
            <div style="padding:8px;background:#fff;border:2px solid #000000;border-radius:8px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(contract.contract_number || 'N/A')}" width="80" height="80" style="display:block;" alt="QR" />
            </div>
          </div>
        </div>
        <div class="sig-c">
          <div class="sig-role">${L('البائع', 'فرۆشیار', lang)}</div>
          <div style="height:140px;"></div>
          <div class="sig-name" style="font-size:13px;font-weight:700;color:#1e293b;">${contract.seller_name||''}</div>
        </div>
      </div>
    </div>` : ''}

  </div>

  <!-- FOOTER CARD -->
  <div class="footer">
    <div class="ft-accent"></div>
    <div class="ft-content">
      <div class="ft-l">${L('جميع الحقوق محفوظة', 'هەموو مافەکان پارێزراوە', lang)}</div>
      <div class="ft-r">${[currentBranch ? (lang === 'ku' ? (currentBranch.name_ku || currentBranch.name || '') : (currentBranch.name || '')) : '', currentBranch?.company_phone ? `📞 ${toEnDigits(currentBranch.company_phone)}` : ''].filter(Boolean).join(' • ')}</div>
    </div>
  </div>

</div>
</body></html>`;
  };

  const handlePreview = () => {
    setPreviewHtml(buildPrintHtml());
    setPreviewKey(k => k + 1);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    const html = buildPrintHtml();
    const w = window.open('', '_blank');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
    setTimeout(() => { w.focus(); w.print(); }, 1500);
    setPreviewOpen(false);
  };

  const statusConfig = {
    'نشط':   'bg-emerald-100 text-emerald-800',
    'مكتمل': 'bg-blue-100 text-blue-800',
    'ملغي':  'bg-red-100 text-red-800',
    'معلق':  'bg-amber-100 text-amber-800',
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-purple-500 via-pink-500 to-orange-500 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{L('تفاصيل عقد البيع', 'وردەکارییەکانی گرێبەستی فرۆشتن', lang)}</h2>
            <p className="text-white/70 text-xs mt-0.5">{contract.contract_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusConfig[contract.status] || 'bg-gray-100 text-gray-800'}`}>
            {contract.status}
          </span>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
        <Button onClick={onEdit} className="gap-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-md">
          <Edit className="w-4 h-4" />
          {L('تعديل العقد', 'دەستکاریکردنی گرێبەست', lang)}
        </Button>
        <Button variant="outline" onClick={handlePreview} className="gap-2">
          <Printer className="w-4 h-4" />
          {L('طباعة', 'پرینت', lang)}
        </Button>
      </div>

      {/* Content */}
      <div className="p-6">
        <Section title={L('معلومات العقار والبيع', 'زانیارییەکانی خانوو و فرۆشتن', lang)} color="from-pink-50 to-purple-50">
          <Row icon={Building2} label={L('العقار', 'خانوو', lang)} value={lang === 'ku' ? (contract.property_name_ku || contract.property_name) : contract.property_name} />
          <Row icon={DollarSign} label={L('سعر البيع', 'نرخی فرۆشتن', lang)} value={contract.sale_price ? `${contract.sale_price.toLocaleString()} ${contract.currency_symbol || 'د.ع'}` : null} />
          <Row icon={Calendar} label={L('تاريخ البيع', 'بەرواری فرۆشتن', lang)} value={contract.sale_date ? new Date(contract.sale_date).toLocaleDateString('ar-IQ') : null} />
          <Row icon={FileText} label={L('طريقة الدفع', 'شێوازی پارەدان', lang)} value={contract.payment_method} />
          {contract.paid_amount > 0 && <Row icon={DollarSign} label={L('المبلغ المدفوع', 'بڕی پارەی دراو', lang)} value={`${Number(contract.paid_amount).toLocaleString()} ${contract.currency_symbol || 'د.ع'}`} />}
          {contract.remaining_amount > 0 && <Row icon={DollarSign} label={L('المبلغ المتبقي', 'بڕی پارەی ماوە', lang)} value={`${Number(contract.remaining_amount).toLocaleString()} ${contract.currency_symbol || 'د.ع'}`} />}
        </Section>

        {contract.installment_plan && contract.installment_plan.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-2.5">
              <p className="text-sm font-bold">{contract.payment_method === 'نقد' ? L('جدول الدفع النقدي', 'خشتەی پارەدانی نەقد', lang) : L('جدول الأقساط', 'خشتەی قستەکان', lang)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-right px-4 py-2 text-xs font-bold text-slate-600">#</th>
                    <th className="text-right px-4 py-2 text-xs font-bold text-slate-600">{L('المبلغ', 'بڕ', lang)}</th>
                    <th className="text-right px-4 py-2 text-xs font-bold text-slate-600">{L('تاريخ الاستحقاق', 'بەرواری کردنی', lang)}</th>
                    <th className="text-right px-4 py-2 text-xs font-bold text-slate-600">{L('الحالة', 'دۆخ', lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.installment_plan.map((inst, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 text-xs text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-2 font-semibold">{Number(inst.amount).toLocaleString()} {contract.currency_symbol || 'د.ع'}</td>
                      <td className="px-4 py-2 text-slate-600">{inst.due_date ? new Date(inst.due_date).toLocaleDateString('ar-IQ') : '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inst.status === 'مدفوع' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inst.status === 'مدفوع' ? L('مدفوع','دراو',lang) : L('معلق','راگیراو',lang)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Section title={L('بيانات المشتري', 'زانیارییەکانی کڕیار', lang)} color="from-blue-50 to-cyan-50">
          <Row icon={User} label={L('الاسم', 'ناو', lang)} value={lang === 'ku' ? (contract.buyer_name_ku || contract.buyer_name) : contract.buyer_name} />
          <Row icon={Phone} label={L('الهاتف', 'تەلەفۆن', lang)} value={contract.buyer_phone} />
          <Row icon={Mail} label={L('البريد', 'ئیمەیڵ', lang)} value={contract.buyer_email} />
          <Row icon={Globe} label={L('الجنسية', 'نەتەوە', lang)} value={lang === 'ku' ? (contract.buyer_nationality_ku || contract.buyer_nationality) : contract.buyer_nationality} />
          <Row icon={MapPin} label={L('العنوان', 'ناونیشان', lang)} value={lang === 'ku' ? (contract.buyer_address_ku || contract.buyer_address) : contract.buyer_address} />
        </Section>

        <Section title={L('بيانات البائع', 'زانیارییەکانی فرۆشیار', lang)} color="from-amber-50 to-orange-50">
          <Row icon={User} label={L('الاسم', 'ناو', lang)} value={lang === 'ku' ? (contract.seller_name_ku || contract.seller_name) : contract.seller_name} />
          <Row icon={Phone} label={L('الهاتف', 'تەلەفۆن', lang)} value={contract.seller_phone} />
          <Row icon={Mail} label={L('البريد', 'ئیمەیڵ', lang)} value={contract.seller_email} />
          <Row icon={Globe} label={L('الجنسية', 'نەتەوە', lang)} value={lang === 'ku' ? (contract.seller_nationality_ku || contract.seller_nationality) : contract.seller_nationality} />
          <Row icon={MapPin} label={L('العنوان', 'ناونیشان', lang)} value={lang === 'ku' ? (contract.seller_address_ku || contract.seller_address) : contract.seller_address} />
        </Section>

        {contract.clauses && contract.clauses.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5">
              <p className="text-sm font-bold">{L('بنود وشروط العقد', 'بەندەکان و مەرجەکانی گرێبەست', lang)}</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              {contract.clauses.map((clause, idx) => (
                <div key={idx} className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-black text-primary">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    {clause.title && <p className="text-sm font-bold text-slate-800">{clause.title}</p>}
                    {clause.description && <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{clause.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(contract.buyer_signature || contract.seller_signature || contract.company_signature) && (
          <Section title={L('التوقيعات', 'واژۆکان', lang)} color="from-purple-50 to-pink-50">
            <Row icon={PenLine} label={L('توقيع المشتري', 'واژۆی کڕیار', lang)} value={contract.buyer_signature} />
            <Row icon={PenLine} label={L('توقيع البائع', 'واژۆی فرۆشیار', lang)} value={contract.seller_signature} />
            <Row icon={PenLine} label={L('توقيع الشركة', 'واژۆی کۆمپانیا', lang)} value={contract.company_signature} />
          </Section>
        )}

        {(contract.notes || contract.notes_ku) && (
          <Section title={L('ملاحظات', 'تێبینییەکان', lang)} color="from-slate-50 to-gray-50">
            <Row icon={FileText} label={L('ملاحظات', 'تێبینی', lang)} value={lang === 'ku' ? (contract.notes_ku || contract.notes) : contract.notes} />
          </Section>
        )}

        <div className="mt-2 space-y-2">
          <SalePaymentInvoiceSection contract={contract} />
          <SaleSellerPaymentSection contract={contract} />
          <ContractCommissionSection contract={contract} contractType="sale" />
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {L('معاينة عقد البيع', 'پێشبینینی گرێبەستی فرۆشتن', lang)}
            </DialogTitle>
            <DialogDescription>
              {L('يمكنك مراجعة العقد ثم الطباعة', 'دەتوانیت گرێبەستەکە بپشکنیت پاشان پرینت بکەیت', lang)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg mt-2">
            <iframe key={previewKey} srcDoc={previewHtml} className="w-full min-h-[650px]" title="contract-preview" />
          </div>
          <div className="flex justify-end gap-3 mt-3">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              {L('إغلاق', 'داخستن', lang)}
            </Button>
            <Button onClick={handlePrint} className="gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white">
              <Printer className="w-4 h-4" />
              {L('طباعة', 'پرینت', lang)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}