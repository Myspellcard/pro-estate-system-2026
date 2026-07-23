import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Building2, Users, FileText, Receipt, AlertTriangle, CheckCircle2, Clock, Wrench, MessageCircle, ChevronLeft } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useBranch } from '@/context/BranchContext';
import UpcomingPayments from './UpcomingPayments';
import ExpiringContracts from './ExpiringContracts';
import OverdueList from './OverdueList';
import { DEFAULT_LAYOUT } from './DashboardLayoutEditor';

const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;

const STAT_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
  { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
];

function MiniStatCard({ icon: Icon, label, value, sub, colorIdx }) {
  const c = STAT_COLORS[colorIdx % STAT_COLORS.length];
  const valueStr = String(value);
  const fontSize = valueStr.length > 10 ? 'text-lg sm:text-xl' : valueStr.length > 7 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl';
  return (
    <div className="relative rounded-2xl p-3 sm:p-5 shadow-xl backdrop-blur-xl border border-white/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group" style={{ background: 'rgba(17, 24, 39, 0.6)' }}>
      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl" style={{ background: `linear-gradient(135deg, ${c.bg.replace('bg-', '#')}25, ${c.bg.replace('bg-', '#')}35)` }} />
      <div className="relative flex flex-col items-center text-center gap-2 sm:gap-3">
        <div className={`w-full px-0 py-2 sm:py-2.5 rounded-xl ${c.bg} flex items-center justify-center gap-2 shadow-lg`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <p className="text-xs sm:text-sm text-white font-bold">{label}</p>
        </div>
        <p className={`${fontSize} font-black text-white leading-tight drop-shadow-lg`}>{value}</p>
        {sub && <p className={`text-[10px] sm:text-xs font-semibold ${c.text} drop-shadow truncate`}>{sub}</p>}
      </div>
    </div>
  );
}

const statusMap = {
  'نشط': { label: 'نشط', color: 'bg-emerald-500/20 text-emerald-400' },
  'منتهي': { label: 'منتهي', color: 'bg-white/10 text-white/60' },
  'ملغي': { label: 'ملغي', color: 'bg-red-500/20 text-red-400' },
  'معلق': { label: 'معلق', color: 'bg-amber-500/20 text-amber-400' },
};

export default function BranchDashboard() {
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const { activeBranch } = useBranch();
  const { can, isAdmin } = useUserPermissions();
  const dash = (key) => isAdmin || can(key);

  const { data: allProperties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => firebaseApi.entities.Property.list() });
  const { data: allTenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => firebaseApi.entities.Tenant.list() });
  const { data: allContracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => firebaseApi.entities.Contract.list('-created_date', 200) });
  const { data: allInvoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => firebaseApi.entities.Invoice.list('-created_date', 200) });
  const { data: allMaintenance = [] } = useQuery({ queryKey: ['maintenance'], queryFn: () => firebaseApi.entities.Maintenance.list() });
  const { data: settingsList = [] } = useQuery({ queryKey: ['app_settings'], queryFn: () => firebaseApi.entities.AppSettings.list() });
  const { data: advertisements = [] } = useQuery({ queryKey: ['advertisements'], queryFn: () => firebaseApi.entities.AdvertisementBanner.list() });

  const settings = settingsList.find(s => s.key === 'default') || {};

  const bid = activeBranch?.id;
  const properties = allProperties.filter(p => p.branch_id === bid);
  const tenants = allTenants.filter(t => t.branch_id === bid);
  const contracts = allContracts.filter(c => c.branch_id === bid);
  const maintenance = allMaintenance.filter(m => allProperties.find(p => p.id === m.property_id)?.branch_id === bid);
  const contractIds = new Set(contracts.map(c => c.id));
  const invoices = allInvoices.filter(i => contractIds.has(i.contract_id));
  
  // Filter advertisements for this branch (or global with no branch_id)
  const branchAds = advertisements.filter(ad => ad.is_active !== false && (!ad.branch_id || ad.branch_id === bid));

  const activeContracts = contracts.filter(c => c.status === 'نشط');
  const overdueInvoices = invoices.filter(i => i.status === 'متأخرة' || (i.status === 'معلقة' && i.due_date && isPast(parseISO(i.due_date))));
  const totalRevenue = invoices.filter(i => i.status === 'مدفوعة').reduce((sum, i) => sum + (i.amount || 0), 0);
  const pendingMaintenance = maintenance.filter(m => m.status === 'معلق');

  const availableProps = properties.filter(p => p.status === 'متاح').length;
  const rentedProps = properties.filter(p => p.status === 'مؤجر').length;
  const maintenanceProps = properties.filter(p => p.status === 'صيانة').length;

  const recentContracts = [...contracts].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)).slice(0, 8);
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)).slice(0, 6);

  // Load branch-specific layout from settings
  let layout = DEFAULT_LAYOUT;
  const rawLayout = settings.branch_dashboard_layout;
  if (rawLayout) {
    try {
      const parsed = typeof rawLayout === 'string' ? JSON.parse(rawLayout) : rawLayout;
      const merged = DEFAULT_LAYOUT.map(def => parsed.find(p => p.id === def.id) || def);
      parsed.forEach(p => { if (!merged.find(m => m.id === p.id)) merged.push(p); });
      layout = merged.sort((a, b) => a.order - b.order);
    } catch {}
  }
  // Force upcoming_payments to full width in branch dashboard
  layout = layout.map(item => item.id === 'upcoming_payments' ? { ...item, col: 'full' } : item);

  const branchName = activeBranch ? (lang === 'ku' ? (activeBranch.name_ku || activeBranch.name) : activeBranch.name) : '';

  // All renderable widgets
  const WIDGETS = {
    stats: dash('dash_stats') ? (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard icon={Building2} label={L('العقارات', 'خانووبەرەکان')} value={properties.length} sub={`${availableProps} ${L('متاح', 'بەردەست')} · ${rentedProps} ${L('مؤجر', 'کرێدراو')}`} colorIdx={0} />
        <MiniStatCard icon={Users} label={L('المستأجرون', 'کرێچییەکان')} value={tenants.length} sub={`${activeContracts.length} ${L('عقد نشط', 'گرێبەستی چالاک')}`} colorIdx={1} />
        <MiniStatCard icon={FileText} label={L('العقود النشطة', 'گرێبەستە چالاکەکان')} value={activeContracts.length} sub={`${contracts.length} ${L('إجمالي', 'کۆی گشتی')}`} colorIdx={2} />
        <MiniStatCard icon={Receipt} label={L('الإيرادات', 'داهاتەکان')} value={totalRevenue.toLocaleString()} sub={`${overdueInvoices.length} ${L('متأخرة', 'دواکەوتوو')}`} colorIdx={3} />
      </div>
    ) : null,

    overdue: dash('dash_overdue')
      ? <OverdueList invoices={invoices} contracts={contracts} settings={settings} lang={lang} />
      : null,

    property_status: (
      <div className="rounded-2xl p-5 h-full backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">{L('حالة العقارات', 'دۆخی خانووبەرەکان')}</h3>
          <Link to="/properties" className="text-xs text-blue-400 hover:text-blue-300 font-medium">{L('عرض الكل', 'هەموو')}</Link>
        </div>
        <div className="space-y-3">
          {[
            { label: L('متاح', 'بەردەست'), count: availableProps, color: 'bg-emerald-500', pct: properties.length ? Math.round(availableProps / properties.length * 100) : 0 },
            { label: L('مؤجر', 'کرێدراو'), count: rentedProps, color: 'bg-blue-500', pct: properties.length ? Math.round(rentedProps / properties.length * 100) : 0 },
            { label: L('صيانة', 'چاکسازی'), count: maintenanceProps, color: 'bg-orange-400', pct: properties.length ? Math.round(maintenanceProps / properties.length * 100) : 0 },
          ].map(row => (
            <div key={row.label}>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-white/60">{row.label}</span>
                <span className="text-white">{row.count} ({row.pct}%)</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 text-center backdrop-blur-xl" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p className="text-2xl font-black text-red-400">{overdueInvoices.length}</p>
            <p className="text-xs text-red-300/70 font-medium">{L('فاتورة متأخرة', 'وەسڵی دواکەوتوو')}</p>
          </div>
          <div className="rounded-xl p-3 text-center backdrop-blur-xl" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <p className="text-2xl font-black text-amber-400">{pendingMaintenance.length}</p>
            <p className="text-xs text-amber-300/70 font-medium">{L('صيانة معلقة', 'چاکسازی مەوقوف')}</p>
          </div>
        </div>
      </div>
    ),

    recent_invoices: dash('dash_invoices') ? (
      <div className="rounded-2xl p-5 flex flex-col h-full backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">{L('الفواتير الأخيرة', 'دوایین وەسڵەکان')}</h3>
          <Link to="/invoices" className="text-xs text-blue-400 hover:text-blue-300 font-medium">{L('عرض الكل', 'هەموو')}</Link>
        </div>
        <div className="space-y-2 flex-1">
          {recentInvoices.map(inv => {
            const isOverdue = inv.status !== 'مدفوعة' && inv.due_date && isPast(parseISO(inv.due_date));
            return (
              <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-500/20' : inv.status === 'مدفوعة' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                  {isOverdue ? <AlertTriangle className="w-4 h-4 text-red-400" /> : inv.status === 'مدفوعة' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: '#ffffff' }}>{inv.tenant_name}</p>
                  <p className="text-[10px] text-white/40">{inv.due_date && format(parseISO(inv.due_date), 'dd/MM/yyyy')}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-500/20 text-red-400' : inv.status === 'مدفوعة' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {inv.amount?.toLocaleString()}
                </span>
              </div>
            );
          })}
          {recentInvoices.length === 0 && <p className="text-center text-xs text-white/40 py-8">{L('لا توجد فواتير', 'وەسڵ نییە')}</p>}
        </div>
      </div>
    ) : null,

    recent_contracts: dash('dash_contracts') ? (
      <div className="rounded-2xl overflow-hidden h-full backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.25)' }}>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{L('آخر العقود', 'دوایین گرێبەستەکان')}</h3>
              <p className="text-[10px] text-white/40">{contracts.length} {L('عقد', 'گرێبەست')}</p>
            </div>
          </div>
          <Link to="/contracts" className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
            {L('عرض الكل', 'هەموو')} <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {recentContracts.map(c => {
            const st = statusMap[c.status] || { label: c.status, color: 'bg-white/10 text-white/60' };
            return (
              <div key={c.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  {(c.tenant_name || 'T').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.tenant_name || '—'}</p>
                  <p className="text-xs text-white/40 truncate">{c.property_name} {c.contract_number ? `· ${c.contract_number}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  {c.tenant_phone && (
                    <a href={waLink(c.tenant_phone)} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                      <MessageCircle className="w-3 h-3 text-emerald-400" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {contracts.length === 0 && <p className="p-6 text-center text-sm text-white/40">{L('لا توجد عقود', 'گرێبەست نییە')}</p>}
        </div>
      </div>
    ) : null,

    maintenance: dash('dash_maintenance') ? (
      <div className="rounded-2xl overflow-hidden h-full backdrop-blur-xl" style={{ background: 'rgba(17, 24, 39, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{L('طلبات الصيانة', 'داواکاری چاککردنەوە')}</h3>
              <p className="text-[10px] text-white/40">{pendingMaintenance.length} {L('معلقة', 'مەوقوف')}</p>
            </div>
          </div>
          <Link to="/maintenance" className="text-xs font-medium flex items-center gap-1 hover:opacity-80" style={{ color: '#f97316' }}>
            {L('عرض الكل', 'هەموو')} <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {maintenance.filter(m => m.status !== 'مكتمل').slice(0, 7).map(m => (
            <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.priority === 'عالي' ? 'bg-red-500' : m.priority === 'متوسط' ? 'bg-amber-400' : 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{m.title}</p>
                <p className="text-xs text-white/50 truncate">{m.property_name}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.priority === 'عالي' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {m.priority}
              </span>
            </div>
          ))}
          {maintenance.filter(m => m.status !== 'مكتمل').length === 0 && (
            <div className="p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white/40">{L('لا توجد طلبات معلقة', 'هیچ داواکارییەکی مەوقوف نییە')}</p>
            </div>
          )}
        </div>
      </div>
    ) : null,

    upcoming_payments: dash('dash_upcoming_payments')
      ? <UpcomingPayments invoices={invoices} contracts={contracts} settings={settings} lang={lang} />
      : null,

    expiring_contracts: dash('dash_expiring_contracts')
      ? <ExpiringContracts contracts={contracts} settings={settings} lang={lang} />
      : null,

    overdue: dash('dash_overdue')
      ? <OverdueList invoices={invoices} contracts={contracts} settings={settings} lang={lang} />
      : null,
  };

  // Build rows from layout config
  const rows = [];
  let pendingLeft = null;
  for (const item of layout) {
    const widget = WIDGETS[item.id];
    if (!widget) continue;
    if (item.col === 'full') {
      if (pendingLeft) { rows.push({ type: 'half', left: pendingLeft, right: null }); pendingLeft = null; }
      rows.push({ type: 'full', widget });
    } else if (item.col === 'left') {
      if (pendingLeft) rows.push({ type: 'half', left: pendingLeft, right: null });
      pendingLeft = widget;
    } else if (item.col === 'right') {
      if (pendingLeft) { rows.push({ type: 'half', left: pendingLeft, right: widget }); pendingLeft = null; }
      else rows.push({ type: 'half', left: widget, right: null });
    }
  }
  if (pendingLeft) rows.push({ type: 'half', left: pendingLeft, right: null });

  return (
    <div className="space-y-5 pb-6" style={{ background: 'linear-gradient(180deg, #131c2a 0%, #0f1620 100%)', borderRadius: '24px', padding: '20px' }}>
      {/* Branch Header */}
      <div className="rounded-2xl p-5 flex items-center gap-4 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-white">{branchName}</h2>
          <p className="text-sm text-white/50 truncate">
            {activeBranch ? (lang === 'ku' ? (activeBranch.company_name_ku || activeBranch.company_name) : activeBranch.company_name) : ''}
          </p>
        </div>
      </div>

      {/* Advertisement Banners */}
      {branchAds.length > 0 && (
        <div className="space-y-3">
          {branchAds.map(ad => (
            <div
              key={ad.id}
              className="rounded-2xl p-4 shadow-sm border"
              style={{
                background: `linear-gradient(135deg, ${ad.bg_color_start || '#fbbf24'}, ${ad.bg_color_end || '#f59e0b'})`,
                color: ad.text_color || '#000000',
              }}
            >
              {ad.title_ar && (
                <h3 className="font-bold text-lg mb-1 text-center">
                  {lang === 'ku' && ad.title_ku ? ad.title_ku : ad.title_ar}
                </h3>
              )}
              <p className="text-sm font-bold text-center">
                {lang === 'ku' && ad.text_ku ? ad.text_ku : ad.text_ar}
              </p>
            </div>
          ))}
        </div>
      )}

      {rows.map((row, i) => {
        const hasBoth = row.left && row.right;
        return row.type === 'full' ? (
          <div key={i}>{row.widget}</div>
        ) : (
          <div key={i} className={`grid gap-4 items-start ${hasBoth ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {row.left && <div>{row.left}</div>}
            {row.right && <div>{row.right}</div>}
          </div>
        );
      })}
    </div>
  );
}