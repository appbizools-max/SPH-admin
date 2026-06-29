const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const app = initializeApp({ projectId: 'spiritual-homeopathy-3b552' });
const db = getFirestore(app);

const checkPats = async () => {
    const snap = await getDocs(collection(db, 'allpatients'));
    snap.forEach(d => {
        console.log(d.id, d.data().paymentAmount, d.data().amount, d.data().amountPaid);
    });
    process.exit(0);
};
checkPats();
