import { MapPin, Maximize, BedDouble, Phone, MessageCircle, User, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/LanguageContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { toast } from 'sonner';

export default function PropertyListItem({ property, onView, onEdit, onDelete, creatorName }) {
  const { lang } = useLanguage();
  const L = (ar, ku) => (lang === 'ku' ? ku : ar);
  const queryClient = useQueryClient();

  const { data: statusColors } = useQuery({
    queryKey: ['property-status-colors'],
    queryFn: () => firebaseApi.entities.PropertyStatusColor.list(),
  });

  const getStatusStyle = (status) => {
    const sc = statusColors?.find((s) => s.status === status);
    if (sc && sc.is_active) {
      return { backgroundColor: sc.bg_color, color: sc.text_color, borderColor: sc.border_color };
    }
    return { backgroundColor: '#f5f5f5', color: '#333333', borderColor: '#e0e0e0' };
  };

  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      await firebaseApi.entities.Property.update(property.id, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success(L('تم تحديث الحالة', 'دۆخ نوێکرایەوە'));
    },
  });

  return (
    <div
      className="bg-card border border-border rounded-xl hover:shadow-md transition-all cursor-pointer flex items-center gap-3 p-3"
      onClick={() => onView(property)}
    >
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
        {property.image_url ? (
          <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
        ) : (
          <MapPin className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold text-sm truncate">{L(property.name, property.name_ku)}</h4>
          <Badge className="border-0 text-[10px] px-1.5 py-0 h-5" style={getStatusStyle(property.status)}>
            {property.status || 'متاح'}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          {property.project_or_area && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {L(property.project_or_area, property.project_or_area_ku)}
            </span>
          )}
          {property.area_sqm > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3 h-3" />
              {property.area_sqm} {L('م²', 'م²')}
            </span>
          )}
          {property.rooms > 0 && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" />
              {property.rooms}
            </span>
          )}
          {creatorName && (
            <span className="flex items-center gap-1 text-indigo-500">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{creatorName}</span>
            </span>
          )}
        </div>
      </div>

      <div className="text-left shrink-0">
        {property.monthly_rent > 0 && (
          <div className="text-sm font-bold text-primary">
            {property.rent_currency_symbol || ''} {property.monthly_rent?.toLocaleString()}
          </div>
        )}
        {property.sale_price > 0 && (
          <div className="text-xs text-muted-foreground">
            {L('بيع', 'فرۆشتن')}: {property.sale_currency_symbol || ''} {property.sale_price?.toLocaleString()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {property.owner_phone && (
          <a
            href={`tel:${property.owner_phone}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors"
            title={property.owner_phone}
          >
            <Phone className="w-4 h-4 text-green-600" />
          </a>
        )}
        {property.owner_phone && (
          <a
            href={`https://wa.me/${property.owner_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
          </a>
        )}
        {onEdit && (
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            onClick={() => onEdit(property)}
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {onDelete && (
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
            onClick={() => onDelete(property)}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        )}
      </div>
    </div>
  );
}