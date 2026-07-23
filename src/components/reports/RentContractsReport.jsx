import React, { useState, useMemo } from 'react';
import { differenceInMonths, parseISO, isValid, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { Download, Filter, Search, Shield, TrendingUp, TrendingDown, Building2, Users, Coins, ChevronDown, ChevronUp, Circle, Printer, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function calcContractStats(contract, invoices) {
  const today = new Date();
  const start = contract.start_date ? parseISO(contract.start_date) : null;
  const end = contract.end_date ? parseISO(contract.end_date) : null;
  const duration = contract.duration_months || (start && end ? Math.max(1, differenceInMonths(end, start)) : 0);
  const interval = contract.payment_interval_months || 1;
  const currentMonth = start && isValid(start) ? Math.min(Math.max(1, differenceInMonths(today, start) + 1), duration) : '—';
  const rentInvoices = invoices.filter(inv => inv.contract_id === contract.id && (inv.type === 'إيجار' || inv.type === 'کرێ'));
  const paidInvoices = rentInvoices.filter(inv => inv.status === 'مدفوعة');
  const monthsPaid = paidInvoices.length * interval;
  const monthsRemained = Math.max(0, duration - monthsPaid);
  const returnedToOwner = invoices.filter(inv => inv.contract_id === contract.id && (inv.type === 'دفع_للمالك' || inv.type === 'استلام_من_مالك') && inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
  const collectedFromTenant = paidInvoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  const remainedInCompany = collectedFromTenant - returnedToOwner;
  const insuranceInvoices = invoices.filter(inv => inv.contract_id === contract.id && (inv.type === 'تأمين' || inv.type_ku === 'دڵنیایی'));
  const insuranceReceived = insuranceInvoices.filter(inv => inv.status === 'مدفوعة').reduce((s, inv) => s + (inv.amount || 0), 0);
  const insuranceTotal = contract.insurance_amount || 0;
  const insuranceRemained = Math.max(0, insuranceTotal - insuranceReceived);
  const insuranceRefunded = (contract.insurance_refund_amount != null && contract.insurance_refund_amount > 0)
    ? contract.insurance_refund_amount
    : (contract.insurance_status === 'مسترد' ? insuranceTotal : 0);
  const insuranceConfiscated = (contract.insurance_confiscated_amount != null && contract.insurance_confiscated_amount > 0)
    ? contract.insurance_confiscated_amount
    : (contract.insurance_status === 'مصادر' ? insuranceTotal : 0);
  return { duration, currentMonth, monthsPaid, monthsRemained, returnedToOwner, collectedFromTenant, remainedInCompany, insuranceReceived, insuranceRemained, insuranceRefunded, insuranceConfiscated };
}

const STATUS_CONFIG = {
  'نشط':   { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'border-emerald-500/30', ku: 'چالاک' },
  'منتهي': { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', border: 'border-amber-500/30', ku: 'کۆتاییهاتوو' },
  'ملغي':  { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'border-red-500/30', ku: 'هەڵوەشێنراوە' },
  'معلق':  { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8', border: 'border-slate-500/30', ku: 'ڕاگیراو' },
};

function StatusBadge({ status, L }) {
  const cfg = STATUS_CONFIG[status] || { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8', border: 'border-slate-500/30', ku: status };
  const displayStatus = L(status, cfg.ku || status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.border}`} style={{ background: cfg.bg, color: cfg.text }}>
      {displayStatus}
    </span>
  );
}

function MiniProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-[#E9ECEF] rounded-full h-2 mt-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#4A4E69' }} />
    </div>
  );
}

function DatePicker({ value, onChange, placeholder, L }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? parseISO(value) : new Date());

  const selected = value ? parseISO(value) : null;

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const startPad = getDay(startOfMonth(viewDate)); // 0=Sun
  const weekDays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const handleSelect = (day) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const clear = (e) => { e.stopPropagation(); onChange(''); };

  return (
    <div className="relative">
      <button onClick={() => { setOpen(o => !o); setViewDate(selected || new Date()); }}
        className="flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all min-w-[130px] select-none">
        <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>{selected ? format(selected, 'yyyy/MM/dd') : placeholder}</span>
        {selected && <X className="w-3 h-3 text-slate-400 hover:text-red-500 mr-auto" onClick={clear} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" style={{ background: 'linear-gradient(145deg, #1e3a5f, #0f2344)', minWidth: 260, left: 0 }}>
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-600">
              <button onClick={() => setViewDate(d => subMonths(d, 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white hover:bg-white/15 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-white font-bold text-sm">{format(viewDate, 'MMMM yyyy')}</span>
              <button onClick={() => setViewDate(d => addMonths(d, 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white hover:bg-white/15 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-3 pt-2">
              {weekDays.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 pb-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
              {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map(day => {
                const isSelected = selected && isSameDay(day, selected);
                const isToday = isSameDay(day, new Date());
                return (
                  <button key={day.toString()} onClick={() => handleSelect(day)}
                    className={`h-8 w-8 mx-auto rounded-xl text-xs font-semibold transition-all flex items-center justify-center
                      ${isSelected ? 'bg-indigo-500 text-white shadow-lg scale-110' : isToday ? 'bg-white/20 text-white font-black' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Clear button */}
            {selected && (
              <div className="px-3 pb-3">
                <button onClick={() => { onChange(''); setOpen(false); }}
                  className="w-full py-1.5 rounded-xl text-xs font-bold text-red-300 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                  {L('مسح التاريخ', 'پاككردنەوەی بەروار')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryKpiCard({ label, value, symbol, gradient, icon: Icon }) {
  return (
    <div className="relative rounded-2xl p-4 border border-slate-600 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl" style={{ background: 'rgba(15, 35, 68, 0.4)' }}>
      <div className="absolute inset-0 opacity-100 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${gradient[0]}25, ${gradient[1]}35)` }} />
      <div className="absolute inset-0 opacity-15" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.08) 100%)' }} />
      <div className="relative flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-lg font-black text-white relative">{typeof value === 'number' ? value.toLocaleString() : value} <span className="text-xs font-normal text-slate-400">{symbol}</span></p>
      <p className="text-xs text-slate-400 mt-0.5 relative">{label}</p>
    </div>
  );
}

export default function RentContractsReport({ contracts, invoices, L, handleExportCSV, handlePrint, handleDownloadPDF }) {
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState('contract_number');
  const [sortDir, setSortDir] = useState('asc');

  const iqdContracts = useMemo(() => contracts.filter(c => { const cur = c.currency || 'IQD'; return cur === 'IQD' || cur === 'د.ع'; }), [contracts]);
  const usdContracts = useMemo(() => contracts.filter(c => { const cur = c.currency || 'IQD'; return cur === 'USD' || cur === '$'; }), [contracts]);

  const filterContracts = (list) => list.filter(c => {
    const matchSearch = !search || c.tenant_name?.includes(search) || c.contract_number?.includes(search) || c.property_name?.includes(search);
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchOwner = !ownerFilter || (c.owner_name || '').toLowerCase().includes(ownerFilter.toLowerCase());
    const matchTenant = !tenantFilter || (c.tenant_name || '').toLowerCase().includes(tenantFilter.toLowerCase());
    const matchProperty = !propertyFilter || (c.property_name || '').toLowerCase().includes(propertyFilter.toLowerCase()) || (c.contract_number || '').includes(propertyFilter);
    const matchDateFrom = !dateFrom || (c.start_date && c.start_date >= dateFrom);
    const matchDateTo = !dateTo || (c.start_date && c.start_date <= dateTo);
    return matchSearch && matchStatus && matchOwner && matchTenant && matchProperty && matchDateFrom && matchDateTo;
  });

  const filteredIQD = filterContracts(iqdContracts);
  const filteredUSD = filterContracts(usdContracts);

  const exportData = (list, symbol) => list.map(c => {
    const s = calcContractStats(c, invoices);
    return { contract_number: c.contract_number, tenant: c.tenant_name, property: c.property_name, status: c.status, start_date: c.start_date, end_date: c.end_date, duration_months: s.duration, current_month: s.currentMonth, months_paid: s.monthsPaid, months_remained: s.monthsRemained, insurance_total: c.insurance_amount || 0, insurance_received: s.insuranceReceived, insurance_remained: s.insuranceRemained, insurance_refunded: s.insuranceRefunded, insurance_confiscated: s.insuranceConfiscated, collected_from_tenant: s.collectedFromTenant, returned_to_owner: s.returnedToOwner, remained_in_company: s.remainedInCompany, currency: symbol };
  });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortTh = ({ colKey, children }) => (
  <th className="text-center p-4 font-semibold text-white text-sm whitespace-nowrap cursor-pointer select-none hover:bg-white/15 transition-colors" onClick={() => handleSort(colKey)}>
    <div className="flex items-center gap-1 justify-center">
      {children}
      {sortKey === colKey ? (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-70" />}
    </div>
  </th>
  );

  const ContractTable = ({ list, symbol, title, accentColor, accentGradient, tableId }) => {
    const totals = list.reduce((acc, c) => {
      const s = calcContractStats(c, invoices);
      acc.insurance += c.insurance_amount || 0;
      acc.insuranceReceived += s.insuranceReceived;
      acc.insuranceRemained += s.insuranceRemained;
      acc.insuranceRefunded += s.insuranceRefunded;
      acc.insuranceConfiscated += s.insuranceConfiscated;
      acc.collected += s.collectedFromTenant;
      acc.returned += s.returnedToOwner;
      acc.remained += s.remainedInCompany;
      return acc;
    }, { insurance: 0, insuranceReceived: 0, insuranceRemained: 0, insuranceRefunded: 0, insuranceConfiscated: 0, collected: 0, returned: 0, remained: 0 });

    const sortedList = [...list].sort((a, b) => {
      const sa = calcContractStats(a, invoices);
      const sb = calcContractStats(b, invoices);
      let va = sortKey === 'currentMonth' ? sa.currentMonth : sortKey === 'monthsPaid' ? sa.monthsPaid : sortKey === 'monthsRemained' ? sa.monthsRemained : sortKey === 'insuranceReceived' ? sa.insuranceReceived : sortKey === 'insuranceRemained' ? sa.insuranceRemained : sortKey === 'insuranceRefunded' ? sa.insuranceRefunded : sortKey === 'insuranceConfiscated' ? sa.insuranceConfiscated : sortKey === 'collectedFromTenant' ? sa.collectedFromTenant : sortKey === 'returnedToOwner' ? sa.returnedToOwner : sortKey === 'remainedInCompany' ? sa.remainedInCompany : a[sortKey] ?? '';
      let vb = sortKey === 'currentMonth' ? sb.currentMonth : sortKey === 'monthsPaid' ? sb.monthsPaid : sortKey === 'monthsRemained' ? sb.monthsRemained : sortKey === 'insuranceReceived' ? sb.insuranceReceived : sortKey === 'insuranceRemained' ? sb.insuranceRemained : sortKey === 'insuranceRefunded' ? sb.insuranceRefunded : sortKey === 'insuranceConfiscated' ? sb.insuranceConfiscated : sortKey === 'collectedFromTenant' ? sb.collectedFromTenant : sortKey === 'returnedToOwner' ? sb.returnedToOwner : sortKey === 'remainedInCompany' ? sb.remainedInCompany : b[sortKey] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const kpiCards = [
      { label: L('التأمينات الكلية', 'کۆی دڵنیایی'), value: totals.insurance, gradient: ['#6C5CE7', '#5A4AD1'], icon: Shield },
      { label: L('تأمين مستلم', 'دڵنیایی وەرگیراو'), value: totals.insuranceReceived, gradient: ['#2A9D8F', '#21867a'], icon: TrendingUp },
      { label: L('تأمين متبقي', 'دڵنیایی ماوە'), value: totals.insuranceRemained, gradient: ['#E63946', '#c1121f'], icon: TrendingDown },
      { label: L('مُسترد للمستأجر', 'گەڕاوەتەوە'), value: totals.insuranceRefunded, gradient: ['#0984E3', '#0769b5'], icon: Users },
      { label: L('مصادرة التأمين', 'مووچەکردنی دڵنیایی'), value: totals.insuranceConfiscated, gradient: ['#F77F00', '#d66800'], icon: Shield },
      { label: L('المحصل (إيجار)', 'کرێی کۆکراوە'), value: totals.collected, gradient: ['#2A9D8F', '#21867a'], icon: Coins },
      { label: L('للمالك', 'بۆ خاوەن'), value: totals.returned, gradient: ['#F9C74F', '#e0b040'], icon: Building2 },
      { label: L('بالشركة', 'لە کۆمپانیا'), value: totals.remained, gradient: ['#6C5CE7', '#5A4AD1'], icon: TrendingUp },
    ];

    return (
      <div id={tableId} className="rounded-3xl overflow-hidden shadow-xl border border-slate-200">
        {/* Header - Glassy style matching KPI boxes */}
        <div className="relative px-6 py-5 overflow-hidden backdrop-blur-xl border-b border-slate-600" style={{ background: `linear-gradient(135deg, ${accentGradient[0]}, ${accentGradient[1]})` }}>
          <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.08) 100%)' }} />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            {/* Title row */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-xl ring-2 ring-white/20" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)' }}>
                <Coins className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-white text-sm sm:text-xl tracking-tight drop-shadow-lg leading-tight truncate max-w-[180px] sm:max-w-none">{title}</h3>
                <p className="text-white/90 text-xs sm:text-sm font-bold mt-2">{list.length} {L('عقد', 'گرێبەست')} <span className="text-white/60">•</span> <span className="font-bold">{symbol}</span></p>
              </div>
            </div>
            {/* Buttons row */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button size="sm" variant="ghost" className="relative text-white hover:bg-white/25 text-xs font-bold gap-1 rounded-xl border border-white/40 backdrop-blur-md transition-all px-3"
                onClick={() => handlePrint(tableId)}>
                <Printer className="w-3.5 h-3.5" strokeWidth={2.5} /> {L('طباعة', 'چاپکردن')}
              </Button>
              <Button size="sm" variant="ghost" className="relative text-white hover:bg-white/25 text-xs font-bold gap-1 rounded-xl border border-white/40 backdrop-blur-md transition-all px-3"
                onClick={() => handleDownloadPDF(tableId, `rent_contracts_${symbol}`)}>
                <Download className="w-3.5 h-3.5" strokeWidth={2.5} /> PDF
              </Button>
              <Button size="sm" variant="ghost" className="relative text-white hover:bg-white/25 text-xs font-bold gap-1 rounded-xl border border-white/40 backdrop-blur-md transition-all px-3"
                onClick={() => handleExportCSV(exportData(list, symbol), `rent_contracts_${symbol}`)}>
                <Download className="w-3.5 h-3.5" strokeWidth={2.5} /> CSV
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4" style={{ background: '#0f2344' }}>
          {kpiCards.map((k, i) => (
            <SummaryKpiCard key={i} label={k.label} value={k.value} symbol={symbol} gradient={k.gradient} icon={k.icon} />
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto" style={{ background: '#12274b' }}>
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-slate-500" style={{ background: '#36165e', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <SortTh colKey="contract_number"><span className="font-bold text-xs text-white uppercase tracking-wide">{L('رقم العقد', 'ژمارەی گرێبەست')}</span></SortTh>
                <SortTh colKey="tenant_name"><span className="font-bold text-xs">{L('المستأجر', 'کرێچی')}</span></SortTh>
                <SortTh colKey="property_name"><span className="font-bold text-xs">{L('العقار', 'خانووبەرە')}</span></SortTh>
                <SortTh colKey="status"><span className="font-bold text-xs">{L('الحالة', 'دۆخ')}</span></SortTh>
                <SortTh colKey="duration_months"><span className="font-bold text-xs">{L('المدة', 'ماوە')}</span></SortTh>
                <SortTh colKey="currentMonth"><span className="font-bold text-xs">{L('الشهر الحالي', 'مانگی ئێستا')}</span></SortTh>
                <SortTh colKey="monthsPaid"><span className="font-bold text-xs">{L('مدفوع (شهر)', 'مانگی پارەدراو')}</span></SortTh>
                <SortTh colKey="monthsRemained"><span className="font-bold text-xs">{L('متبقي (شهر)', 'مانگی ماوە')}</span></SortTh>
                <SortTh colKey="end_date"><span className="font-bold text-xs">{L('الانتهاء', 'کۆتایی')}</span></SortTh>
                <SortTh colKey="insurance_amount"><span className="font-bold text-xs">{L('التأمين الكلي', 'کۆی دڵنیایی')}</span></SortTh>
                <SortTh colKey="insuranceReceived"><span className="font-bold text-xs">{L('تأمين مستلم', 'دڵنیایی وەرگیراو')}</span></SortTh>
                <SortTh colKey="insuranceRemained"><span className="font-bold text-xs">{L('تأمين متبقي', 'دڵنیایی ماوە')}</span></SortTh>
                <SortTh colKey="insuranceRefunded"><span className="font-bold text-xs">{L('مُسترد', 'گەڕاوەتەوە')}</span></SortTh>
                <SortTh colKey="insuranceConfiscated"><span className="font-bold text-xs">{L('مصادرة', 'مووچەکراو')}</span></SortTh>
                <SortTh colKey="collectedFromTenant"><span className="font-bold text-xs">{L('محصل (إيجار)', 'کرێی کۆکراوە')}</span></SortTh>
                <SortTh colKey="returnedToOwner"><span className="font-bold text-xs">{L('للمالك', 'بۆ خاوەن')}</span></SortTh>
                <SortTh colKey="remainedInCompany"><span className="font-bold text-xs">{L('بالشركة', 'لە کۆمپانیا')}</span></SortTh>
              </tr>
            </thead>
            <tbody>
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={17} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                        <Coins className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-400 font-medium">{L('لا توجد نتائج', 'هیچ ئەنجامێک نییە')}</p>
                    </div>
                  </td>
                </tr>
              ) : sortedList.map((c, idx) => {
                const s = calcContractStats(c, invoices);
                const progressPct = s.duration > 0 ? Math.round((s.monthsPaid / s.duration) * 100) : 0;
                return (
                  <tr key={c.id} className={`hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? 'bg-[#0f2344]' : 'bg-[#0d1f3d]'}`} style={{ height: '56px' }}>
                    {/* Contract # */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50">
                      <span className="font-bold text-indigo-400 text-sm">{c.contract_number}</span>
                    </td>
                    {/* Tenant */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                          {(c.tenant_name || '?').charAt(0)}
                        </div>
                        <span className="font-semibold text-white text-sm">{c.tenant_name}</span>
                      </div>
                    </td>
                    {/* Property */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50">
                      <span className="text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1.5 rounded-lg inline-block shadow-md">{c.property_name}</span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50"><StatusBadge status={c.status} L={L} /></td>
                    {/* Duration */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-slate-300 text-sm text-center">{s.duration} {L('شهر','مانگ')}</td>
                    {/* Current month */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-slate-300 text-sm text-center">{s.currentMonth}</td>
                    {/* Months paid */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-slate-300 text-sm text-center">{s.monthsPaid}</td>
                    {/* Months remained */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-slate-300 text-sm text-center">{s.monthsRemained}</td>
                    {/* End date */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-slate-400 text-sm">{c.end_date || '—'}</td>
                    {/* Insurance cols */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      <span className="font-black text-white">{(c.insurance_amount || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      <span className="font-black text-emerald-400">{s.insuranceReceived.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      <span className={`font-black ${s.insuranceRemained > 0 ? 'text-red-400' : 'text-slate-400'}`}>{s.insuranceRemained.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      {s.insuranceRefunded > 0
                        ? <span className="font-black text-blue-400">{s.insuranceRefunded.toLocaleString()}</span>
                        : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      {s.insuranceConfiscated > 0
                        ? <span className="font-black text-orange-400">{s.insuranceConfiscated.toLocaleString()}</span>
                        : <span className="text-slate-500">—</span>}
                    </td>
                    {/* Rent collected */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      <span className="font-black text-emerald-400">{s.collectedFromTenant.toLocaleString()}</span>
                    </td>
                    {/* Returned to owner */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      <span className="font-black text-amber-400">{s.returnedToOwner.toLocaleString()}</span>
                    </td>
                    {/* Remained in company */}
                    <td className="px-4 py-5 whitespace-nowrap border-b border-slate-700/50 text-center">
                      <span className="font-black text-indigo-400">{s.remainedInCompany.toLocaleString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Footer Row */}
            {sortedList.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                  <td colSpan={9} className="p-4 text-white font-black text-xs">{L('الإجماليات', 'کۆی گشتی')} ({sortedList.length} {L('عقد','گرێبەست')})</td>
                  <td className="p-4 whitespace-nowrap border-r border-slate-600 text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.insurance.toLocaleString()}</span></td>
                  <td className="p-4 whitespace-nowrap border-r border-slate-600 text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.insuranceReceived.toLocaleString()}</span></td>
                  <td className="p-4 whitespace-nowrap border-r border-slate-600 text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.insuranceRemained.toLocaleString()}</span></td>
                  <td className="p-4 whitespace-nowrap border-r border-slate-600 text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.insuranceRefunded.toLocaleString()}</span></td>
                  <td className="p-4 whitespace-nowrap border-r border-slate-600 text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.insuranceConfiscated.toLocaleString()}</span></td>
                  <td className="p-4 whitespace-nowrap border-r border-slate-600 text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.collected.toLocaleString()}</span></td>
                  <td className="p-4 whitespace-nowrap border-r border-slate-600 text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.returned.toLocaleString()}</span></td>
                  <td className="p-4 whitespace-nowrap text-center"><span className="bg-white/20 text-white border border-white/30 px-3 py-1.5 rounded-xl text-xs font-black inline-block shadow-sm">{totals.remained.toLocaleString()}</span></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  };

  const allFiltered = [...filteredIQD, ...filteredUSD];
  const displayList = currencyFilter === 'USD' ? filteredUSD : currencyFilter === 'IQD' ? filteredIQD : allFiltered;

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        {/* Row 1: Currency, Status, General Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-semibold">{L('تصفية:', 'فلتەر:')}</span>
          </div>

          {/* Currency pills */}
          <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
            {[
              { val: 'all', ar: 'الكل', ku: 'هەموو' },
              { val: 'IQD', ar: 'دينار', ku: 'دینار' },
              { val: 'USD', ar: 'دولار', ku: 'دۆلار' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setCurrencyFilter(opt.val)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${currencyFilter === opt.val ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {L(opt.ar, opt.ku)}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Status filter */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 outline-none focus:border-indigo-300 cursor-pointer">
            <option value="">{L('كل الحالات', 'هەموو دۆخەکان')}</option>
            {['نشط', 'منتهي', 'ملغي', 'معلق'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* General Search */}
          <div className="relative flex-1 min-w-52">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={L('بحث عام...', 'گەڕانی گشتی...')}
              className="w-full h-9 pr-9 pl-3 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50" />
          </div>
        </div>

        {/* Row 2: Owner, Tenant, Property, Date range */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Owner name */}
          <div className="relative min-w-44 flex-1">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">{L('المالك', 'خاوەن')}</span>
            <input value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
              placeholder={L('اسم المالك...', 'ناوی خاوەن...')}
              className="w-full h-9 pr-14 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50" />
          </div>

          {/* Tenant name */}
          <div className="relative min-w-44 flex-1">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">{L('المستأجر', 'کرێچی')}</span>
            <input value={tenantFilter} onChange={e => setTenantFilter(e.target.value)}
              placeholder={L('اسم المستأجر...', 'ناوی کرێچی...')}
              className="w-full h-9 pr-16 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50" />
          </div>

          {/* Property code / name */}
          <div className="relative min-w-44 flex-1">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">{L('العقار', 'خانوو')}</span>
            <input value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
              placeholder={L('اسم أو كود العقار...', 'ناو یان کۆدی خانوو...')}
              className="w-full h-9 pr-14 pl-3 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50" />
          </div>

          {/* Date from */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">{L('من:', 'لە:')}</span>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder={L('تاريخ البداية', 'بەرواری دەستپێک')} L={L} />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">{L('إلى:', 'بۆ:')}</span>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder={L('تاريخ الانتهاء', 'بەرواری کۆتایی')} L={L} />
          </div>

          {/* Clear all filters */}
          {(ownerFilter || tenantFilter || propertyFilter || dateFrom || dateTo) && (
            <button onClick={() => { setOwnerFilter(''); setTenantFilter(''); setPropertyFilter(''); setDateFrom(''); setDateTo(''); }}
              className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors whitespace-nowrap">
              {L('مسح الكل', 'پاككردنەوە')}
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI row - Glassy appearance with strong gradients */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: L('إجمالي العقود', 'کۆی گرێبەستەکان'), value: displayList.length, gradient: ['#818cf8', '#4338ca'] },
          { label: L('عقود الدينار', 'گرێبەستی دینار'), value: filteredIQD.length, gradient: ['#fbbf24', '#b45309'] },
          { label: L('عقود الدولار', 'گرێبەستی دۆلار'), value: filteredUSD.length, gradient: ['#60a5fa', '#1d4ed8'] },
          { label: L('النشطة', 'چالاکەکان'), value: displayList.filter(c => c.status === 'نشط').length, gradient: ['#34d399', '#047857'] },
        ].map((s, i) => (
          <div key={i} className="relative rounded-2xl p-5 shadow-xl overflow-hidden backdrop-blur-xl border border-slate-600" style={{ background: `linear-gradient(135deg, ${s.gradient[0]} 0%, ${s.gradient[1]} 100%)` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)' }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-8" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2), transparent)' }} />
            <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.08) 100%)' }} />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mb-4 backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <Coins className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-4xl font-black text-white mb-2">{s.value}</p>
              <p className="text-sm font-bold text-white/90">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* IQD Table */}
      {(currencyFilter === 'all' || currencyFilter === 'IQD') && (
        <ContractTable
          list={filteredIQD}
          symbol="د.ع"
          title={L('عقود الإيجار — دينار عراقي (IQD)', 'گرێبەستەکانی کرێ — دینار عێراقی (IQD)')}
          accentColor="#1e3a5f"
          accentGradient={['#1e3a5f', '#0f2344']}
          tableId="rent_contracts_iqd"
        />
      )}

      {/* USD Table */}
      {(currencyFilter === 'all' || currencyFilter === 'USD') && (
        <ContractTable
          list={filteredUSD}
          symbol="$"
          title={L('عقود الإيجار — دولار أمريكي (USD)', 'گرێبەستەکانی کرێ — دۆلاری ئەمریکی (USD)')}
          accentColor="#1e3a5f"
          accentGradient={['#1e3a5f', '#0f2344']}
          tableId="rent_contracts_usd"
        />
      )}
    </div>
  );
}