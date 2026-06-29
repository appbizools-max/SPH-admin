import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Clock, Plus, Trash2, Save, Calendar, Landmark, BookOpen, Camera, Upload, X } from 'lucide-react';

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 }
];

// Convert any time string ("09:00 AM", "06:00 PM", or already "14:00") to HH:mm 24-hour format
const toHHmm = (t) => {
  if (!t || typeof t !== 'string') return '09:00';
  const trimmed = t.trim();
  // Already 24-hour HH:mm format
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  // Parse 12-hour with AM/PM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const period = match[3].toUpperCase();
    if (period === 'AM') { if (h === 12) h = 0; }
    else { if (h !== 12) h += 12; }
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return trimmed;
};

// ── Analog Clock Face Picker ─────────────────────────────────────────────────
const to12 = (hhmm) => {
  const [h, m] = (hhmm || '09:00').split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, period };
};
const to24 = (hour12, minute, period) => {
  let h = parseInt(hour12, 10);
  if (period === 'AM') { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const ClockPicker = ({ value, onChange, label }) => {
  const { hour12: initH, minute: initM, period: initP } = to12(value);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('hour'); // 'hour' | 'minute'
  const [selHour, setSelH] = useState(initH);
  const [selMin, setSelM] = useState(initM);
  const [selPer, setSelP] = useState(initP);

  // Re-sync when value changes from outside
  const { hour12, minute, period } = to12(value);

  const openPicker = () => {
    setSelH(hour12); setSelM(minute); setSelP(period);
    setMode('hour'); setOpen(true);
  };
  const handleOK = () => {
    onChange(to24(selHour, selMin, selPer));
    setOpen(false);
  };

  // ── clock math ──────────────────────────────────────────────────────────────
  const R = 100; // clock radius (SVG units)
  const cx = 120; const cy = 120; // SVG centre

  const hourAngles = Array.from({ length: 12 }, (_, i) => ({ val: i === 0 ? 12 : i, deg: i * 30 }));
  const minuteAngles = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((v, i) => ({ val: v, deg: i * 30 }));

  const degFor = (val, isMin) => {
    if (isMin) return (val / 60) * 360;
    const h12 = val % 12;
    return h12 * 30;
  };

  const handDeg = mode === 'hour' ? degFor(selHour, false) : degFor(selMin, true);
  const rad = (d) => (d - 90) * (Math.PI / 180);
  const handX = cx + R * 0.82 * Math.cos(rad(handDeg));
  const handY = cy + R * 0.82 * Math.sin(rad(handDeg));

  const handleClockClick = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - (rect.width / 2);
    const y = e.clientY - rect.top - (rect.height / 2);
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hour') {
      const rawH = Math.round(angle / 30) % 12;
      const h = rawH === 0 ? 12 : rawH;
      setSelH(h);
      setTimeout(() => setMode('minute'), 250);
    } else {
      const rawM = Math.round(angle / 6) % 60;
      const snapped = Math.round(rawM / 5) * 5 % 60;
      setSelM(snapped);
    }
  };

  const items = mode === 'hour' ? hourAngles : minuteAngles;

  return (
    <>
      {/* Trigger pill */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {label && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>}
        <button
          type="button"
          onClick={openPicker}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            padding: '10px 14px',
            cursor: 'pointer',
            color: 'var(--text-main)',
            width: '100%',
            transition: 'all 0.3s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ fontSize: '1.05rem', fontWeight: '700', letterSpacing: '0.05em' }}>
            {String(hour12).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </span>
          <span style={{
            fontSize: '0.7rem', fontWeight: '700',
            background: 'rgba(37, 142, 200, 0.1)', color: 'var(--primary-color)',
            borderRadius: '4px', padding: '1px 5px'
          }}>{period}</span>
        </button>
      </div>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid var(--border-color)',
              width: '280px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              alignItems: 'stretch'
            }}
          >
            {/* Header: Large Readout */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'baseline',
              gap: '4px',
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid rgba(37, 142, 200, 0.08)'
            }}>
              <span style={{ fontSize: '2.4rem', fontWeight: '800', color: 'var(--primary-color)', letterSpacing: '0.02em', lineHeight: 1 }}>
                {String(selHour).padStart(2, '0')}:{String(selMin).padStart(2, '0')}
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '6px' }}>
                {selPer}
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
              <button
                type="button"
                onClick={() => setMode('hour')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: mode === 'hour' ? 'var(--primary-color)' : 'transparent',
                  color: mode === 'hour' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Hour
              </button>
              <button
                type="button"
                onClick={() => setMode('minute')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: mode === 'minute' ? 'var(--primary-color)' : 'transparent',
                  color: mode === 'minute' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Minute
              </button>
            </div>

            {/* AM/PM Switcher */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {['AM', 'PM'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelP(p)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selPer === p ? 'var(--secondary-color)' : '#e2e8f0',
                    background: selPer === p ? 'rgba(168, 206, 58, 0.15)' : 'transparent',
                    color: selPer === p ? '#7ea31a' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Analog Clock Dial */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg
                width="220" height="220" viewBox="0 0 240 240"
                onClick={handleClockClick}
                style={{ cursor: 'crosshair', userSelect: 'none' }}
              >
                {/* Clock face background */}
                <circle cx={cx} cy={cy} r={R + 18} fill="#f8fafc" />
                <circle cx={cx} cy={cy} r={R + 16} fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                <circle cx={cx} cy={cy} r={R * 0.82} fill="none" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

                {/* Hand line */}
                <line
                  x1={cx} y1={cy} x2={handX} y2={handY}
                  stroke="var(--primary-color)" strokeWidth="2.5" strokeLinecap="round"
                />
                
                {/* Center dot pin */}
                <circle cx={cx} cy={cy} r="6" fill="var(--primary-color)" />
                <circle cx={cx} cy={cy} r="14" fill="none" stroke="var(--primary-color)" strokeWidth="1.2" opacity="0.25" />

                {/* Numbers */}
                {items.map(({ val, deg }) => {
                  const angle = (deg - 90) * (Math.PI / 180);
                  const nx = cx + R * 0.82 * Math.cos(angle);
                  const ny = cy + R * 0.82 * Math.sin(angle);
                  const isActive = mode === 'hour' ? selHour === val : selMin === val;
                  return (
                    <g key={val} style={{ cursor: 'pointer' }}>
                      <circle cx={nx} cy={ny} r="17"
                        fill={isActive ? 'var(--primary-color)' : 'transparent'}
                        style={{ transition: 'fill 0.12s', pointerEvents: 'none' }}
                      />
                      <text
                        x={nx} y={ny}
                        textAnchor="middle" dominantBaseline="central"
                        fill={isActive ? '#ffffff' : '#334155'}
                        fontSize="13" fontWeight={isActive ? '800' : '500'}
                        style={{ transition: 'fill 0.12s', pointerEvents: 'none' }}
                      >
                        {mode === 'minute' ? String(val).padStart(2, '0') : val}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOK}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: 'var(--primary-color)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  transition: 'opacity 0.2s'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const checkScheduleOverlaps = (timings) => {
  const toMinutes = (hhmm) => {
    if (!hhmm || typeof hhmm !== 'string') return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const daysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let day = 0; day <= 6; day++) {
    const intervalsForDay = [];
    
    for (let slot of timings) {
      const dayIvs = slot.daySchedule[day] || [];
      for (let iv of dayIvs) {
        const startStr = iv[0];
        const endStr = iv[1];
        if (startStr && endStr) {
          const startMin = toMinutes(startStr);
          const endMin = toMinutes(endStr);
          
          if (startMin >= endMin) {
            return {
              hasOverlap: true,
              message: `Invalid slot detected on ${daysNames[day]} for "${slot.branch}":\n` +
                       `- Start time (${startStr}) must be before end time (${endStr}).`
            };
          }

          intervalsForDay.push({
            branch: slot.branch,
            startMin,
            endMin,
            startStr,
            endStr
          });
        }
      }
    }

    // Check all pairs for overlap
    for (let i = 0; i < intervalsForDay.length; i++) {
      for (let j = i + 1; j < intervalsForDay.length; j++) {
        const iv1 = intervalsForDay[i];
        const iv2 = intervalsForDay[j];
        
        // Overlap if Max(start1, start2) < Min(end1, end2)
        const overlapStart = Math.max(iv1.startMin, iv2.startMin);
        const overlapEnd = Math.min(iv1.endMin, iv2.endMin);
        
        if (overlapStart < overlapEnd) {
          return {
            hasOverlap: true,
            message: `Schedule conflict detected on ${daysNames[day]}:\n\n` +
                     `- Branch: "${iv1.branch}" (${iv1.startStr} to ${iv1.endStr})\n` +
                     `- Branch: "${iv2.branch}" (${iv2.startStr} to ${iv2.endStr})\n\n` +
                     `A doctor cannot be scheduled in overlapping time slots.`
          };
        }
      }
    }
  }

  return { hasOverlap: false };
};

const DoctorTimingsManager = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [branches, setBranches] = useState([]);
  const [timings, setTimings] = useState([]);
  const [activeDays, setActiveDays] = useState({});

  // Profile settings state
  const [specialty, setSpecialty] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [expertiseInput, setExpertiseInput] = useState('');

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch initial data (doctors list and branches list)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch all doctors
        const qDocs = query(collection(db, 'users'), where('role', '==', 'doctor'));
        const snapDocs = await getDocs(qDocs);
        const docsList = [];
        snapDocs.forEach(d => {
          docsList.push({ id: d.id, ...d.data() });
        });
        setDoctors(docsList);

        // Fetch all branches from users collection (role === 'branch')
        const qBranches = query(collection(db, 'users'), where('role', '==', 'branch'));
        const snapBranches = await getDocs(qBranches);
        const branchList = [];
        snapBranches.forEach(b => {
          branchList.push({ id: b.id, ...b.data() });
        });
        setBranches(branchList);
      } catch (err) {
        console.error('Error fetching timings manager data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // When a doctor is selected, fetch their current timings configuration and profile details
  useEffect(() => {
    if (selectedDocId) {
      const docObj = doctors.find(d => d.id === selectedDocId);
      setSelectedDoctor(docObj);
      if (docObj) {
        const normIv = (iv) => {
          if (Array.isArray(iv)) return [toHHmm(iv[0]), toHHmm(iv[1])];
          if (iv && iv.start) return [toHHmm(iv.start), toHHmm(iv.end)];
          return ['09:00', '17:00'];
        };
        const EMPTY_DS = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        const normalisedTimings = (docObj.timings || []).map(slot => {
          if (slot.daySchedule) {
            const ds = {};
            [0, 1, 2, 3, 4, 5, 6].forEach(d => { ds[d] = (slot.daySchedule[d] || []).map(normIv); });
            return { branch: slot.branch, daySchedule: ds };
          }
          // Legacy: dayOfWeek array + shared intervals
          const ds = { ...EMPTY_DS };
          const shared = (slot.intervals || []).map(normIv);
          (slot.dayOfWeek || []).forEach(d => { ds[d] = shared.map(iv => [...iv]); });
          return { branch: slot.branch, daySchedule: ds };
        });
        setTimings(normalisedTimings);
        setSpecialty(docObj.specialty || '');
        setQualification(docObj.qualification || '');
        setExperience(docObj.experience || '');
        setBio(docObj.bio || '');
        setExpertiseInput(docObj.expertiseList ? docObj.expertiseList.join(', ') : '');
        const existingPhoto = docObj.photoUrl || docObj.image || docObj.photoURL || '';
        setPhotoUrl(existingPhoto);
        setPhotoPreview(existingPhoto);
        setPhotoFile(null);
        setUploadProgress(0);
        setActiveDays({});
      } else {
        setTimings([]);
        setSpecialty('');
        setQualification('');
        setExperience('');
        setBio('');
        setExpertiseInput('');
        setPhotoUrl('');
        setPhotoPreview('');
        setPhotoFile(null);
        setUploadProgress(0);
        setActiveDays({});
      }
    } else {
      setSelectedDoctor(null);
      setTimings([]);
      setSpecialty('');
      setQualification('');
      setExperience('');
      setBio('');
      setExpertiseInput('');
      setPhotoUrl('');
      setPhotoPreview('');
      setPhotoFile(null);
      setUploadProgress(0);
      setActiveDays({});
    }
  }, [selectedDocId, doctors]);

  const EMPTY_DAY_SCHEDULE = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  const handleAddBranchSchedule = () => {
    const firstBranch = branches[0]?.name || 'Branch';
    if (timings.some(t => t.branch === firstBranch)) {
      alert(`A schedule for "${firstBranch}" already exists. Please pick a different branch.`);
      return;
    }
    const standardWeekSchedule = {
      0: [['10:00', '14:00'], ['17:00', '20:00']], // Sun
      1: [['10:00', '14:00'], ['17:00', '20:00']], // Mon
      2: [['10:00', '14:00'], ['17:00', '20:00']], // Tue
      3: [['10:00', '14:00'], ['17:00', '20:00']], // Wed
      4: [['10:00', '14:00'], ['17:00', '20:00']], // Thu
      5: [['10:00', '14:00'], ['17:00', '20:00']], // Fri
      6: [['10:00', '14:00'], ['17:00', '20:00']]  // Sat
    };
    setTimings([...timings, { branch: firstBranch, daySchedule: standardWeekSchedule }]);
  };

  const handleRemoveBranchSchedule = (index) => setTimings(timings.filter((_, i) => i !== index));

  const handleBranchChange = (index, value) => {
    const updated = [...timings];
    updated[index] = { ...updated[index], branch: value };
    setTimings(updated);
  };

  const handleDayToggle = (bIdx, day) => {
    const updated = [...timings];
    const ds = { ...updated[bIdx].daySchedule };
    ds[day] = ds[day] && ds[day].length > 0 ? [] : [['10:00', '14:00'], ['17:00', '20:00']];
    updated[bIdx] = { ...updated[bIdx], daySchedule: ds };
    setTimings(updated);
  };

  const handleAddDayInterval = (bIdx, day) => {
    const updated = [...timings];
    const ds = { ...updated[bIdx].daySchedule };
    ds[day] = [...(ds[day] || []), ['10:00', '14:00']];
    updated[bIdx] = { ...updated[bIdx], daySchedule: ds };
    setTimings(updated);
  };

  const handleRemoveDayInterval = (bIdx, day, iIdx) => {
    const updated = [...timings];
    const ds = { ...updated[bIdx].daySchedule };
    ds[day] = ds[day].filter((_, i) => i !== iIdx);
    updated[bIdx] = { ...updated[bIdx], daySchedule: ds };
    setTimings(updated);
  };

  const handleDayIntervalTimeChange = (bIdx, day, iIdx, tIdx, value) => {
    const updated = [...timings];
    const ds = JSON.parse(JSON.stringify(updated[bIdx].daySchedule));
    ds[day][iIdx][tIdx] = value;
    updated[bIdx] = { ...updated[bIdx], daySchedule: ds };
    setTimings(updated);
  };

  const handlePhotoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Image must be under 3 MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(photoUrl); // revert to saved
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const uploadPhotoAndGetUrl = () => {
    return new Promise((resolve, reject) => {
      if (!photoFile) {
        resolve(photoUrl); // no new file — keep existing
        return;
      }
      setIsUploading(true);
      const storageRef = ref(storage, `doctor_photos/${selectedDocId}`);
      const uploadTask = uploadBytesResumable(storageRef, photoFile);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => {
          setIsUploading(false);
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(storageRef);
          setIsUploading(false);
          setPhotoUrl(url);
          setPhotoFile(null);
          setUploadProgress(0);
          if (photoInputRef.current) photoInputRef.current.value = '';
          resolve(url);
        }
      );
    });
  };

  const handleSaveTimings = async () => {
    if (!selectedDocId) return;

    const overlap = checkScheduleOverlaps(timings);
    if (overlap.hasOverlap) {
      alert(overlap.message);
      return;
    }

    setIsSaving(true);
    try {
      const finalPhotoUrl = await uploadPhotoAndGetUrl();
      const userRef = doc(db, 'users', selectedDocId);

      // Convert [start,end] arrays → {start,end} objects per day (Firestore can't store nested arrays)
      const firestoreTimings = timings.map(slot => {
        const ds = {};
        [0, 1, 2, 3, 4, 5, 6].forEach(d => {
          ds[d] = (slot.daySchedule[d] || []).map(([start, end]) => ({ start, end }));
        });
        return { branch: slot.branch, daySchedule: ds };
      });

      const updateData = {
        timings: firestoreTimings,
        specialty: specialty.trim(),
        qualification: qualification.trim(),
        experience: experience.trim(),
        bio: bio.trim(),
        expertiseList: expertiseInput.split(',').map(s => s.trim()).filter(Boolean),
        photoUrl: finalPhotoUrl
      };

      await updateDoc(userRef, updateData);

      // Update doctor local state
      setDoctors(prev =>
        prev.map(d => (d.id === selectedDocId ? { ...d, ...updateData } : d))
      );

      alert('Doctor profile, photo & schedule updated successfully!');
    } catch (err) {
      console.error('Error saving timings:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
        Loading Doctor Schedules ...
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h2>Doctor Timings &amp; Schedules</h2>
        <p style={{ color: 'var(--text-muted)' }}>Configure weekly consulting schedules and branch availability for clinic doctors.</p>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div className="form-group" style={{ maxWidth: '400px', marginBottom: 0 }}>
          <label className="form-label">Select Doctor to Manage</label>
          <select
            className="glass-input"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            style={{ background: 'var(--bg-dark)' }}
          >
            <option value="">-- Choose a Doctor --</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.specialty || 'Homeopathic Physician'})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedDoctor && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {/* Profile Details Section */}
          <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} color="var(--primary-color)" /> Doctor Profile Details
            </h3>

            {/* Photo Upload */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Avatar Preview */}
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.08)',
                  border: '3px solid var(--primary-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Doctor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={36} color="rgba(255,255,255,0.3)" />
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px', fontSize: '0.95rem' }}>Doctor Profile Photo</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '14px' }}>Upload a professional headshot. JPG, PNG up to 3 MB.</div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'var(--primary-color)',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    transition: 'opacity 0.2s'
                  }}>
                    <Upload size={14} /> {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={handlePhotoFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {photoFile && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        background: 'rgba(239,68,68,0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}
                    >
                      <X size={13} /> Remove
                    </button>
                  )}
                </div>

                {photoFile && (
                  <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>✓ New photo selected:</span> {photoFile.name}
                  </div>
                )}

                {isUploading && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--primary-color)', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Uploading... {uploadProgress}%</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Specialty / Role Title</label>
                <input
                  type="text"
                  className="glass-input"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. Homeopathic Physician"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Qualifications</label>
                <input
                  type="text"
                  className="glass-input"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. BHMS, MD (Homeo)"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Experience</label>
                <input
                  type="text"
                  className="glass-input"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 15+ Years"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expertise / Clinical Focus (Comma Separated)</label>
                <input
                  type="text"
                  className="glass-input"
                  value={expertiseInput}
                  onChange={(e) => setExpertiseInput(e.target.value)}
                  placeholder="e.g. Skin, Hair Loss, Pediatrics, Asthma"
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Doctor Biography / About</label>
              <textarea
                className="glass-input"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief professional background or clinical focus description..."
                style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Schedule Configuration</h3>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>Managing timings for <strong>{selectedDoctor.name}</strong></p>
            </div>
            <button className="btn-primary" onClick={handleAddBranchSchedule}>
              <Plus size={16} style={{ marginRight: '6px' }} /> Add Branch Schedule
            </button>
          </div>

          {timings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Clock size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>No custom schedules configured for this doctor.</p>
              <p style={{ color: 'var(--primary-color)', fontSize: '0.8rem', marginTop: '6px' }}>They will fall back to default timings (All branches, Monday to Sunday, 10:00 AM - 02:00 PM &amp; 05:00 PM - 08:00 PM).</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {timings.map((sched, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '20px',
                    position: 'relative'
                  }}
                >
                  <button
                    onClick={() => handleRemoveBranchSchedule(idx)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <Trash2 size={14} /> Remove Schedule
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0, maxWidth: '400px' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Landmark size={14} /> Target Branch
                      </label>
                      <select
                        className="glass-input"
                        value={sched.branch}
                        onChange={(e) => handleBranchChange(idx, e.target.value)}
                        style={{ background: 'var(--bg-dark)' }}
                      >
                        {branches.map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <Calendar size={14} /> Weekly Day-wise Schedule (Select Day to Configure)
                      </label>
                      
                      {/* Day Selector Tabs */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {DAYS_OF_WEEK.map(day => {
                          const dayVal = day.value;
                          const intervals = sched.daySchedule[dayVal] || [];
                          const isOpen = intervals.length > 0;
                          const currentActiveDay = activeDays[idx] !== undefined ? activeDays[idx] : 1;
                          const isSelected = currentActiveDay === dayVal;
                          
                          return (
                            <button
                              key={dayVal}
                              type="button"
                              onClick={() => setActiveDays(prev => ({ ...prev, [idx]: dayVal }))}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
                                backgroundColor: isSelected ? 'rgba(168, 206, 58, 0.15)' : 'transparent',
                                color: isSelected ? 'var(--primary-color)' : 'var(--text-muted)',
                                fontWeight: isSelected ? 'bold' : '500',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              {day.label}
                              {isOpen && (
                                <span style={{
                                  display: 'inline-block',
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--primary-color)'
                                }} />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Config Area for Selected Day Only */}
                      {(() => {
                        const currentActiveDay = activeDays[idx] !== undefined ? activeDays[idx] : 1;
                        const activeDayObj = DAYS_OF_WEEK.find(d => d.value === currentActiveDay);
                        const intervals = sched.daySchedule[currentActiveDay] || [];
                        const isOpen = intervals.length > 0;
                        
                        return (
                          <div style={{
                            background: isOpen ? 'rgba(168,206,58,0.02)' : 'rgba(255,255,255,0.01)',
                            border: '1px solid',
                            borderColor: isOpen ? 'rgba(168,206,58,0.15)' : 'rgba(255,255,255,0.04)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            transition: 'all 0.2s'
                          }}>
                            {/* Day Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleDayToggle(idx, currentActiveDay)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid',
                                    borderColor: isOpen ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
                                    backgroundColor: isOpen ? 'rgba(168, 206, 58, 0.15)' : 'transparent',
                                    color: isOpen ? 'var(--primary-color)' : 'var(--text-muted)',
                                    fontWeight: isOpen ? 'bold' : '500',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    minWidth: '70px',
                                    textAlign: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {activeDayObj ? activeDayObj.label : ''}
                                </button>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: isOpen ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                  {isOpen ? 'Available' : 'Unavailable / Closed'}
                                </span>
                              </div>

                              {isOpen && (
                                <button
                                  type="button"
                                  onClick={() => handleAddDayInterval(idx, currentActiveDay)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-color)',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(168, 206, 58, 0.08)'
                                  }}
                                >
                                  <Plus size={14} /> Add Slot
                                </button>
                              )}
                            </div>

                            {/* Intervals List */}
                            {isOpen && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                                {intervals.map((interval, iIdx) => (
                                  <div key={iIdx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                  }}>
                                    <div style={{ flex: 1, minWidth: '120px' }}>
                                      <ClockPicker
                                        label="Start Time"
                                        value={interval[0]}
                                        onChange={(v) => handleDayIntervalTimeChange(idx, currentActiveDay, iIdx, 0, v)}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '18px' }}>
                                      <div style={{ width: '15px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>to</span>
                                      <div style={{ width: '15px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '120px' }}>
                                      <ClockPicker
                                        label="End Time"
                                        value={interval[1]}
                                        onChange={(v) => handleDayIntervalTimeChange(idx, currentActiveDay, iIdx, 1, v)}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDayInterval(idx, currentActiveDay, iIdx)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        marginTop: '18px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-primary"
              onClick={handleSaveTimings}
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={16} /> {isSaving ? 'Saving Timings...' : 'Save Profile & Schedules'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorTimingsManager;
