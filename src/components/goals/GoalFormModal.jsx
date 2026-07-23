import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/context/LanguageContext';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import RichDescriptionEditor from '@/components/tasks/RichDescriptionEditor';
import {
  X, Target, Users, Calendar, BarChart3, User, Layers,
  ChevronRight, Save, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GoalFormModal({ open, onClose, editingGoal, employees, groups, onSubmit, isSaving }) {
  const { lang, T } = useLanguage();

  const [goalType, setGoalType] = useState('individual');
  const [levelCount, setLevelCount] = useState(3);
  const [levelScores, setLevelScores] = useState([20, 30, 50]);
  const [employeeId, setEmployeeId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [title, setTitle] = useState('');
  const [titleKu, setTitleKu] = useState('');
  const [description, setDescription] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (editingGoal) {
      setGoalType(editingGoal.goal_type || 'individual');
      setLevelCount(editingGoal.levels?.length || 3);
      const scores = editingGoal.levels?.map(l => l.max_score) || [20, 30, 50];
      setLevelScores(scores);
      setEmployeeId(editingGoal.employee_id || '');
      setGroupId(editingGoal.group_id || '');
      setStartDate(editingGoal.start_date || '');
      setEndDate(editingGoal.end_date || '');
      setTitle(editingGoal.title || '');
      setTitleKu(editingGoal.title_ku || '');
      setDescription(editingGoal.description || '');
    } else {
      setGoalType('individual');
      setLevelCount(3);
      setLevelScores([20, 30, 50]);
      setEmployeeId('');
      setGroupId('');
      setStartDate('');
      setEndDate('');
      setTitle('');
      setTitleKu('');
      setDescription('');
    }
    setStep(1);
  }, [editingGoal, open]);

  const handleSubmit = () => {
    const levels = [];
    let cumulativeScore = 0;
    for (let i = 1; i <= levelCount; i++) {
      const levelMaxScore = levelScores[i - 1] || 20;
      cumulativeScore += levelMaxScore;
      levels.push({
        level_number: i,
        level_name_ar: `المستوى ${i}`,
        level_name_ku: `ئاست ${i}`,
        max_score: levelMaxScore,
        required_score: cumulativeScore,
      });
    }
    const employee = employees.find(e => e.id === employeeId);
    const group = groups.find(g => g.id === groupId);

    onSubmit({
      title,
      title_ku: titleKu,
      description,
      goal_type: goalType,
      employee_id: goalType === 'individual' ? employeeId : null,
      employee_name: goalType === 'individual' ? employee?.full_name : null,
      group_id: goalType === 'group' ? groupId : null,
      group_name: goalType === 'group' ? group?.name : null,
      target_score: levelScores.reduce((sum, s) => sum + s, 0),
      levels,
      start_date: startDate,
      end_date: endDate,
    });
  };

  const isStep1Valid = title.trim().length > 0;
  const isStep2Valid = startDate && endDate && (goalType === 'individual' ? employeeId : groupId);

  const levelPreview = Array.from({ length: levelCount }, (_, i) => {
    const levelMax = levelScores[i] || 20;
    const cumulative = levelScores.slice(0, i + 1).reduce((sum, s) => sum + s, 0);
    return {
      num: i + 1,
      score: cumulative,
      levelMaxScore: levelMax,
    };
  });

  const levelColors = [
    'bg-slate-100 text-slate-700 border-slate-300',
    'bg-emerald-50 text-emerald-700 border-emerald-300',
    'bg-blue-50 text-blue-700 border-blue-300',
    'bg-violet-50 text-violet-700 border-violet-300',
    'bg-amber-50 text-amber-700 border-amber-300',
    'bg-rose-50 text-rose-700 border-rose-300',
  ];

  if (!open) return null;

  const steps = [
    { num: 1, label: T('goals.step_info', 'المعلومات', 'زانیاری') },
    { num: 2, label: T('goals.step_assign', 'التعيين', 'دیاریکردن') },
    { num: 3, label: T('goals.step_levels', 'المستويات', 'ئاستەکان') },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a2744] to-[#2a3f6e] px-6 py-5 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {editingGoal ? T('goals.edit_goal', 'تعديل الهدف', 'دەستکاریکردنی ئامانج') : T('goals.add_new_goal', 'إضافة هدف جديد', 'زیادکردنی ئامانجی نوێ')}
                </h2>
                <p className="text-xs text-white/60">
                  {T('goals.step_label', 'الخطوة', 'گام')} {step} {T('goals.step_of', 'من', 'لە')} 3
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((s, idx) => (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => { if (s.num < step || (s.num === 2 && isStep1Valid) || (s.num === 1)) setStep(s.num); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                    step === s.num
                      ? 'bg-white text-[#1a2744]'
                      : step > s.num
                        ? 'bg-white/30 text-white'
                        : 'bg-white/10 text-white/50'
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black',
                    step === s.num ? 'bg-[#1a2744] text-white' : step > s.num ? 'bg-green-400 text-white' : 'bg-white/20 text-white/70'
                  )}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  {s.label}
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className={cn('w-3 h-3 flex-shrink-0', step > s.num ? 'text-white/60' : 'text-white/20')} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {T('goals.title_ar_label', 'عنوان الهدف (عربي) *', 'ناونیشانی ئامانج (عەرەبی) *')}
                </label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={T('goals.title_ar_placeholder', 'مثال: تحقيق ١٠٠٪ من المبيعات...', 'نموونە: گەیشتن بە ١٠٠٪ی فرۆشتن...')}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {T('goals.title_ku_label', 'عنوان الهدف (كردي)', 'ناونیشانی ئامانج (کوردی)')}
                </label>
                <Input
                  value={titleKu}
                  onChange={e => setTitleKu(e.target.value)}
                  placeholder={T('goals.title_ku_placeholder', 'ناونیشان بە کوردی...', 'ناونیشان بە کوردی...')}
                  className="h-10 text-sm"
                  dir="rtl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {T('goals.description_label', 'وصف الهدف', 'وەسفی ئامانج')}
                </label>
                <RichDescriptionEditor
                  value={description}
                  onChange={setDescription}
                  placeholder={T('goals.description_placeholder', 'اكتب تفاصيل الهدف هنا...', 'وەسفی ئامانج لێرە بنووسە...')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {T('goals.goal_type_label', 'نوع الهدف', 'جۆری ئامانج')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGoalType('individual')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      goalType === 'individual'
                        ? 'border-[#1a2744] bg-[#1a2744]/5'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', goalType === 'individual' ? 'bg-[#1a2744]' : 'bg-slate-100')}>
                      <User className={cn('w-5 h-5', goalType === 'individual' ? 'text-white' : 'text-slate-400')} />
                    </div>
                    <span className={cn('text-xs font-bold', goalType === 'individual' ? 'text-[#1a2744]' : 'text-slate-500')}>
                      {T('goals.type_individual', 'فردي', 'تاکەکەسی')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoalType('group')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      goalType === 'group'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', goalType === 'group' ? 'bg-indigo-500' : 'bg-slate-100')}>
                      <Users className={cn('w-5 h-5', goalType === 'group' ? 'text-white' : 'text-slate-400')} />
                    </div>
                    <span className={cn('text-xs font-bold', goalType === 'group' ? 'text-indigo-600' : 'text-slate-500')}>
                      {T('goals.type_group', 'جماعي', 'کۆمەڵایەتی')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Assignment & Dates */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  {goalType === 'individual' ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  {goalType === 'individual' ? T('goals.employee_label', 'الموظف *', 'کارمەند *') : T('goals.group_label', 'المجموعة *', 'گروپ *')}
                </label>
                {goalType === 'individual' ? (
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={T('goals.select_employee', 'اختر موظفاً...', 'کارمەند هەڵبژێرە...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#1a2744]/10 flex items-center justify-center text-[10px] font-bold text-[#1a2744]">
                              {emp.full_name.charAt(0)}
                            </div>
                            {emp.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={T('goals.select_group', 'اختر مجموعة...', 'گروپ هەڵبژێرە...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {T('goals.start_date', 'تاريخ البدء *', 'بەرواری دەستپێک *')}
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {T('goals.end_date', 'تاريخ الانتهاء *', 'بەرواری کۆتایی *')}
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {T('goals.level_max_scores', 'الدرجة القصوى لكل مستوى', 'زۆرترین پلە بۆ هەر ئاستێک')}
                </label>
                <p className="text-xs text-slate-400">{T('goals.level_scores_hint', 'حدد الدرجة القصوى لكل مستوى (مثال: مستوى 1: 20، مستوى 2: 30)', 'زۆرترین پلە بۆ هەر ئاستێک دیاری بکە (نموونە: ئاستی ١: ٢٠، ئاستی ٢: ٣٠)')}</p>
                <div className="space-y-2">
                  {Array.from({ length: levelCount }, (_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600 w-20">{lang === 'ku' ? `ئاست ${i + 1}` : `المستوى ${i + 1}`}</span>
                      <Input
                        type="number"
                        value={levelScores[i] || 0}
                        onChange={e => {
                          const newScores = [...levelScores];
                          newScores[i] = parseInt(e.target.value) || 0;
                          setLevelScores(newScores);
                        }}
                        min={1}
                        className="h-9 w-24 text-center font-bold"
                        inputMode="numeric"
                        dir="ltr"
                      />
                      <span className="text-xs text-slate-400">{T('goals.score', 'درجة', 'پلە')}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-2.5">
                  <p className="text-sm font-bold text-slate-700">
                    {T('goals.total_target', 'المجموع الكلي', 'کۆی گشتی')}: {levelScores.reduce((sum, s) => sum + s, 0)} {T('goals.score', 'درجة', 'پلە')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Levels */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  {T('goals.levels_count', 'عدد المستويات', 'ژمارەی ئاستەکان')}
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={levelCount}
                    onChange={e => setLevelCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                    min={1}
                    max={10}
                    className="h-10 w-20 text-center text-lg font-bold"
                    inputMode="numeric"
                    dir="ltr"
                  />
                  <p className="text-xs text-slate-500 flex-1">
                    {T('goals.levels_hint', 'اختر بين 1 و 10 مستويات.', 'لە نێوان ١ و ١٠ ئاست هەڵبژێرە.')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {T('goals.levels_preview', 'معاينة المستويات', 'پێشبینیی ئاستەکان')}
                </p>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {levelPreview.map((lvl, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 rounded-xl border',
                        levelColors[Math.min(idx, levelColors.length - 1)]
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-current/10 flex items-center justify-center text-xs font-black">
                          {lvl.num}
                        </span>
                        <span className="text-sm font-bold">
                          {lang === 'ku' ? `ئاست ${lvl.num}` : `المستوى ${lvl.num}`}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="opacity-60 text-[10px]">{T('goals.max_score', 'الدرجة القصوى', 'زۆرترین پلە')}</p>
                        <p className="font-bold text-sm">{lvl.levelMaxScore}</p>
                      </div>
                      <div className="text-center">
                        <p className="opacity-60 text-[10px]">{T('goals.cumulative', 'المجموع', 'کۆی گشتی')}</p>
                        <p className="font-bold text-sm">{lvl.score}</p>
                      </div>
                    </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">{T('goals.summary', 'ملخص', 'پوختە')}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[10px] text-slate-400">{T('goals.title_field', 'العنوان', 'ناونیشان')}</p>
                    <p className="font-bold text-slate-700 truncate">{title || '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[10px] text-slate-400">{T('goals.type_field', 'النوع', 'جۆر')}</p>
                    <p className="font-bold text-slate-700">
                      {goalType === 'individual' ? T('goals.type_individual', 'فردي', 'تاکەکەسی') : T('goals.type_group', 'جماعي', 'کۆمەڵایەتی')}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[10px] text-slate-400">{T('goals.total_target', 'المجموع الكلي', 'کۆی گشتی')}</p>
                    <p className="font-bold text-slate-700">{levelScores.reduce((sum, s) => sum + s, 0)} {T('goals.score', 'درجة', 'پلە')}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-[10px] text-slate-400">{T('goals.levels_count', 'عدد المستويات', 'ئاستەکان')}</p>
                    <p className="font-bold text-slate-700">{levelCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
          >
            {step > 1 ? T('goals.prev', '← السابق', '← پێشوو') : T('general.cancel', 'إلغاء', 'پاشگەز')}
          </button>

          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2 px-6"
            >
              {T('goals.next', 'التالي →', 'دواتر →')}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSaving || !title.trim()}
              className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2 px-6"
            >
              <Save className="w-4 h-4" />
              {isSaving ? T('goals.saving', 'جاري الحفظ...', 'پاشەکەوتکردن...') : T('goals.save_goal', 'حفظ الهدف', 'پاشەکەوتکردنی ئامانج')}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}