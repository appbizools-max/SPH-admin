import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { ExternalLink, RotateCcw, Activity } from 'lucide-react';

const parseAnyDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal.toDate) return dateVal.toDate();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
  if (typeof dateVal === 'string') {
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
  }
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  return null;
};

const HRTotalRevenue = () => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pendingPats, setPendingPats] = useState([]);
  const [pendingAppts, setPendingAppts] = useState([]);
  const pendingRecordsRaw = useMemo(() => [...pendingPats, ...pendingAppts], [pendingPats, pendingAppts]);
  const [branches, setBranches] = useState([]);

  // Filters
  const [revenueSearch, setRevenueSearch] = useState('');
  const [revenueBranchId, setRevenueBranchId] = useState('all');
  const [revenueDate, setRevenueDate] = useState('');
  const [revenueYear, setRevenueYear] = useState('all');
  const [revenueMonth, setRevenueMonth] = useState('all');
  const [revenueSource, setRevenueSource] = useState('all');
  const [revenueMethod, setRevenueMethod] = useState('all');
  const [revenueSplitType, setRevenueSplitType] = useState('all');
  const [revenueAmountRange, setRevenueAmountRange] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  useEffect(() => {
    let active = true;
    
    // Fetch Branches
    const unsubBranches = onSnapshot(query(collection(db, 'users'), where('role', '==', 'branch')), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setBranches(list);
    });

    const unsubPats = onSnapshot(query(collection(db, 'patients'), where('pendingAmount', '>', 0)), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPendingPats(list);
    });

    const unsubAppts = onSnapshot(query(collection(db, 'appointments'), where('pendingAmount', '>', 0)), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPendingAppts(list);
    });

    const fetchData = async () => {
      try {
        const pSnap = await getDocs(query(collection(db, 'allpatients')));
        const pData = [];
        pSnap.forEach(doc => pData.push({ id: doc.id, ...doc.data() }));
        if (active) setPatients(pData);

        const tSnap = await getDocs(query(collection(db, 'alltransactions'), orderBy('timestamp', 'desc')));
        const tData = [];
        tSnap.forEach(doc => tData.push({ id: doc.id, ...doc.data() }));
        if (active) setTransactions(tData);
      } catch (err) {
        console.error("Error fetching revenue data", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchData();

    return () => {
      active = false;
      unsubBranches();
      unsubPats();
      unsubAppts();
    };
  }, []);

  const allHistoryTransactions = useMemo(() => {
    const list = [];
    const existingKeys = new Set();
    const pLookup = {};
    patients.forEach(p => {
      if (p.id) pLookup[p.id] = p;
      if (p.registrationId) pLookup[p.registrationId] = p;
    });

    transactions.forEach(t => {
      const d = parseAnyDate(t.timestamp);
      const k1 = `${t.patientId}_${d ? d.toDateString() : ''}`;
      if (existingKeys.has(k1)) return;

      const amt = Number(t.amount || 0);
      let rawType = (t.type || 'Consultation').toLowerCase();
      let rowType = 'Consultation';

      if (rawType.includes('medicine') || rawType.includes('product') || rawType.includes('pharmacy') || rawType === 'consultation & medicine fee') {
        rowType = 'Consultation & Medicine Fee';
      } else if (rawType.includes('nutrition') || rawType.includes('diet')) {
        rowType = 'Diet Plan';
      }

      const pData = t.patientId ? (pLookup[t.patientId] || {}) : {};

      list.push({
        id: `tx_${t.id}_${Math.random().toString(36).substring(7)}`,
        type: rowType,
        regId: t.regId || t.registrationId || pData.registrationId || pData.regId || '-',
        patientName: t.patientName || t.fullName || pData.fullName || pData.patientName || '-',
        phone: t.phone || t.patientPhone || pData.phone || pData.patientPhone || pData.phoneNumber || pData.contactNumber || pData.contact || '-',
        branch: t.branchName || t.branch || pData.branchName || 'Main Branch',
        doctorName: t.doctorName || t.doctor || pData.doctor || pData.doctorName || pData.assignDoctor || '-',
        source: t.source || pData.source || 'Walk-in',
        amount: amt,
        method: (() => {
          const m = (t.method || '-').toUpperCase();
          return (m === 'SPLIT' || m === 'APP_SPLIT') ? 'CASH/UPI' : m;
        })(),
        dateTime: d ? d.toLocaleString('en-IN') : 'N/A',
        timestamp: d ? d.getTime() : 0,
        status: 'PAID'
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, patients]);

  const pendingData = useMemo(() => {
    const pMap = {};
    const d = new Date();
    const currentMonth = d.getMonth();
    const currentYear = d.getFullYear();

    const normalizeBranchName = (val) => {
      if (!val) return 'Main Branch';
      const str = val.toLowerCase().trim();
      if (str.includes('kphb')) return 'KPHB Branch';
      if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'Chandanagar Branch';
      if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'Dilshuknagar Branch';
      if (str.includes('nallagandla')) return 'Nallagandla Branch';
      return val.trim();
    };

    pendingRecordsRaw.forEach(item => {
      const pAmt = Number(item.pendingAmount || 0);
      if (pAmt > 0) {
        const bName = normalizeBranchName(item.branchName);
        if (!pMap[bName]) {
          pMap[bName] = { name: bName, count: 0, totalPending: 0, thisMonthPending: 0, uniquePats: new Set() };
        }
        pMap[bName].totalPending += pAmt;
        
        let patId = item.id;
        if (patId) pMap[bName].uniquePats.add(patId);

        const dateRaw = item.paymentCollectedAt || item.appointmentDate || item.createdAt || item.dateString;
        let dt = parseAnyDate(dateRaw);
        if (dt && dt.getMonth() === currentMonth && dt.getFullYear() === currentYear) {
          pMap[bName].thisMonthPending += pAmt;
        }
      }
    });

    return Object.values(pMap).map(p => ({
      name: p.name,
      count: p.uniquePats.size || 1,
      totalPending: p.totalPending,
      thisMonthPending: p.thisMonthPending
    })).sort((a, b) => b.totalPending - a.totalPending);
  }, [pendingRecordsRaw]);

  const checkAmountRange = (amt, rangeStr) => {
    if (rangeStr === 'all') return true;
    switch (rangeStr) {
      case '500-1000': return amt >= 500 && amt <= 1000;
      case '1000-2000': return amt >= 1000 && amt <= 2000;
      case '2000-3000': return amt >= 2000 && amt <= 3000;
      case '3000-4000': return amt >= 3000 && amt <= 4000;
      case '4000-5000': return amt >= 4000 && amt <= 5000;
      case '5000+': return amt > 5000;
      default: return true;
    }
  };

  const filteredHistory = useMemo(() => {
    return allHistoryTransactions.filter(tr => {
      // 1. Search
      if (revenueSearch.trim()) {
        const q = revenueSearch.toLowerCase();
        const match = (tr.patientName || '').toLowerCase().includes(q) || 
                      (tr.phone || '').includes(q) || 
                      (tr.regId || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      
      // 2. Branch
      if (revenueBranchId !== 'all') {
        const selectedBranchName = branches.find(b => b.id === revenueBranchId)?.name || '';
        const tBranch = (tr.branch || '').toLowerCase();
        if (tBranch !== selectedBranchName.toLowerCase()) return false;
      }

      // 3. Date
      let matchesDate = true;
      const d = new Date(tr.timestamp);
      if (tr.timestamp > 0) {
        if (revenueDate) {
          const fd = new Date(revenueDate);
          if (d.getFullYear() !== fd.getFullYear() || d.getMonth() !== fd.getMonth() || d.getDate() !== fd.getDate()) matchesDate = false;
        } else if (revenueYear !== 'all') {
          if (d.getFullYear() !== parseInt(revenueYear, 10)) matchesDate = false;
          else if (revenueMonth !== 'all' && d.getMonth() + 1 !== parseInt(revenueMonth, 10)) matchesDate = false;
        }
      } else {
        if (revenueDate || revenueYear !== 'all') matchesDate = false;
      }
      if (!matchesDate) return false;

      // 4. Source
      if (revenueSource !== 'all' && tr.source !== revenueSource) return false;

      // 5. Method
      if (revenueMethod !== 'all' && tr.method.toLowerCase() !== revenueMethod.toLowerCase()) return false;

      // 6. Split Type
      if (revenueSplitType !== 'all' && tr.type !== revenueSplitType) return false;

      // 7. Amount Range
      if (!checkAmountRange(tr.amount, revenueAmountRange)) return false;

      return true;
    });
  }, [allHistoryTransactions, revenueSearch, revenueBranchId, revenueDate, revenueYear, revenueMonth, revenueSource, revenueMethod, revenueSplitType, revenueAmountRange, branches]);

  // Derived Stats
  const grandTotalCount = filteredHistory.length;
  const grandTotalAmount = filteredHistory.reduce((sum, tr) => sum + Number(tr.amount || 0), 0);
  const grandCash = filteredHistory.filter(t => t.method === 'CASH').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const grandUpi = filteredHistory.filter(t => ['UPI', 'PHONEPE', 'GPAY', 'SPLIT', 'CASH/UPI'].includes(t.method)).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const grandCard = filteredHistory.filter(t => t.method === 'CARD').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  
  const splitCons = filteredHistory.filter(t => t.type === 'Consultation').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const splitConsMed = filteredHistory.filter(t => t.type === 'Consultation & Medicine Fee').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const splitDiet = filteredHistory.filter(t => t.type === 'Diet Plan').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / rowsPerPage) || 1;
  const currentList = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredHistory.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredHistory, currentPage]);

  const handleResetFilters = () => {
    setRevenueSearch('');
    setRevenueBranchId('all');
    setRevenueDate('');
    setRevenueYear('all');
    setRevenueMonth('all');
    setRevenueSource('all');
    setRevenueMethod('all');
    setRevenueSplitType('all');
    setRevenueAmountRange('all');
    setCurrentPage(1);
  };

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading revenue data...</div>;
  }

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h2>Total Revenue Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Track all consultation, pharmacy, and medicine fees collected across branches</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Grand Total Revenue</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>₹{grandTotalAmount.toLocaleString('en-IN')}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>{grandTotalCount} Transactions</span>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Total By Mode</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
            <div className="flex-between"><span>Cash</span> <strong style={{ color: '#f59e0b' }}>₹{grandCash.toLocaleString('en-IN')}</strong></div>
            <div className="flex-between"><span>UPI</span> <strong style={{ color: '#0ea5e9' }}>₹{grandUpi.toLocaleString('en-IN')}</strong></div>
            <div className="flex-between"><span>Card</span> <strong style={{ color: '#10b981' }}>₹{grandCard.toLocaleString('en-IN')}</strong></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Revenue Split</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
            <div className="flex-between"><span>Consultation</span> <strong style={{ color: '#8b5cf6' }}>₹{splitCons.toLocaleString('en-IN')}</strong></div>
            <div className="flex-between"><span>Consultation & Medicine Fee</span> <strong style={{ color: '#14b8a6' }}>₹{splitConsMed.toLocaleString('en-IN')}</strong></div>
            <div className="flex-between"><span>Diet Plan</span> <strong style={{ color: '#f43f5e' }}>₹{splitDiet.toLocaleString('en-IN')}</strong></div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="#ef4444" /> Pay Later & Pending Amounts (By Branch)
        </h3>
        <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead style={{ backgroundColor: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
              <tr>
                <th style={{ padding: '12px 16px' }}>Branch</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Patients</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Pay Later (All Time)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pay Later (This Month)</th>
              </tr>
            </thead>
            <tbody>
              {pendingData.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No pending amounts found.</td></tr>
              ) : (
                pendingData.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {p.count} Patients
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                      ₹{p.totalPending.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#f59e0b' }}>
                      ₹{p.thisMonthPending.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
         <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Search Patient</label>
          <input type="text" placeholder="Name or phone..." className="glass-input" value={revenueSearch} onChange={(e) => { setRevenueSearch(e.target.value); setCurrentPage(1); }} style={{ fontSize: '0.85rem', padding: '8px 12px' }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Branch</label>
          <select className="glass-input" value={revenueBranchId} onChange={(e) => { setRevenueBranchId(e.target.value); setCurrentPage(1); }} style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter by Date</label>
          <input type="date" className="glass-input" value={revenueDate} onChange={(e) => { setRevenueDate(e.target.value); setRevenueYear('all'); setRevenueMonth('all'); setCurrentPage(1); }} style={{ colorScheme: 'dark', fontSize: '0.85rem', padding: '8px 12px', cursor: 'pointer' }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter by Year</label>
          <select className="glass-input" value={revenueYear} onChange={(e) => { setRevenueYear(e.target.value); setRevenueDate(''); setCurrentPage(1); }} style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}>
            <option value="all">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter by Month</label>
          <select className="glass-input" value={revenueMonth} onChange={(e) => { setRevenueMonth(e.target.value); setRevenueDate(''); if (revenueYear === 'all') setRevenueYear(new Date().getFullYear().toString()); setCurrentPage(1); }} style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}>
            <option value="all">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleResetFilters} className="btn-secondary" style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.85rem' }}><RotateCcw size={14} /> Reset</button>
        </div>
      </div>

      <div className="table-container glass-panel">
        <table>
          <thead>
            <tr>
              <th>S.N.O</th>
              <th>Reg ID</th>
              <th>Patient Name</th>
              <th>Phone</th>
              <th>Branch</th>
              <th>Doctor</th>
              <th>Split</th>
              <th>Source</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date / Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentList.length === 0 ? (
              <tr><td colSpan="12" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No transactions found.</td></tr>
            ) : currentList.map((tx, idx) => (
              <tr key={tx.id}>
                <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                <td style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{tx.regId}</td>
                <td style={{ fontWeight: 500 }}>{tx.patientName}</td>
                <td>{tx.phone}</td>
                <td><span className="badge" style={{ background: 'rgba(37, 142, 200, 0.1)', color: '#0ea5e9' }}>{tx.branch}</span></td>
                <td>{tx.doctorName}</td>
                <td><span className="badge" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>{tx.type}</span></td>
                <td><span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>{tx.source}</span></td>
                <td style={{ fontWeight: 'bold' }}>₹{tx.amount}</td>
                <td>
                  <span className="badge" style={{ background: tx.method === 'CASH' ? 'rgba(245, 158, 11, 0.1)' : tx.method === 'UPI' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: tx.method === 'CASH' ? '#f59e0b' : tx.method === 'UPI' ? '#0ea5e9' : '#10b981' }}>
                    {tx.method}
                  </span>
                </td>
                <td>{tx.dateTime}</td>
                <td><span className="badge badge-primary">{tx.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default HRTotalRevenue;
