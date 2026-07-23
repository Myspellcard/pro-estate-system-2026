import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Trash2, FileText, User, Building2, StickyNote, PenLine, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useBranch } from '@/context/BranchContext';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrencies } from '@/hooks/useCurrencies';

const L = (ar, ku, lang) => lang === 'ku' ? ku : ar;

const STEPS = (lang) => [
  { id: 1, icon: FileText,  label: L('معلومات العقار', 'زانیارییەکانی خانوو', lang),  color: 'text-primary',    bg: 'bg-primary/10'   },
  { id: 2, icon: User,      label: L('بيانات المشتري', 'زانیارییەکانی کڕیار', lang),  color: 'text-blue-600',   bg: 'bg-blue-50'      },
  { id: 3, icon: Building2, label: L('بيانات البائع',  'زانیارییەکانی فرۆشیار', lang), color: 'text-amber-600',  bg: 'bg-amber-50'     },
  { id: 4, icon: PenLine,   label: L('التوقيعات',      'واژۆکان', lang),              color: 'text-purple-600', bg: 'bg-purple-50'    },
  { id: 5, icon: FileText,  label: L('البنود',         'بەندەکان', lang),             color: 'text-green-600',  bg: 'bg-green-50'     },
  { id: 6, icon: StickyNote,label: L('ملاحظات',        'تێبینییەکان', lang),          color: 'text-slate-500',  bg: 'bg-slate-100'    },
];

function StepField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}

export default function SaleContractForm({ contract, properties, contracts = [], onSubmit, onCancel, isLoading }) {
  const { activeBranch } = useBranch();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { can } = useUserPermissions();
  const isAdmin = user?.role === 'admin';

  const steps = STEPS(lang);
  const [currentStep, setCurrentStep] = useState(1);
  const [justChangedStep, setJustChangedStep] = useState(false);
  const [error, setError] = useState('');
  const [clauses, setClauses] = useState(contract?.clauses || []);

  const { data: defaultClauses = [] } = useQuery({
    queryKey: ['sale-contract-clauses'],
    queryFn: () => firebaseApi.entities.SaleContractClause.list('order'),
    enabled: !contract,
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const { currencies: allCurrencies } = useCurrencies();

  const [form, setForm] = useState({
    property_id: contract?.property_id || '',
    sale_price: contract?.sale_price ? String(contract.sale_price) : '',
    currency: contract?.currency || 'IQD',
    currency_symbol: contract?.currency_symbol || 'د.ع',
    currency_rate_to_iqd: contract?.currency_rate_to_iqd || 1,
    sale_date: contract?.sale_date || new Date().toISOString().split('T')[0],
    payment_method: contract?.payment_method || 'أقساط',
    total_amount: contract?.total_amount ? String(contract.total_amount) : '',
    paid_amount: contract?.paid_amount ? String(contract.paid_amount) : '',
    remaining_amount: contract?.remaining_amount ? String(contract.remaining_amount) : '',
    installment_plan: contract?.installment_plan || [],
    buyer_id: contract?.buyer_id || '',
    buyer_name: contract?.buyer_name || '',
    buyer_name_ku: contract?.buyer_name_ku || '',
    buyer_phone: contract?.buyer_phone || '',
    buyer_email: contract?.buyer_email || '',
    buyer_nationality: contract?.buyer_nationality || '',
    buyer_nationality_ku: contract?.buyer_nationality_ku || '',
    buyer_address: contract?.buyer_address || '',
    buyer_address_ku: contract?.buyer_address_ku || '',
    seller_name: contract?.seller_name || '',
    seller_name_ku: contract?.seller_name_ku || '',
    seller_phone: contract?.seller_phone || '',
    seller_email: contract?.seller_email || '',
    seller_nationality: contract?.seller_nationality || '',
    seller_nationality_ku: contract?.seller_nationality_ku || '',
    seller_address: contract?.seller_address || '',
    seller_address_ku: contract?.seller_address_ku || '',
    buyer_signature: contract?.buyer_signature || '',
    seller_signature: contract?.seller_signature || '',
    company_signature: contract?.company_signature || user?.full_name || '',
    signature_date: contract?.signature_date || new Date().toISOString().split('T')[0],
    notes: contract?.notes || '',
    notes_ku: contract?.notes_ku || '',
    status: contract?.status || 'نشط',
    contract_number: contract?.contract_number || '',
  });

  const prevSaleStartNumRef = useRef(0);

  // Auto-populate contract number from settings when form opens
  useEffect(() => {
    if (!contract && settingsList.length > 0) {
      const appSettings = settingsList.find(s => s.key === 'default');
      const startNum = appSettings?.numbering?.sale_contract_start ?? 1;
      const prefix = appSettings?.numbering?.sale_contract_prefix ?? '';
      const generated = `${prefix}${startNum}`;
      const prevGenerated = `${prefix}${prevSaleStartNumRef.current}`;
      if (!form.contract_number || form.contract_number === prevGenerated || prevSaleStartNumRef.current === 0) {
        setForm(prev => ({ ...prev, contract_number: generated }));
        prevSaleStartNumRef.current = startNum;
      }
    }
  }, [settingsList.length]);



  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedProperty = properties.find(p => p.id === form.property_id);

  useEffect(() => {
    if (selectedProperty) {
      setForm(prev => ({
        ...prev,
        seller_name: selectedProperty.owner_name || prev.seller_name || '',
        seller_name_ku: selectedProperty.owner_name_ku || prev.seller_name_ku || '',
        seller_phone: selectedProperty.owner_phone || prev.seller_phone || '',
        seller_email: selectedProperty.owner_email || prev.seller_email || '',
        seller_nationality: selectedProperty.owner_nationality || prev.seller_nationality || '',
        seller_nationality_ku: selectedProperty.owner_nationality_ku || prev.seller_nationality_ku || '',
        seller_address: selectedProperty.owner_address || prev.seller_address || '',
        seller_address_ku: selectedProperty.owner_address_ku || prev.seller_address_ku || '',
        sale_price: selectedProperty.sale_price ? String(selectedProperty.sale_price) : prev.sale_price,
      }));
    }
  }, [form.property_id]);

  const isPropertySold = (id) =>
    contracts.find(c => c.property_id === id && c.status === 'نشط' && (!contract || c.id !== contract.id));

  const validateStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!form.property_id) { setError(L('يرجى اختيار العقار', 'تکایە خانوویەک هەڵبژێرە', lang)); return false; }
      if (!form.sale_price)  { setError(L('يرجى إدخال سعر البيع', 'تکایە نرخی فرۆشتن بنووسە', lang)); return false; }
      if (!form.sale_date)   { setError(L('يرجى إدخال تاريخ البيع', 'تکایە بەرواری فرۆشتن بنووسە', lang)); return false; }
      if (isPropertySold(form.property_id)) { setError(L('هذا العقار مباع مسبقاً', 'ئەم خانویە پێشتر فرۆشراوە', lang)); return false; }
    }
    if (currentStep === 2 && !form.buyer_name) { setError(L('يرجى إدخال اسم المشتري', 'تکایە ناوی کڕیار بنووسە', lang)); return false; }
    return true;
  };

  const next = () => {
    if (validateStep()) {
      setJustChangedStep(true);
      setCurrentStep(s => Math.min(s + 1, steps.length));
      setTimeout(() => setJustChangedStep(false), 600);
    }
  };
  const prev = () => { setError(''); setCurrentStep(s => Math.max(s - 1, 1)); };

  const handleSubmit = () => {
    setError('');
    const contractNumber = form.contract_number || contract?.contract_number || `SALE-${Date.now().toString(36).toUpperCase()}`;
    
    onSubmit({
      ...form,
      buyer_id: form.buyer_id || form.buyer_name || 'buyer',
      contract_number: contractNumber,
      property_name: selectedProperty?.name || contract?.property_name || '',
      property_name_ku: selectedProperty?.name_ku || selectedProperty?.name || contract?.property_name || '',
      sale_price: Number(form.sale_price) || 0,
      total_amount: Number(form.total_amount) || Number(form.sale_price) || 0,
      paid_amount: Number(form.paid_amount) || 0,
      remaining_amount: Number(form.remaining_amount) || 0,
      installment_plan: (form.installment_plan || []).map(inst => ({
        ...inst,
        amount: Number(inst.amount) || 0,
      })),
      clauses,
      created_date: contract?.created_date || new Date().toISOString(),
      branch_id: activeBranch?.id || '',
    });
  };

  const stepContent = {
    1: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StepField label={L('العقار *', 'خانوو *', lang)}>
          <Select value={form.property_id} onValueChange={v => set('property_id', v)}>
            <SelectTrigger className="h-10"><SelectValue placeholder={L('اختر العقار', 'خانوی هەڵبژێرە', lang)} /></SelectTrigger>
            <SelectContent>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id} disabled={!!isPropertySold(p.id)}>
                  {lang === 'ku' ? (p.name_ku || p.name) : p.name}
                  {isPropertySold(p.id) ? ` (${L('مباع', 'فرۆشراو', lang)})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </StepField>
        <StepField label={L('العملة *', 'دراو *', lang)}>
          <Select value={form.currency} onValueChange={v => {
            const cur = allCurrencies.find(c => c.code === v);
            set('currency', v);
            set('currency_symbol', cur?.symbol || v);
            set('currency_rate_to_iqd', cur?.exchange_rate || cur?.rate || 1);
          }}>
            <SelectTrigger className="h-10"><SelectValue placeholder={L('اختر العملة', 'دراو هەڵبژێرە', lang)} /></SelectTrigger>
            <SelectContent>
              {allCurrencies.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} — {c.name || c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </StepField>
        <StepField label={L('سعر البيع *', 'نرخی فرۆشتن *', lang)}>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">{form.currency_symbol}</span>
            <Input type="text" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} placeholder="50000000" className="h-10 pr-10" />
          </div>
        </StepField>
        <StepField label={L('تاريخ البيع *', 'بەرواری فرۆشتن *', lang)}>
          <Input
            type="date"
            value={form.sale_date}
            onChange={e => user?.role === 'admin' && set('sale_date', e.target.value)}
            readOnly={user?.role !== 'admin'}
            className={`h-10 ${user?.role !== 'admin' ? 'bg-muted cursor-not-allowed opacity-70' : ''}`}
          />
        </StepField>
        <StepField label={L('طريقة الدفع', 'شێوازی پارەدان', lang)}>
          <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="نقد">{L('نقد', 'نەقد', lang)}</SelectItem>
              <SelectItem value="تحويل بنكي">{L('تحويل بنكي', 'گواستنەوەی بانک', lang)}</SelectItem>
              <SelectItem value="شيك">{L('شيك', 'چەک', lang)}</SelectItem>
              <SelectItem value="أقساط">{L('أقساط', 'قسط', lang)}</SelectItem>
            </SelectContent>
          </Select>
        </StepField>
        <StepField label={L('المبلغ المدفوع', 'بڕی پارەی دراو', lang)}>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">{form.currency_symbol}</span>
            <Input type="text" value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)} placeholder="0" className="h-10 pr-10" />
          </div>
        </StepField>
        <StepField label={L('المبلغ المتبقي', 'بڕی پارەی ماوە', lang)}>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">{form.currency_symbol}</span>
            <Input type="text" value={form.remaining_amount} onChange={e => set('remaining_amount', e.target.value)} placeholder="0" className="h-10 pr-10" />
          </div>
        </StepField>
        {(form.payment_method === 'أقساط' || form.payment_method === 'نقد') && (
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{form.payment_method === 'نقد' ? L('جدول الدفع النقدي', 'خشتەی پارەدانی نەقد', lang) : L('جدول الأقساط', 'خشتەی قستەکان', lang)}</Label>
              <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => set('installment_plan', [...(form.installment_plan || []), { amount: '', due_date: '', paid_date: '', status: 'معلق' }])}>
                <Plus className="w-3 h-3" /> {form.payment_method === 'نقد' ? L('إضافة دفعة', 'زیادکردنی پارەدان', lang) : L('إضافة قسط', 'زیادکردنی قست', lang)}
              </Button>
            </div>
            {(form.installment_plan || []).length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs border-2 border-dashed rounded-xl">{form.payment_method === 'نقد' ? L('لا توجد دفعات', 'پارەدان نییە', lang) : L('لا توجد أقساط', 'قست نییە', lang)}</div>
            )}
            <div className="space-y-2">
              {(form.installment_plan || []).map((inst, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-center bg-slate-50 rounded-lg p-2">
                  <div className="relative">
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">{form.currency_symbol}</span>
                    <input type="text" value={inst.amount} onChange={e => { const p = [...form.installment_plan]; p[idx] = {...p[idx], amount: e.target.value}; set('installment_plan', p); }} placeholder={L('المبلغ', 'بڕ', lang)} className="w-full border border-input rounded-md px-2 py-1.5 text-xs pr-7 focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <input type="date" value={inst.due_date} onChange={e => { const p = [...form.installment_plan]; p[idx] = {...p[idx], due_date: e.target.value}; set('installment_plan', p); }} className="border border-input rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                  <select value={inst.status} onChange={e => { const p = [...form.installment_plan]; p[idx] = {...p[idx], status: e.target.value}; set('installment_plan', p); }} className="border border-input rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="معلق">{L('معلق', 'راگیراو', lang)}</option>
                    <option value="مدفوع">{L('مدفوع', 'دراو', lang)}</option>
                  </select>
                  <button type="button" onClick={() => set('installment_plan', form.installment_plan.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80 flex justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {!contract && (
          <StepField label={L('رقم العقد', 'ژمارەی گرێبەست', lang)}>
            <Input
              value={form.contract_number}
              onChange={e => set('contract_number', e.target.value)}
              className="h-10 font-bold"
              dir="ltr"
              readOnly={!isAdmin}
              disabled={!isAdmin}
            />
            <p className="text-xs text-slate-400 mt-1">{L('سيتم تعبئته تلقائياً', 'بە شێوەیەکی خۆکار پڕ دەکرێتەوە', lang)}</p>
            {!isAdmin && <p className="text-xs text-amber-600 mt-0.5">⚠️ {L('يمكن للإدارة فقط تغيير الرقم', 'تەنها بەڕێوەبەر دەتوانێت ژمارەکە بگۆڕێت')}</p>}
          </StepField>
        )}
      </div>
    ),
    2: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StepField label={L('الاسم (عربي) *', 'ناو (عەرەبی) *', lang)}>
          <Input value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)} placeholder={L('اسم المشتري', 'ناوی کڕیار', lang)} className="h-10" />
        </StepField>
        <StepField label={L('الاسم (كردي)', 'ناو (کوردی)', lang)}>
          <Input value={form.buyer_name_ku} onChange={e => set('buyer_name_ku', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('رقم الهاتف', 'ژمارەی تەلەفۆن', lang)}>
          <Input value={form.buyer_phone} onChange={e => set('buyer_phone', e.target.value)} placeholder="07501234567" className="h-10" />
        </StepField>
        <StepField label={L('البريد الإلكتروني', 'ئیمەیڵ', lang)}>
          <Input type="email" value={form.buyer_email} onChange={e => set('buyer_email', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('الجنسية', 'نەتەوە', lang)}>
          <Input value={form.buyer_nationality} onChange={e => set('buyer_nationality', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('الجنسية (كردي)', 'نەتەوە (کوردی)', lang)}>
          <Input value={form.buyer_nationality_ku} onChange={e => set('buyer_nationality_ku', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('العنوان', 'ناونیشان', lang)}>
          <Textarea value={form.buyer_address} onChange={e => set('buyer_address', e.target.value)} rows={2} className="resize-none" />
        </StepField>
        <StepField label={L('العنوان (كردي)', 'ناونیشان (کوردی)', lang)}>
          <Textarea value={form.buyer_address_ku} onChange={e => set('buyer_address_ku', e.target.value)} rows={2} className="resize-none" />
        </StepField>
      </div>
    ),
    3: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StepField label={L('الاسم (عربي)', 'ناو (عەرەبی)', lang)}>
          <Input value={form.seller_name} onChange={e => set('seller_name', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('الاسم (كردي)', 'ناو (کوردی)', lang)}>
          <Input value={form.seller_name_ku} onChange={e => set('seller_name_ku', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('رقم الهاتف', 'ژمارەی تەلەفۆن', lang)}>
          <Input value={form.seller_phone} onChange={e => set('seller_phone', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('البريد الإلكتروني', 'ئیمەیڵ', lang)}>
          <Input type="email" value={form.seller_email} onChange={e => set('seller_email', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('الجنسية (عربي)', 'نەتەوە (عەرەبی)', lang)}>
          <Input value={form.seller_nationality} onChange={e => set('seller_nationality', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('الجنسية (كردي)', 'نەتەوە (کوردی)', lang)}>
          <Input value={form.seller_nationality_ku} onChange={e => set('seller_nationality_ku', e.target.value)} className="h-10" />
        </StepField>
        <StepField label={L('العنوان (عربي)', 'ناونیشان (عەرەبی)', lang)}>
          <Textarea value={form.seller_address} onChange={e => set('seller_address', e.target.value)} rows={2} className="resize-none" />
        </StepField>
        <StepField label={L('العنوان (كردي)', 'ناونیشان (کوردی)', lang)}>
          <Textarea value={form.seller_address_ku} onChange={e => set('seller_address_ku', e.target.value)} rows={2} className="resize-none" />
        </StepField>
      </div>
    ),
    4: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          [L('توقيع المشتري', 'واژۆی کڕیار', lang), 'buyer_signature'],
          [L('توقيع البائع', 'واژۆی فرۆشیار', lang), 'seller_signature'],
          [L('توقيع الشركة', 'واژۆی کۆمپانیا', lang), 'company_signature'],
        ].map(([label, field]) => (
          <StepField key={field} label={label}>
            <Textarea value={form[field]} onChange={e => set(field, e.target.value)} placeholder={L('التوقيع...', 'واژۆ...', lang)} rows={3} className="resize-none" />
          </StepField>
        ))}
      </div>
    ),
    5: (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">{L('البنود التي ستظهر في العقد', 'بەندەکانی کە لە گرێبەستدا دەردەکەون')}</p>
          <div className="flex gap-2">
            {defaultClauses.length > 0 && (
              <Button type="button" size="sm" variant="outline" className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setClauses(defaultClauses.filter(c => c.is_active !== false).map(c => ({ title: c.title, title_ku: c.title_ku || '', description: c.description, description_ku: c.description_ku || '' })))}>
                ↺ {L('إعادة تحميل من الإعدادات', 'لە ڕێکخستنەکان دووبارە بارکردن')}
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setClauses(prev => [...prev, { title: '', title_ku: '', description: '', description_ku: '' }])}>
              <Plus className="w-3.5 h-3.5" /> {L('إضافة بند', 'زیادکردنی بەند')}
            </Button>
          </div>
        </div>
        {clauses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
            {L('لا توجد بنود. اضغط "إضافة بند" لإضافة بند جديد.', 'بەند نییە. "زیادکردنی بەند" دابگرە بۆ زیادکردنی بەندێکی نوێ.')}
          </div>
        )}
        {clauses.map((clause, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
              <input
                type="text"
                value={clause.title}
                onChange={e => setClauses(prev => prev.map((c, i) => i === idx ? { ...c, title: e.target.value } : c))}
                placeholder={L('عنوان البند', 'سەردێڕی بەند', lang)}
                className="flex-1 border border-input rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button type="button" onClick={() => setClauses(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={clause.description}
              onChange={e => setClauses(prev => prev.map((c, i) => i === idx ? { ...c, description: e.target.value } : c))}
              placeholder={L('نص البند...', 'دەقی بەند...', lang)}
              rows={3}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ))}
      </div>
    ),
    6: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StepField label={L('ملاحظات (عربي)', 'تێبینی (عەرەبی)', lang)}>
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={4} className="resize-none" />
        </StepField>
        <StepField label={L('ملاحظات (كردي)', 'تێبینی (کوردی)', lang)}>
          <Textarea value={form.notes_ku} onChange={e => set('notes_ku', e.target.value)} rows={4} className="resize-none" />
        </StepField>
      </div>
    ),
  };

  const activeStep = steps[currentStep - 1];
  const ActiveIcon = activeStep.icon;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-purple-500 via-pink-500 to-orange-500 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {contract ? L('تعديل عقد البيع', 'دەستکاریکردنی گرێبەستی فرۆشتن', lang) : L('إنشاء عقد بيع جديد', 'دروستکردنی گرێبەستی فرۆشتنی نوێ', lang)}
            </h2>
            <p className="text-white/70 text-xs mt-0.5">
              {L(`الخطوة ${currentStep} من ${steps.length}`, `گامی ${currentStep} لە ${steps.length}`, lang)}
            </p>
          </div>
        </div>
        <button onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Step Progress */}
      <div className="px-6 py-5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((step, idx) => {
            const colors = ['from-pink-500 to-purple-500', 'from-blue-500 to-cyan-500', 'from-orange-500 to-pink-500', 'from-purple-500 to-pink-500', 'from-green-500 to-teal-500', 'from-rose-500 to-orange-500'];
            const bgGradient = colors[step.id - 1] || colors[0];
            const Icon = step.icon;
            const done = currentStep > step.id;
            const active = currentStep === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => { setError(''); setCurrentStep(step.id); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active  ? `bg-gradient-to-r ${bgGradient} text-white shadow-lg shadow-pink-500/30` :
                    done    ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200' :
                              'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    active ? 'bg-white/25' : done ? 'bg-emerald-200' : 'bg-slate-100'
                  }`}>
                    {done
                      ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                      : <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-500'}`} />
                    }
                  </div>
                  <span>{step.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`h-1 w-6 rounded-full shrink-0 transition-all ${
                    done ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }}>
        {/* Step Content */}
        <div className="p-8 bg-gradient-to-b from-slate-50 to-white">
          {/* Step Title */}
          <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl ${activeStep.bg}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-white/70`}>
              <ActiveIcon className={`w-5 h-5 ${activeStep.color}`} />
            </div>
            <div>
              <p className="font-bold text-sm">{activeStep.label}</p>
              <p className="text-xs text-muted-foreground">{L(`الخطوة ${currentStep} من ${steps.length}`, `گامی ${currentStep} لە ${steps.length}`, lang)}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
              {error}
            </div>
          )}

          {stepContent[currentStep]}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={currentStep === 1 ? onCancel : prev} className="gap-2">
            {currentStep === 1 ? (
              <>{L('إلغاء', 'پاشگەزبوونەوە', lang)}</>
            ) : (
              <><ChevronRight className="w-4 h-4" />{L('السابق', 'پێشوو', lang)}</>
            )}
          </Button>

          {currentStep < steps.length ? (
            <Button type="button" onClick={next} className="gap-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white shadow-lg shadow-pink-500/30 min-w-32">
              {L('التالي', 'داهاتوو', lang)} <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isLoading} className="gap-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-pink-500/30 min-w-36">
              {isLoading
                ? L('جاري الحفظ...', 'پاشەکەوتکردن...', lang)
                : contract
                  ? L('تحديث العقد', 'نوێکردنەوەی گرێبەست', lang)
                  : L('إنشاء العقد', 'دروستکردنی گرێبەست', lang)
              }
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}