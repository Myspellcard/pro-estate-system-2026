import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const SOURCES = ['فيسبوك', 'واتساب', 'إنستغرام', 'موقع إلكتروني', 'اتصال هاتفي', 'زيارة مكتب', 'توصية'];

export default function LeadAdvancedFilters({ filters, setFilters, employees, projects, onClear, L }) {
  const set = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">{L('بحث متقدم', 'گەڕانی پێشکەوتوو')}</h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-xs">
          <X className="w-3.5 h-3.5" /> {L('مسح الفلاتر', 'سڕینەوەی فلتەرەکان')}
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{L('المصدر', 'سەرچاوە')}</Label>
          <Select value={filters.source || 'all'} onValueChange={v => set('source', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{L('الموظف المسؤول', 'کارمەندی بەرپرس')}</Label>
          <Select value={filters.employeeId || 'all'} onValueChange={v => set('employeeId', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{L('المشروع', 'پڕۆژە')}</Label>
          <Select value={filters.projectId || 'all'} onValueChange={v => set('projectId', v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{L('تاريخ المتابعة من', 'بەرواری شوێنکەوتن لە')}</Label>
          <Input type="date" value={filters.followupFrom || ''} onChange={e => set('followupFrom', e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{L('الميزانية من', 'بودجە لە')}</Label>
          <Input type="number" value={filters.minBudget || ''} onChange={e => set('minBudget', e.target.value)} className="h-9" placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{L('الميزانية إلى', 'بودجە بۆ')}</Label>
          <Input type="number" value={filters.maxBudget || ''} onChange={e => set('maxBudget', e.target.value)} className="h-9" placeholder="0" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{L('تاريخ الإنشاء من', 'بەرواری دروستکردن لە')}</Label>
          <Input type="date" value={filters.createdFrom || ''} onChange={e => set('createdFrom', e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{L('تاريخ الإنشاء إلى', 'بەرواری دروستکردن بۆ')}</Label>
          <Input type="date" value={filters.createdTo || ''} onChange={e => set('createdTo', e.target.value)} className="h-9" />
        </div>
      </div>
    </div>
  );
}