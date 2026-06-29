import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, orderBy, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const normalize = (str) => (str || '').toString().trim().toLowerCase();

const isBranchMatchHelper = (itemBranchId, itemBranchName, filterBranchId, branches) => {
  if (filterBranchId === 'all') return true;
  const selectedBranchName = branches.find(b => b.id === filterBranchId)?.name || '';

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
    if (dateVal.includes('T') && (dateVal.endsWith('Z') || dateVal.includes('+'))) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d;
    }
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else if (parts[2].length === 4) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
    }
  }

  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  return null;
};

async function heal() {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // branches
    const branchesSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'branch')));
    const branches = [];
    branchesSnap.forEach(d => branches.push({ id: d.id, ...d.data() }));

    // Patients
    const pSnap = await getDocs(query(collection(db, 'patients'), orderBy('createdAt', 'desc'), limit(5000)));
    const freshPatientsData = [];
    pSnap.forEach(d => freshPatientsData.push({ id: d.id, ...d.data() }));

    // 1. Get all paid and completed appointments
    const qPaid = query(collection(db, 'appointments'), where('paymentStatus', '==', 'paid'));
    const qCompleted = query(collection(db, 'appointments'), where('status', '==', 'completed'));
    const qDone = query(collection(db, 'appointments'), where('status', '==', 'done'));
    const [snapPaid, snapCompleted, snapDone] = await Promise.all([ getDocs(qPaid), getDocs(qCompleted), getDocs(qDone) ]);

    const apptsMap = new Map();
    snapPaid.forEach(d => { apptsMap.set(d.id, { id: d.id, ...d.data() }); });
    snapCompleted.forEach(d => { apptsMap.set(d.id, { id: d.id, ...d.data() }); });
    snapDone.forEach(d => { apptsMap.set(d.id, { id: d.id, ...d.data() }); });
    const paidAppts = Array.from(apptsMap.values());

    // 2. Get latest 5000 transactions and filter consultation ones
    const txQ = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(5000));
    const txSnap = await getDocs(txQ);
    const consultationTxs = [];
    const medicineTransactions = [];
    txSnap.forEach(d => {
        const data = d.data();
        if (data.type === 'consultation') {
            consultationTxs.push({ id: d.id, ...data });
        } else {
            medicineTransactions.push({ id: d.id, ...data });
        }
    });

    const updated = [...freshPatientsData];
    const idxMap = new Map(updated.map((p, i) => [p.id, i]));
    const phoneMap = new Map();
    updated.forEach((p, i) => {
        const cleanPhone = (p.phone || p.phoneNumber || p.contact || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone) phoneMap.set(cleanPhone, i);
    });

    paidAppts.forEach(appt => {
        const patientId = appt.patientId;
        if (!patientId || patientId === 'WALKIN_USER') return;

        const cleanApptPhone = (appt.phone || appt.patientPhone || '').replace(/\D/g, '').slice(-10);
        let idx = idxMap.get(patientId);
        if (idx === undefined && cleanApptPhone) {
            idx = phoneMap.get(cleanApptPhone);
        }

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
            fullName: appt.patientName || 'N/A',
            phone: appt.phone || appt.patientPhone || 'N/A',
            branchId: appt.branchId || '',
            branchName: appt.branchName || '',
            doctor: appt.doctorName || '',
            source: appt.source || 'Online',
            appointmentDate: appt.dateString || '',
            paymentStatus: appt.paymentStatus || 'unpaid',
            status: appt.status || '',
            paymentAmount: appt.amountPaid || 0,
            paymentMethod: appt.paymentMethod || 'N/A',
            paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt,
            registrationId: appt.registrationId || ''
            });
            idxMap.set(patientId, updated.length - 1);
        }
    });

    consultationTxs.forEach(tx => {
        const patientId = tx.patientId;
        const cleanTxPhone = (tx.phone || tx.patientPhone || '').replace(/\D/g, '').slice(-10);
        let idx = idxMap.get(patientId);
        if (idx === undefined && cleanTxPhone) {
            idx = phoneMap.get(cleanTxPhone);
        }
        
        if (idx !== undefined && updated[idx].paymentStatus !== 'paid') {
            updated[idx] = {
            ...updated[idx],
            paymentStatus: 'paid',
            paymentAmount: tx.amount || updated[idx].paymentAmount || 0,
            paymentMethod: tx.method || updated[idx].paymentMethod || 'N/A',
            paymentCollectedAt: tx.timestamp || updated[idx].paymentCollectedAt
            };
        }
    });

    const allRevenueRecords = [];
    const usedApptPatientIds = new Set();
    
    paidAppts.forEach(appt => {
        const patientId = appt.patientId;
        const p = idxMap.has(patientId) ? updated[idxMap.get(patientId)] : {};
        
        allRevenueRecords.push({
        ...p,
        ...appt,
        id: p.id || appt.patientId || appt.id,
        patientId: p.id || appt.patientId,
        appointmentId: appt.id,
        branchId: appt.branchId || p.branchId,
        branchName: appt.branchName || p.branchName,
        paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt || p.paymentCollectedAt,
        paymentAmount: appt.amountPaid || p.paymentAmount || p.amountPaid || 0,
        paymentMethod: appt.paymentMethod || p.paymentMethod || 'N/A',
        source: appt.source || p.source || 'Walk-in',
        paymentStatus: appt.paymentStatus === 'paid' ? 'paid' : (p.paymentStatus === 'paid' ? 'paid' : 'unpaid'),
        });
        
        const apptDateStr = appt.paymentCollectedAt ? new Date(appt.paymentCollectedAt).toDateString() : (appt.updatedAt ? new Date(appt.updatedAt).toDateString() : '');
        if (patientId) usedApptPatientIds.add(`${patientId}_${apptDateStr}`);
    });

    updated.forEach(p => {
        const isPaid = p.paymentStatus === 'paid';
        const isCompleted = p.status === 'completed' || p.status === 'done';
        if ((isPaid || isCompleted) && !usedApptPatientIds.has(p.id)) {
        allRevenueRecords.push(p);
        }
    });

    // Forms
    const mfSnap = await getDocs(collection(db, 'medicine_forms'));
    const medicineForms = [];
    mfSnap.forEach(d => { medicineForms.push({ id: d.id, ...d.data() }); });

    // NOW LOOP OVER BRANCHES AND SUM UP EVERYTHING!
    for (const branch of branches) {
        const branchId = branch.id;
        
        const filteredRevenuePatients = allRevenueRecords.filter(patient => {
            const isConsultationPayment = patient.paymentStatus === 'paid'
                ? (!patient.itemsPaid || patient.itemsPaid.consultation > 0 || (patient.itemsPaid.consultation === undefined && patient.itemsPaid.medicine === undefined))
                : true;
            if (!isConsultationPayment) return false;

            const matchesBranch = isBranchMatchHelper(patient.branchId, patient.branchName, branchId, branches);

            let matchesDate = false;
            let rawDateStr = patient.paymentCollectedAt || patient.appointmentDate || patient.completedAt || patient.createdAt || patient.date;
            if (rawDateStr) {
                let d = parseAnyDateObj(rawDateStr);
                if (d && !isNaN(d.getTime())) {
                    if (d.getFullYear() === 2026 && d.getMonth() === 5) matchesDate = true;
                }
            }
            return matchesBranch && matchesDate;
        });

        const paidPatients = filteredRevenuePatients.filter(p => p.paymentStatus === 'paid');
        const getExactPatientAmount = (p) => {
            if (p.itemsPaid?.consultation !== undefined) return Number(p.itemsPaid.consultation);
            return Number(p.paymentAmount || p.amountPaid || 0);
        };
        const totalCollectedFees = paidPatients.reduce((sum, p) => sum + getExactPatientAmount(p), 0);

        const filteredPharmacyTransactions = medicineTransactions.filter(tr => {
            if (tr.type === 'consultation') return false;
            const matchesBranch = isBranchMatchHelper(tr.branchId, tr.branchName, branchId, branches);
            let matchesDate = false;
            if (tr.timestamp) {
                let d = parseAnyDateObj(tr.timestamp);
                if (d && !isNaN(d.getTime())) {
                    if (d.getFullYear() === 2026 && d.getMonth() === 5) matchesDate = true;
                }
            }
            return matchesBranch && matchesDate;
        });
        const pharmacyTotal = filteredPharmacyTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const filteredMedicineForms = medicineForms.filter(form => {
            const matchesBranch = isBranchMatchHelper(form.branchId, form.branchName, branchId, branches);
            let matchesDate = false;
            if (form.createdAt) {
                let d = parseAnyDateObj(form.createdAt);
                if (d && !isNaN(d.getTime())) {
                    if (d.getFullYear() === 2026 && d.getMonth() === 5) matchesDate = true;
                }
            }
            return matchesBranch && matchesDate && form.paymentStatus === 'paid';
        });
        const medFormsTotalRevenue = filteredMedicineForms.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);

        const finalGrandTotal = totalCollectedFees + pharmacyTotal + medFormsTotalRevenue;

        console.log(`Branch: ${branch.name}`);
        console.log(`- Consultations: ${totalCollectedFees}`);
        console.log(`- Pharmacy Txs: ${pharmacyTotal}`);
        console.log(`- Medicine Forms: ${medFormsTotalRevenue}`);
        console.log(`Total: ₹${finalGrandTotal.toLocaleString('en-IN')}`);

        // Update DB
        const tgtQ = query(collection(db, 'monthly_targets'), where('month', '==', monthKey));
        const tgtSnap = await getDocs(tgtQ);
        tgtSnap.forEach(async docRef => {
            const data = docRef.data();
            if (data.branchId === branchId) {
                await updateDoc(doc(db, 'monthly_targets', docRef.id), { reached: finalGrandTotal });
            }
        });
    }

    setTimeout(() => process.exit(0), 3000);
}
heal();
