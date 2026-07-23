import React, { useState } from 'react';
import { Building2, MapPin, Maximize, BedDouble, Phone, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/context/LanguageContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function PropertyGridCard({ property, onEdit, onDelete, onView }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => lang === 'ku' ? ku : ar;
  const [statusOpen, setStatusOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: statusColors } = useQuery({
    queryKey: ['property-status-colors'],
    queryFn: () => firebaseApi.entities.PropertyStatusColor.list(),
  });

  const getStatusStyle = (status) => {
    const statusColor = statusColors?.find(s => s.status === status);
    if (statusColor && statusColor.is_active) {
      return {
        backgroundColor: statusColor.bg_color,
        color: statusColor.text_color,
        borderColor: statusColor.border_color,
      };
    }
    return {
      backgroundColor: '#f5f5f5',
      color: '#333333',
      borderColor: '#e0e0e0',
    };
  };

  const statuses = ['متاح', 'حجز مؤقت'];

  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await firebaseApi.entities.Property.update(property.id, { status: newStatus });
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(L(`تم تغيير الحالة إلى ${newStatus}`, `دۆخ گۆڕا بۆ ${newStatus}`));
      setStatusOpen(false);
    },
  });

  return (
    <div
      className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all group cursor-pointer"
      onClick={() => onView(property)}
    >
      <div className="h-40 bg-gradient-to-bl from-primary/10 to-primary/5 flex items-center justify-center relative">
        {property.image_url ? (
          <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
        ) : (
          <Building2 className="w-12 h-12 text-primary/30" />
        )}
        <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <Badge className="border cursor-pointer hover:shadow-md" style={getStatusStyle(property.status)} onClick={e => e.stopPropagation()}>
                {property.status || 'متاح'}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-2" side="bottom" align="end">
              <div className="space-y-1">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => statusMutation.mutate(status)}
                    disabled={statusMutation.isPending}
                    className={`w-full px-3 py-2 text-xs rounded-md text-left transition-colors ${
                      property.status === status
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {property.project_or_area && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-semibold text-primary border border-primary/20 z-10">
            {L(property.project_or_area, property.project_or_area_ku)}
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="text-center mb-4">
          <h3 className="font-bold text-lg mb-2">{L(property.name, property.name_ku)}</h3>
          {property.monthly_rent > 0 && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm font-bold text-primary">
                {property.rent_currency_symbol || property.currency_symbol || ''} {property.monthly_rent?.toLocaleString()}
              </span>
            </div>
          )}
          {property.sale_price > 0 && (
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xs text-muted-foreground">
                {L('بيع', 'فرۆشتن')}: {property.sale_currency_symbol || property.currency_symbol || ''} {property.sale_price?.toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {property.area_sqm > 0 && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
                <Maximize className="w-4 h-4" />
                <span className="font-medium">{property.area_sqm} {L('م²', 'م²')}</span>
              </div>
            )}
            {property.rooms > 0 && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
                <BedDouble className="w-4 h-4" />
                <span className="font-medium">{property.rooms} {L('غرف', 'ژوور')}</span>
              </div>
            )}
          </div>
          {property.address && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground px-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-full">{L(property.address, property.address_ku)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 pt-3 border-t">
          <Badge className="border-0 text-xs px-2 py-1 h-6" style={getStatusStyle(property.status)}>
            {property.status || 'متاح'}
          </Badge>
          {property.owner_phone && (
            <a
              href={`tel:${property.owner_phone}`}
              onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
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
          {onDelete && (
            <button
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); onDelete(property); }}
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}