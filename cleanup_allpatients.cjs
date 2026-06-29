const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app);

const cleanup = async () => {
  console.log("Wiping allpatients collection...");
  const snap = await getDocs(collection(db, 'allpatients'));
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'allpatients', d.id));
    count++;
  }
  console.log(`Deleted ${count} records. Collection is now perfectly empty.`);
  process.exit(0);
};

cleanup();
