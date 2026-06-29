import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

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
  const monthKey = \\-\\;

  const parseDateMonth = (rawDateStr) => {
    if (!rawDateStr) return null;
    let d = null;
    if (rawDateStr.toDate) d = rawDateStr.toDate();
    else if (rawDateStr.seconds) d = new Date(rawDateStr.seconds * 1000);
    else d = new Date(rawDateStr);
    if (d && !isNaN(d.getTime())) {
      return \\-\\;
    }
    return null;
  };

  const branchRevenue = {};

  const addRev = (b, amt) => {
    b = normalizeBranch(b);
    if (!branchRevenue[b]) branchRevenue[b] = 0;
    branchRevenue[b] += Number(amt || 0);
  };

  // Same logic as SuperAdminDashboard!
  // 1. Transactions
  const tSnap = await getDocs(query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(5000)));
  tSnap.forEach(d => {
    const data = d.data();
    if (parseDateMonth(data.timestamp) === monthKey) {
       addRev(data.branchId || data.branchName || data.branch, data.amount || 0);
    }
  });

  // 2. Patients & Appointments
  const pSnap = await getDocs(collection(db, 'patients'));
  pSnap.forEach(d => {
    const data = d.data();
    if (data.paymentStatus === 'paid') {
      if (parseDateMonth(data.paymentCollectedAt || data.appointmentDate || data.createdAt || data.date) === monthKey) {
        addRev(data.branchId || data.branchName || data.branch, data.paymentAmount || data.amountPaid || 0);
      }
    }
  });

  // 3. Medicine Requests
  const mSnap = await getDocs(collection(db, 'medicine_requests'));
  mSnap.forEach(d => {
    const data = d.data();
    if (data.paymentStatus === 'paid') {
      if (parseDateMonth(data.paymentCollectedAt || data.updatedAt || data.requestedAt) === monthKey) {
        addRev(data.branchId || data.branchName || data.branch, data.paymentAmount || data.amountPaid || 0);
      }
    }
  });

  console.log('--- GRAND TOTAL REVENUE FOR THIS MONTH ---');
  for (const [b, amt] of Object.entries(branchRevenue)) {
    console.log(\Branch: \ -> ?\\);
  }
  process.exit(0);
}
checkRevenue();
