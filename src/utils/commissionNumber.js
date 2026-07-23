import { firebaseApi } from '@/api/firebaseClient';

/**
 * Generates the next commission invoice number based on AppSettings numbering config,
 * and increments the stored counter so the next commission gets the following number.
 * contractType: 'rent' or 'sale' — each has its own independent counter.
 * Returns the generated invoice number string (prefix + number).
 */
export async function generateCommissionInvoiceNumber(contractType = 'rent') {
  const list = await firebaseApi.entities.AppSettings.list();
  const settings = list.find(s => s.key === 'default');
  const numbering = settings?.numbering || {};
  const typeKey = contractType === 'sale' ? 'sale_commission_invoice' : 'rent_commission_invoice';
  const prefix = numbering[`${typeKey}_prefix`] || '';
  const start = Number(numbering[`${typeKey}_start`]) || 1;

  let nextNum = start;
  try {
    const existing = await firebaseApi.entities.Commission.filter({ contract_type: contractType }, '-created_date', 200);
    const usedNumbers = new Set();
    let maxFromPrefix = start - 1;
    existing.forEach(c => {
      if (c.invoice_number) {
        usedNumbers.add(c.invoice_number);
        const rest = prefix && c.invoice_number.startsWith(prefix)
          ? c.invoice_number.slice(prefix.length)
          : c.invoice_number;
        const n = parseInt(rest, 10);
        if (!isNaN(n) && n > maxFromPrefix) maxFromPrefix = n;
      }
    });
    nextNum = Math.max(start, maxFromPrefix + 1);
    let candidate = `${prefix}${nextNum}`;
    while (usedNumbers.has(candidate)) {
      nextNum += 1;
      candidate = `${prefix}${nextNum}`;
    }
  } catch (_) {}

  const invoiceNumber = `${prefix}${nextNum}`;

  if (settings?.id) {
    try {
      const updatedNumbering = { ...numbering, [`${typeKey}_start`]: nextNum + 1 };
      await firebaseApi.entities.AppSettings.update(settings.id, { numbering: updatedNumbering });
    } catch (_) {}
  }

  return invoiceNumber;
}