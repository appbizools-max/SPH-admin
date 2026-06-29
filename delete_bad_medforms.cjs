const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

const runDelete = async () => {
    const snap = await getDocs(collection(db, 'medicine_forms'));
    let count = 0;
    
    for (const d of snap.docs) {
        const data = d.data();
        const name = (data.patientName || '').toLowerCase().trim();
        if (name === 'gxi' || name === 'sree' || name === 'iron man') {
            await deleteDoc(doc(db, 'medicine_forms', d.id));
            count++;
        }
    }
    
    console.log(`Deleted ${count} invalid medicine subscription records.`);
    process.exit(0);
};

runDelete().catch(console.error);
