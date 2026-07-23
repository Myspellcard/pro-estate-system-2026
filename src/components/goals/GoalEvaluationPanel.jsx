import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, ChevronUp, Star, CheckCircle2, Clock, Edit2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function GoalEvaluationPanel({ goal, canEvaluate, onUpdate }) {
  const { lang, T } = useLanguage();
  const { user } = useAuth();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    mark: goal.current_score || 0,
    note: goal.evaluation_note || '',
    status: goal.status || 'active',
    level: goal.current_level || 1,
    levelScores: goal.level_scores || [],
  });

  const levels = goal.levels || [];
  const maxLevelCount = levels.length || 1;
  const targetScore = goal.target_score || 100;

  const getLevelForScore = (score) => {
    if (!levels.length) return 1;
    let lvl = 1;
    for (let i = 0; i < levels.length; i++) {
      if (score >= levels[i].required_score) lvl = levels[i].level_number;
    }
    return lvl;
  };

  const handleLevelScoreChange = (levelIdx, score) => {
    const maxScore = levels[levelIdx]?.max_score || 20;
    const newScore = Math.max(0, Math.min(parseInt(score) || 0, maxScore));
    const newLevelScores = [...(form.levelScores || [])];
    while (newLevelScores.length <= levelIdx) newLevelScores.push(0);
    newLevelScores[levelIdx] = newScore;
    
    const totalMark = newLevelScores.reduce((sum, s) => sum + s, 0);
    
    setForm(f => ({ ...f, levelScores: newLevelScores, mark: totalMark }));
  };

  const canAdvanceToNextLevel = () => {
    const currentLevelIdx = form.level - 1;
    const currentLevelMax = levels[currentLevelIdx]?.max_score || 20;
    const currentLevelScore = form.levelScores?.[currentLevelIdx] || 0;
    return currentLevelScore >= (currentLevelMax * 0.6);
  };

  const handleMarkChange = (val) => {
    const mark = Math.max(0, parseInt(val) || 0);
    const autoLevel = getLevelForScore(mark);
    setForm(f => ({ ...f, mark, level: autoLevel }));
  };

  const handlePromoteLevel = () => {
    const mark = form.mark || 0;
    const calculatedLevel = getLevelForScore(mark);
    setForm(f => ({ ...f, level: calculatedLevel }));
  };

  const totalMaxScore = levels.reduce((sum, lvl) => sum + (lvl.max_score || 20), 0);
  const achievedPercentage = (form.mark / totalMaxScore) * 100;

  const handleSave = () => {
    let newStatus = form.status;
    if (achievedPercentage >= 60) {
      newStatus = 'completed';
    }
    
    onUpdate({
      current_score: form.mark,
      current_level: form.level,
      status: newStatus,
      level_scores: form.levelScores,
      evaluation_note: form.note,
      evaluated_by: user?.full_name || T('general.unknown', 'مجهول', 'نەناسراو'),
      evaluated_at: new Date().toISOString(),
    });
    setEditing(false);
    toast.success(T('goals.eval_saved', 'تم حفظ التقييم', 'هەلسەنگاندن پاشەکەوتکرا'));
  };

  const progress = Math.min(((goal.current_score || 0) / targetScore) * 100, 100);

  const statusConfig = {
    active: { label: T('goals.status_active', 'نشط', 'چالاک'), color: 'bg-blue-100 text-blue-700 border-blue-300' },
    completed: { label: T('goals.status_completed', 'مكتمل', 'تەواوبوو'), color: 'bg-green-100 text-green-700 border-green-300' },
    cancelled: { label: T('goals.status_cancelled', 'ملغي', 'هەڵوەشاوە'), color: 'bg-red-100 text-red-700 border-red-300' },
  };

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-amber-500 to-amber-600">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-white" />
          <span className="text-sm font-bold text-white">{T('goals.hr_eval_title', 'تقييم HR للهدف', 'هەلسەنگاندنی HR بۆ ئامانج')}</span>
        </div>
        {canEvaluate && !editing && (
          <button
            onClick={() => { setForm({ mark: goal.current_score || 0, note: goal.evaluation_note || '', status: goal.status || 'active', level: goal.current_level || 1, levelScores: goal.level_scores || [] }); setEditing(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {T('goals.eval_edit_btn', 'تقييم / تعديل', 'هەلسەنگاندن / گۆڕین')}
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!editing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-slate-700">{T('goals.current_score_label', 'الدرجة الحالية:', 'پلەی ئێستا:')} <span className="text-amber-600">{goal.current_score || 0}</span> / {targetScore}</span>
              </div>
              <Badge className={cn('text-xs border', statusConfig[goal.status]?.color || 'bg-gray-100 text-gray-600')}>
                {statusConfig[goal.status]?.label || goal.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {levels[goal.current_level - 1] ? (
                  <>{lang === 'ku' ? (levels[goal.current_level - 1].level_name_ku || levels[goal.current_level - 1].level_name_ar || levels[goal.current_level - 1].level_name) : (levels[goal.current_level - 1].level_name_ar || levels[goal.current_level - 1].level_name)}</>
                ) : (
                  <>{lang === 'ku' ? `ئاست ${goal.current_level || 1}` : `المستوى ${goal.current_level || 1}`}</>
                )}
              </Badge>
            </div>
            <Progress value={progress} className="h-2.5" />

            {levels.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {levels.map((lvl, idx) => {
                  const reached = (goal.current_score || 0) >= lvl.required_score;
                  const isCurrent = goal.current_level === lvl.level_number;
                  const levelName = lang === 'ku' ? (lvl.level_name_ku || lvl.level_name_ar || lvl.level_name) : (lvl.level_name_ar || lvl.level_name);
                  return (
                    <div key={idx} className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                      reached ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-slate-500 border-slate-200',
                      isCurrent && 'ring-2 ring-amber-400'
                    )}>
                      {reached ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {levelName} ({lvl.required_score})
                    </div>
                  );
                })}
              </div>
            )}

            {goal.evaluation_note && (
              <div className="bg-white rounded-xl border border-amber-200 px-3 py-2">
                <p className="text-xs text-slate-500 mb-0.5">{T('goals.eval_note_label', 'ملاحظة التقييم:', 'تێبینی هەلسەنگاندن:')}</p>
                <p className="text-sm text-slate-700">{goal.evaluation_note}</p>
              </div>
            )}

            {goal.evaluated_by && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {T('goals.last_eval_by', 'آخر تقييم بواسطة:', 'دوایین هەلسەنگاندن لەلایەن:')} <span className="font-semibold">{goal.evaluated_by}</span>
                {goal.evaluated_at && ` — ${new Date(goal.evaluated_at).toLocaleString('ar-IQ')}`}
              </p>
            )}

            {!canEvaluate && (
              <p className="text-xs text-slate-400 italic">{T('goals.no_eval_permission', 'ليس لديك صلاحية التقييم', 'ڕێگەپێدانی هەلسەنگاندنت نییە')}</p>
            )}
          </div>
        )}

        {editing && canEvaluate && (
          <div className="space-y-4">
            {levels.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{T('goals.level_scores', 'تقييم كل مستوى', 'هەلسەنگاندنی هەر ئاستێک')}</label>
                {levels.map((lvl, idx) => {
                  const levelScore = form.levelScores?.[idx] || 0;
                  const levelMax = lvl.max_score || targetScore;
                  const levelName = lang === 'ku' ? (lvl.level_name_ku || lvl.level_name_ar) : (lvl.level_name_ar || lvl.level_name);
                  return (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">{levelName}</span>
                        <span className="text-xs text-slate-400">{levelScore} / {levelMax}</span>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={levelMax}
                        value={levelScore}
                        onChange={e => handleLevelScoreChange(idx, e.target.value)}
                        className="h-8 text-sm text-center font-bold"
                        dir="ltr"
                        inputMode="numeric"
                        placeholder="0"
                      />
                      <Progress value={(levelScore / levelMax) * 100} className="h-2" />
                    </div>
                  );
                })}
                <div className={cn("border-2 rounded-xl p-3", achievedPercentage >= 60 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200")}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-700">{T('goals.total_score', 'المجموع الكلي', 'کۆی گشتی')}</span>
                    <span className={cn("text-lg font-black", achievedPercentage >= 60 ? "text-green-600" : "text-amber-600")}>{form.mark} / {totalMaxScore}</span>
                  </div>
                  <Progress value={achievedPercentage} className="h-3" />
                  <p className={cn("text-xs font-bold mt-1", achievedPercentage >= 60 ? "text-green-600" : "text-amber-600")}>
                    {achievedPercentage >= 60 
                      ? T('goals.goal_achieved', '✓ الهدف محقق', '✓ ئامانجەکە بەدەست هاتووە') 
                      : T('goals.need_60_percent', 'تحتاج 60% لتحقيق الهدف', 'پێویستت بە 60% هەیە بۆ بەدەستهێنانی ئامانجەکە')}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-800">{T('goals.current_level', 'المستوى الحالي', 'ئاستی ئێستا')}</span>
                <span className="text-lg font-black text-amber-600">{form.level} / {maxLevelCount}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, level: Math.max(1, f.level - 1) }))}
                  disabled={form.level <= 1}
                  variant="outline"
                  className="flex-1"
                >
                  ← {T('goals.prev_level', 'السابق', 'پێشوو')}
                </Button>
                <Button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, level: Math.min(maxLevelCount, f.level + 1) }))}
                  disabled={form.level >= maxLevelCount || !canAdvanceToNextLevel()}
                  variant="outline"
                  className="flex-1"
                >
                  {T('goals.next_level', 'التالي', 'دواتر')} →
                </Button>
              </div>
              <p className="text-xs text-amber-700">
                {form.level < maxLevelCount ? (
                  <>
                    {T('goals.next_level_requirement', 'يجب الحصول على 60% من درجة هذا المستوى للانتقال', 'دەبێت 60%ی پلەی ئەم ئاستە بەدەست بهێنیت بۆ چوونە ئاستی دواتر')}
                    {levels[form.level - 1] && (
                      <span className="block mt-1 font-bold">
                        {T('goals.current_level_required', 'المطلوب:', 'پێویستە:')} {Math.round((levels[form.level - 1]?.max_score || 20) * 0.6)} / {levels[form.level - 1]?.max_score || 20}
                      </span>
                    )}
                  </>
                ) : (
                  T('goals.final_level', 'هذا هو المستوى النهائي', 'ئەمە کۆتا ئاستە')
                )}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">{T('goals.goal_status', 'حالة الهدف', 'دۆخی ئامانج')}</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([val, cfg]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: val }))}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                      form.status === val ? cfg.color + ' border-current shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">{T('goals.eval_note_label', 'ملاحظة التقييم', 'تێبینی هەلسەنگاندن')}</label>
              <Textarea
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder={T('goals.eval_note_placeholder', 'أضف ملاحظة أو توضيح للتقييم...', 'تێبینی یان ڕوونکردنەوەی هەلسەنگاندن زیاد بکە...')}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 flex-1">
                <Save className="w-4 h-4" />
                {T('goals.save_eval', 'حفظ التقييم', 'پاشەکەوتکردنی هەلسەنگاندن')}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="gap-1">
                <X className="w-4 h-4" />
                {T('general.cancel', 'إلغاء', 'پاشگەز')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}