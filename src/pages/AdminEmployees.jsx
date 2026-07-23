import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useBranch } from '@/context/BranchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, User, UserCheck, Phone, Mail, Briefcase, X, Check, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function AdminEmployees() {
  const { lang } = useLanguage();
  const { activeBranch } = useBranch();
  const queryClient = useQueryClient();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [linkingEmployee, setLinkingEmployee] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranch?.id],
    queryFn: () => activeBranch?.id
      ? firebaseApi.entities.Employee.filter({ branch_id: activeBranch.id })
      : firebaseApi.entities.Employee.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => firebaseApi.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Employee.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['employees']); setShowForm(false); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Employee.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['employees']); setShowForm(false); setEditing(null); setLinkingEmployee(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['employees']),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      full_name: fd.get('full_name'),
      full_name_ku: fd.get('full_name_ku'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      position: fd.get('position'),
      position_ku: fd.get('position_ku'),
      notes: fd.get('notes'),
      is_active: true,
      branch_id: activeBranch?.id || '',
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleLinkUser = (user) => {
    if (!linkingEmployee) return;
    updateMutation.mutate({
      id: linkingEmployee.id,
      data: { user_id: user.id, user_email: user.email },
    });
  };

  const handleUnlinkUser = (employee) => {
    updateMutation.mutate({
      id: employee.id,
      data: { user_id: '', user_email: '' },
    });
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setShowForm(true);
  };

  const filteredUsers = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{L('الموظفون', 'کارمەندەکان')}</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          {L('إضافة موظف', 'زیادکردنی کارمەند')}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? L('تعديل موظف', 'دەستکاریکردنی کارمەند') : L('موظف جديد', 'کارمەندی نوێ')}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{L('الاسم (عربي)', 'ناو (عەرەبی)')}</label>
                  <Input name="full_name" defaultValue={editing?.full_name} required placeholder={L('الاسم الكامل', 'ناوی تەواو')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{L('الاسم (كردي)', 'ناو (کوردی)')}</label>
                  <Input name="full_name_ku" defaultValue={editing?.full_name_ku} placeholder={L('الاسم بالكردية', 'ناوی کوردی')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{L('المنصب (عربي)', 'پۆست (عەرەبی)')}</label>
                  <Input name="position" defaultValue={editing?.position} placeholder={L('المنصب الوظيفي', 'پۆستی کارمەندی')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{L('المنصب (كردي)', 'پۆست (کوردی)')}</label>
                  <Input name="position_ku" defaultValue={editing?.position_ku} placeholder={L('المنصب بالكردية', 'پۆستی کوردی')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{L('الهاتف', 'تەلەفۆن')}</label>
                  <Input name="phone" defaultValue={editing?.phone} placeholder="07xx xxx xxxx" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{L('البريد الإلكتروني', 'ئیمەیڵ')}</label>
                  <Input name="email" defaultValue={editing?.email} placeholder="email@example.com" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{L('ملاحظات', 'تێبینی')}</label>
                <Input name="notes" defaultValue={editing?.notes} placeholder={L('ملاحظات إضافية', 'تێبینی زیادە')} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
                <Button type="submit">{editing ? L('حفظ التعديلات', 'پاشەکەوتکردن') : L('إضافة', 'زیادکردن')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link User Modal */}
      {linkingEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{L('ربط بمستخدم', 'بەستنی بە بەکارهێنەر')}</h2>
              <button onClick={() => { setLinkingEmployee(null); setUserSearch(''); }}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {L('الموظف: ', 'کارمەند: ')}<span className="font-semibold text-foreground">{linkingEmployee.full_name}</span>
            </p>
            <Input
              placeholder={L('بحث عن مستخدم...', 'گەڕان بەدوای بەکارهێنەر...')}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="mb-3"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleLinkUser(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border hover:bg-accent/50 transition-colors text-right"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  {linkingEmployee.user_id === u.id && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">{L('لا توجد نتائج', 'ئەنجامێک نەدۆزرایەوە')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee List */}
      <div className="grid gap-4">
        {employees.map(emp => (
          <div key={emp.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              emp.user_id ? "bg-green-100" : "bg-muted"
            )}>
              {emp.user_id ? <UserCheck className="w-6 h-6 text-green-600" /> : <User className="w-6 h-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-foreground">{lang === 'ku' ? (emp.full_name_ku || emp.full_name) : emp.full_name}</h3>
                {emp.user_id && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    {L('مرتبط بمستخدم', 'بەستراوەتەوە')}
                  </span>
                )}
                {!emp.is_active && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{L('غير نشط', 'چالاک نییە')}</span>
                )}
              </div>
              {(emp.position || emp.position_ku) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{lang === 'ku' ? (emp.position_ku || emp.position) : emp.position}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                {emp.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{emp.phone}</span>}
                {emp.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{emp.email}</span>}
                {emp.user_email && <span className="flex items-center gap-1 text-xs text-green-600"><User className="w-3 h-3" />{emp.user_email}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <Link to={`/admin/employees/profile?id=${emp.id}`}>
                <Button size="sm" variant="outline" className="gap-1 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {L('الملف', 'پرۆفایل')}
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setLinkingEmployee(emp); setUserSearch(''); }}
                className="gap-1 text-xs"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {emp.user_id ? L('تغيير المستخدم', 'گۆڕینی بەکارهێنەر') : L('ربط مستخدم', 'بەستنەوە')}
              </Button>
              {emp.user_id && (
                <Button size="sm" variant="ghost" onClick={() => handleUnlinkUser(emp)} className="text-xs text-muted-foreground">
                  {L('إلغاء الربط', 'لێبردنی پەیوەندی')}
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => openEdit(emp)}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm(L('هل تريد حذف هذا الموظف؟', 'دەتەوێت ئەم کارمەندە بسڕیتەوە؟'))) deleteMutation.mutate(emp.id); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{L('لا يوجد موظفون بعد', 'هیچ کارمەندێک نییە')}</p>
          </div>
        )}
      </div>
    </div>
  );
}