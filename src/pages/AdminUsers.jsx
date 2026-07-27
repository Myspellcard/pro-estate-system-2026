import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import {
  Users, Shield, Mail, Edit2, Trash2, Check, X, Lock,
  CheckCircle2, AlertCircle, Info, UserPlus, ChevronDown, ChevronUp, Search, Copy, Send
} from 'lucide-react';
import UserPermissionsEditor, { ROLE_PRESETS, ROLES } from '@/components/admin/UserPermissionsEditor';

export default function AdminUsers() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const qc = useQueryClient();
  const getErrorMessage = (error, fallback) => {
    if (error?.code === 'permission-denied' || String(error?.message || '').includes('permission')) {
      return L('رفض Base44 العملية. سجل الدخول بحساب المدير ثم أعد المحاولة، وتأكد من نشر صلاحيات Base44.', 'Base44 کردارەکەی ڕەتکردەوە. بە هەژماری بەڕێوەبەر بچۆ ژوورەوە و دووبارە هەوڵ بدە.');
    }
    return error?.message || fallback;
  };

  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [editingPerm, setEditingPerm] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Invite
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [localInviteVersion, setLocalInviteVersion] = useState(0);
  const [actionStatus, setActionStatus] = useState(null);

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => firebaseApi.entities.User.list() });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: () => firebaseApi.entities.Branch.list() });
  const { data: permissions = [] } = useQuery({ queryKey: ['user_permissions'], queryFn: () => firebaseApi.entities.UserPermission.list() });

  const createPerm = useMutation({
    mutationFn: async ({ user, data }) => {
      const payload = {
        ...data,
        user_id: user.id,
        app_user_id: user.app_user_id || user.appUserId || user.uid || user.id,
        user_uid: user.uid || '',
        user_email: String(user.email || data.user_email || '').trim().toLowerCase(),
        user_name: user.full_name || user.name || data.user_name || user.email,
        is_active: true,
      };
      await firebaseApi.users.approveUser(user.id).catch(() => {});
      return firebaseApi.entities.UserPermission.create(payload);
    },
    onSuccess: () => {
      setActionStatus({ type: 'success', msg: L('تم حفظ الصلاحية وتفعيل دخول المستخدم.', 'ڕێگەپێدانەکە پاشەکەوتکرا و چوونەژوورەوەی بەکارهێنەر چالاککرا.') });
      qc.invalidateQueries({ queryKey: ['user_permissions'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditingPerm(null);
    },
    onError: (error) => setActionStatus({ type: 'error', msg: getErrorMessage(error, L('تعذر حفظ الصلاحية.', 'پاشەکەوتکردنی ڕێگەپێدان نەکرا.')) }),
  });
  const updatePerm = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        ...data,
        user_email: String(data.user_email || data.email || '').trim().toLowerCase(),
        is_active: data.is_active !== false,
      };
      return firebaseApi.entities.UserPermission.update(id, payload);
    },
    onSuccess: () => {
      setActionStatus({ type: 'success', msg: L('تم تحديث الصلاحية.', 'ڕێگەپێدانەکە نوێکرایەوە.') });
      qc.invalidateQueries({ queryKey: ['user_permissions'] });
      setEditingPerm(null);
    },
    onError: (error) => setActionStatus({ type: 'error', msg: getErrorMessage(error, L('تعذر تحديث الصلاحية.', 'نوێکردنەوەی ڕێگەپێدان نەکرا.')) }),
  });
  const deletePerm = useMutation({
    mutationFn: (id) => firebaseApi.entities.UserPermission.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_permissions'] }),
  });
  const refreshUsers = () => {
    setLocalInviteVersion((value) => value + 1);
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['user_permissions'] });
  };
  const approveUser = useMutation({
    mutationFn: (id) => firebaseApi.users.approveUser(id),
    onSuccess: () => {
      setActionStatus({ type: 'success', msg: L('تم التحقق من المستخدم والسماح له بالدخول.', 'بەکارهێنەرەکە پشتڕاستکرا و ڕێگەی چوونەژوورەوەی پێدرا.') });
      refreshUsers();
    },
    onError: (error) => setActionStatus({ type: 'error', msg: getErrorMessage(error, L('تعذر التحقق من المستخدم.', 'پشتڕاستکردنەوەی بەکارهێنەر نەکرا.')) }),
  });
  const blockUser = useMutation({
    mutationFn: (id) => firebaseApi.users.blockUser(id),
    onSuccess: () => {
      setActionStatus({ type: 'success', msg: L('تم إيقاف دخول المستخدم.', 'چوونەژوورەوەی بەکارهێنەر وەستێنرا.') });
      refreshUsers();
    },
    onError: (error) => setActionStatus({ type: 'error', msg: getErrorMessage(error, L('تعذر إيقاف المستخدم.', 'وەستاندنی بەکارهێنەر نەکرا.')) }),
  });
  const deleteUserAccess = useMutation({
    mutationFn: (id) => firebaseApi.users.deleteUserAccess(id),
    onSuccess: () => {
      setActionStatus({ type: 'success', msg: L('تم حذف صلاحية دخول المستخدم من النظام.', 'ڕێگەپێدانی چوونەژوورەوەی بەکارهێنەر سڕایەوە.') });
      refreshUsers();
    },
    onError: (error) => setActionStatus({ type: 'error', msg: getErrorMessage(error, L('تعذر حذف المستخدم.', 'سڕینەوەی بەکارهێنەر نەکرا.')) }),
  });

  const getInviteUrl = (email) => {
    if (typeof window === 'undefined') return `/login?email=${encodeURIComponent(email)}`;
    return `${window.location.origin}/login?email=${encodeURIComponent(email)}`;
  };

  const getInviteMessage = (result) => L(
    `تم منحك صلاحية الدخول إلى نظام إدارة العقارات.\n\nرابط الدخول: ${result.url}\n\nاستخدم نفس البريد الإلكتروني: ${result.email}`,
    `ڕێگەپێدانی چوونەژوورەوەت بۆ سیستەمی بەڕێوەبردنی خانووبەرە درا.\n\nلینکی چوونەژوورەوە: ${result.url}\n\nهەمان ئیمەیڵ بەکاربهێنە: ${result.email}`,
  );

  const copyInviteText = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      setInviteStatus({ type: 'success', msg });
    } catch {
      setInviteStatus({ type: 'error', msg: L('تعذر النسخ تلقائياً. انسخ الرابط يدوياً.', 'کۆپیکردنی ئۆتۆماتیکی نەکرا. لینکەکە بەدەستی کۆپی بکە.') });
    }
  };

  const getLocalPreviewInvites = () => {
    localInviteVersion;
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem('darRentNestLocalInvites') || '[]');
    } catch {
      return [];
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    setInviting(true); setInviteStatus(null); setInviteResult(null);
    try {
      const result = await firebaseApi.users.inviteUser(normalizedEmail, inviteRole === 'admin' ? 'admin' : 'user');
      const nextInviteResult = {
        email: normalizedEmail,
        role: inviteRole,
        url: getInviteUrl(normalizedEmail),
        localOnly: result?.localOnly === true,
      };
      setInviteResult(nextInviteResult);
      setInviteStatus({
        type: 'success',
        msg: result?.localOnly
          ? L('تم تجهيز الدعوة في المعاينة المحلية. انسخ الرابط لإكمال التجربة، واحفظها من الموقع المنشور لكتابتها في Base44.', 'بانگهێشتەکە لە پێشبینینی ناوخۆیی ئامادەکرا. لینکەکە کۆپی بکە.')
          : L(`تم منح صلاحية الدخول إلى ${normalizedEmail}. انسخ الرابط وأرسله له.`, `ڕێگەپێدانی چوونەژوورەوە درا بە ${normalizedEmail}. لینکەکە کۆپی بکە و بینێرە بۆی.`),
      });
      setInviteEmail(''); setInviteRole('user');
      refreshUsers();
    } catch (error) {
      setInviteStatus({ type: 'error', msg: getErrorMessage(error, L('حدث خطأ. تأكد من صحة البريد الإلكتروني.', 'هەڵەیەک ڕووی داو. دڵنیابە ئیمەیڵەکە دروستە.')) });
    }
    setInviting(false);
  };

  const getUserPerms = (user) => {
    const userEmail = String(user?.email || '').trim().toLowerCase();
    return permissions.filter((p) => {
      const permEmail = String(p.user_email || p.email || '').trim().toLowerCase();
      return p.user_id === user?.id
        || p.app_user_id === user?.id
        || p.user_uid === user?.uid
        || (userEmail && permEmail === userEmail);
    });
  };
  const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[3];
  const getStatusInfo = (user) => {
    if (user.status === 'approved' && user.is_active !== false) {
      return {
        label: L('مفعل', 'چالاک'),
        className: 'bg-green-100 text-green-700 border-green-200',
      };
    }
    if (user.status === 'blocked' || user.is_active === false) {
      return {
        label: L('محظور', 'بلۆککراو'),
        className: 'bg-red-100 text-red-700 border-red-200',
      };
    }
    return {
      label: L('بانتظار التحقق', 'چاوەڕێی پشتڕاستکردنەوە'),
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  };

  const handleDeleteUser = (user) => {
    const ok = window.confirm(L(
      `هل تريد حذف صلاحية دخول ${user.email} من النظام؟ لن يتم حذف حسابه من Base44 Auth، لكن لن يستطيع الدخول إلى التطبيق.`,
      `دەتەوێت ڕێگەپێدانی چوونەژوورەوەی ${user.email} لە سیستەم بسڕیتەوە؟ هەژماری Base44 Auth ناسڕدرێتەوە، بەڵام ناتوانێت بچێتە ناو ئەپەکە.`,
    ));
    if (ok) deleteUserAccess.mutate(user.id);
  };

  const localPreviewInvites = getLocalPreviewInvites();
  const allUsers = [
    ...users,
    ...localPreviewInvites.filter((invite) => !users.some((user) => user.email === invite.email)),
  ];

  const filteredUsers = allUsers.filter(u =>
    !search ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#2a3f6e] flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-[#e8b748]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a2744]">{L('إدارة المستخدمين والصلاحيات', 'بەڕێوەبردنی بەکارهێنەران و ڕۆڵەکان')}</h1>
            <p className="text-sm text-gray-500">{L(`${allUsers.length} مستخدم مسجل`, `${allUsers.length} بەکارهێنەری تۆمارکراو`)}</p>
          </div>
        </div>
        <Button onClick={() => setShowInviteForm(true)} className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
          <UserPlus className="w-4 h-4" />
          {L('دعوة مستخدم', 'بانگهێشتکردنی بەکارهێنەر')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={L('البحث عن مستخدم...', 'گەڕان بۆ بەکارهێنەر...')}
          className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20" />
      </div>

      {actionStatus && (
        <div className={`flex items-start gap-2 rounded-xl p-3 text-xs border ${actionStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {actionStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{actionStatus.msg}</span>
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-[#1a2744] flex items-center gap-2">
            <Mail className="w-5 h-5" /> {L('دعوة مستخدم جديد', 'بانگهێشتکردنی بەکارهێنەری نوێ')}
          </h3>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{L('اكتب البريد الإلكتروني وسيتم منحه صلاحية الدخول. بعد الحفظ انسخ الرابط أو أرسل الرسالة من بريدك.', 'ئیمەیڵەکە بنووسە و ڕێگەپێدانی چوونەژوورەوەی پێدەدرێت. دوای پاشەکەوتکردن لینکەکە کۆپی بکە یان نامەکە لە ئیمەیڵی خۆتەوە بنێرە.')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">{L('البريد الإلكتروني', 'ئیمەیل')} *</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{L('الدور', 'ڕۆڵ')}</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="admin">{L('مدير', 'بەڕێوەبەر')}</option>
                <option value="user">{L('مستخدم', 'بەکارهێنەر')}</option>
              </select>
            </div>
          </div>
          {inviteStatus && (
            <div className={`flex items-start gap-2 rounded-xl p-3 text-xs border ${inviteStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {inviteStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{inviteStatus.msg}</span>
            </div>
          )}
          {inviteResult && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-3">
              <div>
                <label className="text-xs text-green-700 mb-1 block font-semibold">{L('رابط الدخول للمستخدم', 'لینکی چوونەژوورەوەی بەکارهێنەر')}</label>
                <input
                  readOnly
                  value={inviteResult.url}
                  className="w-full border border-green-200 bg-white rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => copyInviteText(inviteResult.url, L('تم نسخ الرابط.', 'لینکەکە کۆپی کرا.'))}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {L('نسخ الرابط', 'کۆپی لینك')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 border-green-300 text-green-700 hover:bg-green-100"
                  onClick={() => copyInviteText(getInviteMessage(inviteResult), L('تم نسخ رسالة الدعوة.', 'نامەی بانگهێشت کۆپی کرا.'))}
                >
                  <Copy className="w-3.5 h-3.5" />
                  {L('نسخ رسالة الدعوة', 'کۆپی نامە')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1 bg-green-700 hover:bg-green-800"
                  onClick={() => {
                    const subject = encodeURIComponent(L('دعوة للدخول إلى نظام إدارة العقارات', 'بانگهێشت بۆ چوونەژوورەوەی سیستەمی بەڕێوەبردنی خانووبەرە'));
                    const body = encodeURIComponent(getInviteMessage(inviteResult));
                    window.location.href = `mailto:${inviteResult.email}?subject=${subject}&body=${body}`;
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {L('إرسال عبر البريد', 'ناردن بە ئیمەیڵ')}
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="bg-[#1a2744] gap-2">
              <Mail className="w-4 h-4" />
              {inviting ? L('جارٍ الحفظ...', 'پاشەکەوتکردن...') : L('إضافة ومنح الدخول', 'زیادکردن و ڕێگەپێدان')}
            </Button>
            <Button variant="outline" onClick={() => { setShowInviteForm(false); setInviteStatus(null); setInviteResult(null); }}>
              {L('إلغاء', 'پاشگەزبوونەوە')}
            </Button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{L('لا يوجد مستخدمون مسجلون بعد.', 'هیچ بەکارهێنەرێکی تۆمارکراو نییە.')}</p>
          </div>
        )}
        {filteredUsers.map(user => {
          const userPerms = getUserPerms(user);
          const isExpanded = expandedUser === user.id;
          const isOwner = user.role === 'owner' || user.is_owner === true || user.email === 'myspellcard@gmail.com';
          const statusInfo = getStatusInfo(user);
          const userBusy = approveUser.isPending || blockUser.isPending || deleteUserAccess.isPending;

          return (
            <div key={user.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${isOwner ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-[#1a2744] to-[#2a3f6e]'}`}>
                  {isOwner ? '👑' : (user.full_name || user.email || '?').charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#1a2744] truncate">{user.full_name || L('بدون اسم', 'بێ ناو')}</p>
                    {isOwner && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300 shrink-0">{L('مالك', 'خاوەن')}</span>}
                    {!isOwner && <span className={`px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${statusInfo.className}`}>{statusInfo.label}</span>}
                    {userPerms.map(p => {
                      const ri = getRoleInfo(p.role);
                      return <span key={p.id} className={`px-2 py-0.5 rounded-lg text-xs font-bold border shrink-0 ${ri.color}`}>{L(ri.labelAr, ri.labelKu)}</span>;
                    })}
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 shrink-0" />{user.email}
                  </span>
                </div>

                {!isOwner ? (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {(user.status !== 'approved' || user.is_active === false) && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 gap-1 bg-green-700 hover:bg-green-800 text-xs"
                        disabled={userBusy}
                        onClick={() => approveUser.mutate(user.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {L('تحقق / سماح', 'پشتڕاست / ڕێگەدان')}
                      </Button>
                    )}
                    {user.status !== 'blocked' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                        disabled={userBusy}
                        onClick={() => blockUser.mutate(user.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                        {L('إيقاف', 'وەستاندن')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                      disabled={userBusy}
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {L('حذف', 'سڕینەوە')}
                    </Button>
                    <button
                      onClick={() => { setExpandedUser(isExpanded ? null : user.id); setEditingPerm(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${isExpanded ? 'bg-[#1a2744] text-white border-[#1a2744]' : 'border-gray-200 text-gray-500 hover:border-[#1a2744] hover:text-[#1a2744]'}`}>
                      <Shield className="w-3.5 h-3.5" />
                      {L('الصلاحيات', 'ڕێگەپێدانەکان')}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                    <Lock className="w-3.5 h-3.5" /> {L('محمي', 'پارێزراو')}
                  </span>
                )}
              </div>

              {/* Expanded Permissions */}
              {isExpanded && (
                <div className="border-t border-blue-100 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-[#1a2744] text-sm">{L('صلاحيات حسب الفرع لـ', 'ڕێگەپێدانەکانی لقەکان بۆ')} {user.full_name}</h4>
                    <Button size="sm" className="bg-[#1a2744] gap-1 text-xs"
                      onClick={() => {
                        setEditingPerm('new-' + user.id);
                        setEditForm({ user_id: user.id, user_email: user.email, user_name: user.full_name, role: 'viewer', is_active: true, branch_id: '', ...ROLE_PRESETS['viewer'] });
                      }}>
                      + {L('إضافة فرع/صلاحية', 'زیادکردنی لق/ڕێگەپێدان')}
                    </Button>
                  </div>

                  {userPerms.map(p => {
                    const ri = getRoleInfo(p.role);
                    const branchName = p.branch_id
                      ? (branches.find(b => b.id === p.branch_id)?.[lang === 'ku' ? 'name_ku' : 'name'] || '?')
                      : L('كل الفروع', 'هەموو لقەکان');
                    return (
                      <div key={p.id} className="space-y-2">
                        <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
                          <span className="text-sm font-semibold text-[#1a2744]">🏢 {branchName}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${ri.color}`}>{L(ri.labelAr, ri.labelKu)}</span>
                          <div className="mr-auto flex gap-1">
                            <Button size="sm" variant="outline" className={`text-xs ${editingPerm === p.id ? 'bg-[#1a2744] text-white' : ''}`}
                              onClick={() => { setEditingPerm(editingPerm === p.id ? null : p.id); setEditForm({ ...p }); }}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs text-red-500 hover:bg-red-50"
                              onClick={() => deletePerm.mutate(p.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {editingPerm === p.id && (
                          <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-4">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block font-semibold">{L('الفرع', 'لق')}</label>
                              <select value={editForm.branch_id || ''} onChange={e => setEditForm(prev => ({ ...prev, branch_id: e.target.value }))}
                                className="w-full sm:w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                                <option value="">{L('جميع الفروع', 'هەموو لقەکان')}</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{lang === 'ku' ? (b.name_ku || b.name) : b.name}</option>)}
                              </select>
                            </div>
                            <UserPermissionsEditor form={editForm} setForm={setEditForm} lang={lang} />
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-[#1a2744] gap-1" onClick={() => updatePerm.mutate({ id: p.id, data: editForm })}>
                                <Check className="w-3 h-3" /> {L('حفظ', 'پاشەکەوتکردن')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingPerm(null)}><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {editingPerm === 'new-' + user.id && (
                    <div className="bg-white rounded-xl border border-green-200 p-4 space-y-4">
                      <h5 className="font-semibold text-[#1a2744] text-sm">{L('إضافة صلاحيات لفرع', 'زیادکردنی ڕێگەپێدان بۆ لق')}</h5>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block font-semibold">{L('الفرع', 'لق')}</label>
                        <select value={editForm.branch_id || ''} onChange={e => setEditForm(prev => ({ ...prev, branch_id: e.target.value }))}
                          className="w-full sm:w-64 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                          <option value="">{L('جميع الفروع', 'هەموو لقەکان')}</option>
                          {branches.filter(b => !userPerms.find(up => up.branch_id === b.id)).map(b => (
                            <option key={b.id} value={b.id}>{lang === 'ku' ? (b.name_ku || b.name) : b.name}</option>
                          ))}
                        </select>
                      </div>
                      <UserPermissionsEditor form={editForm} setForm={setEditForm} lang={lang} />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-[#1a2744] gap-1" onClick={() => createPerm.mutate({ user, data: editForm })}>
                          <Check className="w-3 h-3" /> {L('إضافة', 'زیادکردن')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPerm(null)}><X className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  )}

                  {userPerms.length === 0 && editingPerm !== 'new-' + user.id && (
                    <p className="text-xs text-gray-400 text-center py-3">{L('لا توجد صلاحيات مضافة. اضغط "إضافة فرع/صلاحية" للبدء.', 'هیچ ڕێگەپێدانێک زیاد نەکراوە. کلیک بکە بۆ دەستپێکردن.')}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
