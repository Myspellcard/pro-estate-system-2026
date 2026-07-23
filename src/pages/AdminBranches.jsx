import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { Building2, Plus, Pencil, Trash2, X, Save, LayoutTemplate, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useBranch } from '@/context/BranchContext';
import { useLanguage } from '@/context/LanguageContext';

const emptyForm = {
  name: '', name_ku: '', company_name: '', company_name_ku: '',
  company_slogan: '', company_slogan_ku: '',
  invoice_slogan: '', invoice_slogan_ku: '',
  insurance_slogan: '', insurance_slogan_ku: '',
  contract_slogan: '', contract_slogan_ku: '',
  permission_slogan: '', permission_slogan_ku: '',
  commission_slogan: '', commission_slogan_ku: '',
  company_phone: '', company_email: '', company_logo: '',
  address: '', address_ku: '', city: '', city_ku: '', is_active: true,
  business_mode: 'rent',
  banner_show_logo: true,
  banner_show_phone: true,
  banner_show_arabic_subtitle: true,
  banner_show_kurdish_subtitle: true,
  banner_arabic_subtitle: 'قسم الفواتير والمتابعة المالية',
  banner_kurdish_subtitle: 'بەشی پسوولە و شوێنکەوتنی داراییەکان',
  banner_primary_color: '#1a2744',
  banner_secondary_color: '#e8b748',
  banner_gradient_enabled: true,
  banner_gradient_end_color: '#2a3f6e',
  footer_show_company_info: true,
  footer_show_phone: true,
  footer_show_email: true,
  footer_custom_text_ar: '',
  footer_custom_text_ku: '',
  footer_show_thanks_message: true,
  footer_thanks_message_ar: 'شكراً لسداد المبالغ في مواعيدها المحددة',
  footer_thanks_message_ku: 'سوپاس بۆ دابەشکردنی پارەکان لە کاتی خۆیدا',
  property_info_gradient_start: '#0a1628',
  property_info_gradient_middle: '#1c3d6e',
  property_info_gradient_end: '#f7e7ce',
  property_info_header_bg_start: '#0a1628',
  property_info_header_bg_middle: '#1c3d6e',
  property_info_header_bg_end: '#f7e7ce',
  property_info_card_bg_start: '#fef9e7',
  property_info_card_bg_end: '#f0e6d2',
  property_info_card_border: '#d4af37',
  property_info_label_color: '#1c3d6e',
  property_info_value_color: '#0a1628',
  property_info_title_size: 18,
  property_info_subtitle_size: 11,
  property_info_label_size: 12,
  property_info_value_size: 14,
};

export default function AdminBranches() {
  const queryClient = useQueryClient();
  const { refreshBranches } = useBranch();
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  
  // Kurdish translations for admin interface
  const t = {
    manageBranches: L('إدارة الفروع', 'بەڕێوەبردنی لقەکان'),
    addEditBranches: L('إضافة وتعديل فروع الشركة العقارية', 'زیادکردن و دەستکاریکردنی لقەکانی کۆمپانیا'),
    addBranch: L('إضافة فرع', 'زیادکردنی لق'),
    editBranch: L('تعديل الفرع', 'دەستکاریکردنی لق'),
    newBranch: L('فرع جديد', 'لقی نوێ'),
    cancel: L('إلغاء', 'پاشگەزبوونەوە'),
    saveChanges: L('حفظ التعديلات', 'پاشەکەوتکردنی گۆڕانکاری'),
    createBranch: L('إنشاء الفرع', 'دروستکردنی لق'),
    noBranches: L('لا توجد فروع', 'لق نییە'),
    addFirstBranch: L('قم بإضافة أول فرع للشركة', 'یەکەم لق بۆ کۆمپانیا زیاد بکە'),
    edit: L('تعديل', 'دەستکاری'),
    delete: L('حذف', 'سڕینەوە'),
    deleteBranch: L('حذف الفرع', 'سڕینەوەی لق'),
    confirmDelete: (name) => L(`هل أنت متأكد من حذف فرع "${name}"؟`, `دڵنیای لە سڕینەوەی لقی "${name}"؟`),
    bannerSettings: L('إعدادات البانر (الترويسة في العقود والفواتير)', 'ڕێکخستنی بانێر (سەرپەڕەی گرێبەست و پسوولە)'),
    footerSettings: L('إعدادات الفوتر (تذييل العقود والفواتير)', 'ڕێکخستنی فووتەر (ژێرپەڕەی گرێبەست و پسوولە)'),
    arabicSubtitle: L('النص الفرعي العربي في البانر', 'دەقی ژێرناوی عەرەبی لە بانێر'),
    kurdishSubtitle: L('النص الفرعي الكردي في البانر', 'دەقی ژێرناوی کوردی لە بانێر'),
    primaryColor: L('اللون الأساسي (الخلفية)', 'ڕەنگی سەرەکی (پاشبنەما)'),
    secondaryColor: L('اللون الثانوي (النصوص)', 'ڕەنگی دووەم (دەقەکان)'),
    gradientEnabled: L('تفعيل التدرج اللوني', 'چالاککردنی گۆڕانی ڕەنگ'),
    gradientEnd: L('لون نهاية التدرج', 'ڕەنگی کۆتایی گۆڕان'),
    showLogo: L('إظهار الشعار (اللوغو)', 'پیشاندانی لۆگۆ'),
    showArabicSubtitle: L('إظهار النص الفرعي العربي', 'پیشاندانی دەقی ژێرناوی عەرەبی'),
    showKurdishSubtitle: L('إظهار النص الفرعي الكردي', 'پیشاندانی دەقی ژێرناوی کوردی'),
    showPhone: L('إظهار رقم الهاتف في التذييل', 'پیشاندانی ژمارەی تەلەفۆن لە ژێرپەڕە'),
    showCompanyInfo: L('إظهار معلومات الشركة', 'پیشاندانی زانیارییەکانی کۆمپانیا'),
    showEmail: L('إظهار البريد', 'پیشاندانی ئیمەیڵ'),
    showThanks: L('إظهار رسالة الشكر', 'پیشاندانی پەیامی سوپاس'),
    thanksMessageAr: L('رسالة الشكر (عربي)', 'پەیامی سوپاس (عەرەبی)'),
    thanksMessageKu: L('رسالة الشكر (كردي)', 'پەیامی سوپاس (کوردی)'),
    customTextAr: L('نص مخصص (عربي)', 'دەقی تایبەت (عەرەبی)'),
    customTextKu: L('نص مخصص (كردي)', 'دەقی تایبەت (کوردی)'),
    propertyInfoSettings: L('إعدادات قسم معلومات العقار', 'ڕێکخستنی بەشی زانیارییەکانی خانووبەرە'),
    gradientStart: L('لون بداية التدرج', 'ڕەنگی دەستپێکی گۆڕان'),
    gradientMiddle: L('لون وسط التدرج', 'ڕەنگی ناوەڕاستی گۆڕان'),
    gradientEnd: L('لون نهاية التدرج', 'ڕەنگی کۆتایی گۆڕان'),
    headerBgStart: L('لون خلفية الرأس (بداية)', 'ڕەنگی پاشبنەمای سەرپەڕ (دەستپێک)'),
    headerBgMiddle: L('لون خلفية الرأس (وسط)', 'ڕەنگی پاشبنەمای سەرپەڕ (ناوەڕاست)'),
    headerBgEnd: L('لون خلفية الرأس (نهاية)', 'ڕەنگی پاشبنەمای سەرپەڕ (کۆتایی)'),
    cardBgStart: L('لون خلفية البطاقة (بداية)', 'ڕەنگی پاشبنەمای کارت (دەستپێک)'),
    cardBgEnd: L('لون خلفية البطاقة (نهاية)', 'ڕەنگی پاشبنەمای کارت (کۆتایی)'),
    cardBorder: L('لون حدود البطاقة', 'ڕەنگی سنووری کارت'),
    labelColor: L('لون نص التسمية', 'ڕەنگی دەقی ناونیشان'),
    valueColor: L('لون نص القيمة', 'ڕەنگی دەقی بەها'),
    titleSize: L('حجم العنوان', 'قەبارەی ناونیشان'),
    subtitleSize: L('حجم العنوان الفرعي', 'قەبارەی ژێرناو'),
    labelSize: L('حجم التسمية', 'قەبارەی ناونیشان'),
    valueSize: L('حجم القيمة', 'قەبارەی بەها'),
  };
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoUploading(true);
      const res = await firebaseApi.integrations.Core.UploadFile({ file });
      setForm(p => ({ ...p, company_logo: res.file_url }));
    } catch (err) {
      console.error('Logo upload failed', err);
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => firebaseApi.entities.Branch.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => firebaseApi.entities.Branch.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); refreshBranches(); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => firebaseApi.entities.Branch.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); refreshBranches(); close(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Branch.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); refreshBranches(); },
  });

  const close = () => { setShowForm(false); setEditing(null); setForm(emptyForm); };

  const openEdit = (branch) => {
    setEditing(branch);
    setForm({ ...emptyForm, ...branch });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.manageBranches}</h1>
          <p className="text-sm text-muted-foreground">{t.addEditBranches}</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { close(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> {t.addBranch}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">{editing ? t.editBranch : t.newBranch}</h2>
            <button onClick={close}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{L('اسم الفرع (عربي) *', 'ناوی لق (عەرەبی) *')}</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder={L('مثال: فرع بغداد', 'نموونە: لقی بەغدا')} />
              </div>
              <div className="space-y-2">
                <Label>{L('ناوی لق (کوردی)', 'ناوی لق (کوردی)')}</Label>
                <Input value={form.name_ku} onChange={e => setForm(p => ({ ...p, name_ku: e.target.value }))} placeholder={L('نموونە: لقی بەغدا', 'نموونە: لقی بەغدا')} />
              </div>
              <div className="space-y-2">
                <Label>{L('اسم الشركة (عربي) *', 'ناوی کۆمپانیا (عەرەبی) *')}</Label>
                <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} required placeholder={L('اسم شركة العقارات', 'ناوی کۆمپانیای خانووبەرە')} />
              </div>
              <div className="space-y-2">
                <Label>{L('ناوی کۆمپانیا (کوردی)', 'ناوی کۆمپانیا (کوردی)')}</Label>
                <Input value={form.company_name_ku} onChange={e => setForm(p => ({ ...p, company_name_ku: e.target.value }))} placeholder={L('ناوی کۆمپانیای خانووبەرە', 'ناوی کۆمپانیای خانووبەرە')} />
              </div>
              <div className="space-y-2">
                <Label>{L('شعار الشركة (عربي)', 'شعاری کۆمپانیا (عەرەبی)')}</Label>
                <Input value={form.company_slogan} onChange={e => setForm(p => ({ ...p, company_slogan: e.target.value }))} placeholder={L('مثال: خبراء العقارات منذ 2010', 'نموونە: شارەزای خانووبەرە لە 2010')} />
              </div>
              <div className="space-y-2">
                <Label>{L('شعاری کۆمپانیا (کوردی)', 'شعاری کۆمپانیا (کوردی)')}</Label>
                <Input value={form.company_slogan_ku} onChange={e => setForm(p => ({ ...p, company_slogan_ku: e.target.value }))} placeholder={L('نموونە: شارەزای خانووبەرە لە 2010', 'نموونە: شارەزای خانووبەرە لە 2010')} />
              </div>
              <div className="space-y-2">
                <Label>{L('رقم هاتف الشركة', 'ژمارەی تەلەفۆنی کۆمپانیا')}</Label>
                <Input value={form.company_phone} onChange={e => setForm(p => ({ ...p, company_phone: e.target.value }))} placeholder="07xx-xxx-xxxx" />
              </div>
              <div className="space-y-2">
                <Label>{L('بريد الشركة', 'ئیمەیڵی کۆمپانیا')}</Label>
                <Input type="email" value={form.company_email} onChange={e => setForm(p => ({ ...p, company_email: e.target.value }))} placeholder="info@company.com" />
              </div>
              <div className="space-y-2">
                <Label>{L('عنوان الفرع (عربي)', 'ناونیشانی لق (عەرەبی)')}</Label>
                <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder={L('الشارع والحي', 'شەقام و گەڕەک')} />
              </div>
              <div className="space-y-2">
                <Label>{L('ناونیشانی لق (کوردی)', 'ناونیشانی لق (کوردی)')}</Label>
                <Input value={form.address_ku} onChange={e => setForm(p => ({ ...p, address_ku: e.target.value }))} placeholder={L('شەقام و گەڕەک', 'شەقام و گەڕەک')} />
              </div>
              <div className="space-y-2">
                <Label>{L('المدينة (عربي)', 'شار (عەرەبی)')}</Label>
                <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder={L('بغداد', 'بەغدا')} />
              </div>
              <div className="space-y-2">
                <Label>{L('شار (کوردی)', 'شار (کوردی)')}</Label>
                <Input value={form.city_ku} onChange={e => setForm(p => ({ ...p, city_ku: e.target.value }))} placeholder={L('هەولێر', 'هەولێر')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{L('شعار الشركة', 'لۆگۆی کۆمپانیا')}</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-16 h-16 rounded-xl border border-border bg-muted/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.company_logo ? (
                      <img src={form.company_logo} alt="logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <label className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-input bg-transparent text-sm cursor-pointer hover:bg-accent transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {logoUploading ? <div className="w-3.5 h-3.5 border-2 border-muted border-t-primary rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {logoUploading ? L('جاري الرفع...', 'باردەکات...') : L('رفع الشعار', 'بارکردنی لۆگۆ')}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                  {form.company_logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm(p => ({ ...p, company_logo: '' }))} className="text-destructive">
                      <X className="w-3.5 h-3.5" /> {L('إزالة', 'سڕینەوە')}
                    </Button>
                  )}
                </div>
                <Input value={form.company_logo} onChange={e => setForm(p => ({ ...p, company_logo: e.target.value }))} placeholder={L('أو الصق رابط الصورة', 'یان لینکی وێنە بلکێنە')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{L('نوع النشاط', 'جۆری کار')}</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="business_mode" 
                      checked={form.business_mode === 'rent'} 
                      onChange={e => setForm(p => ({ ...p, business_mode: 'rent' }))}
                      className="w-4 h-4 accent-primary" 
                    />
                    <span className="text-sm">{L('إيجار فقط', 'کرێ تەنها')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="business_mode" 
                      checked={form.business_mode === 'sale'} 
                      onChange={e => setForm(p => ({ ...p, business_mode: 'sale' }))}
                      className="w-4 h-4 accent-primary" 
                    />
                    <span className="text-sm">{L('بيع فقط', 'فرۆشتن تەنها')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="radio" 
                      name="business_mode" 
                      checked={form.business_mode === 'both'} 
                      onChange={e => setForm(p => ({ ...p, business_mode: 'both' }))}
                      className="w-4 h-4 accent-primary" 
                    />
                    <span className="text-sm">{L('كلاهما', 'هەردووکیان')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Slogans per document */}
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">{L('شعارات مستقلة لكل مستند', 'شعاری جیاواز بۆ هەر بەڵگەنامەیەک')}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { ar: 'invoice_slogan', ku: 'invoice_slogan_ku', arLabel: 'شعار الفواتير', kuLabel: 'شعاری پسوولە' },
                  { ar: 'insurance_slogan', ku: 'insurance_slogan_ku', arLabel: 'شعار التأمين', kuLabel: 'شعاری دڵنیایی' },
                  { ar: 'contract_slogan', ku: 'contract_slogan_ku', arLabel: 'شعار العقود', kuLabel: 'شعاری گرێبەست' },
                  { ar: 'permission_slogan', ku: 'permission_slogan_ku', arLabel: 'شعار الإذن', kuLabel: 'شعاری مۆڵەت' },
                  { ar: 'commission_slogan', ku: 'commission_slogan_ku', arLabel: 'شعار العمولة', kuLabel: 'شعاری دەلالی' },
                ].map(item => (
                  <React.Fragment key={item.ar}>
                    <div className="space-y-2">
                      <Label>{L(item.arLabel + ' (عربي)', item.kuLabel + ' (عەرەبی)')}</Label>
                      <Input value={form[item.ar]} onChange={e => setForm(p => ({ ...p, [item.ar]: e.target.value }))} placeholder={item.arLabel} />
                    </div>
                    <div className="space-y-2">
                      <Label>{L(item.arLabel + ' (كوردی)', item.kuLabel + ' (کوردی)')}</Label>
                      <Input value={form[item.ku]} onChange={e => setForm(p => ({ ...p, [item.ku]: e.target.value }))} placeholder={item.kuLabel} />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Banner Settings */}
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">{t.bannerSettings}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.arabicSubtitle}</Label>
                  <Input value={form.banner_arabic_subtitle} onChange={e => setForm(p => ({ ...p, banner_arabic_subtitle: e.target.value }))} placeholder="قسم الفواتير والمتابعة المالية" />
                </div>
                <div className="space-y-2">
                  <Label>{t.kurdishSubtitle}</Label>
                  <Input value={form.banner_kurdish_subtitle} onChange={e => setForm(p => ({ ...p, banner_kurdish_subtitle: e.target.value }))} placeholder="بەشی پسوولە و شوێنکەوتنی داراییەکان" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.primaryColor}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.banner_primary_color} onChange={e => setForm(p => ({ ...p, banner_primary_color: e.target.value }))} className="w-12 h-9 border rounded cursor-pointer" />
                      <Input value={form.banner_primary_color} onChange={e => setForm(p => ({ ...p, banner_primary_color: e.target.value }))} placeholder="#1a2744" className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.secondaryColor}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.banner_secondary_color} onChange={e => setForm(p => ({ ...p, banner_secondary_color: e.target.value }))} className="w-12 h-9 border rounded cursor-pointer" />
                      <Input value={form.banner_secondary_color} onChange={e => setForm(p => ({ ...p, banner_secondary_color: e.target.value }))} placeholder="#e8b748" className="flex-1" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.banner_gradient_enabled} onChange={e => setForm(p => ({ ...p, banner_gradient_enabled: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium">{t.gradientEnabled}</span>
                  </label>
                  {form.banner_gradient_enabled && (
                    <div className="flex gap-2 items-center">
                      <Label className="whitespace-nowrap">{t.gradientEnd}</Label>
                      <div className="flex gap-2 flex-1">
                        <input type="color" value={form.banner_gradient_end_color} onChange={e => setForm(p => ({ ...p, banner_gradient_end_color: e.target.value }))} className="w-12 h-9 border rounded cursor-pointer" />
                        <Input value={form.banner_gradient_end_color} onChange={e => setForm(p => ({ ...p, banner_gradient_end_color: e.target.value }))} placeholder="#2a3f6e" className="flex-1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 pt-2 border-t">
                  {[
                    ['banner_show_logo', t.showLogo],
                    ['banner_show_arabic_subtitle', t.showArabicSubtitle],
                    ['banner_show_kurdish_subtitle', t.showKurdishSubtitle],
                    ['banner_show_phone', t.showPhone],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={form[key] !== false} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 accent-primary" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Settings */}
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">{t.footerSettings}</span>
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  ['footer_show_company_info', t.showCompanyInfo],
                  ['footer_show_phone', t.showPhone],
                  ['footer_show_email', t.showEmail],
                  ['footer_show_thanks_message', t.showThanks],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form[key] !== false} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>{t.thanksMessageAr}</Label>
                  <Input value={form.footer_thanks_message_ar} onChange={e => setForm(p => ({ ...p, footer_thanks_message_ar: e.target.value }))} placeholder="شكرا لسداد المبالغ..." />
                </div>
                <div className="space-y-2">
                  <Label>{t.thanksMessageKu}</Label>
                  <Input value={form.footer_thanks_message_ku} onChange={e => setForm(p => ({ ...p, footer_thanks_message_ku: e.target.value }))} placeholder="سوپاس بۆ دابەشکردنی..." />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>{t.customTextAr}</Label>
                  <Input value={form.footer_custom_text_ar} onChange={e => setForm(p => ({ ...p, footer_custom_text_ar: e.target.value }))} placeholder="نص إضافي في الفوتر" />
                </div>
                <div className="space-y-2">
                  <Label>{t.customTextKu}</Label>
                  <Input value={form.footer_custom_text_ku} onChange={e => setForm(p => ({ ...p, footer_custom_text_ku: e.target.value }))} placeholder="دەقی زیادە" />
                </div>
              </div>
            </div>

            {/* Property Info Section Settings */}
            <div className="border border-border rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">{t.propertyInfoSettings}</span>
              </div>
              
              {/* Gradient Colors */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{L('ألوان التدرج الخارجي', 'ڕەنگەکانی گۆڕانی دەرەکی')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t.gradientStart}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_gradient_start} onChange={e => setForm(p => ({ ...p, property_info_gradient_start: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_gradient_start} onChange={e => setForm(p => ({ ...p, property_info_gradient_start: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.gradientMiddle}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_gradient_middle} onChange={e => setForm(p => ({ ...p, property_info_gradient_middle: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_gradient_middle} onChange={e => setForm(p => ({ ...p, property_info_gradient_middle: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.gradientEnd}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_gradient_end} onChange={e => setForm(p => ({ ...p, property_info_gradient_end: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_gradient_end} onChange={e => setForm(p => ({ ...p, property_info_gradient_end: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Header Background Colors */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{L('ألوان خلفية الرأس', 'ڕەنگەکانی پاشبنەمای سەرپەڕ')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t.headerBgStart}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_header_bg_start} onChange={e => setForm(p => ({ ...p, property_info_header_bg_start: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_header_bg_start} onChange={e => setForm(p => ({ ...p, property_info_header_bg_start: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.headerBgMiddle}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_header_bg_middle} onChange={e => setForm(p => ({ ...p, property_info_header_bg_middle: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_header_bg_middle} onChange={e => setForm(p => ({ ...p, property_info_header_bg_middle: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.headerBgEnd}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_header_bg_end} onChange={e => setForm(p => ({ ...p, property_info_header_bg_end: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_header_bg_end} onChange={e => setForm(p => ({ ...p, property_info_header_bg_end: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Colors */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{L('ألوان البطاقات', 'ڕەنگەکانی کارتەکان')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t.cardBgStart}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_card_bg_start} onChange={e => setForm(p => ({ ...p, property_info_card_bg_start: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_card_bg_start} onChange={e => setForm(p => ({ ...p, property_info_card_bg_start: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.cardBgEnd}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_card_bg_end} onChange={e => setForm(p => ({ ...p, property_info_card_bg_end: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_card_bg_end} onChange={e => setForm(p => ({ ...p, property_info_card_bg_end: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.cardBorder}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_card_border} onChange={e => setForm(p => ({ ...p, property_info_card_border: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_card_border} onChange={e => setForm(p => ({ ...p, property_info_card_border: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Colors */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{L('ألوان النصوص', 'ڕەنگەکانی دەقەکان')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.labelColor}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_label_color} onChange={e => setForm(p => ({ ...p, property_info_label_color: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_label_color} onChange={e => setForm(p => ({ ...p, property_info_label_color: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.valueColor}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={form.property_info_value_color} onChange={e => setForm(p => ({ ...p, property_info_value_color: e.target.value }))} className="w-10 h-9 border rounded cursor-pointer" />
                      <Input value={form.property_info_value_color} onChange={e => setForm(p => ({ ...p, property_info_value_color: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Sizes */}
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{L('أحجام النصوص', 'قەبارەی دەقەکان')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>{t.titleSize} (px)</Label>
                    <Input type="number" value={form.property_info_title_size} onChange={e => setForm(p => ({ ...p, property_info_title_size: parseInt(e.target.value) || 18 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.subtitleSize} (px)</Label>
                    <Input type="number" value={form.property_info_subtitle_size} onChange={e => setForm(p => ({ ...p, property_info_subtitle_size: parseInt(e.target.value) || 11 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.labelSize} (px)</Label>
                    <Input type="number" value={form.property_info_label_size} onChange={e => setForm(p => ({ ...p, property_info_label_size: parseInt(e.target.value) || 12 }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.valueSize} (px)</Label>
                    <Input type="number" value={form.property_info_value_size} onChange={e => setForm(p => ({ ...p, property_info_value_size: parseInt(e.target.value) || 14 }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={close}>{t.cancel}</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {editing ? t.saveChanges : t.createBranch}
              </Button>
            </div>
          </form>
        </div>
      )}

      {branches.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-2xl bg-muted mb-4">
            <Building2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{t.noBranches}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t.addFirstBranch}</p>
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> {t.addBranch}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {branches.map(branch => (
            <div key={branch.id} className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {branch.company_logo ? (
                    <img src={branch.company_logo} alt={branch.company_name} className="w-10 h-10 rounded-lg object-contain border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div>
                   <h3 className="font-bold">{lang === 'ku' ? (branch.name_ku || branch.name) : branch.name}</h3>
                   <p className="text-sm text-muted-foreground">{lang === 'ku' ? (branch.company_name_ku || branch.company_name) : branch.company_name}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full mt-1 ${branch.is_active !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </div>
              {(branch.address || branch.city) && (
                <p className="text-xs text-muted-foreground mb-2">
                  {lang === 'ku'
                    ? [branch.address_ku || branch.address, branch.city_ku || branch.city].filter(Boolean).join('، ')
                    : [branch.address, branch.city].filter(Boolean).join('، ')}
                </p>
              )}
              {branch.company_phone && (
                <p className="text-xs text-muted-foreground mb-4">{branch.company_phone}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(branch)}>
                  <Pencil className="w-3.5 h-3.5" /> {t.edit}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.deleteBranch}</AlertDialogTitle>
                      <AlertDialogDescription>{t.confirmDelete(lang === 'ku' ? (branch.name_ku || branch.name) : branch.name)}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                      <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(branch.id)} className="bg-destructive text-destructive-foreground">{t.delete}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}