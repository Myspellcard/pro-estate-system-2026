import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DataVisibilityControls from './DataVisibilityControls';

// ─── HELPERS ───────────────────────────────────────────────────────────────────
// Items with standard read/write/delete columns
// Special items: toggleItems = just a single on/off toggle (no read/write/delete cols)

const SECTIONS = [
  {
    key: 'rent',
    icon: '🏠',
    labelAr: 'قسم الإيجار',
    labelKu: 'بەشی کرێ',
    headerColor: 'bg-blue-700',
    borderColor: 'border-blue-200',
    subSections: [
      {
        labelAr: 'العقارات',
        labelKu: 'خانووبەرەکان',
        icon: '🏢',
        items: [
          { key: 'properties', labelAr: 'إدارة العقارات (إضافة / تعديل / حذف)', labelKu: 'بەڕێوەبردنی خانووبەرەکان', icon: '🏢' },
        ],
      },
      {
        labelAr: 'المستأجرون',
        labelKu: 'کرێچییەکان',
        icon: '👤',
        items: [
          { key: 'tenants', labelAr: 'حسابات المستأجرين', labelKu: 'هەژمارەکانی کرێچی', icon: '👤' },
        ],
        toggleItems: [
          { key: 'can_call_tenants',     labelAr: 'الاتصال بالمستأجر (زر الاتصال)', labelKu: 'پەیوەندی بە کرێچی (دوگمەی پەیوەندی)', icon: '📞' },
          { key: 'can_whatsapp_tenants', labelAr: 'واتساب للمستأجر (رسائل جاهزة)',  labelKu: 'واتساپ بۆ کرێچی (نامەی ئامادە)',       icon: '💬' },
        ],
      },
      {
        labelAr: 'أصحاب العقارات',
        labelKu: 'خاوەنەکانی خانووبەر',
        icon: '🤵',
        items: [
          { key: 'property_owners', labelAr: 'بيانات أصحاب العقارات', labelKu: 'زانیاری خاوەنەکانی خانووبەر', icon: '🤵' },
        ],
        toggleItems: [
          { key: 'can_call_property_owners',     labelAr: 'الاتصال بصاحب العقار',       labelKu: 'پەیوەندی بە خاوەنی خانوو',   icon: '📞' },
          { key: 'can_whatsapp_property_owners', labelAr: 'واتساب لصاحب العقار (رسائل جاهزة)', labelKu: 'واتساپ بۆ خاوەنی خانوو', icon: '💬' },
        ],
      },
      {
        labelAr: 'العقود',
        labelKu: 'گرێبەستەکان',
        icon: '📋',
        items: [
          { key: 'contracts', labelAr: 'إنشاء وإدارة عقود الإيجار', labelKu: 'دروستکردن و بەڕێوەبردنی گرێبەستی کرێ', icon: '📋' },
        ],
        toggleItems: [
          { key: 'can_print_contracts',         labelAr: 'طباعة وتصدير العقد (PDF)', labelKu: 'چاپکردن و ناردنی گرێبەست (PDF)', icon: '🖨️' },
          { key: 'can_send_contract_whatsapp',  labelAr: 'إرسال رسالة واتساب للعقد', labelKu: 'ناردنی نامەی واتساپ بۆ گرێبەست', icon: '💬' },
        ],
      },
      {
        labelAr: 'الفواتير والدفعات',
        labelKu: 'وەسڵە و پارەدانەکان',
        icon: '💰',
        items: [
          { key: 'rent_invoices',      labelAr: 'فواتير الإيجار الشهري',   labelKu: 'وەسڵەکانی کرێی مانگانە',       icon: '💵' },
          { key: 'insurance_invoices', labelAr: 'دفعات التأمين',            labelKu: 'پارەدانەکانی بیمە',             icon: '🛡️' },
          { key: 'expense_invoices',   labelAr: 'مصروفات وصيانة',          labelKu: 'خەرجی و چاکسازی',               icon: '🔧' },
          { key: 'owner_invoices',     labelAr: 'مدفوعات لصاحب العقار',    labelKu: 'پارەدان بۆ خاوەنی خانوو',       icon: '🤝' },
        ],
        toggleItems: [
          { key: 'can_manage_insurance_refund',     labelAr: 'استرداد / مصادرة التأمين والتراجع عن القرار', labelKu: 'گەڕاندنەوە / مووچەکردنی دڵنیایی و پاشگەزبوونەوە', icon: '🔐' },
          { key: 'can_send_rent_invoice_whatsapp',  labelAr: 'واتساب إشعار دفع الإيجار',      labelKu: 'واتساپی ئاگادارکردنەوەی کرێ',   icon: '💬' },
          { key: 'can_send_owner_invoice_whatsapp', labelAr: 'واتساب إشعار دفع صاحب العقار',  labelKu: 'واتساپی ئاگادارکردنەوەی خاوەن', icon: '💬' },
        ],
      },
      {
        labelAr: 'الصيانة',
        labelKu: 'چاکسازی',
        icon: '⚙️',
        items: [
          { key: 'maintenance', labelAr: 'طلبات الصيانة', labelKu: 'داواکاریەکانی چاکسازی', icon: '⚙️' },
        ],
      },
      {
        labelAr: 'العمولات (الإيجار)',
        labelKu: 'کرێکان (کرێ)',
        icon: '-percent',
        items: [
          { key: 'commissions', labelAr: 'عمولات الإيجار (إضافة / تعديل / حذف)', labelKu: 'کرێی کرێ (زیادکردن / دەستکاری / سڕینەوە)', icon: '-percent' },
        ],
        toggleItems: [
          { key: 'can_print_commissions',       labelAr: 'طباعة وصل العمولة',             labelKu: 'چاپی وەسڵی کرێ',          icon: '🖨️' },
          { key: 'can_view_seller_commissions', labelAr: 'إظهار مبالغ عمولة المالك/البائع', labelKu: 'پیشاندانی کرێی خاوەن/فرۆشیار', icon: '👁️' },
          { key: 'can_view_buyer_commissions',  labelAr: 'إظهار مبالغ عمولة المستأجر/المشتري', labelKu: 'پیشاندانی کرێی کرێچی/کڕیار', icon: '👁️' },
        ],
      },
    ],
  },
  {
    key: 'sales',
    icon: '💼',
    labelAr: 'قسم البيع',
    labelKu: 'بەشی فرۆشتن',
    headerColor: 'bg-emerald-700',
    borderColor: 'border-emerald-200',
    subSections: [
      {
        labelAr: 'وحدات البيع',
        labelKu: 'یەکەکانی فرۆشتن',
        icon: '🏗️',
        items: [
          { key: 'sales', labelAr: 'وحدات البيع والمشاريع', labelKu: 'یەکەکانی فرۆشتن و پرۆژەکان', icon: '🏗️' },
        ],
      },
      {
        labelAr: 'عقود البيع',
        labelKu: 'گرێبەستەکانی فرۆشتن',
        icon: '📝',
        items: [
          { key: 'sale_contracts', labelAr: 'عقود البيع', labelKu: 'گرێبەستەکانی فرۆشتن', icon: '📝' },
        ],
        toggleItems: [
          { key: 'can_send_sale_contract_whatsapp', labelAr: 'واتساب لعقود البيع', labelKu: 'واتساپی گرێبەستی فرۆشتن', icon: '💬' },
        ],
      },
      {
        labelAr: 'فواتير البيع',
        labelKu: 'وەسڵەکانی فرۆشتن',
        icon: '🧾',
        items: [
          { key: 'sale_invoices', labelAr: 'فواتير البيع والدفعات', labelKu: 'وەسڵە و پارەدانەکانی فرۆشتن', icon: '🧾' },
        ],
        toggleItems: [
          { key: 'can_send_sale_invoice_whatsapp', labelAr: 'واتساب إشعار دفعات البيع', labelKu: 'واتساپی ئاگادارکردنەوەی فرۆشتن', icon: '💬' },
        ],
      },
      {
        labelAr: 'العمولات (البيع)',
        labelKu: 'کرێکان (فرۆشتن)',
        icon: '-percent',
        items: [
          { key: 'commissions', labelAr: 'عمولات البيع (إضافة / تعديل / حذف)', labelKu: 'کرێی فرۆشتن (زیادکردن / دەستکاری / سڕینەوە)', icon: '-percent' },
        ],
        toggleItems: [
          { key: 'can_print_commissions',       labelAr: 'طباعة وصل العمولة',             labelKu: 'چاپی وەسڵی کرێ',          icon: '🖨️' },
          { key: 'can_view_seller_commissions', labelAr: 'إظهار مبالغ عمولة البائع',     labelKu: 'پیشاندانی کرێی فرۆشیار',   icon: '👁️' },
          { key: 'can_view_buyer_commissions',  labelAr: 'إظهار مبالغ عمولة المشتري',    labelKu: 'پیشاندانی کرێی کڕیار',     icon: '👁️' },
        ],
      },
    ],
  },
  {
    key: 'tasks',
    icon: '✅',
    labelAr: 'المهام',
    labelKu: 'ئەرکەکان',
    headerColor: 'bg-indigo-700',
    borderColor: 'border-indigo-200',
    subSections: [
      {
        labelAr: 'إدارة المهام',
        labelKu: 'بەڕێوەبردنی ئەرکەکان',
        icon: '📋',
        items: [
          { key: 'tasks', labelAr: 'المهام (إنشاء / تعديل / حذف)', labelKu: 'ئەرکەکان (دروستکردن / دەستکاری / سڕینەوە)', icon: '✅' },
        ],
        toggleItems: [
          { key: 'can_comment_tasks', labelAr: 'إضافة تعليقات على المهام',     labelKu: 'زیادکردنی لێدوان بۆ ئەرکەکان',       icon: '💬' },
          { key: 'can_share_tasks',   labelAr: 'مشاركة رابط المهمة (Public URL)', labelKu: 'هاوبەشکردنی لینکی ئەرک (ئاشکرا)',  icon: '🔗' },
          { key: 'can_tag_tasks',     labelAr: 'إضافة وسوم (Tags) للمهام',     labelKu: 'زیادکردنی تاگەکان بۆ ئەرکەکان',    icon: '🏷️' },
          { key: 'can_assign_tasks',  labelAr: 'تعيين مشاركين وإرسال المهام للآخرين', labelKu: 'دیاریکردنی بەشدار و ناردنی ئەرک بۆ تر', icon: '📤' },
          { key: 'can_group_tasks',   labelAr: 'إدارة مجموعات المهام',          labelKu: 'بەڕێوەبردنی گروپەکانی ئەرک',        icon: '👥' },
          { key: 'can_hr_tasks',      labelAr: 'تقييم HR للمهام (قرار الموارد البشرية)', labelKu: 'هەلسەنگاندنی HR بۆ ئەرکەکان', icon: '🏅' },
          { key: 'can_rate_tasks',    labelAr: 'تقييم المهام بالنجوم',          labelKu: 'هەلسەنگاندنی ئەرکەکان بە ئەستێرە', icon: '⭐' },
          { key: 'can_evaluate_goals', labelAr: 'تقييم أهداف الموظفين وتحديد المستوى', labelKu: 'هەلسەنگاندنی ئامانجەکانی کارمەندان و دیاریکردنی ئاست', icon: '🎯' },
        ],
      },
    ],
  },
  {
    key: 'reports',
    icon: '📊',
    labelAr: 'التقارير والتحليلات',
    labelKu: 'ڕاپۆرت و شیکاری',
    headerColor: 'bg-purple-700',
    borderColor: 'border-purple-200',
    subSections: [
      {
        labelAr: 'التقارير',
        labelKu: 'ڕاپۆرتەکان',
        icon: '📑',
        viewOnlyItems: [
          { key: 'analytics', labelAr: 'التحليلات والإحصائيات', labelKu: 'شیکاری و ئامار', icon: '📈' },
          { key: 'reports',   labelAr: 'التقارير المالية',       labelKu: 'ڕاپۆرتە دارایییەکان', icon: '📑' },
        ],
      },
    ],
  },
  {
    key: 'dashboard',
    icon: '🖥️',
    labelAr: 'لوحة التحكم',
    labelKu: 'پانێلی کنترۆل',
    headerColor: 'bg-teal-700',
    borderColor: 'border-teal-200',
    subSections: [
      {
        labelAr: 'عناصر لوحة التحكم المرئية',
        labelKu: 'پێکهاتەکانی داشبۆرد',
        icon: '🖥️',
        widgetItems: [
          { key: 'dash_stats',              labelAr: 'الإحصائيات العامة',         labelKu: 'ئامارە گشتییەکان',              icon: '📊' },
          { key: 'dash_branch_summary',     labelAr: 'ملخص الفروع',               labelKu: 'پوختەی لقەکان',                 icon: '🏢' },
          { key: 'dash_contracts',          labelAr: 'آخر العقود',                 labelKu: 'دوایین گرێبەستەکان',            icon: '📋' },
          { key: 'dash_invoices',           labelAr: 'الفواتير المعلقة',           labelKu: 'وەسڵە مەوقوفەکان',              icon: '💰' },
          { key: 'dash_maintenance',        labelAr: 'طلبات الصيانة',             labelKu: 'داواکاری چاکسازی',               icon: '🔧' },
          { key: 'dash_upcoming_payments',  labelAr: 'الدفعات القادمة',           labelKu: 'پارەدانەکانی نزیک',              icon: '⏰' },
          { key: 'dash_expiring_contracts', labelAr: 'العقود المنتهية قريباً',    labelKu: 'گرێبەستی نزیک بە کۆتایی',       icon: '📅' },
          { key: 'dash_overdue',            labelAr: 'القائمة السوداء',            labelKu: 'لیستی ڕەش',                     icon: '🚫' },
        ],
      },
    ],
  },
  {
    key: 'system',
    icon: '⚙️',
    labelAr: 'إدارة النظام',
    labelKu: 'بەڕێوەبردنی سیستەم',
    headerColor: 'bg-rose-700',
    borderColor: 'border-rose-200',
    subSections: [
      {
        labelAr: 'صلاحيات النظام',
        labelKu: 'ڕێگەپێدانەکانی سیستەم',
        icon: '🔐',
        widgetItems: [
          { key: 'can_manage_branches', labelAr: 'إدارة الفروع والشركات',        labelKu: 'بەڕێوەبردنی لق و کۆمپانیاکان', icon: '🏢' },
          { key: 'can_manage_users',    labelAr: 'إدارة المستخدمين والصلاحيات', labelKu: 'بەڕێوەبردنی بەکارهێنەران',      icon: '👥' },
          { key: 'can_backup',           labelAr: 'النسخ الاحتياطي',               labelKu: 'بەکاپی داتا',                     icon: '💾' },
        ],
      },
    ],
  },
  {
    key: 'crm',
    icon: '🎯',
    labelAr: 'العملاء المحتملون (CRM)',
    labelKu: 'کڕیارانی ئەگەری (CRM)',
    headerColor: 'bg-cyan-700',
    borderColor: 'border-cyan-200',
    subSections: [
      {
        labelAr: 'إدارة العملاء المحتملين',
        labelKu: 'بەڕێوەبردنی کڕیارانی ئەگەری',
        icon: '🎯',
        items: [
          { key: 'crm', labelAr: 'العملاء المحتملون (إضافة / تعديل / حذف)', labelKu: 'کڕیارانی ئەگەری (زیادکردن / دەستکاری / سڕینەوە)', icon: '🎯' },
        ],
        toggleItems: [
          { key: 'can_manage_crm_settings', labelAr: 'إدارة إعدادات CRM', labelKu: 'بەڕێوەبردنی ڕێکخستنەکانی CRM', icon: '⚙️' },
        ],
      },
    ],
  },
  {
    key: 'finance',
    icon: '💹',
    labelAr: 'القسم المالي',
    labelKu: 'بەشی دارایی',
    headerColor: 'bg-green-700',
    borderColor: 'border-green-200',
    subSections: [
      {
        labelAr: 'القسم المالي',
        labelKu: 'بەشی دارایی',
        icon: '💹',
        items: [
          { key: 'finance', labelAr: 'القسم المالي (إدارة)', labelKu: 'بەشی دارایی (بەڕێوەبردن)', icon: '💹' },
        ],
      },
    ],
  },
  {
    key: 'approvals',
    icon: '✍️',
    labelAr: 'الموافقات والقروض',
    labelKu: 'پەسەندکردن و قەرزەکان',
    headerColor: 'bg-amber-700',
    borderColor: 'border-amber-200',
    subSections: [
      {
        labelAr: 'طلبات الموافقة',
        labelKu: 'داواکاریەکانی پەسەندکردن',
        icon: '✍️',
        viewOnlyItems: [
          { key: 'permissions_required', labelAr: 'طلبات الإذن والمهل', labelKu: 'داواکاری مۆڵەت و مەهلت', icon: '📋' },
          { key: 'products_required',    labelAr: 'طلبات المشتريات',    labelKu: 'داواکاری کڕینەکان',       icon: '📦' },
          { key: 'loans_required',        labelAr: 'طلبات القروض',        labelKu: 'داواکاری قەرز',           icon: '💰' },
        ],
      },
    ],
  },
  {
    key: 'hr',
    icon: '👔',
    labelAr: 'الموارد البشرية',
    labelKu: 'سەرچاوەی مرۆیی',
    headerColor: 'bg-pink-700',
    borderColor: 'border-pink-200',
    subSections: [
      {
        labelAr: 'الموظفون والأقسام',
        labelKu: 'کارمەندان و بەشەکان',
        icon: '👔',
        items: [
          { key: 'employees',   labelAr: 'الموظفون (إضافة / تعديل / حذف)', labelKu: 'کارمەندان (زیادکردن / دەستکاری / سڕینەوە)', icon: '👤' },
          { key: 'departments', labelAr: 'الأقسام (إضافة / تعديل / حذف)',  labelKu: 'بەشەکان (زیادکردن / دەستکاری / سڕینەوە)',   icon: '🏢' },
        ],
      },
      {
        labelAr: 'التقارير والأهداف',
        labelKu: 'ڕاپۆرت و ئامانجەکان',
        icon: '📊',
        viewOnlyItems: [
          { key: 'hr_reports',     labelAr: 'تقارير الموارد البشرية', labelKu: 'ڕاپۆرتی سەرچاوەی مرۆیی', icon: '📊' },
          { key: 'employee_goals', labelAr: 'أهداف الموظفين',          labelKu: 'ئامانجەکانی کارمەندان', icon: '🎯' },
          { key: 'org_structure',  labelAr: 'الهيكل التنظيمي',          labelKu: 'هەیکەلی ڕێکخستن',       icon: '🏗️' },
        ],
      },
    ],
  },
  {
    key: 'projects_cat',
    icon: '📁',
    labelAr: 'المشاريع والتصنيفات',
    labelKu: 'پڕۆژە و پۆلێنکردن',
    headerColor: 'bg-teal-700',
    borderColor: 'border-teal-200',
    subSections: [
      {
        labelAr: 'المشاريع',
        labelKu: 'پڕۆژەکان',
        icon: '📁',
        items: [
          { key: 'projects', labelAr: 'المشاريع (إضافة / تعديل / حذف)', labelKu: 'پڕۆژەکان (زیادکردن / دەستکاری / سڕینەوە)', icon: '📁' },
        ],
      },
      {
        labelAr: 'التصنيفات',
        labelKu: 'پۆلێنکردن',
        icon: '🗂️',
        items: [
          { key: 'rent_categories', labelAr: 'تصنيفات الإيجار (إضافة / تعديل / حذف)', labelKu: 'پۆلی کرێ (زیادکردن / دەستکاری / سڕینەوە)', icon: '🗂️' },
          { key: 'sale_categories', labelAr: 'تصنيفات البيع (إضافة / تعديل / حذف)',  labelKu: 'پۆلی فرۆشتن (زیادکردن / دەستکاری / سڕینەوە)', icon: '🗂️' },
        ],
      },
      {
        labelAr: 'بنود العقود',
        labelKu: 'بەندەکانی گرێبەست',
        icon: '📝',
        items: [
          { key: 'rent_clauses', labelAr: 'بنود عقد الإيجار (إضافة / تعديل / حذف)', labelKu: 'بەندەکانی گرێبەستی کرێ (زیادکردن / دەستکاری / سڕینەوە)', icon: '📝' },
          { key: 'sale_clauses', labelAr: 'بنود عقد البيع (إضافة / تعديل / حذف)',  labelKu: 'بەندەکانی گرێبەستی فرۆشتن (زیادکردن / دەستکاری / سڕینەوە)', icon: '📝' },
        ],
      },
    ],
  },
  {
    key: 'admin_settings',
    icon: '⚙️',
    labelAr: 'إعدادات النظام',
    labelKu: 'ڕێکخستنەکانی سیستەم',
    headerColor: 'bg-slate-700',
    borderColor: 'border-slate-200',
    subSections: [
      {
        labelAr: 'إعدادات لوحة التحكم والطباعة',
        labelKu: 'ڕێکخستنی داشبۆرد و چاپ',
        icon: '⚙️',
        widgetItems: [
          { key: 'can_manage_dashboard_settings', labelAr: 'إعدادات لوحة التحكم', labelKu: 'ڕێکخستنی داشبۆرد',     icon: '🖥️' },
          { key: 'can_manage_print_settings',      labelAr: 'إعدادات الطباعة',       labelKu: 'ڕێکخستنی چاپ',        icon: '🖨️' },
          { key: 'can_manage_numbering_settings',   labelAr: 'ترقيم المستندات',       labelKu: 'ژمارەدانی بەڵگەنامە', icon: '🔢' },
        ],
      },
      {
        labelAr: 'إعدادات العقارات',
        labelKu: 'ڕێکخستنی خانووبەرە',
        icon: '🏢',
        widgetItems: [
          { key: 'can_manage_property_status_colors', labelAr: 'ألوان حالات العقار', labelKu: 'ڕەنگەکانی دۆخی خانوو', icon: '🎨' },
          { key: 'can_manage_property_purposes',        labelAr: 'أغراض العقار',         labelKu: 'مەبەستەکانی خانوو',    icon: '🎯' },
          { key: 'can_manage_property_labels',           labelAr: 'تسميات العقار',        labelKu: 'تاگەکانی خانوو',       icon: '🏷️' },
        ],
      },
      {
        labelAr: 'إعدادات الرسائل والترجمات',
        labelKu: 'ڕێکخستنی نامە و وەرگێڕان',
        icon: '💬',
        widgetItems: [
          { key: 'can_manage_whatsapp_templates', labelAr: 'قوالب واتساب',  labelKu: 'داڕشتنەکانی واتساپ', icon: '💬' },
          { key: 'can_manage_translations',        labelAr: 'الترجمات',      labelKu: 'وەرگێڕانەکان',       icon: '🌐' },
        ],
      },
      {
        labelAr: 'إعدادات أخرى',
        labelKu: 'ڕێکخستنی تر',
        icon: '🔧',
        widgetItems: [
          { key: 'can_manage_barcode_settings',  labelAr: 'إعدادات الباركود',  labelKu: 'ڕێکخستنی بارکۆد',  icon: '📱' },
          { key: 'can_manage_barcode_statuses',  labelAr: 'حالات الباركود',     labelKu: 'دۆخەکانی بارکۆد',  icon: '📋' },
          { key: 'can_manage_advertisements',    labelAr: 'الإعلانات',          labelKu: 'ڕیکلامەکان',       icon: '📢' },
          { key: 'can_manage_currencies',         labelAr: 'العملات',            labelKu: 'دراوەکان',        icon: '💵' },
          { key: 'can_manage_task_colors',        labelAr: 'ألوان المهام',       labelKu: 'ڕەنگەکانی ئەرک',  icon: '🎨' },
        ],
      },
    ],
  },
  {
    key: 'approval_settings',
    icon: '🔑',
    labelAr: 'إعدادات الموافقات',
    labelKu: 'ڕێکخستنی پەسەندکردن',
    headerColor: 'bg-orange-700',
    borderColor: 'border-orange-200',
    subSections: [
      {
        labelAr: 'الموافقون',
        labelKu: 'پەسەندکەران',
        icon: '🔑',
        widgetItems: [
          { key: 'can_manage_loan_approvers',       labelAr: 'إعدادات القروض',   labelKu: 'ڕێکخستنی قەرز',   icon: '💰' },
          { key: 'can_manage_permission_approvers',  labelAr: 'إعدادات الإذن',     labelKu: 'ڕێکخستنی مۆڵەت', icon: '📋' },
          { key: 'can_manage_products_approvers',     labelAr: 'إعدادات المنتجات',  labelKu: 'ڕێکخستنی بەرهەم', icon: '📦' },
        ],
      },
    ],
  },
];

// ─── ROLE PRESETS ──────────────────────────────────────────────────────────────
export const ROLE_PRESETS = {
  admin: {
    can_view_properties: true,   can_edit_properties: true,   can_delete_properties: true,
    can_view_tenants: true,      can_edit_tenants: true,      can_delete_tenants: true,
    can_call_tenants: true,      can_whatsapp_tenants: true,
    can_view_property_owners: true, can_edit_property_owners: true, can_delete_property_owners: true,
    can_call_property_owners: true, can_whatsapp_property_owners: true,
    can_view_contracts: true,    can_edit_contracts: true,    can_delete_contracts: true,
    can_print_contracts: true,   can_send_contract_whatsapp: true,
    can_view_rent_invoices: true,      can_edit_rent_invoices: true,      can_delete_rent_invoices: true,
    can_send_rent_invoice_whatsapp: true,
    can_view_insurance_invoices: true, can_edit_insurance_invoices: true, can_delete_insurance_invoices: true,
    can_manage_insurance_refund: true,
    can_view_expense_invoices: true,   can_edit_expense_invoices: true,   can_delete_expense_invoices: true,
    can_view_owner_invoices: true,     can_edit_owner_invoices: true,     can_delete_owner_invoices: true,
    can_send_owner_invoice_whatsapp: true,
    can_view_maintenance: true,  can_edit_maintenance: true,  can_delete_maintenance: true,
    can_view_sales: true,        can_edit_sales: true,        can_delete_sales: true,
    can_view_sale_contracts: true, can_edit_sale_contracts: true, can_delete_sale_contracts: true,
    can_send_sale_contract_whatsapp: true,
    can_view_sale_invoices: true,  can_edit_sale_invoices: true,  can_delete_sale_invoices: true,
    can_send_sale_invoice_whatsapp: true,
    can_view_commissions: true, can_edit_commissions: true, can_delete_commissions: true,
    can_print_commissions: true, can_view_seller_commissions: true, can_view_buyer_commissions: true,
    can_view_tasks: true, can_edit_tasks: true, can_delete_tasks: true,
    can_comment_tasks: true, can_share_tasks: true, can_tag_tasks: true,
    can_assign_tasks: true, can_group_tasks: true, can_hr_tasks: true, can_rate_tasks: true,
    can_evaluate_goals: true,
    can_view_analytics: true, can_view_reports: true,
    can_manage_branches: true, can_manage_users: true,
    dash_stats: true, dash_branch_summary: true, dash_contracts: true, dash_invoices: true,
    dash_maintenance: true, dash_upcoming_payments: true, dash_expiring_contracts: true, dash_overdue: true,
  },
  manager: {
    can_view_properties: true,   can_edit_properties: true,   can_delete_properties: false,
    can_view_tenants: true,      can_edit_tenants: true,      can_delete_tenants: false,
    can_call_tenants: true,      can_whatsapp_tenants: true,
    can_view_property_owners: true, can_edit_property_owners: true, can_delete_property_owners: false,
    can_call_property_owners: true, can_whatsapp_property_owners: true,
    can_view_contracts: true,    can_edit_contracts: true,    can_delete_contracts: false,
    can_print_contracts: true,   can_send_contract_whatsapp: true,
    can_view_rent_invoices: true,      can_edit_rent_invoices: true,      can_delete_rent_invoices: false,
    can_send_rent_invoice_whatsapp: true,
    can_view_insurance_invoices: true, can_edit_insurance_invoices: true, can_delete_insurance_invoices: false,
    can_manage_insurance_refund: true,
    can_view_expense_invoices: true,   can_edit_expense_invoices: true,   can_delete_expense_invoices: false,
    can_view_owner_invoices: true,     can_edit_owner_invoices: true,     can_delete_owner_invoices: false,
    can_send_owner_invoice_whatsapp: true,
    can_view_maintenance: true,  can_edit_maintenance: true,  can_delete_maintenance: false,
    can_view_sales: true,        can_edit_sales: true,        can_delete_sales: false,
    can_view_sale_contracts: true, can_edit_sale_contracts: true, can_delete_sale_contracts: false,
    can_send_sale_contract_whatsapp: true,
    can_view_sale_invoices: true,  can_edit_sale_invoices: true,  can_delete_sale_invoices: false,
    can_send_sale_invoice_whatsapp: true,
    can_view_commissions: true, can_edit_commissions: true, can_delete_commissions: false,
    can_print_commissions: true, can_view_seller_commissions: true, can_view_buyer_commissions: true,
    can_view_tasks: true, can_edit_tasks: true, can_delete_tasks: false,
    can_comment_tasks: true, can_share_tasks: true, can_tag_tasks: true,
    can_assign_tasks: true, can_group_tasks: true, can_hr_tasks: true, can_rate_tasks: true,
    can_evaluate_goals: true,
    can_view_analytics: true, can_view_reports: true,
    can_manage_branches: false, can_manage_users: false,
    dash_stats: true, dash_branch_summary: true, dash_contracts: true, dash_invoices: true,
    dash_maintenance: true, dash_upcoming_payments: true, dash_expiring_contracts: true, dash_overdue: true,
  },
  accountant: {
    can_view_properties: true,   can_edit_properties: false,  can_delete_properties: false,
    can_view_tenants: true,      can_edit_tenants: false,     can_delete_tenants: false,
    can_call_tenants: true,      can_whatsapp_tenants: true,
    can_view_property_owners: true, can_edit_property_owners: false, can_delete_property_owners: false,
    can_call_property_owners: true, can_whatsapp_property_owners: true,
    can_view_contracts: true,    can_edit_contracts: false,   can_delete_contracts: false,
    can_print_contracts: true,   can_send_contract_whatsapp: false,
    can_view_rent_invoices: true,      can_edit_rent_invoices: true,      can_delete_rent_invoices: false,
    can_send_rent_invoice_whatsapp: true,
    can_view_insurance_invoices: true, can_edit_insurance_invoices: true, can_delete_insurance_invoices: false,
    can_manage_insurance_refund: false,
    can_view_expense_invoices: true,   can_edit_expense_invoices: true,   can_delete_expense_invoices: false,
    can_view_owner_invoices: true,     can_edit_owner_invoices: true,     can_delete_owner_invoices: false,
    can_send_owner_invoice_whatsapp: true,
    can_view_maintenance: false, can_edit_maintenance: false, can_delete_maintenance: false,
    can_view_sales: false,       can_edit_sales: false,       can_delete_sales: false,
    can_view_sale_contracts: true, can_edit_sale_contracts: false, can_delete_sale_contracts: false,
    can_send_sale_contract_whatsapp: false,
    can_view_sale_invoices: true,  can_edit_sale_invoices: true,   can_delete_sale_invoices: false,
    can_send_sale_invoice_whatsapp: true,
    can_view_commissions: true, can_edit_commissions: true, can_delete_commissions: false,
    can_print_commissions: true, can_view_seller_commissions: true, can_view_buyer_commissions: true,
    can_view_tasks: true, can_edit_tasks: false, can_delete_tasks: false,
    can_comment_tasks: true, can_share_tasks: false, can_tag_tasks: false,
    can_assign_tasks: false, can_group_tasks: false, can_hr_tasks: false, can_rate_tasks: false,
    can_evaluate_goals: false,
    can_view_analytics: true, can_view_reports: true,
    can_manage_branches: false, can_manage_users: false,
    dash_stats: true, dash_branch_summary: false, dash_contracts: true, dash_invoices: true,
    dash_maintenance: false, dash_upcoming_payments: true, dash_expiring_contracts: true, dash_overdue: true,
  },
  viewer: {
    can_view_properties: true,   can_edit_properties: false,  can_delete_properties: false,
    can_view_tenants: true,      can_edit_tenants: false,     can_delete_tenants: false,
    can_call_tenants: false,     can_whatsapp_tenants: false,
    can_view_property_owners: false, can_edit_property_owners: false, can_delete_property_owners: false,
    can_call_property_owners: false, can_whatsapp_property_owners: false,
    can_view_contracts: true,    can_edit_contracts: false,   can_delete_contracts: false,
    can_print_contracts: false,  can_send_contract_whatsapp: false,
    can_view_rent_invoices: true,      can_edit_rent_invoices: false,     can_delete_rent_invoices: false,
    can_send_rent_invoice_whatsapp: false,
    can_view_insurance_invoices: true, can_edit_insurance_invoices: false, can_delete_insurance_invoices: false,
    can_manage_insurance_refund: false,
    can_view_expense_invoices: false,  can_edit_expense_invoices: false,  can_delete_expense_invoices: false,
    can_view_owner_invoices: false,    can_edit_owner_invoices: false,    can_delete_owner_invoices: false,
    can_send_owner_invoice_whatsapp: false,
    can_view_maintenance: true,  can_edit_maintenance: false, can_delete_maintenance: false,
    can_view_sales: false,       can_edit_sales: false,       can_delete_sales: false,
    can_view_sale_contracts: false, can_edit_sale_contracts: false, can_delete_sale_contracts: false,
    can_send_sale_contract_whatsapp: false,
    can_view_sale_invoices: false,  can_edit_sale_invoices: false,  can_delete_sale_invoices: false,
    can_send_sale_invoice_whatsapp: false,
    can_view_tasks: true, can_edit_tasks: false, can_delete_tasks: false,
    can_comment_tasks: false, can_share_tasks: false, can_tag_tasks: false,
    can_assign_tasks: false, can_group_tasks: false, can_hr_tasks: false, can_rate_tasks: false,
    can_evaluate_goals: false,
    can_view_analytics: true, can_view_reports: false,
    can_manage_branches: false, can_manage_users: false,
    dash_stats: true, dash_branch_summary: false, dash_contracts: true, dash_invoices: true,
    dash_maintenance: true, dash_upcoming_payments: true, dash_expiring_contracts: false, dash_overdue: false,
  },
};

// All permission keys set to true — applied when any role is selected so the
// user gets full access ("everything ticked") for the chosen role.
const ALL_PERMS_TRUE = (() => {
  const map = {};
  for (const section of SECTIONS) {
    for (const sub of section.subSections) {
      if (sub.items) for (const it of sub.items) {
        map[`can_view_${it.key}`] = true;
        map[`can_edit_${it.key}`] = true;
        map[`can_delete_${it.key}`] = true;
      }
      if (sub.toggleItems) for (const t of sub.toggleItems) map[t.key] = true;
      if (sub.viewOnlyItems) for (const v of sub.viewOnlyItems) map[`can_view_${v.key}`] = true;
      if (sub.widgetItems) for (const w of sub.widgetItems) map[w.key] = true;
    }
  }
  return map;
})();

export const ROLES = [
  { value: 'admin',      labelAr: 'مدير',    labelKu: 'بەڕێوەبەر',   color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'manager',    labelAr: 'مشرف',    labelKu: 'سەرپەرشتیار', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'accountant', labelAr: 'محاسب',   labelKu: 'ژمێریار',     color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'viewer',     labelAr: 'مشاهد',   labelKu: 'بیننەر',      color: 'bg-gray-100 text-gray-600 border-gray-300' },
];

// ─── TOGGLE ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, color = 'bg-[#1a2744]' }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? color : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

// ─── SUB-SECTION ───────────────────────────────────────────────────────────────
function SubSection({ sub, form, toggle, setForm, L }) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Sub-header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-sm">{sub.icon}</span>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{L(sub.labelAr, sub.labelKu)}</span>
      </div>

      {/* read/write/delete items */}
      {sub.items && sub.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold border-b border-gray-100">
                <th className="text-right px-4 py-1.5 font-bold">{L('العملية', 'کار')}</th>
                <th className="py-1.5 text-center w-14">
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                    {L('قراءة', 'خوێندن')}
                  </span>
                </th>
                <th className="py-1.5 text-center w-14">
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    {L('كتابة', 'نووسین')}
                  </span>
                </th>
                <th className="py-1.5 text-center w-14">
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    {L('حذف', 'سڕینەوە')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sub.items.map((item, i) => (
                <tr key={item.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <span className="text-sm text-gray-700 font-medium">{L(item.labelAr, item.labelKu)}</span>
                    </div>
                  </td>
                  <td className="py-2 text-center"><div className="flex justify-center"><Toggle checked={!!form[`can_view_${item.key}`]} onChange={() => toggle(`can_view_${item.key}`)} color="bg-blue-500" /></div></td>
                  <td className="py-2 text-center"><div className="flex justify-center"><Toggle checked={!!form[`can_edit_${item.key}`]} onChange={() => toggle(`can_edit_${item.key}`)} color="bg-amber-500" /></div></td>
                  <td className="py-2 text-center"><div className="flex justify-center"><Toggle checked={!!form[`can_delete_${item.key}`]} onChange={() => toggle(`can_delete_${item.key}`)} color="bg-red-500" /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* single toggle items (call / whatsapp / special abilities) */}
      {sub.toggleItems && sub.toggleItems.map((ti, i) => (
        <div key={ti.key} className={`flex items-center justify-between px-4 py-2.5 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm shrink-0">{ti.icon}</span>
            <span className="text-sm text-gray-700 font-medium">{L(ti.labelAr, ti.labelKu)}</span>
          </div>
          <Toggle checked={!!form[ti.key]} onChange={() => toggle(ti.key)} color="bg-indigo-500" />
        </div>
      ))}

      {/* view-only items */}
      {sub.viewOnlyItems && sub.viewOnlyItems.map((item, i) => (
        <div key={item.key} className={`flex items-center justify-between px-4 py-2.5 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{item.icon}</span>
            <span className="text-sm text-gray-700 font-medium">{L(item.labelAr, item.labelKu)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-medium">{L('عرض فقط', 'بینین تەنها')}</span>
            <Toggle checked={!!form[`can_view_${item.key}`]} onChange={() => toggle(`can_view_${item.key}`)} color="bg-blue-500" />
          </div>
        </div>
      ))}

      {/* widget/boolean items */}
      {sub.widgetItems && sub.widgetItems.map((w, i) => (
        <div key={w.key} className={`flex items-center justify-between px-4 py-2.5 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{w.icon}</span>
            <span className="text-sm text-gray-700 font-medium">{L(w.labelAr, w.labelKu)}</span>
          </div>
          <Toggle checked={form[w.key] !== false} onChange={v => setForm(prev => ({ ...prev, [w.key]: v }))} color="bg-teal-500" />
        </div>
      ))}
    </div>
  );
}

// ─── SECTION BLOCK ─────────────────────────────────────────────────────────────
function SectionBlock({ section, form, toggle, setForm, L, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${section.borderColor}`}>
      <button type="button" onClick={() => setOpen(p => !p)}
        className={`w-full flex items-center justify-between px-4 py-3 text-white font-bold text-sm ${section.headerColor}`}>
        <span className="flex items-center gap-2">
          <span className="text-base">{section.icon}</span>
          {L(section.labelAr, section.labelKu)}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="bg-white divide-y divide-gray-100">
          {section.subSections.map(sub => (
            <SubSection key={sub.labelAr} sub={sub} form={form} toggle={toggle} setForm={setForm} L={L} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function UserPermissionsEditor({ form, setForm, lang }) {
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const applyPreset = (role) => setForm(prev => ({ ...prev, role, ...ALL_PERMS_TRUE }));
  const toggle = (key) => setForm(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {/* Role Presets */}
      <div>
        <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
          {L('الدور — اختر قالباً أو خصص يدوياً', 'ڕۆڵ — قاڵبێک هەڵبژێرە یان دەستی دیاری بکە')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map(r => {
            const isActive = form.role === r.value;
            return (
              <button key={r.value} type="button" onClick={() => applyPreset(r.value)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all text-xs font-bold
                  ${isActive ? r.color + ' border-current shadow-md scale-[1.02]' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'}`}>
                <span className="text-lg">{r.value === 'admin' ? '🛡️' : r.value === 'manager' ? '👔' : r.value === 'accountant' ? '📊' : '👁️'}</span>
                {L(r.labelAr, r.labelKu)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section, idx) => (
          <SectionBlock key={section.key} section={section} form={form} toggle={toggle} setForm={setForm} L={L} defaultOpen={idx === 0} />
        ))}
      </div>

      {/* Data Visibility & Access Control */}
      <DataVisibilityControls form={form} setForm={setForm} lang={lang} />
    </div>
  );
}