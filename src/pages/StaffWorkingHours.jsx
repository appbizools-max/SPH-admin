import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import {
  ChevronLeft, ChevronRight, Users, Clock, Calendar, IndianRupee, RotateCw,
  User, Building2, MapPin, Search, ListFilter, ClipboardCheck, FileImage,
  Briefcase, UserCheck, Download, CalendarCheck, AlertTriangle, CheckCircle, FileText, Target
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/SH logo.pdf.png';

// Helper to normalize and parse dates into YYYY-MM-DD string
const parseDateToYYYYMMDD = (val) => {
  if (!val) return '';
  if (typeof val === 'object' && val.toDate) {
    return val.toDate().toISOString().split('T')[0];
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // check DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  // try standard date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
};
// Check if a punch in time is late (after 09:30 AM)
const checkIsLate = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date)) return false;
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  return hours > 9 || (hours === 9 && minutes > 30);
};

const StaffWorkingHours = () => {
  const { user, userData } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const toggleSidebar = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(''); // Format: YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffDetails, setSelectedStaffDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('metrics'); // metrics, leaves

  // Initialize current month
  useEffect(() => {
    const today = new Date();
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(monthStr);
  }, []);

  // Fetch branches for Super Admin
  const fetchBranches = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'branch'));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setBranches(data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  // Fetch staff, activity logs and leaves for the selected branch
  const fetchBranchData = async (branchId) => {
    setLoading(true);
    try {
      // 1. Fetch Staff of the branch
      const staffQuery = query(collection(db, 'users'), where('branchId', '==', branchId));
      const staffSnap = await getDocs(staffQuery);
      const staffData = [];
      staffSnap.forEach(doc => {
        const d = doc.data();
        if (['doctor', 'staff', 'receptionist', 'hr'].includes(d.role)) {
          staffData.push({ id: doc.id, ...d });
        }
      });
      setStaffMembers(staffData);

      // 2. Fetch all logs for this branch
      const logsQuery = query(
        collection(db, 'activity_logs'),
        where('branchId', '==', branchId)
      );
      const logsSnap = await getDocs(logsQuery);
      const logsData = [];
      logsSnap.forEach(doc => logsData.push({ id: doc.id, ...doc.data() }));
      setActivityLogs(logsData);

      // 3. Fetch all leave requests for the branch (approved, pending, rejected)
      const leavesQuery = query(
        collection(db, 'leave_requests'),
        where('branchId', '==', branchId)
      );
      const leavesSnap = await getDocs(leavesQuery);
      const leavesData = [];
      leavesSnap.forEach(doc => leavesData.push({ id: doc.id, ...doc.data() }));
      setLeaveRequests(leavesData);
    } catch (error) {
      console.error("Error fetching branch working hours data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger data fetching on branch select or user authentication loading
  useEffect(() => {
    if (!userData) return;
    if (userData.role === 'superadmin') {
      fetchBranches().finally(() => setLoading(false));
    } else {
      const targetId = userData.role === 'hr' ? userData.branchId : user.uid;
      const targetName = userData.role === 'hr' ? userData.branchName : userData.name;
      setSelectedBranch({ id: targetId, name: targetName });
      fetchBranchData(targetId);
    }
  }, [userData]);

  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    fetchBranchData(branch.id);
  };

  const handleUpdateLeaveStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this leave request?`)) return;
    try {
      await updateDoc(doc(db, 'leave_requests', id), {
        status: status,
        reviewedAt: new Date().toISOString()
      });
      alert(`Leave request has been ${status}.`);
      if (selectedBranch) {
        fetchBranchData(selectedBranch.id);
      } else if (userData?.role !== 'superadmin') {
        const targetId = userData?.role === 'hr' ? userData?.branchId : user.uid;
        fetchBranchData(targetId);
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      alert("Failed to update status: " + error.message);
    }
  };

  const handleBack = () => {
    if (selectedStaffDetails) {
      setSelectedStaffDetails(null);
    } else if (selectedBranch && userData.role === 'superadmin') {
      setSelectedBranch(null);
      setStaffMembers([]);
      setActivityLogs([]);
      setLeaveRequests([]);
    } else {
      navigate('/');
    }
  };

  // Filter logs & leaves to selected month and compute stats
  const getProcessedData = () => {
    if (!selectedMonth) return [];

    const [yearStr, monthStr] = selectedMonth.split('-');
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed

    // Filter staff members by search query
    const filteredStaff = staffMembers.filter(member =>
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group logs by user and date
    const monthlyLogs = activityLogs.filter(log => {
      if (!log.timestamp) return false;
      const d = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });

    const userLogsByDate = {};
    monthlyLogs.forEach(log => {
      if (!log.userId) return;
      const dateKey = parseDateToYYYYMMDD(log.timestamp);
      if (!dateKey) return;

      if (!userLogsByDate[log.userId]) {
        userLogsByDate[log.userId] = {};
      }
      if (!userLogsByDate[log.userId][dateKey]) {
        userLogsByDate[log.userId][dateKey] = [];
      }
      userLogsByDate[log.userId][dateKey].push(log);
    });

    // Process leave requests for the selected month (only approved leaves used for metrics)
    const monthlyLeaves = leaveRequests.filter(req => {
      if (req.status !== 'approved') return false;
      if (!req.startDate || !req.endDate) return false;
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      // Overlaps target month
      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0);
      return start <= endOfMonth && end >= startOfMonth;
    });

    // Compute metrics for each staff member
    return filteredStaff.map(staff => {
      const userDates = userLogsByDate[staff.id] || {};
      const datesList = Object.keys(userDates);

      // Present Days: unique days with at least one punch in this month
      const daysPresent = datesList.length;

      let lateComings = 0;
      let halfDays = 0;
      let permissions = 0;

      // Group detailed daily logs
      const dailyDetails = [];

      // Loop through each day of the target month to construct details & sum stats
      const totalDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const currentDate = new Date(targetYear, targetMonth, day);
        const dateKey = parseDateToYYYYMMDD(currentDate);

        const logs = userDates[dateKey] || [];
        const dayLeaves = monthlyLeaves.filter(req => req.userId === staff.id && dateKey >= req.startDate && dateKey <= req.endDate);

        const hasHalfDayLeave = dayLeaves.some(req => req.category === 'Half Day');
        const hasPermissionLeave = dayLeaves.some(req => req.category === '1 Hour Permission');
        const hasFullLeave = dayLeaves.some(req => !['Half Day', '1 Hour Permission'].includes(req.category));

        let firstIn = null;
        let lastOut = null;
        let workHours = 0;
        let isLate = false;
        let status = 'Absent';

        if (logs.length > 0) {
          // Sort logs chronologically
          const sorted = [...logs].sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return timeA - timeB;
          });

          const punchInLog = sorted.find(l => l.action === 'login') || sorted[0];
          const punchOutLog = [...sorted].reverse().find(l => l.action === 'logout') || sorted[sorted.length - 1];

          firstIn = punchInLog.timestamp?.toDate ? punchInLog.timestamp.toDate() : new Date(punchInLog.timestamp);

          if (sorted.length > 1 || punchOutLog !== punchInLog) {
            lastOut = punchOutLog.timestamp?.toDate ? punchOutLog.timestamp.toDate() : new Date(punchOutLog.timestamp);
            workHours = (lastOut - firstIn) / (1000 * 60 * 60);
          }

          isLate = checkIsLate(firstIn);
          if (isLate) {
            lateComings++;
          }

          // Compute half days
          // A half day is defined as working hours between 0.5 and 5 hours OR approved half day leave
          const isHalfDayWork = workHours >= 0.5 && workHours < 5;
          if (isHalfDayWork || hasHalfDayLeave) {
            halfDays++;
            status = 'Half Day';
          } else {
            status = isLate ? 'Late Present' : 'Present';
          }

          if (hasPermissionLeave) {
            permissions++;
          }
        } else if (hasFullLeave) {
          status = 'Approved Leave';
        } else if (hasHalfDayLeave) {
          status = 'Approved Half Day Leave (Absent)';
        }

        if (logs.length > 0 || hasFullLeave || hasHalfDayLeave || hasPermissionLeave) {
          dailyDetails.push({
            date: dateKey,
            firstIn: firstIn ? firstIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--',
            lastOut: lastOut ? lastOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--',
            workHours: workHours > 0 ? workHours.toFixed(2) + ' hrs' : '--',
            isLate: isLate ? 'Yes' : 'No',
            status,
            punchInLoc: logs.find(l => l.action === 'login')?.location || null,
            punchOutLoc: [...logs].reverse().find(l => l.action === 'logout')?.location || null
          });
        }
      }

      return {
        ...staff,
        daysPresent,
        lateComings,
        halfDays,
        permissions,
        approvedLeaves: monthlyLeaves.filter(req => req.userId === staff.id && !['Half Day', '1 Hour Permission'].includes(req.category)).length,
        dailyDetails: dailyDetails.sort((a, b) => b.date.localeCompare(a.date))
      };
    });
  };

  const processedData = getProcessedData();

  const getFilteredLeaves = () => {
    let filtered = [...leaveRequests];
    
    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.staffName?.toLowerCase().includes(q) ||
        req.staffRole?.toLowerCase().includes(q) ||
        (req.category || req.leaveType)?.toLowerCase().includes(q)
      );
    }
    
    // 2. Month Filter
    if (selectedMonth) {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const targetYear = parseInt(yearStr, 10);
      const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed
      
      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0);
      
      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];
      
      filtered = filtered.filter(req => {
        if (!req.startDate || !req.endDate) return false;
        return req.startDate <= endStr && req.endDate >= startStr;
      });
    }
    
    // Sort in memory - newest first
    return filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });
  };

  const getBranchLeavesStats = () => {
    let monthlyLeaves = [...leaveRequests];
    if (selectedMonth) {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const targetYear = parseInt(yearStr, 10);
      const targetMonth = parseInt(monthStr, 10) - 1;
      
      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0);
      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];
      
      monthlyLeaves = monthlyLeaves.filter(req => {
        if (!req.startDate || !req.endDate) return false;
        return req.startDate <= endStr && req.endDate >= startStr;
      });
    }
    
    const totalLeaves = monthlyLeaves.filter(req => !['Half Day', '1 Hour Permission'].includes(req.category || req.leaveType)).length;
    const approvedLeavesCount = monthlyLeaves.filter(req => !['Half Day', '1 Hour Permission'].includes(req.category || req.leaveType) && req.status === 'approved').length;
    
    const totalPermissions = monthlyLeaves.filter(req => ['1 Hour Permission'].includes(req.category || req.leaveType)).length;
    const approvedPermissionsCount = monthlyLeaves.filter(req => ['1 Hour Permission'].includes(req.category || req.leaveType) && req.status === 'approved').length;
    
    return {
      totalLeaves,
      approvedLeavesCount,
      totalPermissions,
      approvedPermissionsCount
    };
  };

  const branchLeavesStats = getBranchLeavesStats();

  // Export processed monthly metrics of all staff to CSV
  const handleExportCSV = () => {
    if (processedData.length === 0) {
      alert("No data available to export");
      return;
    }

    const headers = ["Staff Name", "Role", "Email", "Phone", "Branch Name", "Days Present", "Late Days", "Half Days", "1 Hr Permissions", "Approved Leaves"];
    const rows = processedData.map(item => [
      item.name || "N/A",
      item.role || "N/A",
      item.email || "N/A",
      item.phone || "N/A",
      item.branchName || selectedBranch?.name || "N/A",
      item.daysPresent,
      item.lateComings,
      item.halfDays,
      item.permissions,
      item.approvedLeaves
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sph_working_hours_${selectedBranch?.name || 'All'}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export single staff member detailed log
  const handleExportStaffDetailCSV = (staff) => {
    if (!staff || !staff.dailyDetails || staff.dailyDetails.length === 0) {
      alert("No details available to export");
      return;
    }

    const headers = ["Date", "First Punch In", "Last Punch Out", "Work Duration", "Late Status", "Attendance Status", "Punch In Coordinates", "Punch Out Coordinates"];
    const rows = staff.dailyDetails.map(detail => [
      detail.date,
      detail.firstIn,
      detail.lastOut,
      detail.workHours,
      detail.isLate,
      detail.status,
      detail.punchInLoc ? `${detail.punchInLoc.latitude}; ${detail.punchInLoc.longitude}` : "N/A",
      detail.punchOutLoc ? `${detail.punchOutLoc.latitude}; ${detail.punchOutLoc.longitude}` : "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sph_details_${staff.name.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          {userData?.role === 'superadmin' ? 'Super Admin Portal' : (userData?.name || 'Branch Portal')}
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '20px' }}>
          {userData?.role === 'superadmin' ? (
            <>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'branches' } })}
              >
                <Building2 size={18} />
                <span className="sidebar-text">Manage Branches</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'patients' } })}
              >
                <Users size={18} />
                <span className="sidebar-text">Global Patient List</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'staff' } })}
              >
                <UserCheck size={18} />
                <span className="sidebar-text">Staff Management</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'revenue' } })}
              >
                <IndianRupee size={18} />
                <span className="sidebar-text">Consultation Revenue</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'pharmacy' } })}
              >
                <Briefcase size={18} />
                <span className="sidebar-text">Pharmacy Revenue</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'banners' } })}
              >
                <FileImage size={18} />
                <span className="sidebar-text">Manage Banners</span>
              </button>
              <Link
                to="/attendance"
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                <Clock size={18} />
                <span className="sidebar-text">Global Attendance</span>
              </Link>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ffffff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                disabled
              >
                <Clock size={18} />
                <span className="sidebar-text">Staff Working Hours</span>
              </button>
              <Link
                to="/targets"
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                <Target size={18} />
                <span className="sidebar-text">Target Management</span>
              </Link>
            </>
          ) : (
            <>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'patients' } })}
              >
                <Users size={18} />
                <span className="sidebar-text">My Patients</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'staff' } })}
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
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ffffff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                disabled
              >
                <Clock size={18} />
                <span className="sidebar-text">Staff Working Hours</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'logs' } })}
              >
                <Clock size={18} />
                <span className="sidebar-text">Activity Logs</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'leaves' } })}
              >
                <FileImage size={18} />
                <span className="sidebar-text">Leave Requests</span>
              </button>
              <button
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/', { state: { activeTab: 'pharmacy' } })}
              >
                <Briefcase size={18} />
                <span className="sidebar-text">Pharmacy Revenue</span>
              </button>
            </>
          )}

          {selectedBranch && (
            <>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '16px 0' }} />
              <button onClick={handleBack} className="btn-secondary" style={{ textAlign: 'left', display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <ChevronLeft size={20} />
                <span className="sidebar-text">Back to Selection</span>
              </button>
            </>
          )}
        </nav>
      </aside>

      <main className="main-content">
        <div className="fade-in">
          <div className="flex-between" style={{ marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', background: 'linear-gradient(90deg, #ffffff, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
                {!selectedBranch ? 'Branch Selection' : selectedStaffDetails ? `Detailed Logs: ${selectedStaffDetails.name}` : 'Staff Working Hours Summary'}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                {!selectedBranch
                  ? 'Choose a branch to view staff working hour metrics'
                  : selectedStaffDetails
                    ? `Reviewing daily punch hours and locations for ${selectedStaffDetails.name}`
                    : `Monthly performance metrics for ${selectedBranch.name}`}
              </p>
            </div>
            {selectedBranch && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => fetchBranchData(selectedBranch.id)}>
                  <RotateCw size={18} style={{ marginRight: '8px' }} /> Refresh
                </button>
                {!selectedStaffDetails && (
                  <button className="btn-primary" onClick={handleExportCSV} style={{ background: '#10b981', borderColor: '#10b981' }}>
                    <Download size={18} style={{ marginRight: '8px' }} /> Export CSV
                  </button>
                )}
                {selectedStaffDetails && (
                  <button className="btn-primary" onClick={() => handleExportStaffDetailCSV(selectedStaffDetails)} style={{ background: '#10b981', borderColor: '#10b981' }}>
                    <Download size={18} style={{ marginRight: '8px' }} /> Export Staff CSV
                  </button>
                )}
              </div>
            )}
          </div>

          {!selectedBranch && userData?.role === 'superadmin' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {branches.map(branch => (
                <div
                  key={branch.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid rgba(37, 142, 200, 0.2)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => handleSelectBranch(branch)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(37, 142, 200, 0.2)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(37, 142, 200, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Building2 size={28} color="var(--primary-color)" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>{branch.name}</h3>
                      <p style={{ margin: 0, color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '600' }}>View Working Hours →</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedStaffDetails ? (
            <div className="fade-in">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button className="btn-secondary" onClick={() => setSelectedStaffDetails(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChevronLeft size={16} /> Back to Summary
                </button>
              </div>

              <div className="table-container glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Present Days</p>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', margin: 0 }}>{selectedStaffDetails.daysPresent}</h3>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Late Comings</p>
                    <h3 style={{ fontSize: '1.5rem', color: '#f59e0b', margin: 0 }}>{selectedStaffDetails.lateComings}</h3>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Half Days</p>
                    <h3 style={{ fontSize: '1.5rem', color: '#a8ce3a', margin: 0 }}>{selectedStaffDetails.halfDays}</h3>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Permissions (1 Hr)</p>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-color)', margin: 0 }}>{selectedStaffDetails.permissions}</h3>
                  </div>
                  <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>Approved Leaves</p>
                    <h3 style={{ fontSize: '1.5rem', color: '#ef4444', margin: 0 }}>{selectedStaffDetails.approvedLeaves}</h3>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>First In (Punch In)</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Last Out (Punch Out)</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Duration</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Late Status</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Attendance Status</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Locations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStaffDetails.dailyDetails.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No logs found for this staff member in the selected month.</td>
                        </tr>
                      ) : (
                        selectedStaffDetails.dailyDetails.map((detail, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background-color 0.2s' }}>
                            <td data-label="Date" style={{ padding: '12px 8px', fontWeight: 600 }}>{detail.date}</td>
                            <td data-label="First In" style={{ padding: '12px 8px', color: 'var(--secondary-color)', fontWeight: 500 }}>{detail.firstIn}</td>
                            <td data-label="Last Out" style={{ padding: '12px 8px', color: 'var(--secondary-color)', fontWeight: 500 }}>{detail.lastOut}</td>
                            <td data-label="Duration" style={{ padding: '12px 8px', fontWeight: 600 }}>{detail.workHours}</td>
                            <td data-label="Late Status" style={{ padding: '12px 8px' }}>
                              <span className={`badge ${detail.isLate === 'Yes' ? 'badge-danger' : 'badge-primary'}`} style={{ minWidth: '60px', textAlign: 'center' }}>
                                {detail.isLate}
                              </span>
                            </td>
                            <td data-label="Status" style={{ padding: '12px 8px' }}>
                              <span className={`badge`} style={{
                                background: detail.status.includes('Present') ? 'rgba(16, 185, 129, 0.15)' :
                                  detail.status.includes('Leave') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: detail.status.includes('Present') ? '#10b981' :
                                  detail.status.includes('Leave') ? '#ef4444' : '#f59e0b',
                                minWidth: '100px',
                                textAlign: 'center'
                              }}>
                                {detail.status}
                              </span>
                            </td>
                            <td data-label="Locations" style={{ padding: '12px 8px' }}>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {detail.punchInLoc && (
                                  <a
                                    href={`https://www.google.com/maps?q=${detail.punchInLoc.latitude},${detail.punchInLoc.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="location-badge"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      color: 'var(--primary-color)',
                                      textDecoration: 'none',
                                      fontSize: '0.75rem',
                                      background: 'rgba(168, 206, 58, 0.05)',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(168, 206, 58, 0.1)'
                                    }}
                                  >
                                    <MapPin size={12} />
                                    <span>In Location</span>
                                  </a>
                                )}
                                {detail.punchOutLoc && (
                                  <a
                                    href={`https://www.google.com/maps?q=${detail.punchOutLoc.latitude},${detail.punchOutLoc.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="location-badge"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      color: 'var(--accent-color)',
                                      textDecoration: 'none',
                                      fontSize: '0.75rem',
                                      background: 'rgba(37, 142, 200, 0.05)',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(37, 142, 200, 0.1)'
                                    }}
                                  >
                                    <MapPin size={12} />
                                    <span>Out Location</span>
                                  </a>
                                )}
                                {!detail.punchInLoc && !detail.punchOutLoc && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>N/A</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              {/* Tabs for Working Hours vs Leaves */}
              <div style={{
                display: 'flex',
                gap: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '12px',
                marginBottom: '24px'
              }}>
                <button
                  className={`btn-tab ${activeTab === 'metrics' ? 'active' : ''}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'metrics' ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeTab === 'metrics' ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setActiveTab('metrics')}
                >
                  Working Hours Summary
                </button>
                <button
                  className={`btn-tab ${activeTab === 'leaves' ? 'active' : ''}`}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'leaves' ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
                    color: activeTab === 'leaves' ? '#ffffff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setActiveTab('leaves')}
                >
                  Leaves & Permissions
                </button>
              </div>

              {/* Filters Bar */}
              <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Search Staff</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Name, role..."
                      className="glass-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Select Month</label>
                  <input
                    type="month"
                    className="glass-input"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              </div>

              {activeTab === 'metrics' ? (
                /* Summary Table */
                <div className="table-container glass-panel">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>S.N.O</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Staff Name</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Role</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Days Present</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Late Days</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Half Days</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>1 Hr Permissions</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Approved Leaves</th>
                        <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Calculating Working Hours metrics...</td>
                        </tr>
                      ) : processedData.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No staff members found for the selected branch.</td>
                        </tr>
                      ) : (
                        processedData.map((staff, idx) => (
                          <tr key={staff.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td data-label="S.N.O" style={{ padding: '12px 8px' }}>{idx + 1}</td>
                            <td data-label="Staff Name" style={{ padding: '12px 8px', fontWeight: 600 }}>{staff.name}</td>
                            <td data-label="Role" style={{ padding: '12px 8px' }}>
                              <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                                {staff.role}
                              </span>
                            </td>
                            <td data-label="Days Present" style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--primary-color)' }}>
                              {staff.daysPresent} days
                            </td>
                            <td data-label="Late Days" style={{ padding: '12px 8px', fontWeight: 600, color: staff.lateComings > 0 ? '#f59e0b' : 'inherit' }}>
                              {staff.lateComings} days
                            </td>
                            <td data-label="Half Days" style={{ padding: '12px 8px', fontWeight: 600, color: staff.halfDays > 0 ? '#a8ce3a' : 'inherit' }}>
                              {staff.halfDays} days
                            </td>
                            <td data-label="1 Hr Permissions" style={{ padding: '12px 8px', fontWeight: 600, color: staff.permissions > 0 ? 'var(--accent-color)' : 'inherit' }}>
                              {staff.permissions} permission(s)
                            </td>
                            <td data-label="Approved Leaves" style={{ padding: '12px 8px', fontWeight: 600, color: staff.approvedLeaves > 0 ? '#ef4444' : 'inherit' }}>
                              {staff.approvedLeaves} days
                            </td>
                            <td data-label="Action" style={{ padding: '12px 8px' }}>
                              <button
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                onClick={() => setSelectedStaffDetails(staff)}
                              >
                                View Logs
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Leaves & Permissions View */
                <div className="fade-in">
                  {/* Leaves Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total Applied Leaves</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{branchLeavesStats.totalLeaves}</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Approved Leaves</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{branchLeavesStats.approvedLeavesCount}</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total 1 Hr Permissions</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-color)' }}>{branchLeavesStats.totalPermissions}</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Approved Permissions</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>{branchLeavesStats.approvedPermissionsCount}</span>
                    </div>
                  </div>

                  {/* Leaves Table */}
                  <div className="table-container glass-panel">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)' }}>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>S.N.O</th>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Staff Name</th>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Type / Category</th>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Dates</th>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Reason</th>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 'bold', color: '#000000' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading leave requests...</td>
                          </tr>
                        ) : getFilteredLeaves().length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No leave or permission requests found.</td>
                          </tr>
                        ) : (
                          getFilteredLeaves().map((req, idx) => (
                            <tr key={req.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <td data-label="S.N.O" style={{ padding: '12px 8px' }}>{idx + 1}</td>
                              <td data-label="Staff Name" style={{ padding: '12px 8px' }}>
                                <div style={{ fontWeight: 600 }}>{req.staffName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{req.staffRole}</div>
                              </td>
                              <td data-label="Type" style={{ padding: '12px 8px' }}>
                                <span className="badge badge-secondary" style={{
                                  background: ['1 Hour Permission'].includes(req.category || req.leaveType) ? 'rgba(37, 142, 200, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                  color: ['1 Hour Permission'].includes(req.category || req.leaveType) ? 'var(--accent-color)' : 'var(--text-main)',
                                  fontWeight: '600'
                                }}>
                                  {req.category || req.leaveType || 'Leave'}
                                </span>
                              </td>
                              <td data-label="Dates" style={{ padding: '12px 8px', fontSize: '0.85rem' }}>
                                {req.startDate} to {req.endDate}
                              </td>
                              <td data-label="Reason" style={{ padding: '12px 8px', fontSize: '0.85rem', maxWidth: '200px', wordBreak: 'break-word' }}>
                                {req.reason}
                              </td>
                              <td data-label="Status" style={{ padding: '12px 8px' }}>
                                <span className={`badge`} style={{
                                  background: req.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' :
                                    req.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: req.status === 'approved' ? '#10b981' :
                                    req.status === 'rejected' ? '#ef4444' : '#f59e0b',
                                  minWidth: '80px',
                                  textAlign: 'center',
                                  fontWeight: '600'
                                }}>
                                  {req.status?.toUpperCase() || 'PENDING'}
                                </span>
                              </td>
                              <td data-label="Actions" style={{ padding: '12px 8px' }}>
                                {req.status === 'pending' ? (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      onClick={() => handleUpdateLeaveStatus(req.id, 'approved')}
                                      className="btn-primary"
                                      style={{ padding: '4px 12px', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981' }}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleUpdateLeaveStatus(req.id, 'rejected')}
                                      className="btn-secondary"
                                      style={{ padding: '4px 12px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Checked
                                  </span>
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StaffWorkingHours;
