const fs = require('fs');

const updateFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace the targetReached logic with dynamic query
  const targetLogicRegex = /const unsubscribeTarget = onSnapshot\(qTarget, \(snapshot\) => \{[\s\S]*?setTargetReached\(0\);\s*\}\s*\}\);/g;

  const newTargetLogic = `
      const unsubscribeTarget = onSnapshot(qTarget, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setMonthlyTarget(data.target);
          // Instead of relying on data.reached, we calculate dynamically below
        } else {
          setMonthlyTarget(null);
        }
      });

      // Dynamically calculate true target reached for the branch
      const fetchTrueReached = async () => {
        try {
          const parseDateMonth = (raw) => {
            if (!raw) return null;
            let d = null;
            if (raw.toDate) d = raw.toDate();
            else if (raw.seconds) d = new Date(raw.seconds * 1000);
            else d = new Date(raw);
            if (d && !isNaN(d.getTime())) return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;
            return null;
          };

          const branchFilter = userData?.branchId || '';
          const branchName = userData?.branchName || '';
          let sum = 0;

          // 1. Transactions
          const tSnap = await getDocs(query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(2000)));
          tSnap.forEach(d => {
            const data = d.data();
            if ((data.branchId === branchFilter || data.branchName === branchName) && parseDateMonth(data.timestamp) === monthKey) {
              sum += Number(data.amount || 0);
            }
          });

          // 2. Patients & Appointments
          const pSnap = await getDocs(collection(db, 'patients'));
          pSnap.forEach(d => {
            const data = d.data();
            if (data.paymentStatus === 'paid' && (data.branchId === branchFilter || data.branchName === branchName)) {
              if (parseDateMonth(data.paymentCollectedAt || data.appointmentDate || data.createdAt) === monthKey) {
                sum += Number(data.paymentAmount || data.amountPaid || 0);
              }
            }
          });

          // 3. Medicine Requests
          const mSnap = await getDocs(collection(db, 'medicine_requests'));
          mSnap.forEach(d => {
            const data = d.data();
            if (data.paymentStatus === 'paid' && (data.branchId === branchFilter || data.branchName === branchName)) {
              if (parseDateMonth(data.paymentCollectedAt || data.updatedAt) === monthKey) {
                sum += Number(data.paymentAmount || data.amountPaid || 0);
              }
            }
          });

          setTargetReached(sum);
        } catch (err) {
          console.error('Error fetching true reached:', err);
        }
      };
      fetchTrueReached();
`;
  content = content.replace(targetLogicRegex, newTargetLogic);

  // We also need to add query, orderBy, limit to the imports if they are not there
  if (!content.includes('orderBy')) {
    content = content.replace("where, getDocs", "where, getDocs, orderBy, limit");
  }

  fs.writeFileSync(file, content);
};

updateFile('c:/Users/Shaik Ansar/Downloads/sph/SPH-Admin-19-06-2026-main/src/pages/reception/ReceptionDashboard.jsx');
console.log("Updated Reception Dashboard");
