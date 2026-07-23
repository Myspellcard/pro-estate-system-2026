import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Send, Paperclip, Mic, MicOff, X, Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommentEditor({
  onSubmit,
  attachments,
  setAttachments,
  onFileUpload,
  fileRef,
  uploading,
  recordingAudio,
  onStartRecording,
  onStopRecording,
  isRecording,
  taskColor,
}) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [text, setText] = useState('');
  const [type, setType] = useState('public');
  const [showApprovalActions, setShowApprovalActions] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null);

  const handleSubmit = () => {
    if (!text.trim() && attachments.length === 0 && !recordingAudio) return;
    onSubmit(text, type, approvalAction);
    setText('');
    setApprovalAction(null);
    setShowApprovalActions(false);
  };

  const handleKeyDown = (e) => {
    // Enter creates new line, no auto-send
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setType('public')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2',
            type === 'public'
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          {L('عام', 'گشتی')}
        </button>
        <button
          onClick={() => setType('internal')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2',
            type === 'internal'
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          {L('داخلي', 'ناوخۆیی')}
        </button>
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Auto-expand textarea
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 300) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder={type === 'public'
            ? L('اكتب تعليقاً... (Enter للإرسال)', 'لێدوانێک بنووسە...')
            : L('ملاحظة داخلية للفريق...', 'تێبینی ناوخۆیی بۆ تیم...')
          }
          rows={3}
          className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-300 transition-all resize-none"
          style={{
            fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
            direction: 'rtl',
            unicodeBidi: 'plaintext',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            minHeight: '50px',
            overflow: 'hidden'
          }}
        />
        {type === 'internal' && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
            <Eye className="w-2.5 h-2.5" />
            {L('مرئي فقط للمديرين', 'تەنها بۆ بەڕێوەبەران')}
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group">
              {att.type?.startsWith('image') ? (
                <img src={att.url} alt={att.name} className="h-16 w-20 object-cover rounded-lg border" />
              ) : att.is_voice_note || recordingAudio?.is_voice_note ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <Mic className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-700">{L('صوتي', 'دەنگی')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate max-w-24">{att.name}</span>
                </div>
              )}
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-red-700">{L('جاري التسجيل...', 'تۆمارکردن...')}</span>
          <button
            onClick={onStopRecording}
            className="ml-auto px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            {L('إيقاف', 'وەستان')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <label
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border',
              uploading ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <Paperclip className="w-3.5 h-3.5" />
            {L('ملف', 'فایل')}
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => onFileUpload(e.target.files)}
              disabled={uploading}
            />
          </label>
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
              isRecording
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isRecording ? L('إيقاف', 'وەستان') : L('صوتي', 'دەنگی')}
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={uploading || (!text.trim() && attachments.length === 0 && !recordingAudio)}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:scale-100',
            'hover:shadow-lg hover:opacity-90'
          )}
          style={{ background: `linear-gradient(135deg, ${taskColor || '#6366f1'}, ${taskColor || '#6366f1'}cc)` }}
        >
          <Send className="w-3.5 h-3.5" />
          {uploading ? L('...', '...') : L('إرسال', 'ناردن')}
        </button>
      </div>
    </div>
  );
}