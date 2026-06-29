const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const app = initializeApp({ projectId: 'spiritual-homeopathy-3b552' });
const db = getFirestore(app);

const checkReqs = async () => {
    const snap = await getDocs(collection(db, 'medicine_requests'));
    snap.forEach(d => {
        console.log(d.id, d.data().amountPaid, d.data().amount);
    });
    process.exit(0);
};
checkReqs();
