import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Percent, Pencil, Printer, Trash2, Search, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import CommissionForm from '@/components/commissions/CommissionForm';
import CommissionAdvancedFilters from '@/components/commissions/CommissionAdvancedFilters';
import { printCommissionInvoice } from '@/components/commissions/CommissionPrint';
import { generateCommissionInvoiceNumber } from '@/utils/commissionNumber';

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

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

export default function Commissions() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { activeBranch } = useBranch();
  const { can, isAdmin } = useUserPermissions();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const initialType = urlParams.get('type') === 'sale' ? 'sale' : urlParams.get('type') === 'rent' ? 'rent' : 'all';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [filters, setFilters] = useState({ search: '', contract_type: initialType, status: 'all', party: 'all', date_from: '', date_to: '', seller_paid: 'all', buyer_paid: 'all' });

  const canViewSeller = isAdmin || can('can_view_seller_commissions');
  const canViewBuyer = isAdmin || can('can_view_buyer_commissions');
  const canEdit = isAdmin || can('can_edit_commissions');
  const canDelete = isAdmin || can('can_delete_commissions');
  const canPrint = isAdmin || can('can_print_commissions');

  // Fetch commissions + contracts (rent + sale)
  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions', activeBranch?.id],
    queryFn: async () => {
      if (!activeBranch?.id) return [];
      const res = await firebaseApi.entities.Commission.filter({ branch_id: activeBranch.id });
      return res;
    },
  });

  const { data: rentContracts = [] } = useQuery({
    queryKey: ['contracts-for-commission', activeBranch?.id],
    queryFn: async () => {
      if (!activeBranch?.id) return [];
      const res = await firebaseApi.entities.Contract.filter({ branch_id: activeBranch.id }, '-created_date', 200);
      return res.map(c => ({ ...c, __rent: true }));
    },
    enabled: !!activeBranch?.id,
  });

  const { data: saleContracts = [] } = useQuery({
    queryKey: ['sale-contracts-for-commission', activeBranch?.id],
    queryFn: async () => {
      if (!activeBranch?.id) return [];
      const res = await firebaseApi.entities.SaleContract.filter({ branch_id: activeBranch.id }, '-created_date', 200);
      return res.map(c => ({ ...c, __sale: true }));
    },
    enabled: !!activeBranch?.id,
  });

  const allContracts = useMemo(() => [...rentContracts, ...saleContracts], [rentContracts, saleContracts]);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => firebaseApi.entities.Branch.list(),
  });
  const branch = branches.find(b => b.id === activeBranch?.id) || branches[0] || null;

  const createMut = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (!payload.invoice_number) {
        try { payload.invoice_number = await generateCommissionInvoiceNumber(payload.contract_type || 'rent'); } catch (_) {}
      }
      return firebaseApi.entities.Commission.create(payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commissions'] }); setShowForm(false); setEditing(null); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Commission.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commissions'] }); setShowForm(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => firebaseApi.entities.Commission.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commissions'] }); setDeleteTarget(null); },
  });

  const handleSave = (data) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const filtered = useMemo(() => {
    return commissions.filter(c => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [c.party1_name, c.party2_name, c.contract_number, c.property_name].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.contract_type !== 'all' && c.contract_type !== filters.contract_type) return false;
      if (filters.status !== 'all' && c.status !== filters.status) return false;
      if (filters.seller_paid !== 'all') {
        const paid = !!c.seller_commission_paid;
        if (filters.seller_paid === 'paid' && !paid) return false;
        if (filters.seller_paid === 'unpaid' && paid) return false;
      }
      if (filters.buyer_paid !== 'all') {
        const paid = !!c.buyer_commission_paid;
        if (filters.buyer_paid === 'paid' && !paid) return false;
        if (filters.buyer_paid === 'unpaid' && paid) return false;
      }
      if (filters.date_from && c.commission_date && c.commission_date < filters.date_from) return false;
      if (filters.date_to && c.commission_date && c.commission_date > filters.date_to) return false;
      return true;
    }).sort((a, b) => (b.commission_date || '').localeCompare(a.commission_date || ''));
  }, [commissions, filters]);

  const stats = useMemo(() => {
    const totalSeller = filtered.reduce((s, c) => s + (c.seller_commission || 0), 0);
    const totalBuyer = filtered.reduce((s, c) => s + (c.buyer_commission || 0), 0);
    const pending = filtered.filter(c => c.status === 'pending').length;
    const completed = filtered.filter(c => c.status === 'completed').length;
    return { totalSeller, totalBuyer, pending, completed, count: filtered.length };
  }, [filtered]);

  const sym = filtered[0]?.currency_symbol || 'د.ع';
  const fmtN = (n) => Number(n || 0).toLocaleString('en-US');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Percent className="w-6 h-6 text-amber-600" />{L('العمولات', 'دەلالی')}</h1>
          <p className="text-sm text-muted-foreground">{L('إدارة عمولات الإيجار والبيع', 'بەڕێوەبردنی دەلالی کرێ و فرۆشتن')}</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4" />{L('إضافة عمولة', 'زیادکردنی کرێ')}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Percent} label={L('عدد العمولات', 'ژمارەی دەلالی')} value={stats.count} color="bg-amber-100 text-amber-700" />
        {canViewSeller && <StatCard icon={FileDown} label={L('عمولات الملاك/البائعين', 'کرێی خاوەن/فرۆشیار')} value={`${fmtN(stats.totalSeller)} ${sym}`} color="bg-orange-100 text-orange-700" />}
        {canViewBuyer && <StatCard icon={FileDown} label={L('عمولات المستأجرين/المشترين', 'کرێی کرێچی/کڕیار')} value={`${fmtN(stats.totalBuyer)} ${sym}`} color="bg-blue-100 text-blue-700" />}
        <StatCard icon={Percent} label={L('مكتملة', 'تەواو')} value={stats.completed} color="bg-emerald-100 text-emerald-700" />
      </div>

      {/* Advanced Filters */}
      <CommissionAdvancedFilters filters={filters} setFilters={setFilters} />

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{L('جاري التحميل...', 'بارکردن...')}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <Percent className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground">{L('لا توجد عمولات مطابقة.', 'هیچ کرێیەک نەدۆزرایە.')}</p>
          </div>
        ) : (
          filtered.map(c => {
            const isRent = c.contract_type === 'rent';
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`h-1.5 ${isRent ? 'bg-blue-500' : 'bg-amber-500'}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isRent ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isRent ? L('إيجار', 'کرێ') : L('بيع', 'فرۆشتن')}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-700'}`}>
                          {c.status === 'pending' ? L('معلقة', 'مەوقوف') : c.status === 'partial' ? L('جزئية', 'بەشەکی') : L('مكتملة', 'تەواو')}
                        </span>
                        <span className="text-xs text-muted-foreground">{L('عقد:', 'گرێبەست:')} {c.contract_number || '—'}</span>
                        <span className="text-xs text-muted-foreground">{L('العقار:', 'خانوو:')} {c.property_name || '—'}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div className="text-slate-700">
                          <span className="text-xs text-muted-foreground">{isRent ? L('المالك:', 'خاوەن:') : L('البائع:', 'فرۆشیار:')}</span>{' '}
                          <span className="font-medium">{c.party1_name || '—'}</span>
                          {canViewSeller && c.seller_commission > 0 && (
                            <span className="mr-2 text-xs font-bold text-orange-600">{fmtN(c.seller_commission)} {c.currency_symbol}
                              {c.seller_commission_paid ? <span className="text-emerald-600 mr-1">✓</span> : <span className="text-red-500 mr-1">✗</span>}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-700">
                          <span className="text-xs text-muted-foreground">{isRent ? L('المستأجر:', 'کرێچی:') : L('المشتري:', 'کڕیار:')}</span>{' '}
                          <span className="font-medium">{c.party2_name || '—'}</span>
                          {canViewBuyer && c.buyer_commission > 0 && (
                            <span className="mr-2 text-xs font-bold text-blue-600">{fmtN(c.buyer_commission)} {c.currency_symbol}
                              {c.buyer_commission_paid ? <span className="text-emerald-600 mr-1">✓</span> : <span className="text-red-500 mr-1">✗</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      {c.notes && <p className="mt-2 text-xs text-muted-foreground">{c.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canPrint && (
                        <button onClick={() => setPrintTarget(c)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-xs font-medium text-amber-700 transition-colors">
                          <Printer className="w-3.5 h-3.5" />{L('طباعة', 'چاپ')}
                        </button>
                      )}
                      {canEdit && (
                        <button onClick={() => { setEditing(c); setShowForm(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />{L('تعديل', 'دەستکاری')}
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setDeleteTarget(c)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-medium text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Dialog */}
      <CommissionForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} editing={editing} contracts={allContracts} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{L('تأكيد الحذف', 'دڵنیاکردنەوەی سڕینەوە')}</AlertDialogTitle>
            <AlertDialogDescription>{L('هل تريد حذف هذه العمولة؟', 'دەتەوێت ئەم کرێیە بسڕیتەوە؟')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate(deleteTarget.id)} className="bg-red-600 hover:bg-red-700">{L('حذف', 'سڕینەوە')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print selection */}
      <AlertDialog open={!!printTarget} onOpenChange={(v) => !v && setPrintTarget(null)}>
        <AlertDialogContent dir="rtl" className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Printer className="w-5 h-5 text-amber-600" />{L('طباعة العمولة', 'چاپی کرێ')}</AlertDialogTitle>
            <AlertDialogDescription>{L('اختر جهة العمولة التي تريد طباعتها.', 'لایەنی کرێی چاپ بکە هەڵبژێرە.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-1">
            {Number(printTarget?.seller_commission) > 0 && canViewSeller && (
              <button onClick={() => { printCommissionInvoice(printTarget, L, branch, 'seller'); setPrintTarget(null); }}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 transition-colors text-right">
                <span className="text-sm font-bold text-amber-800">{printTarget?.contract_type === 'rent' ? L('المالك', 'خاوەن') : L('البائع', 'فرۆشیار')}</span>
                <span className="text-xs font-semibold text-amber-700">{Number(printTarget.seller_commission).toLocaleString()} {printTarget.currency_symbol}</span>
              </button>
            )}
            {Number(printTarget?.buyer_commission) > 0 && canViewBuyer && (
              <button onClick={() => { printCommissionInvoice(printTarget, L, branch, 'buyer'); setPrintTarget(null); }}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 transition-colors text-right">
                <span className="text-sm font-bold text-blue-800">{printTarget?.contract_type === 'rent' ? L('المستأجر', 'کرێچی') : L('المشتري', 'کڕیار')}</span>
                <span className="text-xs font-semibold text-blue-700">{Number(printTarget.buyer_commission).toLocaleString()} {printTarget.currency_symbol}</span>
              </button>
            )}
            {Number(printTarget?.seller_commission) > 0 && Number(printTarget?.buyer_commission) > 0 && canViewSeller && canViewBuyer && (
              <button onClick={() => { printCommissionInvoice(printTarget, L, branch, 'both'); setPrintTarget(null); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700">
                {L('الطرفين معاً', 'هەردوو لایەن')}
              </button>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}