import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { QrCode, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DOC_TYPES = [
  { key: 'rental_permission', ar: 'مۆڵەتی کرێ',              ku: 'مۆڵەتی کرێ',              icon: '📄' },
  { key: 'rent_contract',     ar: 'عقد الإيجار والفواتير',    ku: 'گرێبەستی کرێ و پسوولەکان', icon: '📋' },
  { key: 'sale_contract',     ar: 'عقد البيع',                ku: 'گرێبەستی فرۆشتن',         icon: '🏠' },
];

const emptyForm = {
  doc_type: 'rental_permission',
  status_key: '',
  title_ar: '',
  title_ku: '',
  description_ar: '',
  description_ku: '',
  icon: '✅',
  color: '#10b981',
  order: 0,
  is_active: true,
};

export default function AdminBarcodeStatuses() {
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('rental_permission');

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['barcode_statuses'],
    queryFn: () => firebaseApi.entities.BarcodeStatus.list('order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.BarcodeStatus.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['barcode_statuses'] }); setSaved(true); setTimeout(() => setSaved(false), 2000); setForm(emptyForm); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.BarcodeStatus.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['barcode_statuses'] }); setSaved(true); setTimeout(() => setSaved(false), 2000); setEditing(null); setForm(emptyForm); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.BarcodeStatus.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['barcode_statuses'] }); },
  });

  const handleSubmit = () => {
    if (!form.status_key || !form.title_ar || !form.title_ku) return;
    if (editing) { updateMutation.mutate({ id: editing.id, data: form }); }
    else { createMutation.mutate(form); }
  };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({ doc_type: s.doc_type, status_key: s.status_key, title_ar: s.title_ar, title_ku: s.title_ku, description_ar: s.description_ar || '', description_ku: s.description_ku || '', icon: s.icon || '✅', color: s.color || '#10b981', order: s.order || 0, is_active: s.is_active !== false });
    setShowForm(true);
  };

  const filtered = statuses.filter(s => s.doc_type === activeTab);

  if (isLoading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#2a3f6e] flex items-center justify-center shadow-lg">
            <QrCode className="w-6 h-6 text-[#e8b748]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a2744]">{L('إدارة حالات الباركود', 'بەڕێوەبردنی دۆخەکانی بارکۆد')}</h1>
            <p className="text-sm text-gray-500">{L('الحالات التي تظهر عند مسح رمز QR', 'دۆخەکانی دەردەکەون کاتی سکانکردنی QR')}</p>
          </div>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm, doc_type: activeTab }); setEditing(null); setShowForm(true); }} className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2">
          <Plus className="w-4 h-4" />
          {L('إضافة حالة', 'زیادکردنی دۆخ')}
        </Button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          ✓ {L('تم الحفظ', 'پاشەکەوتکرا')}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-[#1a2744]">{editing ? L('تعديل', 'دەستکاریکردن') : L('إضافة حالة جديدة', 'دۆخێکی نوێ زیاد بکە')}</h2>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('نوع المستند', 'جۆری بەڵگە')}</label>
              <select value={form.doc_type} onChange={e => setForm({ ...form, doc_type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                {DOC_TYPES.map(dt => <option key={dt.key} value={dt.key}>{L(dt.ar, dt.ku)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('مفتاح الحالة', 'کلیلی دۆخ')} *</label>
              <Input value={form.status_key} onChange={e => setForm({ ...form, status_key: e.target.value })} placeholder="under_processing, verified..." dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('العنوان (عربي)', 'سەرناو (عەرەبی)')} *</label>
              <Input value={form.title_ar} onChange={e => setForm({ ...form, title_ar: e.target.value })} dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('العنوان (كردي)', 'سەرناو (کوردی)')} *</label>
              <Input value={form.title_ku} onChange={e => setForm({ ...form, title_ku: e.target.value })} dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('الوصف (عربي)', 'وەسف (عەرەبی)')}</label>
              <Input value={form.description_ar} onChange={e => setForm({ ...form, description_ar: e.target.value })} dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('الوصف (كردي)', 'وەسف (کوردی)')}</label>
              <Input value={form.description_ku} onChange={e => setForm({ ...form, description_ku: e.target.value })} dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('الأيقونة', 'ئایکۆن')}</label>
              <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{L('اللون', 'ڕەنگ')}</label>
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer" />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
            <Button onClick={handleSubmit} disabled={!form.status_key || !form.title_ar || !form.title_ku} className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2">
              <Save className="w-4 h-4" />
              {L('حفظ', 'پاشەکەوتکردن')}
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {DOC_TYPES.map(dt => (
          <button key={dt.key} onClick={() => setActiveTab(dt.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${activeTab === dt.key ? 'bg-[#1a2744] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {dt.icon} {L(dt.ar, dt.ku)}
          </button>
        ))}
      </div>

      {/* Status list */}
      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex items-stretch">
            {/* Color stripe */}
            <div className="w-2 flex-shrink-0" style={{ background: s.color || '#10b981' }} />
            <div className="flex-1 px-4 py-3 flex items-center gap-4">
              <span className="text-2xl">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#1a2744]">{s.title_ku}</span>
                  <span className="text-gray-400 text-sm">/ {s.title_ar}</span>
                  <code className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{s.status_key}</code>
                </div>
                {(s.description_ku || s.description_ar) && (
                  <p className="text-xs text-gray-500 mt-0.5">{s.description_ku || s.description_ar}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleEdit(s)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => { if (confirm(L('حذف هذه الحالة؟', 'ئەم دۆخە بسڕیتەوە؟'))) deleteMutation.mutate(s.id); }}
                  className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{L('لا توجد حالات لهذا المستند', 'هیچ دۆخێک بۆ ئەم بەڵگەیە نییە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}