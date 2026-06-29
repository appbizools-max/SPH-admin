import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import {
  collection, query, where, addDoc, serverTimestamp,
  doc, updateDoc, getDocs, onSnapshot
} from 'firebase/firestore';
import {
  Target, Calendar, TrendingUp, Edit, Save, RefreshCw,
  ArrowLeft
} from 'lucide-react';
const normKey = (k) => (k || '').toString().toLowerCase().trim();
const HRTargetTab = () => {
  const { userData } = useAuth();
  const [branches, setBranches] = useState([]);
  const [targets, setTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [editingTarget, setEditingTarget] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [salesData, setSalesData] = useState({});
  const [consultationData, setConsultationData] = useState({});
  const [consultationRevenueData, setConsultationRevenueData] = useState({});
  const [pharmacyData, setPharmacyData] = useState({});
  const [historyData, setHistoryData] = useState([]);
  const [unsubTargets, setUnsubTargets] = useState(null);
  useEffect(() => {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(monthKey);
    fetchBranches();
    const unsub = fetchTargets(monthKey);
    setUnsubTargets(() => unsub);
    fetchAllData(monthKey);
    return () => { if (unsub) unsub(); };
  }, []);
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'branch')));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      if (list.length > 0) { setBranches(list); setLoading(false); return; }
      const snap2 = await getDocs(collection(db, 'branches'));
      const list2 = [];
      snap2.forEach(d => list2.push({ id: d.id, ...d.data() }));
      setBranches(list2);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  const fetchTargets = (monthKey) => {
    try {
      const q = query(collection(db, 'monthly_targets'), where('month', '==', monthKey));
      return onSnapshot(q, (snap) => {
        const map = {};
        snap.forEach(d => { const data = d.data(); map[data.branchId] = { id: d.id, ...data }; });
        setTargets(map);
      });
    } catch (e) { console.error(e); }
  };
  const fetchAllData = async (currentMonthKey) => {
    try {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

      // Fetch all transactions once
      const txSnap = await getDocs(collection(db, 'alltransactions'));
      const salesMap = {};
      const consultRevMap = {};
      const pharmMap = {};
      const lastMonthMap = {};
      const patMap = {}; // Consultations count
      const processedConsultations = new Set(); // Prevent double counting patients in the same month

      txSnap.forEach(d => {
        const data = d.data();
        if (data.timestamp) {
          const date = new Date(data.timestamp.seconds * 1000);
          const m = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const bid = normKey(data.branchId || data.branchName || data.branch);
          const amt = Number(data.amount || data.amountPaid || 0);

          if (m === currentMonthKey) {
            salesMap[bid] = (salesMap[bid] || 0) + amt;
            let rawType = (data.type || 'Consultation').toLowerCase();
            if (rawType.includes('medicine') || rawType.includes('product') || rawType.includes('pharmacy') || rawType === 'consultation & medicine fee') {
              pharmMap[bid] = (pharmMap[bid] || 0) + amt;
            } else if (rawType.includes('consultation')) {
              consultRevMap[bid] = (consultRevMap[bid] || 0) + amt;
              // Count as a consultation
              const patKey = `${bid}_${data.patientId || data.registrationId || d.id}`;
              if (!processedConsultations.has(patKey)) {
                patMap[bid] = (patMap[bid] || 0) + 1;
                processedConsultations.add(patKey);
              }
            } else if (rawType.includes('nutrition') || rawType.includes('diet')) {
              pharmMap[bid] = (pharmMap[bid] || 0) + amt; // Group diet under pharmacy/products for targets if needed, or sales
            } else {
              // Fallback for others
              consultRevMap[bid] = (consultRevMap[bid] || 0) + amt;
            }
          } else if (m === lastMonthKey) {
            lastMonthMap[bid] = (lastMonthMap[bid] || 0) + amt;
          }
        }
      });

      setSalesData(salesMap);
      setConsultationRevenueData(consultRevMap);
      setPharmacyData(pharmMap);
      setConsultationData(patMap);

      // Fetch last month's targets
      const targetSnap = await getDocs(query(collection(db, 'monthly_targets'), where('month', '==', lastMonthKey)));
      const list = [];
      targetSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      const updatedList = list.map(item => {
        const reached = lastMonthMap[normKey(item.branchId)] || lastMonthMap[normKey(item.branchName)] || 0;
        return { ...item, reached };
      });
      setHistoryData(updatedList);

    } catch (e) { console.error(e); }
  };
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    if (unsubTargets) unsubTargets();
    const unsub = fetchTargets(newMonth);
    setUnsubTargets(() => unsub);
    fetchAllData(newMonth);
  };
  const resetToCurrentMonth = () => {
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(monthKey);
    if (unsubTargets) unsubTargets();
    const unsub = fetchTargets(monthKey);
    setUnsubTargets(() => unsub);
    fetchAllData(monthKey);
  };
  const handleEditTarget = (branchId, currentTarget) => {
    setEditingTarget(branchId);
    setEditValue(currentTarget.toString());
  };

  const handleSaveTarget = async (branchId) => {
    if (!editingTarget || !editValue) return;
    setSaving(true);
    try {
      const numericTarget = parseInt(editValue.toString().replace(/\D/g, ''), 10) || 0;
      const targetData = targets[branchId];
      if (targetData && targetData.id) {
        await updateDoc(doc(db, 'monthly_targets', targetData.id), {
          target: numericTarget,
          editedBy: userData?.name || 'HR Manager',
          editedById: userData?.uid || '',
          editedAt: serverTimestamp()
        });
      } else {
        const branch = branches.find(b => b.id === branchId);
        await addDoc(collection(db, 'monthly_targets'), {
          branchId,
          branchName: branch?.name || '',
          month: selectedMonth,
          target: numericTarget,
          reached: 0,
          setBy: userData?.name || 'HR Manager',
          setById: userData?.uid || '',
          setAt: serverTimestamp()
        });
      }
      setEditingTarget(null);
      setEditValue('');
    } catch (e) {
      alert('Failed to save target: ' + e.message);
    } finally {
      setSaving(false);
    }
  };
  const handleCancelEdit = () => { setEditingTarget(null); setEditValue(''); };

  const getMonthName = (key) => {
    if (!key) return '';
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const calcPct = (reached, target) => {
    if (!target) return 0;
    return Math.round((reached / target) * 100);
  };

  return (
    <div className="target-management fade-in">
      <div className="page-header">
        <h2><Target className="icon" style={{ display: 'inline', marginRight: '10px' }} />Target Management</h2>
        <p className="subtitle">View and manage monthly targets for all branches</p>
      </div>

      {/* Month selector */}
      <div className="controls-section">
        <div className="month-selector">
          <label>Select Month:</label>
          <input type="month" value={selectedMonth} onChange={handleMonthChange} className="month-input" />
          <button onClick={resetToCurrentMonth} className="refresh-btn">
            <RefreshCw size={16} /> Current Month
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="summary-stats">
        <div className="summary-card">
          <span className="summary-label">Total Branches</span>
          <span className="summary-value">{branches.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Consultations</span>
          <span className="summary-value">{Object.values(consultationData).reduce((a, b) => a + b, 0)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Consultation Revenue</span>
          <span className="summary-value">₹{Object.values(consultationRevenueData).reduce((a, b) => a + b, 0).toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Pharmacy Revenue</span>
          <span className="summary-value">₹{Object.values(pharmacyData).reduce((a, b) => a + b, 0).toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Revenue</span>
          <span className="summary-value">₹{(Object.values(consultationRevenueData).reduce((a, b) => a + b, 0) + Object.values(pharmacyData).reduce((a, b) => a + b, 0)).toLocaleString()}</span>
        </div>
      </div>

      <div className="month-display">
        <h2><Calendar className="icon" style={{ display: 'inline', marginRight: '8px' }} />{getMonthName(selectedMonth)}</h2>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : branches.length === 0 ? (
        <div className="empty-state">
          <Target size={48} color="#64748b" />
          <h3>No branches found</h3>
          <p>Please add branches in the system to manage targets.</p>
        </div>
      ) : (
        <div className="targets-grid">
          {branches.map(branch => {
            const targetData = targets[branch.id];
            const bId = normKey(branch.id);
            const bName = normKey(branch.name);
            const consultations = consultationData[bId] || consultationData[bName] || 0;
            const consultationRevenue = consultationRevenueData[bId] || consultationRevenueData[bName] || 0;
            const pharmacy = pharmacyData[bId] || pharmacyData[bName] || 0;
            const totalRevenue = consultationRevenue + pharmacy;
            const target = targetData?.target || 0;
            const reached = totalRevenue;
            const pct = calcPct(reached, target);

            return (
              <div key={branch.id} className="target-card">
                <div className="card-header">
                  <h3>{branch.name}</h3>
                  {targetData && (
                    <span className={`status-badge ${targetData.setBy === 'Auto-generated' ? 'auto' : 'manual'}`}>
                      {targetData.setBy}
                    </span>
                  )}
                </div>

                <div className="target-stats">
                  <div className="stat-item">
                    <span className="label">Target:</span>
                    {editingTarget === branch.id ? (
                      <div className="edit-input-group">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="edit-input"
                          placeholder="Enter target"
                        />
                        <button onClick={() => handleSaveTarget(branch.id)} disabled={saving} className="save-btn">
                          <Save size={16} />
                        </button>
                        <button onClick={handleCancelEdit} className="cancel-btn">
                          <ArrowLeft size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="value">{target || 'Not Set'}</span>
                    )}
                  </div>
                  <div className="stat-item">
                    <span className="label">Consultations:</span>
                    <span className="value">{consultations}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Consultation Revenue:</span>
                    <span className="value">₹{consultationRevenue.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Pharmacy Revenue:</span>
                    <span className="value">₹{pharmacy.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Total Revenue:</span>
                    <span className="value">₹{totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Reached:</span>
                    <span className="value">{reached}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Progress:</span>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                      <span className="percentage">{pct}%</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  {targetData ? (
                    <button onClick={() => handleEditTarget(branch.id, target)} disabled={saving} className="edit-btn">
                      <Edit size={16} /> Edit Target
                    </button>
                  ) : (
                    <button onClick={() => { setEditingTarget(branch.id); setEditValue(''); }} disabled={saving} className="add-btn">
                      <Target size={16} /> Set Target
                    </button>
                  )}
                </div>

                {targetData?.setBy && (
                  <div className="target-info">
                    <small>Set by: {targetData.setBy}</small>
                    {targetData.editedBy && <small> | Edited by: {targetData.editedBy}</small>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {historyData.length > 0 && (
        <div className="history-section">
          <h2><TrendingUp className="icon" style={{ display: 'inline', marginRight: '8px' }} />Last Month Summary</h2>
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Branch</th><th>Target</th><th>Reached</th><th>Progress</th><th>Set By</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map(item => {
                  const pct = calcPct(item.reached, item.target);
                  return (
                    <tr key={item.id}>
                      <td>{item.branchName}</td>
                      <td>{item.target}</td>
                      <td>{item.reached}</td>
                      <td>
                        <div className="progress-bar small">
                          <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                          <span className="percentage">{pct}%</span>
                        </div>
                      </td>
                      <td>{item.setBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRTargetTab;
