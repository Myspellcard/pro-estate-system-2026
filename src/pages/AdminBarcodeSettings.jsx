import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { QrCode, Save, CheckCircle2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DOC_TYPES = [
  {
    key: 'rental_permission',
    ar: 'مۆڵەتی کرێ',
    ku: 'مۆڵەتی کرێ',
    icon: '📄',
    usedIn_ar: 'يظهر في: مۆڵەتی کرێ',
    usedIn_ku: 'دەردەکەوێت لە: مۆڵەتی کرێ',
  },
  {
    key: 'rent_contract',
    ar: 'عقد الإيجار والفواتير',
    ku: 'گرێبەستی کرێ و پسوولەکان',
    icon: '📋',
    usedIn_ar: 'يظهر في: عقود الإيجار، فواتير الإيجار، فواتير استلام المالك، فواتير التأمين',
    usedIn_ku: 'دەردەکەوێت لە: گرێبەستەکانی کرێ، پسوولەکانی کرێ، پسوولەکانی وەرگرتنی خاوەن، بیمەکان',
  },
  {
    key: 'sale_contract',
    ar: 'عقد البيع',
    ku: 'گرێبەستی فرۆشتن',
    icon: '🏠',
    usedIn_ar: 'يظهر في: عقود البيع، فواتير الدفعات، فواتير المالك',
    usedIn_ku: 'دەردەکەوێت لە: گرێبەستەکانی فرۆشتن، پسوولەکانی پارەدان، پسوولەکانی خاوەن',
  },
];

function QRPreview({ text, size, showBorder, borderColor }) {
  if (!text || text === 'none') return (
    <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-xl text-gray-400 text-xs">بێ بارکۆد</div>
  );
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  return (
    <div style={showBorder ? { border: `2px solid ${borderColor}`, padding: 3, borderRadius: 6, display: 'inline-block' } : {}}>
      <img src={url} alt="QR" style={{ width: size, height: size, display: 'block' }} />
    </div>
  );
}

function StatusCard({ status, config, onChange }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header badge */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: status.color || '#10b981' }}>
        <span className="text-lg">{status.icon}</span>
        <div className="flex-1">
          <span className="text-white font-bold text-sm">{status.title_ku}</span>
          <span className="text-white/70 text-xs mr-2"> / {status.title_ar}</span>
        </div>
        <code className="text-white/50 text-xs">{status.status_key}</code>
      </div>

      {/* Editable fields */}
      <div className="p-3 bg-gray-50 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">عنوان صفحة المسح (عربي)</label>
          <input type="text" value={config.scan_title_ar || ''}
            onChange={e => onChange({ ...config, scan_title_ar: e.target.value })}
            placeholder={status.title_ar}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1a2744]/30" dir="rtl" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">سەردێری پەڕەی سکان (کوردی)</label>
          <input type="text" value={config.scan_title_ku || ''}
            onChange={e => onChange({ ...config, scan_title_ku: e.target.value })}
            placeholder={status.title_ku}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1a2744]/30" dir="rtl" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">وصف (عربي)</label>
          <input type="text" value={config.scan_desc_ar || ''}
            onChange={e => onChange({ ...config, scan_desc_ar: e.target.value })}
            placeholder={status.description_ar || ''}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1a2744]/30" dir="rtl" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">وەسف (کوردی)</label>
          <input type="text" value={config.scan_desc_ku || ''}
            onChange={e => onChange({ ...config, scan_desc_ku: e.target.value })}
            placeholder={status.description_ku || ''}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1a2744]/30" dir="rtl" />
        </div>
      </div>
    </div>
  );
}

function DocSection({ docType, settings, onChange, docStatuses, lang }) {
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const get = (k, def) => settings[k] !== undefined ? settings[k] : def;
  const set = (k, v) => onChange({ ...settings, [k]: v });

  const enabled = get('enabled', true);
  const size = get('size', 60);
  const borderColor = get('border_color', '#1a2744');
  const showBorder = get('show_border', true);
  const customDomain = (get('custom_domain', '') || '').replace(/\/$/, '');
  const effectiveOrigin = customDomain || window.location.origin;

  const statusConfigs = get('status_configs', []);
  const getStatusConfig = (key) => statusConfigs.find(s => s.status_key === key) || { status_key: key };
  const setStatusConfig = (key, cfg) => {
    const rest = statusConfigs.filter(s => s.status_key !== key);
    set('status_configs', [...rest, cfg]);
  };

  const previewUrl = `${effectiveOrigin}/barcode-view?doc=${docType.key}&text=CTR-2024-001|under_processing`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="bg-[#1a2744] px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">{docType.icon}</span>
        <div className="flex-1">
          <h2 className="text-white font-bold">{L(docType.ar, docType.ku)}</h2>
          <p className="text-blue-200 text-xs mt-0.5">{L(docType.usedIn_ar, docType.usedIn_ku)}</p>
        </div>
        {/* Enable toggle */}
        <div
          onClick={() => set('enabled', !enabled)}
          className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative flex-shrink-0 ${enabled ? 'bg-[#e8b748]' : 'bg-gray-500'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </div>
      </div>

      {enabled && (
        <div className="p-5 space-y-5">
          {/* QR size & border */}
          <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-600 mb-2">{L('حجم QR', 'قەبارەی QR')} ({size}px)</label>
              <input type="range" min="40" max="120" step="5" value={size}
                onChange={e => set('size', Number(e.target.value))}
                className="w-full accent-[#1a2744]" />
            </div>
            <div className="flex items-center gap-3">
              <div
                onClick={() => set('show_border', !showBorder)}
                className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative flex-shrink-0 ${showBorder ? 'bg-[#1a2744]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showBorder ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-gray-600">{L('إطار', 'چوارچێوە')}</span>
              {showBorder && (
                <input type="color" value={borderColor} onChange={e => set('border_color', e.target.value)}
                  className="w-8 h-8 border border-gray-200 rounded cursor-pointer" />
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs text-gray-400">{L('معاينة', 'پێشبینی')}</p>
              <QRPreview text={previewUrl} size={Math.min(size, 70)} showBorder={showBorder} borderColor={borderColor} />
            </div>
          </div>

          {/* Custom domain */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">{L('الدومين المخصص (اختياري)', 'دۆمەینی تایبەت (هەڵبژاردنە)')}</label>
            <input type="text" value={get('custom_domain', '')}
              onChange={e => set('custom_domain', e.target.value)}
              placeholder="https://yourapp.firebaseApi.app"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20"
              dir="ltr" />
          </div>

          {/* Status scan page configs */}
          <div>
            <h3 className="text-sm font-bold text-[#1a2744] mb-3">
              📝 {L('نص صفحة المسح لكل حالة', 'دەقی پەڕەی سکانکردن بۆ هەر دۆخێک')}
            </h3>
            <div className="space-y-3">
              {docStatuses.map(st => (
                <StatusCard
                  key={st.status_key}
                  status={st}
                  config={getStatusConfig(st.status_key)}
                  onChange={cfg => setStatusConfig(st.status_key, cfg)}
                />
              ))}
              {docStatuses.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">{L('لا توجد حالات', 'هیچ دۆخێک نییە')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminBarcodeSettings() {
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(null);
  const initialized = useRef(false);

  const { data: barcodeSettingsList = [], isLoading } = useQuery({
    queryKey: ['barcode_settings'],
    queryFn: () => firebaseApi.entities.BarcodeSettings.list(),
    staleTime: 0,
  });

  const { data: statusRecords = [] } = useQuery({
    queryKey: ['barcode_statuses'],
    queryFn: () => firebaseApi.entities.BarcodeStatus.list('order'),
  });

  const statusesByDocType = {};
  statusRecords.filter(s => s.is_active !== false).forEach(s => {
    if (!statusesByDocType[s.doc_type]) statusesByDocType[s.doc_type] = [];
    statusesByDocType[s.doc_type].push(s);
  });

  useEffect(() => {
    if (!isLoading && !initialized.current) {
      const byType = {};
      DOC_TYPES.forEach(dt => {
        const rec = barcodeSettingsList.find(s => s.doc_type === dt.key);
        byType[dt.key] = rec
          ? { _id: rec.id, enabled: rec.enabled !== false, size: rec.size, show_border: rec.show_border, border_color: rec.border_color, custom_domain: rec.custom_domain, status_configs: rec.status_configs || [] }
          : { enabled: true, status_configs: [] };
      });
      setForm(byType);
      initialized.current = true;
    }
  }, [isLoading, barcodeSettingsList]);

  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      await Promise.all(DOC_TYPES.map(async (dt) => {
        const data = formData[dt.key] || {};
        const { _id, ...saveData } = data;
        const payload = { doc_type: dt.key, type: 'qrcode_contract_number', ...saveData };
        if (_id) {
          await firebaseApi.entities.BarcodeSettings.update(_id, payload);
        } else {
          const existing = barcodeSettingsList.find(s => s.doc_type === dt.key);
          if (existing) {
            await firebaseApi.entities.BarcodeSettings.update(existing.id, payload);
          } else {
            await firebaseApi.entities.BarcodeSettings.create(payload);
          }
        }
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barcode_settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => alert('فشل الحفظ: ' + e.message),
  });

  if (!form) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl" dir="rtl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#2a3f6e] flex items-center justify-center shadow-lg">
            <QrCode className="w-6 h-6 text-[#e8b748]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a2744]">{L('إعدادات الباركود', 'ڕێکخستنەکانی بارکۆد')}</h1>
            <p className="text-sm text-gray-500">{L('خصّص ما يظهر عند مسح الباركود لكل مستند', 'دیاریبکە چی دەردەکەوێت کاتی سکانکردنی بارکۆد بۆ هەر بەڵگەیەک')}</p>
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2">
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? L('تم الحفظ!', 'پاشەکەوتکرا!') : L('حفظ', 'پاشەکەوتکردن')}
        </Button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          ✓ {L('تم حفظ الإعدادات بنجاح', 'ڕێکخستنەکان بە سەرکەوتوویی پاشەکەوتکران')}
        </div>
      )}

      <div className="space-y-5">
        {DOC_TYPES.map(docType => (
          <DocSection
            key={docType.key}
            docType={docType}
            settings={form[docType.key] || { enabled: true, status_configs: [] }}
            onChange={val => setForm(prev => ({ ...prev, [docType.key]: val }))}
            docStatuses={statusesByDocType[docType.key] || []}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}