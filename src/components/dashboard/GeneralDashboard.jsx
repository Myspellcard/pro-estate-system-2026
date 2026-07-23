import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Building2, Users, FileText, Receipt, AlertTriangle, CheckCircle2, Clock, TrendingUp, Home, Wrench, MessageCircle, ChevronLeft, ArrowUpRight } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useBranch } from '@/context/BranchContext';
import UpcomingPayments from './UpcomingPayments';
import ExpiringContracts from './ExpiringContracts';
import OverdueList from './OverdueList';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;

const KPI_CONFIG = [
  { gradFrom: '#3b82f6', gradTo: '#2563eb', glow: '#3b82f620' },
  { gradFrom: '#10b981', gradTo: '#059669', glow: '#10b98120' },
  { gradFrom: '#8b5cf6', gradTo: '#7c3aed', glow: '#8b5cf620' },
  { gradFrom: '#f59e0b', gradTo: '#d97706', glow: '#f59e0b20' },
];

const BRANCH_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4'];

function KpiCard({ icon: Icon, label, value, sub, colorIdx }) {
  const c = KPI_CONFIG[colorIdx % KPI_CONFIG.length];
  const valueStr = String(value);
  const fontSize = valueStr.length > 10 ? 'text-lg sm:text-xl' : valueStr.length > 7 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl';
  return (
    <div className="relative rounded-2xl p-4 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ background: `linear-gradient(135deg, ${c.gradFrom}15, ${c.gradTo}20)` }} />
      <div className="relative flex flex-col items-center text-center gap-2 sm:gap-3">
        <div className={`w-full px-3 py-2 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg`} style={{ background: `linear-gradient(135deg, ${c.gradFrom}, ${c.gradTo})` }}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          <p className="text-xs sm:text-sm text-white font-bold">{label}</p>
        </div>
        <p className={`${fontSize} font-black text-white leading-tight drop-shadow-lg`}>{value}</p>
        {sub && <p className={`text-[10px] sm:text-xs font-semibold truncate`} style={{ color: c.gradFrom }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, iconColor, children, linkTo, linkLabel, lang }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${iconColor}20` }}>
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm leading-tight">{title}</h3>
            {subtitle && <p className="text-[10px] text-white/40">{subtitle}</p>}
          </div>
        </div>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:opacity-80" style={{ background: `${iconColor}15`, color: iconColor }}>
            {linkLabel} <ChevronLeft className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function GeneralDashboard() {
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const { can, isAdmin } = useUserPermissions();
  const { activeBranch } = useBranch();
  const dash = (key) => isAdmin || can(key);

  const { data: allProperties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => firebaseApi.entities.Property.list() });
  const { data: allTenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => firebaseApi.entities.Tenant.list() });
  const { data: allContracts = [] } = useQuery({ queryKey: ['contracts'], queryFn: () => firebaseApi.entities.Contract.list('-created_date', 200) });
  const { data: allInvoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => firebaseApi.entities.Invoice.list('-created_date', 200) });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => firebaseApi.entities.Branch.list() });
  const { data: settingsList = [] } = useQuery({ queryKey: ['app_settings'], queryFn: () => firebaseApi.entities.AppSettings.list() });
  const { data: allMaintenance = [] } = useQuery({ queryKey: ['maintenance'], queryFn: () => firebaseApi.entities.Maintenance.list('-created_date', 50) });

  const settings = settingsList.find(s => s.key === 'default') || {};
  const bid = activeBranch?.id;

  // Filter by branch if selected
  const properties = bid ? allProperties.filter(p => p.branch_id === bid) : allProperties;
  const tenants = bid ? allTenants.filter(t => t.branch_id === bid) : allTenants;
  const contracts = bid ? allContracts.filter(c => c.branch_id === bid) : allContracts;
  const contractIds = new Set(contracts.map(c => c.id));
  const invoices = bid ? allInvoices.filter(i => contractIds.has(i.contract_id)) : allInvoices;
  const maintenance = bid ? allMaintenance.filter(m => allProperties.find(p => p.id === m.property_id)?.branch_id === bid) : allMaintenance;

  const activeContracts = contracts.filter(c => c.status === 'نشط');
  const overdueInvoices = invoices.filter(i => i.status === 'متأخرة' || (i.status === 'معلقة' && i.due_date && isPast(parseISO(i.due_date))));
  const totalRevenue = invoices.filter(i => i.status === 'مدفوعة').reduce((sum, i) => sum + (i.amount || 0), 0);
  const availableProps = properties.filter(p => p.status === 'متاح').length;
  const rentedProps = properties.filter(p => p.status === 'مؤجر').length;
  const maintenanceProps = properties.filter(p => p.status === 'صيانة').length;
  const pendingMaintenance = maintenance.filter(m => m.status === 'معلق').length;

  const recentContracts = [...contracts].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)).slice(0, 8);
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)).slice(0, 6);

  const branchData = branches.map(b => ({
    name: lang === 'ku' ? (b.name_ku || b.name) : b.name,
    contracts: contracts.filter(c => c.branch_id === b.id && c.status === 'نشط').length,
    properties: properties.filter(p => p.branch_id === b.id).length,
  }));

  const statusMap = {
    'نشط':   { label: L('نشط', 'چالاک'),           bg: '#10b98118', text: '#059669', border: '#10b98130' },
    'منتهي': { label: L('منتهي', 'تەواوبوو'),       bg: '#94a3b818', text: '#64748b', border: '#94a3b830' },
    'ملغي':  { label: L('ملغي', 'هەڵوەشاندراوە'),  bg: '#ef444418', text: '#dc2626', border: '#ef444430' },
    'معلق':  { label: L('معلق', 'مەوقوف'),          bg: '#f59e0b18', text: '#d97706', border: '#f59e0b30' },
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-bold text-slate-700 mb-1.5">{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.fill }} className="font-semibold">{p.name}: {p.value}</p>)}
      </div>
    );
  };

  return (
    <div className="pb-6 space-y-4" style={{ background: 'linear-gradient(180deg, #131c2a 0%, #0f1620 100%)', borderRadius: '24px', padding: '20px' }}>

      {/* ══ KPI Row ══ */}
      {dash('dash_stats') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Home} label={L('إجمالي العقارات', 'کۆی خانووبەرەکان')} value={properties.length} sub={`${availableProps} ${L('متاح', 'بەردەست')} · ${rentedProps} ${L('مؤجر', 'کرێدراو')}`} colorIdx={0} />
          <KpiCard icon={FileText} label={L('العقود النشطة', 'گرێبەستە چالاکەکان')} value={activeContracts.length} sub={`${contracts.length} ${L('إجمالي', 'کۆی گشتی')}`} colorIdx={1} />
          <KpiCard icon={Users} label={L('المستأجرون', 'کرێچییەکان')} value={tenants.length} sub={activeBranch ? `${activeContracts.length} ${L('عقد نشط', 'گرێبەستی چالاک')}` : `${branches.length} ${L('فرع', 'لق')}`} colorIdx={2} />
          <KpiCard icon={Receipt} label={L('الإيرادات', 'کۆی داهاتەکان')} value={totalRevenue.toLocaleString()} sub={`${overdueInvoices.length} ${L('متأخرة', 'دواکەوتوو')}`} colorIdx={3} />
        </div>
      )}

      {/* ══ Middle Row ══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Property Status */}
        <SectionCard title={L('حالة العقارات', 'دۆخی خانووبەرەکان')} icon={Home} iconColor="#3b82f6" linkTo="/properties" linkLabel={L('عرض الكل', 'هەموو')} lang={lang}>
          <div className="p-5 space-y-4">
            {[
              { label: L('متاح', 'بەردەست'), count: availableProps, color: '#10b981', bg: '#10b98110' },
              { label: L('مؤجر', 'کرێدراو'), count: rentedProps, color: '#3b82f6', bg: '#3b82f610' },
              { label: L('صيانة', 'چاکسازی'), count: maintenanceProps, color: '#f97316', bg: '#f9731610' },
            ].map(row => {
              const pct = properties.length ? Math.round(row.count / properties.length * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                      <span className="text-white/60">{row.label}</span>
                    </div>
                    <span className="font-bold text-white">{row.count} <span className="text-white/40 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: row.color }} />
                  </div>
                </div>
              );
            })}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <p className="text-2xl font-black text-red-400">{overdueInvoices.length}</p>
                <p className="text-[10px] text-red-300/70 font-semibold mt-0.5">{L('فاتورة متأخرة', 'وەسڵی دواکەوتوو')}</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <p className="text-2xl font-black text-amber-400">{pendingMaintenance}</p>
                <p className="text-[10px] text-amber-300/70 font-semibold mt-0.5">{L('صيانة معلقة', 'چاکسازی مەوقوف')}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Branch Chart - only show in general view (no branch selected) */}
        {!activeBranch && branches.length > 0 && (
          <SectionCard title={L('الفروع — العقود النشطة', 'لقەکان — گرێبەستە چالاکەکان')} icon={Building2} iconColor="#8b5cf6" lang={lang}>
            <div className="p-4">
              {branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height={155}>
                  <BarChart data={branchData} barSize={20} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="contracts" name={L('عقود نشطة', 'گرێبەستی چالاک')} radius={[6, 6, 0, 0]}>
                      {branchData.map((_, i) => <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-300 text-sm">{L('لا توجد بيانات', 'داتا نییە')}</div>
              )}
              <div className="mt-3 space-y-2">
                {branches.slice(0, 4).map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2.5 text-xs py-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] }} />
                    <span className="text-slate-600 truncate flex-1">{lang === 'ku' ? (b.name_ku || b.name) : b.name}</span>
                    <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{contracts.filter(c => c.branch_id === b.id && c.status === 'نشط').length}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Recent Invoices */}
        {dash('dash_invoices') && (
          <SectionCard title={L('الفواتير الأخيرة', 'دوایین وەسڵەکان')} icon={Receipt} iconColor="#f59e0b" linkTo="/invoices" linkLabel={L('عرض الكل', 'هەموو')} lang={lang}>
            <div className="divide-y divide-white/5">
              {recentInvoices.map(inv => {
                const isOverdue = inv.status !== 'مدفوعة' && inv.due_date && isPast(parseISO(inv.due_date));
                const isPaid = inv.status === 'مدفوعة';
                const iconBg = isOverdue ? 'rgba(239, 68, 68, 0.2)' : isPaid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)';
                const iconColor = isOverdue ? '#ef4444' : isPaid ? '#10b981' : '#f59e0b';
                return (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                      {isOverdue ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: iconColor }} /> : isPaid ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: iconColor }} /> : <Clock className="w-3.5 h-3.5" style={{ color: iconColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{inv.tenant_name}</p>
                      <p className="text-[10px] text-white/40">{inv.due_date && format(parseISO(inv.due_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl flex-shrink-0" style={{ background: iconBg, color: iconColor }}>
                      {inv.amount?.toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {recentInvoices.length === 0 && <p className="text-center text-xs text-white/40 py-10">{L('لا توجد فواتير', 'وەسڵ نییە')}</p>}
            </div>
          </SectionCard>
        )}
      </div>

      {/* ══ Recent Contracts + Upcoming Payments ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dash('dash_contracts') && (
          <SectionCard title={L('آخر العقود', 'دوایین گرێبەستەکان')} subtitle={`${contracts.length} ${L('عقد', 'گرێبەست')}`} icon={FileText} iconColor="#3b82f6" linkTo="/contracts" linkLabel={L('عرض الكل', 'هەموو')} lang={lang}>
            <div className="divide-y divide-slate-50">
              {recentContracts.map(c => {
                const st = statusMap[c.status] || { label: c.status, bg: '#f1f5f918', text: '#64748b', border: '#e2e8f030' };
                return (
                  <div key={c.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors group">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                      {(c.tenant_name || 'T').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.tenant_name || '—'}</p>
                      <p className="text-xs text-white/40 truncate">{c.property_name}{c.contract_number ? ` · ${c.contract_number}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl border" style={{ background: st.bg, color: st.text, borderColor: st.border }}>{st.label}</span>
                      {c.tenant_phone && (
                        <a href={waLink(c.tenant_phone)} target="_blank" rel="noreferrer"
                          className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110" style={{ background: '#dcfce7' }}>
                          <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
              {contracts.length === 0 && <p className="p-8 text-center text-sm text-slate-400">{L('لا توجد عقود', 'گرێبەست نییە')}</p>}
            </div>
          </SectionCard>
        )}

        {dash('dash_upcoming_payments') && (
          <UpcomingPayments invoices={invoices} contracts={contracts} settings={settings} lang={lang} />
        )}
      </div>

      {/* ══ Expiring + Overdue ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dash('dash_expiring_contracts') && <ExpiringContracts contracts={contracts} settings={settings} lang={lang} />}
        {dash('dash_overdue') && <OverdueList invoices={invoices} contracts={contracts} settings={settings} lang={lang} />}
      </div>

      {/* ══ Branch Summary ══ */}
      {dash('dash_branch_summary') && branches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch, idx) => {
            const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
            const bContracts = contracts.filter(c => c.branch_id === branch.id);
            const bProperties = properties.filter(p => p.branch_id === branch.id);
            const bRevenue = invoices.filter(i => { const c = contracts.find(c => c.id === i.contract_id); return c?.branch_id === branch.id && i.status === 'مدفوعة'; }).reduce((sum, i) => sum + (i.amount || 0), 0);
            const bActive = bContracts.filter(c => c.status === 'نشط').length;
            return (
              <div key={branch.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{lang === 'ku' ? (branch.name_ku || branch.name) : branch.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{lang === 'ku' ? (branch.company_name_ku || branch.company_name) : branch.company_name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { val: bProperties.length, label: L('عقار', 'خانووبەرە') },
                      { val: bActive, label: L('عقد نشط', 'گرێبەستی چالاک') },
                      { val: `${(bRevenue / 1000).toFixed(0)}K`, label: L('إيرادات', 'داهات') },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl py-3" style={{ background: `${color}0d`, border: `1px solid ${color}20` }}>
                        <p className="text-xl font-black" style={{ color }}>{item.val}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}