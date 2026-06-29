import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Eye, EyeOff, Mail, Phone, Lock, ShieldCheck } from 'lucide-react';
import logo from '../assets/SPH ADMIN.png';

const Login = () => {
  const [loginMode, setLoginMode] = useState('email'); // 'email' or 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [staffData, setStaffData] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.warn('Error clearing recaptcha on unmount:', e);
        }
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!phone || cleanPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const phoneNum = parseInt(cleanPhone, 10);
      let q = query(collection(db, 'users'), where('phone', '==', phoneNum));
      let querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        q = query(collection(db, 'users'), where('phone', '==', cleanPhone));
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        q = query(collection(db, 'users'), where('phone', '==', phone.trim()));
        querySnapshot = await getDocs(q);
      }

      if (querySnapshot.empty) {
        setError('Unauthorized: No staff account found with this phone number.');
        setIsLoading(false);
        return;
      }

      const foundStaff = querySnapshot.docs[0].data();
      const roleLower = String(foundStaff.role || '').toLowerCase().trim();
      if (roleLower !== 'doctor' && roleLower !== 'receptionist') {
        setError('Unauthorized: Mobile OTP login is restricted to Doctors and Receptionists.');
        setIsLoading(false);
        return;
      }
      if (foundStaff.status === 'inactive') {
        setError('Unauthorized: Your staff account access has been suspended/revoked.');
        setIsLoading(false);
        return;
      }
      setStaffData(foundStaff);

      // Initialize RecaptchaVerifier
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          badge: 'inline'
        });
      }

      const formattedPhone = `+91${cleanPhone}`;
      const result = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setVerificationId(result.verificationId);
    } catch (err) {
      console.error('Error sending OTP:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying to send another verification OTP code.');
      } else {
        setError(err.message || 'Failed to send OTP.');
      }
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (clearErr) {
          console.warn('Verifier clear error:', clearErr);
        }
        window.recaptchaVerifier = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (!confirmationResult) {
        setError('Confirmation session expired. Please request OTP again.');
        setIsLoading(false);
        return;
      }
      const userCredential = await confirmationResult.confirm(verificationCode);

      // Log login activity
      await addDoc(collection(db, 'activity_logs'), {
        userId: userCredential.user.uid,
        userName: staffData?.name || 'Staff Member',
        userRole: staffData?.role || 'staff',
        branchId: staffData?.branchId || '',
        action: 'login',
        timestamp: serverTimestamp(),
        device: 'Web Browser'
      });
    } catch (err) {
      console.warn('OTP verification failed:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many verification attempts. Please wait a few minutes and try again.');
      } else {
        setError('Invalid code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const emailToUse = email.includes('@') ? email.toLowerCase().replace(/\s+/g, '') : `${email}@sph.com`.toLowerCase().replace(/\s+/g, '');
      console.log('Attempting login with:', emailToUse);
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);

      // Verify user document in users
      let foundStaff = null;
      let foundStaffDocId = null;

      // 1. Try fetching by UID first
      const docRef = doc(db, 'users', userCredential.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        foundStaff = docSnap.data();
        foundStaffDocId = docSnap.id;
      } else {
        // 2. Try querying by uid field
        const qUid = query(collection(db, 'users'), where('uid', '==', userCredential.user.uid));
        const querySnapshotUid = await getDocs(qUid);
        if (!querySnapshotUid.empty) {
          foundStaff = querySnapshotUid.docs[0].data();
          foundStaffDocId = querySnapshotUid.docs[0].id;
        } else {
          // 3. Query by email
          const q = query(collection(db, 'users'), where('email', '==', emailToUse));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            foundStaff = querySnapshot.docs[0].data();
            foundStaffDocId = querySnapshot.docs[0].id;
          }
        }
      }

      if (!foundStaff) {
        setError('Unauthorized: No user account found.');
        await auth.signOut();
        setIsLoading(false);
        return;
      }

      if (foundStaff.status === 'inactive') {
        setError('Unauthorized: Your account has been suspended.');
        await auth.signOut();
        setIsLoading(false);
        return;
      }

      // Associate UID field if missing
      if (foundStaffDocId && (!foundStaff.uid || foundStaff.uid !== userCredential.user.uid)) {
        try {
          await updateDoc(doc(db, 'users', foundStaffDocId), { uid: userCredential.user.uid });
        } catch (updateErr) {
          console.warn('Could not associate UID with user doc:', updateErr);
        }
      }

      try {
        // Log login activity
        await addDoc(collection(db, 'activity_logs'), {
          userId: userCredential.user.uid,
          userName: foundStaff?.name || 'Staff Member',
          userRole: foundStaff?.role || 'staff',
          branchId: foundStaff?.branchId || '',
          action: 'login',
          timestamp: serverTimestamp(),
          device: 'Web Browser'
        });
      } catch (logErr) {
        console.warn('Non-critical: Failed to write activity log', logErr);
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid username or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. This account has been temporarily locked. Please wait a few minutes and try again.');
      } else {
        setError('Login failed: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', backgroundImage: 'radial-gradient(circle at center, rgba(37, 142, 200, 0.15) 0, var(--bg-dark) 50%)' }}>
      <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <img src={logo} alt="Spiritual Homeopathy Logo" style={{ height: '70px', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Spiritual Homeopathy</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Authorized Staff Portal</p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
          <button
            onClick={() => { setLoginMode('email'); setError(''); setVerificationId(''); }}
            style={{ flex: 1, padding: '10px', background: loginMode === 'email' ? 'var(--secondary)' : 'none', border: 'none', color: '#1e73a3', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'all 0.3s' }}
          >
            Email Login
          </button>
          <button
            onClick={() => { setLoginMode('phone'); setError(''); setVerificationId(''); }}
            style={{ flex: 1, padding: '10px', background: loginMode === 'phone' ? 'var(--secondary)' : 'none', border: 'none', color: '#1e73a3', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'all 0.3s' }}
          >
            Mobile OTP
          </button>
        </div>
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {loginMode === 'email' ? (
          <form onSubmit={handleEmailLogin}>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="glass-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. staff or admin@sph.com"
                  style={{ paddingLeft: '40px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="glass-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ paddingRight: '48px', paddingLeft: '40px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={!verificationId ? handleSendOTP : handleVerifyOTP}>
            {!verificationId ? (
              <>
                <div className="form-group">
                  <label className="form-label">Staff Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      className="glass-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="10-digit number"
                      style={{ paddingLeft: '40px' }}
                    />
                    <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isLoading}>
                  {isLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                  Verification code sent to +91 {phone}
                </p>
                <div className="form-group">
                  <label className="form-label">Verification OTP</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="glass-input"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      placeholder="e.g. 123456"
                      style={{ paddingLeft: '40px' }}
                    />
                    <ShieldCheck size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <button
                  type="button"
                  onClick={() => { setVerificationId(''); setVerificationCode(''); setError(''); }}
                  style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Change Phone Number
                </button>
              </>
            )}
          </form>
        )}
        <style>{`
          .grecaptcha-badge { display: none !important; }
        `}</style>
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Login;

