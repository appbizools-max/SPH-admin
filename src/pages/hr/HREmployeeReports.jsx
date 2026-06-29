import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { FileText, Calendar, Users, Eye, Search, BarChart2, CheckCircle2, XCircle } from 'lucide-react';

const HREmployeeReports = () => {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' or 'daily'
  const [staffList, setStaffList] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // For monthly aggregates
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // For daily branch updates
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    // Fetch all staff
    const fetchStaff = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', 'in', ['receptionist', 'staff']));
        const snap = await getDocs(q);
        const staffs = [];
        snap.forEach(doc => {
          staffs.push({ id: doc.id, ...doc.data() });
        });
        setStaffList(staffs);
      } catch (err) {
        console.error("Error fetching staff:", err);
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    setLoading(true);
    let q;
    if (activeTab === 'monthly') {
      q = query(collection(db, 'daily_reports'), where('date', '>=', `${selectedMonth}-01`), where('date', '<=', `${selectedMonth}-31`));
    } else {
      q = query(collection(db, 'daily_reports'), where('date', '==', selectedDate));
    }

    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setReports(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching reports:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [activeTab, selectedMonth, selectedDate]);

  const getYesterdayDateStr = () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return yest.toISOString().split('T')[0];
  };

  const yesterdayDate = getYesterdayDateStr();

  // Aggregate stats for the selected month by staffId
  const getMonthlyAggregates = () => {
    const aggs = {};
    staffList.forEach(s => {
      aggs[s.id] = {
        staffId: s.id,
        staffName: s.name,
        branch: s.branchName || s.branch || 'Unknown',
        totalCalls: 0,
        followUps: 0,
        contactsAdded: 0,
        googleReviews: 0,
        videoReviews: 0,
        submittedYesterday: false, // We will check this if the month includes yesterday
      };
    });

    reports.forEach(r => {
      if (aggs[r.staffId]) {
        aggs[r.staffId].totalCalls += Number(r.metrics?.totalCalls || 0);
        aggs[r.staffId].followUps += Number(r.metrics?.followUps || 0);
        aggs[r.staffId].contactsAdded += Number(r.metrics?.contactsAdded || 0);
        aggs[r.staffId].googleReviews += Number(r.metrics?.googleReviews || 0);
        aggs[r.staffId].videoReviews += Number(r.metrics?.videoReviews || 0);

        if (r.date === yesterdayDate) {
          aggs[r.staffId].submittedYesterday = true;
        }
      }
    });

    // We must fetch yesterday's report explicitly if yesterday is NOT in the selected month
    return Object.values(aggs);
  };

  // State to store yesterday's submission statuses separately to ensure it is always accurate
  const [yesterdayStatus, setYesterdayStatus] = useState({});

  useEffect(() => {
    const checkYesterday = async () => {
      try {
        const q = query(collection(db, 'daily_reports'), where('date', '==', yesterdayDate));
        const snap = await getDocs(q);
        const status = {};
        snap.forEach(d => {
          const data = d.data();
          status[data.staffId] = true;
        });
        setYesterdayStatus(status);
      } catch (err) {
        console.error("Error fetching yesterday status:", err);
      }
    };
    checkYesterday();
  }, [yesterdayDate]);

  const aggregates = getMonthlyAggregates();

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={24} color="var(--primary-color)" />
          Employee Daily Reports
        </h1>
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.5)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('monthly')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'monthly' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'monthly' ? '#fff' : 'var(--text-muted)',
              fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
            }}
          >
            <BarChart2 size={16} /> Monthly Aggregates
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'daily' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'daily' ? '#fff' : 'var(--text-muted)',
              fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
            }}
          >
            <Calendar size={16} /> Branch Staff Updates
          </button>
        </div>
      </div>

      {activeTab === 'monthly' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <Calendar size={20} color="var(--primary-color)" />
            <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Month:</span>
            <input
              type="month"
              className="glass-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ maxWidth: '200px' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.5)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Staff Name</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Branch</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Yesterday's Report</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Calls</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Follow Ups</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Contacts</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>G-Reviews</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Video Revs</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((agg, idx) => {
                  const staffId = agg.staffId;
                  const didSubmitYesterday = yesterdayStatus[staffId] || false;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.3)' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: 'var(--text-main)' }}>{agg.staffName}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{agg.branch}</td>
                      <td style={{ padding: '12px' }}>
                        {didSubmitYesterday ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontWeight: '700', fontSize: '0.85rem' }}>
                            <CheckCircle2 size={16} /> Submitted
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: '700', fontSize: '0.85rem' }}>
                            <XCircle size={16} /> Missing
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontWeight: '800', color: 'var(--primary-color)' }}>{agg.totalCalls}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: 'var(--primary-color)' }}>{agg.followUps}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: 'var(--primary-color)' }}>{agg.contactsAdded}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: 'var(--primary-color)' }}>{agg.googleReviews}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: 'var(--primary-color)' }}>{agg.videoReviews}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'daily' && (
        <div className="fade-in">
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Calendar size={20} color="var(--primary-color)" />
            <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Date:</span>
            <input
              type="date"
              className="glass-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ maxWidth: '200px' }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <BarChart2 size={48} color="var(--border-color)" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>No Reports Found</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>No branch staff reports have been submitted on this date.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {reports.map(report => (
                <div key={report.id} className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="var(--primary-color)" />
                        {report.staffName} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>({report.branchName})</span>
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Submitted at: {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleTimeString() : 'Unknown'}</span>
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

export default HREmployeeReports;
