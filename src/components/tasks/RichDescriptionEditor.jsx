import React, { useRef, useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignRight, AlignCenter, AlignLeft,
  List, ListOrdered, Quote, Minus,
  Undo, Redo, Type, Highlighter, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FONT_SIZES = [
  { label: 'صغير جداً', px: '11px' },
  { label: 'صغير', px: '13px' },
  { label: 'عادي', px: '15px' },
  { label: 'متوسط', px: '18px' },
  { label: 'كبير', px: '22px' },
  { label: 'كبير جداً', px: '28px' },
  { label: 'ضخم', px: '36px' },
];

const FONTS = [
  { label: 'Tajawal (افتراضي)', value: 'Tajawal, "Noto Sans Arabic", sans-serif' },
  { label: 'Noto Sans Arabic', value: '"Noto Sans Arabic", sans-serif' },
  { label: 'Cairo', value: 'Cairo, sans-serif' },
  { label: 'Amiri', value: 'Amiri, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
];

const TEXT_COLORS = [
  '#1f2937','#64748b','#ef4444','#f97316','#f59e0b',
  '#22c55e','#14b8a6','#3b82f6','#6366f1','#8b5cf6',
  '#ec4899','#dc2626','#16a34a','#0891b2','#7c3aed','#ffffff',
];

const HIGHLIGHT_COLORS = [
  '#fef9c3','#fed7aa','#fce7f3','#dbeafe',
  '#dcfce7','#ede9fe','#fee2e2','#cffafe',
];

function Btn({ onClick, title, active, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors shrink-0',
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />;
}

function Drop({ label, open, onToggle, children }) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); onToggle(); }}
        className="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
      >
        {label}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 z-[200] overflow-hidden min-w-max">
          {children}
        </div>
      )}
    </div>
  );
}

export default function RichDescriptionEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const isInit = useRef(false);
  const [drop, setDrop] = useState(null);

  useEffect(() => {
    if (editorRef.current && !isInit.current) {
      editorRef.current.innerHTML = value || '';
      isInit.current = true;
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && isInit.current && !editorRef.current.matches(':focus')) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const toggleDrop = (key) => setDrop(p => p === key ? null : key);
  const closeDrop = () => setDrop(null);

  const emit = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const cmd = (command, val = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    emit();
    closeDrop();
  };

  const insertHtml = (html) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emit();
    closeDrop();
  };

  const applyFontSize = (px) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!sel.isCollapsed) {
        const span = document.createElement('span');
        span.style.fontSize = px;
        try {
          range.surroundContents(span);
        } catch {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        }
      } else {
        // Insert a span at cursor for next typed text
        const span = document.createElement('span');
        span.style.fontSize = px;
        span.innerHTML = '\u200b';
        range.insertNode(span);
        // Move cursor inside span
        const r = document.createRange();
        r.setStart(span, span.childNodes.length);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
    emit();
    closeDrop();
  };

  const applyFont = (fontFamily) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!sel.isCollapsed) {
        const span = document.createElement('span');
        span.style.fontFamily = fontFamily;
        try {
          range.surroundContents(span);
        } catch {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        }
      } else {
        editorRef.current.style.fontFamily = fontFamily;
      }
    }
    emit();
    closeDrop();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');

    if (html) {
      // Parse and sanitize pasted HTML — strip ALL styles, fonts, classes
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      
      // Remove dangerous/unsafe elements completely
      tmp.querySelectorAll('script,style,meta,link,head,img,video,audio,iframe,object,embed,table,thead,tbody,tr,td,th,form,input,button').forEach(el => {
        el.remove();
      });
      
      // Safe tags that keep structure
      const SAFE = new Set(['b','strong','i','em','u','s','strike','br','p','div','span','h1','h2','h3','h4','ul','ol','li','blockquote','hr']);
      
      const clean = (node) => {
        if (node.nodeType === 3) return; // text node
        if (node.nodeType === 1) {
          const tag = node.tagName.toLowerCase();
          
          // Remove unsafe tags, keep their text
          if (!SAFE.has(tag)) {
            const frag = document.createDocumentFragment();
            while (node.firstChild) frag.appendChild(node.firstChild);
            node.replaceWith(frag);
            return;
          }
          
          // Strip class and unsafe attributes, but KEEP style (for colors) and href (for links)
          const attrsToRemove = [];
          for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            if (attr.name === 'class' || attr.name === 'onclick' || attr.name === 'onerror' || attr.name === 'onload') {
              attrsToRemove.push(attr.name);
            }
          }
          attrsToRemove.forEach(name => node.removeAttribute(name));
          
          // Recursively clean children
          [...node.childNodes].forEach(clean);
        }
      };
      
      [...tmp.childNodes].forEach(clean);
      document.execCommand('insertHTML', false, tmp.innerHTML);
    } else {
      // Plain text: preserve line breaks as RTL divs
      const lines = plain.split('\n');
      const htmlLines = lines.map(line =>
        `<div>${line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || '<br>'}</div>`
      ).join('');
      document.execCommand('insertHTML', false, htmlLines);
    }
    emit();
  };

  return (
    <div
      className="border-2 border-slate-200 focus-within:border-indigo-400 rounded-xl bg-white transition-colors"
      onMouseDown={() => closeDrop()}
    >
      {/* TOOLBAR */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50 rounded-t-xl"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Heading */}
        <Drop label={<><Type className="w-3.5 h-3.5" /><span>عنوان</span></>} open={drop === 'heading'} onToggle={() => toggleDrop('heading')}>
          {[
            { label: 'نص عادي', tag: 'p', size: 15, weight: 400 },
            { label: 'عنوان 1', tag: 'h1', size: 26, weight: 900 },
            { label: 'عنوان 2', tag: 'h2', size: 20, weight: 800 },
            { label: 'عنوان 3', tag: 'h3', size: 17, weight: 700 },
          ].map(h => (
            <button key={h.tag} type="button"
              onMouseDown={e => { e.preventDefault(); cmd('formatBlock', h.tag); }}
              className="block w-full text-right px-4 py-2 hover:bg-indigo-50 text-slate-800"
              style={{ fontSize: h.size, fontWeight: h.weight }}
            >{h.label}</button>
          ))}
        </Drop>

        {/* Font */}
        <Drop label="خط" open={drop === 'font'} onToggle={() => toggleDrop('font')}>
          {FONTS.map(f => (
            <button key={f.value} type="button"
              onMouseDown={e => { e.preventDefault(); applyFont(f.value); }}
              className="block w-full text-right px-4 py-2 hover:bg-indigo-50 text-slate-700 text-sm"
              style={{ fontFamily: f.value }}
            >{f.label}</button>
          ))}
        </Drop>

        {/* Size */}
        <Drop label="حجم" open={drop === 'size'} onToggle={() => toggleDrop('size')}>
          {FONT_SIZES.map(s => (
            <button key={s.px} type="button"
              onMouseDown={e => { e.preventDefault(); applyFontSize(s.px); }}
              className="block w-full text-right px-4 py-2 hover:bg-indigo-50 text-slate-700"
              style={{ fontSize: s.px }}
            >{s.label}</button>
          ))}
        </Drop>

        <Sep />

        <Btn onClick={() => cmd('bold')} title="عريض"><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('italic')} title="مائل"><Italic className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('underline')} title="تسطير"><Underline className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('strikeThrough')} title="شطب"><Strikethrough className="w-4 h-4" /></Btn>

        <Sep />

        <Btn onClick={() => cmd('justifyRight')} title="يمين"><AlignRight className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('justifyCenter')} title="وسط"><AlignCenter className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('justifyLeft')} title="يسار"><AlignLeft className="w-4 h-4" /></Btn>

        <Sep />

        <Btn onClick={() => cmd('insertUnorderedList')} title="قائمة نقطية"><List className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('insertOrderedList')} title="قائمة مرقمة"><ListOrdered className="w-4 h-4" /></Btn>
        <Btn onClick={() => insertHtml('<blockquote style="border-right:4px solid #6366f1;padding:8px 14px;margin:8px 0;background:#f5f3ff;color:#4338ca;border-radius:0 8px 8px 0;">اكتب هنا</blockquote><p><br></p>')} title="اقتباس">
          <Quote className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => insertHtml('<hr style="border:none;border-top:2px solid #e2e8f0;margin:10px 0;"><p><br></p>')} title="خط فاصل">
          <Minus className="w-4 h-4" />
        </Btn>

        <Sep />

        {/* Text color */}
        <Drop
          label={<div><span className="text-sm font-black text-slate-800">A</span><div className="h-1 w-4 rounded" style={{ background: 'linear-gradient(to right,#ef4444,#3b82f6,#22c55e)' }} /></div>}
          open={drop === 'color'} onToggle={() => toggleDrop('color')}
        >
          <div className="p-3">
            <p className="text-xs text-slate-400 mb-2">لون النص</p>
            <div className="grid grid-cols-8 gap-1.5">
              {TEXT_COLORS.map(c => (
                <button key={c} type="button"
                  onMouseDown={e => { e.preventDefault(); cmd('foreColor', c); }}
                  className="w-6 h-6 rounded-full border border-slate-200 hover:scale-125 transition-transform shadow-sm"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </Drop>

        {/* Highlight */}
        <Drop label={<Highlighter className="w-4 h-4 text-yellow-500" />} open={drop === 'highlight'} onToggle={() => toggleDrop('highlight')}>
          <div className="p-3">
            <p className="text-xs text-slate-400 mb-2">تظليل</p>
            <div className="grid grid-cols-4 gap-1.5">
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c} type="button"
                  onMouseDown={e => { e.preventDefault(); cmd('hiliteColor', c); }}
                  className="w-8 h-8 rounded border border-slate-200 hover:scale-110 transition-transform"
                  style={{ background: c }}
                />
              ))}
            </div>
            <button type="button"
              onMouseDown={e => { e.preventDefault(); cmd('hiliteColor', 'transparent'); }}
              className="mt-2 w-full text-xs text-slate-500 hover:text-red-500 py-1 rounded hover:bg-red-50 transition-colors"
            >✕ إزالة التظليل</button>
          </div>
        </Drop>

        <Sep />

        <Btn onClick={() => cmd('undo')} title="تراجع"><Undo className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('redo')} title="إعادة"><Redo className="w-4 h-4" /></Btn>
        <Btn onClick={() => cmd('removeFormat')} title="مسح التنسيق">
          <span className="text-xs font-bold">Tx</span>
        </Btn>
      </div>

      {/* EDITOR STYLES */}
      <style>{`
        .rtl-editor {
          min-height: 160px;
          direction: rtl;
          text-align: right;
          unicode-bidi: plaintext;
          font-family: "Noto Sans Arabic", "Tajawal", sans-serif;
          font-size: 15px;
          line-height: 1.9;
          color: #1e293b;
          word-break: normal;
          overflow-wrap: break-word;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .rtl-editor:focus { outline: none; }
        .rtl-editor[data-empty="true"]:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
        .rtl-editor p, .rtl-editor div {
          direction: rtl;
          text-align: right;
          margin: 2px 0;
          min-height: 1.5em;
          unicode-bidi: plaintext;
        }
        .rtl-editor h1 { font-size: 26px; font-weight: 900; margin: 10px 0 4px; line-height: 1.3; direction: rtl; text-align: right; }
        .rtl-editor h2 { font-size: 20px; font-weight: 800; margin: 8px 0 4px; line-height: 1.3; direction: rtl; text-align: right; }
        .rtl-editor h3 { font-size: 17px; font-weight: 700; margin: 6px 0 3px; direction: rtl; text-align: right; }
        .rtl-editor ul { list-style: disc inside; padding-right: 1em; padding-left: 0; margin: 4px 0; direction: rtl; text-align: right; }
        .rtl-editor ol { list-style: decimal inside; padding-right: 1em; padding-left: 0; margin: 4px 0; direction: rtl; text-align: right; }
        .rtl-editor li { direction: rtl; text-align: right; margin: 2px 0; }
        .rtl-editor blockquote { border-right: 4px solid #6366f1; border-left: none; padding: 8px 14px; margin: 8px 0; background: #f5f3ff; color: #4338ca; border-radius: 0 8px 8px 0; direction: rtl; text-align: right; }
        .rtl-editor hr { border: none; border-top: 2px solid #e2e8f0; margin: 10px 0; }
        .rtl-editor b, .rtl-editor strong { font-weight: 800; }
        .rtl-editor span { unicode-bidi: plaintext; }
      `}</style>

      {/* EDITABLE AREA */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="rtl-editor p-4"
        data-placeholder={placeholder || 'اكتب وصف المهمة هنا...'}
        dir="rtl"
        lang="ar"
        inputMode="text"
        spellCheck={false}
        onInput={emit}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('insertHTML', false, '<div><br></div>');
          }
        }}
      />
    </div>
  );
}