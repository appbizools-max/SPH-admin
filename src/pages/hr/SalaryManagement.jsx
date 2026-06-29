import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Coins, User, Clock, Trash2, Calendar, AlertTriangle, X } from 'lucide-react';

const LATE_THRESHOLD_MINUTES = 15;
const LATE_DAYS_PER_DEDUCTION = 3;
const DEDUCTION_PER_BLOCK = 500;

const SalaryManagement = () => {
  const { userData } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('process');

  // Auto-deduction state
  const [autoCalcLoading, setAutoCalcLoading] = useState(false);
  const [lateDaysCount, setLateDaysCount] = useState(0);
  const [autoDeduction, setAutoDeduction] = useState(0);
  const [lateLogDetails, setLateLogDetails] = useState([]);

  const [salaryData, setSalaryData] = useState({
    amount: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    bonus: '0',
    deductions: '0',
    notes: '',
    amountDate: new Date().toISOString().split('T')[0],
    professionType: '',
    salaryTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  });

  const fetchSalaryHistory = async (staffId) => {
    setHistoryLoading(true);
    try {
      const q = query(collection(db, 'salaries'), where('staffId', '==', staffId));
      const snap = await getDocs(q);
      const history = [];
      snap.forEach(doc => {
        history.push({ id: doc.id, ...doc.data() });
      });
      history.sort((a, b) => {
        const tA = a.processedAt?.toDate?.() || 0;
        const tB = b.processedAt?.toDate?.() || 0;
        return tB - tA;
      });
      setSalaryHistory(history);
    } catch (error) {
      console.error('Error fetching salary history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const calculateAutoDeduction = async (staffMember) => {
    setAutoCalcLoading(true);
    setLateDaysCount(0);
    setAutoDeduction(0);
    setLateLogDetails([]);

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const q = query(
        collection(db, 'activity_logs'),
        where('userId', '==', staffMember.id),
        where('action', '==', 'login')
      );
      const snap = await getDocs(q);

      const scheduledLoginTime = staffMember.loginTime || '09:00';
      const [schedHr, schedMin] = scheduledLoginTime.split(':').map(Number);

      const lateDays = [];

      snap.forEach(doc => {
        const log = doc.data();
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : null;
        if (!logDate) return;
        if (logDate < startOfMonth || logDate > today) return;

        const logHr = logDate.getHours();
        const logMin = logDate.getMinutes();
        const logTotalMin = logHr * 60 + logMin;
        const schedTotalMin = schedHr * 60 + schedMin;
        const diffMin = logTotalMin - schedTotalMin;

        if (diffMin > LATE_THRESHOLD_MINUTES) {
          lateDays.push({
            date: logDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            lateBy: diffMin,
          });
        }
      });

      const lateCount = lateDays.length;
      const deductionBlocks = Math.floor(lateCount / LATE_DAYS_PER_DEDUCTION);
      const totalDeduction = deductionBlocks * DEDUCTION_PER_BLOCK;

      setLateDaysCount(lateCount);
      setAutoDeduction(totalDeduction);
      setLateLogDetails(lateDays);
    } catch (error) {
      console.error('Error calculating deductions:', error);
    } finally {
      setAutoCalcLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStaff) {
      fetchSalaryHistory(selectedStaff.id);
      calculateAutoDeduction(selectedStaff);
    }
  }, [selectedStaff]);

  const fetchStaff = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      let q;
      if (userData?.branchId) {
        q = query(collection(db, 'users'), where('branchId', '==', userData.branchId));
      } else {
        q = query(collection(db, 'users'));
      }
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        if (['doctor', 'receptionist', 'hr', 'staff'].includes(d.role)) {
          data.push({ id: doc.id, ...d });
        }
      });
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) fetchStaff();
  }, [userData]);

  useEffect(() => {
    if (autoDeduction > 0) {
      setSalaryData(prev => ({ ...prev, deductions: String(autoDeduction) }));
    }
  }, [autoDeduction]);

  useEffect(() => {
    if (selectedStaff?.salary) {
      setSalaryData(prev => ({ ...prev, amount: String(selectedStaff.salary) }));
    }
  }, [selectedStaff]);

  const handleProcessSalary = async (e) => {
    e.preventDefault();
    if (!salaryData.amount) {
      alert('Please enter base salary amount.');
      return;
    }

    try {
      const grossSalary = parseFloat(salaryData.amount);
      const bonus = parseFloat(salaryData.bonus || 0);
      const deductions = parseFloat(salaryData.deductions || 0);
      const netSalary = grossSalary + bonus - deductions;

      await addDoc(collection(db, 'salaries'), {
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
        staffRole: selectedStaff.role,
        branchId: userData.branchId || 'KPHB',
        amount: grossSalary,
        bonus,
        deductions,
        lateDeduction: autoDeduction,
        lateDaysCount,
        netSalary,
        month: salaryData.month,
        year: salaryData.year,
        notes: salaryData.notes,
        amountDate: salaryData.amountDate,
        professionType: salaryData.professionType,
        salaryTime: salaryData.salaryTime,
        processedBy: userData.name || 'HR Manager',
        processedAt: serverTimestamp(),
        status: 'paid'
      });

      alert(`Salary processed successfully for ${selectedStaff.name}`);
      setShowModal(false);
      setSelectedStaff(null);
    } catch (error) {
      console.error('Error processing salary:', error);
      alert('Failed to process salary.');
    }
  };

  const openProcessModal = (item) => {
    setSelectedStaff(item);
    setSalaryData({
      amount: item.salary ? String(item.salary) : '',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear().toString(),
      bonus: '0',
      deductions: '0',
      notes: '',
      amountDate: new Date().toISOString().split('T')[0],
      professionType: item.role ? item.role.charAt(0).toUpperCase() + item.role.slice(1) : 'Staff',
      salaryTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
    setActiveSubTab('process');
    setShowModal(true);
  };

  const netPayable = (
    parseFloat(salaryData.amount || 0) +
    parseFloat(salaryData.bonus || 0) -
    parseFloat(salaryData.deductions || 0)
  );

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Salary Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Calculate work attendance deductions & process monthly payrolls</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>Loading employee directory...</div>
      ) : (
        <div className="table-container glass-panel">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Base Salary</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>{member.name}</td>
                  <td><span className="badge badge-secondary">{member.role?.toUpperCase()}</span></td>
                  <td>₹{member.salary ? Number(member.salary).toLocaleString('en-IN') : 'Not Set'}</td>
                  <td>
                    <button className="btn-primary" onClick={() => openProcessModal(member)}>
                      Process Payout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedStaff && (
        <div className="modal-backdrop" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel" style={{ width: '650px', padding: '32px', maxHeight: '90%', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span onClick={() => setActiveSubTab('process')} style={{ cursor: 'pointer', fontWeight: activeSubTab === 'process' ? 'bold' : 'normal', color: activeSubTab === 'process' ? 'var(--primary-color)' : 'var(--text-muted)' }}>Process Payout</span>
                <span onClick={() => setActiveSubTab('history')} style={{ cursor: 'pointer', fontWeight: activeSubTab === 'history' ? 'bold' : 'normal', color: activeSubTab === 'history' ? 'var(--primary-color)' : 'var(--text-muted)' }}>History ({salaryHistory.length})</span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {activeSubTab === 'process' ? (
              <form onSubmit={handleProcessSalary}>
                {/* Auto calculation */}
                {autoCalcLoading ? (
                  <div style={{ padding: '12px', background: '#f59e0b22', border: '1px solid #f59e0b', borderRadius: '8px', marginBottom: '16px' }}>
                    Auto-calculating late clock-ins...
                  </div>
                ) : lateDaysCount > 0 ? (
                  <div style={{ padding: '12px', background: '#ef444422', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '16px' }}>
                    <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                    Employee was late <strong>{lateDaysCount} days</strong> this month. Auto-applied deduction: <strong>₹{autoDeduction}</strong>
                  </div>
                ) : null}

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Base Salary (₹)</label>
                  <input
                    type="number"
                    className="glass-input"
                    value={salaryData.amount}
                    onChange={(e) => setSalaryData({ ...salaryData, amount: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Bonus (₹)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={salaryData.bonus}
                      onChange={(e) => setSalaryData({ ...salaryData, bonus: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deductions (₹)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={salaryData.deductions}
                      onChange={(e) => setSalaryData({ ...salaryData, deductions: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Pay Period (Month & Year)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                    <input type="text" className="glass-input" value={salaryData.month} onChange={(e) => setSalaryData({ ...salaryData, month: e.target.value })} />
                    <input type="number" className="glass-input" value={salaryData.year} onChange={(e) => setSalaryData({ ...salaryData, year: e.target.value })} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Internal Audit Notes</label>
                  <textarea className="glass-input" rows={2} value={salaryData.notes} onChange={(e) => setSalaryData({ ...salaryData, notes: e.target.value })} />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                  <div className="flex-between" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    <span>Net Payable:</span>
                    <span style={{ color: 'var(--primary-color)' }}>₹{netPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  Generate Payslip & Pay
                </button>
              </form>
            ) : (
              <div>
                {historyLoading ? (
                  <div>Loading history...</div>
                ) : salaryHistory.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No past salary logs found for this staff member.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {salaryHistory.map((h) => (
                      <div key={h.id} className="glass-panel" style={{ padding: '16px' }}>
                        <div className="flex-between" style={{ marginBottom: '6px' }}>
                          <strong>{h.month} {h.year}</strong>
                          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>₹{h.netSalary}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                          Base: ₹{h.amount} | Bonus: ₹{h.bonus} | Ded: ₹{h.deductions}
                        </p>
                        {h.notes && <p style={{ fontSize: '12px', fontStyle: 'italic', marginTop: '6px', marginBottom: 0 }}>Notes: "{h.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;
