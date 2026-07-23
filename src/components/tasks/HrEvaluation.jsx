import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, Shield,
  Clock, AlertTriangle, PauseCircle, ArrowUpCircle, HelpCircle, Star, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const DECISIONS = [
  {
    key: 'approved',
    ar: 'مكتملة — موافقة',
    ku: 'تەواوبوو — موافەقەت',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    activeBg: 'bg-emerald-500',
    statusEffect: 'مكتملة',
  },
  {
    key: 'rejected',
    ar: 'مرفوضة',
    ku: 'ڕەتکراوەتەوە',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-300',
    activeBg: 'bg-red-500',
    statusEffect: 'ملغاة',
  },
  {
    key: 'needs_revision',
    ar: 'تحتاج مراجعة',
    ku: 'پێویستی بە دووبارەبینینەوە',
    icon: RefreshCw,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    activeBg: 'bg-amber-500',
    statusEffect: null,
  },
  {
    key: 'in_progress_review',
    ar: 'قيد المراجعة',
    ku: 'لە بینینەوەدایە',
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    activeBg: 'bg-blue-500',
    statusEffect: 'جارية',
  },
  {
    key: 'partially_completed',
    ar: 'مكتملة جزئياً',
    ku: 'بەشێکی تەواوبوو',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    activeBg: 'bg-orange-500',
    statusEffect: null,
  },
  {
    key: 'on_hold',
    ar: 'معلقة / موقوفة',
    ku: 'هەڵوەشاوەتەوە',
    icon: PauseCircle,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    activeBg: 'bg-slate-500',
    statusEffect: 'معلقة',
  },
  {
    key: 'escalated',
    ar: 'مُصعَّدة للإدارة',
    ku: 'بردراوەتە بەڕێوەبەرایەتی',
    icon: ArrowUpCircle,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    activeBg: 'bg-purple-500',
    statusEffect: null,
  },
  {
    key: 'pending_info',
    ar: 'بانتظار معلومات',
    ku: 'چاوەڕوانی زانیاری',
    icon: HelpCircle,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-300',
    activeBg: 'bg-cyan-500',
    statusEffect: null,
  },
];

const PERFORMANCE_LABELS = {
  ar: ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'],
  ku: ['', 'خراپ', 'قابووڵ', 'باش', 'زۆر باش', 'نایاب'],
};

export default function HrEvaluation({ task, currentUser, onTaskUpdate }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const existing = task.hr_evaluation;
  const existingDecision = DECISIONS.find(d => d.key === existing?.decision);

  const needsEval = (task.status === 'مكتملة' || task.status === 'ملغاة') && !task.hr_evaluation;
  const [open, setOpen] = useState(needsEval);
  const [note, setNote] = useState(existing?.note || '');
  const [rating, setRating] = useState(existing?.rating || 0);
  const [revisionDeadline, setRevisionDeadline] = useState(existing?.revision_deadline || '');
  const [selectedDecision, setSelectedDecision] = useState(existing?.decision || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setNote(task.hr_evaluation?.note || '');
      setRating(task.hr_evaluation?.rating || 0);
      setRevisionDeadline(task.hr_evaluation?.revision_deadline || '');
      setSelectedDecision(task.hr_evaluation?.decision || null);
    }
  }, [task.hr_evaluation, open]);

  const handleSubmitEvaluation = async () => {
    if (!selectedDecision) return;
    setSaving(true);
    const decision = DECISIONS.find(d => d.key === selectedDecision);
    const evaluation = {
      decision: selectedDecision,
      note: note.trim(),
      rating: rating || null,
      revision_deadline: revisionDeadline || null,
      evaluated_by: currentUser?.full_name || currentUser?.username || 'HR',
      evaluated_at: new Date().toISOString(),
    };
    const extra = decision?.statusEffect
      ? {
          status: decision.statusEffect,
          ...(decision.statusEffect === 'مكتملة' ? { completed_date: new Date().toISOString().split('T')[0] } : {})
        }
      : {};
    await onTaskUpdate(task.id, { hr_evaluation: evaluation, ...extra });
    setSaving(false);
    setOpen(false);
  };

  const handleClear = async () => {
    setSaving(true);
    await onTaskUpdate(task.id, { hr_evaluation: null });
    setNote('');
    setRating(0);
    setRevisionDeadline('');
    setSaving(false);
  };

  // Per-decision gradient map for the trigger banner
  const DECISION_GRADIENTS = {
    approved:            'from-emerald-500 to-teal-500',
    rejected:            'from-red-500 to-rose-600',
    needs_revision:      'from-amber-500 to-orange-500',
    in_progress_review:  'from-blue-500 to-indigo-500',
    partially_completed: 'from-orange-400 to-amber-500',
    on_hold:             'from-slate-400 to-slate-500',
    escalated:           'from-purple-500 to-violet-600',
    pending_info:        'from-cyan-500 to-sky-500',
  };
  const decisionGradient = existingDecision ? DECISION_GRADIENTS[existingDecision.key] : null;

  return (
    <div className="mt-3">
      {/* Header trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-right overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99]"
      >
        {existing ? (
          /* ── Has evaluation: full-color gradient banner ── */
          <div className={cn('relative flex items-center justify-between px-4 py-3 bg-gradient-to-l', decisionGradient)}>
            {/* subtle shine overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 10% 50%, white 0%, transparent 55%)' }} />
            <div className="relative flex items-center gap-3 min-w-0 flex-1">
              {/* glowing icon pill */}
              <div className="w-9 h-9 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg border border-white/30">
                {React.createElement(existingDecision?.icon || Shield, { className: 'w-5 h-5 text-white' })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/70">HR</span>
                  <span className="text-white/50 text-xs">·</span>
                  <span className="font-black text-white text-sm leading-tight">
                    {L(existingDecision?.ar, existingDecision?.ku)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {existing.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className="w-3 h-3" style={{ fill: s <= existing.rating ? '#fbbf24' : 'rgba(255,255,255,0.3)', stroke: s <= existing.rating ? '#f59e0b' : 'rgba(255,255,255,0.4)', strokeWidth: 1.5 }} />
                      ))}
                      <span className="text-white/80 text-[10px] font-bold mr-1">{existing.rating}/5</span>
                    </span>
                  )}
                  {existing.evaluated_by && (
                    <span className="text-white/70 text-[10px] font-medium">{existing.evaluated_by}</span>
                  )}
                  {existing.evaluated_at && (
                    <span className="text-white/50 text-[10px]">{format(new Date(existing.evaluated_at), 'dd/MM/yyyy')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className={cn('relative w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300', open && 'rotate-180')}>
              <ChevronDown className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : (
          /* ── No evaluation yet: elegant dashed placeholder ── */
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-violet-50 to-purple-50 border-2 border-dashed border-purple-300 rounded-2xl hover:border-purple-500 hover:from-violet-100 hover:to-purple-100 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shadow-sm border border-purple-200">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="font-black text-purple-700 text-sm">{L('تقييم HR', 'هەڵسەنگاندنی HR')}</p>
                <p className="text-xs text-purple-400">{L('اضغط لإضافة قرار وتقييم', 'کلیک بکە بۆ زیادکردنی بڕیار')}</p>
              </div>
            </div>
            <div className={cn('w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center transition-transform duration-300', open && 'rotate-180')}>
              <ChevronDown className="w-4 h-4 text-purple-500" />
            </div>
          </div>
        )}
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="mt-2 rounded-2xl border border-purple-100 shadow-lg overflow-hidden">
          {/* Panel header */}
          <div className="bg-gradient-to-l from-violet-600 to-purple-700 px-4 py-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-white/80" />
            <span className="text-white font-bold text-sm">{L('لوحة تقييم HR', 'پانێلی هەڵسەنگاندنی HR')}</span>
          </div>

          <div className="bg-white p-4 space-y-5">

            {/* Existing note display */}
            {existing?.note && (
              <div className="bg-gradient-to-l from-slate-50 to-slate-100 rounded-xl px-4 py-3 border-r-4 border-purple-400">
                <p className="text-xs font-bold text-purple-600 mb-1">{L('الملاحظة الحالية', 'تێبینی ئێستا')}</p>
                <p className="text-sm text-slate-700 italic">"{existing.note}"</p>
              </div>
            )}

            {/* Note input */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5 block">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                {L('ملاحظة / سبب القرار', 'تێبینی / هۆکاری بڕیار')}
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={L('اكتب ملاحظة...', 'تێبینێک بنووسە...')}
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 resize-none bg-slate-50 transition-all"
              />
            </div>

            {/* Performance rating */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5 block">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                {L('تقييم الأداء', 'هەڵسەنگاندنی ئەدا')}
              </label>
              <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setRating(rating === s ? 0 : s)}
                    className="transition-transform hover:scale-125 active:scale-90"
                  >
                    <Star
                      className="w-7 h-7 drop-shadow-sm"
                      style={{
                        fill: s <= rating ? '#fbbf24' : 'none',
                        stroke: s <= rating ? '#f59e0b' : '#d1d5db',
                        strokeWidth: 1.5,
                      }}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-sm font-bold text-amber-600 mr-2 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                    {L(PERFORMANCE_LABELS.ar[rating], PERFORMANCE_LABELS.ku[rating])}
                  </span>
                )}
              </div>
            </div>

            {/* Revision deadline */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5 block">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                {L('موعد المراجعة / الإصلاح (اختياري)', 'کاتی دووبارەبینینەوە (ئیختیاری)')}
              </label>
              <input
                type="date"
                value={revisionDeadline}
                onChange={e => setRevisionDeadline(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-300 bg-slate-50 transition-all"
              />
            </div>

            {/* Decision buttons */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1.5 block">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block"></span>
                {L('اختر القرار', 'بڕیار هەڵبژێرە')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DECISIONS.map(d => {
                  const Icon = d.icon;
                  const isSelected = selectedDecision === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => setSelectedDecision(isSelected ? null : d.key)}
                      disabled={saving}
                      className={cn(
                        'flex items-center gap-2.5 py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-right',
                        isSelected
                          ? `${d.bg} ${d.border} shadow-lg ring-2 ring-offset-1`
                          : `${d.bg} ${d.border} opacity-75 hover:opacity-100`
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border',
                        d.border,
                        isSelected ? 'shadow-md' : 'opacity-80'
                      )} style={{ background: 'white' }}>
                        <Icon className={cn('w-4 h-4', d.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn('leading-tight block font-bold', d.color)}>
                          {L(d.ar, d.ku)}
                        </span>
                        {d.statusEffect && (
                          <span className={cn('text-[9px] font-normal opacity-60', d.color)}>→ {d.statusEffect}</span>
                        )}
                      </div>
                      {isSelected && (
                        <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0', d.border, d.bg, 'border-2')}>
                          <span className={cn('text-[8px] font-black', d.color)}>✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmitEvaluation}
              disabled={!selectedDecision || saving}
              className={cn(
                'w-full py-3 rounded-xl font-black text-sm transition-all duration-200',
                selectedDecision
                  ? 'bg-gradient-to-l from-violet-600 to-purple-700 text-white shadow-lg hover:opacity-90 hover:scale-[1.01] active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {saving
                ? L('جاري الحفظ...', 'پاشەکەوتکردن...')
                : L('✓ تأكيد التقييم', '✓ دڵنیاکردنەوەی هەڵسەنگاندن')}
            </button>

            {existing && (
              <button
                onClick={handleClear}
                disabled={saving}
                className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-1.5 border border-dashed border-slate-200 rounded-xl hover:border-red-300"
              >
                {L('مسح التقييم الحالي', 'سڕینەوەی هەڵسەنگاندن')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}