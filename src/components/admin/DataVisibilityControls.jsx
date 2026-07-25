import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MODE_OPTIONS = {
  employees: [
    { value: 'all', labelAr: 'كل الموظفين', labelKu: 'هەموو کارمەندان' },
    { value: 'specific', labelAr: 'موظفون محددون', labelKu: 'کارمەندی دیاریکراو' },
  ],
  contracts: [
    { value: 'all', labelAr: 'كل العقود', labelKu: 'هەموو گرێبەستەکان' },
    { value: 'own', labelAr: 'عقود هذا المستخدم فقط', labelKu: 'گرێبەستەکانی ئەم بەکارهێنەرە تەنها' },
    { value: 'specific', labelAr: 'عقود محددة', labelKu: 'گرێبەستی دیاریکراو' },
  ],
  crm: [
    { value: 'all', labelAr: 'كل عملاء CRM', labelKu: 'هەموو کڕیارەکانی CRM' },
    { value: 'own', labelAr: 'عملاء هذا المستخدم فقط', labelKu: 'کڕیارەکانی ئەم بەکارهێنەرە تەنها' },
    { value: 'others', labelAr: 'عملاء الآخرين فقط', labelKu: 'کڕیارەکانی ئەوانی تر تەنها' },
    { value: 'specific', labelAr: 'عملاء مستخدمين محددين', labelKu: 'کڕیارەکانی بەکارهێنەری دیاریکراو' },
  ],
  crm_contact: [
    { value: 'own', labelAr: 'أرقام عملائي فقط', labelKu: 'ژمارەکانی کڕیارەکانی من تەنها' },
    { value: 'all', labelAr: 'كل أرقام CRM', labelKu: 'هەموو ژمارەکانی CRM' },
    { value: 'specific', labelAr: 'أرقام مستخدمين محددين', labelKu: 'ژمارەکانی بەکارهێنەری دیاریکراو' },
  ],
};

export default function DataVisibilityControls({ form, setForm, lang }) {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [open, setOpen] = useState(false);

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => firebaseApi.entities.Employee.list() });
  const { data: contracts = [] } = useQuery({ queryKey: ['contracts-vis-ctrl'], queryFn: () => firebaseApi.entities.Contract.list('-created_date', 300) });
  const { data: users = [] } = useQuery({ queryKey: ['users-vis-ctrl'], queryFn: () => firebaseApi.entities.User.list() });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleArrayItem = (key, id) => {
    setForm(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] };
    });
  };

  const renderModeSelect = (modeKey, options) => (
    <select
      value={form[modeKey] || 'all'}
      onChange={e => set(modeKey, e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20 bg-white"
    >
      {options.map(o => <option key={o.value} value={o.value}>{L(o.labelAr, o.labelKu)}</option>)}
    </select>
  );

  const renderMultiSelect = (arrayKey, items, getLabel) => {
    const selected = form[arrayKey] || [];
    if (!items || items.length === 0) return <p className="text-xs text-gray-400 py-2">{L('لا توجد عناصر متاحة', 'هیچ شتێک بەردەست نییە')}</p>;
    return (
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-white">
        {items.map(item => {
          const id = item.id;
          if (!id) return null;
          const checked = selected.includes(id);
          return (
            <label key={id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={checked} onChange={() => toggleArrayItem(arrayKey, id)} className="w-4 h-4 shrink-0" />
              <span className="text-xs text-gray-700 truncate">{getLabel(item)}</span>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-xl border-2 border-indigo-200 overflow-hidden">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-white font-bold text-sm bg-indigo-700">
        <span className="flex items-center gap-2">
          <span className="text-base">👁️</span>
          {L('التحكم برؤية البيانات والوصول', 'کۆنترۆڵی بینینی داتا و دەستگەیشتن')}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="bg-white divide-y divide-gray-100 p-4 space-y-5">
          {/* Custom Role Name */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-semibold">{L('اسم دور مخصص (اختياري)', 'ناوی ڕۆڵی تایبەت (ئارەزوومەندانە)')}</label>
            <input
              type="text"
              value={form.custom_role_name || ''}
              onChange={e => set('custom_role_name', e.target.value)}
              placeholder={L('مثال: موظف مبيعات', 'نمونە: کارمەندی فرۆشتن')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744]/20"
            />
            <p className="text-[10px] text-gray-400 mt-1">{L('يُعرض هذا الاسم بدلاً من اسم الدور الافتراضي في القوائم', 'ئەم ناوە لەبری ناوی ڕۆڵی بنەڕەتی پیشان دەدرێت')}</p>
          </div>

          {/* Employees Visibility */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">👔 {L('رؤية الموظفين', 'بینینی کارمەندان')}</h4>
            {renderModeSelect('employees_visibility_mode', MODE_OPTIONS.employees)}
            {form.employees_visibility_mode === 'specific' && renderMultiSelect('visible_employee_ids', employees, e => lang === 'ku' ? (e.full_name_ku || e.full_name) : e.full_name)}
          </div>

          {/* Contracts Visibility */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">📋 {L('رؤية العقود', 'بینینی گرێبەستەکان')}</h4>
            {renderModeSelect('contracts_visibility_mode', MODE_OPTIONS.contracts)}
            {form.contracts_visibility_mode === 'specific' && renderMultiSelect('visible_contract_ids', contracts, c => `${c.contract_number || '—'} - ${c.property_name || ''} - ${c.tenant_name || ''}`)}
          </div>

          {/* CRM Visibility */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">🎯 {L('رؤية عملاء CRM', 'بینینی کڕیارەکانی CRM')}</h4>
            {renderModeSelect('crm_visibility_mode', MODE_OPTIONS.crm)}
            {form.crm_visibility_mode === 'specific' && renderMultiSelect('visible_crm_user_ids', users, u => u.full_name || u.email)}
          </div>

          {/* CRM Contact Visibility */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">📞 {L('رؤية أرقام تواصل CRM', 'بینینی ژمارە پەیوەندییەکانی CRM')}</h4>
            {renderModeSelect('crm_contact_visibility_mode', MODE_OPTIONS.crm_contact)}
            {form.crm_contact_visibility_mode === 'specific' && renderMultiSelect('visible_crm_contact_user_ids', users, u => u.full_name || u.email)}
            <p className="text-[10px] text-gray-400">{L('يتحكم في إظهار أرقام الهواتف للعملاء في البطاقات والتفاصيل', 'کۆنترۆڵی پیشاندانی ژمارە تەلەفۆنەکان بۆ کڕیارەکان')}</p>
          </div>
        </div>
      )}
    </div>
  );
}