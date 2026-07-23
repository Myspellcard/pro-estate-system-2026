import React from 'react';
import { FileText, Image, ExternalLink, Play } from 'lucide-react';

export default function AttachmentPreview({ att }) {
  if (!att) return null;

  const isImage = att.type?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url || '');
  const isVideo = att.type?.startsWith('video') || /\.(mp4|webm|mov)$/i.test(att.url || '');
  const isAudio = att.type?.startsWith('audio') || att.is_voice_note || /\.(mp3|wav|webm)$/i.test(att.url || '');

  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block group relative">
        <img
          src={att.url}
          alt={att.name}
          className="h-20 w-28 object-cover rounded-lg border-2 border-white shadow-sm group-hover:shadow-md transition-all group-hover:scale-105"
        />
        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    );
  }

  if (isVideo) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block group relative">
        <div className="h-20 w-28 bg-slate-900 rounded-lg border-2 border-white shadow-sm flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
          <Play className="w-8 h-8 text-white relative z-10" />
        </div>
        <div className="mt-1.5 text-[10px] text-slate-500 truncate max-w-28">{att.name}</div>
      </a>
    );
  }

  if (isAudio) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs hover:bg-indigo-100 transition-colors max-w-48">
        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <Play className="w-3 h-3 text-indigo-600" />
        </div>
        <span className="truncate font-medium text-indigo-700">{att.is_voice_note ? 'ملاحظة صوتية' : att.name}</span>
      </a>
    );
  }

  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2 border-2 border-slate-100 rounded-lg bg-slate-50 text-xs hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm max-w-48 group">
      <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
        <FileText className="w-3.5 h-3.5 text-blue-600" />
      </div>
      <span className="truncate font-medium text-slate-600 group-hover:text-blue-700">{att.name}</span>
    </a>
  );
}