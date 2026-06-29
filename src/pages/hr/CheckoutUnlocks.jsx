import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Key, History, Shield, RefreshCw } from 'lucide-react';

const CheckoutUnlocks = () => {
  const { userData } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('pending'); // 'pending' or 'history'

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'checkout_unlock_requests'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort by createdAt descending
      list.sort((a, b) => {
        const timeA = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : 0);
        const timeB = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : 0);
        return timeB - timeA;
      });

      setRequests(list);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to checkout unlock requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await updateDoc(doc(db, 'checkout_unlock_requests', requestId), {
        status: newStatus,
        reviewedBy: userData?.name || 'HR Manager',
        reviewedAt: new Date().toISOString()
      });
      alert(`Unlock request ${newStatus} successfully.`);
    } catch (error) {
      console.error('Error updating unlock request status:', error);
      alert('Failed to update request status.');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Checkout Unlock Approvals</h2>
          <p style={{ color: 'var(--text-muted)' }}>Review and approve/reject receptionist unlock requests for subsequent checkouts</p>
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
          <Key size={14} /> Pending Requests
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
          Loading unlock requests...
        </div>
      ) : subTab === 'pending' ? (
        pendingRequests.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Shield size={28} color="#10b981" style={{ marginBottom: '12px' }} />
            <div>No pending unlock requests. All checkouts are locked.</div>
          </div>
        ) : (
          <div className="table-container glass-panel">
            <table>
              <thead>
                <tr>
                  <th>Patient Details</th>
                  <th>Branch</th>
                  <th>Requested By</th>
                  <th>Requested At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((item) => {
                  const reqDate = (item.createdAt && typeof item.createdAt.toDate === 'function')
                    ? item.createdAt.toDate().toLocaleString('en-IN')
                    : (item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : 'N/A');
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.patientName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.patientPhone}</div>
                      </td>
                      <td>
                        <div>{item.branchName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {item.branchId}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{item.requestedBy}</span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{reqDate}</td>
                      <td>
                        <span className="badge" style={{ background: '#fffbeb', color: '#d97706' }}>
                          PENDING
                        </span>
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
                            onClick={() => handleStatusUpdate(item.id, 'approved')}
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
                            onClick={() => handleStatusUpdate(item.id, 'rejected')}
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
          <div>No unlock request history found.</div>
        </div>
      ) : (
        <div className="table-container glass-panel">
          <table>
            <thead>
              <tr>
                <th>Patient Details</th>
                <th>Branch</th>
                <th>Requested By</th>
                <th>Requested At</th>
                <th>Reviewed By</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {historyRequests.map((item) => {
                const reqDate = (item.createdAt && typeof item.createdAt.toDate === 'function')
                  ? item.createdAt.toDate().toLocaleString('en-IN')
                  : (item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : 'N/A');

                let resColor = '#94a3b8';
                let resText = item.status?.toUpperCase() || 'UNKNOWN';
                if (item.status === 'approved') {
                  resColor = '#10b981';
                } else if (item.status === 'rejected') {
                  resColor = '#ef4444';
                } else if (item.status === 'used') {
                  resColor = '#3b82f6';
                  resText = 'USED (PAID)';
                }

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.patientName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.patientPhone}</div>
                    </td>
                    <td>{item.branchName}</td>
                    <td>
                      <span className="badge badge-secondary">{item.requestedBy}</span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{reqDate}</td>
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
export default CheckoutUnlocks;
