import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { format } from 'date-fns';
import {
  MoreVertical, Edit2, Trash2, Pin, PinOff, Eye, EyeOff,
  CheckCircle, XCircle, RotateCcw, Smile, ChevronDown, Send,
  Paperclip, X, ExternalLink, Play, Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AttachmentPreview from './AttachmentPreview';

const REACTIONS = ['👍', '❤️', '👏', '🎉', '🔥', '😄'];
const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  hr: 'bg-pink-100 text-pink-700 border-pink-200',
  employee: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function CommentItem({
  comment,
  isPinned,
  currentUser,
  employees,
  onReply,
  onUpdate,
  onDelete,
  onTogglePin,
  onReaction,
  onReplyReaction,
  taskColor,
}) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(null);

  const isAuthor = comment.author === currentUser.name;
  const isAdmin = currentUser.role === 'admin';
  const hasReplies = (comment.replies || []).length > 0;

  const handleAddReply = () => {
    if (!replyText.trim() && replyAttachments.length === 0) return;
    onReply(replyText, replyAttachments);
    setReplyText('');
    setReplyAttachments([]);
  };

  const handleSaveEdit = () => {
    onUpdate({ text: editText });
    setIsEditing(false);
  };

  const toggleAudioPlayback = (url) => {
    if (playingAudio === url) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(url);
    }
  };

  const approvalConfig = {
    approve: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', label: L('موافق', 'پەسەندکراو') },
    reject: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: L('مرفوض', 'ڕەتکراوە') },
    request_revision: { icon: RotateCcw, color: 'text-amber-600', bg: 'bg-amber-50', label: L('مراجعة', 'پێداچوونەوە') },
  };

  return (
    <div className={cn(
      'group relative rounded-2xl border transition-all duration-200 overflow-hidden',
      isPinned ? 'bg-gradient-to-r from-indigo-50/80 to-violet-50/60 border-indigo-200 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm',
      comment.type === 'internal' && 'bg-amber-50/50 border-amber-200'
    )}>
      {isPinned && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black shadow-lg">
          <Pin className="w-2.5 h-2.5 fill-white" />
          {L('مثبت', 'جێگیرکراو')}
        </div>
      )}

      <div className="p-4 space-y-3 overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md"
              style={{ background: comment.avatar_color || taskColor || '#6366f1' }}
            >
              {(comment.author || '?').charAt(0)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-800 truncate max-w-full">{comment.author}</span>
              {comment.role && (
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap', ROLE_COLORS[comment.role] || ROLE_COLORS.employee)}>
                  {comment.role === 'admin' ? L('مدير', 'بەڕێوەبەر') : comment.role === 'manager' ? L('مدير', 'بەڕێوەبەر') : comment.role === 'hr' ? L('موارد بشرية', 'کارگێڕی') : L('موظف', 'کارمەند')}
                </span>
              )}
              {comment.department && (
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{comment.department}</span>
              )}
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {comment.created_at ? format(new Date(comment.created_at), 'dd/MM/yyyy · HH:mm') : ''}
              </span>
              {comment.type === 'internal' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                  <Eye className="w-2.5 h-2.5" />
                  {L('داخلي فقط', 'تەنها ناوخۆیی')}
                </span>
              )}
            </div>

            {comment.approval_action && approvalConfig[comment.approval_action] && (
              <div className={cn('inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl text-xs font-bold', approvalConfig[comment.approval_action].bg)}>
                {React.createElement(approvalConfig[comment.approval_action].icon, { className: cn('w-3.5 h-3.5', approvalConfig[comment.approval_action].color) })}
                <span className={approvalConfig[comment.approval_action].color}>
                  {approvalConfig[comment.approval_action].label}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
              title={L('حذف', 'سڕینەوە')}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showActions && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20 min-w-32">
                  {isPinned ? (
                    <button onClick={() => { onTogglePin(); setShowActions(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <PinOff className="w-3.5 h-3.5" />
                      {L('إلغاء التثبيت', 'لابردنی جێگیرکردن')}
                    </button>
                  ) : (
                    <button onClick={() => { onTogglePin(); setShowActions(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <Pin className="w-3.5 h-3.5" />
                      {L('تثبيت', 'جێگیرکردن')}
                    </button>
                  )}
                  {isAuthor && (
                    <button onClick={() => { setIsEditing(true); setShowActions(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                      <Edit2 className="w-3.5 h-3.5" />
                      {L('تعديل', 'دەستکاریکردن')}
                    </button>
                  )}
                  {isAdmin && comment.type === 'public' && (
                    <button onClick={() => { onUpdate({ type: 'internal' }); setShowActions(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50">
                      <EyeOff className="w-3.5 h-3.5" />
                      {L('تحويل لداخلي', 'گۆڕین بۆ ناوخۆیی')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full min-h-[80px] text-sm p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-300"
              style={{
                fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                direction: 'rtl',
                unicodeBidi: 'plaintext',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} className="rounded-xl">
                <CheckCircle className="w-3.5 h-3.5" />
                {L('حفظ', 'پاشەکەوتکردن')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl">
                <X className="w-3.5 h-3.5" />
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {comment.text && (
              <div
                className="text-sm text-slate-700 leading-relaxed break-words max-w-full"
                style={{
                  fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                  direction: 'rtl',
                  unicodeBidi: 'plaintext',
                  textRendering: 'optimizeLegibility',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}
                dangerouslySetInnerHTML={{ __html: comment.text }}
              />
            )}

            {(comment.attachments || []).length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {comment.attachments.map((att, idx) => {
                  if (att.is_voice_note) {
                    return (
                      <div key={idx} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <button
                          onClick={() => toggleAudioPlayback(att.url)}
                          className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors"
                        >
                          {playingAudio === att.url ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-medium text-indigo-700">{L('ملاحظة صوتية', 'تێبینی دەنگی')}</span>
                      </div>
                    );
                  }
                  return <AttachmentPreview key={idx} att={att} />;
                })}
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 overflow-hidden">
          {/* Reactions row - wraps on mobile */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 overflow-hidden">
            {Object.entries(comment.reactions || {}).map(([emoji, count]) => {
              const isUserReaction = comment.user_reactions?.current === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => onReaction(emoji)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all shadow-sm border shrink-0',
                    isUserReaction 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <span className="font-medium text-xs">{count}</span>
                </button>
              );
            })}
          </div>
          {/* Emoji picker and reply button - fixed position */}
          <div className="flex items-center gap-1.5 shrink-0 mr-2">
            <div className="relative group">
              <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all">
                <Smile className="w-4 h-4" />
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-200 px-3 py-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto z-30">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onReaction(emoji)}
                    className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowReplies(!showReplies)}
              className={cn('text-xs font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap',
                hasReplies
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
              style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif' }}
            >
              {hasReplies ? (showReplies ? L('إخفاء', 'شاردنەوە') : `${comment.replies.length}`) : L('رد', 'وەڵام')}
            </button>
          </div>
        </div>

        {hasReplies && showReplies && (
          <div className="space-y-3 pr-8 mt-3 overflow-hidden">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="flex gap-3 items-start">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
                  style={{ background: reply.avatar_color || taskColor || '#6366f1' }}
                >
                  {(reply.author || '?').charAt(0)}
                </div>
                <div className="flex-1 bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-slate-800">{reply.author}</span>
                    <span className="text-[10px] text-slate-400">
                      {reply.created_at ? format(new Date(reply.created_at), 'dd/MM HH:mm') : ''}
                    </span>
                  </div>
                  {reply.text && (
                    <p
                      className="text-sm text-slate-700 leading-relaxed font-medium"
                      style={{
                        fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                        direction: 'rtl',
                        unicodeBidi: 'plaintext',
                        textRendering: 'optimizeLegibility',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale'
                      }}
                    >
                      {reply.text}
                    </p>
                  )}
                  {(reply.attachments || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {reply.attachments.map((att, i) => (
                        <AttachmentPreview key={i} att={att} />
                      ))}
                    </div>
                  )}
                  
                  {/* Reply Reactions */}
                  {Object.keys(reply.reactions || {}).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                      {Object.entries(reply.reactions).map(([emoji, count]) => {
                        const isUserReaction = reply.user_reactions?.current === emoji;
                        return (
                          <button
                            key={emoji}
                            onClick={() => onReplyReaction && onReplyReaction(reply.id, emoji)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-all shadow-sm border',
                              isUserReaction 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            )}
                          >
                            <span className="text-sm leading-none">{emoji}</span>
                            <span className="font-medium text-xs">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Reply Reaction Picker */}
                  <div className="flex items-center gap-1 mt-2">
                    <div className="relative group">
                      <button className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all">
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 px-2 py-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto z-20">
                        {REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              if (onReplyReaction) {
                                onReplyReaction(reply.id, emoji);
                              }
                              setShowReplyEmojiPicker(null);
                            }}
                            className={cn(
                              'text-lg p-1 rounded-lg hover:bg-slate-50 transition-all',
                              reply.user_reactions?.current === emoji && 'bg-indigo-100 ring-1 ring-indigo-300'
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-start pt-2 border-t border-slate-100">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 mt-2"
            style={{ background: currentUser.avatar_color || taskColor || '#6366f1' }}
          >
            {(currentUser.name || '?').charAt(0)}
          </div>
          <div className="flex-1 flex items-end gap-2 bg-slate-50 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
            <textarea
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              placeholder={L('اكتب رداً...', 'وەڵامێک بنووسە...')}
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400 resize-none"
              style={{
                fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                direction: 'rtl',
                unicodeBidi: 'plaintext',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                minHeight: '24px',
                overflow: 'hidden'
              }}
            />
            <button
              onClick={handleAddReply}
              disabled={!replyText.trim() && replyAttachments.length === 0}
              className="text-indigo-500 hover:text-indigo-700 disabled:opacity-30 transition-colors pb-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}