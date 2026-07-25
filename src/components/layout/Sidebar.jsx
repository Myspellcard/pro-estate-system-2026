import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Users, FileText, Receipt, 
  ChevronLeft, ChevronRight, X, Wrench, BarChart3, Settings, ChevronDown, TrendingUp, Shield, LogOut, MessageSquare, Tag, FolderOpen, Layers, Palette, Megaphone, UserCog, CheckSquare, User, Printer, Target, Gitlab, HardDriveDownload, Languages, HandCoins, Package, FileCheck, DollarSign, CircleDollarSign, Globe, QrCode, Hash, UserPlus, Percent
} from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { cn } from '@/lib/utils';
import { firebaseApi } from '@/api/firebaseClient';
import { useBranch } from '@/context/BranchContext';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const NAV_ITEMS_CONFIG = {
  dashboard:       { path: '/', tKey: 'nav.dashboard',        ar: 'لوحة التحكم',         ku: 'داشبۆرد',                   icon: LayoutDashboard, permKey: null,                   section: 'main' },
  properties:      { path: '/projects-view', tKey: 'nav.properties',   ar: 'العقارات',            ku: 'خانووبەرەکان',              icon: FolderOpen,      permKey: 'can_view_properties',  section: 'rent' },
  tenants:         { path: '/tenants',       tKey: 'nav.tenants',       ar: 'المستأجرون',          ku: 'کرێچییەکان',                icon: Users,           permKey: 'can_view_tenants',     section: 'rent' },
  rent_contracts:  { path: '/contracts',     tKey: 'nav.rent_contracts',ar: 'عقود الإيجار',        ku: 'گرێبەستەکانی کرێ',          icon: FileText,        permKey: 'can_view_contracts',   section: 'rent' },
  rent_invoices:   { path: '/invoices',      tKey: 'nav.rent_invoices', ar: 'فواتير الإيجار',      ku: 'وەسڵەکانی کرێ',             icon: Receipt,         permKey: 'can_view_invoices',    section: 'rent' },
  maintenance:     { path: '/maintenance',   tKey: 'nav.maintenance',   ar: 'الصيانة',             ku: 'چاككردنەوە',                icon: Wrench,         permKey: 'can_view_maintenance', section: 'rent' },
  sale_properties: { path: '/sales',         tKey: 'nav.sale_properties',ar:'العقارات',            ku: 'خانووبەرەکان',              icon: Building2,       permKey: 'can_view_properties',  section: 'sale' },
  sale_contracts:  { path: '/sale-contracts',tKey: 'nav.sale_contracts',ar: 'عقود المبيعات',       ku: 'گرێبەستەکانی فرۆشتن',      icon: FileText,        permKey: 'can_view_contracts',   section: 'sale' },
  sale_invoices:   { path: '/sale-invoices', tKey: 'nav.sale_invoices', ar: 'فواتير المبيعات',     ku: 'وەسڵەکانی فرۆشتن',         icon: Receipt,         permKey: 'can_view_invoices',    section: 'sale' },
  commissions:     { path: '/commissions',   tKey: 'nav.commissions',   ar: 'العمولات',            ku: 'دەلالی',                    icon: Percent,        permKey: 'can_view_commissions', section: 'common' },
  analytics:       { path: '/analytics',     tKey: 'nav.analytics',     ar: 'التحليلات',           ku: 'شیکاری',                    icon: BarChart3,      permKey: 'can_view_analytics',   section: 'common' },
  reports:         { path: '/reports',       tKey: 'nav.reports',       ar: 'التقارير',            ku: 'ڕاپۆرتەکان',                icon: TrendingUp,      permKey: 'can_view_reports',     section: 'common' },
  employee_tasks:  { path: '/employee-tasks',tKey: 'nav.employee_tasks',ar: 'مهام الموظفين',       ku: 'ئەرکەکانی کارمەندان',       icon: CheckSquare,     permKey: null,                   section: 'common' },
};

const dashboardItem = { ...NAV_ITEMS_CONFIG.dashboard, label: NAV_ITEMS_CONFIG.dashboard.ar, labelKu: NAV_ITEMS_CONFIG.dashboard.ku };
const rentOnlyItems = [NAV_ITEMS_CONFIG.properties, NAV_ITEMS_CONFIG.tenants, NAV_ITEMS_CONFIG.rent_contracts, NAV_ITEMS_CONFIG.rent_invoices, NAV_ITEMS_CONFIG.maintenance].map(i => ({ ...i, label: i.ar, labelKu: i.ku }));
const saleOnlyItems = [NAV_ITEMS_CONFIG.sale_properties, NAV_ITEMS_CONFIG.sale_contracts, NAV_ITEMS_CONFIG.sale_invoices].map(i => ({ ...i, label: i.ar, labelKu: i.ku }));
const commonItems   = [NAV_ITEMS_CONFIG.commissions, NAV_ITEMS_CONFIG.analytics, NAV_ITEMS_CONFIG.reports, NAV_ITEMS_CONFIG.employee_tasks].map(i => ({ ...i, label: i.ar, labelKu: i.ku }));
const crmItems = [
  { path: '/crm', icon: UserPlus, ar: 'العملاء المحتملون (CRM)', ku: 'کڕیارانی ئەگەری (CRM)', tKey: 'nav.crm' },
  { path: '/admin/crm-settings', icon: Settings, ar: 'إعدادات CRM', ku: 'ڕێکخستنەکانی CRM', tKey: 'nav.crm_settings' },
];

const rentNavItems = [dashboardItem, ...rentOnlyItems, ...commonItems];
const saleNavItems = [dashboardItem, ...saleOnlyItems, ...commonItems];

// Reusable nav link inside a card section
function CardNavLink({ item, collapsed, isActive, onClick, T }) {
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group",
        isActive
          ? "text-white shadow-lg"
          : "text-white/60 hover:text-white"
      )}
      style={isActive ? { background: 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)', borderRadius: '16px' } : {}}
    >
      <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", collapsed && "mx-auto", isActive ? "text-white" : "text-white/70 group-hover:text-white")} />
      {!collapsed && <span className="text-sm font-medium text-right">{T(item.tKey, item.label, item.labelKu)}</span>}
    </Link>
  );
}

// Card section wrapper
function SectionCard({ children, bg = 'transparent', open = false }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-2" style={{ background: open ? 'rgba(255,255,255,0.03)' : bg }}>
      {children}
    </div>
  );
}

// Section header badge button
function SectionHeader({ label, color, open, onToggle, collapsed, icon: Icon }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group"
      style={open ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' } : { background: 'transparent', border: '1px solid transparent' }}
    >
      {!collapsed && (
      <div className="flex items-center gap-3 min-w-0">
      {Icon && <Icon className="w-5 h-5 flex-shrink-0 transition-colors" style={{ color: open ? color : 'rgba(255,255,255,0.5)' }} />}
      <span className="text-sm font-semibold transition-colors text-right" style={{ color: open ? '#ffffff' : 'rgba(255,255,255,0.6)' }}>
        {label}
      </span>
      </div>
      )}
      {!collapsed && (
        <ChevronDown className={cn("w-5 h-5 transition-all flex-shrink-0", open && "rotate-180")} style={{ color: open ? color : 'rgba(255,255,255,0.3)' }} />
      )}
    </button>
  );
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const { branches, activeBranch, switchBranch, refreshBranches } = useBranch();
  const { user } = useAuth();
  const { lang, switchLang, T } = useLanguage();
  const { can, isAdmin, allowedBranchIds } = useUserPermissions();
  const [rentOpen, setRentOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [loansOpen, setLoansOpen] = useState(false);
  const [approvalSettingsOpen, setApprovalSettingsOpen] = useState(false);
  const [projectsCatOpen, setProjectsCatOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const navRef = useRef(null);

  const scrollToBottom = () => {
    if (navRef.current) {
      navRef.current.scrollTo({ top: navRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const visibleBranches = allowedBranchIds
    ? branches.filter(b => allowedBranchIds.includes(b.id))
    : branches;

  React.useEffect(() => {
    if (allowedBranchIds && branches.length > 0 && !allowedBranchIds.includes(activeBranch?.id)) {
      const first = branches.find(b => allowedBranchIds.includes(b.id));
      if (first) switchBranch(first);
    }
  }, [JSON.stringify(allowedBranchIds), branches.length]);

  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateBranchMode = useMutation({
    mutationFn: ({ id, business_mode }) => firebaseApi.entities.Branch.update(id, { business_mode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      refreshBranches();
    },
  });

  const handleModeSwitch = (mode) => {
    if (activeBranch?.id) {
      updateBranchMode.mutate({ id: activeBranch.id, business_mode: mode });
    }
  };

  const closeAll = () => { setMobileOpen(false); setBranchMenuOpen(false); };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 right-0 lg:top-4 lg:bottom-0 lg:right-4 z-50 transition-all duration-300 flex flex-col rounded-[24px] shadow-2xl lg:rounded-r-[24px]",
        collapsed ? "w-20" : "w-64",
        mobileOpen ? "translate-x-0" : "translate-x-[110%] lg:translate-x-0"
      )} style={{ background: 'linear-gradient(180deg, #131c2a 0%, #0f1620 100%)' }} dir="rtl">

        {/* Header */}
        <div className="p-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #35e5d3 0%, #16c784 100%)' }}>
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-white">
                    {activeBranch ? (lang === 'ku' ? (activeBranch.company_name_ku || activeBranch.company_name) : activeBranch.company_name) : 'دار العقار'}
                  </h1>
                  <p className="text-xs text-white/50 mt-0.5">
                    {activeBranch ? (lang === 'ku' ? (activeBranch.company_slogan_ku || activeBranch.company_slogan) : activeBranch.company_slogan) || T('general.system_subtitle', 'نظام إدارة الإيجارات', 'سیستەمی بەڕێوەبردنی کرێ') : T('general.system_subtitle', 'نظام إدارة الإيجارات', 'سیستەمی بەڕێوەبردنی کرێ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={scrollToBottom} className="lg:hidden text-white/40 hover:text-white" title="Scroll to bottom">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/40 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Branch selector */}
              {visibleBranches.length > 0 && (
                <div className="relative mb-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{T('general.branch', 'الفرع', 'لق')}</p>
                  <button
                    onClick={() => setBranchMenuOpen(p => !p)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-white text-sm transition-colors"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 shrink-0 text-white/50" />
                      <span className="truncate font-medium text-white/90">
                        {activeBranch ? (lang === 'ku' ? (activeBranch.name_ku || activeBranch.name) : activeBranch.name) : T('general.select_branch', 'اختر فرع', 'لق هەڵبژێرە')}
                      </span>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 shrink-0 text-white/30 transition-transform", branchMenuOpen && "rotate-180")} />
                  </button>
                  {branchMenuOpen && (
                    <div className="absolute top-full mt-1 right-0 left-0 rounded-xl shadow-2xl z-10 overflow-hidden" style={{ background: '#1e2235', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {visibleBranches.map(b => (
                        <button
                          key={b.id}
                          onClick={() => { switchBranch(b); setBranchMenuOpen(false); }}
                          className={cn(
                            "w-full text-right px-3 py-2.5 text-sm transition-colors flex items-center gap-2",
                            activeBranch?.id === b.id ? "text-white font-medium bg-white/10" : "text-white/60 hover:bg-white/05 hover:text-white"
                          )}
                        >
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-white/40" />
                          <div className="min-w-0">
                            <div className="truncate">{lang === 'ku' ? (b.name_ku || b.name) : b.name}</div>
                            <div className="text-xs text-white/30 truncate">{lang === 'ku' ? (b.company_name_ku || b.company_name) : b.company_name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Business Mode Toggle — radio style */}
              {activeBranch && (
                <div className="flex items-center gap-3">
                  {['rent', 'sale', 'both'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleModeSwitch(mode)}
                      className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                        activeBranch.business_mode === mode
                          ? "border-blue-400"
                          : "border-white/30"
                      )}>
                        {activeBranch.business_mode === mode && (
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                        )}
                      </div>
                      <span className={activeBranch.business_mode === mode ? "text-white" : "text-white/40"}>
                        {mode === 'rent' ? T('general.rent', 'إيجار', 'کرێ') : mode === 'sale' ? T('general.sale', 'بيع', 'فرۆشتن') : T('general.both', 'كلاهما', 'هەردووکیان')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Building2 className="w-7 h-7 text-white/60" />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav ref={navRef} className="flex-1 px-4 py-4 space-y-3 overflow-y-auto overflow-x-hidden min-h-0">

          {/* Dashboard */}
          <Link
            to="/"
            onClick={closeAll}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group relative",
              location.pathname === '/'
                ? "text-white"
                : "text-white/60 hover:text-white"
            )}
            style={location.pathname === '/' ? { background: 'linear-gradient(135deg, #16c784 0%, #0fa37f 100%)', borderRadius: '16px' } : {}}
          >
            <LayoutDashboard className={cn("w-5 h-5 shrink-0 transition-colors", collapsed && "mx-auto", location.pathname === '/' ? "text-white" : "text-white/70 group-hover:text-white")} />
            {!collapsed && <span className="text-sm font-medium">{T('nav.dashboard', 'لوحة التحكم', 'داشبۆرد')}</span>}
          </Link>

          {/* RENT Card */}
          {(activeBranch?.business_mode === 'rent' || activeBranch?.business_mode === 'both' || !activeBranch) && (
            <SectionCard open={rentOpen && !collapsed}>
              {!collapsed && (
                <SectionHeader
                  label={lang === 'ku' ? 'کرێ' : 'الإيجار'}
                  color="#3b82f6"
                  open={rentOpen}
                  onToggle={() => setRentOpen(o => !o)}
                  collapsed={collapsed}
                  icon={FolderOpen}
                />
              )}
              {(rentOpen || collapsed) && (
                <div className="px-2 pb-2 space-y-0.5">
                  {rentOnlyItems.filter(item => !item.permKey || can(item.permKey)).map(item => (
                    <CardNavLink key={item.path} item={item} collapsed={collapsed} isActive={location.pathname === item.path} onClick={closeAll} T={T} />
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* SALE Card */}
          {(activeBranch?.business_mode === 'sale' || activeBranch?.business_mode === 'both') && (
            <SectionCard open={saleOpen && !collapsed}>
              {!collapsed && (
                <SectionHeader
                  label={lang === 'ku' ? 'فرۆشتن' : 'المبيعات'}
                  color="#f59e0b"
                  open={saleOpen}
                  onToggle={() => setSaleOpen(o => !o)}
                  collapsed={collapsed}
                  icon={Building2}
                />
              )}
              {(saleOpen || collapsed) && (
                <div className="px-2 pb-2 space-y-0.5">
                  {saleOnlyItems.filter(item => !item.permKey || can(item.permKey)).map(item => (
                    <CardNavLink key={item.path} item={item} collapsed={collapsed} isActive={location.pathname === item.path} onClick={closeAll} T={T} />
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Finance — standalone card */}
          {(activeBranch?.business_mode === 'sale' || activeBranch?.business_mode === 'both') && (
            <Link
              to="/finance"
              onClick={closeAll}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200",
                location.pathname === '/finance'
                  ? "text-white font-semibold"
                  : "text-white/70 hover:text-white"
              )}
              style={{ background: location.pathname === '/finance' ? 'rgba(255,255,255,0.12)' : '#111827' }}
            >
              <CircleDollarSign className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span className="text-sm flex-1 text-right">{T('nav.finance', 'القسم المالي', 'بەشی دارایی')}</span>}
            </Link>
          )}

          {/* Common items — each as own mini card row */}
          {commonItems.filter(item => !item.permKey || can(item.permKey)).map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeAll}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200",
                  isActive ? "text-white font-semibold" : "text-white/70 hover:text-white"
                )}
                style={{ background: isActive ? 'rgba(255,255,255,0.12)' : '#111827' }}
              >
                <item.icon className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
                {!collapsed && <span className="text-sm flex-1 text-right">{T(item.tKey, item.label, item.labelKu)}</span>}
              </Link>
            );
          })}

          {/* CRM Card */}
          <SectionCard open={crmOpen && !collapsed}>
            {!collapsed && (
              <SectionHeader
                label={T('nav.crm_section', 'العملاء المحتملون (CRM)', 'کڕیارانی ئەگەری (CRM)')}
                color="#0ea5e9"
                open={crmOpen}
                onToggle={() => setCrmOpen(o => !o)}
                collapsed={collapsed}
                icon={UserPlus}
              />
            )}
            {(crmOpen || collapsed) && (
              <div className="px-2 pb-2 space-y-0.5">
                {crmItems.map(item => (
                  <CardNavLink key={item.path} item={{ ...item, label: item.ar, labelKu: item.ku }} collapsed={collapsed} isActive={location.pathname === item.path} onClick={closeAll} T={T} />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Loans & Requests Card */}
          <SectionCard open={loansOpen && !collapsed}>
            {!collapsed && (
              <SectionHeader
                label={T('general.loans_requests', 'الموافقات', 'وەرگرتنی رەزامەندی')}
                color="#92400e"
                open={loansOpen}
                onToggle={() => setLoansOpen(o => !o)}
                collapsed={collapsed}
                icon={HandCoins}
              />
            )}
            {collapsed && (
              <div className="px-2 py-2 space-y-0.5">
                <Link to="/employee-permissions?filter=loans" onClick={closeAll} className="flex items-center justify-center p-2 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-colors"><HandCoins className="w-4 h-4" /></Link>
              </div>
            )}
            {loansOpen && !collapsed && (
              <div className="px-2 pb-2 space-y-0.5">
                {[
                  { path: '/employee-permissions?filter=permissions', icon: FileCheck, ar: 'طلب مهلة', ku: 'وەرگرتنی مۆڵەت', tKey: 'general.permissions_required' },
                  { path: '/employee-permissions?filter=products', icon: Package, ar: 'المشتريات', ku: 'کڕینەکان', tKey: 'general.products_required' },
                  { path: '/employee-permissions?filter=loans', icon: HandCoins, ar: 'طلب قرض', ku: 'داواکاری قەرز', tKey: 'general.loans_required' },
                ].map(item => {
                  const fullPath = item.path.split('?')[0];
                  const search = '?' + (item.path.split('?')[1] || '');
                  const isActive = location.pathname === fullPath && location.search === search;
                  return (
                    <Link key={item.path} to={item.path} onClick={closeAll}
                      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        isActive ? "bg-white/15 text-white font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}>
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm text-right">{T(item.tKey, item.ar, item.ku)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Admin section */}
          {(isAdmin || can('can_manage_branches') || can('can_manage_users')) && (
            <>
              {/* Branches & Users as SectionCard */}
              <SectionCard open={adminOpen && !collapsed}>
                {!collapsed && (
                  <SectionHeader
                    label={T('admin.section_label', 'إدارة الفروع', 'بەرێوەبردنی لقەکان')}
                    color="#6d28d9"
                    open={adminOpen}
                    onToggle={() => setAdminOpen(o => !o)}
                    collapsed={collapsed}
                    icon={Settings}
                  />
                )}
                {(adminOpen || collapsed) && (
                  <div className="px-2 pb-2 space-y-0.5">
                    {[
                      (isAdmin || can('can_manage_branches')) && { path: '/admin/branches', icon: Settings, ar: 'إدارة الفروع', ku: 'بەرێوەبردنی لقەکان', tKey: 'admin.branches' },
                      (isAdmin || can('can_manage_users')) && { path: '/admin/users', icon: Shield, ar: 'المستخدمون والأدوار', ku: 'بەکارهێنەر و ڕۆڵەکان', tKey: 'admin.users' },
                    ].filter(Boolean).map(item => (
                      <CardNavLink key={item.path} item={{ ...item, label: item.ar, labelKu: item.ku }} collapsed={collapsed} isActive={location.pathname === item.path} onClick={closeAll} T={T} />
                    ))}
                  </div>
                )}
              </SectionCard>

              {/* Settings SectionCard */}
              {isAdmin && (
                <SectionCard open={settingsOpen && !collapsed}>
                  {!collapsed && (
                    <SectionHeader
                      label={T('admin.settings_section', 'إعدادات لوحة التحكم', 'ڕێکخستنەکانی داشبۆرد')}
                      color="#065f46"
                      open={settingsOpen}
                      onToggle={() => setSettingsOpen(o => !o)}
                      collapsed={collapsed}
                      icon={Settings}
                    />
                  )}
                  {(settingsOpen || collapsed) && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {[
                        { path: '/admin/dashboard-settings', icon: Settings, ar: 'إعدادات لوحة التحكم', ku: 'ڕێکخستنەکانی داشبۆرد', tKey: 'admin.dashboard_settings' },
                        { path: '/admin/print-settings', icon: Printer, ar: 'إعدادات الطباعة', ku: 'ڕێکخستنەکانی پرینت', tKey: 'admin.print_settings' },
                        { path: '/admin/barcode-settings', icon: QrCode, ar: 'إعدادات الباركود', ku: 'ڕێکخستنەکانی بارکۆد', tKey: 'admin.barcode_settings' },
                        { path: '/admin/whatsapp-templates', icon: MessageSquare, ar: 'قوالب واتساب', ku: 'داڕشتنەکانی واتسەپ', tKey: 'admin.whatsapp_templates' },
                        { path: '/admin/property-status-colors', icon: Palette, ar: 'ألوان الحالة', ku: 'رەنگەکانی دۆخ', tKey: 'admin.property_status_colors' },
                        { path: '/admin/property-purposes', icon: Target, ar: 'الأغراض', ku: 'مەبەستەکان', tKey: 'admin.property_purposes' },
                        { path: '/admin/translations', icon: Languages, ar: 'الترجمات', ku: 'وەرگێڕانەکان', tKey: 'admin.translations' },
                        { path: '/admin/advertisements', icon: Megaphone, ar: 'الإعلانات', ku: 'ڕیکلامەکان', tKey: 'admin.advertisements' },
                        { path: '/admin/currencies', icon: DollarSign, ar: 'العملات', ku: 'دراوەکان', tKey: 'admin.currencies' },
                        { path: '/admin/numbering-settings', icon: Hash, ar: 'ترقيم المستندات', ku: 'ژمارەدانی بەڵگەنامەکان', tKey: 'admin.numbering_settings' },
                      ].map(item => (
                        <CardNavLink key={item.path} item={{ ...item, label: item.ar, labelKu: item.ku }} collapsed={collapsed} isActive={location.pathname === item.path} onClick={closeAll} T={T} />
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* HR SectionCard */}
              {isAdmin && (
                <SectionCard open={hrOpen && !collapsed}>
                  {!collapsed && (
                    <SectionHeader
                      label={T('admin.hr_section', 'تقارير الموارد البشرية', 'ڕاپۆرتی HR')}
                      color="#be185d"
                      open={hrOpen}
                      onToggle={() => setHrOpen(o => !o)}
                      collapsed={collapsed}
                      icon={Target}
                    />
                  )}
                  {(hrOpen || collapsed) && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {[
                        { path: '/hr-reports', icon: Shield, ar: 'تقارير الموارد البشرية', ku: 'ڕاپۆرتی HR', tKey: 'admin.hr_reports' },
                        { path: '/employee-goals', icon: Target, ar: 'الأهداف', ku: 'ئامانجەکان', tKey: 'nav.employee_goals' },
                        { path: '/organization-structure', icon: Users, ar: 'الهيكل التنظيمي', ku: 'هەیکەلی کۆمپانیا', tKey: 'nav.org_structure' },
                      ].map(item => (
                        <CardNavLink key={item.path} item={{ ...item, label: item.ar, labelKu: item.ku }} collapsed={collapsed} isActive={location.pathname === item.path} onClick={closeAll} T={T} />
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Remaining admin flat links */}
              <div className="space-y-0.5">
                {[
                  isAdmin && { path: '/admin/employees', icon: UserCog, ar: 'الموظفون', ku: 'کارمەندەکان', tKey: 'admin.employees' },
                  isAdmin && { path: '/admin/departments', icon: Building2, ar: 'الأقسام', ku: 'بەشەکان', tKey: 'admin.departments' },
                ].filter(Boolean).map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={closeAll}
                      className={cn("flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                        isActive ? "bg-white/12 text-white font-medium" : "text-white/50 hover:bg-white/07 hover:text-white/80"
                      )}>
                      <item.icon className={cn("w-4 h-4 shrink-0", collapsed && "mx-auto")} />
                      {!collapsed && <span className="text-sm">{T(item.tKey, item.ar, item.ku)}</span>}
                    </Link>
                  );
                })}
              </div>

              {/* Projects & Categories SectionCard */}
              {isAdmin && (
                <SectionCard open={projectsCatOpen && !collapsed}>
                  {!collapsed && (
                    <SectionHeader
                      label={T('admin.projects_and_categories', 'المشاريع والتصنيفات', 'پڕۆژەکان و پۆڵبەندییەکان')}
                      color="#0e7490"
                      open={projectsCatOpen}
                      onToggle={() => setProjectsCatOpen(o => !o)}
                      collapsed={collapsed}
                      icon={FolderOpen}
                    />
                  )}
                  {(projectsCatOpen || collapsed) && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {[
                        { path: '/admin/projects', icon: FolderOpen, ar: 'المشاريع', ku: 'پڕۆژەکان', tKey: 'admin.projects' },
                        (activeBranch?.business_mode === 'rent' || activeBranch?.business_mode === 'both') && { path: '/admin/project-categories', icon: Layers, ar: 'تصنيفات الإيجار', ku: 'پۆلەکانی کرێ', tKey: 'admin.rent_categories' },
                        (activeBranch?.business_mode === 'sale' || activeBranch?.business_mode === 'both') && { path: '/admin/sale-categories', icon: Layers, ar: 'تصنيفات البيع', ku: 'پۆلەکانی فرۆشتن', tKey: 'admin.sale_categories' },
                        { path: '/admin/clauses', icon: FileText, ar: 'بنود عقد الإيجار', ku: 'بەندەکانی گرێبەستی کرێ', tKey: 'admin.rent_clauses' },
                        { path: '/admin/sale-contract-clauses', icon: FileText, ar: 'بنود عقد البيع', ku: 'بەندەکانی گرێبەستی فرۆشتن', tKey: 'admin.sale_clauses' },
                      ].filter(Boolean).map(item => (
                        <CardNavLink key={item.path} item={{ ...item, label: item.ar, labelKu: item.ku }} collapsed={collapsed} isActive={location.pathname === item.path} onClick={closeAll} T={T} />
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Approval Settings SectionCard */}
              {isAdmin && (
                <SectionCard open={approvalSettingsOpen && !collapsed}>
                  {!collapsed && (
                    <SectionHeader
                      label={T('admin.approval_settings', 'إعدادات الموافقات', 'ڕێکخستنەکانی پەسەندکردن')}
                      color="#b45309"
                      open={approvalSettingsOpen}
                      onToggle={() => setApprovalSettingsOpen(o => !o)}
                      collapsed={collapsed}
                      icon={HandCoins}
                    />
                  )}
                  {(approvalSettingsOpen || collapsed) && (
                    <div className="px-2 pb-2 space-y-0.5">
                      {[
                        { path: '/admin/permission-approvers', icon: HandCoins, ar: 'إعدادات القروض', ku: 'ڕێکخستنەکانی قەرز', tKey: 'admin.loan_approvers' },
                        { path: '/admin/permission-approvers?tab=permissions', icon: FileCheck, ar: 'إعدادات الإذن', ku: 'ڕێکخستنەکانی مۆڵەت', tKey: 'admin.permission_approvers_link' },
                        { path: '/admin/permission-approvers?tab=products', icon: Package, ar: 'إعدادات المنتجات', ku: 'ڕێکخستنەکانی بەرهەم', tKey: 'admin.products_approvers' },
                      ].map(item => {
                        const fullPath = item.path.split('?')[0];
                        const search = item.path.includes('?') ? '?' + item.path.split('?')[1] : '';
                        const isActive = location.pathname === fullPath && (search === '' || location.search === search);
                        return (
                          <CardNavLink key={item.path} item={{ ...item, label: item.ar, labelKu: item.ku }} collapsed={collapsed} isActive={isActive} onClick={closeAll} T={T} />
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              )}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 pb-3 pt-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Top row: Language + Backup */}
          {!collapsed && (
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                {['ar', 'ku'].map(l => (
                  <button key={l} onClick={() => switchLang(l)}
                    className={cn("text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-colors",
                      lang === l ? "bg-[#35e5d3] text-[#0f1620]" : "text-white/35 hover:text-white/60 bg-white/05"
                    )}>
                    {l === 'ar' ? 'العربية' : (lang === 'ar' ? 'الكردية' : 'کوردی')}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <Link to="/backup" onClick={closeAll}
                  className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] transition-colors",
                    location.pathname === '/backup' ? "bg-blue-600 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/07"
                  )}>
                  <HardDriveDownload className="w-3.5 h-3.5 shrink-0" />
                  <span>{T('general.backup', 'النسخ الاحتياطي', 'بەکاپی داتا')}</span>
                </Link>
              )}
            </div>
          )}

          {/* Bottom row: User + Logout */}
          {!collapsed && user && (
            <div className="flex items-center justify-between gap-1">
              <Link to="/profile" onClick={closeAll}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-white/70 hover:text-white hover:bg-white/07 transition-colors min-w-0 flex-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: user.avatar_color || '#6366f1' }}>
                  {(user.full_name || user.username || '?').charAt(0)}
                </div>
                <span className="text-[10px] truncate">{user.full_name || user.username}</span>
              </Link>
              <button
                type="button"
                onClick={() => firebaseApi.auth.logout()}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-white/50 hover:text-white hover:bg-white/05"
                title={T('general.logout', 'تسجيل الخروج', 'دەرچوون')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center py-1.5 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/07 transition-colors"
          >
            {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>
    </>
  );
}
