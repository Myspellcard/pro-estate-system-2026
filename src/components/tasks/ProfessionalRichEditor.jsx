import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignRight, AlignCenter, AlignLeft, AlignJustify,
  List, ListOrdered, IndentIncrease, IndentDecrease,
  Type, Heading1, Heading2, Heading3,
  Quote, Minus, Link as LinkIcon,
  Undo, Redo, Eraser,
  Image as ImageIcon, Table,
  ChevronDown, Check,
  Maximize2, Minimize2,
  FileDown, Languages
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { firebaseApi } from '@/api/firebaseClient';

const FONTS = [
  { label: 'Tajawal', value: '"Tajawal", "Noto Sans Arabic", sans-serif' },
  { label: 'Noto Sans Arabic', value: '"Noto Sans Arabic", sans-serif' },
  { label: 'Cairo', value: 'Cairo, sans-serif' },
  { label: 'Amiri', value: 'Amiri, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
];

const FONT_SIZES = [
  { label: '8px', value: '8px' },
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
  { label: '36px', value: '36px' },
  { label: '48px', value: '48px' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999',
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#f43f5e', '#dc2626', '#16a34a',
];

const HIGHLIGHT_COLORS = [
  '#ffffff', '#fef9c3', '#fef3c7', '#fee7ce',
  '#fed7aa', '#fecaca', '#dbeafe', '#cffafe',
  '#dcfce7', '#f0f9ff', '#fafafa', '#f3f4f6',
];

const HEADING_OPTIONS = [
  { label: 'نص عادي', value: 'p', size: '15px', weight: '400' },
  { label: 'عنوان 1', value: 'h1', size: '32px', weight: '900' },
  { label: 'عنوان 2', value: 'h2', size: '26px', weight: '800' },
  { label: 'عنوان 3', value: 'h3', size: '22px', weight: '700' },
  { label: 'عنوان 4', value: 'h4', size: '18px', weight: '600' },
];

function ToolbarButton({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick && onClick(); }}
      title={title}
      disabled={disabled}
      className={cn(
        'p-2 rounded-lg transition-all shrink-0 flex items-center justify-center hover:bg-slate-100',
        active ? 'bg-indigo-100 text-indigo-700 shadow-inner' : 'text-slate-600',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />;
}

export default function ProfessionalRichEditor({ value, onChange, placeholder, readOnly = false }) {
  const editorRef = useRef(null);
  const isInit = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkData, setLinkData] = useState({ url: '', text: '' });
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  const [direction, setDirection] = useState('rtl');
  const [activeHeading, setActiveHeading] = useState(HEADING_OPTIONS[0]);
  const [activeFont, setActiveFont] = useState(FONTS[0]);
  const [activeSize, setActiveSize] = useState(FONT_SIZES[3]);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isInit.current) {
      editorRef.current.innerHTML = value || '';
      isInit.current = true;
      updateWordCount();
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && isInit.current && !editorRef.current.matches(':focus')) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
        updateWordCount();
      }
    }
  }, [value]);

  const updateWordCount = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setWordCount({
        words: text.trim() ? text.trim().split(/\s+/).length : 0,
        chars: text.length
      });
    }
  }, []);

  const emit = () => {
    onChange(editorRef.current?.innerHTML || '');
    updateWordCount();
  };

  const exec = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emit();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    
    if (!plain) return;
    
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
    
    const lines = plain.split('\n');
    const html = lines.map(line => {
      let escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      escaped = escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      
      return `<p style="margin:4px 0;min-height:1.5em">${escaped || '<br>'}</p>`;
    }).join('');
    
    exec('insertHTML', html);
  };

  const insertLink = () => {
    if (linkData.url) {
      const linkHtml = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer">${linkData.text || linkData.url}</a>`;
      exec('insertHTML', linkHtml);
      setShowLinkDialog(false);
      setLinkData({ url: '', text: '' });
    }
  };

  const insertTable = (rows = 3, cols = 3) => {
    let html = '<table style="width:100%;border-collapse:collapse;margin:10px 0;"><tbody>';
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += '<td style="border:1px solid #e2e8f0;padding:8px;">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    exec('insertHTML', html);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const { file_url } = await firebaseApi.integrations.Core.UploadFile({ file });
    const imgHtml = `<img src="${file_url}" style="max-width:100%;height:auto;display:block;margin:10px auto;" />`;
    exec('insertHTML', imgHtml);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => editorRef.current?.focus(), 100);
  };

  const exportHTML = () => {
    const blob = new Blob([editorRef.current?.innerHTML || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowLinkDialog(true);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      emit();
    }
  };

  const applyFont = (fontFamily) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!sel.isCollapsed) {
        const span = document.createElement('span');
        span.style.fontFamily = fontFamily;
        try { range.surroundContents(span); } catch {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        }
      }
    }
    setActiveFont(FONTS.find(f => f.value === fontFamily) || FONTS[0]);
    emit();
  };

  const applySize = (size) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!sel.isCollapsed) {
        const span = document.createElement('span');
        span.style.fontSize = size;
        try { range.surroundContents(span); } catch {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        }
      }
    }
    setActiveSize(FONT_SIZES.find(s => s.value === size) || FONT_SIZES[3]);
    emit();
  };

  if (readOnly) {
    return (
      <div
        className="prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    );
  }

  return (
    <div className={cn('border-2 border-slate-200 rounded-xl bg-white transition-all', isFullscreen && 'fixed inset-4 z-[100] border-indigo-300 shadow-2xl')}>
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => exec('undo')} title="تراجع"><Undo className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('redo')} title="إعادة"><Redo className="w-4 h-4" /></ToolbarButton>
        <ToolbarSeparator />

        {/* Heading */}
        <div className="relative">
          <button
            onClick={() => { setShowHeadingMenu(!showHeadingMenu); setShowFontMenu(false); setShowSizeMenu(false); }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 shrink-0"
          >
            {activeHeading.value === 'p' ? <Type className="w-4 h-4" /> : <Heading1 className="w-4 h-4" />}
            {activeHeading.label}
            <ChevronDown className={cn('w-3 h-3 transition-transform', showHeadingMenu && 'rotate-180')} />
          </button>
          {showHeadingMenu && (
            <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 z-[200] overflow-hidden min-w-[180px]">
              {HEADING_OPTIONS.map(h => (
                <button
                  key={h.value}
                  onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', h.value); setActiveHeading(h); setShowHeadingMenu(false); }}
                  className="w-full text-right px-4 py-2.5 hover:bg-indigo-50 text-slate-800 border-b border-slate-100 last:border-0"
                  style={{ fontSize: h.size, fontWeight: h.weight }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Family */}
        <div className="relative">
          <button
            onClick={() => { setShowFontMenu(!showFontMenu); setShowHeadingMenu(false); setShowSizeMenu(false); }}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <Type className="w-4 h-4" />
            {activeFont.label}
            <ChevronDown className={cn('w-3 h-3 transition-transform', showFontMenu && 'rotate-180')} />
          </button>
          {showFontMenu && (
            <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 z-[200] overflow-hidden min-w-[180px]">
              {FONTS.map(f => (
                <button
                  key={f.value}
                  onMouseDown={(e) => { e.preventDefault(); applyFont(f.value); setShowFontMenu(false); }}
                  className="w-full text-right px-4 py-2.5 hover:bg-indigo-50 text-slate-700 border-b border-slate-100 last:border-0 text-sm"
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Size */}
        <div className="relative">
          <button
            onClick={() => { setShowSizeMenu(!showSizeMenu); setShowFontMenu(false); setShowHeadingMenu(false); }}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 shrink-0"
          >
            {activeSize.label}
            <ChevronDown className={cn('w-3 h-3 transition-transform', showSizeMenu && 'rotate-180')} />
          </button>
          {showSizeMenu && (
            <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 z-[200] overflow-hidden min-w-[100px]">
              {FONT_SIZES.map(s => (
                <button
                  key={s.value}
                  onMouseDown={(e) => { e.preventDefault(); applySize(s.value); setShowSizeMenu(false); }}
                  className="w-full text-right px-4 py-2 hover:bg-indigo-50 text-slate-700 border-b border-slate-100 last:border-0 text-sm"
                  style={{ fontSize: s.value }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarSeparator />

        {/* Basic Formatting */}
        <ToolbarButton onClick={() => exec('bold')} title="عريض (Ctrl+B)"><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="مائل (Ctrl+I)"><Italic className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="تسطير (Ctrl+U)"><Underline className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('strikeThrough')} title="شطب"><Strikethrough className="w-4 h-4" /></ToolbarButton>
        <ToolbarSeparator />

        {/* Text Color */}
        <div className="relative">
          <ToolbarButton onClick={() => { setShowColorMenu(!showColorMenu); setShowHighlightMenu(false); }} title="لون النص">
            <div className="flex flex-col items-center">
              <span className="text-xs font-black text-slate-800">A</span>
              <div className="h-1 w-4 rounded mt-0.5" style={{ background: 'linear-gradient(to right,#ef4444,#3b82f6,#22c55e)' }} />
            </div>
          </ToolbarButton>
          {showColorMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-[300] p-3 min-w-[220px]">
              <p className="text-xs text-slate-500 mb-2 font-semibold">لون النص</p>
              <div className="grid grid-cols-8 gap-2">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c}
                    onMouseDown={(e) => { e.preventDefault(); exec('foreColor', c); setShowColorMenu(false); }}
                    className="w-6 h-6 rounded-full border-2 border-slate-200 hover:scale-125 transition-transform shadow-md"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highlight */}
        <div className="relative">
          <ToolbarButton onClick={() => { setShowHighlightMenu(!showHighlightMenu); setShowColorMenu(false); }} title="لون الخلفية">
            <div className="w-4 h-4 rounded" style={{ background: 'linear-gradient(135deg, #fef9c3, #fde68a)' }} />
          </ToolbarButton>
          {showHighlightMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 z-[300] p-3 min-w-[200px]">
              <p className="text-xs text-slate-500 mb-2 font-semibold">لون الخلفية</p>
              <div className="grid grid-cols-6 gap-2">
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c}
                    onMouseDown={(e) => { e.preventDefault(); exec('hiliteColor', c); setShowHighlightMenu(false); }}
                    className="w-7 h-7 rounded-lg border-2 border-slate-200 hover:scale-110 transition-transform shadow-md"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <button onMouseDown={(e) => { e.preventDefault(); exec('hiliteColor', 'transparent'); setShowHighlightMenu(false); }} className="mt-2 w-full text-xs text-red-500 hover:bg-red-50 py-1.5 rounded-lg font-semibold">✕ إزالة التظليل</button>
            </div>
          )}
        </div>

        <ToolbarSeparator />

        {/* Alignment */}
        <ToolbarButton onClick={() => exec('justifyRight')} title="يمين"><AlignRight className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyCenter')} title="وسط"><AlignCenter className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyLeft')} title="يسار"><AlignLeft className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyFull')} title="ضبط"><AlignJustify className="w-4 h-4" /></ToolbarButton>
        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="قائمة نقطية"><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="قائمة مرقمة"><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarSeparator />

        {/* Indent */}
        <ToolbarButton onClick={() => exec('indent')} title="زيادة المسافة"><IndentIncrease className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('outdent')} title="إنقاص المسافة"><IndentDecrease className="w-4 h-4" /></ToolbarButton>
        <ToolbarSeparator />

        {/* Insert */}
        <ToolbarButton onClick={() => setShowLinkDialog(true)} title="رابط"><LinkIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => insertTable()} title="جدول"><Table className="w-4 h-4" /></ToolbarButton>
        <label className="p-2 rounded-lg hover:bg-slate-100 shrink-0 cursor-pointer text-slate-600" title="صورة">
          <ImageIcon className="w-4 h-4" />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
        <ToolbarButton onClick={() => exec('insertHorizontalRule')} title="خط فاصل"><Minus className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'blockquote')} title="اقتباس"><Quote className="w-4 h-4" /></ToolbarButton>
        <ToolbarSeparator />

        {/* Direction */}
        <ToolbarButton onClick={() => setDirection(direction === 'rtl' ? 'ltr' : 'rtl')} title="اتجاه النص">
          <Languages className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarSeparator />

        {/* Actions */}
        <ToolbarButton onClick={toggleFullscreen} title="ملء الشاشة">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </ToolbarButton>
        <ToolbarButton onClick={exportHTML} title="تصدير HTML"><FileDown className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => exec('removeFormat')} title="مسح التنسيق"><Eraser className="w-4 h-4" /></ToolbarButton>
      </div>

      {/* EDITOR */}
      <style>{`
        .pro-rte {
          min-height: 200px;
          max-height: 600px;
          overflow-y: auto;
          direction: ${direction};
          unicode-bidi: plaintext;
          font-family: "Noto Sans Arabic", "Tajawal", sans-serif;
          font-size: 15px;
          line-height: 1.8;
          color: #1e293b;
          word-break: normal;
          overflow-wrap: break-word;
          font-variant-ligatures: common-ligatures contextual;
          font-feature-settings: "liga" 1, "calt" 1, "dlig" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .pro-rte:focus { outline: none; }
        .pro-rte[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
        .pro-rte p, .pro-rte div { ${direction === 'rtl' ? 'text-align: right;' : 'text-align: left;'} margin: 4px 0; unicode-bidi: plaintext; }
        .pro-rte h1 { font-size: 32px; font-weight: 900; margin: 12px 0 6px; line-height: 1.3; }
        .pro-rte h2 { font-size: 26px; font-weight: 800; margin: 10px 0 5px; line-height: 1.3; }
        .pro-rte h3 { font-size: 22px; font-weight: 700; margin: 8px 0 4px; }
        .pro-rte h4 { font-size: 18px; font-weight: 600; margin: 6px 0 3px; }
        .pro-rte ul { list-style: disc inside; ${direction === 'rtl' ? 'padding-right: 1.5em;' : 'padding-left: 1.5em;'} margin: 6px 0; }
        .pro-rte ol { list-style: decimal inside; ${direction === 'rtl' ? 'padding-right: 1.5em;' : 'padding-left: 1.5em;'} margin: 6px 0; }
        .pro-rte li { margin: 3px 0; unicode-bidi: plaintext; }
        .pro-rte blockquote { border-${direction === 'rtl' ? 'right' : 'left'}: 4px solid #6366f1; padding: 10px 16px; margin: 10px 0; background: #f5f3ff; color: #4338ca; border-radius: ${direction === 'rtl' ? '0 8px 8px 0' : '8px 0 0 8px'}; }
        .pro-rte hr { border: none; border-top: 2px solid #e2e8f0; margin: 12px 0; }
        .pro-rte b, .pro-rte strong { font-weight: 800; }
        .pro-rte a { color: #2563eb; text-decoration: underline; }
        .pro-rte a:hover { color: #1d4ed8; }
        .pro-rte table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .pro-rte td, .pro-rte th { border: 1px solid #e2e8f0; padding: 8px; }
        .pro-rte img { max-width: 100%; height: auto; display: block; margin: 10px auto; border-radius: 8px; }
        .pro-rte span { unicode-bidi: plaintext; }
      `}</style>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="pro-rte p-4"
        data-placeholder={placeholder || 'ابدأ الكتابة أو الصق المحتوى...'}
        dir={direction}
        onInput={emit}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        style={{
          fontVariantLigatures: 'common-ligatures contextual',
          fontFeatureSettings: '"liga" 1, "calt" 1, "dlig" 1',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}
      />

      {/* STATUS BAR */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50 rounded-b-xl text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">📄 {wordCount.words} كلمة</span>
          <span className="flex items-center gap-1">🔤 {wordCount.chars} حرف</span>
        </div>
        <div className="flex items-center gap-1">
          <span>⌨️ Ctrl+K: رابط | Ctrl+Enter: حفظ</span>
        </div>
      </div>

      {/* LINK DIALOG */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إدراج رابط</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>الرابط</Label>
              <Input
                value={linkData.url}
                onChange={(e) => setLinkData(p => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label>نص الرابط (اختياري)</Label>
              <Input
                value={linkData.text}
                onChange={(e) => setLinkData(p => ({ ...p, text: e.target.value }))}
                placeholder="النص المعروض"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>إلغاء</Button>
            <Button onClick={insertLink}>إدراج</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}