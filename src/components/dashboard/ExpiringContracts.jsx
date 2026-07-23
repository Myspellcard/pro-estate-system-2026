import React, { useState } from 'react';
import { format, parseISO, addDays, isBefore, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Phone, MessageCircle, CalendarX, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { Link } from 'react-router-dom';

const waLink = (phone) => `https://wa.me/${(phone || '').replace(/\D/g, '')}`;
const telLink = (phone) => `tel:${phone}`;

export default function ExpiringContracts({ contracts, settings, lang }) {
  const [expanded, setExpanded] = useState(false);
  const L = (a, ku) => lang === 'ku' ? ku : a;

  const days = settings?.expiring_contracts_days ?? 30;
  const count = settings?.expiring_contracts_count ?? 10;
  const limit = addDays(new Date(), days);

  const expiring = contracts
    .filter(c => {
      if (c.status !== 'نشط') return false;
      if (!c.end_date) return false;
      const end = parseISO(c.end_date);
      return isBefore(end, limit);
    })
    .sort((a, b) => new Date(a.end_date) - new Date(b.end_date));

  const display = expanded ? expiring : expiring.slice(0, count);

  const daysLeft = (end_date) => differenceInDays(parseISO(end_date), new Date());

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    doc.text('Expiring Contracts', 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 28);
    let y = 40;
    doc.setFontSize(9);
    doc.text('Contract', 20, y); doc.text('Tenant', 70, y); doc.text('End Date', 120, y); doc.text('Days Left', 160, y);
    y += 6;
    expiring.forEach(c => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(c.contract_number || '-', 20, y);
      doc.text(c.tenant_name || '-', 70, y);
      doc.text(c.end_date ? format(parseISO(c.end_date), 'dd/MM/yyyy') : '-', 120, y);
      doc.text(String(daysLeft(c.end_date)), 160, y);
      y += 7;
    });
    doc.save('expiring-contracts.pdf');
  };

  if (expiring.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-orange-50">
        <div className="flex items-center gap-2">
          <CalendarX className="w-5 h-5 text-orange-600" />
          <h2 className="font-bold text-orange-800">{L('عقود ستنتهي قريباً', 'گرێبەستی نزیک بە کۆتایی')}</h2>
          <span className="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full font-bold">{expiring.length}</span>
          <span className="text-xs text-orange-600">({L(`خلال ${days} يوم`, `لەناو ${days} رۆژدا`)})</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1 border-orange-300 text-orange-700 hover:bg-orange-100 text-xs" onClick={downloadPDF}>
          <Download className="w-3 h-3" /> PDF
        </Button>
      </div>
      <div className="divide-y divide-border">
        {display.map(c => {
          const left = daysLeft(c.end_date);
          const urgent = left <= 7;
          return (
            <div key={c.id} className={`p-3 flex items-center justify-between hover:bg-muted/30 transition-colors ${urgent ? 'bg-red-50/40' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${urgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {left}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.tenant_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.property_name} · {c.end_date && format(parseISO(c.end_date), 'dd MMM yyyy', { locale: ar })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 mr-2">
                <span className="text-xs text-muted-foreground hidden sm:block">{c.contract_number}</span>
                {c.tenant_phone && (
                  <>
                    <a href={telLink(c.tenant_phone)} className="w-7 h-7 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors" title={c.tenant_phone}>
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                    </a>
                    <a href={waLink(c.tenant_phone)} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors" title="WhatsApp">
                      <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {expiring.length > count && (
        <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
            {expanded ? L('عرض أقل', 'کەمتر ببینە') : L(`عرض الكل (${expiring.length})`, `هەموو ببینە (${expiring.length})`)}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <Link to="/contracts" className="text-xs text-muted-foreground hover:underline">{L('إدارة العقود ←', 'بەڕێوەبردنی گرێبەستەکان ←')}</Link>
        </div>
      )}
    </div>
  );
}