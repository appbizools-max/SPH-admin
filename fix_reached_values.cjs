const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

// Correct values as confirmed by admin
const CORRECT_VALUES = {
  'xS0281lEdPc0hUFrrNRPBMeQZsD3': { name: 'Chandanagar',   reached: 366930 },
  't7BiooFMRDU7DcgKFGnAPnJY0Qq2': { name: 'Dilshuknagar',  reached: 162018 },
  '1qj75oZZlWgN8P02OAeRNjCVMhM2': { name: 'Nallagandla',   reached: 120645 },
  'XRrXPAWzn4fKiwT387PKBLQZg323': { name: 'KPHB',           reached: 116100 },
};

async function fixReachedValues() {
  const monthKey = '2026-06';
  console.log(`Fixing reached values for month: ${monthKey}`);

  const snap = await getDocs(query(collection(db, 'monthly_targets'), where('month', '==', monthKey)));
  
  const updates = [];
  snap.forEach(d => {
    const data = d.data();
    const correct = CORRECT_VALUES[data.branchId];
    if (correct) {
      console.log(`Found: ${correct.name} (${data.branchId}) -> current reached: ${data.reached} -> will set to: ${correct.reached}`);
      updates.push({ docId: d.id, branchId: data.branchId, correct });
    }
  });

  if (updates.length === 0) {
    console.log('No matching documents found!');
    process.exit(1);
  }

  for (const u of updates) {
    await updateDoc(doc(db, 'monthly_targets', u.docId), { reached: u.correct.reached });
    console.log(`✅ Updated ${u.correct.name}: reached = ₹${u.correct.reached.toLocaleString('en-IN')}`);
  }

  console.log('\n--- DONE ---');
  console.log('Chandanagar : ₹3,66,930');
  console.log('Dilshuknagar: ₹1,62,018');
  console.log('Nallagandla : ₹1,20,645');
  console.log('KPHB        : ₹1,16,100');
  console.log('\nBoth Receptionist Web and App will now show the correct values!');
  process.exit(0);
}

fixReachedValues().catch(e => { console.error(e); process.exit(1); });
