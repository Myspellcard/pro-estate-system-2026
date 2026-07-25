import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Search, Users, UserPlus, BookmarkCheck, TrendingUp, Phone, MessageCircle, Trash2, Pencil, SlidersHorizontal, FileSpreadsheet, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { useAuth } from '@/lib/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import LeadForm from '@/components/crm/LeadForm';
import LeadDetail from '@/components/crm/LeadDetail';
import LeadCard from '@/components/crm/LeadCard';
import LeadAdvancedFilters from '@/components/crm/LeadAdvancedFilters';
import { exportLeadsToCSV, exportLeadsToPDF } from '@/utils/crmExport';

const STATUS_COLORS = {
  'جديد': 'bg-blue-100 text-blue-700',
  'تم التواصل': 'bg-cyan-100 text-cyan-700',
  'مهتم': 'bg-amber-100 text-amber-700',
  'زيارة مشروع': 'bg-purple-100 text-purple-700',
  'تفاوض': 'bg-orange-100 text-orange-700',
  'حجز': 'bg-indigo-100 text-indigo-700',
  'تم البيع': 'bg-emerald-100 text-emerald-700',
  'غير مهتم': 'bg-red-100 text-red-700',
  'خسارة': 'bg-red-100 text-red-700',
};
const STATUSES = ['جديد', 'تم التواصل', 'مهتم', 'زيارة مشروع', 'تفاوض', 'حجز', 'تم البيع', 'غير مهتم', 'خسارة'];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function CRM() {
  const queryClient = useQueryClient();
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { crmVisibilityMode, visibleCrmUserIds, crmContactVisibilityMode, visibleCrmContactUserIds } = useUserPermissions();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advFilters, setAdvFilters] = useState({});

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', activeBranch?.id],
    queryFn: async () => {
      const all = await firebaseApi.entities.Lead.list('-created_date');
      return activeBranch ? all.filter(l => l.branch_id === activeBranch.id) : all;
    },
  });

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => firebaseApi.entities.Project.list() });
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => firebaseApi.entities.Property.list() });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => firebaseApi.entities.Employee.list() });
  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: () => firebaseApi.entities.User.list(), enabled: isAdmin });
  const { data: lossReasons = [] } = useQuery({ queryKey: ['lossReasons'], queryFn: () => firebaseApi.entities.LossReason.list() });

  // CRM visibility: admin sees all; mode controls which leads non-admins see.
  const visibleLeads = useMemo(() => {
    if (isAdmin) return leads;
    if (crmVisibilityMode === 'all') return leads;
    if (crmVisibilityMode === 'own') return leads.filter(l => l.created_by_id === user?.id || (l.shared_with_user_ids || []).includes(user?.id));
    if (crmVisibilityMode === 'others') return leads.filter(l => l.created_by_id !== user?.id);
    if (crmVisibilityMode === 'specific') return leads.filter(l => (visibleCrmUserIds || []).includes(l.created_by_id));
    return leads;
  }, [leads, isAdmin, user?.id, crmVisibilityMode, visibleCrmUserIds]);

  // CRM contact number visibility per lead
  const canSeeLeadPhone = (lead) => {
    if (isAdmin) return true;
    if (crmContactVisibilityMode === 'all') return true;
    if (crmContactVisibilityMode === 'own') return lead.created_by_id === user?.id;
    if (crmContactVisibilityMode === 'specific') return (visibleCrmContactUserIds || []).includes(lead.created_by_id);
    return false;
  };

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Lead.create({ ...data, branch_id: activeBranch?.id, followups: [] }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); close(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Lead.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leads'] }); close(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Lead.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const close = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (data) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const handleStatusChange = (lead, status, lossReason, lossNote) => {
    const data = { status };
    if (status === 'خسارة') {
      data.loss_reason = lossReason || '';
      data.loss_note = lossNote || '';
    }
    updateMutation.mutate({ id: lead.id, data });
  };

  const handleAddLossReason = async (name) => {
    await firebaseApi.entities.LossReason.create({ name });
    queryClient.invalidateQueries({ queryKey: ['lossReasons'] });
  };

  const handleAddFollowup = async (lead, followup) => {
    const updated = [...(lead.followups || []), followup];
    await firebaseApi.entities.Lead.update(lead.id, { followups: updated });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setViewing(prev => prev ? { ...prev, followups: updated } : prev);
  };

  const handleConvert = async (lead) => {
    await firebaseApi.entities.Lead.update(lead.id, { status: 'تم البيع' });
    if (lead.property_id) {
      await firebaseApi.entities.Property.update(lead.property_id, { status: 'حجز' });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    }
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setViewing(null);
  };

  const handleUpdateSharing = async (lead, userIds) => {
    await firebaseApi.entities.Lead.update(lead.id, { shared_with_user_ids: userIds });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setViewing(prev => prev ? { ...prev, shared_with_user_ids: userIds } : prev);
  };

  const handleUpdateLossNote = async (lead, lossNote) => {
    await firebaseApi.entities.Lead.update(lead.id, { loss_note: lossNote });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    setViewing(prev => prev ? { ...prev, loss_note: lossNote } : prev);
  };

  const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;

  const filteredLeads = useMemo(() => {
    return visibleLeads.filter(l => {
      const matchesSearch = !search || [l.name, l.phone, l.phone2, l.assigned_employee_name].some(f => (f || '').toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesSource = !advFilters.source || l.source === advFilters.source;
      const matchesEmployee = !advFilters.employeeId || l.assigned_employee_id === advFilters.employeeId;
      const matchesProject = !advFilters.projectId || l.project_id === advFilters.projectId;
      const matchesMinBudget = !advFilters.minBudget || (l.budget || 0) >= Number(advFilters.minBudget);
      const matchesMaxBudget = !advFilters.maxBudget || (l.budget || 0) <= Number(advFilters.maxBudget);
      const matchesFollowupFrom = !advFilters.followupFrom || (l.next_followup_date && l.next_followup_date >= advFilters.followupFrom);
      const matchesCreatedFrom = !advFilters.createdFrom || (l.created_date && l.created_date.slice(0, 10) >= advFilters.createdFrom);
      const matchesCreatedTo = !advFilters.createdTo || (l.created_date && l.created_date.slice(0, 10) <= advFilters.createdTo);
      return matchesSearch && matchesStatus && matchesSource && matchesEmployee && matchesProject
        && matchesMinBudget && matchesMaxBudget && matchesFollowupFrom && matchesCreatedFrom && matchesCreatedTo;
    });
  }, [visibleLeads, search, statusFilter, advFilters]);

  const stats = useMemo(() => {
    const total = visibleLeads.length;
    const newLeads = visibleLeads.filter(l => l.status === 'جديد').length;
    const reservations = visibleLeads.filter(l => l.status === 'حجز').length;
    const sold = visibleLeads.filter(l => l.status === 'تم البيع').length;
    const conversionRate = total ? Math.round((sold / total) * 100) : 0;
    return { total, newLeads, reservations, sold, conversionRate };
  }, [visibleLeads]);

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{L('إدارة العملاء المحتملين (CRM)', 'بەڕێوەبردنی کڕیارانی ئەگەری (CRM)')}</h1>
          <p className="text-sm text-muted-foreground">{L('متابعة العملاء المحتملين وتحويلهم إلى مبيعات', 'شوێنکەوتنی کڕیارانی ئەگەری و گۆڕینیان بۆ فرۆشتن')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => exportLeadsToCSV(filteredLeads, L)}>
            <FileSpreadsheet className="w-4 h-4" /> {L('تصدير CSV', 'دەرکردن CSV')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => exportLeadsToPDF(filteredLeads, L)}>
            <FileDown className="w-4 h-4" /> {L('تصدير PDF', 'دەرکردن PDF')}
          </Button>
          <Button size="sm" className="gap-1" onClick={() => { close(); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> {L('إضافة عميل محتمل', 'زیادکردنی کڕیاری ئەگەری')}
          </Button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard icon={Users} label={L('إجمالي العملاء المحتملين', 'کۆی کڕیارانی ئەگەری')} value={stats.total} color="bg-blue-100 text-blue-600" />
        <StatCard icon={UserPlus} label={L('عملاء جدد', 'کڕیاری نوێ')} value={stats.newLeads} color="bg-cyan-100 text-cyan-600" />
        <StatCard icon={BookmarkCheck} label={L('الحجوزات', 'حجزەکان')} value={stats.reservations} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={TrendingUp} label={L('المبيعات', 'فرۆشتنەکان')} value={stats.sold} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={TrendingUp} label={L('نسبة التحويل', 'ڕێژەی گۆڕین')} value={`${stats.conversionRate}%`} color="bg-amber-100 text-amber-600" />
      </div>

      {showForm && (
        <LeadForm
          lead={editing}
          projects={projects}
          properties={properties}
          employees={employees}
          lossReasons={lossReasons}
          onAddLossReason={handleAddLossReason}
          onSubmit={handleSubmit}
          onCancel={close}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {viewing && !showForm && (
        <LeadDetail
          lead={viewing}
          project={projects.find(p => p.id === viewing.project_id)}
          property={properties.find(p => p.id === viewing.property_id)}
          isAdmin={isAdmin}
          allUsers={allUsers}
          onClose={() => setViewing(null)}
          onEdit={(l) => { setEditing(l); setShowForm(true); setViewing(null); }}
          onAddFollowup={handleAddFollowup}
          onConvert={handleConvert}
          onUpdateSharing={handleUpdateSharing}
          onUpdateLossNote={handleUpdateLossNote}
          canSeePhone={canSeeLeadPhone(viewing)}
        />
      )}

      {!showForm && !viewing && (
        <>
          {/* Search & filter */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={L('بحث بالاسم، الهاتف، الموظف...', 'گەڕان بە ناو، تەلەفۆن، کارمەند...')} className="pr-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{L('كل الحالات', 'هەموو دۆخەکان')}</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowAdvanced(v => !v)} className="gap-1">
              <SlidersHorizontal className="w-4 h-4" /> {L('بحث متقدم', 'گەڕانی پێشکەوتوو')}
            </Button>
          </div>

          {showAdvanced && (
            <LeadAdvancedFilters
              filters={advFilters}
              setFilters={setAdvFilters}
              employees={employees}
              projects={projects}
              onClear={() => setAdvFilters({})}
              L={L}
            />
          )}

          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-muted mb-4"><Users className="w-10 h-10 text-muted-foreground" /></div>
              <h3 className="text-lg font-semibold mb-1">{L('لا يوجد عملاء محتملون', 'کڕیاری ئەگەری نییە')}</h3>
              <Button onClick={() => setShowForm(true)} className="gap-2 mt-3"><Plus className="w-4 h-4" /> {L('إضافة عميل محتمل', 'زیادکردنی کڕیاری ئەگەری')}</Button>
            </div>
          ) : statusFilter !== 'all' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  L={L}
                  STATUSES={STATUSES}
                  STATUS_COLORS={STATUS_COLORS}
                  onView={setViewing}
                  onStatusChange={handleStatusChange}
                  onEdit={(l) => { setEditing(l); setShowForm(true); }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  lossReasons={lossReasons}
                  onAddLossReason={handleAddLossReason}
                  canSeePhone={canSeeLeadPhone(lead)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {STATUSES.filter(s => filteredLeads.some(l => l.status === s)).map(status => (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
                    <span className="text-xs text-muted-foreground">({filteredLeads.filter(l => l.status === status).length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredLeads.filter(l => l.status === status).map(lead => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        L={L}
                        STATUSES={STATUSES}
                        STATUS_COLORS={STATUS_COLORS}
                        onView={setViewing}
                        onStatusChange={handleStatusChange}
                        onEdit={(l) => { setEditing(l); setShowForm(true); }}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        lossReasons={lossReasons}
                        onAddLossReason={handleAddLossReason}
                        canSeePhone={canSeeLeadPhone(lead)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}