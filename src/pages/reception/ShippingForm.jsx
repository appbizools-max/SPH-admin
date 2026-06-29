import { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Send, MapPin, Package, Globe, Truck, Ruler, Scale, FileText } from 'lucide-react';

const ShippingForm = () => {
  const { userData, user } = useAuth();
  const [shippingType, setShippingType] = useState('National');
  
  const [fromAddress, setFromAddress] = useState('');
  const [fromPincode, setFromPincode] = useState('');
  
  const [toAddress, setToAddress] = useState('');
  const [toPincode, setToPincode] = useState('');
  const [toCountry, setToCountry] = useState('India');
  
  // Structured package details
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [contents, setContents] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromAddress || !fromPincode || !toAddress || !toPincode || !weight || !contents) {
      alert('Please fill all required fields.');
      return;
    }

    setLoading(true);
    // Combine structured details into a single descriptive string to match legacy schema
    const combinedPackageDetails = `${weight} kg | ${contents} ${length && width && height ? `| Dims: ${length}x${width}x${height} cm` : ''}`;

    try {
      await addDoc(collection(db, 'shipping_requests'), {
        userId: user.uid,
        staffName: userData?.name || 'Staff Member',
        branchId: userData?.branchId || '',
        shippingType,
        fromAddress,
        fromPincode,
        toAddress,
        toPincode,
        toCountry: shippingType === 'National' ? 'India' : toCountry,
        packageDetails: combinedPackageDetails,
        status: 'pending',
        provider: 'Shiprocket',
        createdAt: serverTimestamp()
      });
      
      alert('Shipping request submitted to Shiprocket successfully!');
      setFromAddress('');
      setFromPincode('');
      setToAddress('');
      setToPincode('');
      setWeight('');
      setLength('');
      setWidth('');
      setHeight('');
      setContents('');
    } catch (error) {
      console.error('Shipping submission error:', error);
      alert('Failed to submit shipping request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%)', 
          color: '#fff', 
          padding: '10px', 
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(37, 142, 200, 0.2)'
        }}>
          <Truck size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>Shiprocket Shipping Request</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Create and dispatch new shipments via Shiprocket integration</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Shipping Type Toggle */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
          <label className="form-label" style={{ fontWeight: '700', marginBottom: '12px', display: 'block', fontSize: '0.95rem' }}>Shipping Service Type</label>
          <div style={{ 
            display: 'flex', 
            background: 'rgba(0, 0, 0, 0.05)', 
            padding: '4px', 
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            maxWidth: '400px'
          }}>
            <button
              type="button"
              onClick={() => { setShippingType('National'); setToCountry('India'); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: shippingType === 'National' ? 'var(--primary-color)' : 'transparent',
                color: shippingType === 'National' ? '#fff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <MapPin size={16} /> National (India)
            </button>
            <button
              type="button"
              onClick={() => setShippingType('International')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: shippingType === 'International' ? 'var(--primary-color)' : 'transparent',
                color: shippingType === 'International' ? '#fff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Globe size={16} /> International
            </button>
          </div>
        </div>

        {/* Origin and Destination Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          
          {/* Pickup Address Card */}
          <div className="glass-panel" style={{ 
            padding: '24px', 
            borderRadius: '16px',
            borderTop: '4px solid var(--primary-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <MapPin size={18} color="var(--primary-color)" />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>Pickup Origin (From)</h4>
            </div>

            <div className="form-group">
              <label className="form-label">Full Address</label>
              <textarea
                className="glass-input"
                rows={3}
                required
                placeholder="Clinic Branch complete street address, building/suite..."
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                style={{ resize: 'none', width: '100%', fontSize: '13px' }}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input
                type="text"
                className="glass-input"
                required
                placeholder="6-digit postal code (e.g. 500072)"
                value={fromPincode}
                onChange={(e) => setFromPincode(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="glass-panel" style={{ 
            padding: '24px', 
            borderRadius: '16px',
            borderTop: '4px solid var(--secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <MapPin size={18} color="var(--secondary)" />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>Delivery Destination (To)</h4>
            </div>

            <div className="form-group">
              <label className="form-label">Full Address</label>
              <textarea
                className="glass-input"
                rows={3}
                required
                placeholder="Patient's complete shipping address, home/apartment number, area..."
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                style={{ resize: 'none', width: '100%', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: shippingType === 'International' ? '1fr 1fr' : '1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Pincode / Zip</label>
                <input
                  type="text"
                  className="glass-input"
                  required
                  placeholder="Postal/Zip code (e.g. 500085)"
                  value={toPincode}
                  onChange={(e) => setToPincode(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>

              {shippingType === 'International' && (
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    type="text"
                    className="glass-input"
                    required
                    placeholder="e.g. United States"
                    value={toCountry}
                    onChange={(e) => setToCountry(e.target.value)}
                    style={{ width: '100%', fontSize: '13px' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Package Specifications Card */}
        <div className="glass-panel" style={{ 
          padding: '24px', 
          borderRadius: '16px',
          borderTop: '4px solid #f59e0b',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Package size={18} color="#f59e0b" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)' }}>Package Specifications</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Weight */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Scale size={14} color="var(--text-muted)" /> Weight (kg)
              </label>
              <input
                type="number"
                step="0.01"
                className="glass-input"
                required
                placeholder="e.g. 0.50"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            {/* Dimensions (Length x Width x Height) */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Ruler size={14} color="var(--text-muted)" /> Dimensions (L x W x H cm)
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="L"
                  className="glass-input"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  style={{ flex: 1, textAlign: 'center', minWidth: '40px', fontSize: '13px', padding: '8px 4px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x</span>
                <input
                  type="number"
                  placeholder="W"
                  className="glass-input"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  style={{ flex: 1, textAlign: 'center', minWidth: '40px', fontSize: '13px', padding: '8px 4px' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>x</span>
                <input
                  type="number"
                  placeholder="H"
                  className="glass-input"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  style={{ flex: 1, textAlign: 'center', minWidth: '40px', fontSize: '13px', padding: '8px 4px' }}
                />
              </div>
            </div>

            {/* Contents Description */}
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={14} color="var(--text-muted)" /> Contents Description
              </label>
              <input
                type="text"
                className="glass-input"
                required
                placeholder="e.g. Homeopathy Medicines / Syrups"
                value={contents}
                onChange={(e) => setContents(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading}
          style={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            padding: '14px',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%)',
            boxShadow: '0 10px 20px -5px rgba(37, 142, 200, 0.4)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            border: 'none',
            color: '#fff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 24px -5px rgba(37, 142, 200, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(37, 142, 200, 0.4)';
          }}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ marginRight: '4px' }}>⏳</span> Submitting Request...
            </>
          ) : (
            <>
              <Send size={16} /> Dispatch Shipping Request via Shiprocket
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ShippingForm;
