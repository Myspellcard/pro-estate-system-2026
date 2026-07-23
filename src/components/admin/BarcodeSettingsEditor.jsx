import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

const TextField = ({ initialValue, onBlur, placeholder, multiline = false, rows = 2 }) => {
  const [local, setLocal] = useState(initialValue || '');
  const cls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20 resize-y bg-white";
  return multiline
    ? <textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onBlur(local)} placeholder={placeholder} rows={rows} className={cls} dir="rtl" />
    : <input type="text" value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onBlur(local)} placeholder={placeholder} className={cls} dir="rtl" />;
};

export default function BarcodeSettingsEditor({ settings = {}, onChange, lang = 'ar', documentType = 'rental_permission', settingsLoadKey = 'unloaded' }) {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const get = (key, def) => {
    const prefix = `barcode_${documentType}_`;
    return settings[prefix + key] !== undefined ? settings[prefix + key] : def;
  };
  
  const set = (key, val) => {
    const prefix = `barcode_${documentType}_`;
    onChange({ ...settings, [prefix + key]: val });
  };

  // settingsLoadKey is passed from parent (the DB record id)

  const docLabels = {
    rent_contract: { ar: 'عقد الإيجار', ku: 'گرێبەستی کرێ' },
    sale_contract: { ar: 'عقد البيع', ku: 'گرێبەستی فرۆشتن' },
    rental_permission: { ar: 'مۆڵەتی کرێ', ku: 'مۆڵەتی کرێ' },
  };

  return (
    <div className="bg-gradient-to-br from-[#fef9e7] to-[#fff7ed] rounded-2xl p-5 border-2 border-[#e8b748]/40" dir="rtl">
      <h4 className="text-sm font-black text-[#1a2744] mb-4 flex items-center gap-2">
        <span>📱</span>
        {L('إعدادات الباركود', 'ڕێکخستنەکانی بارکۆد')} - {L(docLabels[documentType]?.ar || documentType, docLabels[documentType]?.ku || documentType)}
      </h4>
      
      <div className="space-y-4">
        {/* Barcode Type */}
        <div>
          <label className="block text-xs font-bold text-[#1a2744] mb-2">{L('نوع الباركود', 'جۆری بارکۆد')}</label>
          <select
            value={get('type', 'qrcode_contract_number')}
            onChange={(e) => set('type', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20 bg-white"
          >
            <option value="qrcode_contract_number">{L('QR Code - رقم العقد', 'QR Code - ژمارەی گرێبەست')}</option>
            <option value="qrcode_custom_url">{L('QR Code - رابط مخصص', 'QR Code - لینکی تایبەت')}</option>
            <option value="qrcode_tenant_phone">{L('QR Code - هاتف المستأجر', 'QR Code - تەلەفۆنی کرێچی')}</option>
            <option value="qrcode_owner_phone">{L('QR Code - هاتف المالك', 'QR Code - تەلەفۆنی خاوەن')}</option>
            <option value="qrcode_property_url">{L('QR Code - رابط العقار', 'QR Code - لینکی خانووبەرە')}</option>
            <option value="none">{L('بدون باركود', 'بێ بارکۆد')}</option>
          </select>
        </div>
        
        {/* Custom URL Fields */}
        {get('type') === 'qrcode_custom_url' && (
          <>
            <div>
              <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('رابط مخصص (عربي)', 'لینکی تایبەت (عەرەبی)')}</label>
              <TextField
                key={`barcode_custom_url_ar_${settingsLoadKey}_${documentType}`}
                initialValue={get('custom_url_ar', '')}
                onBlur={v => set('custom_url_ar', v)}
                placeholder={L('https://example.com/contract/123', 'https://example.com/contract/123')}
                multiline
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">{L('سيتم فتح هذا الرابط عند مسح الباركود', 'ئەم لینکە دەکرێتەوە کاتێک بارکۆدەکە دەسکانکرێت')}</p>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('رابط مخصص (كردي)', 'لینکی تایبەت (کوردی)')}</label>
              <TextField
                key={`barcode_custom_url_ku_${settingsLoadKey}_${documentType}`}
                initialValue={get('custom_url_ku', '')}
                onBlur={v => set('custom_url_ku', v)}
                placeholder={L('https://example.com/contract/123', 'https://example.com/contract/123')}
                multiline
                rows={2}
              />
            </div>
          </>
        )}
        
        {/* Size and Color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('حجم الباركود (px)', 'قەبارەی بارکۆد (px)')}</label>
            <Input
              type="number"
              value={get('size', 50)}
              onChange={(e) => set('size', Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              min="30"
              max="100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1a2744] mb-1">{L('لون الإطار', 'ڕەنگی چوارچێوە')}</label>
            <input
              type="color"
              value={get('border_color', '#1a2744')}
              onChange={(e) => set('border_color', e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
        
        {/* Display Options */}
        <div className="pt-3 border-t border-[#e8b748]/30">
          <label className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/50 cursor-pointer border border-gray-100">
            <span className="text-sm text-gray-700">{L('إظهار الإطار', 'پیشاندانی چوارچێوە')}</span>
            <div
              onClick={() => set('show_border', !get('show_border', true))}
              className={`w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${get('show_border', true) ? 'bg-[#1a2744]' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${get('show_border', true) ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}