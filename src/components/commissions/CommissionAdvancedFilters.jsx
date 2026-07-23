import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function CommissionAdvancedFilters({ filters, setFilters }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const update = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5"><Search className="w-4 h-4 text-amber-600" />{L('بحث متقدم', 'گەڕانپێشکەوتوو')}</h3>
        <button onClick={() => setFilters({ search: '', contract_type: 'all', status: 'all', party: '', date_from: '', date_to: '' })} className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />{L('مسح', 'سڕینەوە')}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('بحث بالاسم/العقار', 'گەڕان بەناو/گرێبەست')}</Label>
          <Input value={filters.search || ''} onChange={e => update('search', e.target.value)} placeholder={L('اسم الطرف أو رقم العقد...', 'ناوی لایەن یان ژمارەی گرێبەست...')} className="h-9 bg-slate-50/60" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('نوع العقد', 'جۆری گرێبەست')}</Label>
          <Select value={filters.contract_type || 'all'} onValueChange={v => update('contract_type', v)}>
            <SelectTrigger className="h-9 bg-slate-50/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              <SelectItem value="rent">{L('إيجار', 'کرێ')}</SelectItem>
              <SelectItem value="sale">{L('بيع', 'فرۆشتن')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('الحالة', 'دۆخ')}</Label>
          <Select value={filters.status || 'all'} onValueChange={v => update('status', v)}>
            <SelectTrigger className="h-9 bg-slate-50/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              <SelectItem value="pending">{L('معلقة', 'مەوقوف')}</SelectItem>
              <SelectItem value="partial">{L('جزئية', 'بەشەکی')}</SelectItem>
              <SelectItem value="completed">{L('مكتملة', 'تەواو')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('الطرف', 'لایەن')}</Label>
          <Select value={filters.party || 'all'} onValueChange={v => update('party', v)}>
            <SelectTrigger className="h-9 bg-slate-50/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              <SelectItem value="seller">{L('السند للمالك/البائع', 'بۆ خاوەن/فرۆشیار')}</SelectItem>
              <SelectItem value="buyer">{L('السند للمستأجر/المشتري', 'بۆ کرێچی/کڕیار')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('من تاريخ', 'لە بەروار')}</Label>
          <Input type="date" value={filters.date_from || ''} onChange={e => update('date_from', e.target.value)} className="h-9 bg-slate-50/60" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('إلى تاريخ', 'بۆ بەروار')}</Label>
          <Input type="date" value={filters.date_to || ''} onChange={e => update('date_to', e.target.value)} className="h-9 bg-slate-50/60" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('حالة دفع المالك', 'دۆخی پارەدانی خاوەن')}</Label>
          <Select value={filters.seller_paid || 'all'} onValueChange={v => update('seller_paid', v)}>
            <SelectTrigger className="h-9 bg-slate-50/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              <SelectItem value="paid">{L('مدفوعة', 'دراوە')}</SelectItem>
              <SelectItem value="unpaid">{L('غير مدفوعة', 'نەدراوە')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{L('حالة دفع المشتري', 'دۆخی پارەدانی کڕیار')}</Label>
          <Select value={filters.buyer_paid || 'all'} onValueChange={v => update('buyer_paid', v)}>
            <SelectTrigger className="h-9 bg-slate-50/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{L('الكل', 'هەموو')}</SelectItem>
              <SelectItem value="paid">{L('مدفوعة', 'دراوە')}</SelectItem>
              <SelectItem value="unpaid">{L('غير مدفوعة', 'نەدراوە')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}