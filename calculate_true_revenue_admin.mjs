import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const normalizeBranch = (name) => {
    if (!name) return 'Unknown';
    name = name.toLowerCase();
    if (name.includes('kphb')) return 'KPHB';
    if (name.includes('nalla') || name.includes('nallagandala')) return 'NALLAGANDLA';
    if (name.includes('dil') || name.includes('dsnr') || name.includes('dsh')) return 'DILSHUKNAGAR';
    if (name.includes('chand') || name.includes('chanda')) return 'CHANDANAGAR';
    return name.toUpperCase();
};

async function checkRevenue() {
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const parseDateMonth = (rawDateStr) => {
    if (!rawDateStr) return null;
    let d = null;
    if (rawDateStr.toDate) d = rawDateStr.toDate();
    else if (rawDateStr.seconds) d = new Date(rawDateStr.seconds * 1000);
    else d = new Date(rawDateStr);
    if (d && !isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return null;
  };

  const branchRevenue = {};

  const addRev = (b, amt) => {
    b = normalizeBranch(b);
    if (!branchRevenue[b]) branchRevenue[b] = 0;
    branchRevenue[b] += Number(amt || 0);
  };

  const getExactPatientAmount = (p) => {
      if (p.paymentAmount !== undefined && p.paymentAmount !== null && p.paymentAmount !== '') {
        return Number(p.paymentAmount);
      }
      if (p.amountPaid !== undefined && p.amountPaid !== null && p.amountPaid !== '') {
        return Number(p.amountPaid);
      }
      if (p.itemsPaid && p.itemsPaid.consultation !== undefined) {
        return Number(p.itemsPaid.consultation);
      }
      return 0; // Removed legacy 600 fallback
  };

  const allRevenueRecords = [];
  const usedApptPatientIds = new Set();

  // 1. Appointments
  const apptSnap = await getDocs(collection(db, 'appointments'));
  apptSnap.forEach(d => {
    const a = d.data();
    if (a.paymentStatus === 'paid' || a.status === 'completed' || a.status === 'done') {
      usedApptPatientIds.add(a.patientId);
      allRevenueRecords.push(a);
    }
  });

  // 2. Patients
  const pSnap = await getDocs(collection(db, 'patients'));
  pSnap.forEach(d => {
    const p = d.data();
    if (p.paymentStatus === 'paid' || p.status === 'completed' || p.status === 'done') {
      if (!usedApptPatientIds.has(d.id)) {
        allRevenueRecords.push(p);
      }
    }
  });

  // Now process allRevenueRecords
  allRevenueRecords.forEach(p => {
    if (p.paymentStatus !== 'paid') return;
    if (parseDateMonth(p.paymentCollectedAt || p.appointmentDate || p.createdAt || p.date) !== monthKey) return;
    
    // Check isConsultationPayment exactly like SuperAdminDashboard
    const isConsultationPayment = (!p.itemsPaid || p.itemsPaid.consultation > 0 || (p.itemsPaid.consultation === undefined && p.itemsPaid.medicine === undefined));
    if (!isConsultationPayment) return;

    const hasMed = p.itemsPaid && p.itemsPaid.medicine > 0;
    const hasCons = p.itemsPaid && (p.itemsPaid.consultation > 0 || (!p.itemsPaid.consultation && !p.itemsPaid.medicine));

    const consAmt = (() => {
      if (hasMed && hasCons) return getExactPatientAmount(p); // Combined total amount
      if (p.itemsPaid && p.itemsPaid.consultation !== undefined) return Number(p.itemsPaid.consultation);
      return getExactPatientAmount(p);
    })();

    const medAmt = Number(p.itemsPaid && p.itemsPaid.medicine ? p.itemsPaid.medicine : 0);

    addRev(p.branchId || p.branchName || p.branch, consAmt + medAmt);
  });

  // 3. Transactions (Pharmacy)
  const tSnap = await getDocs(collection(db, 'transactions'));
  tSnap.forEach(d => {
    const data = d.data();
    if (data.type !== 'consultation') { // pharmacy transactions
      if (parseDateMonth(data.timestamp) === monthKey) {
        addRev(data.branchId || data.branchName || data.branch, data.amount || 0);
      }
    }
  });

  // 4. Medicine Requests
  const mSnap = await getDocs(collection(db, 'medicine_requests'));
  mSnap.forEach(d => {
    const data = d.data();
    if (data.paymentStatus === 'paid') {
      if (parseDateMonth(data.paymentCollectedAt || data.updatedAt || data.requestedAt) === monthKey) {
        addRev(data.branchId || data.branchName || data.branch, data.paymentAmount || data.amountPaid || 0);
      }
    }
  });

  console.log('--- TRUE ADMIN PANEL REVENUE FOR THIS MONTH ---');
  for (const [b, amt] of Object.entries(branchRevenue)) {
    console.log(`Branch: ${b} -> ₹${amt}`);
  }
  process.exit(0);
}
checkRevenue();
