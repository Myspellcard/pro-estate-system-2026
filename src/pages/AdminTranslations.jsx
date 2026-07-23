import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit2, Trash2, Save, X, Languages, Navigation, ScanSearch, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', ar: 'الكل', ku: 'هەموو' },
  { value: 'navigation', ar: 'التنقل', ku: 'ناڤیگەیشن' },
  { value: 'dashboard', ar: 'لوحة التحكم', ku: 'داشبۆرد' },
  { value: 'contracts', ar: 'العقود', ku: 'گرێبەستەکان' },
  { value: 'invoices', ar: 'الفواتير', ku: 'پسووڵەکان' },
  { value: 'properties', ar: 'العقارات', ku: 'خانووبەرەکان' },
  { value: 'tenants', ar: 'المستأجرون', ku: 'بەکرێگیراوەکان' },
  { value: 'employees', ar: 'الموظفون', ku: 'کارمەندەکان' },
  { value: 'tasks', ar: 'المهام', ku: 'ئەرکەکان' },
  { value: 'goals', ar: 'الأهداف', ku: 'ئامانجەکان' },
  { value: 'reports', ar: 'التقارير', ku: 'ڕاپۆرتەکان' },
  { value: 'admin', ar: 'الإدارة', ku: 'بەڕێوەبردن' },
  { value: 'general', ar: 'عام', ku: 'گشتی' },
  { value: 'buttons', ar: 'الأزرار', ku: 'دوگمەکان' },
  { value: 'status', ar: 'الحالات', ku: 'دۆخەکان' },
];

const CATEGORY_COLORS = {
  navigation: 'bg-blue-100 text-blue-700',
  dashboard: 'bg-purple-100 text-purple-700',
  contracts: 'bg-green-100 text-green-700',
  invoices: 'bg-amber-100 text-amber-700',
  properties: 'bg-orange-100 text-orange-700',
  tenants: 'bg-pink-100 text-pink-700',
  employees: 'bg-indigo-100 text-indigo-700',
  tasks: 'bg-cyan-100 text-cyan-700',
  goals: 'bg-teal-100 text-teal-700',
  reports: 'bg-rose-100 text-rose-700',
  admin: 'bg-red-100 text-red-700',
  general: 'bg-slate-100 text-slate-700',
  buttons: 'bg-lime-100 text-lime-700',
  status: 'bg-violet-100 text-violet-700',
};

const emptyForm = { key: '', ar: '', ku: '', category: 'general' };

export default function AdminTranslations() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [highlightedId, setHighlightedId] = useState(null);
  const [missingKeys, setMissingKeys] = useState(null); // null = not scanned yet
  const [scanning, setScanning] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const rowRefs = useRef({});

  const scrollToRow = useCallback((id) => {
    setHighlightedId(id);
    setTimeout(() => {
      const el = rowRefs.current[id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    setTimeout(() => setHighlightedId(null), 2500);
  }, []);

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ['translations'],
    queryFn: () => firebaseApi.entities.Translation.list('-created_date', 5000),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? firebaseApi.entities.Translation.update(editing.id, data)
      : firebaseApi.entities.Translation.create(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['translations'] });
      setShowForm(false);
      const savedId = editing ? editing.id : result?.id;
      setEditing(null);
      setForm(emptyForm);
      // scroll to the saved row after data refreshes
      if (savedId) setTimeout(() => scrollToRow(savedId), 400);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Translation.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['translations'] }),
  });

  const openEdit = (t) => {
    setEditing(t);
    setForm({ key: t.key, ar: t.ar, ku: t.ku, category: t.category || 'general' });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const filtered = translations.filter(t => {
    const matchCat = filterCat === 'all' || t.category === filterCat;
    const q = search.toLowerCase();
    const matchSearch = !q || t.key?.toLowerCase().includes(q) || t.ar?.includes(q) || t.ku?.includes(q);
    return matchCat && matchSearch;
  });

  const getCatLabel = (val) => {
    const c = CATEGORIES.find(c => c.value === val);
    return c ? L(c.ar, c.ku) : val;
  };

  const scanMissingKeys = async () => {
    setScanning(true);
    try {
      const res = await firebaseApi.functions.invoke('getSourceFiles', {});
      const files = res.data?.files || {};
      const found = new Map(); // key -> { ar, ku }
      const tRegex = /T\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]*)['"`]\s*,\s*['"`]([^'"`]*)['"`]/g;
      Object.values(files).forEach(content => {
        let m;
        while ((m = tRegex.exec(content)) !== null) {
          if (!found.has(m[1])) found.set(m[1], { ar: m[2], ku: m[3] });
        }
      });
      const existingKeys = new Set(translations.map(t => t.key));
      const missing = [];
      found.forEach((vals, key) => {
        if (!existingKeys.has(key)) missing.push({ key, ...vals });
      });
      setMissingKeys(missing);
      setShowMissing(true);
    } finally {
      setScanning(false);
    }
  };

  const addMissingKey = (item) => {
    const category = item.key.split('.')[0];
    const validCats = CATEGORIES.map(c => c.value);
    saveMutation.mutate({
      key: item.key,
      ar: item.ar,
      ku: item.ku,
      category: validCats.includes(category) ? category : 'general',
    });
    setMissingKeys(prev => prev.filter(k => k.key !== item.key));
  };

  return (
    <div className="p-4 lg:p-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{L('إدارة الترجمات', 'بەڕێوەبردنی وەرگێڕان')}</h1>
            <p className="text-sm text-slate-500">{L(`${translations.length} نص مسجل`, `${translations.length} دەق تۆمارکراوە`)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={scanMissingKeys} disabled={scanning} variant="outline" className="rounded-xl font-bold gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            {L('فحص المفاتيح الناقصة', 'کلیلە کەمبووەکان بپشکنە')}
            {missingKeys && missingKeys.length > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{missingKeys.length}</span>
            )}
          </Button>
          <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-2">
            <Plus className="w-4 h-4" />
            {L('إضافة نص', 'زیادکردنی دەق')}
          </Button>
        </div>
      </div>

      {/* Missing Keys Panel */}
      {showMissing && missingKeys !== null && (
        <Card className="border-2 border-amber-200 bg-amber-50 shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {missingKeys.length === 0
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              <CardTitle className="text-base text-amber-800">
                {missingKeys.length === 0
                  ? L('✅ جميع المفاتيح مسجلة', '✅ هەموو کلیلەکان تۆمارکراون')
                  : L(`${missingKeys.length} مفتاح ناقص`, `${missingKeys.length} کلیلی کەم`)}
              </CardTitle>
            </div>
            <button onClick={() => setShowMissing(false)} className="text-amber-500 hover:text-amber-700">
              <X className="w-4 h-4" />
            </button>
          </CardHeader>
          {missingKeys.length > 0 && (
            <CardContent className="pt-0 max-h-72 overflow-y-auto space-y-2">
              {missingKeys.map(item => (
                <div key={item.key} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-amber-200">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-slate-500">{item.key}</div>
                    <div className="text-sm text-slate-700 truncate">{item.ar} / {item.ku}</div>
                  </div>
                  <Button size="sm" onClick={() => addMissingKey(item)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0">
                    <Plus className="w-3 h-3" /> {L('إضافة', 'زیادکردن')}
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-2 border-indigo-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editing ? L('تعديل النص', 'دەستکاریکردنی دەق') : L('إضافة نص جديد', 'زیادکردنی دەقی نوێ')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">{L('المفتاح (key)', 'کلیل (key)')}</label>
                <Input
                  value={form.key}
                  onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                  placeholder="e.g. nav.contracts"
                  className="font-mono text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">{L('التصنيف', 'جۆر')}</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <option key={c.value} value={c.value}>{L(c.ar, c.ku)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">🇸🇦 {L('النص العربي', 'دەقی عەرەبی')}</label>
                <Input
                  value={form.ar}
                  onChange={e => setForm(f => ({ ...f, ar: e.target.value }))}
                  placeholder={L('النص بالعربية', 'دەقی عەرەبی')}
                  dir="rtl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">🏴 {L('النص الكردي', 'دەقی کوردی')}</label>
                <Input
                  value={form.ku}
                  onChange={e => setForm(f => ({ ...f, ku: e.target.value }))}
                  placeholder={L('النص بالكردية', 'دەقی کوردی')}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>
                <X className="w-4 h-4" /> {L('إلغاء', 'هەڵوەشاندنەوە')}
              </Button>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={!form.key || !form.ar || !form.ku || saveMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Save className="w-4 h-4" /> {L('حفظ', 'پاشەکەوتکردن')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={L('بحث...', 'گەڕان...')}
            className="pr-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilterCat(c.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                filterCat === c.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {L(c.ar, c.ku)}
            </button>
          ))}
        </div>
      </div>

      {/* Translations Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">{L('جاري التحميل...', 'داتا دەگیرێتەوە...')}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Languages className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{L('لا توجد نصوص مسجلة', 'هیچ دەقێک تۆمارنەکراوە')}</p>
        </div>
      ) : (
        <Card className="shadow border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-right px-4 py-3 font-bold text-slate-600 w-8">#</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-600">{L('المفتاح', 'کلیل')}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-600">🇸🇦 {L('العربية', 'عەرەبی')}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-600">🏴 {L('الكردية', 'کوردی')}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-600">{L('التصنيف', 'جۆر')}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-600 w-20">{L('إجراءات', 'کردارەکان')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    ref={el => rowRefs.current[t.id] = el}
                    className={`border-b transition-colors ${highlightedId === t.id ? 'bg-indigo-50 ring-2 ring-indigo-400 ring-inset' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.key}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.ar}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.ku}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${CATEGORY_COLORS[t.category] || 'bg-slate-100 text-slate-600'}`}>
                        {getCatLabel(t.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => scrollToRow(t.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title={L('الذهاب إليه', 'بڕۆ بۆ ئەوێ')}>
                          <Navigation className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}