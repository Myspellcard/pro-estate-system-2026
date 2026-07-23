import React, { useState } from 'react';
import { Phone, MessageCircle, Send, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'contact_actions_sent';

/**
 * sentKey        - unique string key; persists sent state in localStorage
 * resetAfterDays - if set, allows re-sending after N days (for late invoices)
 * (no sentKey = no persistence, button resets after 3s)
 */
export default function ContactActions({ phone, preparedMessage, lang, showCall = true, buttonLabel, sentKey, resetAfterDays }) {
  // tick forces re-render after sending so we immediately see the new state
  const [tick, setTick] = useState(0);

  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const L = (ar, ku) => lang === 'ku' ? ku : ar;

  // Compute sent info directly from localStorage every render (reliable, no stale state)
  const getSentInfo = () => {
    if (!sentKey) return null;
    let store = {};
    try { store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { store = {}; }
    const sentTime = store[sentKey];
    if (!sentTime) return null;
    if (resetAfterDays) {
      const daysPassed = (new Date() - new Date(sentTime)) / (1000 * 60 * 60 * 24);
      if (daysPassed >= resetAfterDays) return null;
    }
    return new Date(sentTime);
  };

  const sentDate = getSentInfo();
  const isSent = sentDate !== null;

  const handleSendMessage = () => {
    if (sentKey) {
      let store = {};
      try { store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { store = {}; }
      store[sentKey] = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      setTick(t => t + 1); // force re-render to show "sent"
    } else {
      // No persistence — show "sent" for 3 seconds then reset
      setTick(t => t + 1);
      setTimeout(() => setTick(t => t + 1), 3000);
    }
  };

  if (!phone) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {showCall && (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-medium transition-colors"
        >
          <Phone className="w-3 h-3" />
          {L('اتصال', 'پەیوەندی')}
        </a>
      )}
      <a
        href={`https://wa.me/${cleanPhone}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-medium transition-colors"
      >
        <MessageCircle className="w-3 h-3" />
        {L('واتساب', 'واتساب')}
      </a>
      {preparedMessage && (
        isSent ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px] font-medium">
            <CheckCircle className="w-3 h-3" />
            {L('تم الإرسال', 'نێردرا')}
            {sentDate && (
              <span className="opacity-70">
                {sentDate.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
        ) : (
          <a
            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(preparedMessage)}`}
            target="_blank"
            rel="noreferrer"
            onClick={handleSendMessage}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-medium transition-colors"
          >
            <Send className="w-3 h-3" />
            {buttonLabel || L('رسالة جاهزة', 'پەیامی ئامادە')}
          </a>
        )
      )}
    </div>
  );
}