import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import RichDescriptionEditor from '@/components/tasks/RichDescriptionEditor';
import TaskDescriptionViewer from '@/components/tasks/TaskDescriptionViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Target, Users, Calendar, Tag, Plus, X,
  MessageSquare, Send, Paperclip, Mic, MicOff, Eye, FileText, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import GoalEvaluationPanel from '@/components/goals/GoalEvaluationPanel';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function TagsSection({ goal, onUpdate, T }) {
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const current = goal.tags || [];
    if (current.includes(trimmed)) return;
    onUpdate({ tags: [...current, trimmed] });
    setNewTag('');
  };

  const removeTag = (tag) => {
    onUpdate({ tags: (goal.tags || []).filter(t => t !== tag) });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-semibold text-slate-700">{T('goals.tags', 'الوسوم', 'تاگەکان')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {(goal.tags || []).map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium"
          >
            #{tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder={T('goals.new_tag', 'وسم جديد...', 'تاگی نوێ...')}
            className="h-7 text-xs w-28 rounded-full border-dashed"
          />
          <Button size="icon" variant="ghost" onClick={addTag} className="h-7 w-7">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function GoalCommentEditor({ onSubmit }) {
  const { T } = useLanguage();
  const [text, setText] = useState('');
  const [type, setType] = useState('public');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleFileUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const uploaded = await Promise.all(Array.from(files).map(async f => {
      const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file: f });
      return { url: file_url, name: f.name, type: f.type, uploaded_at: new Date().toISOString() };
    }));
    setAttachments(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file });
        setAttachments(prev => [...prev, { url: file_url, name: T('goals.voice_note', 'صوتي', 'دەنگی'), type: 'audio/webm', is_voice_note: true }]);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {}
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = () => {
    if (!text.trim() && !attachments.length) return;
    onSubmit({ text, type, attachments });
    setText('');
    setAttachments([]);
    setType('public');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setType('public')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2',
            type === 'public' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}
        >
          <Users className="w-3.5 h-3.5" />
          {T('goals.comment_public', 'عام', 'گشتی')}
        </button>
        <button
          onClick={() => setType('internal')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2',
            type === 'internal' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}
        >
          <Eye className="w-3.5 h-3.5" />
          {T('goals.comment_internal', 'داخلي', 'ناوخۆیی')}
        </button>
      </div>

      <textarea
        value={text}
        onChange={e => {
          setText(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
        }}
        placeholder={type === 'public' ? T('goals.write_comment', 'اكتب تعليقاً...', 'لێدوانێک بنووسە...') : T('goals.internal_note', 'ملاحظة داخلية...', 'تێبینی ناوخۆیی...')}
        rows={2}
        className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-300 transition-all resize-none"
        style={{ fontFamily: '"Noto Sans Arabic","Tajawal",sans-serif', direction: 'rtl', minHeight: '50px', overflow: 'hidden' }}
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group">
              {att.type?.startsWith('image') ? (
                <img src={att.url} alt={att.name} className="h-14 w-18 object-cover rounded-lg border" />
              ) : att.is_voice_note ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
                  <Mic className="w-3.5 h-3.5" />{T('goals.voice_note', 'صوتي', 'دەنگی')}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate max-w-[80px]">{att.name}</span>
                </div>
              )}
              <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-red-700">{T('goals.recording', 'جاري التسجيل...', 'تۆمارکردن...')}</span>
          <button onClick={stopRecording} className="ml-auto px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg">
            {T('goals.stop', 'إيقاف', 'وەستان')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200 hover:bg-slate-50">
            <Paperclip className="w-3.5 h-3.5" />
            {T('goals.file', 'ملف', 'فایل')}
            <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => handleFileUpload(e.target.files)} disabled={uploading} />
          </label>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border',
              isRecording ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isRecording ? T('goals.stop', 'إيقاف', 'وەستان') : T('goals.voice_note', 'صوتي', 'دەنگی')}
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={uploading || (!text.trim() && !attachments.length)}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-all shadow"
        >
          <Send className="w-3.5 h-3.5" />
          {uploading ? '...' : T('goals.send', 'إرسال', 'ناردن')}
        </button>
      </div>
    </div>
  );
}

function GoalCommentItem({ comment, onDelete, T }) {
  const date = comment.created_at ? new Date(comment.created_at).toLocaleString('ar-IQ') : '';
  return (
    <div className={cn(
      'rounded-xl p-3 border',
      comment.type === 'internal' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
    )}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
            {(comment.author || '?').charAt(0)}
          </div>
          <span className="text-xs font-semibold text-slate-700">{comment.author || T('general.unknown', 'مجهول', 'نەناسراو')}</span>
          {comment.type === 'internal' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />{T('goals.comment_internal', 'داخلي', 'ناوخۆیی')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{date}</span>
          <button onClick={onDelete} className="text-slate-300 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
      {comment.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {comment.attachments.map((att, i) => (
            att.type?.startsWith('image') ? (
              <img key={i} src={att.url} alt={att.name} className="h-16 w-20 object-cover rounded-lg border cursor-pointer" onClick={() => window.open(att.url, '_blank')} />
            ) : (
              <a key={i} href={att.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border rounded-lg text-xs text-slate-600 hover:bg-slate-100">
                <Paperclip className="w-3 h-3" />{att.name}
              </a>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function GoalDetailModal({ goal, open, onClose, onGoalUpdate }) {
  const { lang, T } = useLanguage();
  const queryClient = useQueryClient();
  const { can, isAdmin } = useUserPermissions();
  const canEvaluate = isAdmin || can('can_evaluate_goals');
  const [localGoal, setLocalGoal] = useState(goal);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(goal?.description || '');

  useEffect(() => {
    setLocalGoal(goal);
    setDescValue(goal?.description || '');
  }, [goal?.id, goal?.comments, goal?.tags]);

  const updateMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeGoal.update(localGoal.id, data),
    onSuccess: (updated) => {
      setLocalGoal(updated);
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      if (onGoalUpdate) onGoalUpdate(updated);
    },
  });

  const handleUpdate = (data) => {
    const merged = { ...localGoal, ...data };
    setLocalGoal(merged);
    updateMutation.mutate(data);
  };

  const handleAddComment = ({ text, type, attachments }) => {
    const author = localStorage.getItem('task_comment_author') || T('general.user', 'مستخدم', 'بەکارهێنەر');
    const newComment = {
      id: genId(),
      author,
      text,
      type,
      created_at: new Date().toISOString(),
      attachments,
      reactions: {},
      replies: [],
      is_pinned: false,
    };
    const updated = [...(localGoal.comments || []), newComment];
    handleUpdate({ comments: updated });
    toast.success(T('goals.comment_added', 'تم إضافة التعليق', 'لێدوانەکە زیادکرا'));
  };

  const handleDeleteComment = (commentId) => {
    const updated = (localGoal.comments || []).filter(c => c.id !== commentId);
    handleUpdate({ comments: updated });
  };

  if (!localGoal) return null;

  const statusLabels = {
    active: T('goals.status_active', 'نشط', 'چالاک'),
    completed: T('goals.status_completed', 'مكتمل', 'تەواوبوو'),
    cancelled: T('goals.status_cancelled', 'ملغي', 'هەڵوەشاوە')
  };
  const comments = localGoal.comments || [];

  const saveDesc = () => {
    handleUpdate({ description: descValue });
    setEditingDesc(false);
  };

  const levelColors = [
    { bg: 'from-slate-600 to-slate-800', light: 'bg-slate-100 text-slate-700', dot: '#64748b' },
    { bg: 'from-emerald-500 to-teal-700', light: 'bg-emerald-100 text-emerald-700', dot: '#10b981' },
    { bg: 'from-blue-500 to-indigo-700', light: 'bg-blue-100 text-blue-700', dot: '#3b82f6' },
    { bg: 'from-violet-500 to-purple-700', light: 'bg-violet-100 text-violet-700', dot: '#8b5cf6' },
    { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-100 text-amber-700', dot: '#f59e0b' },
    { bg: 'from-rose-500 to-pink-700', light: 'bg-rose-100 text-rose-700', dot: '#f43f5e' },
  ];
  const currentLevel = (localGoal.current_level || 1) - 1;
  const levelColor = levelColors[Math.min(currentLevel, levelColors.length - 1)];
  const progress = ((localGoal.current_score || 0) / (localGoal.target_score || 100)) * 100;

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-2xl mx-3 max-h-[90vh] rounded-2xl bg-white overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Colorful header based on level */}
        <div className={cn('relative bg-gradient-to-br text-white px-6 pt-6 pb-8', levelColor.bg)}>
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-start gap-3 pr-2">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {localGoal.goal_type === 'group'
                ? <Users className="w-6 h-6 text-white" />
                : <Target className="w-6 h-6 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">
                {lang === 'ku' ? (localGoal.title_ku || localGoal.title) : localGoal.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  {statusLabels[localGoal.status]}
                </span>
                <span className="text-xs text-white/80 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(localGoal.start_date).toLocaleDateString('ar-IQ')} – {new Date(localGoal.end_date).toLocaleDateString('ar-IQ')}
                </span>
                {localGoal.employee_name && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{localGoal.employee_name}</span>
                )}
                {localGoal.group_name && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{localGoal.group_name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>{T('goals.progress', 'التقدم', 'پێشکەوتن')}</span>
              <span className="font-bold text-white">{localGoal.current_score || 0} / {localGoal.target_score} <span className="opacity-70">({Math.round(Math.min(progress, 100))}%)</span></span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              {(localGoal.levels || []).map((lvl, idx) => (
                <span
                  key={idx}
                  className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold transition-all',
                    idx < (localGoal.current_level || 1)
                      ? 'bg-white text-slate-800'
                      : 'bg-white/20 text-white/70'
                  )}
                >
                  {lang === 'ku' ? (lvl.level_name_ku || lvl.level_name_ar || lvl.level_name) : (lvl.level_name_ar || lvl.level_name)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-3 sm:px-6 pt-5 pb-6 space-y-5 -mt-2 bg-white rounded-t-3xl">
          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">{T('goals.description', 'الوصف', 'ناوەرۆک')}</span>
              </div>
              {!editingDesc ? (
                <button onClick={() => setEditingDesc(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  {T('general.edit', 'تعديل', 'دەستکاری')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={saveDesc} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                    <Save className="w-3.5 h-3.5" />{T('general.save', 'حفظ', 'پاشەکەوت')}
                  </button>
                  <button onClick={() => { setEditingDesc(false); setDescValue(localGoal.description || ''); }} className="text-xs text-slate-400 hover:text-slate-600">
                    {T('general.cancel', 'إلغاء', 'پاشگەز')}
                  </button>
                </div>
              )}
            </div>
            {editingDesc ? (
              <RichDescriptionEditor
                value={descValue}
                onChange={setDescValue}
                placeholder={T('goals.description_placeholder', 'اكتب وصف الهدف هنا...', 'ناوەرۆکی ئامانج لێرە بنووسە...')}
              />
            ) : localGoal.description ? (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <TaskDescriptionViewer description={localGoal.description} />
              </div>
            ) : (
              <button onClick={() => setEditingDesc(true)} className="w-full text-right text-sm text-slate-400 bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
                + {T('goals.add_description', 'إضافة وصف...', 'زیادکردنی ناوەرۆک...')}
              </button>
            )}
          </div>

          <GoalEvaluationPanel
            goal={localGoal}
            canEvaluate={canEvaluate}
            onUpdate={handleUpdate}
          />

          <TagsSection goal={localGoal} onUpdate={handleUpdate} T={T} />

          {/* Comments */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-slate-700">{T('goals.comments', 'التعليقات', 'لێدوانەکان')}</span>
              {comments.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                  {comments.length}
                </span>
              )}
            </div>

            <GoalCommentEditor onSubmit={handleAddComment} />

            {comments.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {[...comments].reverse().map(comment => (
                  <GoalCommentItem
                    key={comment.id}
                    comment={comment}
                    onDelete={() => handleDeleteComment(comment.id)}
                    T={T}
                  />
                ))}
              </div>
            )}

            {comments.length === 0 && (
              <div className="text-center py-6">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">{T('goals.no_comments', 'لا توجد تعليقات بعد', 'هیچ لێدوانێک نییە')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}