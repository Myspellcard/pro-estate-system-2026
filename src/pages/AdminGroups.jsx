import React from 'react';
import GroupManager from '@/components/groups/GroupManager';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminGroups() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">{L('إدارة مجموعات الموظفين', 'بەڕێوەبردنی گروپەکانی کارمەندان')}</h1>
          <p className="text-sm text-slate-500 mt-1">{L('إنشاء وإدارة مجموعات الموظفين لتوزيع المهام', 'دروستکردن و بەڕێوەبردنی گروپەکانی کارمەندان بۆ دابەشکردنی ئەرکەکان')}</p>
        </div>
        <GroupManager />
      </div>
    </div>
  );
}