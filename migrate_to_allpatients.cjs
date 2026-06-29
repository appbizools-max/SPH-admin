const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, doc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

const migrateData = async () => {
  console.log("Starting Migration to 'allpatients' collection...");

  try {
    // 1. Fetch Patients
    console.log("Fetching patients...");
    const pSnap = await getDocs(collection(db, 'patients'));
    const patients = [];
    const idxMap = new Map();
    const phoneMap = new Map();

    pSnap.forEach(d => {
      const data = { id: d.id, ...d.data(), _originalSource: 'patients' };
      patients.push(data);
      idxMap.set(data.id, patients.length - 1);
      
      const cleanPhone = (data.phone || data.phoneNumber || data.contact || '').replace(/\D/g, '').slice(-10);
      if (cleanPhone) phoneMap.set(cleanPhone, patients.length - 1);
    });
    console.log(`Found ${patients.length} patients.`);

    // 2. Fetch Appointments
    console.log("Fetching appointments...");
    const aSnap = await getDocs(collection(db, 'appointments'));
    const appointments = [];
    aSnap.forEach(d => {
      appointments.push({ id: d.id, ...d.data(), _originalSource: 'appointments' });
    });
    console.log(`Found ${appointments.length} appointments.`);

    // 3. Fetch Transactions (for consultation payment upgrades)
    console.log("Fetching transactions for payment upgrades...");
    const tSnap = await getDocs(collection(db, 'transactions'));
    const consultationTxs = [];
    tSnap.forEach(d => {
      const tx = d.data();
      if (tx.type === 'consultation') {
        consultationTxs.push({ id: d.id, ...tx });
      }
    });

    // Merge transactions into patients first (like SuperAdminDashboard)
    consultationTxs.forEach(tx => {
      const pId = tx.patientId;
      if (!pId) return;

      let idx = idxMap.get(pId);
      if (idx !== undefined && patients[idx].paymentStatus !== 'paid') {
        patients[idx] = {
          ...patients[idx],
          paymentStatus: 'paid',
          paymentAmount: tx.amount || patients[idx].paymentAmount || 0,
          paymentMethod: tx.method || patients[idx].paymentMethod || 'N/A',
          paymentCollectedAt: tx.timestamp || patients[idx].paymentCollectedAt
        };
      }
    });

    // 4. Merge Logic
    const unifiedRecords = [];
    const usedApptPatientIds = new Set();

    appointments.forEach(appt => {
      const patientId = appt.patientId;
      let p = {};

      if (patientId && patientId !== 'WALKIN_USER') {
        let idx = idxMap.get(patientId);
        if (idx === undefined) {
           const cleanApptPhone = (appt.phone || appt.patientPhone || '').replace(/\D/g, '').slice(-10);
           if (cleanApptPhone) idx = phoneMap.get(cleanApptPhone);
        }
        if (idx !== undefined) p = patients[idx];
      }
      
      const apptDateStr = appt.paymentCollectedAt ? new Date(appt.paymentCollectedAt).toDateString() : (appt.updatedAt ? new Date(appt.updatedAt).toDateString() : '');
      if (patientId) usedApptPatientIds.add(`${patientId}_${apptDateStr}`);

      const newId = appt.id; // The unique visit ID will be the appointment ID

      unifiedRecords.push({
        ...p,
        ...appt,
        id: newId,
        patientId: p.id || appt.patientId || '',
        appointmentId: appt.id,
        branchId: appt.branchId || p.branchId || '',
        branchName: appt.branchName || p.branchName || '',
        paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt || p.paymentCollectedAt || null,
        paymentAmount: appt.amountPaid || p.paymentAmount || p.amountPaid || 0,
        paymentMethod: appt.paymentMethod || p.paymentMethod || 'N/A',
        source: appt.source || p.source || 'Walk-in',
        paymentStatus: appt.paymentStatus === 'paid' ? 'paid' : (p.paymentStatus === 'paid' ? 'paid' : 'unpaid'),
        status: appt.status || p.status || '',
        itemsPaid: p.itemsPaid || appt.itemsPaid || null,
        paymentSplitDetails: appt.paymentSplitDetails || p.paymentSplitDetails || null,
        registrationId: p.registrationId || p.regId || appt.registrationId || appt.regId || '',
        fullName: p.fullName || p.patientName || appt.patientName || appt.fullName || 'N/A',
        phone: p.phone || p.patientPhone || p.phoneNumber || p.contact || appt.phone || appt.patientPhone || 'N/A',
        _dataType: 'unified_appointment',
        createdAt: appt.createdAt || p.createdAt || new Date().toISOString()
      });
    });

    // 5. Add Standalone Patients (Walk-ins or legacy without explicit appointments)
    patients.forEach(p => {
      // If this patient wasn't merged into an appointment OR they represent a generic patient record
      // We will push them as a standalone record to ensure no data is lost.
      if (!usedApptPatientIds.has(`${p.id}_`)) {
        unifiedRecords.push({
          ...p,
          id: p.id,
          patientId: p.id,
          appointmentId: null,
          branchId: p.branchId || '',
          branchName: p.branchName || '',
          paymentCollectedAt: p.paymentCollectedAt || null,
          paymentAmount: p.paymentAmount || p.amountPaid || 0,
          paymentMethod: p.paymentMethod || 'N/A',
          source: p.source || 'Walk-in',
          paymentStatus: p.paymentStatus || 'unpaid',
          status: p.status || '',
          itemsPaid: p.itemsPaid || null,
          paymentSplitDetails: p.paymentSplitDetails || null,
          registrationId: p.registrationId || p.regId || '',
          fullName: p.fullName || p.patientName || 'N/A',
          phone: p.phone || p.phoneNumber || p.contact || p.patientPhone || 'N/A',
          _dataType: 'standalone_patient',
          createdAt: p.createdAt || new Date().toISOString()
        });
      }
    });

    console.log(`Generated ${unifiedRecords.length} unified records. Starting upload to 'allpatients'...`);

    // 6. Upload to Firestore
    let count = 0;
    const batchSize = 500;
    
    // We upload sequentially or in small chunks to avoid memory/network issues
    for (const record of unifiedRecords) {
      if (!record.id) continue;
      await setDoc(doc(db, 'allpatients', record.id), record);
      count++;
      if (count % batchSize === 0) {
        console.log(`Uploaded ${count} / ${unifiedRecords.length}...`);
      }
    }

    console.log(`✅ Success! Migrated ${count} unified records to 'allpatients' collection.`);
    process.exit(0);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateData();
