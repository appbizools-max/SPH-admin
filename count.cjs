const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
async function check() {
  const p = await db.collection('patients').count().get();
  console.log('patients:', p.data().count);
  const a = await db.collection('appointments').count().get();
  console.log('appointments:', a.data().count);
  const all = await db.collection('allpatients').count().get();
  console.log('allpatients:', all.data().count);
}
check();
