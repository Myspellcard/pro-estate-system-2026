import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import {
  DollarSign, TrendingUp, TrendingDown, RefreshCw, BarChart3,
  Search, CircleDollarSign, Coins, ArrowLeftRight, Home, ShoppingBag
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const KNOWN_CURRENCIES = [
  { code: 'IQD', symbol: 'د.ع',  name_ar: 'دينار عراقي',   name_ku: 'دینار عێراقی',   color: 'emerald' },
  { code: 'USD', symbol: '$',    name_ar: 'دولار أمريكي',  name_ku: 'دۆلاری ئەمریکی', color: 'blue' },
  { code: 'EUR', symbol: '€',    name_ar: 'يورو',           name_ku: 'یورۆ',            color: 'purple' },
  { code: 'GBP', symbol: '£',    name_ar: 'جنيه إسترليني', name_ku: 'پاوەند',          color: 'yellow' },
  { code: 'TRY', symbol: '₺',    name_ar: 'ليرة تركية',    name_ku: 'لیرەی تورکی',    color: 'red' },
  { code: 'SAR', symbol: 'ر.س',  name_ar: 'ريال سعودي',    name_ku: 'ریالی سعودی',     color: 'orange' },
];

const COLOR_MAP = {
  emerald: { card: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', icon: 'text-emerald-600', bar: 'bg-emerald-500' },
  blue:    { card: 'bg-blue-50 border-blue-200',       badge: 'bg-blue-100 text-blue-800',       icon: 'text-blue-600',    bar: 'bg-blue-500' },
  purple:  { card: 'bg-purple-50 border-purple-200',   badge: 'bg-purple-100 text-purple-800',   icon: 'text-purple-600',  bar: 'bg-purple-500' },
  yellow:  { card: 'bg-yellow-50 border-yellow-200',   badge: 'bg-yellow-100 text-yellow-800',   icon: 'text-yellow-600',  bar: 'bg-yellow-500' },
  red:     { card: 'bg-red-50 border-red-200',         badge: 'bg-red-100 text-red-800',         icon: 'text-red-600',     bar: 'bg-red-500' },
  orange:  { card: 'bg-orange-50 border-orange-200',   badge: 'bg-orange-100 text-orange-800',   icon: 'text-orange-600',  bar: 'bg-orange-500' },
};

export default function FinanceDepartment() {
  const { lang } = useLanguage();
  const { activeBranch } = useBranch();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [tab, setTab] = useState('rent'); // 'rent' | 'sale'
  const [baseCurrency, setBaseCurrency] = useState('IQD');

  // Rent tab state
  const [rentSearch, setRentSearch] = useState('');
  const [rentFilterStatus, setRentFilterStatus] = useState('');

  // Sale tab state
  const [saleSearch, setSaleSearch] = useState('');
  const [saleFilterCurrency, setSaleFilterCurrency] = useState('');
  const [saleFilterStatus, setSaleFilterStatus] = useState('');

  // Data fetching
  const { data: rentContracts = [], isLoading: loadingRentContracts } = useQuery({
    queryKey: ['rent-contracts-finance', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Contract.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Contract.list(),
  });

  const { data: rentInvoices = [], isLoading: loadingRentInvoices } = useQuery({
    queryKey: ['rent-invoices-finance', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Invoice.list(),
  });

  const { data: saleContracts = [], isLoading: loadingSaleContracts } = useQuery({
    queryKey: ['sale-contracts-finance', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.SaleContract.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.SaleContract.list(),
  });

  const { data: saleInvoices = [], isLoading: loadingSaleInvoices } = useQuery({
    queryKey: ['sale-invoices-finance', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.SaleInvoice.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.SaleInvoice.list(),
  });

  const { data: dbCurrencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => firebaseApi.entities.Currency.list(),
  });

  // Helpers
  const getRate = (code) => {
    if (!code || code === 'IQD') return 1;
    const db = dbCurrencies.find(c => c.code === code);
    return db?.exchange_rate || 1;
  };
  const baseRateToIQD = getRate(baseCurrency);
  const convertToBase = (amount, fromCurrency, contractRateToIQD) => {
    const rateToIQD = contractRateToIQD || getRate(fromCurrency) || 1;
    return (amount * rateToIQD) / baseRateToIQD;
  };

  const getCurrencyInfo = (code) => {
    const known = KNOWN_CURRENCIES.find(k => k.code === code);
    const db = dbCurrencies.find(d => d.code === code);
    return {
      symbol: db?.symbol || known?.symbol || code,
      name: db ? L(db.name, db.name_ku) : L(known?.name_ar || code, known?.name_ku || code),
      color: known?.color || 'blue',
    };
  };

  const baseCurrencyInfo = getCurrencyInfo(baseCurrency);

  // ── RENT calculations ──
  const activeRentContracts = rentContracts.filter(c => c.status === 'نشط');
  
  console.log('📊 Contracts:', rentContracts.length, 'Active:', activeRentContracts.length);
  console.log('📊 Invoices:', rentInvoices.length);
  console.log('📊 Active Contract IDs:', activeRentContracts.map(c => ({ id: c.id, number: c.contract_number })));
  console.log('📊 Sample Invoices:', rentInvoices.slice(0, 5).map(inv => ({ id: inv.id, contract_id: inv.contract_id, type: inv.type, status: inv.status, amount: inv.amount })));
  
  // Debug: Check which invoices match which contracts
  const debugMatches = activeRentContracts.map(c => {
    const matching = rentInvoices.filter(inv => inv.contract_id === c.id);
    return { contractId: c.id, contractNumber: c.contract_number, matchCount: matching.length, matches: matching };
  });
  console.log('🔍 Invoice-Contract Matches:', debugMatches);
  
  // Separate IQD and USD contracts first
  const iqdContracts = activeRentContracts.filter(c => (c.currency || 'IQD') === 'IQD' || (c.currency || 'IQD') === 'د.ع');
  const usdContracts = activeRentContracts.filter(c => (c.currency || 'IQD') === 'USD' || (c.currency || 'IQD') === '$');
  
  // Insurance Tracking calculations - separated by currency
  const iqdInsurance = iqdContracts.reduce((sum, c) => sum + (c.insurance_amount || 0), 0);
  const iqdReceivedInsurance = iqdContracts.reduce((sum, c) => {
    const insuranceInvoices = rentInvoices.filter(inv => inv.contract_id === c.id && inv.type === 'تأمين' && inv.status === 'مدفوعة');
    return sum + insuranceInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  }, 0);
  const iqdPendingInsurance = iqdInsurance - iqdReceivedInsurance;
  const iqdInsuranceCollectionRate = iqdInsurance > 0 ? Math.round((iqdReceivedInsurance / iqdInsurance) * 100) : 0;
  
  const usdInsurance = usdContracts.reduce((sum, c) => sum + (c.insurance_amount || 0), 0);
  const usdReceivedInsurance = usdContracts.reduce((sum, c) => {
    const insuranceInvoices = rentInvoices.filter(inv => inv.contract_id === c.id && inv.type === 'تأمين' && inv.status === 'مدفوعة');
    return sum + insuranceInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  }, 0);
  const usdPendingInsurance = usdInsurance - usdReceivedInsurance;
  const usdInsuranceCollectionRate = usdInsurance > 0 ? Math.round((usdReceivedInsurance / usdInsurance) * 100) : 0;
  
  // IQD calculations
  const iqdTotalRentReceived = iqdContracts.reduce((sum, c) => {
    const contractInvoices = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'مدفوعة');
    return sum + contractInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  }, 0);
  const iqdTotalPaidToOwner = iqdContracts.reduce((sum, c) => {
    const contractInvoices = rentInvoices.filter(inv => inv.contract_id === c.id && (inv.type === 'دفع_للمالك' || inv.type === 'استلام_من_مالك') && inv.status === 'مدفوعة');
    return sum + contractInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  }, 0);
  const iqdRemainingInCompany = iqdTotalRentReceived - iqdTotalPaidToOwner;
  const iqdRetentionRate = iqdTotalRentReceived > 0 ? Math.round(((iqdTotalRentReceived - iqdTotalPaidToOwner) / iqdTotalRentReceived) * 100) : 0;
  
  // USD calculations
  const usdTotalRentReceived = usdContracts.reduce((sum, c) => {
    const contractInvoices = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'مدفوعة');
    return sum + contractInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  }, 0);
  const usdTotalPaidToOwner = usdContracts.reduce((sum, c) => {
    const contractInvoices = rentInvoices.filter(inv => inv.contract_id === c.id && (inv.type === 'دفع_للمالك' || inv.type === 'استلام_من_مالك') && inv.status === 'مدفوعة');
    return sum + contractInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  }, 0);
  const usdRemainingInCompany = usdTotalRentReceived - usdTotalPaidToOwner;
  const usdRetentionRate = usdTotalRentReceived > 0 ? Math.round(((usdTotalRentReceived - usdTotalPaidToOwner) / usdTotalRentReceived) * 100) : 0;
  
  // Invoice status by currency
  const iqdPaid = iqdContracts.reduce((sum, c) => {
    const paid = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
    return sum + paid;
  }, 0);
  const iqdPending = iqdContracts.reduce((sum, c) => {
    const pending = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'معلقة').reduce((s, inv) => s + (inv.amount || 0), 0);
    return sum + pending;
  }, 0);
  const iqdOverdue = iqdContracts.reduce((sum, c) => {
    const overdue = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'متأخرة').reduce((s, inv) => s + (inv.amount || 0), 0);
    return sum + overdue;
  }, 0);
  
  const usdPaid = usdContracts.reduce((sum, c) => {
    const paid = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
    return sum + paid;
  }, 0);
  const usdPending = usdContracts.reduce((sum, c) => {
    const pending = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'معلقة').reduce((s, inv) => s + (inv.amount || 0), 0);
    return sum + pending;
  }, 0);
  const usdOverdue = usdContracts.reduce((sum, c) => {
    const overdue = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'متأخرة').reduce((s, inv) => s + (inv.amount || 0), 0);
    return sum + overdue;
  }, 0);

  // Group rent contracts by currency (same pattern as sale)
  const rentCurrencyGroups = rentContracts.reduce((acc, c) => {
    const code = c.currency || 'IQD';
    if (!acc[code]) acc[code] = { contracts: [], totalMonthly: 0, totalRent: 0, totalInsurance: 0 };
    acc[code].contracts.push(c);
    acc[code].totalMonthly += c.monthly_rent || 0;
    acc[code].totalRent += c.total_rent || 0;
    acc[code].totalInsurance += c.insurance_amount || 0;
    return acc;
  }, {});
  const activeRentCurrencies = Object.keys(rentCurrencyGroups);

  // Rent invoices grouped by currency
  const rentInvoiceByCurrency = rentInvoices.reduce((acc, inv) => {
    // invoices don't have a currency field, link via contract
    const contract = rentContracts.find(c => c.id === inv.contract_id);
    const code = contract?.currency || 'IQD';
    if (!acc[code]) acc[code] = { total: 0, paid: 0, pending: 0, overdue: 0 };
    acc[code].total += inv.amount || 0;
    if (inv.status === 'مدفوعة') acc[code].paid += inv.amount || 0;
    else if (inv.status === 'معلقة') acc[code].pending += inv.amount || 0;
    else if (inv.status === 'متأخرة') acc[code].overdue += inv.amount || 0;
    return acc;
  }, {});

  const totalRentInBase = rentContracts.reduce((sum, c) => sum + convertToBase(c.total_rent || 0, c.currency || 'IQD', c.currency_rate_to_iqd), 0);

  const filteredRentContracts = rentContracts.filter(c => {
    const matchSearch = !rentSearch || c.tenant_name?.includes(rentSearch) || c.contract_number?.includes(rentSearch) || c.property_name?.includes(rentSearch);
    const matchStatus = !rentFilterStatus || c.status === rentFilterStatus;
    return matchSearch && matchStatus;
  });

  // ── SALE calculations ──
  const saleCurrencyGroups = saleContracts.reduce((acc, c) => {
    const code = c.currency || 'IQD';
    if (!acc[code]) acc[code] = { contracts: [], totalSales: 0, totalPaid: 0, totalRemaining: 0 };
    acc[code].contracts.push(c);
    acc[code].totalSales += c.sale_price || 0;
    acc[code].totalPaid += c.paid_amount || 0;
    acc[code].totalRemaining += c.remaining_amount || 0;
    return acc;
  }, {});
  const activeSaleCurrencies = Object.keys(saleCurrencyGroups);

  const saleInvoiceByCurrency = saleInvoices.reduce((acc, inv) => {
    const code = inv.currency || 'IQD';
    if (!acc[code]) acc[code] = { total: 0, paid: 0, pending: 0, overdue: 0 };
    acc[code].total += inv.amount || 0;
    if (inv.status === 'مدفوعة') acc[code].paid += inv.amount || 0;
    else if (inv.status === 'معلقة') acc[code].pending += inv.amount || 0;
    else if (inv.status === 'متأخرة') acc[code].overdue += inv.amount || 0;
    return acc;
  }, {});

  const totalSaleInBase = saleContracts.reduce((sum, c) => sum + convertToBase(c.sale_price || 0, c.currency || 'IQD', c.currency_rate_to_iqd), 0);
  const totalSalePaidInBase = saleContracts.reduce((sum, c) => sum + convertToBase(c.paid_amount || 0, c.currency || 'IQD', c.currency_rate_to_iqd), 0);

  const filteredSaleContracts = saleContracts.filter(c => {
    const matchSearch = !saleSearch || c.buyer_name?.includes(saleSearch) || c.contract_number?.includes(saleSearch) || c.property_name?.includes(saleSearch);
    const matchCurrency = !saleFilterCurrency || (c.currency || 'IQD') === saleFilterCurrency;
    const matchStatus = !saleFilterStatus || c.status === saleFilterStatus;
    return matchSearch && matchCurrency && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-slate-800 via-slate-700 to-slate-900 px-6 py-8 lg:px-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 40%), radial-gradient(circle at 80% 20%, white 0%, transparent 30%)' }} />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4 text-white" />
              </div>
              <span className="text-slate-300 text-sm">{L('الإدارة المالية', 'بەڕێوەبردنی دارایی')}</span>
            </div>
            <h1 className="text-3xl font-black text-white">{L('القسم المالي', 'بەشی دارایی')}</h1>
          </div>
          {/* Base currency switcher */}
          <div className="bg-white/10 rounded-2xl p-4 border border-white/20 min-w-52">
            <p className="text-white/60 text-xs mb-2 font-semibold">{L('عملة العرض', 'دراوی پیشاندان')}</p>
            <div className="flex flex-wrap gap-1.5">
              {['IQD', 'USD', 'EUR'].map(code => {
                const info = getCurrencyInfo(code);
                return (
                  <button key={code} onClick={() => setBaseCurrency(code)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all', baseCurrency === code ? 'bg-white text-slate-800 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25')}>
                    {info.symbol} {code}
                  </button>
                );
              })}
              {dbCurrencies.filter(c => c.is_active && !['IQD','USD','EUR'].includes(c.code)).slice(0, 3).map(c => (
                <button key={c.code} onClick={() => setBaseCurrency(c.code)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all', baseCurrency === c.code ? 'bg-white text-slate-800 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25')}>
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insurance & Rent Financial Stats - Main Section */}
      <div className="px-4 pt-6 pb-2 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Insurance Tracking Card - IQD */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{L('التأمينات - دينار', 'پارەی دامەزراندن - دینار')}</h3>
                  <p className="text-xs text-slate-500">{iqdContracts.length} {L('عقود', 'گرێبەست')}</p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">د.ع</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-600 font-semibold">{L('المستلم', 'وەرگیراو')}</span>
                </div>
                <p className="text-lg font-black text-slate-800">{iqdReceivedInsurance.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">د.ع</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-slate-600 font-semibold">{L('المعلق', 'ڕاگیراو')}</span>
                </div>
                <p className="text-lg font-black text-slate-800">{iqdPendingInsurance.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">د.ع</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-[10px] text-slate-600 font-semibold">{L('الإجمالي', 'کۆی گشتی')}</span>
                </div>
                <p className="text-lg font-black text-slate-800">{iqdInsurance.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">د.ع</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-600 font-semibold">{L('نسبة التحصيل', 'ڕێژەی وەرگرتن')}</span>
                <span className="text-sm font-black text-slate-800">{iqdInsuranceCollectionRate}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${iqdInsuranceCollectionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Insurance Tracking Card - USD */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-black text-blue-600">$</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{L('التأمينات - دولار', 'پارەی دامەزراندن - دۆلار')}</h3>
                  <p className="text-xs text-slate-500">{usdContracts.length} {L('عقود', 'گرێبەست')}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">$</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-600 font-semibold">{L('المستلم', 'وەرگیراو')}</span>
                </div>
                <p className="text-lg font-black text-slate-800">{usdReceivedInsurance.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">$</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-slate-600 font-semibold">{L('المعلق', 'ڕاگیراو')}</span>
                </div>
                <p className="text-lg font-black text-slate-800">{usdPendingInsurance.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">$</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-[10px] text-slate-600 font-semibold">{L('الإجمالي', 'کۆی گشتی')}</span>
                </div>
                <p className="text-lg font-black text-slate-800">{usdInsurance.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">$</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-600 font-semibold">{L('نسبة التحصيل', 'ڕێژەی وەرگرتن')}</span>
                <span className="text-sm font-black text-slate-800">{usdInsuranceCollectionRate}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${usdInsuranceCollectionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Rent Flow Tracking Card - IQD */}
          <div className="rounded-3xl bg-white border-2 border-emerald-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{L('تدفق الإيجار - دينار', 'ڕەوتی کرێ - دینار')}</h3>
                  <p className="text-xs text-slate-500">{iqdContracts.length} {L('عقود', 'گرێبەست')}</p>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">د.ع</Badge>
            </div>
            
            {/* IQD Contracts Data */}
            {(() => {
              const iqdTotalAmount = iqdContracts.reduce((sum, c) => sum + (c.total_rent || 0), 0);
              const iqdPaidAmount = iqdContracts.reduce((sum, c) => {
                const paid = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
                return sum + paid;
              }, 0);
              const iqdLateAmount = iqdContracts.reduce((sum, c) => {
                const late = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'متأخرة').reduce((s, inv) => s + (inv.amount || 0), 0);
                return sum + late;
              }, 0);
              const iqdReturnedToOwner = iqdContracts.reduce((sum, c) => {
                const returned = rentInvoices.filter(inv => inv.contract_id === c.id && (inv.type === 'دفع_للمالك' || inv.type === 'استلام_من_مالك') && inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
                return sum + returned;
              }, 0);
              const iqdRemainedInCompany = iqdPaidAmount - iqdReturnedToOwner;
              
              return (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('إجمالي عقود الدينار', 'کۆی گرێبەستەکانی دینار')}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{iqdTotalAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">د.ع</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المدفوع', 'پارەدراو')}</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-700">{iqdPaidAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">د.ع</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المتأخر', 'دواکەوتوو')}</span>
                    </div>
                    <p className="text-2xl font-black text-red-700">{iqdLateAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">د.ع</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المُعاد للمالك', 'گەڕاوەتەوە بۆ خاوەن')}</span>
                    </div>
                    <p className="text-2xl font-black text-amber-700">{iqdReturnedToOwner.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">د.ع</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المتبقي بالشركة', 'ماوەتەوە لە کۆمپانیا')}</span>
                    </div>
                    <p className="text-2xl font-black text-purple-700">{iqdRemainedInCompany.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">د.ع</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Rent Flow Tracking Card - USD */}
          <div className="rounded-3xl bg-white border-2 border-blue-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{L('تدفق الإيجار - دولار', 'ڕەوتی کرێ - دۆلار')}</h3>
                  <p className="text-xs text-slate-500">{usdContracts.length} {L('عقود', 'گرێبەست')}</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">$</Badge>
            </div>
            
            {/* USD Contracts Data */}
            {(() => {
              const usdTotalAmount = usdContracts.reduce((sum, c) => sum + (c.total_rent || 0), 0);
              const usdPaidAmount = usdContracts.reduce((sum, c) => {
                const paid = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
                return sum + paid;
              }, 0);
              const usdLateAmount = usdContracts.reduce((sum, c) => {
                const late = rentInvoices.filter(inv => inv.contract_id === c.id && inv.status === 'متأخرة').reduce((s, inv) => s + (inv.amount || 0), 0);
                return sum + late;
              }, 0);
              const usdReturnedToOwner = usdContracts.reduce((sum, c) => {
                const returned = rentInvoices.filter(inv => inv.contract_id === c.id && (inv.type === 'دفع_للمالك' || inv.type === 'استلام_من_مالك') && inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
                return sum + returned;
              }, 0);
              const usdRemainedInCompany = usdPaidAmount - usdReturnedToOwner;
              
              return (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('إجمالي عقود الدولار', 'کۆی گرێبەستەکانی دۆلار')}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{usdTotalAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">$</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المدفوع', 'پارەدراو')}</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-700">{usdPaidAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">$</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المتأخر', 'دواکەوتوو')}</span>
                    </div>
                    <p className="text-2xl font-black text-red-700">{usdLateAmount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">$</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المُعاد للمالك', 'گەڕاوەتەوە بۆ خاوەن')}</span>
                    </div>
                    <p className="text-2xl font-black text-amber-700">{usdReturnedToOwner.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">$</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-sm text-slate-600 font-semibold">{L('المتبقي بالشركة', 'ماوەتەوە لە کۆمپانیا')}</span>
                    </div>
                    <p className="text-2xl font-black text-purple-700">{usdRemainedInCompany.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">$</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pt-4 pb-2 flex gap-2 bg-slate-100 max-w-7xl mx-auto">
        <button
          onClick={() => setTab('rent')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all',
            tab === 'rent' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
          )}>
          <Home className="w-4 h-4 shrink-0" />
          {L('الإيجار', 'کرێ')}
        </button>
        <button
          onClick={() => setTab('sale')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all',
            tab === 'sale' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
          )}>
          <ShoppingBag className="w-4 h-4 shrink-0" />
          {L('المبيعات', 'فرۆشتن')}
        </button>
      </div>

      <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">

        {/* ══════════════ RENT TAB ══════════════ */}
        {tab === 'rent' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {[
                { label: L('العقود النشطة', 'گرێبەستە چالاکەکان'), value: activeRentContracts.length, icon: BarChart3, color: 'bg-blue-600' },
                { label: L('إجمالي الإيجار', 'کۆی کرێ'), value: `${baseCurrencyInfo.symbol} ${Number(totalRentInBase.toFixed(0)).toLocaleString()}`, icon: Coins, color: 'bg-emerald-600' },
                { label: L('العملات النشطة', 'دراوە چالاکەکان'), value: activeRentCurrencies.length, icon: ArrowLeftRight, color: 'bg-purple-600' },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xl font-black text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Currency breakdown cards */}
            <div>
              <h2 className="text-lg font-black text-slate-700 mb-3">{L('التوزيع حسب العملة', 'دابەشکردن بەپێی دراو')}</h2>
              <p className="text-sm text-slate-500 mb-3">{activeRentCurrencies.length} {L('عملات نشطة', 'دراوی چالاک')}</p>
              {(loadingRentContracts || loadingRentInvoices) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(2)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-200 animate-pulse" />)}
                </div>
              ) : activeRentCurrencies.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                  <CircleDollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-semibold">{L('لا توجد عقود بعد', 'هیچ گرێبەستێک نییە')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeRentCurrencies.map(code => {
                    const group = rentCurrencyGroups[code];
                    const invData = rentInvoiceByCurrency[code] || {};
                    const info = getCurrencyInfo(code);
                    const colors = COLOR_MAP[info.color] || COLOR_MAP.blue;
                    const totalInBaseForGroup = group.contracts.reduce((sum, c) => sum + convertToBase(c.total_rent || 0, code, c.currency_rate_to_iqd), 0);
                    const paidPct = invData.total > 0 ? Math.round((invData.paid / invData.total) * 100) : 0;
                    return (
                      <div key={code} className="rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black', colors.badge)}>
                              {info.symbol}
                            </div>
                            <div>
                              <p className="font-black text-slate-800">{code}</p>
                              <p className="text-xs text-slate-500">{info.name}</p>
                            </div>
                          </div>
                          <Badge className={colors.badge}>{group.contracts.length} {L('عقد', 'گرێبەست')}</Badge>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{L('الإيجار الشهري', 'کرێی مانگانە')}</span>
                            <span className="font-bold">{info.symbol} {group.totalMonthly.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{L('إجمالي الإيجار', 'کۆی کرێ')}</span>
                            <span className="font-bold text-blue-700">{info.symbol} {group.totalRent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{L('التأمينات', 'پارەی دامەزراندن')}</span>
                            <span className="font-bold text-purple-700">{info.symbol} {group.totalInsurance.toLocaleString()}</span>
                          </div>
                        </div>
                        {invData.total > 0 && (
                          <>
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>{L('نسبة التحصيل', 'ڕێژەی وەرگرتن')}</span>
                                <span className="font-bold">{paidPct}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all', colors.bar)} style={{ width: `${paidPct}%` }} />
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-xs text-center">
                              <div className="bg-emerald-50 rounded-lg p-1.5">
                                <p className="font-black text-emerald-700">{info.symbol} {(invData.paid || 0).toLocaleString()}</p>
                                <p className="text-emerald-600">{L('مدفوع', 'پارەدراو')}</p>
                              </div>
                              <div className="bg-amber-50 rounded-lg p-1.5">
                                <p className="font-black text-amber-700">{info.symbol} {(invData.pending || 0).toLocaleString()}</p>
                                <p className="text-amber-600">{L('معلق', 'ڕاگیراو')}</p>
                              </div>
                              <div className="bg-red-50 rounded-lg p-1.5">
                                <p className="font-black text-red-700">{info.symbol} {(invData.overdue || 0).toLocaleString()}</p>
                                <p className="text-red-600">{L('متأخر', 'دواکەوتوو')}</p>
                              </div>
                            </div>
                          </>
                        )}
                        {code !== baseCurrency && (
                          <div className="pt-3 border-t border-slate-100 mt-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                              <RefreshCw className="w-3 h-3" />
                              {L(`ما يعادل بـ${baseCurrency}`, `هاوەڵی ${baseCurrency}`)}
                            </div>
                            <p className="font-black text-slate-700">
                              {baseCurrencyInfo.symbol} {totalInBaseForGroup.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rent contracts table */}
            <div>
              <h2 className="text-lg font-black text-slate-700 mb-3">{L('عقود الإيجار', 'گرێبەستەکانی کرێ')}</h2>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={rentSearch} onChange={e => setRentSearch(e.target.value)} placeholder={L('بحث...', 'گەڕان...')} className="pr-9 h-9 rounded-xl border-slate-200" />
                </div>
                <select value={rentFilterStatus} onChange={e => setRentFilterStatus(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-slate-400 cursor-pointer">
                  <option value="">{L('كل الحالات', 'هەموو دۆخەکان')}</option>
                  {['نشط', 'منتهي', 'ملغي', 'معلق'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('رقم العقد', 'ژمارەی گرێبەست')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('المستأجر', 'کرێچی')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('العقار', 'خانوو')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('العملة', 'دراو')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('الإيجار الشهري', 'کرێی مانگانە')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('إجمالي الإيجار', 'کۆی کرێ')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('التأمين', 'پارەی دامەزراندن')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L(`المكافئ (${baseCurrency})`, `هاوەڵ (${baseCurrency})`)}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('الحالة', 'دۆخ')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(loadingRentContracts || loadingRentInvoices) ? (
                        <tr><td colSpan={9} className="text-center py-8 text-slate-400">{L('جاري التحميل...', 'باركردن...')}</td></tr>
                      ) : filteredRentContracts.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-10 text-slate-400">{L('لا توجد نتائج', 'هیچ ئەنجامێک نییە')}</td></tr>
                      ) : filteredRentContracts.map(c => {
                        const code = c.currency || 'IQD';
                        const info = getCurrencyInfo(code);
                        const colors = COLOR_MAP[info.color] || COLOR_MAP.blue;
                        const inBase = convertToBase(c.total_rent || 0, code, c.currency_rate_to_iqd);
                        const statusColors = { 'نشط': 'bg-emerald-100 text-emerald-800', 'منتهي': 'bg-slate-100 text-slate-700', 'ملغي': 'bg-red-100 text-red-800', 'معلق': 'bg-amber-100 text-amber-800' };
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-primary">{c.contract_number}</td>
                            <td className="px-4 py-3 text-slate-700">{c.tenant_name}</td>
                            <td className="px-4 py-3 text-slate-600">{c.property_name}</td>
                            <td className="px-4 py-3">
                              <span className={cn('text-xs font-bold px-2 py-1 rounded-full', colors.badge)}>{info.symbol} {code}</span>
                            </td>
                            <td className="px-4 py-3 font-bold">{info.symbol} {(c.monthly_rent || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 font-semibold text-blue-700">{info.symbol} {(c.total_rent || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-purple-700 font-semibold">{info.symbol} {(c.insurance_amount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {code !== baseCurrency ? `${baseCurrencyInfo.symbol} ${inBase.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('text-xs font-bold px-2 py-1 rounded-full', statusColors[c.status] || 'bg-gray-100 text-gray-700')}>{c.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════ SALE TAB ══════════════ */}
        {tab === 'sale' && (
          <>
            {/* Summary stat row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: L('إجمالي المبيعات', 'کۆی فرۆشتن'), value: `${baseCurrencyInfo.symbol} ${Number(totalSaleInBase.toFixed(0)).toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-600' },
                { label: L('المبلغ المُحصَّل', 'بڕی وەرگیراو'), value: `${baseCurrencyInfo.symbol} ${Number(totalSalePaidInBase.toFixed(0)).toLocaleString()}`, icon: Coins, color: 'bg-blue-600' },
                { label: L('عدد العقود', 'ژمارەی گرێبەست'), value: saleContracts.length, icon: BarChart3, color: 'bg-purple-600', noFormat: true },
                { label: L('العملات النشطة', 'دراوە چالاکەکان'), value: activeSaleCurrencies.length, icon: ArrowLeftRight, color: 'bg-amber-600', noFormat: true },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xl font-black text-slate-800">{stat.noFormat ? stat.value : stat.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Currency breakdown cards */}
            <div>
              <h2 className="text-lg font-black text-slate-700 mb-3">{L('التوزيع حسب العملة', 'دابەشکردن بەپێی دراو')}</h2>
              {(loadingSaleContracts || loadingSaleInvoices) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-200 animate-pulse" />)}
                </div>
              ) : activeSaleCurrencies.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                  <CircleDollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-semibold">{L('لا توجد عقود بعد', 'هیچ گرێبەستێک نییە')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSaleCurrencies.map(code => {
                    const group = saleCurrencyGroups[code];
                    const invData = saleInvoiceByCurrency[code] || {};
                    const info = getCurrencyInfo(code);
                    const colors = COLOR_MAP[info.color] || COLOR_MAP.blue;
                    const totalInBaseForGroup = group.contracts.reduce((sum, c) => sum + convertToBase(c.sale_price || 0, code, c.currency_rate_to_iqd), 0);
                    const paidPct = group.totalSales > 0 ? Math.round((group.totalPaid / group.totalSales) * 100) : 0;
                    return (
                      <div key={code} className="rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black', colors.badge)}>
                              {info.symbol}
                            </div>
                            <div>
                              <p className="font-black text-slate-800">{code}</p>
                              <p className="text-xs text-slate-500">{info.name}</p>
                            </div>
                          </div>
                          <Badge className={colors.badge}>{group.contracts.length} {L('عقد', 'گرێبەست')}</Badge>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{L('إجمالي', 'کۆ')}</span>
                            <span className="font-bold">{info.symbol} {group.totalSales.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{L('المحصَّل', 'وەرگیراو')}</span>
                            <span className="font-bold text-emerald-600">{info.symbol} {group.totalPaid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{L('المتبقي', 'ماوە')}</span>
                            <span className="font-bold text-red-600">{info.symbol} {group.totalRemaining.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{L('نسبة التحصيل', 'ڕێژەی وەرگرتن')}</span>
                            <span className="font-bold">{paidPct}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', colors.bar)} style={{ width: `${paidPct}%` }} />
                          </div>
                        </div>
                        {code !== baseCurrency && (
                          <div className="pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                              <RefreshCw className="w-3 h-3" />
                              {L(`ما يعادل بـ${baseCurrency}`, `هاوەڵی ${baseCurrency}`)}
                            </div>
                            <p className="font-black text-slate-700">
                              {baseCurrencyInfo.symbol} {totalInBaseForGroup.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        {invData.total > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-xs text-center">
                            <div className="bg-emerald-50 rounded-lg p-1.5">
                              <p className="font-black text-emerald-700">{info.symbol} {(invData.paid || 0).toLocaleString()}</p>
                              <p className="text-emerald-600">{L('مدفوع', 'پارەدراو')}</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-1.5">
                              <p className="font-black text-amber-700">{info.symbol} {(invData.pending || 0).toLocaleString()}</p>
                              <p className="text-amber-600">{L('معلق', 'ڕاگیراو')}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-1.5">
                              <p className="font-black text-red-700">{info.symbol} {(invData.overdue || 0).toLocaleString()}</p>
                              <p className="text-red-600">{L('متأخر', 'دواکەوتوو')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sale contracts table */}
            <div>
              <h2 className="text-lg font-black text-slate-700 mb-3">{L('تفاصيل عقود المبيعات', 'وردەکارییەکانی گرێبەستی فرۆشتن')}</h2>
              <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-4 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input value={saleSearch} onChange={e => setSaleSearch(e.target.value)} placeholder={L('بحث...', 'گەڕان...')} className="pr-9 h-9 rounded-xl border-slate-200" />
                </div>
                <select value={saleFilterCurrency} onChange={e => setSaleFilterCurrency(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none cursor-pointer">
                  <option value="">{L('كل العملات', 'هەموو دراوەکان')}</option>
                  {activeSaleCurrencies.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
                <select value={saleFilterStatus} onChange={e => setSaleFilterStatus(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none cursor-pointer">
                  <option value="">{L('كل الحالات', 'هەموو دۆخەکان')}</option>
                  {['نشط', 'مكتمل', 'معلق', 'ملغي'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('رقم العقد', 'ژمارەی گرێبەست')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('المشتري', 'کڕیار')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('العقار', 'خانوو')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('العملة', 'دراو')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('سعر البيع', 'نرخی فرۆشتن')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('المحصَّل', 'وەرگیراو')}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L(`المكافئ (${baseCurrency})`, `هاوەڵ (${baseCurrency})`)}</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-600 whitespace-nowrap">{L('الحالة', 'دۆخ')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSaleContracts.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-10 text-slate-400">{L('لا توجد نتائج', 'هیچ ئەنجامێک نییە')}</td></tr>
                      ) : filteredSaleContracts.map(c => {
                        const code = c.currency || 'IQD';
                        const info = getCurrencyInfo(code);
                        const colors = COLOR_MAP[info.color] || COLOR_MAP.blue;
                        const inBase = convertToBase(c.sale_price || 0, code, c.currency_rate_to_iqd);
                        const statusColors = { 'نشط': 'bg-emerald-100 text-emerald-800', 'مكتمل': 'bg-blue-100 text-blue-800', 'معلق': 'bg-amber-100 text-amber-800', 'ملغي': 'bg-red-100 text-red-800' };
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-primary">{c.contract_number}</td>
                            <td className="px-4 py-3 text-slate-700">{c.buyer_name}</td>
                            <td className="px-4 py-3 text-slate-600">{c.property_name}</td>
                            <td className="px-4 py-3">
                              <span className={cn('text-xs font-bold px-2 py-1 rounded-full', colors.badge)}>{info.symbol} {code}</span>
                            </td>
                            <td className="px-4 py-3 font-bold">{info.symbol} {(c.sale_price || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-emerald-700 font-semibold">{info.symbol} {(c.paid_amount || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {code !== baseCurrency ? `${baseCurrencyInfo.symbol} ${inBase.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('text-xs font-bold px-2 py-1 rounded-full', statusColors[c.status] || 'bg-gray-100 text-gray-700')}>{c.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {filteredSaleContracts.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-200 font-black">
                          <td colSpan={4} className="px-4 py-3 text-slate-700">{L('المجموع', 'کۆ')} ({filteredSaleContracts.length})</td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-emerald-700">
                            {Object.entries(filteredSaleContracts.reduce((acc, c) => {
                              const code = c.currency || 'IQD';
                              if (!acc[code]) acc[code] = { paid: 0, symbol: getCurrencyInfo(code).symbol };
                              acc[code].paid += c.paid_amount || 0;
                              return acc;
                            }, {})).map(([code, d]) => (
                              <div key={code} className="whitespace-nowrap">{d.symbol} {d.paid.toLocaleString()}</div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {baseCurrencyInfo.symbol} {filteredSaleContracts.reduce((sum, c) => sum + convertToBase(c.sale_price || 0, c.currency || 'IQD', c.currency_rate_to_iqd), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}