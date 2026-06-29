import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB-YOUR_API_KEY", // Note: The client uses real firebase config, but I need to extract it from the codebase!
};
