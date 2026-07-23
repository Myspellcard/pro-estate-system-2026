import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportLeadsToCSV(leads, L) {
  const headers = [
    L('الاسم', 'ناو'), L('الهاتف', 'تەلەفۆن'), L('الهاتف 2', 'تەلەفۆن 2'),
    L('المصدر', 'سەرچاوە'), L('الحالة', 'دۆخ'), L('الموظف', 'کارمەند'),
    L('الميزانية', 'بودجە'), L('تاريخ المتابعة', 'بەرواری شوێنکەوتن'), L('ملاحظات', 'تێبینی'),
  ];
  const rows = leads.map(l => [
    l.name || '', l.phone || '', l.phone2 || '', l.source || '', l.status || '',
    l.assigned_employee_name || '', l.budget || 0, l.next_followup_date || '', (l.notes || '').replace(/\n/g, ' '),
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLeadsToPDF(leads, L) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const headers = [[
    L('Name', 'Name'), L('Phone', 'Phone'), L('Source', 'Source'), L('Status', 'Status'),
    L('Employee', 'Employee'), L('Budget', 'Budget'), L('Next Followup', 'Next Followup'),
  ]];
  const rows = leads.map(l => [
    l.name || '', l.phone || '', l.source || '', l.status || '',
    l.assigned_employee_name || '', l.budget || 0, l.next_followup_date || '',
  ]);
  doc.text('Leads Report', 14, 12);
  doc.autoTable({ head: headers, body: rows, startY: 18, styles: { fontSize: 8 } });
  doc.save(`leads_${new Date().toISOString().slice(0, 10)}.pdf`);
}