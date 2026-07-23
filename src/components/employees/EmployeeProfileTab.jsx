import React, { useState, useRef } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Save, User, Phone, Mail, Briefcase, Calendar, MapPin, CreditCard, Users, DollarSign } from 'lucide-react';

const GENDERS = ['ذكر', 'أنثى'];

function SectionCard({ title, icon: Icon, color = 'blue', children }) {
  const colors = {
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-200/60',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-200/60',
    green: 'from-green-500/10 to-green-500/5 border-green-200/60',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-200/60',
  };
  const iconColors = { blue: 'text-blue-600 bg-blue-100', purple: 'text-purple-600 bg-purple-100', green: 'text-green-600 bg-green-100', amber: 'text-amber-600 bg-amber-100' };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors[color]} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

export default function EmployeeProfileTab({ employee, onUpdate }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [form, setForm] = useState({ ...employee });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, photo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await firebaseApi.entities.Employee.update(employee.id, form);
    onUpdate(form);
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Photo + identity strip */}
      <div className="bg-gradient-to-l from-primary/8 to-primary/3 border border-primary/20 rounded-2xl p-5 flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted border-2 border-primary/30 shadow-md flex items-center justify-center">
            {form.photo_url
              ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
              : <User className="w-9 h-9 text-muted-foreground" />}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-2 -left-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            {uploading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-lg text-foreground">{form.full_name || L('الاسم', 'ناو')}</h3>
          <p className="text-primary text-sm font-medium">{form.position || L('لا يوجد منصب', 'پۆست نییە')}</p>
          {form.department && <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{form.department}</span>}
        </div>
      </div>

      {/* Basic Info */}
      <SectionCard title={L('المعلومات الأساسية', 'زانیارییە سەرەکییەکان')} icon={User} color="blue">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'full_name', label: L('الاسم (عربي)', 'ناو (عەرەبی)') },
            { key: 'full_name_ku', label: L('الاسم (كردي)', 'ناو (کوردی)') },
            { key: 'nationality', label: L('الجنسية', 'نەتەوە') },
            { key: 'id_number', label: L('رقم الهوية', 'ژمارەی ناسنامە') },
            { key: 'birth_date', label: L('تاريخ الميلاد', 'بەرواری لەدایکبوون'), type: 'date' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
              <Input type={type || 'text'} value={form[key] || ''} onChange={e => set(key, e.target.value)} className="bg-white/70" />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('الجنس', 'جنس')}</label>
            <select value={form.gender || ''} onChange={e => set('gender', e.target.value)} className="w-full h-9 rounded-md border border-input bg-white/70 px-3 text-sm">
              <option value="">{L('اختر...', 'هەڵبژێرە...')}</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Work Info */}
      <SectionCard title={L('المعلومات الوظيفية', 'زانیارییەکانی کار')} icon={Briefcase} color="purple">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'position', label: L('المنصب (عربي)', 'پۆست (عەرەبی)') },
            { key: 'position_ku', label: L('المنصب (كردي)', 'پۆست (کوردی)') },
            { key: 'department', label: L('القسم', 'بەش') },
            { key: 'hire_date', label: L('تاريخ التعيين', 'بەرواری دامەزراندن'), type: 'date' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
              <Input type={type || 'text'} value={form[key] || ''} onChange={e => set(key, e.target.value)} className="bg-white/70" />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Contact & Financial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SectionCard title={L('التواصل', 'پەیوەندی')} icon={Phone} color="green">
          <div className="space-y-3">
            {[
              { key: 'phone', label: L('الهاتف', 'تەلەفۆن') },
              { key: 'email', label: L('البريد', 'ئیمەیڵ') },
              { key: 'address', label: L('العنوان', 'ناونیشان') },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
                <Input value={form[key] || ''} onChange={e => set(key, e.target.value)} className="bg-white/70" />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={L('المالية', 'داراییەکان')} icon={DollarSign} color="amber">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('الراتب (د.ع)', 'مووچە (د.ع)')}</label>
              <Input type="number" value={form.salary || ''} onChange={e => set('salary', e.target.value)} className="bg-white/70" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">{L('ملاحظات', 'تێبینی')}</label>
              <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} className="w-full rounded-md border border-input bg-white/70 px-3 py-2 text-sm resize-none" />
            </div>
          </div>
        </SectionCard>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto gap-2 h-11 text-base shadow-md">
        <Save className="w-4 h-4" />
        {saving ? L('جاري الحفظ...', 'پاشەکەوتدەکرێ...') : L('حفظ التعديلات', 'پاشەکەوتکردن')}
      </Button>
    </div>
  );
}