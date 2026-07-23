import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function CRMReasonsFilters({ filters, setFilters, employees, projects, L }) {
  const set = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs flex items-center gap-1"><Search className="w-3 h-3" />{L('بحث', 'گەڕان')}</Label>
          <Input value={filters.search || ''} onChange={e => set('search', e.target.value)} placeholder={L('اسم أو هاتف...', 'ناو یان تەلەفۆن...')} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{L('الموظف', 'کارمەند')}</Label>
          <Select value={filters.employeeId || '__all'} onValueChange={v => set('employeeId', v === '__all' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">{L('الكل', 'هەموو')}</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{L('المشروع', 'پڕۆژە')}</Label>
          <Select value={filters.projectId || '__all'} onValueChange={v => set('projectId', v === '__all' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">{L('الكل', 'هەموو')}</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{L('من تاريخ', 'لە بەرواری')}</Label>
          <Input type="date" dir="ltr" value={filters.dateFrom || ''} onChange={e => set('dateFrom', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{L('إلى تاريخ', 'بۆ بەرواری')}</Label>
          <Input type="date" dir="ltr" value={filters.dateTo || ''} onChange={e => set('dateTo', e.target.value)} />
        </div>
      </div>
    </div>
  );
}