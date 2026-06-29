const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const app = initializeApp({ projectId: 'spiritual-homeopathy-3b552' });
const db = getFirestore(app);

const forceZero = async () => {
    const targetsSnap = await getDocs(collection(db, 'monthly_targets'));
    for (const d of targetsSnap.docs) {
        await updateDoc(doc(db, 'monthly_targets', d.id), { reached: 0 });
    }
    console.log('Done zeroing targets!');
    process.exit(0);
};
forceZero();
