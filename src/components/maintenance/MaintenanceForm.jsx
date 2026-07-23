import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const L = (ar, ku, lang) => lang === 'ku' ? ku : ar;

const getCategories = (lang) => [
  L('كهرباء', 'کارەبا', lang),
  L('سباكة', 'بۆری', lang),
  L('تكييف', 'کەشھەوا', lang),
  L('طلاء', 'بۆیە', lang),
  L('أبواب', 'دەرگاکان', lang),
  L('نوافذ', 'پەنجەرەکان', lang),
  L('أرضيات', 'نەرمەکاڵ', lang),
  L('أخرى', 'هی تر', lang),
];

const getPriorities = (lang) => [
  L('عالي', 'بەرز', lang),
  L('متوسط', 'ناوەڕاست', lang),
  L('منخفض', 'نزم', lang),
];

const getStatuses = (lang) => [
  L('معلق', 'راگیراو', lang),
  L('قيد التنفيذ', 'لە ژێر جێبەجێکردندا', lang),
  L('مكتمل', 'تەواوبوو', lang),
  L('ملغي', 'هەڵوەشێنراوە', lang),
];

export default function MaintenanceForm({ maintenance, properties, onSubmit, onCancel, isLoading }) {
  const { lang } = useLanguage();
  const categories = getCategories(lang);
  const priorities = getPriorities(lang);
  const statuses = getStatuses(lang);
  
  const [form, setForm] = useState({
    property_id: maintenance?.property_id || '',
    title: maintenance?.title || '',
    description: maintenance?.description || '',
    category: maintenance?.category || L('أخرى', 'هی تر', lang),
    priority: maintenance?.priority || L('متوسط', 'ناوەڕاست', lang),
    status: maintenance?.status || L('معلق', 'راگیراو', lang),
    cost: maintenance?.cost || '',
    request_date: maintenance?.request_date || new Date().toISOString().split('T')[0],
    completion_date: maintenance?.completion_date || '',
    notes: maintenance?.notes || '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedProperty = properties.find(p => p.id === form.property_id);
    onSubmit({
      ...form,
      property_name: selectedProperty?.name || '',
      cost: Number(form.cost) || 0,
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">{maintenance ? L('تعديل الصيانة', 'دەستکاریکردنی چاککردنەوە', lang) : L('طلب صيانة جديد', 'داواکاری چاککردنەوەی نوێ', lang)}</h2>
        <button onClick={onCancel}><X className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{L('العقار *', 'خانوو *', lang)}</Label>
            <Select value={form.property_id} onValueChange={v => handleChange('property_id', v)}>
              <SelectTrigger><SelectValue placeholder={L('اختر العقار', 'خانوی هەڵبژێرە', lang)} /></SelectTrigger>
              <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{lang === 'ku' ? (p.name_ku || p.name) : p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{L('العنوان *', 'سەردێڕ *', lang)}</Label>
            <Input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder={L('عنوان الطلب', 'سەردێڕی داواکاری', lang)} required />
          </div>
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{L('الفئة *', 'جۆر *', lang)}</Label>
            <Select value={form.category} onValueChange={v => handleChange('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c, idx) => {
                const valueMap = ['كهرباء', 'سباكة', 'تكييف', 'طلاء', 'أبواب', 'نوافذ', 'أرضيات', 'أخرى'];
                return <SelectItem key={valueMap[idx]} value={valueMap[idx]}>{c}</SelectItem>;
              })}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{L('الأولوية', 'ئەولەویەت', lang)}</Label>
            <Select value={form.priority} onValueChange={v => handleChange('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{priorities.map((p, idx) => {
                const valueMap = ['عالي', 'متوسط', 'منخفض'];
                return <SelectItem key={valueMap[idx]} value={valueMap[idx]}>{p}</SelectItem>;
              })}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{L('الحالة', 'دۆخ', lang)}</Label>
            <Select value={form.status} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((s, idx) => {
                const valueMap = ['معلق', 'قيد التنفيذ', 'مكتمل', 'ملغي'];
                return <SelectItem key={valueMap[idx]} value={valueMap[idx]}>{s}</SelectItem>;
              })}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Dates & Cost */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{L('تاريخ الطلب', 'بەرواری داواکاری', lang)}</Label>
            <Input type="date" value={form.request_date} onChange={e => handleChange('request_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{L('تاريخ الإكمال', 'بەرواری تەواوبوون', lang)}</Label>
            <Input type="date" value={form.completion_date} onChange={e => handleChange('completion_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{L('التكلفة', 'تێچوو', lang)}</Label>
            <Input type="number" value={form.cost} onChange={e => handleChange('cost', e.target.value)} placeholder="0" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{L('الوصف', 'وەسف', lang)}</Label>
          <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder={L('وصف المشكلة والحل المطلوب...', 'وەسفەکەی کێشەکە و چارەسەرەکە...', lang)} rows={4} />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>{L('ملاحظات', 'تێبینی', lang)}</Label>
          <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder={L('ملاحظات إضافية...', 'تێبینیی زیادە...', lang)} rows={2} />
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>{L('إلغاء', 'پاشگەزبوونەوە', lang)}</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? L('جاري الحفظ...', 'پاشەکەوتکردن...', lang) : maintenance ? L('تحديث', 'نوێکردنەوە', lang) : L('إنشاء', 'دروستکردن', lang)}</Button>
        </div>
      </form>
    </div>
  );
}