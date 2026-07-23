import React, { useState } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, TrendingUp, Save } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export default function EmployeeSkillsTab({ employee, onUpdate }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [skills, setSkills] = useState(employee.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  const addSkill = () => {
    if (!newSkill.trim()) return;
    setSkills(p => [...p, { name: newSkill.trim(), level: 50 }]);
    setNewSkill('');
  };

  const updateLevel = (i, val) => setSkills(p => p.map((s, idx) => idx === i ? { ...s, level: Number(val) } : s));
  const removeSkill = (i) => setSkills(p => p.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    await firebaseApi.entities.Employee.update(employee.id, { skills });
    onUpdate({ ...employee, skills });
    setSaving(false);
  };

  const radarData = skills.map(s => ({ subject: s.name, value: s.level }));
  const levelColor = (l) => l >= 80 ? '#10b981' : l >= 60 ? '#3b82f6' : l >= 40 ? '#f59e0b' : '#ef4444';
  const levelLabel = (l) => {
    if (l >= 80) return L('متقدم', 'پیشکەوتوو');
    if (l >= 60) return L('جيد', 'باش');
    if (l >= 40) return L('متوسط', 'مامناوەند');
    return L('مبتدئ', 'دەستپێکەر');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-cyan-500/10 to-cyan-500/5 border border-cyan-200/60 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{L('المهارات والتطوير', 'توانایەکان و گەشەسەندن')}</h3>
            <p className="text-xs text-muted-foreground">{skills.length} {L('مهارة', 'توانایە')}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md">
          <Save className="w-4 h-4" />{saving ? L('حفظ...', 'پاشەکەوتدەکرێ...') : L('حفظ', 'پاشەکەوتکردن')}
        </Button>
      </div>

      {/* Radar chart */}
      {radarData.length >= 3 && (
        <div className="border border-border rounded-2xl p-4 bg-gradient-to-br from-cyan-50/50 to-blue-50/50">
          <p className="text-sm font-semibold text-center text-muted-foreground mb-3">{L('مخطط المهارات', 'چارتی توانایەکان')}</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
              <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} />
              <Tooltip formatter={(v) => [`${v}%`, L('المستوى', 'ئاست')]} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add skill */}
      <div className="flex gap-2">
        <Input
          value={newSkill}
          onChange={e => setNewSkill(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSkill()}
          placeholder={L('اسم المهارة الجديدة...', 'ناوی توانایەی نوێ...')}
          className="flex-1"
        />
        <Button onClick={addSkill} className="gap-2 shrink-0 shadow-sm">
          <Plus className="w-4 h-4" />{L('إضافة', 'زیادکردن')}
        </Button>
      </div>

      {/* Skills list */}
      <div className="space-y-3">
        {skills.map((skill, i) => (
          <div key={i} className="border border-border rounded-2xl p-4 bg-card hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm">{skill.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: levelColor(skill.level) + '22', color: levelColor(skill.level) }}>
                  {levelLabel(skill.level)}
                </span>
                <span className="text-base font-bold" style={{ color: levelColor(skill.level) }}>{skill.level}%</span>
                <button onClick={() => removeSkill(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                <div className="h-full rounded-full transition-all" style={{ width: `${skill.level}%`, background: `linear-gradient(90deg, ${levelColor(skill.level)}cc, ${levelColor(skill.level)})` }} />
              </div>
              <input
                type="range" min={0} max={100} value={skill.level}
                onChange={e => updateLevel(i, e.target.value)}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-3"
              />
            </div>
          </div>
        ))}
        {skills.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-8 h-8 text-cyan-300" />
            </div>
            <p className="font-medium">{L('لا توجد مهارات بعد', 'هیچ توانایەک نییە')}</p>
            <p className="text-xs mt-1">{L('أضف مهارة أعلاه', 'لەسەرەوە زیاد بکە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}