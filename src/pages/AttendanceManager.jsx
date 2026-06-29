import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Users, Clock, Calendar, IndianRupee, RotateCw, User, Building2, MapPin, Search, ListFilter, ClipboardCheck, FileImage, Briefcase, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/SH logo.pdf.png';

const AttendanceManager = () => {
  const { user, userData } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const toggleSidebar = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };
  const navigate = useNavigate();

  // State for navigation
  const [activeView, setActiveView] = useState('summary'); // summary, branches, staff, details
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Branches
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

  // Fetch Data for selected branch
  const fetchBranchData = async (branchId) => {
    setLoading(true);
    try {
      // Fetch Staff
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

      // Fetch Logs (Running Month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const logsQuery = query(
        collection(db, 'activity_logs'),
        where('branchId', '==', branchId),
        limit(500) // Fetch a larger set to filter in memory
      );
      const logsSnap = await getDocs(logsQuery);
      const logsData = [];
      logsSnap.forEach(doc => {
        const data = doc.data();
        // Filter by date in memory to avoid index error
        if (data.timestamp?.toDate() >= startOfMonth) {
          logsData.push({ id: doc.id, ...data });
        }
      });

      // Sort in memory to avoid needing a composite index
      const sortedLogs = logsData.sort((a, b) => {
        const timeA = a.timestamp?.toDate() || 0;
        const timeB = b.timestamp?.toDate() || 0;
        return timeB - timeA;
      });

      setActivityLogs(sortedLogs);
      // Fetch Leaves (Approved only for metrics)
      const leavesQuery = query(
        collection(db, 'leave_requests'),
        where('branchId', '==', branchId),
        where('status', '==', 'approved')
      );
      const leavesSnap = await getDocs(leavesQuery);
      const leavesData = [];
      leavesSnap.forEach(doc => leavesData.push({ id: doc.id, ...doc.data() }));
      setLeaveRequests(leavesData);
    } catch (error) {
      console.error("Error fetching branch data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleBack = () => {
    if (selectedStaff) {
      setSelectedStaff(null);
    } else if (selectedBranch && userData.role === 'superadmin') {
      setSelectedBranch(null);
      setStaffMembers([]);
      setActivityLogs([]);
    } else {
      navigate('/');
    }
  };

  // Logic to process logs into Daily Summaries (Punch In / Punch Out)
  const getDailySummaries = () => {
    const dailyData = {};

    activityLogs.forEach(log => {
      const dateKey = log.timestamp?.toDate().toLocaleDateString('en-IN');
      const userId = log.userId;
      if (!dateKey || !userId) return;

      if (!dailyData[dateKey]) dailyData[dateKey] = {};
      if (!dailyData[dateKey][userId]) {
        dailyData[dateKey][userId] = {
          name: log.userName,
          role: log.userRole,
          branchName: log.branchName || 'Unknown',
          logs: []
        };
      }
      dailyData[dateKey][userId].logs.push(log);
    });

    // Flatten and find First/Last
    const summaries = [];
    Object.keys(dailyData).forEach(date => {
      Object.keys(dailyData[date]).forEach(userId => {
        const userDay = dailyData[date][userId];
        const sortedLogs = [...userDay.logs].sort((a, b) => a.timestamp?.toDate() - b.timestamp?.toDate());

        const punchInLog = sortedLogs.find(l => l.action === 'login');
        const punchOutLog = [...sortedLogs].reverse().find(l => l.action === 'logout');

        summaries.push({
          date,
          userId,
          name: userDay.name,
          role: userDay.role,
          branchName: userDay.branchName,
          punchIn: punchInLog?.timestamp?.toDate(),
          punchInLoc: punchInLog?.location,
          punchOut: punchOutLog?.timestamp?.toDate(),
          punchOutLoc: punchOutLog?.location,
          totalLogs: sortedLogs.length
        });
      });
    });

    return summaries.sort((a, b) => new Date(b.date.split('/').reverse().join('-')) - new Date(a.date.split('/').reverse().join('-')));
  };

  if (loading && !branches.length && !staffMembers.length) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loader">Analyzing Attendance Patterns...</div>
      </div>
    );
  }

  const dailySummaries = getDailySummaries();

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
          Super Admin Portal
        </p>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '20px' }}>
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
          <button
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: '#ffffff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            disabled
          >
            <Clock size={18} />
            <span className="sidebar-text">Global Attendance</span>
          </button>
          <Link
            to="/working-hours"
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            <Clock size={18} />
            <span className="sidebar-text">Staff Working Hours</span>
          </Link>

          {selectedBranch && (
            <>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '16px 0' }} />
              <button onClick={handleBack} className="btn-secondary" style={{ textAlign: 'left', display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <ChevronLeft size={20} />
                <span className="sidebar-text">Back to Branches</span>
              </button>
              <button
                className={`btn-secondary ${activeView === 'summary' ? 'active' : ''}`}
                style={{ textAlign: 'left', display: 'flex', gap: '12px', border: activeView === 'summary' ? '1px solid var(--primary-color)' : '' }}
                onClick={() => setActiveView('summary')}
              >
                <ClipboardCheck size={20} color={activeView === 'summary' ? 'var(--primary-color)' : 'var(--text-muted)'} />
                <span className="sidebar-text">Daily Punch Times</span>
              </button>
              <button
                className={`btn-secondary ${activeView === 'staff' ? 'active' : ''}`}
                style={{ textAlign: 'left', display: 'flex', gap: '12px', border: activeView === 'staff' ? '1px solid var(--primary-color)' : '' }}
                onClick={() => setActiveView('staff')}
              >
                <Users size={20} color={activeView === 'staff' ? 'var(--primary-color)' : 'var(--text-muted)'} />
                <span className="sidebar-text">Staff Directory</span>
              </button>
            </>
          )}
        </nav>
      </aside>

      <main className="main-content">
        <div className="fade-in">
          <div className="flex-between" style={{ marginBottom: '32px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', background: 'linear-gradient(90deg, #0d63ccff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
                {!selectedBranch ? 'Branch Selection' : selectedStaff ? `Staff Report: ${selectedStaff.name}` : activeView === 'summary' ? 'Daily Punch Times' : 'Staff Attendance Directory'}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                {!selectedBranch ? 'Choose a branch to view timing records' : `Tracking attendance for ${selectedBranch.name}`}
              </p>
            </div>
            {selectedBranch && (
              <button className="btn-secondary" onClick={() => fetchBranchData(selectedBranch.id)}>
                <RotateCw size={18} style={{ marginRight: '8px' }} /> Refresh
              </button>
            )}
          </div>

          {!selectedBranch && userData.role === 'superadmin' ? (
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
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(37, 142, 200, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1)' }}>
                      <Building2 size={28} color="var(--primary-color)" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>{branch.name}</h3>
                      <p style={{ margin: 0, color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '600' }}>View Punch Reports →</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedStaff ? (
            <div className="table-container glass-panel">
              <div style={{ padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.8rem' }}>Present Days</p>
                    <h3 style={{ fontSize: '1.8rem', color: 'var(--primary-color)' }}>
                      {new Set(activityLogs.filter(l => l.userId === selectedStaff.id).map(l => l.timestamp?.toDate().toDateString())).size}
                    </h3>
                  </div>
                  <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.8rem' }}>Approved Leaves</p>
                    <h3 style={{ fontSize: '1.8rem', color: '#ef4444' }}>
                      {leaveRequests.filter(r => r.userId === selectedStaff.id && r.status === 'approved').length}
                    </h3>
                  </div>
                  <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.8rem' }}>Working Days</p>
                    <h3 style={{ fontSize: '1.8rem', color: 'var(--secondary-color)' }}>
                      {(() => {
                        const today = new Date();
                        const start = new Date(today.getFullYear(), today.getMonth(), 1);
                        let count = 0;
                        for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
                          if (d.getDay() !== 0) count++; // Exclude Sundays
                        }
                        return count;
                      })()}
                    </h3>
                  </div>
                  <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.8rem' }}>Attendance %</p>
                    <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-color)' }}>
                      {(() => {
                        const present = new Set(activityLogs.filter(l => l.userId === selectedStaff.id).map(l => l.timestamp?.toDate().toDateString())).size;
                        const today = new Date();
                        const start = new Date(today.getFullYear(), today.getMonth(), 1);
                        let working = 0;
                        for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
                          if (d.getDay() !== 0) working++;
                        }
                        return working > 0 ? Math.round((present / working) * 100) : 0;
                      })()}%
                    </h3>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Log Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.filter(l => l.userId === selectedStaff.id).map(log => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 600 }}>{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}</td>
                        <td style={{ color: 'var(--secondary-color)', fontWeight: 500 }}>
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </td>
                        <td>
                          <span className={`badge ${log.action === 'login' ? 'badge-primary' : 'badge-danger'}`} style={{ minWidth: '80px', textAlign: 'center' }}>
                            {log.action === 'login' ? 'PUNCH IN' : 'PUNCH OUT'}
                          </span>
                        </td>
                        <td>
                          {log.location ? (
                            <a
                              href={`https://www.google.com/maps?q=${log.location.latitude},${log.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="location-badge"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--primary-color)',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                background: 'rgba(168, 206, 58, 0.05)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(168, 206, 58, 0.1)'
                              }}
                            >
                              <MapPin size={14} />
                              <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {log.location.address || 'Click to view map'}
                              </span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No location captured</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeView === 'summary' ? (
            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff Name</th>
                    <th>Branch</th>
                    <th>Punch In (First)</th>
                    <th>Punch Out (Last)</th>
                    <th>Punch Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummaries.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No timing data found for this month.</td></tr>
                  ) : (
                    dailySummaries.map((s, idx) => (
                      <tr key={`${s.date}-${s.userId}`}>
                        <td data-label="Date" style={{ fontWeight: 600 }}>{s.date}</td>
                        <td data-label="Staff Name">
                          <div>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.role?.toUpperCase()}</div>
                        </td>
                        <td data-label="Branch">
                          <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{s.branchName}</div>
                        </td>
                        <td data-label="Punch In">
                          <span style={{ color: s.punchIn ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {s.punchIn ? s.punchIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                        </td>
                        <td data-label="Punch Out">
                          <span style={{ color: s.punchOut ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
                            {s.punchOut ? s.punchOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                        </td>
                        <td data-label="Location">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {s.punchInLoc && (
                              <a
                                href={`https://www.google.com/maps?q=${s.punchInLoc.latitude},${s.punchInLoc.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.7rem', color: 'var(--primary-color)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <MapPin size={10} /> In: {s.punchInLoc.address?.substring(0, 15)}...
                              </a>
                            )}
                            {s.punchOutLoc && (
                              <a
                                href={`https://www.google.com/maps?q=${s.punchOutLoc.latitude},${s.punchOutLoc.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.7rem', color: '#ef4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <MapPin size={10} /> Out: {s.punchOutLoc.address?.substring(0, 15)}...
                              </a>
                            )}
                            {!s.punchInLoc && !s.punchOutLoc && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>No GPS Data</span>}
                          </div>
                        </td>
                        <td data-label="Status">
                          <span className="badge" style={{ background: s.punchIn && s.punchOut ? 'rgba(168, 206, 58, 0.1)' : 'rgba(239, 68, 68, 0.05)', color: s.punchIn && s.punchOut ? 'var(--primary-color)' : '#64748b' }}>
                            {s.punchIn && s.punchOut ? 'Shift Completed' : s.punchIn ? 'Still In' : 'Logged Out'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role</th>
                    <th>Last Known GPS</th>
                    <th>Total Month Logs</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map(m => {
                    const mLogs = activityLogs.filter(l => l.userId === m.id);
                    const lastLocation = mLogs.find(l => l.location)?.location;
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td><span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>{m.role}</span></td>
                        <td>
                          {lastLocation ? (
                            <a
                              href={`https://www.google.com/maps?q=${lastLocation.latitude},${lastLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.75rem', color: 'var(--primary-color)', textDecoration: 'none' }}
                            >
                              📍 {lastLocation.address?.substring(0, 15)}...
                            </a>
                          ) : 'No Data'}
                        </td>
                        <td>{mLogs.length}</td>
                        <td><button className="btn-secondary" onClick={() => setSelectedStaff(m)}>Full Report</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AttendanceManager;
