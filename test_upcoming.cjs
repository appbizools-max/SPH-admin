const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
  const q = await db.collection('allpatients').where('status', 'in', ['waiting', 'confirmed', 'booked', 'pending', 'in-consultation']).get();
  console.log("Found:", q.size);
  let c = 0;
  q.forEach(doc => {
      const data = doc.data();
      const dateStr = data.appointmentDate || data.dateString || data.date;
      console.log(data.fullName || data.patientName, dateStr, data.status, data.branchId);
      c++;
  });
  console.log("Total matched:", c);
}
check();
