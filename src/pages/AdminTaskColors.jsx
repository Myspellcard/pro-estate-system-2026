import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Trash2, Edit2, Save, X, Palette, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_COLORS = [
  { color: '#6366f1', label: { ar: 'إدارة', ku: 'بەڕێوەبردن' } },
  { color: '#3b82f6', label: { ar: 'عام', ku: 'گشتی' } },
  { color: '#22c55e', label: { ar: 'مالية', ku: 'دارایی' } },
  { color: '#f59e0b', label: { ar: 'صيانة', ku: 'چاککردنەوە' } },
  { color: '#ef4444', label: { ar: 'عاجل', ku: 'پەلە' } },
  { color: '#ec4899', label: { ar: 'تسويق', ku: 'بازاڕگەری' } },
  { color: '#8b5cf6', label: { ar: 'تطوير', ku: 'گەشەپێدان' } },
  { color: '#14b8a6', label: { ar: 'عقود', ku: 'گرێبەستەکان' } },
  { color: '#f97316', label: { ar: 'متابعة', ku: 'دواییکەوتن' } },
];

const emptyForm = { color: '#6366f1', label_ar: '', label_ku: '' };

export default function AdminTaskColors() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState(emptyForm);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => firebaseApi.auth.me(),
  });

  const { data: colors = [] } = useQuery({
    queryKey: ['task-colors'],
    queryFn: () => firebaseApi.entities.TaskColor?.list() || Promise.resolve([]),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.TaskColor.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['task-colors']);
      setShowAddForm(false);
      setNewForm(emptyForm);
      toast.success(L('تم إضافة اللون', 'رەنگ زیاد کرا'));
    },
    onError: (err) => toast.error(err.message || L('حدث خطأ', 'هەڵەیەک ڕوویدا')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.TaskColor.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['task-colors']);
      setEditingId(null);
      setEditForm(emptyForm);
      toast.success(L('تم التحديث', 'نوێکردنەوە تەواو بوو'));
    },
    onError: (err) => toast.error(err.message || L('حدث خطأ', 'هەڵەیەک ڕوویدا')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.TaskColor.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['task-colors']);
      toast.success(L('تم الحذف', 'سڕینەوە تەواو بوو'));
    },
    onError: (err) => toast.error(err.message || L('حدث خطأ', 'هەڵەیەک ڕوویدا')),
  });

  const handleAdd = () => {
    if (!newForm.color || !newForm.label_ar || !newForm.label_ku) {
      toast.error(L('يرجى ملء جميع الحقول', 'تکایە هەموو بۆشاییەکان پڕ بکەرەوە'));
      return;
    }
    createMutation.mutate({
      color: newForm.color,
      label_ar: newForm.label_ar,
      label_ku: newForm.label_ku,
      is_active: true,
    });
  };

  const handleUpdate = () => {
    if (!editForm.color || !editForm.label_ar || !editForm.label_ku) {
      toast.error(L('يرجى ملء جميع الحقول', 'تکایە هەموو بۆشاییەکان پڕ بکەرەوە'));
      return;
    }
    updateMutation.mutate({
      id: editingId,
      data: {
        color: editForm.color,
        label_ar: editForm.label_ar,
        label_ku: editForm.label_ku,
      },
    });
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({ color: c.color, label_ar: c.label_ar, label_ku: c.label_ku });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{L('غير مسموح', 'ڕێگەپێنەدراو')}</h2>
          <p className="text-slate-600">{L('هذه الصفحة متاحة فقط للمديرين', 'ئەم پەڕەیە تەنها بۆ بەڕێوەبەرانە')}</p>
        </div>
      </div>
    );
  }

  const displayColors = colors.length > 0 ? colors : DEFAULT_COLORS.map((c, i) => ({
    id: `default-${i}`,
    color: c.color,
    label_ar: c.label.ar,
    label_ku: c.label.ku,
    is_default: true,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{L('ألوان المهام', 'رەنگەکانی ئەرک')}</h1>
          </div>
          <p className="text-slate-600">{L('إدارة معاني ألوان المهام', 'بەڕێوەبردنی واتاکانی ڕەنگی ئەرک')}</p>
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {L('إضافة لون جديد', 'رەنگی نوێ زیاد بکە')}
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800">{L('إضافة لون جديد', 'رەنگی نوێ زیاد بکە')}</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">{L('اللون', 'رەنگ')}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newForm.color}
                    onChange={(e) => setNewForm(p => ({ ...p, color: e.target.value }))}
                    className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <Input
                    value={newForm.color}
                    onChange={(e) => setNewForm(p => ({ ...p, color: e.target.value }))}
                    className="flex-1"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">{L('التسمية (عربي)', 'ناونیشان (عەرەبی)')}</label>
                <Input
                  value={newForm.label_ar}
                  onChange={(e) => setNewForm(p => ({ ...p, label_ar: e.target.value }))}
                  placeholder="إدارة"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">{L('التسمية (كردي)', 'ناونیشان (کوردی)')}</label>
                <Input
                  value={newForm.label_ku}
                  onChange={(e) => setNewForm(p => ({ ...p, label_ku: e.target.value }))}
                  placeholder="بەڕێوەبردن"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAdd} disabled={createMutation.isPending} className="flex-1">
                  {createMutation.isPending ? L('جاري الإضافة...', 'زیادکردن...') : L('إضافة', 'زیادکردن')}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  {L('إلغاء', 'پاشگەزبوونەوە')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Colors List */}
        <div className="space-y-3">
          {displayColors.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl shadow-md shrink-0" style={{ background: c.color }} />
              
              {editingId === c.id ? (
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm(p => ({ ...p, color: e.target.value }))}
                      className="w-8 h-8 rounded border border-slate-300"
                    />
                    <Input
                      value={editForm.color}
                      onChange={(e) => setEditForm(p => ({ ...p, color: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <Input
                    value={editForm.label_ar}
                    onChange={(e) => setEditForm(p => ({ ...p, label_ar: e.target.value }))}
                    placeholder={L('عربي', 'عەرەبی')}
                    className="h-8"
                  />
                  <Input
                    value={editForm.label_ku}
                    onChange={(e) => setEditForm(p => ({ ...p, label_ku: e.target.value }))}
                    placeholder={L('كردي', 'کوردی')}
                    className="h-8"
                  />
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">{L('عربي', 'عەرەبی')}</p>
                    <p className="font-semibold text-slate-800">{c.label_ar}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">{L('كردي', 'کوردی')}</p>
                    <p className="font-semibold text-slate-800">{c.label_ku}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editingId === c.id ? (
                  <>
                    <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm(emptyForm); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!c.is_default && (
                      <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {displayColors.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <Palette className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">{L('لا توجد ألوان مخصصة', 'هیچ ڕەنگێکی تایبەت نییە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}