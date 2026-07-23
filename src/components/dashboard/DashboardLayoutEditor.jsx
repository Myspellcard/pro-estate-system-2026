import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, AlignLeft, AlignRight, AlignCenter } from 'lucide-react';

export const WIDGET_DEFS = [
  { id: 'stats',              label: 'الإحصاءات الرئيسية',     labelKu: 'ئامارە سەرەکییەکان',      emoji: '📊' },
  { id: 'property_status',   label: 'حالة العقارات',           labelKu: 'دۆخی خانووبەرەکان',      emoji: '🏢' },
  { id: 'recent_invoices',   label: 'الفواتير الأخيرة',        labelKu: 'دوایین وەسڵەکان',         emoji: '🧾' },
  { id: 'recent_contracts',  label: 'آخر العقود',              labelKu: 'دوایین گرێبەستەکان',      emoji: '📋' },
  { id: 'maintenance',       label: 'طلبات الصيانة',           labelKu: 'داواکاری پاراستن',        emoji: '🔧' },
  { id: 'upcoming_payments', label: 'الدفعات القادمة',         labelKu: 'پارەدانەکانی نزیک',       emoji: '💳' },
  { id: 'expiring_contracts',label: 'عقود ستنتهي قريباً',      labelKu: 'گرێبەستەکانی نزیک',      emoji: '⏰' },
  { id: 'overdue',           label: 'القائمة السوداء',         labelKu: 'لیستی ڕەش',               emoji: '🚫' },
];

export const DEFAULT_LAYOUT = [
  { id: 'stats',              col: 'full',  order: 0 },
  { id: 'property_status',   col: 'left',  order: 1 },
  { id: 'recent_invoices',   col: 'right', order: 2 },
  { id: 'recent_contracts',  col: 'left',  order: 3 },
  { id: 'maintenance',       col: 'right', order: 4 },
  { id: 'upcoming_payments', col: 'full',  order: 5 },
  { id: 'overdue',           col: 'left',  order: 6 },
  { id: 'expiring_contracts',col: 'right', order: 7 },
];

const COL_OPTIONS = [
  { value: 'left',  icon: AlignRight,  label: 'يسار/أول' },  // RTL: right = "left side"
  { value: 'right', icon: AlignLeft,   label: 'يمين/ثاني' },
  { value: 'full',  icon: AlignCenter, label: 'كامل العرض' },
];

export default function DashboardLayoutEditor({ layout, onChange, lang }) {
  const L = (a, ku) => lang === 'ku' ? ku : a;

  const sorted = [...layout].sort((a, b) => a.order - b.order);

  const handleDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const next = [...sorted];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    onChange(next.map((item, i) => ({ ...item, order: i })));
  };

  const setCol = (id, col) => {
    onChange(layout.map(item => item.id === id ? { ...item, col } : item));
  };

  const def = (id) => WIDGET_DEFS.find(d => d.id === id) || { label: id, emoji: '📦' };

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">{L('اسحب للترتيب، واختر موضع العمود', 'بکێشە بۆ ڕیزکردن، و شوێنی ستوونەکە هەڵبژێرە')}</p>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="layout">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 gap-3">
              {sorted.map((item, index) => {
                const d = def(item.id);
                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(p) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        className="bg-white border border-gray-200 rounded-xl flex items-center gap-3 px-4 py-3 select-none shadow-sm h-full"
                      >
                        <div {...p.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <span className="text-xl flex-shrink-0">{d.emoji}</span>
                        <span className="flex-1 text-sm font-semibold text-gray-700 truncate">{lang === 'ku' ? d.labelKu : d.label}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          {COL_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const active = item.col === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setCol(item.id, opt.value)}
                                title={opt.label}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                              >
                                <Icon className="w-4 h-4" />
                              </button>
                            );
                          })}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.col === 'full' ? 'bg-purple-100 text-purple-600' : item.col === 'left' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {item.col === 'full' ? L('كامل', 'تەواو') : item.col === 'left' ? L('يسار', 'چەپ') : L('يمين', 'ڕاست')}
                        </span>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}