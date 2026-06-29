import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FileText, Send, Calendar, Users, Eye, CheckCircle2, ChevronRight, BarChart2 } from 'lucide-react';

const DailyReportTab = ({ userData }) => {
  const [activeSubTab, setActiveSubTab] = useState('submit'); // 'submit' or 'view'
  
  // Submit State
  const [selectedStaff, setSelectedStaff] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [metrics, setMetrics] = useState({
    googleReviews: '',
    contactsAdded: '',
    digitalWork: '',
    followUps: '',
    totalCalls: '',
    videoReviews: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // View State
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchReports, setBranchReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [branchStaffs, setBranchStaffs] = useState([]);

  // Fetch branch staff
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', 'in', ['receptionist', 'staff']));
        const snap = await getDocs(q);
        const staffs = [];
        snap.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          if (!userData?.branchName) {
            staffs.push(data);
          } else if (data.branch === userData.branchName || data.branchName === userData.branchName || data.branchId === userData.branchId) {
            staffs.push(data);
          }
        });
        setBranchStaffs(staffs);
      } catch (err) {
        console.error("Error fetching staffs:", err);
      }
    };
    if (userData) {
      fetchStaff();
    }
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) {
      alert("Please select a staff member.");
      return;
    }

    setSubmitting(true);
    try {
      // Check for existing report
      const checkQ = query(
        collection(db, 'daily_reports'),
        where('staffId', '==', selectedStaff),
        where('date', '==', reportDate)
      );
      const checkSnap = await getDocs(checkQ);
      if (!checkSnap.empty) {
        alert("Report already submitted for this staff on this date.");
        setSubmitting(false);
        return;
      }

      const staffObj = branchStaffs.find(s => s.id === selectedStaff);
      
      const payload = {
        staffId: selectedStaff,
        staffName: staffObj?.name || 'Unknown Staff',
        branchName: userData?.branchName || staffObj?.branch || 'Unknown Branch',
        branchId: userData?.branchId || staffObj?.branchId || 'Unknown',
        date: reportDate,
        metrics: {
          googleReviews: Number(metrics.googleReviews) || 0,
          contactsAdded: Number(metrics.contactsAdded) || 0,
          digitalWork: metrics.digitalWork || '',
          followUps: Number(metrics.followUps) || 0,
          totalCalls: Number(metrics.totalCalls) || 0,
          videoReviews: Number(metrics.videoReviews) || 0
        },
        submittedBy: userData?.uid || 'Unknown',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'daily_reports'), payload);

      // Create notification for HR
      await addDoc(collection(db, 'notifications'), {
        targetRole: 'admin',
        title: 'New Daily Report',
        body: `${staffObj?.name} from ${payload.branchName} submitted their daily report.`,
        type: 'daily_report',
        isRead: false,
        createdAt: serverTimestamp()
      });

      setSuccessMsg('Daily report submitted successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      
      setMetrics({
        googleReviews: '',
        contactsAdded: '',
        digitalWork: '',
        followUps: '',
        totalCalls: '',
        videoReviews: ''
      });
      setSelectedStaff('');
      
    } catch (err) {
      console.error("Error submitting daily report:", err);
      alert("Failed to submit daily report.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchReports = async () => {
    if (!viewDate) return;
    setLoadingReports(true);
    try {
      const q = query(
        collection(db, 'daily_reports'),
        where('date', '==', viewDate),
        where('branchName', '==', userData?.branchName || 'Unknown Branch')
      );
      const snap = await getDocs(q);
      const reports = [];
      snap.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
      setBranchReports(reports);
    } catch (err) {
      console.error("Error fetching branch reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'view') {
      fetchReports();
    }
  }, [activeSubTab, viewDate]);

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={24} color="var(--primary-color)" />
          Daily Reports
        </h1>
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.5)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveSubTab('submit')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'submit' ? 'var(--primary-color)' : 'transparent',
              color: activeSubTab === 'submit' ? '#fff' : 'var(--text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Send size={16} /> Submit Report
          </button>
          <button
            onClick={() => setActiveSubTab('view')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'view' ? 'var(--primary-color)' : 'transparent',
              color: activeSubTab === 'view' ? '#fff' : 'var(--text-muted)',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={16} /> Branch Staff Updates
          </button>
        </div>
      </div>

      {activeSubTab === 'submit' && (
        <div className="glass-panel fade-in" style={{ padding: '32px' }}>
          {successMsg && (
            <div style={{ padding: '16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              <CheckCircle2 size={20} />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Select Staff Member</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0 12px', height: '46px', backgroundColor: 'rgba(255,255,255,0.5)' }}>
                  <Users size={18} color="var(--text-muted)" />
                  <select
                    required
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', marginLeft: '10px', fontSize: '0.95rem', color: 'var(--text-main)', cursor: 'pointer' }}
                  >
                    <option value="">-- Choose Staff --</option>
                    {branchStaffs.map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Report Date</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0 12px', height: '46px', backgroundColor: 'rgba(255,255,255,0.5)' }}>
                  <Calendar size={18} color="var(--text-muted)" />
                  <input
                    type="date"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', marginLeft: '10px', fontSize: '0.95rem', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Metrics</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>Total Calls</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 50"
                  className="glass-input"
                  value={metrics.totalCalls}
                  onChange={(e) => setMetrics({ ...metrics, totalCalls: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>Follow Ups</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 20"
                  className="glass-input"
                  value={metrics.followUps}
                  onChange={(e) => setMetrics({ ...metrics, followUps: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>Contacts Added</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 15"
                  className="glass-input"
                  value={metrics.contactsAdded}
                  onChange={(e) => setMetrics({ ...metrics, contactsAdded: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>Google Reviews</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 5"
                  className="glass-input"
                  value={metrics.googleReviews}
                  onChange={(e) => setMetrics({ ...metrics, googleReviews: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>Video Reviews</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 2"
                  className="glass-input"
                  value={metrics.videoReviews}
                  onChange={(e) => setMetrics({ ...metrics, videoReviews: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>Digital Work (Blogs / Nutrition / Back Links)</label>
              <textarea
                required
                placeholder="Describe digital work completed today..."
                className="glass-input"
                style={{ height: '100px', resize: 'vertical' }}
                value={metrics.digitalWork}
                onChange={(e) => setMetrics({ ...metrics, digitalWork: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ padding: '12px 32px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {submitting ? 'Submitting...' : (
                  <>Submit Report <ChevronRight size={18} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === 'view' && (
        <div className="fade-in">
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Calendar size={20} color="var(--primary-color)" />
            <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Date:</span>
            <input
              type="date"
              className="glass-input"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              style={{ maxWidth: '200px' }}
            />
          </div>

          {loadingReports ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading reports...</div>
          ) : branchReports.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <BarChart2 size={48} color="var(--border-color)" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>No Reports Found</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>No staff reports have been submitted for {userData?.branchName} on this date.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {branchReports.map(report => (
                <div key={report.id} className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="var(--primary-color)" />
                        {report.staffName}
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Submitted at: {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleTimeString() : 'Unknown'}</span>
                    </div>
                    <div style={{ background: '#f0fdf4', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                      Completed
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-color)' }}>{report.metrics.totalCalls}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Calls</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-color)' }}>{report.metrics.followUps}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Follow Ups</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-color)' }}>{report.metrics.contactsAdded}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contacts</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-color)' }}>{report.metrics.googleReviews}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>G-Reviews</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-color)' }}>{report.metrics.videoReviews}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Video Revs</div>
                    </div>
                  </div>

                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Digital Work:</strong>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap' }}>
                      {report.metrics.digitalWork || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default DailyReportTab;
