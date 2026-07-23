import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { X, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { differenceInMonths, parseISO, addMonths, format, isValid } from 'date-fns';
import { useBranch } from '@/context/BranchContext';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useCurrencies } from '@/hooks/useCurrencies';

// Helper: parse yyyy-MM-dd string to Date safely
const parseDate = (str) => {
  if (!str) return undefined;
  const d = parseISO(str);
  return isValid(d) ? d : undefined;
};

// Styled date picker button
const DatePickerButton = ({ value, onChange, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);
  const date = parseDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`w-full h-11 flex items-center justify-between gap-2 px-3 rounded-lg border text-sm font-medium transition-all
            ${disabled ? 'bg-muted/50 text-muted-foreground cursor-default border-slate-200' : 'bg-white border-slate-200 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer'}
          `}
        >
          <span className={date ? 'text-slate-800' : 'text-slate-400'}>
            {date ? format(date, 'dd / MM / yyyy') : placeholder || '—'}
          </span>
          <CalendarIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 shadow-2xl rounded-2xl border-0 overflow-hidden" align="start" side="bottom">
        <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 px-4 py-3">
          <p className="text-white text-sm font-bold">{date ? format(date, 'dd MMMM yyyy') : placeholder}</p>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          initialFocus
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
};

const L = (ar, ku, lang) => lang === 'ku' ? ku : ar;

const getPurposes = (lang) => [
  L('سكني', 'نیشتەجێبوون', lang),
  L('تجاري', 'بازرگانی', lang),
  L('مكتبي', 'مەکتەبی', lang),
  L('صناعي', 'پیشەسازی', lang),
  L('مخزن', 'ئەمبار', lang),
];



export default function ContractForm({ contract, properties, tenants, contracts = [], onSubmit, onCancel, isLoading }) {
  const { activeBranch } = useBranch();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { currencies, defaultCurrency } = useCurrencies();
  const { can } = useUserPermissions();
  const isAdmin = user?.role === 'admin';
  
  const purposes = getPurposes(lang);

  const { data: defaultClauses = [] } = useQuery({
    queryKey: ['contract-clauses'],
    queryFn: () => firebaseApi.entities.ContractClause.list('order'),
    enabled: !contract,
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const [form, setForm] = useState({
    property_id: contract?.property_id || '',
    tenant_id: contract?.tenant_id || '',
    purpose: contract?.purpose || (lang === 'ku' ? 'نیشتەجێبوون' : 'سكني'),
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    input_months: contract?.duration_months || '',
    monthly_rent: contract?.monthly_rent || '',
    insurance_amount: contract?.insurance_amount || '',
    notice_period_months: contract?.notice_period_months || 6,
    payment_interval_months: contract?.payment_interval_months || 1,
    currency: contract?.currency || defaultCurrency?.code || 'IQD',
    currency_symbol: contract?.currency_symbol || defaultCurrency?.symbol || 'د.ع',
    currency_rate_to_iqd: contract?.currency_rate_to_iqd || defaultCurrency?.exchange_rate || 1,
    owner_name: contract?.owner_name || '',
    owner_phone: contract?.owner_phone || '',
    owner_email: contract?.owner_email || '',
    owner_nationality: contract?.owner_nationality || '',
    owner_address: contract?.owner_address || '',
    company_name: contract?.company_name || activeBranch?.company_name || '',
    company_representative: contract?.company_representative || user?.full_name || '',
    company_phone: contract?.company_phone || activeBranch?.company_phone || '',
    company_logo: contract?.company_logo || activeBranch?.company_logo || '',
    owner_signature: contract?.owner_signature || '',
    tenant_signature: contract?.tenant_signature || '',
    company_signature: contract?.company_signature || '',
    signature_date: contract?.signature_date || new Date().toISOString().split('T')[0],
    tenant_nationality: contract?.tenant_nationality || '',
    tenant_address: contract?.tenant_address || '',
    family_members: contract?.family_members || '',
    notes: contract?.notes || '',
    status: contract?.status || (lang === 'ku' ? 'چالاک' : 'نشط'),
    contract_number: contract?.contract_number || '',
  });
  const [error, setError] = useState('');
  const prevStartNumRef = useRef(0);

  // Auto-populate contract number from settings when form opens
  useEffect(() => {
    if (!contract && settingsList && settingsList.length > 0) {
      const appSettings = settingsList.find(s => s.key === 'default');
      const startNum = appSettings?.numbering?.rental_permission_start ?? 1;
      const prefix = appSettings?.numbering?.rental_permission_prefix ?? '';
      const generated = `${prefix}${startNum}`;
      // Only update if the number changed from settings or form is still empty/default
      const prevGenerated = `${prefix}${prevStartNumRef.current}`;
      if (!form.contract_number || form.contract_number === prevGenerated || prevStartNumRef.current === 0) {
        setForm(prev => ({ ...prev, contract_number: generated }));
        prevStartNumRef.current = startNum;
      }
    }
  }, [settingsList.length]);

  // Auto-fill company info from active branch when creating new contract
  useEffect(() => {
    if (!contract && activeBranch) {
      setForm(prev => ({
        ...prev,
        company_name: prev.company_name || activeBranch.company_name || '',
        company_phone: prev.company_phone || activeBranch.company_phone || '',
        company_logo: prev.company_logo || activeBranch.company_logo || '',
      }));
    }
  }, [activeBranch, contract]);

  // Auto-fill prepared-by from logged-in user
  useEffect(() => {
    if (!contract && user) {
      setForm(prev => ({
        ...prev,
        company_representative: prev.company_representative || user.full_name || '',
      }));
    }
  }, [user, contract]);

  const [clauses, setClauses] = useState(contract?.clauses || []);

  // Once defaultClauses load (for new contracts), populate if clauses is still empty
  useEffect(() => {
    if (!contract && defaultClauses.length > 0 && clauses.length === 0) {
      setClauses(defaultClauses.filter(c => c.is_active !== false).map(c => ({ title: c.title, description: c.description })));
    }
  }, [defaultClauses]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addClause = () => setClauses(prev => [...prev, { title: '', description: '' }]);
  const removeClause = (idx) => setClauses(prev => prev.filter((_, i) => i !== idx));
  const updateClause = (idx, field, value) => {
    setClauses(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const selectedProperty = properties.find(p => p.id === form.property_id);
  const selectedTenant = tenants.find(t => t.id === form.tenant_id);

  // Auto-populate owner info and currency from selected property
  useEffect(() => {
    if (selectedProperty) {
      const propCurrency = selectedProperty.rent_currency || selectedProperty.currency || selectedProperty.sale_currency;
      const propSymbol = selectedProperty.rent_currency_symbol || selectedProperty.currency_symbol || selectedProperty.sale_currency_symbol;
      setForm(prev => ({
        ...prev,
        owner_name: prev.owner_name || selectedProperty.owner_name || '',
        owner_phone: prev.owner_phone || selectedProperty.owner_phone || '',
        owner_email: prev.owner_email || selectedProperty.owner_email || '',
        owner_nationality: prev.owner_nationality || selectedProperty.owner_nationality || '',
        owner_address: prev.owner_address || selectedProperty.owner_address || '',
        // Auto-fill monthly rent from property if not set
        monthly_rent: prev.monthly_rent || selectedProperty.monthly_rent || '',
        // Set currency from property
        ...(propCurrency && !contract ? {
          currency: propCurrency,
          currency_symbol: propSymbol || propCurrency,
          currency_rate_to_iqd: currencies.find(c => c.code === propCurrency)?.exchange_rate || prev.currency_rate_to_iqd || 1,
        } : {}),
      }));
    }
  }, [selectedProperty]);

  // Auto-populate tenant info from selected tenant (only for new contracts)
  useEffect(() => {
    if (selectedTenant && !contract) {
      setForm(prev => ({
        ...prev,
        tenant_nationality: prev.tenant_nationality || selectedTenant.nationality || '',
        tenant_address: prev.tenant_address || selectedTenant.address || '',
        family_members: prev.family_members || selectedTenant.family_members || '',
      }));
    }
  }, [selectedTenant, contract]);

  // Check if property is currently rented (active contract exists)
  const isPropertyRented = (propertyId) => {
    const activeContract = contracts.find(c => 
      c.property_id === propertyId && 
      (c.status === 'نشط' || c.status === 'چالاک')
    );
    return !!activeContract && (!contract || contract.property_id !== propertyId);
  };

  // Check if tenant already has an active contract
  const isTenantAlreadyRenting = (tenantId) => {
    if (!tenantId) return false;
    return contracts.some(c => 
      c.tenant_id === tenantId && 
      (c.status === 'نشط' || c.status === 'چالاک') &&
      (!contract || c.id !== contract.id)
    );
  };

  const durationMonths = form.start_date && form.end_date
    ? Math.max(1, differenceInMonths(parseISO(form.end_date), parseISO(form.start_date)))
    : 0;

  const totalRent = durationMonths * (Number(form.monthly_rent) || 0);
  const dailyRent = form.monthly_rent ? Math.round((Number(form.monthly_rent) / 30) * 3) : 0;
  const numberOfPayments = form.payment_interval_months && durationMonths > 0 
    ? Math.ceil(durationMonths / Number(form.payment_interval_months)) 
    : 0;
  const paymentAmount = form.payment_interval_months && form.monthly_rent
    ? Number(form.monthly_rent) * Number(form.payment_interval_months)
    : 0;

  const handleSubmit = (e) => {
  e.preventDefault();
  setError('');

  const contractNumber = form.contract_number || contract?.contract_number || `CON-${Date.now().toString(36).toUpperCase()}`;

  // Check for duplicate contract number
  const duplicateNumber = contracts.find(c => 
    c.contract_number === contractNumber && 
    (!contract || c.id !== contract.id)
  );
  if (duplicateNumber) {
    setError(lang === 'ku' ? 'ئەم ژمارەیە گرێبەست پێشتر بەکارهاتووە' : 'رقم العقد هذا مستخدم مسبقاً');
    return;
  }

  // Check for overlapping contracts on the same property
  if (form.property_id && form.start_date && form.end_date) {
    const overlapping = contracts.find(c => {
      // Skip the current contract if editing
      if (contract && c.id === contract.id) return false;

      // Only check active contracts
      if (c.status !== 'نشط' && c.status !== 'چالاک') return false;

      // Check if same property
      if (c.property_id !== form.property_id) return false;

      // Check for date overlap
      const newStart = parseISO(form.start_date);
      const newEnd = parseISO(form.end_date);
      const existingStart = parseISO(c.start_date);
      const existingEnd = parseISO(c.end_date);

      return newStart <= existingEnd && newEnd >= existingStart;
    });

    if (overlapping) {
      setError(lang === 'ku' ? 'ئەم خانوویە پێشتر کرێدراوە لەم ماوەیەدا' : 'هذا العقار مؤجر بالفعل في هذه الفترة');
      return;
    }
  }

  // Block if tenant already has active contract
  if (isTenantAlreadyRenting(form.tenant_id)) {
    setError(lang === 'ku' ? 'ئەم کرێچیە گرێبەستی چالاکى هەیە. ناتوانرێت دوو خانوو بۆ یەک کەس بدرێتە کرێ' : 'هذا المستأجر لديه عقد إيجار نشط بالفعل. لا يمكن تأجير عقارين لنفس الشخص.');
    return;
  }
  const now = new Date().toISOString();

  // Bilingual field mapping
  const statusMap = {
    'نشط': 'چالاک',
    'منتهي': 'کۆتاییهاتوو',
    'ملغي': 'هەڵوەشاوە',
    'معلق': 'راگیراو',
  };
  const purposeMap = {
    'سكني': 'نیشتەجێبوون',
    'تجاري': 'بازرگانی',
    'مكتبي': 'مەکتەبی',
    'صناعي': 'پیشەسازی',
    'مخزن': 'ئەمبار',
  };

  onSubmit({
    ...form,
    contract_number: contractNumber,
    // Arabic fields
    property_name: selectedProperty?.name || contract?.property_name || '',
    tenant_name: selectedTenant?.full_name || contract?.tenant_name || '',
    tenant_phone: selectedTenant?.phone || contract?.tenant_phone || '',
    tenant_email: selectedTenant?.email || contract?.tenant_email || '',
    tenant_nationality: form.tenant_nationality || '',
    tenant_address: form.tenant_address || selectedTenant?.address || '',
    family_members: form.family_members || selectedTenant?.family_members || '',
    // Kurdish fields (mirror Arabic)
    property_name_ku: selectedProperty?.name_ku || selectedProperty?.name || contract?.property_name || '',
    tenant_name_ku: selectedTenant?.full_name_ku || selectedTenant?.full_name || contract?.tenant_name || '',
    monthly_rent: Number(form.monthly_rent) || 0,
    daily_rent: dailyRent,
    insurance_amount: Number(form.insurance_amount) || 0,
    notice_period_months: Number(form.notice_period_months) || 6,
    duration_months: durationMonths,
    total_rent: totalRent,
    // Bilingual status/purpose/payment
    status: form.status,
    status_ku: statusMap[form.status] || form.status,
    purpose: form.purpose,
    purpose_ku: purposeMap[form.purpose] || form.purpose,
    payment_interval_months: Number(form.payment_interval_months) || 1,
    currency: form.currency || 'IQD',
    currency_symbol: form.currency_symbol || 'د.ع',
    currency_rate_to_iqd: Number(form.currency_rate_to_iqd) || 1,
    clauses,
    created_date: contract?.created_date || now,
  });
  };

  return (
    <div className="relative bg-gradient-to-br from-white via-slate-50/50 to-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 mb-8 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
      
      <div className="relative flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">{contract ? L('تعديل العقد', 'دەستکاریکردنی گرێبەست', lang) : L('إنشاء عقد جديد', 'دروستکردنی گرێبەستی نوێ', lang)}</h2>
          <p className="text-sm text-slate-500 mt-1">{contract ? L('قم بتحديث تفاصيل العقد', 'وردەکارییەکانی گرێبەست نوێ بکەرەوە', lang) : L('أضف عقد إيجار جديد', 'گرێبەستی کرێی نوێ زیاد بکە', lang)}</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
      </div>
      
      {error && (
        <div className="relative mb-6 p-4 bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="relative space-y-8">
        {/* Basic Info */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 rounded-2xl" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">{L('العقار *', 'خانوو *', lang)}</Label>
              <Select value={form.property_id} onValueChange={v => {
                handleChange('property_id', v);
                const p = properties.find(x => x.id === v);
                if (p) {
                  if (p.monthly_rent) handleChange('monthly_rent', p.monthly_rent);
                  const pCur = p.rent_currency || p.currency || p.sale_currency;
                  const pSym = p.rent_currency_symbol || p.currency_symbol || p.sale_currency_symbol;
                  if (pCur) {
                    handleChange('currency', pCur);
                    handleChange('currency_symbol', pSym || pCur);
                    const rate = currencies.find(c => c.code === pCur)?.exchange_rate || 1;
                    handleChange('currency_rate_to_iqd', rate);
                  }
                }
              }}>
                <SelectTrigger className="h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"><SelectValue placeholder={L('اختر العقار', 'خانوی هەڵبژێرە', lang)} /></SelectTrigger>
                <SelectContent>{properties.map(p => {
                  const rented = isPropertyRented(p.id);
                  return (
                    <SelectItem key={p.id} value={p.id} disabled={rented}>
                      <span className={rented ? 'text-slate-400' : ''}>
                        {lang === 'ku' ? (p.name_ku || p.name) : p.name} — {p.type}
                        {rented ? ` 🔒 (${L('مؤجر — غير متاح', 'کرێدراو — بەردەست نییە', lang)})` : ''}
                      </span>
                    </SelectItem>
                  );
                })}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{L('المستأجر *', 'کرێچی *', lang)}</Label>
              <Select value={form.tenant_id} onValueChange={v => handleChange('tenant_id', v)}>
                <SelectTrigger><SelectValue placeholder={L('اختر المستأجر', 'کرێچی هەڵبژێرە', lang)} /></SelectTrigger>
                <SelectContent>{tenants.map(t => {
                  const busy = isTenantAlreadyRenting(t.id);
                  return (
                    <SelectItem key={t.id} value={t.id} disabled={busy}>
                      <span className={busy ? 'text-slate-400' : ''}>
                        {lang === 'ku' ? (t.full_name_ku || t.full_name) : t.full_name}
                        {busy ? ` 🔒 (${L('لديه عقد نشط — غير متاح', 'گرێبەستی چالاکى هەیە — بەردەست نییە', lang)})` : ''}
                      </span>
                    </SelectItem>
                  );
                })}</SelectContent>
              </Select>
              {form.tenant_id && isTenantAlreadyRenting(form.tenant_id) && (
                <p className="text-xs text-red-600">⚠️ {L('هذا المستأجر لديه عقد إيجار نشط بالفعل', 'ئەم کرێچیە گرێبەستی چالاکى هەیە', lang)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{L('غرض الإيجار', 'ئامانجی کرێ', lang)}</Label>
              <Select value={form.purpose} onValueChange={v => handleChange('purpose', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {purposes.map((p, idx) => {
                    const valueMap = ['سكني', 'تجاري', 'مكتبي', 'صناعي', 'مخزن'];
                    return <SelectItem key={valueMap[idx]} value={valueMap[idx]}>{p}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            {!contract && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">{L('رقم مۆڵەتي کرێ', 'ژمارەی مۆڵەتی کرێ', lang)}</Label>
                <Input
                  value={form.contract_number}
                  onChange={e => handleChange('contract_number', e.target.value)}
                  className="font-bold text-[#1a2744]"
                  dir="ltr"
                  readOnly={!isAdmin}
                  disabled={!isAdmin}
                />
                <p className="text-xs text-slate-400">{L('سيتم تعبئته تلقائياً', 'بە شێوەیەکی خۆکار پڕ دەکرێتەوە', lang)}</p>
                {!isAdmin && <p className="text-xs text-amber-600">⚠️ {L('يمكن للإدارة فقط تغيير الرقم', 'تەنها بەڕێوەبەر دەتوانێت ژمارەکە بگۆڕێت')}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Dates & Financial */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-2xl" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">{L('تاريخ البداية *', 'بەرواری دەستپێک *', lang)}</Label>
              <DatePickerButton
                value={form.start_date}
                placeholder={L('اختر تاريخ البداية', 'بەرواری دەستپێک هەڵبژێرە', lang)}
                onChange={(newStart) => {
                  let newEnd = form.end_date;
                  if (newStart && form.input_months) {
                    newEnd = format(addMonths(parseISO(newStart), Number(form.input_months)), 'yyyy-MM-dd');
                  }
                  setForm(prev => ({ ...prev, start_date: newStart, end_date: newEnd }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{L('مدة العقد (شهر)', 'ماوەی گرێبەست (مانگ)', lang)}</Label>
              <Input type="number" min="1" value={form.input_months} onChange={e => {
                const months = e.target.value;
                let newEnd = form.end_date;
                if (form.start_date && months) {
                  newEnd = format(addMonths(parseISO(form.start_date), Number(months)), 'yyyy-MM-dd');
                }
                setForm(prev => ({ ...prev, input_months: months, end_date: newEnd }));
              }} placeholder={L('مثال: 12', 'نموونە: ١٢', lang)} />
            </div>
            <div className="space-y-2">
              <Label>{L('تاريخ الانتهاء', 'بەرواری کۆتایی', lang)}</Label>
              <DatePickerButton
                value={form.end_date}
                placeholder={L('تاريخ الانتهاء', 'بەرواری کۆتایی', lang)}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>{L('العملة', 'دراو', lang)}</Label>
              <Select value={form.currency} onValueChange={v => {
                const cur = currencies.find(c => c.code === v);
                handleChange('currency', v);
                handleChange('currency_symbol', cur?.symbol || v);
                handleChange('currency_rate_to_iqd', cur?.exchange_rate || 1);
              }}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} — {c.name || c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{L('الإيجار الشهري *', 'کرێی مانگانە *', lang)}</Label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground pointer-events-none">{form.currency_symbol}</span>
                <Input type="number" value={form.monthly_rent} onChange={e => handleChange('monthly_rent', e.target.value)} required placeholder="500000" className="pr-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{L('مبلغ التأمين', 'بڕی دڵنیایی', lang)}</Label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground pointer-events-none">{form.currency_symbol}</span>
                <Input type="number" value={form.insurance_amount} onChange={e => handleChange('insurance_amount', e.target.value)} placeholder="1000000" className="pr-12" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{L('فترة الإشعار (أشهر)', 'ماوەی ئاگادارکردنەوە (مانگ)', lang)}</Label>
              <Input type="number" min="1" value={form.notice_period_months} onChange={e => handleChange('notice_period_months', e.target.value)} placeholder="6" />
              <p className="text-xs text-muted-foreground">{L('إذا غادر قبل هذه المدة، لا يُرد التأمين', 'ئەگەر پێش ئەم ماوەیە بڕوات، دڵنیایی لێ ناگەرێتەوە', lang)}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        {durationMonths > 0 && form.payment_interval_months && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10" />
            <div className="relative grid grid-cols-2 md:grid-cols-6 gap-4 p-6 bg-white/90 backdrop-blur-sm">
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <p className="text-xs text-emerald-600 font-semibold mb-1">{L('المدة', 'ماوە', lang)}</p>
                <p className="text-lg font-bold text-emerald-700">{durationMonths} <span className="text-xs font-normal">{L('شهر', 'مانگ', lang)}</span></p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <p className="text-xs text-blue-600 font-semibold mb-1">{L('الإيجار الشهري', 'کرێی مانگانە', lang)}</p>
                <p className="text-lg font-bold text-blue-700">{form.currency_symbol} {Number(form.monthly_rent || 0).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                <p className="text-xs text-purple-600 font-semibold mb-1">{L('فترة الدفع', 'ماوەی پارەدان', lang)}</p>
                <p className="text-lg font-bold text-purple-700">{form.payment_interval_months} <span className="text-xs font-normal">{L('أشهر', 'مانگ', lang)}</span></p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                <p className="text-xs text-amber-600 font-semibold mb-1">{L('عدد الدفعات', 'ژمارەی پارەدانەکان', lang)}</p>
                <p className="text-lg font-bold text-amber-700">{numberOfPayments}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-100">
                <p className="text-xs text-cyan-600 font-semibold mb-1">{L('قيمة الدفعة', 'بڕی پارەدان', lang)}</p>
                <p className="text-lg font-bold text-cyan-700">{form.currency_symbol} {paymentAmount.toLocaleString()}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                <p className="text-xs text-emerald-600 font-semibold mb-1">{L('إجمالي الإيجار', 'کۆی گشتی کرێ', lang)}</p>
                <p className="text-lg font-bold text-emerald-700">{form.currency_symbol} {totalRent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{L('فترة الدفع (أشهر)', 'ماوەی پارەدان (مانگ)', lang)}</Label>
            <Select value={form.payment_interval_months} onValueChange={v => handleChange('payment_interval_months', v)}>
              <SelectTrigger><SelectValue placeholder={L('اختر الفترة', 'ماوەکە هەڵبژێرە', lang)} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="12">12</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.payment_interval_months && durationMonths > 0 && (
                <>
                  {L(`سيتم دفع ${numberOfPayments} دفعة، كل ${form.payment_interval_months} أشهر`, `ژمارەی پارەدانەکان ${numberOfPayments}، هەموو ${form.payment_interval_months} مانگێک`, lang)}
                </>
              )}
            </p>
          </div>
          {contract && (
            <div className="space-y-2">
              <Label>{L('حالة العقد', 'دۆخی گرێبەست', lang)}</Label>
              <Select value={form.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="نشط">{L('نشط', 'چالاک', lang)}</SelectItem>
                  <SelectItem value="منتهي">{L('منتهي', 'کۆتاییهاتوو', lang)}</SelectItem>
                  <SelectItem value="ملغي">{L('ملغي', 'هەڵوەشاوە', lang)}</SelectItem>
                  <SelectItem value="معلق">{L('معلق', 'راگیراو', lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>



        {/* Tenant Info */}
        <div className="border-t border-border pt-6">
          <h3 className="font-bold mb-4">{L('معلومات المستأجر', 'زانیارییەکانی کرێچی', lang)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{L('جنسية المستأجر', 'نەتەوەی کرێچی', lang)}</Label>
              <Input value={form.tenant_nationality} onChange={e => handleChange('tenant_nationality', e.target.value)} placeholder={L('مثال: عراقي', 'نموونە: عێراقی', lang)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{L('عنوان المستأجر', 'ناونیشانی کرێچی', lang)}</Label>
              <Input value={form.tenant_address} onChange={e => handleChange('tenant_address', e.target.value)} placeholder={L('العنوان الحالي', 'ناونیشانی ئێستا', lang)} />
            </div>
            <div className="space-y-2">
              <Label>{L('عدد أفراد العائلة', 'ژمارەی ئەندامانی خێزان', lang)}</Label>
              <Input type="number" value={form.family_members} onChange={e => handleChange('family_members', e.target.value)} placeholder={L('مثال: 4', 'نموونە: 4', lang)} />
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="border-t border-border pt-6">
          <h3 className="font-bold mb-4">{L('معلومات المالك', 'زانیارییەکانی خاوەن', lang)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{L('اسم المالك', 'ناوی خاوەن', lang)}</Label>
              <Input value={form.owner_name} onChange={e => handleChange('owner_name', e.target.value)} placeholder={L('اسم المالك...', 'ناوی خاوەن...', lang)} />
            </div>
            <div className="space-y-2">
              <Label>{L('هاتف المالك', 'تەلەفۆنی خاوەن', lang)}</Label>
              <Input value={form.owner_phone} onChange={e => handleChange('owner_phone', e.target.value)} placeholder="07xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>{L('بريد المالك', 'ئیمەیلی خاوەن', lang)}</Label>
              <Input value={form.owner_email} onChange={e => handleChange('owner_email', e.target.value)} placeholder="owner@email.com" />
            </div>
            <div className="space-y-2">
              <Label>{L('جنسية المالك', 'نەتەوەی خاوەن', lang)}</Label>
              <Input value={form.owner_nationality} onChange={e => handleChange('owner_nationality', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{L('عنوان المالك', 'ناونیشانی خاوەن', lang)}</Label>
              <Input value={form.owner_address} onChange={e => handleChange('owner_address', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="border-t border-border pt-6">
          <h3 className="font-bold mb-4">{L('التوقيعات', 'واژۆکان', lang)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">{L('توقيع المالك', 'واژۆی خاوەن', lang)}</Label>
              <Textarea value={form.owner_signature} onChange={e => handleChange('owner_signature', e.target.value)} placeholder={L('التوقيع أو الموافقة...', 'واژۆ یان ڕەزامەندی...', lang)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{L('توقيع المستأجر', 'واژۆی کرێچی', lang)}</Label>
              <Textarea value={form.tenant_signature} onChange={e => handleChange('tenant_signature', e.target.value)} placeholder={L('التوقيع أو الموافقة...', 'واژۆ یان ڕەزامەندی...', lang)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">{L('توقيع الشركة', 'واژۆی کۆمپانیا', lang)}</Label>
              <Textarea value={form.company_signature} onChange={e => handleChange('company_signature', e.target.value)} placeholder={L('التوقيع أو الموافقة...', 'واژۆ یان ڕەزامەندی...', lang)} rows={2} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>{L('ملاحظات إضافية', 'تێبینی زیادە', lang)}</Label>
          <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder={L('ملاحظات...', 'تێبینی...', lang)} rows={3} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onCancel} className="px-6 h-11 border-slate-200 hover:bg-slate-50">{L('إلغاء', 'پاشگەزبوونەوە', lang)}</Button>
          <Button type="submit" disabled={isLoading} className="px-8 h-11 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {L('جاري الحفظ...', 'پاشەکەوتکردن...', lang)}
              </span>
            ) : contract ? L('تحديث العقد', 'نوێکردنەوەی گرێبەست', lang) : L('إنشاء العقد', 'دروستکردنی گرێبەست', lang)}
          </Button>
        </div>
      </form>
    </div>
  );
}