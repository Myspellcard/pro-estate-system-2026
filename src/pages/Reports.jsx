import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, differenceInMonths } from 'date-fns';
import { TrendingUp, Home, Users, Receipt, DollarSign, Download, Filter, Calendar, Coins, BarChart2, Shield, Wrench, ArrowUpRight, ArrowDownRight, Sparkles, ChevronRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RentContractsReport from '@/components/reports/RentContractsReport';


const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const { lang } = useLanguage();
  const { selectedBranchId } = useBranch();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [activeTab, setActiveTab] = useState('financial');

  const { data: contracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => firebaseApi.entities.Contract.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => firebaseApi.entities.Invoice.list() });
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => firebaseApi.entities.Property.list() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => firebaseApi.entities.Tenant.list() });
  const { data: maintenance = [] } = useQuery({ queryKey: ['maintenance'], queryFn: () => firebaseApi.entities.Maintenance.list() });

  const filtered = (list, field = 'branch_id') => selectedBranchId ? list.filter(i => i[field] === selectedBranchId) : list;
  const fContracts = filtered(contracts);
  const fInvoices = invoices.filter(inv => { const c = fContracts.find(c => c.id === inv.contract_id); return !selectedBranchId || c; });
  const fProperties = filtered(properties);
  const fMaintenance = filtered(maintenance, 'property_id');

  const totalRevenue = fInvoices.filter(i => i.status === 'مدفوعة').reduce((s, i) => s + (i.amount || 0), 0);
  const pendingRevenue = fInvoices.filter(i => i.status !== 'مدفوعة').reduce((s, i) => s + (i.amount || 0), 0);
  const totalInsurance = fContracts.reduce((s, c) => s + (c.insurance_amount || 0), 0);
  const maintenanceCost = fMaintenance.reduce((s, m) => s + (m.cost || 0), 0);

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const label = format(d, 'MM/yyyy');
      const monthStart = startOfMonth(d);
      const monthEnd = endOfMonth(d);
      const revenue = fInvoices.filter(inv => { if (!inv.paid_date) return false; try { return isWithinInterval(parseISO(inv.paid_date), { start: monthStart, end: monthEnd }); } catch { return false; } }).reduce((s, i) => s + (i.amount || 0), 0);
      const pending = fInvoices.filter(inv => { if (!inv.due_date || inv.status === 'مدفوعة') return false; try { return isWithinInterval(parseISO(inv.due_date), { start: monthStart, end: monthEnd }); } catch { return false; } }).reduce((s, i) => s + (i.amount || 0), 0);
      months.push({ label, revenue, pending });
    }
    return months;
  }, [fInvoices]);

  const propertyStatus = useMemo(() => { const g = {}; fProperties.forEach(p => { g[p.status] = (g[p.status] || 0) + 1; }); return Object.entries(g).map(([name, value]) => ({ name, value })); }, [fProperties]);
  const contractStatus = useMemo(() => { const g = {}; fContracts.forEach(c => { g[c.status] = (g[c.status] || 0) + 1; }); return Object.entries(g).map(([name, value]) => ({ name, value })); }, [fContracts]);
  const topTenants = useMemo(() => { const map = {}; fInvoices.filter(i => i.status === 'مدفوعة').forEach(inv => { const name = inv.tenant_name || '—'; map[name] = (map[name] || 0) + (inv.amount || 0); }); return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, amount]) => ({ name, amount })); }, [fInvoices]);
  const invoiceTypes = useMemo(() => { const map = {}; fInvoices.forEach(i => { map[i.type] = (map[i.type] || 0) + (i.amount || 0); }); return Object.entries(map).map(([name, value]) => ({ name, value })); }, [fInvoices]);
  const maintByCategory = useMemo(() => { const map = {}; fMaintenance.forEach(m => { map[m.category] = (map[m.category] || 0) + 1; }); return Object.entries(map).map(([name, value]) => ({ name, value })); }, [fMaintenance]);

  const handleExportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
  };

  const handlePrint = (tableId) => {
    setTimeout(() => {
      const printContent = document.getElementById(tableId);
      if (!printContent) {
        alert(L('المحتوى غير متوفر للطباعة', 'ناوەڕۆک بەردەست نییە بۆ چاپکردن'));
        return;
      }
      
      const tableElement = printContent.querySelector('table');
      if (!tableElement) {
        alert(L('الجدول غير متوفر', 'خشتەکە بەردەست نییە'));
        return;
      }
      
      const tableTitle = printContent.querySelector('h3')?.textContent || L('تقرير', 'ڕاپۆرت');
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      
      if (!printWindow) {
        alert(L('يرجى السماح بالنوافذ المنبثقة للطباعة', 'تکایە ڕێگە بە پەنجەرەکان بدە بۆ چاپکردن'));
        return;
      }
      
      const now = new Date();
      const printDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <title>${tableTitle}</title>
            <meta charset="UTF-8">
            <style>
              @page { size: A4 landscape; margin: 8mm; }
              @page:first { margin: 8mm; }
              body { 
                font-family: 'Noto Sans Arabic', 'Tajawal', Arial, sans-serif; 
                padding: 0; 
                background: white;
                color: #000;
                width: 100%;
                overflow-x: hidden;
              }
              .banner {
                background: linear-gradient(135deg, #1e3a5f 0%, #0f2344 100%);
                color: white;
                padding: 15px 25px;
                margin-bottom: 15px;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .banner-title {
                font-size: 18px;
                font-weight: bold;
              }
              .banner-date {
                font-size: 12px;
                opacity: 0.9;
              }
              h2 { 
                color: #1e293b; 
                margin-bottom: 10px; 
                font-size: 14px;
                font-weight: bold;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 5px;
                font-size: 9px;
                page-break-inside: auto;
              }
              th { 
                background-color: #1e293b; 
                color: white; 
                font-weight: bold;
                padding: 8px 6px;
                border: 1px solid #334155;
                white-space: nowrap;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              td { 
                border: 1px solid #cbd5e1; 
                padding: 6px; 
                text-align: right;
                white-space: nowrap;
              }
              tr:nth-child(even) { 
                background-color: #f1f5f9; 
              }
              tr { page-break-inside: avoid; }
              @media print {
                @page { size: A4 landscape; margin: 8mm; }
                body { padding: 0; width: 100%; }
                .banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="banner">
              <div class="banner-title">${tableTitle}</div>
              <div class="banner-date">${printDate}</div>
            </div>
            ${tableElement.outerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }, 100);
  };

  const handleDownloadPDF = (tableId, filename) => {
    const printContent = document.getElementById(tableId);
    if (!printContent) {
      alert(L('المحتوى غير متوفر للتصدير', 'ناوەڕۆک بەردەست نییە بۆ هەناردەکردن'));
      return;
    }

    const tableElement = printContent.querySelector('table');
    if (!tableElement) {
      alert(L('الجدول غير متوفر', 'خشتەکە بەردەست نییە'));
      return;
    }

    const tableTitle = printContent.querySelector('h3')?.textContent || L('تقرير', 'ڕاپۆرت');
    const now = new Date();
    const printDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const printWindow = window.open('', '_blank', 'width=1400,height=900');
    if (!printWindow) {
      alert(L('يرجى السماح بالنوافذ المنبثقة', 'تکایە ڕێگە بە پەنجەرەکان بدە'));
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>${tableTitle}</title>
          <meta charset="UTF-8">
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body {
              font-family: 'Noto Sans Arabic', 'Tajawal', Arial, sans-serif;
              background: white;
              color: #000;
              margin: 0;
              padding: 0;
            }
            .banner {
              background: linear-gradient(135deg, #1e3a5f 0%, #0f2344 100%);
              color: white;
              padding: 12px 20px;
              margin-bottom: 12px;
              border-radius: 6px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .banner-title { font-size: 16px; font-weight: bold; }
            .banner-date { font-size: 11px; opacity: 0.9; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            th {
              background-color: #1e293b !important;
              color: white !important;
              font-weight: bold;
              padding: 7px 6px;
              border: 1px solid #334155;
              text-align: right;
              white-space: nowrap;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            td {
              border: 1px solid #cbd5e1;
              padding: 6px;
              text-align: right;
              white-space: nowrap;
              color: #1e293b;
              background: white !important;
            }
            tr:nth-child(even) td { background-color: #f8fafc !important; }
            tfoot td, tfoot th {
              background-color: #1e293b !important;
              color: white !important;
              font-weight: bold;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>
          <div class="banner">
            <div class="banner-title">${tableTitle}</div>
            <div class="banner-date">${printDate}</div>
          </div>
          ${tableElement.outerHTML}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const TABS = [
    { id: 'financial', labelAr: 'المالية', labelKu: 'دارایی', icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { id: 'rent_contracts', labelAr: 'عقود الإيجار', labelKu: 'گرێبەستی کرێ', icon: Coins, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-700' },
    { id: 'properties', labelAr: 'العقارات', labelKu: 'خانووبەرەکان', icon: Home, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700' },
    { id: 'contracts', labelAr: 'العقود', labelKu: 'گرێبەستەکان', icon: Receipt, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700' },
    { id: 'tenants', labelAr: 'المستأجرون', labelKu: 'کرێچییەکان', icon: Users, gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50', text: 'text-pink-700' },
    { id: 'maintenance', labelAr: 'الصيانة', labelKu: 'چاکسازی', icon: Wrench, gradient: 'from-slate-600 to-slate-800', bg: 'bg-slate-50', text: 'text-slate-700' },
  ];

  const activeTabInfo = TABS.find(t => t.id === activeTab);

  // Stat card component
  const KpiCard = ({ icon: Icon, label, value, sub, trend, gradientFrom, gradientTo, iconBg }) => (
    <div className="relative rounded-2xl p-5 shadow-xl backdrop-blur-xl border border-white/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group" style={{ background: 'rgba(17, 24, 39, 0.6)' }}>
      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl" style={{ background: `linear-gradient(135deg, ${gradientFrom}25, ${gradientTo}35)` }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-black text-white mb-1">{value}</p>
        <p className="text-xs font-medium text-white/50">{label}</p>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  // Chart card wrapper
  const ChartCard = ({ title, children, action }) => (
    <div className="rounded-2xl border border-white/10 shadow-sm overflow-hidden backdrop-blur-xl" style={{ background: 'rgba(17, 24, 39, 0.6)' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="font-bold text-white text-sm">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  // Pro table header
  const TableSection = ({ title, children, onExport, tableId }) => (
    <div id={tableId} className="rounded-2xl overflow-hidden backdrop-blur-xl border border-white/10" style={{ background: 'rgba(17, 24, 39, 0.6)' }}>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-1.5 h-6 rounded-full bg-amber-400 flex-shrink-0" />
          <h3 className="font-bold text-white text-sm truncate">{title}</h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-xs gap-1 rounded-xl px-2" onClick={() => handlePrint(tableId)}>
            <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{L('طباعة', 'چاپکردن')}</span>
          </Button>
          {onExport && (
            <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-xs gap-1 rounded-xl px-2" onClick={onExport}>
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{L('تصدير CSV', 'هەناردەکردن')}</span><span className="sm:hidden">CSV</span>
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );

  const statusBadge = (status) => {
    const map = {
      'نشط': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      'منتهي': 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      'ملغي': 'bg-red-500/20 text-red-300 border border-red-500/30',
      'معلق': 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
      'متاح': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      'مؤجر': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      'صيانة': 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    };
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${map[status] || 'bg-gray-500/20 text-gray-300'}`}>{status}</span>;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 border border-white/10 rounded-xl p-3 shadow-xl text-xs backdrop-blur-xl" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
        <p className="font-bold text-white mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold text-white">{p.name}: {p.value?.toLocaleString()}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5" style={{ background: 'linear-gradient(180deg, #131c2a 0%, #0f1620 100%)', borderRadius: '24px', padding: '20px' }}>
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ═══ HERO HEADER ═══ */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2344 100%)' }}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full backdrop-blur-sm" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15), transparent)', border: '1px solid rgba(255, 255, 255, 0.2)' }} />
          </div>
          <div className="relative px-6 py-8 md:px-10 md:py-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/20" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <BarChart2 className="w-8 h-8 text-white" />
                </div>
                <div>

                  <h1 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-lg">{L('التقارير والتحليلات المتقدمة', 'ڕاپۆرت و شیکاری پێشکەوتوو')}</h1>
                  <p className="text-slate-300 text-sm mt-1 font-medium">{L('تقارير شاملة ومفصلة لجميع العمليات', 'ڕاپۆرتی تەواو بۆ هەموو کارەکان')}</p>
                </div>
              </div>
              {/* Quick Stats in header */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: L('إجمالي العقود', 'کۆی گرێبەست'), value: fContracts.length, color: '#818cf8' },
                  { label: L('العقارات', 'خانووبەرە'), value: fProperties.length, color: '#fbbf24' },
                  { label: L('المستأجرون', 'کرێچی'), value: tenants.length, color: '#34d399' },
                ].map((s, i) => (
                  <div key={i} className="text-center px-4 py-3 rounded-2xl backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    <p className="text-2xl font-black" style={{ color: s.color, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{s.value}</p>
                    <p className="text-slate-200 text-xs mt-0.5 font-semibold">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="rounded-2xl border border-white/10 shadow-sm p-2 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="flex flex-wrap gap-1.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md` : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                  <Icon className="w-4 h-4" />
                  {L(tab.labelAr, tab.labelKu)}
                  {isActive && <ChevronRight className="w-3 h-3 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ RENT CONTRACTS TAB ═══ */}
        {activeTab === 'rent_contracts' && <RentContractsReport contracts={fContracts} invoices={fInvoices} L={L} handleExportCSV={handleExportCSV} handlePrint={handlePrint} handleDownloadPDF={handleDownloadPDF} />}

        {/* ═══ FINANCIAL TAB ═══ */}
        {activeTab === 'financial' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={TrendingUp} label={L('الإيرادات المحصلة', 'داهاتی کۆکراوە')} value={totalRevenue.toLocaleString()} sub="د.ع" gradientFrom="#10b981" gradientTo="#059669" />
              <KpiCard icon={Receipt} label={L('المبالغ المعلقة', 'بڕی چاوەڕوان')} value={pendingRevenue.toLocaleString()} sub="د.ع" gradientFrom="#f59e0b" gradientTo="#d97706" />
              <KpiCard icon={Shield} label={L('إجمالي التأمينات', 'کۆی دڵنیاییەکان')} value={totalInsurance.toLocaleString()} sub="د.ع" gradientFrom="#3b82f6" gradientTo="#2563eb" />
              <KpiCard icon={Wrench} label={L('تكاليف الصيانة', 'تێچووی چاکسازی')} value={maintenanceCost.toLocaleString()} sub="د.ع" gradientFrom="#ef4444" gradientTo="#dc2626" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <ChartCard
                  title={L('الإيرادات الشهرية (آخر 6 أشهر)', 'داهاتی مانگانە (6 مانگی کۆتایی)')}
                  action={<Button size="sm" variant="outline" className="text-xs gap-1 rounded-xl border-slate-200" onClick={() => handleExportCSV(monthlyData, 'monthly_revenue')}><Download className="w-3 h-3" /> CSV</Button>}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="pendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="revenue" name={L('محصل', 'کۆکراوە')} stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#10b981', r: 4 }} />
                      <Area type="monotone" dataKey="pending" name={L('معلق', 'چاوەڕوان')} stroke="#f59e0b" strokeWidth={2.5} fill="url(#pendGrad)" dot={{ fill: '#f59e0b', r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              <ChartCard title={L('توزيع أنواع الفواتير', 'جۆرەکانی پسوولە')}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={invoiceTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3}>
                      {invoiceTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => v.toLocaleString() + ' د.ع'} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <TableSection title={L('أعلى المستأجرين دفعاً', 'باشترین کرێچییەکان لە پارەدانەوە')} tableId="top_tenants_table" onExport={() => handleExportCSV(topTenants, 'top_tenants')}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">#</th>
                    <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">{L('المستأجر', 'کرێچی')}</th>
                    <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase">{L('إجمالي المدفوعات', 'کۆی پارەدانەکان')}</th>
                    <th className="text-right p-4 font-semibold text-white/60 text-xs uppercase w-1/3">{L('النسبة', 'ڕێژە')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topTenants.map((t, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c3c' : '#475569' }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-white">{t.name}</td>
                      <td className="p-4 font-black text-emerald-400">{t.amount.toLocaleString()} <span className="text-xs font-normal text-white/40">د.ع</span></td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(t.amount / (topTenants[0]?.amount || 1)) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                          </div>
                          <span className="text-xs font-bold text-white/60 w-8">{((t.amount / (topTenants[0]?.amount || 1)) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableSection>
          </div>
        )}

        {/* ═══ PROPERTIES TAB ═══ */}
        {activeTab === 'properties' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Home} label={L('إجمالي العقارات', 'کۆی خانووبەرەکان')} value={fProperties.length} gradientFrom="#1a2744" gradientTo="#2a3f6e" />
              <KpiCard icon={Home} label={L('متاح', 'بەردەست')} value={fProperties.filter(p => p.status === 'متاح').length} gradientFrom="#10b981" gradientTo="#059669" />
              <KpiCard icon={Home} label={L('مؤجر', 'کرێکراو')} value={fProperties.filter(p => p.status === 'مؤجر').length} gradientFrom="#3b82f6" gradientTo="#2563eb" />
              <KpiCard icon={Wrench} label={L('صيانة', 'چاکسازی')} value={fProperties.filter(p => p.status === 'صيانة').length} gradientFrom="#f59e0b" gradientTo="#d97706" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title={L('توزيع حالة العقارات', 'دۆخی خانووبەرەکان')}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={propertyStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3}>
                      {propertyStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title={L('توزيع أنواع العقارات', 'جۆرەکانی خانووبەرەکان')}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={(() => { const m = {}; fProperties.forEach(p => { m[p.type] = (m[p.type] || 0) + 1; }); return Object.entries(m).map(([n, v]) => ({ name: n, value: v })); })()} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={L('العدد', 'ژمارە')} radius={[6, 6, 0, 0]}>
                      {[0,1,2,3,4].map(i => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <TableSection title={L('قائمة العقارات', 'لیستی خانووبەرەکان')} tableId="properties_table" onExport={() => handleExportCSV(fProperties.map(p => ({ name: p.name, type: p.type, status: p.status, address: p.address, monthly_rent: p.monthly_rent })), 'properties')}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10">
                  {[L('العقار','خانووبەرە'), L('النوع','جۆر'), L('الحالة','دۆخ'), L('المالك','خاوەن'), L('الإيجار الشهري','کرێی مانگانە')].map((h, i) => (
                    <th key={i} className="text-right p-4 font-semibold text-white/60 text-xs uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {fProperties.map(p => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-semibold text-white">{p.name}</td>
                      <td className="p-4 text-white/60 text-xs">{p.type}</td>
                      <td className="p-4">{statusBadge(p.status)}</td>
                      <td className="p-4 text-white/60">{p.owner_name || '—'}</td>
                      <td className="p-4 font-black text-indigo-400">{p.monthly_rent?.toLocaleString() || '—'} <span className="text-xs font-normal text-white/40">د.ع</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableSection>
          </div>
        )}

        {/* ═══ CONTRACTS TAB ═══ */}
        {activeTab === 'contracts' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Receipt} label={L('إجمالي العقود', 'کۆی گرێبەستەکان')} value={fContracts.length} gradientFrom="#1a2744" gradientTo="#2a3f6e" />
              <KpiCard icon={Receipt} label={L('نشط', 'چالاک')} value={fContracts.filter(c => c.status === 'نشط').length} gradientFrom="#10b981" gradientTo="#059669" />
              <KpiCard icon={Receipt} label={L('منتهي', 'بەسەرچووە')} value={fContracts.filter(c => c.status === 'منتهي').length} gradientFrom="#f59e0b" gradientTo="#d97706" />
              <KpiCard icon={Receipt} label={L('ملغي', 'هەڵوەشاندراوە')} value={fContracts.filter(c => c.status === 'ملغي').length} gradientFrom="#ef4444" gradientTo="#dc2626" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title={L('توزيع حالة العقود', 'دۆخی گرێبەستەکان')}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={contractStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3}>
                      {contractStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title={L('توزيع أغراض الإيجار', 'ئامانجەکانی کرێدان')}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={(() => { const m = {}; fContracts.forEach(c => { if (c.purpose) m[c.purpose] = (m[c.purpose] || 0) + 1; }); return Object.entries(m).map(([n, v]) => ({ name: n, value: v })); })()} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={L('العدد', 'ژمارە')} radius={[6, 6, 0, 0]}>
                      {[0,1,2,3,4].map(i => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <TableSection title={L('تفاصيل العقود', 'وردەکاریی گرێبەستەکان')} tableId="contracts_table" onExport={() => handleExportCSV(fContracts.map(c => ({ contract_number: c.contract_number, tenant_name: c.tenant_name, property_name: c.property_name, status: c.status, start_date: c.start_date, end_date: c.end_date, monthly_rent: c.monthly_rent, total_rent: c.total_rent })), 'contracts')}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10">
                  {[L('رقم','ژمارە'), L('المستأجر','کرێچی'), L('العقار','خانووبەرە'), L('الحالة','دۆخ'), L('البداية','دەستپێکردن'), L('الإجمالي','کۆی گشتی')].map((h, i) => (
                    <th key={i} className="text-right p-4 font-semibold text-white/60 text-xs uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {fContracts.map(c => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-indigo-400">{c.contract_number}</td>
                      <td className="p-4 font-semibold text-white">{c.tenant_name}</td>
                      <td className="p-4 text-white/60">{c.property_name}</td>
                      <td className="p-4">{statusBadge(c.status)}</td>
                      <td className="p-4 text-white/60 text-xs">{c.start_date}</td>
                      <td className="p-4 font-black text-emerald-400">{c.total_rent?.toLocaleString()} <span className="text-xs font-normal text-white/40">د.ع</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableSection>
          </div>
        )}

        {/* ═══ TENANTS TAB ═══ */}
        {activeTab === 'tenants' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard icon={Users} label={L('إجمالي المستأجرين', 'کۆی کرێچییەکان')} value={tenants.length} gradientFrom="#1a2744" gradientTo="#2a3f6e" />
              <KpiCard icon={Users} label={L('مستأجرون نشطون', 'کرێچیی چالاک')} value={fContracts.filter(c => c.status === 'نشط').length} gradientFrom="#ec4899" gradientTo="#db2777" />
              <KpiCard icon={DollarSign} label={L('متوسط الإيجار', 'ناوەڕاستی کرێ')} value={fContracts.length ? Math.round(fContracts.reduce((s, c) => s + (c.monthly_rent || 0), 0) / fContracts.length).toLocaleString() : '0'} sub={L('د.ع/شهر', 'د.ع/مانگ')} gradientFrom="#3b82f6" gradientTo="#2563eb" />
            </div>
            <TableSection title={L('قائمة المستأجرين', 'لیستی کرێچییەکان')} tableId="tenants_table" onExport={() => handleExportCSV(tenants.map(t => ({ full_name: t.full_name, phone: t.phone, email: t.email, nationality: t.nationality, address: t.address })), 'tenants')}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10">
                  {[L('الاسم','ناو'), L('الهاتف','مۆبایل'), L('الجنسية','نەتەوە'), L('العقود النشطة','گرێبەستی چالاک'), L('إجمالي الدفعات','کۆی پارەدانەکان')].map((h, i) => (
                    <th key={i} className="text-right p-4 font-semibold text-white/60 text-xs uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {tenants.map(t => {
                    const tContracts = fContracts.filter(c => c.tenant_id === t.id);
                    const tPaid = fInvoices.filter(i => tContracts.some(c => c.id === i.contract_id) && i.status === 'مدفوعة').reduce((s, i) => s + (i.amount || 0), 0);
                    return (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                              {(t.full_name || '?').charAt(0)}
                            </div>
                            <span className="font-semibold text-white">{t.full_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-white/60 text-xs">{t.phone}</td>
                        <td className="p-4 text-white/60 text-xs">{t.nationality || '—'}</td>
                        <td className="p-4">
                          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-xs font-bold">{tContracts.filter(c => c.status === 'نشط').length}</span>
                        </td>
                        <td className="p-4 font-black text-emerald-400">{tPaid.toLocaleString()} <span className="text-xs font-normal text-white/40">د.ع</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableSection>
          </div>
        )}

        {/* ═══ MAINTENANCE TAB ═══ */}
        {activeTab === 'maintenance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Wrench} label={L('إجمالي الطلبات', 'کۆی داواکارییەکان')} value={fMaintenance.length} gradientFrom="#1a2744" gradientTo="#2a3f6e" />
              <KpiCard icon={Wrench} label={L('معلق', 'چاوەڕوان')} value={fMaintenance.filter(m => m.status === 'معلق').length} gradientFrom="#f59e0b" gradientTo="#d97706" />
              <KpiCard icon={Wrench} label={L('مكتمل', 'تەواوبوو')} value={fMaintenance.filter(m => m.status === 'مكتمل').length} gradientFrom="#10b981" gradientTo="#059669" />
              <KpiCard icon={DollarSign} label={L('إجمالي التكاليف', 'کۆی تێچوو')} value={maintenanceCost.toLocaleString()} sub="د.ع" gradientFrom="#ef4444" gradientTo="#dc2626" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title={L('الصيانة حسب الفئة', 'چاکسازی بەپێی پۆل')}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={maintByCategory} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name={L('العدد', 'ژمارە')} radius={[6, 6, 0, 0]}>
                      {maintByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title={L('الصيانة حسب الأولوية', 'چاکسازی بەپێی پێشینە')}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={(() => { const m = {}; fMaintenance.forEach(x => { m[x.priority] = (m[x.priority] || 0) + 1; }); return Object.entries(m).map(([n, v]) => ({ name: n, value: v })); })()} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3}>
                      {[0, 1, 2, 3].map(i => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}