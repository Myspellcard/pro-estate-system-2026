import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, XCircle, Check, Building, Tags, FileText, Home, DollarSign, Building2, KeyRound, Coins, Combine, Key, Banknote, Building as BuildingIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useCurrencies } from '@/hooks/useCurrencies';

const TYPES = ["شقة", "بيت", "مخزن", "مكتب", "محل تجاري", "أرض", "فيلا"];

const BiLabel = ({ ar, ku }) => (
  <span className="flex gap-1 items-baseline">
    <span>{ar}</span>
    <span className="text-muted-foreground text-xs">/ {ku}</span>
  </span>
);

export default function PropertyForm({ property, onSubmit, onCancel, isLoading, categoryUsageType, selectedProject, hideHeader }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { currencies, defaultCurrency } = useCurrencies();

  const [step, setStep] = useState(property ? 4 : 1);
  const [form, setForm] = useState({
    name: property?.name || '',
    name_ku: property?.name_ku || '',
    type: property?.type || 'شقة',
    address: property?.address || selectedProject?.area || '',
    address_ku: property?.address_ku || selectedProject?.area_ku || '',
    city: property?.city || selectedProject?.city || '',
    city_ku: property?.city_ku || selectedProject?.city_ku || '',
    project_or_area: property?.project_or_area || selectedProject?.name || '',
    project_or_area_ku: property?.project_or_area_ku || selectedProject?.name_ku || '',
    project_id: property?.project_id || selectedProject?.id || null,
    category_id: property?.category_id || '',
    labels: property?.labels || [],
    area_sqm: property?.area_sqm || '',
    rooms: property?.rooms || '',
    bathrooms: property?.bathrooms || '',
    view: property?.view || '',
    view_ku: property?.view_ku || '',
    monthly_rent: property?.monthly_rent || '',
    rent_currency: property?.rent_currency || property?.sale_currency || defaultCurrency?.code || 'IQD',
    rent_currency_symbol: property?.rent_currency_symbol || property?.sale_currency_symbol || defaultCurrency?.symbol || 'د.ع',
    sale_price: property?.sale_price || '',
    sale_currency: property?.sale_currency || property?.rent_currency || defaultCurrency?.code || 'IQD',
    sale_currency_symbol: property?.sale_currency_symbol || property?.rent_currency_symbol || defaultCurrency?.symbol || 'د.ع',
    currency: property?.rent_currency || property?.sale_currency || defaultCurrency?.code || 'IQD',
    currency_symbol: property?.rent_currency_symbol || property?.sale_currency_symbol || defaultCurrency?.symbol || 'د.ع',
    usage_type: property?.usage_type || categoryUsageType || 'rent',
    purpose: property?.purpose || 'سكني',
    purpose_ku: property?.purpose_ku || 'نیشتەجێ',
    owner_name: property?.owner_name || '',
    owner_name_ku: property?.owner_name_ku || '',
    owner_phone: property?.owner_phone || '',
    owner_email: property?.owner_email || '',
    owner_nationality: property?.owner_nationality || '',
    owner_nationality_ku: property?.owner_nationality_ku || '',
    owner_address: property?.owner_address || '',
    owner_address_ku: property?.owner_address_ku || '',
    owner_proxy_name: property?.owner_proxy_name || '',
    owner_proxy_phone: property?.owner_proxy_phone || '',
    status: property?.status || 'متاح',
    description: property?.description || '',
    description_ku: property?.description_ku || '',
    notes: property?.notes || '',
    notes_ku: property?.notes_ku || '',
    owner_preferred_language: property?.owner_preferred_language || 'ar',
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => firebaseApi.entities.Project.list(),
  });

  const { data: allLabels = [] } = useQuery({
    queryKey: ['property-labels'],
    queryFn: () => firebaseApi.entities.PropertyLabel.filter({ is_active: true }),
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['project-categories'],
    queryFn: () => firebaseApi.entities.ProjectCategory.filter({ is_active: true }),
  });

  const { data: allPurposes = [] } = useQuery({
    queryKey: ['property-purposes'],
    queryFn: () => firebaseApi.entities.PropertyPurpose.filter({ is_active: true }),
  });
  const purposes = allPurposes.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  // Sync default currency into form once currencies load (if not already set by property)
  React.useEffect(() => {
    if (defaultCurrency && !property) {
      setForm(prev => ({
        ...prev,
        currency: prev.currency || defaultCurrency.code,
        currency_symbol: prev.currency_symbol || defaultCurrency.symbol,
        rent_currency: prev.rent_currency || defaultCurrency.code,
        rent_currency_symbol: prev.rent_currency_symbol || defaultCurrency.symbol,
        sale_currency: prev.sale_currency || defaultCurrency.code,
        sale_currency_symbol: prev.sale_currency_symbol || defaultCurrency.symbol,
      }));
    }
  }, [defaultCurrency]);

  // Auto-advance from step 3
  React.useEffect(() => {
    if (step === 3 && !property) {
      const timer = setTimeout(() => setStep(4), 800);
      return () => clearTimeout(timer);
    }
  }, [step, property]);

  const filteredCategories = form.project_id
    ? allCategories
        .filter(c => {
          if (c.project_id !== form.project_id) return false;
          return !c.usage_type || c.usage_type === form.usage_type;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'category_id' && !property && value) {
      const cat = allCategories.find(c => c.id === value);
      if (cat && cat.default_labels && cat.default_labels.length > 0) {
        setForm(prev => ({ ...prev, labels: [...new Set([...prev.labels, ...cat.default_labels])] }));
      }
    }
  };
  
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name || !form.name.trim()) {
      alert('يرجى إدخال رقم/اسم الملك (الحقل مطلوب)');
      setStep(4);
      return;
    }
    if (!form.address || !form.address.trim()) {
      alert('يرجى إدخال العنوان (الحقل مطلوب)');
      setStep(4);
      return;
    }
    const currency = form.currency || 'IQD';
    const currency_symbol = form.currency_symbol || 'د.ع';
    onSubmit({
      ...form,
      area_sqm: form.area_sqm ? Number(form.area_sqm) : undefined,
      rooms: form.rooms ? Number(form.rooms) : undefined,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : undefined,
      currency,
      currency_symbol,
      rent_currency: currency,
      rent_currency_symbol: currency_symbol,
      sale_price: form.sale_price ? Number(form.sale_price) : undefined,
      sale_currency: currency,
      sale_currency_symbol: currency_symbol,
      usage_type: form.usage_type || 'rent',
    });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  const steps = [
    { num: 1, title: L('نوع العقار', 'جۆری خانوو'), icon: Tags, desc: L('اختر نوع الاستخدام', 'جۆری بەکارهێنان هەڵبژێرە') },
    { num: 2, title: L('المشروع والتصنيف', 'پڕۆژە و پۆل'), icon: Building, desc: L('اختر المشروع والتصنيف', 'پڕۆژە و پۆل هەڵبژێرە') },
    { num: 3, title: L('تفاصيل العقار', 'وردەکارییەکان'), icon: FileText, desc: L('معلومات العقار', 'زانیارییەکانی خانوو') },
    { num: 4, title: L('المعلومات الأساسية', 'زانیارییە سەرەتاییەکان'), icon: FileText, desc: L('الاسم والعنوان', 'ناو و ناونیشان') },
    { num: 5, title: L('المميزات والسعر', 'تایبەتمەندییەکان و نرخ'), icon: Building, desc: L('المساحة والغرف', 'ئەندازە و ژوور') },
    { num: 6, title: L('الحالة والمالك', 'دۆخ و خاوەن'), icon: Check, desc: L('معلومات المالك', 'زانیارییەکانی خاوەن') },
    { num: 7, title: L('الوصف والملاحظات', 'وەسف و تێبینی'), icon: FileText, desc: L('الوصف النهائي', 'وەسفی کۆتایی') },
  ];

  return (
    <div className="relative bg-gradient-to-br from-white via-slate-50 to-white rounded-3xl shadow-2xl border border-slate-200/60 p-8 mb-6 backdrop-blur-sm">
      {!hideHeader && (
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">{property ? L('تعديل العقار', 'دەستکاریکردنی خانوو') : L('عقار جديد', 'خانوی نوێ')}</h2>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">{steps.find(s => s.num === step)?.title}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2.5 hover:bg-red-50 rounded-xl transition-all group"><X className="w-5 h-5 text-slate-400 group-hover:text-red-500" /></button>
        </div>
      )}

      {(!selectedProject) && (
        <div className="mb-8 sticky top-0 bg-white/95 backdrop-blur-sm z-10 pb-4 pt-2 -mx-8 px-8">
          {/* Modern Infographic Style Steps - Compact Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {steps.map((s, idx) => {
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              const colors = ['#3B82F6', '#F97316', '#EF4444', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B'];
              const color = colors[idx % colors.length];
              
              return (
                <motion.button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  whileHover={{ y: -4, scale: 1.05 }}
                  className={`relative transition-all duration-300 group cursor-pointer ${isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'}`}
                >
                  {/* Shadow Layer */}
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-300/30 to-gray-400/20 rounded-2xl blur-md transform translate-y-1.5 group-hover:translate-y-2 transition-transform" />
                  
                  {/* Card */}
                  <div className="relative bg-white rounded-2xl p-3 shadow-lg hover:shadow-xl transition-shadow">
                    {/* Colored Arc Top */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: color }} />
                    
                    {/* Step Circle */}
                    <div className="flex justify-center mb-2 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        isActive ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'
                      }`} style={{ backgroundColor: isActive ? color : '#F3F4F6', color: isActive ? 'white' : color }}>
                        {isCompleted ? <Check className="w-5 h-5" /> : s.num.toString().padStart(2, '0')}
                      </div>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xs font-bold text-center text-gray-800 mb-1 leading-tight">
                      {s.title.split(' ')[0]}
                    </h3>
                    
                    {/* Description - hidden on small screens */}
                    <p className="text-[10px] text-center text-gray-500 hidden lg:block line-clamp-2">
                      {s.desc}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <AnimatePresence mode="wait">
          {/* Step 1: Usage Type */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[{ value: 'rent', label: L('إيجار', 'کرێ'), icon: Key, color: 'blue', gradient: 'from-blue-500 to-blue-600' }, { value: 'sale', label: L('بيع', 'فرۆشتن'), icon: Banknote, color: 'green', gradient: 'from-green-500 to-green-600' }, { value: 'both', label: L('كلاهما', 'هەردووکیان'), icon: BuildingIcon, color: 'purple', gradient: 'from-purple-500 to-purple-600' }].map((option) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { handleChange('usage_type', option.value); handleChange('category_id', ''); }}
                    className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${
                      form.usage_type === option.value
                        ? `border-${option.color}-500 bg-gradient-to-br ${option.gradient} text-white shadow-xl`
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50'
                    }`}
                  >
                    <div className="mb-4 relative">
                      <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${
                        form.usage_type === option.value 
                          ? 'bg-white/20 backdrop-blur-sm' 
                          : `bg-gradient-to-br ${option.gradient}`
                      }`}>
                        {React.createElement(option.icon, { className: `w-12 h-12 ${form.usage_type === option.value ? 'text-white' : 'text-white'}` })}
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${form.usage_type === option.value ? 'text-white' : 'text-slate-700'}`}>{option.label}</div>
                    {form.usage_type === option.value && (
                      <div className="absolute top-4 right-4 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setStep(1)} className="px-8 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all flex items-center gap-2">
                  <span>{L('السابق', 'پێشوو')}</span>
                </button>
                <button type="button" onClick={() => setStep(2)} className="px-8 h-11 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                  <span>{L('التالي', 'دواتر')}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Project & Category */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-slate-700 mb-2 block"><Building className="w-4 h-4 inline mr-1" />{L('المشروع', 'پڕۆژە')}</Label>
                  <Select value={form.project_id || "none"} onValueChange={v => { if (v === 'none') { handleChange('project_id', ''); handleChange('project_or_area', ''); handleChange('project_or_area_ku', ''); handleChange('category_id', ''); return; } const proj = projects.find(p => p.id === v); if (proj) { handleChange('project_id', proj.id); handleChange('project_or_area', proj.name); handleChange('project_or_area_ku', proj.name_ku); handleChange('category_id', ''); } }}>
                   <SelectTrigger><SelectValue placeholder={L('اختر مشروعاً...', 'پڕۆژەیەک هەڵبژێرە...')} /></SelectTrigger>
                  <SelectContent className="z-[99999] max-h-52 overflow-y-auto">
                    <SelectItem value="none">{L('بدون مشروع', 'بێ پڕۆژە')}</SelectItem>
                    {projects.filter(p => !p.usage_type || p.usage_type === form.usage_type || p.usage_type === 'both').map(p => <SelectItem key={p.id} value={p.id}>{L(p.name, p.name_ku)}</SelectItem>)}
                  </SelectContent>
                  </Select>
                </div>
                {form.project_id && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Label className="text-sm font-semibold text-slate-700 mb-2 block"><Tags className="w-4 h-4 inline mr-1" />{L('التصنيف', 'پۆل')}</Label>
                    <Select value={form.category_id || "none"} onValueChange={v => { handleChange('category_id', v === 'none' ? '' : v); }}>
                      <SelectTrigger><SelectValue placeholder={L('اختر تصنيف...', 'پۆلێک هەڵبژێرە...')} /></SelectTrigger>
                      <SelectContent className="z-[99999] max-h-52 overflow-y-auto">
                        <SelectItem value="none">{L('بدون تصنيف', 'بێ پۆل')}</SelectItem>
                        {filteredCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              {L(c.name, c.name_ku)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </div>
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setStep(1)} className="px-8 h-11 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all flex items-center gap-2">
                  <span>{L('السابق', 'پێشوو')}</span>
                </button>
                <button type="button" onClick={() => setStep(3)} className="px-8 h-11 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                  <span>{L('التالي', 'دواتر')}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Transition */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="flex flex-col items-center justify-center py-20">
                <motion.button
                  type="button"
                  onClick={() => setStep(4)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 text-white shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center p-6 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 border-2 border-white/20 rounded-full"
                  />
                  <span className="text-center font-bold text-xl leading-tight relative z-10">{L('جاهز للمتابعة', 'ئامادەیە بۆ بەردەوامبوون')}</span>
                </motion.button>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 text-slate-500 font-medium"
                >
                  {L('اضغط للمتابعة', 'کرتە بۆ بەردەوامبوون')}
                </motion.p>
              </div>
            </motion.div>
          )}
          
          {/* Step 4: Basic Info */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lang === 'ku' ? (
                  <>
                    <div className="space-y-2"><Label>کۆدی مولک (کوردی) *</Label><Input value={form.name_ku} onChange={e => handleChange('name_ku', e.target.value)} /></div>
                    <div className="space-y-2"><Label>کۆدی مولک (عەرەبی)</Label><Input value={form.name} onChange={e => handleChange('name', e.target.value)} required /></div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2"><Label>رقم الملک (عربي) *</Label><Input value={form.name} onChange={e => handleChange('name', e.target.value)} required /></div>
                    <div className="space-y-2"><Label>کۆدی مولک (کوردی)</Label><Input value={form.name_ku} onChange={e => handleChange('name_ku', e.target.value)} /></div>
                  </>
                )}
                <div className="space-y-2"><Label><BiLabel ar="نوع العقار" ku="جۆری خانوو" /></Label><Select value={form.type} onValueChange={v => handleChange('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label><BiLabel ar="مەبەست / غرض" ku="مەبەست" /></Label><Select value={form.purpose || ''} onValueChange={v => { const match = purposes.find(p => p.name === v); if (match) { handleChange('purpose', match.name); handleChange('purpose_ku', match.name_ku || match.name); } }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{purposes.length > 0 ? purposes.map(p => <SelectItem key={p.id} value={p.name}><BiLabel ar={p.name} ku={p.name_ku || p.name} /></SelectItem>) : <SelectItem value={form.purpose || 'سكني'}><BiLabel ar={form.purpose || 'سكني'} ku={form.purpose_ku || 'نیشتەجێ'} /></SelectItem>}</SelectContent></Select></div>
                {lang === 'ku' ? (
                  <>
                    <div className="space-y-2"><Label>ناونیشان (کوردی) *</Label><Input value={form.address_ku} onChange={e => handleChange('address_ku', e.target.value)} /></div>
                    <div className="space-y-2"><Label>ناونیشان (عەرەبی)</Label><Input value={form.address} onChange={e => handleChange('address', e.target.value)} required /></div>
                    <div className="space-y-2"><Label>شار (کوردی)</Label><Input value={form.city_ku} onChange={e => handleChange('city_ku', e.target.value)} /></div>
                    <div className="space-y-2"><Label>شار (عەرەبی)</Label><Input value={form.city} onChange={e => handleChange('city', e.target.value)} /></div>
                    <div className="space-y-2"><Label>ناوی پڕۆژە یان ناوچە (کوردی)</Label><Input value={form.project_or_area_ku} onChange={e => handleChange('project_or_area_ku', e.target.value)} /></div>
                    <div className="space-y-2"><Label>ناوی پڕۆژە یان ناوچە (عەرەبی)</Label><Input value={form.project_or_area} onChange={e => handleChange('project_or_area', e.target.value)} /></div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2"><Label>العنوان (عربي) *</Label><Input value={form.address} onChange={e => handleChange('address', e.target.value)} required /></div>
                    <div className="space-y-2"><Label>ناونیشان (کوردی)</Label><Input value={form.address_ku} onChange={e => handleChange('address_ku', e.target.value)} /></div>
                    <div className="space-y-2"><Label>المدينة (عربي)</Label><Input value={form.city} onChange={e => handleChange('city', e.target.value)} /></div>
                    <div className="space-y-2"><Label>شار (کوردی)</Label><Input value={form.city_ku} onChange={e => handleChange('city_ku', e.target.value)} /></div>
                    <div className="space-y-2"><Label>اسم المشروع أو المنطقة (عربي)</Label><Input value={form.project_or_area} onChange={e => handleChange('project_or_area', e.target.value)} /></div>
                    <div className="space-y-2"><Label>ناوی پڕۆژە یان ناوچە (کوردی)</Label><Input value={form.project_or_area_ku} onChange={e => handleChange('project_or_area_ku', e.target.value)} /></div>
                  </>
                )}
              </div>
              <div className="flex justify-between mt-6"><button type="button" onClick={() => selectedProject ? onCancel() : setStep(3)} className="px-6 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition-all">{selectedProject ? L('إلغاء', 'پاشگەزبوونەوە') : L('السابق', 'پێشوو')}</button><button type="button" onClick={() => setStep(5)} className="px-6 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition-all">{L('التالي', 'دواتر')}</button></div>
            </motion.div>
          )}

          {/* Step 5: Features & Pricing */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label>{L('التسميات', 'برچەسبەکان')}</Label><div className="flex flex-wrap gap-2 mb-2">{form.labels.map(l => <Badge key={l} variant="secondary" className="cursor-pointer hover:bg-red-100" onClick={() => handleChange('labels', form.labels.filter(id => id !== l))}>{allLabels.find(al=>al.id===l)?.name}<XCircle className="w-3 h-3 ml-1" /></Badge>)}</div><Select onValueChange={v => { if (!form.labels.includes(v)) handleChange('labels', [...form.labels, v]); }}><SelectTrigger><SelectValue placeholder={L('أضف تسمية...', 'برچەسبێک زیادکرد...')} /></SelectTrigger><SelectContent>{allLabels.filter(l => !form.labels.includes(l.id)).map(l => <SelectItem key={l.id} value={l.id}>{L(l.name, l.name_ku)}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label><BiLabel ar="المساحة (م²)" ku="ئەندازە (م²)" /></Label><Input type="number" value={form.area_sqm} onChange={e => handleChange('area_sqm', e.target.value)} /></div>
                <div className="space-y-2"><Label><BiLabel ar="عدد الغرف" ku="ژمارەی ژووران" /></Label><Input type="number" value={form.rooms} onChange={e => handleChange('rooms', e.target.value)} /></div>
                <div className="space-y-2"><Label><BiLabel ar="عدد الحمامات" ku="ژمارەی ئەودەستخانەکان" /></Label><Input type="number" value={form.bathrooms} onChange={e => handleChange('bathrooms', e.target.value)} /></div>
                {lang === 'ku' ? (
                  <>
                    <div className="space-y-2"><Label>ئاراستەی خانوو (کوردی)</Label><Input value={form.view_ku} onChange={e => handleChange('view_ku', e.target.value)} placeholder="وەک: باکوور، باشوور، ڕۆژهەڵات..." /></div>
                    <div className="space-y-2"><Label>اتجاه/منظر (عربي)</Label><Input value={form.view} onChange={e => handleChange('view', e.target.value)} placeholder="مثل: شمال، جنوب، شرق..." /></div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2"><Label>اتجاه/منظر العقار (عربي)</Label><Input value={form.view} onChange={e => handleChange('view', e.target.value)} placeholder="مثل: شمال، جنوب، شرق، غرب..." /></div>
                    <div className="space-y-2"><Label>ئاراستەی خانوو (کوردی)</Label><Input value={form.view_ku} onChange={e => handleChange('view_ku', e.target.value)} placeholder="وەک: باکوور، باشوور..." /></div>
                  </>
                )}
                {/* Single unified currency selector */}
                <div className="space-y-2 md:col-span-2">
                  <Label><BiLabel ar="عملة العقار" ku="دراوی خانوو" /></Label>
                  <Select value={form.currency || 'IQD'} onValueChange={v => {
                    const cur = currencies.find(c => c.code === v);
                    const sym = cur?.symbol || v;
                    handleChange('currency', v);
                    handleChange('currency_symbol', sym);
                    handleChange('rent_currency', v);
                    handleChange('rent_currency_symbol', sym);
                    handleChange('sale_currency', v);
                    handleChange('sale_currency_symbol', sym);
                  }}>
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder={L('اختر العملة...', 'دراو هەڵبژێرە...')} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[99999]">
                      {currencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-primary">{c.symbol}</span>
                            <span>{c.name || c.code}</span>
                            <span className="text-muted-foreground text-xs">({c.code})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(form.usage_type === 'rent' || form.usage_type === 'both') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label><BiLabel ar="الإيجار الشهري" ku="کرێی مانگانە" /></Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground pointer-events-none">{form.currency_symbol}</span>
                      <Input type="number" value={form.monthly_rent} onChange={e => handleChange('monthly_rent', e.target.value)} className="pr-12" />
                    </div>
                  </div>
                )}
                {(form.usage_type === 'sale' || form.usage_type === 'both') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label><BiLabel ar="سعر البيع" ku="نرخی فرۆشتن" /></Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground pointer-events-none">{form.currency_symbol}</span>
                      <Input type="number" value={form.sale_price} onChange={e => handleChange('sale_price', e.target.value)} className="pr-12" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-6"><button type="button" onClick={() => setStep(4)} className="px-6 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition-all">{L('السابق', 'پێشوو')}</button><button type="button" onClick={() => setStep(6)} className="px-6 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition-all">{L('التالي', 'دواتر')}</button></div>
            </motion.div>
          )}

          {/* Step 6: Status & Owner */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label><BiLabel ar="الحالة" ku="دۆخ" /></Label><Select value={form.status} onValueChange={v => handleChange('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['متاح', 'مؤجر', 'صيانة', 'حجز مؤقت', 'قريباً', 'حجز', 'تأمين', 'دفع', 'انذار الأخير'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>{L('اسم المالك (عربي)', 'ناوی خاوەن خانوو (عەرەبی)')}</Label><Input value={form.owner_name} onChange={e => handleChange('owner_name', e.target.value)} /></div>
                <div className="space-y-2"><Label>{L('ناوی خاوەن خانوو (کوردی)', 'ناوی خاوەن خانوو (کوردی)')}</Label><Input value={form.owner_name_ku} onChange={e => handleChange('owner_name_ku', e.target.value)} /></div>
                <div className="space-y-2"><Label><BiLabel ar="رقم هاتف المالك" ku="ژمارەی مۆبایلی خاوەن" /></Label><Input value={form.owner_phone} onChange={e => handleChange('owner_phone', e.target.value)} /></div>
                <div className="space-y-2"><Label><BiLabel ar="بريد المالك" ku="ئیمەیلی خاوەن" /></Label><Input type="email" value={form.owner_email} onChange={e => handleChange('owner_email', e.target.value)} /></div>
                <div className="space-y-2"><Label>{L('جنسية المالك (عربي)', 'نەتەوەی خاوەن (عەرەبی)')}</Label><Input value={form.owner_nationality} onChange={e => handleChange('owner_nationality', e.target.value)} /></div>
                <div className="space-y-2"><Label>{L('نەتەوەی خاوەن (کوردی)', 'نەتەوەی خاوەن (کوردی)')}</Label><Input value={form.owner_nationality_ku} onChange={e => handleChange('owner_nationality_ku', e.target.value)} /></div>
                <div className="space-y-2"><Label>{L('ناونیشانی خاوەن (عەرەبی)', 'ناونیشانی خاوەن (عەرەبی)')}</Label><Input value={form.owner_address} onChange={e => handleChange('owner_address', e.target.value)} /></div>
                <div className="space-y-2"><Label>{L('ناونیشانی خاوەن (کوردی)', 'ناونیشانی خاوەن (کوردی)')}</Label><Input value={form.owner_address_ku} onChange={e => handleChange('owner_address_ku', e.target.value)} /></div>
                {/* Proxy / Authorized Person */}
                <div className="md:col-span-2 border-t border-dashed border-slate-200 pt-4 mt-2">
                  <p className="text-sm font-bold text-amber-700 mb-3">🤝 {L('المخوّل (الوكيل) عن المالك — اختياري', 'مخول (وەکیل)ی خاوەن — ئارەزوومەندانە')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label><BiLabel ar="اسم المخوّل" ku="ناوی مخوول" /></Label><Input value={form.owner_proxy_name} onChange={e => handleChange('owner_proxy_name', e.target.value)} placeholder={L('اسم الشخص المخوّل...', 'ناوی كەسی مخوول...')} /></div>
                    <div className="space-y-2"><Label><BiLabel ar="رقم هاتف المخوّل" ku="ژمارەی مۆبایلی مخوول" /></Label><Input value={form.owner_proxy_phone} onChange={e => handleChange('owner_proxy_phone', e.target.value)} placeholder="07xxxxxxxxx" /></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6"><button type="button" onClick={() => setStep(5)} className="px-6 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition-all">{L('السابق', 'پێشوو')}</button><button type="button" onClick={() => setStep(7)} className="px-6 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition-all">{L('التالي', 'دواتر')}</button></div>
            </motion.div>
          )}

          {/* Step 7: Description & Notes */}
          {step === 7 && (
            <motion.div key="step7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2"><Label>{L('وصف (عربي)', 'وەسف (عەرەبی)')}</Label><Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={3} /></div>
                <div className="space-y-2 md:col-span-2"><Label>{L('وەسف (کوردی)', 'وەسف (کوردی)')}</Label><Textarea value={form.description_ku} onChange={e => handleChange('description_ku', e.target.value)} rows={3} /></div>
                <div className="space-y-2 md:col-span-2"><Label>{L('ملاحظات', 'تێبینی')}</Label><Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} /></div>
                <div className="space-y-2 md:col-span-2"><Label>{L('تێبینی (کوردی)', 'تێبینی (کوردی)')}</Label><Textarea value={form.notes_ku} onChange={e => handleChange('notes_ku', e.target.value)} rows={2} /></div>
                <div className="space-y-2 md:col-span-2"><Label>{L('اللغة المفضلة للمالك', 'زمانی هەڵبژێردراوی خاوەن')}</Label><Select value={form.owner_preferred_language} onValueChange={v => handleChange('owner_preferred_language', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ar">🇸🇦 العربية</SelectItem><SelectItem value="ku">🇮📐 کوردی</SelectItem><SelectItem value="en">🇬🇧 English</SelectItem><SelectItem value="tr">🇹🇷 Türkçe</SelectItem></SelectContent></Select></div>
                <div className="md:col-span-2 flex gap-3 justify-between mt-6">
                  <button type="button" onClick={() => setStep(6)} className="px-6 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition-all">{L('السابق', 'پێشوو')}</button>
                  <button type="button" onClick={() => handleSubmit()} disabled={isLoading} className="px-8 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg transition-all">{isLoading ? '...' : (property ? L('حفظ التغييرات', 'پاشەکەوتکردنی گۆڕانکارییەکان') : L('حفظ', 'پاشەکەوتکردن'))}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}