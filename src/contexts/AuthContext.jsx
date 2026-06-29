import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          let candidateDocs = [];

          // 1. Try fetching by UID document ID
          try {
            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              candidateDocs.push({ id: docSnap.id, ...docSnap.data() });
            }
          } catch (e) {
            console.log('Error reading user by doc ID:', e);
          }

          // 2. Try querying by uid field
          try {
            const qUid = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
            const snapUid = await getDocs(qUid);
            snapUid.forEach(d => {
              candidateDocs.push({ id: d.id, ...d.data() });
            });
          } catch (e) {
            console.log('Error querying by uid field:', e);
          }

          // 3. Try phone number matches
          let phoneToMatch = null;
          if (currentUser.phoneNumber) {
            phoneToMatch = currentUser.phoneNumber.replace('+91', '').trim();
          } else if (currentUser.email && currentUser.email.startsWith('dummyphone_')) {
            phoneToMatch = currentUser.email.replace('dummyphone_', '').replace('@sph.com', '').trim();
          }

          if (phoneToMatch) {
            const phoneNum = parseInt(phoneToMatch, 10);
            const phoneQueries = [
              query(collection(db, 'users'), where('phone', '==', phoneNum)),
              query(collection(db, 'users'), where('phone', '==', phoneToMatch))
            ];
            for (const pq of phoneQueries) {
              try {
                const snapPhone = await getDocs(pq);
                snapPhone.forEach(d => {
                  candidateDocs.push({ id: d.id, ...d.data() });
                });
              } catch (e) {
                console.log('Error querying by phone:', e);
              }
            }
          }

          // 4. Try email matches
          if (currentUser.email && !currentUser.email.startsWith('dummyphone_')) {
            const emailToUse = currentUser.email.toLowerCase().trim();
            try {
              const qEmail = query(collection(db, 'users'), where('email', '==', emailToUse));
              const snapEmail = await getDocs(qEmail);
              snapEmail.forEach(d => {
                candidateDocs.push({ id: d.id, ...d.data() });
              });
            } catch (e) {
              console.log('Error querying by email:', e);
            }
          }

          // Deduplicate candidate documents by Firestore document ID
          const uniqueCandidatesMap = {};
          candidateDocs.forEach(doc => {
            uniqueCandidatesMap[doc.id] = doc;
          });
          const uniqueCandidates = Object.values(uniqueCandidatesMap);

          // Find the best staff match
          // Prioritize: active status, valid staff role, and matching phone number if applicable
          const staffRoles = ['doctor', 'receptionist', 'staff', 'hr'];
          
          let bestMatch = uniqueCandidates.find(d => 
            d.status === 'active' && 
            staffRoles.includes(d.role) && 
            phoneToMatch && String(d.phone) === phoneToMatch
          );

          if (!bestMatch) {
            bestMatch = uniqueCandidates.find(d => 
              d.status === 'active' && 
              staffRoles.includes(d.role)
            );
          }

          if (!bestMatch) {
            bestMatch = uniqueCandidates.find(d => 
              staffRoles.includes(d.role)
            );
          }

          if (!bestMatch && uniqueCandidates.length > 0) {
            bestMatch = uniqueCandidates[0];
          }

          if (bestMatch) {
            // Self-healing: associate authenticated UID field if missing or mismatched
            if (!bestMatch.uid || bestMatch.uid !== currentUser.uid) {
              try {
                await updateDoc(doc(db, 'users', bestMatch.id), { uid: currentUser.uid });
                bestMatch.uid = currentUser.uid;
              } catch (err) {
                console.warn("Could not associate UID with user doc:", err);
              }
            }
            setUserData(bestMatch);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
