import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  X, Plus, Trash2, CheckCircle2, Circle, Paperclip, Send,
  Image, FileText,
  Calendar, User, ArrowLeftRight, ChevronDown,
  Palette, Users, Link, Check, Copy, Clock, PlayCircle, XCircle,
  StickyNote, ExternalLink, MessageSquare, Eye, Edit2, Star, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import CommentsSection from './CommentsSection';
import ProfessionalRichEditor from './ProfessionalRichEditor';
import TaskDescriptionViewer from './TaskDescriptionViewer';

const STATUSES = ['معلقة', 'جارية', 'مكتملة', 'ملغاة'];
const PRIORITIES = ['منخفضة جداً', 'منخفضة', 'متوسطة', 'عالية', 'عالية جداً'];
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

const STATUS_CFG = {
  'معلقة':  { icon: Clock,        tw: 'bg-amber-100 text-amber-700 border-amber-200',   dot: '#f59e0b', selectBg: 'bg-amber-50 border-amber-300 text-amber-700' },
  'جارية':  { icon: PlayCircle,   tw: 'bg-blue-100 text-blue-700 border-blue-200',      dot: '#3b82f6', selectBg: 'bg-blue-50 border-blue-300 text-blue-700' },
  'مكتملة': { icon: CheckCircle2, tw: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: '#22c55e', selectBg: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  'ملغاة':  { icon: XCircle,      tw: 'bg-red-100 text-red-600 border-red-200',         dot: '#ef4444', selectBg: 'bg-red-50 border-red-300 text-red-600' },
};
const PRI_CFG = {
  'منخفضة جداً': { color: '#94a3b8', tw: 'bg-slate-100 text-slate-600 border-slate-200' },
  'منخفضة': { color: '#22c55e', tw: 'bg-green-100 text-green-700 border-green-200' },
  'متوسطة': { color: '#f97316', tw: 'bg-orange-100 text-orange-700 border-orange-200' },
  'عالية':  { color: '#ef4444', tw: 'bg-red-100 text-red-700 border-red-200' },
  'عالية جداً': { color: '#7c3aed', tw: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const REACTIONS = ['👍','❤️','😂','😮','🎉','🔥'];

function genId()    { return Math.random().toString(36).slice(2,10); }
function genToken() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }

/* ── tiny helpers ── */
function Avatar({ name, bg, size = 9 }) {
  return (
    <div className={`w-${size} h-${size} rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0`}
      style={{ background: bg }}>
      {(name || '?').charAt(0)}
    </div>
  );
}

function SectionBox({ icon: Icon, title, iconBg, titleColor, headerBg, children, badge }) {
  return (
    <div className="rounded-3xl overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className={cn('flex items-center gap-3 px-5 py-4 border-b border-slate-100', headerBg)}>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{background:`linear-gradient(135deg, ${titleColor}dd, ${titleColor}99)`}}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="font-black text-base text-slate-800" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{title}</span>
        {badge != null && badge > 0 && (
          <span className="mr-auto px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: titleColor }}>{badge}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AttachmentPreview({ att }) {
  const isImg = att.type?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url || '');
  if (isImg) return (
    <a href={att.url} target="_blank" rel="noopener noreferrer" className="block group relative">
      <img src={att.url} alt={att.name} className="h-24 w-32 object-cover rounded-2xl border-2 border-white shadow-md group-hover:shadow-lg transition-all group-hover:scale-105" />
      <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-4 py-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-xs hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm max-w-52 group">
      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
        <FileText className="w-4 h-4 text-blue-600" />
      </div>
      <span className="truncate font-semibold text-slate-600 group-hover:text-blue-700">{att.name}</span>
    </a>
  );
}



export default function TaskDetailModal({ task, employees=[], onClose, queryKey, onTaskUpdate }) {
  const { lang } = useLanguage();
  const L = (ar,ku) => lang==='ku' ? ku : ar;
  const qc = useQueryClient();
  const fileRef = useRef();

  const [local, setLocal]             = useState({...task});
  const [saving, setSaving]           = useState(false);
  const [newSubtask, setNewSubtask]   = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');
  const [isEditMode, setIsEditMode]   = useState(false); // Start in preview mode
  const [rating, setRating]           = useState(task.rating || 0);

  // Auto-set status to "جارية" when task is opened (only if it was "معلقة")
  React.useEffect(() => {
    if (task.status === 'معلقة') {
      save({ status: 'جارية' });
    }
  }, []);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo]   = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const [copied, setCopied]           = useState(false);

  const isOwner = task.employee_id === employees.find(e => e.user_id === 'current')?.id;

  const colorObj = TASK_COLORS.find(c => c.color === local.color) || TASK_COLORS[0];
  const color    = local.color || '#6366f1';
  const sc       = STATUS_CFG[local.status]   || STATUS_CFG['معلقة'];
  const pc       = PRI_CFG[local.priority]    || PRI_CFG['متوسطة'];
  const SIcon    = sc.icon;
  const subtasksDone  = (local.subtasks||[]).filter(s=>s.done).length;
  const subtasksTotal = (local.subtasks||[]).length;
  const subtaskPct    = subtasksTotal ? Math.round((subtasksDone/subtasksTotal)*100) : 0;
  const assignedEmp   = employees.find(e=>e.id===local.employee_id);
  const isOverdue     = local.due_date && local.status!=='مكتملة' && local.status!=='ملغاة' && new Date(local.due_date)<new Date();

  const mutation = useMutation({
    mutationFn: data => firebaseApi.entities.EmployeeTask.update(task.id, data),
    onSuccess: () => { qc.invalidateQueries(queryKey); qc.invalidateQueries(['all-employee-tasks']); },
  });

  const ratingMutation = useMutation({
    mutationFn: (newRating) => firebaseApi.entities.EmployeeTask.update(task.id, { rating: newRating }),
    onSuccess: () => { qc.invalidateQueries(queryKey); qc.invalidateQueries(['all-employee-tasks']); },
  });

  const handleRating = (newRating) => {
    setRating(newRating);
    ratingMutation.mutate(newRating);
  };

  const save = patch => {
    setLocal(p=>({...p,...patch}));
    mutation.mutate(patch);
    if(onTaskUpdate) onTaskUpdate({...local,...patch});
  };

  const handleTaskFiles = async e => {
    const files = Array.from(e.target.files||[]);
    if(!files.length) return;
    setSaving(true);
    const uploaded = await Promise.all(files.map(async f=>{
      const {file_url} = await firebaseApi.integrations.Core.UploadFile({file:f});
      return {url:file_url,name:f.name,type:f.type,uploaded_at:new Date().toISOString()};
    }));
    save({attachments:[...(local.attachments||[]),...uploaded]});
    setSaving(false); e.target.value='';
  };

  const removeAttachment = idx => save({attachments:(local.attachments||[]).filter((_,i)=>i!==idx)});
  const addSubtask = () => {
    if(!newSubtask.trim()) return;
    const assignee = employees.find(e=>e.id===subtaskAssignee);
    save({subtasks:[...(local.subtasks||[]),{id:genId(),title:newSubtask.trim(),done:false,assignee_id:subtaskAssignee||'',assignee_name:assignee?.full_name||''}]});
    setNewSubtask(''); setSubtaskAssignee('');
  };
  const toggleSubtask = id => save({subtasks:(local.subtasks||[]).map(s=>s.id===id?{...s,done:!s.done}:s)});
  const removeSubtask = id => save({subtasks:(local.subtasks||[]).filter(s=>s.id!==id)});

  const toggleParticipant = emp => {
    const cur = local.participants||[];
    const has = cur.some(p=>p.employee_id===emp.id);
    save({participants: has ? cur.filter(p=>p.employee_id!==emp.id) : [...cur,{employee_id:emp.id,employee_name:emp.full_name}]});
  };

  const transferTask = () => {
    if(!transferTo) return;
    save({employee_id:transferTo,transferred_from:task.employee_id,transferred_from_name:employees.find(e=>e.id===task.employee_id)?.full_name||''});
    qc.invalidateQueries(['employee-tasks',task.employee_id]);
    qc.invalidateQueries(['employee-tasks',transferTo]);
    setShowTransfer(false);
  };

  const getOrCreateShareToken = () => { if(!local.share_token) save({share_token:genToken()}); setShowShareLink(true); };
  const shareUrl = local.share_token ? `${window.location.origin}/task-view?token=${local.share_token}` : '';
  const copyLink = () => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
      style={{background:'rgba(15,15,35,0.8)',backdropFilter:'blur(8px)'}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>

      <div className="w-full max-w-3xl flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        style={{background:'#fff', height:'95dvh', maxHeight:'95dvh', direction:'rtl', fontFamily:'"Noto Sans Arabic", "Tajawal", sans-serif'}}>
        <style>{`
          .task-modal-rtl, .task-modal-rtl * {
            font-family: "Noto Sans Arabic", "Tajawal", sans-serif !important;
            text-rendering: optimizeLegibility !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
          }
          .task-modal-rtl input, .task-modal-rtl textarea, .task-modal-rtl select, .task-modal-rtl button, .task-modal-rtl span, .task-modal-rtl p, .task-modal-rtl div {
            direction: rtl !important;
            unicode-bidi: plaintext !important;
          }
          .task-modal-rtl .force-ltr, .task-modal-rtl .force-ltr * {
            direction: ltr !important;
            unicode-bidi: embed !important;
          }
        `}</style>
        <div className="task-modal-rtl flex flex-col flex-1 min-h-0" dir="rtl" style={{ direction: 'rtl', unicodeBidi: 'plaintext' }}>

        {/* ══════════ CLEAN HEADER ══════════ */}
        <div className="relative shrink-0 bg-white border-b border-slate-100">
          {/* Colored accent bar at top with color meaning indicator */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1" style={{background:`linear-gradient(to left, ${color}, ${color}88)`}}/>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white border-r border-slate-100">
              <span className="w-3 h-3 rounded-full" style={{background: color}}/>
              <span className="text-[9px] font-bold text-slate-500">{L(colorObj?.label.ar || 'عام', colorObj?.label.ku || 'گشتی')}</span>
            </div>
          </div>

          <div className="p-6 pb-4">
            {/* toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {/* Color dot + picker */}
                <div className="relative">
                  <button onClick={()=>setShowColorPicker(p=>!p)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{background:color}}/>
                    <Palette className="w-3.5 h-3.5"/>
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full mt-2 right-0 bg-white rounded-3xl shadow-2xl z-30 p-5 border border-slate-100" style={{minWidth:280}}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{L('لون المهمة','رەنگی ئەرک')}</p>
                      <div className="grid grid-cols-1 gap-2 mb-4">
                        {TASK_COLORS.map(({color,label})=>(
                          <button key={color} onClick={()=>{save({color});setShowColorPicker(false);}}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-all border-2"
                            style={{borderColor:local.color===color?color:'transparent'}}>
                            <span className="w-8 h-8 rounded-full shadow-sm shrink-0" style={{background:color}}/>
                            <span className="text-sm font-bold text-slate-700">{L(label.ar,label.ku)}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <label className="text-xs text-slate-500 font-medium">{L('مخصص','تایبەت')}</label>
                        <input type="color" value={local.color||'#6366f1'} onChange={e=>save({color:e.target.value})} className="w-8 h-8 rounded-xl cursor-pointer border-0"/>
                      </div>
                    </div>
                  )}
                </div>
                {/* Share */}
                <button onClick={getOrCreateShareToken} title={L('مشاركة','هاوبەشکردن')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm">
                  <Link className="w-3.5 h-3.5"/>{L('مشاركة','هاوبەشکردن')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* View/Edit Toggle */}
                <button
                  onClick={() => setIsEditMode(p => !p)}
                  className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border-2',
                    isEditMode
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  )}
                >
                  {isEditMode ? <CheckCircle2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {isEditMode ? L('تعديل', 'دەستکاری') : L('عرض', 'بینین')}
                </button>
                <button onClick={onClose}
                  className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center">
                  <X className="w-5 h-5 text-slate-500"/>
                </button>
              </div>
            </div>

            {/* Title */}
            {isEditMode ? (
              <input
                value={local.title}
                onChange={e => setLocal(p => ({ ...p, title: e.target.value }))}
                onBlur={() => save({ title: local.title })}
                className="w-full text-2xl font-black bg-transparent border-b-2 border-indigo-200 outline-none text-slate-800 mb-3 leading-snug tracking-tight pb-1 focus:border-indigo-400"
                style={{
                  fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                  direction: 'rtl',
                  unicodeBidi: 'plaintext',
                  textRendering: 'optimizeLegibility',
                  fontVariantLigatures: 'common-ligatures contextual',
                  fontFeatureSettings: '"liga" 1, "calt" 1, "dlig" 1',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}
              />
            ) : (
              <h2 className="w-full text-2xl font-black bg-transparent border-none outline-none text-slate-800 mb-3 leading-snug tracking-tight"
                style={{
                  fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif',
                  direction: 'rtl',
                  unicodeBidi: 'plaintext',
                  textRendering: 'optimizeLegibility',
                  fontVariantLigatures: 'common-ligatures contextual',
                  fontFeatureSettings: '"liga" 1, "calt" 1, "dlig" 1',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                {local.title}
              </h2>
            )}

            {/* Pills row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status pill - auto-set to جارية when opened */}
              <button
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all hover:shadow-sm', sc.tw)}
              >
                <SIcon className="w-3.5 h-3.5" />
                {local.status}
              </button>
              {/* Priority pill - editable */}
              <select
                value={local.priority}
                onChange={e => { setLocal(p => ({ ...p, priority: e.target.value })); save({ priority: e.target.value }); }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer bg-white hover:shadow-sm transition-all', pc.tw)}
              >
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
              {/* Due date pill */}
              {local.due_date && (
                isEditMode ? (
                  <input
                    type="date"
                    value={local.due_date}
                    onChange={e => { setLocal(p => ({ ...p, due_date: e.target.value })); save({ due_date: e.target.value }); }}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold',
                      isOverdue ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200')}
                  />
                ) : (
                  <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold',
                    isOverdue ? 'bg-red-100 text-red-600 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(local.due_date), 'dd/MM/yyyy')}
                    {isOverdue && <span className="text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-full">{L('متأخر', 'درەنگ')}</span>}
                  </div>
                )
              )}
              {local.transferred_from_name && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-500">
                  <ArrowLeftRight className="w-3 h-3" />
                  {L('من', 'لە')} {local.transferred_from_name}
                </div>
              )}
              {assignedEmp && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm text-xs text-slate-600 font-medium">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: color }}>{assignedEmp.full_name.charAt(0)}</div>
                  {assignedEmp.full_name}
                </div>
              )}
            </div>
          </div>

          {/* Subtask progress bar */}
          {subtasksTotal > 0 && (
            <div className="px-5 pb-4">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                <span>{L('المهام الفرعية','ئەرکە لاوەکییەکان')} · {subtasksDone}/{subtasksTotal}</span>
                <span style={{color}}>{subtaskPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-slate-100">
                <div className="h-full rounded-full transition-all duration-700 shadow-sm" style={{width:`${subtaskPct}%`,background:`linear-gradient(to left, ${color}, ${color}bb)`}}/>
              </div>
            </div>
          )}
        </div>

        {/* share link banner */}
        {showShareLink && shareUrl && (
          <div className="mx-5 mt-4 flex items-center gap-2 p-3.5 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <Link className="w-4 h-4 text-blue-500 shrink-0"/>
            <input readOnly value={shareUrl} className="flex-1 bg-transparent text-xs text-blue-700 outline-none truncate font-mono"/>
            <button onClick={copyLink} className="flex items-center gap-1 text-xs font-bold text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors shrink-0">
              {copied?<Check className="w-3.5 h-3.5 text-green-500"/>:<Copy className="w-3.5 h-3.5"/>}
              {copied?L('تم!','کۆپی کرا!'):L('نسخ','کۆپی')}
            </button>
            <button onClick={()=>setShowShareLink(false)} className="p-1 rounded-lg hover:bg-blue-100"><X className="w-4 h-4 text-slate-400"/></button>
          </div>
        )}

        {/* ══════════ BODY ══════════ */}
        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain" style={{background:'#f1f5f9', WebkitOverflowScrolling:'touch'}}>

          {/* Meta strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 pb-0">
            {[
              { label: L('الحالة','دۆخ'), icon: '🔄', content: (
                <select value={local.status} onChange={e=>{setLocal(p=>({...p,status:e.target.value}));save({status:e.target.value});}}
                  className={cn('w-full h-9 rounded-2xl border px-3 text-xs font-bold appearance-none cursor-pointer',sc.selectBg)}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              )},
              { label: L('الأولوية','پێشینە'), icon: '⚡', content: (
                <select value={local.priority} onChange={e=>{setLocal(p=>({...p,priority:e.target.value}));save({priority:e.target.value});}}
                  className="w-full h-9 rounded-2xl border border-slate-200 px-3 text-xs font-bold bg-white cursor-pointer">
                  {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                </select>
              )},
              { label: L('الموعد','کۆتایی'), icon: '📅', content: (
                <input type="date" value={local.due_date||''} onChange={e=>{setLocal(p=>({...p,due_date:e.target.value}));save({due_date:e.target.value});}}
                  className={cn('w-full h-9 rounded-2xl border px-3 text-xs cursor-pointer',isOverdue?'border-red-300 bg-red-50 text-red-700':'border-slate-200 bg-white')}/>
              )},
              { label: L('الإنشاء','بەرواری'), icon: '🗓', content: (
                <div className="h-9 flex items-center gap-1.5 text-xs text-slate-500 bg-white rounded-2xl px-3 border border-slate-200">
                  <Calendar className="w-3 h-3"/>
                  {task.created_date?format(new Date(task.created_date),'dd/MM/yyyy'):format(new Date(),'dd/MM/yyyy')}
                </div>
              )},
            ].map((item,i)=>(
              <div key={i} className="bg-white rounded-2xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-2">
              <p className="text-xs font-black text-slate-500" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{item.label}</p>
              {item.content}
              </div>
            ))}
          </div>

          <div className="p-4 space-y-3">

            {/* ── Assigned Employee Card ── */}
            <div className="rounded-2xl overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between px-4 py-3.5" style={{background:`linear-gradient(to left, ${color}12, ${color}06)`}}>
                <div className="flex items-center gap-3">
                {/* Big colored icon like reference */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md"
                  style={{background:`linear-gradient(135deg, ${color}ee, ${color}aa)`}}>
                  {(assignedEmp?.full_name||'?').charAt(0)}
                </div>
                <div>
                  <p className="font-black text-sm text-slate-800">
                    {assignedEmp?.full_name||L('غير محدد','نەدیارە')}
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-0.5" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 700, direction: 'rtl', unicodeBidi: 'plaintext' }}>
                    {L('الموظف المسؤول','کارمەندی بەرپرس')}
                  </p>
                </div>
                </div>
                {isEditMode && (
                  <button onClick={()=>setShowTransfer(p=>!p)}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-2xl border-2 transition-all hover:shadow-md active:scale-95"
                    style={{borderColor:color,color,background:`${color}0d`}}>
                    <ArrowLeftRight className="w-3.5 h-3.5"/>{L('تحويل','گواستنەوە')}
                  </button>
                )}
              </div>
              {showTransfer && (
                <div className="border-t border-blue-100 flex gap-2 items-center p-4 bg-blue-50/60">
                  <select value={transferTo} onChange={e=>setTransferTo(e.target.value)} className="flex-1 h-9 rounded-2xl border border-slate-200 bg-white px-3 text-sm">
                    <option value="">{L('اختر موظفاً','کارمەندێک هەڵبژێرە')}</option>
                    {employees.filter(e=>e.id!==local.employee_id).map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                  <Button size="sm" onClick={transferTask} disabled={!transferTo} className="rounded-2xl px-4">{L('تحويل','گواستنەوە')}</Button>
                  <button onClick={()=>setShowTransfer(false)} className="p-2 rounded-xl hover:bg-blue-100"><X className="w-4 h-4 text-slate-400"/></button>
                </div>
              )}
              {/* Participants */}
              <div className="border-t border-slate-100">
                <button onClick={()=>setShowParticipants(p=>!p)}
                  className="flex items-center gap-2.5 w-full px-4 py-3 hover:bg-slate-50 transition-colors">
                  <Users className="w-4 h-4 text-slate-400"/>
                  <span className="text-sm font-bold text-slate-700">{L('المشاركون','بەشداربووان')}</span>
                  {(local.participants||[]).length>0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                    style={{background:color}}>{(local.participants||[]).length}</span>
                  )}
                  <ChevronDown className={cn('w-4 h-4 text-slate-400 mr-auto transition-transform duration-200',showParticipants&&'rotate-180')}/>
                </button>
                {(local.participants||[]).length>0 && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    {(local.participants||[]).map((p,i)=>(
                      <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-xs text-indigo-700 font-semibold">
                      <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-black">{p.employee_name.charAt(0)}</div>
                      {p.employee_name}
                        <button onClick={()=>toggleParticipant({id:p.employee_id,full_name:p.employee_name})} className="hover:text-red-500 transition-colors"><X className="w-3 h-3"/></button>
                      </span>
                    ))}
                  </div>
                )}
                {showParticipants && (
                  <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-1.5 max-h-44 overflow-y-auto">
                    {employees.filter(e=>e.id!==local.employee_id).map(emp=>{
                      const isIn=(local.participants||[]).some(p=>p.employee_id===emp.id);
                      return (
                        <button key={emp.id} onClick={()=>toggleParticipant(emp)}
                          className={cn('w-full flex items-center gap-3 p-3 rounded-2xl text-sm transition-all',isIn?'bg-indigo-100 text-indigo-800':'bg-white hover:bg-indigo-50 border border-transparent hover:border-indigo-100 shadow-sm')}>
                          <div className={cn('w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0',isIn?'bg-indigo-500 text-white':'bg-slate-100 text-slate-500')}>{emp.full_name.charAt(0)}</div>
                          <span className="flex-1 text-right font-semibold">{emp.full_name}</span>
                          {isIn&&<div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center"><Check className="w-3 h-3 text-white"/></div>}
                        </button>
                      );
                    })}
                    {employees.filter(e=>e.id!==local.employee_id).length===0&&(
                      <p className="text-xs text-slate-400 text-center py-3">{L('لا يوجد موظفون آخرون','کارمەندی تر نییە')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Details Box ── */}
            <SectionBox icon={FileText} title={L('التفاصيل','وردەکاری')}
              iconBg="bg-white shadow-sm border border-slate-200" titleColor={color}
              headerBg="" >
              <div className="space-y-5">
                {/* Description */}
                <div>
                  <label className="text-sm font-black text-slate-700 block mb-2.5" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>{L('الوصف','وەسف')}</label>
                  {isEditMode ? (
                    <ProfessionalRichEditor
                      value={local.description||''}
                      onChange={val=>setLocal(p=>({...p,description:val}))}
                      placeholder={L('أضف وصفاً تفصيلياً للمهمة...','وەسفی وردی بنووسە...')}
                    />
                  ) : (
                    <TaskDescriptionViewer description={local.description} />
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-black text-slate-700" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>
                      {L('المرفقات','پاوانەکان')}{(local.attachments||[]).length>0?` (${local.attachments.length})`:''}
                    </label>
                    {isEditMode && (
                      <button onClick={()=>fileRef.current?.click()} disabled={saving}
                        className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-2xl border-2 transition-all hover:shadow-md active:scale-95"
                        style={{borderColor:color,color,background:`${color}0d`}}>
                        <Plus className="w-3.5 h-3.5"/>{saving?L('جاري الرفع...','بارکردن...'):L('إضافة ملف','فایل زیادبکە')}
                      </button>
                    )}
                  </div>
                  {(local.attachments||[]).length>0 && (
                    <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      {(local.attachments||[]).map((att,idx)=>(
                        <div key={idx} className="relative group">
                          <AttachmentPreview att={att}/>
                          <button onClick={()=>removeAttachment(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            <X className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xlsx,.txt" className="hidden" onChange={handleTaskFiles}/>
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-black text-slate-700" style={{ fontFamily: '"Noto Sans Arabic", "Tajawal", sans-serif', fontWeight: 900, direction: 'rtl', unicodeBidi: 'plaintext' }}>
                      {L('المهام الفرعية','ئەرکە لاوەکییەکان')}{subtasksTotal>0?` · ${subtasksDone}/${subtasksTotal}`:''}
                    </label>
                    {subtasksTotal>0&&<span className="text-xs font-black" style={{color}}>{subtaskPct}%</span>}
                  </div>
                  {subtasksTotal>0&&(
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div className="h-full rounded-full transition-all duration-500 shadow-sm" style={{width:`${subtaskPct}%`,background:`linear-gradient(to left, ${color}, ${color}cc)`}}/>
                    </div>
                  )}
                  <div className="space-y-2 mb-3">
                    {(local.subtasks||[]).map(sub=>(
                      <div key={sub.id} className={cn('flex items-center gap-3 group p-3.5 rounded-2xl border transition-all',sub.done?'bg-emerald-50 border-emerald-200':'bg-white border-slate-100 hover:border-slate-200 shadow-sm')}>
                        <button onClick={()=>toggleSubtask(sub.id)} className="shrink-0 transition-transform hover:scale-110">
                          {sub.done?<CheckCircle2 className="w-5 h-5 text-emerald-500"/>:<Circle className="w-5 h-5 text-slate-300 hover:text-slate-400"/>}
                        </button>
                        <span className={cn('flex-1 text-sm font-medium',sub.done?'line-through text-slate-400':'text-slate-700')}>{sub.title}</span>
                        {sub.assignee_name&&(
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0 bg-slate-100 px-2.5 py-1 rounded-full font-medium border border-slate-200">
                            <User className="w-3 h-3"/>{sub.assignee_name}
                          </span>
                        )}
                        {isEditMode && (
                          <button onClick={()=>removeSubtask(sub.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 p-1.5 rounded-xl hover:bg-red-50 shrink-0">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isEditMode && (
                    <div className="p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
                      <div className="flex gap-2">
                        <input value={newSubtask} onChange={e=>setNewSubtask(e.target.value)}
                          onKeyDown={e=>e.key==='Enter'&&addSubtask()}
                          placeholder={L('أضف مهمة فرعية... (Enter للإضافة)','ئەرکی لاوەکی نوێ زیاد بکە...')}
                          className="flex-1 h-10 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-indigo-300 focus:shadow-sm transition-all"/>
                        <button onClick={addSubtask} className="h-10 px-4 rounded-2xl text-white text-sm font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm" style={{background:color}}>
                          <Plus className="w-4 h-4"/>
                        </button>
                      </div>
                      {employees.length>1&&(
                        <select value={subtaskAssignee} onChange={e=>setSubtaskAssignee(e.target.value)}
                          className="w-full h-9 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-600">
                          <option value="">{L('تعيين لموظف (اختياري)','کارمەندێک دیاری بکە (ئارەزوومەندانە)')}</option>
                          {employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </SectionBox>

            {/* ── Notes Box ── */}
            <SectionBox icon={StickyNote} title={L('ملاحظات','تێبینی')}
              iconBg="bg-amber-100" titleColor="#d97706" headerBg="bg-gradient-to-l from-amber-50/80 to-yellow-50/60">
              {isEditMode ? (
                <textarea value={local.notes||''} onChange={e=>setLocal(p=>({...p,notes:e.target.value}))}
                  onBlur={()=>save({notes:local.notes})}
                  rows={3} placeholder={L('أضف ملاحظاتك هنا... (يُحفظ تلقائياً)','تێبینەکانت ئێرە بنووسە...')}
                  className="w-full rounded-2xl border-2 border-amber-100 bg-amber-50/60 px-4 py-3.5 text-sm resize-none outline-none focus:border-amber-300 focus:shadow-sm transition-all placeholder:text-amber-300 text-amber-900 leading-relaxed"/>
              ) : (
                <div className="w-full rounded-2xl border-2 border-amber-100 bg-amber-50/60 px-4 py-3.5 text-sm text-amber-900 leading-relaxed min-h-[100px]">
                  {local.notes || <span className="text-amber-300">{L('لا يوجد ملاحظات', 'تێبینی نییە')}</span>}
                </div>
              )}
            </SectionBox>

            {/* ── Rating Stars ── */}
            <SectionBox icon={Sparkles} title={L('تقييم المهمة','ڕێژەی ئەرک')}
              iconBg="bg-yellow-100" titleColor="#d97706" headerBg="bg-gradient-to-l from-yellow-50/80 to-amber-50/60">
              <div className="flex items-center gap-2 py-2">
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    className="transition-transform hover:scale-110 active:scale-90"
                  >
                    <Star
                      className="w-8 h-8"
                      style={{
                        fill: star <= rating ? '#fbbf24' : 'none',
                        stroke: star <= rating ? '#f59e0b' : '#d1d5db',
                        strokeWidth: 2
                      }}
                    />
                  </button>
                ))}
                <span className="text-sm font-bold text-slate-600 mr-3">
                  {rating > 0 ? `${rating}/5` : L('لم يتم التقييم', 'هەڵنەسەنگێنراوە')}
                </span>
              </div>
            </SectionBox>

            {/* ── Comments Box ── */}
            <SectionBox icon={MessageSquare} title={L('التعليقات','لێدوانەکان')}
              iconBg="bg-indigo-100" titleColor="#4f46e5" headerBg="bg-gradient-to-l from-indigo-50/80 to-violet-50/60"
              badge={(local.comments||[]).length}>
              <CommentsSection
                task={local}
                employees={employees}
                onUpdate={(updated) => {
                  setLocal(updated);
                  if (onTaskUpdate) onTaskUpdate(updated);
                }}
              />
            </SectionBox>

          </div>
        </div>
        </div>
      </div>
    </div>
  );
}