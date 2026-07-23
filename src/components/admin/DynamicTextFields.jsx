import React, { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/context/LanguageContext';

export default function DynamicTextFields({ settings = {}, onChange, lang = 'ar' }) {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [customFields, setCustomFields] = useState(() => settings?.custom_text_fields || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newField, setNewField] = useState({ key: '', label_ar: '', label_ku: '', value_ar: '', value_ku: '', multiline: false });

  const handleAddField = () => {
    if (!newField.key || !newField.label_ar) return;
    const field = { id: Date.now().toString(), ...newField };
    const updated = [...customFields, field];
    setCustomFields(updated);
    onChange({ ...settings, custom_text_fields: updated });
    setIsAdding(false);
    setNewField({ key: '', label_ar: '', label_ku: '', value_ar: '', value_ku: '', multiline: false });
  };

  const handleDeleteField = (id) => {
    const updated = customFields.filter(f => f.id !== id);
    setCustomFields(updated);
    onChange({ ...settings, custom_text_fields: updated });
  };

  const handleUpdateValue = (id, fieldKey, value) => {
    const updated = customFields.map(f => f.id === id ? { ...f, [fieldKey]: value } : f);
    setCustomFields(updated);
    onChange({ ...settings, custom_text_fields: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#1a2744]">{L('الحقول النصية المخصصة', 'خانە دەقییە تایبەتەکان')}</h4>
        <Button onClick={() => setIsAdding(true)} size="sm" className="gap-1 bg-[#1a2744] hover:bg-[#2a3f6e]">
          <Plus className="w-4 h-4" />
          {L('إضافة حقل', 'زیادکردنی خانە')}
        </Button>
      </div>

      {isAdding && (
        <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-xl p-4 border-2 border-[#e8b748]/40 space-y-3">
          <Input placeholder={L('مفتاح الحقل (إنجليزي)', 'کلیلی خانە (ئینگلیزی)')} value={newField.key} onChange={e => setNewField({ ...newField, key: e.target.value })} />
          <Input placeholder={L('التسمية (عربي)', 'ناونیشان (عەرەبی)')} value={newField.label_ar} onChange={e => setNewField({ ...newField, label_ar: e.target.value })} />
          <Input placeholder={L('التسمية (كردي)', 'ناونیشان (کوردی)')} value={newField.label_ku} onChange={e => setNewField({ ...newField, label_ku: e.target.value })} />
          <Textarea placeholder={L('القيمة الافتراضية (عربي)', 'بەهای بنەڕەتی (عەرەبی)')} value={newField.value_ar} onChange={e => setNewField({ ...newField, value_ar: e.target.value })} rows={2} />
          <Textarea placeholder={L('القيمة الافتراضية (كردي)', 'بەهای بنەڕەتی (کوردی)')} value={newField.value_ku} onChange={e => setNewField({ ...newField, value_ku: e.target.value })} rows={2} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={newField.multiline} onChange={e => setNewField({ ...newField, multiline: e.target.checked })} />
            {L('حقل متعدد الأسطر', 'خانەی چەند هێڵێک')}
          </label>
          <div className="flex gap-2">
            <Button onClick={handleAddField} size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{L('حفظ', 'پاشەکەوت')}</Button>
            <Button onClick={() => setIsAdding(false)} variant="outline" size="sm" className="flex-1">{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
          </div>
        </div>
      )}

      {customFields.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{L('لا توجد حقول مخصصة. أضف حقلاً جديداً!', 'هیچ خانەیەکی تایبەت نییە. خانەیەکی نوێ زیاد بکە!')}</p>
      ) : (
        <div className="space-y-3">
          {customFields.map(field => (
            <div key={field.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:border-[#e8b748]/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-[#1a2744]">{field.key}</p>
                  <p className="text-xs text-gray-500">{L(field.label_ar, field.label_ku)}</p>
                </div>
                <Button onClick={() => handleDeleteField(field.id)} variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {field.multiline ? (
                  <>
                    <Textarea value={field.value_ar || ''} onChange={e => handleUpdateValue(field.id, 'value_ar', e.target.value)} placeholder={L('النص (عربي)', 'دەق (عەرەبی)')} rows={2} className="text-sm" />
                    <Textarea value={field.value_ku || ''} onChange={e => handleUpdateValue(field.id, 'value_ku', e.target.value)} placeholder={L('النص (كردي)', 'دەق (کوردی)')} rows={2} className="text-sm" />
                  </>
                ) : (
                  <>
                    <Input value={field.value_ar || ''} onChange={e => handleUpdateValue(field.id, 'value_ar', e.target.value)} placeholder={L('النص (عربي)', 'دەق (عەرەبی)')} className="text-sm" />
                    <Input value={field.value_ku || ''} onChange={e => handleUpdateValue(field.id, 'value_ku', e.target.value)} placeholder={L('النص (كردي)', 'دەق (کوردی)')} className="text-sm" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}