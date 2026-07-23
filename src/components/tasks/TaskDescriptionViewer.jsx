import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function TaskDescriptionViewer({ description }) {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  
  if (!description) return null;
  
  // Check if content is long (more than ~400 characters or has multiple paragraphs)
  const textContent = description.replace(/<[^>]*>/g, '').trim();
  const isLong = textContent.length > 400 || (description.match(/<\/p>/g) || []).length > 3;
  
  const displayContent = isLong && !expanded 
    ? description.slice(0, 400) + '...' 
    : description;

  const seeMoreText = lang === 'ku' 
    ? (expanded ? '▲ کەمتر' : '▼ زیاتر') 
    : (expanded ? '▲ أقل' : '▼ المزيد');

  return (
    <div className="task-desc-container mb-3">
      <style>{`
        .task-desc-container {
          direction: rtl;
          unicode-bidi: plaintext;
          font-family: "Noto Sans Arabic", "Tajawal", sans-serif;
          font-size: 15px;
          line-height: 1.9;
          color: #1e293b;
          font-weight: 500;
          word-break: normal;
          overflow-wrap: break-word;
          font-variant-ligatures: common-ligatures contextual;
          font-feature-settings: "liga" 1, "calt" 1, "dlig" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .task-desc-container p, .task-desc-container div {
          direction: rtl;
          text-align: right;
          margin: 4px 0;
          min-height: 1.5em;
          unicode-bidi: plaintext;
        }
        .task-desc-container h1 { font-size: 32px; font-weight: 900; margin: 12px 0 6px; line-height: 1.3; }
        .task-desc-container h2 { font-size: 26px; font-weight: 800; margin: 10px 0 5px; line-height: 1.3; }
        .task-desc-container h3 { font-size: 22px; font-weight: 700; margin: 8px 0 4px; }
        .task-desc-container h4 { font-size: 18px; font-weight: 600; margin: 6px 0 3px; }
        .task-desc-container ul { list-style: disc inside; padding-right: 1.5em; padding-left: 0; margin: 6px 0; }
        .task-desc-container ol { list-style: decimal inside; padding-right: 1.5em; padding-left: 0; margin: 6px 0; }
        .task-desc-container li { margin: 3px 0; unicode-bidi: plaintext; }
        .task-desc-container blockquote {
          border-right: 4px solid #6366f1;
          border-left: none;
          padding: 10px 16px;
          margin: 10px 0;
          background: #f5f3ff;
          color: #4338ca;
          border-radius: 0 8px 8px 0;
        }
        .task-desc-container hr { border: none; border-top: 2px solid #e2e8f0; margin: 12px 0; }
        .task-desc-container b, .task-desc-container strong { font-weight: 800; }
        .task-desc-container span { unicode-bidi: plaintext; display: inline; }
        .task-desc-container font { unicode-bidi: plaintext; display: inline; }
        .task-desc-container [style] { unicode-bidi: plaintext; }
        .task-desc-container a { 
          color: #2563eb; 
          text-decoration: underline; 
          text-decoration-thickness: 1px;
          text-underline-offset: 2px;
          font-weight: 600;
          padding: 1px 2px;
          border-radius: 3px;
        }
        .task-desc-container a:hover { 
          color: #1d4ed8; 
          background: #dbeafe;
          text-decoration-thickness: 2px;
        }
        .task-desc-container table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .task-desc-container td, .task-desc-container th { border: 1px solid #e2e8f0; padding: 8px; }
        .task-desc-container img { max-width: 100%; height: auto; display: block; margin: 10px auto; border-radius: 8px; }
        .task-desc-container * { unicode-bidi: plaintext; }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: displayContent }} />
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
        >
          {seeMoreText}
        </button>
      )}
    </div>
  );
}