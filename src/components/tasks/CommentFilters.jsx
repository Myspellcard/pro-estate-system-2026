import React from 'react';
import { Search, X, Eye, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const REACTIONS = ['👍', '❤️', '👏', '🎉', '🔥', '😄'];

import { useLanguage } from '@/context/LanguageContext';

export default function CommentFilters({ filter, setFilter, stats }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={filter.search}
          onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
          placeholder={L('البحث في التعليقات...', 'گەڕان لە لێدوانەکان...')}
          className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-sm outline-none focus:border-indigo-300 focus:bg-white transition-all"
        />
        {filter.search && (
          <button
            onClick={() => setFilter(prev => ({ ...prev, search: '' }))}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500">{L('النوع:', 'جۆر:')}</span>
        <button
          onClick={() => setFilter(prev => ({ ...prev, type: 'all' }))}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            filter.type === 'all'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          )}
        >
          {L('الكل', 'هەموو')} ({stats.total})
        </button>
        <button
          onClick={() => setFilter(prev => ({ ...prev, type: 'public' }))}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            filter.type === 'public'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          )}
        >
          👁️ {L('عام', 'گشتی')} ({stats.public})
        </button>
        <button
          onClick={() => setFilter(prev => ({ ...prev, type: 'internal' }))}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            filter.type === 'internal'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          )}
        >
          🔒 {L('داخلي', 'ناوخۆیی')} ({stats.internal})
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-500">{L('التفاعلات:', 'کارلێکەکان:')}</span>
        <button
          onClick={() => setFilter(prev => ({ ...prev, reaction: null }))}
          className={cn(
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            !filter.reaction
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          )}
        >
          {L('الكل', 'هەموو')}
        </button>
        {REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => setFilter(prev => ({ ...prev, reaction: filter.reaction === emoji ? null : emoji }))}
            className={cn(
              'px-2.5 py-1.5 rounded-xl text-sm transition-all border hover:scale-110 active:scale-95',
              filter.reaction === emoji
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            )}
          >
            {emoji}
          </button>
        ))}
      </div>

      {(filter.search || filter.type !== 'all' || filter.reaction) && (
        <button
          onClick={() => setFilter({ type: 'all', search: '', reaction: null })}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {L('مسح التصفية', 'پاککردنەوەی پاڵاوتن')}
        </button>
      )}
    </div>
  );
}