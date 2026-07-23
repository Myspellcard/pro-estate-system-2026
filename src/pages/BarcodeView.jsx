import React, { useEffect, useState } from 'react';

export default function BarcodeView() {
  const params = new URLSearchParams(window.location.search);
  const docType = params.get('doc') || 'rental_permission';
  const [contractNumber, setContractNumber] = useState('');
  const [statusKey, setStatusKey] = useState('');

  const [barcodeData, setBarcodeData] = useState(null);

  useEffect(() => {
    fetch('/functions/getBarcodeData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then(r => r.json()).then(setBarcodeData).catch(() => {});
  }, []);

  const barcodeSettingsList = barcodeData?.settings || [];
  const barcodeStatuses = barcodeData?.statuses || [];

  useEffect(() => {
    const t = params.get('text') || '';
    const parts = t.split('|');
    if (parts.length >= 2) {
      setContractNumber(parts[0]);
      setStatusKey(parts[1].toLowerCase());
    } else {
      setContractNumber('');
      setStatusKey(t.toLowerCase());
    }
  }, []);

  // Find matching status record for this doc_type
  const docStatuses = barcodeStatuses.filter(s => s.doc_type === docType && s.is_active !== false);
  const matchedStatus = docStatuses.find(s => s.status_key === statusKey);

  // Find custom scan page config
  const docSettings = barcodeSettingsList.find(s => s.doc_type === docType);
  const cfg = (docSettings?.status_configs || []).find(c => c.status_key === statusKey);

  // Resolve display values — custom config overrides status defaults
  const icon = cfg?.scan_icon || matchedStatus?.icon || '📋';
  const color = matchedStatus?.color || '#3b82f6';

  const title_ar = cfg?.scan_title_ar || matchedStatus?.title_ar || 'معلومات المستند';
  const title_ku = cfg?.scan_title_ku || matchedStatus?.title_ku || 'زانیارییەکانی بەڵگە';
  const desc_ar = cfg?.scan_desc_ar || matchedStatus?.description_ar || '';
  const desc_ku = cfg?.scan_desc_ku || matchedStatus?.description_ku || '';

  // Doc type label
  const docLabels = {
    rental_permission: { ar: 'مۆڵەتی کرێ', ku: 'مۆڵەتی کرێ' },
    rent_contract:     { ar: 'عقد الإيجار', ku: 'گرێبەستی کرێ' },
    sale_contract:     { ar: 'عقد البيع',   ku: 'گرێبەستی فرۆشتن' },
  };
  const docLabel = docLabels[docType] || { ar: 'مستند', ku: 'بەڵگە' };

  const isLoading = barcodeSettingsList.length === 0 && barcodeStatuses.length === 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${color}22 0%, #1a2744 100%)`, direction: 'rtl' }}>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 text-center" style={{ background: `linear-gradient(135deg, #1a2744 0%, #2a3f6e 100%)` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: `${color}33`, border: `2px solid ${color}66` }}>
            <span className="text-3xl">{icon}</span>
          </div>
          {/* Bilingual doc type label */}
          <p className="text-blue-200 text-sm font-bold">{docLabel.ku} / {docLabel.ar}</p>
        </div>

        {/* Gold divider */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent, #e8b748, transparent)' }} />

        {/* Contract number */}
        {contractNumber && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-center">
            <p className="text-xs text-gray-400 mb-0.5">ژمارەی گرێبەست / رقم العقد</p>
            <p className="text-lg font-bold text-[#1a2744]" dir="ltr">{contractNumber}</p>
          </div>
        )}

        {/* Status card — BILINGUAL: Kurdish on top, Arabic below */}
        <div className="px-6 py-6">
          <div className="rounded-2xl p-5 text-white text-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color} 0%, #1a2744 100%)` }}>
            <div className="text-4xl mb-3">{icon}</div>

            {/* Kurdish */}
            <div className="mb-3 pb-3 border-b border-white/20">
              <p className="text-xs text-white/60 mb-1">کوردی</p>
              <h2 className="text-xl font-bold leading-snug">{title_ku}</h2>
              {desc_ku && <p className="text-white/80 text-sm mt-1">{desc_ku}</p>}
            </div>

            {/* Arabic */}
            <div>
              <p className="text-xs text-white/60 mb-1">عربي</p>
              <h2 className="text-xl font-bold leading-snug">{title_ar}</h2>
              {desc_ar && <p className="text-white/80 text-sm mt-1">{desc_ar}</p>}
            </div>
          </div>
        </div>

        {/* Contact note */}
        <div className="px-6 pb-5">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
            <p className="text-xs text-blue-700">
              📞 بۆ زانیاری زیاتر پەیوەندی بکە بە بەڕێوەبەرایەتی خانووبەرەکە
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              للاستفسار يرجى التواصل مع إدارة العقارات
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}