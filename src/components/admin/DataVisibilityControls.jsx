import React from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';

const L = (ar, ku, lang = 'ar') => (lang === 'ku' ? ku : ar);

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export default function DataVisibilityControls({ form, setForm, lang = 'ar' }) {
  const scope = form?.contract_properties_scope || form?.contractPropertiesScope || 'branch';
  const readProjects = ensureArray(form?.cross_branch_project_ids || form?.crossBranchProjectIds);
  const writeProjects = ensureArray(form?.cross_branch_write_project_ids || form?.crossBranchWriteProjectIds);
  const deleteProjects = ensureArray(form?.cross_branch_delete_project_ids || form?.crossBranchDeleteProjectIds);

  const setScope = (value) => {
    setForm((prev) => ({
      ...prev,
      contract_properties_scope: value,
      contractPropertiesScope: value,
    }));
  };

  const updateTextList = (fieldSnake, fieldCamel, value) => {
    const items = value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    setForm((prev) => ({
      ...prev,
      [fieldSnake]: items,
      [fieldCamel]: items,
    }));
  };

  return (
    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-emerald-900">
          {L('رؤية البيانات والعقارات', 'بینینی داتا و خانووبەرەکان', lang)}
        </h3>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          {L(
            'حدد نطاق العقارات التي يستطيع المستخدم استعمالها في العقود، ويمكنك إضافة معرفات مشاريع خارج فرعه عند الحاجة.',
            'سنووری ئەو خانووبەرانە دیاری بکە کە بەکارهێنەر دەتوانێت لە گرێبەستەکان بەکاریان بهێنێت.',
            lang
          )}
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {[
          ['own', L('عقاراته فقط', 'تەنها خانووبەرەکانی خۆی', lang)],
          ['branch', L('عقارات الفرع', 'خانووبەرەکانی لق', lang)],
          ['all', L('كل الفروع', 'هەموو لقەکان', lang)],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              scope === value
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ListBox
          icon={<Eye className="h-4 w-4" />}
          label={L('مشاريع يمكن رؤيتها', 'پڕۆژەکانی دەتوانێت بیانبینێت', lang)}
          value={readProjects.join('\n')}
          onChange={(value) => updateTextList('cross_branch_project_ids', 'crossBranchProjectIds', value)}
        />
        <ListBox
          icon={<Pencil className="h-4 w-4" />}
          label={L('مشاريع يمكن تعديلها', 'پڕۆژەکانی دەتوانێت دەستکاری بکات', lang)}
          value={writeProjects.join('\n')}
          onChange={(value) => updateTextList('cross_branch_write_project_ids', 'crossBranchWriteProjectIds', value)}
        />
        <ListBox
          icon={<Trash2 className="h-4 w-4" />}
          label={L('مشاريع يمكن حذفها', 'پڕۆژەکانی دەتوانێت بسڕێتەوە', lang)}
          value={deleteProjects.join('\n')}
          onChange={(value) => updateTextList('cross_branch_delete_project_ids', 'crossBranchDeleteProjectIds', value)}
        />
      </div>
    </div>
  );
}

function ListBox({ icon, label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
        {icon}
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder="project-id"
        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}
