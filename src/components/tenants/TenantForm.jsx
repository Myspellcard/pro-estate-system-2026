import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TenantForm({ tenant, onSubmit, onCancel, isLoading }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [form, setForm] = useState({
    full_name: tenant?.full_name || '',
    full_name_ku: tenant?.full_name_ku || '',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
    id_number: tenant?.id_number || '',
    nationality: tenant?.nationality || '',
    nationality_ku: tenant?.nationality_ku || '',
    address: tenant?.address || '',
    address_ku: tenant?.address_ku || '',
    family_members: tenant?.family_members || '',
    notes: tenant?.notes || '',
    notes_ku: tenant?.notes_ku || '',
    family_members: tenant?.family_members || '',
    preferred_language: tenant?.preferred_language || 'ar',
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      family_members: form.family_members === '' ? null : Number(form.family_members),
    });
  };

  return (
    <div className="relative bg-gradient-to-br from-white via-slate-50/50 to-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 mb-8 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
      
      <div className="relative flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">{tenant ? L('تعديل المستأجر', 'دەستکاریکردنی کرێچی') : L('إضافة مستأجر جديد', 'زیادکردنی کرێچییەکی نوێ')}</h2>
          <p className="text-sm text-slate-500 mt-1">{tenant ? L('قم بتحديث معلومات المستأجر', 'زانیارییەکانی کرێچی نوێ بکەرەوە') : L('أضف بيانات المستأجر الجديد', 'زانیارییەکانی کرێچی نوێ زیاد بکە')}</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
      </div>
      
      <form onSubmit={handleSubmit} className="relative grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Full Name */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative space-y-2">
            <Label className="text-sm font-semibold text-slate-700">{L('الاسم الكامل (عربي)', 'ناوی تەواو (عەرەبی)', lang)} *</Label>
            <Input value={form.full_name} onChange={e => handleChange('full_name', e.target.value)} required placeholder={L('الاسم الكامل', 'ناوی تەواو', lang)} className="h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 transition-all" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>{L('ناوی تەواو (کوردی)', 'ناوی تەواو (کوردی)', lang)}</Label>
          <Input value={form.full_name_ku} onChange={e => handleChange('full_name_ku', e.target.value)} placeholder={L('ناوی تەواو', 'ناوی تەواو', lang)} />
        </div>

        {/* Phone & Email */}
        <div className="space-y-2">
          <Label>{L('رقم الهاتف', 'ژمارەی مۆبایل', lang)} *</Label>
          <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} required placeholder="07XXXXXXXXX" />
        </div>
        <div className="space-y-2">
          <Label>{L('البريد الإلكتروني', 'ئیمەیل', lang)}</Label>
          <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="email@example.com" />
        </div>

        {/* ID */}
        <div className="space-y-2">
          <Label>{L('رقم الهوية', 'ژمارەی ناسنامە', lang)}</Label>
          <Input value={form.id_number} onChange={e => handleChange('id_number', e.target.value)} placeholder={L('رقم الهوية', 'ژمارەی ناسنامە', lang)} />
        </div>

        {/* Family Members */}
        <div className="space-y-2">
          <Label>{L('عدد أفراد العائلة', 'ژمارەی ئەندامانی خێزان', lang)}</Label>
          <Input type="number" value={form.family_members} onChange={e => handleChange('family_members', e.target.value)} placeholder={L('مثال: 4', 'نموونە: 4', lang)} />
        </div>

        {/* Nationality - Arabic & Kurdish side by side */}
        <div className="space-y-2">
          <Label>{L('الجنسية (عربي)', 'نەتەوە (عەرەبی)', lang)}</Label>
          <Input value={form.nationality} onChange={e => handleChange('nationality', e.target.value)} placeholder={L('مثال: عراقي', 'نموونە: عێراقی', lang)} />
        </div>
        <div className="space-y-2">
          <Label>{L('نەتەوە (کوردی)', 'نەتەوە (کوردی)', lang)}</Label>
          <Input value={form.nationality_ku} onChange={e => handleChange('nationality_ku', e.target.value)} placeholder="نموونە: عێراقی" />
        </div>

        {/* Address - Arabic & Kurdish side by side */}
        <div className="space-y-2">
          <Label>{L('ناونیشان (عەرەبی)', 'ناونیشان (عەرەبی)', lang)}</Label>
          <Input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder={L('العنوان الحالي', 'ناونیشانی ئێستا', lang)} />
        </div>
        <div className="space-y-2">
          <Label>{L('ناونیشان (کوردی)', 'ناونیشان (کوردی)', lang)}</Label>
          <Input value={form.address_ku} onChange={e => handleChange('address_ku', e.target.value)} placeholder="ناونیشانی ئێستا" />
        </div>

        {/* Family Members */}
        <div className="space-y-2 md:col-span-2">
          <Label>{L('عدد أفراد العائلة', 'ژمارەی ئەندامانی خێزان', lang)}</Label>
          <Input type="number" value={form.family_members} onChange={e => handleChange('family_members', e.target.value)} placeholder={L('مثال: 4', 'نموونە: 4', lang)} />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>{L('ملاحظات (عربي)', 'تێبینی (عەرەبی)', lang)}</Label>
          <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder={L('ملاحظات إضافية...', 'تێبینیی زیادە...', lang)} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>{L('تێبینی (کوردی)', 'تێبینی (کوردی)', lang)}</Label>
          <Textarea value={form.notes_ku} onChange={e => handleChange('notes_ku', e.target.value)} placeholder={L('تێبینیی زیادە...', 'تێبینیی زیادە...', lang)} rows={2} />
        </div>

        {/* Preferred Language */}
        <div className="space-y-2 md:col-span-2">
          <Label>{L('اللغة المفضلة للتواصل', 'زمانی هەڵبژێردراو بۆ پەیوەندی')}</Label>
          <Select value={form.preferred_language} onValueChange={v => handleChange('preferred_language', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="ku">کوردی</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="tr">Türkçe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onCancel} className="px-6 h-11 border-slate-200 hover:bg-slate-50">{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
          <Button type="submit" disabled={isLoading} className="px-8 h-11 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {L('جاري الحفظ...', 'پاشەکەوتکردن...')}
              </span>
            ) : tenant ? L('تحديث', 'نوێکردنەوە') : L('إضافة', 'زیادکردن')}
          </Button>
        </div>
      </form>
    </div>
  );
}