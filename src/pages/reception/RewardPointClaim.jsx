import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Search, Coins, CreditCard, User, Phone, Plus, Trash2, Tag, Send, X, Share2, Printer, Mail, MapPin, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/SPH ADMIN.png';


const RewardPointClaim = () => {
  const { userData } = useAuth();
  const [searchPhone, setSearchPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState(null);

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Products List State
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Points Redemption State
  const [pointsRedeemed, setPointsRedeemed] = useState('');

  // Billing Flow & Modal States
  const [completingBilling, setCompletingBilling] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ' ' + now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setCurrentDateTime(formatted);
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchPatient = async () => {
    const trimmedPhone = searchPhone.trim();
    if (!trimmedPhone) {
      alert('Please enter a patient phone number.');
      return;
    }

    setSearching(true);
    setPatient(null);
    setAppliedCoupon(null);
    setPointsRedeemed('');
    try {
      const phoneDigits = trimmedPhone.replace(/\D/g, '').slice(-10);
      
      const q = query(
        collection(db, 'patients'),
        where('phone', '==', phoneDigits)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert('No registered patient found with this phone number. You can enter patient details manually for walk-in billing.');
        setPatient(null);
        setPatientName('');
        setPatientPhone(phoneDigits);
      } else {
        const docData = snapshot.docs[0].data();
        const foundPatient = {
          id: snapshot.docs[0].id,
          name: docData.fullName || docData.name || 'Patient',
          phone: docData.phone || phoneDigits,
          rewardPoints: docData.rewardPoints || 0
        };
        setPatient(foundPatient);
        setPatientName(foundPatient.name);
        setPatientPhone(foundPatient.phone);
      }
    } catch (e) {
      console.error("Error searching patient:", e);
      alert('Failed to search for patient.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      alert('Please enter product/medicine name.');
      return;
    }
    const priceNum = parseFloat(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price/amount.');
      return;
    }

    const newProduct = {
      id: Date.now().toString(),
      name: newProductName.trim(),
      price: priceNum
    };

    setProducts(prev => [...prev, newProduct]);
    setNewProductName('');
    setNewProductPrice('');
  };

  const handleDeleteProduct = (id) => {
    setProducts(prev => prev.filter(item => item.id !== id));
  };

  const handleApplyCoupon = async () => {
    if (!patient) {
      alert('Please lookup and select a patient first.');
      return;
    }
    if (!couponCode.trim()) {
      alert('Please enter a coupon code.');
      return;
    }

    try {
      const codeUpper = couponCode.trim().toUpperCase();
      
      const q = query(
        collection(db, 'coupons'),
        where('code', '==', codeUpper),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert('The coupon code is invalid, already redeemed, or expired.');
        return;
      }

      const couponDoc = snapshot.docs[0];
      const couponData = couponDoc.data();

      const patientPhoneDigits = patient.phone.replace(/\D/g, '').slice(-10);
      const couponPhoneDigits = (couponData.patientPhone || '').replace(/\D/g, '').slice(-10);

      if (couponData.userId !== patient.id && couponPhoneDigits !== patientPhoneDigits) {
        alert('This coupon code does not belong to the selected patient.');
        return;
      }

      const now = new Date();
      let expiryDateVal = null;
      if (couponData.expiryDate) {
        expiryDateVal = couponData.expiryDate.toDate ? couponData.expiryDate.toDate() : new Date(couponData.expiryDate);
      }

      if (expiryDateVal && expiryDateVal < now) {
        alert('This coupon has expired.');
        return;
      }

      setAppliedCoupon({
        id: couponDoc.id,
        ...couponData
      });

      alert(`Discount of ₹${couponData.pointsValue} has been deducted from subtotal.`);
      setCouponCode('');
    } catch (e) {
      console.error("Error applying coupon:", e);
      alert('Failed to validate and apply coupon.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  const handleCompleteBilling = async () => {
    if (!patientName.trim()) {
      alert('Please enter patient name.');
      return;
    }
    if (!patientPhone.trim() || patientPhone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (products.length === 0) {
      alert('Please add at least one product/item to the invoice.');
      return;
    }

    const ptsRedeem = parseInt(pointsRedeemed, 10) || 0;
    if (ptsRedeem > 0) {
      if (!patient) {
        alert('Points redemption requires a registered patient profile.');
        return;
      }
      if (ptsRedeem > patient.rewardPoints) {
        alert(`Patient only has ${patient.rewardPoints} points available.`);
        return;
      }
    }

    setCompletingBilling(true);
    try {
      const subtotal = products.reduce((sum, item) => sum + item.price, 0);
      const cpnDiscount = appliedCoupon ? appliedCoupon.pointsValue : 0;
      const ptsDiscount = ptsRedeem;
      const grandTotal = Math.max(0, subtotal - cpnDiscount - ptsDiscount);

      const randomId = Math.floor(100000 + Math.random() * 900000);
      const generatedInvoiceNum = `SPH-INV-${randomId}`;
      setInvoiceNumber(generatedInvoiceNum);

      if (ptsRedeem > 0 && patient) {
        const patientRef = doc(db, 'patients', patient.id);
        await updateDoc(patientRef, {
          rewardPoints: increment(-ptsRedeem)
        });

        await addDoc(collection(db, 'reward_points_transactions'), {
          userId: patient.id,
          patientName: patientName,
          type: 'redeem',
          points: ptsRedeem,
          description: `Redeemed ${ptsRedeem} points for product billing invoice ${generatedInvoiceNum}`,
          createdAt: serverTimestamp()
        });
      }

      if (appliedCoupon) {
        const couponRef = doc(db, 'coupons', appliedCoupon.id);
        await updateDoc(couponRef, {
          status: 'redeemed',
          redeemedAt: serverTimestamp(),
          redeemedInvoiceNum: generatedInvoiceNum
        });
      }

      await addDoc(collection(db, 'transactions'), {
        invoiceNumber: generatedInvoiceNum,
        patientName: patientName,
        patientPhone: patientPhone.replace(/\D/g, '').slice(-10),
        patientId: patient?.id || null,
        products: products.map(p => ({ name: p.name, price: p.price })),
        subtotal: subtotal,
        couponCode: appliedCoupon?.code || null,
        couponDiscount: cpnDiscount,
        pointsRedeemed: ptsRedeem,
        grandTotal: grandTotal,
        amount: grandTotal,
        type: 'product_billing',
        branchId: userData?.branchId || 'KPHB',
        branchName: userData?.branchName || 'KPHB Branch',
        recordedBy: userData?.name || 'Staff',
        createdAt: serverTimestamp(),
        dateTimeStr: currentDateTime,
        timestamp: serverTimestamp()
      });

      if (patient) {
        setPatient(prev => ({
          ...prev,
          rewardPoints: Math.max(0, prev.rewardPoints - ptsRedeem)
        }));
      }

      setInvoiceModalVisible(true);
    } catch (e) {
      console.error("Error completing billing:", e);
      alert('Failed to complete billing transaction.');
    } finally {
      setCompletingBilling(false);
    }
  };

  const handleShareWhatsApp = () => {
    const subtotal = products.reduce((sum, item) => sum + item.price, 0);
    const cpnDiscount = appliedCoupon ? appliedCoupon.pointsValue : 0;
    const ptsRedeem = parseInt(pointsRedeemed, 10) || 0;
    const grandTotal = Math.max(0, subtotal - cpnDiscount - ptsRedeem);

    let itemsText = '';
    products.forEach((p, idx) => {
      itemsText += `${idx + 1}. ${p.name} - ₹${p.price.toFixed(2)}\n`;
    });

    const receiptText = `*Spiritual Homeopathy Clinic*
━━━━━━━━━━━━━━━━━━━━━
*BILLING INVOICE*
*Invoice No:* ${invoiceNumber}
*Date/Time:* ${currentDateTime}
*Patient Name:* ${patientName}
*Patient Phone:* ${patientPhone}
━━━━━━━━━━━━━━━━━━━━━
*ITEMS BILLED:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━━
*BILLING SUMMARY:*
*Subtotal:* ₹${subtotal.toFixed(2)}
${cpnDiscount > 0 ? `*Coupon Discount:* -₹${cpnDiscount.toFixed(2)} (${appliedCoupon?.code})\n` : ''}${ptsRedeem > 0 ? `*Wallet Points Redeemed:* -₹${ptsRedeem.toFixed(2)}\n` : ''}-------------------------------------
*GRAND TOTAL:* *₹${grandTotal.toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━━
Thank you for visiting Spiritual Homeopathy.
📞 Support Contact: 9095 176 176
🌐 Website: www.spiritualhomeography.com
📍 Branch: Hyderabad`;

    const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
    const url = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(receiptText)}`;
    window.open(url, '_blank');
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemRows = products
      .map((p, idx) => `
        <tr>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${p.name}</td>
          <td style="padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a;">₹${p.price.toFixed(2)}</td>
        </tr>`)
      .join('');

    const logoUrl = logo.startsWith('data:') ? logo : (window.location.origin + logo);
    const branchNameRaw = (userData?.branchName || 'Chandnagar').toUpperCase();
    const displayBranch = branchNameRaw.includes('HYD') ? branchNameRaw : `${branchNameRaw}, HYD, TS`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background: #f1f5f9; color: #1e293b; padding: 20px; }
    .page {
      width: 595px;
      margin: 0 auto;
      background: #fff;
      min-height: 842px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .header {
      background-color: #298FCA;
      height: 75px;
      padding: 0 0 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo-box {
      background-color: #ffffff;
      height: 100%;
      padding: 10px 25px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-box img {
      height: 55px;
      object-fit: contain;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-right: 30px;
    }
    .globe-icon {
      stroke: #ffffff;
    }
    .body { padding: 35px 40px; flex-grow: 1; }
    .section-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-bottom: 25px; }
    .info-item { display: flex; flex-direction: column; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .info-item label { font-size: 9px; color: #64748b; margin-bottom: 3px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .info-item span { font-size: 13px; font-weight: 700; color: #0f172a; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .items-table th { background-color: #f8fafc; padding: 12px 14px; font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase; text-align: left; border-bottom: 1.5px solid #e2e8f0; }
    .items-table td { padding: 12px 14px; font-size: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .summary-box { background-color: #fafafb; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 12px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px; }
    .summary-row { display: flex; justify-content: space-between; color: #475569; }
    .grand-total { font-size: 16px; font-weight: 900; color: #166534; border-top: 1.5px dashed #cbd5e1; padding-top: 12px; margin-top: 4px; display: flex; justify-content: space-between; }
    .paid-stamp-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 15px; }
    .badge-paid {
      background-color: #22c55e;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 5px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: inline-block;
    }
    .footer {
      background-color: #ACCF37;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      width: 100%;
    }
    .footer-col {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      height: 24px;
    }
    .footer-col.border-left {
      border-left: 1.5px solid rgba(255, 255, 255, 0.6);
    }
    .footer-icon {
      stroke: #ffffff;
    }
    .invoice-tag {
      font-size: 10px;
      font-weight: 800;
      background: rgba(41, 143, 202, 0.08);
      color: #298FCA;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: 1px solid rgba(41, 143, 202, 0.15);
    }

    @media print {
      body { background: #ffffff; padding: 0; margin: 0; }
      .page {
        width: 100vw;
        max-width: 100%;
        height: 98vh;
        min-height: 98vh;
        border: none;
        box-shadow: none;
        margin: 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-box">
      <img src="${logoUrl}" alt="SPIRITUAL HOMEOPATHY" />
    </div>
    <div class="header-right">
      <svg class="globe-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      <span>WWW.SPIRITUALHOMEO.COM</span>
    </div>
  </div>

  <div class="body">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
      <h2 style="font-size: 16px; font-weight: 900; letter-spacing: 1px; color: #1e293b; text-transform: uppercase;">Product Invoice</h2>
      <div class="invoice-tag">INVOICE</div>
    </div>

    <div class="invoice-details">
      <div class="section-title">Invoice Details</div>
      <div class="info-grid">
        <div class="info-item"><label>Invoice Number</label><span>${invoiceNumber}</span></div>
        <div class="info-item"><label>Date & Time</label><span>${currentDateTime}</span></div>
        <div class="info-item"><label>Patient Name</label><span>${patientName}</span></div>
        <div class="info-item"><label>Contact Phone</label><span>+91 ${patientPhone}</span></div>
      </div>
    </div>
    
    <div class="section-title">Billed Items</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50px; text-align: center;">S.No</th>
          <th>Product / Medicine Description</th>
          <th style="text-align: right; width: 120px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    
    <div class="summary-box">
      <div class="summary-row">
        <span>Subtotal</span>
        <span>₹${subtotal.toFixed(2)}</span>
      </div>
      ${couponDiscount > 0 ? `
      <div class="summary-row" style="color: #258ec8; font-weight: 600;">
        <span>Coupon Discount (${appliedCoupon?.code})</span>
        <span>- ₹${couponDiscount.toFixed(2)}</span>
      </div>` : ''}
      ${pointsDiscount > 0 ? `
      <div class="summary-row" style="color: #10b981; font-weight: 600;">
        <span>Points Redeemed</span>
        <span>- ₹${pointsDiscount.toFixed(2)}</span>
      </div>` : ''}
      <div class="grand-total">
        <span>Grand Total Paid</span>
        <span>₹${grandTotal.toFixed(2)}</span>
      </div>
    </div>

    <div class="paid-stamp-row">
      <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
        Thank you for choosing SPH.<br/>
        Keep healthy, stay spiritual.
      </div>
      <span class="badge-paid">PAID ✓</span>
    </div>
  </div>

  <div class="footer">
    <div class="footer-col">
      <svg class="footer-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      <span>9095 176 176</span>
    </div>
    <div class="footer-col border-left">
      <svg class="footer-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
      <span>SPIRITUALHOMEO@GMAIL.COM</span>
    </div>
    <div class="footer-col border-left">
      <svg class="footer-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
      <span>${displayBranch}</span>
    </div>
  </div>
</div>
<script>
  window.onload = function() { window.print(); }
</script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleResetForm = () => {
    setPatient(null);
    setSearchPhone('');
    setPatientName('');
    setPatientPhone('');
    setProducts([]);
    setAppliedCoupon(null);
    setPointsRedeemed('');
    setInvoiceNumber('');
    setInvoiceModalVisible(false);
  };

  const subtotal = products.reduce((sum, item) => sum + item.price, 0);
  const couponDiscount = appliedCoupon ? appliedCoupon.pointsValue : 0;
  const pointsDiscount = parseInt(pointsRedeemed, 10) || 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount - pointsDiscount);

  return (
    <div className="fade-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h2>Products Billing & Invoice</h2>
          <p style={{ color: 'var(--text-muted)' }}>Generate invoices, redeem reward points & coupons</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '30px' }}>
        {/* Left Side: Lookup & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Lookup */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '12px' }}>Quick Patient Lookup</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Enter patient phone number"
                className="glass-input"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
              <button className="btn-primary" onClick={handleSearchPatient} disabled={searching}>
                {searching ? '...' : 'Search'}
              </button>
            </div>
            {patient && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                <Coins size={16} /> Wallet Balance: {patient.rewardPoints} points
              </div>
            )}
          </div>

          {/* Details Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Invoice Metadata</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Patient Name *</label>
              <input
                type="text"
                className="glass-input"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Patient Phone *</label>
              <input
                type="text"
                className="glass-input"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Date/Time: {currentDateTime}
            </div>
          </div>

          {/* Coupons & Points */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Redemptions</h3>
            {!patient ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Lookup a registered patient to apply wallet points and coupons.</p>
            ) : (
              <div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Apply Coupon</label>
                  {appliedCoupon ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(37, 142, 200, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                      <span>Code: <strong>{appliedCoupon.code}</strong> (-₹{appliedCoupon.pointsValue})</span>
                      <button onClick={handleRemoveCoupon} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}>Remove</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        placeholder="Coupon code"
                        className="glass-input"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                      <button className="btn-secondary" onClick={handleApplyCoupon}>Apply</button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Redeem Wallet Points</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="number"
                      placeholder={`Max ${patient.rewardPoints} pts`}
                      className="glass-input"
                      value={pointsRedeemed}
                      onChange={(e) => setPointsRedeemed(e.target.value)}
                    />
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        const maxRedeemable = Math.min(patient.rewardPoints, Math.max(0, subtotal - couponDiscount));
                        setPointsRedeemed(String(maxRedeemable));
                      }}
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Products Cart & Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cart input */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Cart Items</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Product Name"
                className="glass-input"
                style={{ flex: '2 1 200px', minWidth: 0 }}
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Price"
                className="glass-input"
                style={{ flex: '1 1 100px', minWidth: 0 }}
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ flex: '0 0 auto' }}>Add</button>
            </form>

            <div className="table-container">
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>Cart is empty</td>
                    </tr>
                  ) : (
                    products.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>₹{item.price}</td>
                        <td>
                          <button onClick={() => handleDeleteProduct(item.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Invoice Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
              <div className="flex-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex-between" style={{ color: 'var(--primary-color)' }}>
                  <span>Coupon Discount</span>
                  <span>- ₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex-between" style={{ color: 'var(--primary-color)' }}>
                  <span>Points Redeemed</span>
                  <span>- ₹{pointsDiscount.toFixed(2)}</span>
                </div>
              )}
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <div className="flex-between" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCompleteBilling}
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={completingBilling || products.length === 0}
            >
              {completingBilling ? 'Completing...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Generated Success Modal */}
      {invoiceModalVisible && (
        <div className="modal-backdrop" style={{
          display: 'flex',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 1000,
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            color: '#1e293b',
            textAlign: 'left'
          }}>
            {/* Blue Header Branding Block */}
            <div style={{
              backgroundColor: '#258ec8',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ background: '#ffffff', borderRadius: '4px', padding: '4px 10px' }}>
                <span style={{ color: '#258ec8', fontWeight: '900', fontSize: '15px', letterSpacing: '1px' }}>SPIRITUAL</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#ffffff', fontSize: '10px', fontWeight: '700', gap: '4px' }}>
                <Globe size={12} />
                <span>WWW.SPIRITUALHOMEO.COM</span>
              </div>
            </div>

            {/* Scrollable invoice section */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#1b3b6f',
                textAlign: 'center',
                marginBottom: '14px',
                letterSpacing: '1.5px',
                marginTop: 0
              }}>OFFICIAL INVOICE</h3>

              {/* Metadata Grid */}
              <div style={{
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                paddingBottom: '12px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoice Number</span>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{invoiceNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</span>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{currentDateTime}</div>
                </div>
              </div>

              {/* Patient Info */}
              <div style={{
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                paddingBottom: '12px',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Bill-To</span>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>{patientName}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Mobile: +91 {patientPhone}</div>
              </div>

              {/* Items Table */}
              <div style={{
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#1e293b' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center', fontWeight: '800', color: '#64748b' }}>S.No</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '800', color: '#64748b' }}>Product / Medicine Description</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '80px', fontWeight: '800', color: '#64748b' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', wordBreak: 'break-word' }}>{item.name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>₹{item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Box */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid rgba(0,0,0,0.04)',
                fontSize: '12px',
                color: '#1e293b'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px', paddingBottom: '3px' }}>
                  <span style={{ color: '#64748b' }}>Subtotal</span>
                  <span style={{ fontWeight: '600' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px', paddingBottom: '3px', color: '#258ec8' }}>
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span>- ₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '3px', paddingBottom: '3px', color: '#10b981' }}>
                    <span>Points Redeemed</span>
                    <span>- ₹{pointsDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  height: '1px',
                  backgroundColor: 'rgba(0,0,0,0.08)',
                  marginTop: '6px',
                  marginBottom: '6px'
                }} />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  fontWeight: '800'
                }}>
                  <span>Grand Total Paid</span>
                  <span style={{ color: '#10b981' }}>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Green Footer Clinic Details Block */}
            <div style={{
              backgroundColor: '#a8ce3a',
              padding: '10px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              color: '#ffffff',
              fontSize: '9px',
              fontWeight: '700'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={10} color="#ffffff" />
                <span>9095 176 176</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={10} color="#ffffff" />
                <span>SPIRITUALHOMEO@GMAIL.COM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={10} color="#ffffff" />
                <span>CHANDANAGAR, HYD, TS</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              padding: '16px',
              gap: '10px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid rgba(0,0,0,0.08)'
            }}>
              <button className="btn-primary" style={{
                flex: 1.2,
                backgroundColor: '#25d366',
                borderColor: '#25d366',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: '700'
              }} onClick={handleShareWhatsApp}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: '6px' }}>
                  <path d="M12.031 2C6.49 2 2 6.49 2 12.03c0 1.768.46 3.491 1.335 5.015L2 22l5.13-1.348a9.98 9.98 0 0 0 4.901 1.28c5.54 0 10.03-4.49 10.03-10.03C22.062 6.49 17.571 2 12.031 2zm6.182 14.18c-.272.766-1.356 1.394-1.922 1.49-.49.082-.99.04-2.884-.716-2.42-.968-3.958-3.414-4.08-3.576-.118-.162-.962-1.282-.962-2.444 0-1.162.612-1.73.83-1.964.218-.236.478-.294.636-.294.158 0 .316.002.454.008.146.006.342-.056.536.41.2.48.682 1.662.742 1.782.06.12.1.258.02.418-.08.16-.178.272-.294.408-.118.136-.248.304-.354.408-.12.118-.244.246-.104.484.14.238.622 1.026 1.334 1.66.92.818 1.694 1.07 1.932 1.19.238.12.378.102.518-.058.14-.16.6-1.012.76-1.356.16-.344.318-.288.536-.208.218.08 1.382.652 1.62.77.238.118.396.176.456.276.06.1.06.58-.212 1.346z"/>
                </svg>
                Share WhatsApp
              </button>
              
              <button className="btn-secondary" style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: '#ffffff'
              }} onClick={handlePrintInvoice}>
                <Printer size={16} />
                Print Invoice
              </button>

              <button className="btn-secondary" style={{
                flex: 0.8,
                padding: '10px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: '#ffffff',
                borderColor: 'rgba(0,0,0,0.08)',
                color: '#1e293b'
              }} onClick={handleResetForm}>
                New Billing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardPointClaim;
