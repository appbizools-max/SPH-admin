import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Building2, Save, UploadCloud, Clock, Phone, MapPin, Image as ImageIcon } from 'lucide-react';

const ManageBranches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [timings, setTimings] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'branch'));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() });
      });
      setBranches(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      alert('Failed to fetch branch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const selectBranchForEdit = (branch) => {
    setSelectedBranch(branch);
    setTimings(branch.timings || '');
    setAddress(branch.address || '');
    setLandmark(branch.landmark || '');
    setPhone(branch.phone || '');
    setImageUrl(branch.imageUrl || branch.image || '');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedBranch) return;

    setUploadingImage(true);
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `branch_images/${selectedBranch.id}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setImageUrl(downloadURL);
      alert('Image uploaded successfully! Click "Save Details" to apply.');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!selectedBranch) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', selectedBranch.id);
      await updateDoc(docRef, {
        timings: timings.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        phone: phone.trim(),
        imageUrl: imageUrl.trim()
      });
      alert('Clinic branch details updated successfully!');
      setSelectedBranch(null);
      fetchBranches();
    } catch (error) {
      console.error('Error updating branch:', error);
      alert('Failed to update branch details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading branches...</div>;
  }

  if (selectedBranch) {
    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <button 
          onClick={() => setSelectedBranch(null)}
          className="btn-secondary"
          style={{ marginBottom: '20px' }}
        >
          ← Back to Branches
        </button>

        <div className="glass-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Building2 size={28} color="var(--primary-color)" />
            <h2 style={{ margin: 0, fontSize: '24px' }}>Edit {selectedBranch.name}</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Image Upload Section */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} /> Branch Display Image (For Patient App)
              </h3>
              
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {imageUrl ? (
                  <img src={imageUrl} alt="Branch Preview" style={{ width: '160px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                ) : (
                  <div style={{ width: '160px', height: '120px', backgroundColor: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    No Image
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary"
                    disabled={uploadingImage}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
                  >
                    {uploadingImage ? 'Uploading...' : <><UploadCloud size={16} /> Upload New Image</>}
                  </button>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    Recommended size: 800x600 pixels. Max size 2MB. This image will be shown to patients in the "Our Branches" section of the mobile app.
                  </p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><Clock size={16} /> Operating Timings</label>
              <input 
                type="text" 
                value={timings} 
                onChange={e => setTimings(e.target.value)} 
                placeholder="e.g. 10:00AM - 8:30PM"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label><Phone size={16} /> Contact Phone</label>
              <input 
                type="text" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="10-digit number"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label><MapPin size={16} /> Clinic Address</label>
              <textarea 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Full address of the clinic branch"
                className="input-field"
                rows="3"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label><MapPin size={16} /> Landmark</label>
              <input 
                type="text" 
                value={landmark} 
                onChange={e => setLandmark(e.target.value)} 
                placeholder="e.g. Near Metro Station"
                className="input-field"
              />
            </div>

            <button 
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
              style={{ padding: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
            >
              <Save size={20} /> {saving ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={24} color="var(--primary-color)" /> Manage Clinic Branches
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '14px' }}>
          Select a branch to edit its address, timings, contact, and display image for the patient app.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {branches.map(branch => (
          <div 
            key={branch.id} 
            className="glass-panel" 
            style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}
            onClick={() => selectBranchForEdit(branch)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <Building2 size={20} color="var(--primary-color)" />
              <h3 style={{ margin: 0, fontSize: '16px' }}>{branch.name}</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} /> <span>{branch.timings || 'Not Set'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={14} /> <span>{branch.phone || 'Not Set'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={14} style={{ flexShrink: 0 }} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{branch.address || 'Not Set'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={14} /> <span style={{ color: (branch.imageUrl || branch.image) ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{(branch.imageUrl || branch.image) ? 'Image Uploaded' : 'No Image'}</span>
              </div>
            </div>
          </div>
        ))}
        {branches.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            No branches found in the system.
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageBranches;
