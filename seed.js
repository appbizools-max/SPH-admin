import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const seedSuperAdmin = async () => {
  try {
    const email = 'admin@gmail.com';
    const password = 'admin123';
    
    console.log('Creating super admin...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await setDoc(doc(db, 'users', user.uid), {
      name: 'Super Admin',
      email: email,
      role: 'superadmin',
      createdAt: new Date().toISOString()
    });
    
    console.log('Super admin created successfully!');
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Super admin already exists. You can login with admin@gmail.com / admin123');
      process.exit(0);
    }
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
