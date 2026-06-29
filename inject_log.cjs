const fs = require('fs');
const path = 'c:/Users/Shaik Ansar/Downloads/sph/SPH-Admin-19-06-2026-main/src/pages/SuperAdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const logCode = `
  console.log('--- GRAND TOTAL REVENUE ---');
  console.log('Total Collected Fees:', totalCollectedFees);
  console.log('Medicine Fee Collected:', medicineFeeCollected);
  console.log('Pharmacy Total:', pharmacyTotal);
  console.log('Med Forms Total:', medFormsTotalRevenue);
  console.log('Grand Total:', (totalCollectedFees + medicineFeeCollected + pharmacyTotal + medFormsTotalRevenue));
`;

if (!content.includes('--- GRAND TOTAL REVENUE ---')) {
  content = content.replace('const avgRevPerMonthOverall =', logCode + '\n  const avgRevPerMonthOverall =');
  fs.writeFileSync(path, content);
}
console.log('Injected logs into SuperAdminDashboard.jsx');
