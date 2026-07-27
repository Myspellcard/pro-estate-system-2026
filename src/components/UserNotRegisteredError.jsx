import React from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { firebaseApi } from '@/api/firebaseClient';

export default function UserNotRegisteredError() {
  const email = firebaseApi.auth?.currentUser?.email || '';

  const handleLogout = async () => {
    await firebaseApi.auth.logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">الحساب غير مفعّل</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          هذا البريد لم يتم إعطاؤه صلاحية الدخول داخل النظام بعد.
        </p>
        {email && <p className="mt-2 text-sm font-medium text-slate-800">{email}</p>}
        <p className="mt-4 text-sm leading-6 text-slate-500">
          افتح إدارة المستخدمين والصلاحيات من حساب المالك، ثم أضف هذا البريد أو فعّل صلاحياته.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
