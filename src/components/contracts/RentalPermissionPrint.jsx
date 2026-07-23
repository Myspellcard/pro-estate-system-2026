import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Printer, Pencil, Banknote, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { printTempPayment } from '@/utils/printTempPayment';
import { useCurrencies } from '@/hooks/useCurrencies';

export default function RentalPermissionPrint({ contract, branch, onClose, onVerify, onEdit }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  
  // Load persisted note from localStorage
  const storedNote = typeof window !== 'undefined' ? localStorage.getItem(`rental_permission_note_${contract?.id}`) : '';
  const [userNote, setUserNote] = useState(storedNote || '');
  const [tempAmount, setTempAmount] = useState(contract?.temp_payment_amount ? String(contract.temp_payment_amount) : '');
  const [tempDate, setTempDate] = useState(contract?.temp_payment_date || new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(contract?.temp_payment_validity_days ? String(contract.temp_payment_validity_days) : '');
  const [tempCurrencySymbol, setTempCurrencySymbol] = useState('$');
  const isRefunded = contract?.temp_payment_status === 'مسترد للمستأجر' || contract?.temp_payment_status === 'گەڕێندراوە بۆ کرێچی';
  const isTransferred = contract?.temp_payment_status === 'مدفوع للمالك' || contract?.temp_payment_status === 'دراوە بە خاوەن';
  const [tempSaved, setTempSaved] = useState(Number(contract?.temp_payment_amount) > 0);
  const [resolvingAction, setResolvingAction] = useState(null);
  const [isEditing, setIsEditing] = useState(!tempSaved && !isRefunded && !isTransferred);
  const [editingRefundId, setEditingRefundId] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundDate, setRefundDate] = useState('');
  const [editingTempId, setEditingTempId] = useState(null);
  const [tempInvAmount, setTempInvAmount] = useState('');
  const [tempInvDate, setTempInvDate] = useState('');
  const [editingOwnerId, setEditingOwnerId] = useState(null);
  const [ownerAmount, setOwnerAmount] = useState('');
  const [ownerDate, setOwnerDate] = useState('');
  const { currencies } = useCurrencies();
  const queryClient = useQueryClient();

  // Default currency to USD
  useEffect(() => {
    if (currencies.length > 0) {
      const usd = currencies.find(c => c.code === 'USD');
      if (usd) setTempCurrencySymbol(usd.symbol);
    }
  }, [currencies]);

  const saveTempMut = useMutation({
    mutationFn: (data) => firebaseApi.entities.Contract.update(contract.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setTempSaved(true);
      setIsEditing(false);
    },
  });

  const handleSaveTemp = async () => {
    const amt = Number(tempAmount);
    if (!amt || amt <= 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    await firebaseApi.entities.Invoice.create({
      invoice_number: `TMP-${contract.contract_number}-${Date.now().toString().slice(-6)}`,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      tenant_name: contract.tenant_name,
      owner_name: contract.owner_name,
      property_name: contract.property_name,
      type: 'أخرى',
      type_ku: 'پارەی کاتی',
      status: 'معلقة',
      status_ku: 'چاوەڕوان',
      amount: amt,
      due_date: tempDate || todayStr,
      notes: L('دفعة مؤقتة محتجزة', 'پارەی کاتی ئامێرکراو'),
      created_date: new Date().toISOString(),
    });
    saveTempMut.mutate({
      temp_payment_amount: amt,
      temp_payment_date: tempDate,
      temp_payment_status: 'محتجز',
      temp_payment_validity_days: Number(validityDays) || null,
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempAmount(contract?.temp_payment_amount ? String(contract.temp_payment_amount) : '');
    setTempDate(contract?.temp_payment_date || new Date().toISOString().split('T')[0]);
  };

  const handleRefundRenter = async () => {
    if (isRefunded || isTransferred || resolvingAction) return;
    setResolvingAction('refund');
    const amt = Number(tempAmount) || Number(contract?.temp_payment_amount) || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    await firebaseApi.entities.Invoice.create({
      invoice_number: `RFD-${contract.contract_number}-${Date.now().toString().slice(-6)}`,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      tenant_name: contract.tenant_name,
      owner_name: contract.owner_name,
      property_name: contract.property_name,
      type: 'استرداد',
      type_ku: 'گەڕاندنەوە',
      status: 'مدفوعة',
      status_ku: 'پارەدراو',
      amount: amt,
      due_date: todayStr,
      paid_date: todayStr,
      notes: L('استرداد الدفعة المؤقتة للمستأجر', 'گەڕاندنەوەی پارەی کاتی بۆ کرێچی'),
      created_date: new Date().toISOString(),
    });
    await firebaseApi.entities.Contract.update(contract.id, {
      temp_payment_status: 'مسترد للمستأجر',
      temp_payment_resolution_date: todayStr,
    });
    await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const handleTransferOwner = async () => {
    if (isRefunded || isTransferred || resolvingAction) return;
    setResolvingAction('transfer');
    const amt = Number(tempAmount) || Number(contract?.temp_payment_amount) || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    await firebaseApi.entities.Invoice.create({
      invoice_number: `OWN-${contract.contract_number}-${Date.now().toString().slice(-6)}`,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      tenant_name: contract.tenant_name,
      owner_name: contract.owner_name,
      property_name: contract.property_name,
      type: 'دفع_للمالك',
      type_ku: 'پارەدان بۆ خاوەن',
      status: 'مدفوعة',
      status_ku: 'پارەدراو',
      amount: amt,
      due_date: todayStr,
      paid_date: todayStr,
      notes: L('تحويل الدفعة المؤقتة للمالك', 'دانی پارەی کاتی بە خاوەن'),
      created_date: new Date().toISOString(),
    });
    await firebaseApi.entities.Contract.update(contract.id, {
      temp_payment_status: 'مدفوع للمالك',
      temp_payment_resolution_date: todayStr,
    });
    await queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    setTempSaved(false);
    setTempAmount('');
  };
  
  // Save note to localStorage whenever it changes
  useEffect(() => {
    if (contract?.id) {
      localStorage.setItem(`rental_permission_note_${contract.id}`, userNote);
    }
  }, [userNote, contract?.id]);

  // Auto-save validity days to contract (debounced)
  useEffect(() => {
    if (!contract?.id) return;
    const num = Number(validityDays);
    if (!num || num <= 0) return;
    if (contract.temp_payment_validity_days === num) return;
    const t = setTimeout(() => {
      firebaseApi.entities.Contract.update(contract.id, { temp_payment_validity_days: num });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }, 800);
    return () => clearTimeout(t);
  }, [validityDays, contract?.id, contract?.temp_payment_validity_days, queryClient]);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const { data: barcodeSettingsList = [] } = useQuery({
    queryKey: ['barcode_settings'],
    queryFn: () => firebaseApi.entities.BarcodeSettings.list(),
  });

  const { data: property } = useQuery({
    queryKey: ['property', contract?.property_id],
    queryFn: () => contract?.property_id ? firebaseApi.entities.Property.get(contract.property_id) : null,
    enabled: !!contract?.property_id,
  });

  const { data: branchData } = useQuery({
    queryKey: ['branch', contract?.branch_id],
    queryFn: () => contract?.branch_id ? firebaseApi.entities.Branch.get(contract.branch_id) : null,
    enabled: !!contract?.branch_id,
  });

  const { data: contractInvoices = [] } = useQuery({
    queryKey: ['invoices', 'contract', contract?.id],
    queryFn: () => contract?.id ? firebaseApi.entities.Invoice.filter({ contract_id: contract.id }) : [],
    enabled: !!contract?.id,
  });

  const refundInvoices = contractInvoices.filter(inv => (inv.invoice_number || '').startsWith('RFD-'));
  const tempInvoices = contractInvoices.filter(inv => (inv.invoice_number || '').startsWith('TMP-'));
  const ownerInvoices = contractInvoices.filter(inv => (inv.invoice_number || '').startsWith('OWN-'));

  const handleDeleteRefund = async (inv) => {
    try {
      await firebaseApi.entities.Invoice.delete(inv.id);
    } catch (err) {
      if (!String(err?.message || '').includes('not found')) throw err;
    }
    // If no more refund invoices remain, reset contract temp payment status to reserved
    const remaining = refundInvoices.filter(r => r.id !== inv.id);
    if (remaining.length === 0) {
      await firebaseApi.entities.Contract.update(contract.id, {
        temp_payment_status: 'محتجز',
        temp_payment_resolution_date: null,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const handleStartRefundEdit = (inv) => {
    setEditingRefundId(inv.id);
    setRefundAmount(String(inv.amount || ''));
    setRefundDate(inv.paid_date || inv.due_date || new Date().toISOString().split('T')[0]);
  };

  const handleSaveRefundEdit = async (inv) => {
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) return;
    await firebaseApi.entities.Invoice.update(inv.id, {
      amount: amt,
      due_date: refundDate,
      paid_date: refundDate,
    });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    setEditingRefundId(null);
  };

  const handlePrintRefund = (inv) => {
    printTempPayment({
      contract,
      branch: branchData || branch,
      lang,
      amount: Number(inv.amount || 0),
      date: inv.paid_date || inv.due_date,
      status: 'مسترد للمستأجر',
      notes: inv.notes,
      validityDays,
      currencySymbol: tempCurrencySymbol,
    });
  };

  const handleStartOwnerEdit = (inv) => {
    setEditingOwnerId(inv.id);
    setOwnerAmount(String(inv.amount || ''));
    setOwnerDate(inv.paid_date || inv.due_date || new Date().toISOString().split('T')[0]);
  };

  const handleSaveOwnerEdit = async (inv) => {
    const amt = Number(ownerAmount);
    if (!amt || amt <= 0) return;
    await firebaseApi.entities.Invoice.update(inv.id, {
      amount: amt,
      due_date: ownerDate,
      paid_date: ownerDate,
    });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    setEditingOwnerId(null);
  };

  const handlePrintOwner = (inv) => {
    printTempPayment({
      contract,
      branch: branchData || branch,
      lang,
      amount: Number(inv.amount || 0),
      date: inv.paid_date || inv.due_date,
      status: 'مدفوع للمالك',
      notes: inv.notes,
      validityDays,
      currencySymbol: tempCurrencySymbol,
    });
  };

  const handleDeleteOwner = async (inv) => {
    try {
      await firebaseApi.entities.Invoice.delete(inv.id);
    } catch (err) {
      if (!String(err?.message || '').includes('not found')) throw err;
    }
    const remaining = ownerInvoices.filter(o => o.id !== inv.id);
    if (remaining.length === 0) {
      await firebaseApi.entities.Contract.update(contract.id, {
        temp_payment_status: 'محتجز',
        temp_payment_resolution_date: null,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const handlePrintTempReceipt = () => {
    const amt = Number(tempAmount) || Number(contract?.temp_payment_amount) || 0;
    const d = tempDate || contract?.temp_payment_date;
    printTempPayment({
      contract,
      branch: branchData || branch,
      lang,
      amount: amt,
      date: d,
      status: 'محتجز',
      notes: contract?.temp_payment_notes,
      validityDays,
      currencySymbol: tempCurrencySymbol,
    });
  };

  const handleDeleteTemp = async (inv) => {
    try {
      await firebaseApi.entities.Invoice.delete(inv.id);
    } catch (err) {
      if (!String(err?.message || '').includes('not found')) throw err;
    }
    const remaining = tempInvoices.filter(t => t.id !== inv.id);
    if (remaining.length === 0) {
      await firebaseApi.entities.Contract.update(contract.id, {
        temp_payment_amount: null,
        temp_payment_date: null,
        temp_payment_status: 'محتجز',
        temp_payment_resolution_date: null,
      });
      setTempSaved(false);
      setTempAmount('');
      setIsEditing(true);
    }
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const handleStartTempEdit = (inv) => {
    setEditingTempId(inv.id);
    setTempInvAmount(String(inv.amount || ''));
    setTempInvDate(inv.due_date || inv.paid_date || new Date().toISOString().split('T')[0]);
  };

  const handleSaveTempEdit = async (inv) => {
    const amt = Number(tempInvAmount);
    if (!amt || amt <= 0) return;
    await firebaseApi.entities.Invoice.update(inv.id, {
      amount: amt,
      due_date: tempInvDate,
    });
    const latest = tempInvoices.filter(t => t.id !== inv.id).concat([{ ...inv, amount: amt, due_date: tempInvDate }]);
    const top = latest.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))[0];
    if (top) {
      await firebaseApi.entities.Contract.update(contract.id, {
        temp_payment_amount: top.amount,
        temp_payment_date: top.due_date,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    setEditingTempId(null);
  };

  const handlePrintTempInv = (inv) => {
    printTempPayment({
      contract,
      branch: branchData || branch,
      lang,
      amount: Number(inv.amount || 0),
      date: inv.due_date || inv.paid_date,
      status: 'محتجز',
      notes: inv.notes,
      validityDays,
      currencySymbol: tempCurrencySymbol,
    });
  };

  const appSettings = settingsList.find(s => s.key === 'default') || {};
  const ps = appSettings.print_rental_permission || {};

  const get = (key, def = true) => ps[key] !== undefined ? ps[key] : def;
  const getText = (key, fallback = null) => ps[key] ?? fallback;

  const paragraphs = ps.letter_paragraphs || [];

  const logoUrl = contract.company_logo || branch?.company_logo;
  const companyName = branch?.company_name || L('نظام إدارة العقارات', 'کۆمپانیای رۆست ڤاڵی');
  const companySlogan = lang === 'ku' ? (branch?.permission_slogan_ku || branch?.company_slogan_ku || '') : (branch?.permission_slogan || branch?.company_slogan || '');
  const companyPhone = branch?.company_phone;

  const fd = (d) => d ? format(parseISO(d), 'dd/MM/yyyy') : '—';
  const today = format(new Date(), 'dd/MM/yyyy');

  // Group 1: Rental / Tenant info
  const rentalInfo = [
    { key: 'show_tenant_name', labelAr: 'اسم المستأجر', labelKu: 'ناو', icon: '👤', value: contract.tenant_name },
    { key: 'show_tenant_phone', labelAr: 'هاتف المستأجر', labelKu: 'ژ.تەلەفۆن', icon: '📞', value: contract.tenant_phone },
    { key: 'show_tenant_nationality', labelAr: 'جنسية المستأجر', labelKu: 'نەتەوە', icon: '🌍', value: contract.tenant_nationality },
    { key: 'show_tenant_address', labelAr: 'عنوان المستأجر', labelKu: 'ناونیشان', icon: '📍', value: contract.tenant_address },
    { key: 'show_family_members', labelAr: 'عدد أفراد العائلة', labelKu: 'ژمارەی ئەندامانی خێزان', icon: '👨‍👩‍👧‍👦', value: contract.family_members ? contract.family_members.toString() : null },
    { key: 'show_owner_name', labelAr: 'اسم المالك', labelKu: 'ناوی خاوەن', icon: '🏠', value: contract.owner_name },
    { key: 'show_monthly_rent', labelAr: 'الإيجار الشهري', labelKu: 'کرێی مانگانە', icon: '💰', value: contract.monthly_rent ? `${contract.monthly_rent.toLocaleString()} ${contract.currency_symbol || 'د.ع'}` : null },
    { key: 'show_insurance', labelAr: 'مبلغ التأمين', labelKu: 'بڕی دڵنیایی', icon: '🛡️', value: contract.insurance_amount ? `${contract.insurance_amount.toLocaleString()} ${contract.currency_symbol || 'د.ع'}` : null },
  ].filter(item => get(item.key) && item.value);

  // Group 2: Property info
  const propertyInfo = [
    { key: 'show_property_name', labelAr: 'اسم العقار', labelKu: 'کۆد', icon: '📍', value: contract.property_name },
    { key: 'show_property_type', labelAr: 'نوع العقار', labelKu: 'جۆر', icon: '🏷️', value: property?.type, alwaysShow: true },
    { key: 'show_property_location', labelAr: 'موقع العقار', labelKu: 'شوێن', icon: '📌', value: property?.location || property?.address, alwaysShow: true },
    { key: 'show_purpose', labelAr: 'غرض الإيجار', labelKu: 'ئامانجی کرێ', icon: '🎯', value: contract.purpose },
  ].filter(item => get(item.key) && (item.alwaysShow || item.value));

  // Override the group title Kurdish label
  const propertyInfoTitleKu = 'زانیارییەکانی موڵک';

  // Group 3: Duration info
  const durationInfo = [
    { key: 'show_start_date', labelAr: 'تاريخ البداية', labelKu: 'دەستپێک', icon: '📅', value: contract.start_date ? fd(contract.start_date) : null },
    { key: 'show_end_date', labelAr: 'تاريخ الانتهاء', labelKu: 'کۆتایی', icon: '📅', value: contract.end_date ? fd(contract.end_date) : null },
    { key: 'show_duration', labelAr: 'مدة العقد', labelKu: 'ماوە', icon: '⏳', value: contract.duration_months ? `${contract.duration_months} ${L('شهر', 'مانگ')}` : null },
  ].filter(item => get(item.key) && item.value);

  const renderInfoGroup = (items, titleAr, titleKu, icon, color) => {
    if (items.length === 0) return null;
    return (
      <div className="rounded-xl overflow-hidden border border-black shadow-sm">
        <div className={`px-4 py-2.5 flex items-center gap-2 ${color}`}>
          <span className="text-base">{icon}</span>
          <span className="text-sm font-bold text-white">{L(titleAr, titleKu)}</span>
        </div>
        <div className="bg-gray-100">
          {items.map((item, i) => (
            <div key={i} className="bg-white flex border-b border-black last:border-b-0">
              <div className="px-3 py-2 text-[15px] font-bold border-l border-black text-[#1a2744] flex items-center gap-1.5" style={{fontFamily: "'Rabar', 'Noto Sans Arabic', sans-serif", width: '40%'}}>
                <span className="text-lg">{item.icon}</span>
                <span>{L(item.labelAr, item.labelKu)}</span>
              </div>
              <div className="px-3 py-2 text-[16px] font-semibold text-gray-800 flex-1">{item.value || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    const docTitle = getText('doc_title_' + lang);
    const toLabel = getText('to_label_' + lang);
    const subject = getText('subject_' + lang);
    const greeting = getText('greeting_' + lang);
    const closing = getText('closing_' + lang);

    const renderPrintGroup = (items, titleAr, titleKu, icon, headerBg) => {
    if (items.length === 0) return '';
    return `
      <div class="info-group">
        <div class="info-group-header" style="background:${headerBg};">
          <span style="font-size:13px;">${icon}</span>
          <span style="font-size:10px; font-weight:800; color:#fff;">${L(titleAr, titleKu)}</span>
        </div>
        ${items.map(item => `
            <div class="info-row">
              <div class="info-label"><span style="font-size:13px;">${item.icon}</span><span>${L(item.labelAr, item.labelKu)}</span></div>
              <div class="info-value">${item.value || '—'}</div>
            </div>
          `).join('')}
      </div>
    `;
    };

    const printWindow = window.open('', '_blank', 'width=794,height=600');
    const userNoteText = userNote;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="${lang === 'ku' ? 'ku' : 'ar'}">
      <head>
        <meta charset="UTF-8"/>
        <title>${docTitle || L('إذن الإيجار','مۆڵەتی کرێ')} - ${contract.contract_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap');
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
          html, body {
            width: 100%;
            max-width: 210mm;
            font-family: 'Noto Sans Arabic', Arial, sans-serif;
            direction: rtl;
            background: #fff;
            color: #111;
            font-size: 9pt;
            line-height: 1.5;
            height: auto !important;
            overflow: visible !important;
            padding: 4mm 10mm 4mm 10mm;
          }

          /* ── HEADER ── */
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1a2744;
            color: #fff;
            padding: 8px 12px;
            margin-bottom: 8px;
            border-radius: 12px 12px 0 0;
          }
          .header-logo {
            width: 52px; height: 52px;
            background: transparent;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
          }
          .header-logo img { width: 100%; height: 100%; object-fit: contain; }
          .header-logo span { font-size: 26px; font-weight: 900; color: #e8b748; }
          .header-center { flex: 1; text-align: center; }
          .header-center h1 { font-size: 14pt; font-weight: 900; color: #fff; margin-bottom: 2px; }
          .header-center p { font-size: 9pt; color: #a8c0e0; font-weight: 600; }
          .header-right { text-align: right; flex-shrink: 0; }
          .header-right .label { font-size: 8pt; color: #a8c0e0; margin-bottom: 2px; }
          .header-right .num { font-size: 11pt; font-weight: 900; color: #e8b748; }
          .header-right .date { font-size: 8pt; color: #a8c0e0; margin-top: 2px; }

          /* ── DOCUMENT TITLE ── */
          .doc-title-wrap { text-align: center; margin: 8px 0 6px; }
          .doc-title { 
            font-size: 16pt; 
            font-weight: 700; 
            color: #1a2744; 
            font-family: 'Noto Sans Arabic', sans-serif;
          }
          .doc-divider { width: 140px; height: 3px; background: linear-gradient(90deg, transparent, #e8b748, transparent); margin: 10px auto 12px; border: none; }

          /* ── LETTER META ── */
          .meta-line { 
            font-size: 10pt; 
            font-weight: 700; 
            color: #1a2744; 
            margin: 8px 0 5px; 
            text-align: right; 
            font-family: 'Noto Sans Arabic', sans-serif;
          }
          .subject-line {
            font-size: 10pt; 
            font-weight: 700; 
            color: #1a2744;
            margin: 8px 0;
            text-align: center;
            font-family: 'Noto Sans Arabic', sans-serif;
          }
          .greeting { font-size: 14px; font-weight: 400; margin: 8px 0 2px; color: #222; }

          /* ── BODY PARAGRAPHS ── */
          .body-text { font-size: 14px; line-height: 1.6; text-align: justify; color: #222; margin-bottom: 10px; }

          /* ── TABLES ── */
          .section-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            page-break-inside: avoid;
            border: 1.5px solid #000 !important;
            border-left: 1.5px solid #000 !important;
            border-right: 1.5px solid #000 !important;
          }
          .section-table th, .section-table td {
            border: 1.5px solid #000 !important;
            border-left: 1.5px solid #000 !important;
            border-right: 1.5px solid #000 !important;
          }
          .section-table thead tr th {
            background: #1a2744;
            color: #fff;
            font-size: 9pt;
            font-weight: 800;
            padding: 6px 10px;
            text-align: right;
          }
          .section-table thead tr th.alt { background: #2c3e5a; }
          .section-table thead tr th.alt2 { background: #3d4f6e; }
          .section-table tbody tr td {
            padding: 5px 10px;
            font-size: 9pt;
            vertical-align: middle;
          }
          .section-table tbody tr td.lbl {
            width: 38%;
            font-weight: 700;
            background: #f4f6fb;
            color: #1a2744;
            font-size: 10.5pt;
          }
          .section-table tbody tr td.val {
            font-weight: 600;
            color: #111;
            font-size: 11pt;
          }

          /* ── ATTACHMENTS ── */
          .attach-title { font-size: 9pt; font-weight: 900; color: #1a2744; margin: 8px 0 4px; }
          .attach-item { font-size: 8.5pt; color: #444; margin: 3px 0 3px 10px; }

          /* ── SIGNATURES ── */
          .sig-section { display: flex; gap: 16px; margin-top: -20px; margin-bottom: 0px; page-break-inside: avoid; }
          .sig-box { flex: 1; padding: 8px 12px; text-align: center; }
          .sig-box img { max-width: 100%; height: auto; }
          .sig-name { font-size: 9pt; font-weight: 700; color: #1a2744; margin-bottom: 12px; }
          .sig-line { border-bottom: 1.5px solid #1a2744; margin: 4px 10px; }
          .sig-label { font-size: 8pt; color: #555; margin-top: 4px; font-weight: 600; }

          /* ── FOOTER ── */
          .doc-footer {
            margin-top: 30px;
            padding: 4px 12px;
            text-align: center;
            background: #1a2744;
            color: #fff;
            font-size: 7.5pt;
            font-weight: 600;
            border-radius: 0 0 12px 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @media print {
            @page { size: A4 portrait; margin: 0; }
            html, body { 
              height: 100% !important; 
              overflow: visible !important; 
              max-height: none !important;
              display: flex !important;
              flex-direction: column !important;
            }
            body * { flex-shrink: 0; }
            .section-table { border: 2px solid #000 !important; }
            .section-table tbody tr td { border: 1.5px solid #000 !important; }
            .sig-section { 
              margin-top: auto !important; 
              margin-bottom: 7px !important;
            }
            .doc-footer { margin-top: 30px !important; margin-bottom: 7px !important; background: #1a2744 !important; color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>

        <!-- HEADER -->
        <div class="header">
          <div class="header-right">
            ${get('show_contract_number') ? `<div class="label">${L('رقم العقد','ژمارەی گرێبەست')}</div><div class="num">${contract.contract_number || '—'}</div>` : ''}
            <div class="date">${L('التاريخ','بەروار')}: ${today}</div>
          </div>
          <div class="header-center">
            ${get('show_company_name') ? `<h1>${companyName}</h1>` : ''}
            ${companySlogan ? `<p style="color:#e8b748;font-weight:700;font-size:9pt;">${companySlogan}</p>` : ''}
            <p>${L('إدارة العقارات','بەشی بەرێوەبردنی خانووبەرە')}</p>
          </div>
          ${get('show_logo') ? `<div class="header-logo">${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : `<span>${companyName.charAt(0)||'م'}</span>`}</div>` : '<div style="width:48px"></div>'}
        </div>



        <!-- LETTER META -->
        ${toLabel ? `<div class="meta-line" style="margin-top:8px;">${toLabel}</div>` : ''}
        ${subject ? `<div class="subject-line" style="margin-top:5px;">${subject}</div>` : ''}
        ${greeting ? `<div class="greeting" style="margin-top:6px; margin-bottom:2px; font-size:14px; font-weight:400;">${greeting}</div>` : ''}

        <!-- BODY PARAGRAPHS -->
        ${paragraphs.length > 0 ? `<div class="body-text" style="margin-top:4px;">${paragraphs.map(p => {
          const text = lang === 'ku' ? (p.text_ku || p.text_ar || '') : (p.text_ar || p.text_ku || '');
          return text ? `<p style="margin-bottom:6px; font-size:14px;">${text.replace(/\n/g,'<br/>')}</p>` : '';
        }).join('')}</div>` : ''}

        ${getText('thank_you_label_' + lang) ? `<div style="text-align:center;font-weight:800;font-size:10pt;color:#1a2744;margin:16px 0 10px;">${getText('thank_you_label_' + lang)}</div>` : ''}

        <!-- RENTAL INFO TABLE -->
        ${rentalInfo.length > 0 ? `
        <table class="section-table" style="margin-top:16px;">
          <thead><tr><th colspan="2">🏠 ${L('معلومات الإيجار','زانیارییەکانی کرێ')}</th></tr></thead>
          <tbody>${rentalInfo.map(item => `
            <tr>
              <td class="lbl">${item.icon} ${L(item.labelAr, item.labelKu)}</td>
              <td class="val">${item.value || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}

        <!-- PROPERTY INFO TABLE -->
        ${propertyInfo.length > 0 ? `
        <table class="section-table" style="margin-top:12px;">
          <thead><tr><th colspan="2" class="alt">📍 ${L('معلومات العقار','زانیارییەکانی موڵک')}</th></tr></thead>
          <tbody>${propertyInfo.map(item => `
            <tr>
              <td class="lbl">${item.icon} ${L(item.labelAr, item.labelKu)}</td>
              <td class="val">${item.value || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}

        <!-- PROPERTY NOTE (RED) -->
        ${(() => {
          const note = lang === 'ku' ? (ps.property_note_ku||'') : (ps.property_note_ar||'');
          if (!note || !note.trim()) return '';
          return `<div style="margin:8px 0; padding:8px 12px; background:#fee2e2; border:1px solid #ef4444; border-radius:8px; color:#dc2626; font-size:9pt; font-weight:700;">⚠️ ${note.replace(/\n/g,'<br/>')}</div>`;
        })()}

        <!-- DURATION TABLE -->
        ${durationInfo.length > 0 ? `
        <table class="section-table" style="margin-top:12px;">
          <thead><tr><th colspan="2" class="alt2">📅 ${L('مدة الإيجار','ماوەی کرێ')}</th></tr></thead>
          <tbody>${durationInfo.map(item => `
            <tr>
              <td class="lbl">${item.icon} ${L(item.labelAr, item.labelKu)}</td>
              <td class="val">${item.value || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}

        <!-- ATTACHMENTS -->
        ${(() => {
          const items = (lang === 'ku' ? (ps.attachments_items_ku||[]) : (ps.attachments_items_ar||[])).filter(i=>i.trim());
          const title = getText('attachments_title_' + lang);
          if (!items.length && !title) return '';
          return `<div style="margin:10px 0;">
            ${title ? `<div class="attach-title">${title}</div>` : ''}
            ${items.map(i=>`<div class="attach-item">• ${i}</div>`).join('')}
          </div>`;
        })()}

        <!-- CLOSING -->
        ${closing ? `<div style="font-size:10.5pt;font-weight:700;margin:10px 0 5px;color:#1a2744;">${closing}</div>` : ''}

        <!-- USER NOTE -->
        ${userNoteText && userNoteText.trim() ? `<div style="margin:10px 0; padding:8px 12px; background:#f8f9fa; border:1px solid #dee2e6; border-radius:8px; color:#495057; font-size:9.5pt; font-weight:500;">📝 ${userNoteText.replace(/\n/g,'<br/>')}</div>` : ''}

        <!-- SIGNATURES -->
        ${get('show_signatures') ? `
        <div class="sig-section" style="margin-top:-20px;">
          <div class="sig-box">
            <div class="sig-name">${contract.tenant_name || '—'}</div>
            <div class="sig-line"></div>
            <div class="sig-label">${L('المستأجر','کرێچی')}</div>
          </div>
          <div class="sig-box" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
            ${(() => {
              const barcodeRec = barcodeSettingsList.find(s => s.doc_type === 'rental_permission') || {};
              const barcodeType = barcodeRec.type || 'qrcode_contract_number';
              if (barcodeType === 'none') return '';
              
              let barcodeText = contract.contract_number || '';
              let statusText = '';
              
              // Encode status_key directly so BarcodeView can look it up precisely
              if (contract.status === 'ملغي' || contract.status === 'هەڵوەشێنراوەتەوە') {
                statusText = 'cancelled';
              } else if (contract.status === 'منتهي' || contract.status === 'کۆتاییهاتو') {
                statusText = 'expired';
              } else if (contract.is_verified) {
                statusText = 'verified';
              } else {
                statusText = 'under_work';
              }
              
              if (barcodeType === 'qrcode_custom_url') {
                barcodeText = barcodeRec.custom_url_ar || '';
              } else if (barcodeType === 'qrcode_custom_text') {
                const ct = barcodeRec.custom_text || '';
                const cd = (barcodeRec.custom_domain || '').replace(/\/$/, '');
                const origin = cd || window.location.origin;
                barcodeText = ct ? `${origin}/barcode-view?text=${encodeURIComponent(ct)}` : '';
              } else if (barcodeType === 'qrcode_tenant_phone') {
                barcodeText = contract.tenant_phone || '';
              } else if (barcodeType === 'qrcode_owner_phone') {
                barcodeText = contract.owner_phone || '';
              } else if (barcodeType === 'qrcode_contract_number') {
                const cd = (barcodeRec.custom_domain || '').replace(/\/$/, '');
                const origin = cd || window.location.origin;
                barcodeText = `${origin}/barcode-view?doc=rental_permission&text=${encodeURIComponent(`${contract.contract_number || ''}|${statusText}`)}`;
              }
              
              const size = barcodeRec.size || 50;
              const borderColor = barcodeRec.border_color || '#1a2744';
              const showBorder = barcodeRec.show_border !== false;
              
              if (!barcodeText) return '<div style="color:#999;font-size:8pt;">لا يوجد بيانات</div>';
              
              const borderStyle = showBorder ? `border:2px solid ${borderColor};padding:4px;border-radius:6px;` : '';
              
              return `<div style="${borderStyle}">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(barcodeText)}" alt="barcode" style="height:${size}px;width:${size}px;" />
              </div>
              <div style="text-align:center;margin-top:5px;font-size:7.5pt;color:#555;font-weight:700;line-height:1.4;">
                روست فالي${contract.company_representative ? `<br/><span style="font-size:7pt;color:#888;font-weight:400;">${contract.company_representative}</span>` : ''}
              </div>`;
            })()}
          </div>
          <div class="sig-box">
            <div class="sig-name">${companyName}</div>
            <div class="sig-line"></div>
            <div class="sig-label">${L('ممثل الشركة','بەرێوەبەرایەتی کۆمپانیا')}</div>
          </div>
        </div>
` : ''}

        <!-- FOOTER -->
        <div class="doc-footer">
          ${(() => {
            const b = branchData || branch || {};
            const branchName = lang === 'ku' ? (b.name_ku || b.name || '') : (b.name || '');
            const phone = b.company_phone || companyPhone || '';
            const parts = [];
            if (branchName) parts.push(branchName);
            if (phone) parts.push(`📞 ${phone}`);
            return parts.join(' • ');
          })()}
        </div>

      </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for the QR barcode image (external api.qrserver.com) to finish
    // loading before printing — otherwise it prints as a blank box.
    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      printWindow.print();
    };
    const imgs = Array.from(printWindow.document.images || []);
    const pending = imgs.filter(img => !img.complete);
    if (pending.length === 0) {
      doPrint();
    } else {
      let remaining = pending.length;
      const onDone = () => {
        remaining -= 1;
        if (remaining <= 0) doPrint();
      };
      pending.forEach(img => {
        img.addEventListener('load', onDone);
        img.addEventListener('error', onDone);
      });
      setTimeout(doPrint, 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#f7f7f7] border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <button
            onClick={handlePrintTempReceipt}
            disabled={!tempSaved}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={L('طباعة وصل الدفعة المؤقتة', 'چاپکردنی وەسڵی پارەی کاتی')}
          >
            <Printer className="w-5 h-5 text-gray-700" />
          </button>
          <span className="font-bold text-gray-800 text-lg">{L('إذن الإيجار', 'مۆڵەتی کرێ')}</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm" dir="rtl">
          {/* Status Info */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-xs font-bold text-blue-700 mb-2">{L('حالة العقد', 'دۆخی گرێبەست')}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-blue-900">
                {contract.status === 'ملغي' || contract.status === 'هەڵوەشێنراوەتەوە' 
                  ? (lang === 'ku' ? 'هەڵوەشێنراوەتەوە' : 'Cancelled')
                  : contract.status === 'منتهي' || contract.status === 'کۆتاییهاتو'
                  ? (lang === 'ku' ? 'کۆتاییهاتو' : 'Not available')
                  : contract.is_verified
                  ? (lang === 'ku' ? 'تەواو بوو' : 'Done')
                  : (lang === 'ku' ? 'کاردەکات' : 'Under work')}
              </span>
            </div>
            <p className="text-xs text-blue-500 mt-1">{L('سيظهر في الباركود عند الطباعة', 'لە بارکۆددا دەردەکەوێت کاتی چاپکردن')}</p>
          </div>
          {getText('doc_title_' + lang) && (
            <div className="bg-[#1a2744] rounded-xl p-4 text-white mt-6">
              <p className="font-black text-lg">{getText('doc_title_' + lang)}</p>
              <p className="text-blue-200 text-xs mt-1">{L('عقد رقم:', 'ژمارەی گرێبەست:')} {contract.contract_number}</p>
            </div>
          )}

          {paragraphs.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-500 mb-2">{L('نص الرسالة', 'دەقی نامە')}</p>
              {paragraphs.map(p => {
                const text = lang === 'ku' ? (p.text_ku || p.text_ar || '') : (p.text_ar || p.text_ku || '');
                return text ? <p key={p.id} className="text-base text-gray-700 mb-2 font-medium">{text}</p> : null;
              })}
            </div>
          )}

          {/* Rental Info Group - full width */}
          {renderInfoGroup(rentalInfo, 'معلومات الإيجار', 'زانیارییەکانی کرێ', '🏠', 'bg-[#1a2744]')}

          {/* User Note Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-xs font-bold text-gray-700 mb-2">
              {L('إضافة ملاحظة (اختياري)', 'زیادکردنی تێبینی (هەڵبژاردنە)')}
            </label>
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder={L('اكتب ملاحظتك هنا...', 'تێبینی خۆت لێرە بنووسە...')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20 resize-y"
              rows={3}
              dir="rtl"
            />
            <p className="text-xs text-gray-500 mt-1">
              {L('ستظهر هذه الملاحظة في الرسالة المطبوعة', 'ئەم تێبینییە لە نامەی چاپکراو دەردەکەوێت')}
            </p>
          </div>

          {/* Property + Duration stacked vertically (full width) */}
          <div className="space-y-3">
            {renderInfoGroup(propertyInfo, 'معلومات العقار', propertyInfoTitleKu, '📍', 'bg-[#495057]')}
            {/* Property Note (Red) */}
            {(() => {
              const note = lang === 'ku' ? (ps.property_note_ku || '') : (ps.property_note_ar || '');
              if (!note || !note.trim()) return null;
              return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 font-bold text-sm">
                  ⚠️ {note}
                </div>
              );
            })()}
            {renderInfoGroup(durationInfo, 'مدة الإيجار', 'ماوەی کرێ', '📅', 'bg-[#6c757d]')}
          </div>

          {(() => {
            const items = lang === 'ku' ? (ps.attachments_items_ku || []) : (ps.attachments_items_ar || []);
            const filteredItems = items.filter(i => i.trim());
            const title = getText('attachments_title_' + lang);
            if (filteredItems.length === 0 && !title) return null;
            return (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                {title && <p className="text-xs font-bold text-gray-500 mb-2">{title}</p>}
                {filteredItems.map((item, idx) => (
                  <p key={idx} className="text-sm text-gray-700 mb-1">{item}</p>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Temporary payment (before approving permission) */}
        <div className="px-5 py-4 bg-amber-50 border-t border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900 text-sm">{L('الدفعة المؤقتة قبل الاعتماد', 'پارەی کاتی پێش دڵنیاکردنەوە')}</h3>
          </div>
          <p className="text-xs text-amber-700 mb-3">{L('سجّل الدفعة المؤقتة المستلمة من المستأجر قبل اعتماد الإذن. بعد الاعتماد يمكن تحويلها للمالك أو خصمها من التأمين، وفي حال الإلغاء تُسترد للمستأجر.', 'پارەی کاتی وەرگیراو لە کرێچی پێش دڵنیاکردنەوە تۆمار بکە. دوای دڵنیاکردنەوە دەکرێت بدرێت بە خاوەن یان دابەزێنرێت لە دڵنیایی، و لە هەڵوەشاندنەوە دەگەڕێنرێتەوە بۆ کرێچی.')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">{L('المبلغ', 'بڕ')}</label>
              <input type="number" min="0" value={tempAmount} onChange={e => setTempAmount(e.target.value)} placeholder="0" disabled={tempSaved && !isEditing} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">{L('العملة', 'دراو')}</label>
              <select value={tempCurrencySymbol} onChange={e => setTempCurrencySymbol(e.target.value)} disabled={tempSaved && !isEditing} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
                {currencies.map(c => <option key={c.id} value={c.symbol}>{c.code} ({c.symbol})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">{L('تاريخ الاستلام', 'بەرواری وەرگرتن')}</label>
              <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} disabled={tempSaved && !isEditing} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 mb-1">{L('مدة الصلاحية (أيام)', 'ماوەی بەسەرچوون (ڕۆژ)')}</label>
              <input type="number" min="0" value={validityDays} onChange={e => setValidityDays(e.target.value)} placeholder="0" disabled={tempSaved && !isEditing} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {tempSaved && !isEditing ? (
              <>
                <button
                  onClick={handleRefundRenter}
                  disabled={isRefunded || isTransferred || !!resolvingAction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isRefunded ? L('تم الاسترداد', 'گەڕێندراوەتەوە') : L('استرداد للمستأجر', 'گەڕاندنەوە بۆ کرێچی')}
                </button>
                <button
                  onClick={handleTransferOwner}
                  disabled={isTransferred || isRefunded || !!resolvingAction}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isTransferred ? L('تم التحويل', 'پێدان بە خاوەن') : L('تحويل للمالك', 'پێدان بە خاوەن')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveTemp}
                  disabled={!Number(tempAmount) || saveTempMut.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {saveTempMut.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('حفظ الدفعة', 'پاشەکەوتی پارە')}
                </button>
                {tempSaved && (
                  <button
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                  >
                    {L('إلغاء', 'هەڵوەشاندنەوە')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Temp payment invoices list */}
        {tempInvoices.length > 0 && (
          <div className="px-5 py-4 bg-amber-50 border-t border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-900 text-sm">{L('وصولات الدفعة المؤقتة', 'وەسڵەکانی پارەی کاتی')}</h3>
            </div>
            <div className="space-y-2">
              {tempInvoices.map(inv => (
                <div key={inv.id} className="bg-white rounded-lg border border-amber-200 p-3">
                  {editingTempId === inv.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-amber-700 mb-1">{L('المبلغ', 'بڕ')}</label>
                          <input type="number" min="0" value={tempInvAmount} onChange={e => setTempInvAmount(e.target.value)} className="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-700 mb-1">{L('التاريخ', 'بەروار')}</label>
                          <input type="date" value={tempInvDate} onChange={e => setTempInvDate(e.target.value)} className="w-full border border-amber-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingTempId(null)} className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-500 text-white hover:bg-gray-600 transition-colors">{L('إلغاء', 'هەڵوەشاندنەوە')}</button>
                        <button onClick={() => handleSaveTempEdit(inv)} disabled={!Number(tempInvAmount)} className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{L('حفظ', 'پاشەکەوت')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-amber-800">{inv.invoice_number}</span>
                        <span className="text-xs text-gray-500">{fd(inv.due_date || inv.paid_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-sm font-black text-amber-900">{Number(inv.amount || 0).toLocaleString()}</span>
                          <span className="text-xs text-amber-700 mr-1">{tempCurrencySymbol}</span>
                        </div>
                        <button onClick={() => handlePrintTempInv(inv)} title={L('طباعة', 'چاپکردن')} className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleStartTempEdit(inv)} title={L('تعديل', 'دەستکاریکردن')} className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteTemp(inv)} disabled={isRefunded || isTransferred} title={L('حذف', 'سڕینەوە')} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refund invoices list */}
        {refundInvoices.length > 0 && (
          <div className="px-5 py-4 bg-emerald-50 border-t border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-emerald-900 text-sm">{L('وصولات الاسترداد للمستأجر', 'وەسڵەکانی گەڕاندنەوە بۆ کرێچی')}</h3>
            </div>
            <div className="space-y-2">
              {refundInvoices.map(inv => (
                <div key={inv.id} className="bg-white rounded-lg border border-emerald-200 p-3">
                  {editingRefundId === inv.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-emerald-700 mb-1">{L('المبلغ', 'بڕ')}</label>
                          <input type="number" min="0" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="w-full border border-emerald-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-700 mb-1">{L('التاريخ', 'بەروار')}</label>
                          <input type="date" value={refundDate} onChange={e => setRefundDate(e.target.value)} className="w-full border border-emerald-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingRefundId(null)} className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-500 text-white hover:bg-gray-600 transition-colors">{L('إلغاء', 'هەڵوەشاندنەوە')}</button>
                        <button onClick={() => handleSaveRefundEdit(inv)} disabled={!Number(refundAmount)} className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{L('حفظ', 'پاشەکەوت')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-emerald-800">{inv.invoice_number}</span>
                        <span className="text-xs text-gray-500">{fd(inv.paid_date || inv.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-900">{Number(inv.amount || 0).toLocaleString()}</span>
                          <span className="text-xs text-emerald-700 mr-1">{tempCurrencySymbol}</span>
                        </div>
                        <button onClick={() => handlePrintRefund(inv)} title={L('طباعة', 'چاپکردن')} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleStartRefundEdit(inv)} title={L('تعديل', 'دەستکاریکردن')} className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteRefund(inv)} title={L('حذف', 'سڕینەوە')} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner transfer invoices list */}
        {ownerInvoices.length > 0 && (
          <div className="px-5 py-4 bg-blue-50 border-t border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-900 text-sm">{L('وصولات التحويل للمالك', 'وەسڵەکانی دان بە خاوەن')}</h3>
            </div>
            <div className="space-y-2">
              {ownerInvoices.map(inv => (
                <div key={inv.id} className="bg-white rounded-lg border border-blue-200 p-3">
                  {editingOwnerId === inv.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-blue-700 mb-1">{L('المبلغ', 'بڕ')}</label>
                          <input type="number" min="0" value={ownerAmount} onChange={e => setOwnerAmount(e.target.value)} className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 mb-1">{L('التاريخ', 'بەروار')}</label>
                          <input type="date" value={ownerDate} onChange={e => setOwnerDate(e.target.value)} className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-sm bg-white" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingOwnerId(null)} className="px-3 py-1 rounded-lg text-xs font-bold bg-gray-500 text-white hover:bg-gray-600 transition-colors">{L('إلغاء', 'هەڵوەشاندنەوە')}</button>
                        <button onClick={() => handleSaveOwnerEdit(inv)} disabled={!Number(ownerAmount)} className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{L('حفظ', 'پاشەکەوت')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-blue-800">{inv.invoice_number}</span>
                        <span className="text-xs text-gray-500">{fd(inv.paid_date || inv.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-sm font-black text-blue-900">{Number(inv.amount || 0).toLocaleString()}</span>
                          <span className="text-xs text-blue-700 mr-1">{tempCurrencySymbol}</span>
                        </div>
                        <button onClick={() => handlePrintOwner(inv)} title={L('طباعة', 'چاپکردن')} className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleStartOwnerEdit(inv)} title={L('تعديل', 'دەستکاریکردن')} className="p-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteOwner(inv)} title={L('حذف', 'سڕینەوە')} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 px-5 py-4 flex gap-3 justify-end bg-white flex-wrap" style={{position: 'static'}}>
          <Button variant="outline" onClick={onClose}>{L('إغلاق', 'داخستن')}</Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit} className="gap-2">
              <Pencil className="w-4 h-4" />
              {L('تعديل', 'دەستکاریکردن')}
            </Button>
          )}
          <Button onClick={handlePrint} className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
            <Printer className="w-4 h-4" />
            {L('طباعة الإذن', 'چاپکردنی مۆڵەت')}
          </Button>
          {onVerify && (
            <Button onClick={() => onVerify({ tempAmount, tempDate })} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              ✅ {L('تحقق — عرض العقد', 'دڵنیاکردنەوە — پیشاندانی گرێبەست')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}