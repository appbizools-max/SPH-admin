import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a",
  measurementId: "G-SWSZ49BB14"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRevenue() {
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const parseDateMonth = (rawDateStr) => {
    if (!rawDateStr) return null;
    let d = null;
    if (rawDateStr.toDate) d = rawDateStr.toDate();
    else if (rawDateStr.seconds) d = new Date(rawDateStr.seconds * 1000);
    else if (typeof rawDateStr === 'string') {
      if (rawDateStr.includes('/')) {
        const parts = rawDateStr.split('/');
        if (parts.length === 3) d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else if (rawDateStr.includes('-') && rawDateStr.split('-')[0].length === 4) {
        d = new Date(rawDateStr);
      } else {
        d = new Date(rawDateStr);
      }
    } else {
      d = new Date(rawDateStr);
    }
    if (d && !isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return null;
  };

  const branchRevenue = {};

  const addRev = (b, amt) => {
    if (!b || b === 'Unknown') return;
    if (!branchRevenue[b]) branchRevenue[b] = 0;
    branchRevenue[b] += Number(amt || 0);
  };

  // 1. Transactions
  const tSnap = await getDocs(collection(db, 'transactions'));
  tSnap.forEach(d => {
    const data = d.data();
    if (parseDateMonth(data.timestamp) === monthKey) {
       addRev(data.branchId || data.branchName || data.branch, data.amount || 0);
    }
  });

  // 2. Patients (Walk-ins & Appointments that became patients)
  const pSnap = await getDocs(collection(db, 'patients'));
  pSnap.forEach(d => {
    const data = d.data();
    if (data.paymentStatus === 'paid') {
      if (parseDateMonth(data.paymentCollectedAt || data.appointmentDate || data.createdAt || data.date) === monthKey) {
        addRev(data.branchId || data.branchName || data.branch, data.paymentAmount || 0);
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
    console.log(`Branch: ${b} -> ₹${amt}`);
  }
  process.exit(0);
}
checkRevenue();
