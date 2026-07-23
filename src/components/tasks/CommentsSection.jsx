import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Filter, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommentItem from './CommentItem';
import CommentEditor from './CommentEditor';
import CommentFilters from './CommentFilters';

const REACTIONS = ['👍', '❤️', '👏', '🎉', '🔥', '😄'];

export default function CommentsSection({ task, employees, onUpdate }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [localTask, setLocalTask] = useState(task);
  const [filter, setFilter] = useState({ type: 'all', search: '', reaction: null });
  const [showFilters, setShowFilters] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const comments = localTask.comments || [];
  const currentUser = {
    name: localStorage.getItem('task_comment_author') || 'مستخدم',
    role: 'employee',
    department: 'عام',
    avatar_color: task.color || '#6366f1',
  };

  const updateMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.EmployeeTask.update(task.id, data),
    onSuccess: (updated) => {
      setLocalTask(updated);
      if (onUpdate) onUpdate(updated);
    },
  });

  const saveComments = (updatedComments) => {
    const updated = { ...localTask, comments: updatedComments };
    setLocalTask(updated);
    updateMutation.mutate({ comments: updatedComments });
    if (onUpdate) onUpdate(updated);
  };

  const handleAddComment = async (text, type, approvalAction) => {
    const newComment = {
      id: genId(),
      author: currentUser.name,
      author_id: currentUser.id,
      department: currentUser.department,
      role: currentUser.role,
      text,
      created_at: new Date().toISOString(),
      type,
      approval_action: approvalAction,
      mentions: [],
      attachments: [...attachments],
      reactions: {},
      replies: [],
      is_pinned: false,
      avatar_color: currentUser.avatar_color,
    };
    saveComments([...comments, newComment]);
    setAttachments([]);
  };

  const handleReply = async (commentId, text, replyAttachments) => {
    const updated = comments.map(c => {
      if (c.id !== commentId) return c;
      const newReply = {
        id: genId(),
        author: currentUser.name,
        author_id: currentUser.id,
        text,
        created_at: new Date().toISOString(),
        attachments: replyAttachments,
        reactions: {},
      };
      return { ...c, replies: [...(c.replies || []), newReply] };
    });
    saveComments(updated);
  };

  const handleUpdateComment = (commentId, updates) => {
    const updated = comments.map(c =>
      c.id === commentId ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    );
    saveComments(updated);
  };

  const handleDeleteComment = (commentId) => {
    const updated = comments.filter(c => c.id !== commentId);
    saveComments(updated);
  };

  const handleTogglePin = (commentId) => {
    const updated = comments.map(c =>
      c.id === commentId ? { ...c, is_pinned: !c.is_pinned } : c
    );
    saveComments(updated);
  };

  const handleReaction = (commentId, replyId, emoji) => {
    const updated = comments.map(c => {
      if (c.id !== commentId) return c;
      
      if (replyId) {
        // Handle reply reaction
        const replies = (c.replies || []).map(r => {
          if (r.id !== replyId) return r;
          const currentReactions = r.reactions || {};
          const currentUserReaction = r.user_reactions?.current || null;
          
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
            if (currentUserReaction) {
              const oldCount = (currentReactions[currentUserReaction] || 1) - 1;
              if (oldCount <= 0) {
                delete newReactions[currentUserReaction];
              } else {
                newReactions[currentUserReaction] = oldCount;
              }
            }
            newReactions[emoji] = (currentReactions[emoji] || 0) + 1;
            newUserReaction = emoji;
          }
          
          return { ...r, reactions: newReactions, user_reactions: { current: newUserReaction } };
        });
        return { ...c, replies };
      }
      
      // Handle comment reaction
      const currentReactions = c.reactions || {};
      const currentUserReaction = c.user_reactions?.current || null;
      
      let newReactions = { ...currentReactions };
      let newUserReaction = currentUserReaction;
      
      if (currentUserReaction === emoji) {
        const newCount = (currentReactions[emoji] || 1) - 1;
        if (newCount <= 0) {
          delete newReactions[emoji];
        } else {
          newReactions[emoji] = newCount;
        }
        newUserReaction = null;
      } else {
        if (currentUserReaction) {
          const oldCount = (currentReactions[currentUserReaction] || 1) - 1;
          if (oldCount <= 0) {
            delete newReactions[currentUserReaction];
          } else {
            newReactions[currentUserReaction] = oldCount;
          }
        }
        newReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        newUserReaction = emoji;
      }
      
      return { ...c, reactions: newReactions, user_reactions: { current: newUserReaction } };
    });
    saveComments(updated);
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
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

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
        const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file: audioFile });
        setRecordingAudio({ url: file_url, is_voice_note: true });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const filteredComments = comments.filter(c => {
    if (filter.type === 'internal' && c.type !== 'internal') return false;
    if (filter.type === 'public' && c.type === 'internal') return false;
    if (filter.search && !c.text?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.reaction && !(c.reactions || {})[filter.reaction]) return false;
    return true;
  });

  const sortedComments = [...filteredComments].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const stats = {
    total: comments.length,
    public: comments.filter(c => c.type === 'public').length,
    internal: comments.filter(c => c.type === 'internal').length,
  };

  const fileRef = useRef();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-slate-700">{L('التعليقات', 'لێدوانەکان')}</span>
          {comments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
              {comments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          {L('تصفية', 'پاڵاوتن')}
        </button>
      </div>

      {showFilters && <CommentFilters filter={filter} setFilter={setFilter} stats={stats} />}

      <CommentEditor
        onSubmit={handleAddComment}
        attachments={attachments}
        setAttachments={setAttachments}
        onFileUpload={handleFileUpload}
        fileRef={fileRef}
        uploading={uploading}
        recordingAudio={recordingAudio}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        isRecording={isRecording}
        taskColor={task.color}
      />

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 overflow-x-hidden">
        {sortedComments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">{L('لا توجد تعليقات بعد', 'هیچ لێدوانێک نییە')}</p>
            <p className="text-xs text-slate-400 mt-1">{L('كن أول من يعلق', 'یەکەم کەس بە لێدوانەکەت بێت')}</p>
          </div>
        ) : (
          sortedComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isPinned={comment.is_pinned}
              currentUser={currentUser}
              employees={employees}
              onReply={(text, atts) => handleReply(comment.id, text, atts)}
              onUpdate={(updates) => handleUpdateComment(comment.id, updates)}
              onDelete={() => handleDeleteComment(comment.id)}
              onTogglePin={() => handleTogglePin(comment.id)}
              onReaction={(emoji) => handleReaction(comment.id, null, emoji)}
              onReplyReaction={(replyId, emoji) => handleReaction(comment.id, replyId, emoji)}
              taskColor={task.color}
            />
          ))
        )}
      </div>
    </div>
  );
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}