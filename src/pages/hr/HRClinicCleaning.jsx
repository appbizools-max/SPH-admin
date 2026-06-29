import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import {
  collection, query, getDocs, updateDoc, doc, setDoc, where,
  onSnapshot, serverTimestamp, addDoc
} from 'firebase/firestore';
import {
  Camera, Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, 
  Settings, Image as ImageIcon, Search, Plus
} from 'lucide-react';
const HRClinicCleaning = () => {
  const { userData } = useAuth();
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'settings'
  const [selectedImageSet, setSelectedImageSet] = useState(null); // { urls: [], index: 0 }

  useEffect(() => {
    fetchBranches();
    
    // Listen to cleaning settings
    const unsubSettings = onSnapshot(collection(db, 'branch_settings'), (snap) => {
      const s = {};
      snap.forEach(doc => { s[doc.id] = doc.data(); });
      setSettings(s);
    });

    // Listen to recent logs
    const q = query(collection(db, 'cleaning_logs'));
    const unsubLogs = onSnapshot(q, (snap) => {
      const l = [];
      snap.forEach(doc => l.push({ id: doc.id, ...doc.data() }));
      // Sort by timestamp descending
      l.sort((a, b) => {
        const ta = a.timestamp?.seconds || 0;
        const tb = b.timestamp?.seconds || 0;
        return tb - ta;
      });
      setLogs(l);
    });

    return () => {
      unsubSettings();
      unsubLogs();
    };
  }, []);

  const fetchBranches = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'branch')));
      const b = [];
      snap.forEach(doc => b.push({ id: doc.id, ...doc.data() }));
      setBranches(b);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async (branchId, branchName, dateStr) => {
    try {
      await setDoc(doc(db, 'branch_settings', branchId), {
        overrideCleaningDate: dateStr,
        updatedAt: serverTimestamp(),
        updatedBy: userData?.name || 'HR'
      }, { merge: true });

      await addDoc(collection(db, 'notifications'), {
        userId: branchId,
        title: 'Cleaning Schedule Updated',
        message: `HR has set a special cleaning day for your branch this week on ${dateStr}.`,
        read: false,
        timestamp: serverTimestamp(),
        type: 'schedule_update'
      });

      alert(`Schedule updated for ${branchName}`);
    } catch (e) {
      console.error(e);
      alert('Failed to update schedule.');
    }
  };

  const getNextCleaningDate = (overrideDateStr) => {
    const getWeekRange = (d) => {
      const date = new Date(d);
      date.setHours(0,0,0,0);
      const day = date.getDay();
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - day);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      return { start: sunday, end: saturday };
    };

    const today = new Date();
    today.setHours(0,0,0,0);
    const { start: weekStart, end: weekEnd } = getWeekRange(today);
    
    let targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + 4); // Thursday

    if (overrideDateStr) {
      const oDate = new Date(overrideDateStr);
      oDate.setHours(0,0,0,0);
      if (oDate >= weekStart && oDate <= weekEnd) {
        targetDate = oDate;
      }
    }
    
    return targetDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <>
      <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Camera size={28} color="#38bdf8" /> Clinic Cleaning Photos
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage branch cleaning schedules and view photo proof.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('logs')}
          style={{ 
            background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600, color: activeTab === 'logs' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'logs' ? '3px solid var(--primary-color)' : '3px solid transparent'
          }}
        >
          <ImageIcon size={18} style={{ display: 'inline', marginRight: '8px' }} /> Photo Logs
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          style={{ 
            background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
            fontSize: '1rem', fontWeight: 600, color: activeTab === 'settings' ? 'var(--primary-color)' : 'var(--text-muted)',
            borderBottom: activeTab === 'settings' ? '3px solid var(--primary-color)' : '3px solid transparent'
          }}
        >
          <Settings size={18} style={{ display: 'inline', marginRight: '8px' }} /> Manage Schedules
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader"></div></div>
      ) : activeTab === 'settings' ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>Branch Schedules</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {branches.map(b => {
              const bSettings = settings[b.id] || {};
              const currentOverride = bSettings.overrideCleaningDate || '';
              return (
                <div key={b.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>{b.name || b.branchName || 'Unnamed Branch'}</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>This Week's Cleaning Date:</span>
                    <span style={{ fontWeight: 600, color: '#38bdf8' }}>{getNextCleaningDate(currentOverride)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Set One-Time Override:</label>
                    <input 
                      type="date"
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }}
                      value={currentOverride}
                      onChange={(e) => handleUpdateSchedule(b.id, b.name, e.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px' }}>Recent Cleaning Uploads</h2>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <ImageIcon size={48} opacity={0.3} style={{ marginBottom: '16px' }} />
              <p>No cleaning photos have been uploaded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {logs.map(log => {
                const b = branches.find(br => br.id === log.branchId);
                const bName = b ? (b.name || b.branchName) : (log.branchName || 'Unknown Branch');
                const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || Date.now());
                
                return (
                  <div key={log.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                    {log.photoUrls && log.photoUrls.length > 0 ? (
                      <div style={{ position: 'relative', height: '200px', width: '100%', background: '#000', cursor: 'pointer' }} onClick={() => setSelectedImageSet({ urls: log.photoUrls, index: 0 })}>
                        <img 
                          src={log.photoUrls[0]} 
                          alt="Cleaning Proof" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        {log.photoUrls.length > 1 && (
                          <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            +{log.photoUrls.length - 1} More
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ height: '200px', width: '100%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        No Image Provided
                      </div>
                    )}
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#38bdf8' }}>{bName}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <Calendar size={14} /> {dateObj.toLocaleDateString()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Clock size={14} /> {dateObj.toLocaleTimeString()}
                      </div>
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <CheckCircle2 size={14} color="#10b981" /> Uploaded by: {log.uploadedByName || 'Receptionist'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      </div>

      {selectedImageSet && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={selectedImageSet.urls[selectedImageSet.index]} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
          
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }} onClick={() => setSelectedImageSet(null)}>✕</button>
          
          {selectedImageSet.urls.length > 1 && (
            <>
              {selectedImageSet.index > 0 && (
                <button 
                  style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }} 
                  onClick={(e) => { e.stopPropagation(); setSelectedImageSet(prev => ({ ...prev, index: prev.index - 1 })); }}
                >
                  ←
                </button>
              )}
              {selectedImageSet.index < selectedImageSet.urls.length - 1 && (
                <button 
                  style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '50px', height: '50px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }} 
                  onClick={(e) => { e.stopPropagation(); setSelectedImageSet(prev => ({ ...prev, index: prev.index + 1 })); }}
                >
                  →
                </button>
              )}
              <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.9rem', zIndex: 100000 }}>
                {selectedImageSet.index + 1} / {selectedImageSet.urls.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default HRClinicCleaning;
