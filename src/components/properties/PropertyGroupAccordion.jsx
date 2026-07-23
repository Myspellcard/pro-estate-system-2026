import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Building2, MapPin, Maximize, BedDouble, Phone, MessageCircle, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const statusColors = {
  "متاح": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "مؤجر": "bg-blue-50 text-blue-700 border-blue-200",
  "صيانة": "bg-amber-50 text-amber-700 border-amber-200",
};

export default function PropertyGroupAccordion({ title, titleKu, properties, onEdit, onDelete, onView }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm mb-6 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-lg">{L(title, titleKu || title)}</h3>
            <p className="text-sm text-muted-foreground">{properties.length} {L('عقارات', 'خانووبەرە')}</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5 bg-muted/30">
          {properties.map(property => (
            <div
              key={property.id}
              className="bg-card rounded-xl border border-border shadow-sm hover:shadow-lg transition-all overflow-hidden group cursor-pointer"
              onClick={() => onView(property)}
            >
              <div className="h-32 bg-gradient-to-bl from-primary/10 to-primary/5 flex items-center justify-center relative">
                {property.image_url ? (
                  <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-10 h-10 text-primary/30" />
                )}
                <Badge className={`absolute top-2 right-2 text-xs border ${statusColors[property.status] || ''}`}>
                  {property.status || 'متاح'}
                </Badge>
              </div>
              <div className="p-4">
                <div className="text-center mb-3">
                  <h4 className="font-bold text-base mb-2">{L(property.name, property.name_ku)}</h4>
                  {property.monthly_rent > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-sm font-bold text-primary">{property.monthly_rent?.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <Badge className={`border-0 text-xs px-2 py-1 h-6 ${statusColors[property.status] || ''}`}>
                      {property.status || 'متاح'}
                    </Badge>
                    {property.owner_phone && (
                      <a
                        href={`tel:${property.owner_phone}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors"
                        title={property.owner_phone}
                      >
                        <Phone className="w-5 h-5 text-green-600" />
                      </a>
                    )}
                    {property.owner_phone && (
                      <a
                        href={`https://wa.me/${property.owner_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5 text-emerald-500" />
                      </a>
                    )}
                    {onEdit && (
                      <button
                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                        onClick={(e) => { e.stopPropagation(); onEdit(property); }}
                      >
                        <Pencil className="w-5 h-5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-center gap-2">
                    {property.area_sqm > 0 && (
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                        <Maximize className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{property.area_sqm} {L('م²', 'م²')}</span>
                      </div>
                    )}
                    {property.rooms > 0 && (
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                        <BedDouble className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{property.rooms} {L('غرف', 'ژوور')}</span>
                      </div>
                    )}
                  </div>
                  {property.address && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground px-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-full">{L(property.address, property.address_ku)}</span>
                    </div>
                  )}
                </div>
                {onDelete && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive text-xs"
                      onClick={() => onDelete(property)}
                    >
                      {L('حذف', 'سڕینەوە')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}