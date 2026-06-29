import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import {
  collection, query, where, onSnapshot,
  getDocs, addDoc, serverTimestamp, updateDoc, doc
} from 'firebase/firestore';
import {
  LogOut, Users, Briefcase, Calendar, Clock, Target,
  ChevronLeft, ChevronRight, UserCheck, IndianRupee,
  BarChart3, UserPlus, TrendingUp, CheckCircle, XCircle,
  LayoutDashboard, AlertCircle, Image as ImageIcon, FileText,
  Store, Camera
} from 'lucide-react';
import logo from '../../assets/SPH ADMIN.png';

import LeaveApprovals from './LeaveApprovals';
import SalaryManagement from './SalaryManagement';
import AddStaff from './AddStaff';
import HRTargetTab from './HRTargetTab';
import DoctorTimingsManager from './DoctorTimingsManager';
import CheckoutUnlocks from './CheckoutUnlocks';
import AmountChangeRequests from './AmountChangeRequests';
import HREmployeeReports from './HREmployeeReports';
import ManageBranches from './ManageBranches';
import HRTotalRevenue from './HRTotalRevenue';
import RevenueAnalysis from '../../components/RevenueAnalysis';
import AdminOverview from '../../components/AdminOverview';
import HRClinicCleaning from './HRClinicCleaning';

// ── helpers ────────────────────────────────────────────────────────
const getTodayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDateFromPatient = (p) => {
  const raw = p.paymentCollectedAt || p.completedAt || p.createdAt || p.appointmentDate || p.dateString || p.date;
  if (!raw) return null;
  if (raw?.toDate) return raw.toDate();
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  if (typeof raw === 'string') {
    if (raw.includes('/')) {
      const [d, m, y] = raw.split('/');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    return new Date(raw);
  }
  return null;
};

// ── Main Component ─────────────────────────────────────────────────
const HRDashboard = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hrSubTab, setHrSubTab] = useState('leaves');
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Dashboard data
  const [staffStats, setStaffStats] = useState({ total: 0, doctors: 0, receptionists: 0, hr: 0 });
  const [activeToday, setActiveToday] = useState(0);
  const [monthAttendance, setMonthAttendance] = useState({ logins: 0, unique: 0 });
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingUnlocks, setPendingUnlocks] = useState([]);
  const [pendingAmountRequests, setPendingAmountRequests] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [todayAppts, setTodayAppts] = useState([]);
  const [allMonthAppts, setAllMonthAppts] = useState([]);
  const [calViewDate, setCalViewDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedAnalyticsBranch, setSelectedAnalyticsBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);

  function toggleSidebar() {
    const v = !isCollapsed;
    setIsCollapsed(v);
    localStorage.setItem('sidebar-collapsed', String(v));
  }
  function handleLogout() { signOut(auth); }

  useEffect(() => {
    let active = true;

    // Staff
    getDocs(query(collection(db, 'users'), where('role', 'in', ['doctor', 'receptionist', 'hr', 'staff'])))
      .then(snap => {
        if (!active) return;
        const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setStaffMembers(list);
        setStaffStats({
          total: list.length,
          doctors: list.filter(s => s.role === 'doctor').length,
          receptionists: list.filter(s => s.role === 'receptionist').length,
          hr: list.filter(s => s.role === 'hr').length,
        });
      });

    // Branches
    getDocs(query(collection(db, 'users'), where('role', '==', 'branch')))
      .then(snap => {
        if (!active) return;
        const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setBranches(list);
      });

    // Today attendance
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    getDocs(query(collection(db, 'activity_logs'), where('timestamp', '>=', todayStart)))
      .then(snap => {
        if (!active) return;
        const logins = new Set();
        snap.forEach(d => { const l = d.data(); if (l.action === 'login') logins.add(l.userId); });
        setActiveToday(logins.size);
      });

    // Month attendance
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    getDocs(query(collection(db, 'activity_logs'), where('timestamp', '>=', monthStart)))
      .then(snap => {
        if (!active) return;
        const unique = new Set(); let count = 0;
        snap.forEach(d => { const l = d.data(); if (l.action === 'login') { unique.add(l.userId); count++; } });
        setMonthAttendance({ logins: count, unique: unique.size });
      });

    return () => { active = false; };
  }, []);

  // ── Real-time pending leaves ────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'leave_requests'), where('status', '==', 'pending'));
    return onSnapshot(q, snap => {
      const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPendingLeaves(list.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return tb - ta;
      }));
    });
  }, []);

  // ── Real-time pending unlocks ───────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'checkout_unlock_requests'), where('status', '==', 'pending'));
    return onSnapshot(q, snap => {
      const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPendingUnlocks(list.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return tb - ta;
      }));
    });
  }, []);

  // ── Real-time pending amount change requests ─────────────────────
  useEffect(() => {
    const q = query(collection(db, 'hr_amount_requests'), where('status', '==', 'pending'));
    return onSnapshot(q, snap => {
      const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPendingAmountRequests(list);
    });
  }, []);

  // ── Unified Data Fetching for Dashboard, Calendar, and Today's Appts ────────────────
  // ── Unified Data Fetching for Dashboard, Calendar, and Today's Appts ────────────────
  useEffect(() => {
    let pats = [];
    let appts = [];
    let txs = [];

    const normD = (raw) => {
      if (!raw) return '';
      if (raw?.toDate) raw = raw.toDate().toISOString();
      if (raw?.seconds) raw = new Date(raw.seconds * 1000).toISOString();
      if (typeof raw !== 'string') return '';
      if (raw.includes('T')) raw = raw.split('T')[0];
      if (raw.includes('/')) {
        const p = raw.split('/');
        if (p.length === 3 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      if (raw.includes('-')) {
        const p = raw.split('-');
        if (p.length === 3) {
          if (p[0].length === 4) return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
          return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
      }
      return '';
    };

    const processData = () => {
      const updated = [...pats];
      const idxMap = new Map(updated.map((p, i) => [p.id, i]));
      const phoneMap = new Map();
      updated.forEach((p, i) => {
        const cleanPhone = String(p.phone || p.phoneNumber || p.contact || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone) phoneMap.set(cleanPhone, i);
      });

      // 1. Merge paid appts into patients
      appts.filter(a => a.paymentStatus === 'paid' || a.status === 'completed' || a.status === 'done').forEach(appt => {
        const patientId = appt.patientId;
        if (!patientId || patientId === 'WALKIN_USER') return;

        const cleanApptPhone = String(appt.phone || appt.patientPhone || '').replace(/\D/g, '').slice(-10);
        let idx = idxMap.get(patientId);
        if (idx === undefined && cleanApptPhone) idx = phoneMap.get(cleanApptPhone);

        const isApptPaid = appt.paymentStatus === 'paid';
        if (idx !== undefined) {
          if (updated[idx].paymentStatus !== 'paid' && isApptPaid) {
            updated[idx] = {
              ...updated[idx],
              paymentStatus: 'paid',
              paymentAmount: appt.amountPaid || updated[idx].paymentAmount || updated[idx].amountPaid || 0,
              paymentMethod: appt.paymentMethod || updated[idx].paymentMethod || 'N/A',
              paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt || updated[idx].paymentCollectedAt
            };
          }
        } else {
          updated.push({
            id: patientId,
            fullName: appt.patientName || 'N/A',
            phone: appt.phone || appt.patientPhone || 'N/A',
            branchId: appt.branchId || '',
            branchName: appt.branchName || '',
            doctor: appt.doctorName || '',
            source: appt.source || 'Online',
            appointmentDate: appt.dateString || '',
            paymentStatus: appt.paymentStatus || 'unpaid',
            status: appt.status || '',
            paymentAmount: appt.amountPaid || 0,
            paymentMethod: appt.paymentMethod || 'N/A',
            paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt,
            registrationId: appt.registrationId || ''
          });
          idxMap.set(patientId, updated.length - 1);
        }
      });

      // 2. Merge consultation transactions
      txs.forEach(tx => {
        const pId = tx.patientId;
        if (!pId) return;
        let idx = idxMap.get(pId);
        if (idx !== undefined && updated[idx].paymentStatus !== 'paid') {
          updated[idx] = {
            ...updated[idx],
            paymentStatus: 'paid',
            paymentAmount: tx.amount || updated[idx].paymentAmount || 0,
            paymentMethod: tx.method || updated[idx].paymentMethod || 'N/A',
            paymentCollectedAt: tx.timestamp || updated[idx].paymentCollectedAt
          };
        }
      });

      // 3. Build Rev Records (allPatients)
      const revRecords = [];
      const usedApptPatientIds = new Set();
      appts.filter(a => a.paymentStatus === 'paid' || a.status === 'completed' || a.status === 'done').forEach(appt => {
        const patientId = appt.patientId;
        usedApptPatientIds.add(patientId);
        let p = {};
        if (patientId && patientId !== 'WALKIN_USER') {
          let idx = idxMap.get(patientId);
          if (idx === undefined) {
             const cleanApptPhone = String(appt.phone || appt.patientPhone || '').replace(/\D/g, '').slice(-10);
             if (cleanApptPhone) idx = phoneMap.get(cleanApptPhone);
          }
          if (idx !== undefined) p = updated[idx];
        }
        revRecords.push({
          ...p,
          ...appt,
          id: p.id || appt.patientId || appt.id,
          patientId: p.id || appt.patientId,
          appointmentId: appt.id,
          branchId: appt.branchId || p.branchId,
          branchName: appt.branchName || p.branchName,
          paymentCollectedAt: appt.paymentCollectedAt || appt.updatedAt || p.paymentCollectedAt,
          paymentAmount: appt.amountPaid || p.paymentAmount || p.amountPaid || 0,
          paymentMethod: appt.paymentMethod || p.paymentMethod || 'N/A',
          source: appt.source || p.source || 'Walk-in',
          paymentStatus: appt.paymentStatus === 'paid' ? 'paid' : (p.paymentStatus === 'paid' ? 'paid' : 'unpaid'),
          status: appt.status || p.status,
          itemsPaid: p.itemsPaid || appt.itemsPaid,
          paymentSplitDetails: appt.paymentSplitDetails || p.paymentSplitDetails,
          registrationId: p.registrationId || p.regId || appt.registrationId || appt.regId || '',
          fullName: p.fullName || p.patientName || appt.patientName || appt.fullName || 'N/A',
          phone: p.phone || p.patientPhone || p.phoneNumber || p.contact || appt.phone || appt.patientPhone || 'N/A'
        });
        const apptDateStr = appt.paymentCollectedAt ? new Date(appt.paymentCollectedAt).toDateString() : (appt.updatedAt ? new Date(appt.updatedAt).toDateString() : '');
        if (patientId) usedApptPatientIds.add(`${patientId}_${apptDateStr}`);
      });

      updated.forEach(p => {
        const isPaid = p.paymentStatus === 'paid';
        const isCompleted = p.status === 'completed' || p.status === 'done';
        if ((isPaid || isCompleted) && !usedApptPatientIds.has(p.id)) {
          revRecords.push(p);
        }
      });

      setAllPatients(revRecords);
      setDashLoading(false);

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayISO = `${yyyy}-${mm}-${dd}`;

      // 4. Today's Appointments
      const todayResult = [];
      pats.filter(p => normD(p.appointmentDate || p.date || p.createdAt) === todayISO)
        .forEach(p => todayResult.push({
          id: p.id, name: p.fullName || 'Unknown', branch: p.branchName || '–',
          doctor: p.doctor || '–', status: p.status || 'waiting',
          amount: Number(p.paymentAmount || p.amount || 0),
          paid: p.paymentStatus === 'paid', source: 'walk-in',
          time: p.appointmentTime || p.createdAt || ''
        }));
      appts.filter(a => normD(a.dateString || a.appointmentDate || a.date || a.createdAt) === todayISO)
        .forEach(a => todayResult.push({
          id: a.id, name: a.patientName || 'Unknown', branch: a.branchName || '–',
          doctor: a.doctorName || '–', status: a.status || 'booked',
          amount: Number(a.paymentAmount || a.amount || a.fee || 0),
          paid: a.paymentStatus === 'paid', source: 'online',
          time: a.timeSlot || a.createdAt || ''
        }));
      todayResult.sort((a, b) => String(a.time).localeCompare(String(b.time)));
      setTodayAppts(todayResult);

      // 5. All Month Appointments (for Calendar)
      const allMonth = [];
      pats.forEach(p => allMonth.push({ date: normD(p.appointmentDate || p.date || p.createdAt), status: p.status || 'waiting', amount: Number(p.paymentAmount || 0), paid: p.paymentStatus === 'paid', name: p.fullName || 'Unknown', branch: p.branchName || '–', doctor: p.doctor || '–', source: 'walk-in', id: p.id }));
      appts.forEach(a => allMonth.push({ date: normD(a.dateString || a.appointmentDate || a.date || a.createdAt), status: a.status || 'booked', amount: Number(a.paymentAmount || a.amount || a.fee || 0), paid: a.paymentStatus === 'paid', name: a.patientName || 'Unknown', branch: a.branchName || '–', doctor: a.doctorName || '–', source: 'online', id: a.id }));
      setAllMonthAppts(allMonth.filter(a => a.date));
    };

    const fetchData = async () => {
      try {
        const [patSnap, apptSnap, txSnap] = await Promise.all([
          getDocs(query(collection(db, 'allpatients'))),
          getDocs(query(collection(db, 'dummy_empty_collection'))),
          getDocs(query(collection(db, 'alltransactions')))
        ]);

        pats = patSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        appts = apptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        txs = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        processData();
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setDashLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      // Cleanup if necessary
    };
  }, []);

  // ── Today's Revenue ────────────────────────────────────────────
  const todayRevStats = useMemo(() => {
    let targetDateStr = '';
    let targetMonth = '';
    let targetYear = '';

    if (filterDate) {
      targetDateStr = filterDate;
    } else if (filterMonth) {
      const parts = filterMonth.split('-');
      targetYear = parseInt(parts[0], 10);
      targetMonth = parseInt(parts[1], 10);
    } else {
      targetDateStr = getTodayISO();
    }

    const todayPaid = allPatients.filter(p => {
      if (p.paymentStatus !== 'paid') return false;
      const d = getDateFromPatient(p);
      if (!d || isNaN(d.getTime())) return false;
      
      if (targetDateStr) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return ds === targetDateStr;
      } else if (targetMonth && targetYear) {
        return d.getFullYear() === targetYear && (d.getMonth() + 1) === targetMonth;
      }
      return false;
    });
    const total = todayPaid.reduce((s, p) => s + (Number(p.paymentAmount) || 0), 0);
    const cash = todayPaid.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + (Number(p.paymentAmount) || 0), 0);
    const upi = todayPaid.filter(p => p.paymentMethod === 'upi').reduce((s, p) => s + (Number(p.paymentAmount) || 0), 0);
    const card = todayPaid.filter(p => p.paymentMethod === 'card').reduce((s, p) => s + (Number(p.paymentAmount) || 0), 0);
    const srcMap = {};
    todayPaid.forEach(p => { const s = p.source || 'Walk-in'; srcMap[s] = (srcMap[s] || 0) + (Number(p.paymentAmount) || 0); });
    const channels = Object.entries(srcMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { total, txCount: todayPaid.length, cash, upi, card, channels };
  }, [allPatients, filterDate, filterMonth]);

  // ── Monthly Stats ──────────────────────────────────────────────
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    const monthPat = allPatients.filter(p => {
      const d = getDateFromPatient(p);
      return d && !isNaN(d.getTime()) && d.getFullYear() === yr && d.getMonth() + 1 === mo;
    });
    const paid = monthPat.filter(p => p.paymentStatus === 'paid');
    const rev = paid.reduce((s, p) => s + (Number(p.paymentAmount) || 0), 0);
    const discounted = monthPat.filter(p => Number(p.discountAmount || p.discount || 0) > 0);
    const totalDisc = discounted.reduce((s, p) => s + Number(p.discountAmount || p.discount || 0), 0);
    return { consultations: monthPat.length, revenue: rev, discounts: discounted.length, totalDiscount: totalDisc };
  }, [allPatients]);

  // ── Branch Analytics Overview ──────────────────────────────────
  const uniqueBranches = useMemo(() => {
    const bSet = new Set();
    allMonthAppts.forEach(a => {
      if (a.branch && a.branch !== '–') {
        bSet.add(a.branch);
      }
    });
    return Array.from(bSet).sort();
  }, [allMonthAppts]);

  const branchAnalytics = useMemo(() => {
    if (!selectedAnalyticsBranch) return null;
    const branchAppts = allMonthAppts.filter(a => a.branch === selectedAnalyticsBranch);
    const todayStr = getTodayISO();

    let totalAppts = branchAppts.length;
    let pendingAppts = 0;
    let todayApptsCount = 0;
    let upcomingAppts = 0;
    let totalRev = 0;
    let todayRev = 0;

    branchAppts.forEach(a => {
      const isDone = ['done', 'completed'].includes(String(a.status || '').toLowerCase());
      const isCancelled = ['cancelled', 'no-show'].includes(String(a.status || '').toLowerCase());

      if (!isDone && !isCancelled) pendingAppts++;

      if (a.date === todayStr) {
        todayApptsCount++;
      } else if (a.date > todayStr) {
        if (!isCancelled && !isDone) upcomingAppts++;
      }

      if (a.paid) {
        totalRev += (Number(a.amount) || 0);
        if (a.date === todayStr) {
          todayRev += (Number(a.amount) || 0);
        }
      }
    });

    return { totalAppts, pendingAppts, todayApptsCount, upcomingAppts, totalRev, todayRev };
  }, [allMonthAppts, selectedAnalyticsBranch]);

  // ── Leave approve/reject ──────────────────────────────────────
  const handleLeaveStatus = async (leaveId, status, userId) => {
    try {
      await updateDoc(doc(db, 'leave_requests', leaveId), {
        status,
        reviewedBy: userData?.name || 'HR Manager',
        reviewedAt: new Date().toISOString()
      });
      if (userId) {
        await addDoc(collection(db, 'notifications'), {
          userId,
          title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          body: `Your leave request has been ${status} by HR.`,
          type: 'leave_status',
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) { alert('Failed: ' + e.message); }
  };

  // ── Sidebar nav items ─────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'hr', icon: Users, label: 'HR', badge: pendingLeaves.length + pendingUnlocks.length + pendingAmountRequests.length },
    { id: 'revenue', icon: IndianRupee, label: 'Total Revenue' },
    { id: 'analysis', icon: BarChart3, label: 'Revenue Analysis' },
    { id: 'targets', icon: Target, label: 'Set Target' },
    { id: 'staff', icon: UserPlus, label: 'Add Staff' },
    { id: 'timings', icon: Clock, label: 'Doctor Timings' },
    { id: 'reports', icon: FileText, label: 'Employee Reports' },
    { id: 'branches', icon: Store, label: 'Manage Branches' },
    { id: 'cleaning', icon: Camera, label: 'Clinic Cleaning Photos' },
  ];

  return (
    <div className="app-container">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Logo row */}
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
                SPH HR Portal
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
        <p className="sidebar-text" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', marginTop: '-12px' }}>
          HR Portal
        </p>

        {/* User info */}
        {!isCollapsed && (
          <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              HR: {userData?.name || 'Manager'}
            </p>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, marginTop: '12px' }}>
          {navItems.map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`sidebar-btn ${activeTab === id ? 'active' : ''}`}
              style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '13px', position: 'relative' }}
            >
              <Icon size={16} />
              <span className="sidebar-text">{label}</span>
              {badge > 0 && !isCollapsed && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                  {badge}
                </span>
              )}
              {badge > 0 && isCollapsed && (
                <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '4px', background: '#ef4444' }} />
              )}
            </button>
          ))}

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 16px' }} />

          <Link to="/attendance" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px' }}>
            <Clock size={16} /><span className="sidebar-text">Daily Attendance</span>
          </Link>
          <Link to="/working-hours" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px' }}>
            <Clock size={16} /><span className="sidebar-text">Staff Working Hours</span>
          </Link>
        </nav>

        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: '#fca5a5', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '13px', marginTop: 'auto' }}>
          <LogOut size={16} /><span className="sidebar-text">Sign Out</span>
        </button>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
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

        {/* ════════════════ DASHBOARD TAB ════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="fade-in">
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ margin: 0 }}>HR Dashboard</h2>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '14px' }}>
                Welcome back, {userData?.name || 'HR Manager'}
              </p>
            </div>

            {/* ── Stat Cards ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Total Staff', val: staffStats.total, color: '#258ec8', bg: '#eff6ff', Icon: Users },
                { label: 'Active Today', val: activeToday, color: '#10b981', bg: '#ecfdf5', Icon: UserCheck },
                { label: 'Pending Leaves', val: pendingLeaves.length, color: '#f59e0b', bg: '#fffbeb', Icon: Calendar },
                { label: 'Doctors', val: staffStats.doctors, color: '#8b5cf6', bg: '#faf5ff', Icon: Briefcase },
                { label: 'Receptionists', val: staffStats.receptionists, color: '#0ea5e9', bg: '#f0f9ff', Icon: Users },
                { label: 'HR Staff', val: staffStats.hr, color: '#ec4899', bg: '#fdf2f8', Icon: UserPlus },
              ].map(({ label, val, color, bg, Icon }) => (
                <div key={label} className="glass-panel" style={{ padding: '16px', borderLeft: `4px solid ${color}`, boxShadow: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} color={color} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color }}>{val}</div>
                </div>
              ))}
            </div>

            <AdminOverview branches={branches} staffMembers={staffMembers} />
          </div>
        )}

        {/* ════════════════ HR TAB ════════════════ */}
        {activeTab === 'hr' && (
          <div className="fade-in">
            {/* Sub-tab bar */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '28px', borderBottom: '2px solid rgba(255,255,255,0.06)' }}>
              {[
                { id: 'leaves', label: 'Leave Requests', badge: pendingLeaves.length },
                { id: 'salary', label: 'Salary & Payroll' },
                { id: 'unlocks', label: 'Checkout Unlocks', badge: pendingUnlocks.length },
                { id: 'amount_changes', label: 'Amount Changes', badge: pendingAmountRequests.length }
              ].map(({ id, label, badge }) => (
                <button
                  key={id}
                  onClick={() => setHrSubTab(id)}
                  style={{
                    padding: '11px 22px',
                    border: 'none',
                    background: 'transparent',
                    color: hrSubTab === id ? 'var(--primary-color)' : 'var(--text-muted)',
                    fontWeight: hrSubTab === id ? '700' : '500',
                    borderBottom: hrSubTab === id ? '2px solid var(--primary-color)' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '-2px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {label}
                  {badge > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {hrSubTab === 'leaves' && <LeaveApprovals />}
            {hrSubTab === 'salary' && <SalaryManagement />}
            {hrSubTab === 'unlocks' && <CheckoutUnlocks />}
            {hrSubTab === 'amount_changes' && <AmountChangeRequests />}
          </div>
        )}

        {/* ════════════════ EMPLOYEE REPORTS TAB ════════════════ */}
        {activeTab === 'reports' && <HREmployeeReports />}

        {/* ════════════════ SET TARGET TAB ════════════════ */}
        {activeTab === 'targets' && <HRTargetTab />}

        {/* ════════════════ ADD STAFF TAB ════════════════ */}
        {activeTab === 'staff' && <AddStaff />}

        {/* ════════════════ REVENUE ANALYSIS TAB ════════════════ */}
        {activeTab === 'analysis' && (
          <div className="fade-in">
            <RevenueAnalysis />
          </div>
        )}

        {/* ════════════════ DOCTOR TIMINGS TAB ════════════════ */}
        {activeTab === 'timings' && <DoctorTimingsManager />}

        {/* ════════════════ CLINIC CLEANING PHOTOS TAB ════════════════ */}
        {activeTab === 'cleaning' && <HRClinicCleaning />}

        {/* ════════════════ REVENUE TAB ════════════════ */}
        {activeTab === 'revenue' && (
          <div className="fade-in">
            <HRTotalRevenue />
          </div>
        )}

        {/* ════════════════ MANAGE BRANCHES TAB ════════════════ */}
        {activeTab === 'branches' && <ManageBranches />}

      </main>
    </div>
  );
};

export default HRDashboard;


