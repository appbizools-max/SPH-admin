const fs = require('fs');

const oldFile = fs.readFileSync('SuperAdminDashboard_old.jsx', 'utf8');

// Extract the states
const statesMatch = oldFile.match(/const \[revenueSearch[\s\S]*?const \[allTxPerPage[^;]*;/);
const states = statesMatch ? statesMatch[0] : '';

// Extract getExactPatientAmount
const getExactMatch = oldFile.match(/const getExactPatientAmount = [\s\S]*?return 0; \/\/ Removed legacy 600 fallback\r?\n\s*};\r?\n/);
const getExact = getExactMatch ? getExactMatch[0] : '';

// Extract checkAmountRange
const checkAmountMatch = oldFile.match(/const checkAmountRange = [\s\S]*?return false;\r?\n\s*};\r?\n/);
const checkAmount = checkAmountMatch ? checkAmountMatch[0] : '';

// Extract filteredRevenuePatients
const revPatientsMatch = oldFile.match(/const filteredRevenuePatients = patients\.filter\([\s\S]*?return isConsultationPayment;\r?\n\s*}\);\r?\n/);
const revPatients = revPatientsMatch ? revPatientsMatch[0] : '';

// Extract paidPatients and totals
const paidPatientsMatch = oldFile.match(/const paidPatients = filteredRevenuePatients\.filter[\s\S]*?pharmacyTotal \+= Number\(tr\.amount\) \|\| 0;\r?\n\s*}\);\r?\n/);
const paidPatients = paidPatientsMatch ? paidPatientsMatch[0] : '';

// Extract filteredPharmacyTransactions
const pharmMatch = oldFile.match(/const filteredPharmacyTransactions = medicineTransactions\.filter\([\s\S]*?return true;\r?\n\s*}\);\r?\n/);
const pharmTx = pharmMatch ? pharmMatch[0] : '';

// Extract allHistoryTransactions
const allHistMatch = oldFile.match(/const allHistoryTransactions = useMemo\([\s\S]*?\}, \[filteredRevenuePatients, filteredPharmacyTransactions, filteredMedicineForms, patients, revenueAmountRange\]\);\r?\n/);
const allHist = allHistMatch ? allHistMatch[0] : '';

// Extract pagination
const paginationMatch = oldFile.match(/const allTxTotalPages = [\s\S]*?const currentAllTx = allHistoryTransactions\.slice\(indexOfFirstAllTx, indexOfLastAllTx\);\r?\n/);
const pagination = paginationMatch ? paginationMatch[0] : '';

// Extract JSX
const jsxMatch = oldFile.match(/\{activeTab === 'revenue' && \(\r?\n\s*<div className="fade-in">([\s\S]*?)<\/div>\r?\n\s*\)\}/);
const jsx = jsxMatch ? jsxMatch[1] : '';

// Generate TotalRevenue.jsx
const content = `import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  parseAnyDateObj,
  safeDateDisplay,
  isBranchMatchHelper,
  parseHTMLDateToDateObj
} from '../SuperAdminDashboard';

const TotalRevenue = ({ patients, medicineTransactions, filteredMedicineForms = [], branches }) => {

  ${states}

  const getTodayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const handleResetRevenueFilters = () => {
    setRevenueSearch('');
    setRevenueDate('');
    setRevenueYear('all');
    setRevenueMonth('all');
    setRevenueBranchId('all');
    setRevenueSource('all');
    setRevenueMethod('all');
    setRevenueDoctor('all');
    setRevenueSplitType('all');
    setRevenueAmountRange('all');
    setAllTxCurrentPage(1);
  };

  const getUniqueDoctors = () => {
    const docs = new Set();
    patients.forEach(p => {
      if (p.doctorName && p.paymentStatus === 'paid') docs.add(p.doctorName);
    });
    return Array.from(docs).sort();
  };

  ${getExact}
  ${checkAmount}
  ${revPatients}
  ${paidPatients}
  ${pharmTx}
  ${allHist}
  ${pagination}

  const handleExportToExcel = () => {
    if (allHistoryTransactions.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["S.N.O", "Reg ID", "Patient Name", "Phone", "Branch", "Doctor Treated", "Revenue Split", "Source", "Amount", "Method", "Date / Time", "Status"];
    const rows = allHistoryTransactions.map((row, index) => {
      return [
        index + 1,
        row.regId || "N/A",
        row.patientName || "N/A",
        row.phone || "N/A",
        row.branch || "N/A",
        row.doctor || "N/A",
        row.type || "N/A",
        row.source || "N/A",
        row.amount || 0,
        row.method || "N/A",
        row.dateTime || "N/A",
        row.status || "N/A"
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Total_Revenue");
    XLSX.writeFile(workbook, "Total_Revenue.xlsx");
  };

  return (
    <div className="fade-in">
      ${jsx}
    </div>
  );
};

export default TotalRevenue;
`;

fs.writeFileSync('src/pages/revenue/TotalRevenue.jsx', content);
