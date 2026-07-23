import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ShieldCheck, LogOut, Mail } from 'lucide-react';

const UserNotRegisteredError = () => {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-amber-100">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">الوصول محظور / Access Restricted</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            تم تسجيل دخولك بنجاح، لكن بريدك الإلكتروني لم تتم الموافقة عليه بعد من قبل مالك النظام أو المسؤول.
            <br />
            <span className="text-sm text-slate-500">
              You are logged in, but your email has not been approved by the system owner or admin yet.
            </span>
          </p>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-slate-700 mb-6 text-right" dir="rtl">
            <p className="font-bold text-amber-800 mb-2">للحصول على الصلاحية:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>تواصل مع مالك النظام أو المسؤول لإضافة بريدك الإلكتروني</li>
              <li>بعد الموافقة، سجل الخروج ثم الدخول مرة أخرى</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600 mb-6" dir="ltr">
            <p className="font-medium text-slate-700 mb-1">To gain access:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Contact the system owner/admin to approve your email</li>
              <li>After approval, log out and sign in again</li>
            </ul>
          </div>

          <button
            onClick={() => logout(true)}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#1a2744] text-white rounded-lg font-medium hover:bg-[#2a3f6e] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج / Log out
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Mail className="w-3 h-3" />
            <span>يتم قبول البريد الإلكتروني فقط بعد موافقة المسؤول</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;