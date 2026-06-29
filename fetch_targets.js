import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a",
  measurementId: "G-SWSZ49BB14"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchTargets() {
  try {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const q = query(collection(db, 'monthly_targets'), where('month', '==', monthKey));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Branch: ${data.branchName || data.branchId}`);
      console.log(`Target: ₹${Number(data.target || 0).toLocaleString()}`);
      console.log(`Reached: ₹${Number(data.reached || 0).toLocaleString()}`);
      console.log(`Remaining: ₹${Math.max(Number(data.target || 0) - Number(data.reached || 0), 0).toLocaleString()}`);
      console.log('-------------------------');
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fetchTargets();
