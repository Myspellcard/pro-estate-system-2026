import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingDown, Plus, AlertCircle, ChevronDown } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

export default function LossReasonDialog({ open, onClose, onConfirm, reasons = [], L, isLoading }) {
  const [selected, setSelected] = useState('');
  const [newReason, setNewReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setSelected('');
      setNewReason('');
      setNote('');
    }
  }, [open]);

  const handleConfirm = () => {
    const finalReason = selected === '__new' ? newReason.trim() : selected;
    if (!finalReason) return;
    onConfirm(finalReason, selected === '__new', note.trim());
  };

  const canConfirm = selected && (selected !== '__new' || newReason.trim()) && !isLoading;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-md text-right p-0 gap-0">
        {/* Header band */}
        <div className="bg-gradient-to-l from-red-600 to-rose-500 px-5 py-4 text-white rounded-t-lg sm:rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/25">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-white">
                {L('تسجيل خسارة العميل', 'تۆمارکردنی دۆڕانی کڕیار')}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/80 mt-0.5">
                {L('اختر سبب الخسارة وأضف ملاحظة إن لزم.', 'هۆکاری دۆڕان هەڵبژێرە و پێویست بکات تێبینی زیاد بکە.')}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Reasons section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <Label className="text-xs font-semibold text-slate-700">
                {L('سبب الخسارة', 'هۆکاری دۆڕان')}
              </Label>
            </div>

            <Select value={selected} onValueChange={setSelected} dir="rtl">
              <SelectTrigger className="w-full bg-slate-50/60 rounded-xl border-slate-200 text-sm h-11">
                <SelectValue placeholder={L('اختر سبب الخسارة...', 'هۆکاری دۆڕان هەڵبژێرە...')} />
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                {reasons.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    {L('لا توجد أسباب مضافة بعد.', 'هێشتا هیچ هۆکارێک زیاد نەکراوە.')}
                  </div>
                )}
                {reasons.map(r => (
                  <SelectItem key={r.id} value={r.name} className="text-sm rounded-lg">
                    {r.name}
                  </SelectItem>
                ))}
                <SelectItem value="__new" className="text-sm rounded-lg text-red-600 font-medium">
                  <span className="flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" />
                    {L('إضافة سبب جديد', 'زیادکردنی هۆکاری نوێ')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {selected === '__new' && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium text-muted-foreground">{L('السبب الجديد', 'هۆکاری نوێ')}</Label>
                <Input
                  value={newReason}
                  onChange={e => setNewReason(e.target.value)}
                  placeholder={L('اكتب السبب...', 'هۆکار بنووسە...')}
                  className="bg-slate-50/60"
                />
              </div>
            )}
          </div>

          {/* Note section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {L('ملاحظة الخسارة', 'تێبینی دۆڕان')}
            </Label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={L('اكتب ملاحظة (اختياري)...', 'تێبینی بنووسە (ئارەزوومەندانە)...')}
              rows={3}
              className="resize-none bg-slate-50/60"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
            {L('إلغاء', 'پاشگەزبوونەوە')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 sm:flex-none bg-gradient-to-l from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600"
          >
            <TrendingDown className="w-4 h-4" />
            {L('تأكيد الخسارة', 'دڵنیاکردنەوەی دۆڕان')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}