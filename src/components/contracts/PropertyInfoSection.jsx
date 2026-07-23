import React from 'react';
import { Building2, Calendar, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';

export default function PropertyInfoSection({ contract, property, branch }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  
  // Use branch customization or defaults
  const colors = {
    gradientStart: branch?.property_info_gradient_start || '#7c3aed',
    gradientMiddle: branch?.property_info_gradient_middle || '#a855f7',
    gradientEnd: branch?.property_info_gradient_end || '#c084fc',
    headerBgStart: branch?.property_info_header_bg_start || '#8b5cf6',
    headerBgMiddle: branch?.property_info_header_bg_middle || '#a855f7',
    headerBgEnd: branch?.property_info_header_bg_end || '#d946ef',
    cardBgStart: branch?.property_info_card_bg_start || '#f5f3ff',
    cardBgEnd: branch?.property_info_card_bg_end || '#faf5ff',
    cardBorder: branch?.property_info_card_border || '#ddd6fe',
    labelColor: branch?.property_info_label_color || '#4b5563',
    valueColor: branch?.property_info_value_color || '#1f2937',
  };
  
  const sizes = {
    title: branch?.property_info_title_size || 18,
    subtitle: branch?.property_info_subtitle_size || 11,
    label: branch?.property_info_label_size || 16,
    value: branch?.property_info_value_size || 14,
  };

  const dataItems = [
    {
      key: 'property_code',
      label: L('كود العقار', 'کۆدی موڵک'),
      value: property ? (lang === 'ku' ? (property.name_ku || property.name) : property.name) : '—',
      gradient: 'from-amber-400/40 to-yellow-400/40',
      borderColor: 'border-amber-400/40',
      accentBg: 'bg-amber-400/20',
      accentColor: 'text-amber-600',
      icon: '#',
      iconInline: true
    },
    ...(property?.type ? [{
      key: 'property_type',
      label: L('نوع العقار', 'جۆری خانووبەرە'),
      value: property.type,
      gradient: 'from-amber-500/40 to-orange-400/40',
      borderColor: 'border-amber-500/40',
      accentBg: 'bg-amber-500/20',
      accentColor: 'text-amber-700',
      icon: '🏢',
      iconInline: true
    }] : []),
    ...(property?.address || property?.address_ku ? [{
      key: 'location',
      label: L('موقع العقار', 'شوێنی خانووبەرە'),
      value: lang === 'ku' ? (property.address_ku || property.address) : property.address,
      gradient: 'from-blue-400/40 to-sky-400/40',
      borderColor: 'border-blue-400/40',
      accentBg: 'bg-blue-400/20',
      accentColor: 'text-blue-600',
      icon: '📍',
      iconInline: true
    }] : []),
    {
      key: 'purpose',
      label: L('غرض الإيجار', 'ئامانجی کرێ'),
      value: contract.purpose || '—',
      gradient: 'from-slate-400/40 to-gray-400/40',
      borderColor: 'border-slate-400/40',
      accentBg: 'bg-slate-400/20',
      accentColor: 'text-slate-600',
      icon: '🏗️',
      iconInline: true
    },
    {
      key: 'payment_method',
      label: L('طريقة الدفع', 'شێوازی پارەدان'),
      value: contract.payment_method || '—',
      gradient: 'from-amber-600/40 to-yellow-500/40',
      borderColor: 'border-amber-600/40',
      accentBg: 'bg-amber-600/20',
      accentColor: 'text-amber-700',
      icon: '💳',
      iconInline: true
    },
    {
      key: 'start_date',
      label: L('تاريخ البداية', 'بەرواری دەستپێک'),
      value: contract.start_date && format(parseISO(contract.start_date), 'dd/MM/yyyy'),
      gradient: 'from-emerald-500/40 to-green-400/40',
      borderColor: 'border-emerald-500/40',
      accentBg: 'bg-emerald-500/20',
      accentColor: 'text-emerald-600',
      icon: '📅',
      iconInline: true
    },
    {
      key: 'end_date',
      label: L('تاريخ الانتهاء', 'بەرواری کۆتایی'),
      value: contract.end_date && format(parseISO(contract.end_date), 'dd/MM/yyyy'),
      gradient: 'from-rose-400/40 to-red-400/40',
      borderColor: 'border-rose-400/40',
      accentBg: 'bg-rose-400/20',
      accentColor: 'text-rose-600',
      icon: '⏱️',
      iconInline: true
    },
    {
      key: 'duration',
      label: L('المدة', 'ماوە'),
      value: `${contract.duration_months} ${L('شهر', 'مانگ')}`,
      gradient: 'from-amber-500/40 to-orange-400/40',
      borderColor: 'border-amber-500/40',
      accentBg: 'bg-amber-500/20',
      accentColor: 'text-amber-700',
      icon: '⌛',
      iconInline: true
    }
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ 
      background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.9) 100%)`,
      boxShadow: '0 25px 80px rgba(0,0,0,0.2)'
    }}>
      {/* Glassy Outer Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100/30 via-blue-50/20 to-white/15 blur-xl" />
      
      {/* Glassmorphism Container */}
      <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/80 shadow-xl">
        {/* Glassy Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-sky-200/30 to-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/30 to-sky-100/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        {/* Header with Glassy Label Style */}
        <div className="relative mb-6">
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl shadow-lg border border-white/60 backdrop-blur-xl" style={{ 
            background: `linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(56, 189, 248, 0.1))`,
          }}>
            {/* Icon with Glassy Border */}
            <div className="w-12 h-12 rounded-xl bg-sky-50/50 backdrop-blur-xl border border-sky-200/70 flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-sky-700" />
            </div>
            <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-sky-900" style={{ fontSize: `${sizes.title}px` }}>{L('بيانات العقار والمدة', 'زانیارییەکانی خانووبەرە و ماوە')}</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-sky-200/60 to-transparent" />
            </div>
            </div>
            {/* Glassy Decorative Dots */}
            <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400/80 shadow-sm" />
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400/40" />
            </div>
            </div>
            </div>

        {/* Data Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dataItems.map((item) => (
            <div
              key={item.key}
              className="group relative rounded-xl backdrop-blur-xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))`,
                border: `1px solid rgba(255,255,255,0.6)`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.08)`
              }}
            >
              {/* Glassy Card Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-sky-50/0 group-hover:from-sky-100/40 group-hover:to-blue-100/30 transition-all duration-500 rounded-xl" />
              
              <div className="relative">
              {/* Icon with Label Badge */}
              <div className="flex items-start justify-between mb-3">
                {item.iconInline ? (
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <div className={`px-3 py-1.5 rounded-lg text-lg font-bold ${item.accentBg} ${item.accentColor} border ${item.borderColor} break-words flex items-center justify-center min-h-[40px]`}>
                      {item.label}
                    </div>
                  </div>
                  ) : (
                    <>
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.gradient} backdrop-blur-sm border ${item.borderColor} flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        {item.icon}
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${item.accentBg} ${item.accentColor} border ${item.borderColor}`}>
                        {item.label}
                      </div>
                    </>
                  )}
                </div>
                <p className="font-bold break-words mt-2" style={{ fontSize: `${sizes.value}px`, color: colors.valueColor }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}