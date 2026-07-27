import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, register, googleLogin, previewLogin } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const invitedEmail = new URLSearchParams(window.location.search).get('email');
    if (invitedEmail) setEmail(invitedEmail.trim().toLowerCase());
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await googleLogin();
      if (!user) return;
      navigate('/', { replace: true });
    } catch (err) {
      const message = err?.code === 'auth/popup-closed-by-user'
        ? 'تم إغلاق نافذة تسجيل الدخول قبل الإكمال'
        : err?.code === 'auth/unauthorized-domain'
          ? 'هذا الدومين غير مسموح في Base44 Auth'
          : err?.message || 'حدث خطأ أثناء تسجيل الدخول بواسطة Google';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register({ email, password, fullName });
      } else {
        await login({ email, password });
      }
      navigate('/', { replace: true });
    } catch (err) {
      const message = err?.code === 'auth/invalid-credential'
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : err?.code === 'auth/email-already-in-use'
          ? 'هذا البريد مسجل مسبقاً'
          : err?.code === 'auth/weak-password'
            ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            : err?.message || 'حدث خطأ أثناء تسجيل الدخول';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewLogin = () => {
    try {
      previewLogin();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Preview mode is not available here');
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            {mode === 'login' ? <LogIn className="w-7 h-7 text-primary" /> : <UserPlus className="w-7 h-7 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-black">
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </CardTitle>
          <CardDescription>
            نظام إدارة العقارات والإيجارات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="اكتب اسمك"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Lock className="w-4 h-4" /> كلمة المرور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full rounded-xl font-bold" disabled={loading}>
              {loading ? 'يرجى الانتظار...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-500">أو</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl font-bold"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            الدخول مباشرة بواسطة Gmail / Google
          </Button>

          {typeof window !== 'undefined' && ['127.0.0.1', 'localhost'].includes(window.location.hostname) && (
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full rounded-xl font-bold"
              onClick={handlePreviewLogin}
              disabled={loading}
            >
              دخول للمعاينة المحلية
            </Button>
          )}

          <div className="mt-5 text-center text-sm text-slate-600">
            {mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب مسبقاً؟'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-primary font-bold hover:underline"
            >
              {mode === 'login' ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
