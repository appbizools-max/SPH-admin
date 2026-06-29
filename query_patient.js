import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const run = async () => {
  try {
    console.log("Querying patients for WK-0306-9875...");
    const qPatients = query(collection(db, 'patients'), where('registrationId', '==', 'WK-0306-9875'));
    const snapPatients = await getDocs(qPatients);
    
    if (snapPatients.empty) {
      console.log("No patient found with WK-0306-9875 in patients collection.");
    } else {
      snapPatients.forEach(doc => {
        console.log("PATIENT DOCUMENT ID:", doc.id);
        console.log("DATA:", doc.data());
      });
    }

    console.log("\nQuerying appointments for phone 2345689875...");
    const qAppts = query(collection(db, 'appointments'), where('phone', '==', '2345689875'));
    const snapAppts = await getDocs(qAppts);
    
    if (snapAppts.empty) {
      console.log("No appointment found with phone 2345689875 in appointments collection.");
    } else {
      snapAppts.forEach(doc => {
        console.log("APPOINTMENT DOCUMENT ID:", doc.id);
        console.log("DATA:", doc.data());
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error executing query:", error);
    process.exit(1);
  }
};

run();
