import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Hash, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GROUPS = [
  {
    groupAr: 'الإيجار', groupKu: 'کرێ', groupIcon: '🏘️',
    fields: [
      { key: 'rental_permission_start', prefixKey: 'rental_permission_prefix', ar: 'إذن الإيجار',    ku: 'مۆڵەتی کرێ',    pageAr: 'صفحة العقود ← إذن الإيجار',      pageKu: 'لاپەڕەی گرێبەستەکان ← مۆڵەتی کرێ',      icon: '📄', color: '#6366f1' },
      { key: 'rent_contract_start',     prefixKey: 'rent_contract_prefix',     ar: 'عقد الإيجار',  ku: 'گرێبەستی کرێ',  pageAr: 'صفحة العقود ← إنشاء عقد إيجار',      pageKu: 'لاپەڕەی گرێبەستەکان ← دروستکردنی گرێبەست', icon: '📋', color: '#0ea5e9' },
      { key: 'rent_invoice_start',      prefixKey: 'rent_invoice_prefix',      ar: 'فواتير الإيجار', ku: 'وەسڵەکانی کرێ', pageAr: 'صفحة الفواتير ← فواتير الإيجار',      pageKu: 'لاپەڕەی وەسڵەکان ← وەسڵەکانی کرێ',      icon: '🧾', color: '#10b981' },
      { key: 'owner_receipt_start',     prefixKey: 'owner_receipt_prefix',     ar: 'مدفوعات المالك', ku: 'وەرگرتنی خاوەن', pageAr: 'صفحة الفواتير ← مدفوعات المالك',     pageKu: 'لاپەڕەی وەسڵەکان ← پارەدانی خاوەن',    icon: '🏠', color: '#f59e0b' },
      { key: 'insurance_start',         prefixKey: 'insurance_prefix',         ar: 'فواتير التأمين',  ku: 'دڵنیایی',        pageAr: 'صفحة الفواتير ← فواتير التأمين',      pageKu: 'لاپەڕەی وەسڵەکان ← وەسڵەکانی دڵنیایی',    icon: '🔒', color: '#8b5cf6' },
    ],
  },
  {
    groupAr: 'المبيعات', groupKu: 'فرۆشتن', groupIcon: '🏢',
    fields: [
      { key: 'sale_contract_start',    prefixKey: 'sale_contract_prefix',    ar: 'عقد البيع', ku: 'گرێبەستی فرۆشتن', pageAr: 'صفحة عقود البيع ← إنشاء عقد',         pageKu: 'لاپەڕەی گرێبەستەکانی فرۆشتن ← دروستکردن', icon: '📝', color: '#ef4444' },
      { key: 'sale_invoice_start',     prefixKey: 'sale_invoice_prefix',     ar: 'فواتير المبيعات',   ku: 'وەسڵی فرۆشتن',   pageAr: 'صفحة فواتير المبيعات ← فاتورة جديدة',  pageKu: 'لاپەڕەی وەسڵەکانی فرۆشتن ← وەسڵی نوێ',  icon: '💰', color: '#f97316' },
      { key: 'sale_owner_spent_start', prefixKey: 'sale_owner_spent_prefix', ar: 'استلام مبلغ البيع',   ku: 'وەرگرتنی بڕی فرۆشتن',   pageAr: 'صفحة فواتير المبيعات ← مصروف جديد',   pageKu: 'لاپەڕەی وەسڵەکانی فرۆشتن ← مەسروفی نوێ', icon: '🏦', color: '#14b8a6' },
    ],
  },
  {
    groupAr: 'العمولات', groupKu: 'کرێ', groupIcon: '💠',
    fields: [
      { key: 'rent_commission_invoice_start', prefixKey: 'rent_commission_invoice_prefix', ar: 'وصل عمولة الإيجار', ku: 'وەسڵی کرێی کرێ', pageAr: 'صفحة العقود ← العمولات', pageKu: 'لاپەڕەی گرێبەستەکان ← کرێ', icon: '🏠', color: '#0ea5e9' },
      { key: 'sale_commission_invoice_start', prefixKey: 'sale_commission_invoice_prefix', ar: 'وصل عمولة البيع', ku: 'وەسڵی کرێی فرۆشتن', pageAr: 'صفحة عقود البيع ← العمولات', pageKu: 'لاپەڕەی گرێبەستەکانی فرۆشتن ← کرێ', icon: '🏢', color: '#ef4444' },
    ],
  },
];

export default function AdminNumberingSettings() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const appSettings = settingsList.find(s => s.key === 'default');
  const numbering = appSettings?.numbering || {};

  useEffect(() => {
    if (settingsList.length > 0) {
      const initial = {};
      GROUPS.forEach(g => g.fields.forEach(f => {
        initial[f.key] = numbering[f.key] ?? 1;
        initial[f.prefixKey] = numbering[f.prefixKey] ?? '';
      }));
      setForm(initial);
    }
  }, [JSON.stringify(numbering)]);

  const saveMutation = useMutation({
    mutationFn: async (currentForm) => {
      const freshList = await firebaseApi.entities.AppSettings.list();
      const freshAppSettings = freshList.find(s => s.key === 'default');
      if (freshAppSettings?.id) {
        const existing = freshAppSettings.numbering || {};
        await firebaseApi.entities.AppSettings.update(freshAppSettings.id, {
          numbering: { ...existing, ...currentForm }
        });
      } else {
        await firebaseApi.entities.AppSettings.create({ key: 'default', numbering: currentForm });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app_settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#2a3f6e] flex items-center justify-center shadow-lg">
            <Hash className="w-6 h-6 text-[#e8b748]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a2744]">{L('إعدادات الترقيم', 'ڕێکخستنەکانی ژمارەدان')}</h1>
            <p className="text-sm text-gray-500">{L('حدد البادئة ورقم البداية لكل نوع من المستندات', 'پێشگر و ژمارەی دەستپێک بۆ هەر جۆرێکی بەڵگەنامە دیاری بکە')}</p>
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2">
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? L('تم الحفظ!', 'پاشەکەوتکرا!') : L('حفظ', 'پاشەکەوتکردن')}
        </Button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          ✓ {L('تم حفظ إعدادات الترقيم بنجاح', 'ڕێکخستنەکانی ژمارەدان بە سەرکەوتوویی پاشەکەوتکران')}
        </div>
      )}

      <div className="space-y-6">
        {GROUPS.map(group => (
          <div key={group.groupAr}>
            {/* Group Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{group.groupIcon}</span>
              <h2 className="text-sm font-bold text-[#1a2744] uppercase tracking-wide">{L(group.groupAr, group.groupKu)}</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-3">
              {group.fields.map(f => {
                const prefix = form[f.prefixKey] ?? '';
                const num = form[f.key] ?? 1;
                const preview = prefix ? `${prefix}${num}` : String(num);
                return (
                  <div key={f.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: f.color + '18', border: `1.5px solid ${f.color}44` }}>
                        {f.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1a2744] text-sm">{L(f.ar, f.ku)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">📍 {L(f.pageAr, f.pageKu)}</p>
                        <p className="text-xs font-bold mt-1" style={{ color: f.color }}>
                          ✦ {L('معاينة الرقم القادم:', 'پێشبینیکردنی ژمارەی داهاتوو:')} <span dir="ltr" className="font-mono">{preview}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-[130px]">
                        <label className="text-xs text-gray-400 block mb-1">{L('البادئة (اختياري)', 'پێشگر (هەڵبژاردنە)')}</label>
                        <input
                          type="text"
                          value={form[f.prefixKey] ?? ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.prefixKey]: e.target.value }))}
                          placeholder={L('مثال: RV20RZ06-', 'نموونە: RV20RZ06-')}
                          className="w-full border-2 rounded-xl px-3 py-2 text-sm font-mono text-[#1a2744] focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20"
                          style={{ borderColor: f.color + '66' }}
                          dir="ltr"
                        />
                      </div>
                      <div className="text-gray-300 text-xl font-light mt-4">+</div>
                      <div className="w-28">
                        <label className="text-xs text-gray-400 block mb-1">{L('رقم البداية', 'ژمارەی دەستپێک')}</label>
                        <input
                          type="number"
                          min="1"
                          value={form[f.key] ?? 1}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                          className="w-full text-center border-2 rounded-xl px-3 py-2 text-lg font-bold text-[#1a2744] focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20"
                          style={{ borderColor: f.color + '66' }}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        {L('الرقم النهائي = البادئة + رقم التسلسل. مثال: RV20RZ06-1', 'ژمارەی کۆتایی = پێشگر + ژمارەی زنجیرە. نموونە: RV20RZ06-1')}
      </p>
    </div>
  );
}