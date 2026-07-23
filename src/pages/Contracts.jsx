import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { FileText, Building2, Layers, Eye, Pencil, Trash2, Download, Phone, MessageCircle, Send, Search, FileSpreadsheet } from 'lucide-react';
import { generateContractsPDF, generateSingleContractPDF } from '@/utils/pdfExport';
import { format, parseISO, addMonths, addDays } from 'date-fns';
import { useEffect } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import ContractForm from '@/components/contracts/ContractForm';
import ContractDetail from '@/components/contracts/ContractDetail';
import RentalPermissionPrint from '@/components/contracts/RentalPermissionPrint';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusColors = {
  "نشط": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "منتهي": "bg-gray-100 text-gray-600 border-gray-200",
  "ملغي": "bg-red-50 text-red-700 border-red-200",
  "معلق": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function Contracts() {
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [newContractPermission, setNewContractPermission] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentMessages, setSentMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('sentContractMessages');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  
  const queryClient = useQueryClient();
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const statusKuMap = { 'نشط': 'چالاک', 'منتهي': 'کۆتایی', 'ملغي': 'هەڵوەشاوە', 'معلق': 'راگیراو' };
  const statusArMap = { 'چالاک': 'نشط', 'کۆتایی': 'منتهي', 'هەڵوەشاوە': 'ملغي', 'راگیراو': 'معلق' };
  const statusCanonical = (status) => statusArMap[status] || status;
  const statusLabel = (status) => {
    const ar = statusCanonical(status);
    return L(ar, statusKuMap[ar] || ar);
  };
  const { can } = useUserPermissions();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Project.filter({ is_active: true, branch_id: activeBranch.id })
      : firebaseApi.entities.Project.filter({ is_active: true }),
  });

  const { data: allContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['contracts', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Contract.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Contract.list('-created_date'),
  });

  const { data: properties = [] } = useQuery({ queryKey: ['properties', activeBranch?.id], queryFn: () => activeBranch?.id ? firebaseApi.entities.Property.filter({ branch_id: activeBranch.id }) : firebaseApi.entities.Property.list() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => firebaseApi.entities.Tenant.list() });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: () => firebaseApi.entities.Invoice.list() });
  const { data: contractTenantTemplates = [] } = useQuery({ queryKey: ['msg-tpl-ct'], queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'contract_to_tenant', is_active: true }) });
  const { data: contractOwnerTemplates = [] } = useQuery({ queryKey: ['msg-tpl-co'], queryFn: () => firebaseApi.entities.MessageTemplate.filter({ event_type: 'contract_to_owner', is_active: true }) });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Contract.create(data),
    onSuccess: async (createdContract) => {
      // Increment rental_permission_start counter — always read fresh to avoid stale value
      const freshList = await firebaseApi.entities.AppSettings.list();
      const appSettings = freshList.find(s => s.key === 'default');
      if (appSettings?.id) {
        const currentStart = appSettings?.numbering?.rental_permission_start ?? 1;
        await firebaseApi.entities.AppSettings.update(appSettings.id, {
          numbering: { ...(appSettings.numbering || {}), rental_permission_start: Number(currentStart) + 1 }
        });
        queryClient.invalidateQueries({ queryKey: ['app_settings'] });
      }
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowForm(false);
      setNewContractPermission(createdContract);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Update contract first
      await firebaseApi.entities.Contract.update(id, data);
      
      // Regenerate invoices if key fields changed (duration, rent, dates, payment interval)
      const oldContract = allContracts.find(c => c.id === id);
      if (oldContract && (
        oldContract.duration_months !== data.duration_months ||
        oldContract.payment_interval_months !== data.payment_interval_months ||
        oldContract.monthly_rent !== data.monthly_rent ||
        oldContract.start_date !== data.start_date ||
        oldContract.end_date !== data.end_date ||
        oldContract.contract_number !== data.contract_number
      )) {
        // Get existing invoices for this contract
        const contractInvoices = invoices.filter(inv => inv.contract_id === id);
        const rentInvoices = contractInvoices.filter(inv => inv.type === 'إيجار' || inv.type_ku === 'کرێ');
        const paidInvoices = rentInvoices.filter(inv => inv.status === 'مدفوعة' || inv.status_ku === 'پارەدراو');
        
        // Delete unpaid invoices
        const unpaidInvoices = rentInvoices.filter(inv => inv.status !== 'مدفوعة' && inv.status_ku !== 'پارەدراو');
        for (const inv of unpaidInvoices) {
          try { await firebaseApi.entities.Invoice.delete(inv.id); } catch (_) {}
        }
        
        // Regenerate rent invoices (fetch fresh list after deletions)
        const freshInvoices = await firebaseApi.entities.Invoice.filter({ contract_id: id });
        const remainingPaidPeriods = new Set(
          freshInvoices
            .filter(inv => inv.status === 'مدفوعة' || inv.status_ku === 'پارەدراو')
            .map(inv => inv.period_from)
        );

        const start = parseISO(data.start_date);
        const months = data.duration_months || 12;
        const paymentInterval = data.payment_interval_months || 1;
        
        for (let i = 0; i < months; i++) {
          const periodFrom = addMonths(start, i);
          const periodFromStr = format(periodFrom, 'yyyy-MM-dd');
          
          // Skip if a paid invoice already exists for this period
          if (remainingPaidPeriods.has(periodFromStr)) continue;

          const periodTo = addDays(addMonths(start, i + 1), -1);
          const monthsPerCycle = paymentInterval;
          const cycleIndex = Math.floor(i / monthsPerCycle);
          const dueDate = addMonths(start, cycleIndex * monthsPerCycle);
          const invoiceNumber = `INV-${data.contract_number}-M${i + 1}`;
          
          await firebaseApi.entities.Invoice.create({
            invoice_number: invoiceNumber,
            contract_id: id,
            contract_number: data.contract_number,
            tenant_name: data.tenant_name,
            property_name: data.property_name,
            type: 'إيجار',
            status: 'معلقة',
            type_ku: 'کرێ',
            status_ku: 'چاوەڕوان',
            amount: data.monthly_rent,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            period_from: periodFromStr,
            period_to: format(periodTo, 'yyyy-MM-dd'),
            created_date: new Date().toISOString(),
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contracts'] }); setShowForm(false); setEditingContract(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Contract.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });

  const handleSubmit = (data) => {
    if (editingContract) updateMutation.mutate({ id: editingContract.id, data });
    else createMutation.mutate({ ...data, branch_id: activeBranch?.id || '' });
  };

  const handleExportCSV = () => {
    const headers = ['رقم العقد', 'المستأجر', 'المالك', 'العقار', 'الحالة', 'تاريخ البداية', 'تاريخ النهاية', 'المدة (أشهر)', 'الإيجار الشهري', 'الإيجار الكلي', 'العملة'];
    const rows = projectContracts.map(c => [
      c.contract_number || '—',
      c.tenant_name || '—',
      c.owner_name || '—',
      c.property_name || '—',
      c.status,
      c.start_date || '—',
      c.end_date || '—',
      c.duration_months || '—',
      c.monthly_rent?.toLocaleString() || '0',
      c.total_rent?.toLocaleString() || '0',
      c.currency_symbol || 'د.ع'
    ]);
    
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts_${selectedProject?.id || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };



  if (projectsLoading || contractsLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const NO_PROJECT_ID = '__no_project__';

  const projectContractsAll = selectedProject
    ? selectedProject.id === NO_PROJECT_ID
      ? allContracts.filter(c => {
          const property = properties.find(p => p.id === c.property_id);
          return !property?.project_id;
        })
      : allContracts.filter(c => {
          const property = properties.find(p => p.id === c.property_id);
          return property?.project_id === selectedProject.id;
        })
    : allContracts;

  const projectCurrencies = [...new Set(projectContractsAll.map(c => c.currency_symbol || 'د.ع'))];

  const projectContractsByCurrency = filterCurrency === 'all'
    ? projectContractsAll
    : projectContractsAll.filter(c => (c.currency_symbol || 'د.ع') === filterCurrency);

  const q = searchQuery.trim().toLowerCase();
  const projectContractsByStatus = statusFilter === 'all'
    ? projectContractsByCurrency
    : projectContractsByCurrency.filter(c => statusCanonical(c.status) === statusFilter);
  const projectContracts = q
    ? projectContractsByStatus.filter(c =>
        (c.contract_number || '').toLowerCase().includes(q) ||
        (c.tenant_name || '').toLowerCase().includes(q) ||
        (c.owner_name || '').toLowerCase().includes(q) ||
        (c.property_name || '').toLowerCase().includes(q) ||
        (c.tenant_phone || '').includes(q)
      )
    : projectContractsByStatus;

  return (
    <div>
      <PageHeader
        title={selectedProject ? L(selectedProject.name, selectedProject.name_ku) : L('المشاريع', 'پڕۆژەکان')}
        subtitle={selectedProject ? L('عرض عقود المشروع', 'پیشاندانی گرێبەستەکانی پڕۆژە') : L('استعراض العقود حسب المشاريع', 'پیشاندانی گرێبەستەکان بەپێی پڕۆژەکان')}
        actionLabel={selectedProject ? L('العودة لكل المشاريع', 'گەڕانەوە بۆ هەموو پڕۆژەکان') : null}
        onAction={selectedProject ? () => setSelectedProject(null) : null}
      />

      {!selectedProject ? (
        projects.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={L('لا توجد مشاريع', 'هیچ پڕۆژەیەک نییە')}
            description={L('أضف مشاريع جديدة من لوحة الإدارة', 'پڕۆژەی نوێ زیادبکە لە بەشی بەڕێوەبردن')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Contracts with no project */}
            {(() => {
              const noProjectContrs = allContracts.filter(c => {
                const property = properties.find(p => p.id === c.property_id);
                return !property?.project_id;
              });
              if (noProjectContrs.length === 0) return null;
              return (
                <div
                  onClick={() => setSelectedProject({ id: '__no_project__', name: 'بدون مشروع', name_ku: 'بێ پڕۆژە' })}
                  className="group relative bg-card rounded-3xl border border-dashed border-border shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <FileText className="w-16 h-16 text-slate-400" />
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-slate-700 mb-1">{L('بدون مشروع', 'بێ پڕۆژە')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{L('عقود غير مرتبطة بمشروع', 'گرێبەستە پەیوەندیناکراوەکان')}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>{noProjectContrs.length}</span>
                      </div>
                      <Button size="sm" className="gap-1.5" onClick={e => { e.stopPropagation(); setSelectedProject({ id: '__no_project__', name: 'بدون مشروع', name_ku: 'بێ پڕۆژە' }); }}>
                        <Layers className="w-3.5 h-3.5" />
                        {L('عرض العقود', 'پیشاندانی گرێبەستەکان')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
            {projects.map(project => {
              const projectProps = properties.filter(p => p.project_id === project.id);
              const projectContrs = allContracts.filter(c => {
                const property = properties.find(p => p.id === c.property_id);
                return property?.project_id === project.id;
              });
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="group relative bg-card rounded-3xl border border-border shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden">
                    {project.image_url ? (
                      <img src={project.image_url} alt={L(project.name, project.name_ku)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 right-4 left-4">
                      <h3 className="text-xl font-bold text-white mb-1">{L(project.name, project.name_ku)}</h3>
                      {project.city && (
                        <div className="flex items-center gap-1.5 text-white/80 text-xs">
                          <Building2 className="w-3 h-3" />
                          <span>{L(project.city, project.city_ku)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{L(project.description, project.description_ku)}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{projectProps.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span>{projectContrs.length}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                        }}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        {L('عرض العقود', 'پیشاندانی گرێبەستەکان')}
                      </Button>
                    </div>
                  </div>

                  {project.is_active && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-emerald-500 text-white border-0">
                        {L('نشط', 'چالاک')}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold">{L('عقود المشروع', 'گرێبەستەکانی پڕۆژە')}</h2>
              <p className="text-sm text-muted-foreground">{projectContracts.length} {L('عقد', 'گرێبەست')}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={L('بحث باسم المستأجر أو العقار...', 'گەڕان بەناوی کرێچی یان خانوو...')}
                  className="pr-9 pl-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-ring w-64"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportCSV()}>
                <FileSpreadsheet className="w-4 h-4" /> {L('تصدير', 'هەناردەکردن')}
              </Button>
              {can('can_edit_contracts') && (
                <Button size="sm" className="gap-1" onClick={() => { setEditingContract(null); setShowForm(true); }}>
                  + {L('إنشاء عقد', 'دروستکردنی گرێبەست')}
                </Button>
              )}
            </div>
          </div>

          {projectCurrencies.length > 1 && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">{L('العملة:', 'دراو:')}</span>
              <button
                onClick={() => setFilterCurrency('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${filterCurrency === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border text-muted-foreground hover:border-primary/50'}`}
              >
                {L('الكل', 'هەموو')}
              </button>
              {projectCurrencies.map(sym => (
                <button
                  key={sym}
                  onClick={() => setFilterCurrency(sym === filterCurrency ? 'all' : sym)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${filterCurrency === sym ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-white border-border text-muted-foreground hover:border-secondary/50'}`}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}

          {/* Status filter */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`bg-card rounded-2xl border p-4 flex items-center gap-3 text-right transition-all hover:shadow-md ${statusFilter === 'all' ? 'border-primary ring-2 ring-primary/30 shadow-sm' : 'border-border'}`}
            >
              <div className="w-3 h-10 rounded-full bg-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">{L('الكل', 'هەموو')}</p>
                <p className="text-2xl font-bold leading-tight">{projectContractsByCurrency.length}</p>
              </div>
            </button>
            {Object.keys(statusColors).map(status => {
              const dotMap = { 'نشط': 'bg-emerald-500', 'منتهي': 'bg-gray-400', 'ملغي': 'bg-red-500', 'معلق': 'bg-amber-500' };
              const count = projectContractsByCurrency.filter(c => statusCanonical(c.status) === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(prev => prev === status ? 'all' : status)}
                  className={`bg-card rounded-2xl border p-4 flex items-center gap-3 text-right transition-all hover:shadow-md ${statusFilter === status ? 'border-primary ring-2 ring-primary/30 shadow-sm' : 'border-border'}`}
                >
                  <div className={`w-3 h-10 rounded-full ${dotMap[status]} shrink-0`} />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{statusLabel(status)}</p>
                    <p className="text-2xl font-bold leading-tight">{count}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {projectContracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={L('لا توجد عقود', 'گرێبەست نییە')}
              description={L('أضف عقوداً لهذا المشروع', 'گرێبەست بۆ ئەم پڕۆژەیە زیادبکە')}
              actionLabel={can('can_edit_contracts') ? L('إنشاء عقد', 'دروستکردنی گرێبەست') : null}
              onAction={can('can_edit_contracts') ? () => { setEditingContract(null); setShowForm(true); } : null}
            />
          ) : (
            <div className="space-y-4">
              {projectContracts.map(contract => (
                <div key={contract.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold">{contract.contract_number || L('عقد', 'گرێبەست')}</h3>
                          <Badge className={`text-xs border ${statusColors[statusCanonical(contract.status)] || ''}`}>{statusLabel(contract.status)}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{contract.property_name}</span>
                          {contract.start_date && (
                            <span className="flex items-center gap-1">
                              <span>{format(parseISO(contract.start_date), 'dd/MM/yyyy')}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] font-semibold text-sky-600">{L('المستأجر', 'کرێچی')}:</span>
                            <span className="text-xs font-bold text-sky-900">{contract.tenant_name}</span>
                            {contract.tenant_phone && (
                                    <div className="flex items-center gap-1">
                                      {can('can_call_tenants') && (
                                        <a href={`tel:${contract.tenant_phone}`} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-sky-100 transition-colors">
                                          <Phone className="w-4 h-4 text-sky-600" />
                                        </a>
                                      )}
                                      {can('can_whatsapp_tenants') && (
                                        <a href={`https://wa.me/${contract.tenant_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-sky-100 transition-colors">
                                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                                        </a>
                                      )}
                                      {can('can_send_contract_whatsapp') && (
                                  <button
                                    onClick={async () => {
                                      const msg = encodeURIComponent(
                                        `السلام عليكم ${contract.tenant_name}،\nالعقار: ${contract.property_name}\nمبلغ الإيجار: ${contract.monthly_rent?.toLocaleString()}\nالمدة: ${contract.duration_months} أشهر\nمن ${contract.start_date} إلى ${contract.end_date}`
                                      );
                                      window.open(`https://wa.me/${contract.tenant_phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                      const newSent = { ...sentMessages, [`tenant-${contract.id}`]: true };
                                      setSentMessages(newSent);
                                      localStorage.setItem('sentContractMessages', JSON.stringify(newSent));
                                    }}
                                    disabled={sentMessages[`tenant-${contract.id}`]}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${sentMessages[`tenant-${contract.id}`] ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-sky-100'}`}
                                    title={L('إرسال رسالة جاهزة', 'ناردنی پەیامی ئامادە')}
                                  >
                                    <Send className={`w-4 h-4 ${sentMessages[`tenant-${contract.id}`] ? 'text-gray-400' : 'text-blue-600'}`} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {contract.owner_name && contract.owner_phone && (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                              <span className="text-[10px] font-semibold text-amber-600">{L('المالك', 'خاوەن')}:</span>
                              <span className="text-xs font-bold text-amber-900">{contract.owner_name}</span>
                              <div className="flex items-center gap-1">
                                {can('can_call_property_owners') && (
                                  <a href={`tel:${contract.owner_phone}`} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-100 transition-colors">
                                    <Phone className="w-4 h-4 text-amber-600" />
                                  </a>
                                )}
                                {can('can_whatsapp_property_owners') && (
                                  <a href={`https://wa.me/${contract.owner_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-100 transition-colors">
                                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                                  </a>
                                )}
                                {can('can_send_contract_whatsapp') && (
                                  <button
                                    onClick={async () => {
                                      const msg = encodeURIComponent(
                                        `السلام عليكم ${contract.owner_name}،\nالعقار: ${contract.property_name}\nمبلغ الإيجار: ${contract.monthly_rent?.toLocaleString()}\nالمدة: ${contract.duration_months} أشهر\nمن ${contract.start_date} إلى ${contract.end_date}`
                                      );
                                      window.open(`https://wa.me/${contract.owner_phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                      const newSent = { ...sentMessages, [`owner-${contract.id}`]: true };
                                      setSentMessages(newSent);
                                      localStorage.setItem('sentContractMessages', JSON.stringify(newSent));
                                    }}
                                    disabled={sentMessages[`owner-${contract.id}`]}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${sentMessages[`owner-${contract.id}`] ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-amber-100'}`}
                                    title={L('إرسال رسالة جاهزة', 'ناردنی پەیامی ئامادە')}
                                  >
                                    <Send className={`w-4 h-4 ${sentMessages[`owner-${contract.id}`] ? 'text-gray-400' : 'text-blue-600'}`} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">{L('الإيجار الشهري', 'کرێی مانگانە')}</p>
                        <p className="font-bold text-lg text-secondary">
                          <span className="text-xs font-medium text-muted-foreground ml-1">{contract.currency_symbol || 'د.ع'}</span>
                          {contract.monthly_rent?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          if (!contract.is_verified) {
                            setNewContractPermission(contract);
                          } else {
                            setViewingContract(contract);
                          }
                        }} title={L('سجل العقد', 'تۆماری گرێبەست')}><Eye className="w-4 h-4" /></Button>
                        {can('can_print_contracts') && <Button variant="outline" size="sm" onClick={() => generateSingleContractPDF(contract)}><Download className="w-4 h-4" /></Button>}
                        {can('can_edit_contracts') && <Button variant="outline" size="sm" onClick={() => { setEditingContract(contract); setShowForm(true); }}><Pencil className="w-4 h-4" /></Button>}
                        {can('can_delete_contracts') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{L('حذف العقد', 'سڕینەوەی گرێبەست')}</AlertDialogTitle>
                                <AlertDialogDescription>{L('هل أنت متأكد من حذف هذا العقد؟', 'دڵنیای لە سڕینەوەی ئەم گرێبەستە؟')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(contract.id)} className="bg-destructive text-destructive-foreground">{L('حذف', 'سڕینەوە')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewingContract && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto" dir="rtl">
          <div className="min-h-screen py-8">
            <ContractDetail 
              contract={allContracts.find(c => c.id === viewingContract.id) || viewingContract} 
              invoices={invoices.filter(i => i.contract_id === viewingContract.id)} 
              onBack={() => setViewingContract(null)} 
            />
          </div>
        </div>
      )}

      {newContractPermission && (
        <RentalPermissionPrint
          contract={newContractPermission}
          branch={null}
          onClose={() => setNewContractPermission(null)}
          onVerify={async (tempData) => {
            const update = { is_verified: true };
            if (tempData && Number(tempData.tempAmount) > 0) {
              update.temp_payment_amount = Number(tempData.tempAmount);
              update.temp_payment_date = tempData.tempDate;
              update.temp_payment_status = 'محتجز';
            }
            await firebaseApi.entities.Contract.update(newContractPermission.id, update);
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            setViewingContract(newContractPermission);
            setNewContractPermission(null);
          }}
          onEdit={() => {
            setNewContractPermission(null);
            setEditingContract(newContractPermission);
            setShowForm(true);
          }}
        />
      )}

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingContract(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? L('تعديل العقد', 'دەستکاریکردنی گرێبەست', lang) : L('إنشاء عقد جديد', 'دروستکردنی گرێبەستی نوێ', lang)}</DialogTitle>
          </DialogHeader>
          <ContractForm
            contract={editingContract}
            properties={properties}
            tenants={tenants}
            contracts={allContracts}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingContract(null); }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>


    </div>
  );
}