import React, { useState } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ClipboardList, Save, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['مكتمل', 'جاري', 'معلق'];
const statusConfig = {
  'مكتمل': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', pill: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  'جاري': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', pill: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  'معلق': { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', pill: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
};

export default function EmployeeRequirementsTab({ employee, onUpdate }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [reqs, setReqs] = useState(employee.company_requirements || []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', status: 'معلق', due_date: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const addReq = () => {
    if (!form.title.trim()) return;
    setReqs(p => [...p, { ...form }]);
    setForm({ title: '', status: 'معلق', due_date: '', notes: '' });
    setShowForm(false);
  };

  const updateStatus = (i, status) => setReqs(p => p.map((r, idx) => idx === i ? { ...r, status } : r));
  const removeReq = (i) => setReqs(p => p.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    await firebaseApi.entities.Employee.update(employee.id, { company_requirements: reqs });
    onUpdate({ ...employee, company_requirements: reqs });
    setSaving(false);
  };

  const stats = {
    total: reqs.length,
    done: reqs.filter(r => r.status === 'مكتمل').length,
    inProgress: reqs.filter(r => r.status === 'جاري').length,
    pending: reqs.filter(r => r.status === 'معلق').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-violet-500/10 to-violet-500/5 border border-violet-200/60 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{L('متطلبات الشركة', 'پێداویستییەکانی کۆمپانیا')}</h3>
            <p className="text-xs text-muted-foreground">{stats.total} {L('متطلب', 'پێداویستی')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />{L('إضافة', 'زیادکردن')}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md">
            <Save className="w-4 h-4" />{saving ? L('حفظ...', 'پاشەکەوتدەکرێ...') : L('حفظ', 'پاشەکەوتکردن')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: L('المجموع', 'کۆی گشتی'), val: stats.total, color: 'text-foreground', bg: 'bg-muted/50 border-border' },
              { label: L('مكتمل', 'تەواوبوو'), val: stats.done, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              { label: L('جاري', 'بەردەوامە'), val: stats.inProgress, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
              { label: L('معلق', 'چاوەڕوان'), val: stats.pending, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
            ].map(s => (
              <div key={s.label} className={`border rounded-2xl p-3 text-center ${s.bg}`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-medium">{L('التقدم', 'پێشکەوتن')}</span>
              <span className="font-bold text-green-600">{Math.round((stats.done / stats.total) * 100)}%</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Add form inline */}
      {showForm && (
        <div className="border-2 border-violet-200 bg-violet-50/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-violet-700">{L('متطلب جديد', 'پێداویستییەکی نوێ')}</p>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-violet-100"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <Input placeholder={L('عنوان المتطلب', 'ناونیشانی پێداویستی')} value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} className="bg-white" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value}))} className="h-9 rounded-md border border-input bg-white px-3 text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input type="date" value={form.due_date} onChange={e => setForm(p=>({...p,due_date:e.target.value}))} className="bg-white" />
          </div>
          <Input placeholder={L('ملاحظات', 'تێبینی')} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} className="bg-white" />
          <div className="flex gap-2">
            <Button onClick={addReq} disabled={!form.title} size="sm" className="gap-1.5">{L('إضافة', 'زیادکردن')}</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)} size="sm">{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {reqs.map((req, i) => {
          const cfg = statusConfig[req.status] || statusConfig['معلق'];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`border-2 rounded-2xl p-4 flex items-start gap-3 transition-all hover:shadow-sm ${cfg.bg}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white shadow-sm`}>
                <Icon className={`w-5 h-5 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{req.title}</p>
                {req.notes && <p className="text-xs text-muted-foreground mt-0.5">{req.notes}</p>}
                {req.due_date && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{L('موعد الإنجاز:', 'کاتی تەواوکردن:')} {format(new Date(req.due_date), 'dd/MM/yyyy')}
                </p>}
                <div className="flex gap-1.5 mt-2.5">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(i, s)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${req.status === s ? `${statusConfig[s].pill} shadow-sm` : 'bg-white/70 text-muted-foreground hover:bg-white'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => removeReq(i)} className="p-1.5 rounded-lg hover:bg-white/70 text-muted-foreground hover:text-destructive shrink-0 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {reqs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-8 h-8 text-violet-300" />
            </div>
            <p className="font-medium">{L('لا توجد متطلبات بعد', 'هیچ پێداویستییەک نییە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}