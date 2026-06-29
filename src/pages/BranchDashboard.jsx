import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, storage } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LogOut, Users, Plus, Upload, X, FileImage, Camera, Eye, EyeOff, RotateCcw, RotateCw, ZoomIn, ZoomOut, UserCheck, Activity, Clock, FileText, Briefcase, ExternalLink, ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc } from 'firebase/firestore';
import logo from '../assets/SH logo.pdf.png';
const BranchDashboard = () => {
  const { user, userData } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const toggleSidebar = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };
  const [patients, setPatients] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activeTab, setActiveTab] = useState('patients'); // patients, staff, logs, leaves
  const [staffMembers, setStaffMembers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'receptionist',
    restricted: 'on',
    salary: '',
    loginTime: '09:00',
    logoutTime: '18:00'
  });
  // Pharmacy Revenue State
  const [medicineTransactions, setMedicineTransactions] = useState([]);
  const [medicineForms, setMedicineForms] = useState([]);
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [pharmacyFromDate, setPharmacyFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [pharmacyToDate, setPharmacyToDate] = useState(new Date().toISOString().split('T')[0]);
  const [pharmacyMethod, setPharmacyMethod] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    registrationId: '',
    phone: '',
    email: '',
    source: 'Walk-in',
    subject: '',
    doctor: 'Dr.Ramakrishna chanduri',
    appointmentDate: ''
  });
  const [prescriptionFiles, setPrescriptionFiles] = useState([]);
  const [viewPatient, setViewPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [patientEditData, setPatientEditData] = useState(null);
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);
  const [imageViewer, setImageViewer] = useState({ open: false, urls: [], currentIndex: 0, zoom: 1, rotate: 0 });

  const fetchPatients = async () => {
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    if (!targetBranchId) return;
    try {
      const q = query(collection(db, 'patients'), where('branchId', '==', targetBranchId));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setPatients(data);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchStaff = async () => {
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    if (!targetBranchId) return;
    try {
      const q = query(collection(db, 'users'), where('branchId', '==', targetBranchId));
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        const staffData = doc.data();
        if (['doctor', 'staff', 'receptionist', 'hr'].includes(staffData.role)) {
          data.push({ id: doc.id, ...staffData });
        }
      });
      setStaffMembers(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setIsAddingStaff(true);
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    const targetBranchName = userData?.role === 'hr' ? userData?.branchName : (userData?.name || 'Unknown Branch');
    const isRestrictedOff = newStaffData.restricted === 'off';
    try {
      const isEmailRole = ['staff', 'hr'].includes(newStaffData.role);
      const emailToUse = newStaffData.email ? newStaffData.email.toLowerCase().trim() : '';
      const cleanPhone = newStaffData.phone ? newStaffData.phone.replace(/\D/g, '').slice(-10) : '';

      // Check if email already exists in Firestore
      if (isEmailRole && emailToUse) {
        const qEmail = query(collection(db, 'users'), where('email', '==', emailToUse));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          alert('Failed to add staff: A user with this email address already exists in the system.');
          setIsAddingStaff(false);
          return;
        }
      }

      // Check if phone number already exists in Firestore
      if (cleanPhone) {
        const qPhone = query(collection(db, 'users'), where('phone', '==', cleanPhone));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          alert('Failed to add staff: A user with this phone number already exists in the system.');
          setIsAddingStaff(false);
          return;
        }
      }

      if (isEmailRole) {
        if (!newStaffData.email || !newStaffData.password) {
          alert('Please enter both Email ID and Password');
          setIsAddingStaff(false);
          return;
        }

        const secondaryApp = initializeApp(auth.app.options, 'SecondaryApp_Staff_' + Date.now());
        const secondaryAuth = getSecondaryAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailToUse, newStaffData.password);
        const newUserId = userCredential.user.uid;

        const displayName = newStaffData.role === 'receptionist'
          ? `Receptionist - ${targetBranchName}`
          : newStaffData.name;

        await setDoc(doc(db, 'users', newUserId), {
          name: displayName,
          phone: cleanPhone,
          email: emailToUse,
          role: newStaffData.role,
          branchId: isRestrictedOff ? '' : targetBranchId,
          branchName: isRestrictedOff ? 'All Branches' : targetBranchName,
          status: 'active',
          restricted: !isRestrictedOff,
          salary: (newStaffData.role === 'hr' && isRestrictedOff) ? 0 : (newStaffData.salary ? parseFloat(newStaffData.salary) : 0),
          loginTime: isRestrictedOff ? '09:00' : (newStaffData.loginTime || '09:00'),
          logoutTime: isRestrictedOff ? '18:00' : (newStaffData.logoutTime || '18:00'),
          createdAt: new Date().toISOString()
        });

        await secondaryAuth.signOut();
      } else {
        // Doctor: phone based
        await addDoc(collection(db, 'users'), {
          name: newStaffData.name,
          phone: cleanPhone,
          role: newStaffData.role,
          branchId: isRestrictedOff ? '' : targetBranchId,
          branchName: isRestrictedOff ? 'All Branches' : targetBranchName,
          restricted: !isRestrictedOff,
          status: 'active',
          salary: 0,
          loginTime: isRestrictedOff ? '09:00' : (newStaffData.loginTime || '09:00'),
          logoutTime: isRestrictedOff ? '18:00' : (newStaffData.logoutTime || '18:00'),
          createdAt: new Date().toISOString()
        });
      }

      setShowAddStaffModal(false);
      setNewStaffData({ name: '', phone: '', email: '', password: '', role: 'receptionist', restricted: 'on', salary: '', loginTime: '09:00', logoutTime: '18:00' });
      fetchStaff();
      alert('Staff member added successfully!');
    } catch (error) {
      console.error('Error adding staff:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Failed to add staff: This email address is already registered in Firebase Authentication. Since this staff member was previously deleted from the portal, their login account must be deleted from the Firebase Console (Authentication tab) before you can re-register them with this email.');
      } else {
        alert('Failed to add staff: ' + error.message);
      }
    } finally {
      setIsAddingStaff(false);
    }
  };

  const fetchActivityLogs = async () => {
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    if (!targetBranchId) return;
    try {
      const q = query(
        collection(db, 'activity_logs'),
        where('branchId', '==', targetBranchId),
        limit(100)
      );
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      // Sort in memory to avoid index error
      const sortedData = data.sort((a, b) => {
        const timeA = a.timestamp?.toDate() || 0;
        const timeB = b.timestamp?.toDate() || 0;
        return timeB - timeA;
      });

      setActivityLogs(sortedData);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const fetchLeaveRequests = async () => {
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    if (!targetBranchId) return;
    try {
      const q = query(
        collection(db, 'leave_requests'),
        where('branchId', '==', targetBranchId)
      );
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort in memory to avoid Firestore Composite Index requirements
      const sorted = data.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt) : 0;
        const timeB = b.createdAt ? new Date(b.createdAt) : 0;
        return timeB - timeA;
      });
      setLeaveRequests(sorted);
    } catch (error) {
      console.error("Error fetching leaves:", error);
    }
  };

  const handleUpdateLeaveStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'leave_requests', id), {
        status: status,
        reviewedAt: serverTimestamp()
      });
      fetchLeaveRequests();
    } catch (error) {
      console.error("Error updating leave:", error);
    }
  };

  const fetchMedicineTransactions = async () => {
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    if (!targetBranchId) return;
    try {
      const q = query(collection(db, 'transactions'), where('branchId', '==', targetBranchId));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => {
        const tr = doc.data();
        if (tr.type === 'medicine' || tr.type === 'product_billing') {
          data.push({ id: doc.id, ...tr });
        }
      });
      setMedicineTransactions(data);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  const fetchMedicineForms = async () => {
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    if (!targetBranchId) return;
    try {
      const q = query(collection(db, 'medicine_forms'), where('branchId', '==', targetBranchId));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() });
      });
      setMedicineForms(data);
    } catch (e) {
      console.error('Error fetching branch medicine forms:', e);
    }
  };

  const parseHTMLDateToDateObj = (htmlDateStr) => {
    if (!htmlDateStr) return null;
    const parts = htmlDateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const fallback = new Date(htmlDateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const filteredPharmacyTransactions = medicineTransactions.filter(tr => {
    let matchSearch = true;
    if (pharmacySearch.trim()) {
      const s = pharmacySearch.toLowerCase();
      matchSearch = (tr.patientName && tr.patientName.toLowerCase().includes(s)) ||
        (tr.patientPhone && tr.patientPhone.includes(s));
    }
    let matchMethod = true;
    if (pharmacyMethod !== 'all') {
      if (pharmacyMethod === 'upi') {
        matchMethod = ['upi', 'phonepe', 'gpay'].includes(tr.method);
      } else {
        matchMethod = tr.method === pharmacyMethod;
      }
    }
    let matchDate = true;
    if (pharmacyFromDate || pharmacyToDate) {
      const trDateObj = tr.timestamp ? (tr.timestamp.toDate ? tr.timestamp.toDate() : new Date(tr.timestamp)) : null;
      if (trDateObj) {
        trDateObj.setHours(0, 0, 0, 0);
        if (pharmacyFromDate) {
          const fromD = parseHTMLDateToDateObj(pharmacyFromDate);
          if (fromD && trDateObj < fromD) matchDate = false;
        }
        if (pharmacyToDate) {
          const toD = parseHTMLDateToDateObj(pharmacyToDate);
          if (toD && trDateObj > toD) matchDate = false;
        }
      }
    }
    return matchSearch && matchMethod && matchDate;
  }).sort((a, b) => {
    const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
    const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
    return tB - tA;
  });

  const pharmacyTotal = filteredPharmacyTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const pharmacyCash = filteredPharmacyTransactions.filter(t => t.method === 'cash').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const pharmacyUpi = filteredPharmacyTransactions.filter(t => ['upi', 'phonepe', 'gpay'].includes(t.method)).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const pharmacyCard = filteredPharmacyTransactions.filter(t => t.method === 'card').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Filter medicine forms based on active branch dashboard selections
  const parseGBDateToDateObj = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    return null;
  };

  const filteredMedicineForms = medicineForms.filter(form => {
    let matchSearch = true;
    if (pharmacySearch.trim()) {
      const s = pharmacySearch.toLowerCase();
      matchSearch = (form.patientName && form.patientName.toLowerCase().includes(s)) ||
        (form.phone && form.phone.includes(s));
    }

    let matchDate = true;
    if (pharmacyFromDate || pharmacyToDate) {
      const rawDateStr = form.createdAt || form.formDate;
      if (rawDateStr) {
        let d = null;
        if (rawDateStr?.toDate) {
          d = rawDateStr.toDate();
        } else if (typeof rawDateStr === 'string') {
          if (rawDateStr.includes('/')) {
            d = parseGBDateToDateObj(rawDateStr);
          } else if (rawDateStr.includes('-') && rawDateStr.split('-')[0].length === 4 && rawDateStr.length <= 10) {
            d = parseHTMLDateToDateObj(rawDateStr);
          } else {
            d = new Date(rawDateStr);
          }
        } else {
          d = new Date(rawDateStr);
        }

        if (d && !isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          if (pharmacyFromDate) {
            const fromD = parseHTMLDateToDateObj(pharmacyFromDate);
            if (fromD && d < fromD) matchDate = false;
          }
          if (pharmacyToDate) {
            const toD = parseHTMLDateToDateObj(pharmacyToDate);
            if (toD && d > toD) matchDate = false;
          }
        } else {
          if (pharmacyFromDate || pharmacyToDate) matchDate = false;
        }
      } else {
        if (pharmacyFromDate || pharmacyToDate) matchDate = false;
      }
    }
    return matchSearch && matchDate;
  });

  const medFormsTotalRevenue = filteredMedicineForms.reduce((sum, f) => sum + (Number(f.amountPaid) || 0), 0);
  const medFormsTotalMonths = filteredMedicineForms.reduce((sum, f) => sum + (Number(f.duration) || 0), 0);
  const avgRevPerMonthOverall = medFormsTotalMonths > 0 ? (medFormsTotalRevenue / medFormsTotalMonths) : 0;

  // Doctor-wise Average Revenue Per Month for this branch
  const doctorWiseAvgRevenue = (() => {
    const docStats = {};
    filteredMedicineForms.forEach(f => {
      const docName = f.doctorName || 'Unknown Doctor';
      if (!docStats[docName]) {
        docStats[docName] = { revenue: 0, months: 0 };
      }
      docStats[docName].revenue += (Number(f.amountPaid) || 0);
      docStats[docName].months += (Number(f.duration) || 0);
    });

    return Object.entries(docStats).map(([doctorName, stats]) => {
      const avg = stats.months > 0 ? (stats.revenue / stats.months) : 0;
      return {
        doctorName,
        revenue: stats.revenue,
        months: stats.months,
        avg
      };
    }).sort((a, b) => b.revenue - a.revenue);
  })();

  const handlePharmacyExportToExcel = () => {
    if (filteredPharmacyTransactions.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["S.N.O", "Patient Name", "Amount", "Method", "Date / Time", "Status"];
    const rows = filteredPharmacyTransactions.map((tr, index) => {
      const sno = index + 1;
      const name = tr.patientName || "N/A";
      const amount = tr.amount || 0;
      const method = (tr.method || "N/A").toUpperCase();
      const dateTime = tr.timestamp ? (tr.timestamp.toDate ? tr.timestamp.toDate().toLocaleString() : new Date(tr.timestamp).toLocaleString()) : "N/A";
      const status = "PAID";
      return [
        sno,
        `"${name.replace(/"/g, '""')}"`,
        amount,
        `"${method.replace(/"/g, '""')}"`,
        `"${dateTime.replace(/"/g, '""')}"`,
        `"${status.replace(/"/g, '""')}"`
      ];
    });
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pharmacy_revenue_branch.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (user && userData) {
      fetchPatients();
      fetchStaff();
      fetchActivityLogs();
      fetchLeaveRequests();
      fetchMedicineTransactions();
      fetchMedicineForms();
    }
  }, [user, userData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!imageViewer.open || !imageViewer.urls || imageViewer.urls.length <= 1) return;
      if (e.key === 'ArrowRight') {
        setImageViewer(prev => ({ ...prev, currentIndex: (prev.currentIndex + 1) % prev.urls.length, zoom: 1, rotate: 0 }));
      } else if (e.key === 'ArrowLeft') {
        setImageViewer(prev => ({ ...prev, currentIndex: (prev.currentIndex - 1 + prev.urls.length) % prev.urls.length, zoom: 1, rotate: 0 }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageViewer.open, imageViewer.urls]);

  const handleLogout = () => {
    signOut(auth);
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPrescriptionFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index) => {
    setPrescriptionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    const targetBranchId = userData?.role === 'hr' ? userData?.branchId : user?.uid;
    const targetBranchName = userData?.role === 'hr' ? userData?.branchName : (userData?.name || 'Unknown Branch');

    try {
      const imageUrls = [];
      for (const file of prescriptionFiles) {
        const storageRef = ref(storage, `prescriptions/${targetBranchId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

      await addDoc(collection(db, 'patients'), {
        ...formData,
        branchId: targetBranchId,
        branchName: targetBranchName,
        prescriptionUrls: imageUrls,
        createdAt: new Date().toISOString()
      });

      setShowAddModal(false);
      setFormData({
        fullName: '',
        registrationId: '',
        phone: '',
        email: '',
        source: 'Walk-in',
        subject: '',
        doctor: 'Dr.Ramakrishna chanduri',
        appointmentDate: ''
      });
      setPrescriptionFiles([]);
      fetchPatients();
      alert('Patient record added successfully!');
    } catch (error) {
      console.error("Error adding patient:", error);
      setSubmitError(error.message || 'Error saving patient data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDoctorOrHR = ['doctor', 'hr'].includes(newStaffData.role);
  const isRestrictedOff = newStaffData.restricted === 'off';

  return (
    <div className="app-container">
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div style={{
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: '8px',
          padding: isCollapsed ? '16px 8px 12px 8px' : '16px 16px 12px 16px',
          margin: isCollapsed ? '-16px -8px 0 -8px' : '-16px -16px 0 -16px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          width: 'calc(100% + ' + (isCollapsed ? '16px' : '32px') + ')',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <img src={logo} alt="Logo" style={{ height: isCollapsed ? '35px' : '45px', transition: 'all 0.3s ease' }} />
            {!isCollapsed && (
              <span style={{
                color: 'var(--primary-color)',
                fontWeight: '700',
                fontSize: '0.85rem',
                lineHeight: '1.2',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                display: 'block'
              }}>
                Spiritual Homeo Clinic
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-btn"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isCollapsed ? <ChevronRight size={20} color="var(--primary-color)" /> : <ChevronLeft size={20} color="var(--primary-color)" />}
          </button>
        </div>
        <p className="sidebar-text" style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', marginTop: '-12px' }}>
          {userData?.role === 'hr' ? `HR Portal - ${userData?.branchName || ''}` : (userData?.name || 'Branch Portal')}
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '20px' }}>
          <button
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: activeTab === 'patients' ? '#ffffff' : 'rgba(255,255,255,0.7)', fontWeight: activeTab === 'patients' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('patients')}
          >
            <Users size={18} />
            <span className="sidebar-text">My Patients</span>
          </button>
          <button
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: activeTab === 'staff' ? '#ffffff' : 'rgba(255,255,255,0.7)', fontWeight: activeTab === 'staff' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('staff')}
          >
            <UserCheck size={18} />
            <span className="sidebar-text">Staff Management</span>
          </button>
          <Link
            to="/attendance"
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            <Clock size={18} />
            <span className="sidebar-text">Global Attendance</span>
          </Link>
          <Link
            to="/working-hours"
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            <Clock size={18} />
            <span className="sidebar-text">Staff Working Hours</span>
          </Link>
          <button
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: activeTab === 'logs' ? '#ffffff' : 'rgba(255,255,255,0.7)', fontWeight: activeTab === 'logs' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('logs')}
          >
            <Activity size={18} />
            <span className="sidebar-text">Activity Logs</span>
          </button>
          <button
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: activeTab === 'leaves' ? '#ffffff' : 'rgba(255,255,255,0.7)', fontWeight: activeTab === 'leaves' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('leaves')}
          >
            <FileText size={18} />
            <span className="sidebar-text">Leave Requests</span>
          </button>
          <button
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: activeTab === 'pharmacy' ? '#ffffff' : 'rgba(255,255,255,0.7)', fontWeight: activeTab === 'pharmacy' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('pharmacy')}
          >
            <Briefcase size={18} />
            <span className="sidebar-text">Pharmacy Revenue</span>
          </button>
        </nav>

        <button
          style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: '#fca5a5', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap', marginTop: 'auto' }}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span className="sidebar-text">Sign Out</span>
        </button>
      </aside>

      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ textAlign: 'right', backgroundColor: '#fff', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', textTransform: 'capitalize' }}>
              {userData?.branchName || userData?.name || 'Admin Portal'}
            </div>
            {userData?.phone && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {userData.phone}
              </div>
            )}
          </div>
        </div>
        {activeTab === 'patients' && (
          <div className="fade-in">
            <div className="flex-between" style={{ marginBottom: '32px' }}>
              <div>
                <h2>Patient Records</h2>
                <p style={{ color: 'var(--text-muted)' }}>Manage patient history and appointments</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={20} /> Add Past Patient
              </button>
            </div>

            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Reg ID</th>
                    <th>Patient Name</th>
                    <th>Contact</th>
                    <th>Reward Points</th>
                    <th>Subject</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Prescriptions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No patients found.</td>
                    </tr>
                  ) : (
                    patients.map(patient => (
                      <tr key={patient.id}>
                        <td data-label="Reg ID" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{patient.registrationId || 'N/A'}</td>
                        <td data-label="Patient Name" style={{ fontWeight: 500 }}>{patient.fullName}</td>
                        <td data-label="Contact">{patient.phone}<br /><small style={{ color: 'var(--text-muted)' }}>{patient.email}</small></td>
                        <td data-label="Reward Points" style={{ fontWeight: 'bold', color: '#b45309' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Coins size={14} color="#f59e0b" />
                            {patient.rewardPoints || 0} pts
                          </span>
                        </td>
                        <td data-label="Subject">{patient.subject}</td>
                        <td data-label="Doctor">{patient.doctor}</td>
                        <td data-label="Date">
                          {patient.appointmentDate ? (() => {
                            const [y, m, d] = patient.appointmentDate.split('-');
                            return `${d}/${m}/${y}`;
                          })() : 'N/A'}
                        </td>
                        <td data-label="Prescriptions">
                          {patient.prescriptionUrls && patient.prescriptionUrls.length > 0 ? (
                            <span className="badge badge-primary">{patient.prescriptionUrls.length} Files</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(37, 142, 200, 0.1)', color: 'var(--primary-color)' }}>None</span>
                          )}
                        </td>
                        <td data-label="Action">
                          <button className="btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setViewPatient(patient)}>View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="fade-in">
            <div className="flex-between" style={{ marginBottom: '32px' }}>
              <div>
                <h2>Branch Staff</h2>
                <p style={{ color: 'var(--text-muted)' }}>List of authorized personnel for this branch</p>
              </div>
            </div>

            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map(member => (
                    <tr key={member.id}>
                      <td data-label="Name" style={{ fontWeight: 500 }}>{member.name}</td>
                      <td data-label="Role"><span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{member.role}</span></td>
                      <td data-label="Phone">{member.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="fade-in">
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h2 className="section-title">Activity Logs</h2>
            </div>
            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th>Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No logs found.</td>
                    </tr>
                  ) : (
                    activityLogs.map(log => (
                      <tr key={log.id}>
                        <td data-label="Staff Name" style={{ fontWeight: 500 }}>{log.userName}</td>
                        <td data-label="Role">
                          <span className={`badge ${log.userRole === 'doctor' ? 'badge-primary' : 'badge-secondary'}`} style={{ textTransform: 'capitalize' }}>
                            {log.userRole}
                          </span>
                        </td>
                        <td data-label="Time">
                          <span style={{ fontSize: '0.9rem' }}>
                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            }) : 'Just now'}
                          </span>
                        </td>
                        <td data-label="Action">
                          <span className={`badge ${log.action === 'login' ? 'badge-primary' : 'badge-danger'}`} style={{
                            background: log.action === 'login' ? 'rgba(168, 206, 58, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: log.action === 'login' ? '#a8ce3a' : '#ef4444',
                            borderColor: log.action === 'login' ? 'rgba(168, 206, 58, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                            fontWeight: '600'
                          }}>
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="fade-in">
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h2 className="section-title">Leave Requests</h2>
            </div>
            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found.</td>
                    </tr>
                  ) : (
                    leaveRequests.map(req => (
                      <tr key={req.id}>
                        <td data-label="Staff Name">
                          <div style={{ fontWeight: 500 }}>{req.staffName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.staffRole?.toUpperCase()}</div>
                        </td>
                        <td data-label="Dates">
                          <div style={{ fontSize: '0.85rem' }}>{req.startDate} to {req.endDate}</div>
                        </td>
                        <td data-label="Reason">
                          <div style={{ fontSize: '0.85rem', maxWidth: '200px' }}>{req.reason}</div>
                        </td>
                        <td data-label="Status">
                          <span className={`badge ${req.status === 'approved' ? 'badge-primary' : req.status === 'rejected' ? 'badge-danger' : 'badge-secondary'}`}>
                            {req.status?.toUpperCase()}
                          </span>
                        </td>
                        <td data-label="Actions">
                          {req.status === 'pending' && (
                            <div className="flex-gap">
                              <button onClick={() => handleUpdateLeaveStatus(req.id, 'approved')} className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>Approve</button>
                              <button onClick={() => handleUpdateLeaveStatus(req.id, 'rejected')} className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', color: 'var(--danger)' }}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pharmacy' && (
          <div className="fade-in">
            <div className="flex-between" style={{ marginBottom: '32px' }}>
              <div>
                <h2>Pharmacy & Medicine Revenue</h2>
                <p style={{ color: 'var(--text-muted)' }}>Track medicine fees collected at this branch</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  onClick={handlePharmacyExportToExcel}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', borderColor: '#10b981' }}
                >
                  <ExternalLink size={18} /> Export Excel
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total Fees</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>₹{pharmacyTotal}</span>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Cash Total</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>₹{pharmacyCash}</span>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #0ea5e9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>UPI Total</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0ea5e9' }}>₹{pharmacyUpi}</span>
              </div>
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Card Total</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>₹{pharmacyCard}</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Search Patient</label>
                <input
                  type="text"
                  placeholder="Name or phone..."
                  className="glass-input"
                  value={pharmacySearch}
                  onChange={(e) => setPharmacySearch(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Payment Method</label>
                <select
                  className="glass-input"
                  value={pharmacyMethod}
                  onChange={(e) => setPharmacyMethod(e.target.value)}
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / PhonePe</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>From Date</label>
                <input
                  type="date"
                  className="glass-input"
                  value={pharmacyFromDate}
                  onChange={(e) => setPharmacyFromDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>To Date</label>
                <input
                  type="date"
                  className="glass-input"
                  value={pharmacyToDate}
                  onChange={(e) => setPharmacyToDate(e.target.value)}
                />
              </div>
            </div>

            {/* Average Revenue Per Revenue Month Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Total Medicine Revenue (Prescriptions)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>₹{medFormsTotalRevenue.toLocaleString('en-IN')}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{filteredMedicineForms.length} Prescription Forms</span>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #ec4899', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Total Subscription Months</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899' }}>{medFormsTotalMonths} Months</span>
              </div>
              <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #14b8a6', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Avg Revenue Per Month (Overall)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14b8a6' }}>₹{Math.round(avgRevPerMonthOverall).toLocaleString('en-IN')}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Formula: Total Revenue ÷ Total Months</span>
              </div>
            </div>

            {/* Layout Grid for Pharmacy Transactions & Doctor Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Left Column: Transaction list */}
              <div className="table-container glass-panel" style={{ padding: '20px', height: 'fit-content' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 700 }}>Pharmacy Transactions</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>S.N.O</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Patient Name</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Amount</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px' }}>Method</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Date / Time</th>
                        <th style={{ textAlign: 'center', padding: '8px 10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPharmacyTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>No pharmacy transactions match your filters.</td>
                        </tr>
                      ) : (
                        filteredPharmacyTransactions.map((tr, index) => (
                          <tr key={tr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td data-label="S.N.O" style={{ padding: '8px 10px' }}>{index + 1}</td>
                            <td data-label="Patient Name" style={{ fontWeight: 500, padding: '8px 10px' }}>{tr.patientName || 'N/A'}</td>
                            <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 'bold', padding: '8px 10px' }}>₹{tr.amount}</td>
                            <td data-label="Method" style={{ textAlign: 'center', padding: '8px 10px' }}>
                              <span className="badge" style={{
                                background: tr.method === 'cash' ? 'rgba(245, 158, 11, 0.1)' :
                                  ['upi', 'phonepe', 'gpay'].includes(tr.method) ? 'rgba(14, 165, 233, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: tr.method === 'cash' ? '#f59e0b' :
                                  ['upi', 'phonepe', 'gpay'].includes(tr.method) ? '#0ea5e9' : '#10b981'
                              }}>
                                {tr.method?.toUpperCase()}
                              </span>
                            </td>
                            <td data-label="Date / Time" style={{ padding: '8px 10px' }}>
                              {tr.timestamp ? (tr.timestamp.toDate ? tr.timestamp.toDate().toLocaleString() : new Date(tr.timestamp).toLocaleString()) : 'N/A'}
                            </td>
                            <td data-label="Status" style={{ textAlign: 'center', padding: '8px 10px' }}>
                              <span className="badge badge-primary" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>PAID</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Doctor breakdown */}
              <div className="glass-panel" style={{ padding: '20px', height: 'fit-content' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 700 }}>Doctor-wise Average Revenue Per Month</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Doctor</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Revenue</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Months</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Avg / Month</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorWiseAvgRevenue.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)' }}>No data available</td>
                        </tr>
                      ) : (
                        doctorWiseAvgRevenue.map(d => (
                          <tr key={d.doctorName} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ fontWeight: 600, padding: '8px 10px' }}>{d.doctorName}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>₹{d.revenue.toLocaleString('en-IN')}</td>
                            <td style={{ textAlign: 'right', padding: '8px 10px' }}>{d.months} M</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)', padding: '8px 10px' }}>₹{Math.round(d.avg).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '800px' }}>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h3>Add Past Patient History</h3>
              <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="glass-input" required value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Patient Name" />
                </div>

                <div className="form-group">
                  <label className="form-label">Registration ID (Optional)</label>
                  <input type="text" className="glass-input" value={formData.registrationId} onChange={e => setFormData({ ...formData, registrationId: e.target.value })} placeholder="e.g. SPH-2024-001" />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (+91)</label>
                  <input type="tel" className="glass-input" required pattern="[0-9]{10}" title="Enter 10-digit mobile" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="10-digit mobile" />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Optional)</label>
                  <input type="email" className="glass-input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Email Address" />
                </div>

                <div className="form-group">
                  <label className="form-label">Where did you hear about us?</label>
                  <select className="glass-input" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} style={{ background: 'var(--bg-dark)' }}>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Website">Website</option>
                    <option value="Google">Google</option>
                    <option value="Online">Online</option>
                    <option value="Practo">Practo</option>
                    <option value="Referral">Referral</option>
                    <option value="Youtube">Youtube</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Consultation Subject</label>
                  <input type="text" className="glass-input" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Back Pain" />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Doctor</label>
                  <select className="glass-input" value={formData.doctor} onChange={e => setFormData({ ...formData, doctor: e.target.value })} style={{ background: 'var(--bg-dark)' }}>
                    <option value="Dr.Ramakrishna chanduri">Dr.Ramakrishna chanduri</option>
                    <option value="Dr.Prashanth k vaidya">Dr.Prashanth k vaidya</option>
                    <option value="Dr. Jobeadh parveej">Dr. Jobeadh parveej</option>
                    <option value="Dr.Vamshitha">Dr.Vamshitha</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Appointment</label>
                  <input type="date" className="glass-input" required value={formData.appointmentDate} onChange={e => setFormData({ ...formData, appointmentDate: e.target.value })} style={{ colorScheme: 'light' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Upload Prescriptions (Gallery or Camera)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div
                    className="file-upload-zone"
                    onClick={() => {
                      const input = document.getElementById('fileUpload');
                      input.removeAttribute('capture');
                      input.click();
                    }}
                    style={{ padding: '20px' }}
                  >
                    <Upload size={24} color="var(--primary-color)" style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '0.8rem' }}>Gallery</p>
                  </div>

                  <div
                    className="file-upload-zone"
                    onClick={() => {
                      const input = document.getElementById('fileUpload');
                      input.setAttribute('capture', 'environment');
                      input.click();
                    }}
                    style={{ padding: '20px' }}
                  >
                    <Camera size={24} color="var(--accent-color)" style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '0.8rem' }}>Camera</p>
                  </div>
                </div>

                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {prescriptionFiles.length > 0 && (
                  <div className="image-preview-container">
                    {prescriptionFiles.map((file, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: 'rgba(37, 142, 200, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                          <FileImage size={24} color="var(--primary-color)" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {submitError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginTop: '16px', fontSize: '0.9rem' }}>
                  {submitError}
                </div>
              )}

              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving & Uploading...' : 'Save Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription View Modal */}
      {viewPatient && (
        <div className="modal-overlay" onClick={() => setViewPatient(null)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '800px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <div>
                <h3>Prescription View</h3>
                <p style={{ color: 'var(--text-muted)' }}>Only prescription images. No full appointment edits here.</p>
              </div>
              <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => setViewPatient(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input type="text" className="glass-input" value={viewPatient.fullName} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Appointment Date</label>
                <input type="text" className="glass-input" value={viewPatient.appointmentDate || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Reward Points</label>
                <input type="text" className="glass-input" value={`${viewPatient.rewardPoints || 0} pts`} readOnly style={{ fontWeight: 'bold', color: '#b45309' }} />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <h4 style={{ marginBottom: '16px' }}>Prescriptions</h4>
              <div className="image-preview-container">
                {(viewPatient.prescriptionUrls || []).map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn-secondary"
                    style={{ padding: 0, border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', width: '140px', height: '140px' }}
                    onClick={() => setImageViewer({ open: true, urls: viewPatient.prescriptionUrls || [], currentIndex: idx, zoom: 1, rotate: 0 })}
                  >
                    <img src={url} alt={`Prescription ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Edit Modal */}
      {editPatient && patientEditData && (
        <div className="modal-overlay" onClick={() => setEditPatient(null)}>
          <div className="glass-panel modal-content" style={{ maxWidth: '900px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <div>
                <h3>Edit Appointment</h3>
                <p style={{ color: 'var(--text-muted)' }}>Update the full appointment record here.</p>
              </div>
              <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => setEditPatient(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsUpdatingPatient(true);
              try {
                await updateDoc(doc(db, 'patients', editPatient.id), {
                  fullName: patientEditData.fullName,
                  registrationId: patientEditData.registrationId,
                  phone: patientEditData.phone,
                  email: patientEditData.email,
                  source: patientEditData.source,
                  subject: patientEditData.subject,
                  doctor: patientEditData.doctor,
                  appointmentDate: patientEditData.appointmentDate
                });
                await fetchPatients();
                alert('Patient details updated successfully.');
                setEditPatient(null);
              } catch (error) {
                console.error('Error updating patient:', error);
                alert('Failed to update patient details.');
              } finally {
                setIsUpdatingPatient(false);
              }
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="glass-input"
                    required
                    value={patientEditData.fullName}
                    onChange={e => setPatientEditData({ ...patientEditData, fullName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration ID</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={patientEditData.registrationId}
                    onChange={e => setPatientEditData({ ...patientEditData, registrationId: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="glass-input"
                    required
                    pattern="[0-9]{10}"
                    value={patientEditData.phone}
                    onChange={e => setPatientEditData({ ...patientEditData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="glass-input"
                    value={patientEditData.email}
                    onChange={e => setPatientEditData({ ...patientEditData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Source</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={patientEditData.source}
                    onChange={e => setPatientEditData({ ...patientEditData, source: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="glass-input"
                    required
                    value={patientEditData.subject}
                    onChange={e => setPatientEditData({ ...patientEditData, subject: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={patientEditData.doctor}
                    onChange={e => setPatientEditData({ ...patientEditData, doctor: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Appointment Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={patientEditData.appointmentDate}
                    onChange={e => setPatientEditData({ ...patientEditData, appointmentDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '16px' }}>Prescriptions</h4>
                <div className="image-preview-container">
                  {(editPatient.prescriptionUrls || []).map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      className="btn-secondary"
                      style={{ padding: 0, border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', width: '140px', height: '140px' }}
                      onClick={() => setImageViewer({ open: true, urls: editPatient.prescriptionUrls || [], currentIndex: idx, zoom: 1, rotate: 0 })}
                    >
                      <img src={url} alt={`Prescription ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditPatient(null)}>Close</button>
                <button type="submit" className="btn-primary" disabled={isUpdatingPatient}>
                  {isUpdatingPatient ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {imageViewer.open && (
        <div className="modal-overlay" onClick={() => setImageViewer({ open: false, urls: [], currentIndex: 0, zoom: 1, rotate: 0 })}>
          <div className="glass-panel modal-content" style={{ maxWidth: '900px', width: '90%', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>Prescription Viewer</h3>
                {imageViewer.urls.length > 0 && (
                  <span className="badge badge-primary" style={{ padding: '4px 10px', fontSize: '12.5px', fontWeight: 'bold' }}>
                    {imageViewer.currentIndex + 1} of {imageViewer.urls.length}
                  </span>
                )}
              </div>
              <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => setImageViewer({ open: false, urls: [], currentIndex: 0, zoom: 1, rotate: 0 })}>
                <X size={20} />
              </button>
            </div>
            <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxHeight: '70vh', background: 'rgba(0,0,0,0.05)', borderRadius: '20px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {imageViewer.urls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setImageViewer(prev => ({ ...prev, currentIndex: (prev.currentIndex - 1 + prev.urls.length) % prev.urls.length, zoom: 1, rotate: 0 }))}
                      style={{
                        position: 'absolute',
                        left: '16px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        color: 'var(--text-main)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'}
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageViewer(prev => ({ ...prev, currentIndex: (prev.currentIndex + 1) % prev.urls.length, zoom: 1, rotate: 0 }))}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        color: 'var(--text-main)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
                <img
                  src={imageViewer.urls[imageViewer.currentIndex]}
                  alt="Prescription"
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', transform: `scale(${imageViewer.zoom}) rotate(${imageViewer.rotate}deg)`, transition: 'transform 0.2s ease', transformOrigin: 'center center' }}
                />
                <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.35, color: 'white', fontWeight: 700, letterSpacing: '0.06em', transform: 'rotate(-90deg)', pointerEvents: 'none' }}>
                  <img src={logo} alt="Logo" style={{ width: '24px', filter: 'invert(1)' }} />
                  <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>SPIRITUAL HOMEOPATHY</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" className="btn-secondary" onClick={() => setImageViewer(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.3, 3) }))}>
                  <ZoomIn size={18} /> Zoom In
                </button>
                <button type="button" className="btn-secondary" onClick={() => setImageViewer(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.3, 0.6) }))}>
                  <ZoomOut size={18} /> Zoom Out
                </button>
                <button type="button" className="btn-secondary" onClick={() => setImageViewer(prev => ({ ...prev, rotate: prev.rotate - 90 }))}>
                  <RotateCcw size={18} /> Rotate Left
                </button>
                <button type="button" className="btn-secondary" onClick={() => setImageViewer(prev => ({ ...prev, rotate: prev.rotate + 90 }))}>
                  <RotateCw size={18} /> Rotate Right
                </button>
                <button type="button" className="btn-secondary" onClick={() => setImageViewer(prev => ({ ...prev, zoom: 1, rotate: 0 }))}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '500px' }}>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h3>Add New Staff Member</h3>
              <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => setShowAddStaffModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStaff}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="glass-input"
                  required
                  value={newStaffData.name}
                  onChange={e => setNewStaffData({ ...newStaffData, name: e.target.value })}
                  placeholder="Staff Member Name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="glass-input"
                  required={['doctor', 'receptionist'].includes(newStaffData.role)}
                  pattern="[0-9]{10}"
                  value={newStaffData.phone}
                  onChange={e => setNewStaffData({ ...newStaffData, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assign Role</label>
                <select
                  className="glass-input"
                  value={newStaffData.role}
                  onChange={e => setNewStaffData({ ...newStaffData, role: e.target.value, restricted: ['doctor', 'hr'].includes(e.target.value) ? 'off' : 'on' })}
                  style={{ background: 'var(--bg-dark)' }}
                >
                  <option value="doctor">Doctor</option>
                  <option value="hr">HR</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              {['doctor', 'hr'].includes(newStaffData.role) && (
                <div className="form-group">
                  <label className="form-label">Branch Restriction Mode</label>
                  <select
                    className="glass-input"
                    value={newStaffData.restricted}
                    onChange={e => setNewStaffData({ ...newStaffData, restricted: e.target.value })}
                  >
                    <option value="off">Off (Admin - Access All Branches)</option>
                    <option value="on">On (Restrict to Assigned Branch)</option>
                  </select>
                </div>
              )}
              {['staff', 'hr'].includes(newStaffData.role) && (
                <>
                  <div className="form-group">
                    <label className="form-label">Email ID</label>
                    <input
                      type="email"
                      className="glass-input"
                      required
                      value={newStaffData.email}
                      onChange={e => setNewStaffData({ ...newStaffData, email: e.target.value })}
                      placeholder="e.g. staff@sph.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="glass-input"
                        required
                        value={newStaffData.password}
                        onChange={e => setNewStaffData({ ...newStaffData, password: e.target.value })}
                        placeholder="••••••••"
                        minLength="6"
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Salary & Schedule Section */}
              {!(isDoctorOrHR && isRestrictedOff) && (
                <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salary & Work Schedule</p>
                  <div className="form-group">
                    <label className="form-label">Monthly Base Salary (Rs)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={newStaffData.salary}
                      onChange={e => setNewStaffData({ ...newStaffData, salary: e.target.value })}
                      placeholder="e.g. 25000"
                      min="0"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Login Time (Shift Start)</label>
                      <input
                        type="time"
                        className="glass-input"
                        value={newStaffData.loginTime}
                        onChange={e => setNewStaffData({ ...newStaffData, loginTime: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Logout Time (Shift End)</label>
                      <input
                        type="time"
                        className="glass-input"
                        value={newStaffData.logoutTime}
                        onChange={e => setNewStaffData({ ...newStaffData, logoutTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p style={{ fontSize: '0.72rem', color: '#f59e0b', margin: 0, fontWeight: '600' }}>
                      Deduction Rule: 3 days late (15+ min) = Rs 500 deduction
                    </p>
                  </div>
                </div>
              )}

              <div className="flex-gap" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddStaffModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isAddingStaff}>
                  {isAddingStaff ? 'Adding...' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchDashboard;
