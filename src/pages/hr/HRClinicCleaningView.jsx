import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Calendar, Image as ImageIcon, CheckCircle2, XCircle, Search, AlertCircle, Building2 } from 'lucide-react';

const HRClinicCleaningView = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });

  const [branches, setBranches] = useState([]);
  const [cleaningData, setCleaningData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'branch'));
        const snap = await getDocs(q);
        const branchList = [];
        snap.forEach(d => {
          branchList.push({ id: d.id, ...d.data() });
        });
        setBranches(branchList);
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };
    fetchBranches();
  }, []);

  // Fetch cleaning photos for selected date
  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'clinic_cleaning_photos'), where('date', '==', selectedDate));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setCleaningData(data);
      } catch (err) {
        console.error("Error fetching cleaning photos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, [selectedDate]);

  const isThursday = new Date(selectedDate).getDay() === 4;

  const branchStatus = branches.map(b => {
    // Find all uploads for this branch
    const branchNameNormalized = b.name.toLowerCase().replace(/\s*branch\s*/i, '').trim();
    const uploads = cleaningData.filter(d =>
      (d.branchId === b.id) ||
      (d.branchName && d.branchName.toLowerCase().replace(/\s*branch\s*/i, '').trim() === branchNameNormalized)
    );

    // Merge all photo urls from multiple uploads if they exist
    const allPhotos = uploads.reduce((acc, curr) => [...acc, ...(curr.photoUrls || [])], []);

    return {
      branchName: b.name,
      uploadedCount: allPhotos.length,
      photos: allPhotos,
      uploadedBy: uploads.length > 0 ? uploads.map(u => u.uploadedByName || u.uploadedBy).join(', ') : ''
    };
  });

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ImageIcon size={24} color="var(--primary-color)" />
          Clinic Cleaning Photos
        </h1>
      </div>

      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Calendar size={20} color="var(--primary-color)" />
        <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Date:</span>
        <input
          type="date"
          className="glass-input"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ maxWidth: '200px' }}
        />
        {isThursday && (
          <span style={{ marginLeft: 'auto', background: '#eff6ff', color: '#1d4ed8', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> Mandatory Cleaning Day (Thursday)
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {branchStatus.map((status, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '24px', borderLeft: status.uploadedCount > 0 ? '4px solid #10b981' : isThursday ? '4px solid #ef4444' : '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={20} color="var(--primary-color)" />
                    {status.branchName}
                  </h3>
                  {status.uploadedCount > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#10b981', fontWeight: '700' }}>
                      <CheckCircle2 size={16} /> {status.uploadedCount} photos uploaded by {status.uploadedBy}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: isThursday ? '#ef4444' : '#f59e0b', fontWeight: '700' }}>
                      <XCircle size={16} /> No photos uploaded for this date
                    </div>
                  )}
                </div>
              </div>

              {status.uploadedCount > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                  {status.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', aspectRatio: '1/1', background: '#f1f5f9', cursor: 'zoom-in' }}>
                      <img src={url} alt={`Upload ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HRClinicCleaningView;
