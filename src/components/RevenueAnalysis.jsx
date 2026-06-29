import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, IndianRupee, MapPin, UserCheck, CreditCard, PieChart as PieChartIcon, X } from 'lucide-react';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const BRANCH_COLORS = {
  'KPHP': '#3b82f6',
  'Chandanagar': '#10b981',
  'Dilshuknagar': '#f59e0b',
  'Nallagandla': '#8b5cf6',
  'Other': '#64748b'
};

const getCanonicalBranch = (b) => {
  if (!b) return 'Other';
  const str = b.toLowerCase();
  if (str.includes('kphb') || str.includes('kphp') || str.includes('kukatpally')) return 'KPHP';
  if (str.includes('chnr') || str.includes('chand')) return 'Chandanagar';
  if (str.includes('dsnr') || str.includes('dilshuk') || str.includes('dilsuk')) return 'Dilshuknagar';
  if (str.includes('nallagandla')) return 'Nallagandla';
  return 'Other';
};

const parseAnyDate = (dateVal) => {
  if (!dateVal) return null;
  // Firestore timestamp
  if (dateVal.toDate) return dateVal.toDate();
  if (dateVal.seconds) return new Date(dateVal.seconds * 1000);

  if (typeof dateVal === 'string') {
    // Handle DD/MM/YYYY
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    // Handle DD-MM-YYYY
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
  }

  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  return null;
};

const RevenueAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [selectedBranchForCompare, setSelectedBranchForCompare] = useState('');
  const [showBranchCompareModal, setShowBranchCompareModal] = useState(false);
  const [selectedDoctorForCompare, setSelectedDoctorForCompare] = useState('');
  const [showDoctorCompareModal, setShowDoctorCompareModal] = useState(false);
  const [selectedSourceForCompare, setSelectedSourceForCompare] = useState('');
  const [showSourceCompareModal, setShowSourceCompareModal] = useState(false);
  const [sourceBranchFilter, setSourceBranchFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all patients (Consultation Revenue)
        const pSnap = await getDocs(query(collection(db, 'allpatients'), where('paymentStatus', '==', 'paid')));
        const pData = [];
        pSnap.forEach(doc => {
          pData.push({ id: doc.id, ...doc.data() });
        });
        setPatients(pData);

        // Fetch all transactions (Medicine / Packages / Diet Plan / Consultations Revenue)
        const tSnap = await getDocs(query(collection(db, 'alltransactions'), orderBy('timestamp', 'desc')));
        const tData = [];
        tSnap.forEach(doc => {
          tData.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(tData);

        // Fetch all doctors to ensure they appear on the leaderboard even with 0 revenue
        const docSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')));
        const doctorsData = [];
        docSnap.forEach(doc => {
          doctorsData.push(doc.data().name || doc.data().fullName);
        });
        setAllDoctors(doctorsData.filter(Boolean));

      } catch (err) {
        console.error("Error fetching analytics data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const analyticsData = useMemo(() => {
    if (!patients.length && !transactions.length) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    const branchMap = {
      'KPHP': { name: 'KPHP', revenue: 0, thisMonth: 0, lastMonth: 0 },
      'Chandanagar': { name: 'Chandanagar', revenue: 0, thisMonth: 0, lastMonth: 0 },
      'Dilshuknagar': { name: 'Dilshuknagar', revenue: 0, thisMonth: 0, lastMonth: 0 },
      'Nallagandla': { name: 'Nallagandla', revenue: 0, thisMonth: 0, lastMonth: 0 }
    };

    const doctorMap = {};
    allDoctors.forEach(docName => {
      doctorMap[docName] = { name: docName, revenue: 0, thisMonth: 0, lastMonth: 0 };
    });

    const monthMap = {};
    const branchMonthMap = {};

    // Pre-fill last 6 months so graphs always have a full 6-month scale
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      monthMap[mKey] = { key: mKey, label: mLabel, sortKey: d.getFullYear() * 100 + d.getMonth(), revenue: 0 };
      branchMonthMap[mKey] = { key: mKey, label: mLabel, sortKey: d.getFullYear() * 100 + d.getMonth() };
    }

    const timelineMap = {};
    const defaultSources = ['Walk-in', 'Instagram', 'Facebook', 'Website', 'Google', 'Practo', 'Referral', 'YouTube', 'Marketing'];
    const sourceMap = {};
    defaultSources.forEach(src => {
      sourceMap[src] = { name: src, revenue: 0, thisMonth: 0, lastMonth: 0, uniquePatients: new Set() };
    });
    const sourceByBranchMap = {};
    const methodMap = {};
    const typeMap = {
      'Consultation': 0,
      'Consultation & Medicine Fee': 0,
      'Diet Plan': 0
    };
    const pendingMap = {};
    const recentTx = [];

    const processRecord = (amount, dateStr, branch, doctor, source, method, type, originalObj) => {
      if (!amount || isNaN(amount)) return;

      let d = parseAnyDate(dateStr);
      if (!d) return;

      totalRevenue += amount;

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        thisMonthRevenue += amount;
      } else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        lastMonthRevenue += amount;
      }

      // Branch wise
      const bName = getCanonicalBranch(branch);
      if (!branchMap[bName]) {
        branchMap[bName] = { name: bName, revenue: 0, thisMonth: 0, lastMonth: 0 };
      }

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        branchMap[bName].revenue += amount;
        branchMap[bName].thisMonth += amount;
      } else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        branchMap[bName].lastMonth += amount;
      }

      // Doctor wise
      const docName = doctor || 'Other';
      if (!doctorMap[docName]) {
        doctorMap[docName] = { name: docName, revenue: 0, thisMonth: 0, lastMonth: 0 };
      }
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        doctorMap[docName].revenue += amount;
        doctorMap[docName].thisMonth += amount;
      } else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        doctorMap[docName].lastMonth += amount;
      }

      // Source wise
      let rawSrc = (source || 'Walk-in').trim();
      // Normalize common names
      if (rawSrc.toLowerCase().includes('insta')) rawSrc = 'Instagram';
      else if (rawSrc.toLowerCase().includes('face')) rawSrc = 'Facebook';
      else if (rawSrc.toLowerCase().includes('goog')) rawSrc = 'Google';
      else if (rawSrc.toLowerCase().includes('prac')) rawSrc = 'Practo';
      else if (rawSrc.toLowerCase().includes('tube')) rawSrc = 'YouTube';
      else if (rawSrc.toLowerCase().includes('web')) rawSrc = 'Website';
      else if (rawSrc.toLowerCase().includes('ref')) rawSrc = 'Referral';
      else if (rawSrc.toLowerCase().includes('mark')) rawSrc = 'Marketing';
      else if (rawSrc.toLowerCase().includes('walk')) rawSrc = 'Walk-in';

      const srcName = rawSrc;
      if (!sourceMap[srcName]) {
        sourceMap[srcName] = { name: srcName, revenue: 0, thisMonth: 0, lastMonth: 0, uniquePatients: new Set() };
      }
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        sourceMap[srcName].revenue += amount;

        if (!sourceByBranchMap[bName]) sourceByBranchMap[bName] = {};
        if (!sourceByBranchMap[bName][srcName]) {
          sourceByBranchMap[bName][srcName] = { name: srcName, revenue: 0, thisMonth: 0, lastMonth: 0, uniquePatients: new Set() };
        }
        sourceByBranchMap[bName][srcName].revenue += amount;

        const patId = originalObj.id || originalObj.registrationId || originalObj.patientId || originalObj.patientName;
        if (patId) {
          sourceMap[srcName].uniquePatients.add(patId);
          sourceByBranchMap[bName][srcName].uniquePatients.add(patId);
        }
      }

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        sourceMap[srcName].thisMonth += amount;
        sourceByBranchMap[bName][srcName].thisMonth += amount;
      } else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        sourceMap[srcName].lastMonth += amount;
        sourceByBranchMap[bName][srcName].lastMonth += amount;
      }

      // Method wise
      let modName = (method || 'Unknown').toUpperCase();
      if (modName === 'SPLIT' || modName === 'APP_SPLIT') {
        modName = 'CASH/UPI';
      }
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        methodMap[modName] = (methodMap[modName] || 0) + amount;
      }

      // Type wise
      let rawType = (type || 'Consultation').toLowerCase();
      let typName = 'Consultation';

      if (rawType.includes('medicine') || rawType.includes('product') || rawType.includes('pharmacy')) {
        typName = 'Consultation & Medicine Fee';
      } else if (rawType.includes('nutrition') || rawType.includes('diet')) {
        typName = 'Diet Plan';
      }

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        typeMap[typName] = (typeMap[typName] || 0) + amount;
      }

      // Month wise trend
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthMap[mKey]) monthMap[mKey] = { key: mKey, label: mLabel, sortKey: d.getTime(), revenue: 0 };
      monthMap[mKey].revenue += amount;

      if (!branchMonthMap[mKey]) branchMonthMap[mKey] = { key: mKey, label: mLabel, sortKey: d.getTime() };
      branchMonthMap[mKey][bName] = (branchMonthMap[mKey][bName] || 0) + amount;

      // Detailed Daily Timeline
      const tKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const tLabel = d.toLocaleString('default', { day: 'numeric', month: 'short' });
      if (!timelineMap[tKey]) timelineMap[tKey] = { key: tKey, label: tLabel, sortKey: d.getTime(), revenue: 0 };
      timelineMap[tKey].revenue += amount;

      // Recent transactions list
      recentTx.push({
        id: originalObj.id,
        patientName: originalObj.fullName || originalObj.patientName || 'Unknown',
        amount,
        date: d,
        branch: bName,
        type: typName,
        method: modName
      });
    };

    const processedPatients = new Set();

    const processItemsPaid = (itemsPaid, date, branch, doctor, source, method, originalObj) => {
      let totalProcessed = 0;
      if (Number(itemsPaid.consultation) > 0) {
        processRecord(Number(itemsPaid.consultation), date, branch, doctor, source, method, 'Consultation', originalObj);
        totalProcessed += Number(itemsPaid.consultation);
      }
      if (Number(itemsPaid.medicine) > 0) {
        processRecord(Number(itemsPaid.medicine), date, branch, doctor, source, method, 'Medicine', originalObj);
        totalProcessed += Number(itemsPaid.medicine);
      }
      if (Number(itemsPaid.dietPlan) > 0) {
        processRecord(Number(itemsPaid.dietPlan), date, branch, doctor, source, method, 'Diet Plan', originalObj);
        totalProcessed += Number(itemsPaid.dietPlan);
      }
      if (Array.isArray(itemsPaid.otherFees)) {
        itemsPaid.otherFees.forEach(f => {
          if (Number(f.amount) > 0) {
            processRecord(Number(f.amount), date, branch, doctor, source, method, 'Consultation & Medicine Fee', originalObj);
            totalProcessed += Number(f.amount);
          }
        });
      }
      return totalProcessed;
    };

    // 1. Process Consultation / Appointment revenue from allpatients array
    patients.forEach(p => {
      const date = p.paymentCollectedAt || p.appointmentDate || p.createdAt || p.date;
      const bName = getCanonicalBranch(p.branchName || p.branch || 'Main Branch');
      const dName = p.doctor || p.doctorName;
      const method = p.paymentMethod || p.method;

      const pAmt = Number(p.pendingAmount || 0);
      if (pAmt > 0) {
        if (!pendingMap[bName]) {
          pendingMap[bName] = { name: bName, count: 0, totalPending: 0, thisMonthPending: 0 };
        }
        pendingMap[bName].count += 1;
        pendingMap[bName].totalPending += pAmt;
        let patDate = parseAnyDate(date);
        if (patDate && patDate.getMonth() === currentMonth && patDate.getFullYear() === currentYear) {
          pendingMap[bName].thisMonthPending += pAmt;
        }
      }

      let processed = false;
      if (p.itemsPaid) {
        const total = processItemsPaid(p.itemsPaid, date, bName, dName, p.source, method, p);
        if (total > 0) processed = true;
      } else {
        let amt = 0;
        if (p.paymentAmount !== undefined && p.paymentAmount !== null && p.paymentAmount !== '') {
          amt = Number(p.paymentAmount);
        } else if (p.amountPaid !== undefined && p.amountPaid !== null && p.amountPaid !== '') {
          amt = Number(p.amountPaid);
        }
        if (amt > 0) {
          processRecord(amt, date, bName, dName, p.source, method, 'Consultation', p);
          processed = true;
        }
      }

      if (processed) {
        if (p.id) processedPatients.add(p.id);
        if (p.registrationId) processedPatients.add(p.registrationId);
      }
    });

    // 2. Process Pharmacy / Diet / Medicine transactions from alltransactions array
    transactions.forEach(t => {
      // Prevent double counting if this was already handled in livePatients
      if (t.patientId && processedPatients.has(t.patientId)) return;
      if (t.registrationId && processedPatients.has(t.registrationId)) return;

      const date = t.date || t.createdAt || t.timestamp;
      const bName = getCanonicalBranch(t.branchName || t.branchId || t.branch || 'Main Branch');
      const dName = t.doctorName || t.doctorId || t.doctor;
      let methodToUse = t.method || t.paymentMethod;

      const tAmt = Number(t.pendingAmount || 0);
      if (tAmt > 0) {
        if (!pendingMap[bName]) {
          pendingMap[bName] = { name: bName, count: 0, totalPending: 0, thisMonthPending: 0 };
        }
        pendingMap[bName].count += 1;
        pendingMap[bName].totalPending += tAmt;
        let txnDate = parseAnyDate(date);
        if (txnDate && txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
          pendingMap[bName].thisMonthPending += tAmt;
        }
      }

      if (t.paymentId && typeof t.paymentId === 'string' && t.paymentId.includes('SPLIT')) {
        methodToUse = 'CASH/UPI';
      }

      if (t.itemsPaid) {
        processItemsPaid(t.itemsPaid, date, bName, dName, t.source, methodToUse, t);
      } else {
        let amt = Number(t.amount || t.amountPaid || 0);
        if (amt > 0) {
          processRecord(amt, date, bName, dName, t.source, methodToUse, t.type || 'Other', t);
        }
      }

      if (t.type === 'consultation' || t.type === 'Consultation') {
        if (t.patientId) processedPatients.add(t.patientId);
      }
    });

    // Format for charts
    const pendingData = Object.values(pendingMap).sort((a, b) => b.totalPending - a.totalPending);
    const branchData = Object.values(branchMap).sort((a, b) => b.revenue - a.revenue);
    const doctorData = Object.values(doctorMap).sort((a, b) => b.revenue - a.revenue);
    const SOURCE_COLORS = {
      'Instagram': '#ec4899', // Pink
      'Facebook': '#3b5998', // FB Blue
      'Google': '#ea4335', // Google Red
      'Website': '#8b5cf6', // Purple
      'Practo': '#0284c7', // Sky blue
      'Referral': '#10b981', // Green
      'YouTube': '#ff0000', // Red
      'Marketing': '#f59e0b', // Amber
      'Walk-in': '#64748b' // Slate
    };

    const sourceData = Object.values(sourceMap).map(s => ({
      ...s,
      patientCount: s.uniquePatients.size,
      fill: SOURCE_COLORS[s.name] || COLORS[Math.abs(s.name.length) % COLORS.length]
    })).sort((a, b) => b.patientCount - a.patientCount);

    Object.keys(sourceByBranchMap).forEach(bName => {
      Object.keys(sourceByBranchMap[bName]).forEach(src => {
        sourceByBranchMap[bName][src].patientCount = sourceByBranchMap[bName][src].uniquePatients.size;
      });
    });

    const methodData = Object.keys(methodMap).map(k => ({ name: k, revenue: methodMap[k] })).sort((a, b) => b.revenue - a.revenue);
    const typeData = [
      { name: 'Consultation', revenue: typeMap['Consultation'] || 0, fill: '#3b82f6' }, // Blue
      { name: 'Consultation & Medicine Fee', revenue: typeMap['Consultation & Medicine Fee'] || 0, fill: '#10b981' }, // Green
      { name: 'Diet Plan', revenue: typeMap['Diet Plan'] || 0, fill: '#f59e0b' } // Orange
    ].sort((a, b) => b.revenue - a.revenue);

    const branchTrendData = Object.values(branchMonthMap).sort((a, b) => a.sortKey - b.sortKey).slice(-3);
    // Use monthly aggregation (exactly 1 date per month), slice last 6 points (6 months)
    const trendData = Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey).slice(-6);

    const uniqueTxMap = {};
    recentTx.forEach(tx => {
      const dKey = tx.date.toDateString();
      const pName = (tx.patientName || 'Unknown').trim().toLowerCase();
      const key = `${pName}-${dKey}`;

      if (uniqueTxMap[key]) {
        uniqueTxMap[key].amount += tx.amount;
        if (uniqueTxMap[key].method !== tx.method) {
          uniqueTxMap[key].method = 'CASH/UPI';
        }
        if (uniqueTxMap[key].type !== tx.type && !uniqueTxMap[key].type.includes(tx.type)) {
          uniqueTxMap[key].type += `, ${tx.type}`;
        }
        // Use the most recent timestamp for sorting
        if (tx.date > uniqueTxMap[key].date) {
          uniqueTxMap[key].date = tx.date;
        }
      } else {
        uniqueTxMap[key] = { ...tx };
      }
    });
    const dedupedRecentTx = Object.values(uniqueTxMap);
    dedupedRecentTx.sort((a, b) => b.date - a.date);
    const topRecentTx = dedupedRecentTx.slice(0, 10);

    const growthPercent = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : (thisMonthRevenue > 0 ? 100 : 0);

    return {
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      growthPercent,
      branchData,
      doctorData,
      trendData,
      branchTrendData,
      sourceData,
      sourceByBranchMap,
      methodData,
      typeData,
      pendingData,
      topRecentTx
    };
  }, [patients, transactions]);

  const displaySourceData = useMemo(() => {
    if (!analyticsData) return [];
    if (sourceBranchFilter === 'all') return analyticsData.sourceData;
    return analyticsData.sourceByBranchMap[sourceBranchFilter]
      ? Object.values(analyticsData.sourceByBranchMap[sourceBranchFilter]).sort((a, b) => b.patientCount - a.patientCount)
      : [];
  }, [analyticsData, sourceBranchFilter]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="loader" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Analyzing revenue data...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No revenue data available for analysis.</div>;
  }

  const formatYAxis = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return `₹${val}`;
  };

  const { totalRevenue, thisMonthRevenue, lastMonthRevenue, growthPercent, branchData, doctorData, trendData, branchTrendData, sourceData, methodData, typeData, topRecentTx } = analyticsData;
  const isPositiveGrowth = growthPercent >= 0;

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Revenue Analysis</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comprehensive breakdown of clinical and operational revenue</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Overall Revenue</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{totalRevenue.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Activity size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>This Month</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{thisMonthRevenue.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isPositiveGrowth ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPositiveGrowth ? '#10b981' : '#ef4444' }}>
            {isPositiveGrowth ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>MoM Growth</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isPositiveGrowth ? '#10b981' : '#ef4444', margin: 0 }}>
                {isPositiveGrowth ? '+' : ''}{growthPercent.toFixed(1)}%
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs ₹{lastMonthRevenue.toLocaleString('en-IN')} last mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>

        {/* Trend Chart - Detailed Timeline */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 2', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Activity size={20} color="#34d399" /> Revenue Timeline (Spike Graph)
          </h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spikeLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="label" stroke="#000" fontSize={11} tickLine={false} axisLine={false} dy={10} minTickGap={10} />
                <YAxis stroke="#000" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} dx={-10} />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area
                  type="linear"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#spikeLineGradient)"
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Trend Chart - Half Width */}
        <div className="glass-panel" style={{ padding: '32px', gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={20} color="#f43f5e" /> Branch Performance (Last 3 Months)
            </h3>
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={branchTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="label" stroke="#000" fontSize={13} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#000" fontSize={13} tickLine={false} axisLine={false} tickFormatter={formatYAxis} dx={-10} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: '12px 16px', color: '#fff' }}
                  formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name]}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: '600' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: 'rgba(255,255,255,0.7)' }} />
                {branchData.slice(0, 4).map((b, idx) => (
                  <Bar key={b.name} dataKey={b.name} stackId="a" fill={BRANCH_COLORS[b.name] || COLORS[idx % COLORS.length]} maxBarSize={40} animationDuration={1500} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Simple Top 4 Branches List */}
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {branchData.slice(0, 4).map((b, idx) => {
              const bColor = BRANCH_COLORS[b.name] || COLORS[idx % COLORS.length];
              return (
                <div key={b.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: `1px solid ${bColor}30` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: bColor, boxShadow: `0 0 10px ${bColor}` }}></div>
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#000' }}>{b.name}</span>
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', color: bColor }}>₹{b.revenue.toLocaleString('en-IN')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Wise Revenue */}
        <div className="glass-panel" style={{ padding: '32px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#10b981" /> Branch-wise Revenue (This Month)
            </h3>
            <select
              className="glass-input"
              style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
              value={selectedBranchForCompare || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedBranchForCompare(e.target.value);
                  setShowBranchCompareModal(true);
                }
              }}
            >
              <option value="" disabled>Compare Branches...</option>
              {branchData.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={branchData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="revenue"
                  stroke="none"
                  animationDuration={1500}
                  labelLine={false}
                >
                  {branchData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BRANCH_COLORS[entry.name] || COLORS[index % COLORS.length]}
                      style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.4))', outline: 'none' }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: '16px', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '1.1rem' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.8)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Doctor Wise Revenue */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="#8b5cf6" /> Top Doctors Revenue (This Month)
            </h3>
            <select
              className="glass-input"
              style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
              value={selectedDoctorForCompare || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDoctorForCompare(e.target.value);
                  setShowDoctorCompareModal(true);
                }
              }}
            >
              <option value="" disabled>Compare Doctors...</option>
              {doctorData.map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ width: '100%', height: 350, overflowY: 'auto', paddingRight: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {doctorData.map((d, idx) => {
                const isTop3 = idx < 3;
                return (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: isTop3 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', border: `1px solid ${isTop3 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.3s ease' }} className="hover-lift">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isTop3 ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: isTop3 ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '1rem', color: isTop3 ? '#8b5cf6' : 'var(--text-main)' }}>{d.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Consulting Doctor</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#10b981' }}>₹{d.revenue.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                );
              })}
              {doctorData.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No doctor revenue data found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue by Type */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon size={18} color="#ec4899" /> Revenue by Service Type (This Month)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="revenue"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Source */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="#06b6d4" /> Top Patient Sources (This Month)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="glass-input"
                style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                value={sourceBranchFilter}
                onChange={(e) => setSourceBranchFilter(e.target.value)}
              >
                <option value="all">All Branches</option>
                {analyticsData?.branchData.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <select
                className="glass-input"
                style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                value={selectedSourceForCompare || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedSourceForCompare(e.target.value);
                    setShowSourceCompareModal(true);
                  }
                }}
              >
                <option value="" disabled>Compare Sources...</option>
                {displaySourceData.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={displaySourceData} margin={{ top: 15, right: 30, left: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tick={{ fill: 'var(--text-muted)' }} angle={-35} textAnchor="end" />
                <YAxis type="number" stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: data.fill }}>{data.name}</p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}>Patients: <strong>{data.patientCount}</strong></p>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#ec4899' }}>Revenue: <strong>₹{data.revenue.toLocaleString('en-IN')}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="patientCount" radius={[6, 6, 0, 0]} barSize={36}>
                  {displaySourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} color="#84cc16" /> Payment Methods (This Month)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={100}
                  dataKey="revenue"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending & Pay Later Amounts */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#ef4444" /> Pay Later & Pending Amounts (By Branch)
          </h3>
          <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ backgroundColor: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Branch</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Patients</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Pay Later (All Time)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pay Later (This Month)</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData?.pendingData?.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {p.count} Patients
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: 'bold', textAlign: 'right' }}>₹{p.totalPending.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: 'bold', textAlign: 'right' }}>₹{p.thisMonthPending.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {(!analyticsData?.pendingData || analyticsData.pendingData.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No pending amounts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions Detail */}
        <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#f59e0b" /> Detailed Transactions
          </h3>
          <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ backgroundColor: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
                <tr>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Patient</th>
                  <th style={{ padding: '12px 16px' }}>Branch</th>
                  <th style={{ padding: '12px 16px' }}>Service Type</th>
                  <th style={{ padding: '12px 16px' }}>Method</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {topRecentTx.map((tx, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{tx.date.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{tx.patientName}</td>
                    <td style={{ padding: '12px 16px' }}>{tx.branch}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{tx.type}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${tx.method === 'CASH' ? 'badge-primary' : tx.method === 'UPI' ? 'badge-secondary' : ''}`} style={{ fontSize: '0.7rem' }}>
                        {tx.method}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {topRecentTx.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No recent transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Branch Compare Modal */}
      {showBranchCompareModal && selectedBranchForCompare && (
        <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel slide-up" style={{ width: '90%', maxWidth: '600px', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => { setShowBranchCompareModal(false); setSelectedBranchForCompare(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-main)' }}>{selectedBranchForCompare} - MoM Comparison</h3>

            {(() => {
              const branchInfo = branchData.find(b => b.name === selectedBranchForCompare);
              if (!branchInfo) return null;

              const diff = branchInfo.thisMonth - branchInfo.lastMonth;
              const isInc = diff >= 0;

              const chartData = [
                { name: 'Last Month', revenue: branchInfo.lastMonth },
                { name: 'This Month', revenue: branchInfo.thisMonth }
              ];

              return (
                <div>
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>This Month</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{branchInfo.thisMonth.toLocaleString('en-IN')}</h4>
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>Last Month</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{branchInfo.lastMonth.toLocaleString('en-IN')}</h4>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>Difference</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isInc ? '#10b981' : '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isInc ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        {isInc ? '+' : '-'}₹{Math.abs(diff).toLocaleString('en-IN')}
                      </h4>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 300, background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px' }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                        <Tooltip
                          formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                          contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={80}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#64748b' : (BRANCH_COLORS[selectedBranchForCompare] || '#3b82f6')} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Doctor Compare Modal */}
      {showDoctorCompareModal && selectedDoctorForCompare && (
        <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel slide-up" style={{ width: '90%', maxWidth: '600px', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => { setShowDoctorCompareModal(false); setSelectedDoctorForCompare(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-main)' }}>{selectedDoctorForCompare} - MoM Comparison</h3>

            {(() => {
              const docInfo = doctorData.find(d => d.name === selectedDoctorForCompare);
              if (!docInfo) return null;

              const diff = docInfo.thisMonth - docInfo.lastMonth;
              const isInc = diff >= 0;

              const chartData = [
                { name: 'Last Month', revenue: docInfo.lastMonth },
                { name: 'This Month', revenue: docInfo.thisMonth }
              ];

              return (
                <div>
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>This Month</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{docInfo.thisMonth.toLocaleString('en-IN')}</h4>
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>Last Month</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{docInfo.lastMonth.toLocaleString('en-IN')}</h4>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>Difference</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isInc ? '#10b981' : '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isInc ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        {isInc ? '+' : '-'}₹{Math.abs(diff).toLocaleString('en-IN')}
                      </h4>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 300, background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px' }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                        <Tooltip
                          formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                          contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={80}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#64748b' : '#8b5cf6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Source Compare Modal */}
      {showSourceCompareModal && selectedSourceForCompare && (
        <div className="modal-overlay fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel slide-up" style={{ width: '90%', maxWidth: '600px', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => { setShowSourceCompareModal(false); setSelectedSourceForCompare(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-main)' }}>{selectedSourceForCompare} - MoM Comparison</h3>

            {(() => {
              const sourceInfo = displaySourceData.find(s => s.name === selectedSourceForCompare);
              if (!sourceInfo) return null;

              const diff = sourceInfo.thisMonth - sourceInfo.lastMonth;
              const isInc = diff >= 0;

              const chartData = [
                { name: 'Last Month', revenue: sourceInfo.lastMonth },
                { name: 'This Month', revenue: sourceInfo.thisMonth }
              ];

              return (
                <div>
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>This Month</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{sourceInfo.thisMonth.toLocaleString('en-IN')}</h4>
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>Last Month</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: 0 }}>₹{sourceInfo.lastMonth.toLocaleString('en-IN')}</h4>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>Difference</p>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isInc ? '#10b981' : '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isInc ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        {isInc ? '+' : '-'}₹{Math.abs(diff).toLocaleString('en-IN')}
                      </h4>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 300, background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px' }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                        <Tooltip
                          formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                          contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={80}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#64748b' : '#06b6d4'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};
export default RevenueAnalysis;