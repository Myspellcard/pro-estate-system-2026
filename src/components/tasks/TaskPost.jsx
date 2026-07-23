import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { format } from 'date-fns';
import { firebaseApi } from '@/api/firebaseClient';
import {
  Heart, MessageSquare, PlayCircle, CheckCircle2, Clock, XCircle,
  Calendar, Paperclip, MoreVertical, Send, Smile, ChevronDown,
  Trash2, Link as LinkIcon, Copy, Check,
  X, Edit2, Image, Video, Star, AlertTriangle, Users, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfessionalRichEditor from './ProfessionalRichEditor';
import TaskDescriptionViewer from './TaskDescriptionViewer';
import HrEvaluation from './HrEvaluation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REACTIONS = [
  // Positive / approval
  '👍','❤️','🔥','🎉','👏','😄',
  // Emotions
  '😍','🤩','😂','😢','😮','😡',
  // Work / task
  '✅','💯','⚡','🚀','💪','🙌',
  // Misc fun
  '👀','🤔','💡','🎯','⭐','🏆',
  // More feelings
  '😎','🥳','😅','🤣','😬','🫡',
];
const STATUS_CONFIG = {
  'معلقة': { icon: Clock, color: 'text-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', glow: '#f59e0b' },
  'جارية': { icon: PlayCircle, color: 'text-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200', glow: '#3b82f6' },
  'مكتملة': { icon: CheckCircle2, color: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', glow: '#22c55e' },
  'ملغاة': { icon: XCircle, color: 'text-red-400', badge: 'bg-red-100 text-red-600 border-red-200', glow: '#ef4444' },
};
const PRIORITY_BADGE = {
  'منخفضة جداً': { cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
  'منخفضة': { cls: 'bg-green-100 text-green-600 border-green-200', dot: 'bg-green-400' },
  'متوسطة': { cls: 'bg-orange-100 text-orange-600 border-orange-200', dot: 'bg-orange-400' },
  'عالية': { cls: 'bg-red-100 text-red-600 border-red-200', dot: 'bg-red-500' },
  'عالية جداً': { cls: 'bg-purple-100 text-purple-600 border-purple-200', dot: 'bg-purple-500' },
};

const TASK_COLORS = [
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

const PRIORITY_CONFIG = {
  'منخفضة جداً': { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  'منخفضة': { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-400' },
  'متوسطة': { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  'عالية':  { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  'عالية جداً': { color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
};

export default function TaskPost({
  task,
  employees,
  users = [],
  onLike,
  onStatusChange,
  onDelete,
  onAddComment,
  onAddReply,
  onTaskUpdate,
}) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const { can, isAdmin } = useUserPermissions();
  
  // Local state
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [commentLink, setCommentLink] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadingComment, setUploadingComment] = useState(false);
  const commentFileInputRef = useRef(null);
  const [replyText, setReplyText] = useState({});
  const [showShareLink, setShowShareLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: task.title, description: task.description || '', color: task.color || '#6366f1' });

  // Keep editData in sync when task prop changes (e.g. after save/refetch)
  useEffect(() => {
    if (!isEditing) {
      setEditData({ title: task.title, description: task.description || '', color: task.color || '#6366f1' });
    }
  }, [task.title, task.description, task.color]);
  const [newMedia, setNewMedia] = useState([]);
  const fileInputRef = React.useRef(null);
  const reactionLoadingRef = React.useRef(null);
  const [reactionLoading, setReactionLoading] = useState(null);
  const commentTriggerRefs = useRef({});
  const replyTriggerRefs = useRef({});
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG['معلقة'];
  const pb = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE['متوسطة'];
  const StatusIcon = sc.icon;
  const emp = employees.find(e => e.id === task.employee_id);
  const creatorUser = users.find(u => u.id === task.created_by_id);
  const creatorName = creatorUser?.username || emp?.full_name || (task.created_by_name || 'غير محدد');
  const taskColor = task.color || '#6366f1';
  const subtasksDone = (task.subtasks || []).filter(s => s.done).length;
  const subtasksTotal = (task.subtasks || []).length;
  const progressPct = subtasksTotal ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;
  const commentsCount = (task.comments || []).length;
  const descriptionText = task.description ? task.description.replace(/<[^>]*>/g, '').trim() : '';
  const shareUrl = task.share_token ? `${window.location.origin}/task-view?token=${task.share_token}` : '';

  const handleCommentMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingComment(true);
    const uploaded = await Promise.all(files.map(async (f) => {
      const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file: f });
      return { url: file_url, name: f.name, type: f.type };
    }));
    setCommentAttachments(prev => [...prev, ...uploaded]);
    setUploadingComment(false);
    e.target.value = '';
  };

  const handleAddComment = () => {
    if (!commentText.trim() && commentAttachments.length === 0 && !commentLink.trim()) return;
    const attachments = [...commentAttachments];
    if (commentLink.trim()) {
      attachments.push({ url: commentLink.trim(), name: commentLink.trim(), type: 'link' });
    }
    const newComment = {
      id: Math.random().toString(36).slice(2),
      author: lang === 'ku' ? 'من' : 'أنا',
      author_id: 'current',
      text: commentText.trim(),
      created_at: new Date().toISOString(),
      type: 'public',
      reactions: {},
      replies: [],
      avatar_color: taskColor,
      attachments,
    };
    onAddComment(task.id, newComment);
    setCommentText('');
    setCommentAttachments([]);
    setCommentLink('');
    setShowLinkInput(false);
  };

  const handleAddReply = (commentId) => {
    const key = `${task.id}-${commentId}`;
    if (!replyText[key]?.trim()) return;
    const newReply = {
      id: Math.random().toString(36).slice(2),
      author: lang === 'ku' ? 'من' : 'أنا',
      author_id: 'current',
      text: replyText[key].trim(),
      created_at: new Date().toISOString(),
      reactions: {},
    };
    onAddReply(task.id, commentId, newReply);
    setReplyText(p => ({ ...p, [key]: '' }));
  };

  const handleCommentReaction = (commentId, emoji) => {
    const comment = (task.comments || []).find(c => c.id === commentId);
    if (!comment) return;
    
    const currentReactions = comment.reactions || {};
    const currentUserReaction = comment.user_reactions?.current || null;
    
    let newReactions = { ...currentReactions };
    let newUserReaction = currentUserReaction;
    
    // If clicking the SAME reaction → toggle OFF (remove)
    if (currentUserReaction === emoji) {
      const newCount = (currentReactions[emoji] || 1) - 1;
      if (newCount <= 0) {
        delete newReactions[emoji];
      } else {
        newReactions[emoji] = newCount;
      }
      newUserReaction = null;
    } 
    // If clicking a DIFFERENT reaction → switch
    else {
      // Remove old reaction if exists
      if (currentUserReaction) {
        const oldCount = (currentReactions[currentUserReaction] || 1) - 1;
        if (oldCount <= 0) {
          delete newReactions[currentUserReaction];
        } else {
          newReactions[currentUserReaction] = oldCount;
        }
      }
      // Add new reaction
      newReactions[emoji] = (currentReactions[emoji] || 0) + 1;
      newUserReaction = emoji;
    }
    
    const updatedComment = {
      ...comment,
      reactions: newReactions,
      user_reactions: { current: newUserReaction }
    };
    const updatedComments = (task.comments || []).map(c => 
      c.id === commentId ? updatedComment : c
    );
    onTaskUpdate(task.id, { comments: updatedComments });
  };

  const handleReplyReaction = (commentId, replyId, emoji) => {
    const comment = (task.comments || []).find(c => c.id === commentId);
    if (!comment) return;
    
    const reply = (comment.replies || []).find(r => r.id === replyId);
    if (!reply) return;
    
    const currentReactions = reply.reactions || {};
    const currentUserReaction = reply.user_reactions?.current || null;
    
    let newReactions = { ...currentReactions };
    let newUserReaction = currentUserReaction;
    
    // If clicking the SAME reaction → toggle OFF (remove)
    if (currentUserReaction === emoji) {
      const newCount = (currentReactions[emoji] || 1) - 1;
      if (newCount <= 0) {
        delete newReactions[emoji];
      } else {
        newReactions[emoji] = newCount;
      }
      newUserReaction = null;
    } 
    // If clicking a DIFFERENT reaction → switch
    else {
      // Remove old reaction if exists
      if (currentUserReaction) {
        const oldCount = (currentReactions[currentUserReaction] || 1) - 1;
        if (oldCount <= 0) {
          delete newReactions[currentUserReaction];
        } else {
          newReactions[currentUserReaction] = oldCount;
        }
      }
      // Add new reaction
      newReactions[emoji] = (currentReactions[emoji] || 0) + 1;
      newUserReaction = emoji;
    }
    
    const updatedReply = {
      ...reply,
      reactions: newReactions,
      user_reactions: { current: newUserReaction }
    };
    const updatedComment = {
      ...comment,
      replies: (comment.replies || []).map(r => 
        r.id === replyId ? updatedReply : r
      )
    };
    const updatedComments = (task.comments || []).map(c => 
      c.id === commentId ? updatedComment : c
    );
    onTaskUpdate(task.id, { comments: updatedComments });
  };

  const [currentUser, setCurrentUser] = useState(null);
  React.useEffect(() => { firebaseApi.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const [showParticipants, setShowParticipants] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showImageModal, setShowImageModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ type: null, commentId: null, replyId: null });
  const [showStatusPicker, setShowStatusPicker] = useState(false);


  const [shareExpiry, setShareExpiry] = useState('');

  const handleShareClick = async () => {
    if (!task.share_token) {
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await onTaskUpdate(task.id, { share_token: token, share_token_expires_at: null });
      setTimeout(() => setShowShareLink(true), 300);
    } else {
      setShowShareLink(true);
    }
  };

  const handleRevokeLink = async () => {
    await onTaskUpdate(task.id, { share_token: null, share_token_expires_at: null });
    setShowShareLink(false);
    setShareExpiry('');
  };

  const handleSetExpiry = async (date) => {
    setShareExpiry(date);
    if (date) {
      await onTaskUpdate(task.id, { share_token_expires_at: new Date(date).toISOString() });
    } else {
      await onTaskUpdate(task.id, { share_token_expires_at: null });
    }
  };

  const copyLink = () => {
    const url = task.share_token ? `${window.location.origin}/task-view?token=${task.share_token}` : shareUrl;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowActions(false);
  };

  // Strip all style attributes, font tags, and style blocks — keep only semantic HTML
  const sanitizeDescription = (html) => {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // remove <style> blocks
      .replace(/\s*style="[^"]*"/gi, '')                  // remove all style= attributes
      .replace(/\s*class="[^"]*"/gi, '')                  // remove class= attributes
      .replace(/<font[^>]*>/gi, '')                       // remove <font> open tags
      .replace(/<\/font>/gi, '')                          // remove </font> close tags
      .replace(/<span>\s*<\/span>/gi, '')                 // remove empty spans
      .replace(/&nbsp;/g, ' ')                            // normalize nbsp
      .trim();
  };

  const handleSaveEdit = () => {
    const sanitized = sanitizeDescription(editData.description);
    onTaskUpdate(task.id, { title: editData.title, description: sanitized, color: editData.color });
    setIsEditing(false);
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    const uploaded = await Promise.all(files.map(async (f) => {
      const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file: f });
      return {
        url: file_url,
        name: f.name,
        type: f.type,
        uploaded_at: new Date().toISOString()
      };
    }));
    
    const updatedAttachments = [...(task.attachments || []), ...uploaded];
    onTaskUpdate(task.id, { attachments: updatedAttachments });
    setNewMedia([]);
  };

  const removeAttachment = (idx) => {
    const updated = (task.attachments || []).filter((_, i) => i !== idx);
    onTaskUpdate(task.id, { attachments: updated });
  };

  const cycleStatus = () => {
    const statuses = ['معلقة', 'جارية', 'مكتملة', 'ملغاة'];
    const idx = statuses.indexOf(task.status);
    const next = statuses[(idx + 1) % statuses.length];
    onStatusChange(task.id, next);
  };

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 overflow-hidden',
      task.status === 'مكتملة' && 'opacity-80'
    )}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
            style={{ background: `linear-gradient(135deg, ${taskColor}, ${taskColor}99)` }}>
            {creatorName.charAt(0)}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{L('مهمة', 'ئەرک')}</span>
            <p className="font-semibold text-sm text-slate-800 leading-tight">{creatorName}</p>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-400">{task.created_date ? format(new Date(task.created_date), 'dd/MM/yyyy') : ''}</span>
            {(task.participants || []).length > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <div className="relative">
                  <button
                    onClick={() => setShowParticipants(!showParticipants)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    {(task.participants || []).length}
                  </button>
                  {showParticipants && (
                    <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 min-w-36 flex flex-col gap-1">
                      {(task.participants || []).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 text-sm text-slate-700">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {p.employee_name?.charAt(0)}
                          </div>
                          {p.employee_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {(isAdmin || can('can_share_tasks')) && (
          <button onClick={handleShareClick} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title={L('مشاركة', 'هاوبەشکردن')}>
            <LinkIcon className="w-4 h-4" />
          </button>
        )}
          <div className="relative">
            <button onClick={() => setShowActions(!showActions)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActions && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-32">
                {(isAdmin || can('can_edit_tasks')) && (
                  <button onClick={handleEdit} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    <Edit2 className="w-3.5 h-3.5" />
                    {L('تعديل', 'دەستکاریکردن')}
                  </button>
                )}
                {(isAdmin || can('can_edit_tasks')) && (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    <Image className="w-3.5 h-3.5" />
                    {L('إضافة صورة', 'زیادکردنی وێنە')}
                  </button>
                )}
                {(isAdmin || can('can_delete_tasks')) && (
                  <button onClick={() => onDelete(task.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                    {L('حذف', 'سڕینەوە')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {isEditing ? (
          <div className="space-y-3 mb-3">
            <input
              value={editData.title}
              onChange={(e) => setEditData(p => ({ ...p, title: e.target.value }))}
              className="w-full text-base font-bold px-3 py-1.5 rounded-lg outline-none"
              style={{
                background: `${editData.color}15`,
                borderColor: `${editData.color}40`,
                color: editData.color,
                fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                textRendering: 'optimizeLegibility',
                fontVariantLigatures: 'common-ligatures contextual',
                fontFeatureSettings: '"liga" 1, "calt" 1, "dlig" 1',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                direction: 'rtl',
                unicodeBidi: 'plaintext'
              }}
              placeholder={L('عنوان المهمة', 'سەردێڕی ئەرک')}
            />
            <ProfessionalRichEditor
              value={editData.description}
              onChange={val => setEditData(p => ({ ...p, description: val }))}
              placeholder={L('وصف المهمة...', 'وەسفی ئەرک...')}
            />
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">{L('لون المهمة', 'رەنگی ئەرک')}</label>
              <div className="grid grid-cols-1 gap-1.5 mb-3">
                {TASK_COLORS.map(({color,label}) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditData(p => ({ ...p, color }))}
                    className={cn('flex items-center gap-2.5 p-2 rounded-xl transition-all border-2', editData.color === color ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300')}
                  >
                    <span className="w-7 h-7 rounded-full shadow-sm shrink-0" style={{ background: color }} />
                    <span className="text-sm font-bold text-slate-700">{L(label.ar,label.ku)}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <label className="text-xs text-slate-500 font-medium">{L('مخصص', 'تایبەت')}</label>
                <label className="w-7 h-7 rounded-full cursor-pointer overflow-hidden shadow-sm hover:scale-110 transition-all ring-2 ring-white ring-offset-1 relative" title={L('لون مخصص', 'رەنگی تایبەت')}>
                  <input
                    type="color"
                    value={editData.color}
                    onChange={(e) => setEditData(p => ({ ...p, color: e.target.value }))}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-xs" style={{ background: editData.color }}>+</div>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEdit} className="px-4 py-1.5 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-all" style={{ background: editData.color }}>
                {L('حفظ', 'پاشەکەوتکردن')}
              </button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3
              className={cn('block w-full font-bold text-base leading-snug px-4 py-3 rounded-xl mb-2', task.status === 'مكتملة' && 'line-through')}
              style={{
                background: task.status === 'مكتملة'
                  ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0)'
                  : `linear-gradient(135deg, ${taskColor}22, ${taskColor}10)`,
                borderLeft: task.status === 'مكتملة' ? '4px solid #e2e8f0' : `4px solid ${taskColor}`,
                color: task.status === 'مكتملة' ? '#94a3b8' : taskColor,
                fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                boxShadow: task.status === 'مكتملة' ? 'none' : `0 2px 8px ${taskColor}20`
              }}
            >
              {task.title}
            </h3>
            <TaskDescriptionViewer description={task.description} />
          </>
        )}

        {/* Tags */}
        {!isEditing && (
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5', sc.badge)}>
              <StatusIcon className="w-3.5 h-3.5" />{task.status}
            </span>
            <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-lg border', pb.cls)}>
              {task.priority}
            </span>
            {/* Group Badge */}
            {task.group_id && task.group_name && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border"
                style={{
                  background: '#f0f9ff',
                  borderColor: '#bae6fd',
                  color: '#0369a1'
                }}>
                <Users className="w-3.5 h-3.5" />
                {task.group_name}
              </span>
            )}
            {/* Tags */}
            {(task.tags || []).map(tag => (
              <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border"
                style={{ background: `${taskColor}10`, borderColor: `${taskColor}30`, color: taskColor }}>
                #{tag}
              </span>
            ))}
            {/* Color Label */}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border"
              style={{
                background: `${taskColor}10`,
                borderColor: `${taskColor}40`,
                color: taskColor
              }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: taskColor }} />
              {L(TASK_COLORS.find(c => c.color === taskColor)?.label.ar || 'عام', TASK_COLORS.find(c => c.color === taskColor)?.label.ku || 'گشتی')}
            </span>
            {/* Rating Stars - Interactive */}
            <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-lg">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => (isAdmin || can('can_rate_tasks')) && onTaskUpdate(task.id, { rating: star })}
                  className={`transition-transform hover:scale-110 active:scale-90 ${!(isAdmin || can('can_rate_tasks')) ? 'cursor-default' : ''}`}
                >
                  <Star
                    className="w-4 h-4"
                    style={{
                      fill: star <= (task.rating || 0) ? '#fbbf24' : 'none',
                      stroke: star <= (task.rating || 0) ? '#f59e0b' : '#d1d5db',
                      strokeWidth: 2
                    }}
                  />
                </button>
              ))}
            </div>
            {task.due_date && (
              <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border',
                task.due_date && new Date(task.due_date) < new Date() && task.status !== 'مكتملة'
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200')}>
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(task.due_date), 'dd/MM/yyyy')}
              </span>
            )}
            {(task.attachments || []).length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                {(task.attachments || []).length}
              </span>
            )}
          </div>
        )}

        {/* Progress */}
        {!isEditing && subtasksTotal > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{subtasksDone}/{subtasksTotal} {L('فرعية', 'لاوەکی')}</span>
              <span className="font-semibold" style={{ color: taskColor }}>{progressPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: taskColor }} />
            </div>
          </div>
        )}

        {/* Media Attachments */}
        {!isEditing && (task.attachments || []).length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(task.attachments || []).map((att, idx) => {
              const isImage = att.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url || '');
              const isVideo = att.type?.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(att.url || '');
              
              if (isImage) {
                return (
                  <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setShowImageModal(att.url)}>
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeAttachment(idx); }}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              }
              if (isVideo) {
                return (
                  <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <video src={att.url} controls className="w-full h-full" />
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Add Media Button */}
        {!isEditing && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors text-sm"
            >
              <Image className="w-4 h-4" />
              {L('إضافة صورة', 'زیادکردنی وێنە')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors text-sm"
            >
              <Video className="w-4 h-4" />
              {L('إضافة فيديو', 'زیادکردنی ڤیدیۆ')}
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleMediaUpload}
        />
      </div>

      {/* Share Link Banner */}
      {showShareLink && task.share_token && (
        <div className="mx-4 mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-500 shrink-0" />
            <input readOnly value={`${window.location.origin}/task-view?token=${task.share_token}`} className="flex-1 bg-transparent text-xs text-blue-700 outline-none truncate font-mono min-w-0" />
            <button onClick={copyLink} className="flex items-center gap-1 text-xs font-bold text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? L('تم!', 'کۆپی کرا!') : L('نسخ', 'کۆپی')}
            </button>
            <button onClick={() => setShowShareLink(false)} className="p-1 rounded-lg hover:bg-blue-100 shrink-0"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-blue-200">
            <span className="text-xs text-blue-600 font-semibold shrink-0">{L('ينتهي في:', 'بەسەردەچێت لە:')}</span>
            <input
              type="date"
              value={shareExpiry || (task.share_token_expires_at ? task.share_token_expires_at.split('T')[0] : '')}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => handleSetExpiry(e.target.value)}
              className="flex-1 bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-300 min-w-0"
            />
            {(task.share_token_expires_at || shareExpiry) && (
              <button onClick={() => handleSetExpiry('')} className="text-xs text-slate-400 hover:text-slate-600 shrink-0" title={L('إزالة الانتهاء', 'لابردنی کۆتایی')}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={handleRevokeLink} className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0">
              {L('إلغاء الرابط', 'لابردنی لینک')}
            </button>
          </div>
          {task.share_token_expires_at && (
            <p className="text-[10px] text-blue-500">
              {new Date(task.share_token_expires_at) < new Date()
                ? L('⚠️ الرابط منتهي الصلاحية', '⚠️ لینکەکە بەسەرچووە')
                : L(`ينتهي: ${format(new Date(task.share_token_expires_at), 'dd/MM/yyyy')}`, `کۆتایی: ${format(new Date(task.share_token_expires_at), 'dd/MM/yyyy')}`)}
            </p>
          )}
        </div>
      )}

      {/* Image Full View Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImageModal(null)}
        >
          <button onClick={() => setShowImageModal(null)} className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={showImageModal} 
            alt="Full view" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Comments Preview */}
      {commentsCount > 0 && (
        <div className="px-4 pb-3 border-t border-slate-100">
          <button onClick={() => setShowComments(!showComments)} className="w-full text-left text-sm text-slate-500 hover:text-slate-700 transition-colors py-2 flex items-center justify-between">
            <span><span className="font-semibold text-slate-700">{commentsCount}</span> {L('تعليقات', 'لێدوان')}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showComments && 'rotate-180')} />
          </button>
          
          {showComments && (
            <div className="space-y-4 mt-3">
              {(task.comments || []).map((comment, idx) => (
                <div key={comment.id || idx} className="relative">
                  {/* Comment */}
                  <div className="flex gap-3 items-start group">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${comment.avatar_color || taskColor || '#6366f1'}, ${(comment.avatar_color || taskColor || '#6366f1')}99)` }}>
                      {(comment.author || '?').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="relative bg-white rounded-3xl px-5 py-4 border-2 shadow-md hover:shadow-lg transition-all overflow-hidden"
                        style={{ 
                          borderColor: comment.user_reactions?.current ? `${comment.user_reactions.current}40` : '#e2e8f0',
                          background: `linear-gradient(135deg, #ffffff 0%, ${(comment.user_reactions?.current || '#f1f5f9')}08 100%)`
                        }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900 }}>{comment.author}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{comment.created_at ? format(new Date(comment.created_at), 'dd/MM HH:mm') : ''}</span>
                          </div>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'comment', commentId: comment.id, replyId: null })}
                            className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                            title={L('حذف', 'سڕینەوە')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {comment.text && <p className="text-base text-slate-700 leading-relaxed font-medium" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif' }}>{comment.text.replace(/<[^>]*>/g, '')}</p>}

                        {/* Comment Attachments */}
                        {(comment.attachments || []).length > 0 && (
                          <div className="flex flex-col gap-2 mt-2 w-full overflow-hidden">
                            {comment.attachments.map((att, ai) => {
                              const isImg = att.type?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url || '');
                              const isVid = att.type?.startsWith('video') || /\.(mp4|webm|ogg)$/i.test(att.url || '');
                              const isLink = att.type === 'link';
                              if (isImg) return <img key={ai} src={att.url} alt="" onClick={() => setShowImageModal(att.url)} className="h-20 w-28 object-cover rounded-lg border cursor-pointer hover:opacity-90" />;
                              if (isVid) return <video key={ai} src={att.url} controls className="w-full max-h-48 rounded-lg border" />;
                              if (isLink) return (
                                <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-start gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600 hover:bg-blue-100 w-full">
                                  <LinkIcon className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span className="break-all">{att.url}</span>
                                </a>
                              );
                              return null;
                            })}
                          </div>
                        )}

                        {/* Comment Reactions */}
                        {Object.keys(comment.reactions || {}).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                            {Object.entries(comment.reactions).map(([emoji, count]) => {
                              const isUserReaction = comment.user_reactions?.current === emoji;
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleCommentReaction(comment.id, emoji)}
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
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center gap-3 mt-2.5 ml-1">
                        <div className="relative">
                          <button
                            ref={el => commentTriggerRefs.current[comment.id] = el}
                            onClick={() => {
                              if (showEmojiPicker === `comment-${comment.id}`) {
                                setShowEmojiPicker(null);
                              } else {
                                setShowEmojiPicker(`comment-${comment.id}`);
                                const rect = commentTriggerRefs.current[comment.id]?.getBoundingClientRect();
                                if (rect) {
                                  setPickerPosition({
                                    top: rect.top - 280,
                                    left: Math.max(10, Math.min(rect.left, window.innerWidth - 280))
                                  });
                                }
                              }
                            }}
                            className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors px-4 py-2 rounded-full hover:bg-indigo-50"
                          >
                            <Smile className="w-5 h-5" />
                            {L('تفاعل', 'کاردانەوە')}
                          </button>
                          {showEmojiPicker === `comment-${comment.id}` && (
                            <div className="fixed bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 p-3 z-[200] max-h-60 overflow-y-auto" style={{width: '260px', top: pickerPosition.top, left: pickerPosition.left}}>
                              <div className="grid grid-cols-6 gap-1.5">
                                {REACTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => { handleCommentReaction(comment.id, emoji); setShowEmojiPicker(null); }}
                                    className={cn(
                                      'text-xl p-1.5 rounded-xl hover:bg-indigo-50 transition-all shrink-0',
                                      comment.user_reactions?.current === emoji && 'bg-indigo-100 ring-2 ring-indigo-300'
                                    )}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setReplyText(p => ({ ...p, [`${task.id}-${comment.id}`]: p[`${task.id}-${comment.id}`] || '' }))}
                          className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors px-4 py-2 rounded-full hover:bg-indigo-50 flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-5 h-5" />
                          {L('رد', 'وەڵام')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reply Input */}
                  {replyText.hasOwnProperty(`${task.id}-${comment.id}`) && (
                    <div className="flex gap-2 items-start mt-3 mr-2 ml-12">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                        أ
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          value={replyText[`${task.id}-${comment.id}`] || ''}
                          onChange={(e) => setReplyText(p => ({ ...p, [`${task.id}-${comment.id}`]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                          placeholder={L('اكتب رد...', 'وەڵام بنووسە...')}
                          className="flex-1 bg-white rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-200 shadow-sm"
                        />
                        <button onClick={() => handleAddReply(comment.id)}
                          className="px-4 py-2 rounded-full text-sm font-bold text-white shadow-md hover:opacity-90 transition-all"
                          style={{ background: taskColor }}>
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => setReplyText(p => ({ ...p, [`${task.id}-${comment.id}`]: '' }))}
                          className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {(comment.replies || []).length > 0 && (
                    <div className="space-y-3 mt-3 mr-2 ml-12">
                      {comment.replies.map((reply, rIdx) => (
                        <div key={reply.id || rIdx} className="flex gap-3 items-start group">
                          <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${(reply.avatar_color || taskColor || '#6366f1')}, ${(reply.avatar_color || taskColor || '#6366f1')}99)` }}>
                            {(reply.author || '?').charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="relative bg-white rounded-3xl px-5 py-4 border-2 shadow-md hover:shadow-lg transition-all overflow-hidden"
                            style={{ 
                              borderColor: reply.user_reactions?.current ? `${reply.user_reactions.current}40` : '#e2e8f0',
                              background: `linear-gradient(135deg, #ffffff 0%, ${(reply.user_reactions?.current || '#f1f5f9')}08 100%)`
                            }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-slate-800" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900 }}>{reply.author}</span>
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{reply.created_at ? format(new Date(reply.created_at), 'dd/MM HH:mm') : ''}</span>
                                </div>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'reply', commentId: comment.id, replyId: reply.id })}
                                  className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                                  title={L('حذف', 'سڕینەوە')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-base text-slate-700 leading-relaxed font-medium" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif' }}>{reply.text}</p>
                              
                              {/* Reply Reactions */}
                              {Object.keys(reply.reactions || {}).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                                  {Object.entries(reply.reactions).map(([emoji, count]) => {
                                    const isUserReaction = reply.user_reactions?.current === emoji;
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReplyReaction(comment.id, reply.id, emoji)}
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
                                      </div>

                                      {/* Reply Actions */}
                                      <div className="flex items-center gap-2 mt-2.5 ml-1">
                                      <div className="relative">
                                      <button
                                      ref={el => replyTriggerRefs.current[reply.id] = el}
                                      onClick={() => {
                                      if (showEmojiPicker === `reply-${reply.id}`) {
                                      setShowEmojiPicker(null);
                                      } else {
                                      setShowEmojiPicker(`reply-${reply.id}`);
                                      const rect = replyTriggerRefs.current[reply.id]?.getBoundingClientRect();
                                      if (rect) {
                                        setPickerPosition({
                                          top: rect.top - 280,
                                          left: Math.max(10, Math.min(rect.left, window.innerWidth - 280))
                                        });
                                      }
                                      }
                                      }}
                                      className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors px-4 py-2 rounded-full hover:bg-indigo-50"
                                      >
                                      <Smile className="w-5 h-5" />
                                      </button>
                                {showEmojiPicker === `reply-${reply.id}` && (
                                  <div className="fixed bg-white rounded-2xl shadow-2xl border-2 border-indigo-100 p-3 z-[200] max-h-60 overflow-y-auto" style={{width: '260px', top: pickerPosition.top, left: pickerPosition.left}}>
                                    <div className="grid grid-cols-6 gap-1.5">
                                      {REACTIONS.map(emoji => (
                                        <button
                                          key={emoji}
                                          onClick={() => { handleReplyReaction(comment.id, reply.id, emoji); setShowEmojiPicker(null); }}
                                          className={cn(
                                            'text-xl p-1.5 rounded-xl hover:bg-indigo-50 transition-all shrink-0',
                                            reply.user_reactions?.current === emoji && 'bg-indigo-100 ring-2 ring-indigo-300'
                                          )}
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HR Evaluation — shown to HR/admin, and shown as notice to others when task is done/cancelled pending HR */}
      {!isEditing && (
        <>
          {/* Awaiting HR banner — visible to everyone when task is done/cancelled but no HR eval yet */}
          {(task.status === 'مكتملة' || task.status === 'ملغاة') && !task.hr_evaluation && !(isAdmin || can('can_hr_tasks')) && (
            <div className="mx-4 mb-3 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-l from-violet-50 to-purple-50 border-2 border-dashed border-purple-300">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-700">{L('بانتظار تقييم HR', 'چاوەڕوانی هەڵسەنگاندنی HR')}</p>
                <p className="text-xs text-purple-400">{L('هذه المهمة بانتظار مراجعة الموارد البشرية', 'ئەم ئەرکە چاوەڕوانی پێداچوونەوەی HR ە')}</p>
              </div>
            </div>
          )}

          {/* Full HR panel for HR/admin users */}
          {(isAdmin || can('can_hr_tasks')) && (
            <div className="px-4 pb-3 border-t border-slate-100 pt-3">
              {/* Banner nudge when task just became done/cancelled */}
              {(task.status === 'مكتملة' || task.status === 'ملغاة') && !task.hr_evaluation && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs font-bold text-amber-700">{L('هذه المهمة تحتاج تقييم HR', 'ئەم ئەرکە پێویستی بە هەڵسەنگاندنی HR هەیە')}</p>
                </div>
              )}
              <HrEvaluation task={task} currentUser={currentUser} onTaskUpdate={onTaskUpdate} />
            </div>
          )}
        </>
      )}

      {/* Action Bar */}
      <div className="border-t border-slate-100 px-2 py-1.5 flex items-center justify-between">
        <div className="relative flex-1 flex items-center gap-0.5">
          <button onClick={() => setIsLiked(!isLiked)}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95',
              isLiked ? 'text-rose-600 bg-rose-50' : 'text-slate-600 hover:bg-slate-50')}>
            <Heart className={cn('w-5 h-5', isLiked && 'fill-rose-600')} />
            <span className="hidden sm:inline">{isLiked ? L('أعجبني', 'باشمکرد') : L('إعجاب', 'باشکردن')}</span>
          </button>

          {(isAdmin || can('can_comment_tasks')) && (
          <button onClick={() => setShowComments(!showComments)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            <MessageSquare className="w-5 h-5" />
            <span className="hidden sm:inline">{L('تعليق', 'لێدوان')}</span>
          </button>
        )}

          <div className="relative flex-1">
            <button
              onClick={() => setShowStatusPicker(p => !p)}
              className={cn('w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all', sc.badge, 'border-0 bg-transparent hover:opacity-80')}
              title={L('تغيير الحالة', 'گۆڕینی دۆخ')}
            >
              <StatusIcon className="w-5 h-5" />
              <span>{task.status}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showStatusPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusPicker(false)} />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 min-w-44">
                  {[
                    { s: 'معلقة',  Icon: Clock,        cls: 'text-amber-600 hover:bg-amber-50' },
                    { s: 'جارية',  Icon: PlayCircle,   cls: 'text-blue-600 hover:bg-blue-50' },
                    { s: 'مكتملة', Icon: CheckCircle2, cls: 'text-emerald-600 hover:bg-emerald-50' },
                    { s: 'ملغاة',  Icon: XCircle,      cls: 'text-red-500 hover:bg-red-50' },
                  ].map(({ s, Icon: SIcon, cls }) => (
                    <button
                      key={s}
                      onClick={() => { onStatusChange(task.id, s); setShowStatusPicker(false); }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors',
                        cls,
                        task.status === s && 'ring-inset ring-2 ring-current bg-opacity-10'
                      )}
                    >
                      <SIcon className="w-4 h-4 shrink-0" />
                      <span>{s}</span>
                      {task.status === s && <span className="mr-auto text-xs opacity-60">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Comment Input (always visible when comments open) */}
        {showComments && (
          <div className="w-full mr-2 mt-2">
            <div className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-2"
                style={{ background: taskColor }}>
                أ
              </div>
              <div className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
                <textarea
                  value={commentText}
                  onChange={(e) => {
                    setCommentText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                  }}
                  placeholder={L('اكتب تعليقاً...', 'لێدوانێک بنووسە...')}
                  rows={1}
                  className="w-full bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400 resize-none"
                  style={{
                    fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                    direction: 'rtl',
                    unicodeBidi: 'plaintext',
                    minHeight: '24px',
                    overflow: 'hidden'
                  }}
                />

                {/* Attachment previews */}
                {commentAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {commentAttachments.map((att, i) => {
                      const isImg = att.type?.startsWith('image');
                      const isVid = att.type?.startsWith('video');
                      return (
                        <div key={i} className="relative group">
                          {isImg && <img src={att.url} alt="" className="h-14 w-18 object-cover rounded-lg border" />}
                          {isVid && <video src={att.url} className="h-14 rounded-lg border" />}
                          {!isImg && !isVid && <span className="text-xs bg-white border rounded px-2 py-1">{att.name.slice(0,15)}</span>}
                          <button onClick={() => setCommentAttachments(p => p.filter((_,j) => j !== i))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Link input */}
                {showLinkInput && (
                  <div className="flex gap-2 mt-2 items-center w-full min-w-0">
                    <input
                      value={commentLink}
                      onChange={e => setCommentLink(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 min-w-0 bg-white border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    <button onClick={() => { setShowLinkInput(false); setCommentLink(''); }} className="text-slate-400 hover:text-red-500 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200">
                  <div className="flex items-center gap-1">
                    <button onClick={() => commentFileInputRef.current?.click()} disabled={uploadingComment}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors" title={L('إضافة صورة', 'وێنە زیاد بکە')}>
                      <Image className="w-4 h-4" />
                    </button>
                    <button onClick={() => commentFileInputRef.current?.click()} disabled={uploadingComment}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors" title={L('إضافة فيديو', 'ڤیدیۆ زیاد بکە')}>
                      <Video className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowLinkInput(!showLinkInput)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors" title={L('إضافة رابط', 'لینک زیاد بکە')}>
                      <LinkIcon className="w-4 h-4" />
                    </button>
                    {uploadingComment && <span className="text-xs text-slate-400">{L('جاري الرفع...', 'بارکردن...')}</span>}
                  </div>
                  <button onClick={handleAddComment}
                    disabled={!commentText.trim() && commentAttachments.length === 0 && !commentLink.trim()}
                    className="text-indigo-500 hover:text-indigo-700 disabled:opacity-30 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <input ref={commentFileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleCommentMediaUpload} />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.type !== null} onOpenChange={() => setDeleteConfirm({ type: null, commentId: null, replyId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L('تأكيد الحذف', 'دڵنیایی لە سڕینەوە')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.type === 'comment' 
                ? L('هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.', 'دڵنیایت لە سڕینەوەی ئەم لێدوانە؟ ناتوانرێت گەڕێنرێتەوە.')
                : L('هل أنت متأكد من حذف هذا الرد؟ لا يمكن التراجع عن هذا الإجراء.', 'دڵنیایت لە سڕینەوەی ئەم وەڵامە؟ ناتوانرێت گەڕێنرێتەوە.')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L('إلغاء', 'پاشگەزبوونەوە')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm.type === 'comment') {
                  const updatedComments = (task.comments || []).filter(c => c.id !== deleteConfirm.commentId);
                  onTaskUpdate(task.id, { comments: updatedComments });
                } else if (deleteConfirm.type === 'reply') {
                  const updatedComments = (task.comments || []).map(c => {
                    if (c.id === deleteConfirm.commentId) {
                      return { ...c, replies: (c.replies || []).filter(r => r.id !== deleteConfirm.replyId) };
                    }
                    return c;
                  });
                  onTaskUpdate(task.id, { comments: updatedComments });
                }
                setDeleteConfirm({ type: null, commentId: null, replyId: null });
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {L('حذف', 'سڕینەوە')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}