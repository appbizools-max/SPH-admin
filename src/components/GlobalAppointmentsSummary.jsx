import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';

// Normalize any date format to YYYY-MM-DD
const normDate = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr?.toDate) dateStr = dateStr.toDate().toISOString();
  if (dateStr?.seconds) dateStr = new Date(dateStr.seconds * 1000).toISOString();
  if (typeof dateStr !== 'string') return '';
  if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) return dateStr;
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return '';
};

const getTodayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const GlobalAppointmentsSummary = () => {
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    const todayStr = getTodayISO();
    let patientsData = [];
    let appointmentsData = [];

    const calculate = () => {
      const todayPatients = patientsData.filter(p => {
        const s = (p.status || '').toLowerCase();
        if (s === 'cancelled' || s === 'no-show') return false;
        const d = normDate(p.appointmentDate || p.date || p.createdAt);
        return d === todayStr;
      });

      const todayAppts = appointmentsData.filter(a => {
        const s = (a.status || '').toLowerCase();
        if (s === 'cancelled' || s === 'no-show') return false;
        const d = normDate(a.dateString || a.appointmentDate || a.date || a.createdAt);
        return d === todayStr;
      });

      const all = [...todayPatients, ...todayAppts];
      let completed = 0, pending = 0;
      all.forEach(r => {
        const s = (r.status || '').toLowerCase();
        if (s === 'completed' || s === 'done') completed++;
        else pending++;
      });

      setStats({ total: all.length, completed, pending });
    };

    const unsubPatients = onSnapshot(collection(db, 'patients'), snap => {
      patientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      calculate();
    }, () => {});

    const unsubAppts = onSnapshot(collection(db, 'appointments'), snap => {
      appointmentsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      calculate();
    }, () => {});

    return () => { unsubPatients(); unsubAppts(); };
  }, []);

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Today's Appointments — All Branches
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e0edff', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={18} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', lineHeight: 1 }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>Total Today</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #d1fae5', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', lineHeight: 1 }}>{stats.completed}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>Completed</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', lineHeight: 1 }}>{stats.pending}</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>Pending</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalAppointmentsSummary;
