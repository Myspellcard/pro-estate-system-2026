import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Plus, Pencil, Trash2, X, Save, FileText, Phone, MessageCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { format, parseISO } from 'date-fns';

const emptyForm = {
  property_id: '',
  property_name: '',
  buyer_name: '',
  buyer_name_ku: '',
  buyer_phone: '',
  buyer_email: '',
  buyer_nationality: '',
  buyer_nationality_ku: '',
  buyer_address: '',
  buyer_address_ku: '',
  sale_price: '',
  sale_date: '',
  payment_status: 'معلق',
  payment_method: '',
  notes: '',
  notes_ku: '',
  status: 'نشط',
};

export default function Sales() {
  const queryClient = useQueryClient();
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [viewing, setViewing] = useState(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', activeBranch?.id],
    queryFn: () => {
      const allSales = firebaseApi.entities.Sale.list('-created_date');
      return activeBranch ? allSales.filter(s => s.branch_id === activeBranch.id) : allSales;
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => firebaseApi.entities.Property.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Sale.create({ ...data, branch_id: activeBranch?.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales'] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Sale.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales'] }); close(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Sale.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales'] }),
  });

  const close = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (sale) => {
    setEditing(sale);
    setForm({ 
      ...emptyForm, 
      ...sale, 
      sale_price: sale.sale_price.toString() 
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { 
      ...form, 
      sale_price: Number(form.sale_price),
    };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;

  const statusMap = {
    'نشط': { label: L('نشط', 'چالاک'), color: 'bg-blue-100 text-blue-700' },
    'مكتمل': { label: L('مكتمل', 'تەواو'), color: 'bg-emerald-100 text-emerald-700' },
    'ملغي': { label: L('ملغي', 'هەڵوەشێنراوە'), color: 'bg-red-100 text-red-700' },
    'معلق': { label: L('معلق', 'مەوقوف'), color: 'bg-amber-100 text-amber-700' },
  };

  const paymentStatusMap = {
    'مدفوع': { label: L('مدفوع', 'پارەدراو'), color: 'bg-emerald-100 text-emerald-700' },
    'معلق': { label: L('معلق', 'مەوقوف'), color: 'bg-amber-100 text-amber-700' },
    'قسط': { label: L('قسط', 'قسط'), color: 'bg-blue-100 text-blue-700' },
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{L('المبيعات', 'فرۆشتنەکان')}</h1>
          <p className="text-sm text-muted-foreground">{L('إدارة عمليات بيع العقارات', 'بەڕێوەبردنی فرۆشتنی خانووبەرەکان')}</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { close(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> {L('تسجيل بيع', 'تۆمارکردنی فرۆشتن')}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{editing ? L('تعديل البيع', 'دەستکاریکردنی فرۆشتن') : L('بيع جديد', 'فرۆشتنی نوێ')}</h2>
            <button onClick={close}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{L('العقار *', 'خانووبەرە *')}</Label>
                <select 
                  value={form.property_id} 
                  onChange={e => {
                    const prop = properties.find(p => p.id === e.target.value);
                    setForm(p => ({ ...p, property_id: e.target.value, property_name: prop?.name || '' }));
                  }}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{L('اختر العقار', 'خانووبەرە هەڵبژێرە')}</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.project_or_area ? `- ${p.project_or_area}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{L('تاريخ البيع *', 'بەرواری فرۆشتن *')}</Label>
                <Input 
                  type="date" 
                  value={form.sale_date} 
                  onChange={e => setForm(p => ({ ...p, sale_date: e.target.value }))} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>{L('اسم المشتري *', 'ناوی کڕیار *')}</Label>
                <Input value={form.buyer_name} onChange={e => setForm(p => ({ ...p, buyer_name: e.target.value }))} required placeholder={L('الاسم الكامل', 'ناوی تەواو')} />
              </div>
              <div className="space-y-2">
                <Label>{L('ناوی کڕیار (کوردی)', 'ناوی کڕیار (کوردی)')}</Label>
                <Input value={form.buyer_name_ku} onChange={e => setForm(p => ({ ...p, buyer_name_ku: e.target.value }))} placeholder={L('ناوی تەواو', 'ناوی تەواو')} />
              </div>
              <div className="space-y-2">
                <Label>{L('رقم الهاتف', 'ژمارەی تەلەفۆن')}</Label>
                <Input value={form.buyer_phone} onChange={e => setForm(p => ({ ...p, buyer_phone: e.target.value }))} placeholder="07xx-xxx-xxxx" />
              </div>
              <div className="space-y-2">
                <Label>{L('البريد الإلكتروني', 'ئیمەیڵ')}</Label>
                <Input type="email" value={form.buyer_email} onChange={e => setForm(p => ({ ...p, buyer_email: e.target.value }))} placeholder="example@email.com" />
              </div>
              <div className="space-y-2">
                <Label>{L('سعر البيع *', 'نرخی فرۆشتن *')}</Label>
                <Input 
                  type="number" 
                  value={form.sale_price} 
                  onChange={e => setForm(p => ({ ...p, sale_price: e.target.value }))} 
                  required 
                  placeholder="0" 
                />
              </div>
              <div className="space-y-2">
                <Label>{L('حالة الدفع', 'دۆخی پارەدان')}</Label>
                <select 
                  value={form.payment_status} 
                  onChange={e => setForm(p => ({ ...p, payment_status: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="معلق">{L('معلق', 'مەوقوف')}</option>
                  <option value="مدفوع">{L('مدفوع', 'پارەدراو')}</option>
                  <option value="قسط">{L('قسط', 'قسط')}</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{L('ملاحظات', 'تێبینی')}</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{L('تێبینی (کوردی)', 'تێبینی (کوردی)')}</Label>
                <Textarea value={form.notes_ku} onChange={e => setForm(p => ({ ...p, notes_ku: e.target.value }))} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={close}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {editing ? L('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری') : L('تسجيل البيع', 'تۆمارکردنی فرۆشتن')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{L('تفاصيل البيع', 'وردەکارییەکانی فرۆشتن')}</h2>
            <button onClick={() => setViewing(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{L('العقار', 'خانووبەرە')}</p>
              <p className="font-semibold">{viewing.property_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{L('المشتري', 'کڕیار')}</p>
              <p className="font-semibold">{viewing.buyer_name} {viewing.buyer_name_ku && `(${viewing.buyer_name_ku})`}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{L('سعر البيع', 'نرخی فرۆشتن')}</p>
              <p className="font-bold text-primary">{viewing.sale_price?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{L('تاريخ البيع', 'بەرواری فرۆشتن')}</p>
              <p className="font-semibold">{viewing.sale_date && format(parseISO(viewing.sale_date), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{L('حالة الدفع', 'دۆخی پارەدان')}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${paymentStatusMap[viewing.payment_status]?.color}`}>
                {paymentStatusMap[viewing.payment_status]?.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{L('الحالة', 'دۆخ')}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusMap[viewing.status]?.color}`}>
                {statusMap[viewing.status]?.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {sales.length === 0 && !showForm && !viewing ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-muted mb-4">
            <FileText className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{L('لا توجد مبيعات', 'فرۆشتن نییە')}</h3>
          <p className="text-sm text-muted-foreground mb-6">{L('سجل أول عملية بيع للعقارات', 'یەکەم فرۆشتنی خانووبەرە تۆمار بکە')}</p>
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> {L('تسجيل بيع', 'تۆمارکردنی فرۆشتن')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sales.map(sale => {
            const st = statusMap[sale.status] || { label: sale.status, color: 'bg-gray-100 text-gray-600' };
            const pst = paymentStatusMap[sale.payment_status] || { label: sale.payment_status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={sale.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{sale.property_name}</h3>
                      <p className="text-xs text-muted-foreground">{sale.buyer_name}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{L('سعر البيع', 'نرخی فرۆشتن')}</span>
                    <span className="font-bold text-primary">{sale.sale_price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{L('تاريخ البيع', 'بەرواری فرۆشتن')}</span>
                    <span className="font-medium">{sale.sale_date && format(parseISO(sale.sale_date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{L('حالة الدفع', 'دۆخی پارەدان')}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pst.color}`}>{pst.label}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setViewing(sale)}>
                    <FileText className="w-3.5 h-3.5" /> {L('عرض', 'پیشاندان')}
                  </Button>
                  {sale.buyer_phone && (
                    <a href={waLink(sale.buyer_phone)} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </a>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openEdit(sale)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{L('حذف البيع', 'سڕینەوەی فرۆشتن')}</AlertDialogTitle>
                        <AlertDialogDescription>{L('هل أنت متأكد من حذف هذا البيع؟', 'دڵنیای لە سڕینەوەی ئەم فرۆشتنە؟')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(sale.id)} className="bg-destructive text-destructive-foreground">{L('حذف', 'سڕینەوە')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}