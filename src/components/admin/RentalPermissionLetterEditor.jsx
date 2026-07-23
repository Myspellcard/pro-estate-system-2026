import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

function AttachmentsItemsEditor({ items, onChange, lang, settingsLoadKey }) {
  const [localItems, setLocalItems] = useState(items || ['']);

  useEffect(() => {
    if (items !== localItems) {
      setLocalItems(items || ['']);
    }
  }, [items]);

  const addItem = () => {
    const updated = [...localItems, ''];
    setLocalItems(updated);
    onChange(updated);
  };

  const updateItem = (index, value) => {
    const updated = [...localItems];
    updated[index] = value;
    setLocalItems(updated);
    onChange(updated);
  };

  const deleteItem = (index) => {
    const updated = localItems.filter((_, i) => i !== index);
    setLocalItems(updated.length > 0 ? updated : ['']);
    onChange(updated.length > 0 ? updated : []);
  };

  return (
    <div className="space-y-2">
      {localItems.map((item, idx) => (
        <div key={`${idx}_${settingsLoadKey}`} className="flex gap-2">
          <input
            type="text"
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder={lang === 'ku' ? 'نموونە: - دۆسیەکان' : 'مثال: - الدوسيات'}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20"
            dir="rtl"
          />
          <button
            onClick={() => deleteItem(idx)}
            className="p-2 rounded-lg hover:bg-red-100 text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <Button onClick={addItem} size="sm" variant="outline" className="gap-1">
        <Plus className="w-4 h-4" />
        {lang === 'ku' ? 'زیادکردنی دانە' : 'إضافة عنصر'}
      </Button>
    </div>
  );
}

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 mb-1.5">
    <span className="text-sm text-gray-700">{label}</span>
    <div
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${checked ? 'bg-[#1a2744]' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </label>
);

// Uncontrolled text field — initialized from props on mount only, flushes to parent on blur
function TextField({ initialValue, onBlur, placeholder, multiline = false, rows = 2 }) {
  const [local, setLocal] = useState(initialValue || '');

  const cls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20 resize-y bg-white";
  return multiline
    ? <textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onBlur(local)} placeholder={placeholder} rows={rows} className={cls} dir="rtl" />
    : <input type="text" value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onBlur(local)} placeholder={placeholder} className={cls} dir="rtl" />;
}

export default function RentalPermissionLetterEditor({ settings = {}, onChange, lang = 'ar' }) {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const get = (key, def = true) => settings[key] !== undefined ? settings[key] : def;
  const set = (key, val) => onChange({ ...settings, [key]: val });

  // Use the settings record id as the key — when it arrives from DB, all fields re-mount with saved values
  const settingsLoadKey = settings.id || 'unloaded';

  // Local paragraphs state — source of truth while editing
  const [paragraphs, setParagraphs] = useState(() => settings.letter_paragraphs || []);
  const settingsParagraphsRef = useRef(settings.letter_paragraphs);

  // Sync from outside only if paragraphs changed from a save/load (not from our own updates)
  useEffect(() => {
    const incoming = settings.letter_paragraphs;
    if (incoming !== settingsParagraphsRef.current) {
      settingsParagraphsRef.current = incoming;
      setParagraphs(incoming || []);
    }
  }, [settings.letter_paragraphs]);

  const flushParagraphs = (updated) => {
    settingsParagraphsRef.current = updated;
    onChange({ ...settings, letter_paragraphs: updated });
  };

  const addParagraph = () => {
    const updated = [...paragraphs, { id: `p_${Date.now()}`, text_ar: '', text_ku: '' }];
    setParagraphs(updated);
    flushParagraphs(updated);
  };

  const updateParagraphField = (id, field, value) => {
    const updated = paragraphs.map(p => p.id === id ? { ...p, [field]: value } : p);
    setParagraphs(updated);
    flushParagraphs(updated);
  };

  const deleteParagraph = (id) => {
    const updated = paragraphs.filter(p => p.id !== id);
    setParagraphs(updated);
    flushParagraphs(updated);
  };

  const moveParagraph = (index, dir) => {
    const updated = [...paragraphs];
    const target = index + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setParagraphs(updated);
    flushParagraphs(updated);
  };

  return (
    <div className="space-y-5" dir="rtl">

      {/* Visibility Toggles */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1a2744]"></span>
          {L('عناصر الرأس', 'ئەلەمەنتەکانی سەرەوە')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {[
            { key: 'show_logo', ar: 'شعار الشركة', ku: 'لۆگۆی کۆمپانیا' },
            { key: 'show_company_name', ar: 'اسم الشركة', ku: 'ناوی کۆمپانیا' },
            { key: 'show_contract_number', ar: 'رقم العقد', ku: 'ژمارەی گرێبەست' },
            { key: 'show_date', ar: 'التاريخ', ku: 'بەروار' },
            { key: 'show_signatures', ar: 'التوقيعات', ku: 'واژۆکان' },
            { key: 'show_footer', ar: 'التذييل', ku: 'تەیل' },
          ].map(({ key, ar, ku }) => (
            <Toggle key={key} label={L(ar, ku)} checked={get(key)} onChange={v => set(key, v)} />
          ))}
        </div>
      </div>

      {/* Header / Footer Texts */}
      <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-2xl p-5 border-2 border-[#e8b748]/40">
        <h4 className="text-sm font-black text-[#1a2744] mb-4">
          ✏️ {L('نصوص الرأس والتذييل', 'دەقی سەرەوە و خوارەوە')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'doc_title_ar', label: L('عنوان الوثيقة (عربي)', 'ناونیشانی بەڵگە (عەرەبی)') },
            { key: 'doc_title_ku', label: L('عنوان الوثيقة (كردي)', 'ناونیشانی بەڵگە (کوردی)') },
            { key: 'to_label_ar', label: L('إلى / المستلم (عربي)', 'بۆ / وەرگر (عەرەبی)') },
            { key: 'to_label_ku', label: L('إلى / المستلم (كردي)', 'بۆ / وەرگر (کوردی)') },
            { key: 'subject_ar', label: L('الموضوع (عربي)', 'بابەت (عەرەبی)') },
            { key: 'subject_ku', label: L('الموضوع (كردي)', 'بابەت (کوردی)') },
            { key: 'greeting_ar', label: L('التحية (عربي)', 'سڵاو (عەرەبی)') },
            { key: 'greeting_ku', label: L('التحية (كردي)', 'سڵاو (کوردی)') },
            { key: 'attachments_label_ar', label: L('المرفقات (عربي)', 'لکاوەکان (عەرەبی)') },
            { key: 'attachments_label_ku', label: L('المرفقات (كردي)', 'لکاوەکان (کوردی)') },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-[#1a2744] mb-1">{label}</label>
              <TextField
                key={`${key}_${settingsLoadKey}`}
                initialValue={settings[key] || ''}
                onBlur={v => set(key, v)}
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Attachments Section */}
      <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-2xl p-5 border-2 border-[#e8b748]/40">
        <h4 className="text-sm font-black text-[#1a2744] mb-4">
          📎 {L('المرفقات', 'پەیوەستکراوەکان')}
        </h4>
        
        {/* Title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('العنوان (عربي)', 'سەرناو (عەرەبی)')}</label>
            <TextField
              key={`attachments_title_ar_${settingsLoadKey}`}
              initialValue={settings.attachments_title_ar || ''}
              onBlur={v => set('attachments_title_ar', v)}
              placeholder={L('وێنەیەک بۆ:', 'وێنەیەک بۆ:')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('العنوان (كردي)', 'سەرناو (کوردی)')}</label>
            <TextField
              key={`attachments_title_ku_${settingsLoadKey}`}
              initialValue={settings.attachments_title_ku || ''}
              onBlur={v => set('attachments_title_ku', v)}
              placeholder={L('وێنەیەک بۆ:', 'وێنەیەک بۆ:')}
            />
          </div>
        </div>

        {/* Items List - Arabic */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#1a2744] mb-2">{L('العناصر (عربي)', 'دانەکان (عەرەبی)')}</label>
          <AttachmentsItemsEditor
            items={settings.attachments_items_ar || []}
            onChange={(items) => set('attachments_items_ar', items)}
            lang="ar"
            settingsLoadKey={settingsLoadKey}
          />
        </div>

        {/* Items List - Kurdish */}
        <div>
          <label className="block text-xs font-bold text-[#1a2744] mb-2">{L('العناصر (كردي)', 'دانەکان (کوردی)')}</label>
          <AttachmentsItemsEditor
            items={settings.attachments_items_ku || []}
            onChange={(items) => set('attachments_items_ku', items)}
            lang="ku"
            settingsLoadKey={settingsLoadKey}
          />
        </div>
      </div>

      {/* Thank You Message */}
      <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-2xl p-5 border-2 border-[#e8b748]/40">
        <h4 className="text-sm font-black text-[#1a2744] mb-4">
          🙏 {L('رسالة الشكر', 'پەیامی سوپاس')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('رسالة الشكر (عربي)', 'پەیامی سوپاس (عەرەبی)')}</label>
            <TextField
              key={`thank_you_label_ar_${settingsLoadKey}`}
              initialValue={settings.thank_you_label_ar || ''}
              onBlur={v => set('thank_you_label_ar', v)}
              placeholder={L('شكراً جزيلاً!', 'سوپاسی زۆر!')}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('رسالة الشكر (كردي)', 'پەیامی سوپاس (کوردی)')}</label>
            <TextField
              key={`thank_you_label_ku_${settingsLoadKey}`}
              initialValue={settings.thank_you_label_ku || ''}
              onBlur={v => set('thank_you_label_ku', v)}
              placeholder={L('شكراً جزيلاً!', 'سوپاسی زۆر!')}
            />
          </div>
        </div>
      </div>

      {/* Footer Custom Text */}
      <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-2xl p-5 border-2 border-[#e8b748]/40">
        <h4 className="text-sm font-black text-[#1a2744] mb-4">
          📝 {L('نص التذييل المخصص', 'دەقی تەیلی تایبەت')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('النص (عربي)', 'دەقی (عەرەبی)')}</label>
            <TextField
              key={`footer_custom_text_ar_${settingsLoadKey}`}
              initialValue={settings.footer_custom_text_ar || ''}
              onBlur={v => set('footer_custom_text_ar', v)}
              placeholder={L('اكتب نص التذييل...', 'دەقی تەیل بنووسە...')}
              multiline
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('النص (كردي)', 'دەقی (کوردی)')}</label>
            <TextField
              key={`footer_custom_text_ku_${settingsLoadKey}`}
              initialValue={settings.footer_custom_text_ku || ''}
              onBlur={v => set('footer_custom_text_ku', v)}
              placeholder={L('دەقی تەیل بنووسە...', 'دەقی تەیل بنووسە...')}
              multiline
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Property Note (Red) */}
      <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-2xl p-5 border-2 border-[#e8b748]/40">
        <h4 className="text-sm font-black text-[#1a2744] mb-4">
          ⚠️ {L('ملاحظة العقار (تظهر باللون الأحمر)', 'تێبینی موڵک (بە ڕەنگی سوور دەردەکەوێت)')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('الملاحظة (عربي)', 'تێبینی (عەرەبی)')}</label>
            <TextField
              key={`property_note_ar_${settingsLoadKey}`}
              initialValue={settings.property_note_ar || ''}
              onBlur={v => set('property_note_ar', v)}
              placeholder={L('اكتب ملاحظة تظهر تحت جدول العقار...', 'تێبینی بنووسە کە لە ژێر خشتەی موڵک دەردەکەوێت...')}
              multiline
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('الملاحظة (كردي)', 'تێبینی (کوردی)')}</label>
            <TextField
              key={`property_note_ku_${settingsLoadKey}`}
              initialValue={settings.property_note_ku || ''}
              onBlur={v => set('property_note_ku', v)}
              placeholder={L('تێبینی بنووسە...', 'تێبینی بنووسە...')}
              multiline
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Letter Body Paragraphs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-black text-[#1a2744]">
            📝 {L('فقرات نص الرسالة', 'پەرەگرافەکانی دەقی نامە')}
          </h4>
          <Button onClick={addParagraph} size="sm" className="gap-1 bg-[#1a2744] hover:bg-[#2a3f6e]">
            <Plus className="w-4 h-4" />
            {L('إضافة فقرة', 'زیادکردنی پەرەگراف')}
          </Button>
        </div>

        {paragraphs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">{L('لا توجد فقرات. أضف فقرة لبدء كتابة الرسالة.', 'هیچ پەرەگرافێک نییە. پەرەگرافێک زیاد بکە.')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paragraphs.map((para, idx) => (
              <div key={para.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:border-[#e8b748]/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-400">{L('فقرة', 'پەرەگراف')} #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveParagraph(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveParagraph(idx, 1)} disabled={idx === paragraphs.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteParagraph(para.id)} className="p-1 rounded hover:bg-red-100 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <TextField
                    key={`${para.id}_ar`}
                    initialValue={para.text_ar || ''}
                    onBlur={v => updateParagraphField(para.id, 'text_ar', v)}
                    placeholder={L('النص بالعربي...', 'دەقی عەرەبی...')}
                    multiline
                    rows={3}
                  />
                  <TextField
                    key={`${para.id}_ku`}
                    initialValue={para.text_ku || ''}
                    onBlur={v => updateParagraphField(para.id, 'text_ku', v)}
                    placeholder={L('النص بالكردي...', 'دەقی کوردی...')}
                    multiline
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contract Info Display Toggles */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e8b748]"></span>
          {L('بيانات العقد المعروضة', 'زانیارییەکانی گرێبەست')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {[
            { key: 'show_tenant_name', ar: 'اسم المستأجر', ku: 'ناوی کرێچی' },
            { key: 'show_tenant_phone', ar: 'هاتف المستأجر', ku: 'تەلەفۆنی کرێچی' },
            { key: 'show_tenant_nationality', ar: 'جنسية المستأجر', ku: 'نەتەوەی کرێچی' },
            { key: 'show_tenant_address', ar: 'عنوان المستأجر', ku: 'ناونیشانی کرێچی' },
            { key: 'show_family_members', ar: 'عدد أفراد العائلة', ku: 'ژمارەی ئەندامانی خێزان' },
            { key: 'show_owner_name', ar: 'اسم المالك', ku: 'ناوی خاوەن' },
            { key: 'show_property_name', ar: 'اسم العقار', ku: 'کۆد' },

            { key: 'show_property_type', ar: 'نوع العقار', ku: 'جۆر' },
            { key: 'show_property_location', ar: 'موقع العقار', ku: 'شوێن' },
            { key: 'show_start_date', ar: 'تاريخ البداية', ku: 'دەستپێک' },
            { key: 'show_end_date', ar: 'تاريخ الانتهاء', ku: 'کۆتایی' },
            { key: 'show_duration', ar: 'مدة العقد', ku: 'ماوە' },
            { key: 'show_monthly_rent', ar: 'الإيجار الشهري', ku: 'کرێی مانگانە' },
            { key: 'show_purpose', ar: 'غرض الإيجار', ku: 'ئامانجی کرێ' },
            { key: 'show_insurance', ar: 'مبلغ التأمين', ku: 'بڕی دڵنیایی' },
          ].map(({ key, ar, ku }) => (
            <Toggle key={key} label={L(ar, ku)} checked={get(key)} onChange={v => set(key, v)} />
          ))}
        </div>
      </div>

    </div>
  );
}