import React, { useState } from 'react';
import { Bell, Check, Trash2, X, MessageCircle, Phone, Clock, Receipt, FileText, Wrench, Settings, AlertCircle, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { firebaseApi } from '@/api/firebaseClient';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { format, parseISO } from 'date-fns';

const TYPE_ICONS = {
  payment: { icon: Receipt, color: 'bg-green-500/20 text-green-400' },
  contract: { icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
  maintenance: { icon: Wrench, color: 'bg-orange-500/20 text-orange-400' },
  system: { icon: Settings, color: 'bg-gray-500/20 text-gray-400' },
  reminder: { icon: AlertCircle, color: 'bg-purple-500/20 text-purple-400' },
};

export default function NotificationsPanel({ onClose }) {
  const { lang } = useLanguage();
  const L = (a, ku) => lang === 'ku' ? ku : a;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => firebaseApi.entities.Notification.list('-created_date', 50),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Clear badge when marking as read
      if ('clearAppBadge' in navigator) navigator.clearAppBadge();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => firebaseApi.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Clear badge when deleting
      if ('clearAppBadge' in navigator) navigator.clearAppBadge();
    },
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: (id) => firebaseApi.functions.invoke('sendWhatsAppNotification', { notification_id: id }),
    onSuccess: (data) => {
      if (data.data?.success) {
        toast.success(L('تم الإرسال عبر واتساب', 'بە سەرکەوتوویی نێردرا بۆ واتسەپ'));
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } else {
        toast.error(data.data?.error || L('فشل الإرسال', 'نەتوانرا بنێردرێت'));
      }
    },
    onError: (error) => {
      toast.error(error.message || L('فشل الإرسال', 'نەتوانرا بنێردرێت'));
    },
  });

  const markAllRead = () => {
    notifications.filter(n => !n.is_read).forEach(n => markAsReadMutation.mutate(n.id));
    // Clear badge
    if ('clearAppBadge' in navigator) navigator.clearAppBadge();
  };

  const filtered = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none" dir="rtl">
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mt-16 bg-[#1e293b] rounded-2xl shadow-2xl pointer-events-auto max-h-[80vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <Bell className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">{L('الإشعارات', 'ئاگادارکردنەوەکان')}</h2>
              <p className="text-xs text-white/50 mt-0.5">
                {unreadCount > 0 ? (
                  <span className="text-blue-400 font-semibold">{unreadCount}</span>
                ) : null} {L('غير مقروء', 'نەخوێندراوەتەوە')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                {L('تحديد الكل كمقروء', 'هەموو وەک خوێندراوە')}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-white/10 flex gap-2 overflow-x-auto">
          {[
            { value: 'all', label: L('الكل', 'هەموو'), icon: Bell },
            { value: 'payment', label: L('مدفوعات', 'پارەدان'), icon: Receipt },
            { value: 'contract', label: L('عقود', 'گرێبەست'), icon: FileText },
            { value: 'maintenance', label: L('صيانة', 'چاککردنەوە'), icon: Wrench },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                filter === f.value 
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                  : "bg-white/5 text-white/40 hover:text-white/60 border border-transparent"
              )}
            >
              <f.icon className="w-3.5 h-3.5" />
              {lang === 'ku' && f.value === 'all' ? 'هەموو' : 
               lang === 'ku' && f.value === 'payment' ? 'پارەدان' :
               lang === 'ku' && f.value === 'contract' ? 'گرێبەست' :
               lang === 'ku' && f.value === 'maintenance' ? 'چاککردنەوە' :
               f.value === 'all' ? 'الكل' :
               f.value === 'payment' ? 'مدفوعات' :
               f.value === 'contract' ? 'عقود' : 'صيانة'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[60vh] p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Bell className="w-10 h-10 text-white/30" />
              </div>
              <h3 className="text-base font-bold text-white/60 mb-1">{L('لا توجد إشعارات', 'ئاگادارکردنەوە نییە')}</h3>
              <p className="text-xs text-white/30">{L('ستظهر الإشعارات الجديدة هنا', 'ئاگادارکردنەوە نوێیەکان لێرە دەردەکەون')}</p>
            </div>
          ) : (
            filtered.map(notif => {
              const typeConfig = TYPE_ICONS[notif.type] || TYPE_ICONS.system;
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 rounded-2xl transition-all border group hover:shadow-lg",
                    notif.is_read 
                      ? "bg-white/5 border-white/5 hover:bg-white/8" 
                      : "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30 hover:border-blue-500/40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${typeConfig.color} border border-white/10`}>
                      <typeConfig.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-sm text-white">
                          {lang === 'ku' && notif.title_ku ? notif.title_ku : notif.title}
                        </h3>
                        {notif.created_date && (
                          <div className="flex items-center gap-1 text-[10px] text-white/30 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{format(parseISO(notif.created_date), 'dd/MM HH:mm')}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mb-2 leading-relaxed">
                        {lang === 'ku' && notif.message_ku ? notif.message_ku : notif.message}
                      </p>
                      {notif.action_url && (
                        <a
                          href={notif.action_url}
                          onClick={(e) => { e.stopPropagation(); onClose(); }}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          {L('عرض التفاصيل', 'بینینی وردەکارییەکان')}
                          <span className="transform rotate-180">←</span>
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => sendWhatsAppMutation.mutate(notif.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 transition-all"
                        title={L('إرسال عبر واتساب', 'ناردن بە واتسەپ')}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      {!notif.is_read && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notif.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-green-400 hover:bg-green-500/20 hover:scale-105 transition-all"
                          title={L('تحديد كمقروء', 'نیشانکردن وەک خوێندراوە')}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(notif.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all"
                        title={L('حذف', 'سڕینەوە')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}