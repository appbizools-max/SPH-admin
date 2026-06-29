import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { IndianRupee, MapPin, Calendar, User, Phone, Search } from 'lucide-react';

const PendingPayments = () => {
  const [pendingRecords, setPendingRecords] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBranches();
    fetchPendingPayments();
  }, []);

  const normalizeBranchName = (val) => {
    if (!val) return 'Main Branch';
    const str = val.toLowerCase().trim();
    if (str.includes('kphb')) return 'KPHB Branch';
    if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'Chandanagar Branch';
    if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'Dilshuknagar Branch';
    if (str.includes('nallagandla')) return 'Nallagandla Branch';
    return val.trim();
  };

  const fetchBranches = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'branch')));
      const branchData = [];
      snap.forEach(doc => branchData.push({ id: doc.id, ...doc.data() }));
      setBranches(branchData);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      // All records (walk-ins + online bookings) are unified in allpatients
      const allPatientsSnap = await getDocs(query(collection(db, 'allpatients'), where('pendingAmount', '>', 0)));

      const recordsMap = new Map();

      const addRecord = (doc) => {
        const data = doc.data();
        const id = doc.id;
        const phone = data.phone || data.patientPhone || data.phoneNumber || data.contact || '';
        const name = data.fullName || data.patientName || data.name || 'Unknown';
        const branchName = normalizeBranchName(data.branchName || data.branchId);
        const branchId = data.branchId || '';
        const amount = Number(data.pendingAmount) || 0;
        const dateStr = data.paymentCollectedAt || data.appointmentDate || data.createdAt || data.dateString || '';

        recordsMap.set(id, {
          id,
          source: data.source || 'Patient',
          name,
          phone,
          branchName,
          branchId,
          amount,
          dateStr,
          rawDate: new Date(dateStr).getTime() || 0,
          regId: data.registrationId || data.regId || data.regID || 'N/A'
        });
      };

      allPatientsSnap.forEach(doc => addRecord(doc));

      const mergedRecords = Array.from(recordsMap.values()).sort((a, b) => b.rawDate - a.rawDate);
      setPendingRecords(mergedRecords);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = pendingRecords.filter(record => {
    let matchesBranch = selectedBranch === 'all';
    if (!matchesBranch) {
        const branchObj = branches.find(b => b.id === selectedBranch);
        const selectedBranchNormalizedName = branchObj ? normalizeBranchName(branchObj.name) : '';
        matchesBranch = record.branchId === selectedBranch || record.branchName === selectedBranchNormalizedName;
    }
    const matchesSearch = !searchTerm || record.name.toLowerCase().includes(searchTerm.toLowerCase()) || record.phone.includes(searchTerm);
    return matchesBranch && matchesSearch;
  });

  const totalPending = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

  // Calculate branch-wise totals
  const branchTotals = pendingRecords.reduce((acc, record) => {
    const bName = record.branchName || 'Main Branch';
    if (!acc[bName]) acc[bName] = 0;
    acc[bName] += record.amount;
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <IndianRupee size={24} color="var(--primary-color)" />
        Pending Payments (Pay Later)
      </h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>Total Pending Amount</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444' }}>₹{totalPending}</div>
        </div>
        
        {Object.entries(branchTotals).map(([branchName, amount]) => (
          <div key={branchName} className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>{branchName}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)' }}>₹{amount}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
          <label className="form-label" style={{ fontSize: '12px' }}>Search Patient</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="glass-input"
              placeholder="Name or Phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', margin: 0 }}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
          <label className="form-label" style={{ fontSize: '12px' }}>Filter Branch</label>
          <select
            className="glass-input"
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            style={{ margin: 0, background: 'var(--bg-dark)' }}
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container glass-panel">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading pending payments...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No pending payments found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Reg ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Patient Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Phone</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Branch</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Pending Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>
                    {record.dateStr ? new Date(record.dateStr).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>{record.regId}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)', fontWeight: '600' }}>{record.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>{record.phone}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                      {record.branchName}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444', fontWeight: 'bold' }}>
                    ₹{record.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PendingPayments;
