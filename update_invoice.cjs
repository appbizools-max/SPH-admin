const fs = require('fs');
const file = 'c:/Users/Shaik Ansar/Downloads/sph/SPH-Admin-19-06-2026-main/src/pages/reception/ReceptionDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace all calls to generatePaymentInvoice to include itemsPaid
content = content.replace(/generatePaymentInvoice\(\{([\s\S]*?)\}\)/g, (match, p1) => {
  if (p1.includes('itemsPaid')) return match; // skip if already there
  let itemsPaidVal = 'null';
  if (p1.includes('tx.')) itemsPaidVal = 'tx.itemsPaid || null';
  else if (p1.includes('item.')) itemsPaidVal = 'item.raw?.itemsPaid || item.itemsPaid || null';
  else if (p1.includes('selectedBill.')) itemsPaidVal = 'selectedBill.itemsPaid || itemsPaid || null';
  
  return 'generatePaymentInvoice({' + p1 + ',\n  itemsPaid: ' + itemsPaidVal + '\n})';
});

// Update the generatePaymentInvoice definition to include Medicines HTML and larger Logo
const invoiceHtmlDefRegex = /const splitRows = data\.isSplit[\s\S]*?;/;
const newInvoiceHtmlDef = `const splitRows = data.isSplit && data.splitDetails ? \`
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:12px;">Cash Collected at Counter</td>
        <td style="padding:10px 14px;font-weight:700;text-align:right;font-size:12px;color:#0f172a;">₹\${data.splitDetails.cash || 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:12px;">UPI / Online Collected</td>
        <td style="padding:10px 14px;font-weight:700;text-align:right;font-size:12px;color:#0f172a;">₹\${data.splitDetails.upi || 0}</td>
      </tr>\` : '';

    const medicinesHtml = (data.itemsPaid && data.itemsPaid.medicinesList && data.itemsPaid.medicinesList.length > 0) ? \`
      <div class="section-title" style="margin-top: 15px;">Prescribed Medicines</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px; text-align: left; font-size: 11px; color: #64748b;">Medicine Name</th>
            <th style="padding: 10px; text-align: left; font-size: 11px; color: #64748b;">Type</th>
            <th style="padding: 10px; text-align: left; font-size: 11px; color: #64748b;">Dosage</th>
            <th style="padding: 10px; text-align: right; font-size: 11px; color: #64748b;">Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          \${data.itemsPaid.medicinesList.map(med => \`
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-size: 12px; font-weight: 600; color: #0f172a;">\${med.name || '-'}</td>
              <td style="padding: 10px; font-size: 12px; color: #475569;">\${med.type || '-'}</td>
              <td style="padding: 10px; font-size: 12px; color: #475569;">\${med.dosage || '-'}</td>
              <td style="padding: 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right;">\${med.price ? '₹' + med.price : '-'}</td>
            </tr>
          \`).join('')}
        </tbody>
      </table>
    \` : '';`;
content = content.replace(invoiceHtmlDefRegex, newInvoiceHtmlDef);

// Replace header height and logo img height
content = content.replace(/height: 75px;\s+padding: 0 0 0 20px;/g, 'height: 95px;\n      padding: 0 0 0 20px;');
content = content.replace(/height: 55px;\s+object-fit: contain;/g, 'height: 80px;\n      object-fit: contain;');

// Insert medicinesHtml into body
content = content.replace(/<div class="meta-footer">/, '${medicinesHtml}\n      <div class="meta-footer">');

fs.writeFileSync(file, content);
console.log('Successfully updated ReceptionDashboard.jsx');
