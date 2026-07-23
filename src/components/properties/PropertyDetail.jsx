import React from 'react';
import { X, Home, Ruler, BedDouble, Phone, Mail, User, StickyNote, MapPin, Pencil, Building, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/LanguageContext';

const statusColors = {
  "متاح": "from-emerald-500 to-emerald-600",
  "مؤجر": "from-blue-500 to-blue-600",
  "صيانة": "from-amber-500 to-amber-600",
  "حجز مؤقت": "from-purple-500 to-purple-600",
  "قريباً": "from-pink-500 to-pink-600",
};

export default function PropertyDetail({ property, currentUser, onClose, onEdit }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const name = lang === 'ku' && property.name_ku ? property.name_ku : property.name;
  const address = lang === 'ku' && property.address_ku ? property.address_ku : property.address;
  const description = lang === 'ku' && property.description_ku ? property.description_ku : property.description;
  const notesAr = property.notes;
  const notesKu = property.notes_ku;
  const ownerName = lang === 'ku' && property.owner_name_ku ? property.owner_name_ku : property.name;
  const isOwner = currentUser && property.created_by_id === currentUser.id;

  const hasNotesAr = notesAr && notesAr.trim();
  const hasNotesKu = notesKu && notesKu.trim();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="relative h-36 bg-slate-200 flex-shrink-0">
          {property.image_url ? (
            <>
              <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <div className="p-3 bg-white/60 rounded-full shadow-lg">
                <Building className="w-8 h-8 text-primary" />
              </div>
            </div>
          )}
          
          <button onClick={onClose} className="absolute top-2 right-2 bg-white/95 hover:bg-white rounded-full p-1.5 transition shadow-lg">
            <X className="w-3.5 h-3.5 text-slate-700" />
          </button>
          
          <Badge className={`absolute top-2 left-2 text-xs font-bold rounded-full px-2.5 py-1 shadow-lg bg-gradient-to-r ${statusColors[property.status] || 'from-gray-500 to-gray-600'}`}>
            {property.status || 'متاح'}
          </Badge>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Title & Location */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">{name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="p-0.5 bg-red-50 rounded-full">
                <MapPin className="w-3 h-3 text-red-500" />
              </div>
              <span className="truncate">{address}</span>
            </div>
          </div>

          {/* Compact Features */}
          <div className="grid grid-cols-3 gap-2 flex-wrap">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-2 text-center border border-blue-200">
              <div className="p-1 bg-blue-500 rounded-md w-fit mx-auto mb-1">
                <Home className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs text-blue-600 font-medium">{L('النوع', 'جۆر')}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{property.type}</p>
            </div>
            {property.area_sqm && (
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-2 text-center border border-green-200">
                <div className="p-1 bg-green-500 rounded-md w-fit mx-auto mb-1">
                  <Ruler className="w-3 h-3 text-white" />
                </div>
                <p className="text-xs text-green-600 font-medium">{L('المساحة', 'ڕووبەر')}</p>
                <p className="text-sm font-bold text-slate-900">{property.area_sqm} م²</p>
              </div>
            )}
            {property.rooms && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-2 text-center border border-purple-200">
                <div className="p-1 bg-purple-500 rounded-md w-fit mx-auto mb-1">
                  <BedDouble className="w-3 h-3 text-white" />
                </div>
                <p className="text-xs text-purple-600 font-medium">{L('الغرف', 'ژوور')}</p>
                <p className="text-sm font-bold text-slate-900">{property.rooms}</p>
              </div>
            )}
            {property.bathrooms && (
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-lg p-2 text-center border border-cyan-200">
                <div className="p-1 bg-cyan-500 rounded-md w-fit mx-auto mb-1">
                  <span className="text-white text-xs">🚿</span>
                </div>
                <p className="text-xs text-cyan-600 font-medium">{L('الحمام', 'ئەودەستخانە')}</p>
                <p className="text-sm font-bold text-slate-900">{property.bathrooms}</p>
              </div>
            )}
          </div>

          {/* Compact Price */}
          {property.monthly_rent && (
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-lg p-2 border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow-md shadow-amber-500/20">
                    <DollarSign className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-slate-900">{property.monthly_rent.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 mr-0.5">{L('د.ع/شهر', 'د.د/مانگانە')}</span>
                  </div>
                </div>
                {property.sale_price && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{L('للبيع', 'بۆ فرۆشتن')}</p>
                    <p className="text-sm font-bold text-slate-700">{property.sale_price.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes - Scrollable */}
          {(hasNotesAr || hasNotesKu) && (
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-lg p-2 border border-amber-200">
              <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-amber-200">
                <div className="p-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-md shadow-md">
                  <StickyNote className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-bold text-slate-900">{L('ملاحظات', 'تێبینی')}</span>
              </div>
              {hasNotesAr && (
                <div className="mb-2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5 mb-1">
                    عربي
                  </Badge>
                  <div className="text-sm text-slate-700 bg-white/60 rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto">{notesAr}</div>
                </div>
              )}
              {hasNotesKu && (
                <div className={hasNotesAr ? 'pt-2 border-t border-amber-200' : ''}>
                  <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 mb-1">
                    کوردی
                  </Badge>
                  <div className="text-sm text-slate-700 bg-white/60 rounded p-2 whitespace-pre-wrap max-h-40 overflow-y-auto">{notesKu}</div>
                </div>
              )}
            </div>
          )}

          {/* Owner */}
          {(property.owner_name || property.owner_phone || property.owner_email) && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2 border border-slate-200">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-0.5 h-3 bg-primary rounded-full" />
                <span className="text-sm font-bold text-slate-900">{L('المالك', 'خاوەن')}</span>
              </div>
              <div className="space-y-1">
                {ownerName && (
                  <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-md border border-slate-200">
                    <div className="p-1 bg-primary/10 rounded">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate">{ownerName}</span>
                  </div>
                )}
                {property.owner_phone && isOwner && (
                  <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-md border border-slate-200">
                    <div className="p-1 bg-green-500/10 rounded">
                      <Phone className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-700" dir="ltr">{property.owner_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/25" onClick={() => { onClose(); onEdit(property); }}>
              <Pencil className="w-3.5 h-3.5" /> {L('تعديل', 'دەستکاری')}
            </Button>
            <Button variant="outline" className="flex-1 py-2 rounded-lg text-sm font-bold border-2 hover:bg-slate-50" onClick={onClose}>
              {L('إغلاق', 'داخستن')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}