const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const app = initializeApp({
  apiKey: 'AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q',
  authDomain: 'spiritual-homeopathy-3b552.firebaseapp.com',
  projectId: 'spiritual-homeopathy-3b552'
});
const db = getFirestore(app)

const checkCollections = async () => {
  const patientsSnap = await getDocs(collection(db, 'allpatients'));
  const transSnap = await getDocs(collection(db, 'alltransactions'));
  console.log(`allpatients has ${patientsSnap.size} documents.`);
  console.log(`alltransactions has ${transSnap.size} documents.`);
  process.exit(0);
};

checkCollections().catch(console.error);
