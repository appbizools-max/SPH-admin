import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";

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

async function run() {
  try {
    console.log("Searching for Dr. Ramakrishna...");
    const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
    const snap = await getDocs(q);
    
    let docId = null;
    let docData = null;
    
    snap.forEach(d => {
      const u = d.data();
      const name = u.name || "";
      if (name.toLowerCase().includes("ramakrishna") || name.toLowerCase().includes("rama krishna")) {
        docId = d.id;
        docData = u;
      }
    });
    
    if (!docId) {
      console.error("Doctor 'Rama Krishna' not found!");
      process.exit(1);
    }
    
    console.log(`Found Doctor: ${docData.name} (ID: ${docId})`);
    
    // Dilshuknagar: Sunday, Monday, Tuesday, Wednesday, Thursday - 10:00AM - 2:00PM & 5:00PM - 8:00PM
    // Nallagandla: Friday, Saturday - 10:00AM - 8:00PM
    const dilshuknagarTimings = {
      0: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "20:00" }], // Sun
      1: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "20:00" }], // Mon
      2: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "20:00" }], // Tue
      3: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "20:00" }], // Wed
      4: [{ start: "10:00", end: "14:00" }, { start: "17:00", end: "20:00" }], // Thu
      5: [], // Fri Closed
      6: []  // Sat Closed
    };
    
    const nallagandlaTimings = {
      0: [], // Sun Closed
      1: [], // Mon Closed
      2: [], // Tue Closed
      3: [], // Wed Closed
      4: [], // Thu Closed
      5: [{ start: "10:00", end: "20:00" }], // Fri
      6: [{ start: "10:00", end: "20:00" }]  // Sat
    };
    
    const newTimings = [
      {
        branch: "Dilshuknagar",
        daySchedule: dilshuknagarTimings
      },
      {
        branch: "Nallagandla",
        daySchedule: nallagandlaTimings
      }
    ];
    
    console.log("Updating timings in Firestore...");
    const userRef = doc(db, 'users', docId);
    await updateDoc(userRef, {
      timings: newTimings
    });
    
    console.log("SUCCESS! Timings updated for Dr. Ramakrishna!");
    process.exit(0);
  } catch (err) {
    console.error("Error during execution:", err);
    process.exit(1);
  }
}

run();
