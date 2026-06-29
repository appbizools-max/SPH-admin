import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Upload, AlertCircle, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';

const ClinicCleaningTab = ({ userData }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cleaningData, setCleaningData] = useState([]);
  const [loadingToday, setLoadingToday] = useState(true);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getTodayStr();
  const [isMandatoryDay, setIsMandatoryDay] = useState(false);

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
    
    return targetDate;
  };

  useEffect(() => {
    if (userData?.role !== 'hr' && userData?.branchId) {
      const unsub = onSnapshot(doc(db, 'branch_settings', userData.branchId), (docSnap) => {
        const overrideStr = docSnap.exists() ? docSnap.data().overrideCleaningDate : null;
        const targetDate = getNextCleaningDate(overrideStr);
        const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        
        setIsMandatoryDay(targetDateStr === todayStr);
      });
      return () => unsub();
    }
  }, [userData?.branchId, userData?.role, todayStr]);

  useEffect(() => {
    if (!userData?.branchName) {
      setLoadingToday(false);
      return;
    }
    setLoadingToday(true);
    const q = query(
      collection(db, 'cleaning_logs'),
      where('branchName', '==', userData.branchName),
      where('date', '==', todayStr)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setCleaningData(data);
      setLoadingToday(false);
    }, (err) => {
      console.error("Error fetching today's photos:", err);
      setLoadingToday(false);
    });
    return () => unsub();
  }, [userData, todayStr]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setErrorMsg('Only image files are allowed.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg('Please select at least one photo.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setUploading(true);
    setErrorMsg('');
    try {
      const branchId = userData?.branchId || 'unknown_branch';
      const branchName = userData?.branchName || 'Unknown';
      const uploadedUrls = [];

      // Upload each file
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, `cleaning_photos/${branchId}/${todayStr}/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }

      await addDoc(collection(db, 'cleaning_logs'), {
        branchName: branchName,
        branchId: branchId,
        uploadedBy: userData?.uid || 'unknown',
        uploadedByName: userData?.name || 'Unknown Staff',
        date: todayStr,
        photoUrls: uploadedUrls,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // Send notification to HR
      await addDoc(collection(db, 'notifications'), {
        targetRole: 'admin',
        title: 'Clinic Cleaning Photos Uploaded',
        body: `${branchName} has uploaded cleaning photos.`,
        type: 'clinic_cleaning',
        isRead: false,
        createdAt: serverTimestamp()
      });

      setSuccessMsg('Photos uploaded successfully!');
      setSelectedFiles([]);
      setTimeout(() => setSuccessMsg(''), 4000);

    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Camera size={28} color="var(--primary-color)" />
            Clinic Cleaning Photos
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Upload and review the mandatory cleaning photos for your branch
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        {cleaningData.length > 0 && isMandatoryDay && (
          <div style={{ padding: '16px', background: '#ecfdf5', color: '#047857', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px', border: '1px solid #a7f3d0' }}>
            <CheckCircle2 size={20} style={{ marginTop: '2px', color: '#10b981' }} />
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700', color: '#059669' }}>Photos Uploaded</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                You have successfully uploaded photos for this week. You may upload more photos below if needed.
              </p>
            </div>
          </div>
        )}
        {isMandatoryDay ? (
          <div style={{ padding: '16px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px', border: '1px solid #bfdbfe' }}>
            <AlertCircle size={20} style={{ marginTop: '2px' }} />
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700' }}>Mandatory Upload Today</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                Please ensure the clinic is completely clean and upload clear photos of all areas. These photos will be sent to HR for review.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px', border: '1px solid #fca5a5' }}>
            <AlertCircle size={20} style={{ marginTop: '2px' }} />
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700' }}>Upload Not Allowed Today</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                You can only upload photos on your assigned mandatory day unless HR updates your schedule.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px', fontWeight: '600', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '12px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '20px', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}

        {isMandatoryDay && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px' }}>
              Select Photos to Upload
            </label>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              {selectedFiles.map((file, idx) => (
                <div key={idx} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => removeFile(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              <label style={{ width: '120px', height: '120px', borderRadius: '12px', border: '2px dashed var(--primary-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(168, 206, 58, 0.05)', color: 'var(--primary-color)', transition: 'all 0.2s' }}>
                <Upload size={24} style={{ marginBottom: '8px' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Add Photos</span>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
            </div>

            <button 
              onClick={handleUpload} 
              disabled={uploading || selectedFiles.length === 0}
              className="btn-primary" 
              style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: (uploading || selectedFiles.length === 0) ? 0.6 : 1 }}
            >
              {uploading ? 'Uploading...' : <><Upload size={18} /> Upload {selectedFiles.length} Photos</>}
            </button>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={20} color="var(--primary-color)" />
          Today's Upload Sessions
        </h2>

        {loadingToday ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : cleaningData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.4)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <ImageIcon size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No photos uploaded for today yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {cleaningData.map((log) => {
              const uploadDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || Date.now());
              return (
                <div key={log.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>{log.branchName || 'Upload Session'}</h3>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>Uploaded by: {log.uploadedByName || 'Receptionist'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {uploadDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {uploadDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '800', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(22, 101, 52, 0.1)' }}>
                      {(log.photoUrls || []).length} Photos
                    </div>
                  </div>
                  
                  {log.photoUrls && log.photoUrls.length > 0 && (
                    <div style={{ padding: '20px', display: 'flex', gap: '16px', overflowX: 'auto' }}>
                      {log.photoUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, width: '140px', height: '140px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                          <img src={url} alt={`Upload ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicCleaningTab;
