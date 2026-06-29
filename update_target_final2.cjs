const fs = require('fs');

const getFetchLogic = (isApp) => `
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

            const branchFilter = ${isApp ? "userData?.branchId || ''" : "userData.branchId"};
            const branchName = ${isApp ? "userData?.branchName || ''" : "userData.branchName"};
            
            const normalizeBranch = (name) => {
              if (!name) return 'Unknown';
              name = name.toLowerCase();
              if (name.includes('kphb')) return 'KPHB';
              if (name.includes('nalla') || name.includes('nallagandala')) return 'NALLAGANDLA';
              if (name.includes('dil') || name.includes('dsnr') || name.includes('dsh')) return 'DILSHUKNAGAR';
              if (name.includes('chand') || name.includes('chanda')) return 'CHANDANAGAR';
              return name.toUpperCase();
            };

            const targetNormalizedBranch = normalizeBranch(branchName || branchFilter);
            let sum = 0;

            const getExactPatientAmount = (p) => {
              if (p.paymentAmount !== undefined && p.paymentAmount !== null && p.paymentAmount !== '') {
                return Number(p.paymentAmount);
              }
              if (p.amountPaid !== undefined && p.amountPaid !== null && p.amountPaid !== '') {
                return Number(p.amountPaid);
              }
              if (p.itemsPaid && p.itemsPaid.consultation !== undefined) {
                return Number(p.itemsPaid.consultation);
              }
              return 0; 
            };

            const allRevenueRecords = [];
            const usedApptPatientIds = new Set();
          
            // 1. Appointments
            const apptSnap = await getDocs(collection(db, 'appointments'));
            apptSnap.forEach(d => {
              const a = d.data();
              if (a.paymentStatus === 'paid' || a.status === 'completed' || a.status === 'done') {
                usedApptPatientIds.add(a.patientId);
                allRevenueRecords.push(a);
              }
            });
          
            // 2. Patients
            const pSnap = await getDocs(collection(db, 'patients'));
            pSnap.forEach(d => {
              const p = d.data();
              if (p.paymentStatus === 'paid' || p.status === 'completed' || p.status === 'done') {
                if (!usedApptPatientIds.has(d.id)) {
                  allRevenueRecords.push(p);
                }
              }
            });
          
            // Process combined Consultation records
            allRevenueRecords.forEach(p => {
              if (normalizeBranch(p.branchId || p.branchName || p.branch) !== targetNormalizedBranch) return;
              
              let matchesDate = false;
              let rawDateStr = p.paymentCollectedAt || p.appointmentDate || p.completedAt || p.createdAt || p.date;
              if (parseDateMonth(rawDateStr) === monthKey) matchesDate = true;
              if (!matchesDate) return;

              const isConsultationPayment = p.paymentStatus === 'paid'
                 ? (!p.itemsPaid || p.itemsPaid.consultation > 0 || (p.itemsPaid.consultation === undefined && p.itemsPaid.medicine === undefined))
                 : true;
              if (!isConsultationPayment) return;
              if (p.paymentStatus !== 'paid') return;
          
              const consAmt = (() => {
                const hasMed = p.itemsPaid && p.itemsPaid.medicine > 0;
                const hasCons = p.itemsPaid && (p.itemsPaid.consultation > 0 || (!p.itemsPaid.consultation && !p.itemsPaid.medicine));
                if (hasMed && hasCons) return getExactPatientAmount(p); // Combined
                if (p.itemsPaid && p.itemsPaid.consultation !== undefined) return Number(p.itemsPaid.consultation);
                return getExactPatientAmount(p);
              })();
          
              const medAmt = Number(p.itemsPaid && p.itemsPaid.medicine ? p.itemsPaid.medicine : 0);
              sum += (consAmt + medAmt);
            });

            // 3. Transactions (Pharmacy)
            const tSnap = await getDocs(collection(db, 'transactions'));
            tSnap.forEach(d => {
              const data = d.data();
              if (data.type !== 'consultation') {
                if (normalizeBranch(data.branchId || data.branchName || data.branch) === targetNormalizedBranch && parseDateMonth(data.timestamp) === monthKey) {
                  sum += Number(data.amount || 0);
                }
              }
            });

            // 4. Medicine Requests (Admin uses createdAt || formDate)
            const mSnap = await getDocs(collection(db, 'medicine_requests'));
            mSnap.forEach(d => {
              const form = d.data();
              if (normalizeBranch(form.branchId || form.branchName || form.branch) === targetNormalizedBranch && parseDateMonth(form.createdAt || form.formDate) === monthKey) {
                sum += Number(form.paymentAmount || form.amountPaid || 0);
              }
            });

            setTargetReached(sum);
          } catch (err) {
            console.error('Error fetching true reached:', err);
          }
        };
        fetchTrueReached();
`;

const updateWeb = () => {
  const file = 'c:/Users/Shaik Ansar/Downloads/sph/SPH-Admin-19-06-2026-main/src/pages/reception/ReceptionDashboard.jsx';
  let content = fs.readFileSync(file, 'utf8');

  const replaceRegex = /\/\/ Dynamically calculate true target reached for the branch[\s\S]*?fetchTrueReached\(\);/g;
  content = content.replace(replaceRegex, getFetchLogic(false).trim());
  fs.writeFileSync(file, content);
};

const updateApp = () => {
  const file = 'c:/Users/Shaik Ansar/Downloads/sph/SPH-staff-app-19-06-2026/src/screens/Dashboard.js';
  let content = fs.readFileSync(file, 'utf8');

  const replaceRegex = /\/\/ Dynamically calculate true target reached for the branch[\s\S]*?fetchTrueReached\(\);/g;
  content = content.replace(replaceRegex, getFetchLogic(true).trim());
  fs.writeFileSync(file, content);
};

updateWeb();
updateApp();
console.log("Updated both dashboards with exact SuperAdmin logic!");
