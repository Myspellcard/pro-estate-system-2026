// PDF Export utility using print window
export function printContent(html, title = 'طباعة') {
  const win = window.open('', '', 'height=800,width=900');
  win.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8"/>
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
        @page { size: A4; margin: 15mm 20mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: 'Tajawal','Arial',sans-serif; direction: rtl; background: #fff; color: #1a2744; font-size: 13px; line-height: 1.6; }
        h1 { font-size: 22px; font-weight: 800; color: #1a2744; margin-bottom: 4px; }
        h2 { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #1a2744; }
        .header { background: linear-gradient(135deg, #1a2744 0%, #2a3f6e 100%); color: #fff; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { color: #fff; }
        .header p { color: #a8b8d8; font-size: 11px; margin-top: 2px; }
        .badge { background: #e8b748; color: #1a2744; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead th { background: #1a2744; color: #e8b748; padding: 10px 14px; text-align: right; font-size: 12px; font-weight: 700; }
        tbody tr:nth-child(even) { background: #f7f9fd; }
        tbody td { padding: 9px 14px; font-size: 12px; border-bottom: 1px solid #edf0f7; }
        .card { border: 1.5px solid #dde2ee; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
        .card-title { font-size: 14px; font-weight: 800; color: #1a2744; margin-bottom: 6px; }
        .card-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 12px; }
        .card-lbl { color: #6b7a99; min-width: 90px; font-weight: 600; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .footer { text-align: center; border-top: 1.5px solid #edf0f7; padding-top: 12px; margin-top: 20px; color: #8a94aa; font-size: 10px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);
  win.document.close();
  win.print();
}

export function generatePropertiesPDF(properties) {
  const rows = properties.map(p => `
    <tr>
      <td>${p.name || '—'}</td>
      <td>${p.type || '—'}</td>
      <td>${p.address || '—'} ${p.city ? '، ' + p.city : ''}</td>
      <td>${p.area_sqm ? p.area_sqm + ' م²' : '—'}</td>
      <td>${p.rooms || '—'}</td>
      <td>${p.monthly_rent ? p.monthly_rent.toLocaleString() + ' د.ع' : '—'}</td>
      <td>${p.owner_name || '—'}</td>
      <td>${p.status || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <div class="header">
      <div><h1>قائمة العقارات</h1><p>تقرير شامل بجميع العقارات</p></div>
      <div><span class="badge">${properties.length} عقار</span><br/><span style="color:#a8b8d8;font-size:10px;margin-top:4px;display:block">${new Date().toLocaleDateString('en-GB')}</span></div>
    </div>
    <table>
      <thead><tr><th>الاسم</th><th>النوع</th><th>العنوان</th><th>المساحة</th><th>الغرف</th><th>الإيجار الشهري</th><th>المالك</th><th>الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer"><p>تم إصدار هذا التقرير من نظام إدارة العقارات — ${new Date().toLocaleDateString('en-GB')}</p></div>
  `;
  printContent(html, 'قائمة العقارات');
}

export function generateTenantsPDF(tenants) {
  const rows = tenants.map(t => `
    <tr>
      <td>${t.full_name || '—'}</td>
      <td>${t.phone || '—'}</td>
      <td>${t.email || '—'}</td>
      <td>${t.id_number || '—'}</td>
      <td>${t.address || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <div class="header">
      <div><h1>قائمة المستأجرين</h1><p>تقرير شامل بجميع المستأجرين</p></div>
      <div><span class="badge">${tenants.length} مستأجر</span><br/><span style="color:#a8b8d8;font-size:10px;margin-top:4px;display:block">${new Date().toLocaleDateString('en-GB')}</span></div>
    </div>
    <table>
      <thead><tr><th>الاسم الكامل</th><th>الهاتف</th><th>البريد الإلكتروني</th><th>رقم الهوية</th><th>العنوان</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer"><p>تم إصدار هذا التقرير من نظام إدارة العقارات — ${new Date().toLocaleDateString('en-GB')}</p></div>
  `;
  printContent(html, 'قائمة المستأجرين');
}

export function generateContractsPDF(contracts) {
  const rows = contracts.map(c => `
    <tr>
      <td>${c.contract_number || '—'}</td>
      <td>${c.tenant_name || '—'}</td>
      <td>${c.property_name || '—'}</td>
      <td>${c.purpose || '—'}</td>
      <td>${c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '—'}</td>
      <td>${c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '—'}</td>
      <td>${c.duration_months ? c.duration_months + ' شهر' : '—'}</td>
      <td>${c.monthly_rent ? c.monthly_rent.toLocaleString() + ' د.ع' : '—'}</td>
      <td>${c.status || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <div class="header">
      <div><h1>قائمة العقود</h1><p>تقرير شامل بجميع عقود الإيجار</p></div>
      <div><span class="badge">${contracts.length} عقد</span><br/><span style="color:#a8b8d8;font-size:10px;margin-top:4px;display:block">${new Date().toLocaleDateString('en-GB')}</span></div>
    </div>
    <table>
      <thead><tr><th>رقم العقد</th><th>المستأجر</th><th>العقار</th><th>الغرض</th><th>البداية</th><th>الانتهاء</th><th>المدة</th><th>الإيجار الشهري</th><th>الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer"><p>تم إصدار هذا التقرير من نظام إدارة العقارات — ${new Date().toLocaleDateString('en-GB')}</p></div>
  `;
  printContent(html, 'قائمة العقود');
}

export function generateSingleContractPDF(c) {
  const clauses = (c.clauses || []).map((cl, i) => `
    <tr><td>${i + 1}. ${cl.title || ''}</td><td>${cl.description || ''}</td></tr>
  `).join('');

  const html = `
    <div class="header">
      <div><h1>عقد إيجار</h1><p>${c.contract_number || ''}</p></div>
      <div><span class="badge">${c.status || ''}</span><br/><span style="color:#a8b8d8;font-size:10px;margin-top:4px;display:block">${new Date().toLocaleDateString('en-GB')}</span></div>
    </div>

    <div class="grid2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-title">الطرف الأول — المستأجر</div>
        <div class="card-row"><span class="card-lbl">الاسم:</span><span>${c.tenant_name || '—'}</span></div>
        <div class="card-row"><span class="card-lbl">الهاتف:</span><span>${c.tenant_phone || '—'}</span></div>
        <div class="card-row"><span class="card-lbl">البريد:</span><span>${c.tenant_email || '—'}</span></div>
      </div>
      <div class="card">
        <div class="card-title">الطرف الثاني — المالك</div>
        <div class="card-row"><span class="card-lbl">الاسم:</span><span>${c.owner_name || '—'}</span></div>
        <div class="card-row"><span class="card-lbl">الهاتف:</span><span>${c.owner_phone || '—'}</span></div>
        <div class="card-row"><span class="card-lbl">البريد:</span><span>${c.owner_email || '—'}</span></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-title">تفاصيل العقد</div>
      <div class="grid2">
        <div>
          <div class="card-row"><span class="card-lbl">العقار:</span><span>${c.property_name || '—'}</span></div>
          <div class="card-row"><span class="card-lbl">الغرض:</span><span>${c.purpose || '—'}</span></div>
          <div class="card-row"><span class="card-lbl">تاريخ البداية:</span><span>${c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '—'}</span></div>
          <div class="card-row"><span class="card-lbl">تاريخ الانتهاء:</span><span>${c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '—'}</span></div>
        </div>
        <div>
          <div class="card-row"><span class="card-lbl">المدة:</span><span>${c.duration_months ? c.duration_months + ' شهر' : '—'}</span></div>
          <div class="card-row"><span class="card-lbl">الإيجار الشهري:</span><span>${c.monthly_rent ? c.monthly_rent.toLocaleString() + ' د.ع' : '—'}</span></div>
          <div class="card-row"><span class="card-lbl">الإجمالي:</span><span>${c.total_rent ? c.total_rent.toLocaleString() + ' د.ع' : '—'}</span></div>
          <div class="card-row"><span class="card-lbl">التأمين:</span><span>${c.insurance_amount ? c.insurance_amount.toLocaleString() + ' د.ع' : '—'}</span></div>
        </div>
      </div>
    </div>

    ${clauses ? `
    <h2>بنود وشروط العقد</h2>
    <table>
      <thead><tr><th>البند</th><th>التفاصيل</th></tr></thead>
      <tbody>${clauses}</tbody>
    </table>` : ''}

    <div class="footer"><p>تم إصدار هذا التقرير من نظام إدارة العقارات — ${new Date().toLocaleDateString('en-GB')}</p></div>
  `;
  printContent(html, `عقد ${c.contract_number}`);
}

export function generateInvoicesPDF(invoices) {
  const rows = invoices.map(inv => `
    <tr>
      <td>${inv.invoice_number || '—'}</td>
      <td>${inv.tenant_name || '—'}</td>
      <td>${inv.property_name || '—'}</td>
      <td>${inv.type || '—'}</td>
      <td>${inv.amount ? inv.amount.toLocaleString() + ' د.ع' : '—'}</td>
      <td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : '—'}</td>
      <td>${inv.status || '—'}</td>
    </tr>
  `).join('');

  const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);

  const html = `
    <div class="header">
      <div><h1>قائمة الفواتير</h1><p>تقرير شامل بجميع الفواتير</p></div>
      <div><span class="badge">${invoices.length} فاتورة</span><br/><span style="color:#a8b8d8;font-size:10px;margin-top:4px;display:block">${new Date().toLocaleDateString('en-GB')}</span></div>
    </div>
    <table>
      <thead><tr><th>رقم الفاتورة</th><th>المستأجر</th><th>العقار</th><th>النوع</th><th>المبلغ</th><th>الاستحقاق</th><th>الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="background:#1a2744;color:#e8b748;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <span style="font-size:13px;font-weight:700;">إجمالي المبالغ</span>
      <span style="font-size:20px;font-weight:900;">${totalAmount.toLocaleString()} <span style="font-size:11px;font-weight:400;">د.ع</span></span>
    </div>
    <div class="footer"><p>تم إصدار هذا التقرير من نظام إدارة العقارات — ${new Date().toLocaleDateString('en-GB')}</p></div>
  `;
  printContent(html, 'قائمة الفواتير');
}