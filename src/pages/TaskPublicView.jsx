import React, { useEffect, useState, useRef } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { CheckCircle2, Clock, PlayCircle, XCircle, Flag, Calendar, User, Paperclip, FileText, Send, MessageSquare, Image, Link as LinkIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  'معلقة':  { icon: Clock,        color: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700' },
  'جارية':  { icon: PlayCircle,   color: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700' },
  'مكتملة': { icon: CheckCircle2, color: 'text-green-500',  badge: 'bg-green-100 text-green-700' },
  'ملغاة':  { icon: XCircle,      color: 'text-red-400',    badge: 'bg-red-100 text-red-700' },
};
const PRIORITY_BADGE = {
  'منخفضة': 'bg-slate-100 text-slate-600',
  'متوسطة': 'bg-orange-100 text-orange-700',
  'عالية':  'bg-red-100 text-red-700',
};

const REACTIONS = ['👍','❤️','😂','😮','🎉','🔥'];

function genId() { return Math.random().toString(36).slice(2, 10); }

function AttachmentPreview({ att }) {
  const isImg = att.type?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url || '');
  const isVid = att.type?.startsWith('video') || /\.(mp4|webm|ogg)$/i.test(att.url || '');
  const isLink = att.type === 'link';
  if (isImg) return (
    <a href={att.url} target="_blank" rel="noopener noreferrer">
      <img src={att.url} alt={att.name} className="h-20 w-28 object-cover rounded-lg border" />
    </a>
  );
  if (isVid) return (
    <video src={att.url} controls className="max-h-40 rounded-lg border" />
  );
  if (isLink) return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-2 px-3 py-2 border rounded-lg bg-blue-50 text-xs hover:bg-blue-100 text-blue-600 w-full">
      <LinkIcon className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="break-all">{att.url}</span>
    </a>
  );
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/40 text-xs hover:bg-muted max-w-48">
      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
      <span className="truncate">{att.name}</span>
    </a>
  );
}

export default function TaskPublicView() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [authorName, setAuthorName] = useState(() => localStorage.getItem('task_comment_author') || '');
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [commentLink, setCommentLink] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mediaInputRef = useRef(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError('رابط غير صالح'); setLoading(false); return; }
    firebaseApi.functions.invoke('getTaskByToken', { token })
      .then(res => {
        if (res.data?.task) setTask(res.data.task);
        else if (res.data?.error === 'expired') setError('انتهت صلاحية رابط المشاركة هذا');
        else setError('المهمة غير موجودة أو انتهت صلاحية الرابط');
        setLoading(false);
      })
      .catch((err) => {
        const msg = err?.response?.data?.error;
        if (msg === 'expired') setError('انتهت صلاحية رابط المشاركة هذا');
        else setError('حدث خطأ');
        setLoading(false);
      });
  }, [token]);

  const updateComments = async (updatedComments) => {
    await firebaseApi.functions.invoke('updateTaskComments', { token, task_id: task.id, comments: updatedComments });
    setTask(p => ({ ...p, comments: updatedComments }));
  };

  const handleToggleReaction = async (commentId, emoji) => {
    const updatedComments = (task.comments || []).map(c => {
      if (c.id !== commentId) return c;
      const reactions = c.reactions || {};
      const current = reactions[emoji] || 0;
      return { ...c, reactions: { ...reactions, [emoji]: current > 0 ? current - 1 : current + 1 } };
    });
    await updateComments(updatedComments);
  };

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingMedia(true);
    const uploaded = await Promise.all(files.map(async (f) => {
      const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file: f });
      return { url: file_url, name: f.name, type: f.type };
    }));
    setCommentAttachments(prev => [...prev, ...uploaded]);
    setUploadingMedia(false);
    e.target.value = '';
  };

  const handleAddComment = async () => {
    if (!commentText.trim() && commentAttachments.length === 0 && !commentLink.trim()) return;
    const name = authorName.trim() || 'زائر';
    localStorage.setItem('task_comment_author', name);
    setSubmitting(true);
    const attachments = [...commentAttachments];
    if (commentLink.trim()) {
      attachments.push({ url: commentLink.trim(), name: commentLink.trim(), type: 'link' });
    }
    const newComment = {
      id: genId(),
      author: name,
      text: commentText.trim(),
      created_at: new Date().toISOString(),
      attachments,
      replies: [],
    };
    await updateComments([...(task.comments || []), newComment]);
    setCommentText('');
    setCommentAttachments([]);
    setCommentLink('');
    setShowLinkInput(false);
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return;
    const name = authorName.trim() || 'زائر';
    localStorage.setItem('task_comment_author', name);
    setReplySubmitting(true);
    const newReply = {
      id: genId(),
      author: name,
      text: replyText.trim(),
      created_at: new Date().toISOString(),
      attachments: [],
    };
    const updatedComments = (task.comments || []).map(c =>
      c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
    );
    await updateComments(updatedComments);
    setReplyText('');
    setReplyingTo(null);
    setReplySubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-bold text-lg mb-2">لا يمكن عرض المهمة</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    </div>
  );

  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG['معلقة'];
  const StatusIcon = sc.icon;
  const subtasksDone = (task.subtasks || []).filter(s => s.done).length;
  const subtasksTotal = (task.subtasks || []).length;
  const isOverdue = task.due_date && task.status !== 'مكتملة' && task.status !== 'ملغاة' && new Date(task.due_date) < new Date();
  const taskColor = task.color || '#6366f1';
  const sortedComments = [...(task.comments || [])].reverse();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 sm:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Task card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ borderTop: `4px solid ${taskColor}` }}>
          <div className="p-6 border-b">
            <div className="flex items-start gap-3 mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', sc.badge)}>
                <StatusIcon className={cn('w-5 h-5', sc.color)} />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{task.title}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', sc.badge)}>{task.status}</span>
                  {task.priority && (
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1', PRIORITY_BADGE[task.priority])}>
                      <Flag className="w-3 h-3" />{task.priority}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {task.due_date && (
                <div className={cn('flex items-center gap-2 p-3 rounded-xl border text-sm', isOverdue ? 'bg-red-50 border-red-200 text-red-600' : 'bg-muted/30')}>
                  <Calendar className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">الموعد النهائي</div>
                    <div className="font-medium">{format(new Date(task.due_date), 'dd/MM/yyyy')}</div>
                    {isOverdue && <div className="text-xs font-bold text-red-500">متأخر</div>}
                  </div>
                </div>
              )}
              {task.created_date && (
                <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/30 text-sm">
                  <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">تاريخ الإنشاء</div>
                    <div className="font-medium">{format(new Date(task.created_date), 'dd/MM/yyyy')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">


            {task.description && (
              <div>
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">الوصف</h3>
                <div className="text-sm text-foreground leading-relaxed prose prose-sm max-w-none p-4 bg-muted/20 rounded-xl border"
                  dangerouslySetInnerHTML={{ __html: task.description }} />
              </div>
            )}

            {subtasksTotal > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  المهام الفرعية ({subtasksDone}/{subtasksTotal})
                </h3>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${(subtasksDone / subtasksTotal) * 100}%`, background: taskColor }} />
                </div>
                <div className="space-y-2">
                  {task.subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-muted/20">
                      {sub.done ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground shrink-0" />}
                      <span className={cn('flex-1 text-sm', sub.done && 'line-through text-muted-foreground')}>{sub.title}</span>
                      {sub.assignee_name && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{sub.assignee_name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(task.attachments || []).length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> المرفقات ({task.attachments.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((att, i) => <AttachmentPreview key={i} att={att} />)}
                </div>
              </div>
            )}

            {task.notes && (
              <div>
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">ملاحظات</h3>
                <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-xl border">{task.notes}</p>
              </div>
            )}

            {/* ── Comments Section ── */}
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> التعليقات {sortedComments.length > 0 && `(${sortedComments.length})`}
              </h3>

              {/* Composer — always visible at top */}
              <div className="flex gap-3 items-start mb-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow"
                  style={{ background: taskColor }}>
                  {authorName ? authorName.charAt(0) : '?'}
                </div>
                <div className="flex-1 bg-slate-100 rounded-3xl px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
                  <input
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    placeholder="اسمك / Your Name"
                    className="w-full bg-transparent text-xs font-bold outline-none text-slate-700 placeholder:text-slate-400 mb-1.5 border-b border-slate-200 pb-1.5"
                  />
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    placeholder="اكتب تعليقاً..."
                    rows={2}
                    className="w-full bg-transparent text-sm outline-none resize-none text-slate-700 placeholder:text-slate-400"
                  />

                  {/* Attachments preview */}
                  {commentAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {commentAttachments.map((att, i) => {
                        const isImg = att.type?.startsWith('image');
                        const isVid = att.type?.startsWith('video');
                        return (
                          <div key={i} className="relative group">
                            {isImg && <img src={att.url} alt="" className="h-16 w-20 object-cover rounded-lg border" />}
                            {isVid && <video src={att.url} className="h-16 w-20 rounded-lg border object-cover" />}
                            {!isImg && !isVid && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border text-xs text-slate-600">
                                <Paperclip className="w-3 h-3" />{att.name.slice(0, 20)}
                              </div>
                            )}
                            <button onClick={() => setCommentAttachments(prev => prev.filter((_, j) => j !== i))}
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
                    <div className="flex gap-2 mt-2 items-center">
                      <input
                        value={commentLink}
                        onChange={e => setCommentLink(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-white border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                      <button onClick={() => { setShowLinkInput(false); setCommentLink(''); }} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <button onClick={() => mediaInputRef.current?.click()} disabled={uploadingMedia}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-colors" title="إضافة صورة أو فيديو">
                        <Image className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowLinkInput(!showLinkInput)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-colors" title="إضافة رابط">
                        <LinkIcon className="w-4 h-4" />
                      </button>
                      {uploadingMedia && <span className="text-xs text-slate-400">جاري الرفع...</span>}
                      {submitted && <span className="text-xs text-green-600 font-semibold">✓ تم الإرسال!</span>}
                    </div>
                    <button
                      onClick={handleAddComment}
                      disabled={submitting || (!commentText.trim() && commentAttachments.length === 0 && !commentLink.trim())}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black text-white transition-all hover:opacity-90 disabled:opacity-40 shadow active:scale-95"
                      style={{ background: taskColor }}>
                      <Send className="w-3 h-3" />
                      {submitting ? '...' : 'إرسال'}
                    </button>
                  </div>
                </div>
              </div>
              <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleMediaUpload} />

              {/* Comments list — newest first, Facebook style */}
              <div className="space-y-4">
                {sortedComments.map(comment => (
                  <div key={comment.id} className="flex gap-3 items-start">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black shadow shrink-0 mt-0.5"
                      style={{ background: taskColor }}>
                      {(comment.author || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Bubble */}
                      <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 inline-block max-w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-slate-800">{comment.author}</span>
                          <span className="text-[10px] text-slate-400">{comment.created_at ? format(new Date(comment.created_at), 'dd/MM · HH:mm') : ''}</span>
                        </div>
                        {comment.text && <p className="text-sm text-slate-700 leading-relaxed">{comment.text}</p>}
                        {(comment.attachments || []).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">{comment.attachments.map((att, i) => <AttachmentPreview key={i} att={att} />)}</div>
                        )}
                      </div>

                      {/* Action row */}
                      <div className="flex items-center gap-3 mt-1 px-1 flex-wrap">
                        {REACTIONS.map(emoji => {
                          const count = (comment.reactions || {})[emoji] || 0;
                          return (
                            <button key={emoji} onClick={() => handleToggleReaction(comment.id, emoji)}
                              className={cn('flex items-center gap-0.5 text-xs transition-all',
                                count > 0 ? 'font-black text-indigo-600' : 'text-slate-400 hover:text-slate-700')}>
                              {emoji}{count > 0 && <span className="text-[10px]">{count}</span>}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                          className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors">
                          رد
                        </button>
                        {(comment.replies || []).length > 0 && (
                          <span className="text-[10px] text-slate-300">{comment.replies.length} رد</span>
                        )}
                      </div>

                      {/* Existing replies */}
                      {(comment.replies || []).length > 0 && (
                        <div className="mt-2 space-y-2 pr-2 border-r-2 border-slate-200 mr-1">
                          {comment.replies.map(reply => (
                            <div key={reply.id} className="flex gap-2 items-start">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">
                                {(reply.author || '?').charAt(0)}
                              </div>
                              <div className="bg-slate-100 rounded-2xl rounded-tr-sm px-3 py-2 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[11px] font-black text-slate-700">{reply.author}</span>
                                  <span className="text-[10px] text-slate-400">{reply.created_at ? format(new Date(reply.created_at), 'dd/MM · HH:mm') : ''}</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">{reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline reply input */}
                      {replyingTo === comment.id && (
                        <div className="flex gap-2 items-center mt-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                            style={{ background: taskColor }}>
                            {authorName ? authorName.charAt(0) : '?'}
                          </div>
                          <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-300 transition-all">
                            <input
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddReply(comment.id); }}
                              placeholder="اكتب رداً... (Enter)"
                              className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400"
                              autoFocus
                            />
                            <button onClick={() => handleAddReply(comment.id)}
                              disabled={replySubmitting || !replyText.trim() || !authorName.trim()}
                              className="text-indigo-500 hover:text-indigo-700 disabled:opacity-30 transition-colors">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => { setReplyingTo(null); setReplyText(''); }} className="text-slate-300 hover:text-slate-500">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">هذا رابط مشاركة عام · Public share link</p>
      </div>
    </div>
  );
}