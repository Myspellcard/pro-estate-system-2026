import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Settings2, Save, CheckCircle2, LayoutDashboard, Building2, Globe, Printer } from 'lucide-react';
import PrintSettingsEditor from '@/components/admin/PrintSettingsEditor';
import { Button } from '@/components/ui/button';
import DashboardLayoutEditor, { DEFAULT_LAYOUT } from '@/components/dashboard/DashboardLayoutEditor';

const DEFAULT_SETTINGS = {
  key: 'default',
  upcoming_payments_days: 7,
  upcoming_payments_count: 10,
  expiring_contracts_days: 30,
  expiring_contracts_count: 10,
  overdue_count: 10,
  recent_contracts_count: 10,
};

const parseLayout = (raw) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const merged = DEFAULT_LAYOUT.map(def => parsed.find(p => p.id === def.id) || def);
    parsed.forEach(p => { if (!merged.find(m => m.id === p.id)) merged.push(p); });
    return merged.sort((a, b) => a.order - b.order).map((item, i) => ({ ...item, order: i }));
  } catch { return null; }
};

export default function AdminDashboardSettings() {
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [generalLayout, setGeneralLayout] = useState(DEFAULT_LAYOUT);
  const [branchLayout, setBranchLayout] = useState(DEFAULT_LAYOUT);
  const [activeTab, setActiveTab] = useState('general');
  const [activePrint, setActivePrint] = useState('print_rent_contract');
  const [saved, setSaved] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const existing = settingsList.find(s => s.key === 'default');

  useEffect(() => {
    if (existing) {
      setForm({ ...DEFAULT_SETTINGS, ...existing });
      const gl = parseLayout(existing.dashboard_layout);
      if (gl) setGeneralLayout(gl);
      const bl = parseLayout(existing.branch_dashboard_layout);
      if (bl) setBranchLayout(bl);
    } else {
      setForm(DEFAULT_SETTINGS);
      setGeneralLayout(DEFAULT_LAYOUT);
      setBranchLayout(DEFAULT_LAYOUT);
    }
  }, [existing?.id, existing?.dashboard_layout, existing?.branch_dashboard_layout]);

  const saveMutation = useMutation({
    mutationFn: (data) => existing
      ? firebaseApi.entities.AppSettings.update(existing.id, data)
      : firebaseApi.entities.AppSettings.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app_settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      dashboard_layout: generalLayout,
      branch_dashboard_layout: branchLayout,
    });
  };

  const field = (key, labelAr, labelKu, hint) => (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-[#1a2744]">{L(labelAr, labelKu)}</label>
      {hint && <p className="text-xs text-gray-400">{L(hint.ar, hint.ku)}</p>}
      <input
        type="number"
        min={1}
        max={365}
        value={form[key] ?? DEFAULT_SETTINGS[key]}
        onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))}
        className="w-full sm:w-40 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20 font-mono text-center"
      />
    </div>
  );

  const TABS = [
    { id: 'general',  icon: Globe,     labelAr: 'اللوحة العامة',     labelKu: 'داشبۆردی گشتی' },
    { id: 'branch',   icon: Building2, labelAr: 'لوحة الفروع',       labelKu: 'داشبۆردی لقەکان' },
    { id: 'counters', icon: Settings2, labelAr: 'إعدادات العدادات',   labelKu: 'ڕێکخستنی ژمارەکان' },
    { id: 'print',    icon: Printer,   labelAr: 'إعدادات الطباعة',   labelKu: 'ڕێکخستنی پرینت' },
  ];

  const layoutHint = (
    <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
      <p>📌 <strong>{L('كامل العرض', 'تەواوی پانی')}</strong>: {L('يأخذ عرض الصفحة كاملاً', 'تەواوی پانی پەڕەکەی دەگرێت')}</p>
      <p>◧ <strong>{L('يسار', 'چەپ')}</strong>: {L('يظهر في العمود الأول (نصف الصفحة)', 'لە ستوونی یەکەم دەردەکەوێت')}</p>
      <p>◨ <strong>{L('يمين', 'ڕاست')}</strong>: {L('يظهر في العمود الثاني (نصف الصفحة)', 'لە ستوونی دووەم دەردەکەوێت')}</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-3xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#2a3f6e] flex items-center justify-center shadow-lg">
          <Settings2 className="w-6 h-6 text-[#e8b748]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">{L('إعدادات لوحة التحكم', 'ڕێکخستنەکانی داشبۆرد')}</h1>
          <p className="text-sm text-gray-500">{L('ترتيب وتخصيص اللوحة العامة ولوحة الفروع بشكل مستقل', 'ڕیزکردن و دیزاینکردنی داشبۆردی گشتی و لقەکان جیاجیا')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-2xl">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#1a2744] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {L(tab.labelAr, tab.labelKu)}
            </button>
          );
        })}
      </div>

      {/* General Layout */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-[#1a2744]">{L('ترتيب اللوحة العامة', 'ڕیزکردنی داشبۆردی گشتی')}</h2>
              <p className="text-xs text-gray-400">{L('يظهر عند اختيار "عام" في الداشبورد', 'دەردەکەوێت کاتێک "گشتی" هەڵبژێردرێت لە داشبۆرد')}</p>
            </div>
          </div>
          <div className="p-5">
            <DashboardLayoutEditor layout={generalLayout} onChange={setGeneralLayout} lang={lang} />
            {layoutHint}
          </div>
        </div>
      )}

      {/* Branch Layout */}
      {activeTab === 'branch' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-[#1a2744]">{L('ترتيب لوحة الفروع', 'ڕیزکردنی داشبۆردی لقەکان')}</h2>
              <p className="text-xs text-gray-400">{L('يظهر عند اختيار فرع معين في الداشبورد', 'دەردەکەوێت کاتێک لقێک دیاری بکرێت لە داشبۆرد')}</p>
            </div>
          </div>
          <div className="p-5">
            <DashboardLayoutEditor layout={branchLayout} onChange={setBranchLayout} lang={lang} />
            {layoutHint}
          </div>
        </div>
      )}

      {/* Counters */}
      {activeTab === 'counters' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          <div className="p-5 space-y-4">
            <h3 className="font-bold text-[#1a2744] flex items-center gap-2">
              💳 {L('الدفعات القادمة', 'پارەدانەکانی نزیک')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('upcoming_payments_days', 'عرض دفعات خلال (أيام)', 'نیشاندانی پارەدان لە ناو (رۆژ)', { ar: 'الفواتير التي تستحق خلال هذا العدد من الأيام', ku: 'وەسڵەکانی کە لەناو ئەم رۆژانەدا دەگەنە کات' })}
              {field('upcoming_payments_count', 'عدد السجلات للعرض', 'ژمارەی تۆمارەکان بۆ نیشاندان', { ar: 'أقصى عدد من الفواتير في لوحة التحكم', ku: 'زۆرترین ژمارەی وەسڵ لە داشبۆرد' })}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <h3 className="font-bold text-[#1a2744] flex items-center gap-2">
              📋 {L('العقود المنتهية قريباً', 'گرێبەستەکانی نزیک بە کۆتایی')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('expiring_contracts_days', 'تحذير قبل الانتهاء بـ (أيام)', 'ئاگادارکردنەوە پێش (رۆژ) لە کۆتایی', { ar: 'يظهر العقد إذا سينتهي خلال هذا العدد من الأيام', ku: 'گرێبەست دەردەکەوێت ئەگەر لەناو ئەم رۆژانەدا بکۆتاییبێت' })}
              {field('expiring_contracts_count', 'عدد العقود للعرض', 'ژمارەی گرێبەستەکان بۆ نیشاندان', { ar: 'أقصى عدد من العقود في لوحة التحكم', ku: 'زۆرترین ژمارەی گرێبەست لە داشبۆرد' })}
            </div>
          </div>
          <div className="p-5 space-y-4">
            <h3 className="font-bold text-[#1a2744] flex items-center gap-2">
              🚫 {L('القائمة السوداء (متأخرون)', 'لیستی ڕەش (دواکەوتووان)')}
            </h3>
            {field('overdue_count', 'عدد السجلات للعرض', 'ژمارەی تۆمارەکان بۆ نیشاندان', { ar: 'أقصى عدد من الفواتير المتأخرة', ku: 'زۆرترین ژمارەی وەسڵی دواکەوتوو' })}
          </div>
          <div className="p-5 space-y-4">
            <h3 className="font-bold text-[#1a2744] flex items-center gap-2">
              🆕 {L('آخر العقود', 'دوایین گرێبەستەکان')}
            </h3>
            {field('recent_contracts_count', 'عدد العقود الأخيرة للعرض', 'ژمارەی دوایین گرێبەستەکان', { ar: 'أقصى عدد من آخر العقود في لوحة التحكم', ku: 'زۆرترین ژمارەی دوایین گرێبەستەکان' })}
          </div>
        </div>
      )}

      {/* Print Settings - Redirect to dedicated page */}
      {activeTab === 'print' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Printer className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#1a2744] mb-2">{L('إعدادات الطباعة المتقدمة', 'ڕێکخستنە پێشکەوتووەکانی پرینت')}</h3>
          <p className="text-sm text-gray-500 mb-6">{L('يمكنك تخصيص الهوامش وإظهار/إخفاء الحقول لكل نوع مستند', 'دەتوانیت مەرج و خانەکان بۆ هەر جۆرێک دیاری بکەیت')}</p>
          <a href="/admin/print-settings" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a2744] text-white rounded-xl font-semibold hover:bg-[#2a3f6e] transition-colors">
            <Printer className="w-5 h-5" />
            {L('فتح إعدادات الطباعة', 'کردنەوەی ڕێکخستنەکانی پرینت')}
          </a>
        </div>
      )}

      <div className="mt-6 flex gap-3 items-center">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2 px-6"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? L('تم الحفظ!', 'پاشەکەوتکرا!') : L('حفظ الإعدادات', 'پاشەکەوتکردنی ڕێکخستنەکان')}
        </Button>
        {saved && <span className="text-green-600 text-sm font-medium">✓</span>}
      </div>
    </div>
  );
}