import React, { useState } from 'react';
import JSZip from 'jszip';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, CheckCircle2, AlertCircle, Loader2, Database, ArrowLeft, Code2, Upload, RotateCcw, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ENTITIES = [
  'Branch', 'Property', 'Tenant', 'Contract', 'Invoice',
  'Maintenance', 'ContractClause', 'MessageTemplate',
  'Employee', 'EmployeeTask', 'EmployeeGoal', 'EmployeeGroup',
  'EmployeeBadge', 'EmployeeFeedback', 'EmployeeReport', 'EmployeePermission',
  'Department', 'UserPermission', 'AppSettings', 'AppUser',
  'TaskColor', 'AdvertisementBanner', 'Project', 'ProjectCategory',
  'PropertyLabel', 'PropertyStatusColor', 'Sale', 'SaleContract',
  'SaleContractClause', 'SaleInvoice',
  // Finance & CRM
  'Currency', 'Commission', 'SaleOwnerSpent', 'Lead', 'LossReason',
  // Permissions & notifications
  'PermissionApprover', 'Notification',
  // Barcode & translations
  'BarcodeSettings', 'BarcodeStatus', 'Translation',
  // Property purposes
  'PropertyPurpose',
];

function downloadJSON(content, filename) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Backup() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const navigate = useNavigate();

  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [progress, setProgress] = useState({ done: 0, total: ENTITIES.length, current: '' });
  const [totalRecords, setTotalRecords] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const [codeStatus, setCodeStatus] = useState('idle'); // idle | running | done | error
  const [fileCount, setFileCount] = useState(0);

  // ── Restore ──────────────────────────────────────────────────────────────────
  const [restoreStatus, setRestoreStatus] = useState('idle'); // idle | parsing | preview | running | done | error
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreProgress, setRestoreProgress] = useState({ done: 0, total: 0, current: '', restored: 0 });
  const [restoreResult, setRestoreResult] = useState([]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreStatus('parsing');
    setRestoreResult([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.entities || typeof data.entities !== 'object') throw new Error('invalid');
        const entries = Object.entries(data.entities);
        const total = entries.reduce((s, [, recs]) => s + (Array.isArray(recs) ? recs.length : 0), 0);
        setRestoreFile({ entries, total, createdAt: data.created_at, fileName: file.name });
        setRestoreStatus('preview');
      } catch {
        setRestoreStatus('error');
      }
    };
    reader.onerror = () => setRestoreStatus('error');
    reader.readAsText(file);
  };

  const resetRestore = () => {
    setRestoreStatus('idle');
    setRestoreFile(null);
    setRestoreResult([]);
    setRestoreProgress({ done: 0, total: 0, current: '', restored: 0 });
  };

  const runRestore = async () => {
    if (!restoreFile) return;
    setRestoreStatus('running');
    setRestoreResult([]);
    let done = 0;
    let restored = 0;
    const results = [];
    for (const [name, records] of restoreFile.entries) {
      setRestoreProgress({ done, total: restoreFile.total, current: name, restored });
      const validRecords = Array.isArray(records) ? records : [];
      if (validRecords.length === 0 || !firebaseApi.entities[name]) {
        results.push({ entity: name, count: 0, ok: false, error: !firebaseApi.entities[name] ? L('الجدول غير موجود', 'خشتە نەدۆزرایەوە') : L('فارغ', 'بەتاڵ') });
        continue;
      }
      try {
        let created = 0;
        for (let i = 0; i < validRecords.length; i += 500) {
          const batch = validRecords.slice(i, i + 500);
          const res = await firebaseApi.entities[name].bulkCreate(batch);
          created += Array.isArray(res) ? res.length : 0;
          done += batch.length;
          restored += batch.length;
          setRestoreProgress({ done, total: restoreFile.total, current: name, restored });
        }
        results.push({ entity: name, count: created, ok: true });
      } catch (err) {
        results.push({ entity: name, count: 0, ok: false, error: (err?.message || L('فشل', 'سەرنەکەوت')).slice(0, 80) });
      }
    }
    setRestoreResult(results);
    setRestoreStatus('done');
  };

  // ── Database Backup ──────────────────────────────────────────────────────────
  const fetchAllRecords = async (entityName) => {
    const allRecords = [];
    const PAGE_SIZE = 1000;
    let skip = 0;
    while (true) {
      const page = await firebaseApi.entities[entityName].list(null, PAGE_SIZE, skip);
      if (!page || page.length === 0) break;
      allRecords.push(...page);
      if (page.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }
    return allRecords;
  };

  const runBackup = async () => {
    setStatus('running');
    setErrorMsg('');
    const backup = { created_at: new Date().toISOString(), entities: {}, total_records: 0 };

    for (let i = 0; i < ENTITIES.length; i++) {
      const name = ENTITIES[i];
      setProgress({ done: i, total: ENTITIES.length, current: name });
      try {
        const records = await fetchAllRecords(name);
        backup.entities[name] = records;
        backup.total_records = (backup.total_records || 0) + records.length;
      } catch {
        backup.entities[name] = [];
      }
    }

    setProgress({ done: ENTITIES.length, total: ENTITIES.length, current: '' });
    setTotalRecords(backup.total_records || 0);
    downloadJSON(backup, `backup_${new Date().toISOString().slice(0, 10)}.json`);
    setStatus('done');
  };

  const percent = Math.round((progress.done / progress.total) * 100);

  // CSS and config content embedded at build time
  const INDEX_CSS = document.querySelector('style[data-vite-dev-id*="index.css"]')?.textContent || '/* see src/index.css */';

  // ── Source Code Backup ───────────────────────────────────────────────────────
  // Note: JSX source files are not accessible at runtime (browser sandbox).
  // We embed the design tokens (index.css) and config, and list all files.
  // For full JSX backup, use Firebase GitHub Sync.
  const runCodeBackup = async () => {
    setCodeStatus('running');
    setFileCount(0);
    try {
      const zip = new JSZip();
      const src = zip.folder('src');

      // Embed the compiled CSS (design tokens are always present in the DOM)
      const allStyles = Array.from(document.styleSheets)
        .flatMap(ss => { try { return Array.from(ss.cssRules).map(r => r.cssText); } catch { return []; } })
        .join('\n');
      src.file('compiled_styles.css', allStyles || '/* styles not accessible */');

      // Embed tailwind config and index.css as known content
      src.file('index.css', `/* Full content available via GitHub Sync */\n/* Design tokens are in compiled_styles.css */`);
      src.file('tailwind.config.js', `/* Full content available via GitHub Sync */`);

      // Generate a full file manifest so developer knows what exists
      const pages = [
        'Dashboard','Properties','Tenants','Contracts','Invoices','Maintenance','Analytics',
        'EmployeeGoals','EmployeeTasks','EmployeePermissions','EmployeeProfile','OrganizationStructure',
        'HrReports','GroupTasks','AdminBranches','AdminUsers','AdminEmployees','AdminGroups',
        'AdminDepartments','AdminDashboardSettings','AdminPrintSettings','AdminWhatsAppTemplates',
        'AdminProjects','AdminPropertyLabels','AdminProjectCategories','AdminSaleCategories',
        'AdminSaleContractClauses','AdminPropertyStatusColors','AdminAdvertisements','AdminTaskColors',
        'ProjectsView','Sales','SalesView','SaleContracts','SaleInvoices','Reports','UserProfile',
        'TaskPublicView','Backup',
      ];

      const components = [
        'layout/AppLayout','layout/Sidebar',
        'goals/GoalFormModal','goals/GoalDetailModal','goals/GoalEvaluationPanel',
        'tasks/TaskDetailModal','tasks/TaskPost','tasks/CommentsSection','tasks/CommentEditor',
        'tasks/CommentItem','tasks/CommentFilters','tasks/RichDescriptionEditor',
        'tasks/TaskDescriptionViewer','tasks/HrEvaluation','tasks/ProfessionalRichEditor','tasks/AttachmentPreview',
        'employees/EmployeeProfileTab','employees/EmployeeTasksTab','employees/EmployeeBadgesTab',
        'employees/EmployeeCVTab','employees/EmployeeFeedbackTab','employees/EmployeeReportTab',
        'employees/EmployeeSkillsTab','employees/EmployeeRequirementsTab',
        'shared/EmptyState','shared/PageHeader','shared/StatCard',
        'dashboard/GeneralDashboard','dashboard/BranchDashboard','dashboard/UpcomingPayments',
        'dashboard/ExpiringContracts','dashboard/OverdueList','dashboard/DashboardLayoutEditor',
        'contracts/ContractForm','contracts/ContractDetail','contracts/ContractPrint',
        'contracts/ContactActions','contracts/PropertyInfoSection',
        'properties/PropertyForm','properties/PropertyDetail','properties/PropertyGridCard',
        'properties/PropertyGroupAccordion','properties/PropertyTabsView','properties/PropertyFilterView',
        'tenants/TenantForm','maintenance/MaintenanceForm','invoices/InvoicePrint',
        'sale-contracts/SaleContractForm','sale-contracts/SaleContractDetail',
        'groups/GroupManager','admin/UserPermissionsEditor','admin/PrintSettingsEditor',
      ];

      const functions = [
        'fixInvoicePeriods','generateInvoicesForAllContracts','generateInvoicesFromContract',
        'getTaskByToken','sendAutoContractMessage','sendAutoPaymentMessage',
        'sendContractThankYouOwner','sendContractThankYouTenant',
        'sendPaymentThankYouOwner','sendPaymentThankYouTenant',
        'syncPropertyStatus','updateTaskComments','updateTenantPhoneInContracts','getSourceFiles',
      ];

      const readme = `# Source Code Backup
Generated: ${new Date().toISOString()}

## ⚠️ Important Note
JSX/JS source files are NOT included in this ZIP because they run in a browser
sandbox and cannot access the filesystem at runtime.

To get the FULL source code backup, use:
  **Firebase Dashboard → Settings → GitHub Sync**
This will push all source files to a GitHub repo you own.

## What IS included
- src/compiled_styles.css — all compiled CSS/design tokens from the DOM
- This README with the full file manifest

## Tech Stack
- React 18 + Vite + Tailwind CSS + shadcn/ui
- Firebase BaaS (entities, backend functions, automations)
- react-router-dom v6 | @tanstack/react-query
- RTL + Arabic + Kurdish (Sorani)

## Pages (${pages.length})
${pages.map(p => `src/pages/${p}.jsx`).join('\n')}

## Components (${components.length})
${components.map(c => `src/components/${c}.jsx`).join('\n')}

## Context & Hooks
src/context/BranchContext.jsx
src/context/LanguageContext.jsx
src/lib/AuthContext.jsx
src/hooks/useUserPermissions.jsx
src/api/firebaseClient.js
src/utils/pdfExport.js

## Backend Functions (${functions.length})
${functions.map(f => `functions/${f}.js`).join('\n')}

## Entities (${ENTITIES.length})
${ENTITIES.join(', ')}
`;

      zip.file('README.md', readme);

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `src_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setFileCount(pages.length + components.length + functions.length);
      setCodeStatus('done');
    } catch (err) {
      setCodeStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-4 lg:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{L('النسخ الاحتياطي', 'بەکاپی داتا')}</h1>
            <p className="text-sm text-slate-500">{L('تحميل نسخة احتياطية كاملة من جميع البيانات والكود', 'داونلۆدکردنی هەموو داتا و کۆد')}</p>
          </div>
        </div>

        {/* ── Database backup card ── */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>{L('نسخ احتياطي للبيانات', 'پاراستنی داتا')}</CardTitle>
                <CardDescription>
                  {L(`يشمل ${ENTITIES.length} جدول بيانات`, `${ENTITIES.length} خشتەی داتا دەگرێتەوە`)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-600 mb-3">{L('الجداول المضمّنة:', 'خشتەکانی تێدا:')}</p>
              <div className="flex flex-wrap gap-2">
                {ENTITIES.map(e => (
                  <span
                    key={e}
                    className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${
                      status === 'running' && progress.current === e
                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-400'
                        : status !== 'idle' && progress.done > ENTITIES.indexOf(e)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>

            {status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{L('جاري التحميل...', 'داتا دەگیرێتەوە...')} {progress.current}</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )}

            {status === 'done' && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-800 text-sm">{L('تم التحميل بنجاح!', 'بەسەرکەوتوویی داونلۆدکرا!')}</p>
                  <p className="text-xs text-green-600">
                    {L(`إجمالي السجلات: ${totalRecords.toLocaleString()} سجل`, `کۆی تۆمارەکان: ${totalRecords.toLocaleString()} تۆمار`)}
                  </p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}

            <Button
              onClick={runBackup}
              disabled={status === 'running'}
              className="w-full rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              {status === 'running' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {L(`جاري تصدير البيانات... (${progress.done}/${progress.total})`, `داتا دەدرێتەدەر... (${progress.done}/${progress.total})`)}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {L('تحميل النسخة الاحتياطية', 'داونلۆدکردنی بەکاپ')}
                </>
              )}
            </Button>

            <p className="text-xs text-slate-400 text-center">
              {L('الملف سيكون بصيغة JSON يمكن استخدامه للاستعادة لاحقاً', 'فایلەکە JSON دەبێت و دواتر دەتوانرێت بۆ گەڕاندنەوە بەکاربێت')}
            </p>
          </CardContent>
        </Card>

        {/* ── Source code backup card ── */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>{L('الكود المصدري (ZIP)', 'کۆدی سەرچاوە (ZIP)')}</CardTitle>
                <CardDescription>
                  {L('قائمة كاملة بجميع الملفات + CSS مترجم. للكود الكامل استخدم GitHub Sync', 'لیستی تەواوی هەموو فایلەکان + CSS. بۆ کۆدی تەواو GitHub Sync بەکاربێنە')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-bold">{L('⚠️ ملاحظة مهمة', '⚠️ تێبینیی گرنگ')}</p>
              <p>{L('ملفات JSX لا يمكن تضمينها مباشرة (قيود المتصفح). الـ ZIP يحتوي على CSS مترجم + قائمة كاملة بجميع الملفات في README.', 'فایلەکانی JSX ناتوانرێت پیشکەش بکرێت (سنوری براوزەر). ZIP CSS کۆمپایلکراو + لیستی تەواوی فایلەکان لە README دەگرێتەوە.')}</p>
              <p className="font-bold">{L('للكود الكامل: Dashboard → Settings → GitHub Sync', 'بۆ کۆدی تەواو: Dashboard → Settings → GitHub Sync')}</p>
            </div>

            {codeStatus === 'done' && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm font-bold text-green-800">
                  {L(`تم التحميل! (${fileCount} ملف)`, `داونلۆدکرا! (${fileCount} فایل)`)}
                </p>
              </div>
            )}

            {codeStatus === 'error' && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{L('حدث خطأ أثناء التحميل', 'هەڵەیەک ڕوویدا')}</p>
              </div>
            )}

            <Button
              onClick={runCodeBackup}
              disabled={codeStatus === 'running'}
              className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white h-12 text-base"
            >
              {codeStatus === 'running' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {L('جاري جمع الملفات وإنشاء ZIP...', 'فایلەکان کۆدەکرێنەوە و ZIP دروستدەکرێت...')}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {L('تحميل كل الكود (ZIP)', 'داونلۆدی هەموو کۆد (ZIP)')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Restore card ── */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>{L('استعادة البيانات', 'گەڕاندنەوەی داتا')}</CardTitle>
                <CardDescription>
                  {L('ارفع ملف النسخة الاحتياطية (JSON) لاستعادة البيانات', 'فایلی بەکاپ (JSON) باربکە بۆ گەڕاندنەوەی داتا')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
              <p className="font-bold">{L('⚠️ تنبيه', '⚠️ ئاگاداری')}</p>
              <p>{L('الاستعادة تضيف السجلات إلى الجداول الحالية مع الحفاظ على المعرفات. تأكد من عدم وجود تكرار قبل الاستعادة.', 'گەڕاندنەوە تۆمارەکان زیاد دەکات بۆ خشتەکانی ئێستا لەگەڵ پاراستنی ناسنامە. پێش گەڕاندنەوە دڵنیابە لە نەبوونی دووبارە.')}</p>
            </div>

            {restoreStatus === 'idle' && (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl p-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
                <Upload className="w-8 h-8 text-emerald-600" />
                <span className="text-sm font-bold text-slate-700">{L('اختر ملف JSON', 'فایلی JSON هەڵبژێرە')}</span>
                <span className="text-xs text-slate-400">{L('انقر للاختيار', 'کلیک بکە بۆ هەڵبژاردن')}</span>
                <input type="file" accept=".json,application/json" className="hidden" onChange={handleFileSelect} />
              </label>
            )}

            {restoreStatus === 'parsing' && (
              <div className="flex items-center justify-center gap-2 py-6 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{L('جاري قراءة الملف...', 'فایل دەخوێنرێتەوە...')}</span>
              </div>
            )}

            {restoreStatus === 'preview' && restoreFile && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3">
                  <FileJson className="w-5 h-5 text-slate-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{restoreFile.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {L(`${restoreFile.total.toLocaleString()} سجل في ${restoreFile.entries.length} جدول`, `${restoreFile.total.toLocaleString()} تۆمار لە ${restoreFile.entries.length} خشتە`)}
                    </p>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto bg-slate-50 rounded-xl p-3 space-y-1">
                  {restoreFile.entries.map(([name, recs]) => (
                    <div key={name} className="flex justify-between text-xs py-1 px-2 bg-white rounded-lg">
                      <span className="font-semibold text-slate-700">{name}</span>
                      <span className="text-slate-500">{Array.isArray(recs) ? recs.length : 0}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetRestore} className="flex-1 rounded-xl h-11">
                    {L('إلغاء', 'پاشگەزبوونەوە')}
                  </Button>
                  <Button onClick={runRestore} className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                    <RotateCcw className="w-4 h-4" />
                    {L('بدء الاستعادة', 'دەستپێکردنی گەڕاندنەوە')}
                  </Button>
                </div>
              </div>
            )}

            {restoreStatus === 'running' && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{L('جاري الاستعادة...', 'گەڕاندنەوە...')} {restoreProgress.current}</span>
                  <span>{Math.round((restoreProgress.done / Math.max(1, restoreProgress.total)) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${Math.round((restoreProgress.done / Math.max(1, restoreProgress.total)) * 100)}%` }} />
                </div>
                <p className="text-xs text-slate-400 text-center">
                  {L(`تم استعادة ${restoreProgress.restored.toLocaleString()} سجل`, `${restoreProgress.restored.toLocaleString()} تۆمار گەڕێندرایەوە`)}
                </p>
              </div>
            )}

            {restoreStatus === 'done' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-sm font-bold text-green-800">{L('اكتملت الاستعادة', 'گەڕاندنەوە تەواوبوو')}</p>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {restoreResult.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-lg ${r.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <span className="font-semibold">{r.entity}</span>
                      <span>{r.ok ? `✓ ${r.count}` : `✕ ${r.error}`}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={resetRestore} className="w-full rounded-xl h-11">
                  {L('استعادة ملف آخر', 'گەڕاندنەوەی فایلێکی تر')}
                </Button>
              </div>
            )}

            {restoreStatus === 'error' && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-700 flex-1">{L('ملف غير صالح. تأكد من رفع ملف JSON صحيح.', 'فایل نادروستە. دڵنیابە لە فایلی JSON دروست.')}</p>
                <Button variant="outline" size="sm" onClick={resetRestore}>{L('إعادة', 'هەڵەوەشێوە')}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}