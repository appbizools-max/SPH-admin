import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

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

const normalizeBranch = (branchStr) => {
    if (!branchStr) return 'UNKNOWN';
    const s = branchStr.toLowerCase();
    if (s.includes('kphb')) return 'KPHB';
    if (s.includes('chand')) return 'CHANDNAGAR';
    if (s.includes('dil') || s.includes('dsnr')) return 'Dilshuknagar';
    if (s.includes('nalla')) return 'Nallagandla';
    return branchStr;
}

const parseAnyDateObj = (raw) => {
    if (!raw) return null;
    if (raw.toDate) return raw.toDate();
    if (raw.seconds) return new Date(raw.seconds * 1000);
    if (typeof raw === 'string') {
        if (raw.includes('/')) {
            const parts = raw.split('/');
            if (parts.length === 3) return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else if (raw.includes('-') && raw.split('-')[0].length === 4) {
            return new Date(raw);
        }
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    return null;
};

async function healDatabase() {
  try {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const consultationRevenueMap = {};
    const pharmacyMap = {};

    // 1. Fetch Patients
    const patientsSnap = await getDocs(collection(db, 'patients'));
    const pList = [];
    patientsSnap.forEach(d => pList.push({ id: d.id, ...d.data() }));

    // 2. Fetch Transactions (Consultation)
    const tSnap = await getDocs(query(collection(db, 'transactions'), where('type', '==', 'consultation')));
    
    const list = [...pList];
    const existingKeys = new Set(list.map(p => {
        const d = parseAnyDateObj(p.paymentCollectedAt || p.appointmentDate || p.createdAt || p.date);
        return `${p.id}_${d ? d.toDateString() : ''}`;
    }));

    tSnap.forEach(tDoc => {
        const t = tDoc.data();
        const tDate = parseAnyDateObj(t.timestamp);
        const k = `${t.patientId}_${tDate ? tDate.toDateString() : ''}`;

        if (!existingKeys.has(k)) {
            list.push({
                id: tDoc.id,
                fullName: t.patientName || 'Unknown',
                phone: t.phone || 'N/A',
                branchName: t.branch || t.branchName || 'Unknown',
                branchId: t.branchId || '',
                paymentCollectedAt: t.timestamp,
                paymentStatus: 'paid',
                paymentMethod: t.method,
                paymentAmount: t.amount,
                itemsPaid: { consultation: t.amount },
                isFromTransaction: true,
                patientId: t.patientId
            });
            existingKeys.add(k);
        }
    });

    // Calculate Consultation Revenue Map
    list.forEach(patient => {
        const isConsultationPayment = patient.paymentStatus === 'paid'
            ? (!patient.itemsPaid || patient.itemsPaid.consultation > 0 || (patient.itemsPaid.consultation === undefined && patient.itemsPaid.medicine === undefined))
            : true;
        
        if (isConsultationPayment && patient.paymentStatus === 'paid') {
            const d = parseAnyDateObj(patient.paymentCollectedAt || patient.appointmentDate || patient.completedAt || patient.createdAt || patient.date);
            if (d && !isNaN(d.getTime())) {
                const pMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (pMonthKey === monthKey) {
                    let bId = patient.branchId;
                    if (!bId || bId === 'Unknown') bId = patient.branchName;
                    const branchId = normalizeBranch(bId || 'Unknown');
                    const amount = Number(patient.itemsPaid?.consultation !== undefined ? patient.itemsPaid.consultation : (patient.paymentAmount || 0));
                    
                    if (!consultationRevenueMap[branchId]) consultationRevenueMap[branchId] = 0;
                    consultationRevenueMap[branchId] += amount;
                }
            }
        }
    });

    // Pharmacy from medicine_requests
    const pharmaSnap = await getDocs(collection(db, 'medicine_requests'));
    pharmaSnap.forEach(doc => {
        const data = doc.data();
        if (data.paymentStatus === 'paid') {
            const d = parseAnyDateObj(data.paymentCollectedAt || data.updatedAt || data.requestedAt);
            if (d && !isNaN(d.getTime())) {
                const pMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (pMonthKey === monthKey) {
                    let bId = data.branchId;
                    if (!bId || bId === 'Unknown') bId = data.branchName;
                    const branchId = normalizeBranch(bId || 'Unknown');
                    const amount = Number(data.paymentAmount || 0);
                    if (!pharmacyMap[branchId]) pharmacyMap[branchId] = 0;
                    pharmacyMap[branchId] += amount;
                }
            }
        }
    });

    console.log('Consultation Map:', consultationRevenueMap);
    console.log('Pharmacy Map:', pharmacyMap);

    const q = query(collection(db, 'monthly_targets'), where('month', '==', monthKey));
    const snapshot = await getDocs(q);
    
    snapshot.forEach(async docRef => {
      const data = docRef.data();
      const branchId = normalizeBranch(data.branchName || data.branchId);
      const totalRevenue = (consultationRevenueMap[branchId] || 0) + (pharmacyMap[branchId] || 0);
      
      console.log(`Branch: ${branchId}`);
      console.log(`Calculated Total Revenue: ₹${totalRevenue.toLocaleString()}`);
      
      await updateDoc(doc(db, 'monthly_targets', docRef.id), { reached: totalRevenue });
    });
    
    setTimeout(() => process.exit(0), 3000); // Wait for updates to finish
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

healDatabase();
