import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Building2, Users, IndianRupee, CalendarOff, Activity } from 'lucide-react';

const AdminOverview = ({ branches, patients, medicineTransactions, staffMembers }) => {
  const [todayLeaves, setTodayLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to check if a timestamp or date is today
  const isToday = (val) => {
    if (!val || val === 'N/A') return false;
    try {
      let d;
      if (val.toDate) {
        d = val.toDate(); // Firestore timestamp
      } else if (val.seconds) {
        d = new Date(val.seconds * 1000); // Firestore timestamp serialized
      } else if (typeof val === 'number') {
        d = new Date(val); // Milliseconds
      } else if (typeof val === 'string') {
        // Attempt to parse DD/MM/YYYY
        if (val.includes('/')) {
          const parts = val.split(',')[0].split('/');
          if (parts.length === 3) {
            d = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
        if (!d || isNaN(d.getTime())) {
          d = new Date(val); // Fallback to standard parse
        }
      } else {
        d = new Date(val);
      }
      
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    } catch (e) {
      return false;
    }
  };

  const [livePatients, setLivePatients] = useState([]);
  const [liveTransactions, setLiveTransactions] = useState([]);

  useEffect(() => {
    const fetchLeaves = async () => {
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const leavesRef = collection(db, 'leave_requests');
        const snap = await getDocs(leavesRef);
        const leaves = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'approved') {
            leaves.push({ id: doc.id, ...data });
          }
        });

        const todayStr = today.toISOString().split('T')[0];
        const coveringToday = leaves.filter(l => {
          if (l.leaveDate === todayStr) return true;
          if (l.startDate && l.endDate) {
            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            if (today >= start && today <= end) return true;
          }
          return false;
        });

        setTodayLeaves(coveringToday);
      } catch (err) {
        console.error("Error fetching leaves:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchLiveStats = async () => {
      try {
        // Fetch recent patients for today's stats
        const pSnap = await getDocs(collection(db, 'allpatients'));
        const pData = [];
        pSnap.forEach(doc => pData.push({ id: doc.id, ...doc.data() }));
        setLivePatients(pData);

        // Fetch recent transactions for today's stats
        const tSnap = await getDocs(collection(db, 'alltransactions'));
        const tData = [];
        tSnap.forEach(doc => tData.push({ id: doc.id, ...doc.data() }));
        setLiveTransactions(tData);
      } catch (err) {
        console.error("Error fetching live stats:", err);
      }
    };

    fetchLeaves();
    fetchLiveStats();
  }, []);

  // Compute branch stats directly from raw global collections
  const branchStats = useMemo(() => {
    const stats = {};
    
    // Normalize branch names so "KPHP" and "KPHP Branch" are treated as the same
    const normalizeBranchName = (name) => {
      if (!name) return 'Main Branch';
      let normalized = name.trim();
      if (normalized.toLowerCase().endsWith(' branch')) {
        normalized = normalized.substring(0, normalized.length - 7).trim();
      }
      return normalized;
    };

    branches?.forEach(b => {
      const rawName = b.name || b.branchName || 'Main Branch';
      const normName = normalizeBranchName(rawName);
      stats[normName] = { revenue: 0, patients: 0, name: normName, originalNames: new Set([rawName]) };
    });

    const processedPatients = new Set();

    // 1. Process Consultation / Appointment revenue from livePatients array
    livePatients.forEach(p => {
      const dateVal = p.paymentCollectedAt || p.appointmentDate || p.createdAt || p.date;
      if (p.paymentStatus === 'paid' && isToday(dateVal)) {
        const bName = normalizeBranchName(p.branchName || p.branch || 'Main Branch');
        if (!stats[bName]) stats[bName] = { revenue: 0, patients: 0, name: bName, originalNames: new Set([p.branchName || p.branch]) };
        else stats[bName].originalNames.add(p.branchName || p.branch);
        
        let amt = 0;
        if (p.paymentAmount !== undefined && p.paymentAmount !== null && p.paymentAmount !== '') {
          amt = Number(p.paymentAmount);
        } else if (p.amountPaid !== undefined && p.amountPaid !== null && p.amountPaid !== '') {
          amt = Number(p.amountPaid);
        } else if (p.itemsPaid?.consultation !== undefined) {
          amt = Number(p.itemsPaid.consultation);
        }
        
        if (amt > 0) {
          stats[bName].revenue += amt;
          stats[bName].patients += 1; // Count as a patient visit
          if (p.id) processedPatients.add(p.id);
          if (p.registrationId) processedPatients.add(p.registrationId);
        }
      }
    });

    // 2. Process Pharmacy / Diet / Medicine transactions from liveTransactions array
    liveTransactions.forEach(tr => {
      if (isToday(tr.timestamp || tr.createdAt || tr.date)) {
        // Prevent double counting if this was already handled in livePatients
        if (tr.patientId && processedPatients.has(tr.patientId)) return;
        if (tr.registrationId && processedPatients.has(tr.registrationId)) return;

        const bName = normalizeBranchName(tr.branchName || tr.branch || 'Main Branch');
        if (!stats[bName]) stats[bName] = { revenue: 0, patients: 0, name: bName, originalNames: new Set([tr.branchName || tr.branch]) };
        else stats[bName].originalNames.add(tr.branchName || tr.branch);
        
        const amt = Number(tr.amount || tr.amountPaid || 0);
        if (amt > 0) {
          stats[bName].revenue += amt;
          if (tr.type === 'consultation' || tr.type === 'Consultation') {
             stats[bName].patients += 1;
             if (tr.patientId) processedPatients.add(tr.patientId);
          }
        }
      }
    });

    return stats;
  }, [branches, livePatients, liveTransactions]);

  const statsArray = Object.values(branchStats);
  const totalRevenue = statsArray.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalPatients = statsArray.reduce((acc, curr) => acc + curr.patients, 0);

  return (
    <div className="overview-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Total Summary Card */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.2) 100%)', borderLeft: '4px solid #3b82f6' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Today's Global Summary</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aggregate performance across all branches</p>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> Total Patients</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#e2e8f0' }}>{totalPatients}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><IndianRupee size={16} /> Total Revenue</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Branches Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="#38bdf8" /> Branch Performance (Today)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {statsArray.map((stat, idx) => (
              <div key={idx} className="glass-panel hover-lift" style={{ padding: '20px', borderTop: `3px solid ${idx % 2 === 0 ? '#8b5cf6' : '#f59e0b'}` }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>{stat.name}</h4>
                <div className="flex-between" style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Patients</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{stat.patients}</span>
                </div>
                <div className="flex-between">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Revenue</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>₹{stat.revenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
            {statsArray.length === 0 && (
              <div style={{ padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No branches found.</div>
            )}
          </div>
        </div>

        {/* Staff Attendance / Leaves */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '300px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarOff size={20} color="#f43f5e" /> On Leave Today
          </h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><div className="loader"></div></div>
          ) : todayLeaves.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayLeaves.map(leave => {
                const staff = staffMembers?.find(s => s.id === leave.userId) || {};
                return (
                  <div key={leave.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '3px solid #f43f5e' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{staff.fullName || leave.userName || 'Unknown Staff'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span style={{ display: 'inline-block', background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', marginRight: '6px' }}>
                        {leave.leaveType || 'Permission'}
                      </span>
                      {leave.reason && <span>- {leave.reason.substring(0, 30)}{leave.reason.length > 30 ? '...' : ''}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
              <Activity size={32} opacity={0.3} style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '0.85rem' }}>All clear! No staff members are on leave today.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminOverview;
