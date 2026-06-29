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
  console.log("--- shared_media ---");
  const smSnap = await getDocs(collection(db, "shared_media"));
  smSnap.forEach(d => console.log(d.id, "=>", d.data()));

  console.log("--- media_folders ---");
  const mfSnap = await getDocs(collection(db, "media_folders"));
  mfSnap.forEach(d => console.log(d.id, "=>", d.data()));

  console.log("--- media_items ---");
  const miSnap = await getDocs(collection(db, "media_items"));
  miSnap.forEach(d => console.log(d.id, "=>", d.data()));

  console.log("--- patients ---");
  const pSnap = await getDocs(collection(db, "patients"));
  pSnap.forEach(d => {
    const data = d.data();
    console.log(d.id, "=> Name:", data.fullName, "Phone:", data.phone, "rewardPoints:", data.rewardPoints);
  });
}
run().catch(console.error);