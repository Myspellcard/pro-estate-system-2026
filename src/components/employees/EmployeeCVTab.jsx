import React, { useRef, useState } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, ExternalLink, Trash2, Plus, Download, Printer, User, Phone, Mail, MapPin, Briefcase, Calendar, Star } from 'lucide-react';

export default function EmployeeCVTab({ employee, onUpdate }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [uploading, setUploading] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const fileRef = useRef();

  // cv_files: array of { url, label, uploaded_at }
  const cvFiles = employee.cv_files || (employee.cv_url ? [{ url: employee.cv_url, label: L('السيرة الذاتية', 'ژیانامە'), uploaded_at: '' }] : []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setLabelInput(file.name.replace(/\.[^.]+$/, ''));
    setShowLabelInput(true);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setShowLabelInput(false);
    const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file: pendingFile });
    const newFile = { url: file_url, label: labelInput || pendingFile.name, uploaded_at: new Date().toISOString().split('T')[0] };
    const updated = [...cvFiles, newFile];
    await firebaseApi.entities.Employee.update(employee.id, { cv_files: updated, cv_url: file_url });
    onUpdate({ ...employee, cv_files: updated, cv_url: file_url });
    setPendingFile(null);
    setLabelInput('');
    setUploading(false);
  };

  const handleRemove = async (idx) => {
    const updated = cvFiles.filter((_, i) => i !== idx);
    await firebaseApi.entities.Employee.update(employee.id, { cv_files: updated, cv_url: updated[0]?.url || '' });
    onUpdate({ ...employee, cv_files: updated, cv_url: updated[0]?.url || '' });
  };

  const handlePrintCV = () => {
    const skills = (employee.skills || []).map(s => `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:13px;font-weight:600">${s.name}</span><span style="font-size:12px;color:#6b7280">${s.level}%</span></div><div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden"><div style="height:100%;width:${s.level}%;background:linear-gradient(90deg,#3b82f6,#1d4ed8);border-radius:3px"></div></div></div>`).join('');

    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>CV - ${employee.full_name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap" rel="stylesheet">
    <style>
      @page { size: A4; margin: 0; }
      * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      body { font-family:'Tajawal',sans-serif; color:#1f2937; background:#f8fafc; direction:rtl; }
      .page { width:210mm; min-height:297mm; display:flex; background:white; }
      .sidebar { width:70mm; background:linear-gradient(180deg,#1e3a5f 0%,#1d4ed8 60%,#2563eb 100%); color:white; padding:32px 20px; flex-shrink:0; }
      .main { flex:1; padding:32px 28px; }
      .avatar { width:90px; height:90px; border-radius:50%; border:3px solid rgba(255,255,255,0.4); background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:800; margin:0 auto 16px; overflow:hidden; }
      .avatar img { width:100%; height:100%; object-fit:cover; }
      .sidebar-name { font-size:17px; font-weight:800; text-align:center; margin-bottom:4px; }
      .sidebar-pos { font-size:12px; text-align:center; opacity:0.8; margin-bottom:24px; }
      .sidebar-section { margin-bottom:20px; }
      .sidebar-section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; opacity:0.7; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:6px; margin-bottom:12px; }
      .sidebar-row { display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; font-size:12px; opacity:0.9; }
      .sidebar-dot { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,0.6); margin-top:5px; flex-shrink:0; }
      .main-name { font-size:28px; font-weight:800; color:#1e3a5f; margin-bottom:4px; }
      .main-pos { font-size:15px; color:#3b82f6; font-weight:600; margin-bottom:20px; }
      .divider { height:3px; background:linear-gradient(90deg,#1d4ed8,#93c5fd); border-radius:2px; margin-bottom:20px; }
      .section { margin-bottom:22px; }
      .section-title { font-size:13px; font-weight:800; color:#1e3a5f; border-right:3px solid #3b82f6; padding-right:10px; margin-bottom:12px; }
      .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .info-item { background:#f1f5f9; border-radius:8px; padding:10px 12px; }
      .info-label { font-size:10px; color:#6b7280; font-weight:600; margin-bottom:3px; }
      .info-value { font-size:13px; font-weight:600; color:#1f2937; }
      .skill-bar { margin-bottom:8px; }
      .skill-row { display:flex; justify-content:space-between; margin-bottom:3px; }
      .skill-name { font-size:12px; font-weight:600; }
      .skill-pct { font-size:11px; color:#6b7280; }
      .bar { height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden; }
      .bar-fill { height:100%; background:linear-gradient(90deg,#3b82f6,#1d4ed8); border-radius:3px; }
      .footer { margin-top:auto; border-top:1px solid #e5e7eb; padding-top:12px; text-align:center; font-size:10px; color:#9ca3af; }
      @media print { body { background:white; } .page { width:100%; } }
    </style></head>
    <body>
    <div class="page">
      <div class="sidebar">
        <div class="avatar">
          ${employee.photo_url ? `<img src="${employee.photo_url}" />` : (employee.full_name || '?').charAt(0)}
        </div>
        <div class="sidebar-name">${employee.full_name || ''}</div>
        ${employee.full_name_ku ? `<div class="sidebar-pos">${employee.full_name_ku}</div>` : ''}
        <div class="sidebar-pos">${employee.position || ''}</div>

        ${(employee.phone || employee.email || employee.address) ? `
        <div class="sidebar-section">
          <div class="sidebar-section-title">التواصل</div>
          ${employee.phone ? `<div class="sidebar-row"><div class="sidebar-dot"></div><span>📞 ${employee.phone}</span></div>` : ''}
          ${employee.email ? `<div class="sidebar-row"><div class="sidebar-dot"></div><span>✉️ ${employee.email}</span></div>` : ''}
          ${employee.address ? `<div class="sidebar-row"><div class="sidebar-dot"></div><span>📍 ${employee.address}</span></div>` : ''}
        </div>` : ''}

        ${(employee.nationality || employee.id_number) ? `
        <div class="sidebar-section">
          <div class="sidebar-section-title">معلومات أخرى</div>
          ${employee.nationality ? `<div class="sidebar-row"><div class="sidebar-dot"></div><span>الجنسية: ${employee.nationality}</span></div>` : ''}
          ${employee.gender ? `<div class="sidebar-row"><div class="sidebar-dot"></div><span>الجنس: ${employee.gender}</span></div>` : ''}
          ${employee.birth_date ? `<div class="sidebar-row"><div class="sidebar-dot"></div><span>الميلاد: ${employee.birth_date}</span></div>` : ''}
        </div>` : ''}

        ${employee.skills && employee.skills.length > 0 ? `
        <div class="sidebar-section">
          <div class="sidebar-section-title">المهارات</div>
          ${skills}
        </div>` : ''}
      </div>
      <div class="main">
        <div class="main-name">${employee.full_name || ''}</div>
        <div class="main-pos">${employee.position || ''} ${employee.department ? '| ' + employee.department : ''}</div>
        <div class="divider"></div>

        <div class="section">
          <div class="section-title">المعلومات الوظيفية</div>
          <div class="info-grid">
            ${employee.department ? `<div class="info-item"><div class="info-label">القسم</div><div class="info-value">${employee.department}</div></div>` : ''}
            ${employee.hire_date ? `<div class="info-item"><div class="info-label">تاريخ التعيين</div><div class="info-value">${employee.hire_date}</div></div>` : ''}
            ${employee.position ? `<div class="info-item"><div class="info-label">المنصب</div><div class="info-value">${employee.position}</div></div>` : ''}
            ${employee.id_number ? `<div class="info-item"><div class="info-label">رقم الهوية</div><div class="info-value">${employee.id_number}</div></div>` : ''}
          </div>
        </div>

        ${employee.notes ? `
        <div class="section">
          <div class="section-title">ملاحظات</div>
          <p style="font-size:13px;color:#4b5563;line-height:1.8;background:#f8fafc;border-radius:8px;padding:12px">${employee.notes}</p>
        </div>` : ''}

        <div class="footer">تم إنشاء هذه السيرة الذاتية من نظام إدارة العقارات • ${new Date().toLocaleDateString('ar-IQ')}</div>
      </div>
    </div>
    </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-blue-500/10 to-blue-500/5 border border-blue-200/60 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">{L('السيرة الذاتية', 'ژیانامە (CV)')}</h3>
            <p className="text-xs text-muted-foreground">{cvFiles.length} {L('ملف', 'فایل')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrintCV} variant="outline" className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
            <Printer className="w-4 h-4" />
            {L('طباعة CV', 'چاپکردنی CV')}
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2 shadow-md">
            <Plus className="w-4 h-4" />
            {uploading ? L('جاري الرفع...', 'بارکردن...') : L('رفع ملف', 'فایل بارکردن')}
          </Button>
        </div>
      </div>

      {/* Label input dialog */}
      {showLabelInput && (
        <div className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-sm text-blue-700">{L('اسم الملف', 'ناوی فایل')}</p>
          <Input value={labelInput} onChange={e => setLabelInput(e.target.value)} placeholder={L('مثال: سيرة ذاتية 2025', 'نموونە: ژیانامە 2025')} className="bg-white" />
          <div className="flex gap-2">
            <Button onClick={handleUpload} size="sm" className="gap-1.5">{L('رفع', 'بارکردن')}</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowLabelInput(false); setPendingFile(null); }}>{L('إلغاء', 'پاشگەزبوونەوە')}</Button>
          </div>
        </div>
      )}

      {/* Generated CV card */}
      <div
        onClick={handlePrintCV}
        className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-purple-400 transition-all group"
      >
        <div className="w-14 h-14 rounded-xl bg-white shadow flex items-center justify-center shrink-0 border border-purple-100">
          <User className="w-7 h-7 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-purple-700">{L('السيرة الذاتية التلقائية (PDF)', 'CV ئۆتۆماتیکی (PDF)')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{L('تُنشأ من بيانات الموظف — اضغط للطباعة', 'لە داتای کارمەندەوە دروستدەبێت — کلیک بکە بۆ چاپکردن')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-lg">{L('توليد', 'دروستکردن')}</span>
          <Printer className="w-5 h-5 text-purple-400 group-hover:text-purple-600 transition-colors" />
        </div>
      </div>

      {/* Uploaded files list */}
      {cvFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">{L('الملفات المرفوعة', 'فایلە بارکراوەکان')}</p>
          {cvFiles.map((cv, idx) => (
            <div key={idx} className="flex items-center gap-3 p-4 border border-border rounded-2xl bg-card hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{cv.label}</p>
                {cv.uploaded_at && <p className="text-xs text-muted-foreground">{cv.uploaded_at}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                  <a href={cv.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    {L('فتح', 'کردنەوە')}
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                  <a href={cv.url} download>
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRemove(idx)} className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              {/* Always visible on mobile */}
              <div className="flex items-center gap-2 shrink-0 sm:hidden">
                <Button asChild size="sm" className="gap-1.5 h-8">
                  <a href={cv.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cvFiles.length === 0 && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-primary/30 rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all text-center group"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <p className="font-bold text-foreground">{L('اضغط لرفع سيرة ذاتية', 'کلیک بکە بۆ بارکردنی ژیانامە')}</p>
            <p className="text-xs text-muted-foreground mt-1">{L('PDF أو Word', 'PDF یان Word')}</p>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
    </div>
  );
}