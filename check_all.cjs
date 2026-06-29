const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const app = initializeApp({ projectId: 'spiritual-homeopathy-3b552' });
const db = getFirestore(app);

const check = async () => {
    const snaps = await Promise.all([
        getDocs(collection(db, 'allpatients')),
        getDocs(collection(db, 'alltransactions')),
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'appointments'))
    ]);
    console.log("allpatients: " + snaps[0].size);
    console.log("alltransactions: " + snaps[1].size);
    console.log("patients: " + snaps[2].size);
    console.log("appointments: " + snaps[3].size);
    process.exit(0);
};
check();
