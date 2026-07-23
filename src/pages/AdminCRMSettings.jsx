import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, UserPlus, Pencil, Save, X, ChevronDown, Download, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import CRMReasonsFilters from '@/components/crm/CRMReasonsFilters';
import CRMReasonsChart from '@/components/crm/CRMReasonsChart';
import { exportLeadsToCSV, exportLeadsToPDF } from '@/utils/crmExport';

export default function AdminCRMSettings() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [nameKu, setNameKu] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNameKu, setEditNameKu] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({});

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ['lossReasons'],
    queryFn: () => firebaseApi.entities.LossReason.list(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-all-for-crm-settings'],
    queryFn: () => firebaseApi.entities.Lead.list(),
  });

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => firebaseApi.entities.Employee.list() });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => firebaseApi.entities.Project.list() });

  const filteredLossLeads = useMemo(() => {
    return leads.filter(l => {
      if (l.status !== 'خسارة' || !l.loss_reason) return false;
      const matchesSearch = !filters.search || [l.name, l.phone].some(f => (f || '').toLowerCase().includes(filters.search.toLowerCase()));
      const matchesEmployee = !filters.employeeId || l.assigned_employee_id === filters.employeeId;
      const matchesProject = !filters.projectId || l.project_id === filters.projectId;
      const matchesFrom = !filters.dateFrom || (l.created_date && l.created_date.slice(0, 10) >= filters.dateFrom);
      const matchesTo = !filters.dateTo || (l.created_date && l.created_date.slice(0, 10) <= filters.dateTo);
      return matchesSearch && matchesEmployee && matchesProject && matchesFrom && matchesTo;
    });
  }, [leads, filters]);

  const lossLeadsByReason = useMemo(() => {
    const map = {};
    filteredLossLeads.forEach(l => {
      if (!map[l.loss_reason]) map[l.loss_reason] = [];
      map[l.loss_reason].push(l);
    });
    return map;
  }, [filteredLossLeads]);

  const chartData = useMemo(() => {
    return reasons
      .map(r => ({ name: r.name, count: (lossLeadsByReason[r.name] || []).length }))
      .filter(d => d.count > 0);
  }, [reasons, lossLeadsByReason]);

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.LossReason.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lossReasons'] });
      setName('');
      setNameKu('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.LossReason.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lossReasons'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.LossReason.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lossReasons'] }),
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), name_ku: nameKu.trim() });
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.name || '');
    setEditNameKu(r.name_ku || '');
  };

  const saveEdit = (r) => {
    updateMutation.mutate({ id: r.id, data: { name: editName.trim(), name_ku: editNameKu.trim() } });
  };

  return (
    <div className="pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{L('إعدادات CRM', 'ڕێکخستنەکانی CRM')}</h1>
        <p className="text-sm text-muted-foreground">{L('إدارة أسباب الخسارة الخاصة بالعملاء المحتملين', 'بەڕێوەبردنی هۆکارەکانی دۆڕان بۆ کڕیارانی ئەگەری')}</p>
      </div>

      <CRMReasonsFilters filters={filters} setFilters={setFilters} employees={employees} projects={projects} L={L} />
      <CRMReasonsChart data={chartData} L={L} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">{L('أسباب الخسارة', 'هۆکارەکانی دۆڕان')}</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => exportLeadsToCSV(filteredLossLeads, L)}>
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => exportLeadsToPDF(filteredLossLeads, L)}>
              <FileText className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder={L('السبب (عربي)', 'هۆکار (عەرەبی)')} className="flex-1" />
          <Input value={nameKu} onChange={e => setNameKu(e.target.value)} placeholder={L('السبب (كردي)', 'هۆکار (کوردی)')} className="flex-1" />
          <Button onClick={handleAdd} disabled={createMutation.isPending || !name.trim()} className="gap-1">
            <Plus className="w-4 h-4" /> {L('إضافة', 'زیادکردن')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
        ) : reasons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{L('لا توجد أسباب خسارة بعد', 'هێشتا هۆکاری دۆڕان نییە')}</p>
        ) : (
          <div className="space-y-2">
            {reasons.map(r => {
              const failedLeads = lossLeadsByReason[r.name] || [];
              const isExpanded = expandedId === r.id;
              const isEditing = editingId === r.id;
              return (
                <div key={r.id} className="border border-slate-100 rounded-xl bg-slate-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    {isEditing ? (
                      <div className="flex flex-col md:flex-row gap-2 flex-1 ml-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 bg-white" placeholder={L('السبب (عربي)', 'هۆکار (عەرەبی)')} />
                        <Input value={editNameKu} onChange={e => setEditNameKu(e.target.value)} className="flex-1 bg-white" placeholder={L('السبب (كردي)', 'هۆکار (کوردی)')} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        className="flex items-center gap-2 flex-1 text-right"
                      >
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          {r.name_ku && <p className="text-xs text-muted-foreground">{r.name_ku}</p>}
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 mr-2">{failedLeads.length}</span>
                      </button>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(r)} className="w-8 h-8 rounded-lg hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(r)} className="w-8 h-8 rounded-lg hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(r.id)} className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && !isEditing && (
                    <div className="border-t border-slate-200 bg-white px-4 py-3">
                      {failedLeads.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">{L('لا يوجد عملاء بهذا السبب', 'کڕیار بەم هۆکارە نییە')}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {failedLeads.map(l => (
                            <div key={l.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-1.5">
                              <span className="font-medium">{l.name}</span>
                              <span dir="ltr" className="text-xs text-muted-foreground">{l.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}