/**
 * sync_reached_to_admin.cjs
 * 
 * Calculates branch revenue using the EXACT same logic as SuperAdminDashboard.jsx
 * (isBranchMatchHelper + same 4 data sources) for the current month,
 * then writes the result to monthly_targets.reached in Firestore.
 * 
 * Run: node sync_reached_to_admin.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

// Exact copy of isBranchMatchHelper from SuperAdminDashboard.jsx
const isBranchMatchHelper = (itemBranchId, itemBranchName, filterBranchId, branchesList) => {
  if (!filterBranchId || filterBranchId === 'all') return true;
  const selectedBranchName = branchesList.find(b => b.id === filterBranchId)?.name;

  const normalize = (val) => {
    if (!val) return '';
    const str = val.toLowerCase().trim();
    if (str.includes('kphb')) return 'kphb';
    if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'chandnagar';
    if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'dilshuknagar';
    if (str.includes('nallagandla')) return 'nallagandla';
    return str.replace(/\s*branch\s*/i, '').trim();
  };

  const normId = normalize(itemBranchId);
  const normName = normalize(itemBranchName);
  const normFilterId = normalize(filterBranchId);
  const normFilterName = normalize(selectedBranchName);

  return normId === normFilterId || normId === normFilterName ||
    normName === normFilterId || normName === normFilterName ||
    itemBranchId === filterBranchId || itemBranchName === selectedBranchName;
};

const parseAnyDateObj = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal.toDate) return dateVal.toDate();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
  if (typeof dateVal === 'string') {
    if (dateVal.includes('T')) { const d = new Date(dateVal); if (!isNaN(d.getTime())) return d; }
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3 && parts[2].length === 4)
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
    const d = new Date(dateVal); if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const matchesMonth = (dateVal, year, month) => {
  // Use same date fields as admin panel
  const d = parseAnyDateObj(dateVal);
  if (!d || isNaN(d.getTime())) return false;
  return d.getFullYear() === year && (d.getMonth() + 1) === month;
};

async function syncReached() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  console.log(`\nSyncing reached values for ${monthKey} using Admin Panel Grand Total Revenue logic...\n`);

  // 1. Fetch branches list (same as admin panel)
  const branchSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'branch')));
  const branches = [];
  branchSnap.forEach(d => branches.push({ id: d.id, ...d.data() }));
  console.log(`Found ${branches.length} branches:`, branches.map(b => `${b.name}(${b.id})`).join(', '));

  // 2. Fetch all data sources (same as admin panel)
  const [pSnap, apptSnap, tSnap, medFormSnap, targetSnap] = await Promise.all([
    getDocs(collection(db, 'patients')),
    getDocs(collection(db, 'appointments')),
    getDocs(collection(db, 'transactions')),
    getDocs(collection(db, 'medicine_requests')),
    getDocs(query(collection(db, 'monthly_targets'), where('month', '==', monthKey)))
  ]);

  // Build combined revenue records (patients + appointments) - deduplicated
  // This mirrors allRevenueRecords in admin panel
  const allRecords = [];
  const usedPatientIds = new Set();

  apptSnap.forEach(d => {
    const a = d.data();
    if (a.paymentStatus === 'paid') {
      allRecords.push({ id: d.id, ...a, _src: 'appointments' });
      if (a.patientId) usedPatientIds.add(a.patientId);
    }
  });

  pSnap.forEach(d => {
    const p = d.data();
    if (p.paymentStatus === 'paid' && !usedPatientIds.has(p.id)) {
      allRecords.push({ id: d.id, ...p, _src: 'patients' });
    }
  });

  const transactions = [];
  tSnap.forEach(d => transactions.push({ id: d.id, ...d.data() }));

  const medicineForms = [];
  medFormSnap.forEach(d => medicineForms.push({ id: d.id, ...d.data() }));

  const getExactPatientAmount = (p) => {
    if (p.paymentAmount !== undefined && p.paymentAmount !== null && p.paymentAmount !== '') return Number(p.paymentAmount);
    if (p.amountPaid !== undefined && p.amountPaid !== null && p.amountPaid !== '') return Number(p.amountPaid);
    if (p.itemsPaid?.consultation !== undefined) return Number(p.itemsPaid.consultation);
    return 0;
  };

  // 3. For each branch in monthly_targets, calculate Grand Total Revenue
  const results = {};
  targetSnap.forEach(tDoc => {
    const data = tDoc.data();
    const branchId = data.branchId;
    const branchName = data.branchName;

    // --- SAME LOGIC AS ADMIN PANEL ---
    // Source 1+2: Consultation + Medicine fee from patients/appointments (paid only)
    const paidRecords = allRecords.filter(p => {
      if (p.paymentStatus !== 'paid') return false;
      if (!isBranchMatchHelper(p.branchId, p.branchName || p.branch, branchId, branches)) return false;
      
      const rawDateStr = p.paymentCollectedAt || p.appointmentDate || p.completedAt || p.createdAt || p.date;
      if (!matchesMonth(rawDateStr, year, month)) return false;

      const isConsultationPayment = (!p.itemsPaid || p.itemsPaid.consultation > 0 || (p.itemsPaid.consultation === undefined && p.itemsPaid.medicine === undefined));
      if (!isConsultationPayment) return false;

      return true;
    });

    const totalCollectedFees = paidRecords.reduce((sum, p) => {
      const consAmt = p.itemsPaid?.consultation !== undefined ? Number(p.itemsPaid.consultation) : getExactPatientAmount(p);
      return sum + consAmt;
    }, 0);

    const medicineFeeCollected = paidRecords.reduce((sum, p) => {
      return sum + (Number(p.itemsPaid?.medicine) || 0);
    }, 0);

    // Source 3: Pharmacy transactions (non-consultation type)
    const filteredPharmacy = transactions.filter(tr =>
      tr.type !== 'consultation' &&
      isBranchMatchHelper(tr.branchId, tr.branchName || tr.branch, branchId, branches) &&
      matchesMonth(tr.timestamp, year, month)
    );
    const pharmacyTotal = filteredPharmacy.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Source 4: Medicine forms (paid)
    const filteredMedForms = medicineForms.filter(form =>
      form.paymentStatus === 'paid' &&
      isBranchMatchHelper(form.branchId, form.branchName || form.branch, branchId, branches) &&
      matchesMonth(form.createdAt || form.formDate, year, month)
    );
    const medFormsTotalRevenue = filteredMedForms.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);

    // Grand Total = same formula as admin panel
    const grandTotal = totalCollectedFees + medicineFeeCollected + pharmacyTotal + medFormsTotalRevenue;

    results[tDoc.id] = {
      docId: tDoc.id,
      branchId,
      branchName,
      totalCollectedFees,
      medicineFeeCollected,
      pharmacyTotal,
      medFormsTotalRevenue,
      grandTotal
    };

    console.log(`\n${branchName} (${branchId})`);
    console.log(`  Consultations: ₹${totalCollectedFees.toLocaleString('en-IN')}`);
    console.log(`  Medicine Fees: ₹${medicineFeeCollected.toLocaleString('en-IN')}`);
    console.log(`  Pharmacy:      ₹${pharmacyTotal.toLocaleString('en-IN')}`);
    console.log(`  Med Forms:     ₹${medFormsTotalRevenue.toLocaleString('en-IN')}`);
    console.log(`  GRAND TOTAL:   ₹${grandTotal.toLocaleString('en-IN')}`);
  });

  // 4. Update Firestore
  console.log('\n--- Writing to Firestore ---');
  for (const [, r] of Object.entries(results)) {
    await updateDoc(doc(db, 'monthly_targets', r.docId), { reached: r.grandTotal });
    console.log(`✅ ${r.branchName}: reached = ₹${r.grandTotal.toLocaleString('en-IN')}`);
  }

  console.log('\n✅ Done! Receptionist web and app will now show the correct values.\n');
  process.exit(0);
}

syncReached().catch(e => { console.error(e); process.exit(1); });
