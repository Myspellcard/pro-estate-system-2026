import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { firebaseApi } from '@/api/firebaseClient';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Receipt, CheckCircle2, Clock, AlertTriangle, Filter, Printer, Download, Phone, MessageCircle, Send, SortAsc, Building2, CalendarDays, DollarSign, Tag, Zap, Columns, Eye, EyeOff, User, Home, Pencil, X, ChevronUp, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { generateInvoicesPDF } from '@/utils/pdfExport';
import { format, parseISO, isPast, startOfMonth, subMonths } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import InvoicePrint from '@/components/invoices/InvoicePrint';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const statusIcon = {
  'مدفوعة': <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  'معلقة': <Clock className="w-4 h-4 text-amber-600" />,
  'متأخرة': <AlertTriangle className="w-4 h-4 text-red-600" />,
};

const statusColors = {
  "مدفوعة": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "معلقة": "bg-amber-50 text-amber-700 border-amber-200",
  "متأخرة": "bg-red-50 text-red-700 border-red-200",
};

const SortHeader = ({ column, label, currentSort, direction, onSort }) => (
  <button 
    onClick={() => onSort(column)}
    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
  >
    {label}
    {currentSort === column ? (
      direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5 opacity-0" />
    )}
  </button>
);

export default function Invoices() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [sortBy, setSortBy] = useState('paid_date_desc');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [printInvoice, setPrintInvoice] = useState(null);
  const [confirmPayInvoice, setConfirmPayInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  const [sentMessages, setSentMessages] = useState(() => {
    const saved = localStorage.getItem('invoice_sent_messages');
    try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });

  const ALL_COLUMNS = [
    { key: 'invoiceNumber', labelAr: 'رقم الفاتورة', labelKu: 'ژمارەی وەسڵ' },
    { key: 'property', labelAr: 'العقار / المستأجر', labelKu: 'خانووبەرە / کرێچی' },
    { key: 'type', labelAr: 'النوع', labelKu: 'جۆر' },
    { key: 'amount', labelAr: 'المبلغ', labelKu: 'بڕ' },
    { key: 'dueDate', labelAr: 'الاستحقاق', labelKu: 'کاتی پێویست' },
    { key: 'paidDate', labelAr: 'تاريخ الدفع', labelKu: 'بەرواری پارەدان' },
    { key: 'status', labelAr: 'الحالة', labelKu: 'دۆخ' },
    { key: 'contact', labelAr: 'تواصل', labelKu: 'پەیوەندی' },
    { key: 'actions', labelAr: 'إجراءات', labelKu: 'کردار' },
  ];
  const [visibleCols, setVisibleCols] = useState(() => {
     const saved = localStorage.getItem('invoice_visible_cols');
     try { return saved ? JSON.parse(saved) : ALL_COLUMNS.map(c => c.key); } catch { return ALL_COLUMNS.map(c => c.key); }
   });
  const toggleCol = (key) => {
    const next = visibleCols.includes(key) ? visibleCols.filter(k => k !== key) : [...visibleCols, key];
    setVisibleCols(next);
    localStorage.setItem('invoice_visible_cols', JSON.stringify(next));
  };
  const col = (key) => visibleCols.includes(key);

  const canSendLateMessage = (invoiceId) => {
    const msgKey = `invoice-${invoiceId}-late`;
    const sentData = sentMessages[msgKey];
    if (!sentData) return true;
    
    const sentDate = new Date(sentData.timestamp);
    const now = new Date();
    const daysDiff = (now - sentDate) / (1000 * 60 * 60 * 24);
    
    return daysDiff >= 7;
  };
  const queryClient = useQueryClient();
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { can } = useUserPermissions();
  
  const t = {
    invoices: L('الفواتير', 'وەسڵەکان'),
    manageInvoices: L('إدارة الفواتير والمدفوعات', 'بەڕێوەبردنی وەسڵ و پارەدانەکان'),
    downloadPDF: L('تحميل PDF', 'داگرتنی PDF'),
    paid: L('المدفوعة', 'پارەدراوە'),
    pending: L('المعلقة', 'هەڵپەسێردراو'),
    overdue: L('المتأخرة', 'دواکەوتوو'),
    allStatuses: L('جميع الحالات', 'هەموو دۆخەکان'),
    allTypes: L('جميع الأنواع', 'هەموو جۆرەکان'),
    status: L('الحالة', 'دۆخ'),
    type: L('النوع', 'جۆر'),
    noInvoices: L('لا توجد فواتير', 'وەسڵ نییە'),
    invoicesAutoCreated: L('سيتم إنشاء الفواتير تلقائياً عند إنشاء العقود', 'وەسڵەکان خۆکارانە دروست دەبن کاتێک گرێبەست دروست دەکرێت'),
    invoiceNumber: L('رقم الفاتورة', 'ژمارەی وەسڵ'),
    tenant: L('المستأجر', 'کرێچی'),
    property: L('العقار', 'خانووبەرە'),
    amount: L('المبلغ', 'بڕ'),
    dueDate: L('الاستحقاق', 'کاتی پێویست'),
    print: L('طباعة', 'چاپکردن'),
    markPaid: L('تسجيل دفع', 'تۆمارکردنی پارەدان'),
    createdDate: L('تاريخ الإنشاء', 'بەرواری دروستکردن'),
  };

  const { data: allInvoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => firebaseApi.entities.Invoice.list('-created_date', 200),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => firebaseApi.entities.Contract.list(),
  });

  const { data: paymentTemplates = [] } = useQuery({
    queryKey: ['message-templates', 'payment_to_tenant'],
    queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'payment_to_tenant', is_active: true }),
  });

  const { data: ownerPaymentTemplates = [] } = useQuery({
    queryKey: ['message-templates', 'payment_to_owner'],
    queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'payment_to_owner', is_active: true }),
  });

  const { data: lateInvoiceTemplates = [] } = useQuery({
    queryKey: ['message-templates', 'invoice_to_tenant'],
    queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'invoice_to_tenant', is_active: true }),
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => firebaseApi.entities.Tenant.list(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => firebaseApi.entities.Property.list(),
  });

  const branchContractIds = activeBranch
    ? new Set(contracts.filter(c => c.branch_id === activeBranch.id).map(c => c.id))
    : null;
  const invoices = branchContractIds
    ? allInvoices.filter(i => branchContractIds.has(i.contract_id))
    : allInvoices;

  const editInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Check for duplicate invoice number (excluding current invoice)
      if (data.invoice_number) {
        const duplicate = allInvoices.find(inv => 
          inv.invoice_number === data.invoice_number && 
          inv.id !== id
        );
        if (duplicate) {
          throw new Error(lang === 'ku' ? 'ئەم ژمارەیە وەسڵ پێشتر بەکارهاتووە' : 'رقم الفاتورة هذا مستخدم مسبقاً');
        }
      }
      await firebaseApi.entities.Invoice.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setEditInvoice(null);
    },
    onError: (err) => {
      alert(err?.message || (lang === 'ku' ? 'هەڵەیەک ڕوویدا' : 'حدث خطأ'));
    },
  });

  const handleExportCSV = () => {
    const headers = ['رقم الفاتورة', 'العقد', 'المستأجر', 'المالك', 'العقار', 'النوع', 'المبلغ', 'العملة', 'الحالة', 'تاريخ الاستحقاق', 'تاريخ الدفع', 'الفترة من', 'الفترة إلى'];
    const rows = filtered.map(inv => {
      const c = contracts.find(x => x.id === inv.contract_id);
      return [
        inv.invoice_number || '—',
        c?.contract_number || '—',
        inv.tenant_name || '—',
        c?.owner_name || '—',
        inv.property_name || '—',
        inv.type || '—',
        inv.amount?.toLocaleString() || '0',
        c?.currency_symbol || 'د.ع',
        inv.displayStatus || inv.status,
        inv.due_date || '—',
        inv.paid_date || '—',
        inv.period_from || '—',
        inv.period_to || '—'
      ];
    });
    
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, amount }) => {
      const updateData = { 
        status: 'مدفوعة', 
        paid_date: new Date().toISOString().split('T')[0],
        rent_collected: amount || null
      };
      if (amount && amount < (invoices.find(inv => inv.id === id)?.amount || 0)) {
        updateData.status = 'معلقة';
      }
      await firebaseApi.entities.Invoice.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setPaymentAmount(null);
      const saved = localStorage.getItem('invoice_sent_messages');
      if (saved) {
        try { setSentMessages(JSON.parse(saved)); } catch { setSentMessages({}); }
      }
    },
  });

  const processedInvoices = invoices.map(inv => {
    if (inv.status === 'معلقة' && inv.due_date && isPast(parseISO(inv.due_date))) {
      return { ...inv, displayStatus: 'متأخرة' };
    }
    return { ...inv, displayStatus: inv.status };
  });

  // Collect all unique currencies from contracts
  const allCurrencySymbols = [...new Set(
    allInvoices.map(i => {
      const c = contracts.find(x => x.id === i.contract_id);
      return c?.currency_symbol || 'د.ع';
    })
  )];

  let filtered = processedInvoices.filter(inv => {
    const statusMatch = filterStatus === 'all' || inv.displayStatus === filterStatus;
    const typeMatch = filterType === 'all' || inv.type === filterType;
    
    let monthMatch = true;
    if (filterMonth !== 'all') {
      const [year, month] = filterMonth.split('-');
      if (inv.period_from) {
        const invDate = parseISO(inv.period_from);
        monthMatch = invDate.getFullYear() === parseInt(year) && (invDate.getMonth() + 1) === parseInt(month);
      }
    }

    const currencyMatch = filterCurrency === 'all' || filterCurrency === 'د.ع' || (() => {
      const c = contracts.find(x => x.id === inv.contract_id);
      const invCurrency = c?.currency_symbol || 'د.ع';
      // Match both exact symbol and IQD code for Dinar
      if (filterCurrency === 'د.ع' || filterCurrency === 'IQD') {
        return invCurrency === 'د.ع' || invCurrency === 'IQD';
      }
      return invCurrency === filterCurrency;
    })();
    
    return statusMatch && typeMatch && monthMatch && currencyMatch;
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  filtered.sort((a, b) => {
    // Custom column sorting
    if (sortColumn) {
      let comparison = 0;
      if (sortColumn === 'invoiceNumber') {
        comparison = (a.invoice_number || '').localeCompare(b.invoice_number || '');
      } else if (sortColumn === 'property') {
        comparison = (a.property_name || '').localeCompare(b.property_name || '');
      } else if (sortColumn === 'type') {
        comparison = (a.type || '').localeCompare(b.type || '');
      } else if (sortColumn === 'amount') {
        comparison = (a.amount || 0) - (b.amount || 0);
      } else if (sortColumn === 'dueDate') {
        comparison = new Date(a.due_date || 0) - new Date(b.due_date || 0);
      } else if (sortColumn === 'paidDate') {
        const aPaid = a.paid_date ? new Date(a.paid_date).getTime() : 0;
        const bPaid = b.paid_date ? new Date(b.paid_date).getTime() : 0;
        comparison = bPaid - aPaid;
      } else if (sortColumn === 'status') {
        const statusOrder = { 'مدفوعة': 0, 'معلقة': 1, 'متأخرة': 2 };
        comparison = (statusOrder[a.displayStatus] || 99) - (statusOrder[b.displayStatus] || 99);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    
    // Original sortBy logic
    if (sortBy === 'due_date_desc') return new Date(b.due_date || 0) - new Date(a.due_date || 0);
    if (sortBy === 'due_date_asc') return new Date(a.due_date || 0) - new Date(b.due_date || 0);
    if (sortBy === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
    if (sortBy === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
    if (sortBy === 'paid_date_desc') {
      const aPaid = a.paid_date ? new Date(a.paid_date).getTime() : 0;
      const bPaid = b.paid_date ? new Date(b.paid_date).getTime() : 0;
      return bPaid - aPaid;
    }
    if (sortBy === 'paid_date_asc') {
      const aPaid = a.paid_date ? new Date(a.paid_date).getTime() : 0;
      const bPaid = b.paid_date ? new Date(b.paid_date).getTime() : 0;
      return aPaid - bPaid;
    }
    if (sortBy === 'status') {
      const statusOrder = { 'مدفوعة': 0, 'معلقة': 1, 'متأخرة': 2 };
      const statusDiff = (statusOrder[a.displayStatus] || 99) - (statusOrder[b.displayStatus] || 99);
      if (statusDiff !== 0) return statusDiff;
      return (a.invoice_number || '').localeCompare(b.invoice_number || '');
    }
    return 0;
  });

  // Helper: get currency symbol for an invoice via its contract
  const getInvSymbol = (inv) => {
    const c = contracts.find(x => x.id === inv.contract_id);
    return c?.currency_symbol || 'د.ع';
  };

  // Group totals by currency symbol
  const groupByCurrency = (list) => {
    const map = {};
    list.forEach(i => {
      const sym = (() => { const c = contracts.find(x => x.id === i.contract_id); return c?.currency_symbol || 'د.ع'; })();
      map[sym] = (map[sym] || 0) + (i.amount || 0);
    });
    return map;
  };
  const paidByCurrency = groupByCurrency(invoices.filter(i => i.status === 'مدفوعة'));
  const pendingByCurrency = groupByCurrency(processedInvoices.filter(i => i.displayStatus === 'معلقة'));
  const overdueByCurrency = groupByCurrency(processedInvoices.filter(i => i.displayStatus === 'متأخرة'));

  const monthOptions = [];
  const currentMonth = startOfMonth(new Date());
  for (let i = 0; i < 12; i++) {
    const month = subMonths(currentMonth, i);
    const monthStr = format(month, 'yyyy-MM');
    const monthLabel = format(month, 'MMMM yyyy');
    monthOptions.push({ value: monthStr, label: monthLabel });
  }

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
            <Receipt className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{t.invoices}</h1>
            <p className="text-xs text-muted-foreground">{t.manageInvoices}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 border-slate-200 shadow-sm hover:shadow-md transition-all" onClick={() => handleExportCSV()}>
            <FileSpreadsheet className="w-4 h-4" /> {L('تصدير CSV', 'هەناردەکردن')}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-slate-200 shadow-sm hover:shadow-md transition-all" onClick={() => generateInvoicesPDF(filtered)}>
            <Download className="w-4 h-4" /> {t.downloadPDF}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Paid card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 shadow-lg">
          <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-emerald-100">{t.paid}</p>
            </div>
            {Object.keys(paidByCurrency).length === 0 ? (
              <p className="text-3xl font-black text-white">0</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(paidByCurrency)
                  .sort((a, b) => (a[0] === '$' ? 1 : b[0] === '$' ? -1 : 0))
                  .map(([sym, total]) => (
                    <div key={sym} className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white tabular-nums">{total.toLocaleString()}</span>
                      <span className="text-xs font-bold text-emerald-100 bg-white/20 px-1.5 py-0.5 rounded">{sym}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        {/* Pending card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-5 shadow-lg">
          <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-amber-100">{t.pending}</p>
            </div>
            {Object.keys(pendingByCurrency).length === 0 ? (
              <p className="text-3xl font-black text-white">0</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(pendingByCurrency)
                  .sort((a, b) => (a[0] === '$' ? 1 : b[0] === '$' ? -1 : 0))
                  .map(([sym, total]) => (
                    <div key={sym} className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white tabular-nums">{total.toLocaleString()}</span>
                      <span className="text-xs font-bold text-amber-100 bg-white/20 px-1.5 py-0.5 rounded">{sym}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        {/* Overdue card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-5 shadow-lg">
          <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -right-2 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-red-100">{t.overdue}</p>
            </div>
            {Object.keys(overdueByCurrency).length === 0 ? (
              <p className="text-3xl font-black text-white">0</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(overdueByCurrency)
                  .sort((a, b) => (a[0] === '$' ? 1 : b[0] === '$' ? -1 : 0))
                  .map(([sym, total]) => (
                    <div key={sym} className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white tabular-nums">{total.toLocaleString()}</span>
                      <span className="text-xs font-bold text-red-100 bg-white/20 px-1.5 py-0.5 rounded">{sym}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Currency filter buttons - always show to ensure Dinar invoices are visible */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm text-slate-600 font-bold">{L('العملة:', 'دراو:')}</span>
        <button
          onClick={() => setFilterCurrency('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${filterCurrency === 'all' ? 'bg-slate-600 text-white border-slate-700' : 'bg-white border-border text-slate-700 hover:border-slate-400'}`}
        >
          {L('الكل', 'هەموو')} {allCurrencySymbols.length > 0 && `(${filtered.length})`}
        </button>
        {allCurrencySymbols.map(sym => {
          const currencyColors = {
            '$': 'bg-green-500 hover:bg-green-600 text-white border-green-600',
            'د.ع': 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
            '€': 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600',
            '£': 'bg-purple-500 hover:bg-purple-600 text-white border-purple-600',
            '₺': 'bg-red-500 hover:bg-red-600 text-white border-red-600',
          };
          const colorClass = currencyColors[sym] || 'bg-slate-500 hover:bg-slate-600 text-white border-slate-600';
          const count = invoices.filter(inv => {
            const c = contracts.find(x => x.id === inv.contract_id);
            const invSym = c?.currency_symbol || 'د.ع';
            return invSym === sym || (sym === 'د.ع' && invSym === 'IQD');
          }).length;
          return (
            <button
              key={sym}
              onClick={() => setFilterCurrency(sym === filterCurrency ? 'all' : sym)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all flex items-center gap-1.5 ${filterCurrency === sym ? colorClass : `bg-white border-border text-slate-700 hover:border-${sym === '$' ? 'green' : sym === 'د.ع' ? 'amber' : 'slate'}-400`}`}
            >
              {sym}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filterCurrency === sym ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Compact Filter Section */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto py-3 px-1">
        {/* Filter Label */}
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-primary/10 rounded-md">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">{L('تصفية', 'فلتەر')}</span>
        </div>
        
        {/* Status Filter */}
        <div className="shrink-0">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors min-w-[130px]">
              <div className="flex items-center gap-1.5 px-2">
                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                <SelectValue placeholder={t.status} />
              </div>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="مدفوعة">{t.paid}</SelectItem>
              <SelectItem value="معلقة">{t.pending}</SelectItem>
              <SelectItem value="متأخرة">{t.overdue}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Type Filter */}
        <div className="shrink-0">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors min-w-[130px]">
              <div className="flex items-center gap-1.5 px-2">
                <Tag className="w-3 h-3 text-slate-400" />
                <SelectValue placeholder={t.type} />
              </div>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">{t.allTypes}</SelectItem>
              <SelectItem value="إيجار">{L('إيجار', 'کرێ')}</SelectItem>
              <SelectItem value="تأمين">{L('تأمين', 'دڵنیایی')}</SelectItem>
              <SelectItem value="غرامة">{L('غرامة', 'بڕیمە')}</SelectItem>
              <SelectItem value="أخرى">{L('أخرى', 'هی تر')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Month Filter */}
        <div className="shrink-0">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-8 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors min-w-[150px]">
              <div className="flex items-center gap-1.5 px-2">
                <CalendarDays className="w-3 h-3 text-slate-400" />
                <SelectValue placeholder={L('الشهر', 'مانگ')} />
              </div>
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">{L('كل الأشهر', 'هەموو مانگەکان')}</SelectItem>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-slate-200 shrink-0" />
        
        {/* Sort Label */}
        <div className="hidden sm:flex items-center gap-1 text-slate-500 shrink-0">
          <SortAsc className="w-3 h-3" />
          <span className="text-xs font-semibold">{L('ترتيب', 'ڕیز')}</span>
        </div>
        
        {/* Sort Dropdown */}
        <div className="shrink-0">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors min-w-[150px]">
              <SelectValue placeholder={L('الترتيب', 'ڕیزکردن')} />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="paid_date_desc">{L('الأحدث دفعاً', 'نوێترین پارەدان')}</SelectItem>
              <SelectItem value="paid_date_asc">{L('الأقدم دفعاً', 'کۆنترین پارەدان')}</SelectItem>
              <SelectItem value="due_date_desc">{L('الأحدث استحقاق', 'نوێترین کاتی پێویست')}</SelectItem>
              <SelectItem value="due_date_asc">{L('الأقدم استحقاق', 'کۆنترین کاتی پێویست')}</SelectItem>
              <SelectItem value="amount_desc">{L('الأكبر مبلغ', 'گەورەترین بڕ')}</SelectItem>
              <SelectItem value="amount_asc">{L('الأصغر مبلغ', 'بچووکترین بڕ')}</SelectItem>
              <SelectItem value="status">{L('الحالة (مدفوعة أولاً)', 'دۆخ (پارەدراو یەکەم)')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Results Counter */}
        {filtered.length > 0 && (
          <div className="shrink-0">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg shadow-sm">
              <span className="text-xs font-bold text-indigo-100">{L('نتيجة', 'ئەنجام')}</span>
              <span className="text-sm font-black text-white bg-indigo-700 px-2.5 py-0.5 rounded-md">{filtered.length}</span>
            </div>
          </div>
        )}
        
        {/* Columns Button */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="ml-auto flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors">
              <Columns className="w-3.5 h-3.5" />
              {L('الأعمدة', 'ستوونەکان')}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60 p-3 rounded-lg shadow-md border border-slate-200 bg-white">
            <div className="mb-2">
              <p className="text-xs font-bold text-slate-800">{L('إظهار / إخفاء الأعمدة', 'پیشاندان / شاردنەوەی ستوونەکان')}</p>
            </div>
            <div className="space-y-0.5 max-h-[50vh] overflow-y-auto">
              {ALL_COLUMNS.map(c => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-2 py-1.5 transition-colors">
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(c.key)}
                    onChange={() => toggleCol(c.key)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium text-slate-700 flex-1">{lang === 'ku' ? c.labelKu : c.labelAr}</span>
                  {visibleCols.includes(c.key) ? <Eye className="w-3 h-3 text-slate-500" /> : <EyeOff className="w-3 h-3 text-slate-300" />}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #8b5cf6, #ec4899);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #7c3aed, #db2777);
        }
      `}</style>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title={t.noInvoices} description={t.invoicesAutoCreated} />
      ) : (
        <>
          <div className="hidden lg:block rounded-3xl shadow-2xl overflow-hidden border-0 ring-1 ring-purple-200/60">
            <table className="w-full text-sm table-auto" style={{tableLayout: 'fixed'}}>
              <thead>
                <tr style={{background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #a855f7 100%)'}}>
                  <th className="text-right py-5 px-4 font-black text-xs text-white/60" style={{width: '40px'}}>#</th>
                  {col('invoiceNumber') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '100px'}}><SortHeader column="invoiceNumber" label={<div className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5 opacity-80" />{t.invoiceNumber}</div>} currentSort={sortColumn} direction={sortDirection} onSort={handleSort} /></th>}
                  {col('property') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '180px'}}><SortHeader column="property" label={<div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 opacity-80" />{t.property} / {t.tenant}</div>} currentSort={sortColumn} direction={sortDirection} onSort={handleSort} /></th>}
                  {col('type') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '90px'}}><SortHeader column="type" label={<div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 opacity-80" />{t.type}</div>} currentSort={sortColumn} direction={sortDirection} onSort={handleSort} /></th>}
                  {col('amount') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '100px'}}><SortHeader column="amount" label={<div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 opacity-80" />{t.amount}</div>} currentSort={sortColumn} direction={sortDirection} onSort={handleSort} /></th>}
                  {col('dueDate') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '100px'}}><SortHeader column="dueDate" label={<div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 opacity-80" />{t.dueDate}</div>} currentSort={sortColumn} direction={sortDirection} onSort={handleSort} /></th>}
                  {col('paidDate') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '110px'}}><SortHeader column="paidDate" label={<div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 opacity-80" />{L('تاريخ الدفع', 'بەرواری پارەدان')}</div>} currentSort={sortColumn} direction={sortDirection} onSort={handleSort} /></th>}
                  {col('status') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '100px'}}><SortHeader column="status" label={<div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 opacity-80" />{L('الحالة', 'دۆخ')}</div>} currentSort={sortColumn} direction={sortDirection} onSort={handleSort} /></th>}
                  {col('contact') && <th className="text-center py-5 px-4 font-black text-xs text-white" style={{width: '140px'}}><div className="flex items-center justify-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 opacity-80" />{L('تواصل', 'پەیوەندی')}</div></th>}
                  {col('actions') && <th className="text-right py-5 px-4 font-black text-xs text-white" style={{width: '140px'}}><div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 opacity-80" />{L('إجراءات', 'کردار')}</div></th>}
                </tr>
                <tr style={{background: 'linear-gradient(135deg, #5558e8 0%, #7c3aed 100%)'}}>
                  <td colSpan={visibleCols.length + 1} className="h-1 p-0 opacity-30" style={{background: 'linear-gradient(90deg, transparent, white, transparent)'}} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => {
                  const c = contracts.find(x => x.id === inv.contract_id);
                  const isEven = idx % 2 === 0;
                  const isPaid = inv.displayStatus === 'مدفوعة';
                  const isLate = inv.displayStatus === 'متأخرة';
                  const isPending = inv.displayStatus === 'معلقة';
                  const isPartial = inv.displayStatus === 'مدفوعة' && inv.rent_collected != null && inv.rent_collected < inv.amount;

                  const accentColor = isPaid ? 'border-r-[5px] border-r-emerald-400' : isLate ? 'border-r-[5px] border-r-rose-500' : 'border-r-[5px] border-r-amber-400';
                  const rowBg = isPaid
                    ? (isEven ? 'bg-emerald-50/60' : 'bg-white')
                    : isLate
                    ? (isEven ? 'bg-rose-50/50' : 'bg-white')
                    : (isEven ? 'bg-violet-50/30' : 'bg-white');
                  const rowHover = isPaid ? 'hover:bg-emerald-50' : isLate ? 'hover:bg-rose-50/60' : 'hover:bg-violet-50/50';
                  const separatorColor = isPaid ? 'border-b border-emerald-100/80' : isLate ? 'border-b border-rose-100/80' : 'border-b border-violet-100/50';

                  const tenant = tenants.find(t => t.id === c?.tenant_id);
                  const property = properties.find(p => p.id === c?.property_id);
                  const month = inv.period_from ? new Date(inv.period_from).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) : '';
                  const tenantLang = tenant?.preferred_language || 'ar';
                  const ownerLang = property?.owner_preferred_language || 'ar';
                  const tpl = paymentTemplates[0]; const oTpl = ownerPaymentTemplates[0]; const lTpl = lateInvoiceTemplates[0];
                  let tenantMsg = (tenantLang === 'ku' && tpl?.message_ku) ? tpl.message_ku : (tpl?.message_ar || `السلام عليكم ${c?.tenant_name}،\n\nنشكركم على سداد مبلغ ${inv.amount?.toLocaleString()} عن شهر ${month}.\n\nالعقار: ${inv.property_name}`);
                  tenantMsg = tenantMsg.replace('{tenant_name}', c?.tenant_name || '').replace('{property_code}', inv.property_name || '').replace('{amount}', (inv.amount || 0).toLocaleString()).replace('{month}', month);
                  let ownerMsg = (ownerLang === 'ku' && oTpl?.message_ku) ? oTpl.message_ku : (oTpl?.message_ar || `السلام عليكم ${c?.owner_name}،\n\nتم سداد مبلغ ${inv.amount?.toLocaleString()} عن شهر ${month}.\n\nالعقار: ${inv.property_name}`);
                  ownerMsg = ownerMsg.replace('{owner_name}', c?.owner_name || '').replace('{property_code}', inv.property_name || '').replace('{amount}', (inv.amount || 0).toLocaleString()).replace('{month}', month);
                  let lateMsg = (tenantLang === 'ku' && lTpl?.message_ku) ? lTpl.message_ku : (lTpl?.message_ar || `السلام عليكم ${c?.tenant_name}،\n\nنود تذكيركم بأن فاتورة الإيجار رقم ${inv.invoice_number} بقيمة ${inv.amount?.toLocaleString()} مستحقة منذ ${inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : ''}.\n\nالعقار: ${inv.property_name}`);
                  lateMsg = lateMsg.replace('{tenant_name}', c?.tenant_name || '').replace('{property_code}', inv.property_name || '').replace('{invoice_number}', inv.invoice_number || '').replace('{amount}', (inv.amount || 0).toLocaleString()).replace('{due_date}', inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : '');
                  const tenantMsgKey = `invoice-${inv.id}-tenant`;
                  const ownerMsgKey = `invoice-${inv.id}-owner`;
                  const handleSendMsg = (key) => { const ns = { ...sentMessages, [key]: true }; setSentMessages(ns); localStorage.setItem('invoice_sent_messages', JSON.stringify(ns)); };

                  return (
                  <tr key={inv.id} className={`${rowBg} ${accentColor} ${rowHover} ${separatorColor} transition-all duration-200`}>
                    {/* Index */}
                    <td className="py-4 px-4">
                      <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shadow-sm ${isPaid ? 'bg-emerald-500 text-white' : isLate ? 'bg-rose-500 text-white' : 'bg-violet-500 text-white'}`}>{idx + 1}</span>
                    </td>
                    {col('invoiceNumber') && <td className="py-4 px-4"><button onClick={() => setPrintInvoice(inv)} className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-xl border border-purple-200 block truncate shadow-sm hover:bg-purple-100 hover:border-purple-300 transition-colors">{inv.invoice_number?.slice(-6)}</button></td>}
                    {col('property') && <td className="py-4 px-4">
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                            <Home className="w-3.5 h-3.5 text-white" />
                          </div>
                          <a href={`/contracts?contract=${inv.contract_id}`} className="text-sm font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-1 rounded-xl truncate shadow-sm hover:bg-amber-200 hover:border-amber-400 transition-all cursor-pointer">
                            {inv.property_name}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 truncate">{inv.tenant_name}</span>
                        </div>
                      </div>
                    </td>}
                    {col('type') && <td className="py-4 px-4"><span className="px-2 py-0.5 rounded-xl bg-gradient-to-l from-indigo-500 to-blue-500 text-white text-[10px] font-bold whitespace-nowrap shadow-md">{inv.type}</span></td>}
                    {col('amount') && <td className="py-4 px-4">
                      <div className={`flex flex-col gap-0.5 rounded-xl px-2 py-1 border shadow-sm ${isPaid ? 'bg-emerald-50 border-emerald-200' : isLate ? 'bg-rose-50 border-rose-200' : 'bg-violet-50 border-violet-200'}`}>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-[9px] font-bold ${isPaid ? 'text-emerald-500' : isLate ? 'text-rose-500' : 'text-violet-500'}`}>{getInvSymbol(inv)}</span>
                          <span className={`font-black text-sm tabular-nums ${isPaid ? 'text-emerald-800' : isLate ? 'text-rose-800' : 'text-violet-800'}`}>{inv.amount?.toLocaleString()}</span>
                        </div>
                        {isPartial && (
                          <div className="flex items-baseline gap-1 text-[9px]">
                            <span className="text-emerald-600 font-bold">مدفوع: {inv.rent_collected?.toLocaleString()}</span>
                            <span className="text-amber-600 font-semibold">المتبقي: {(inv.amount - inv.rent_collected).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </td>}
                    {col('dueDate') && <td className="py-4 px-4"><div className="flex flex-col gap-0.5"><span className="text-slate-600 text-[10px] font-bold tabular-nums">{inv.due_date && format(parseISO(inv.due_date), 'dd/MM/yyyy')}</span>{inv.paid_date && <span className="text-emerald-600 text-[9px] font-bold flex items-center gap-0.5"><CheckCircle2 className="w-2 h-2" />{format(parseISO(inv.paid_date), 'dd/MM/yyyy')}</span>}</div></td>}
                    {col('paidDate') && <td className="py-4 px-4">{inv.paid_date ? <span className="text-emerald-700 text-[10px] font-bold tabular-nums bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">{format(parseISO(inv.paid_date), 'dd/MM/yyyy')}</span> : <span className="text-slate-400 text-[10px] font-semibold">-</span>}</td>}
                    {col('status') && <td className="py-4 px-4"><Badge className={`text-[9px] border gap-0.5 whitespace-nowrap font-bold shadow-md rounded-xl px-2 py-0.5 ${statusColors[inv.displayStatus] || ''}`}>{statusIcon[inv.displayStatus]}{inv.displayStatus}</Badge></td>}
                    {/* Contact */}
                    {col('contact') && <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5">
                        {c?.tenant_phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-blue-600 whitespace-nowrap">{L('المستأجر', 'کرێچی')}</span>
                            <div className="flex items-center gap-0.5">
                              {can('can_call_tenants') && <a href={`tel:${c.tenant_phone}`} className="w-5 h-5 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-sm"><Phone className="w-2.5 h-2.5" /></a>}
                              <a href={`https://wa.me/${c.tenant_phone.replace(/\D/g,'')}?text=${encodeURIComponent(tenantMsg)}`} target="_blank" rel="noreferrer" className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-sm"><MessageCircle className="w-2.5 h-2.5" /></a>
                              {isPaid && (sentMessages[tenantMsgKey] ? <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center cursor-not-allowed"><CheckCircle2 className="w-2.5 h-2.5" /></span> : <a href={`https://wa.me/${c.tenant_phone.replace(/\D/g,'')}?text=${encodeURIComponent(tenantMsg)}`} target="_blank" rel="noreferrer" onClick={() => handleSendMsg(tenantMsgKey)} className="w-5 h-5 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors shadow-sm"><Send className="w-2.5 h-2.5" /></a>)}
                            </div>
                          </div>
                        )}
                        {c?.owner_phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-amber-600 whitespace-nowrap">{L('المالك', 'خاوەن')}</span>
                            <div className="flex items-center gap-0.5">
                              {can('can_call_property_owners') && <a href={`tel:${c.owner_phone}`} className="w-5 h-5 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-sm"><Phone className="w-2.5 h-2.5" /></a>}
                              <a href={`https://wa.me/${c.owner_phone.replace(/\D/g,'')}?text=${encodeURIComponent(ownerMsg)}`} target="_blank" rel="noreferrer" className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors shadow-sm"><MessageCircle className="w-2.5 h-2.5" /></a>
                              {isPaid && (sentMessages[ownerMsgKey] ? <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center cursor-not-allowed"><CheckCircle2 className="w-2.5 h-2.5" /></span> : <a href={`https://wa.me/${c.owner_phone.replace(/\D/g,'')}?text=${encodeURIComponent(ownerMsg)}`} target="_blank" rel="noreferrer" onClick={() => handleSendMsg(ownerMsgKey)} className="w-5 h-5 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center transition-colors shadow-sm"><Send className="w-2.5 h-2.5" /></a>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>}
                    {col('actions') && <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPrintInvoice(inv)}
                          title={t.print}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors border border-slate-200 shadow-sm hover:shadow-md"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {((inv.displayStatus !== 'مدفوعة' && can('can_edit_rent_invoices')) || (inv.type === 'تأمين' && can('can_edit_insurance_invoices'))) && (
                          <button
                            onClick={() => { setPaymentAmount(null); setConfirmPayInvoice(inv); }}
                            title={t.markPaid}
                            className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {inv.displayStatus === 'مدفوعة' && can('can_edit_rent_invoices') && (
                          <button
                            onClick={() => { setPaymentAmount(inv.rent_collected || inv.amount); setConfirmPayInvoice(inv); }}
                            title={L('تعديل الدفع', 'دەستکاریکردنی پارەدان')}
                            className="w-7 h-7 rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isLate && can('can_send_rent_invoice_whatsapp') && (
                          <button
                            onClick={() => {
                              if (!c?.tenant_phone) return;
                              window.open(`https://wa.me/${c.tenant_phone.replace(/\D/g,'')}?text=${encodeURIComponent(lateMsg)}`, '_blank');
                              const msgKey = `invoice-${inv.id}-late`;
                              const ns = { ...sentMessages, [msgKey]: { timestamp: new Date().toISOString() } };
                              setSentMessages(ns); localStorage.setItem('invoice_sent_messages', JSON.stringify(ns));
                            }}
                            disabled={!canSendLateMessage(inv.id)}
                            title={L('تأخير', 'دواکەوتن')}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shadow-sm hover:shadow-md ${canSendLateMessage(inv.id) ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>}
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-4">
            {filtered.map(inv => {
              const c = contracts.find(x => x.id === inv.contract_id);
              const isPaid = inv.displayStatus === 'مدفوعة';
              const isLate = inv.displayStatus === 'متأخرة';
              const isPending = inv.displayStatus === 'معلقة';
              const isPartial = inv.displayStatus === 'مدفوعة' && inv.rent_collected != null && inv.rent_collected < inv.amount;
              const cardGradient = isPaid 
                ? 'from-[#3b4c06]/10 via-[#3b4c06]/5 to-transparent' 
                : isLate 
                ? 'from-red-500/10 via-red-500/5 to-transparent'
                : 'from-[#540e0e]/10 via-[#540e0e]/5 to-transparent';
              return (
                <div key={inv.id} className="relative bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  {/* Animated gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cardGradient}`} />
                  
                  {/* Status stripe */}
                  <div className={`absolute top-0 right-0 w-1 h-full ${isPaid ? 'bg-gradient-to-b from-[#3b4c06] to-[#4a6b0a]' : isLate ? 'bg-gradient-to-b from-red-400 to-red-600' : 'bg-gradient-to-b from-[#540e0e] to-[#7a1a1a]'}`} />
                  
                  <div className="relative p-4 space-y-4">
                  {/* Header with invoice number and status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${isPaid ? 'bg-[#3b4c06]' : isLate ? 'bg-red-500' : 'bg-[#540e0e]'}`}>
                        <Receipt className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-semibold">{t.invoiceNumber}</p>
                        <button onClick={() => setPrintInvoice(inv)} className="text-sm font-mono font-black text-slate-800 hover:text-primary transition-colors">
                          {inv.invoice_number?.slice(-6)}
                        </button>
                      </div>
                    </div>
                    <Badge className={`text-xs border gap-1 shadow-md ${statusColors[inv.displayStatus] || ''}`}>
                      {statusIcon[inv.displayStatus]}
                      {inv.displayStatus}
                    </Badge>
                  </div>

                  {/* Creative payment card */}
                  <div className={`relative overflow-hidden rounded-2xl p-4 ${isPaid ? 'bg-gradient-to-br from-[#3b4c06] to-[#4a6b0a]' : isLate ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-[#540e0e] to-[#7a1a1a]'} shadow-lg`}>
                    {/* Decorative circles */}
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
                    
                    <div className="relative">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                          <DollarSign className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-white/90">{L('المبلغ المطلوب', 'بڕی داواکراو')}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white tabular-nums">{inv.amount?.toLocaleString()}</span>
                        <span className="text-sm font-bold text-white/80">{getInvSymbol(inv)}</span>
                      </div>
                      {isPartial && (
                        <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-xl p-2 border border-white/30">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/90 font-bold">{L('مدفوع', 'پارەدراو')}</span>
                            <span className="text-white font-black">{inv.rent_collected?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-white/90 font-bold">{L('المتبقي', 'ماوەتەوە')}</span>
                            <span className="text-amber-200 font-black">{(inv.amount - inv.rent_collected).toLocaleString()}</span>
                          </div>
                          <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-300 rounded-full" style={{ width: `${(inv.rent_collected / inv.amount) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Property info with creative design */}
                  <a href={`/contracts?contract=${inv.contract_id}`} className="block relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 p-3 hover:shadow-lg transition-all cursor-pointer group">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-amber-200/50 rounded-bl-full" />
                    <div className="relative flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Home className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-amber-600 font-bold">{L('العقار', 'خانووبەرە')}</p>
                        <p className="text-sm font-black text-amber-900 truncate">{inv.property_name}</p>
                      </div>
                    </div>
                  </a>
                  
                  {/* Tenant and due date info */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500 font-bold">{L('المستأجر', 'کرێچی')}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 truncate">{inv.tenant_name}</p>
                    </div>
                    <div className={`rounded-xl p-3 border ${isLate ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock className={`w-4 h-4 ${isLate ? 'text-red-400' : 'text-slate-400'}`} />
                        <span className="text-xs text-slate-500 font-bold">{L('الاستحقاق', 'کاتی پێویست')}</span>
                      </div>
                      <p className={`text-sm font-black tabular-nums ${isLate ? 'text-red-700' : 'text-slate-700'}`}>
                        {inv.due_date && format(parseISO(inv.due_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  {c && (
                    <div className="pt-3 border-t border-border/50">
                      <div className="space-y-3">
                        {c.tenant_phone && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">{L('المستأجر', 'کرێچی')}</Badge>
                            {can('can_call_tenants') && (
                              <a href={`tel:${c.tenant_phone}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                            {(() => {
                              const tenant = tenants.find(t => t.id === c.tenant_id);
                              const preferredLang = tenant?.preferred_language || 'ar';
                              const month = inv.period_from ? new Date(inv.period_from).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) : '';
                              const tpl = paymentTemplates[0];
                              let msgTemplate = '';
                              if (preferredLang === 'ku' && tpl?.message_ku) msgTemplate = tpl.message_ku;
                              else if (preferredLang === 'en' && tpl?.message_en) msgTemplate = tpl.message_en;
                              else if (preferredLang === 'tr' && tpl?.message_tr) msgTemplate = tpl.message_tr;
                              else msgTemplate = tpl?.message_ar || `السلام عليكم ${c.tenant_name}،\n\nنشكركم على سداد مبلغ ${inv.amount?.toLocaleString()} عن شهر ${month}.\n\nالعقار: ${inv.property_name}`;
                              const msg = msgTemplate.replace('{tenant_name}', c.tenant_name || '').replace('{property_code}', inv.property_name || '').replace('{amount}', (inv.amount || 0).toLocaleString()).replace('{month}', month);
                              const msgKey = `invoice-${inv.id}-tenant`;
                              const isSent = sentMessages[msgKey];
                              const handleSendMessage = (e, key) => {
                                const newSent = { ...sentMessages, [key]: true };
                                setSentMessages(newSent);
                                localStorage.setItem('invoice_sent_messages', JSON.stringify(newSent));
                              };
                              return (
                                <>
                                  <a href={`https://wa.me/${c.tenant_phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                  {inv.displayStatus === 'مدفوعة' && (
                                    isSent ? (
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed">
                                        <CheckCircle2 className="w-4 h-4" />
                                      </span>
                                    ) : (
                                      <a href={`https://wa.me/${c.tenant_phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={(e) => handleSendMessage(e, msgKey)} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors">
                                        <Send className="w-4 h-4" />
                                      </a>
                                    )
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                        {c.owner_phone && (
                          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200">
                            <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">{L('المالك', 'خاوەن')}</Badge>
                            {can('can_call_property_owners') && (
                              <a href={`tel:${c.owner_phone}`} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                            {(() => {
                              const property = properties.find(p => p.id === c.property_id);
                              const preferredLang = property?.owner_preferred_language || 'ar';
                              const month = inv.period_from ? new Date(inv.period_from).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) : '';
                              const tpl = ownerPaymentTemplates[0];
                              let msgTemplate = '';
                              if (preferredLang === 'ku' && tpl?.message_ku) msgTemplate = tpl.message_ku;
                              else if (preferredLang === 'en' && tpl?.message_en) msgTemplate = tpl.message_en;
                              else if (preferredLang === 'tr' && tpl?.message_tr) msgTemplate = tpl.message_tr;
                              else msgTemplate = tpl?.message_ar || `السلام عليكم ${c.owner_name}،\n\nتم سداد مبلغ ${inv.amount?.toLocaleString()} عن شهر ${month}.\n\nالعقار: ${inv.property_name}`;
                              const msg = msgTemplate.replace('{owner_name}', c.owner_name || '').replace('{property_code}', inv.property_name || '').replace('{amount}', (inv.amount || 0).toLocaleString()).replace('{month}', month);
                              const msgKey = `invoice-${inv.id}-owner`;
                              const isSent = sentMessages[msgKey];
                              const handleSendMessage = (e, key) => {
                                const newSent = { ...sentMessages, [key]: true };
                                setSentMessages(newSent);
                                localStorage.setItem('invoice_sent_messages', JSON.stringify(newSent));
                              };
                              return (
                                <>
                                  <a href={`https://wa.me/${c.owner_phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                  {inv.displayStatus === 'مدفوعة' && (
                                    isSent ? (
                                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed">
                                        <CheckCircle2 className="w-4 h-4" />
                                      </span>
                                    ) : (
                                      <a href={`https://wa.me/${c.owner_phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={(e) => handleSendMessage(e, msgKey)} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors">
                                        <Send className="w-4 h-4" />
                                      </a>
                                    )
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-border/50 flex flex-wrap gap-2">
                    <button onClick={() => setPrintInvoice(inv)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors">
                      <Printer className="w-4 h-4" />{t.print}
                    </button>
                    {((inv.displayStatus !== 'مدفوعة' && can('can_edit_rent_invoices')) || (inv.type === 'تأمين' && can('can_edit_insurance_invoices'))) && (
                      <button onClick={() => { setPaymentAmount(null); setConfirmPayInvoice(inv); }} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors">
                        <CheckCircle2 className="w-4 h-4" />{L('إتمام الدفع', 'تەواوکردنی پارەدان')}
                      </button>
                    )}
                    {inv.displayStatus === 'مدفوعة' && can('can_edit_rent_invoices') && (
                      <button onClick={() => { setPaymentAmount(inv.rent_collected || inv.amount); setConfirmPayInvoice(inv); }} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors">
                        <Pencil className="w-4 h-4" />{L('تعديل', 'دەستکاری')}
                      </button>
                    )}
                    {inv.displayStatus === 'متأخرة' && can('can_send_rent_invoice_whatsapp') && (
                      <button 
                        onClick={() => {
                          const c = contracts.find(x => x.id === inv.contract_id);
                          if (!c?.tenant_phone) return;
                          const tenant = tenants.find(t => t.id === c.tenant_id);
                          const preferredLang = tenant?.preferred_language || 'ar';
                          const tpl = lateInvoiceTemplates[0];
                          let msgTemplate = tpl?.message_ar || `السلام عليكم ${c.tenant_name}،\n\nنود تذكيركم بأن فاتورة الإيجار رقم ${inv.invoice_number} بقيمة ${inv.amount?.toLocaleString()} مستحقة منذ ${inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : ''}.\n\nالعقار: ${inv.property_name}`;
                          if (preferredLang === 'ku' && tpl?.message_ku) msgTemplate = tpl.message_ku;
                          else if (preferredLang === 'en' && tpl?.message_en) msgTemplate = tpl.message_en;
                          const msg = msgTemplate.replace('{tenant_name}', c.tenant_name || '').replace('{property_code}', inv.property_name || '').replace('{invoice_number}', inv.invoice_number || '').replace('{amount}', (inv.amount || 0).toLocaleString()).replace('{due_date}', inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-EG') : '');
                          window.open(`https://wa.me/${c.tenant_phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
                          const msgKey = `invoice-${inv.id}-late`;
                          const ns = { ...sentMessages, [msgKey]: { timestamp: new Date().toISOString() } };
                          setSentMessages(ns); localStorage.setItem('invoice_sent_messages', JSON.stringify(ns));
                        }} 
                        disabled={!canSendLateMessage(inv.id)}
                        className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${canSendLateMessage(inv.id) ? 'bg-red-50 border border-red-200 hover:bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      >
                        <Send className="w-4 h-4" />{L('رسالة تأخير', 'پەیامی دواکەوتن')}
                      </button>
                    )}
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {printInvoice && <InvoicePrint invoice={printInvoice} branch={activeBranch} onClose={() => setPrintInvoice(null)} />}

      <Dialog open={!!editInvoice} onOpenChange={(open) => { if (!open) setEditInvoice(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-500" />
              {L('تعديل الفاتورة', 'دەستکاریکردنی وەسڵ')}
              {editInvoice && <span className="text-sm font-normal text-muted-foreground">— {editInvoice.invoice_number}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{L('رقم الفاتورة', 'ژمارەی وەسڵ')}</Label>
              <Input value={editForm.invoice_number || ''} onChange={e => setEditForm(f => ({ ...f, invoice_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.amount}</Label>
              <Input type="number" value={editForm.amount || ''} onChange={e => setEditForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.dueDate}</Label>
              <Input type="date" value={editForm.due_date || ''} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{L('ملاحظات', 'تێبینی')}</Label>
              <Input value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setEditInvoice(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              {L('إلغاء', 'پاشگەزبوونەوە')}
            </button>
            <button
              onClick={() => editInvoiceMutation.mutate({ id: editInvoice.id, data: editForm })}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              {L('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانەکان')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmPayInvoice} onOpenChange={(open) => { if (!open) setConfirmPayInvoice(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {paymentAmount != null && paymentAmount !== confirmPayInvoice?.amount ? L('تعديل الدفع', 'دەستکاریکردنی پارەدان') : L('تأكيد تسجيل الدفع', 'دڵنیایی لە تۆمارکردنی پارەدان')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPayInvoice && (
                <div className="space-y-4">
                  <p>
                    {L('هل أنت متأكد من تسجيل دفع فاتورة', 'دڵنیایت لە تۆمارکردنی پارەدانی وەسڵ')}{' '}
                    <strong>{confirmPayInvoice.invoice_number}</strong>{' '}
                    {L('للمستأجر', 'بۆ کرێچی')}{' '}
                    <strong>{confirmPayInvoice.tenant_name}</strong>{'؟'}
                  </p>
                  <div className="space-y-2">
                    <Label>{L('مبلغ الدفع', 'بڕی پارەدان')}</Label>
                    <Input 
                      type="number" 
                      value={paymentAmount || confirmPayInvoice.amount} 
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      max={confirmPayInvoice.amount}
                    />
                    <p className="text-xs text-muted-foreground">
                      {L('المبلغ الكلي:', 'کۆی گشتی:')} <strong>{confirmPayInvoice.amount?.toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (confirmPayInvoice) {
                  markPaidMutation.mutate({ 
                    id: confirmPayInvoice.id, 
                    amount: paymentAmount || confirmPayInvoice.amount 
                  });
                  setConfirmPayInvoice(null);
                }
              }}
            >
              {L('نعم، تسجيل الدفع', 'بەڵێ، تۆمارکردنی پارەدان')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}