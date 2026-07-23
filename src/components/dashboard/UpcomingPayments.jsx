import React, { useState } from 'react';
import { format, parseISO, addDays, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Phone, MessageCircle, AlertTriangle, Clock, Download, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { Link } from 'react-router-dom';

const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;
const telLink = (phone) => `tel:${phone}`;

export default function UpcomingPayments({ invoices, contracts, settings, lang }) {
  const [expanded, setExpanded] = useState(false);
  const L = (a, ku) => lang === 'ku' ? ku : a;

  const days = settings?.upcoming_payments_days ?? 7;
  const count = settings?.upcoming_payments_count ?? 10;
  const limit = addDays(new Date(), days);

  const enriched = invoices
    .filter(inv => {
      if (inv.status === 'مدفوعة') return false;
      if (!inv.due_date) return false;
      return isBefore(parseISO(inv.due_date), limit);
    })
    .map(inv => {
      const contract = contracts.find(c => c.id === inv.contract_id);
      return { ...inv, tenant_phone: contract?.tenant_phone || '' };
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const isOverdue = (inv) => new Date(inv.due_date) < new Date();
  const display = expanded ? enriched : enriched.slice(0, count);

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('Upcoming Payments', 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 28);
    let y = 40;
    doc.setFontSize(9);
    doc.text('Tenant', 20, y); doc.text('Amount', 80, y); doc.text('Due Date', 120, y); doc.text('Status', 160, y);
    y += 6;
    enriched.forEach(inv => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(inv.tenant_name || '-', 20, y);
      doc.text(String(inv.amount?.toLocaleString() || '-'), 80, y);
      doc.text(inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy') : '-', 120, y);
      doc.text(isOverdue(inv) ? 'OVERDUE' : 'Pending', 160, y);
      y += 7;
    });
    doc.save('upcoming-payments.pdf');
  };

  if (enriched.length === 0) return null;

  return (
    <div className="rounded-2xl border border-blue-500/20 shadow-sm overflow-hidden" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
      <div className="p-4 border-b border-blue-500/20 flex items-center justify-between" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-white">{L('الدفعات القادمة', 'پارەدانەکانی نزیک')}</h2>
          <span className="bg-blue-500/20 text-white text-xs px-2 py-0.5 rounded-full font-bold border border-blue-500/20">{enriched.length}</span>
          <span className="text-xs text-white/70">({L(`خلال ${days} يوم`, `لەناو ${days} رۆژدا`)})</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1 border-blue-500/20 text-blue-300 hover:bg-blue-500/15 text-xs" onClick={downloadPDF}>
          <Download className="w-3 h-3" /> PDF
        </Button>
      </div>
      <div className="divide-y divide-blue-500/15">
        {display.map(inv => (
          <div key={inv.id} className={`p-3 flex items-center justify-between transition-colors ${isOverdue(inv) ? 'bg-red-500/10' : 'hover:bg-blue-500/8'}`}>
            <div className="flex items-center gap-3 min-w-0">
              {isOverdue(inv)
                ? <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                : <Clock className="w-4 h-4 text-blue-400 shrink-0" />}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate text-white">{inv.tenant_name}</p>
                <p className="text-xs text-blue-200/60">
                  {inv.due_date && format(parseISO(inv.due_date), 'dd MMM yyyy', { locale: ar })}
                  {' · '}{inv.property_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 mr-2">
              <span className="font-bold text-sm text-blue-300">{inv.amount?.toLocaleString()}</span>
              {inv.tenant_phone && (
                <>
                  <a href={telLink(inv.tenant_phone)} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" title={inv.tenant_phone} style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                  </a>
                  <a href={waLink(inv.tenant_phone)} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" title="WhatsApp" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {enriched.length > count && (
        <div className="p-3 border-t border-blue-500/20 flex items-center justify-between" style={{ background: 'rgba(59, 130, 246, 0.06)' }}>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: '#93c5fd' }}>
            {expanded ? L('عرض أقل', 'کەمتر ببینە') : L(`عرض الكل (${enriched.length})`, `هەموو ببینە (${enriched.length})`)}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <Link to="/invoices" className="text-xs hover:underline" style={{ color: '#93c5fd' }}>{L('إدارة الفواتير ←', 'بەڕێوەبردنی وەسڵەکان ←')}</Link>
        </div>
      )}
    </div>
  );
}