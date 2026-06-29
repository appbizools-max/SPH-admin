import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("--- users ---");
  const uSnap = await getDocs(collection(db, "users"));
  uSnap.forEach(d => {
    const data = d.data();
    console.log(`ID: ${d.id} | Name: ${data.name} | Role: ${data.role} | Email: ${data.email} | Phone: ${data.phone}`);
  });
}
run().catch(console.error);
