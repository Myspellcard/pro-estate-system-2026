import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const MarginField = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
    <input
      type="number"
      min={0}
      max={50}
      value={value ?? 8}
      onChange={e => onChange(Number(e.target.value))}
      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20"
    />
    <span className="text-xs text-gray-400">mm</span>
  </div>
);

const SelectField = ({ label, value, onChange, options, lang }) => {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <select
        value={value || 'A4'}
        onChange={e => onChange(e.target.value)}
        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{L(opt.labelAr, opt.labelKu)}</option>
        ))}
      </select>
    </div>
  );
};

const TextField = ({ label, value, onChange, multiline = false }) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-[#1a2744] mb-2">{label}</label>
    {multiline ? (
      <textarea
        rows={3}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full border-2 border-[#e8b748]/30 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30 focus:border-[#1a2744]/50 resize-y bg-gradient-to-br from-white to-[#fef9e7]/30"
        dir="rtl"
        placeholder={label}
      />
    ) : (
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full border-2 border-[#e8b748]/30 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a2744]/30 focus:border-[#1a2744]/50 bg-gradient-to-br from-white to-[#fef9e7]/30"
        dir="rtl"
        placeholder={label}
      />
    )}
  </div>
);

export default function PrintSettingsEditor({ title, settings = {}, defaults = {}, onChange, toggleSections = [], toggleFields = [], textFields = [], pageSetupFields = [], lang = 'ar' }) {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const get = (key) => settings && settings[key] !== undefined ? settings[key] : (defaults && defaults[key] !== undefined ? defaults[key] : true);
  const getNum = (key, fallback) => settings && settings[key] !== undefined ? settings[key] : (defaults && defaults[key] !== undefined ? defaults[key] : fallback);
  const getText = (key) => settings && settings[key] !== undefined ? (settings[key] || '') : '';
  const set = (key, val) => onChange({ ...settings, [key]: val });

  return (
    <div className="space-y-4">
      {/* Page Setup */}
      {pageSetupFields.length > 0 && (
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <h4 className="text-sm font-bold text-purple-800 mb-3">📄 {L('إعدادات الصفحة', 'ڕێکخستنەکانی پەڕە')}</h4>
          <div className="grid grid-cols-2 gap-3">
            {pageSetupFields.map(({ key, labelAr, labelKu, type, options }) => (
              type === 'select' ? (
                <SelectField
                  key={key}
                  label={L(labelAr, labelKu)}
                  value={settings[key] || (key === 'page_size' ? 'A4' : 'portrait')}
                  onChange={v => set(key, v)}
                  options={options}
                  lang={lang}
                />
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Margins */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h4 className="text-sm font-bold text-blue-800 mb-3">📐 {L('هوامش الصفحة (mm)', 'مەرجی پەڕە (mm)')}</h4>
        <div className="grid grid-cols-2 gap-3">
          <MarginField label={L('أعلى', 'سەرەوە')} value={getNum('margin_top', 8)} onChange={v => set('margin_top', v)} />
          <MarginField label={L('أسفل', 'خوارەوە')} value={getNum('margin_bottom', 8)} onChange={v => set('margin_bottom', v)} />
          <MarginField label={L('يسار', 'چەپ')} value={getNum('margin_left', 10)} onChange={v => set('margin_left', v)} />
          <MarginField label={L('يمين', 'ڕاست')} value={getNum('margin_right', 10)} onChange={v => set('margin_right', v)} />
        </div>
      </div>

      {/* Visibility Toggles with Sections */}
      {toggleSections.length > 0 ? (
        <div className="space-y-4">
          {toggleSections.map((section, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1a2744]"></span>
                {L(section.titleAr, section.titleKu)}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {section.fields.map(({ key, labelAr, labelKu }) => (
                  <Toggle
                    key={key}
                    label={L(labelAr, labelKu)}
                    checked={get(key)}
                    onChange={v => set(key, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : toggleFields.length > 0 ? (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h4 className="text-sm font-bold text-gray-700 mb-3">👁 {L('الحقول المرئية', 'خانەکانی دیار')}</h4>
          {toggleFields.map(({ key, labelAr, labelKu }) => (
            <Toggle
              key={key}
              label={L(labelAr, labelKu)}
              checked={get(key)}
              onChange={v => set(key, v)}
            />
          ))}
        </div>
      ) : null}

      {/* Editable Text Fields */}
      {textFields && textFields.length > 0 && (
        <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-2xl p-5 border-2 border-[#e8b748]/40 shadow-sm">
          <h4 className="text-sm font-black text-[#1a2744] mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#e8b748] flex items-center justify-center text-xs">✏️</span>
            {L('محتوى النص القابل للتعديل', 'ناوەڕۆکی دەقی دەستکاریکراو')}
          </h4>
          <div className="space-y-3">
            {textFields.map(({ key, labelAr, labelKu, multiline }) => (
              <TextField
                key={key}
                label={L(labelAr, labelKu)}
                value={getText(key) || ''}
                onChange={v => set(key, v)}
                multiline={multiline === true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}