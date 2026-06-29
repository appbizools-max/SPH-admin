import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  RotateCcw, ExternalLink, Search, ChevronLeft, ChevronRight, IndianRupee
} from 'lucide-react';

// Date parser helpers
const parseHTMLDateToDateObj = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return null;
};

const parseGBDateToDateObj = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  return null;
};

const formatDateToDisplay = (dateStr) => {
  if (!dateStr) return 'N/A';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

const PATIENT_SOURCES = [
  'Walk-in',
  'Instagram',
  'Facebook',
  'Website',
  'Google',
  'Online',
  'Practo',
  'Referral',
  'Youtube'
];

const MONTHS = [
  { val: '1', label: 'January' },
  { val: '2', label: 'February' },
  { val: '3', label: 'March' },
  { val: '4', label: 'April' },
  { val: '5', label: 'May' },
  { val: '6', label: 'June' },
  { val: '7', label: 'July' },
  { val: '8', label: 'August' },
  { val: '9', label: 'September' },
  { val: '10', label: 'October' },
  { val: '11', label: 'November' },
  { val: '12', label: 'December' }
];

const ConsultationRevenue = () => {
  const [patients, setPatients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Revenue Filters
  const [revenueSearch, setRevenueSearch] = useState('');
  const [revenueBranchId, setRevenueBranchId] = useState('all');
  const [revenueDate, setRevenueDate] = useState('');
  const [revenueYear, setRevenueYear] = useState('all');
  const [revenueMonth, setRevenueMonth] = useState('all');
  const [revenueSource, setRevenueSource] = useState('all');
  const [revenueMethod, setRevenueMethod] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    // 1. Fetch branches
    const qBranches = query(collection(db, 'users'), where('role', '==', 'branch'));
    const unsubBranches = onSnapshot(qBranches, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setBranches(list);
    });

    // 2. Fetch all patients & transactions
    const qPatients = query(collection(db, 'patients'));
    const unsubPatients = onSnapshot(qPatients, (snap) => {
      const pList = [];
      snap.forEach(d => pList.push({ id: d.id, ...d.data() }));

      const qTrans = query(collection(db, 'transactions'), where('type', '==', 'consultation'));
      getDocs(qTrans).then(tSnap => {
        const list = [...pList];

        const parseD = (raw) => {
          if (!raw) return null;
          if (raw.toDate) return raw.toDate();
          if (raw.seconds) return new Date(raw.seconds * 1000);
          return new Date(raw);
        };

        const existingKeys = new Set(list.map(p => {
          const d = parseD(p.paymentCollectedAt || p.appointmentDate || p.createdAt);
          return `${p.id}_${d ? d.toDateString() : ''}`;
        }));

        tSnap.forEach(tDoc => {
          const t = tDoc.data();
          const tDate = parseD(t.timestamp);
          const k = `${t.patientId}_${tDate ? tDate.toDateString() : ''}`;

          if (!existingKeys.has(k)) {
            list.push({
              id: tDoc.id,
              fullName: t.patientName || 'Unknown',
              phone: t.phone || 'N/A',
              branchName: t.branch || 'Unknown',
              paymentCollectedAt: t.timestamp,
              paymentStatus: 'paid',
              paymentMethod: t.method,
              paymentAmount: t.amount,
              itemsPaid: { consultation: t.amount },
              isFromTransaction: true,
              patientId: t.patientId
            });
            existingKeys.add(k);
          }
        });

        setPatients(list);
        setLoading(false);
      }).catch(() => {
        setPatients(pList);
        setLoading(false);
      });
    });

    return () => {
      unsubBranches();
      unsubPatients();
    };
  }, []);

  const handleResetFilters = () => {
    setRevenueSearch('');
    setRevenueBranchId('all');
    setRevenueDate('');
    setRevenueYear('all');
    setRevenueMonth('all');
    setRevenueSource('all');
    setRevenueMethod('all');
    setCurrentPage(1);
  };

  const filteredRevenuePatients = useMemo(() => {
    return patients.filter(patient => {
      // Exclude Consultation & Medicine Fee payments from Consultation Revenue calculations
      const isConsultationPayment = patient.paymentStatus === 'paid'
        ? (!patient.itemsPaid || patient.itemsPaid.consultation > 0 || (patient.itemsPaid.consultation === undefined && patient.itemsPaid.medicine === undefined))
        : true;
      if (!isConsultationPayment) return false;

      // 1. Search term match (Name or Phone)
      const matchesSearch = !revenueSearch.trim() ||
        (patient.fullName && patient.fullName.toLowerCase().includes(revenueSearch.toLowerCase())) ||
        (patient.phone && String(patient.phone).includes(revenueSearch.trim()));

      // 2. Branch match
      const selectedBranchName = branches.find(b => b.id === revenueBranchId)?.name;
      const norm = (str) => (str || '').toString().trim().toLowerCase();
      const matchesBranch = revenueBranchId === 'all' ||
        patient.branchId === revenueBranchId ||
        (patient.branchName && norm(patient.branchName) === norm(selectedBranchName));

      // 3. Date / Month match
      let matchesDateRange = true;
      let rawDateStr = patient.paymentCollectedAt || patient.appointmentDate || patient.completedAt || patient.createdAt || patient.date;

      if (rawDateStr) {
        let d = null;
        if (rawDateStr?.toDate) {
          d = rawDateStr.toDate();
        } else if (rawDateStr?.seconds) {
          d = new Date(rawDateStr.seconds * 1000);
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
          if (revenueDate) {
            const filterDate = parseHTMLDateToDateObj(revenueDate);
            if (filterDate) {
              d.setHours(0, 0, 0, 0);
              filterDate.setHours(0, 0, 0, 0);
              if (d.getTime() !== filterDate.getTime()) matchesDateRange = false;
            }
          } else if (revenueYear !== 'all') {
            if (d.getFullYear() !== parseInt(revenueYear, 10)) {
              matchesDateRange = false;
            } else if (revenueMonth !== 'all') {
              if (d.getMonth() + 1 !== parseInt(revenueMonth, 10)) {
                matchesDateRange = false;
              }
            }
          }
        } else {
          if (revenueDate || revenueYear !== 'all') matchesDateRange = false;
        }
      } else {
        if (revenueDate || revenueYear !== 'all') matchesDateRange = false;
      }

      // 4. Source Match
      const matchesSource = revenueSource === 'all' || (patient.source || 'Walk-in') === revenueSource;

      // 5. Payment Method match
      const matchesMethod = revenueMethod === 'all' ||
        (patient.paymentStatus === 'paid' && patient.paymentMethod === revenueMethod);

      return matchesSearch && matchesBranch && matchesDateRange && matchesSource && matchesMethod;
    });
  }, [patients, branches, revenueSearch, revenueBranchId, revenueDate, revenueYear, revenueMonth, revenueSource, revenueMethod]);

  // Derived revenue stats
  const paidPatients = useMemo(() => filteredRevenuePatients.filter(p => p.paymentStatus === 'paid'), [filteredRevenuePatients]);
  const totalCollectedFees = useMemo(() => paidPatients.reduce((sum, p) => sum + (Number(p.itemsPaid?.consultation !== undefined ? p.itemsPaid.consultation : (p.paymentAmount || 0))), 0), [paidPatients]);
  const cashCollected = useMemo(() => paidPatients.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + (Number(p.itemsPaid?.consultation !== undefined ? p.itemsPaid.consultation : (p.paymentAmount || 0))), 0), [paidPatients]);
  const upiCollected = useMemo(() => paidPatients.filter(p => p.paymentMethod === 'upi').reduce((sum, p) => sum + (Number(p.itemsPaid?.consultation !== undefined ? p.itemsPaid.consultation : (p.paymentAmount || 0))), 0), [paidPatients]);
  const cardCollected = useMemo(() => paidPatients.filter(p => p.paymentMethod === 'card').reduce((sum, p) => sum + (Number(p.itemsPaid?.consultation !== undefined ? p.itemsPaid.consultation : (p.paymentAmount || 0))), 0), [paidPatients]);

  const top4Channels = useMemo(() => {
    const sourceStats = {};
    paidPatients.forEach(p => {
      const s = p.source || 'Walk-in';
      const amt = Number(p.itemsPaid?.consultation !== undefined ? p.itemsPaid.consultation : (p.paymentAmount || 0));
      sourceStats[s] = (sourceStats[s] || 0) + amt;
    });
    return Object.entries(sourceStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [paidPatients]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRevenuePatients.length / rowsPerPage) || 1;
  const paginatedPatients = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredRevenuePatients.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredRevenuePatients, currentPage, rowsPerPage]);

  const handleExportToExcel = () => {
    if (filteredRevenuePatients.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["S.N.O", "Reg ID", "Patient Name", "Phone", "Branch", "Amount", "Method", "Date / Time", "Status"];

    const rows = filteredRevenuePatients.map((patient, index) => {
      const sno = index + 1;
      const regId = patient.regId || patient.registrationId || "N/A";
      const name = patient.fullName || "N/A";
      const phone = patient.phone || "N/A";
      const branch = patient.branchName || "Main Branch";
      const amount = patient.paymentStatus === 'paid' ? (patient.itemsPaid?.consultation !== undefined ? patient.itemsPaid.consultation : (patient.paymentAmount || 600)) : 0;
      const method = patient.paymentStatus === 'paid' ? (patient.paymentMethod || "N/A").toUpperCase() : "N/A";
      const dateTime = patient.paymentCollectedAt ? new Date(patient.paymentCollectedAt).toLocaleString() : (patient.appointmentDate ? formatDateToDisplay(patient.appointmentDate) : "N/A");
      const status = patient.paymentStatus === 'paid' ? "PAID" : "NOT PAID";

      return [
        sno,
        `"${regId.replace(/"/g, '""')}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${phone.replace(/"/g, '""')}"`,
        `"${branch.replace(/"/g, '""')}"`,
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
    const dateSuffix = revenueDate ? revenueDate : (revenueYear !== 'all' ? `${revenueYear}_${revenueMonth}` : 'all_time');
    link.setAttribute("download", `consultation_revenue_${dateSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h2>Consultation Revenue Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Analyze and filter doctor consultation fees collection records</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          Loading revenue records...
        </div>
      ) : (
        <>
          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Total Revenue & Transactions */}
            <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Total Revenue</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>₹{totalCollectedFees}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>{paidPatients.length} Transactions</span>
            </div>

            {/* By Mode */}
            <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>By Mode</span>
              {paidPatients.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                  <div className="flex-between"><span>Cash</span> <strong style={{ color: '#f59e0b' }}>₹{cashCollected}</strong></div>
                  <div className="flex-between"><span>UPI</span> <strong style={{ color: '#0ea5e9' }}>₹{upiCollected}</strong></div>
                  <div className="flex-between"><span>Card</span> <strong style={{ color: '#10b981' }}>₹{cardCollected}</strong></div>
                </div>
              )}
            </div>

            {/* By Channel (Top 4) */}
            <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>By Channel (Top 4)</span>
              {top4Channels.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                  {top4Channels.map(([source, amount]) => (
                    <div key={source} className="flex-between">
                      <span>{source}</span> <strong style={{ color: '#8b5cf6' }}>₹{amount}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Search Patient</label>
              <input
                type="text"
                placeholder="Name or phone..."
                className="glass-input"
                value={revenueSearch}
                onChange={(e) => { setRevenueSearch(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter Branch</label>
              <select
                className="glass-input"
                value={revenueBranchId}
                onChange={(e) => { setRevenueBranchId(e.target.value); setCurrentPage(1); }}
                style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter by Date</label>
              <input
                type="date"
                className="glass-input"
                value={revenueDate}
                onChange={(e) => { setRevenueDate(e.target.value); setRevenueYear('all'); setRevenueMonth('all'); setCurrentPage(1); }}
                style={{ colorScheme: 'dark', fontSize: '0.85rem', padding: '8px 12px', cursor: 'pointer' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter by Year</label>
              <select
                className="glass-input"
                value={revenueYear}
                onChange={(e) => { setRevenueYear(e.target.value); setRevenueDate(''); setCurrentPage(1); }}
                style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}
              >
                <option value="all">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Filter by Month</label>
              <select
                className="glass-input"
                value={revenueMonth}
                onChange={(e) => { setRevenueMonth(e.target.value); setRevenueDate(''); if (revenueYear === 'all') setRevenueYear(new Date().getFullYear().toString()); setCurrentPage(1); }}
                style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}
              >
                <option value="all">All Months</option>
                {MONTHS.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Patient Source</label>
              <select
                className="glass-input"
                value={revenueSource}
                onChange={(e) => { setRevenueSource(e.target.value); setCurrentPage(1); }}
                style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}
              >
                <option value="all">All Sources</option>
                {PATIENT_SOURCES.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Payment Mode</label>
              <select
                className="glass-input"
                value={revenueMethod}
                onChange={(e) => { setRevenueMethod(e.target.value); setCurrentPage(1); }}
                style={{ background: 'var(--bg-dark)', fontSize: '0.85rem', padding: '8px 12px' }}
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleResetFilters} className="btn-secondary" style={{ flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.85rem' }}>
                <RotateCcw size={14} /> Reset
              </button>
              <button onClick={handleExportToExcel} className="btn-primary" style={{ flex: 1, padding: '8px', background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.85rem' }}>
                <ExternalLink size={14} /> Export
              </button>
            </div>
          </div>

          {/* Collections Table */}
          <div className="table-container glass-panel">
            <table>
              <thead>
                <tr>
                  <th>S.N.O</th>
                  <th>Reg ID</th>
                  <th>Patient Name</th>
                  <th>Phone</th>
                  <th>Branch</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date / Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No fee collection records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((patient, index) => {
                    const amount = patient.paymentStatus === 'paid' ? (patient.itemsPaid?.consultation !== undefined ? patient.itemsPaid.consultation : (patient.paymentAmount || 600)) : 0;
                    const method = patient.paymentStatus === 'paid' ? (patient.paymentMethod || "N/A").toUpperCase() : "N/A";
                    const dateTime = patient.paymentCollectedAt
                      ? new Date(patient.paymentCollectedAt).toLocaleString('en-IN')
                      : (patient.appointmentDate ? formatDateToDisplay(patient.appointmentDate) : "N/A");

                    return (
                      <tr key={patient.id}>
                        <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                        <td style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{patient.regId || patient.registrationId || 'N/A'}</td>
                        <td style={{ fontWeight: '600' }}>{patient.fullName}</td>
                        <td>{patient.phone}</td>
                        <td>{patient.branchName || 'Main Branch'}</td>
                        <td>{patient.source || 'Walk-in'}</td>
                        <td style={{ fontWeight: 'bold' }}>₹{amount}</td>
                        <td>
                          <span className={`badge ${method === 'CASH' ? 'badge-primary' : method === 'UPI' ? 'badge-secondary' : ''}`}>
                            {method}
                          </span>
                        </td>
                        <td>{dateTime}</td>
                        <td>
                          <span className={`badge ${patient.paymentStatus === 'paid' ? 'badge-primary' : 'badge-secondary'}`}>
                            {patient.paymentStatus?.toUpperCase() || 'NOT PAID'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (<strong>{filteredRevenuePatients.length}</strong> total records)
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="btn-secondary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1
                  }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="btn-secondary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConsultationRevenue;
