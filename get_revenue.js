import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function getRevenue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const todayDateStr = new Date().toDateString();

  console.log("Calculating for:", todayStr);

  const [patientsSnap, apptsSnap, txsSnap] = await Promise.all([
    getDocs(collection(db, 'patients')),
    getDocs(collection(db, 'appointments')),
    getDocs(collection(db, 'transactions'))
  ]);

  const pats = patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const appts = apptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const txs = txsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const updated = [...pats];
  const idxMap = new Map(updated.map((p, i) => [p.id, i]));
  const phoneMap = new Map();
  updated.forEach((p, i) => {
    const cleanPhone = (p.phone || p.phoneNumber || p.contact || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone) phoneMap.set(cleanPhone, i);
  });

  appts.filter(a => a.paymentStatus === 'paid' || a.status === 'completed' || a.status === 'done').forEach(appt => {
    const patientId = appt.patientId;
    if (!patientId || patientId === 'WALKIN_USER') return;
    const cleanApptPhone = (appt.phone || appt.patientPhone || '').replace(/\D/g, '').slice(-10);
    let idx = idxMap.get(patientId);
    if (idx === undefined && cleanApptPhone) idx = phoneMap.get(cleanApptPhone);

    const isApptPaid = appt.paymentStatus === 'paid';
    if (idx !== undefined) {
      if (updated[idx].paymentStatus !== 'paid' && isApptPaid) {
        updated[idx] = {
          ...updated[idx],
          paymentStatus: 'paid',
          paymentAmount: appt.amountPaid || updated[idx].paymentAmount || updated[idx].amountPaid || 0,
          paymentMethod: appt.paymentMethod || updated[idx].paymentMethod || 'N/A',
          paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt || updated[idx].paymentCollectedAt
        };
      }
    } else {
      updated.push({
        id: patientId,
        paymentStatus: appt.paymentStatus || 'unpaid',
        paymentAmount: appt.amountPaid || 0,
        paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt,
      });
      idxMap.set(patientId, updated.length - 1);
    }
  });

  txs.forEach(tx => {
    const pId = tx.patientId;
    if (!pId) return;
    let idx = idxMap.get(pId);
    if (idx !== undefined && updated[idx].paymentStatus !== 'paid') {
      updated[idx] = {
        ...updated[idx],
        paymentStatus: 'paid',
        paymentAmount: tx.amount || updated[idx].paymentAmount || 0,
        paymentCollectedAt: tx.timestamp || updated[idx].paymentCollectedAt
      };
    }
  });

  const revRecords = [];
  const usedApptPatientIds = new Set();
  appts.filter(a => a.paymentStatus === 'paid' || a.status === 'completed' || a.status === 'done').forEach(appt => {
    const patientId = appt.patientId;
    usedApptPatientIds.add(patientId);
    let p = {};
    if (patientId && patientId !== 'WALKIN_USER') {
      let idx = idxMap.get(patientId);
      if (idx === undefined) {
         const cleanApptPhone = (appt.phone || appt.patientPhone || '').replace(/\D/g, '').slice(-10);
         if (cleanApptPhone) idx = phoneMap.get(cleanApptPhone);
      }
      if (idx !== undefined) p = updated[idx];
    }
    revRecords.push({
      ...p,
      ...appt,
      paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt || p.paymentCollectedAt,
      paymentAmount: appt.amountPaid || p.paymentAmount || p.amountPaid || 0,
      paymentStatus: appt.paymentStatus === 'paid' ? 'paid' : (p.paymentStatus === 'paid' ? 'paid' : 'unpaid'),
    });
    const apptDateStr = appt.paymentCollectedAt ? new Date(appt.paymentCollectedAt).toDateString() : (appt.updatedAt ? new Date(appt.updatedAt).toDateString() : '');
    if (patientId) usedApptPatientIds.add(`${patientId}_${apptDateStr}`);
  });

  updated.forEach(p => {
    const isPaid = p.paymentStatus === 'paid';
    const isCompleted = p.status === 'completed' || p.status === 'done';
    if ((isPaid || isCompleted) && !usedApptPatientIds.has(p.id)) {
      revRecords.push(p);
    }
  });

  const getDateFromPatient = (p) => {
    const raw = p.paymentCollectedAt || p.completedAt || p.createdAt || p.appointmentDate || p.dateString || p.date;
    if (!raw) return null;
    if (raw?.toDate) return raw.toDate();
    if (raw?.seconds) return new Date(raw.seconds * 1000);
    if (typeof raw === 'string') {
      if (raw.includes('/')) {
        const parts = raw.split('/');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(raw);
    }
    return null;
  };

  const todayPaid = revRecords.filter(p => {
    if (p.paymentStatus !== 'paid') return false;
    const d = getDateFromPatient(p);
    if (!d || isNaN(d.getTime())) return false;
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return ds === todayStr;
  });

  const total = todayPaid.reduce((s, p) => s + (Number(p.paymentAmount) || 0), 0);
  console.log("TODAY'S REVENUE AMOUNT:", total);
  process.exit(0);
}

getRevenue().catch(console.error);
