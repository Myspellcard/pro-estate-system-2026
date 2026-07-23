import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { FileText, Search, Eye, Edit, Building2, User, Calendar, DollarSign, Plus, TrendingUp, XCircle } from 'lucide-react';
import SaleContractDetail from '@/components/sale-contracts/SaleContractDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import SaleContractForm from '@/components/sale-contracts/SaleContractForm';
import { toast } from 'sonner';

const statusConfig = {
  'نشط':   { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  'مكتمل': { color: 'bg-blue-100 text-blue-800 border-blue-200',          dot: 'bg-blue-500' },
  'ملغي':  { color: 'bg-red-100 text-red-800 border-red-200',              dot: 'bg-red-500' },
  'معلق':  { color: 'bg-amber-100 text-amber-800 border-amber-200',        dot: 'bg-amber-500' },
};

export default function SaleContracts() {
  const { lang } = useLanguage();
  const { activeBranch } = useBranch();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const queryClient = useQueryClient();

  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['sale-contracts', activeBranch?.id],
    queryFn: () => firebaseApi.entities.SaleContract.filter(
      activeBranch ? { branch_id: activeBranch.id } : {}
    ),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['sale-properties'],
    queryFn: async () => {
      const all = await firebaseApi.entities.Property.list();
      return all.filter(p => p.usage_type === 'sale' || p.usage_type === 'both' || !p.usage_type);
    },
  });

  const createContract = useMutation({
    mutationFn: (data) => firebaseApi.entities.SaleContract.create(data),
    onSuccess: async () => {
      try {
        const freshList = await firebaseApi.entities.AppSettings.list();
        const appSettings = freshList.find(s => s.key === 'default');
        if (appSettings?.id) {
          const currentStart = appSettings?.numbering?.sale_contract_start ?? 1;
          await firebaseApi.entities.AppSettings.update(appSettings.id, {
            numbering: { ...(appSettings.numbering || {}), sale_contract_start: Number(currentStart) + 1 }
          });
          queryClient.invalidateQueries({ queryKey: ['app_settings'] });
        }
      } catch (e) { /* non-critical */ }
      queryClient.invalidateQueries({ queryKey: ['sale-contracts'] });
      setShowForm(false);
      setFormError('');
      toast.success(L('تمت إضافة العقد بنجاح', 'گرێبەستەکە بە سەرکەوتوویی زیادکرا'));
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.message || String(err);
      setFormError(msg);
      toast.error(L('فشل حفظ العقد: ', 'هەڵەی پاشەکەوتکردن: ') + msg);
    },
  });

  const updateContract = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.SaleContract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-contracts'] });
      setShowForm(false);
      setEditingContract(null);
      toast.success(L('تم تحديث العقد بنجاح', 'گرێبەستەکە بە سەرکەوتوویی نوێکرایەوە'));
    },
    onError: (err) => toast.error(L('فشل تحديث العقد: ', 'هەڵەی نوێکردنەوە: ') + (err?.message || '')),
  });

  const [formError, setFormError] = useState('');

  const handleSubmit = (contractData) => {
    setFormError('');
    if (editingContract) {
      updateContract.mutate({ id: editingContract.id, data: contractData });
    } else {
      createContract.mutate(contractData);
    }
  };

  const cancelContract = useMutation({
    mutationFn: (id) => firebaseApi.entities.SaleContract.update(id, { status: 'ملغي' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-contracts'] });
      toast.success(L('تم إلغاء العقد', 'گرێبەستەکە هەڵوەشایەوە'));
    },
    onError: (err) => toast.error(L('فشل إلغاء العقد: ', 'هەڵەی هەڵوەشاندنەوە: ') + (err?.message || '')),
  });

  const handleEdit = (contract) => {
    setEditingContract(contract);
    setViewingContract(null);
    setShowForm(true);
  };

  const handleView = (contract) => {
    setViewingContract(contract);
    setShowForm(false);
    setEditingContract(null);
  };

  const filteredContracts = (contracts || []).filter(c =>
    (statusFilter === 'all' || c.status === statusFilter) &&
    (!searchQuery ||
    c.buyer_name?.includes(searchQuery) ||
    c.contract_number?.includes(searchQuery) ||
    c.property_name?.includes(searchQuery))
  );

  const statRows = [
    ['نشط',   'چالاک',       statusConfig['نشط']],
    ['مكتمل', 'تەواو',       statusConfig['مكتمل']],
    ['معلق',  'راگیراو',     statusConfig['معلق']],
    ['ملغي',  'هەڵوەشاوە',  statusConfig['ملغي']],
  ];

  const totalValue = (contracts || []).reduce((sum, c) => sum + (c.sale_price || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary/80 text-white px-6 py-7 shadow-lg shadow-primary/20">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{L('عقود المبيعات', 'گرێبەستەکانی فرۆشتن')}</h1>
              <p className="text-white/70 text-sm mt-0.5">{L('إدارة عقود بيع العقارات', 'بەڕێوەبردنی گرێبەستەکانی فرۆشتنی خانووبەرە')}</p>
              {contracts && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs bg-white/20 rounded-full px-3 py-1">
                    {L(`${contracts.length} عقد`, `${contracts.length} گرێبەست`)}
                  </span>
                  {totalValue > 0 && (
                    <span className="text-xs bg-white/20 rounded-full px-3 py-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {totalValue.toLocaleString()} {L('د.ع', 'د.ع')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingContract(null); }}
            className="flex items-center gap-2 bg-white text-primary font-bold px-5 py-3 rounded-xl hover:bg-white/90 transition-colors shadow-md shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            {L('إضافة عقد', 'زیادکردنی گرێبەست')}
          </button>
        </div>
      </div>

      {viewingContract && !showForm && (
        <SaleContractDetail
          contract={viewingContract}
          onClose={() => setViewingContract(null)}
          onEdit={() => handleEdit(viewingContract)}
        />
      )}

      {showForm && (
        <>
          {formError && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              ❌ {formError}
            </div>
          )}
          <SaleContractForm
            contract={editingContract}
            properties={properties}
            contracts={contracts || []}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingContract(null); setFormError(''); }}
            isLoading={createContract.isPending || updateContract.isPending}
          />
        </>
      )}

      {/* Stats Bar - clickable filters */}
      {!isLoading && contracts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`bg-card rounded-xl border p-3 flex items-center gap-3 text-right transition-all ${statusFilter === 'all' ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40'}`}
          >
            <div className="w-2 h-8 rounded-full bg-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{L('الكل', 'هەموو')}</p>
              <p className="text-xl font-bold">{contracts.length}</p>
            </div>
          </button>
          {statRows.map(([ar, ku, cfg]) => (
            <button
              key={ar}
              onClick={() => setStatusFilter(prev => prev === ar ? 'all' : ar)}
              className={`bg-card rounded-xl border p-3 flex items-center gap-3 text-right transition-all ${statusFilter === ar ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40'}`}
            >
              <div className={`w-2 h-8 rounded-full ${cfg.dot}`} />
              <div>
                <p className="text-xs text-muted-foreground">{L(ar, ku)}</p>
                <p className="text-xl font-bold">{contracts.filter(c => c.status === ar).length}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder={L('بحث بالاسم أو رقم العقد...', 'گەڕان بە ناو یان ژمارەی گرێبەست...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Contracts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-4 bg-gray-200 rounded w-3/4"></div></CardHeader>
              <CardContent><div className="h-3 bg-gray-200 rounded w-1/2"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={L('لا توجد عقود', 'هیچ گرێبەستێک نییە')}
          description={L('ابدأ بإضافة عقد بيع جديد', 'دەستبکە بە زیادکردنی گرێبەستێکی فرۆشتنی نوێ')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContracts.map(contract => {
            const cfg = statusConfig[contract.status] || { color: 'bg-gray-100 text-gray-800 border-gray-200', dot: 'bg-gray-400' };
            return (
              <div key={contract.id} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden group">
                {/* Card Header */}
                <div className="bg-gradient-to-l from-primary/5 to-primary/10 px-5 py-4 flex items-start justify-between border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{contract.contract_number}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />{contract.property_name}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    {contract.status}
                  </span>
                </div>
                {/* Card Body */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{L('المشتري:', 'کڕیار:')}</span>
                    <span className="font-semibold mr-auto">{contract.buyer_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{L('سعر البيع:', 'نرخی فرۆشتن:')}</span>
                    <span className="font-bold text-primary mr-auto">{contract.sale_price?.toLocaleString()} {L('د.ع', 'د.ع')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{L('تاريخ العقد:', 'بەرواری گرێبەست:')}</span>
                    <span className="mr-auto">{new Date(contract.sale_date).toLocaleDateString('ar-IQ')}</span>
                  </div>
                </div>
                {/* Card Footer */}
                <div className="px-5 pb-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 text-sm"
                      size="sm"
                      onClick={() => handleView(contract)}
                    >
                      <Eye className="w-4 h-4" />
                      {L('عرض', 'بینین')}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-2 text-sm bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white"
                      onClick={() => handleEdit(contract)}
                    >
                      <Edit className="w-4 h-4" />
                      {L('تعديل', 'دەستکاری')}
                    </Button>
                  </div>
                  {contract.status !== 'ملغي' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm(L('هل أنت متأكد من إلغاء هذا العقد؟', 'دڵنیایت لە هەڵوەشاندنەوەی ئەم گرێبەستە؟'))) {
                          cancelContract.mutate(contract.id);
                        }
                      }}
                      disabled={cancelContract.isPending}
                    >
                      <XCircle className="w-4 h-4" />
                      {L('إلغاء العقد', 'هەڵوەشاندنەوەی گرێبەست')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}