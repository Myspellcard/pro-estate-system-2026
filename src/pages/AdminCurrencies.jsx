import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

export default function AdminCurrencies() {
  const { activeBranch } = useBranch();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [deleteCurrency, setDeleteCurrency] = useState(null);

  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies', activeBranch?.id],
    queryFn: () => firebaseApi.entities.Currency.filter(
      activeBranch?.id ? { branch_id: activeBranch.id } : {}
    ),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingCurrency) {
        return firebaseApi.entities.Currency.update(editingCurrency.id, data);
      }
      return firebaseApi.entities.Currency.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setIsFormOpen(false);
      setEditingCurrency(null);
      toast.success(L('تم الحفظ بنجاح', 'بە سەرکەوتوویی پاشەکەوتکرا'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Currency.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setDeleteCurrency(null);
      toast.success(L('تم الحذف بنجاح', 'بە سەرکەوتوویی سڕایەوە'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    saveMutation.mutate({
      name: formData.get('name'),
      name_ku: formData.get('name_ku'),
      code: formData.get('code'),
      symbol: formData.get('symbol'),
      exchange_rate: parseFloat(formData.get('exchange_rate') || 1),
      is_default: formData.get('is_default') === 'on',
      is_active: true,
      branch_id: activeBranch?.id,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">{L('العملات', 'دراوەکان')}</h1>
          <p className="text-sm text-gray-500">{L('إدارة العملات وأسعار الصرف', 'بەڕێوەبردنی دراوەکان و نرخی گۆڕینەوە')}</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); setEditingCurrency(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#1a2744] hover:bg-[#2a3f6e]">
              <Plus className="w-4 h-4" />
              {L('إضافة عملة', 'زیادکردنی دراو')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCurrency ? L('تعديل العملة', 'دەستکاریکردنی دراو') : L('إضافة عملة جديدة', 'زیادکردنی دراوی نوێ')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('الاسم (عربي)', 'ناو (عەرەبی)')}</label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('الاسم (كردي)', 'ناو (کوردی)')}</label>
                  <Input name="name_ku" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('الرمز', 'هێما')}</label>
                  <Input name="symbol" required placeholder="د.ع" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{L('الكود', 'کۆد')}</label>
                  <Input name="code" required placeholder="IQD" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{L('سعر الصرف (بالدولار)', 'نرخی گۆڕینەوە (بە دۆلار)')}</label>
                <Input type="number" step="0.0001" name="exchange_rate" defaultValue="1" required />
                <p className="text-xs text-gray-500 mt-1">{L('مثال: 1300 للدينار العراقي', 'نموونە: 1300 بۆ دیناری عێراقی')}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_default" id="is_default" className="w-4 h-4" />
                <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
                  {L('عملة افتراضية', 'دراوی بنەڕەتی')}
                </label>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  {L('إلغاء', 'پاشگەزبوونەوە')}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending} className="bg-[#1a2744] hover:bg-[#2a3f6e]">
                  {L('إرسال', 'ناردن')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Currencies Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currencies.map(currency => (
          <Card key={currency.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#1a2744]" />
                  <div>
                    <CardTitle className="text-base">{currency.name}</CardTitle>
                    <p className="text-xs text-gray-500">{currency.code}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {currency.is_default && (
                    <Badge className="bg-blue-500">{L('افتراضي', 'بنەڕەتی')}</Badge>
                  )}
                  <Badge className="bg-green-500">{L('نشط', 'چالاک')}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{L('الرمز:', 'هێما:')}</span>
                <span className="font-bold">{currency.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{L('سعر الصرف:', 'نرخی گۆڕینەوە:')}</span>
                <span className="font-bold">{currency.exchange_rate?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingCurrency(currency); setIsFormOpen(true); }}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3" />
                  {L('تعديل', 'دەستکاریکردن')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteCurrency(currency)}
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {currencies.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{L('لا توجد عملات', 'هیچ دراوێک نییە')}</p>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteCurrency && (
        <Dialog open={!!deleteCurrency} onOpenChange={() => setDeleteCurrency(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{L('تأكيد الحذف', 'دڵنیاییکردنەوەی سڕینەوە')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              {L('هل أنت متأكد من حذف هذه العملة؟', 'دڵنیایت لە سڕینەوەی ئەم دراوە؟')}
            </p>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setDeleteCurrency(null)}>
                {L('إلغاء', 'پاشگەزبوونەوە')}
              </Button>
              <Button
                onClick={() => deleteMutation.mutate(deleteCurrency.id)}
                className="bg-red-500 hover:bg-red-600"
              >
                {L('حذف', 'سڕینەوە')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}