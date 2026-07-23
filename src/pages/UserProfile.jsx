import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Save, Palette, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'
];

export default function UserProfile() {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => firebaseApi.auth.me().catch(() => null),
  });

  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    avatar_color: '#6366f1'
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        username: currentUser.username || '',
        phone: currentUser.phone || '',
        avatar_color: currentUser.avatar_color || '#6366f1'
      });
    }
  }, [currentUser]);

  const updateMutation = useMutation({
    mutationFn: (data) => firebaseApi.auth.updateMe(data),
    onSuccess: () => {
      qc.invalidateQueries(['currentUser']);
    },
  });

  const handleSubmit = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{L('الملف الشخصي', 'پڕۆفایلی کەسی')}</h1>
            <p className="text-sm text-slate-500">{L('أضف معلوماتك الشخصية', 'زانیارییە کەسییەکان زیاد بکە')}</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
                style={{ background: `linear-gradient(135deg, ${formData.avatar_color}, ${formData.avatar_color}99)` }}>
                {(currentUser?.full_name || formData.username || '?').charAt(0)}
              </div>
              <div>
                <CardTitle className="text-lg">{currentUser?.full_name || L('مستخدم', 'بەکارهێنەر')}</CardTitle>
                <CardDescription>{currentUser?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Username */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2">
                {L('اسم المستخدم', 'ناوی بەکارهێنەر')}
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={formData.username}
                  onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                  placeholder={L('أدخل اسم المستخدم', 'ناوی بەکارهێنەر بنووسە')}
                  className="pr-10"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {L('سيظهر في المهام والتعليقات', 'لە ئەرک و لێدوانەکاندا دەردەکەوێت')}
              </p>
            </div>

            {/* WhatsApp Phone Number */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2">
                {L('رقم واتساب', 'ژمارەی واتسەپ')}
              </Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder={L('مثال: 07501234567', 'نموونە: 07501234567')}
                dir="ltr"
                className="text-right"
              />
              <p className="text-xs text-slate-500 mt-1">
                {L('لتلقي إشعارات واتساب', 'بۆ وەرگرتنی ئاگادارکردنەوەکانی واتسەپ')}
              </p>
            </div>

            {/* Avatar Color */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {L('لون الصورة الشخصية', 'رەنگی وێنەی کەسی')}
              </Label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData(p => ({ ...p, avatar_color: color }))}
                    className={cn(
                      'w-10 h-10 rounded-xl transition-all shadow-sm hover:scale-110',
                      formData.avatar_color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="w-full rounded-xl font-bold"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? L('جاري الحفظ...', 'پاشەکەوتکردن...') : L('حفظ التغييرات', 'پاشەکەوتکردنی گۆڕانکارییەکان')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}