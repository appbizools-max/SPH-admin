import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { auth } from '../../firebase';
import { initializeApp } from 'firebase/app';
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Eye, EyeOff, X } from 'lucide-react';

const AddStaff = () => {
  const { userData } = useAuth();
  const [branches, setBranches] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Staff State
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'staff',
    doctorType: 'employee', // 'head' | 'employee'
    branchId: '',
    salary: '',
    loginTime: '09:00 AM',
    logoutTime: '06:00 PM'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  const fetchBranches = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.role === 'branch') {
          list.push({ id: doc.id, ...d });
        }
      });
      setBranches(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (['doctor', 'staff', 'receptionist', 'hr'].includes(d.role)) {
          list.push({ id: doc.id, ...d });
        }
      });
      setStaffMembers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e) => {
    e.preventDefault();

    if (!newStaff.name.trim()) {
      alert('Please enter staff name');
      return;
    }
    if (!newStaff.phone || newStaff.phone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    const isEmailRole = ['staff', 'hr'].includes(newStaff.role);
    const cleanPhone = newStaff.phone.replace(/\D/g, '').slice(-10);

    // Email is required for Staff and HR in Web Admin
    const needsEmail = ['staff', 'hr'].includes(newStaff.role);
    if (needsEmail) {
      if (!newStaff.email || !newStaff.email.includes('@')) {
        alert('Please enter a valid Email ID');
        return;
      }
    }

    if (isEmailRole) {
      if (!newStaff.password) {
        alert('Please enter a Password');
        return;
      }
    }

    const needsBranch = ['staff', 'receptionist'].includes(newStaff.role);
    if (needsBranch && !newStaff.branchId) {
      alert('Please select a branch');
      return;
    }

    const needsSalarySchedule = newStaff.role === 'staff' || (newStaff.role === 'doctor' && newStaff.doctorType === 'employee');
    if (needsSalarySchedule) {
      if (!newStaff.salary || isNaN(parseFloat(newStaff.salary))) {
        alert('Please enter a valid monthly salary amount');
        return;
      }
    }

    setIsCreatingStaff(true);
    try {
      const branch = newStaff.branchId ? branches.find(b => b.id === newStaff.branchId) : null;
      const emailToUse = newStaff.email ? newStaff.email.toLowerCase().trim() : '';

      // Check if email already exists in Firestore
      if (isEmailRole && emailToUse) {
        const qEmail = query(collection(db, 'users'), where('email', '==', emailToUse));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          alert('Failed to authorize staff: A user with this email address already exists in the system.');
          setIsCreatingStaff(false);
          return;
        }
      }

      // Check if phone number already exists in Firestore
      if (cleanPhone) {
        const qPhone = query(collection(db, 'users'), where('phone', '==', cleanPhone));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          alert('Failed to authorize staff: A user with this phone number already exists in the system.');
          setIsCreatingStaff(false);
          return;
        }
      }

      if (isEmailRole) {
        const secondaryApp = initializeApp(auth.app.options, 'SecondaryApp_HR_Staff_' + Date.now());
        const secondaryAuth = getSecondaryAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailToUse, newStaff.password);
        const newUserId = userCredential.user.uid;

        const docData = {
          uid: newUserId,
          name: newStaff.name.trim(),
          phone: cleanPhone,
          email: emailToUse,
          role: newStaff.role,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        if (newStaff.role === 'staff') {
          docData.branchId = newStaff.branchId;
          docData.branchName = branch?.name || 'Unknown';
          docData.salary = parseFloat(newStaff.salary);
          docData.loginTime = newStaff.loginTime;
          docData.logoutTime = newStaff.logoutTime;
        }

        await setDoc(doc(db, 'users', newUserId), docData);
        await secondaryAuth.signOut();
      } else {
        // Doctor or Receptionist: Phone-based (no password)
        const docData = {
          name: newStaff.name.trim(),
          phone: cleanPhone,
          role: newStaff.role,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        if (newStaff.role === 'receptionist') {
          docData.branchId = newStaff.branchId;
          docData.branchName = branch?.name || 'Unknown';
        } else if (newStaff.role === 'doctor') {
          docData.doctorType = newStaff.doctorType;
          if (newStaff.doctorType === 'employee') {
            docData.salary = parseFloat(newStaff.salary);
            docData.loginTime = newStaff.loginTime;
            docData.logoutTime = newStaff.logoutTime;
          }
        }

        await addDoc(collection(db, 'users'), docData);
      }

      setShowAddStaff(false);
      setNewStaff({ name: '', phone: '', email: '', password: '', role: 'staff', doctorType: 'employee', branchId: '', salary: '', loginTime: '09:00 AM', logoutTime: '06:00 PM' });
      fetchStaff();
      alert('Staff member authorized successfully!');
    } catch (error) {
      console.error('Error authorizing staff:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Failed to authorize staff: This email address is already registered in Firebase Authentication. Since this staff member was previously deleted from the portal, their login account must be deleted from the Firebase Console (Authentication tab) before you can re-register them with this email.');
      } else {
        alert('Failed to authorize staff: ' + error.message);
      }
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      try {
        await deleteDoc(doc(db, 'users', staffId));
        fetchStaff();
        alert('Staff member removed from database successfully.\n\nNote: To re-add this staff member with the same email, you must also delete their account from the Firebase Authentication console.');
      } catch (error) {
        console.error('Error removing staff:', error);
        alert('Failed to remove staff.');
      }
    }
  };

  const handleEditStaffPhone = async (staffId, currentPhone) => {
    const newPhone = window.prompt("Enter new phone number (+91):", currentPhone);
    if (newPhone !== null && newPhone !== currentPhone) {
      try {
        await updateDoc(doc(db, 'users', staffId), { phone: newPhone });
        fetchStaff();
        alert('Staff phone number updated successfully.');
      } catch (error) {
        console.error('Error updating phone:', error);
        alert('Failed to update phone.');
      }
    }
  };

  const isDoctorOrHR = ['doctor', 'hr'].includes(newStaff.role);
  const isRestrictedOff = newStaff.restricted === 'off';
  const hideSalaryAndSchedule = isDoctorOrHR && isRestrictedOff;

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Staff Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage doctor credentials and authorized reception profiles</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddStaff(true)}>
          <Plus size={16} /> Add Staff Member
        </button>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>Loading employee directory...</div>
      ) : (
        <div className="table-container glass-panel">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {staffMembers.map((member) => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>{member.name}</td>
                  <td><span className="badge badge-secondary">{member.role?.toUpperCase()}</span></td>
                  <td>{member.phone || 'N/A'}</td>
                  <td>{member.branchName || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '6px' }} onClick={() => handleEditStaffPhone(member.id, member.phone)} title="Edit Phone">
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Edit</span>
                      </button>
                      <button className="btn-secondary" style={{ color: '#ef4444', padding: '6px' }} onClick={() => handleDeleteStaff(member.id)} title="Remove Staff">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddStaff && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel" style={{ width: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h3>Add Staff Member</h3>
              <button onClick={() => setShowAddStaff(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff}>
              {/* 1. Role Selection */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Assign Staff Role</label>
                <select
                  className="glass-input"
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                >
                  <option value="staff">Regular Staff</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                  <option value="hr">HR Manager</option>
                </select>
              </div>

              {/* 2. Doctor Category (only if role is Doctor) */}
              {newStaff.role === 'doctor' && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Doctor Category</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      className={newStaff.doctorType === 'head' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1 }}
                      onClick={() => setNewStaff({ ...newStaff, doctorType: 'head' })}
                    >
                      Head Doctor
                    </button>
                    <button
                      type="button"
                      className={newStaff.doctorType === 'employee' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1 }}
                      onClick={() => setNewStaff({ ...newStaff, doctorType: 'employee' })}
                    >
                      Employee Doctor
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Personal Details */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="glass-input"
                  required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Mobile Number (without +91)</label>
                  <input
                    type="tel"
                    className="glass-input"
                    required
                    placeholder="10-digit number"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  />
                </div>
                {['staff', 'hr'].includes(newStaff.role) && (
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="glass-input"
                      required={['staff', 'hr'].includes(newStaff.role)}
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {['staff', 'hr'].includes(newStaff.role) && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="glass-input"
                      required
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Branch Assignment (Only for Regular Staff or Receptionist) */}
              {['staff', 'receptionist'].includes(newStaff.role) && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Branch Assignment</label>
                  <select
                    className="glass-input"
                    value={newStaff.branchId}
                    onChange={(e) => setNewStaff({ ...newStaff, branchId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 5. Salary & Work Schedule (Only for Regular Staff or Employee Doctor) */}
              {(newStaff.role === 'staff' || (newStaff.role === 'doctor' && newStaff.doctorType === 'employee')) && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Base Salary (₹)</label>
                      <input
                        type="number"
                        className="glass-input"
                        required
                        value={newStaff.salary}
                        onChange={(e) => setNewStaff({ ...newStaff, salary: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Shift Hours</label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input type="text" className="glass-input" placeholder="09:00 AM" value={newStaff.loginTime} onChange={(e) => setNewStaff({ ...newStaff, loginTime: e.target.value })} />
                        <input type="text" className="glass-input" placeholder="06:00 PM" value={newStaff.logoutTime} onChange={(e) => setNewStaff({ ...newStaff, logoutTime: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#f97316', margin: '0 0 4px 0' }}>Deduction Rule</p>
                    <p style={{ fontSize: '11px', color: '#c2410c', margin: 0 }}>
                      Every 3 days late (more than 15 min) = Rs 500 deduction from salary
                    </p>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isCreatingStaff}>
                {isCreatingStaff ? 'Saving...' : 'Create Employee Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStaff;
