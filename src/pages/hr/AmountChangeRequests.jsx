import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, DollarSign, History, Shield, RefreshCw } from 'lucide-react';

const AmountChangeRequests = () => {
  const { userData } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('pending'); // 'pending' or 'history'

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'hr_amount_requests'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort by requestedAt descending
      list.sort((a, b) => {
        const timeA = (a.requestedAt && typeof a.requestedAt.toDate === 'function') ? a.requestedAt.toDate() : (a.requestedAt ? new Date(a.requestedAt) : 0);
        const timeB = (b.requestedAt && typeof b.requestedAt.toDate === 'function') ? b.requestedAt.toDate() : (b.requestedAt ? new Date(b.requestedAt) : 0);
        return timeB - timeA;
      });

      setRequests(list);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to amount change requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (request, newStatus) => {
    try {
      const requestRef = doc(db, 'hr_amount_requests', request.id);
      
      // 1. Update the request document status
      await updateDoc(requestRef, {
        status: newStatus,
        reviewedBy: userData?.name || 'HR Manager',
        reviewedAt: new Date().toISOString()
      });

      // 2. If approved, update the target document (patient, appointment, or nutrition plan)
      if (newStatus === 'approved') {
        const targetRef = doc(db, request.targetCollection, request.targetId);
        
        // Let's verify target exists before writing
        const targetSnap = await getDoc(targetRef);
        if (targetSnap.exists()) {
          const payload = {
            approvedAmount: Number(request.proposedAmount),
            amountLocked: true
          };
          
          // For nutrition plans, we also update the primary 'amount' field
          if (request.targetCollection === 'nutrition_plans') {
            payload.amount = Number(request.proposedAmount);
          } else {
            payload.paymentAmount = Number(request.proposedAmount);
          }

          await updateDoc(targetRef, payload);
        } else {
          console.warn(`Target document ${request.targetId} in ${request.targetCollection} not found.`);
        }
      }

      alert(`Amount change request ${newStatus} successfully.`);
    } catch (error) {
      console.error('Error updating amount change request:', error);
      alert('Failed to update request: ' + error.message);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Amount Change Approvals</h2>
          <p style={{ color: 'var(--text-muted)' }}>Review receptionist requests to modify locked billing amounts for patients and diet plans</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <button
          onClick={() => setSubTab('pending')}
          className={`btn-secondary ${subTab === 'pending' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: subTab === 'pending' ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
            color: subTab === 'pending' ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <DollarSign size={14} /> Pending Requests
          {pendingRequests.length > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '11px',
              fontWeight: 700,
              marginLeft: '4px'
            }}>
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('history')}
          className={`btn-secondary ${subTab === 'history' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: subTab === 'history' ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.05)',
            color: subTab === 'history' ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <History size={14} /> History Log
        </button>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <RefreshCw className="spin" style={{ marginRight: '8px' }} size={16} />
          Loading amount change requests...
        </div>
      ) : subTab === 'pending' ? (
        pendingRequests.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Shield size={28} color="#10b981" style={{ marginBottom: '12px' }} />
            <div>No pending amount change requests.</div>
          </div>
        ) : (
          <div className="table-container glass-panel">
            <table>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Category</th>
                  <th>Branch</th>
                  <th>Current Amount</th>
                  <th>Proposed Amount</th>
                  <th>Reason</th>
                  <th>Requested By/At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((item) => {
                  const reqDate = (item.requestedAt && typeof item.requestedAt.toDate === 'function')
                    ? item.requestedAt.toDate().toLocaleString('en-IN')
                    : (item.requestedAt ? new Date(item.requestedAt).toLocaleString('en-IN') : 'N/A');
                  const categoryLabel = item.targetCollection === 'nutrition_plans' ? '🥦 Nutrition' : '🏥 General';
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.patientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.patientPhone}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ textTransform: 'uppercase' }}>{categoryLabel}</span>
                      </td>
                      <td>{item.branchName || 'N/A'}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>₹{item.currentAmount}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{item.proposedAmount}</td>
                      <td style={{ maxWidth: '180px', fontSize: '12px', wordBreak: 'break-word' }}>{item.reason}</td>
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: '500' }}>{item.requestedBy}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reqDate}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-primary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() => handleStatusUpdate(item, 'approved')}
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button
                            className="btn-secondary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() => handleStatusUpdate(item, 'rejected')}
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : historyRequests.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div>No history found.</div>
        </div>
      ) : (
        <div className="table-container glass-panel">
          <table>
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Category</th>
                <th>Branch</th>
                <th>Current Amount</th>
                <th>Proposed Amount</th>
                <th>Reviewed By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {historyRequests.map((item) => {
                const reqDate = (item.requestedAt && typeof item.requestedAt.toDate === 'function')
                  ? item.requestedAt.toDate().toLocaleString('en-IN')
                  : (item.requestedAt ? new Date(item.requestedAt).toLocaleString('en-IN') : 'N/A');
                const categoryLabel = item.targetCollection === 'nutrition_plans' ? 'Nutrition' : 'General';
                let resColor = '#94a3b8';
                let resText = item.status?.toUpperCase() || 'UNKNOWN';
                if (item.status === 'approved') {
                  resColor = '#10b981';
                } else if (item.status === 'rejected') {
                  resColor = '#ef4444';
                }

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.patientName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.patientPhone}</div>
                    </td>
                    <td>{categoryLabel}</td>
                    <td>{item.branchName || 'N/A'}</td>
                    <td style={{ fontWeight: '500' }}>₹{item.currentAmount}</td>
                    <td style={{ fontWeight: 'bold' }}>₹{item.proposedAmount}</td>
                    <td>
                      <div>{item.reviewedBy || 'HR Manager'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString('en-IN') : ''}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `rgba(255,255,255,0.05)`, border: `1px solid ${resColor}`, color: resColor }}>
                        {resText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AmountChangeRequests;
