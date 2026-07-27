import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Printer, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PrintSettingsEditor from '@/components/admin/PrintSettingsEditor';
import RentalPermissionLetterEditor from '@/components/admin/RentalPermissionLetterEditor';

const createDefaultPrintSettings = () => ({
  print_rent_contract: {},
  print_rent_invoice: {},
  print_insurance_invoice: {},
  print_other_invoice: {},
  print_sale_contract: {},
  print_rental_permission: {},
});

export default function AdminPrintSettings() {
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const qc = useQueryClient();
  const [activePrint, setActivePrint] = useState('print_rent_contract');
  const [saved, setSaved] = useState(false);

  const { data: settingsList = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['app_settings'],
    queryFn: () => firebaseApi.entities.AppSettings.list(),
  });

  const existing = settingsList.find(s => s.key === 'default');
  const [form, setForm] = useState(createDefaultPrintSettings);
  const [formInitialized, setFormInitialized] = useState(false);

  React.useEffect(() => {
    if (existing && !formInitialized) {
      setForm({
        print_rent_contract: existing.print_rent_contract || {},
        print_rent_invoice: existing.print_rent_invoice || {},
        print_insurance_invoice: existing.print_insurance_invoice || {},
        print_other_invoice: existing.print_other_invoice || {},
        print_sale_contract: existing.print_sale_contract || {},
        print_rental_permission: existing.print_rental_permission || {},
      });
      setFormInitialized(true);
    } else if (!settingsLoading && !existing && !formInitialized) {
      setForm(createDefaultPrintSettings());
      setFormInitialized(true);
    }
  }, [existing, settingsLoading, formInitialized]);

  const saveMutation = useMutation({
    mutationFn: (data) => existing
      ? firebaseApi.entities.AppSettings.update(existing.id, data)
      : firebaseApi.entities.AppSettings.create({ key: 'default', ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['app_settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const RENT_CONTRACT_GENERAL_FIELDS = [
    { key: 'show_logo', labelAr: 'شعار الشركة', labelKu: 'لۆگۆی کۆمپانیا' },
    { key: 'show_company_name', labelAr: 'اسم الشركة', labelKu: 'ناوی کۆمپانیا' },
    { key: 'show_contract_number', labelAr: 'رقم العقد', labelKu: 'ژمارەی گرێبەست' },
    { key: 'show_signature_date', labelAr: 'تاريخ التوقيع', labelKu: 'بەرواری واژۆ' },
  ];

  const RENT_CONTRACT_TENANT_FIELDS = [
    { key: 'show_tenant_phone', labelAr: 'هاتف المستأجر', labelKu: 'تەلەفۆنی کرێچی' },
    { key: 'show_tenant_email', labelAr: 'بريد المستأجر', labelKu: 'ئیمەیڵی کرێچی' },
    { key: 'show_tenant_nationality', labelAr: 'جنسية المستأجر', labelKu: 'نەتەوەی کرێچی' },
    { key: 'show_tenant_address', labelAr: 'عنوان المستأجر', labelKu: 'ناونیشانی کرێچی' },
  ];
  const RENT_CONTRACT_OWNER_FIELDS = [
    { key: 'show_owner_phone', labelAr: 'هاتف المالك', labelKu: 'تەلەفۆنی خاوەن' },
    { key: 'show_owner_email', labelAr: 'بريد المالك', labelKu: 'ئیمەیڵی خاوەن' },
    { key: 'show_owner_nationality', labelAr: 'جنسية المالك', labelKu: 'نەتەوەی خاوەن' },
    { key: 'show_owner_address', labelAr: 'عنوان المالك', labelKu: 'ناونیشانی خاوەن' },
  ];
  const RENT_CONTRACT_PROPERTY_FIELDS = [
    { key: 'show_property_type', labelAr: 'نوع العقار', labelKu: 'جۆری خانووبەرە' },
    { key: 'show_property_location', labelAr: 'موقع العقار', labelKu: 'شوێنی خانووبەرە' },
    { key: 'show_purpose', labelAr: 'غرض الإيجار', labelKu: 'ئامانجی کرێ' },
    { key: 'show_daily_rent', labelAr: 'الإيجار اليومي', labelKu: 'کرێی رۆژانە' },
    { key: 'show_insurance', labelAr: 'مبلغ التأمين', labelKu: 'بڕی دڵنیایی' },
  ];
  const RENT_CONTRACT_OTHER_FIELDS = [
    { key: 'show_clauses', labelAr: 'البنود والشروط', labelKu: 'بەند و مەرجەکان' },
    { key: 'show_signatures', labelAr: 'التوقيعات', labelKu: 'واژۆکان' },
    { key: 'show_footer', labelAr: 'التذييل', labelKu: 'تەیل' },
  ];
  const INVOICE_FIELDS = [
    { key: 'show_logo', labelAr: 'شعار الشركة', labelKu: 'لۆگۆی کۆمپانیا' },
    { key: 'show_company_name', labelAr: 'اسم الشركة', labelKu: 'ناوی کۆمپانیا' },
    { key: 'show_tenant', labelAr: 'اسم المستأجر', labelKu: 'ناوی کرێچی' },
    { key: 'show_property', labelAr: 'اسم العقار', labelKu: 'ناوی خانووبەرە' },
    { key: 'show_contract_number', labelAr: 'رقم العقد', labelKu: 'ژمارەی گرێبەست' },
    { key: 'show_period', labelAr: 'الفترة', labelKu: 'ماوە' },
    { key: 'show_due_date', labelAr: 'تاريخ الاستحقاق', labelKu: 'کاتی پێویست' },
    { key: 'show_status', labelAr: 'الحالة', labelKu: 'دۆخ' },
    { key: 'show_footer', labelAr: 'التذييل', labelKu: 'تەیل' },
  ];
  const SALE_CONTRACT_FIELDS = [
    { key: 'show_buyer_phone', labelAr: 'هاتف المشتري', labelKu: 'تەلەفۆنی کڕیار' },
    { key: 'show_buyer_email', labelAr: 'بريد المشتري', labelKu: 'ئیمەیڵی کڕیار' },
    { key: 'show_buyer_nationality', labelAr: 'جنسية المشتري', labelKu: 'نەتەوەی کڕیار' },
    { key: 'show_buyer_address', labelAr: 'عنوان المشتري', labelKu: 'ناونیشانی کڕیار' },
    { key: 'show_seller_phone', labelAr: 'هاتف البائع', labelKu: 'تەلەفۆنی فرۆشیار' },
    { key: 'show_seller_email', labelAr: 'بريد البائع', labelKu: 'ئیمەیڵی فرۆشیار' },
    { key: 'show_seller_nationality', labelAr: 'جنسية البائع', labelKu: 'نەتەوەی فرۆشیار' },
    { key: 'show_seller_address', labelAr: 'عنوان البائع', labelKu: 'ناونیشانی فرۆشیار' },
    { key: 'show_payment_method', labelAr: 'طريقة الدفع', labelKu: 'شێوازی پارەدان' },
    { key: 'show_signatures', labelAr: 'التوقيعات', labelKu: 'واژۆکان' },
  ];

  const printSections = [
    { id: 'print_rent_contract', labelAr: '📋 عقد الإيجار', labelKu: '📋 گرێبەستی کرێ', sections: [
      { titleAr: 'عام', titleKu: 'گشتی', fields: RENT_CONTRACT_GENERAL_FIELDS },
      { titleAr: 'المستأجر', titleKu: 'کرێچی', fields: RENT_CONTRACT_TENANT_FIELDS },
      { titleAr: 'المالك', titleKu: 'خاوەن', fields: RENT_CONTRACT_OWNER_FIELDS },
      { titleAr: 'العقار', titleKu: 'خانووبەرە', fields: RENT_CONTRACT_PROPERTY_FIELDS },
      { titleAr: 'أخرى', titleKu: 'هی تر', fields: RENT_CONTRACT_OTHER_FIELDS },
    ]},
    { id: 'print_rent_invoice', labelAr: '🧾 فاتورة الإيجار', labelKu: '🧾 پسوولەی کرێ', fields: INVOICE_FIELDS },
    { id: 'print_insurance_invoice', labelAr: '🛡 فاتورة التأمين', labelKu: '🛡 پسوولەی دڵنیایی', fields: INVOICE_FIELDS },
    { id: 'print_other_invoice', labelAr: '📄 الفواتير الأخرى', labelKu: '📄 پسوولەکانی تر', fields: INVOICE_FIELDS },
    { id: 'print_sale_contract', labelAr: '🏠 عقد البيع', labelKu: '🏠 گرێبەستی فرۆشتن', sections: [
      { titleAr: 'المشتري', titleKu: 'کڕیار', fields: SALE_CONTRACT_FIELDS.filter(f => f.key.includes('buyer')) },
      { titleAr: 'البائع', titleKu: 'فرۆشیار', fields: SALE_CONTRACT_FIELDS.filter(f => f.key.includes('seller')) },
      { titleAr: 'أخرى', titleKu: 'هی تر', fields: SALE_CONTRACT_FIELDS.filter(f => !f.key.includes('buyer') && !f.key.includes('seller')) },
    ]},
    { id: 'print_rental_permission', labelAr: '🔑 مۆڵەتی کرێ', labelKu: '🔑 مۆڵەتی کرێ', isLetter: true },
  ];

  const activeSection = printSections.find(s => s.id === activePrint);

  return (
    <div className="p-4 md:p-6 max-w-5xl" dir="rtl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a2744] to-[#2a3f6e] flex items-center justify-center shadow-lg">
            <Printer className="w-6 h-6 text-[#e8b748]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a2744]">{L('إعدادات الطباعة', 'ڕێکخستنەکانی پرینت')}</h1>
            <p className="text-sm text-gray-500">{L('تخصيص الهوامش والحقول لكل نوع مستند', 'دیاریکردنی مەرج و خانەکان بۆ هەر جۆرێک')}</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? L('تم الحفظ!', 'پاشەکەوتکرا!') : L('حفظ الإعدادات', 'پاشەکەوتکردنی ڕێکخستنەکان')}
        </Button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          ✓ {L('تم حفظ جميع إعدادات الطباعة بنجاح', 'هەموو ڕێکخستنەکانی پرینت بە سەرکەوتوویی پاشەکەوتکران')}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Printer className="w-5 h-5 text-purple-600" />
          <div>
            <h2 className="font-bold text-[#1a2744]">{L('إعدادات الطباعة', 'ڕێکخستنەکانی پرینت')}</h2>
            <p className="text-xs text-gray-400">{L('حدد الهوامش والحقول لكل نوع مستند', 'مەرج و خانەکان بۆ هەر جۆرێک دیاری بکە')}</p>
          </div>
        </div>
        <div className="flex gap-0 border-b border-gray-100 overflow-x-auto">
          {printSections.map(s => (
            <button
              key={s.id}
              onClick={() => setActivePrint(s.id)}
              className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activePrint === s.id ? 'border-[#1a2744] text-[#1a2744] bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {L(s.labelAr, s.labelKu)}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-6">
          {activeSection && (
            activeSection.isLetter ? (
              <>
                <RentalPermissionLetterEditor
                  settings={form[activePrint] || {}}
                  onChange={val => setForm(p => ({ ...p, [activePrint]: val }))}
                  lang={lang}
                />
                <div className="sticky bottom-4 flex justify-end pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="bg-[#1a2744] hover:bg-[#2a3f6e] gap-2 shadow-lg"
                  >
                    {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? L('تم الحفظ!', 'پاشەکەوتکرا!') : L('حفظ', 'پاشەکەوتکردن')}
                  </Button>
                </div>
              </>
            ) : (
              <PrintSettingsEditor
                title={L(activeSection.labelAr, activeSection.labelKu)}
                settings={form[activePrint] || {}}
                defaults={{}}
                toggleSections={activeSection.sections || []}
                toggleFields={activeSection.fields || []}
                textFields={activeSection.textFields || []}
                pageSetupFields={activeSection.pageSetupFields || []}
                lang={lang}
                onChange={val => setForm(p => ({ ...p, [activePrint]: val }))}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
