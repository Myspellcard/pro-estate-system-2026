import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Building2, User, Calendar, Shield, Receipt, Plus, CheckCircle2, Clock, AlertTriangle, Printer, Download, XCircle, X, Image, RefreshCw, SortAsc, Wrench, MessageCircle, Phone, Globe, MapPin, Banknote } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ContactActions from './ContactActions.jsx';
import { generateSingleContractPDF } from '@/utils/pdfExport';
import { printOwnerPayment } from '@/utils/printOwnerPayment';
import { format, parseISO, addMonths, addDays, differenceInMonths } from 'date-fns';
import ContractPrint from './ContractPrint.jsx';
import PropertyInfoSection from './PropertyInfoSection.jsx';
import InvoicePrint from '@/components/invoices/InvoicePrint';
import InsuranceRefundPrint from './InsuranceRefundPrint.jsx';
import RentalPermissionPrint from './RentalPermissionPrint.jsx';
import ContractCommissionSection from '@/components/commissions/ContractCommissionSection';
import TempPaymentSection from './TempPaymentSection.jsx';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const DECORATIVE_IMAGES = [
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
];

export default function ContractDetail({ contract, invoices, onBack }) {
  const { lang } = useLanguage();
  const currencySymbol = contract.currency_symbol || (contract.currency === 'USD' ? '$' : contract.currency === 'EUR' ? '€' : 'د.ع');
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { can, isAdmin } = useUserPermissions();
  const canManageInsurance = isAdmin || can('can_manage_insurance_refund');
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => firebaseApi.entities.Branch.list() });
  const branch = branches.find(b => b.id === contract.branch_id);
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => firebaseApi.entities.Property.list() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => firebaseApi.entities.Tenant.list() });
  const { data: contractTenantTemplates = [] } = useQuery({ queryKey: ['msg-tpl-ct'], queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'contract_to_tenant', is_active: true }) });
  const { data: contractOwnerTemplates = [] } = useQuery({ queryKey: ['msg-tpl-co'], queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'contract_to_owner', is_active: true }) });
  const { data: paymentTenantTemplates = [] } = useQuery({ queryKey: ['msg-tpl-pt'], queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'payment_to_tenant', is_active: true }) });
  const { data: paymentOwnerTemplates = [] } = useQuery({ queryKey: ['msg-tpl-po'], queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'payment_to_owner', is_active: true }) });

  const property = properties.find(p => p.id === contract.property_id);
  const tenant = tenants.find(t => t.id === contract.tenant_id);
  const tenantLang = tenant?.preferred_language || 'ar';
  const ownerLang = property?.owner_preferred_language || 'ar';

  const buildContractMsg = (tpl, vars, preferredLang = 'ar') => {
    if (!tpl) return null;
    let base = '';
    if (preferredLang === 'ku' && tpl.message_ku) base = tpl.message_ku;
    else if (preferredLang === 'en' && tpl.message_en) base = tpl.message_en;
    else if (preferredLang === 'tr' && tpl.message_tr) base = tpl.message_tr;
    else base = tpl.message_ar || '';
    
    return base
      .replace('{tenant_name}', vars.tenant_name || '')
      .replace('{owner_name}', vars.owner_name || '')
      .replace('{property_code}', vars.property_code || '')
      .replace('{amount}', (vars.amount || 0).toLocaleString())
      .replace('{duration_months}', vars.duration_months || '')
      .replace('{start_date}', vars.start_date || '')
      .replace('{end_date}', vars.end_date || '');
  };
  const [generating, setGenerating] = useState(false);
  const [printContract, setPrintContract] = useState(false);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());
  const [printMultiple, setPrintMultiple] = useState(null);
  const [selectedImage, setSelectedImage] = useState(contract.image_url || DECORATIVE_IMAGES[0]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const queryClient = useQueryClient();
  
  // Load sent messages from localStorage (keyed by contract id + last updated date)
  const contractMsgKey = `contract-${contract.id}-${contract.updated_date}`;
  const [sentContractMsg, setSentContractMsg] = useState(() => {
    const saved = localStorage.getItem('contract_sent_messages');
    let savedData = {};
    try { savedData = saved ? JSON.parse(saved) : {}; } catch { savedData = {}; }
    // Reset if contract was updated after message was sent
    if (savedData[contractMsgKey] && savedData[contractMsgKey] !== contract.updated_date) {
      return false;
    }
    return !!savedData[contractMsgKey];
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Invoice.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const markPaidMutation = useMutation({
    // Update both Arabic and Kurdish status fields, and set rent_collected
    mutationFn: ({ id, amount }) => firebaseApi.entities.Invoice.update(id, { 
      status: 'مدفوعة', 
      status_ku: 'پارەدراو',
      paid_date: new Date().toISOString().split('T')[0],
      rent_collected: amount || null
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [confirmPayInvoice, setConfirmPayInvoice] = useState(null);
  const [showSequentialPaymentWarning, setShowSequentialPaymentWarning] = useState(false);
  const [showInsuranceRefundDialog, setShowInsuranceRefundDialog] = useState(false);
  const [insuranceAction, setInsuranceAction] = useState(null); // 'مسترد' | 'مصادر'
  const [insuranceNotes, setInsuranceNotes] = useState('');
  const [insuranceRefundAmount, setInsuranceRefundAmount] = useState('');
  const [insuranceConfiscatedAmount, setInsuranceConfiscatedAmount] = useState('');
  const [printInsuranceRefund, setPrintInsuranceRefund] = useState(false);
  const [printPermission, setPrintPermission] = useState(false);
  const [showInsurancePaymentDialog, setShowInsurancePaymentDialog] = useState(false);
  const [insurancePaymentAmount, setInsurancePaymentAmount] = useState('');
  const [insurancePaymentDate, setInsurancePaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOwnerPaymentDialog, setShowOwnerPaymentDialog] = useState(false);
  const [ownerPaymentAmount, setOwnerPaymentAmount] = useState('');
  const [ownerPaymentNotes, setOwnerPaymentNotes] = useState('');
  const [ownerPaymentDate, setOwnerPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [ownerPaymentMethod, setOwnerPaymentMethod] = useState('cash'); // 'cash' | 'bank'
  const [ownerPaymentReceiver, setOwnerPaymentReceiver] = useState('owner'); // 'owner' | 'proxy'

  const handlePrintOwnerPayment = (inv) => {
    printOwnerPayment({ inv, contract, branch, property, rentInvoices, isPaid });
  };
  const createOwnerPaymentMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowOwnerPaymentDialog(false);
      setOwnerPaymentAmount('');
      setOwnerPaymentNotes('');
      setOwnerPaymentDate(new Date().toISOString().split('T')[0]);
      setOwnerPaymentMethod('cash');
      setOwnerPaymentReceiver('owner');
    },
  });

  const handleCreateOwnerPayment = () => {
    const amount = Number(ownerPaymentAmount);
    if (!amount || amount <= 0) return;
    const invNum = `OWN-${contract.contract_number}-${Date.now().toString().slice(-6)}`;
    createOwnerPaymentMutation.mutate({
      invoice_number: invNum,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      tenant_name: contract.tenant_name,
      owner_name: contract.owner_name,
      property_name: contract.property_name,
      type: 'دفع_للمالك',
      type_ku: 'پارەدان بۆ خاوەن',
      status: 'مدفوعة',
      status_ku: 'پارەدراو',
      amount,
      due_date: ownerPaymentDate,
      paid_date: ownerPaymentDate,
      notes: [ownerPaymentMethod === 'bank' ? 'تحويل بنكي' : 'نقداً', ownerPaymentReceiver === 'proxy' ? (property?.owner_proxy_name ? `مخوّل: ${property.owner_proxy_name}` : 'مخوّل') : 'المالك شخصياً', ownerPaymentNotes].filter(Boolean).join(' | '),
      created_date: new Date().toISOString(),
    });
  };

  const createInsurancePaymentMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Invoice.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowInsurancePaymentDialog(false);
      setInsurancePaymentAmount('');
      setInsurancePaymentDate(new Date().toISOString().split('T')[0]);
    },
  });

  const handleCreateInsurancePayment = () => {
    const amount = Number(insurancePaymentAmount);
    if (!amount || amount <= 0) return;
    const installmentNum = insuranceInvoices.length + 1;
    createInsurancePaymentMutation.mutate({
      invoice_number: `INV-${contract.contract_number}-INS-${installmentNum}`,
      contract_id: contract.id,
      contract_number: contract.contract_number,
      tenant_name: contract.tenant_name,
      property_name: contract.property_name,
      type: 'تأمين',
      type_ku: 'دڵنیایی',
      status: 'مدفوعة',
      status_ku: 'پارەدراو',
      amount,
      due_date: insurancePaymentDate,
      paid_date: insurancePaymentDate,
      created_date: new Date().toISOString(),
    });
  };

  const updateInsuranceStatusMutation = useMutation({
    mutationFn: ({ status, notes, refundAmount, confiscatedAmount }) => firebaseApi.entities.Contract.update(contract.id, {
      insurance_status: status,
      insurance_refund_date: new Date().toISOString().split('T')[0],
      insurance_refund_notes: notes,
      insurance_refund_amount: refundAmount !== '' ? Number(refundAmount) : undefined,
      insurance_confiscated_amount: confiscatedAmount !== '' ? Number(confiscatedAmount) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowInsuranceRefundDialog(false);
      setInsuranceNotes('');
      setInsuranceRefundAmount('');
      setInsuranceConfiscatedAmount('');
    },
  });

  const reactivateContractMutation = useMutation({
    mutationFn: async () => {
      await firebaseApi.entities.Contract.update(contract.id, { 
        status: 'نشط',
        status_ku: 'چالاک'
      });
      if (contract.property_id) {
        await firebaseApi.entities.Property.update(contract.property_id, { 
          status: 'مؤجر',
          status_ku: 'کرێدراو'
        });
      }
      // Restore invoices that were cancelled back to pending (unpaid)
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      const cancelledInvoices = contractInvoices.filter(inv => inv.status === 'ملغي' || inv.status_ku === 'هەڵوەشاندراوە');
      for (const inv of cancelledInvoices) {
        try { await firebaseApi.entities.Invoice.update(inv.id, { status: 'معلقة', status_ku: 'چاوەڕوان' }); } catch (_) {}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onBack();
    },
  });

  const cancelContractMutation = useMutation({
    mutationFn: async () => {
      // Update both Arabic and Kurdish status
      await firebaseApi.entities.Contract.update(contract.id, { 
        status: 'ملغي',
        status_ku: 'هەڵوەشاندراوە'
      });
      if (contract.property_id) {
        await firebaseApi.entities.Property.update(contract.property_id, { 
          status: 'متاح',
          status_ku: 'بەردەست'
        });
      }
      // Cancel all unpaid (not paid) invoices for this contract
      const contractInvoices = invoices.filter(i => i.contract_id === contract.id);
      const unpaidInvoices = contractInvoices.filter(inv => inv.status !== 'مدفوعة' && inv.status_ku !== 'پارەدراو');
      for (const inv of unpaidInvoices) {
        try { await firebaseApi.entities.Invoice.update(inv.id, { status: 'ملغي', status_ku: 'هەڵوەشاندراوە' }); } catch (_) {}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onBack();
    },
  });

  const generateRentInvoices = async (regenerateAll = false) => {
    setGenerating(true);
    const start = parseISO(contract.start_date);
    const end = parseISO(contract.end_date);
    // Calculate actual months from start and end dates (inclusive - count both start and end month)
    const calculatedMonths = differenceInMonths(end, start) + 1;
    const months = contract.duration_months || calculatedMonths || 12;
    const paymentInterval = contract.payment_interval_months || 1;
    const promises = [];
    
    // Bilingual mappings
    const typeMap = {
      'إيجار': 'کرێ',
      'تأمين': 'دڵنیایی',
      'غرامة': 'دەرەتان',
      'أخرى': 'هی تر',
      'مصروفات': 'سەرفەکان',
      'استلام_من_مالك': 'وەرگرتن_لە_خاوەن',
    };
    const statusMap = {
      'مدفوعة': 'پارەدراو',
      'معلقة': 'چاوەڕوان',
      'متأخرة': 'دواکەوتوو',
    };
    
    const typeAr = 'إيجار';
    const statusAr = 'معلقة';
    
    // Get existing rent invoices
    const existingRentInvoices = invoices.filter(inv => inv.type === 'إيجار' || inv.type_ku === 'کرێ');
    const paidRentInvoices = existingRentInvoices.filter(inv => inv.status === 'مدفوعة' || inv.status_ku === 'پارەدراو');

    // Always clear unpaid invoices when regenerating
    if (regenerateAll) {
      const unpaidInvoices = existingRentInvoices.filter(inv => inv.status !== 'مدفوعة' && inv.status_ku !== 'پارەدراو');
      for (const inv of unpaidInvoices) {
        try { await firebaseApi.entities.Invoice.delete(inv.id); } catch (_) {}
      }
    }
    
    // Create ONE invoice per month (e.g., 12 invoices for 12 months)
    // Payment interval = months per cycle (e.g., 1 = monthly, 2 = every 2 months, 3 = every 3 months)
    // Invoices are grouped by payment interval, each group shares the same due date
    // Example: 12 months, interval=3 → 4 cycles: invoices 1-3 due at month 0, 4-6 due at month 3, 7-9 due at month 6, 10-12 due at month 9
    for (let i = 0; i < months; i++) {
      const periodFrom = addMonths(start, i);
      const periodTo = addDays(addMonths(start, i + 1), -1);
      
      // paymentInterval IS the months per cycle (e.g., 3 = 3 months per cycle)
      const monthsPerCycle = paymentInterval;
      const cycleIndex = Math.floor(i / monthsPerCycle);
      // Due date is the START of each payment cycle
      const dueDate = addMonths(start, cycleIndex * monthsPerCycle);
      
      // Each invoice is for one month only
      const periodAmount = contract.monthly_rent;
      
      // Invoice number: INV-CONTRACTNUM-M1, M2, M3, etc.
      const invoiceNumber = `INV-${contract.contract_number}-M${i + 1}`;

      // Check if a paid invoice exists for this period - NEVER change paid invoices
      const paidInvoiceForPeriod = paidRentInvoices.find(inv => inv.period_from === format(periodFrom, 'yyyy-MM-dd'));
      if (paidInvoiceForPeriod) {
        // Paid invoice exists - skip this month, keep it as is
        continue;
      }

      // Check if an unpaid invoice exists for this period
      const unpaidInvoiceForPeriod = existingRentInvoices.find(inv => 
        inv.status !== 'مدفوعة' && inv.status_ku !== 'پارەدراو' &&
        inv.period_from === format(periodFrom, 'yyyy-MM-dd')
      );

      if (unpaidInvoiceForPeriod) {
        // Update the existing unpaid invoice with new details (contract number, periods, amount)
        promises.push((async () => {
          try {
            await firebaseApi.entities.Invoice.update(unpaidInvoiceForPeriod.id, {
              invoice_number: invoiceNumber,
              contract_number: contract.contract_number,
              amount: periodAmount,
              due_date: format(dueDate, 'yyyy-MM-dd'),
              period_from: format(periodFrom, 'yyyy-MM-dd'),
              period_to: format(periodTo, 'yyyy-MM-dd'),
            });
          } catch (err) {
            // Invoice might have been deleted, skip it
            console.warn('Failed to update invoice:', unpaidInvoiceForPeriod.id, err);
          }
        })());
      } else {
        // No invoice exists - create new one (both for initial create and regenerate)
        promises.push(createInvoiceMutation.mutateAsync({
          invoice_number: invoiceNumber,
          contract_id: contract.id,
          contract_number: contract.contract_number,
          tenant_name: contract.tenant_name,
          property_name: contract.property_name,
          type: typeAr,
          status: statusAr,
          type_ku: typeMap[typeAr],
          status_ku: statusMap[statusAr],
          amount: periodAmount,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          period_from: format(periodFrom, 'yyyy-MM-dd'),
          period_to: format(periodTo, 'yyyy-MM-dd'),
          created_date: new Date().toISOString(),
        }));
      }
      // If not regenerating and no invoice exists, skip (do nothing)
    }

    // Insurance invoice
    const hasInsuranceInvoice = invoices.find(inv => inv.type === 'تأمين' || inv.type_ku === 'دڵنیایی');
    if (contract.insurance_amount && !hasInsuranceInvoice) {
      promises.push(createInvoiceMutation.mutateAsync({
        invoice_number: `INV-${contract.contract_number}-INS`,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        tenant_name: contract.tenant_name,
        property_name: contract.property_name,
        // Arabic fields
        type: 'تأمين',
        status: 'معلقة',
        // Kurdish fields
        type_ku: 'دڵنیایی',
        status_ku: 'چاوەڕوان',
        amount: contract.insurance_amount,
        due_date: contract.start_date,
        created_date: new Date().toISOString(),
      }));
    }

    await Promise.all(promises);
    setGenerating(false);
  };

  // Status icon mapping (works with both Arabic and Kurdish)
  const statusIcon = {
    'مدفوعة': <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    'پارەی دراو': <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    'معلقة': <Clock className="w-4 h-4 text-amber-600" />,
    'چاوەڕوان': <Clock className="w-4 h-4 text-amber-600" />,
    'متأخرة': <AlertTriangle className="w-4 h-4 text-red-600" />,
    'نەدراوەکان': <AlertTriangle className="w-4 h-4 text-red-600" />,
    'ملغي': <XCircle className="w-4 h-4 text-slate-500" />,
    'هەڵوەشاندراوە': <XCircle className="w-4 h-4 text-slate-500" />,
  };

  // Filter invoices using bilingual fields (check both Arabic and Kurdish)
  const rentInvoices = invoices.filter(i => i.type === 'إيجار' || i.type_ku === 'کرێ');
  const insuranceInvoices = invoices.filter(i => i.type === 'تأمين' || i.type_ku === 'دڵنیایی');
  // Helper function to check if invoice is paid
  const isPaid = (inv) => inv.status === 'مدفوعة' || inv.status_ku === 'پارەدراو';
  // Helper function to check if invoice is cancelled
  const isCancelled = (inv) => inv.status === 'ملغي' || inv.status_ku === 'هەڵوەشاندراوە';

  // Owner invoices (payments to owner)
  const ownerPaymentInvoices = invoices.filter(i => i.type === 'دفع_للمالك' || i.type_ku === 'پارەدان بۆ خاوەن');
  const totalOwnerPaid = ownerPaymentInvoices.filter(isPaid).reduce((s, i) => s + (i.amount || 0), 0);
  
  // Current date - must be declared early
  const today = new Date();
  
  const paidAmount = rentInvoices.filter(i => isPaid(i)).reduce((s, i) => s + (i.amount || 0), 0);
  const unpaidAmount = rentInvoices.filter(i => !isPaid(i)).reduce((s, i) => s + (i.amount || 0), 0);
  const totalRentAmount = rentInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  // Insurance tracking (separate from rent)
  const insurancePaidAmount = insuranceInvoices.filter(i => isPaid(i)).reduce((s, i) => s + (i.amount || 0), 0);
  const insuranceRemainingAmount = (contract.insurance_amount || 0) - insurancePaidAmount;
  
  // Check if contract ended more than 3 days ago
  const contractEnded3DaysAgo = () => {
    if (!contract.end_date || contract.status === (lang === 'ku' ? 'هەڵوەشاندراوە' : 'ملغي')) return false;
    const endDate = parseISO(contract.end_date);
    const threeDaysLater = addDays(endDate, 3);
    return new Date() >= threeDaysLater;
  };
  
  // Check if any invoice is late (unpaid and past due date)
  const lateInvoices = rentInvoices.filter(inv => {
    return !isPaid(inv) && inv.due_date && new Date(inv.due_date) < today;
  });
  
  // Calculate payment status - must be before isContractCompleted
  const allRentPaid = rentInvoices.length > 0 && rentInvoices.every(isPaid);
  const insuranceRequired = contract.insurance_amount && contract.insurance_amount > 0;
  const insurancePaid = !insuranceRequired || insurancePaidAmount >= (contract.insurance_amount || 0);
  
  // Check if contract is fully completed (all paid + insurance paid)
  const isContractCompleted = allRentPaid && insurancePaid;
  
  // Prepare late payment message for tenant
  const buildLatePaymentMsg = (inv) => {
    const tpl = paymentTenantTemplates[0];
    const tenantLangPref = tenant?.preferred_language || 'ar';
    let base = '';
    if (tenantLangPref === 'ku' && tpl?.message_ku) base = tpl.message_ku;
    else if (tenantLangPref === 'en' && tpl?.message_en) base = tpl.message_en;
    else if (tenantLangPref === 'tr' && tpl?.message_tr) base = tpl.message_tr;
    else base = tpl?.message_ar || `السلام عليكم ${contract.tenant_name}،\nنود تذكيركم بأن فاتورة الإيجار رقم ${inv.invoice_number} بقيمة ${inv.amount?.toLocaleString()} د.ع مستحقة منذ ${format(parseISO(inv.due_date), 'dd/MM/yyyy')}. نرجو السداد في أقرب وقت.`;
    
    return base
      .replace('{tenant_name}', contract.tenant_name || '')
      .replace('{invoice_number}', inv.invoice_number || '')
      .replace('{amount}', (inv.amount || 0).toLocaleString())
      .replace('{due_date}', inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy') : '');
  };
  
  // Prepare contract completion message
  const buildCompletionMsg = () => {
    const tenantLangPref = tenant?.preferred_language || 'ar';
    return `السلام عليكم ${contract.tenant_name}،\nانتهى عقد الإيجار للعقار ${contract.property_name} منذ أكثر من 3 أيام. نرجو مراجعة الشركة لتسوية الوضع (دفع التأمين والفواتير المستحقة وطباعة العقد والخطاب الرسمي).`;
  };
  
  // Prepare payment notification for tenant
  const buildPaymentNotificationTenant = (inv) => {
    const tpl = paymentTenantTemplates[0];
    const tenantLangPref = tenant?.preferred_language || 'ar';
    let base = tpl?.message_ar || `السلام عليكم ${contract.tenant_name}،\nتم استلام دفعة الفاتورة ${inv.invoice_number} بقيمة ${inv.amount?.toLocaleString()} د.ع. شكراً لكم.`;
    return base.replace('{tenant_name}', contract.tenant_name || '').replace('{invoice_number}', inv.invoice_number || '').replace('{amount}', (inv.amount || 0).toLocaleString());
  };
  
  // Prepare payment notification for owner
  const buildPaymentNotificationOwner = (inv) => {
    const ownerLangPref = property?.owner_preferred_language || 'ar';
    const tpl = paymentOwnerTemplates[0];
    let base = '';
    if (ownerLangPref === 'ku' && tpl?.message_ku) base = tpl.message_ku;
    else if (ownerLangPref === 'en' && tpl?.message_en) base = tpl.message_en;
    else if (ownerLangPref === 'tr' && tpl?.message_tr) base = tpl.message_tr;
    else base = tpl?.message_ar || `السلام عليكم ${contract.owner_name}،\nتم استلام دفعة فاتورة الإيجار ${inv.invoice_number} للعقار ${contract.property_name} بقيمة ${inv.amount?.toLocaleString()} د.ع.`;
    return base
      .replace('{owner_name}', contract.owner_name || '')
      .replace('{invoice_number}', inv.invoice_number || '')
      .replace('{amount}', (inv.amount || 0).toLocaleString())
      .replace('{property_code}', contract.property_name || '');
  };
  
  const [invoiceSort, setInvoiceSort] = useState('date_asc');
  
  // Sort rent invoices
  const sortedRentInvoices = [...rentInvoices].sort((a, b) => {
    if (invoiceSort === 'date_asc') {
      if (!a.period_from) return 1;
      if (!b.period_from) return -1;
      return new Date(a.period_from) - new Date(b.period_from);
    } else if (invoiceSort === 'date_desc') {
      if (!a.period_from) return 1;
      if (!b.period_from) return -1;
      return new Date(b.period_from) - new Date(a.period_from);
    } else if (invoiceSort === 'due_asc') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    } else if (invoiceSort === 'due_desc') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(b.due_date) - new Date(a.due_date);
    }
    return 0;
  });
  
  // Calculate which invoice must be paid now (first unpaid by due date)
  const nextDueInvoice = sortedRentInvoices.find(inv => 
    !isPaid(inv) && 
    inv.due_date && 
    new Date(inv.due_date) <= today
  );
  const firstUpcomingInvoice = !nextDueInvoice ? sortedRentInvoices.find(inv => 
    !isPaid(inv) && 
    inv.due_date && 
    new Date(inv.due_date) > today
  ) : null;
  
  // Find the first unpaid invoice in sequence (by period_from date)
  const firstUnpaidInvoice = sortedRentInvoices.find(inv => !isPaid(inv));
  
  const contractFullyPaid = allRentPaid && insurancePaid;
  
  // Calculate remaining months based on actual invoice periods
  const totalInvoices = rentInvoices.length;
  const paidInvoices = rentInvoices.filter(isPaid).length;
  const remainingInvoices = totalInvoices - paidInvoices;
  
  // Calculate remaining months: count unpaid invoices (each invoice = 1 month)
  const remainingMonths = rentInvoices
    .filter(inv => !isPaid(inv))
    .length;
  
  // Calculate paid months: count paid invoices (each invoice = 1 month)
  const paidMonths = rentInvoices
    .filter(inv => isPaid(inv))
    .length;

  // Jump straight to the temporary payment section if there's an unresolved one
  useEffect(() => {
    if (Number(contract.temp_payment_amount) > 0) {
      const el = document.getElementById('temp-payment-section');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  const toggleInvoiceSelection = (invId) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invId)) {
      newSelected.delete(invId);
    } else {
      newSelected.add(invId);
    }
    setSelectedInvoices(newSelected);
  };

  const handlePrintSelected = () => {
    const selected = rentInvoices.filter(inv => selectedInvoices.has(inv.id));
    if (selected.length > 0) {
      setPrintMultiple(selected);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" /> {L('العودة للعقود', 'گەڕانەوە بۆ گرێبەستەکان')}
        </Button>
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <X className="w-4 h-4" /> {L('إغلاق', 'داخستن')}
        </Button>
      </div>

      {/* Contract Header — Glassy Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
        background: `linear-gradient(135deg, #1a2744 0%, #2a3f6e 50%, #3d5a80 100%)`,
        boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 blur-xl" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-400/20 to-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-400/15 to-yellow-500/15 rounded-full blur-3xl" />
        
        <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-4 md:p-6 border border-white/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-sky-400/30 to-blue-500/30 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Receipt className="w-5 h-5 md:w-7 md:h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg md:text-2xl font-bold text-white truncate">{L('عقد', 'گرێبەست')} {contract.contract_number}</h1>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm font-semibold text-xs">
                      {contract.status}
                    </Badge>
                  </div>
                </div>
                {/* Mobile: total rent inline */}
                <div className="lg:hidden text-right bg-white/10 backdrop-blur-xl rounded-xl px-3 py-2 border border-white/20 flex-shrink-0">
                  <p className="text-[9px] text-white/60 font-semibold">{L('الإجمالي', 'کۆی گشتی')}</p>
                  <p className="text-base font-bold text-white">{contract.total_rent?.toLocaleString()} <span className="text-xs font-normal text-white/70">{currencySymbol}</span></p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3 text-white/80 text-xs md:text-sm">
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/20">
                  <Building2 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="truncate max-w-[100px] md:max-w-none">{contract.property_name}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/20">
                  <User className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="truncate max-w-[100px] md:max-w-none">{contract.tenant_name}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/20">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                  {contract.duration_months} {L('شهر', 'مانگ')}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="hidden lg:block text-left bg-white/10 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/20 shadow-xl">
                <p className="text-xs text-white/60 font-semibold mb-1">{L('إجمالي الإيجار', 'کۆی گشتی کرێ')}</p>
                <p className="text-3xl font-bold text-white">{contract.total_rent?.toLocaleString()} <span className="text-sm font-normal text-white/70">{currencySymbol}</span></p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setPrintPermission(true)} className="gap-1 text-amber-300 hover:bg-amber-500/30 border border-amber-400/30 backdrop-blur-sm">
                  <Printer className="w-4 h-4" />
                  {L('إذن الإيجار', 'مۆڵەتی کرێ')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowImagePicker(true)} className="gap-1 text-white hover:bg-white/20 border border-white/20 backdrop-blur-sm">
                  <Image className="w-4 h-4" />
                  {L('صورة', 'وێنە')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPrintContract(true)} className="gap-1 text-white hover:bg-white/20 border border-white/20 backdrop-blur-sm">
                  <Printer className="w-4 h-4" />
                  {L('طباعة', 'چاپکردن')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => generateSingleContractPDF(contract)} className="gap-1 text-white hover:bg-white/20 border border-white/20 backdrop-blur-sm">
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
                {contract.status === 'ملغي' || contract.status === 'هەڵوەشاندراوە' ? (
                  <Button size="sm" variant="ghost" onClick={() => setShowReactivateConfirm(true)} className="gap-1 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/30 backdrop-blur-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {L('تفعيل العقد', 'چالاककردنەوەی گرێبەست')}
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(true)} className="gap-1 text-red-300 hover:bg-red-500/30 border border-red-400/30 backdrop-blur-sm">
                    <XCircle className="w-4 h-4" />
                    {L('إلغاء العقد', 'هەڵوەشاندنەوەی گرێبەست')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property & Date Info */}
      <PropertyInfoSection contract={contract} property={property} branch={branch} />

      {/* Financial Info */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
        background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.9) 100%)`,
        boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-sky-100/30 via-blue-50/20 to-white/15 blur-xl" />
        <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-sky-200/30 to-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/30 to-sky-100/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative mb-6">
            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl" style={{ 
              background: `linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(56, 189, 248, 0.1))`,
            }}>
              <div className="w-12 h-12 rounded-xl bg-sky-50/50 backdrop-blur-xl border border-sky-200/70 flex items-center justify-center shadow-md">
                <Receipt className="w-6 h-6 text-sky-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-bold text-sky-900 text-lg">{L('البيانات المالية', 'زانیارییە داراییەکان')}</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-sky-200/60 to-transparent" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400/80 shadow-sm" />
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400/40" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="group relative rounded-xl backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden" style={{ 
              background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))`,
              border: `1px solid rgba(255,255,255,0.6)`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.08)`
            }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-sky-50/0 group-hover:from-sky-100/40 group-hover:to-blue-100/30 transition-all duration-500 rounded-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💵</span>
                    <div className="px-2.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider bg-amber-400/20 text-amber-600 border border-amber-400/40">
                      {L('الإيجار الشهري', 'کرێی مانگانە')}
                    </div>
                  </div>
                </div>
                <p className="font-bold truncate mt-2 text-[14px]" style={{ color: '#1f2937' }}>{contract.monthly_rent?.toLocaleString() || '0'} {currencySymbol}</p>
              </div>
            </div>
            <div className="group relative rounded-xl backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden" style={{ 
              background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))`,
              border: `1px solid rgba(255,255,255,0.6)`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.08)`
            }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-sky-50/0 group-hover:from-sky-100/40 group-hover:to-blue-100/30 transition-all duration-500 rounded-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <div className="px-2.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 border border-amber-500/40">
                      {L('إجمالي الإيجار', 'کۆی گشتی کرێ')}
                    </div>
                  </div>
                </div>
                <p className="font-bold truncate mt-2 text-[14px]" style={{ color: '#1f2937' }}>{contract.total_rent?.toLocaleString() || '0'} {currencySymbol}</p>
              </div>
            </div>
            {contract.insurance_amount > 0 && (
              <div className="group relative rounded-xl backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden" style={{ 
                background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))`,
                border: `1px solid rgba(255,255,255,0.6)`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.08)`
              }}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-sky-50/0 group-hover:from-sky-100/40 group-hover:to-blue-100/30 transition-all duration-500 rounded-xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🛡️</span>
                      <div className="px-2.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 border border-amber-500/40">
                        {L('مبلغ التأمين', 'بڕی دڵنیایی')}
                      </div>
                    </div>
                  </div>
                  <p className="font-bold truncate mt-2 text-[14px]" style={{ color: '#1f2937' }}>{contract.insurance_amount?.toLocaleString()} {currencySymbol}</p>
                </div>
              </div>
            )}
            <div className="group relative rounded-xl backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden" style={{ 
              background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))`,
              border: `1px solid rgba(255,255,255,0.6)`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.08)`
            }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-sky-50/0 group-hover:from-sky-100/40 group-hover:to-blue-100/30 transition-all duration-500 rounded-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✅</span>
                    <div className="px-2.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 border border-emerald-500/40">
                      {L('إيجار مدفوع', 'کرێی دراو')}
                    </div>
                  </div>
                </div>
                <p className="font-bold truncate mt-2 text-[14px]" style={{ color: '#1f2937' }}>{paidAmount.toLocaleString()} {currencySymbol}</p>
              </div>
            </div>
            <div className="group relative rounded-xl backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden" style={{ 
              background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))`,
              border: `1px solid rgba(255,255,255,0.6)`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.08)`
            }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-sky-50/0 group-hover:from-sky-100/40 group-hover:to-blue-100/30 transition-all duration-500 rounded-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <div className="px-2.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider bg-slate-400/20 text-slate-600 border border-slate-400/40">
                      {L('إيجار اليوم الواحد', 'کرێی رۆژانە')}
                    </div>
                  </div>
                </div>
                <p className="font-bold truncate mt-2 text-[14px]" style={{ color: '#1f2937' }}>{contract.daily_rent?.toLocaleString() || '0'} {currencySymbol}</p>
              </div>
            </div>
            <div className="group relative rounded-xl backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden" style={{ 
              background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))`,
              border: `1px solid rgba(255,255,255,0.6)`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.08)`
            }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-sky-50/0 group-hover:from-sky-100/40 group-hover:to-blue-100/30 transition-all duration-500 rounded-xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💳</span>
                    <div className="px-2.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider bg-red-500/20 text-red-600 border border-red-500/40">
                      {L('غير مدفوع', 'پارەدانەکان')}
                    </div>
                  </div>
                </div>
                <p className="font-bold truncate mt-2 text-[14px]" style={{ color: '#1f2937' }}>{unpaidAmount.toLocaleString()} {currencySymbol}</p>
              </div>
            </div>
          </div>
          {contract.insurance_amount > 0 && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-xl p-4">
              <span className="text-amber-600 text-lg mt-0.5">⚠️</span>
              <p className="text-sm text-amber-800 font-medium">
                {L(
                  `تنبيه: في حال مغادرة المستأجر للعقار قبل انتهاء مدة العقد بـ (${contract.notice_period_months || 6} أشهر)، لن يتم استرداد مبلغ التأمين (${contract.insurance_amount?.toLocaleString()} ${currencySymbol}).`,
                  `ئاگاداری: دەرچوون پێش تەواوبوونی گرێبەست بە (${contract.notice_period_months || 6}) مانگ، دڵنیایی (تأمینات) بۆ ناگەرێتەوە.`
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Two Parties — Glassy Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tenant */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
          background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.9) 100%)`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
        }}>
          <div className="absolute inset-0 bg-gradient-to-br from-sky-100/30 via-blue-50/20 to-white/15 blur-xl" />
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-sky-200/30 to-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/30 to-sky-100/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative mb-6">
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl" style={{ 
                background: `linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(56, 189, 248, 0.1))`,
              }}>
                <div className="w-12 h-12 rounded-xl bg-sky-50/50 backdrop-blur-xl border border-sky-200/70 flex items-center justify-center shadow-md">
                  <User className="w-6 h-6 text-sky-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-sky-900 text-base leading-tight">{L('الطرف الأول — المستأجر', 'لایەنی یەکەم — کرێچی')}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-sky-200/60 to-transparent" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400/80 shadow-sm" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400/40" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {(contract.tenant_name || 'T').charAt(0)}
              </div>
              <div>
                <p className="text-sm text-sky-700 font-semibold">{L('المستأجر', 'کرێچی')}</p>
                <p className="text-lg font-bold text-sky-900 break-words">{contract.tenant_name || '—'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {contract.tenant_phone && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{L('رقم الهاتف', 'ژمارەی مۆبایل')}</p>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm tracking-wide mb-2 break-all">{contract.tenant_phone}</p>
                  <ContactActions
                    phone={contract.tenant_phone}
                    lang={lang}
                    preparedMessage={buildContractMsg(contractTenantTemplates[0], { tenant_name: contract.tenant_name, property_code: contract.property_name, amount: contract.monthly_rent, duration_months: contract.duration_months, start_date: contract.start_date, end_date: contract.end_date }, tenantLang) || `السلام عليكم ${contract.tenant_name}،\nالعقار: ${contract.property_name}\nمبلغ الإيجار: ${contract.monthly_rent?.toLocaleString()}\nمن ${contract.start_date} إلى ${contract.end_date}`}
                    sentKey={`contract-tenant-${contract.id}-${contract.start_date}-${contract.end_date}-${contract.duration_months}`}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contract.tenant_nationality && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium whitespace-nowrap">{L('الجنسية', 'نەتەوە')}</p>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm break-words">{contract.tenant_nationality}</p>
                  </div>
                )}
                {contract.tenant_address && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:col-span-2 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium whitespace-nowrap">{L('العنوان', 'ناونیشان')}</p>
                    </div>
                    <p className="font-medium text-slate-700 text-sm leading-relaxed break-words">{contract.tenant_address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Owner */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
          background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.9) 100%)`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
        }}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-yellow-50/20 to-white/15 blur-xl" />
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-200/30 to-yellow-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-yellow-200/30 to-amber-100/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative mb-6">
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl" style={{ 
                background: `linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 191, 36, 0.1))`,
              }}>
                <div className="w-12 h-12 rounded-xl bg-amber-50/50 backdrop-blur-xl border border-amber-200/70 flex items-center justify-center shadow-md">
                  <Building2 className="w-6 h-6 text-amber-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-amber-900 text-base leading-tight">{L('الطرف الثاني — المالك', 'لایەنی دووەم — خاوەن')}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-200/60 to-transparent" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-sm" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {(contract.owner_name || 'O').charAt(0)}
              </div>
              <div>
                <p className="text-sm text-amber-700 font-semibold">{L('المالك', 'خاوەن')}</p>
                <p className="text-lg font-bold text-amber-900 break-words">{contract.owner_name || '—'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {contract.owner_phone && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-amber-700" />
                    </div>
                    <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">{L('رقم الهاتف', 'ژمارەی مۆبایل')}</p>
                  </div>
                  <p className="font-semibold text-amber-900 text-sm tracking-wide mb-2 break-all">{contract.owner_phone}</p>
                  <ContactActions
                    phone={contract.owner_phone}
                    lang={lang}
                    preparedMessage={buildContractMsg(contractOwnerTemplates[0], { owner_name: contract.owner_name, property_code: contract.property_name, amount: contract.monthly_rent, duration_months: contract.duration_months, start_date: contract.start_date, end_date: contract.end_date }, ownerLang) || `السلام عليكم ${contract.owner_name}،\nالعقار: ${contract.property_name}\nمبلغ الإيجار: ${contract.monthly_rent?.toLocaleString()}\nمن ${contract.start_date} إلى ${contract.end_date}`}
                    sentKey={`contract-owner-${contract.id}-${contract.start_date}-${contract.end_date}-${contract.duration_months}`}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contract.owner_nationality && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-sm min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                      <p className="text-xs text-amber-700 font-medium whitespace-nowrap">{L('الجنسية', 'نەتەوە')}</p>
                    </div>
                    <p className="font-semibold text-amber-900 text-sm break-words">{contract.owner_nationality}</p>
                  </div>
                )}
                {contract.owner_address && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-sm sm:col-span-2 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-amber-700" />
                      </div>
                      <p className="text-xs text-amber-700 font-medium whitespace-nowrap">{L('العنوان', 'ناونیشان')}</p>
                    </div>
                    <p className="font-medium text-amber-900 text-sm leading-relaxed break-words">{contract.owner_address}</p>
                  </div>
                )}
                {contract.owner_email && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 shadow-sm sm:col-span-2 min-w-0">
                    <p className="text-xs text-amber-700 font-medium mb-1">{L('البريد الإلكتروني', 'ئیمەیل')}</p>
                    <p className="font-semibold text-amber-900 text-sm break-all">{contract.owner_email}</p>
                  </div>
                )}
                {property?.owner_proxy_name && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 shadow-sm sm:col-span-2 min-w-0">
                    <p className="text-xs text-purple-700 font-bold mb-1">🤝 {L('المخوّل (الوكيل)', 'مخوول (وەکیل)')}</p>
                    <p className="font-semibold text-purple-900 text-sm">{property.owner_proxy_name}</p>
                    {property.owner_proxy_phone && <p className="text-xs text-purple-600 mt-0.5">{property.owner_proxy_phone}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Contract Completion Warning */}
      {contractEnded3DaysAgo() && !isContractCompleted && (
        <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
          background: `linear-gradient(135deg, #dc2626 0%, #991b1b 100%)`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
        }}>
          <div className="relative rounded-3xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  {L('⚠️ العقد لم ينهِ إجراءاته!', '⚠️ گرێبەستەکە تەواو نەکراوە!')}
                </h3>
                <p className="text-sm text-white/90 mb-3">
                  {L(`انتهى عقد الإيجار منذ أكثر من 3 أيام (${format(parseISO(contract.end_date), 'dd/MM/yyyy')}). نرجو مراجعة الشركة لتسوية الوضع.`, `گرێبەستی کرێ کۆتایی هات زیاتر لە 3 ڕۆژ بەر لە ئێستا (${format(parseISO(contract.end_date), 'dd/MM/yyyy')}). تکایە سەردانی کۆمپانیا بکە بۆ تەواوکردنی ڕێکارەکان.`)}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <ContactActions
                    phone={contract.tenant_phone}
                    lang={lang}
                    preparedMessage={buildCompletionMsg()}
                    showCall={true}
                    buttonLabel={L('إرسال رسالة للمستأجر', 'ناردنی نامە بۆ کرێچی')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insurance */}
      {contract.insurance_amount > 0 && (
        <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
          background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.9) 100%)`,
          boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
        }}>
          <div className="absolute inset-0 bg-gradient-to-br from-sky-100/30 via-blue-50/20 to-white/15 blur-xl" />
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-sky-200/30 to-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/30 to-sky-100/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative mb-6">
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl" style={{ 
                background: `linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(56, 189, 248, 0.1))`,
              }}>
                <div className="w-12 h-12 rounded-xl bg-sky-50/50 backdrop-blur-xl border border-sky-200/70 flex items-center justify-center shadow-md">
                  <Shield className="w-6 h-6 text-sky-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-sky-900 text-lg">{L('التأمين', 'دڵنیایی')}</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-sky-200/60 to-transparent" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400/80 shadow-sm" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400/40" />
                </div>
              </div>
            </div>

            {/* Insurance Progress Bar */}
            <div className="mb-5">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-0.5">{L('المدفوع من التأمين', 'پارەی دڵنیایی دراو')}</p>
                  <p className="text-2xl font-bold text-emerald-700">{insurancePaidAmount.toLocaleString()} <span className="text-sm font-normal text-slate-500">{currencySymbol}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-semibold mb-0.5">{L('المتبقي', 'ماوەتە')}</p>
                  <p className="text-lg font-bold text-red-600">{insuranceRemainingAmount.toLocaleString()} <span className="text-sm font-normal text-slate-500">{currencySymbol}</span></p>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, contract.insurance_amount > 0 ? (insurancePaidAmount / contract.insurance_amount) * 100 : 0)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1 text-center">{L(`إجمالي التأمين: ${contract.insurance_amount?.toLocaleString()} ${currencySymbol}`, `کۆی دڵنیایی: ${contract.insurance_amount?.toLocaleString()} ${currencySymbol}`)}</p>
            </div>

            {/* Refund/Confiscate status row */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {contract.insurance_status === 'مسترد' || contract.insurance_status === 'مصادر' ? (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-2">
                    {(contract.insurance_refund_amount > 0 || (!contract.insurance_refund_amount && contract.insurance_status === 'مسترد')) && (
                      <span className="px-3 py-1.5 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                        ✅ {L('مُسترد:', 'گەڕاوەتەوە:')} {(contract.insurance_refund_amount ?? contract.insurance_amount ?? 0).toLocaleString()} {currencySymbol}
                      </span>
                    )}
                    {(contract.insurance_confiscated_amount > 0 || (!contract.insurance_confiscated_amount && contract.insurance_status === 'مصادر')) && (
                      <span className="px-3 py-1.5 rounded-xl text-sm font-bold bg-red-100 text-red-700 border border-red-300">
                        🚫 {L('مُصادر:', 'مووچەکراو:')} {(contract.insurance_confiscated_amount ?? contract.insurance_amount ?? 0).toLocaleString()} {currencySymbol}
                      </span>
                    )}
                  </div>
                  {contract.insurance_refund_date && (
                    <span className="text-xs text-muted-foreground">{contract.insurance_refund_date}</span>
                  )}
                </div>
              ) : (
                <span className="px-3 py-1.5 rounded-xl text-sm font-bold bg-amber-100 text-amber-700 border border-amber-300">
                  🔒 {L('التأمين محتجز', 'دڵنیایی لەگەڵدایە')}
                </span>
              )}

              {/* Refund / Confiscate buttons — only when insurance fully collected */}
              {(!contract.insurance_status || contract.insurance_status === 'محتجز') && canManageInsurance && insurancePaidAmount >= (contract.insurance_amount || 0) && insurancePaidAmount > 0 && (
                <>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => { setInsuranceAction('مسترد'); setInsuranceRefundAmount(contract.insurance_amount || ''); setInsuranceConfiscatedAmount(0); setShowInsuranceRefundDialog(true); }}>
                    <Shield className="w-4 h-4" />
                    {L('استرداد التأمين', 'گەڕاندنەوەی دڵنیایی')}
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 gap-1" onClick={() => { setInsuranceAction('مصادر'); setInsuranceRefundAmount(0); setInsuranceConfiscatedAmount(contract.insurance_amount || ''); setShowInsuranceRefundDialog(true); }}>
                    <XCircle className="w-4 h-4" />
                    {L('مصادرة التأمين', 'مووچەکردنی دڵنیایی')}
                  </Button>
                </>
              )}
              {/* Warning: not fully paid yet */}
              {(!contract.insurance_status || contract.insurance_status === 'محتجز') && canManageInsurance && insurancePaidAmount > 0 && insurancePaidAmount < (contract.insurance_amount || 0) && (
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  ⚠️ {L('لم يكتمل دفع التأمين بعد', 'پارەی دڵنیایی تەواو نەدراوە هێشتا')}
                </span>
              )}
              {/* Print + Reset buttons if already processed */}
              {contract.insurance_status && contract.insurance_status !== 'محتجز' && (
                <>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setPrintInsuranceRefund(true)}>
                    <Printer className="w-4 h-4" />
                    {L('طباعة الوثيقة', 'چاپکردنی بەڵگە')}
                  </Button>
                  {canManageInsurance && (
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateInsuranceStatusMutation.mutate({ status: 'محتجز', notes: '', refundAmount: null, confiscatedAmount: null })}>
                      {L('تراجع', 'پاشگەزبوونەوە')}
                    </Button>
                  )}
                </>
              )}
            </div>

            {contract.insurance_refund_notes && (
              <div className="mb-4 p-3 bg-sky-50 rounded-xl border border-sky-200 text-sm text-sky-800">
                <span className="font-semibold">{L('ملاحظات: ', 'تێبینی: ')}</span>{contract.insurance_refund_notes}
              </div>
            )}

            {/* Insurance payment button + history */}
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-700">{L('سجل دفعات التأمين', 'تۆمارێکی پارەدانی دڵنیایی')}</h4>
              {insuranceRemainingAmount > 0 && can('can_edit_insurance_invoices') && (
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white gap-1" onClick={() => { setInsurancePaymentAmount(insuranceRemainingAmount.toString()); setShowInsurancePaymentDialog(true); }}>
                  <Plus className="w-4 h-4" />
                  {L('تسجيل دفعة', 'تۆمارکردنی پارەدان')}
                </Button>
              )}
            </div>

            {insuranceInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">{L('لا توجد دفعات تأمين بعد', 'هیچ پارەدانی دڵنیایییەک نییە هێشتا')}</p>
            ) : (
              <div className="space-y-2">
                {insuranceInvoices.map((inv, idx) => (
                  <div key={inv.id} className="flex items-center justify-between py-3 px-4 bg-white/50 backdrop-blur-sm rounded-xl border border-sky-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                      {statusIcon[inv.status]}
                      <div>
                        <span className="text-sm font-bold text-sky-700">{inv.amount?.toLocaleString()} {currencySymbol}</span>
                        {inv.paid_date && <p className="text-xs text-slate-400">{inv.paid_date}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPrintInvoice(inv)} className="text-xs gap-1">
                        <Printer className="w-3 h-3" />
                        {L('طباعة', 'چاپکردن')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Temporary Payment Section */}
      <TempPaymentSection contract={contract} />

      {/* Invoices Section - Dark Dashboard Style */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ 
        background: `linear-gradient(135deg, #1a2332 0%, #0f1419 100%)`,
        border: `1px solid rgba(255,255,255,0.1)`
      }}>
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg text-white font-bold text-sm" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'}}>
                {L('فواتير', 'پارەدان')}
              </div>
              <h2 className="font-bold text-white text-xl">{L('فواتير الإيجار', 'پارەدانی کرێ')}</h2>
            </div>
            <div className="flex gap-2">
              {selectedInvoices.size > 0 && (
                <Button size="sm" onClick={handlePrintSelected} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-xs font-semibold">
                  <Printer className="w-4 h-4" />
                  {L('طباعة المحددة', 'چاپکردنی دیاریکراو')} ({selectedInvoices.size})
                </Button>
              )}
              <Button size="sm" onClick={() => generateRentInvoices(false)} disabled={generating || rentInvoices.length > 0} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-lg text-xs font-semibold">
                <Plus className="w-4 h-4" />
                {generating ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {L('جاري...', 'دروستکردن...')}
                  </span>
                ) : L('إنشاء', 'دروستکردن')}
              </Button>
            </div>
          </div>

          {rentInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Receipt className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">{L('لم يتم إنشاء فواتير بعد', 'هیچ پارەدانێک دروستنەکراوە')}</p>
              <p className="text-slate-400 text-xs mt-1">{L('اضغط "إنشاء الفواتير" للبدء', 'کلیک لە "دروستکردنی پارەدان" بکە بۆ دەستپێکردن')}</p>
            </div>
          ) : (
            <>
              {/* Summary Cards - Dark Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl p-4 transition-all hover:shadow-lg" style={{background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)'}}>
                  <p className="text-xs text-emerald-300 font-bold mb-2 uppercase font-tajawal">{L('مدفوع', 'پارەی دراو')}</p>
                  <p className="text-2xl font-extrabold text-emerald-200 font-tajawal">{paidAmount.toLocaleString()}</p>
                  <p className="text-xs text-emerald-300 font-bold mt-1 font-tajawal">{currencySymbol}</p>
                  </div>
                  <div className="rounded-xl p-4 transition-all hover:shadow-lg" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
                  <p className="text-xs text-red-300 font-bold mb-2 uppercase font-tajawal">{L('غير مدفوع (إيجار)', 'کرێی نەدراو')}</p>
                  <p className="text-2xl font-extrabold text-red-200 font-tajawal">{unpaidAmount.toLocaleString()}</p>
                  <p className="text-xs text-red-300 font-bold mt-1 font-tajawal">{currencySymbol}</p>
                  </div>
                  <div className="rounded-xl p-4 transition-all hover:shadow-lg" style={{background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)'}}>
                  <p className="text-xs text-amber-300 font-bold mb-2 uppercase font-tajawal">{L('إجمالي الإيجار', 'کۆی کرێ')}</p>
                  <p className="text-2xl font-extrabold text-amber-200 font-tajawal">{totalRentAmount.toLocaleString()}</p>
                  <p className="text-xs text-amber-300 font-bold mt-1 font-tajawal">{currencySymbol}</p>
                </div>
                <div className="rounded-xl p-4 transition-all hover:shadow-lg" style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)'}}>
                  <p className="text-xs text-blue-300 font-bold mb-2 uppercase font-tajawal">{L('المتبقي', 'ماوەتە')}</p>
                  <p className="text-2xl font-extrabold text-blue-200 font-tajawal">{remainingMonths}</p>
                  <p className="text-xs text-blue-300 font-bold mt-1 font-tajawal">{L('شهر', 'مانگ')}</p>
                </div>
              </div>

              {/* Invoice List - Dark Table Style */}
              <div className="space-y-2">
                {sortedRentInvoices.map((inv, idx) => {
                  const cancelled = isCancelled(inv);
                  const isLate = !isPaid(inv) && !cancelled && inv.due_date && new Date(inv.due_date) < today;
                  const paid = isPaid(inv);
                  const borderColor = paid ? 'rgba(16, 185, 129, 0.3)' : cancelled ? 'rgba(100, 116, 139, 0.4)' : isLate ? 'rgba(239, 68, 68, 0.3)' : 'rgba(100, 116, 139, 0.3)';
                  const bgColor = paid ? 'rgba(16, 185, 129, 0.08)' : cancelled ? 'rgba(100, 116, 139, 0.12)' : isLate ? 'rgba(239, 68, 68, 0.08)' : 'rgba(100, 116, 139, 0.05)';
                  
                  return (
                    <div key={inv.id} className="rounded-xl p-4 transition-all hover:shadow-lg" style={{background: bgColor, border: `1px solid ${borderColor}`}}>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                        {/* Header - Invoice Number & Period (top on mobile) */}
                        <div className="flex items-center gap-3 w-full md:w-auto md:flex-1 min-w-0">
                          <input type="checkbox" checked={selectedInvoices.has(inv.id)} onChange={() => toggleInvoiceSelection(inv.id)} className="w-4 h-4 cursor-pointer rounded flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white text-sm truncate">{inv.invoice_number}</p>
                            <p className="text-[10px] md:text-xs text-slate-400">{inv.period_from && format(parseISO(inv.period_from), 'dd/MM')} — {inv.period_to && format(parseISO(inv.period_to), 'dd/MM/yy')}</p>
                          </div>
                        </div>
                        
                        {/* Details Row - Due Date, Amount, Status + Buttons on mobile */}
                        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto flex-wrap">
                          <div className="text-center min-w-[60px] md:min-w-[70px]">
                            <p className="text-[10px] md:text-xs text-slate-400 mb-0.5 md:mb-1">{L('الاستحقاق', 'بەرواری')}</p>
                            <p className="text-xs md:text-sm font-semibold text-white">{inv.due_date && format(parseISO(inv.due_date), 'dd/MM')}</p>
                          </div>
                          
                          <div className="text-center min-w-[80px] md:min-w-[90px]">
                            <p className="text-[10px] md:text-xs text-slate-400 mb-0.5 md:mb-1">{L('المبلغ', 'بڕ')}</p>
                            <p className="text-sm md:text-base font-extrabold text-amber-400 drop-shadow-lg" style={{fontFamily: "'Noto Sans Arabic', 'Tajawal', sans-serif"}}>{inv.amount?.toLocaleString()}</p>
                            <p className="text-[10px] md:text-xs font-bold text-amber-400 mt-0.5">{currencySymbol}</p>
                          </div>
                          
                          {/* Status + Buttons inline on mobile */}
                          <div className="flex items-center gap-2 mr-auto md:mr-0">
                            <span className={`text-xs md:text-sm font-bold px-2 py-1 md:px-3 md:py-1.5 rounded-lg whitespace-nowrap ${paid ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : cancelled ? 'bg-slate-500/30 text-slate-300 border border-slate-500/50' : isLate ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'}`} style={{fontFamily: "'Noto Sans Arabic', 'Tajawal', sans-serif"}}>
                              {inv.status === 'پارەدراو' ? 'پارەی دراو' : inv.status === 'دواکەوتوو' ? 'نەدراوەکان' : inv.status === 'هەڵوەشاندراوە' ? L('ملغي', 'هەڵوەشاندراوە') : inv.status}
                            </span>
                            {/* Buttons shown inline on mobile, hidden on desktop */}
                            <div className="flex gap-1 md:hidden">
                              {paid && (
                                <Button size="sm" variant="outline" onClick={() => setPrintInvoice(inv)} className="h-7 w-7 p-0 bg-slate-700/50 border-slate-600 hover:bg-slate-600/70 text-slate-200">
                                  <Printer className="w-3 h-3" />
                                </Button>
                              )}
                              {!paid && !cancelled && (inv.type === 'إيجار' ? can('can_edit_rent_invoices') : can('can_edit_insurance_invoices')) && (
                                <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConfirmPayInvoice(inv)}>
                                  {L('دفع', 'پ')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons - desktop only */}
                        <div className="hidden md:flex gap-2 flex-shrink-0">
                          {paid && (
                            <Button size="sm" variant="outline" onClick={() => setPrintInvoice(inv)} className="h-8 px-2 text-xs bg-slate-700/50 border-slate-600 hover:bg-slate-600/70 text-slate-200">
                              <Printer className="w-3 h-3" />
                            </Button>
                          )}
                          {!paid && !cancelled && (inv.type === 'إيجار' ? can('can_edit_rent_invoices') : can('can_edit_insurance_invoices')) && (
                            <Button size="sm" className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConfirmPayInvoice(inv)}>
                              {L('دفع', 'پ')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Owner Payment Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)`,
        boxShadow: '0 25px 80px rgba(0,0,0,0.15)'
      }}>
        <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl mb-5" style={{
            background: `linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))`,
          }}>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-md">
              <Banknote className="w-6 h-6 text-emerald-700" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-emerald-900 text-lg">{L('دفع الإيجار للمالك', 'پارەدان بۆ خاوەن')}</h2>
              <p className="text-sm text-emerald-700">{L('تسجيل المبالغ المدفوعة لصاحب العقار', 'تۆمارکردنی بڕەکانی دراو بۆ خاوەنەکە')}</p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" disabled={(paidAmount - totalOwnerPaid) <= 0} onClick={() => {
              setOwnerPaymentAmount((paidAmount - totalOwnerPaid).toString());
              setShowOwnerPaymentDialog(true);
            }}>
              <Plus className="w-4 h-4" />
              {L('تسجيل دفعة', 'تۆمارکردنی پارەدان')}
            </Button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600 font-semibold mb-1">{L('إيجار مستلم', 'کرێی وەرگیراو')}</p>
              <p className="text-base font-bold text-emerald-900 leading-tight">{paidAmount.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">{currencySymbol}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-semibold mb-1">{L('مدفوع للمالك', 'دراو بۆ خاوەن')}</p>
              <p className="text-base font-bold text-blue-900 leading-tight">{totalOwnerPaid.toLocaleString()}</p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">{currencySymbol}</p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${(paidAmount - totalOwnerPaid) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-xs font-semibold mb-1 ${(paidAmount - totalOwnerPaid) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>{L('المتبقي للمالك', 'ماوەتە بۆ خاوەن')}</p>
              <p className={`text-base font-bold leading-tight ${(paidAmount - totalOwnerPaid) > 0 ? 'text-amber-900' : 'text-gray-600'}`}>{(paidAmount - totalOwnerPaid).toLocaleString()}</p>
              <p className={`text-xs font-semibold mt-0.5 ${(paidAmount - totalOwnerPaid) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>{currencySymbol}</p>
            </div>
          </div>

          {/* Owner payment history */}
          {ownerPaymentInvoices.length > 0 ? (
            <div className="space-y-2">
              {ownerPaymentInvoices.map((inv, i) => (
                <div key={inv.id} className="border border-gray-200 rounded-xl p-3 bg-white flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{inv.paid_date || inv.due_date}</p>
                    {inv.notes && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inv.notes.split(' | ').map((part, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">{part}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-emerald-700 text-sm whitespace-nowrap">{inv.amount?.toLocaleString()} {currencySymbol}</span>
                    <Button size="sm" variant="outline" onClick={() => handlePrintOwnerPayment(inv)} className="text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-7 px-2">
                      <Printer className="w-3 h-3" />
                      {L('طباعة', 'چاپ')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{L('لم يتم تسجيل أي دفعة للمالك بعد', 'هیچ پارەدانێک بۆ خاوەن تۆمار نەکراوە')}</p>
          )}
        </div>
      </div>



      {/* Commission Section */}
      <ContractCommissionSection contract={contract} contractType="rent" />

      {printContract && <ContractPrint contract={contract} branch={branch} onClose={() => setPrintContract(false)} />}
      {printInvoice && <InvoicePrint invoice={printInvoice} branch={branch} onClose={() => setPrintInvoice(null)} />}
      {printMultiple && <InvoicePrint invoices={printMultiple} branch={branch} onClose={() => setPrintMultiple(null)} />}
      {printInsuranceRefund && <InsuranceRefundPrint contract={contract} branch={branch} onClose={() => setPrintInsuranceRefund(false)} />}
      {printPermission && <RentalPermissionPrint contract={contract} branch={branch} onClose={() => setPrintPermission(false)} />}

      {/* Image Picker Dialog */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Image className="w-6 h-6 text-primary" />
                <h2 className="font-bold text-lg">{L('اختر صورة للعقد', 'وێنەیەک هەڵبژێرە بۆ گرێبەست')}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowImagePicker(false)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {DECORATIVE_IMAGES.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === imgUrl ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setSelectedImage(imgUrl);
                    setShowImagePicker(false);
                  }}
                >
                  <img src={imgUrl} alt={`Option ${idx + 1}`} className="w-full h-40 object-cover transition-transform group-hover:scale-105" />
                  {selectedImage === imgUrl && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowImagePicker(false)}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Confirmation Dialog */}
      <AlertDialog open={!!confirmPayInvoice} onOpenChange={(open) => { if (!open) setConfirmPayInvoice(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L('تأكيد تسجيل الدفع', 'دڵنیایی لە تۆمارکردنی پارەدان')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPayInvoice && (
                <span>
                  {L('هل أنت متأكد من تسجيل دفع فاتورة', 'دڵنیایت لە تۆمارکردنی پارەدانی وەسڵ')}{' '}
                  <strong>{confirmPayInvoice.invoice_number}</strong>{' '}
                  {L('بمبلغ', 'بە بڕی')}{' '}
                  <strong>{confirmPayInvoice.amount?.toLocaleString()} {currencySymbol}</strong>{'؟'}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (confirmPayInvoice) {
                  // Check if this is the first unpaid invoice (sequential payment enforcement)
                  if (firstUnpaidInvoice && confirmPayInvoice.id !== firstUnpaidInvoice.id && confirmPayInvoice.type !== 'تأمين') {
                    setShowSequentialPaymentWarning(true);
                    setConfirmPayInvoice(null);
                    return;
                  }
                  markPaidMutation.mutate({ id: confirmPayInvoice.id, amount: confirmPayInvoice.amount });
                  setConfirmPayInvoice(null);
                }
              }}
            >
              {L('نعم، تسجيل الدفع', 'بەڵێ، تۆمارکردنی پارەدان')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Confirmation Dialog */}
      {showReactivateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <h2 className="font-bold text-lg">{L('تفعيل العقد', 'چالاككردنەوەی گرێبەست')}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {L('هل أنت متأكد من تفعيل هذا العقد مجدداً؟ سيتم تغيير حالته إلى نشط وحالة العقار إلى مؤجر.', 'دڵنیایت لە چالاككردنەوەی ئەم گرێبەستە؟ دۆخی دەگۆڕێت بۆ چالاک و دۆخی خانووبەرەکەش بۆ کرێدراو.')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowReactivateConfirm(false)}>{L('تراجع', 'پاشگەزبوونەوە')}</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { reactivateContractMutation.mutate(); setShowReactivateConfirm(false); }} disabled={reactivateContractMutation.isPending}>
                {reactivateContractMutation.isPending ? L('جاري التفعيل...', 'چالاككردنەوە...') : L('تأكيد التفعيل', 'دڵنیاکردنەوەی چالاككردنەوە')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Insurance Refund/Confiscate Dialog */}
      {showInsuranceRefundDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              {insuranceAction === 'مسترد'
                ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                : <XCircle className="w-8 h-8 text-red-600" />}
              <h2 className="font-bold text-lg">
                {L('تسوية مبلغ التأمين', 'ڕێکخستنی بڕی دڵنیایی')}
              </h2>
            </div>

            {/* Total insurance info */}
            <div className="bg-muted/50 rounded-xl p-3 mb-4 text-sm flex justify-between items-center">
              <span className="text-muted-foreground font-medium">{L('إجمالي مبلغ التأمين:', 'کۆی گشتی بڕی دڵنیایی:')}</span>
              <span className="font-bold text-lg">{(contract.insurance_amount || 0).toLocaleString()} {currencySymbol}</span>
            </div>

            {/* Amount fields */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-semibold text-emerald-700 mb-1 block">
                  ✅ {L('المبلغ المُسترد للمستأجر', 'بڕی دەگەڕێتەوە بۆ کرێچی')}
                </label>
                <input
                  type="number"
                  min="0"
                  max={contract.insurance_amount || 0}
                  className="w-full border border-border rounded-xl p-3 text-sm bg-background"
                  value={insuranceRefundAmount}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setInsuranceRefundAmount(e.target.value);
                    setInsuranceConfiscatedAmount(Math.max(0, (contract.insurance_amount || 0) - val));
                  }}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-red-700 mb-1 block">
                  🚫 {L('المبلغ المُصادر (غير مُسترد)', 'بڕی مووچەکراو (ناگەڕێتەوە)')}
                </label>
                <input
                  type="number"
                  min="0"
                  max={contract.insurance_amount || 0}
                  className="w-full border border-border rounded-xl p-3 text-sm bg-background"
                  value={insuranceConfiscatedAmount}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setInsuranceConfiscatedAmount(e.target.value);
                    setInsuranceRefundAmount(Math.max(0, (contract.insurance_amount || 0) - val));
                  }}
                  placeholder="0"
                />
              </div>
              {/* Validation warning */}
              {(Number(insuranceRefundAmount) + Number(insuranceConfiscatedAmount)) !== (contract.insurance_amount || 0) && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ {L(`المجموع (${(Number(insuranceRefundAmount) + Number(insuranceConfiscatedAmount)).toLocaleString()}) لا يساوي إجمالي التأمين (${(contract.insurance_amount || 0).toLocaleString()})`, `کۆی گشتی (${(Number(insuranceRefundAmount) + Number(insuranceConfiscatedAmount)).toLocaleString()}) یەکسان نییە لەگەڵ کۆی دڵنیایی (${(contract.insurance_amount || 0).toLocaleString()})`)}
                </p>
              )}
            </div>

            <textarea
              className="w-full border border-border rounded-xl p-3 text-sm mb-4 min-h-[70px] resize-none bg-background"
              placeholder={L('ملاحظات (اختياري)...', 'تێبینی (ئارەزوومەندانە)...')}
              value={insuranceNotes}
              onChange={e => setInsuranceNotes(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowInsuranceRefundDialog(false); setInsuranceNotes(''); setInsuranceRefundAmount(''); setInsuranceConfiscatedAmount(''); }}>
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </Button>
              <Button
                className={Number(insuranceRefundAmount) > 0 && Number(insuranceConfiscatedAmount) === 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : Number(insuranceConfiscatedAmount) > 0 && Number(insuranceRefundAmount) === 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}
                onClick={() => {
                  const refund = Number(insuranceRefundAmount) || 0;
                  const confiscated = Number(insuranceConfiscatedAmount) || 0;
                  // determine status: if full refund → مسترد, if full confiscation → مصادر, if partial → مسترد (partial)
                  const status = refund > 0 && confiscated === 0 ? 'مسترد' : confiscated > 0 && refund === 0 ? 'مصادر' : 'مسترد';
                  updateInsuranceStatusMutation.mutate({ status, notes: insuranceNotes, refundAmount: refund, confiscatedAmount: confiscated });
                }}
                disabled={updateInsuranceStatusMutation.isPending || (insuranceRefundAmount === '' && insuranceConfiscatedAmount === '')}
              >
                {updateInsuranceStatusMutation.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('تأكيد', 'دڵنیاکردنەوە')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Insurance Partial Payment Dialog */}
      {showInsurancePaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-sky-600" />
              <h2 className="font-bold text-lg">{L('تسجيل دفعة تأمين', 'تۆمارکردنی پارەدانی دڵنیایی')}</h2>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-4 text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sky-700 font-medium">{L('إجمالي التأمين:', 'کۆی دڵنیایی:')}</span>
                <span className="font-bold">{(contract.insurance_amount || 0).toLocaleString()} {currencySymbol}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-emerald-700 font-medium">{L('المدفوع حتى الآن:', 'دراوە تا ئێستا:')}</span>
                <span className="font-bold text-emerald-700">{insurancePaidAmount.toLocaleString()} {currencySymbol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600 font-medium">{L('المتبقي:', 'ماوەتە:')}</span>
                <span className="font-bold text-red-600">{insuranceRemainingAmount.toLocaleString()} {currencySymbol}</span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('مبلغ الدفعة', 'بڕی پارەدان')} *</label>
                <input
                  type="number"
                  min="1"
                  max={insuranceRemainingAmount}
                  className="w-full border border-border rounded-xl p-3 text-sm bg-background"
                  value={insurancePaymentAmount}
                  onChange={e => setInsurancePaymentAmount(e.target.value)}
                  placeholder="0"
                />
                {Number(insurancePaymentAmount) > insuranceRemainingAmount && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    ⚠️ {L(`لا يمكن أن يتجاوز المبلغ المتبقي (${insuranceRemainingAmount.toLocaleString()} ${currencySymbol})`, `نابێت زیاتر بێت لە ماوەتە (${insuranceRemainingAmount.toLocaleString()} ${currencySymbol})`)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('تاريخ الدفع', 'بەرواری پارەدان')}</label>
                <input
                  type="date"
                  className="w-full border border-border rounded-xl p-3 text-sm bg-background"
                  value={insurancePaymentDate}
                  onChange={e => setInsurancePaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowInsurancePaymentDialog(false)}>
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700 text-white"
                onClick={handleCreateInsurancePayment}
                disabled={createInsurancePaymentMutation.isPending || !insurancePaymentAmount || Number(insurancePaymentAmount) <= 0 || Number(insurancePaymentAmount) > insuranceRemainingAmount}
              >
                {createInsurancePaymentMutation.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('تأكيد الدفع', 'دڵنیاکردنەوەی پارەدان')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Payment Dialog */}
      {showOwnerPaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Banknote className="w-8 h-8 text-emerald-600" />
              <h2 className="font-bold text-lg">{L('تسجيل دفعة للمالك', 'تۆمارکردنی پارەدان بۆ خاوەن')}</h2>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 mb-4 text-sm flex justify-between items-center">
              <span className="text-muted-foreground font-medium">{L('الإيجار المستلم (غير مُحوَّل):', 'کرێی وەرگیراو (نەدراوە):')}</span>
              <span className="font-bold text-lg text-emerald-700">{(paidAmount - totalOwnerPaid).toLocaleString()} {currencySymbol}</span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('المبلغ المدفوع للمالك', 'بڕی دراو بۆ خاوەن')} *</label>
                <input
                  type="number"
                  min="0"
                  max={paidAmount - totalOwnerPaid}
                  className="w-full border border-border rounded-xl p-3 text-sm bg-background"
                  value={ownerPaymentAmount}
                  onChange={e => setOwnerPaymentAmount(e.target.value)}
                  placeholder="0"
                />
                {Number(ownerPaymentAmount) > (paidAmount - totalOwnerPaid) && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    ⚠️ {L(`المبلغ يتجاوز الرصيد المتاح (${(paidAmount - totalOwnerPaid).toLocaleString()} ${currencySymbol})`, `بڕ زیاتره لە بەرپرسانەی بەردەست (${(paidAmount - totalOwnerPaid).toLocaleString()} ${currencySymbol})`)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('تاريخ الدفع', 'بەرواری پارەدان')}</label>
                <input
                  type="date"
                  className="w-full border border-border rounded-xl p-3 text-sm bg-background"
                  value={ownerPaymentDate}
                  onChange={e => setOwnerPaymentDate(e.target.value)}
                />
              </div>
              {/* Payment method */}
              <div>
                <label className="text-sm font-semibold mb-2 block">{L('طريقة الدفع', 'شێوازی پارەدان')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setOwnerPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${ownerPaymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-border bg-background text-muted-foreground hover:border-emerald-300'}`}>
                    💵 {L('نقداً', 'کاش')}
                  </button>
                  <button type="button" onClick={() => setOwnerPaymentMethod('bank')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${ownerPaymentMethod === 'bank' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border bg-background text-muted-foreground hover:border-blue-300'}`}>
                    🏦 {L('تحويل بنكي', 'حەوالەی بانکی')}
                  </button>
                </div>
              </div>
              {/* Receiver */}
              <div>
                <label className="text-sm font-semibold mb-2 block">{L('المُستلِم', 'وەرگر')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setOwnerPaymentReceiver('owner')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${ownerPaymentReceiver === 'owner' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-border bg-background text-muted-foreground hover:border-amber-300'}`}>
                    👤 {L('المالك شخصياً', 'خاوەن بە خۆی')}
                  </button>
                  <button type="button" onClick={() => setOwnerPaymentReceiver('proxy')}
                   className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${ownerPaymentReceiver === 'proxy' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-border bg-background text-muted-foreground hover:border-purple-300'}`}>
                    🤝 {property?.owner_proxy_name ? property.owner_proxy_name : L('مخوّل', 'مخول')}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">{L('ملاحظات', 'تێبینی')}</label>
                <textarea
                  className="w-full border border-border rounded-xl p-3 text-sm bg-background min-h-[60px] resize-none"
                  value={ownerPaymentNotes}
                  onChange={e => setOwnerPaymentNotes(e.target.value)}
                  placeholder={L('ملاحظات اختيارية...', 'تێبینیی ئارەزوومەندانە...')}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowOwnerPaymentDialog(false)}>
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreateOwnerPayment}
                disabled={createOwnerPaymentMutation.isPending || !ownerPaymentAmount || Number(ownerPaymentAmount) <= 0 || Number(ownerPaymentAmount) > (paidAmount - totalOwnerPaid)}
              >
                {createOwnerPaymentMutation.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('تأكيد الدفع', 'دڵنیاکردنەوەی پارەدان')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sequential Payment Warning Dialog */}
      {showSequentialPaymentWarning && firstUnpaidInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <h2 className="font-bold text-lg">{L('تنبيه: يجب الدفع بالتسلسل', 'ئاگاداری: دەبێت پارەدان بە زنجیرەیی بێت')}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {L('يجب دفع الفواتير بالتسلسل حسب التاريخ. الفاتورة التالية التي يجب دفعها هي:', 'دەبێت پارەدانی وەسڵەکان بە زنجیرەیی بێت بەپێی بەروار. ئەم وەسڵەیە کە دەبێت بدرێت بریتییە لە:')}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-amber-900">
                {firstUnpaidInvoice.invoice_number}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {L('الفترة من', 'ماوەی لە')} {firstUnpaidInvoice.period_from && format(parseISO(firstUnpaidInvoice.period_from), 'dd/MM/yyyy')} — {firstUnpaidInvoice.period_to && format(parseISO(firstUnpaidInvoice.period_to), 'dd/MM/yyyy')}
              </p>
              <p className="text-sm font-bold text-amber-900 mt-2">
                {firstUnpaidInvoice.amount?.toLocaleString()} {currencySymbol}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {L('يرجى دفع هذه الفاتورة أولاً قبل دفع الفواتير اللاحقة.', 'تکایە پێش هەموو وەسڵێکی تر ئەم وەسڵە بدە.')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowSequentialPaymentWarning(false)}>
                {L('إغلاق', 'داخستن')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
              <h2 className="font-bold text-lg">{L('إلغاء العقد', 'هەڵوەشاندنەوەی گرێبەست')}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {L('هل أنت متأكد من إلغاء هذا العقد؟ سيتم أرشفته كملغي وستصبح العقار متاحاً للإيجار مجدداً.', 'دڵنیایت لە هەڵوەشاندنەوەی ئەم گرێبەستە؟ بە گرێبەستی هەڵوەشاندراوە ئەرشیف دەکرێت و خانووبەرەکە دوبارە بۆ کرێدان ئامادە دەبێت.')}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>{L('تراجع', 'پاشگەزبوونەوە')}</Button>
              <Button variant="destructive" onClick={() => cancelContractMutation.mutate()} disabled={cancelContractMutation.isPending}>
                {cancelContractMutation.isPending ? L('جاري الإلغاء...', 'هەڵوەشاندنەوە...') : L('تأكيد الإلغاء', 'دڵنیاکردنەوەی هەڵوەشاندنەوە')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}