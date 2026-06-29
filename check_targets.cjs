const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

const checkTargets = async () => {
    const targetsSnap = await getDocs(query(collection(db, 'monthly_targets'), where('month', '==', '2026-06')));
    
    targetsSnap.forEach(doc => {
        console.log(`${doc.id} - ${doc.data().branchName}: ${doc.data().reached}`);
    });
    process.exit(0);
};

checkTargets().catch(console.error);
