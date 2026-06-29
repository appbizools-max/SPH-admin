import { useState, useEffect, useRef, useMemo } from 'react';
import { auth, db, storage } from '../../firebase';
import { signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs, getDoc, addDoc, doc, updateDoc, onSnapshot, serverTimestamp, orderBy, limit, startAfter, deleteDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { generateRegistrationId } from '../../utils/idGenerator';
import {
  LogOut, Users, Plus, Upload, X, Eye, EyeOff, FileText, CheckCircle2,
  Clock, Briefcase, Calendar, Phone, Mail, User, BookOpen,
  MapPin, Check, Trash2, Coins, Search, FilePen, Download, Send, ArrowRight, Lock,
  MessageCircle, CalendarClock, Building2, Stethoscope, RefreshCw, CalendarPlus, UserSearch, Megaphone, ChevronDown, Apple,
  ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Info, Maximize2, Video, Folder, FolderOpen, Image as ImageIcon, Clipboard, Target
} from 'lucide-react';
import logo from '../../assets/SPH ADMIN.png';
import { useAuth } from '../../contexts/AuthContext';
import PackageMembers from './PackageMembers';
import ShippingForm from './ShippingForm';
import RewardPointClaim from './RewardPointClaim';
import DailyReportTab from './DailyReportTab';
import ClinicCleaningTab from './ClinicCleaningTab';
// Configure your Razorpay Keys here for direct walk-in payments:
const RAZORPAY_KEY_ID = 'rzp_test_SvVDajnY9Rt7H3';
const RAZORPAY_KEY_SECRET = '29fAlDTfkRnB00t2FKv5GAlK';
// Inverted base64 app icon logo for PDF header
const APP_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAARkAAAEZCAIAAAAscsZAAAAACXBIWXMAABJ0AAASdAHeZh94AAAFXGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTA1LTMxPC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkRhdGE+eyZxdW90O2RvYyZxdW90OzomcXVvdDtEQUhGYUk0MkVhcyZxdW90OywmcXVvdDt1c2VyJnF1b3Q7OiZxdW90O1VBRkhvNTkwX0xVJnF1b3Q7LCZxdW90O2JyYW5kJnF1b3Q7OiZxdW90O0plZXZhbiBSZWRkeSZxdW90O308L0F0dHJpYjpEYXRhPgogICAgIDxBdHRyaWI6RXh0SWQ+ZDg4ZDIxNGUtOWFlYi00YWQ0LWI2ZGQtYjVhMTE5YWVkNmUwPC9BdHRyaWI6RXh0SWQ+CiAgICAgPEF0dHJpYjpGYklkPjUyNTI2NTkxNDE3OTU4MDwvQXR0cmliOkZiSWQ+CiAgICAgPEF0dHJpYjpUb3VjaFR5cGU+MjwvQXR0cmliOlRvdWNoVHlwZT4KICAgIDwvcmRmOmxpPgogICA8L3JkZjpTZXE+CiAgPC9BdHRyaWI6QWRzPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpkYz0naHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8nPgogIDxkYzp0aXRsZT4KICAgPHJkZjpBbHQ+CiAgICA8cmRmOmxpIHhtbDpsYW5nPSd4LWRlZmF1bHQnPkxvY2FsTmVlZHMgJmFtcDtKb2JzIC0gMTA8L3JkZjpsaT4KICAgPC9yZGY6QWx0PgogIDwvZGM6dGl0bGU+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnBkZj0naHR0cDovL25zLmFkb2JlLmNvbS9wZGYvMS4zLyc+CiAgPHBkZjpBdXRob3I+UHJlZXRoYW0gcmFtIEF2YWxhPC9wZGY6QXV0aG9yPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp4bXA9J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8nPgogIDx4bXA6Q3JlYXRvclRvb2w+Q2FudmEgKFJlbmRlcmVyKSBkb2M9REFIRmFJNDJFYXMgdXNlcj1VQUZIbzU5MF9MVSBicmFuZD1KZWV2YW4gUmVkZHk8L3htcDpDcmVhdG9yVG9vbD4KIDwvcmRmOkRlc2NyaXB0aW9uPgo8L3JkZjpSREY+CjwveDp4bXBtZXRhPgo8P3hwYWNrZXQgZW5kPSdyJz8+WkY3+QAAAE5lWElmTU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAAB4AAAAAQAAAHgAAAAByZF2EwAAI0FJREFUeJzt3Xl8FPX9P/DPzOx9Z3dzbO47IYQI4UY5FDxQOby1B62VVq3fb+vXtvpr1fqVeqDWVmtti7RaChUpXhSUinILcsmRkJBArs197ZG9d2dn5vsH/CiFQDKzn83uzr6fD/6APPjMvAN57cx85nMQHMchAEDEyFgXAIBIQJYAwAOyBAAekCUA8IAsAYAHZAkAPCBLAOABWQIAD8gSAHhAlgDAA7IEAB6QJQDwgCwBgAdkCQA8IEsA4AFZAgAPyBIAeECWAMADsgQAHpAlAPCALAGAB2QJADwgSwDgAVkCAA/IEgB4QJYAwAOyBAAekCUA8IAsAYAHZAkAPCBLAOABWQIAD8gSAHhAlgDAA7IEAB6QJQDwgCwBgAdkCQA8IEsA4AFZAgAPyBIAeECWAMADsgQAHpAlAPCALAGAB2QJADwgSwDgAVkCAA/IEgB4QJYAwAOyBAAekCUA8IAsAYAHZAkAPCBLAOABWQIAD8gSAHhAlgDAA7IEAB6QJQDwgCwBgAdkCQA8IEsA4AFZAgAPyBIAeECWAMADsgQAHpAlAPCALAGAB2QJADwgSwDgAVkCAA/IEgB4QJYAwAOyBAAekCUA8IAsAYAHZAkAPCBLAOABWQIAj/8Dby64yJO0J5oAAAAASUVORK5CYII=';

const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

const DEFAULT_MEDICINES = [
  { name: 'NASH sulph', timing: 'morning medicine' },
  { name: 'BOGER phos', timing: 'evening medicine' },
  { name: 'KENT sulph', timing: 'ems medicine' },
  { name: 'SAC LAC', timing: 'drops' },
];

const DOCTOR_BRANCH_MAP = {
  'Dr. Prashanth K Vaidya': ['KPHB', 'Chandnagar', 'Nallagandla'],
  'Dr. CH. Rama Krishna': ['Dilshuknagar', 'Nallagandla'],
  'Dr. Jobedah Parveez': ['Nallagandla', 'KPHB'],
  'Dr. Padma Priya': ['Nallagandla', 'Chandnagar']
};

const DOCTOR_SCHEDULES = {
  'Dr. Prashanth K Vaidya': {
    branches: ['KPHB', 'Chandnagar', 'Nallagandla'],
    timings: [
      { branch: 'KPHB', dayOfWeek: [1, 3, 5, 6], intervals: [['12:30', '14:00'], ['17:00', '19:00']] }, // Mon, Wed, Fri, Sat
      { branch: 'Chandnagar', dayOfWeek: [1, 3, 5, 6], intervals: [['10:00', '12:00'], ['19:30', '21:00']] }, // Mon, Wed, Fri, Sat
      { branch: 'Chandnagar', dayOfWeek: [0], intervals: [['11:00', '13:00']] }, // Sun
      { branch: 'Nallagandla', dayOfWeek: [4], intervals: [['11:00', '13:00'], ['18:00', '20:00']] }, // Thu
      { branch: 'Nallagandla', dayOfWeek: [0], intervals: [['18:00', '20:00']] } // Sun
    ]
  },
  'Dr. CH. Rama Krishna': {
    branches: ['Dilshuknagar', 'Nallagandla'],
    timings: [
      { branch: 'Dilshuknagar', dayOfWeek: [0, 1, 2, 3, 4], intervals: [['10:00', '14:00'], ['17:00', '20:00']] }, // Sun - Thu
      { branch: 'Nallagandla', dayOfWeek: [5, 6], intervals: [['10:00', '20:00']] } // Fri, Sat
    ]
  },
  'Dr. Jobedah Parveez': {
    branches: ['Nallagandla', 'KPHB'],
    timings: [
      { branch: 'Nallagandla', dayOfWeek: [1], intervals: [['11:00', '13:00'], ['18:00', '19:30']] }, // Mon
      { branch: 'KPHB', dayOfWeek: [2, 3, 5], intervals: [['12:30', '14:00']] }, // Tue, Wed, Fri
      { branch: 'KPHB', dayOfWeek: [6], intervals: [['12:30', '14:00'], ['17:00', '19:00']] } // Sat
    ]
  },
  'Dr. Padma Priya': {
    branches: ['Nallagandla', 'Chandnagar'],
    timings: [
      { branch: 'Nallagandla', dayOfWeek: [2, 3], intervals: [['10:00', '20:00']] }, // Tue, Wed
      { branch: 'Nallagandla', dayOfWeek: [0], intervals: [['10:00', '17:00']] }, // Sun
      { branch: 'Chandnagar', dayOfWeek: [1, 5], intervals: [['12:00', '20:00']] }, // Mon, Fri
      { branch: 'Chandnagar', dayOfWeek: [0], intervals: [['17:30', '20:00']] }, // Sun
      { branch: 'Chandnagar', dayOfWeek: [4], intervals: [['10:00', '20:00']] } // Thu
    ]
  }
};

const getDoctorSchedulesAndTimings = (doctorName, doctorObj) => {
  if (doctorObj && doctorObj.timings && Array.isArray(doctorObj.timings) && doctorObj.timings.length > 0) {
    return doctorObj.timings;
  }
  if (!doctorName) return [];
  const cleanName = doctorName.toLowerCase().replace('dr. ', '').replace('dr ', '').trim();
  for (const [key, value] of Object.entries(DOCTOR_SCHEDULES)) {
    if (key.toLowerCase().replace('dr. ', '').replace('dr ', '').trim() === cleanName) {
      return value.timings;
    }
  }
  const defaultBranches = ['KPHB', 'Chandnagar', 'Nallagandla', 'Dilshuknagar'];
  return defaultBranches.map(brName => ({
    branch: brName,
    dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
    intervals: [['10:00', '14:00'], ['17:00', '20:00']]
  }));
};

const normalizeBranchName = (name) => {
  if (!name) return '';
  const str = name.toLowerCase().replace(/\s*branch\s*/i, '').replace(/[^a-z0-9]/g, '').trim();
  if (str.includes('kphb')) return 'kphb';
  if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'chandnagar';
  if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'dilsukhnagar';
  if (str.includes('nallagandla')) return 'nallagandla';
  if (str.includes('madhapur')) return 'madhapur';
  if (str.includes('kukatpally')) return 'kukatpally';
  return str;
};

const generateSlotsForSelected = (doctorName, doctorObj, branchName, dateString) => {
  if (!doctorName || !branchName || !dateString) return [];
  const dateParts = dateString.split('-');
  if (dateParts.length !== 3) return [];
  const date = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
  const day = date.getDay();
  const timings = getDoctorSchedulesAndTimings(doctorName, doctorObj);

  const dayTimings = [];
  (timings || []).forEach(t => {
    if (normalizeBranchName(t.branch) !== normalizeBranchName(branchName)) return;
    if (t.daySchedule) {
      const ivs = t.daySchedule[day] || t.daySchedule[String(day)] || [];
      if (ivs.length > 0) {
        dayTimings.push({ intervals: ivs });
      }
    } else if (t.dayOfWeek && t.dayOfWeek.includes(day)) {
      dayTimings.push({ intervals: t.intervals || [] });
    }
  });

  if (dayTimings.length === 0) return [];
  const slots = [];
  dayTimings.forEach(t => {
    (t.intervals || []).forEach(iv => {
      const startStr = Array.isArray(iv) ? iv[0] : (iv ? iv.start : '');
      const endStr = Array.isArray(iv) ? iv[1] : (iv ? iv.end : '');
      if (!startStr || !endStr) return;
      const [startHour, startMin] = startStr.split(':').map(Number);
      const [endHour, endMin] = endStr.split(':').map(Number);
      let currentHour = startHour;
      let currentMin = startMin;
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const period = currentHour >= 12 ? 'PM' : 'AM';
        const displayHour = currentHour > 12 ? currentHour - 12 : (currentHour === 0 ? 12 : currentHour);
        const formattedTime = `${displayHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')} ${period}`;
        slots.push(formattedTime);
        currentMin += 15;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    });
  });
  return slots;
};

const getDoctorBranches = (doctorName) => {
  if (!doctorName) return [];
  const cleanName = doctorName.toLowerCase().replace('dr. ', '').trim();
  for (const [key, value] of Object.entries(DOCTOR_BRANCH_MAP)) {
    if (key.toLowerCase().replace('dr. ', '').trim() === cleanName) {
      return value;
    }
  }
  return ['KPHB', 'Chandnagar', 'Nallagandla', 'Dilshuknagar']; // Default fallback if not matched
};

const parseTimeStr = (timeStr) => {
  if (!timeStr || timeStr === 'N/A') return 9999;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 9999;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
};

const getCanonicalBranchName = (name) => {
  if (!name) return '';
  const normalized = name.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalized.includes('kphb')) return 'KPHB Branch';
  if (normalized.includes('madhapur')) return 'Madhapur Branch';
  if (normalized.includes('chandnagar') || normalized.includes('chandanagar') || normalized.includes('chanda nagar')) return 'Chandanagar Branch';
  if (normalized.includes('kukatpally')) return 'Kukatpally Branch';
  if (normalized.includes('dilsukhnagar') || normalized.includes('dilshuknagar') || normalized.includes('dsnr')) return 'Dilshuknagar Branch';
  if (normalized.includes('nallagandla')) return 'Nallagandla Branch';
  return name.replace(/\b[a-z]/g, (char) => char.toUpperCase()).replace(/\s+/g, ' ').trim();
};

const getDoctorScheduledDaysAtBranch = (doctor, branchName) => {
  if (!doctor || !branchName || !doctor.timings) return '';

  const daysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const workingDays = new Set();

  const normBranch = branchName.toLowerCase().replace(/\s*branch\s*/i, '').trim();

  doctor.timings.forEach(t => {
    const bName = t.branch || '';
    if (bName.toLowerCase().replace(/\s*branch\s*/i, '').trim() !== normBranch) return;

    if (t.daySchedule) {
      [0, 1, 2, 3, 4, 5, 6].forEach(d => {
        const ivs = t.daySchedule[d] || t.daySchedule[String(d)] || [];
        if (ivs.length > 0) {
          workingDays.add(d);
        }
      });
    } else if (t.dayOfWeek) {
      t.dayOfWeek.forEach(d => {
        if (t.intervals && t.intervals.length > 0) {
          workingDays.add(d);
        }
      });
    }
  });

  if (workingDays.size === 0) return 'No scheduled days at this branch';

  return Array.from(workingDays)
    .sort((a, b) => a - b)
    .map(d => daysOfWeekNames[d])
    .join(', ');
};

const isDoctorScheduledAtBranchOnDate = (doctor, branchName, dateObj) => {
  if (!doctor || !branchName || !dateObj || !doctor.timings) return false;
  const day = dateObj.getDay();
  const normBranch = branchName.toLowerCase().replace(/\s*branch\s*/i, '').trim();

  let worksOnDay = false;
  doctor.timings.forEach(t => {
    const bName = t.branch || '';
    if (bName.toLowerCase().replace(/\s*branch\s*/i, '').trim() !== normBranch) return;

    if (t.daySchedule) {
      const ivs = t.daySchedule[day] || t.daySchedule[String(day)] || [];
      if (ivs.length > 0) {
        worksOnDay = true;
      }
    } else if (t.dayOfWeek && t.dayOfWeek.includes(day)) {
      if (t.intervals && t.intervals.length > 0) {
        worksOnDay = true;
      }
    }
  });
  return worksOnDay;
};

const isSlotBlockedByNoShow = (slotTimeStr, dateString, noShows) => {
  if (!noShows || noShows.length === 0) return false;

  const parseTimeToMinutes = (timeStr) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const slotMin = parseTimeToMinutes(slotTimeStr);

  for (const ns of noShows) {
    if (ns.type === 'date_range') {
      if (dateString < ns.startDate || dateString > ns.endDate) {
        continue;
      }
    } else {
      if (ns.date !== dateString) {
        continue;
      }
    }

    if (ns.type === 'session') {
      if (ns.session === 'all') {
        return true;
      }
      if (ns.session === 'morning') {
        if (slotMin < 840) return true; // before 2:00 PM
      }
      if (ns.session === 'evening') {
        if (slotMin >= 840) return true; // after 2:00 PM
      }
    } else if (ns.type === 'time_range') {
      const parse24hToMinutes = (tStr) => {
        if (!tStr) return 0;
        const parts = tStr.split(':');
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      };
      const nsStart = parse24hToMinutes(ns.startTime);
      const nsEnd = parse24hToMinutes(ns.endTime);
      if (slotMin >= nsStart && slotMin < nsEnd) {
        return true;
      }
    } else {
      // type === 'date'
      return true;
    }
  }

  return false;
};

const doctorWorksAtBranch = (doctor, userData) => {
  if (!userData) return false;
  if (userData.role === 'admin' || userData.role === 'superadmin') return true;

  const uBranchId = userData.branchId || '';
  const uBranchName = userData.branchName || '';

  const normalizeBranch = (branch) => {
    if (!branch) return '';
    const str = branch.toLowerCase().trim();
    if (str.includes('kphb')) return 'kphb';
    if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'chandnagar';
    if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'dilshuknagar';
    if (str.includes('nallagandla')) return 'nallagandla';
    return str.replace(/\s*branch\s*/i, '').trim();
  };

  const normUserId = normalizeBranch(uBranchId);
  const normUserName = normalizeBranch(uBranchName);

  // Check branchName/branchId in doctor document
  const dBranchId = doctor.branchId || '';
  const dBranchName = doctor.branchName || '';

  if (dBranchId && (normalizeBranch(dBranchId) === normUserId || normalizeBranch(dBranchId) === normUserName)) return true;
  if (dBranchName && (normalizeBranch(dBranchName) === normUserId || normalizeBranch(dBranchName) === normUserName)) return true;

  // Check in doctor.timings
  if (doctor.timings && Array.isArray(doctor.timings)) {
    const works = doctor.timings.some(t => {
      const normB = normalizeBranch(t.branch);
      return normB === normUserId || normB === normUserName;
    });
    if (works) return true;
  }

  // Check in doctor.branches
  if (doctor.branches && Array.isArray(doctor.branches)) {
    const works = doctor.branches.some(b => {
      const normB = normalizeBranch(b);
      return normB === normUserId || normB === normUserName;
    });
    if (works) return true;
  }

  // Check hardcoded schedule lookup
  const cleanDocName = (doctor.name || '').toLowerCase().replace('dr. ', '').replace('dr ', '').trim();
  for (const [key, value] of Object.entries(DOCTOR_SCHEDULES)) {
    const cleanKey = key.toLowerCase().replace('dr. ', '').replace('dr ', '').trim();
    if (cleanKey === cleanDocName) {
      if (value.branches && Array.isArray(value.branches)) {
        const works = value.branches.some(b => {
          const normB = normalizeBranch(b);
          return normB === normUserId || normB === normUserName;
        });
        if (works) return true;
      }
    }
  }

  return false;
};

const CustomSelect = ({ value, onChange, options, disabled, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, height: '100%' }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '100%', cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '0 0 0 10px', fontSize: '0.85rem', color: disabled ? '#94a3b8' : 'var(--text-main)',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? options.find(o => o.value === value)?.label || value : placeholder}
        </span>
        <ChevronDown size={14} color="var(--text-muted)" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto',
          padding: '6px'
        }}>
          {options.map((opt, i) => (
            <div
              key={i}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{
                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.85rem', color: 'var(--text-main)',
                backgroundColor: value === opt.value ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                transition: 'background-color 0.2s',
                fontWeight: value === opt.value ? '600' : '400'
              }}
              onMouseEnter={(e) => { if (value !== opt.value) e.currentTarget.style.backgroundColor = '#f8fafc' }}
              onMouseLeave={(e) => { if (value !== opt.value) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const normalizeDateToYYYYMMDD = (dateStr) => {
  if (!dateStr) return '';

  // If it's a Firestore timestamp
  if (dateStr.seconds) {
    const d = new Date(dateStr.seconds * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  if (typeof dateStr !== 'string') {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch (e) { }
    return '';
  }

  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY -> YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return dateStr; // already YYYY-MM-DD
      } else {
        // DD-MM-YYYY -> YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) { }
  return dateStr;
};

const ReceptionDashboard = () => {
  const { userData } = useAuth();

  const sendPushNotification = async (userId, title, body, type = 'general') => {
    if (!userId) return;
    try {
      const userSnap = await getDoc(doc(db, 'allpatients', userId));
      if (userSnap.exists()) {
        const token = userSnap.data().expoPushToken;
        if (token) {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: token,
              sound: 'default',
              title,
              body,
              data: { type },
            }),
          });
          console.log(`[push] Sent push notification to user ${userId}`);
        }
      }
    } catch (err) {
      console.warn('[push] Error sending push notification:', err);
    }
  };

  const normalizeBranch = (branch) => {
    if (!branch) return '';
    const str = branch.toLowerCase().trim();
    if (str.includes('kphb')) return 'kphb';
    if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'chandnagar';
    if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'dilshuknagar';
    if (str.includes('nallagandla')) return 'nallagandla';
    return str.replace(/\s*branch\s*/i, '').trim();
  };

  const matchBranch = (item) => {
    if (!userData) return false;
    if (userData.role === 'admin' || userData.role === 'superadmin') return true;

    const uBranchId = userData.branchId || '';
    const uBranchName = userData.branchName || '';

    if (uBranchId || uBranchName) {
      if (!item) return false;
      const iBranchId = item.branchId || item.raw?.branchId || '';
      const iBranchName = item.branchName || item.raw?.branchName || '';

      // If the patient record has NO branch data at all, allow access (older/walk-in records)
      if (!iBranchId && !iBranchName) return true;

      const normVal = normalizeBranch(iBranchId);
      const normName = normalizeBranch(iBranchName);
      const normUserId = normalizeBranch(uBranchId);
      const normUserName = normalizeBranch(uBranchName);

      if (normUserId && (normVal === normUserId || normName === normUserId)) return true;
      if (normUserName && (normVal === normUserName || normName === normUserName)) return true;

      if (iBranchId && (iBranchId === uBranchId || iBranchId === uBranchName)) return true;
      if (iBranchName && (iBranchName === uBranchName || iBranchName === uBranchId)) return true;

      return false;
    }
    return true;
  };

  const getBranchNamesList = (branchId, branchName) => {
    const branchVariations = new Set();
    const checkAndAdd = (val) => {
      if (!val) return;
      const lower = val.toLowerCase().trim();
      branchVariations.add(val);
      branchVariations.add(lower);
      branchVariations.add(val.toUpperCase());
      if (lower.includes('kphb')) {
        branchVariations.add('KPHB');
        branchVariations.add('KPHB Branch');
        branchVariations.add('Kphb');
        branchVariations.add('kphb');
      } else if (lower.includes('chnr') || lower.includes('chandanagar') || lower.includes('chandnagar')) {
        branchVariations.add('Chandnagar');
        branchVariations.add('Chandnagar Branch');
        branchVariations.add('Chandanagar');
        branchVariations.add('Chandnagar');
        branchVariations.add('CHANDNAGAR');
      } else if (lower.includes('dsnr') || lower.includes('dilsukhnagar') || lower.includes('dilshuknagar')) {
        branchVariations.add('Dilshuknagar');
        branchVariations.add('Dilshuknagar Branch');
        branchVariations.add('Dilsukhnagar');
      } else if (lower.includes('nallagandla')) {
        branchVariations.add('Nallagandla');
        branchVariations.add('Nallagandla Branch');
      }
    };
    checkAndAdd(branchId);
    checkAndAdd(branchName);
    return Array.from(branchVariations);
  };

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('receptionActiveTab') || 'dashboard';
  }); // dashboard, patients, register, requests, billing, followups

  useEffect(() => {
    localStorage.setItem('receptionActiveTab', activeTab);
  }, [activeTab]);
  const [billingSubTab, setBillingSubTab] = useState('general'); // general, nutrition
  const [nutritionPlans, setNutritionPlans] = useState([]);
  const [showNutritionEditModal, setShowNutritionEditModal] = useState(false);
  const [selectedNutritionPlan, setSelectedNutritionPlan] = useState(null);
  const [showNutritionPayModal, setShowNutritionPayModal] = useState(false);
  const [selectedNutritionPayPlan, setSelectedNutritionPayPlan] = useState(null);

  // Nutrition edit fields
  const [editNutritionAge, setEditNutritionAge] = useState('');
  const [editNutritionHeight, setEditNutritionHeight] = useState('');
  const [editNutritionWeight, setEditNutritionWeight] = useState('');
  const [editNutritionBmi, setEditNutritionBmi] = useState(0);
  const [editNutritionAmount, setEditNutritionAmount] = useState('500');
  const [editNutritionDeficiencies, setEditNutritionDeficiencies] = useState([]);
  const [editNutritionDisorders, setEditNutritionDisorders] = useState([]);
  const [editNutritionOtherDiseases, setEditNutritionOtherDiseases] = useState('');
  const [editNutritionSymptoms, setEditNutritionSymptoms] = useState('');
  const [editNutritionAvoid, setEditNutritionAvoid] = useState('');
  const [editNutritionEat, setEditNutritionEat] = useState('');
  const [editNutritionMeals, setEditNutritionMeals] = useState([]);
  const [isEditingMealsModalOpen, setIsEditingMealsModalOpen] = useState(false);
  const [savingNutritionEdit, setSavingNutritionEdit] = useState(false);

  const [pendingAmountRequest, setPendingAmountRequest] = useState(null);
  const [proposedNewAmount, setProposedNewAmount] = useState('');
  const [amountRequestReason, setAmountRequestReason] = useState('');
  const [isSubmittingAmountRequest, setIsSubmittingAmountRequest] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);


  const [activePackageMap, setActivePackageMap] = useState(new Map());

  // States for Reception Nutrition View
  const [activeTabNutritionPlan, setActiveTabNutritionPlan] = useState('add');
  const [selectedViewPlan, setSelectedViewPlan] = useState(null);

  const [draggedItem, setDraggedItem] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const toggleSidebar = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalTitle, setStatusModalTitle] = useState('');
  const [statusModalPatients, setStatusModalPatients] = useState([]);
  const [patients, setPatients] = useState([]);
  const [monthlyTarget, setMonthlyTarget] = useState(null);
  const [targetReached, setTargetReached] = useState(0);
  const [patientsCurrentPage, setPatientsCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [noShows, setNoShows] = useState([]);
  const [noShowForm, setNoShowForm] = useState({
    doctorId: '',
    type: 'date',
    date: '',
    startDate: '',
    endDate: '',
    session: 'all',
    startTime: '',
    endTime: '',
    reason: ''
  });
  const [noShowDateWarning, setNoShowDateWarning] = useState('');
  const [patientsList, setPatientsList] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [patientsPerPage, setPatientsPerPage] = useState(25);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageCursors = useRef({ 1: null });

  const [patientsSubTab, setPatientsSubTab] = useState('completed'); // 'completed' | 'all'
  const [completedWalkins, setCompletedWalkins] = useState([]);

  const completedHistoryList = useMemo(() => {
    const localToday = new Date();
    const yyyy = localToday.getFullYear();
    const mm = String(localToday.getMonth() + 1).padStart(2, '0');
    const dd = String(localToday.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const yesterdayObj = new Date(localToday.getTime() - 24 * 60 * 60 * 1000);
    const yyyyYest = yesterdayObj.getFullYear();
    const mmYest = String(yesterdayObj.getMonth() + 1).padStart(2, '0');
    const ddYest = String(yesterdayObj.getDate()).padStart(2, '0');
    const yesterdayStr = `${yyyyYest}-${mmYest}-${ddYest}`;

    const list = [];

    // 1. Process completed walk-ins
    completedWalkins.forEach(p => {
      if (!matchBranch(p)) return;
      const statusLower = (p.status || '').toLowerCase();
      if (!(statusLower === 'done' || (statusLower === 'completed' && p.paymentStatus === 'paid'))) return;
      const pDateStr = normalizeDateToYYYYMMDD(p.appointmentDate || p.date || p.createdAt);
      if (pDateStr === todayStr || pDateStr === yesterdayStr) {
        list.push({
          id: p.id,
          source: 'allpatients',
          fullName: p.fullName || p.patientName || p.name || 'Unknown Patient',
          phone: p.phone || p.patientPhone || p.phoneNumber || p.contactNumber || 'N/A',
          email: p.email || '',
          date: pDateStr,
          timeSlot: p.appointmentTime || p.timeSlot || 'N/A',
          doctor: p.doctor || p.doctorName || p.assignDoctor || 'N/A',
          complaint: p.complaint || p.subject || p.symptoms || 'N/A',
          status: p.status, // 'completed' or 'done'
          registrationId: p.registrationId || p.regId || p.regID || 'N/A',
          raw: p
        });
      }
    });

    // 2. Process completed records from allpatients (covers both walk-ins and online bookings)
    // The appointments collection is no longer used — all records are unified in allpatients


    // Sort chronologically (most recent first)
    return list.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      const timeA = a.raw?.createdAt?.toDate ? a.raw.createdAt.toDate().getTime() : (a.raw?.createdAt ? new Date(a.raw.createdAt).getTime() : 0);
      const timeB = b.raw?.createdAt?.toDate ? b.raw.createdAt.toDate().getTime() : (b.raw?.createdAt ? new Date(b.raw.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  }, [completedWalkins, appointments, userData]);

  // Lightbox States
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [lightboxImages, setLightboxImages] = useState([]);

  useEffect(() => {
    setPatientsCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!userData?.branchId || userData?.role !== 'receptionist') return;

    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const targetsRef = collection(db, 'monthly_targets');
    const qTarget = query(targetsRef, where('month', '==', monthKey), where('branchId', '==', userData.branchId));

    let u1, u2, u3, u4;

    const unsubscribeTarget = onSnapshot(qTarget, (snapshot) => {
      if (!snapshot.empty) {
        setMonthlyTarget(snapshot.docs[0].data().target);
        const branchId = userData.branchId;
        const branchName = snapshot.docs[0].data().branchName;

        // Start dynamic Grand Total calculation identical to Admin
        const parseD = (raw) => {
          if (!raw) return null;
          if (raw.toDate) return raw.toDate();
          if (raw.seconds) return new Date(raw.seconds * 1000);
          if (typeof raw === 'string') {
            const parts = raw.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
              }
            }
          }
          const d = new Date(raw); return isNaN(d.getTime()) ? null : d;
        };
        const matchesYM = (dateVal) => {
          const d = parseD(dateVal);
          if (!d) return false;
          return d.getFullYear() === year && (d.getMonth() + 1) === month;
        };
        const isBranchMatchHelper = (itemBranchId, itemBranchName) => {
          if (!branchId || branchId === 'all') return true;
          const normalize = (val) => {
            if (!val) return '';
            const str = val.toLowerCase().trim();
            if (str.includes('kphb')) return 'kphb';
            if (str.includes('chnr') || str.includes('chandanagar') || str.includes('chandnagar')) return 'chandnagar';
            if (str.includes('dsnr') || str.includes('dilsukhnagar') || str.includes('dilshuknagar')) return 'dilshuknagar';
            if (str.includes('nallagandla')) return 'nallagandla';
            return str.replace(/\s*branch\s*/i, '').trim();
          };
          const n1 = normalize(itemBranchId);
          const n2 = normalize(itemBranchName);
          const n3 = normalize(branchId);
          const n4 = normalize(branchName);
          return n1 === n3 || n1 === n4 || n2 === n3 || n2 === n4 || itemBranchId === branchId || itemBranchName === branchName;
        };
        const getExactAmt = (p) => {
          if (p.paymentAmount !== undefined && p.paymentAmount !== null && p.paymentAmount !== '') return Number(p.paymentAmount);
          if (p.amountPaid !== undefined && p.amountPaid !== null && p.amountPaid !== '') return Number(p.amountPaid);
          if (p.itemsPaid?.consultation !== undefined) return Number(p.itemsPaid.consultation);
          return 0;
        };

        let txs = [];
        const recalc = () => {
          let total = 0;

          txs.forEach(t => {
            if (isBranchMatchHelper(t.branchId, t.branchName || t.branch) && matchesYM(t.timestamp || t.createdAt)) {
              const tType = (t.type || '').toLowerCase();
              if (tType === 'consultation' || tType === 'medicine' || tType === 'nutrition' || tType === 'diet') {
                total += (Number(t.amount) || 0);
              }
            }
          });

          setTargetReached(total);
        };

        u3 = onSnapshot(collection(db, 'alltransactions'), s => { txs = s.docs.map(d => ({ id: d.id, ...d.data() })); recalc(); });

      } else {
        setMonthlyTarget(null);
        setTargetReached(0);
      }
    });

    return () => {
      unsubscribeTarget();
      if (u3) u3();
    };
  }, [userData?.branchId, userData?.role]);

  useEffect(() => {
    if (!showNutritionEditModal) return;
    const h = parseFloat(editNutritionHeight) / 100;
    const w = parseFloat(editNutritionWeight);
    if (h > 0 && w > 0) {
      setEditNutritionBmi((w / (h * h)).toFixed(1));
    } else {
      setEditNutritionBmi(0);
    }
  }, [editNutritionHeight, editNutritionWeight, showNutritionEditModal]);

  useEffect(() => {
    if (!showNutritionEditModal) return;
    let avoid = [];
    let eat = [];

    if (editNutritionDisorders.includes("Sugar (Diabetes)")) {
      avoid.push("Refined sugar, sweets, white bread, white rice, potatoes, sweet fruits (mango, sapota, banana).");
      eat.push("Bitter gourd (Karela), fenugreek (Methi) seeds, cinnamon, jamun, raw vegetables, millets, brown rice.");
    }
    if (editNutritionDisorders.includes("High BP (Hypertension)")) {
      avoid.push("High-salt foods, pickles, papad, processed cheese, bakery items, canned food, salted chips.");
      eat.push("Coconut water, bananas, leafy green vegetables, garlic, watermelon, skimmed milk, low-sodium meals.");
    }
    if (editNutritionDisorders.includes("Thyroid")) {
      avoid.push("Raw cabbage, raw cauliflower, raw broccoli, raw soy nuggets, raw tofu.");
      eat.push("Cooked vegetables, iodine-rich foods, zinc-rich foods.");
    }

    if (editNutritionDeficiencies.includes("Iron")) {
      eat.push("Iron-rich: Palak, beetroot, pomegranate, dates, sesame seeds, lentils, green leafy vegetables.");
    }
    if (editNutritionDeficiencies.includes("Calcium")) {
      eat.push("Calcium-rich: Ragi, milk, yogurt, paneer, tofu, almonds, sesame seeds.");
    }
    if (editNutritionDeficiencies.includes("Vitamin D")) {
      eat.push("Vitamin D-rich: Mushrooms, egg yolks, fortified milk, cheese.");
    }
    if (editNutritionDeficiencies.includes("Vitamin C")) {
      eat.push("Vitamin C-rich: Amla, oranges, lemons, sweet lime, guavas, bell peppers.");
    }

    setEditNutritionAvoid(avoid.join("\n"));
    setEditNutritionEat(eat.join("\n"));
  }, [editNutritionDisorders, editNutritionDeficiencies, showNutritionEditModal]);

  // Date/Status Filter States for Dashboard
  const getTodayString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState(getTodayString());


  // Consultation UI States (Transplanted from DoctorDashboard)
  const [consultationSubTab, setConsultationSubTab] = useState('clinical');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [doctorMedicineFee, setDoctorMedicineFee] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', type: 'Tablet', timing: '1-0-1' });
  const [prescriptionFiles, setPrescriptionFiles] = useState([]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpInterval, setFollowUpInterval] = useState('No Follow-up');
  const [submittingConsultation, setSubmittingConsultation] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const [nutritionPatient, setNutritionPatient] = useState(null);
  const [nutritionAge, setNutritionAge] = useState('');
  const [nutritionHeight, setNutritionHeight] = useState('');
  const [nutritionWeight, setNutritionWeight] = useState('');
  const [nutritionBmi, setNutritionBmi] = useState(0);
  const [nutritionAmount, setNutritionAmount] = useState('500');
  const [nutritionPaymentStatus, setNutritionPaymentStatus] = useState('pending');
  const [isDietPlanEditable, setIsDietPlanEditable] = useState(true);
  const [dietGrid, setDietGrid] = useState([]);
  const [mealEntries, setMealEntries] = useState([]);
  const [savingDietPlan, setSavingDietPlan] = useState(false);
  const [nutritionDeficiencies, setNutritionDeficiencies] = useState([]);
  const [nutritionDisorders, setNutritionDisorders] = useState([]);
  const [nutritionOtherDiseases, setNutritionOtherDiseases] = useState('');
  const [nutritionSymptoms, setNutritionSymptoms] = useState('');
  const [nutritionAvoid, setNutritionAvoid] = useState('');
  const [nutritionEat, setNutritionEat] = useState('');
  const [nutritionMeals, setNutritionMeals] = useState([]);
  const [submittingNutrition, setSubmittingNutrition] = useState(false);


  // Package registration states
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [newPackageAmount, setNewPackageAmount] = useState('');
  const [newPackageStartDate, setNewPackageStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPackageEndDate, setNewPackageEndDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  );
  const [savingPackage, setSavingPackage] = useState(false);
  const [patientPackage, setPatientPackage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('upcoming');

  // Reschedule Modal States
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleBranch, setRescheduleBranch] = useState('');
  const [rescheduleDoctor, setRescheduleDoctor] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  // Patient File Modal States
  const [selectedPatientFile, setSelectedPatientFile] = useState(null);
  const [showPatientFileModal, setShowPatientFileModal] = useState(false);
  const [patientFileHistory, setPatientFileHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingFile, setUpdatingFile] = useState(false);
  const [editedComplaint, setEditedComplaint] = useState('');
  const [patientFileNutritionPlans, setPatientFileNutritionPlans] = useState([]);
  const [loadingNutritionPlans, setLoadingNutritionPlans] = useState(false);

  // Digital Prescription States for Receptionist editing in active session
  const [rxNotes, setRxNotes] = useState('');
  const [rxMedicines, setRxMedicines] = useState([]);
  const [rxFollowUpInterval, setRxFollowUpInterval] = useState('15 days');
  const [rxFollowUpDate, setRxFollowUpDate] = useState('');
  const [rxSubmitting, setRxSubmitting] = useState(false);

  // Package creation inputs
  const [newPkgAmountWeb, setNewPkgAmountWeb] = useState('');
  const [newPkgStartDateWeb, setNewPkgStartDateWeb] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPkgEndDateWeb, setNewPkgEndDateWeb] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [savingPkgWeb, setSavingPkgWeb] = useState(false);

  // Shared Media States
  const [mediaFolders, setMediaFolders] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [selectedFolderWeb, setSelectedFolderWeb] = useState(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [mediaTitleInput, setMediaTitleInput] = useState('');
  const [uploadingFileWeb, setUploadingFileWeb] = useState(false);
  const [uploadProgressWeb, setUploadProgressWeb] = useState('');
  const [patientSharedItems, setPatientSharedItems] = useState([]);
  const [patientPrivateFolders, setPatientPrivateFolders] = useState([]);
  const [expandedWebFolder, setExpandedWebFolder] = useState(null);
  const [showWebShareModal, setShowWebShareModal] = useState(false);

  // Subscribe to media folders and items globally
  useEffect(() => {
    const unsubFolders = onSnapshot(collection(db, 'media_folders'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setMediaFolders(list);
    });

    const unsubItems = onSnapshot(collection(db, 'media_items'), (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setMediaItems(list);
    });

    return () => {
      unsubFolders();
      unsubItems();
    };
  }, []);

  // Subscribe to patient-specific media
  useEffect(() => {
    if (!selectedPatientFile || !selectedPatientFile.phone) {
      setPatientSharedItems([]);
      setPatientPrivateFolders([]);
      return;
    }
    const cleanPhone = selectedPatientFile.phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return;

    const qShared = query(collection(db, 'shared_media'), where('patientPhone', '==', cleanPhone));
    const unsubShared = onSnapshot(qShared, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPatientSharedItems(list);
    });

    const qFolders = query(collection(db, 'media_folders'), where('patientPhone', '==', cleanPhone));
    const unsubFolders = onSnapshot(qFolders, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPatientPrivateFolders(list);
    });

    return () => {
      unsubShared();
      unsubFolders();
    };
  }, [selectedPatientFile]);

  // Shared Media Web Helper Actions
  const handleCreatePrivateFolderWeb = async () => {
    const name = window.prompt("Enter name for patient private folder:");
    if (!name || !selectedPatientFile?.phone) return;
    const cleanPhone = selectedPatientFile.phone.replace(/\D/g, '').slice(-10);
    try {
      const folderDoc = await addDoc(collection(db, 'media_folders'), {
        name: name.trim(),
        patientPhone: cleanPhone,
        createdAt: serverTimestamp(),
        createdBy: 'Web Receptionist'
      });
      await addDoc(collection(db, 'shared_media'), {
        patientPhone: cleanPhone,
        type: 'folder',
        folderId: folderDoc.id,
        sharedAt: serverTimestamp()
      });
      alert('Private folder created.');
    } catch (err) {
      console.error(err);
      alert('Failed to create folder.');
    }
  };

  const handleWebPatientUpload = async (e, folderId) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFileWeb(true);
    setUploadProgressWeb('Uploading media to storage...');
    try {
      const storagePath = `media_library/${folderId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'media_items'), {
        folderId: folderId,
        title: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        url: downloadUrl,
        storagePath: storagePath,
        createdAt: serverTimestamp(),
        sharedWithApp: false
      });
      alert('Uploaded successfully.');
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setUploadingFileWeb(false);
      setUploadProgressWeb('');
    }
  };

  const handleDeletePatientFolderWeb = async (folderId, isGlobalShared, folderName) => {
    if (isGlobalShared) {
      if (!window.confirm(`Stop sharing "${folderName}" with this patient?`)) return;
      try {
        const cleanPhone = selectedPatientFile.phone.replace(/\D/g, '').slice(-10);
        const q = query(
          collection(db, 'shared_media'),
          where('patientPhone', '==', cleanPhone),
          where('folderId', '==', folderId),
          where('type', '==', 'folder')
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'shared_media', d.id));
        }
        alert('Folder unshared.');
      } catch (err) {
        console.error(err);
      }
    } else {
      if (!window.confirm(`Delete "${folderName}" and all of its files from database/storage?`)) return;
      try {
        // delete items
        const qItems = query(collection(db, 'media_items'), where('folderId', '==', folderId));
        const snapItems = await getDocs(qItems);
        for (const docSnap of snapItems.docs) {
          await deleteDoc(doc(db, 'media_items', docSnap.id));
        }
        // delete shared link
        const cleanPhone = selectedPatientFile.phone.replace(/\D/g, '').slice(-10);
        const qShared = query(
          collection(db, 'shared_media'),
          where('patientPhone', '==', cleanPhone),
          where('folderId', '==', folderId)
        );
        const snapShared = await getDocs(qShared);
        for (const d of snapShared.docs) {
          await deleteDoc(doc(db, 'shared_media', d.id));
        }
        await deleteDoc(doc(db, 'media_folders', folderId));
        alert('Private folder deleted.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleShareGlobalMediaWeb = async (type, targetId) => {
    if (!selectedPatientFile?.phone) return;
    const cleanPhone = selectedPatientFile.phone.replace(/\D/g, '').slice(-10);
    try {
      const q = query(
        collection(db, 'shared_media'),
        where('patientPhone', '==', cleanPhone),
        where(type === 'folder' ? 'folderId' : 'itemId', '==', targetId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert('Already shared.');
        return;
      }

      await addDoc(collection(db, 'shared_media'), {
        patientPhone: cleanPhone,
        type: type,
        ...(type === 'folder' ? { folderId: targetId } : { itemId: targetId }),
        sharedAt: serverTimestamp()
      });
      alert('Shared successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  const unshareGlobalMediaWeb = async (type, targetId) => {
    if (!selectedPatientFile?.phone) return;
    const cleanPhone = selectedPatientFile.phone.replace(/\D/g, '').slice(-10);
    try {
      const q = query(
        collection(db, 'shared_media'),
        where('patientPhone', '==', cleanPhone),
        where(type === 'folder' ? 'folderId' : 'itemId', '==', targetId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'shared_media', d.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePatientItemWeb = async (item, isGlobalShared) => {
    if (isGlobalShared) {
      if (!window.confirm("Unshare this video from the patient?")) return;
      try {
        const cleanPhone = selectedPatientFile.phone.replace(/\D/g, '').slice(-10);
        const q = query(
          collection(db, 'shared_media'),
          where('patientPhone', '==', cleanPhone),
          where('itemId', '==', item.id)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'shared_media', d.id));
        }
        alert('Video unshared.');
      } catch (err) {
        console.error(err);
      }
    } else {
      if (!window.confirm("Delete this private media file completely?")) return;
      try {
        await deleteDoc(doc(db, 'media_items', item.id));
        alert('Video deleted.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleItemShareWeb = async (item) => {
    try {
      const nextVal = !item.sharedWithApp;
      await updateDoc(doc(db, 'media_items', item.id), {
        sharedWithApp: nextVal
      });
    } catch (err) {
      console.error("Error toggling item share status:", err);
    }
  };



  const getMonthOptionsWeb = () => {
    const options = [];
    const today = new Date();
    // 6 months back, current, 6 months forward
    for (let i = -6; i <= 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${monthNum}`, label });
    }
    return options;
  };

  // Registration Form State
  const [patientForm, setPatientForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: 'Instagram',
    modeOfConsultation: 'In-Clinic',
    subject: '',
    doctor: '',
    branch: '',
    appointmentDate: '',
    appointmentTime: '10:00 AM',
    patientId: '',
    registrationId: ''
  });

  // Default branch based on user role or data
  useEffect(() => {
    if (userData && !patientForm.branch) {
      setPatientForm(prev => ({
        ...prev,
        branch: userData.branchName || userData.branchId || 'KPHB'
      }));
    }
  }, [userData]);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const [bookedPatientInfo, setBookedPatientInfo] = useState(null);

  const resetPatientForm = () => {
    const defaultBranch = userData?.branchName || userData?.branchId || '';
    let defaultDoctor = '';
    if (defaultBranch && doctors.length > 0) {
      const availableDoctors = doctors.filter(d => {
        let dBranches = getDoctorBranches(d.name) ? [...getDoctorBranches(d.name)] : [];
        if (d.timings && Array.isArray(d.timings)) d.timings.forEach(t => { if (t.branch) dBranches.push(t.branch) });
        if (d.branches && Array.isArray(d.branches)) d.branches.forEach(b => { if (b) dBranches.push(b) });
        if (d.branchName) dBranches.push(d.branchName);
        if (d.branchId) dBranches.push(d.branchId);
        return dBranches.some(b => normalizeBranch(b) === normalizeBranch(defaultBranch));
      });
      if (availableDoctors.length === 1) {
        defaultDoctor = availableDoctors[0].name;
      }
    }
    setPatientForm({
      fullName: '', phone: '', email: '', source: 'Instagram', modeOfConsultation: 'In-Clinic', subject: '',
      doctor: defaultDoctor, branch: defaultBranch, appointmentDate: '', appointmentTime: '', patientId: '', registrationId: ''
    });
  };



  const getThirtyDaysLaterString = () => {
    const y = new Date().getFullYear();
    return `${y}-12-31`;
  };

  // Adjust date to first available day when doctor or branch changes
  useEffect(() => {
    if (patientForm.doctor && patientForm.branch) {
      const docObj = doctors.find(d => d.name === patientForm.doctor);
      if (docObj) {
        const checkDate = patientForm.appointmentDate ? new Date(patientForm.appointmentDate) : new Date();
        const works = isDoctorScheduledAtBranchOnDate(docObj, patientForm.branch, checkDate);
        if (!works) {
          const start = new Date();
          let foundDate = null;
          for (let i = 0; i < 30; i++) {
            const dObj = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            if (isDoctorScheduledAtBranchOnDate(docObj, patientForm.branch, dObj)) {
              const y = dObj.getFullYear();
              const m = String(dObj.getMonth() + 1).padStart(2, '0');
              const d = String(dObj.getDate()).padStart(2, '0');
              foundDate = `${y}-${m}-${d}`;
              break;
            }
          }
          if (foundDate) {
            setPatientForm(prev => ({ ...prev, appointmentDate: foundDate, appointmentTime: '' }));
          }
        }
      }
    }
  }, [patientForm.doctor, patientForm.branch, doctors]);

  // Adjust reschedule date to first available day when rescheduleDoctor or rescheduleBranch changes
  useEffect(() => {
    if (rescheduleDoctor && rescheduleBranch) {
      const docObj = doctors.find(d => d.name === rescheduleDoctor);
      if (docObj) {
        const checkDate = rescheduleDate ? new Date(rescheduleDate) : new Date();
        const works = isDoctorScheduledAtBranchOnDate(docObj, rescheduleBranch, checkDate);
        if (!works) {
          const start = new Date();
          let foundDate = null;
          for (let i = 0; i < 30; i++) {
            const dObj = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            if (isDoctorScheduledAtBranchOnDate(docObj, rescheduleBranch, dObj)) {
              const y = dObj.getFullYear();
              const m = String(dObj.getMonth() + 1).padStart(2, '0');
              const d = String(dObj.getDate()).padStart(2, '0');
              foundDate = `${y}-${m}-${d}`;
              break;
            }
          }
          if (foundDate) {
            setRescheduleDate(foundDate);
            setRescheduleTime('');
          }
        }
      }
    }
  }, [rescheduleDoctor, rescheduleBranch, doctors]);

  useEffect(() => {
    if (!patientForm.doctor || !patientForm.branch || !patientForm.appointmentDate) {
      setAvailableSlots([]);
      return;
    }

    setFetchingSlots(true);
    let unsubAppointments = null;

    const setupRealtimeSlots = async () => {
      try {
        const dateString = patientForm.appointmentDate;
        const docObj = doctors.find(d => d.name === patientForm.doctor);
        const doctorId = docObj?.id || patientForm.doctor;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        const isSelectedDateToday = dateString === todayString;
        const currentMinutes = today.getHours() * 60 + today.getMinutes();

        const parseTimeToMinutes = (timeStr) => {
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return 0;
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = match[3].toUpperCase();
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          return hours * 60 + minutes;
        };

        // Fetch Doctor No Shows once (doesn't need to be strictly real-time)
        const qNoShows = query(
          collection(db, 'doctor_no_shows'),
          where('doctorId', '==', doctorId)
        );
        const snapNoShows = await getDocs(qNoShows);
        const activeNoShows = [];
        const normFormBranch = (patientForm.branch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
        snapNoShows.forEach(docSnap => {
          const ns = docSnap.data();
          const nsBranch = (ns.branchName || ns.branchId || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
          if (nsBranch === normFormBranch) {
            activeNoShows.push(ns);
          }
        });

        // Real-time listener for appointments on that specific date
        // Remove strict branchName query because App saves "Branch" suffix and Web doesn't. Filter in memory instead.
        let qAppts;
        if (isRestricted) {
          qAppts = query(
            collection(db, 'allpatients'),
            where('doctorId', '==', doctorId),
            where('dateString', '==', dateString),
            where('branchId', 'in', getBranchNamesList(userData.branchId, userData.branchName))
          );
        } else {
          qAppts = query(
            collection(db, 'allpatients'),
            where('doctorId', '==', doctorId),
            where('dateString', '==', dateString)
          );
        }

        const qExtra = query(
          collection(db, 'extra_slots'),
          where('doctorId', '==', doctorId),
          where('dateString', '==', dateString)
        );

        let latestCounts = {};
        let latestExtraSlots = [];

        const updateCombinedList = () => {
          const generatedList = generateSlotsForSelected(patientForm.doctor, docObj, patientForm.branch, patientForm.appointmentDate);
          const existingDbSlots = Object.keys(latestCounts).filter(t => t && t !== 'null' && t !== 'undefined');
          const combinedList = [...new Set([...generatedList, ...existingDbSlots, ...latestExtraSlots])];

          combinedList.sort((a, b) => {
            const parseToMin = (t) => {
              const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (!m) return 0;
              let h = parseInt(m[1], 10), min = parseInt(m[2], 10);
              if (m[3].toUpperCase() === 'PM' && h < 12) h += 12;
              if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
              return h * 60 + min;
            };
            return parseToMin(a) - parseToMin(b);
          });

          const slotsWithAvailability = combinedList.map(time => {
            const booked = latestCounts[time] || 0;
            const sessionsLeft = 3 - booked;
            const isPastSlot = isSelectedDateToday && parseTimeToMinutes(time) <= currentMinutes;
            const isNoShowBlocked = isSlotBlockedByNoShow(time, dateString, activeNoShows);
            const isFull = booked >= 3;
            return {
              time,
              bookedCount: booked,
              sessionsLeft: sessionsLeft > 0 ? sessionsLeft : 0,
              isAvailable: !isPastSlot && !isNoShowBlocked,
              isFull: isFull,
              isBlockedByNoShow: isNoShowBlocked,
              isExtra: !generatedList.includes(time) && booked === 0
            };
          });

          setAvailableSlots(slotsWithAvailability);
          setFetchingSlots(false);
        };

        const unsubAppointmentsReal = onSnapshot(qAppts, (snapshot) => {
          const bookings = snapshot.docs.map(doc => doc.data());
          const counts = {};
          const targetBranch = normalizeBranchName(patientForm.branch);

          bookings.forEach(b => {
            const bBranch = normalizeBranchName(b.branchName || b.branchId);
            if (bBranch === targetBranch) {
              counts[b.timeSlot] = (counts[b.timeSlot] || 0) + 1;
            }
          });
          latestCounts = counts;
          updateCombinedList();
        }, (error) => {
          console.error("Error setting up slots listener:", error);
          setFetchingSlots(false);
        });

        const unsubExtraReal = onSnapshot(qExtra, (snapshot) => {
          let slots = [];
          const targetBranch = normalizeBranchName(patientForm.branch);
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const bBranch = normalizeBranchName(data.branchName || data.branchId);
            if (bBranch === targetBranch && data.slots) {
              slots = [...slots, ...data.slots];
            }
          });
          latestExtraSlots = slots;
          updateCombinedList();
        });

        unsubAppointments = () => {
          unsubAppointmentsReal();
          unsubExtraReal();
        };

      } catch (err) {
        console.error("Error fetching no-shows or setting up listener:", err);
        setFetchingSlots(false);
      }
    };

    setupRealtimeSlots();

    return () => {
      if (unsubAppointments) unsubAppointments();
    };
  }, [patientForm.doctor, patientForm.branch, patientForm.appointmentDate, doctors]);

  // Global Patient Search for Web
  const [globalSearchText, setGlobalSearchText] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const handleSearchPatient = async (e) => {
    const text = e.target.value;
    setGlobalSearchText(text);
    if (!text || text.trim().length < 1) {
      setGlobalSearchResults([]);
      return;
    }
    setIsSearchingGlobal(true);
    try {
      const results = [];
      const queryText = text.trim();
      const textLower = queryText.toLowerCase();
      const textCapitalized = queryText.charAt(0).toUpperCase() + queryText.slice(1).toLowerCase();
      const textUpper = queryText.toUpperCase();

      const promises = [];

      if (/^\d+$/.test(queryText)) {
        const q1 = query(collection(db, 'allpatients'), where('phone', '>=', queryText), where('phone', '<=', queryText + '\uf8ff'), limit(15));
        promises.push(getDocs(q1));
      } else {
        const q1 = query(collection(db, 'allpatients'), where('fullName', '>=', textCapitalized), where('fullName', '<=', textCapitalized + '\uf8ff'), limit(15));
        promises.push(getDocs(q1));

        const q2 = query(collection(db, 'allpatients'), where('fullName', '>=', textLower), where('fullName', '<=', textLower + '\uf8ff'), limit(10));
        promises.push(getDocs(q2));

        const q3 = query(collection(db, 'allpatients'), where('fullName', '>=', textUpper), where('fullName', '<=', textUpper + '\uf8ff'), limit(10));
        promises.push(getDocs(q3));

        // Registration ID search (only allpatients collection stores registrationId)
        const qReg = query(
          collection(db, 'allpatients'),
          where('registrationId', '>=', textUpper),
          where('registrationId', '<=', textUpper + '\uf8ff'),
          limit(15)
        );
        promises.push(getDocs(qReg));
      }

      const snaps = await Promise.all(promises);
      snaps.forEach((snap) => {
        snap.forEach(docSnap => {
          const data = docSnap.data();
          results.push({ id: docSnap.id, source: 'allpatients', ...data });
        });
      });

      // Sort results to prioritize documents containing a registration ID
      results.sort((a, b) => {
        const aHasReg = !!(a.registrationId || a.regId);
        const bHasReg = !!(b.registrationId || b.regId);
        if (aHasReg && !bHasReg) return -1;
        if (!aHasReg && bHasReg) return 1;
        return 0;
      });

      const uniqueResults = [];
      const phones = new Set();
      results.forEach(r => {
        const cleanPhone = (r.phone || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone && !phones.has(cleanPhone)) {
          phones.add(cleanPhone);
          uniqueResults.push(r);
        }
      });
      setGlobalSearchResults(uniqueResults);
    } catch (err) {
      console.log('Search error', err);
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  // Medicine Requests States
  const [medRequests, setMedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editorData, setEditorData] = useState({
    patientName: '',
    age: '',
    gender: 'Mr.',
    subject: '',
    duration: '3',
    amountPaid: '',
    medicines: [...DEFAULT_MEDICINES],
    additionalNote: '',
    formDate: new Date().toLocaleDateString('en-GB')
  });

  // Billing States
  const [bills, setBills] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [revenueDoctorFilter, setRevenueDoctorFilter] = useState('all');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [customFeeAmount, setCustomFeeAmount] = useState('');
  const [onlinePaymentTab, setOnlinePaymentTab] = useState('counter'); // counter or app
  const [paymentLegs, setPaymentLegs] = useState([{ method: 'cash', amount: '' }]);

  // Checkbox billing states
  const [includeConsultation, setIncludeConsultation] = useState(true);
  const [consultationFee, setConsultationFee] = useState('');
  const [includeMedicine, setIncludeMedicine] = useState(false);
  const [medicineFee, setMedicineFee] = useState(0);
  const [includeDiet, setIncludeDiet] = useState(false);
  const [dietFee, setDietFee] = useState(0);
  const [activeDietPlanId, setActiveDietPlanId] = useState(null);

  const [counterMedicines, setCounterMedicines] = useState([]);
  const [counterPrescriptionDuration, setCounterPrescriptionDuration] = useState('');
  const [payLaterAmount, setPayLaterAmount] = useState('');

  const handleAddCounterMedicineRow = () => {
    setCounterMedicines([...counterMedicines, { name: '', type: 'Tablet', dosage: '1-0-1 (Morning, Night)' }]);
  };

  const handleRemoveCounterMedicineRow = (index) => {
    const updated = [...counterMedicines];
    updated.splice(index, 1);
    setCounterMedicines(updated);
  };

  const handleCounterMedicineChange = (index, field, value) => {
    const updated = [...counterMedicines];
    updated[index][field] = value;
    setCounterMedicines(updated);
  };
  const [unlockRequest, setUnlockRequest] = useState(null);
  const [requestingUnlock, setRequestingUnlock] = useState(false);

  useEffect(() => {
    let unsubUnlock;
    if (selectedBill) {
      const pendingPlan = nutritionPlans.find(plan =>
        plan.paymentStatus === 'pending' &&
        (plan.patientId === selectedBill.id || plan.patientPhone === selectedBill.phone)
      );

      const baseAmt = selectedBill ? ((selectedBill.consultationFee !== undefined && selectedBill.consultationFee !== null && selectedBill.consultationFee !== '') ? Number(selectedBill.consultationFee) : (selectedBill.paymentAmount ? Number(selectedBill.paymentAmount) : 0)) : 0;
      const consultAmt = baseAmt > 0 ? baseAmt : '';
      const hasMedFee = !!((selectedBill.medicineFeeRequested && Number(selectedBill.medicineFeeRequested) > 0) || (selectedBill.consultationFee && Number(selectedBill.consultationFee) > 0));
      const medAmt = hasMedFee ? (Number(selectedBill.medicineFeeRequested) || Number(selectedBill.consultationFee) || 0) : 0;
      const hasDietPlan = !!pendingPlan;
      const dietAmt = hasDietPlan ? Number(pendingPlan.amount || 0) : 0;

      if (hasMedFee) {
        setIncludeConsultation(false);
        setConsultationFee('');
        setIncludeMedicine(true);
        setMedicineFee(medAmt || '');
      } else {
        setIncludeConsultation(true);
        setConsultationFee(consultAmt);
        setIncludeMedicine(false);
        setMedicineFee(0);
      }

      setIncludeDiet(hasDietPlan);
      setDietFee(dietAmt);
      setActiveDietPlanId(hasDietPlan ? pendingPlan.id : null);

      const initialTotal = (hasMedFee ? medAmt : Number(consultAmt || 0)) + (hasDietPlan ? dietAmt : 0);
      setCustomFeeAmount(String(selectedBill.approvedAmount || (initialTotal > 0 ? initialTotal : '')));

      setOnlinePaymentTab('counter');
      // Default method: for appointments (online bookings), default to "send to app"
      const defaultMethod = selectedBill.source === 'appointments' ? 'app' : 'cash';
      const defaultAmount = String(selectedBill.approvedAmount || (initialTotal > 0 ? initialTotal : ''));
      setPaymentLegs([{ method: defaultMethod, amount: defaultAmount }]);

      // Realtime listener for checkout unlock requests
      const qUnlock = query(
        collection(db, 'checkout_unlock_requests'),
        where('billId', '==', selectedBill.id)
      );
      unsubUnlock = onSnapshot(qUnlock, (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          list.sort((a, b) => {
            const tA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const tB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return tB - tA;
          });
          setUnlockRequest(list[0]);
        } else {
          setUnlockRequest(null);
        }
      });

      // Realtime listener for amount change requests
      const qAmt = query(
        collection(db, 'hr_amount_requests'),
        where('targetId', '==', selectedBill.id),
        where('status', '==', 'pending')
      );
      const unsubAmt = onSnapshot(qAmt, (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setPendingAmountRequest(list[0]);
        } else {
          setPendingAmountRequest(null);
        }
      });

      return () => {
        if (unsubUnlock) unsubUnlock();
        if (unsubAmt) unsubAmt();
      };
    } else {
      setIncludeConsultation(true);
      setConsultationFee('');
      setIncludeMedicine(false);
      setMedicineFee(0);
      setIncludeDiet(false);
      setDietFee(0);
      setPayLaterAmount('');
      setCounterMedicines([]);
      setCounterPrescriptionDuration('');
      setActiveDietPlanId(null);
      setCustomFeeAmount('');
      setOnlinePaymentTab('counter');
      setPaymentLegs([{ method: 'cash', amount: '' }]);
      setUnlockRequest(null);
      setPendingAmountRequest(null);
    }
  }, [selectedBill, nutritionPlans]);

  useEffect(() => {
    let unsubAmtRequestNutri;
    if (selectedNutritionPayPlan) {
      const qAmt = query(
        collection(db, 'hr_amount_requests'),
        where('targetId', '==', selectedNutritionPayPlan.id),
        where('status', '==', 'pending')
      );
      unsubAmtRequestNutri = onSnapshot(qAmt, (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          setPendingAmountRequest(list[0]);
        } else {
          setPendingAmountRequest(null);
        }
      });
    } else {
      if (!selectedBill) {
        setPendingAmountRequest(null);
      }
    }
    return () => {
      if (unsubAmtRequestNutri) unsubAmtRequestNutri();
    };
  }, [selectedNutritionPayPlan, selectedBill]);


  // Pay Modal Patient File States
  const [payHistory, setPayHistory] = useState([]);
  const [payNutritionPlans, setPayNutritionPlans] = useState([]);
  const [loadingPayFile, setLoadingPayFile] = useState(false);
  const [payComplaint, setPayComplaint] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payPrescriptionUrls, setPayPrescriptionUrls] = useState([]);
  const [uploadingPayPrescription, setUploadingPayPrescription] = useState(false);
  const [payPatientDoc, setPayPatientDoc] = useState(null);

  useEffect(() => {
    if (showPayModal && selectedBill) {
      const fetchPayFileDetails = async () => {
        setLoadingPayFile(true);
        try {
          const coll = selectedBill.source === 'appointments' ? 'appointments' : 'allpatients';
          const docRef = doc(db, coll, selectedBill.id);
          const docSnap = await getDoc(docRef);

          let patientData = null;
          if (docSnap.exists()) {
            patientData = { id: docSnap.id, ...docSnap.data() };
            setPayPatientDoc(patientData);
            setPayComplaint(patientData.complaint || patientData.subject || '');
            setPayNotes(patientData.receptionNotes || patientData.notes || '');
            const pdUrls = patientData.prescriptionUrls || (patientData.prescriptionUrl ? [patientData.prescriptionUrl] : []);
            if (patientData.diagnosisDrawingUrl && !pdUrls.includes(patientData.diagnosisDrawingUrl)) pdUrls.push(patientData.diagnosisDrawingUrl);
            setPayPrescriptionUrls(pdUrls);

            if (patientData.medicineFeeRequested !== selectedBill.medicineFeeRequested || patientData.consultationFee !== selectedBill.consultationFee) {
              setSelectedBill(prev => ({
                ...prev,
                medicineFeeRequested: patientData.medicineFeeRequested,
                consultationFee: patientData.consultationFee
              }));
            }
          } else {
            setPayPatientDoc(selectedBill);
            setPayComplaint(selectedBill.complaint || selectedBill.subject || '');
            setPayNotes(selectedBill.receptionNotes || selectedBill.notes || '');
            const sbUrls = selectedBill.prescriptionUrls || (selectedBill.prescriptionUrl ? [selectedBill.prescriptionUrl] : []);
            if (selectedBill.diagnosisDrawingUrl && !sbUrls.includes(selectedBill.diagnosisDrawingUrl)) sbUrls.push(selectedBill.diagnosisDrawingUrl);
            setPayPrescriptionUrls(sbUrls);
          }

          const phone = patientData?.phone || selectedBill.phone;
          if (phone && phone !== 'N/A') {
            // Fetch history
            const visitsQuery = query(
              collection(db, selectedBill.source === 'appointments' ? 'appointments' : 'allpatients'),
              where('phone', '==', phone)
            );
            const visitSnap = await getDocs(visitsQuery);
            const history = [];
            visitSnap.forEach(d => {
              const data = d.data();
              if (data.status === 'completed' || data.status === 'done') {
                history.push({ id: d.id, ...data });
              }
            });
            setPayHistory(history);

            // Fetch nutrition plans
            const nutriQuery = query(
              collection(db, 'nutrition_plans'),
              where('patientPhone', '==', phone)
            );
            const nutriSnap = await getDocs(nutriQuery);
            const plans = [];
            nutriSnap.forEach(d => plans.push({ id: d.id, ...d.data() }));
            setPayNutritionPlans(plans);
          }
        } catch (err) {
          console.error("Error fetching pay file details:", err);
        } finally {
          setLoadingPayFile(false);
        }
      };
      fetchPayFileDetails();
    } else {
      setPayPatientDoc(null);
      setPayHistory([]);
      setPayNutritionPlans([]);
      setPayComplaint('');
      setPayNotes('');
      setPayPrescriptionUrls([]);
    }
  }, [showPayModal, selectedBill]);

  const handleUploadPayPrescription = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedBill) return;

    setUploadingPayPrescription(true);
    try {
      const storageRef = ref(storage, `prescriptions/${selectedBill.id}_${Date.now()}.jpg`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const currentUrls = payPrescriptionUrls;
      const newUrls = [...currentUrls, downloadUrl];

      const coll = selectedBill.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, selectedBill.id);

      await updateDoc(docRef, {
        prescriptionUrls: newUrls,
        prescriptionUrl: newUrls.length > 0 ? newUrls[0] : null,
        updatedAt: serverTimestamp()
      });

      setPayPrescriptionUrls(newUrls);

      alert('Prescription photo uploaded successfully.');
    } catch (err) {
      console.error("Error uploading prescription in pay modal:", err);
      alert('Failed to upload prescription.');
    } finally {
      setUploadingPayPrescription(false);
    }
  };

  const handleRemovePayPrescription = async (indexToRemove) => {
    if (!window.confirm("Are you sure you want to remove this prescription photo?")) return;
    if (!selectedBill) return;

    setUploadingPayPrescription(true);
    try {
      const currentUrls = payPrescriptionUrls;
      const newUrls = currentUrls.filter((_, idx) => idx !== indexToRemove);

      const coll = selectedBill.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, selectedBill.id);

      await updateDoc(docRef, {
        prescriptionUrls: newUrls,
        prescriptionUrl: newUrls.length > 0 ? newUrls[0] : null,
        updatedAt: serverTimestamp()
      });

      setPayPrescriptionUrls(newUrls);
    } catch (err) {
      console.error("Error removing prescription photo in pay modal:", err);
      alert('Failed to remove prescription photo.');
    } finally {
      setUploadingPayPrescription(false);
    }
  };

  const handleUpdatePayNotes = async () => {
    if (!selectedBill) return;
    setUploadingPayPrescription(true);
    try {
      const coll = selectedBill.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, selectedBill.id);

      await updateDoc(docRef, {
        receptionNotes: payNotes,
        notes: payNotes,
        updatedAt: serverTimestamp()
      });

      alert('Notes updated successfully.');
    } catch (err) {
      console.error("Error updating notes in pay modal:", err);
      alert('Failed to update notes.');
    } finally {
      setUploadingPayPrescription(false);
    }
  };

  // Reactive Effect to update customFeeAmount automatically
  useEffect(() => {
    if (selectedBill) {
      let total = (includeConsultation ? Number(consultationFee || 0) : 0) +
        (includeMedicine ? Number(medicineFee || 0) : 0) +
        (includeDiet ? Number(dietFee || 0) : 0);

      const prevPending = Number(selectedBill?.pendingAmount || 0);
      total += prevPending;

      const plAmount = Number(payLaterAmount || 0);
      total = Math.max(0, total - plAmount);

      setCustomFeeAmount(String(total));
    }
  }, [includeConsultation, consultationFee, includeMedicine, medicineFee, includeDiet, dietFee, payLaterAmount, selectedBill]);

  useEffect(() => {
    setPaymentLegs(prev => {
      if (prev.length === 1 && String(prev[0].amount) !== String(customFeeAmount)) {
        return [{ ...prev[0], amount: String(customFeeAmount) }];
      }
      return prev;
    });
  }, [customFeeAmount]);
  const [razorpayQrCode, setRazorpayQrCode] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [processingRzp, setProcessingRzp] = useState(false);
  const pollingRef = useRef(null);

  // Follow-ups state
  const [followups, setFollowups] = useState([]);
  const [followupDateFilter, setFollowupDateFilter] = useState('all'); // all, today, tomorrow, custom, last_month, etc.
  const [followupCustomDate, setFollowupCustomDate] = useState('');
  const [selectedMonthWeb, setSelectedMonthWeb] = useState('');
  const [targetsSet, setTargetsSet] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);

  useEffect(() => {
    fetchData();
    cleanupExpiredDietPDFs();
    return () => {
      cleanActiveListeners();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [userData]);

  useEffect(() => {
    if (userData?.branchId) {
      setPatientForm(prev => ({
        ...prev,
        branch: userData.branchId,
        appointmentDate: getTodayString()
      }));
    }
  }, [userData]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Trigger paginated page load when debounced search or per-page limit changes
  useEffect(() => {
    pageCursors.current = { 1: null };
    if (!debouncedSearch.trim()) {
      // When search is cleared, clear the list — don't auto-load all historical records
      setPatientsList([]);
      setHasNextPage(false);
      setPatientsCurrentPage(1);
      return;
    }
    loadPatientsPage(1);
  }, [debouncedSearch, patientsPerPage, userData]);

  // Lightbox keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex < 0 || lightboxImages.length === 0) return;
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === 'Escape') {
        setLightboxIndex(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, lightboxImages]);

  // Dynamic dashboard queue listener reacting to dateFilter, customDate
  useEffect(() => {
    if (!userData) return;

    const isRestricted = userData.role !== 'admin' && userData.role !== 'superadmin' && userData.branchId;
    const localToday = new Date();
    const yyyy = localToday.getFullYear();
    const mm = String(localToday.getMonth() + 1).padStart(2, '0');
    const dd = String(localToday.getDate()).padStart(2, '0');
    const todayStrDDMMYYYY = `${dd}/${mm}/${yyyy}`;

    const yesterdayObj = new Date(localToday.getTime() - 24 * 60 * 60 * 1000);
    const yyyyYest = yesterdayObj.getFullYear();
    const mmYest = String(yesterdayObj.getMonth() + 1).padStart(2, '0');
    const ddYest = String(yesterdayObj.getDate()).padStart(2, '0');
    const yesterdayStrDDMMYYYY = `${ddYest}/${mmYest}/${yyyyYest}`;

    let datesToQuery = [];

    if (dateFilter === 'today') {
      datesToQuery = [todayStrDDMMYYYY, yesterdayStrDDMMYYYY];
    } else if (dateFilter === 'tomorrow') {
      const tomObj = new Date(localToday.getTime() + 24 * 60 * 60 * 1000);
      const tomYYYY = tomObj.getFullYear();
      const tomMM = String(tomObj.getMonth() + 1).padStart(2, '0');
      const tomDD = String(tomObj.getDate()).padStart(2, '0');
      datesToQuery = [`${tomDD}/${tomMM}/${tomYYYY}`];
    } else if (dateFilter === 'custom' && customDate) {
      const parts = customDate.split('-');
      if (parts.length === 3) {
        datesToQuery = [`${parts[2]}/${parts[1]}/${parts[0]}`];
      }
    }

    const branchNames = getBranchNamesList(userData.branchId, userData.branchName);
    const activePts = { dateQuery: [], activeQuery: [] };

    const updateMergedList = (sourceKey, list) => {
      activePts[sourceKey] = list;
      const merged = {};
      activePts.dateQuery.forEach(item => { merged[item.id] = item; });
      activePts.activeQuery.forEach(item => { merged[item.id] = item; });
      setPatients(Object.values(merged));
    };

    let unsubDate;
    let unsubActive;

    if (dateFilter === 'upcoming') {
      let q;
      if (isRestricted) {
        q = query(
          collection(db, 'allpatients'),
          where('branchId', 'in', branchNames),
          where('status', 'in', ['waiting', 'in-consultation'])
        );
      } else {
        q = query(
          collection(db, 'allpatients'),
          where('status', 'in', ['waiting', 'in-consultation'])
        );
      }
      unsubActive = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
        activePts.dateQuery = [];
        activePts.activeQuery = list;
        setPatients(list);
      });
    } else {
      let qDate;
      if (isRestricted) {
        qDate = query(
          collection(db, 'allpatients'),
          where('branchId', 'in', branchNames),
          where('appointmentDate', 'in', datesToQuery)
        );
      } else {
        qDate = query(
          collection(db, 'allpatients'),
          where('appointmentDate', 'in', datesToQuery)
        );
      }
      unsubDate = onSnapshot(qDate, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
        updateMergedList('dateQuery', list);
      });

      let qActive;
      if (isRestricted) {
        qActive = query(
          collection(db, 'allpatients'),
          where('branchId', 'in', branchNames),
          where('status', 'in', ['waiting', 'in-consultation'])
        );
      } else {
        qActive = query(
          collection(db, 'allpatients'),
          where('status', 'in', ['waiting', 'in-consultation'])
        );
      }
      unsubActive = onSnapshot(qActive, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
        updateMergedList('activeQuery', list);
      });
    }

    return () => {
      if (unsubDate) unsubDate();
      if (unsubActive) unsubActive();
    };
  }, [userData, dateFilter, customDate]);

  const loadPatientsPage = async (pageNumber) => {
    if (!userData) return;
    setPatientsLoading(true);
    try {
      const isRestricted = userData.role !== 'admin' && userData.role !== 'superadmin' && userData.branchId;
      let items = [];
      let hasMore = false;
      const queryLimit = patientsPerPage + 1;

      if (debouncedSearch.trim()) {
        const qLower = debouncedSearch.toLowerCase().trim();
        const patientsRef = collection(db, 'allpatients');
        let q;

        const isPhone = /^\d+$/.test(qLower);
        const isRegId = qLower.startsWith('wk-');

        let rawMatches = [];

        if (isRegId) {
          q = query(patientsRef, where('registrationId', '==', debouncedSearch.trim()));
          const snapshot = await getDocs(q);
          snapshot.forEach(docSnap => rawMatches.push({ id: docSnap.id, source: 'allpatients', ...docSnap.data() }));
        } else if (isPhone) {
          const cleanPhone = qLower.slice(-10);
          // Also try with +91 prefix since some records store it that way
          const q1Phone = query(patientsRef, where('phone', '==', cleanPhone));
          const q2Phone = query(patientsRef, where('phone', '==', `+91${cleanPhone}`));
          const [snapshot, snap2] = await Promise.all([getDocs(q1Phone), getDocs(q2Phone)]);
          const seen = new Set();
          snapshot.forEach(docSnap => { if (!seen.has(docSnap.id)) { seen.add(docSnap.id); rawMatches.push({ id: docSnap.id, source: 'allpatients', ...docSnap.data() }); } });
          snap2.forEach(docSnap => { if (!seen.has(docSnap.id)) { seen.add(docSnap.id); rawMatches.push({ id: docSnap.id, source: 'allpatients', ...docSnap.data() }); } });
        } else {
          const searchName = debouncedSearch.trim();
          const searchNameCap = searchName.charAt(0).toUpperCase() + searchName.slice(1);
          const searchNameLower = searchName.toLowerCase();

          const q1 = query(
            patientsRef,
            where('fullName', '>=', searchNameCap),
            where('fullName', '<=', searchNameCap + '\uf8ff'),
            limit(50)
          );
          const q2 = query(
            patientsRef,
            where('fullName', '>=', searchNameLower),
            where('fullName', '<=', searchNameLower + '\uf8ff'),
            limit(50)
          );

          const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
          const seen = new Set();

          const addDocResult = (docSnap) => {
            if (!seen.has(docSnap.id)) {
              seen.add(docSnap.id);
              rawMatches.push({ id: docSnap.id, source: 'allpatients', fullName: docSnap.data().fullName || docSnap.data().patientName, ...docSnap.data() });
            }
          };

          snap1.forEach(d => addDocResult(d));
          snap2.forEach(d => addDocResult(d));
        }

        // Filter by branch match client-side if restricted
        // MODIFICATION: Do NOT filter globally searched patients by branch.
        const filteredMatches = rawMatches;

        // Sort by createdAt descending
        filteredMatches.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : 0);
          return timeB - timeA;
        });

        const start = (pageNumber - 1) * patientsPerPage;
        items = filteredMatches.slice(start, start + patientsPerPage);
        hasMore = filteredMatches.length > start + patientsPerPage;

        setPatientsList(items);
        setHasNextPage(hasMore);
        setPatientsCurrentPage(pageNumber);

      } else {
        // Paginated cursor mode
        const patientsRef = collection(db, 'allpatients');
        let q;

        try {
          const branchNames = getBranchNamesList(userData.branchId, userData.branchName);
          if (isRestricted) {
            q = query(
              patientsRef,
              where('branchId', 'in', branchNames),
              orderBy('createdAt', 'desc'),
              limit(queryLimit)
            );
          } else {
            q = query(
              patientsRef,
              orderBy('createdAt', 'desc'),
              limit(queryLimit)
            );
          }

          if (pageNumber > 1 && pageCursors.current[pageNumber]) {
            q = query(q, startAfter(pageCursors.current[pageNumber]));
          }

          const snapshot = await getDocs(q);
          const fetchedDocs = snapshot.docs;

          if (fetchedDocs.length > patientsPerPage) {
            hasMore = true;
            pageCursors.current[pageNumber + 1] = fetchedDocs[patientsPerPage - 1];
            items = fetchedDocs.slice(0, patientsPerPage).map(d => ({ id: d.id, ...d.data() }));
          } else {
            hasMore = false;
            items = fetchedDocs.map(d => ({ id: d.id, ...d.data() }));
          }

          setPatientsList(items);
          setHasNextPage(hasMore);
          setPatientsCurrentPage(pageNumber);

        } catch (err) {
          if (err.code === 'failed-precondition' || err.message.includes('index')) {
            console.warn("Firestore index missing, falling back to index-free query. Link to create index:", err.message);

            const branchNames = getBranchNamesList(userData.branchId, userData.branchName);
            let fallbackQuery;
            if (isRestricted) {
              fallbackQuery = query(
                patientsRef,
                where('branchId', 'in', branchNames),
                limit(queryLimit)
              );
            } else {
              fallbackQuery = query(
                patientsRef,
                limit(queryLimit)
              );
            }

            if (pageNumber > 1 && pageCursors.current[pageNumber]) {
              fallbackQuery = query(fallbackQuery, startAfter(pageCursors.current[pageNumber]));
            }

            const snapshot = await getDocs(fallbackQuery);
            const fetchedDocs = snapshot.docs;

            if (fetchedDocs.length > patientsPerPage) {
              hasMore = true;
              pageCursors.current[pageNumber + 1] = fetchedDocs[patientsPerPage - 1];
              items = fetchedDocs.slice(0, patientsPerPage).map(d => ({ id: d.id, ...d.data() }));
            } else {
              hasMore = false;
              items = fetchedDocs.map(d => ({ id: d.id, ...d.data() }));
            }

            // Client-side sort best effort
            items.sort((a, b) => {
              const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : 0);
              const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : 0);
              return timeB - timeA;
            });

            setPatientsList(items);
            setHasNextPage(hasMore);
            setPatientsCurrentPage(pageNumber);
          } else {
            throw err;
          }
        }
      }
    } catch (error) {
      console.error("Error loading patients page:", error);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.branchId) {
      checkTargetsForCurrentMonth(userData.branchId);
    } else {
      setTargetsSet(true);
      setLoadingTargets(false);
    }
  }, [userData?.branchId]);

  const checkTargetsForCurrentMonth = async (branchId) => {
    try {
      const today = new Date();
      const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      const targetsRef = collection(db, 'monthly_targets');
      const q = query(targetsRef, where('month', '==', monthKey), where('branchId', '==', branchId));
      const snapshot = await getDocs(q);

      setTargetsSet(!snapshot.empty);
    } catch (error) {
      console.error('Error checking targets:', error);
      setTargetsSet(false);
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleSidebarTabClick = (tabName) => {
    if (tabName === 'register') {
      if (!targetsSet && !loadingTargets) {
        alert('Please contact HR to set monthly targets before booking appointments.');
        return;
      }
      resetPatientForm();
    }
    setActiveTab(tabName);
    setSelectedRequest(null);
  };

  const fetchPatientFileHistory = async (phone, currentDocId) => {
    if (!phone) return;
    setLoadingHistory(true);
    try {
      const historyList = [];
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      // 1. Query 'allpatients'
      const qPatients = query(
        collection(db, 'allpatients'),
        where('phone', '==', phone),
        where('status', '==', 'completed')
      );
      const snapPatients = await getDocs(qPatients);
      snapPatients.forEach(docSnap => {
        if (docSnap.id !== currentDocId) {
          historyList.push({ id: docSnap.id, _collection: 'allpatients', ...docSnap.data() });
        }
      });

      // 2. Query 'appointments'
      const qAppts = query(
        collection(db, 'appointments'),
        where('phone', '==', phone),
        where('status', '==', 'completed')
      );
      const snapAppts = await getDocs(qAppts);
      snapAppts.forEach(docSnap => {
        if (docSnap.id !== currentDocId && !historyList.some(h => h.id === docSnap.id)) {
          historyList.push({ id: docSnap.id, _collection: 'appointments', ...docSnap.data() });
        }
      });

      // 3. Optional cleaned phone query
      if (cleanPhone && cleanPhone !== phone) {
        const qPatientsClean = query(
          collection(db, 'allpatients'),
          where('phone', '==', cleanPhone),
          where('status', '==', 'completed')
        );
        const snapPatientsClean = await getDocs(qPatientsClean);
        snapPatientsClean.forEach(docSnap => {
          if (docSnap.id !== currentDocId && !historyList.some(h => h.id === docSnap.id)) {
            historyList.push({ id: docSnap.id, _collection: 'allpatients', ...docSnap.data() });
          }
        });

        const qApptsClean = query(
          collection(db, 'appointments'),
          where('phone', '==', cleanPhone),
          where('status', '==', 'completed')
        );
        const snapApptsClean = await getDocs(qApptsClean);
        snapApptsClean.forEach(docSnap => {
          if (docSnap.id !== currentDocId && !historyList.some(h => h.id === docSnap.id)) {
            historyList.push({ id: docSnap.id, _collection: 'appointments', ...docSnap.data() });
          }
        });
      }

      historyList.sort((a, b) => {
        const timeA = a.completedAt?.toDate ? a.completedAt.toDate() : (a.completedAt ? new Date(a.completedAt) : (a.updatedAt ? new Date(a.updatedAt) : 0));
        const timeB = b.completedAt?.toDate ? b.completedAt.toDate() : (b.completedAt ? new Date(b.completedAt) : (b.updatedAt ? new Date(b.updatedAt) : 0));
        return timeB - timeA;
      });

      setPatientFileHistory(historyList);
    } catch (err) {
      console.error("Error fetching patient history on web:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchPatientFileNutritionPlans = async (phone) => {
    if (!phone) return;
    setLoadingNutritionPlans(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const q = query(
        collection(db, 'nutrition_plans'),
        where('patientPhone', '==', phone)
      );
      const snap = await getDocs(q);
      const plans = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      if (cleanPhone && cleanPhone !== phone) {
        const qClean = query(
          collection(db, 'nutrition_plans'),
          where('patientPhone', '==', cleanPhone)
        );
        const snapClean = await getDocs(qClean);
        snapClean.forEach(docSnap => {
          if (!plans.some(p => p.id === docSnap.id)) {
            plans.push({ id: docSnap.id, ...docSnap.data() });
          }
        });
      }

      plans.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : 0);
        return tb - ta;
      });

      setPatientFileNutritionPlans(plans);
    } catch (err) {
      console.error("Error fetching patient file nutrition plans:", err);
    } finally {
      setLoadingNutritionPlans(false);
    }
  };

  const openPatientFile = (item) => {
    setSelectedPatientFile(item);
    setEditedComplaint(item.complaint || item.subject || '');
    setShowPatientFileModal(true);
    setPatientFileHistory([]);
    setPatientFileNutritionPlans([]);

    // Reset or populate digital prescription state variables
    const pRaw = item.raw || item;
    setRxNotes(pRaw.prescriptionNotes || pRaw.diagnosisNotes || '');
    setRxMedicines(pRaw.medicines || []);
    setRxFollowUpInterval(pRaw.followUpInterval || '15 days');
    setRxFollowUpDate(pRaw.followUpDate || '');

    // Reset package state variables
    setNewPkgAmountWeb('');
    const startStr = new Date().toISOString().split('T')[0];
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    const endStr = end.toISOString().split('T')[0];
    setNewPkgStartDateWeb(startStr);
    setNewPkgEndDateWeb(endStr);

    if (item.phone && item.phone !== 'N/A') {
      fetchPatientFileHistory(item.phone, item.id);
      fetchPatientFileNutritionPlans(item.phone);
    }
  };

  const handleUpdateComplaint = async () => {
    if (!selectedPatientFile) return;
    setUpdatingFile(true);
    try {
      const coll = selectedPatientFile.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, selectedPatientFile.id);

      const updateData = {
        updatedAt: serverTimestamp()
      };
      if (selectedPatientFile.source === 'appointments') {
        updateData.subject = editedComplaint;
      } else {
        updateData.complaint = editedComplaint;
      }

      await updateDoc(docRef, updateData);

      // Update selectedPatientFile local state
      setSelectedPatientFile(prev => ({
        ...prev,
        complaint: editedComplaint,
        subject: editedComplaint,
        raw: {
          ...prev.raw,
          ...(prev.source === 'appointments' ? { subject: editedComplaint } : { complaint: editedComplaint })
        }
      }));
      alert('Consultation subject updated successfully.');
    } catch (err) {
      console.error("Error updating complaint:", err);
      alert('Failed to update consultation subject.');
    } finally {
      setUpdatingFile(false);
    }
  };

  const handleSaveRxByReceptionist = async (e) => {
    e.preventDefault();
    if (!selectedPatientFile) return;
    setRxSubmitting(true);
    try {
      const isOnline = selectedPatientFile.source === 'appointments' || selectedPatientFile._type === 'online';
      const collectionName = isOnline ? 'appointments' : 'allpatients';
      const docRef = doc(db, collectionName, selectedPatientFile.id);

      const updateData = {
        status: 'completed',
        followUpDate: rxFollowUpDate || '',
        followUpInterval: rxFollowUpInterval,
        prescriptionNotes: rxNotes,
        diagnosisNotes: rxNotes,
        diagnosisMode: 'text',
        medicines: rxMedicines.length > 0 ? rxMedicines : [],
        prescribedAt: serverTimestamp()
      };

      await updateDoc(docRef, updateData);

      // Create a request for pharmacy in medicine_requests
      await addDoc(collection(db, 'appointments'), {
        patientId: selectedPatientFile.id,
        patientName: selectedPatientFile.fullName,
        phone: selectedPatientFile.phone || '',
        doctorName: selectedPatientFile.doctor || 'Doctor',
        branchId: selectedPatientFile.branchId || userData?.branchId || 'KPHB',
        branchName: selectedPatientFile.branchName || userData?.branchName || 'KPHB Branch',
        subject: selectedPatientFile.complaint || selectedPatientFile.subject || 'Consultation',
        status: 'pending',
        requestedAt: serverTimestamp(),
        medicines: rxMedicines.length > 0 ? rxMedicines : []
      });

      // Log to patient_list for historical visits tracking
      await addDoc(collection(db, 'patient_list'), {
        patientId: selectedPatientFile.id,
        fullName: selectedPatientFile.fullName || 'Patient',
        phone: selectedPatientFile.phone || '',
        email: selectedPatientFile.email || '',
        regId: selectedPatientFile.registrationId || '',
        doctor: selectedPatientFile.doctor || 'Doctor',
        branchId: selectedPatientFile.branchId || userData?.branchId || 'KPHB',
        branchName: selectedPatientFile.branchName || userData?.branchName || 'KPHB Branch',
        status: 'completed',
        followUpDate: rxFollowUpDate || '',
        followUpInterval: rxFollowUpInterval,
        prescriptionNotes: rxNotes,
        createdAt: serverTimestamp()
      });

      alert('Prescription submitted successfully! Sent to pharmacy counter.');
      setShowPatientFileModal(false);
      setSelectedPatientFile(null);
    } catch (err) {
      console.error("Error saving prescription by receptionist:", err);
      alert("Failed to save prescription: " + err.message);
    } finally {
      setRxSubmitting(false);
    }
  };

  const handleEditPackageTotalWeb = async () => {
    const cleanPhone = selectedPatientFile.phone?.replace(/\D/g, '').slice(-10);
    try {
      const q = query(collection(db, 'package_members'), where('patientMobile', '==', selectedPatientFile.phone));
      const snap = await getDocs(q);
      let pkgDoc = null;
      snap.forEach(docSnap => {
        if (docSnap.data().status === 'active') {
          pkgDoc = { id: docSnap.id, ...docSnap.data() };
        }
      });

      if (!pkgDoc && cleanPhone) {
        const qClean = query(collection(db, 'package_members'), where('patientMobile', '==', cleanPhone));
        const snapClean = await getDocs(qClean);
        snapClean.forEach(docSnap => {
          if (docSnap.data().status === 'active') {
            pkgDoc = { id: docSnap.id, ...docSnap.data() };
          }
        });
      }

      if (!pkgDoc) {
        alert("Active package membership document not found.");
        return;
      }

      const promptVal = window.prompt(`Current Total: ₹${pkgDoc.totalAmount}. Enter new total package amount:`, pkgDoc.totalAmount);
      if (promptVal === null) return;
      const newTotal = parseFloat(promptVal);
      if (isNaN(newTotal) || newTotal <= 0) {
        alert("Please enter a valid amount.");
        return;
      }
      if (newTotal < parseFloat(pkgDoc.paidAmount)) {
        alert("New total cannot be less than already paid amount.");
        return;
      }

      const newBalance = newTotal - (parseFloat(pkgDoc.paidAmount) || 0);
      const pkgRef = doc(db, 'package_members', pkgDoc.id);
      await updateDoc(pkgRef, {
        totalAmount: newTotal,
        balanceAmount: newBalance,
        updatedAt: serverTimestamp()
      });

      alert("Package total updated successfully!");
    } catch (err) {
      console.error("Error editing package total on web:", err);
      alert("Failed to update package total.");
    }
  };

  const handleRegisterPackageWeb = async () => {
    const total = parseFloat(newPkgAmountWeb);
    if (isNaN(total) || total <= 0) {
      alert('Please enter a valid package total amount.');
      return;
    }
    setSavingPkgWeb(true);
    try {
      const pkgData = {
        patientId: selectedPatientFile.id,
        patientName: selectedPatientFile.fullName,
        patientMobile: selectedPatientFile.phone || '',
        packageName: 'Standard Homeopathy Package',
        totalAmount: total,
        paidAmount: 0,
        balanceAmount: total,
        startDate: newPkgStartDateWeb,
        endDate: newPkgEndDateWeb,
        status: 'active',
        branchId: selectedPatientFile.branchId || userData?.branchId || 'Unknown',
        branchName: selectedPatientFile.branchName || userData?.branchName || 'Unknown',
        createdAt: serverTimestamp(),
        createdBy: userData?.name || 'Receptionist'
      };

      await addDoc(collection(db, 'package_members'), pkgData);

      // Update the patient file local state
      const updatedFile = { ...selectedPatientFile, packageId: 'active' };
      setSelectedPatientFile(updatedFile);

      alert('Patient registered in package successfully!');
    } catch (err) {
      console.error("Error registering package on web:", err);
      alert("Failed to register package.");
    } finally {
      setSavingPkgWeb(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedPatientFile) return;
    setUpdatingFile(true);
    try {
      const coll = selectedPatientFile.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, selectedPatientFile.id);

      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      if (newStatus === 'completed') {
        updateData.completedAt = serverTimestamp();
      } else if (newStatus === 'in-consultation') {
        updateData.consultationStartedAt = serverTimestamp();
      }

      await updateDoc(docRef, updateData);

      // Create patient notification for status changes (e.g. confirmed/cancelled)
      if (selectedPatientFile.source === 'appointments') {
        const appt = selectedPatientFile.raw;
        if (appt && appt.patientId && appt.patientId !== 'WALKIN_USER') {
          let title = '';
          let body = '';
          let type = '';

          const formatDateStr = (dateString) => {
            try {
              const parts = dateString.split('-');
              if (parts.length === 3) {
                const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
              }
            } catch (e) { }
            return dateString;
          };
          const formattedDate = formatDateStr(appt.dateString || appt.date || '');

          if (newStatus === 'cancelled') {
            title = '❌ Appointment Cancelled';
            body = `Your appointment with Dr. ${appt.doctorName || 'Doctor'} on ${formattedDate} at ${appt.timeSlot || ''} has been cancelled.`;
            type = 'booking_cancelled';
          } else if (newStatus === 'confirmed' || newStatus === 'booked') {
            title = '🎉 Appointment Confirmed';
            body = `Your appointment with Dr. ${appt.doctorName || 'Doctor'} on ${formattedDate} at ${appt.timeSlot || ''} has been confirmed.`;
            type = 'booking_confirmed';
          }

          if (title && body) {
            try {
              await addDoc(collection(db, 'notifications'), {
                userId: appt.patientId,
                title: title,
                body: body,
                type: type,
                isRead: false,
                appointmentId: selectedPatientFile.id,
                createdAt: serverTimestamp()
              });
            } catch (notifErr) {
              console.error("Error creating in-app notification on status change:", notifErr);
            }
          }
        }
      }

      // Update selectedPatientFile local state
      setSelectedPatientFile(prev => ({
        ...prev,
        status: newStatus,
        raw: {
          ...prev.raw,
          status: newStatus,
          ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
        }
      }));

      alert(`Status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error("Error updating status:", err);
      alert('Failed to update status.');
    } finally {
      setUpdatingFile(false);
    }
  };

  const handleStartConsultationRow = async (item) => {
    try {
      const coll = item.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, item.id);
      await updateDoc(docRef, {
        status: 'in-consultation',
        consultationStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      openPatientFile(item);
    } catch (err) {
      console.error("Error starting consultation from row:", err);
      alert("Failed to start consultation: " + (err.message || err));
    }
  };

  const handleUploadPrescription = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPatientFile) return;

    setUpdatingFile(true);
    try {
      const storageRef = ref(storage, `prescriptions/${selectedPatientFile.id}_${Date.now()}.jpg`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      const patientRaw = selectedPatientFile.raw;
      const currentUrls = patientRaw?.prescriptionUrls || (patientRaw?.prescriptionUrl ? [patientRaw.prescriptionUrl] : []);
      const newUrls = [...currentUrls, downloadUrl];

      const coll = selectedPatientFile.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, selectedPatientFile.id);
      await updateDoc(docRef, {
        prescriptionUrls: newUrls,
        prescriptionUrl: newUrls.length > 0 ? newUrls[0] : null,
        updatedAt: serverTimestamp()
      });
      setSelectedPatientFile(prev => ({
        ...prev,
        raw: {
          ...prev.raw,
          prescriptionUrls: newUrls,
          prescriptionUrl: newUrls.length > 0 ? newUrls[0] : null
        }
      }));

      alert('Prescription photo uploaded successfully.');
    } catch (err) {
      console.error("Error uploading prescription on web:", err);
      alert('Failed to upload prescription.');
    } finally {
      setUpdatingFile(false);
    }
  };
  const handleRemovePrescription = async (indexToRemove) => {
    if (!window.confirm("Are you sure you want to remove this prescription photo?")) return;
    if (!selectedPatientFile) return;
    setUpdatingFile(true);
    try {
      const patientRaw = selectedPatientFile.raw;
      const currentUrls = patientRaw?.prescriptionUrls || (patientRaw?.prescriptionUrl ? [patientRaw.prescriptionUrl] : []);
      const newUrls = currentUrls.filter((_, idx) => idx !== indexToRemove);

      const coll = selectedPatientFile.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, selectedPatientFile.id);

      await updateDoc(docRef, {
        prescriptionUrls: newUrls,
        prescriptionUrl: newUrls.length > 0 ? newUrls[0] : null,
        updatedAt: serverTimestamp()
      });

      setSelectedPatientFile(prev => ({
        ...prev,
        raw: {
          ...prev.raw,
          prescriptionUrls: newUrls,
          prescriptionUrl: newUrls.length > 0 ? newUrls[0] : null
        }
      }));

      alert('Prescription photo removed.');
    } catch (err) {
      console.error("Error removing prescription photo:", err);
      alert('Failed to remove prescription photo.');
    } finally {
      setUpdatingFile(false);
    }
  };

  const activeListenersRef = useRef([]);

  const cleanActiveListeners = () => {
    if (activeListenersRef.current && activeListenersRef.current.length > 0) {
      activeListenersRef.current.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      activeListenersRef.current = [];
    }
  };

  async function fetchData() {
    if (!userData) return;
    cleanActiveListeners();

    try {
      const isRestricted = userData.role !== 'admin' && userData.role !== 'superadmin' && userData.branchId;
      const branchNames = getBranchNamesList(userData.branchId, userData.branchName);

      let appointmentsQuery = collection(db, 'appointments');
      let medicineRequestsQuery = collection(db, 'appointments');
      let followupsQuery = userData.branchId
        ? query(collection(db, 'patient_list'), where('branchId', 'in', branchNames))
        : collection(db, 'patient_list');
      let billsQuery = collection(db, 'allpatients');

      if (isRestricted) {
        appointmentsQuery = query(collection(db, 'appointments'), where('branchId', 'in', branchNames));
        medicineRequestsQuery = query(collection(db, 'appointments'), where('branchId', 'in', branchNames));
        billsQuery = query(collection(db, 'allpatients'), where('branchId', 'in', branchNames), where('paymentStatus', '==', 'pending'));
      } else {
        billsQuery = query(collection(db, 'allpatients'), where('paymentStatus', '==', 'pending'));
      }

      // Doctors list
      const qDocs = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const snapDocs = await getDocs(qDocs);
      const docsList = [];
      snapDocs.forEach(doc => docsList.push({ id: doc.id, ...doc.data() }));
      setDoctors(docsList);

      // Realtime listener for Package Members
      const qPkg = collection(db, 'package_members');
      const unsubPkg = onSnapshot(qPkg, (snapshot) => {
        const pkgMap = new Map();
        const today = new Date().toISOString().split('T')[0];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          let isActive = false;
          if (data.startDate && data.endDate) {
            if (today >= data.startDate && today <= data.endDate) {
              isActive = true;
            }
          } else if (data.status === 'active') {
            isActive = true;
          }
          if (isActive) {
            const m = (data.patientMobile || '').replace(/\D/g, '').slice(-10);
            if (m) {
              pkgMap.set(m, docSnap.id);
            }
          }
        });
        setActivePackageMap(pkgMap);
      }, (error) => {
        console.error("Error listening to package members on web reception:", error);
      });
      activeListenersRef.current.push(unsubPkg);

      // Realtime listener for Doctor No Shows
      let noShowsQuery = collection(db, 'doctor_no_shows');
      if (isRestricted) {
        noShowsQuery = query(collection(db, 'doctor_no_shows'), where('branchId', 'in', branchNames));
      }
      const unsubNoShows = onSnapshot(noShowsQuery, (snapshot) => {
        const list = [];
        snapshot.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        setNoShows(list);
      }, (error) => {
        console.error("Error listening to doctor no shows on web reception:", error);
      });
      activeListenersRef.current.push(unsubNoShows);

      // Realtime listener for Medicine Requests
      const unsubMed = onSnapshot(medicineRequestsQuery, (snapshot) => {
        const reqs = [];
        snapshot.forEach(d => reqs.push({ id: d.id, ...d.data() }));
        reqs.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
        setMedRequests(reqs);
      });
      activeListenersRef.current.push(unsubMed);

      // Realtime listener for Patients/Appointments Billing
      const unsubBills = onSnapshot(billsQuery, (snapshot) => {
        const bls = [];
        snapshot.forEach(d => {
          const item = d.data();
          bls.push({ id: d.id, ...item });
        });
        setBills(bls);

        if (selectedBill) {
          const updated = bls.find(b => b.id === selectedBill.id);
          if (updated) {
            setSelectedBill(prev => ({ ...prev, ...updated }));
          }
        }
      });
      activeListenersRef.current.push(unsubBills);

      // Realtime listener for completed walk-ins of today and yesterday
      const localToday = new Date();
      const yyyy = localToday.getFullYear();
      const mm = String(localToday.getMonth() + 1).padStart(2, '0');
      const dd = String(localToday.getDate()).padStart(2, '0');
      const todayStrDDMMYYYY = `${dd}/${mm}/${yyyy}`;

      const yesterdayObj = new Date(localToday.getTime() - 24 * 60 * 60 * 1000);
      const yyyyYest = yesterdayObj.getFullYear();
      const mmYest = String(yesterdayObj.getMonth() + 1).padStart(2, '0');
      const ddYest = String(yesterdayObj.getDate()).padStart(2, '0');
      const yesterdayStrDDMMYYYY = `${ddYest}/${mmYest}/${yyyyYest}`;
      const datesToQuery = [todayStrDDMMYYYY, yesterdayStrDDMMYYYY];

      let completedWalkinsQuery = collection(db, 'allpatients');
      if (isRestricted) {
        completedWalkinsQuery = query(
          collection(db, 'allpatients'),
          where('branchId', 'in', branchNames),
          where('appointmentDate', 'in', datesToQuery)
        );
      } else {
        completedWalkinsQuery = query(
          collection(db, 'allpatients'),
          where('appointmentDate', 'in', datesToQuery)
        );
      }

      const unsubCompletedWalkins = onSnapshot(completedWalkinsQuery, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const status = (data.status || '').toLowerCase();
          if (status === 'completed' || status === 'done') {
            list.push({ id: docSnap.id, ...data });
          }
        });
        setCompletedWalkins(list);
      });
      activeListenersRef.current.push(unsubCompletedWalkins);

      // Realtime listener for Nutrition Billing
      let nutritionQuery = collection(db, 'nutrition_plans');
      if (isRestricted) {
        nutritionQuery = query(collection(db, 'nutrition_plans'), where('branchId', 'in', branchNames));
      }
      const unsubNutrition = onSnapshot(nutritionQuery, (snapshot) => {
        const plans = [];
        snapshot.forEach(d => {
          plans.push({ id: d.id, ...d.data() });
        });
        setNutritionPlans(plans);

        if (selectedNutritionPayPlan) {
          const updated = plans.find(p => p.id === selectedNutritionPayPlan.id);
          if (updated) {
            setSelectedNutritionPayPlan(prev => ({ ...prev, ...updated }));
          }
        }
      });
      activeListenersRef.current.push(unsubNutrition);

      // Realtime listener for Transactions (Revenue Tracking)
      let transactionsQuery = collection(db, 'alltransactions');
      const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
        const txs = [];
        snapshot.forEach(d => {
          const item = { id: d.id, ...d.data() };
          if (isRestricted && !matchBranch(item)) return;
          txs.push(item);
        });
        txs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setTransactions(txs);
      });
      activeListenersRef.current.push(unsubTransactions);

      // Realtime listener for Follow-ups
      const unsubFollow = onSnapshot(followupsQuery, (snapshot) => {
        const fls = [];
        snapshot.forEach(doc => {
          const item = doc.data();
          if (item.followUpDate) fls.push({ id: doc.id, ...item });
        });
        setFollowups(fls);
      });
      activeListenersRef.current.push(unsubFollow);

      // Realtime listener for Appointments
      const unsubAppts = onSnapshot(appointmentsQuery, (snapshot) => {
        const appts = [];
        snapshot.forEach(d => {
          const item = d.data();
          appts.push({ id: d.id, ...item });
        });
        appts.sort((a, b) => {
          const timeA = a.date ? new Date(a.date) : new Date(0);
          const timeB = b.date ? new Date(b.date) : new Date(0);
          return timeA - timeB;
        });
        setAppointments(appts);
      });
      activeListenersRef.current.push(unsubAppts);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }

  const handleLogout = () => {
    signOut(auth);
  };

  const handleWhatsAppContact = (item) => {
    const phone = item.phone;
    const name = item.fullName;
    if (!phone || phone === 'N/A') {
      alert("No phone number available for this patient.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const message = `Hello ${name}, this is from SPH Clinic regarding your appointment.`;
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleMoveQueue = async (item, direction, unifiedList) => {
    const activePatients = unifiedList.filter(p =>
      p.doctor === item.doctor &&
      normalizeBranch(p.raw?.branchId || p.raw?.branchName) === normalizeBranch(item.raw?.branchId || item.raw?.branchName) &&
      (p.status === 'waiting' || p.status === 'booked' || p.status === 'in-consultation' || p.status === 'pending')
    );

    activePatients.sort((x, y) => {
      const qX = typeof x.raw?.queueOrder === 'number' ? x.raw.queueOrder : Infinity;
      const qY = typeof y.raw?.queueOrder === 'number' ? y.raw.queueOrder : Infinity;
      if (qX !== qY) return qX - qY;

      const tX = parseTimeStr(x.timeSlot);
      const tY = parseTimeStr(y.timeSlot);
      if (tX !== tY) return tX - tY;

      const timeX = x.raw?.createdAt?.toDate ? x.raw.createdAt.toDate().getTime() : (x.raw?.createdAt ? new Date(x.raw.createdAt).getTime() : 0);
      const timeY = y.raw?.createdAt?.toDate ? y.raw.createdAt.toDate().getTime() : (y.raw?.createdAt ? new Date(y.raw.createdAt).getTime() : 0);
      return timeX - timeY;
    });

    const currentIndex = activePatients.findIndex(p => p.id === item.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'up') {
      targetIndex = currentIndex - 1;
    } else if (direction === 'down') {
      targetIndex = currentIndex + 1;
    }

    if (targetIndex < 0 || targetIndex >= activePatients.length) return;

    try {
      const updatedPatients = [...activePatients];
      const [removed] = updatedPatients.splice(currentIndex, 1);
      updatedPatients.splice(targetIndex, 0, removed);

      const batchUpdates = updatedPatients.map((p, idx) => {
        const ref = doc(db, p.source === 'appointments' ? 'appointments' : 'allpatients', p.id);
        return updateDoc(ref, { queueOrder: idx });
      });

      await Promise.all(batchUpdates);
    } catch (err) {
      console.error("Error moving queue item: ", err);
    }
  };

  const handleDeleteAppointment = async (item) => {
    if (!item) return;
    const name = item.name || item.patientName || 'this patient';
    if (window.confirm(`Are you sure you want to permanently delete ${name}'s appointment and remove them from the queue?`)) {
      try {
        const collectionName = item.source === 'appointments' ? 'appointments' : 'allpatients';
        await deleteDoc(doc(db, collectionName, item.id));
        alert('Appointment deleted successfully.');
      } catch (error) {
        console.error("Error deleting appointment: ", error);
        alert("Failed to delete appointment: " + error.message);
      }
    }
  };

  const handleOpenReschedule = (item) => {
    setRescheduleItem(item);
    setRescheduleDate(item.date || '');
    setRescheduleDoctor(item.doctor || '');

    // Get canonical/initial branch
    const initialBranch = item.raw?.branchId || item.raw?.branchName || '';
    setRescheduleBranch(initialBranch);
    setRescheduleTime(item.timeSlot || '');
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleItem) return;
    if (!rescheduleDate || !rescheduleDoctor || !rescheduleBranch || !rescheduleTime) {
      alert('Please fill out all fields.');
      return;
    }

    if (rescheduleDoctor && rescheduleBranch && rescheduleDate) {
      const docObj = doctors.find(d => d.name === rescheduleDoctor);
      if (docObj) {
        const checkDate = new Date(rescheduleDate);
        if (!isDoctorScheduledAtBranchOnDate(docObj, rescheduleBranch, checkDate)) {
          alert(`Dr. ${rescheduleDoctor} is not scheduled to work at ${rescheduleBranch} on ${checkDate.toLocaleDateString('en-US', { weekday: 'long' })}s.`);
          return;
        }

        // Fetch Doctor No Shows and validate if slot is blocked
        try {
          const qNoShows = query(
            collection(db, 'doctor_no_shows'),
            where('doctorId', '==', docObj.id)
          );
          const snapNoShows = await getDocs(qNoShows);
          const activeNoShows = [];
          const normFormBranch = rescheduleBranch.toLowerCase().replace(/\s*branch\s*/i, '').trim();
          snapNoShows.forEach(docSnap => {
            const ns = docSnap.data();
            const nsBranch = (ns.branchName || ns.branchId || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
            if (nsBranch === normFormBranch) {
              activeNoShows.push(ns);
            }
          });

          if (isSlotBlockedByNoShow(rescheduleTime, rescheduleDate, activeNoShows)) {
            alert(`Cannot reschedule: Dr. ${rescheduleDoctor} is marked as NO SHOW (unavailable) at ${rescheduleBranch} for this time period.`);
            return;
          }
        } catch (err) {
          console.error("Error checking no show during reschedule:", err);
        }
      }
    }
    setRescheduling(true);
    try {
      const coll = rescheduleItem.source === 'appointments' ? 'appointments' : 'allpatients';
      const docRef = doc(db, coll, rescheduleItem.id);

      const formatToAppDate = (htmlDateStr) => {
        if (!htmlDateStr) return '';
        const parts = htmlDateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return htmlDateStr;
      };

      const dateSlash = formatToAppDate(rescheduleDate);
      const apptDateObj = rescheduleDate ? new Date(rescheduleDate) : new Date();
      const dateISO = apptDateObj.toISOString();

      const updateData = {
        branchId: rescheduleBranch,
        branchName: `${rescheduleBranch} Branch`,
        isRescheduled: true,
        lastRescheduledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (rescheduleItem.source === 'appointments') {
        updateData.doctorName = rescheduleDoctor;
        const selectedDocObj = doctors.find(d => d.name === rescheduleDoctor);
        if (selectedDocObj) {
          updateData.doctorId = selectedDocObj.id;
          updateData.specialty = selectedDocObj.specialty || 'Homeopathic Physician';
          updateData.doctorImage = selectedDocObj.image || '';
        }
        updateData.date = dateISO;
        updateData.dateString = rescheduleDate;
        updateData.timeSlot = rescheduleTime;
      } else {
        updateData.doctor = rescheduleDoctor;
        updateData.appointmentDate = dateSlash;
        updateData.appointmentTime = rescheduleTime;
      }

      await updateDoc(docRef, updateData);
      alert('Appointment rescheduled successfully!');
      setShowRescheduleModal(false);
      setRescheduleItem(null);
      fetchData();
    } catch (err) {
      console.error("Reschedule error:", err);
      alert('Failed to reschedule appointment: ' + err.message);
    } finally {
      setRescheduling(false);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    if (!patientForm.fullName || !patientForm.phone || !patientForm.doctor || !patientForm.appointmentDate || !patientForm.appointmentTime) {
      alert('Please fill out Name, Phone, Doctor, Appointment Date, and select an Available Time Slot.');
      return;
    }

    try {
      // Check if slot falls in a Doctor No Show block
      const docObj = doctors.find(d => d.name === patientForm.doctor);
      const docIdForNoShow = docObj?.id || patientForm.doctor;
      const dateStringForNoShow = patientForm.appointmentDate;
      const timeSlot = patientForm.appointmentTime;

      const qNoShows = query(
        collection(db, 'doctor_no_shows'),
        where('doctorId', '==', docIdForNoShow)
      );
      const snapNoShows = await getDocs(qNoShows);
      const activeNoShows = [];
      const normFormBranch = (patientForm.branch || userData?.branchId || 'KPHB').toLowerCase().replace(/\s*branch\s*/i, '').trim();
      snapNoShows.forEach(docSnap => {
        const ns = docSnap.data();
        const nsBranch = (ns.branchName || ns.branchId || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
        if (nsBranch === normFormBranch) {
          activeNoShows.push(ns);
        }
      });

      if (isSlotBlockedByNoShow(timeSlot, dateStringForNoShow, activeNoShows)) {
        alert(`Cannot book: Dr. ${patientForm.doctor} is marked as NO SHOW (unavailable) for this time period.`);
        return;
      }

      // Also verify the slot is not fully booked (like in the app)
      const qCheck = query(
        collection(db, 'appointments'),
        where('doctorId', '==', docIdForNoShow),
        where('branchName', '==', patientForm.branch || userData?.branchId || 'KPHB'),
        where('dateString', '==', dateStringForNoShow),
        where('timeSlot', '==', timeSlot)
      );
      const snapCheck = await getDocs(qCheck);
      if (snapCheck.size >= 3) {
        alert(`Cannot book: The time slot ${timeSlot} is fully booked. Please select another slot.`);
        return;
      }
      // Helper to format YYYY-MM-DD HTML input date to mobile app DD/MM/YYYY
      const formatToAppDate = (htmlDateStr) => {
        if (!htmlDateStr) {
          const localDate = new Date();
          const d = String(localDate.getDate()).padStart(2, '0');
          const m = String(localDate.getMonth() + 1).padStart(2, '0');
          return `${d}/${m}/${localDate.getFullYear()}`;
        }
        const parts = htmlDateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return htmlDateStr;
      };

      const finalAppDate = formatToAppDate(patientForm.appointmentDate);

      const cleanPhone = patientForm.phone.replace(/\D/g, '').slice(-10);
      const branchForId = patientForm.branch || userData?.branchId || 'KPHB';
      const regId = patientForm.registrationId || await generateRegistrationId(branchForId);

      // Find the doctor object to get doctorId, specialty, image
      const selectedDocObj = doctors.find(d => d.name === patientForm.doctor);
      const doctorId = selectedDocObj ? selectedDocObj.id : '';
      const specialty = selectedDocObj?.specialty || 'Homeopathic Physician';
      const doctorImage = selectedDocObj?.image || '';

      // Determine correct dates for appointment synchronization
      const apptDateObj = patientForm.appointmentDate ? new Date(patientForm.appointmentDate) : new Date();
      const dateISO = apptDateObj.toISOString();
      const dateString = dateISO.split('T')[0]; // YYYY-MM-DD

      // 1. Create walk-in patient document
      const pDoc = await addDoc(collection(db, 'allpatients'), {
        fullName: patientForm.fullName,
        phone: cleanPhone,
        email: patientForm.email,
        age: '',
        gender: '',
        source: patientForm.source,
        modeOfConsultation: patientForm.modeOfConsultation || 'In-Clinic',
        complaint: patientForm.subject,
        doctor: patientForm.doctor,
        appointmentDate: finalAppDate, // DD/MM/YYYY
        appointmentTime: patientForm.appointmentTime,
        patientPhoto: '',
        branchId: patientForm.branch || userData?.branchId || 'KPHB',
        branchName: patientForm.branch
          ? `${patientForm.branch} Branch`
          : (userData?.branchName || `${userData?.branchId || 'KPHB'} Branch`),
        registeredBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception',
        status: 'waiting',
        paymentStatus: 'pending',
        registrationId: regId,
        rewardPoints: 0,
        createdAt: serverTimestamp()
      });

      // 2. Create appointment record
      const apptDocRef = await addDoc(collection(db, 'appointments'), {
        patientId: pDoc.id,
        patientName: patientForm.fullName,
        phone: cleanPhone,
        email: patientForm.email,
        branchId: patientForm.branch || userData?.branchId || 'KPHB',
        branchName: patientForm.branch
          ? `${patientForm.branch} Branch`
          : (userData?.branchName || `${userData?.branchId || 'KPHB'} Branch`),
        doctorId: doctorId,
        doctorName: patientForm.doctor,
        specialty: specialty,
        doctorImage: doctorImage,
        date: dateISO,
        dateString: dateString, // YYYY-MM-DD
        timeSlot: patientForm.appointmentTime,
        subject: patientForm.subject,
        symptoms: patientForm.subject,
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentId: 'WALKIN_PENDING',
        amountPaid: 0,
        createdAt: serverTimestamp(),
        bookedAt: serverTimestamp(),
        checkedInAt: serverTimestamp(),
        source: patientForm.source || 'Walk-in',
        modeOfConsultation: patientForm.modeOfConsultation || 'In-Clinic'
      });

      // 3. Link appointmentId back to patients document
      await updateDoc(doc(db, 'allpatients', pDoc.id), {
        appointmentId: apptDocRef.id
      });

      setBookedPatientInfo({
        name: patientForm.fullName,
        doctor: patientForm.doctor,
        branch: patientForm.branch || userData?.branchName || 'the clinic'
      });
      setShowBookingSuccess(true);

      resetPatientForm();
      fetchData();
    } catch (err) {
      alert('Error registering patient: ' + err.message);
    }
  };
  const handleCheckInAppointment = async (appt) => {
    if (!window.confirm(`Check-in patient ${appt.patientName} for consultation with ${appt.doctorName} today?`)) return;
    try {
      const localDate = new Date();
      const day = String(localDate.getDate()).padStart(2, '0');
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const year = localDate.getFullYear();
      const todayStrDDMMYYYY = `${day}/${month}/${year}`;

      const cleanPhone = (appt.phone || '').replace(/\D/g, '').slice(-10);

      const pDocRef = await addDoc(collection(db, 'allpatients'), {
        fullName: appt.patientName,
        phone: cleanPhone,
        email: appt.email || '',
        gender: appt.gender || 'Mr.',
        doctor: appt.doctorName,
        appointmentDate: todayStrDDMMYYYY,
        appointmentTime: appt.timeSlot || '10:00 AM',
        status: 'waiting',
        paymentStatus: appt.paymentStatus || 'pending',
        registrationId: appt.regId || `WK-${day}${month}-${cleanPhone.slice(-4)}`,
        rewardPoints: 0,
        createdAt: serverTimestamp(),
        subject: appt.subject || appt.symptoms || 'Walk-in Consultation',
        branchId: appt.branchId || userData?.branchId || 'KPHB',
        branchName: appt.branchName || userData?.branchName || `${appt.branchId || userData?.branchId || 'KPHB'} Branch`,
        modeOfConsultation: appt.modeOfConsultation || 'In-Clinic',
        source: 'appointments',
        appointmentId: appt.id, // Store linkage to the original appointment document
        _type: 'online'
      });

      await updateDoc(doc(db, 'appointments', appt.id), {
        status: 'confirmed',
        checkedInAt: serverTimestamp(),
        patientId: pDocRef.id
      });

      alert("Patient checked-in successfully! Added to Doctor's waiting queue.");
      fetchData();
    } catch (err) {
      console.error('Error during check-in:', err);
      alert('Failed to check-in patient: ' + err.message);
    }
  };

  // Medicine request editor handlers
  const openRequestEditor = (req) => {
    setSelectedRequest(req);
    setEditorData({
      patientName: req.patientName || '',
      age: req.age || '',
      gender: req.gender || 'Mr.',
      subject: req.subject || '',
      duration: '3',
      amountPaid: '',
      medicines: req.medicines?.length > 0 ? req.medicines : [...DEFAULT_MEDICINES],
      additionalNote: '',
      formDate: new Date().toLocaleDateString('en-GB')
    });
  };

  const updateMedicineRow = (idx, field, value) => {
    const updated = [...editorData.medicines];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditorData({ ...editorData, medicines: updated });
  };

  const sendMedicineForm = async () => {
    if (!editorData.patientName) return alert('Patient Name is required');
    try {
      // 1. Save to medicine_forms
      await addDoc(collection(db, 'medicine_forms'), {
        ...editorData,
        requestId: selectedRequest?.id || '',
        patientId: selectedRequest?.patientId || '',
        phone: selectedRequest?.phone || '',
        createdAt: serverTimestamp()
      });

      // 2. Mark request completed
      if (selectedRequest?.id) {
        await updateDoc(doc(db, 'appointments', selectedRequest.id), {
          status: 'completed'
        });
      }

      // 3. Send Notification to patient
      if (selectedRequest?.patientId) {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedRequest.patientId,
          title: '📋 Medicine Form Ready',
          body: `Your medicine form has been prepared. Open your appointments to download.`,
          type: 'medicine_form',
          isRead: false,
          createdAt: serverTimestamp()
        });
        sendPushNotification(
          selectedRequest.patientId,
          '📋 Medicine Form Ready',
          'Your medicine form has been prepared. Open your appointments to download.',
          'medicine_form'
        );
      }

      alert('Medicine form sent to patient successfully!');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      alert('Error sending form: ' + err.message);
    }
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const medRows = editorData.medicines
      .map(m => `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: bold; color: #1e293b;">
            ${m.name}
          </td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569;">
            --- ${m.timing}
          </td>
        </tr>`)
      .join('');

    const genderTitle = editorData.gender || 'Mr.';
    const heShe = (genderTitle === 'Mrs.' || genderTitle === 'Ms.') ? 'SHE' : 'HE';

    const logoUrl = logo.startsWith('data:') ? logo : (window.location.origin + logo);
    const branchNameRaw = (userData?.branchName || 'Chandnagar').toUpperCase();
    const displayBranch = branchNameRaw.includes('HYD') ? branchNameRaw : `${branchNameRaw}, HYD, TS`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Medicine Form - ${editorData.patientName}</title>
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
      height: 95px;
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
      height: 80px;
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
    .doc-meta { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
    .subject-heading { text-align: center; font-size: 15px; font-weight: 900; letter-spacing: 1.5px; padding: 15px 0 25px; color: #0f172a; text-transform: uppercase; }
    .body-text { font-size: 13px; color: #334155; line-height: 1.8; margin-bottom: 25px; }
    .body-text p { margin-bottom: 12px; }
    .medicine-section { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 25px; }
    .medicine-header { background: #f8fafc; padding: 10px 14px; font-size: 11px; font-weight: 800; color: #298FCA; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
    .medicine-table { width: 100%; border-collapse: collapse; }
    .payment-text { font-size: 13px; color: #1e293b; font-weight: 600; margin-bottom: 25px; background: #fafafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .seal-area { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 30px; }
    
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
    <div class="doc-meta">
      <div><strong>DATE:</strong> ${editorData.formDate}</div>
      <div>support@spiritualhomeo.com</div>
    </div>
    <div class="subject-heading">TO WHOM SO EVER IT MAY CONCERN</div>
    <div class="body-text">
      <p>THIS IS TO CERTIFY THAT <span style="color: #298FCA; font-weight: 800;">${genderTitle} ${editorData.patientName.toUpperCase()}</span> AGED ABOUT <strong>${editorData.age || '__'} YEARS</strong>, HAS BEEN UNDER OUR TREATMENT AT <strong>SPIRITUAL HOMEOPATHY</strong> FOR THE MANAGEMENT OF <span style="font-weight: 800; color: #0f172a;">${(editorData.subject || '').toUpperCase()}</span>.</p>
      <p>${heShe} NEEDED TO TAKE HOMEOPATHY MEDICINE FOR <strong>${editorData.duration} MONTHS</strong>. WE RECOMMENDED THAT ${genderTitle} ${editorData.patientName.toUpperCase()} CONTINUES TO FOLLOW THE PRESCRIBED MEDICATIONS.</p>
    </div>
    <div class="medicine-section">
      <div class="medicine-header">PRESCRIBED MEDICINES</div>
      <table class="medicine-table">${medRows}</table>
    </div>
    ${editorData.amountPaid ? `<div class="payment-text">Paid Rs.${editorData.amountPaid}/- for ${editorData.duration} Months consultation and medicines.</div>` : ''}
    <div class="seal-area">
      <p style="font-style: italic;">This is a computer-generated document and does not require a physical signature.</p>
      <p style="margin-top: 6px; font-weight: bold; color: #64748b;">Spiritual Homeopathy Clinic · ${displayBranch}</p>
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

  const stopQrPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setRazorpayQrCode(null);
  };

  const confirmPayment = async (method, paymentId = '', customAmount = null, splitDetails = null) => {
    if (!selectedBill) return;
    try {
      const isSplit = method === 'split';
      const amountPaid = customAmount !== null
        ? customAmount
        : (isSplit
          ? (Number(paymentDetails.cashAmount) + Number(paymentDetails.upiAmount))
          : Number(customFeeAmount || 0));

      const itemsPaid = {
        consultation: includeConsultation ? Number(consultationFee) : 0,
        medicine: includeMedicine ? Number(medicineFee) : 0,
        dietPlan: includeDiet ? Number(dietFee) : 0,
        medicinesList: includeMedicine ? counterMedicines : [],
        prescriptionDuration: includeMedicine ? counterPrescriptionDuration : ''
      };

      const updatePayload = {
        paymentStatus: 'paid',
        paymentCollectedAt: new Date().toISOString(),
        paymentRequested: false,
        paymentMethod: method,
        amountPaid: amountPaid,
        itemsPaid: itemsPaid,
        includeDiet: includeDiet,
        paymentId: paymentId || (selectedBill.source === 'appointments' ? 'ONLINE_' : 'WALKIN_') + method.toUpperCase(),
        pendingAmount: Number(payLaterAmount) || 0,
        ...(selectedBill.status === 'completed' ? { status: 'done' } : {}),
        ...(isSplit ? {
          paymentSplitDetails: splitDetails || {
            cash: Number(paymentDetails.cashAmount),
            upi: Number(paymentDetails.upiAmount)
          }
        } : {})
      };

      // Always update allpatients — the appointments collection is no longer used
      const docRef = doc(db, 'allpatients', selectedBill.id);

      // Update payment status
      await updateDoc(docRef, updatePayload);

      // Consume checkout unlock request if it was approved
      if (unlockRequest && unlockRequest.status === 'approved') {
        try {
          await updateDoc(doc(db, 'checkout_unlock_requests', unlockRequest.id), {
            status: 'used',
            usedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Error marking unlock request as used:', err);
        }
      }

      // Mark matching nutrition plan as paid if selected
      if (includeDiet && activeDietPlanId) {
        try {
          await updateDoc(doc(db, 'nutrition_plans', activeDietPlanId), {
            paymentStatus: 'paid',
            paymentCollectedAt: new Date().toISOString(),
            paymentMethod: method,
            amountPaid: Number(dietFee)
          });

          // Send notification to patient app
          const patientUid = selectedBill.patientId || selectedBill.id;
          if (patientUid && patientUid !== 'WALKIN_USER') {
            await addDoc(collection(db, 'notifications'), {
              userId: patientUid,
              title: '🥦 30-Day Diet Plan Unlocked!',
              body: 'Your custom 30-day nutrition and diet plan is now unlocked and available in your app!',
              type: 'diet_unlocked',
              isRead: false,
              createdAt: serverTimestamp()
            });
            sendPushNotification(
              patientUid,
              '🥦 30-Day Diet Plan Unlocked!',
              'Your custom 30-day nutrition and diet plan is now unlocked and available in your app!',
              'diet_unlocked'
            );
          }
        } catch (planErr) {
          console.warn("Could not mark nutrition plan as paid:", planErr);
        }
      }

      // Sync corresponding patient document if already checked in / registered
      if (isAppointment) {
        try {
          let patientDocRef = null;
          if (selectedBill.patientId && selectedBill.patientId !== 'WALKIN_USER') {
            patientDocRef = doc(db, 'allpatients', selectedBill.patientId);
          } else {
            // Fallback: Find by phone
            const cleanPhone = (selectedBill.phone || '').replace(/\D/g, '').slice(-10);
            if (cleanPhone) {
              const qPatients = query(collection(db, 'allpatients'), where('phone', '==', cleanPhone));
              const snapPatients = await getDocs(qPatients);
              if (!snapPatients.empty) {
                patientDocRef = doc(db, 'allpatients', snapPatients.docs[0].id);
              }
            }
          }

          if (patientDocRef) {
            await updateDoc(patientDocRef, {
              paymentStatus: 'paid',
              amountPaid: amountPaid,
              itemsPaid: itemsPaid,
              includeDiet: includeDiet,
              paymentMethod: method
            });
          }
        } catch (err) {
          console.warn("Could not update corresponding patient document:", err);
        }
      }

      // Sync corresponding appointment document if it's a patient payment collection
      if (!isAppointment) {
        try {
          const apptDateStr = normalizeDateToYYYYMMDD(selectedBill.appointmentDate);
          const cleanPhone = (selectedBill.phone || '').replace(/\D/g, '').slice(-10);

          let qAppt = query(collection(db, 'appointments'), where('patientId', '==', selectedBill.id));
          let snapAppt = await getDocs(qAppt);

          if (snapAppt.empty && cleanPhone && apptDateStr) {
            qAppt = query(
              collection(db, 'appointments'),
              where('phone', '==', cleanPhone),
              where('dateString', '==', apptDateStr)
            );
            snapAppt = await getDocs(qAppt);
          }

          if (!snapAppt.empty) {
            for (const apptDoc of snapAppt.docs) {
              const currentApptStatus = apptDoc.data().status;
              await updateDoc(doc(db, 'appointments', apptDoc.id), {
                paymentStatus: 'paid',
                amountPaid: amountPaid,
                itemsPaid: itemsPaid,
                includeDiet: includeDiet,
                paymentMethod: method,
                paymentId: paymentId || 'WALKIN_' + method.toUpperCase(),
                ...(currentApptStatus === 'completed' ? { status: 'done' } : {})
              });
            }
          }
        } catch (err) {
          console.warn("Could not sync corresponding appointment payment status:", err);
        }
      }

      // Record transaction
      const targetBranchId = selectedBill.branchId || userData?.branchId || 'KPHB';
      const targetBranchName = selectedBill.branchName || userData?.branchName || 'KPHB Branch';
      const doctorName = selectedBill.doctor || selectedBill.doctorName || 'General Doctor';

      if (isSplit) {
        const cashAmt = splitDetails ? splitDetails.cash : Number(paymentDetails.cashAmount);
        const upiAmt = splitDetails ? splitDetails.upi : Number(paymentDetails.upiAmount);
        if (cashAmt > 0) {
          await addDoc(collection(db, 'alltransactions'), {
            type: includeMedicine ? 'medicine' : 'consultation',
            patientId: isAppointment ? (selectedBill.patientId || selectedBill.id) : selectedBill.id,
            patientName: selectedBill.fullName || 'Walk-in',
            amount: cashAmt,
            method: 'cash',
            branchId: targetBranchId,
            branchName: targetBranchName,
            recordedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception',
            paymentId: 'SPLIT_LEG1_CASH',
            doctor: doctorName,
            itemsPaid: itemsPaid,
            timestamp: serverTimestamp()
          });
        }
        if (upiAmt > 0) {
          await addDoc(collection(db, 'alltransactions'), {
            type: includeMedicine ? 'medicine' : 'consultation',
            patientId: isAppointment ? (selectedBill.patientId || selectedBill.id) : selectedBill.id,
            patientName: selectedBill.fullName || 'Walk-in',
            amount: upiAmt,
            method: 'upi',
            branchId: targetBranchId,
            branchName: targetBranchName,
            recordedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception',
            paymentId: 'SPLIT_LEG2_UPI',
            doctor: doctorName,
            itemsPaid: itemsPaid,
            timestamp: serverTimestamp()
          });
        }
      } else {
        await addDoc(collection(db, 'alltransactions'), {
          type: includeMedicine ? 'medicine' : 'consultation',
          patientId: isAppointment ? (selectedBill.patientId || selectedBill.id) : selectedBill.id,
          patientName: selectedBill.fullName || 'Walk-in',
          amount: amountPaid,
          method: method,
          branchId: targetBranchId,
          branchName: targetBranchName,
          recordedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception',
          paymentId: paymentId || '',
          doctor: doctorName,
          itemsPaid: itemsPaid,
          timestamp: serverTimestamp()
        });
      }

      // Send payment receipt notification
      try {
        const targetPatId = isAppointment ? (selectedBill.patientId || selectedBill.id) : selectedBill.id;
        await addDoc(collection(db, 'notifications'), {
          userId: targetPatId,
          title: '💳 Payment Received',
          body: `Payment of ₹${amountPaid} has been collected successfully via ${method.toUpperCase()} at the counter.`,
          type: 'payment_receipt',
          isRead: false,
          createdAt: serverTimestamp()
        });
        if (targetPatId && targetPatId !== 'WALKIN_USER') {
          sendPushNotification(
            targetPatId,
            '💳 Payment Received',
            `Payment of ₹${amountPaid} has been collected successfully via ${method.toUpperCase()} at the counter.`,
            'payment_receipt'
          );
        }
      } catch (notifErr) {
        console.warn("Could not create receipt notification:", notifErr);
      }

      // Add patient to patient_list collection after payment completion
      try {
        await addDoc(collection(db, 'patient_list'), {
          patientId: isAppointment ? (selectedBill.patientId || selectedBill.id) : selectedBill.id,
          fullName: selectedBill.fullName || selectedBill.patientName || 'Online Patient',
          phone: selectedBill.phone || '',
          email: selectedBill.email || '',
          regId: selectedBill.registrationId || selectedBill.regId || '',
          doctor: selectedBill.doctor || selectedBill.doctorName || '',
          branchId: targetBranchId,
          branchName: targetBranchName,
          paymentStatus: 'paid',
          paymentAmount: amountPaid,
          paymentMethod: method,
          paymentCollectedAt: serverTimestamp(),
          appointmentDate: selectedBill.appointmentDate || selectedBill.dateString || selectedBill.date || '',
          appointmentTime: selectedBill.appointmentTime || selectedBill.timeSlot || '',
          followUpDate: selectedBill.followUpDate || '',
          followUpInterval: selectedBill.followUpInterval || '',
          addedBy: userData?.name || 'Staff',
          timestamp: serverTimestamp()
        });
      } catch (listErr) {
        console.warn("Could not add patient to patient_list:", listErr);
      }

      const printInvoice = window.confirm('Payment collected successfully! Would you like to print the invoice/receipt now?');
      stopQrPolling();
      setShowPayModal(false);
      setSelectedBill(null);
      fetchData();
      if (printInvoice) {
        generatePaymentInvoice({
          patientName: selectedBill.fullName || selectedBill.patientName || 'Patient',
          phone: selectedBill.phone || 'N/A',
          doctor: selectedBill.doctor || selectedBill.doctorName || 'General Doctor',
          branch: selectedBill.branchName || userData?.branchName || 'Clinic',
          date: selectedBill.appointmentDate || selectedBill.dateString || new Date().toLocaleDateString('en-GB'),
          timeSlot: selectedBill.appointmentTime || selectedBill.timeSlot || 'N/A',
          amountPaid,
          method,
          paymentId: paymentId || '',
          isSplit,
          splitDetails: isSplit ? (splitDetails || {
            cash: Number(paymentDetails.cashAmount), upi: Number(paymentDetails.upiAmount),
            itemsPaid: selectedBill.itemsPaid || itemsPaid || null
          }) : null
        });
      }
    } catch (err) {
      alert('Error updating payment: ' + err.message);
    }
  };

  const handleShareNutritionInvoiceWhatsApp = (plan) => {
    if (!plan) return;
    let phone = plan.patientPhone || plan.phone;
    if (!phone || phone === 'N/A' || phone === '') {
      phone = prompt("Enter Patient's WhatsApp Phone Number (10 digits):", "");
      if (!phone) return;
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const patientName = plan.patientName || 'Patient';
    const doctorName = plan.doctorName || plan.doctor || 'Doctor';
    const amountPaid = plan.amountPaid || plan.amount || 0;
    const paymentMethod = (plan.paymentMethod || 'cash').toUpperCase();
    const txnId = plan.paymentId || 'N/A';
    const branchName = plan.branchName || plan.branch || userData?.branchName || 'Clinic';
    const validity = plan.startDate && plan.expiryDate ? `${plan.startDate} to ${plan.expiryDate}` : '30 Days';

    const message = `*SPIRITUAL HOMEOPATHY - NUTRITION PAYMENT RECEIPT*

Dear *${patientName}*,

Your payment for the *Custom Nutrition & 30-Day Diet Plan* has been successfully received. Thank you!

*Receipt Details:*
• *Patient Name:* ${patientName}
• *Phone:* +91 ${cleanPhone}
• *Doctor:* Dr. ${doctorName}
• *Branch:* ${branchName}
• *Total Fee Paid:* ₹${amountPaid}
• *Payment Method:* ${paymentMethod}
• *Transaction ID:* ${txnId}
• *Validity:* ${validity}
• *Payment Status:* PAID ✓

Your customized diet plan is now active! You can view it under the "Diet Plan" tab in the Patient Mobile App.

For queries, contact support at 9030 176 176 or visit www.spiritualhomeo.com`;

    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleShareNutritionDietWhatsApp = (plan) => {
    if (!plan) return;
    let phone = plan.patientPhone || plan.phone;
    if (!phone || phone === 'N/A' || phone === '') {
      phone = prompt("Enter Patient's WhatsApp Phone Number (10 digits):", "");
      if (!phone) return;
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const patientName = plan.patientName || 'Patient';
    const doctorName = plan.doctorName || plan.doctor || 'Doctor';
    const deficiencies = plan.deficiencies?.join(', ') || 'None';
    const avoid = plan.foodsToAvoid || 'None specified.';
    const eat = plan.foodsToEat || 'None specified.';

    // Construct a concise meal plan summary for the first 3 days
    let scheduleSummary = '';
    if (plan.meals && plan.meals.length > 0) {
      plan.meals.slice(0, 3).forEach(m => {
        scheduleSummary += `*Day ${m.dayNumber}:*\n• Breakfast: ${m.breakfast}\n• Lunch: ${m.lunch}\n• Snacks: ${m.snacks}\n• Dinner: ${m.dinner}\n\n`;
      });
    }

    const message = `*SPIRITUAL HOMEOPATHY - CUSTOM DIET PLAN*

Dear *${patientName}*,

Dr. *${doctorName}* has prescribed a customized 30-day diet plan for you.

*Vitals & Physical Stats:*
• *Age:* ${plan.age} yrs
• *Height:* ${plan.height} cm
• *Weight:* ${plan.weight} kg
• *BMI:* ${plan.bmi}
• *Deficiencies:* ${deficiencies}

*Dietary Guidelines:*
❌ *Foods to Avoid:*
${avoid}

✔️ *Foods to Eat:*
${eat}

*Diet Schedule (First 3 Days Preview):*
${scheduleSummary}

*Note:* You can view your complete 30-Day Diet Schedule directly on your *Spiritual Homeopathy Patient App*. Download/Open the app to track your daily progress!

Wishing you good health!`;

    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const generateNutritionPaymentInvoice = (plan) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const invoiceNo = `INV-NUT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const logoUrl = logo.startsWith('data:') ? logo : (window.location.origin + logo);
    const branchNameRaw = (plan.branchName || 'Chandnagar').toUpperCase();
    const displayBranch = branchNameRaw.includes('HYD') ? branchNameRaw : `${branchNameRaw}, HYD, TS`;

    const methodLabel = plan.paymentMethod === 'cash' ? 'Cash'
      : plan.paymentMethod === 'upi' ? 'UPI'
        : plan.paymentMethod === 'split' ? 'Split Payment'
          : plan.paymentMethod.toUpperCase();

    const splitRows = plan.paymentMethod === 'split' && plan.paymentSplitDetails ? `
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:12px;">Cash Collected at Counter</td>
        <td style="padding:10px 14px;font-weight:700;text-align:right;font-size:12px;color:#0f172a;">₹${plan.paymentSplitDetails.cash || 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:12px;">UPI / Online Collected</td>
        <td style="padding:10px 14px;font-weight:700;text-align:right;font-size:12px;color:#0f172a;">₹${plan.paymentSplitDetails.upi || 0}</td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Payment Receipt - ${plan.patientName}</title>
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
      height: 95px;
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
      height: 80px;
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
    .body { padding: 35px 40px; flex-grow: 1; }
    .section-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-bottom: 25px; }
    .info-item { display: flex; flex-direction: column; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .info-item label { font-size: 9px; color: #64748b; margin-bottom: 3px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
    .info-item span { font-size: 12px; color: #0f172a; font-weight: 600; }
    .table-section { margin-top: 10px; }
    .bill-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .bill-table th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .bill-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; }
    .price-box { margin-top: 20px; display: flex; justify-content: flex-end; }
    .price-table { width: 260px; border-collapse: collapse; }
    .price-table td { padding: 8px 14px; font-size: 12px; color: #64748b; }
    .grand-total { font-size: 15px; font-weight: 900; color: #298FCA !important; }
    .paid-badge { border: 2.5px solid #10b981; color: #10b981; font-weight: 900; padding: 3px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; display: inline-block; transform: rotate(-5deg); margin-top: 15px; }
    .footer { border-top: 1px dashed #e2e8f0; padding: 25px 40px; display: flex; justify-content: space-between; align-items: center; background: #fff; }
    .footer-left { font-size: 10px; color: #64748b; line-height: 1.5; }
    .footer-right { text-align: right; font-size: 10px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="page">
    <div>
      <div class="header">
        <div class="logo-box">
          <img src="${logoUrl}" alt="SPIRITUAL HOMEOPATHY" />
        </div>
        <div class="header-right">
          <span>BRANCH: ${displayBranch}</span>
        </div>
      </div>

      <div class="body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div>
            <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">Nutrition Receipt</h1>
            <span class="paid-badge">PAID ✓</span>
          </div>
          <div style="text-align: right; font-size: 12px; line-height: 1.6;">
            <div><strong>Receipt No:</strong> ${invoiceNo}</div>
            <div><strong>Date:</strong> ${dateStr} at ${timeStr}</div>
          </div>
        </div>

        <div class="section-title">Patient details</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Patient Name</label>
            <span>${plan.patientName}</span>
          </div>
          <div class="info-item">
            <label>Contact Number</label>
            <span>+91 ${plan.patientPhone}</span>
          </div>
          <div class="info-item">
            <label>Age / BMI</label>
            <span>${plan.age} Years / ${plan.bmi}</span>
          </div>
          <div class="info-item">
            <label>Prescribed By</label>
            <span>Dr. ${plan.doctorName}</span>
          </div>
        </div>

        <div class="section-title">Service details</div>
        <div class="table-section">
          <table class="bill-table">
            <thead>
              <tr>
                <th style="width: 70%;">Description</th>
                <th style="text-align: right; width: 30%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>30-Day Customized Indian Diet Plan</strong><br/>
                  <span style="font-size: 11px; color: #64748b; margin-top: 4px; display: inline-block;">
                    Includes custom morning/evening meal mapping and mobile notifications.<br/>
                    Deficiencies: ${plan.deficiencies?.join(', ') || 'None'}<br/>
                    Disorders: ${[plan.disorders?.sugar ? 'Diabetes' : '', plan.disorders?.bp ? 'BP' : '', plan.disorders?.thyroid ? 'Thyroid' : ''].filter(Boolean).join(', ') || 'None'}
                  </span>
                </td>
                <td style="text-align: right; font-weight: 700; font-size: 13px;">₹${(plan.amount || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="price-box">
          <table class="price-table">
            <tr>
              <td style="padding-top: 0;">Payment Method</td>
              <td style="font-weight: 700; text-align: right; color: #0f172a; padding-top: 0;">${methodLabel}</td>
            </tr>
            ${splitRows}
            <tr style="border-top: 1px solid #e2e8f0;">
              <td class="grand-total" style="padding-top: 12px;">Grand Total Paid</td>
              <td class="grand-total" style="font-weight: 900; text-align: right; padding-top: 12px;">₹${(plan.amount || 0).toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <div style="font-weight: 800; color: #0f172a;">Spiritual Homeopathy</div>
        <div>☎ 9030 176 176</div>
        <div>✉ support@spiritualhomeo.com</div>
      </div>
      <div class="footer-right">
        <div>Health & Wellness First</div>
        <div style="font-weight: 700; color: #298FCA;">www.spiritualhomeo.com</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const generatePaymentInvoice = (data) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const invoiceNo = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const methodLabel = data.method === 'cash' ? 'Cash'
      : data.method === 'upi' ? 'UPI'
        : data.method === 'split' ? 'Split Payment'
          : data.method === 'razorpay' || data.method === 'razorpay_checkout' ? 'Razorpay Online'
            : data.method === 'app' ? 'Razorpay (Patient App)'
              : data.method.toUpperCase();

    const splitRows = data.isSplit && data.splitDetails ? `
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:12px;">Cash Collected at Counter</td>
        <td style="padding:10px 14px;font-weight:700;text-align:right;font-size:12px;color:#0f172a;">₹${data.splitDetails.cash || 0}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:12px;">UPI / Online Collected</td>
        <td style="padding:10px 14px;font-weight:700;text-align:right;font-size:12px;color:#0f172a;">₹${data.splitDetails.upi || 0}</td>
      </tr>` : '';

    const medicinesHtml = (data.itemsPaid && data.itemsPaid.medicinesList && data.itemsPaid.medicinesList.length > 0) ? `
      <div class="section-title" style="margin-top: 15px;">Prescribed Medicines</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px; text-align: left; font-size: 11px; color: #64748b;">Medicine Name</th>
            <th style="padding: 10px; text-align: left; font-size: 11px; color: #64748b;">Type</th>
            <th style="padding: 10px; text-align: left; font-size: 11px; color: #64748b;">Dosage</th>
            <th style="padding: 10px; text-align: right; font-size: 11px; color: #64748b;">Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.itemsPaid.medicinesList.map(med => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px; font-size: 12px; font-weight: 600; color: #0f172a;">${med.name || '-'}</td>
              <td style="padding: 10px; font-size: 12px; color: #475569;">${med.type || '-'}</td>
              <td style="padding: 10px; font-size: 12px; color: #475569;">${med.dosage || '-'}</td>
              <td style="padding: 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right;">${med.price ? '₹' + med.price : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    const logoUrl = logo.startsWith('data:') ? logo : (window.location.origin + logo);
    const branchNameRaw = (data.branch || 'Chandnagar').toUpperCase();
    const displayBranch = branchNameRaw.includes('HYD') ? branchNameRaw : `${branchNameRaw}, HYD, TS`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Payment Receipt - ${data.patientName}</title>
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
      height: 95px;
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
      height: 80px;
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
    .amount-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1.5px dashed #22c55e;
      border-radius: 12px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }
    .amount-label { font-size: 10px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .amount-val { font-size: 26px; font-weight: 900; color: #166534; margin-top: 4px; }
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
    .split-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #fafafb; border-radius: 8px; overflow: hidden; border: 1px solid #f1f5f9; }
    .split-table td { padding: 10px 14px; font-size: 12px; color: #475569; }
    .split-table tr:not(:last-child) td { border-bottom: 1px dashed #e2e8f0; }
    .meta-footer { font-size: 10px; color: #94a3b8; line-height: 1.8; margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 15px; display: flex; flex-direction: column; gap: 3px; }
    
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
      <h2 style="font-size: 16px; font-weight: 900; letter-spacing: 1px; color: #1e293b; text-transform: uppercase;">Payment Receipt</h2>
      <div class="invoice-tag">RECEIPT</div>
    </div>

    <div class="section-title">Patient Details</div>
    <div class="info-grid">
      <div class="info-item"><label>Patient Name</label><span>${data.patientName}</span></div>
      <div class="info-item"><label>Phone Number</label><span>+91 ${data.phone}</span></div>
      <div class="info-item"><label>Consultant Doctor</label><span>${data.doctor}</span></div>
      <div class="info-item"><label>Clinic Branch</label><span>${data.branch}</span></div>
      <div class="info-item"><label>Appointment Date</label><span>${data.date}</span></div>
      <div class="info-item"><label>Time Slot</label><span>${data.timeSlot}</span></div>
    </div>
    
    <div class="section-title">Payment Information</div>
    <div class="amount-box">
      <div>
        <div class="amount-label">Total Amount Paid</div>
        <div class="amount-val">₹${Number(data.amountPaid).toFixed(2)}</div>
      </div>
      <div style="text-align: right;">
        <span class="badge-paid">PAID ✓</span>
        <div style="font-size: 9px; font-weight: 800; color: #475569; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px;">via ${methodLabel}</div>
      </div>
    </div>

    ${data.isSplit ? `<table class="split-table">${splitRows}</table>` : ''}

    ${medicinesHtml}
      <div class="meta-footer">
      ${data.paymentId ? `<div><strong>Payment ID:</strong> ${data.paymentId}</div>` : ''}
      <div><strong>Invoice No:</strong> ${invoiceNo}</div>
      <div><strong>Issued At:</strong> ${dateStr} at ${timeStr}</div>
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
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const generateRazorpayQR = async () => {
    if (loadingQr) return;
    setLoadingQr(true);
    setRazorpayQrCode(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    try {
      const authHeader = 'Basic ' + window.btoa(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET);
      const feeAmount = Number(customFeeAmount || 0);

      const response = await fetch('https://api.razorpay.com/v1/qr_codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          type: 'upi_qr',
          name: 'Spiritual Homeopathy Clinic',
          usage: 'single_use',
          fixed_amount: true,
          amount: Math.round(Number(feeAmount) * 100),
          description: `${includeMedicine ? 'Consultation & Medicine Fee' : 'Consultation Fee'} for ${selectedBill.fullName || 'Patient'}`
        })
      });

      const qrData = await response.json();

      if (qrData && qrData.id) {
        setRazorpayQrCode(qrData);

        // Poll every 4 seconds for payment confirmation
        pollingRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch(`https://api.razorpay.com/v1/qr_codes/${qrData.id}/payments`, {
              headers: { 'Authorization': authHeader }
            });
            const payData = await checkRes.json();
            if (payData?.items?.length > 0) {
              const paid = payData.items.find(item => item.status === 'captured' || item.status === 'authorized');
              if (paid) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
                await confirmPayment('upi', paid.id);
              }
            }
          } catch (pollErr) {
            console.warn('QR Poll Error:', pollErr);
          }
        }, 4000);
      } else {
        alert('QR Error: ' + (qrData?.error?.description || 'Failed to generate Razorpay QR.'));
      }
    } catch (e) {
      alert('Network Error: Could not connect to Razorpay.');
      console.error('Razorpay QR Error:', e);
    } finally {
      setLoadingQr(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async () => {
    setProcessingRzp(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Razorpay Checkout SDK failed to load. Please check your internet connection.');
        setProcessingRzp(false);
        return;
      }

      const feeAmount = Number(customFeeAmount || 0);
      const cleanPhone = (selectedBill.phone || '').replace(/\D/g, '').slice(-10);

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(Number(feeAmount) * 100), // in paise
        currency: 'INR',
        name: 'Spiritual Homeopathy Clinic',
        description: `${includeMedicine ? 'Consultation & Medicine Fee' : 'Consultation Fee'} - ${selectedBill.fullName || 'Patient'}`,
        image: 'https://i.imgur.com/3g7A6tw.png',
        handler: async function (response) {
          const paymentId = response.razorpay_payment_id;
          await confirmPayment('razorpay', paymentId);
        },
        prefill: {
          name: selectedBill.fullName || '',
          contact: cleanPhone || '',
          email: selectedBill.email || ''
        },
        theme: {
          color: '#258ec8'
        },
        modal: {
          ondismiss: function () {
            setProcessingRzp(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Error opening Razorpay:', err);
      alert('Razorpay Checkout Error: ' + err.message);
    } finally {
      setProcessingRzp(false);
    }
  };

  const handleShareReceiptWhatsApp = (bill) => {
    if (!bill) return;
    let phone = bill.phone;
    if (!phone || phone === 'N/A' || phone === '') {
      phone = prompt("Enter Patient's WhatsApp Phone Number (10 digits):", "");
      if (!phone) return;
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const patientName = bill.fullName || bill.patientName || 'Patient';
    const doctorName = bill.doctor || bill.doctorName || 'General Doctor';
    const apptDate = bill.appointmentDate || bill.dateString || new Date().toLocaleDateString('en-GB');
    const timeSlot = bill.appointmentTime || bill.timeSlot || 'N/A';
    const amountPaid = bill.amountPaid || bill.paymentAmount || customFeeAmount;
    const paymentMethod = (bill.paymentMethod || 'online').toUpperCase();
    const txnId = bill.paymentId || 'N/A';
    const branchName = bill.branchName || userData?.branchName || 'Clinic';

    const message = `*SPIRITUAL HOMEOPATHY - PAYMENT RECEIPT*

Dear *${patientName}*,

Your payment has been successfully received. Thank you!

*Receipt Details:*
• *Patient Name:* ${patientName}
• *Phone:* +91 ${cleanPhone}
• *Doctor:* Dr. ${doctorName}
• *Branch:* ${branchName}
• *Appointment:* ${apptDate} (${timeSlot})
• *Total Fee:* ₹${amountPaid}
• *Payment Method:* ${paymentMethod}
• *Transaction ID:* ${txnId}
• *Payment Status:* PAID ✓

For queries, contact support at 9030 176 176 or visit www.spiritualhomeo.com`;

    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleRequestUnlock = async () => {
    if (!selectedBill) return;
    setRequestingUnlock(true);
    try {
      await addDoc(collection(db, 'checkout_unlock_requests'), {
        billId: selectedBill.id,
        patientName: selectedBill.fullName || selectedBill.patientName || 'Patient',
        patientPhone: selectedBill.phone || 'N/A',
        branchId: selectedBill.branchId || userData?.branchId || 'Unknown',
        branchName: selectedBill.branchName || userData?.branchName || 'Unknown',
        requestedBy: userData?.name || 'Receptionist',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('Unlock request sent to HR. Waiting for approval...');
    } catch (err) {
      console.error('Error creating unlock request:', err);
      alert('Failed to send unlock request.');
    } finally {
      setRequestingUnlock(false);
    }
  };

  const handleSendFeeToPatient = async (splitDetails = null) => {
    if (!selectedBill) return;
    const isSplit = !!splitDetails;
    try {
      // Always update allpatients — the appointments collection is no longer used
      const docRef = doc(db, 'allpatients', selectedBill.id);

      const itemsPaid = {
        consultation: includeConsultation ? Number(consultationFee) : 0,
        medicine: includeMedicine ? Number(medicineFee) : 0,
        dietPlan: includeDiet ? Number(dietFee) : 0,
        medicinesList: includeMedicine ? counterMedicines : [],
        prescriptionDuration: includeMedicine ? counterPrescriptionDuration : ''
      };

      const updatePayload = {
        paymentRequested: true,
        requestedAmount: Number(isSplit ? splitDetails.upiAmount : customFeeAmount),
        paymentRequestedAt: serverTimestamp(),
        paymentMethod: isSplit ? 'split' : 'online',
        itemsPaid: itemsPaid,
        pendingAmount: Number(payLaterAmount) || 0,
        ...(isSplit ? {
          splitCounterAmount: Number(splitDetails.counterAmount),
          splitCounterMethod: splitDetails.counterMethod || 'cash',
          splitUpiAmount: Number(splitDetails.upiAmount)
        } : {})
      };

      await updateDoc(docRef, updatePayload);

      // Consume checkout unlock request if it was approved
      if (unlockRequest && unlockRequest.status === 'approved') {
        try {
          await updateDoc(doc(db, 'checkout_unlock_requests', unlockRequest.id), {
            status: 'used',
            usedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Error marking unlock request as used:', err);
        }
      }

      // Determine patientId for push notification
      const patientUserId = selectedBill.patientId || selectedBill.id;

      // Send push notification to patient's app
      try {
        const totalAmount = isSplit
          ? (Number(splitDetails.counterAmount) + Number(splitDetails.upiAmount))
          : Number(customFeeAmount);

        const notifBody = isSplit
          ? `₹${splitDetails.counterAmount} collected via ${(splitDetails.counterMethod || 'cash').toUpperCase()} at counter. Please pay remaining ₹${splitDetails.upiAmount} via UPI in the app.`
          : `Spiritual Homeopathy - ${selectedBill.branchName || 'Clinic'} has requested ₹${customFeeAmount} for your consultation. Tap to pay online.`;

        await addDoc(collection(db, 'notifications'), {
          userId: patientUserId,
          title: isSplit ? '💰 Split Payment Requested' : '💳 Fee Payment Requested',
          body: notifBody,
          type: 'payment_request',
          amount: totalAmount,
          isRead: false,
          createdAt: serverTimestamp()
        });
        if (patientUserId && patientUserId !== 'WALKIN_USER') {
          sendPushNotification(
            patientUserId,
            isSplit ? '💰 Split Payment Requested' : '💳 Fee Payment Requested',
            notifBody,
            'payment_request'
          );
        }
      } catch (notifErr) {
        console.warn('Could not send payment notification:', notifErr);
      }

      const msg = isSplit
        ? `Split payment request sent! ₹${splitDetails.counterAmount} collected at counter (${splitDetails.counterMethod}), ₹${splitDetails.upiAmount} requested via patient app.`
        : `Fee request of ₹${customFeeAmount} sent to the patient's app!`;
      alert(msg);

      setShowPayModal(false);
      setSelectedBill(null);
      fetchData();
    } catch (e) {
      console.error("Error sending fee to patient:", e);
      alert("Failed to send payment request.");
    }
  };

  const generatePrefilledDiet = (age, deficiencies, disorders) => {
    const baseBreakfast = [
      "Idli with Ginger Chutney & Sambhar",
      "Poha with Sprouts & Mint Coriander Chutney",
      "Millet Rava Upma with roasted peanuts",
      "Oats Porridge with Almonds & Flaxseeds",
      "Sprouted Moong Besan Chilla with Curd"
    ];
    const baseLunch = [
      "Ragi Roti + Mixed Dal + Sautéed Bhindi + Sprouted salad",
      "Brown Rice + Beetroot Kadhi + Palak Paneer + Cucumber Raita",
      "Jowar Roti + Lauki Sabzi + Chana Masala + Spiced Buttermilk",
      "Multigrain Roti + Soya Chunk Curry + Methi Aloo + Curd"
    ];
    const baseSnack = [
      "Roasted Makhana with green tea",
      "Mixed fruit bowl (Papaya & Apple) with pumpkin seeds",
      "Boiled Black Chana Salad with lemon juice",
      "Dry fruits (Almonds & Walnuts) + Coconut water",
      "Sesame Chikki (Low sugar)"
    ];
    const baseDinner = [
      "Moong Dal Khichdi + Lauki Raita + Roasted Papad",
      "Oats & Vegetable Soup + Paneer Tikka (Grilled)",
      "Jowar Dosa with Tomato Chutney + Dal Tadka",
      "Wheat Dalia Khichdi + Mixed Veg Salad + Curd"
    ];

    const deficiencyMeals = {
      "Iron": {
        breakfast: "Sprouted Moong Besan Chilla with Mint Chutney",
        lunch: "Beetroot Curd Rice + Palak Dal + Sautéed Greens",
        snack: "Dates & Pomegranate Fruit Salad",
        dinner: "Sautéed Paneer & Broccoli with Sesame seeds"
      },
      "Calcium": {
        breakfast: "Ragi Idli with Coconut Chutney & Milk",
        lunch: "Multigrain Roti + Paneer Bhurji + Thick Curd",
        snack: "Almonds & Roasted Sesame seeds bowl",
        dinner: "Dal Makhani (with rajma) + Steamed Broccoli + Curd"
      },
      "Vitamin D": {
        breakfast: "Mushroom Omelette or Sautéed Mushrooms with Tofu",
        lunch: "Fortified Tofu Bhurji with Missi Rotis",
        snack: "Yogurt with walnuts and pumpkin seeds",
        dinner: "Mushroom Soup + Stir fry Broccoli & Paneer"
      },
      "Vitamin C": {
        breakfast: "Sprouted Moong Chilla with Tomato Chutney",
        lunch: "Mixed Veg Sabzi (Capsicum & Lemon) with Rotis",
        snack: "Orange/Guava fruit bowl with Chia seeds",
        dinner: "Tomato Soup & Sautéed Paneer with bell peppers"
      },
      "Vitamin A": {
        breakfast: "Sweet Potato Hash or Carrot Oats Porridge",
        lunch: "Spinach Roti with Pumpkin Curry & Salad",
        snack: "Papaya Bowl or Mango slices",
        dinner: "Carrot Ginger Soup with Stir-fried Spinach & Tofu"
      },
      "Vitamin B": {
        breakfast: "Oats Porridge with Almonds & Banana",
        lunch: "Brown Rice, Dal Tadka, Sautéed Greens & Curd",
        snack: "Roasted Almonds & Walnut mix",
        dinner: "Paneer Bhurji with 1 Multigrain Roti"
      },
      "Vitamin E": {
        breakfast: "Almond Butter Toast or Oats with Sunflower seeds",
        lunch: "Spinach & Avocado Salad, Multigrain Roti with Dal",
        snack: "Handful of Peanuts & Almonds",
        dinner: "Stir-fried Broccoli & Paneer in Olive oil"
      },
      "Vitamin K": {
        breakfast: "Green Smoothie (Spinach/Banana) or Methi Chilla",
        lunch: "Palak Khichdi with Cucumber Raita & Salad",
        snack: "Roasted Makhana or Broccoli florets",
        dinner: "Cabbage Stir-fry with Tofu & Lentil Soup"
      },
      "Potassium": {
        breakfast: "Banana Oat Smoothie or Potato Poha",
        lunch: "Jowar Roti with Masoor Dal & Beetroot Salad",
        snack: "Coconut water & Citrus fruit bowl",
        dinner: "Sweet Potato Khichdi & Greek Yogurt"
      },
      "Magnesium": {
        breakfast: "Almond Oats Porridge with Pumpkin seeds",
        lunch: "Brown Rice, Spinach Dal, Sautéed Beans & Raita",
        snack: "Pumpkin seeds & Dark Chocolate square (70%+)",
        dinner: "Paneer Tikka with Avocado Salad"
      },
      "Zinc": {
        breakfast: "Sesame seeds Oatmeal or Chickpea Chilla",
        lunch: "Chana Masala with Jowar Roti & Cucumber Salad",
        snack: "Roasted Pumpkin & Sesame seeds mix",
        dinner: "Moong Dal Soup with Sautéed Mushroom & Tofu"
      }
    };

    const meals = [];
    for (let day = 1; day <= 30; day++) {
      const idxB = (day - 1) % baseBreakfast.length;
      const idxL = (day - 1) % baseLunch.length;
      const idxS = (day - 1) % baseSnack.length;
      const idxD = (day - 1) % baseDinner.length;

      let b = baseBreakfast[idxB];
      let l = baseLunch[idxL];
      let s = baseSnack[idxS];
      let d = baseDinner[idxD];

      const activeDefs = (deficiencies || []).filter(def => deficiencyMeals[def]);
      if (activeDefs.length > 0) {
        if (day % 2 === 1) {
          const defIndex = Math.floor(day / 2) % activeDefs.length;
          const selectedDef = activeDefs[defIndex];
          const overrides = deficiencyMeals[selectedDef];
          b = overrides.breakfast;
          l = overrides.lunch;
          s = overrides.snack;
          d = overrides.dinner;
        }
      }

      if (disorders.sugar) {
        b = b.replace(/Idli/i, "Ragi Idli").replace(/Poha/i, "Methi Poha").replace(/Upma/i, "Millet Upma");
        l = l.replace(/Brown Rice/i, "Millet Khichdi").replace(/Rotis/i, "Missi Rotis (Chana flour)");
        s = s.replace(/Chikki/i, "Roasted Walnuts");
        d = d.replace(/Khichdi/i, "Millet Khichdi").replace(/Roti/i, "Missi Roti");
      }

      if (disorders.bp) {
        b = b + " (Low Sodium)";
        l = l + " (No added salt)";
        s = s + " (Unsalted)";
        d = d + " (Low Sodium)";
      }

      if (disorders.thyroid) {
        l = l.replace(/Cabbage/i, "Lauki").replace(/Soya/i, "Paneer");
      }

      if (age < 12) {
        b = b + " (Kids Portion)";
        l = l + " (Mild spices)";
      } else if (age > 60) {
        b = b + " (Soft texture)";
        l = l + " (Easy to digest)";
        d = d + " (Light dinner)";
      }

      meals.push({
        dayNumber: day,
        breakfast: b,
        lunch: l,
        snacks: s,
        dinner: d
      });
    }

    return meals;
  };

  const handleOpenNutritionEdit = (plan) => {
    setSelectedNutritionPlan(plan);
    setEditNutritionAge(plan.age || '');
    setEditNutritionHeight(plan.height || '');
    setEditNutritionWeight(plan.weight || '');
    setEditNutritionBmi(plan.bmi || 0);
    setEditNutritionAmount(plan.amount || '500');
    setEditNutritionDeficiencies(plan.deficiencies || []);
    setEditNutritionDisorders(Array.isArray(plan.disorders) ? plan.disorders : []);
    setEditNutritionOtherDiseases(plan.diseases || '');
    setEditNutritionSymptoms(plan.symptoms || '');
    setEditNutritionAvoid(plan.foodsToAvoid || '');
    setEditNutritionEat(plan.foodsToEat || '');
    setEditNutritionMeals(plan.meals || []);
    setShowNutritionEditModal(true);
  };

  const handleRegenerateNutritionMeals = () => {
    const ageVal = parseInt(editNutritionAge, 10) || 30;
    const meals = generatePrefilledDiet(ageVal, editNutritionDeficiencies, editNutritionDisorders);
    setEditNutritionMeals(meals);
  };

  const handleSaveNutritionEdit = async (e) => {
    e.preventDefault();
    if (!selectedNutritionPlan) return;
    setSavingNutritionEdit(true);
    try {
      if (selectedNutritionPlan.isNew || !selectedNutritionPlan.id) {
        // Create new plan
        const start = new Date();
        const startStr = start.toISOString().split('T')[0];
        const expiry = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiryStr = expiry.toISOString().split('T')[0];

        const targetPatient = selectedPatientFile || selectedNutritionPlan.patientFile;
        if (!targetPatient) {
          alert('No patient file selected.');
          setSavingNutritionEdit(false);
          return;
        }

        const planData = {
          patientId: targetPatient.patientId || targetPatient.id,
          patientName: targetPatient.fullName,
          patientPhone: targetPatient.phone,
          age: Number(editNutritionAge),
          height: Number(editNutritionHeight),
          weight: Number(editNutritionWeight),
          bmi: Number(editNutritionBmi),
          deficiencies: editNutritionDeficiencies,
          disorders: editNutritionDisorders,
          diseases: editNutritionOtherDiseases,
          symptoms: editNutritionSymptoms,
          foodsToAvoid: editNutritionAvoid,
          foodsToEat: editNutritionEat,
          amount: Number(editNutritionAmount),
          paymentStatus: 'pending',
          startDate: startStr,
          expiryDate: expiryStr,
          doctorId: targetPatient.doctorId || targetPatient.doctor || 'receptionist',
          doctorName: targetPatient.doctorName || targetPatient.doctor || 'Clinic Doctor',
          branchId: targetPatient.branchId || userData?.branchId || 'KPHB',
          branchName: targetPatient.branchName || userData?.branchName || 'KPHB Branch',
          meals: editNutritionMeals,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: userData?.name || userData?.email || 'Receptionist'
        };

        await addDoc(collection(db, 'nutrition_plans'), planData);

        // Add notification for patient app
        const targetUserId = targetPatient.patientId || targetPatient.id;
        if (targetUserId && targetUserId !== 'WALKIN_USER') {
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: targetUserId,
              title: '🥦 30-Day Nutrition Plan Issued!',
              body: `A custom 30-day diet plan has been created for you. Complete the payment of ₹${editNutritionAmount} at the reception to unlock the plan.`,
              type: 'payment_requested',
              isRead: false,
              createdAt: serverTimestamp()
            });
          } catch (notifErr) {
            console.error("Error sending notification for new nutrition plan:", notifErr);
          }
        }

        alert('Nutrition Plan created successfully!');
      } else {
        // Update existing plan
        const planRef = doc(db, 'nutrition_plans', selectedNutritionPlan.id);
        await updateDoc(planRef, {
          age: Number(editNutritionAge),
          height: Number(editNutritionHeight),
          weight: Number(editNutritionWeight),
          bmi: Number(editNutritionBmi),
          amount: Number(editNutritionAmount),
          deficiencies: editNutritionDeficiencies,
          disorders: editNutritionDisorders,
          diseases: editNutritionOtherDiseases,
          symptoms: editNutritionSymptoms,
          foodsToAvoid: editNutritionAvoid,
          foodsToEat: editNutritionEat,
          meals: editNutritionMeals,
          updatedAt: serverTimestamp(),
          updatedBy: userData?.name || userData?.email || 'Receptionist'
        });
        alert('Nutrition Plan updated successfully!');
      }

      setShowNutritionEditModal(false);
      setSelectedNutritionPlan(null);

      // Refresh patient file nutrition plans if open
      if (selectedPatientFile && selectedPatientFile.phone) {
        fetchPatientFileNutritionPlans(selectedPatientFile.phone);
      }
    } catch (err) {
      console.error("Error saving nutrition plan:", err);
      alert("Failed to save nutrition plan.");
    } finally {
      setSavingNutritionEdit(false);
    }
  };

  const handleOpenNutritionPay = (plan) => {
    setSelectedNutritionPayPlan(plan);
    setCustomFeeAmount(String(plan.amount || 0));
    setPaymentDetails({ method: 'cash', cashAmount: '', upiAmount: '' });
    setShowNutritionPayModal(true);
  };

  const confirmNutritionPayment = async (method, paymentId = '', splitDetails = null) => {
    if (!selectedNutritionPayPlan) return;
    try {
      const isSplit = method === 'split';
      const amountPaid = isSplit
        ? (Number(paymentDetails.cashAmount) + Number(paymentDetails.upiAmount))
        : Number(customFeeAmount);

      const updatePayload = {
        paymentStatus: 'paid',
        paymentCollectedAt: new Date().toISOString(),
        paymentMethod: method,
        amountPaid: amountPaid,
        paymentId: paymentId || 'NUTRITION_' + method.toUpperCase(),
        ...(isSplit ? {
          paymentSplitDetails: splitDetails || {
            cash: Number(paymentDetails.cashAmount),
            upi: Number(paymentDetails.upiAmount)
          }
        } : {})
      };

      const docRef = doc(db, 'nutrition_plans', selectedNutritionPayPlan.id);
      await updateDoc(docRef, updatePayload);

      // Send notification to patient app
      const patientUid = selectedNutritionPayPlan.patientId;
      if (patientUid && patientUid !== 'WALKIN_USER') {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: patientUid,
            title: '🥦 30-Day Diet Plan Unlocked!',
            body: 'Your custom 30-day nutrition and diet plan is now unlocked and available in your app!',
            type: 'diet_unlocked',
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (notifErr) {
          console.warn("Could not send nutrition unlock notification to patient:", notifErr);
        }
      }

      // Record transaction
      const targetBranchId = selectedNutritionPayPlan.branchId || userData?.branchId || 'KPHB';
      const targetBranchName = selectedNutritionPayPlan.branchName || userData?.branchName || 'KPHB Branch';
      const doctorName = selectedNutritionPayPlan.doctorName || 'Doctor';

      if (isSplit) {
        const cashAmt = splitDetails ? splitDetails.cash : Number(paymentDetails.cashAmount);
        const upiAmt = splitDetails ? splitDetails.upi : Number(paymentDetails.upiAmount);
        if (cashAmt > 0) {
          await addDoc(collection(db, 'alltransactions'), {
            type: 'nutrition',
            patientId: selectedNutritionPayPlan.patientId,
            patientName: selectedNutritionPayPlan.patientName,
            amount: cashAmt,
            method: 'cash',
            branchId: targetBranchId,
            branchName: targetBranchName,
            recordedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception',
            paymentId: 'SPLIT_LEG1_CASH',
            doctor: doctorName,
            timestamp: serverTimestamp()
          });
        }
        if (upiAmt > 0) {
          await addDoc(collection(db, 'alltransactions'), {
            type: 'nutrition',
            patientId: selectedNutritionPayPlan.patientId,
            patientName: selectedNutritionPayPlan.patientName,
            amount: upiAmt,
            method: 'upi',
            branchId: targetBranchId,
            branchName: targetBranchName,
            recordedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception',
            paymentId: 'SPLIT_LEG2_UPI',
            doctor: doctorName,
            timestamp: serverTimestamp()
          });
        }
      } else {
        await addDoc(collection(db, 'alltransactions'), {
          type: 'nutrition',
          patientId: selectedNutritionPayPlan.patientId,
          patientName: selectedNutritionPayPlan.patientName,
          amount: amountPaid,
          method: method,
          branchId: targetBranchId,
          branchName: targetBranchName,
          recordedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception',
          paymentId: paymentId || '',
          doctor: doctorName,
          timestamp: serverTimestamp()
        });
      }

      // Send payment receipt notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedNutritionPayPlan.patientId,
          title: '🥦 Nutrition Plan Unlocked!',
          body: `Payment of ₹${amountPaid} has been collected successfully via ${method.toUpperCase()}. Your custom 30-day diet plan is now active!`,
          type: 'nutrition_unlocked',
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Could not send nutrition unlock notification:", err);
      }

      alert('Nutrition Payment collected successfully!');
      generateNutritionPaymentInvoice({
        ...selectedNutritionPayPlan,
        paymentMethod: method,
        paymentSplitDetails: splitDetails || {
          cash: Number(paymentDetails.cashAmount),
          upi: Number(paymentDetails.upiAmount)
        }
      });
      setShowNutritionPayModal(false);
      setSelectedNutritionPayPlan(null);
    } catch (e) {
      console.error("Error confirming nutrition payment:", e);
      alert("Failed to confirm nutrition payment.");
    }
  };

  const handleCollectNutritionPayment = async (e) => {
    e.preventDefault();
    if (paymentDetails.method === 'split') {
      const totalSplit = Number(paymentDetails.cashAmount) + Number(paymentDetails.upiAmount);
      if (totalSplit !== Number(customFeeAmount)) {
        alert(`Split amounts (₹${totalSplit}) must equal the total fee (₹${customFeeAmount})`);
        return;
      }
    }
    await confirmNutritionPayment(paymentDetails.method);
  };

  const handleLockGeneralAmount = async () => {
    if (!selectedBill) return;
    try {
      const collectionName = selectedBill.source === 'appointments' ? 'appointments' : 'allpatients';
      const totalAmt = (includeConsultation ? Number(consultationFee) : 0) +
        (includeMedicine ? Number(medicineFee) : 0) +
        (includeDiet ? Number(dietFee) : 0);

      await updateDoc(doc(db, collectionName, selectedBill.id), {
        amountLocked: true,
        consultationFee: includeConsultation ? Number(consultationFee) : 0,
        medicineFeeRequested: includeMedicine ? Number(medicineFee) : 0,
        paymentAmount: totalAmt,
        updatedAt: serverTimestamp()
      });
      alert('Billing amount locked successfully!');
    } catch (err) {
      alert('Failed to lock billing amount: ' + err.message);
    }
  };

  const handleLockNutritionAmount = async () => {
    if (!selectedNutritionPayPlan) return;
    try {
      await updateDoc(doc(db, 'nutrition_plans', selectedNutritionPayPlan.id), {
        amountLocked: true,
        amount: Number(customFeeAmount),
        updatedAt: serverTimestamp()
      });
      alert('Nutrition billing amount locked successfully!');
    } catch (err) {
      alert('Failed to lock nutrition amount: ' + err.message);
    }
  };

  const handleSubmitAmountChangeRequest = async () => {
    const isNutrition = !!selectedNutritionPayPlan;
    const targetDoc = isNutrition ? selectedNutritionPayPlan : selectedBill;
    if (!targetDoc) return;

    const proposedVal = Number(proposedNewAmount);
    if (!proposedVal || proposedVal <= 0) {
      alert('Please enter a valid proposed amount.');
      return;
    }
    if (!amountRequestReason.trim()) {
      alert('Please enter a reason for the amount change request.');
      return;
    }

    setIsSubmittingAmountRequest(true);
    try {
      const currentAmt = isNutrition ? Number(targetDoc.amount) : Number(customFeeAmount);

      await addDoc(collection(db, 'hr_amount_requests'), {
        targetId: targetDoc.id,
        targetCollection: isNutrition ? 'nutrition_plans' : (targetDoc.source === 'appointments' ? 'appointments' : 'allpatients'),
        patientName: isNutrition ? targetDoc.patientName : targetDoc.fullName,
        patientPhone: isNutrition ? targetDoc.patientPhone : targetDoc.phone,
        branchId: targetDoc.branchId || userData?.branchId || 'KPHB',
        branchName: targetDoc.branchName || userData?.branchName || 'KPHB Branch',
        currentAmount: currentAmt,
        proposedAmount: proposedVal,
        reason: amountRequestReason,
        status: 'pending',
        requestedBy: userData?.name || 'Receptionist',
        requestedAt: serverTimestamp()
      });

      alert('Amount change request submitted to HR successfully!');
      setProposedNewAmount('');
      setAmountRequestReason('');
    } catch (err) {
      console.error('Error submitting HR request:', err);
      alert('Failed to submit request: ' + err.message);
    } finally {
      setIsSubmittingAmountRequest(false);
    }
  };

  const cleanupExpiredDietPDFs = async () => {
    try {
      const todayISO = new Date().toISOString();
      const qExpired = query(
        collection(db, 'nutrition_plans'),
        where('pdfDeleteAt', '<=', todayISO)
      );
      const snap = await getDocs(qExpired);
      if (snap.empty) return;

      const { deleteObject } = await import('firebase/storage');

      for (const docSnap of snap.docs) {
        const plan = docSnap.data();
        if (plan.pdfUrl) {
          try {
            const fileRef = ref(storage, `diet_plans/${docSnap.id}.pdf`);
            await deleteObject(fileRef);
          } catch (storageErr) {
            console.warn('Storage file deletion failed or already deleted:', storageErr);
          }
        }
        await updateDoc(doc(db, 'nutrition_plans', docSnap.id), {
          pdfUrl: null,
          pdfDeleteAt: null,
          pdfDeleted: true,
          updatedAt: serverTimestamp()
        });
      }
      console.log(`Cleaned up ${snap.size} expired diet plan PDFs.`);
    } catch (err) {
      console.error('Error cleaning up expired PDFs:', err);
    }
  };

  const handleGenerateAndShareDietPDF = async (plan) => {
    if (!plan) return;

    if (plan.pdfUrl) {
      try {
        await navigator.clipboard.writeText(plan.pdfUrl);
        alert("Diet PDF Link copied to clipboard!");
      } catch (err) {
        window.prompt("Copy Diet PDF URL:", plan.pdfUrl);
      }

      const shareMsg = `Dear ${plan.patientName}, you can view and download your customized 30-Day Diet Plan PDF here: ${plan.pdfUrl}`;
      const waUrl = `https://wa.me/91${(plan.patientPhone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(shareMsg)}`;
      window.open(waUrl, '_blank');
      return;
    }

    setGeneratingPdfId(plan.id);
    try {
      const html2pdf = await loadHtml2Pdf();

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `diet_plan_${plan.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '790px';

      const now = new Date();
      const genDate = now.toLocaleDateString('en-GB');
      const genTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #000; padding: 20px; line-height: 1.4; background-color: #fff;">
          <div style="border: 3px solid #000; padding: 15px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #000;">
                  SPIRITUAL HOMEOPATHY
                </td>
                <td style="text-align: right; font-size: 11px; font-weight: bold; color: #000; line-height: 1.6;">
                  <div>BRANCH: ${(plan.branchName || 'Nallagandla Branch').toUpperCase()}</div>
                  <div>☎ CONTACT: 9030 176 176</div>
                  <div>GENERATED: ${genDate} at ${genTime}</div>
                </td>
              </tr>
            </table>
          </div>

          <div style="border: 2px solid #000; padding: 12px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 13px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 4px; color: #000;">
              PATIENT PROFILE & VITALS
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #000;">
              <tr>
                <td style="padding: 4px 0; width: 50%;"><strong>Patient Name:</strong> ${plan.patientName}</td>
                <td style="padding: 4px 0; width: 50%;"><strong>Contact Number:</strong> +91 ${plan.patientPhone || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Age:</strong> ${plan.age} Years</td>
                <td style="padding: 4px 0;"><strong>Vitals:</strong> Ht: ${plan.height} cm | Wt: ${plan.weight} kg | BMI: ${plan.bmi}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong>Prescribed By:</strong> Dr. ${plan.doctorName}</td>
                <td style="padding: 4px 0;"><strong>Deficiencies:</strong> ${plan.deficiencies?.join(', ') || 'None'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;" colspan="2"><strong>Health Disorders:</strong> ${[plan.disorders?.sugar ? 'Diabetes' : '', plan.disorders?.bp ? 'BP' : '', plan.disorders?.thyroid ? 'Thyroid' : ''].filter(Boolean).join(', ') || 'None'}</td>
              </tr>
            </table>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="border: 2px solid #000; padding: 12px;">
              <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #000; border-bottom: 1.5px solid #000; padding-bottom: 4px; text-transform: uppercase;">
                ❌ FOODS TO AVOID
              </h3>
              <div style="font-size: 11px; color: #000; white-space: pre-line; font-weight: bold;">
                ${plan.foodsToAvoid || 'None specified.'}
              </div>
            </div>
            <div style="border: 2px solid #000; padding: 12px;">
              <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold; color: #000; border-bottom: 1.5px solid #000; padding-bottom: 4px; text-transform: uppercase;">
                ✔️ FOODS TO EAT
              </h3>
              <div style="font-size: 11px; color: #000; white-space: pre-line; font-weight: bold;">
                ${plan.foodsToEat || 'None specified.'}
              </div>
            </div>
          </div>

          <div style="border: 2px solid #000; margin-bottom: 15px;">
            <h3 style="margin: 8px; font-size: 13px; font-weight: bold; text-align: center; text-transform: uppercase; color: #000;">
              30-DAY CUSTOMIZED DIET SCHEDULE
            </h3>
          </div>

          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 11px; color: #000;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 2px solid #000; padding: 6px; font-weight: bold; width: 8%; text-align: center;">Day</th>
                <th style="border: 2px solid #000; padding: 6px; font-weight: bold; width: 23%;">Breakfast (Morning)</th>
                <th style="border: 2px solid #000; padding: 6px; font-weight: bold; width: 23%;">Lunch (Afternoon)</th>
                <th style="border: 2px solid #000; padding: 6px; font-weight: bold; width: 23%;">Snacks (Evening)</th>
                <th style="border: 2px solid #000; padding: 6px; font-weight: bold; width: 23%;">Dinner (Night)</th>
              </tr>
            </thead>
            <tbody>
              ${(plan.meals || []).map(m => `
                <tr style="page-break-inside: avoid;">
                  <td style="border: 2px solid #000; padding: 8px; font-weight: bold; text-align: center; background-color: #fafafa;">${m.dayNumber}</td>
                  <td style="border: 2px solid #000; padding: 8px; font-weight: bold; vertical-align: top; white-space: pre-line;">${m.breakfast || '–'}</td>
                  <td style="border: 2px solid #000; padding: 8px; font-weight: bold; vertical-align: top; white-space: pre-line;">${m.lunch || '–'}</td>
                  <td style="border: 2px solid #000; padding: 8px; font-weight: bold; vertical-align: top; white-space: pre-line;">${m.snacks || '–'}</td>
                  <td style="border: 2px solid #000; padding: 8px; font-weight: bold; vertical-align: top; white-space: pre-line;">${m.dinner || '–'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      document.body.appendChild(container);
      const pdfBlob = await html2pdf().from(container).set(opt).output('blob');
      document.body.removeChild(container);

      const storageRef = ref(storage, `diet_plans/${plan.id}.pdf`);
      const uploadSnap = await uploadBytes(storageRef, pdfBlob);
      const downloadUrl = await getDownloadURL(uploadSnap.ref);

      const deleteAt = new Date();
      deleteAt.setMonth(deleteAt.getMonth() + 2);

      await updateDoc(doc(db, 'nutrition_plans', plan.id), {
        pdfUrl: downloadUrl,
        pdfCreatedAt: new Date().toISOString(),
        pdfDeleteAt: deleteAt.toISOString(),
        updatedAt: serverTimestamp()
      });

      try {
        await navigator.clipboard.writeText(downloadUrl);
        alert("Diet PDF generated, saved to Firebase and link copied to clipboard!");
      } catch (clipErr) {
        window.prompt("Diet PDF URL generated:", downloadUrl);
      }

      const shareMsg = `Dear ${plan.patientName}, you can view and download your customized 30-Day Diet Plan PDF here: ${downloadUrl}`;
      const waUrl = `https://wa.me/91${(plan.patientPhone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(shareMsg)}`;
      window.open(waUrl, '_blank');

    } catch (err) {
      console.error("PDF generation/upload error:", err);
      alert("Failed to generate/save Diet Plan PDF: " + err.message);
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleCompleteVisit = async (bill) => {
    try {
      const collectionName = bill.source === 'appointments' ? 'appointments' : 'allpatients';
      await updateDoc(doc(db, collectionName, bill.id), {
        status: 'done',
        updatedAt: serverTimestamp()
      });
      alert('Visit completed successfully!');
      fetchData();
    } catch (e) {
      alert('Failed to complete visit: ' + e.message);
    }
  };

  const handleCollectPayment = async (e) => {
    e.preventDefault();
    setProcessingRzp(true);
    try {
      const totalLegs = paymentLegs.reduce((sum, leg) => sum + Number(leg.amount || 0), 0);
      if (Math.round(totalLegs * 100) !== Math.round(Number(customFeeAmount) * 100)) {
        alert(`Total split amounts (₹${totalLegs}) must equal the total fee (₹${customFeeAmount})`);
        return;
      }

      const appLeg = paymentLegs.find(l => l.method === 'app');
      const counterLegs = paymentLegs.filter(l => l.method !== 'app');

      if (appLeg) {
        if (counterLegs.length === 0) {
          handleSendFeeToPatient();
        } else {
          const counterAmt = counterLegs.reduce((s, l) => s + Number(l.amount), 0);
          const appAmt = Number(appLeg.amount);
          // Assuming handleSendFeeToPatient expects counterAmount, upiAmount, counterMethod. We'll map first counter leg method for now.
          handleSendFeeToPatient({ counterAmount: counterAmt, upiAmount: appAmt, counterMethod: counterLegs[0].method });
        }
      } else {
        // For now, if there's razorpay_checkout or QR, it was handled per leg. But since those methods are replaced by just UPI/online, we just confirm payment with 'split' if multiple, or the single method.
        if (paymentLegs.length > 1) {
          // It's a split. We will map to customAmount and splitDetails.
          // Actually, confirmPayment currently expects method='split' and takes paymentDetails.cashAmount and upiAmount.
          // We should update confirmPayment instead, but let's just pass what it expects for now or adapt.
          let cashTotal = 0;
          let upiTotal = 0;
          paymentLegs.forEach(l => {
            if (l.method === 'cash') cashTotal += Number(l.amount);
            else upiTotal += Number(l.amount);
          });
          // Mocking the paymentDetails state it reads internally
          setPaymentDetails({ cashAmount: cashTotal, upiAmount: upiTotal });
          // Wait, setState is async. We shouldn't rely on it.
          await confirmPayment('split', '', null, { cash: cashTotal, upi: upiTotal });
        } else {
          const method = paymentLegs[0].method;
          if (method === 'razorpay_checkout' || method === 'upi') {
            await confirmPayment('upi'); // Simplification for now, or use original logic if 'upi' needs QR.
          } else {
            await confirmPayment(method);
          }
        }
      }
    } finally {
      setProcessingRzp(false);
    }
  };

  const handleAddPaymentLeg = () => {
    const totalLegs = paymentLegs.reduce((sum, leg) => sum + Number(leg.amount || 0), 0);
    const remaining = Number(customFeeAmount) - totalLegs;
    if (remaining > 0) {
      setPaymentLegs([...paymentLegs, { method: 'upi', amount: String(remaining) }]);
    } else {
      setPaymentLegs([...paymentLegs, { method: 'upi', amount: '' }]);
    }
  };

  const handleLegChange = (index, field, value) => {
    const newLegs = [...paymentLegs];
    newLegs[index][field] = value;
    if (field === 'amount') {
      // Auto-calculate for the last leg if there are exactly 2 legs for convenience?
      // User specifically requested auto-calculate when first amount is entered.
      if (index === 0 && newLegs.length === 2) {
        const remaining = Number(customFeeAmount) - Number(value);
        if (remaining >= 0) {
          newLegs[1].amount = String(remaining);
        }
      }
    }
    setPaymentLegs(newLegs);
  };

  const handleRemoveLeg = (index) => {
    const newLegs = [...paymentLegs];
    newLegs.splice(index, 1);
    setPaymentLegs(newLegs);
  };

  const filteredPatients = patients.filter(p => {
    if (!matchBranch(p)) return false;

    const qLower = (searchQuery || '').toLowerCase().trim();
    if (!qLower) return true;
    return (
      (p.fullName || '').toLowerCase().includes(qLower) ||
      (p.phone || '').includes(qLower) ||
      (p.registrationId || '').toLowerCase().includes(qLower)
    );
  });

  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage) || 1;
  const startIndex = (patientsCurrentPage - 1) * patientsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + patientsPerPage);

  const isPaid = selectedBill?.paymentStatus === 'paid';
  console.log('RECEPTION DASHBOARD RENDER:', { selectedBill, hasMedFee: selectedBill ? !!((selectedBill.medicineFeeRequested && Number(selectedBill.medicineFeeRequested) > 0) || (selectedBill.consultationFee && Number(selectedBill.consultationFee) > 0)) : false, medicineFeeRequested: selectedBill?.medicineFeeRequested });
  const isUnlocked = unlockRequest?.status === 'approved';
  const showBlockMessage = isPaid && !isUnlocked;

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (medicines && medicines.length > 0) {
      const invalidMedicine = medicines.find(m => !m.duration || !m.duration.trim());
      if (invalidMedicine) {
        alert('Please specify the duration to use for all medicines (e.g. 1 Month).');
        return;
      }
    }
    setSubmittingConsultation(true);
    try {
      const updateData = {
        status: 'completed',
        prescriptionNotes: prescriptionText,
        diagnosisNotes: prescriptionText,
        medicines: medicines,
        medicalHistory: medicalHistory,
        followUpDate: followUpDate,
        followUpInterval: followUpInterval,
        medicineFeeRequested: doctorMedicineFee ? Number(doctorMedicineFee) : 0,
        updatedAt: serverTimestamp()
      };
      const isOnline = selectedPatientFile.source === 'appointments' || selectedPatientFile.source === 'UserApp' || selectedPatientFile.source === 'Patient App' || selectedPatientFile.source === 'Online' || selectedPatientFile._type === 'online';
      const collectionName = isOnline ? 'appointments' : 'allpatients';
      await updateDoc(doc(db, collectionName, selectedPatientFile.id), updateData);
      setSuccessToast('✅ Consultation saved successfully!');
      setTimeout(() => setSuccessToast(''), 4000);
      setShowPatientFileModal(false);
      setSelectedPatientFile(null);
    } catch (err) {
      alert('Error saving consultation: ' + err.message);
    } finally {
      setSubmittingConsultation(false);
    }
  };

  useEffect(() => {
    let avoid = "";
    let eat = "";
    if (nutritionDisorders.includes("Sugar (Diabetes)")) {
      avoid += "Sugar, Sweets, Jaggery, Honey, Fruit juices, Maida, White rice, Potatoes.\n";
      eat += "Millets, Brown rice, Oats, High fiber vegetables, Bitter gourd, Fenugreek.\n";
    }
    if (nutritionDisorders.includes("High BP (Hypertension)")) {
      avoid += "Excess salt, Pickles, Papads, Processed foods, Canned soups, Salty snacks.\n";
      eat += "Bananas, Spinach, Beetroot, Citrus fruits, Garlic, Potassium-rich foods.\n";
    }
    if (nutritionDisorders.includes("Thyroid")) {
      avoid += "Cabbage, Cauliflower, Broccoli, Soy products, Processed meats.\n";
      eat += "Brazil nuts, Seaweed, Eggs, Fish, Dairy products, Lean proteins.\n";
    }
    if (nutritionDisorders.includes("Gastritis") || nutritionDisorders.includes("Acidity")) {
      avoid += "Spicy foods, Citrus fruits, Coffee, Alcohol, Fried foods.\n";
      eat += "Oatmeal, Ginger, Aloe vera, Melons, Lean meats, Herbal teas.\n";
    }
    if (nutritionDisorders.includes("IBS / IBD") || nutritionDisorders.includes("Bloating")) {
      avoid += "Beans, Onions, Garlic, Dairy, Gluten, High-FODMAP foods.\n";
      eat += "Lactose-free dairy, Quinoa, Zucchini, Spinach, Blueberries.\n";
    }
    if (nutritionDisorders.includes("SIBO")) {
      avoid += "Sugar, Dairy, Grains, Starchy vegetables, Legumes.\n";
      eat += "Meat, Fish, Eggs, Leafy greens, Non-starchy vegetables.\n";
    }
    if (nutritionDisorders.includes("Piles")) {
      avoid += "Spicy foods, Processed meats, Cheese, White flour, Fried foods.\n";
      eat += "High fiber foods, Beans, Lentils, Whole grains, Broccoli, Apples, Water.\n";
    }
    if (nutritionDisorders.includes("PCOD") || nutritionDisorders.includes("Insulin Resistance")) {
      avoid += "Refined carbs, Sugary drinks, Processed meats, Solid fats.\n";
      eat += "High-fiber veggies, Lean proteins, Anti-inflammatory foods, Berries.\n";
    }
    if (nutritionDisorders.includes("Hairfall")) {
      eat += "Eggs, Berries, Spinach, Fatty fish, Sweet potatoes, Avocados, Nuts.\n";
    }
    if (nutritionDisorders.includes("Melasma")) {
      avoid += "Excess sugar, Processed foods, Dairy (if sensitive).\n";
      eat += "Vitamin C foods, Citrus, Berries, Leafy greens, Antioxidants.\n";
    }
    if (nutritionDisorders.includes("Weight Gain")) {
      eat += "Nuts, Avocados, Whole grains, Protein-rich foods, Healthy fats, Dairy.\n";
    }
    if (nutritionDisorders.includes("Weight Loss")) {
      avoid += "Sugary drinks, Pastries, Fried foods, White bread.\n";
      eat += "Leafy greens, Salmon, Cruciferous veggies, Lean beef, Chicken breast.\n";
    }
    if (nutritionDisorders.includes("Height Growth")) {
      eat += "Milk, Yogurt, Beans, Chicken, Almonds, Leafy greens, Sweet potatoes.\n";
    }
    if (nutritionDisorders.includes("Adenoids / Tonsillitis")) {
      avoid += "Cold foods, Dairy (if it thickens mucus), Crunchy/hard foods.\n";
      eat += "Warm broths, Mashed potatoes, Soft fruits, Honey, Ginger tea.\n";
    }
    if (nutritionDisorders.includes("Allergies")) {
      avoid += "Known allergens, Processed foods with preservatives.\n";
      eat += "Anti-inflammatory foods, Turmeric, Ginger, Citrus, Berries.\n";
    }

    if (nutritionDeficiencies.includes("Iron")) {
      eat += "Spinach, Liver, Red meat, Legumes, Pumpkin seeds, Quinoa.\n";
    }
    if (nutritionDeficiencies.includes("Calcium")) {
      eat += "Milk, Cheese, Yogurt, Sardines, Almonds, Leafy greens.\n";
    }
    if (nutritionDeficiencies.includes("Vitamin D")) {
      eat += "Fatty fish, Egg yolks, Fortified foods, Mushrooms.\n";
    }
    if (nutritionDeficiencies.includes("Vitamin C")) {
      eat += "Citrus fruits, Bell peppers, Strawberries, Tomatoes, Broccoli.\n";
    }
    if (nutritionDeficiencies.includes("Vitamin A")) {
      eat += "Carrots, Sweet potatoes, Spinach, Liver, Cantaloupe.\n";
    }
    if (nutritionDeficiencies.includes("Vitamin B")) {
      eat += "Whole grains, Meat, Eggs, Legumes, Seeds, Nuts.\n";
    }
    if (nutritionDeficiencies.includes("Vitamin E")) {
      eat += "Sunflower seeds, Almonds, Spinach, Avocados, Squash.\n";
    }
    if (nutritionDeficiencies.includes("Vitamin K")) {
      eat += "Kale, Spinach, Broccoli, Brussels sprouts, Cabbage.\n";
    }
    if (nutritionDeficiencies.includes("Potassium")) {
      eat += "Bananas, Oranges, Cantaloupe, Honeydew, Apricots, Grapefruit.\n";
    }
    if (nutritionDeficiencies.includes("Magnesium")) {
      eat += "Dark chocolate, Avocados, Nuts, Legumes, Tofu, Seeds.\n";
    }
    if (nutritionDeficiencies.includes("Zinc")) {
      eat += "Meat, Shellfish, Legumes, Seeds, Nuts, Dairy, Eggs.\n";
    }
    if (nutritionDeficiencies.includes("Sodium")) {
      eat += "Salt, Celery, Beets, Milk, Natural cheeses.\n";
    }
    if (nutritionDeficiencies.includes("Protein")) {
      eat += "Chicken, Eggs, Lentils, Greek yogurt, Almonds, Quinoa, Paneer.\n";
    }
    if (nutritionDeficiencies.includes("Manganese")) {
      eat += "Nuts, Beans, Legumes, Oatmeal, Whole wheat, Spinach.\n";
    }
    if (nutritionDeficiencies.includes("Phosphorus")) {
      eat += "Chicken, Turkey, Pork, Seafood, Seeds, Nuts.\n";
    }

    setNutritionAvoid(avoid.trim());
    setNutritionEat(eat.trim());
  }, [nutritionDisorders, nutritionDeficiencies]);

  useEffect(() => {
    const ageVal = parseInt(nutritionAge, 10) || 30;
    const prefilled = generatePrefilledDiet(ageVal, nutritionDeficiencies, nutritionDisorders);
    setNutritionMeals(prefilled);
  }, [nutritionAge, nutritionDeficiencies, nutritionDisorders]);

  useEffect(() => {
    const h = parseFloat(nutritionHeight) / 100;
    const w = parseFloat(nutritionWeight);
    if (h > 0 && w > 0) {
      const bmi = w / (h * h);
      setNutritionBmi(bmi.toFixed(1));
    } else {
      setNutritionBmi(0);
    }
  }, [nutritionHeight, nutritionWeight]);

  const handleMealCellChange = (dayNum, field, val) => {
    setNutritionMeals(prev => prev.map(m => m.dayNumber === dayNum ? { ...m, [field]: val } : m));
  };

  const handleSaveNutritionPlan = async (e) => {
    e.preventDefault();
    if (!selectedPatientFile) return;
    setSubmittingNutrition(true);
    try {
      const start = new Date();
      const startStr = start.toISOString().split('T')[0];
      const expiry = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiryStr = expiry.toISOString().split('T')[0];

      const planData = {
        patientId: selectedPatientFile.patientId || selectedPatientFile.id,
        patientName: selectedPatientFile.fullName,
        patientPhone: selectedPatientFile.phone,
        age: Number(nutritionAge),
        height: Number(nutritionHeight),
        weight: Number(nutritionWeight),
        bmi: Number(nutritionBmi),
        deficiencies: nutritionDeficiencies,
        disorders: nutritionDisorders,
        diseases: nutritionOtherDiseases,
        symptoms: nutritionSymptoms,
        foodsToAvoid: nutritionAvoid,
        foodsToEat: nutritionEat,
        amount: Number(nutritionAmount),
        paymentStatus: 'pending',
        startDate: startStr,
        expiryDate: expiryStr,
        doctorId: 'reception',
        doctorName: 'Reception',
        branchId: selectedPatientFile.branchId || 'KPHB',
        branchName: selectedPatientFile.branchName || 'KPHB Branch',
        meals: nutritionMeals,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'nutrition_plans'), planData);

      // Payment notification removed for reception

      alert('Diet Plan created successfully!');

      setNutritionAge('');
      setNutritionHeight('');
      setNutritionWeight('');
      setNutritionBmi(0);
      setNutritionDeficiencies([]);
      setNutritionDisorders([]);
      setNutritionOtherDiseases('');
      setNutritionSymptoms('');
      setNutritionAvoid('');
      setNutritionEat('');
      setNutritionMeals([]);
      setConsultationSubTab('clinical');
    } catch (err) {
      console.error('Error saving nutrition plan:', err);
      alert('Failed to save nutrition plan: ' + err.message);
    } finally {
      setSubmittingNutrition(false);
    }
  };

  const handleFollowUpIntervalChange = (val) => {
    setFollowUpInterval(val);
    if (val === 'No Follow-up') {
      setFollowUpDate('');
    } else {
      const today = new Date();
      let monthsToAdd = 1;
      if (val === '2 months') monthsToAdd = 2;
      else if (val === '3 months') monthsToAdd = 3;
      else if (val === '4 months') monthsToAdd = 4;
      else if (val === '5 months') monthsToAdd = 5;
      else if (val === '6 months') monthsToAdd = 6;
      today.setMonth(today.getMonth() + monthsToAdd);
      setFollowUpDate(today.toISOString().split('T')[0]);
    }
  };

  const handleBulkComplete = async (statusToComplete) => {
    if (!window.confirm(`Are you sure you want to complete all ${statusToComplete} appointments for this day?`)) {
      return;
    }

    try {
      const localToday = new Date();
      const yyyy = localToday.getFullYear();
      const mm = String(localToday.getMonth() + 1).padStart(2, '0');
      const dd = String(localToday.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const tomorrowObj = new Date(localToday.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;

      // Collect items to update from appointments and patients arrays based on dateFilter
      const itemsToUpdate = [];

      // Online appointments
      appointments.forEach(appt => {
        if (!matchBranch(appt)) return;
        const apptDateStr = normalizeDateToYYYYMMDD(appt.dateString || appt.date);
        const isBooked = !appt.checkedInAt && appt.status !== 'cancelled';
        const displayStatus = isBooked ? ((appt.status || 'booked').toLowerCase() === 'pending' ? 'booked' : (appt.status || 'booked').toLowerCase()) : (appt.status || 'booked').toLowerCase();

        let matchDate = false;
        if (dateFilter === 'today') matchDate = apptDateStr === todayStr;
        else if (dateFilter === 'tomorrow') matchDate = apptDateStr === tomorrowStr;
        else if (dateFilter === 'upcoming') matchDate = apptDateStr >= todayStr;
        else if (dateFilter === 'custom') matchDate = apptDateStr === customDate;
        else matchDate = true;

        if (matchDate && displayStatus === statusToComplete) {
          itemsToUpdate.push({ id: appt.id, collection: 'appointments' });
        }
      });

      // Walk-in patients
      patients.forEach(p => {
        if (!matchBranch(p)) return;
        const pDateStr = normalizeDateToYYYYMMDD(p.appointmentDate);
        const statusLower = (p.status || 'waiting').toLowerCase();

        let matchDate = false;
        if (dateFilter === 'today') matchDate = pDateStr === todayStr;
        else if (dateFilter === 'tomorrow') matchDate = pDateStr === tomorrowStr;
        else if (dateFilter === 'upcoming') matchDate = pDateStr >= todayStr;
        else if (dateFilter === 'custom') matchDate = pDateStr === customDate;
        else matchDate = true;

        if (matchDate && statusLower === statusToComplete) {
          itemsToUpdate.push({ id: p.id, collection: 'patients' });
        }
      });

      if (itemsToUpdate.length === 0) {
        alert(`No ${statusToComplete} appointments found for the selected date.`);
        return;
      }

      for (const item of itemsToUpdate) {
        const refDoc = doc(db, item.collection, item.id);
        await updateDoc(refDoc, { status: 'completed' });
      }

      alert(`Successfully completed ${itemsToUpdate.length} appointments.`);
    } catch (error) {
      console.error('Error in bulk complete:', error);
      alert('Failed to complete appointments.');
    }
  };

  return (
    <div className="app-container">
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ display: (showPatientFileModal && selectedPatientFile) ? 'none' : 'flex' }}>
        <div style={{
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: '8px',
          padding: isCollapsed ? '16px 8px 12px 8px' : '16px 16px 12px 16px',
          margin: isCollapsed ? '-16px -8px 0 -8px' : '-16px -16px 0 -16px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          width: 'calc(100% + ' + (isCollapsed ? '16px' : '32px') + ')',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <img src={logo} alt="Logo" style={{ height: isCollapsed ? '35px' : '45px', transition: 'all 0.3s ease' }} />
            {!isCollapsed && (
              <span style={{
                color: 'var(--primary-color)',
                fontWeight: '700',
                fontSize: '0.85rem',
                lineHeight: '1.2',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                display: 'block'
              }}>
                Spiritual Homeo Clinic
              </span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="sidebar-toggle-btn"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isCollapsed ? <ChevronRight size={20} color="var(--primary-color)" /> : <ChevronLeft size={20} color="var(--primary-color)" />}
          </button>
        </div>
        <p className="sidebar-text" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center', marginTop: '-12px' }}>
          Receptionist Portal
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '20px' }}>
          <button onClick={() => handleSidebarTabClick('dashboard')} className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <BookOpen size={16} /> <span className="sidebar-text">Dashboard</span>
          </button>
          <button onClick={() => handleSidebarTabClick('register')} className={`sidebar-btn ${activeTab === 'register' ? 'active' : ''}`}>
            {!targetsSet && !loadingTargets ? <Lock size={16} style={{ color: 'var(--danger)' }} /> : <Plus size={16} />}
            <span className="sidebar-text" style={!targetsSet && !loadingTargets ? { color: 'var(--danger)' } : {}}>{!targetsSet && !loadingTargets ? 'Locked' : 'Book Appointment'}</span>
          </button>
          <button onClick={() => handleSidebarTabClick('allpatients')} className={`sidebar-btn ${activeTab === 'allpatients' ? 'active' : ''}`}>
            <Users size={16} />
            <span className="sidebar-text">Patient List</span>
          </button>
          <button onClick={() => handleSidebarTabClick('requests')} className={`sidebar-btn ${activeTab === 'requests' ? 'active' : ''}`}>
            <FileText size={16} />
            <span className="sidebar-text">Medicine Requests</span>
          </button>
          <button onClick={() => handleSidebarTabClick('billing')} className={`sidebar-btn ${activeTab === 'billing' ? 'active' : ''}`}>
            <Briefcase size={16} />
            <span className="sidebar-text">Billing / Payments</span>
          </button>
          <button onClick={() => handleSidebarTabClick('packages')} className={`sidebar-btn ${activeTab === 'packages' ? 'active' : ''}`}>
            <Briefcase size={16} />
            <span className="sidebar-text">Package Members</span>
          </button>
          <button onClick={() => handleSidebarTabClick('shipping')} className={`sidebar-btn ${activeTab === 'shipping' ? 'active' : ''}`}>
            <Upload size={16} />
            <span className="sidebar-text">Shiprocket Shipping</span>
          </button>
          <button onClick={() => handleSidebarTabClick('products-billing')} className={`sidebar-btn ${activeTab === 'products-billing' ? 'active' : ''}`}>
            <Coins size={16} />
            <span className="sidebar-text">Products Billing</span>
          </button>
          <button onClick={() => handleSidebarTabClick('followups')} className={`sidebar-btn ${activeTab === 'followups' ? 'active' : ''}`}>
            <Clock size={16} />
            <span className="sidebar-text">Follow-ups</span>
          </button>
          <button onClick={() => handleSidebarTabClick('noshow')} className={`sidebar-btn ${activeTab === 'noshow' ? 'active' : ''}`}>
            <CalendarClock size={16} />
            <span className="sidebar-text">Doctor No Show</span>
          </button>
          <button onClick={() => handleSidebarTabClick('media-manager')} className={`sidebar-btn ${activeTab === 'media-manager' ? 'active' : ''}`}>
            <Video size={16} />
            <span className="sidebar-text">Media Manager</span>
          </button>
          <button onClick={() => handleSidebarTabClick('daily-report')} className={`sidebar-btn ${activeTab === 'daily-report' ? 'active' : ''}`}>
            <FileText size={16} />
            <span className="sidebar-text">Daily Report</span>
          </button>
          <button onClick={() => handleSidebarTabClick('clinic-cleaning')} className={`sidebar-btn ${activeTab === 'clinic-cleaning' ? 'active' : ''}`}>
            <ImageIcon size={18} />
            <span className="sidebar-text">Clinic Cleaning</span>
          </button>
        </nav>
        <button onClick={handleLogout} className="sidebar-btn" style={{ marginTop: 'auto', color: '#fca5a5' }}>
          <LogOut size={16} /> <span className="sidebar-text">Sign Out</span>
        </button>
      </aside>

      <main className="main-content" style={{ display: (showPatientFileModal && selectedPatientFile) ? 'none' : 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ textAlign: 'right', backgroundColor: '#fff', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', textTransform: 'capitalize' }}>
              {userData?.branchName || userData?.name || 'Admin Portal'}
            </div>
            {userData?.phone && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {userData.phone}
              </div>
            )}
          </div>
        </div>
        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (() => {
          const localToday = new Date();
          const yyyy = localToday.getFullYear();
          const mm = String(localToday.getMonth() + 1).padStart(2, '0');
          const dd = String(localToday.getDate()).padStart(2, '0');
          const todayStr = `${yyyy}-${mm}-${dd}`;
          const todayStrDDMMYYYY = `${dd}/${mm}/${yyyy}`;

          const tomorrowObj = new Date(localToday.getTime() + 24 * 60 * 60 * 1000);
          const tomorrowYYYY = tomorrowObj.getFullYear();
          const tomorrowMM = String(tomorrowObj.getMonth() + 1).padStart(2, '0');
          const tomorrowDD = String(tomorrowObj.getDate()).padStart(2, '0');
          const tomorrowStr = `${tomorrowYYYY}-${tomorrowMM}-${tomorrowDD}`;

          // Merge appointments and patients into a unified queue list
          const unifiedList = [];

          // Add booked appointments (online bookings) that are not checked in
          appointments.forEach(appt => {
            if (!matchBranch(appt)) return;

            const apptDateStr = normalizeDateToYYYYMMDD(appt.dateString || appt.date);
            const isBooked = !appt.checkedInAt && appt.status !== 'cancelled';
            if (isBooked) {
              const statusLower = (appt.status || 'booked').toLowerCase();
              const displayStatus = statusLower === 'pending' ? 'booked' : statusLower;
              unifiedList.push({
                id: appt.id,
                source: 'appointments',
                type: displayStatus,
                fullName: appt.patientName,
                phone: appt.phone || appt.patientPhone || 'N/A',
                email: appt.email || '',
                date: apptDateStr,
                timeSlot: appt.timeSlot || 'N/A',
                doctor: appt.doctorName,
                complaint: appt.subject || appt.symptoms || 'N/A',
                status: displayStatus,
                paymentStatus: appt.paymentStatus || 'pending',
                packageId: appt.packageId || '',
                isOnline: true,
                raw: appt
              });
            }
          });

          // Add checked-in entries from patients queue
          patients.forEach(p => {
            if (!matchBranch(p)) return;

            const pDateStr = normalizeDateToYYYYMMDD(p.appointmentDate);
            const statusLower = (p.status || 'waiting').toLowerCase();
            unifiedList.push({
              id: p.id,
              source: 'allpatients',
              type: statusLower,
              fullName: p.fullName,
              phone: p.phone || 'N/A',
              email: p.email || '',
              date: pDateStr,
              timeSlot: p.appointmentTime || 'N/A',
              doctor: p.doctor || 'N/A',
              complaint: p.complaint || p.subject || 'N/A',
              status: statusLower, // 'waiting', 'in-consultation', 'completed', 'done'
              paymentStatus: p.paymentStatus || 'pending',
              registrationId: p.registrationId || 'N/A',
              _type: p._type || '',
              packageId: p.packageId || '',
              isOnline: p.source === 'appointments' || p.source === 'UserApp' || p.source === 'Patient App' || p.source === 'Online' || p._type === 'online',
              raw: p
            });
          });

          // Apply Date Filters
          const dateFilteredList = unifiedList.filter(item => {
            if (dateFilter === 'today') {
              return item.date === todayStr;
            } else if (dateFilter === 'tomorrow') {
              return item.date === tomorrowStr;
            } else if (dateFilter === 'upcoming') {
              return item.date >= todayStr;
            } else if (dateFilter === 'custom') {
              return item.date === customDate;
            }
            return true;
          });

          // Sort unified list chronologically, but respect queueOrder if defined
          dateFilteredList.sort((a, b) => {
            if (a.date !== b.date) {
              return a.date.localeCompare(b.date);
            }

            // Group by Doctor first so the queues are distinct and sequentially ordered
            const docA = a.doctor || '';
            const docB = b.doctor || '';
            const docDiff = docA.localeCompare(docB);
            if (docDiff !== 0) return docDiff;

            // Then by queueOrder (Q number)
            const qA = typeof a.raw?.queueOrder === 'number' ? a.raw.queueOrder : Infinity;
            const qB = typeof b.raw?.queueOrder === 'number' ? b.raw.queueOrder : Infinity;
            if (qA !== qB) return qA - qB;

            const order = { 'in-consultation': 1, 'waiting': 2, 'booked': 2, 'completed': 3, 'done': 3 };
            const statusDiff = (order[a.status] || 9) - (order[b.status] || 9);
            if (statusDiff !== 0) return statusDiff;

            const tA = parseTimeStr(a.timeSlot);
            const tB = parseTimeStr(b.timeSlot);
            if (tA !== tB) return tA - tB;

            const timeA = a.raw?.createdAt?.toDate ? a.raw.createdAt.toDate().getTime() : (a.raw?.createdAt ? new Date(a.raw.createdAt).getTime() : 0);
            const timeB = b.raw?.createdAt?.toDate ? b.raw.createdAt.toDate().getTime() : (b.raw?.createdAt ? new Date(b.raw.createdAt).getTime() : 0);
            return timeA - timeB;
          });

          // Apply Status Filters
          const finalFilteredList = dateFilteredList.filter(item => {
            if (statusFilter === 'upcoming') return ['booked', 'waiting', 'confirmed', 'in-consultation'].includes(item.status);
            if (statusFilter === 'awaiting-payment') return item.status === 'completed' && item.raw?.paymentStatus !== 'paid';
            if (statusFilter === 'completed') return (item.status === 'completed' || item.status === 'done') && item.raw?.paymentStatus === 'paid';
            return true;
          });

          // Status-specific counts under the selected date scope
          const upcomingCount = dateFilteredList.filter(item => ['booked', 'waiting', 'confirmed', 'in-consultation'].includes(item.status)).length;
          const awaitingPaymentCount = dateFilteredList.filter(item => item.status === 'completed' && item.raw?.paymentStatus !== 'paid').length;
          const completedCount = dateFilteredList.filter(item => item.status === 'completed' || item.status === 'done').length;

          return (
            <div className="fade-in">
              <div className="flex-between" style={{ marginBottom: '24px' }}>
                <div>
                  <h2>Reception Dashboard</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Overview of clinic queues and upcoming appointments</p>
                </div>
              </div>

              {/* Statistic Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div
                  className="glass-panel"
                  style={{ padding: '20px', borderLeft: '4px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                  onClick={() => {
                    setStatusModalTitle('All Bookings Today');
                    setStatusModalPatients(dateFilteredList);
                    setShowStatusModal(true);
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total Bookings</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    {dateFilteredList.length} Bookings
                  </span>
                </div>
                <div
                  className="glass-panel"
                  style={{ padding: '20px', borderLeft: '4px solid var(--secondary)', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                  onClick={() => {
                    setStatusModalTitle('Waiting Patients');
                    setStatusModalPatients(dateFilteredList.filter(item => item.status === 'waiting'));
                    setShowStatusModal(true);
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Waiting</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--secondary)' }}>
                    {dateFilteredList.filter(item => item.status === 'waiting').length} Waiting
                  </span>
                </div>

                <div
                  className="glass-panel"
                  style={{ padding: '20px', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                  onClick={() => {
                    setStatusModalTitle('Payment Pending');
                    setStatusModalPatients(dateFilteredList.filter(item => (item.status === 'completed' || item.status === 'done' || item.raw?.doctorStatus === 'prescribed') && item.raw?.paymentStatus !== 'paid'));
                    setShowStatusModal(true);
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Payment Pending</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>
                    {dateFilteredList.filter(item => (item.status === 'completed' || item.status === 'done' || item.raw?.doctorStatus === 'prescribed') && item.raw?.paymentStatus !== 'paid').length} Pending
                  </span>
                </div>
                <div
                  className="glass-panel"
                  style={{ padding: '20px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                  onClick={() => {
                    setStatusModalTitle('Completed (Paid)');
                    setStatusModalPatients(dateFilteredList.filter(item => (item.status === 'completed' || item.status === 'done' || item.raw?.doctorStatus === 'prescribed') && item.raw?.paymentStatus === 'paid'));
                    setShowStatusModal(true);
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Completed</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
                    {dateFilteredList.filter(item => (item.status === 'completed' || item.status === 'done' || item.raw?.doctorStatus === 'prescribed') && item.raw?.paymentStatus === 'paid').length} Completed
                  </span>
                </div>
              </div>

              {/* Additional Stats Row */}
              {(() => {
                const doneItems = dateFilteredList.filter(item => item.status === 'completed' || item.status === 'done' || item.raw?.doctorStatus === 'prescribed');
                const doneTotal = doneItems.length;
                const followUpOptedList = doneItems.filter(item => {
                  const fuInterval = item.raw?.followUpInterval || '';
                  return fuInterval && fuInterval !== 'No Follow-up' && fuInterval !== '';
                });
                const followUpNotOptedList = doneItems.filter(item => {
                  const fuInterval = item.raw?.followUpInterval || '';
                  return !fuInterval || fuInterval === 'No Follow-up' || fuInterval === '';
                });
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    <div
                      className="glass-panel"
                      style={{ padding: '14px', borderLeft: '3px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                      onClick={() => {
                        setStatusModalTitle('Appointments Completed');
                        setStatusModalPatients(doneItems);
                        setShowStatusModal(true);
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Appointments Completed</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6366f1' }}>
                        {doneTotal}
                      </span>
                    </div>
                    <div
                      className="glass-panel"
                      style={{ padding: '14px', borderLeft: '3px solid #8b5cf6', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                      onClick={() => {
                        setStatusModalTitle('Follow-up Opted');
                        setStatusModalPatients(followUpOptedList);
                        setShowStatusModal(true);
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Follow-up Opted</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>
                        {followUpOptedList.length}
                      </span>
                    </div>
                    <div
                      className="glass-panel"
                      style={{ padding: '14px', borderLeft: '3px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                      onClick={() => {
                        setStatusModalTitle('Follow-up Not Opted');
                        setStatusModalPatients(followUpNotOptedList);
                        setShowStatusModal(true);
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Follow-up Not Opted</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                        {followUpNotOptedList.length}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {monthlyTarget && (() => {
                const targetNum = Number(monthlyTarget) || 0;
                const reachedNum = Number(targetReached) || 0;
                const remaining = Math.max(targetNum - reachedNum, 0);
                const isReached = reachedNum >= targetNum;

                const today = new Date();
                const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
                const isLastWeek = nextWeek.getMonth() !== today.getMonth();
                const isWarning = isLastWeek && !isReached;

                const containerBg = isReached ? '#f0fdf4' : isWarning ? '#fef2f2' : '#f8fafc';
                const containerBorder = isReached ? '#4ade80' : isWarning ? '#fca5a5' : '#cbd5e1';
                const iconColor = isReached ? '#16a34a' : isWarning ? '#dc2626' : '#64748b';
                const titleColor = isReached ? '#166534' : isWarning ? '#991b1b' : '#334155';
                const labelColor = isReached ? '#15803d' : isWarning ? '#b91c1c' : '#475569';
                const valueColor = isReached ? '#14532d' : isWarning ? '#7f1d1d' : '#0f172a';

                return (
                  <div style={{ backgroundColor: containerBg, padding: '16px', borderRadius: '12px', marginBottom: '24px', border: `1px solid ${containerBorder}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Target size={20} color={iconColor} style={{ marginRight: '8px' }} />
                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: titleColor }}>Monthly Target</span>
                      </div>
                      {isReached && (
                        <div style={{ backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#15803d' }}>🏆 Target Reached!</span>
                        </div>
                      )}
                      {isWarning && (
                        <div style={{ backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#991b1b' }}>⚠️ Last week!</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff99', padding: '16px', borderRadius: '8px', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center', flex: 1, minWidth: '100px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: labelColor, textTransform: 'uppercase', marginBottom: '6px' }}>Target</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: valueColor }}>₹{targetNum.toLocaleString()}</div>
                      </div>
                      <div style={{ width: '1px', height: '40px', backgroundColor: containerBorder }} />
                      <div style={{ textAlign: 'center', flex: 1, minWidth: '100px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: labelColor, textTransform: 'uppercase', marginBottom: '6px' }}>Reached</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: valueColor }}>₹{reachedNum.toLocaleString()}</div>
                      </div>
                      <div style={{ width: '1px', height: '40px', backgroundColor: containerBorder }} />
                      <div style={{ textAlign: 'center', flex: 1, minWidth: '100px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: labelColor, textTransform: 'uppercase', marginBottom: '6px' }}>Remaining</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: isWarning ? '#dc2626' : valueColor }}>₹{remaining.toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', padding: '0 8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: titleColor, opacity: 0.85, lineHeight: 1.5 }}>
                        * Monthly Target is the revenue goal set by Admin. Reached is the total collected revenue (Consultations + Pharmacy) for this branch.
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Date Filter Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`btn-secondary ${dateFilter === 'today' ? 'active' : ''}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: dateFilter === 'today' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: dateFilter === 'today' ? '#fff' : 'var(--text-main)',
                      border: dateFilter === 'today' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateFilter('tomorrow')}
                    className={`btn-secondary ${dateFilter === 'tomorrow' ? 'active' : ''}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: dateFilter === 'tomorrow' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: dateFilter === 'tomorrow' ? '#fff' : 'var(--text-main)',
                      border: dateFilter === 'tomorrow' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    }}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => setDateFilter('upcoming')}
                    className={`btn-secondary ${dateFilter === 'upcoming' ? 'active' : ''}`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: dateFilter === 'upcoming' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: dateFilter === 'upcoming' ? '#fff' : 'var(--text-main)',
                      border: dateFilter === 'upcoming' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    }}
                  >
                    Upcoming (All Future)
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Custom Date:</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateFilter('custom');
                    }}
                    className="glass-input"
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      width: '160px',
                      border: dateFilter === 'custom' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    }}
                  />
                </div>
              </div>

              {/* Interactive Status Tabs Bar */}
              <div style={{
                display: 'flex',
                gap: '12px',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '20px',
                paddingBottom: '2px',
                overflowX: 'auto'
              }}>
                {[
                  { id: 'upcoming', label: 'Upcoming', count: upcomingCount, color: 'var(--primary-color)' },
                  { id: 'awaiting-payment', label: 'Awaiting Payment', count: awaitingPaymentCount, color: '#f59e0b' },
                  { id: 'completed', label: 'Completed', count: completedCount, color: '#10b981' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: statusFilter === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent',
                      color: statusFilter === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
                      padding: '8px 16px',
                      fontWeight: statusFilter === tab.id ? '700' : '500',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      background: statusFilter === tab.id ? (tab.color || 'var(--primary-color)') : 'rgba(0,0,0,0.05)',
                      color: statusFilter === tab.id ? '#fff' : 'var(--text-muted)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      transition: 'all 0.2s ease'
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>



              {/* Unified Queue Table */}
              <div className="table-container glass-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Time & Date</th>
                      <th>Patient Name</th>
                      <th>Contact</th>
                      <th>Doctor</th>
                      <th>Subject / Symptoms</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalFilteredList.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                          No patient records found matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      finalFilteredList.map(item => {
                        const statusBadgeBg =
                          item.status === 'booked' ? 'rgba(37, 142, 200, 0.15)' :
                            item.status === 'waiting' ? 'rgba(168, 206, 58, 0.15)' :
                              item.status === 'in-consultation' ? 'rgba(245, 158, 11, 0.15)' :
                                'rgba(16, 185, 129, 0.15)';
                        const statusBadgeColor =
                          item.status === 'booked' ? 'var(--primary-color)' :
                            item.status === 'waiting' ? '#8fb82e' :
                              item.status === 'in-consultation' ? '#d97706' :
                                '#10b981';
                        const statusBadgeBorder =
                          item.status === 'booked' ? '1px solid rgba(37, 142, 200, 0.3)' :
                            item.status === 'waiting' ? '1px solid rgba(168, 206, 58, 0.3)' :
                              item.status === 'in-consultation' ? '1px solid rgba(245, 158, 11, 0.3)' :
                                '1px solid rgba(16, 185, 129, 0.3)';
                        const statusText = item.status;
                        const isActive = item.status === 'booked' || item.status === 'waiting' || item.status === 'in-consultation' || item.status === 'pending';
                        const isDragging = draggedItem && draggedItem.id === item.id;

                        return (
                          <tr
                            key={`${item.source}-${item.id}`}
                            style={{
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <td style={{ fontWeight: '600' }}>
                              {(() => {
                                const dObj = new Date(item.date);
                                const formattedDStr = isNaN(dObj.getTime()) ? item.date : `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}/${dObj.getFullYear()}`;
                                return `${formattedDStr} - ${item.timeSlot}`;
                              })()}
                            </td>
                            <td style={{ fontWeight: '600' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {(() => {
                                  const isWaiting = item.status === 'waiting' || item.status === 'booked' || item.status === 'in-consultation' || item.status === 'pending';
                                  if (!isWaiting) return null;

                                  const activePatients = dateFilteredList.filter(p =>
                                    p.doctor === item.doctor &&
                                    normalizeBranch(p.raw?.branchId || p.raw?.branchName) === normalizeBranch(item.raw?.branchId || item.raw?.branchName) &&
                                    (p.status === 'waiting' || p.status === 'booked' || p.status === 'in-consultation' || p.status === 'pending')
                                  );

                                  activePatients.sort((x, y) => {
                                    const qX = typeof x.raw?.queueOrder === 'number' ? x.raw.queueOrder : Infinity;
                                    const qY = typeof y.raw?.queueOrder === 'number' ? y.raw.queueOrder : Infinity;
                                    if (qX !== qY) return qX - qY;

                                    const tX = parseTimeStr(x.timeSlot);
                                    const tY = parseTimeStr(y.timeSlot);
                                    if (tX !== tY) return tX - tY;

                                    const timeX = x.raw?.createdAt?.toDate ? x.raw.createdAt.toDate().getTime() : (x.raw?.createdAt ? new Date(x.raw.createdAt).getTime() : 0);
                                    const timeY = y.raw?.createdAt?.toDate ? y.raw.createdAt.toDate().getTime() : (y.raw?.createdAt ? new Date(y.raw.createdAt).getTime() : 0);
                                    return timeX - timeY;
                                  });

                                  const idx = activePatients.findIndex(p => p.id === item.id);
                                  if (idx === -1) return null;
                                  return (
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      background: 'rgba(37, 142, 200, 0.15)',
                                      color: 'var(--secondary-color)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                    }}>
                                      Q{idx + 1}
                                    </span>
                                  );
                                })()}
                                <button
                                  onClick={() => openPatientFile(item)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-color)',
                                    textDecoration: 'underline',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <span>{item.fullName}</span>
                                  {(item.isOnline || item.source === 'appointments' || item._type === 'online' || item.source === 'UserApp' || item.raw?.source === 'appointments' || item.raw?.source === 'UserApp' || item.raw?.source === 'Patient App') && (
                                    <span style={{
                                      fontSize: '9px',
                                      background: '#f5f3ff',
                                      color: '#7c3aed',
                                      border: '1px solid #ddd6fe',
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      display: 'inline-block'
                                    }}>APP</span>
                                  )}
                                  {(item.packageId || (item.phone && activePackageMap.has(item.phone.replace(/\D/g, '').slice(-10)))) && (
                                    <span style={{
                                      fontSize: '9px',
                                      background: '#ecfdf5',
                                      color: '#059669',
                                      border: '1px solid #a7f3d0',
                                      padding: '1px 4px',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      display: 'inline-block'
                                    }}>PKG</span>
                                  )}
                                </button>
                              </div>
                              {item.registrationId && item.registrationId !== 'N/A' && (
                                <div style={{ fontSize: '11px', color: 'var(--primary-color)', marginTop: '2px' }}>
                                  Reg ID: {item.registrationId}
                                </div>
                              )}
                            </td>
                            <td>
                              {item.phone}
                              {item.email && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {item.email}
                                </div>
                              )}
                            </td>
                            <td style={{ fontWeight: '500' }}>{item.doctor}</td>
                            <td>
                              <div style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.complaint || item.subject || item.symptoms}>
                                {item.complaint || item.subject || item.symptoms || 'N/A'}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {/* WhatsApp Icon Button */}
                                <button
                                  onClick={() => handleWhatsAppContact(item)}
                                  title="WhatsApp"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: '1.5px solid #25d366',
                                    background: 'rgba(37,211,102,0.07)',
                                    color: '#25d366',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M12.031 2C6.49 2 2 6.49 2 12.03c0 1.768.46 3.491 1.335 5.015L2 22l5.13-1.348a9.98 9.98 0 0 0 4.901 1.28c5.54 0 10.03-4.49 10.03-10.03C22.062 6.49 17.571 2 12.031 2zm6.182 14.18c-.272.766-1.356 1.394-1.922 1.49-.49.082-.99.04-2.884-.716-2.42-.968-3.958-3.414-4.08-3.576-.118-.162-.962-1.282-.962-2.444 0-1.162.612-1.73.83-1.964.218-.236.478-.294.636-.294.158 0 .316.002.454.008.146.006.342-.056.536.41.2.48.682 1.662.742 1.782.06.12.1.258.02.418-.08.16-.178.272-.294.408-.118.136-.248.304-.354.408-.12.118-.244.246-.104.484.14.238.622 1.026 1.334 1.66.92.818 1.694 1.07 1.932 1.19.238.12.378.102.518-.058.14-.16.6-1.012.76-1.356.16-.344.318-.288.536-.208.218.08 1.382.652 1.62.77.238.118.396.176.456.276.06.1.06.58-.212 1.346z" />
                                  </svg>
                                </button>

                                {/* Delete Icon Button */}
                                <button
                                  onClick={() => handleDeleteAppointment(item)}
                                  title="Delete Appointment"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: '1.5px solid var(--danger)',
                                    background: 'rgba(239,68,68,0.07)',
                                    color: 'var(--danger)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>

                                {/* Reschedule Icon Button */}
                                {(item.status !== 'completed' && item.status !== 'done') && (
                                  <button
                                    onClick={() => handleOpenReschedule(item)}
                                    title="Reschedule"
                                    style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      border: '1.5px solid var(--primary-color)',
                                      background: 'rgba(37,142,200,0.07)',
                                      color: 'var(--primary-color)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      flexShrink: 0
                                    }}
                                  >
                                    <CalendarClock size={15} />
                                  </button>
                                )}

                                {/* Start / Resume Consultation Button */}
                                {((item.status || 'waiting') === 'waiting' || (item.status || 'waiting') === 'pending' || (item.status || 'waiting') === 'booked' || (item.status || 'waiting') === 'confirmed') ? (
                                  <button
                                    onClick={() => handleStartConsultationRow(item)}
                                    title="Start Consultation"
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#0369a1',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontWeight: '600',
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.2s',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#075985'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                                  >
                                    Start
                                  </button>
                                ) : (item.status === 'in-consultation') ? (
                                  <button
                                    onClick={() => openPatientFile(item)}
                                    title="Resume Consultation"
                                    style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#10b981',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontWeight: '600',
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.2s',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                  >
                                    Resume
                                  </button>
                                ) : null}

                                {/* Up / Down Reordering Buttons */}
                                {isActive && (() => {
                                  const activePatients = dateFilteredList.filter(p =>
                                    p.doctor === item.doctor &&
                                    normalizeBranch(p.raw?.branchId || p.raw?.branchName) === normalizeBranch(item.raw?.branchId || item.raw?.branchName) &&
                                    (p.status === 'waiting' || p.status === 'booked' || p.status === 'in-consultation' || p.status === 'pending')
                                  );
                                  activePatients.sort((x, y) => {
                                    const qX = typeof x.raw?.queueOrder === 'number' ? x.raw.queueOrder : Infinity;
                                    const qY = typeof y.raw?.queueOrder === 'number' ? y.raw.queueOrder : Infinity;
                                    if (qX !== qY) return qX - qY;
                                    const tX = parseTimeStr(x.timeSlot);
                                    const tY = parseTimeStr(y.timeSlot);
                                    if (tX !== tY) return tX - tY;
                                    const timeX = x.raw?.createdAt?.toDate ? x.raw.createdAt.toDate().getTime() : (x.raw?.createdAt ? new Date(x.raw.createdAt).getTime() : 0);
                                    const timeY = y.raw?.createdAt?.toDate ? y.raw.createdAt.toDate().getTime() : (y.raw?.createdAt ? new Date(y.raw.createdAt).getTime() : 0);
                                    return timeX - timeY;
                                  });
                                  const idx = activePatients.findIndex(p => p.id === item.id);
                                  const isFirst = idx <= 0;
                                  const isLast = idx === -1 || idx === activePatients.length - 1;

                                  return (
                                    <>
                                      <button
                                        onClick={() => !isFirst && handleMoveQueue(item, 'up', dateFilteredList)}
                                        disabled={isFirst}
                                        title="Move Up"
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          border: isFirst ? '1.5px solid var(--border-color)' : '1.5px solid var(--primary-color)',
                                          background: isFirst ? 'rgba(0,0,0,0.02)' : 'rgba(37,142,200,0.07)',
                                          color: isFirst ? 'var(--text-muted)' : 'var(--primary-color)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: isFirst ? 'not-allowed' : 'pointer',
                                          flexShrink: 0,
                                          opacity: isFirst ? 0.5 : 1
                                        }}
                                      >
                                        <ArrowUp size={15} />
                                      </button>
                                      <button
                                        onClick={() => !isLast && handleMoveQueue(item, 'down', dateFilteredList)}
                                        disabled={isLast}
                                        title="Move Down"
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          border: isLast ? '1.5px solid var(--border-color)' : '1.5px solid var(--primary-color)',
                                          background: isLast ? 'rgba(0,0,0,0.02)' : 'rgba(37,142,200,0.07)',
                                          color: isLast ? 'var(--text-muted)' : 'var(--primary-color)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          cursor: isLast ? 'not-allowed' : 'pointer',
                                          flexShrink: 0,
                                          opacity: isLast ? 0.5 : 1
                                        }}
                                      >
                                        <ArrowDown size={15} />
                                      </button>
                                    </>
                                  );
                                })()}


                                {/* Payment Status / Invoice Sharing */}
                                {item.paymentStatus === 'paid' ? (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', marginRight: '4px' }}>
                                      ✓ Paid
                                    </span>
                                    {/* Print/Download Invoice Icon Button */}
                                    <button
                                      onClick={() => {
                                        const amountPaid = item.raw?.amountPaid || item.raw?.paymentAmount || item.raw?.requestedAmount || item.paymentAmount || 0;
                                        const method = item.raw?.paymentMethod || item.paymentMethod || 'online';
                                        const isSplit = method === 'split';
                                        const splitDetails = item.raw?.paymentSplitDetails || null;

                                        generatePaymentInvoice({
                                          patientName: item.fullName || 'Patient',
                                          phone: item.phone || 'N/A',
                                          doctor: item.doctor || 'General Doctor',
                                          branch: item.raw?.branchName || userData?.branchName || 'Clinic',
                                          date: item.date || new Date().toLocaleDateString('en-GB'),
                                          timeSlot: item.timeSlot || 'N/A',
                                          amountPaid,
                                          method,
                                          paymentId: item.raw?.paymentId || '',
                                          isSplit,
                                          splitDetails
                                          ,
                                          itemsPaid: item.raw?.itemsPaid || item.itemsPaid || null
                                        });
                                      }}
                                      title="Print Receipt"
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        border: '1.5px solid var(--secondary-color)',
                                        background: 'rgba(37, 142, 200, 0.07)',
                                        color: 'var(--secondary-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                      }}
                                    >
                                      <FileText size={15} />
                                    </button>

                                    {/* WhatsApp Share Invoice Button */}
                                    <button
                                      onClick={() => handleShareReceiptWhatsApp(item.raw || item)}
                                      title="Share Receipt on WhatsApp"
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        border: '1.5px solid #25d366',
                                        background: 'rgba(37,211,102,0.07)',
                                        color: '#25d366',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                                        <path d="M12.031 2C6.49 2 2 6.49 2 12.03c0 1.768.46 3.491 1.335 5.015L2 22l5.13-1.348a9.98 9.98 0 0 0 4.901 1.28c5.54 0 10.03-4.49 10.03-10.03C22.062 6.49 17.571 2 12.031 2zm6.182 14.18c-.272.766-1.356 1.394-1.922 1.49-.49.082-.99.04-2.884-.716-2.42-.968-3.958-3.414-4.08-3.576-.118-.162-.962-1.282-.962-2.444 0-1.162.612-1.73.83-1.964.218-.236.478-.294.636-.294.158 0 .316.002.454.008.146.006.342-.056.536.41.2.48.682 1.662.742 1.782.06.12.1.258.02.418-.08.16-.178.272-.294.408-.118.136-.248.304-.354.408-.12.118-.244.246-.104.484.14.238.622 1.026 1.334 1.66.92.818 1.694 1.07 1.932 1.19.238.12.378.102.518-.058.14-.16.6-1.012.76-1.356.16-.344.318-.288.536-.208.218.08 1.382.652 1.62.77.238.118.396.176.456.276.06.1.06.58-.212 1.346z" />
                                      </svg>
                                    </button>

                                    {/* Complete Visit button */}
                                    {item.status === 'completed' && (
                                      <button
                                        onClick={() => handleCompleteVisit(item)}
                                        className="btn-primary"
                                        style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', fontWeight: '600', backgroundColor: '#10b981', border: '1px solid #10b981', marginLeft: '6px' }}
                                      >
                                        Complete Visit
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  item.status === 'completed' && (
                                    <button
                                      onClick={() => {
                                        setSelectedBill({ ...item, source: item.source });
                                        setShowPayModal(true);
                                      }}
                                      className="btn-primary"
                                      style={{ padding: '6px 12px', fontSize: '12.5px', borderRadius: '6px', fontWeight: '600' }}
                                    >
                                      Collect Payment
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* PATIENT LIST VIEW */}
        {activeTab === 'allpatients' && (
          <div className="fade-in">
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <div>
                <h2>Patient Records</h2>
                <p style={{ color: 'var(--text-muted)' }}>Search and view active patient files</p>
              </div>
              <button className="btn-primary" onClick={() => handleSidebarTabClick('register')}>
                <Plus size={16} /> Register Patient
              </button>
            </div>

            {/* Sub-tabs selection */}
            <div style={{
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '20px',
              paddingBottom: '2px',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => setPatientsSubTab('completed')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: patientsSubTab === 'completed' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  color: patientsSubTab === 'completed' ? 'var(--text-main)' : 'var(--text-muted)',
                  padding: '8px 16px',
                  fontWeight: patientsSubTab === 'completed' ? '700' : '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                Completed (Today & Yesterday)
              </button>
              <button
                onClick={() => setPatientsSubTab('all')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: patientsSubTab === 'all' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  color: patientsSubTab === 'all' ? 'var(--text-main)' : 'var(--text-muted)',
                  padding: '8px 16px',
                  fontWeight: patientsSubTab === 'all' ? '700' : '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                Search All Patient Files
              </button>
            </div>

            {patientsSubTab === 'completed' ? (
              <div className="table-container glass-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Reg ID</th>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Subject</th>
                      <th>Doctor</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedHistoryList.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                          No completed appointments found for today or yesterday.
                        </td>
                      </tr>
                    ) : (
                      completedHistoryList.map(p => (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{p.registrationId || 'ONLINE'}</td>
                          <td style={{ fontWeight: '600' }}>
                            <button
                              onClick={() => openPatientFile({ id: p.id, source: p.source, raw: p.raw, ...p.raw })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary-color)',
                                textDecoration: 'underline',
                                fontWeight: '600',
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span>{p.fullName}</span>
                              {p.source === 'appointments' && (
                                <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>APP</span>
                              )}
                              {(p.raw?.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                                <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>PKG</span>
                              )}
                            </button>
                          </td>
                          <td>{p.phone}<br /><small style={{ color: 'var(--text-muted)' }}>{p.email}</small></td>
                          <td>{p.complaint || 'N/A'}</td>
                          <td>{p.doctor || 'N/A'}</td>
                          <td>{p.date} {p.timeSlot && p.timeSlot !== 'N/A' && `(${p.timeSlot})`}</td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: p.status === 'done' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: p.status === 'done' ? '#10b981' : '#f59e0b',
                              border: p.status === 'done' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                              {p.status === 'done' ? 'Completed' : 'Awaiting Pay'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleWhatsAppContact(p)}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <MessageCircle size={12} color="#25d366" /> WhatsApp
                              </button>
                              <button
                                onClick={() => openPatientFile({ id: p.id, source: p.source, raw: p.raw, ...p.raw })}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> View File
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Search by Patient Name or Phone Number..."
                      className="glass-input"
                      style={{ paddingLeft: '40px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="table-container glass-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Reg ID</th>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Subject</th>
                        <th>Doctor</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!searchQuery.trim() ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '50px 30px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                              <Search size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                              <p style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '15px', margin: 0 }}>Search Patient Records</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Enter a patient name, phone number, or registration ID above to find records.</p>
                            </div>
                          </td>
                        </tr>
                      ) : patientsLoading ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            <span className="spinner" style={{ marginRight: '8px' }}>⏳</span> Searching patient records...
                          </td>
                        </tr>
                      ) : patientsList.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>No patients found matching <strong>"{searchQuery}"</strong>.</td>
                        </tr>
                      ) : (
                        patientsList.map(p => (
                          <tr key={p.id}>
                            <td style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{p.registrationId || 'N/A'}</td>
                            <td style={{ fontWeight: '600' }}>
                              <button
                                onClick={() => openPatientFile({ id: p.id, source: 'allpatients', raw: p, ...p })}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--primary-color)',
                                  textDecoration: 'underline',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  padding: 0,
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <span>{p.fullName}</span>
                                {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp' || p.source === 'Patient App' || p.source === 'Online') && (
                                  <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>APP</span>
                                )}
                                {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                                  <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>PKG</span>
                                )}
                              </button>
                            </td>
                            <td>{p.phone}<br /><small style={{ color: 'var(--text-muted)' }}>{p.email}</small></td>
                            <td>{p.complaint || p.subject || p.symptoms || 'N/A'}</td>
                            <td>{p.doctor || 'N/A'}</td>
                            <td>{p.appointmentDate || 'N/A'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {(patientsList.length > 0 || patientsCurrentPage > 1) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '20px',
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Showing {(patientsCurrentPage - 1) * patientsPerPage + (patientsList.length > 0 ? 1 : 0)} to {(patientsCurrentPage - 1) * patientsPerPage + patientsList.length} records
                    </span>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page Size:</span>
                        <select
                          value={patientsPerPage}
                          onChange={(e) => setPatientsPerPage(Number(e.target.value))}
                          className="glass-input"
                          style={{ padding: '4px 8px', fontSize: '12px', width: '70px', height: '30px' }}
                        >
                          <option value={10}>10</option>
                          <option value={15}>15</option>
                          <option value={20}>20</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => loadPatientsPage(patientsCurrentPage - 1)}
                          disabled={patientsCurrentPage === 1 || patientsLoading}
                          className="btn-secondary"
                          style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px' }}
                        >
                          Previous
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', padding: '0 8px' }}>
                          Page {patientsCurrentPage}
                        </span>
                        <button
                          onClick={() => loadPatientsPage(patientsCurrentPage + 1)}
                          disabled={!hasNextPage || patientsLoading}
                          className="btn-secondary"
                          style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px' }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}


          </div>
        )}

        {/* REGISTER PATIENT VIEW */}
        {activeTab === 'register' && (
          <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header with Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: 'var(--primary-color)', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)' }}>
                <CalendarPlus size={24} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-main)' }}>Book Appointment</h2>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Schedule walk-in and online patient visits easily</p>
              </div>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '20px', zIndex: 50 }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '8px', padding: '6px 12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Search size={18} color="var(--text-muted)" style={{ margin: '0 8px' }} />
                <input
                  type="text"
                  placeholder="Search by patient name, mobile number, or registration ID..."
                  value={globalSearchText}
                  onChange={handleSearchPatient}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', color: 'var(--text-main)' }}
                />
                {isSearchingGlobal && <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: '600', marginRight: '12px' }}>Searching...</span>}
                {globalSearchText.length > 0 && !isSearchingGlobal && (
                  <button type="button" onClick={() => { setGlobalSearchText(''); setGlobalSearchResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '12px' }}>
                    <X size={18} color="var(--text-muted)" />
                  </button>
                )}
                <div style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary-color)', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserSearch size={14} color="var(--primary-color)" /> Search Patient
                </div>
              </div>
              {/* Search Results Dropdown */}
              {globalSearchResults.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '300px', overflowY: 'auto' }}>
                  {globalSearchResults.map((patient, index) => (
                    <div
                      key={patient.id}
                      onClick={() => {
                        setPatientForm({
                          ...patientForm,
                          fullName: patient.fullName || '',
                          phone: patient.phone || '',
                          email: patient.email || '',
                          source: patient.source || 'Walk-in',
                          patientId: patient.id || '',
                          registrationId: patient.registrationId || patient.regId || ''
                        });
                        setGlobalSearchText('');
                        setGlobalSearchResults([]);
                      }}
                      style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: index < globalSearchResults.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.2s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {(patient.fullName || 'P').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.85rem' }}>{patient.fullName}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                          {patient.registrationId || patient.regId ? `${patient.registrationId || patient.regId} • ` : ''}
                          {patient.phone} • Branch: <strong style={{ color: 'var(--text-main)' }}>{patient.branchName || 'Unknown'}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ paddingBottom: '32px' }}>
              <form onSubmit={handleRegisterPatient}>

                {/* Patient Information Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <User size={18} color="var(--primary-color)" />
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>Patient Information</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Patient Name</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff', transition: 'border-color 0.2s' }}>
                      <User size={16} color="var(--text-muted)" />
                      <input
                        type="text"
                        required
                        placeholder="Enter patient's name"
                        value={patientForm.fullName}
                        onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Phone Number</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                      <Phone size={16} color="var(--text-muted)" />
                      <input
                        type="tel"
                        required
                        placeholder="10-digit mobile"
                        value={patientForm.phone}
                        onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Email Address</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                      <Mail size={16} color="var(--text-muted)" />
                      <input
                        type="email"
                        placeholder="e.g. patient@email.com"
                        value={patientForm.email}
                        onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Marketing Source</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                      <Megaphone size={16} color="var(--text-muted)" />
                      <CustomSelect
                        value={patientForm.source}
                        onChange={(val) => setPatientForm({ ...patientForm, source: val })}
                        placeholder="Select source"
                        options={[
                          { value: 'Instagram', label: 'Instagram' },
                          { value: 'Facebook', label: 'Facebook' },
                          { value: 'Website', label: 'Website' },
                          { value: 'Google', label: 'Google' },
                          { value: 'Practo', label: 'Practo' },
                          { value: 'Referral', label: 'Referral' },
                          { value: 'Youtube', label: 'Youtube' },
                          { value: 'Walk-in', label: 'Walk-in' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Mode of Consultation</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                      <Stethoscope size={16} color="var(--text-muted)" />
                      <CustomSelect
                        value={patientForm.modeOfConsultation}
                        onChange={(val) => setPatientForm({ ...patientForm, modeOfConsultation: val })}
                        placeholder="Select mode"
                        options={[
                          { value: 'In-Clinic', label: 'In-Clinic' },
                          { value: 'Online', label: 'Online' }
                        ]}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Subject / Main Complaint</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                      <BookOpen size={16} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="e.g., Sinusitis / Urticaria / Hairfall"
                        value={patientForm.subject}
                        onChange={(e) => setPatientForm({ ...patientForm, subject: e.target.value })}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '24px 0' }} />

                {/* Appointment Details Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Calendar size={18} color="var(--primary-color)" />
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>Appointment Details</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Select Branch</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: !!userData?.branchId ? '#f8fafc' : '#fff' }}>
                      <Building2 size={16} color="var(--text-muted)" />
                      <CustomSelect
                        value={patientForm.branch}
                        disabled={!!userData?.branchId}
                        placeholder="-- Choose Branch --"
                        onChange={(val) => {
                          let updatedDoctor = patientForm.doctor;
                          if (updatedDoctor) {
                            const docObj = doctors.find(d => d.name === updatedDoctor);
                            if (docObj) {
                              let docBranches = getDoctorBranches(docObj.name) ? [...getDoctorBranches(docObj.name)] : [];
                              if (docObj.timings && Array.isArray(docObj.timings)) docObj.timings.forEach(t => { if (t.branch) docBranches.push(t.branch) });
                              if (docObj.branches && Array.isArray(docObj.branches)) docObj.branches.forEach(b => { if (b) docBranches.push(b) });
                              if (docObj.branchName) docBranches.push(docObj.branchName);
                              if (docObj.branchId) docBranches.push(docObj.branchId);

                              const isAtBranch = docBranches.some(b => normalizeBranch(b) === normalizeBranch(val));
                              if (!isAtBranch) updatedDoctor = '';
                              else if (patientForm.appointmentDate) {
                                const slots = generateSlotsForSelected(docObj.name, docObj, val, patientForm.appointmentDate);
                                if (slots.length === 0) updatedDoctor = '';
                              }
                            }
                          }
                          if (!updatedDoctor && val && doctors.length > 0) {
                            const availableDoctors = doctors.filter(d => {
                              let dBranches = getDoctorBranches(d.name) ? [...getDoctorBranches(d.name)] : [];
                              if (d.timings && Array.isArray(d.timings)) d.timings.forEach(t => { if (t.branch) dBranches.push(t.branch) });
                              if (d.branches && Array.isArray(d.branches)) d.branches.forEach(b => { if (b) dBranches.push(b) });
                              if (d.branchName) dBranches.push(d.branchName);
                              if (d.branchId) dBranches.push(d.branchId);
                              const isAtBranch = dBranches.some(b => normalizeBranch(b) === normalizeBranch(val));
                              if (!isAtBranch) return false;
                              if (patientForm.appointmentDate) {
                                const slots = generateSlotsForSelected(d.name, d, val, patientForm.appointmentDate);
                                return slots.length > 0;
                              }
                              return true;
                            });
                            if (availableDoctors.length === 1) {
                              updatedDoctor = availableDoctors[0].name;
                            }
                          }
                          setPatientForm({ ...patientForm, branch: val, doctor: updatedDoctor, appointmentTime: '' });
                        }}
                        options={(() => {
                          let branches = [];
                          if (patientForm.doctor) {
                            const docObj = doctors.find(d => d.name === patientForm.doctor);
                            if (docObj) {
                              branches = getDoctorBranches(docObj.name) ? [...getDoctorBranches(docObj.name)] : [];
                              if (docObj.timings && Array.isArray(docObj.timings)) docObj.timings.forEach(t => { if (t.branch) branches.push(t.branch) });
                              if (docObj.branches && Array.isArray(docObj.branches)) docObj.branches.forEach(b => { if (b) branches.push(b) });
                              if (docObj.branchName) branches.push(docObj.branchName);
                              if (docObj.branchId) branches.push(docObj.branchId);
                            }
                          } else {
                            const allBranches = new Set();
                            doctors.forEach(d => {
                              let bList = getDoctorBranches(d.name) ? [...getDoctorBranches(d.name)] : [];
                              if (d.timings && Array.isArray(d.timings)) d.timings.forEach(t => { if (t.branch) bList.push(t.branch) });
                              if (d.branches && Array.isArray(d.branches)) d.branches.forEach(b => { if (b) bList.push(b) });
                              if (d.branchName) bList.push(d.branchName);
                              if (d.branchId) bList.push(d.branchId);
                              bList.forEach(b => { if (b) allBranches.add(b) });
                            });
                            branches = Array.from(allBranches);
                          }
                          return branches
                            .filter(b => {
                              if (!userData?.branchId) return true;
                              const normB = normalizeBranch(b);
                              const normUserId = normalizeBranch(userData.branchId);
                              const normUserName = normalizeBranch(userData.branchName);
                              return normB === normUserId || normB === normUserName;
                            })
                            .map(b => ({ value: b, label: b }));
                        })()}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Appointment Date</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                      <CalendarClock size={16} color="var(--text-muted)" />
                      <input
                        type="date"
                        required
                        min={getTodayString()}
                        max={getThirtyDaysLaterString()}
                        value={patientForm.appointmentDate}
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          let updatedDoctor = patientForm.doctor;
                          if (patientForm.branch && selectedVal) {
                            const availableDoctors = doctors.filter(d => {
                              let dBranches = getDoctorBranches(d.name) ? [...getDoctorBranches(d.name)] : [];
                              if (d.timings && Array.isArray(d.timings)) d.timings.forEach(t => { if (t.branch) dBranches.push(t.branch) });
                              if (d.branches && Array.isArray(d.branches)) d.branches.forEach(b => { if (b) dBranches.push(b) });
                              if (d.branchName) dBranches.push(d.branchName);
                              if (d.branchId) dBranches.push(d.branchId);
                              const isAtBranch = dBranches.some(b => normalizeBranch(b) === normalizeBranch(patientForm.branch));
                              if (!isAtBranch) return false;
                              const slots = generateSlotsForSelected(d.name, d, patientForm.branch, selectedVal);
                              return slots.length > 0;
                            });
                            if (availableDoctors.length === 1) {
                              updatedDoctor = availableDoctors[0].name;
                            } else if (updatedDoctor && !availableDoctors.some(ad => ad.name === updatedDoctor)) {
                              updatedDoctor = '';
                            }
                          }
                          setPatientForm({ ...patientForm, appointmentDate: selectedVal, appointmentTime: '', doctor: updatedDoctor });
                        }}
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div className="form-group" style={{ marginBottom: '16px', maxWidth: '350px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Select Doctor</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                      <User size={16} color="var(--text-muted)" />
                      <CustomSelect
                        value={patientForm.doctor}
                        placeholder="-- Choose Doctor --"
                        onChange={(docName) => {
                          setPatientForm({
                            ...patientForm,
                            doctor: docName,
                            appointmentTime: '' // Reset slot
                          });
                        }}
                        options={doctors.filter(d => {
                          if (!patientForm.branch) return true;
                          let docBranches = getDoctorBranches(d.name) ? [...getDoctorBranches(d.name)] : [];
                          if (d.timings && Array.isArray(d.timings)) d.timings.forEach(t => { if (t.branch) docBranches.push(t.branch) });
                          if (d.branches && Array.isArray(d.branches)) d.branches.forEach(b => { if (b) docBranches.push(b) });
                          if (d.branchName) docBranches.push(d.branchName);
                          if (d.branchId) docBranches.push(d.branchId);
                          const isAtBranch = docBranches.some(b => normalizeBranch(b) === normalizeBranch(patientForm.branch));
                          if (!isAtBranch) return false;

                          if (patientForm.appointmentDate) {
                            const slots = generateSlotsForSelected(d.name, d, patientForm.branch, patientForm.appointmentDate);
                            return slots.length > 0;
                          }
                          return true;
                        }).map(d => ({ value: d.name, label: `${d.name} (${d.specialty || 'Physician'})` }))}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Available Slots / Time</label>
                    {!patientForm.doctor || !patientForm.branch || !patientForm.appointmentDate ? (
                      <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                        Please select doctor, branch, and date to view slots.
                      </div>
                    ) : fetchingSlots ? (
                      <div style={{ padding: '12px', color: 'var(--primary-color)', fontSize: '0.85rem' }}>Loading slots...</div>
                    ) : availableSlots.length === 0 ? (
                      <div style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fecaca' }}>No slots available on this date.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {availableSlots.map((slot, idx) => (
                          <div
                            key={idx}
                            onClick={() => slot.isAvailable && setPatientForm({ ...patientForm, appointmentTime: slot.time })}
                            style={{
                              position: 'relative',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: patientForm.appointmentTime === slot.time
                                ? '1px solid var(--primary-color)'
                                : `1px solid ${slot.isAvailable ? (slot.isFull ? '#f59e0b' : 'var(--border-color)') : '#f1f5f9'}`,
                              backgroundColor: patientForm.appointmentTime === slot.time
                                ? 'var(--primary-color)'
                                : slot.isAvailable ? (slot.isFull ? '#fef3c7' : '#fff') : '#f8fafc',
                              color: patientForm.appointmentTime === slot.time
                                ? '#fff'
                                : slot.isAvailable ? (slot.isFull ? '#d97706' : 'var(--text-main)') : '#cbd5e1',
                              cursor: slot.isAvailable ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              minWidth: '80px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (slot.isAvailable && patientForm.appointmentTime !== slot.time) e.currentTarget.style.borderColor = 'var(--primary-color)' }}
                            onMouseLeave={(e) => { if (slot.isAvailable && patientForm.appointmentTime !== slot.time) e.currentTarget.style.borderColor = slot.isFull ? '#f59e0b' : 'var(--border-color)' }}
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{slot.time}</span>
                            <span style={{ fontSize: '0.65rem', marginTop: '2px', opacity: 0.9, fontWeight: slot.isFull ? '700' : 'normal' }}>
                              {slot.isAvailable ? (slot.isFull ? `+${slot.bookedCount - 2} Booked` : `${slot.sessionsLeft} left`) : (slot.isBlockedByNoShow ? 'No Show' : 'Full')}
                            </span>
                            {slot.isExtra && (
                              <div
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const docObj = doctors.find(d => d.name === patientForm.doctor);
                                    const doctorId = docObj?.id || patientForm.doctor;
                                    const targetBranch = (patientForm.branch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
                                    const dateString = patientForm.appointmentDate;
                                    const qExtra = query(
                                      collection(db, 'extra_slots'),
                                      where('doctorId', '==', doctorId),
                                      where('dateString', '==', dateString)
                                    );
                                    const snap = await getDocs(qExtra);
                                    snap.forEach(d => {
                                      const dbBranch = (d.data().branchName || d.data().branchId || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
                                      if (dbBranch === targetBranch) {
                                        updateDoc(d.ref, { slots: arrayRemove(slot.time) });
                                      }
                                    });
                                  } catch (err) { console.error(err); }
                                }}
                                style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }}
                              >
                                <X size={10} />
                              </div>
                            )}
                          </div>
                        ))}
                        <div
                          onClick={async () => {
                            let lastTime = '08:00 PM';
                            if (availableSlots.length > 0) {
                              lastTime = availableSlots[availableSlots.length - 1].time;
                            }
                            const match = lastTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                            if (match) {
                              let hours = parseInt(match[1], 10);
                              const minutes = parseInt(match[2], 10);
                              const ampm = match[3].toUpperCase();
                              if (ampm === 'PM' && hours < 12) hours += 12;
                              if (ampm === 'AM' && hours === 12) hours = 0;
                              let totalMin = hours * 60 + minutes + 15;
                              let newH = Math.floor(totalMin / 60) % 24;
                              let newM = totalMin % 60;
                              let newAmpm = newH >= 12 ? 'PM' : 'AM';
                              let displayH = newH > 12 ? newH - 12 : (newH === 0 ? 12 : newH);
                              const newSlot = `${displayH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')} ${newAmpm}`;

                              try {
                                const docObj = doctors.find(d => d.name === patientForm.doctor);
                                const doctorId = docObj?.id || patientForm.doctor;
                                const targetBranch = (patientForm.branch || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
                                const dateString = patientForm.appointmentDate;

                                const qExtra = query(
                                  collection(db, 'extra_slots'),
                                  where('doctorId', '==', doctorId),
                                  where('dateString', '==', dateString)
                                );
                                const snap = await getDocs(qExtra);
                                let docRefToUpdate = null;
                                snap.forEach(d => {
                                  const dbBranch = (d.data().branchName || d.data().branchId || '').toLowerCase().replace(/\s*branch\s*/i, '').trim();
                                  if (dbBranch === targetBranch) docRefToUpdate = d.ref;
                                });

                                if (docRefToUpdate) {
                                  await updateDoc(docRefToUpdate, { slots: arrayUnion(newSlot) });
                                } else {
                                  await addDoc(collection(db, 'extra_slots'), {
                                    doctorId: doctorId,
                                    branchName: targetBranch,
                                    dateString: dateString,
                                    slots: [newSlot]
                                  });
                                }
                              } catch (e) { console.error(e); }
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px dashed #0ea5e9',
                            backgroundColor: '#f0f9ff',
                            color: '#0ea5e9',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '80px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e0f2fe' }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff' }}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>+ Add Slot</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Divider */}
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '24px 0 20px 0' }} />

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={resetPatientForm}
                    style={{ border: '1px solid var(--border-color)', backgroundColor: '#fff', color: 'var(--text-main)', padding: '0 24px', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s', fontSize: '0.85rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    <RefreshCw size={16} color="var(--text-muted)" />
                    Reset
                  </button>

                  <button
                    type="submit"
                    style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', height: '42px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'opacity 0.2s, transform 0.1s' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.99)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <CalendarPlus size={18} />
                    Book Appointment & Add to Queue
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* MEDICINE REQUESTS VIEW */}
        {activeTab === 'requests' && (
          <div className="fade-in">
            {!selectedRequest ? (
              <>
                <h2>Patient Medicine Requests</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Process requested medicine forms and print letterheads</p>

                <div className="table-container glass-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient Name</th>
                        <th>Contact</th>
                        <th>Condition</th>
                        <th>Doctor</th>
                        <th>Branch</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medRequests.filter(r => matchBranch(r)).length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No requests received.</td>
                        </tr>
                      ) : (
                        medRequests
                          .filter(r => matchBranch(r))
                          .map(r => (
                            <tr key={r.id}>
                              <td style={{ fontWeight: '600' }}>{r.patientName}</td>
                              <td>{r.phone}</td>
                              <td>{r.subject || 'N/A'}</td>
                              <td>{r.doctorName}</td>
                              <td>{r.branchName}</td>
                              <td>
                                <span className={`badge ${r.status === 'completed' ? 'badge-primary' : 'badge-secondary'}`}>
                                  {(r.status || 'pending').toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <button onClick={() => openRequestEditor(r)} className="btn-secondary" style={{ padding: '4px 10px' }}>
                                  {r.status === 'completed' ? 'View/Edit' : 'Process Form'}
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* Editor Panel */}
                <div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                    <button onClick={() => setSelectedRequest(null)} className="btn-secondary" style={{ padding: '6px 12px' }}>Back</button>
                    <h2>Medicine Form Editor</h2>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Salutation</label>
                        <select className="glass-input" value={editorData.gender} onChange={e => setEditorData({ ...editorData, gender: e.target.value })}>
                          <option value="Mr.">Mr.</option>
                          <option value="Mrs.">Mrs.</option>
                          <option value="Ms.">Ms.</option>
                          <option value="Master">Master</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Patient Name</label>
                        <input type="text" className="glass-input" value={editorData.patientName} onChange={e => setEditorData({ ...editorData, patientName: e.target.value })} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Age</label>
                        <input type="number" className="glass-input" value={editorData.age} onChange={e => setEditorData({ ...editorData, age: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Form Date</label>
                        <input type="text" className="glass-input" value={editorData.formDate} onChange={e => setEditorData({ ...editorData, formDate: e.target.value })} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Condition / Subject</label>
                      <input type="text" className="glass-input" value={editorData.subject} onChange={e => setEditorData({ ...editorData, subject: e.target.value })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      <div className="form-group">
                        <label className="form-label">Duration (Months)</label>
                        <input type="number" className="glass-input" value={editorData.duration} onChange={e => setEditorData({ ...editorData, duration: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Amount Paid (₹)</label>
                        <input type="number" className="glass-input" value={editorData.amountPaid} onChange={e => setEditorData({ ...editorData, amountPaid: e.target.value })} />
                      </div>
                    </div>

                    {/* Medicines list */}
                    <div style={{ marginBottom: '20px' }}>
                      <label className="form-label" style={{ fontWeight: 'bold' }}>Prescribed Medicines</label>
                      {editorData.medicines.map((m, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                          <input type="text" className="glass-input" style={{ flex: 1 }} placeholder="Medicine name" value={m.name} onChange={e => updateMedicineRow(idx, 'name', e.target.value)} />
                          <input type="text" className="glass-input" style={{ flex: 1.2 }} placeholder="Timing" value={m.timing} onChange={e => updateMedicineRow(idx, 'timing', e.target.value)} />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button onClick={handleDownloadPDF} className="btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Download size={16} /> Print/Download PDF
                      </button>
                      <button onClick={sendMedicineForm} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Send size={16} /> Send to Patient
                      </button>
                    </div>
                  </div>
                </div>

                {/* Letterhead Preview Panel */}
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '12px', padding: '30px', color: '#000', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ border: '2px solid #298FCA', minHeight: '600px', paddingBottom: '80px', position: 'relative' }}>
                    <div style={{ background: 'linear-gradient(135deg, #298FCA 0%, #1a6fa0 100%)', padding: '14px 20px', display: 'flex', justifycontent: 'space-between', alignItems: 'center', color: '#fff' }}>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px' }}>SPIRITUAL</div>
                        <div style={{ fontSize: '8px', color: '#d0eeff' }}>WWW.SPIRITUALHOMEO.COM</div>
                      </div>
                      <img src={`data:image/png;base64,${APP_ICON_BASE64}`} style={{ height: '35px', width: '35px', borderRadius: '4px' }} />
                    </div>
                    <div style={{ height: '5px', background: '#ACCF37' }}></div>

                    <div style={{ padding: '14px 30px', display: 'flex', justifycontent: 'space-between', fontSize: '10px', color: '#333' }}>
                      <div>DATE: {editorData.formDate}</div>
                      <div>support@spiritualhomeo.com</div>
                    </div>
                    <div style={{ height: '1px', background: '#e0e0e0', margin: '0 30px' }}></div>

                    <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '900', letterSpacing: '1px', padding: '18px 30px 20px' }}>
                      TO WHOM SO EVER IT MAY CONCERN
                    </div>

                    <div style={{ padding: '0 30px', fontSize: '12px', color: '#222', lineheight: '1.6' }}>
                      <p>This is to certify that <span style={{ color: '#298FCA', fontWeight: 'bold' }}>{editorData.gender} {editorData.patientName.toUpperCase() || '______'}</span> aged about <strong>{editorData.age || '__'} Years</strong>, has been under our treatment at <strong>Spiritual Homeopathy</strong> for the management of <strong>{(editorData.subject || '__________').toUpperCase()}</strong>.</p>
                      <p>He/She needed to take homeopathy medicine for <strong>{editorData.duration} Months</strong>. We recommended that {editorData.gender} {editorData.patientName} continues to follow the medications.</p>
                    </div>

                    <div style={{ margin: '14px 30px', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                      <div style={{ background: '#f8fafc', padding: '6px 10px', fontSize: '10px', fontWeight: 'bold', color: '#298FCA', borderBottom: '1px solid #e0e0e0' }}>PRESCRIBED MEDICINES</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <tbody>
                          {editorData.medicines.map((m, i) => (
                            <tr key={i}>
                              <td style={{ padding: '5px 10px', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold' }}>{m.name || '---'}</td>
                              <td style={{ padding: '5px 10px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>--- {m.timing || '---'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ textAlign: 'center', position: 'absolute', bottom: '40px', left: '0', right: '0', fontSize: '9px', color: '#666', padding: '0 30px' }}>
                      <p style={{ fontStyle: 'italic' }}>This is a computer-generated document and does not require a physical signature.</p>
                      <p style={{ marginTop: '2px' }}>Spiritual Homeopathy · KPHB</p>
                    </div>

                    <div style={{ background: 'linear-gradient(135deg, #298FCA 0%, #1a6fa0 100%)', color: '#fff', padding: '8px 20px', position: 'absolute', bottom: '0', left: '0', right: '0', display: 'flex', justifycontent: 'space-between', fontSize: '9px' }}>
                      <div>☎ 9030 176 176</div>
                      <div>KPHB, Hyderabad, TS</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BILLING / PAYMENTS VIEW */}
        {activeTab === 'billing' && (
          <div className="fade-in">
            <h2>Billing & Payment Collection</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Collect consultation, medication, and nutrition fees from checked-in patients</p>

            <>
              <div className="table-container glass-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Contact</th>
                      <th>Doctor</th>
                      <th>Fee Requested</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.filter(b => matchBranch(b)).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pending bills.</td>
                      </tr>
                    ) : (
                      bills
                        .filter(b => matchBranch(b))
                        .map(b => (
                          <tr key={b.id}>
                            <td style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{b.fullName}</span>
                              {(b.source === 'appointments' || b._type === 'online' || b.source === 'UserApp' || b.source === 'Patient App' || b.source === 'Online') && (
                                <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>APP</span>
                              )}
                              {(b.packageId || (b.phone && activePackageMap.has(b.phone.replace(/\D/g, '').slice(-10)))) && (
                                <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>PKG</span>
                              )}
                            </td>
                            <td>{b.phone}</td>
                            <td>{b.doctor || 'General Doctor'}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{b.paymentAmount || b.requestedAmount || b.amountRequested || b.consultationFee || 0}</td>
                            <td>
                              <button onClick={() => { setSelectedBill({ ...b, source: 'allpatients' }); setShowPayModal(true); }} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                Collect Payment
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ADMIN REVENUE SECTION */}
              {(userData?.role === 'admin' || userData?.role === 'superadmin') && (
                <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-color)', paddingTop: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Revenue Dashboard</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Monitor total collections and doctor-wise splits</p>
                    </div>

                    {/* Doctor Wise Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Filter by Doctor:</span>
                      <select
                        value={revenueDoctorFilter}
                        onChange={(e) => setRevenueDoctorFilter(e.target.value)}
                        className="glass-input"
                        style={{ padding: '6px 12px', fontSize: '13px', minWidth: '180px', borderRadius: '8px' }}
                      >
                        <option value="all">All Doctors</option>
                        {Array.from(new Set(transactions.map(tx => tx.doctor || 'General Doctor'))).map(docName => (
                          <option key={docName} value={docName}>{docName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* KPI/Stats Cards for Revenue */}
                  {(() => {
                    const filteredTxs = transactions.filter(tx => revenueDoctorFilter === 'all' || (tx.doctor || 'General Doctor') === revenueDoctorFilter);
                    const totalRevenue = filteredTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                    const cashRevenue = filteredTxs.filter(tx => tx.method === 'cash').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                    const upiRevenue = filteredTxs.filter(tx => tx.method === 'upi' || tx.method === 'online').reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

                    return (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total Revenue</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>₹{totalRevenue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Cash Collections</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>₹{cashRevenue.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>UPI / Online Collections</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#8b5cf6' }}>₹{upiRevenue.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Doctor-wise Summary Split (Visible when showing all doctors) */}
                        {revenueDoctorFilter === 'all' && (
                          <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-color)' }}>Doctor-wise Revenue Breakdown</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                              {Array.from(new Set(transactions.map(tx => tx.doctor || 'General Doctor'))).map(docName => {
                                const docAmt = transactions.filter(tx => (tx.doctor || 'General Doctor') === docName).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                                return (
                                  <div key={docName} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)' }}>{docName}</span>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-color)' }}>₹{docAmt.toLocaleString('en-IN')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Transactions History Table */}
                        <div className="table-container glass-panel" style={{ marginTop: '20px' }}>
                          <h4 style={{ padding: '16px 20px', margin: 0, borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem', fontWeight: 600 }}>Payment Collections Log</h4>
                          <div style={{ overflowX: 'auto' }}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Date & Time</th>
                                  <th>Patient Name</th>
                                  <th>Doctor</th>
                                  <th>Branch</th>
                                  <th>Method</th>
                                  <th>Amount</th>
                                  <th>Reference ID</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredTxs.length === 0 ? (
                                  <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No transaction records found.</td>
                                  </tr>
                                ) : (
                                  filteredTxs.map(tx => {
                                    const txDate = tx.timestamp?.seconds ? new Date(tx.timestamp.seconds * 1000) : new Date();
                                    return (
                                      <tr key={tx.id}>
                                        <td style={{ fontSize: '12px' }}>{txDate.toLocaleDateString('en-GB')} {txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td style={{ fontWeight: '600' }}>{tx.patientName}</td>
                                        <td>{tx.doctor || 'General Doctor'}</td>
                                        <td>{tx.branchName || 'N/A'}</td>
                                        <td>
                                          <span className="badge" style={{
                                            background: tx.method === 'cash' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                            color: tx.method === 'cash' ? '#3b82f6' : '#8b5cf6',
                                            border: tx.method === 'cash' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: '700'
                                          }}>
                                            {tx.method.toUpperCase()}
                                          </span>
                                        </td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>₹{Number(tx.amount || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{tx.paymentId || 'N/A'}</td>
                                        <td>
                                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                              type="button"
                                              onClick={() => generatePaymentInvoice({
                                                patientName: tx.patientName,
                                                phone: tx.phone || 'N/A',
                                                doctor: tx.doctor || 'General Doctor',
                                                branch: tx.branchName || 'Clinic',
                                                date: txDate.toLocaleDateString('en-GB'),
                                                timeSlot: 'N/A',
                                                amountPaid: tx.amount,
                                                method: tx.method,
                                                paymentId: tx.paymentId || '',
                                                isSplit: tx.method === 'split',
                                                splitDetails: tx.paymentSplitDetails || null, itemsPaid: item.raw?.itemsPaid || item.itemsPaid || selectedBill?.itemsPaid || tx?.itemsPaid || itemsPaid || null
                                              })}
                                              title="Print Invoice / Receipt"
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                                            >
                                              🖨️
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleShareReceiptWhatsApp({
                                                fullName: tx.patientName,
                                                phone: tx.phone || '',
                                                doctor: tx.doctor,
                                                branchName: tx.branchName,
                                                appointmentDate: txDate.toLocaleDateString('en-GB'),
                                                appointmentTime: 'N/A',
                                                amountPaid: tx.amount,
                                                paymentMethod: tx.method,
                                                paymentId: tx.paymentId
                                              })}
                                              title="Share Receipt on WhatsApp"
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                                            >
                                              💬
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          </div>
        )}

        {/* PACKAGE MEMBERS VIEW */}
        {activeTab === 'packages' && (
          <PackageMembers />
        )}

        {/* SHIPROCKET SHIPPING VIEW */}
        {activeTab === 'shipping' && (
          <ShippingForm />
        )}

        {/* PRODUCTS BILLING VIEW */}
        {activeTab === 'products-billing' && (
          <RewardPointClaim />
        )}

        {/* FOLLOW UPS VIEW */}
        {activeTab === 'followups' && (() => {
          const localToday = new Date();
          const yyyy = localToday.getFullYear();
          const mm = String(localToday.getMonth() + 1).padStart(2, '0');
          const dd = String(localToday.getDate()).padStart(2, '0');
          const todayStr = `${yyyy}-${mm}-${dd}`;

          const tomorrowObj = new Date(localToday.getTime() + 24 * 60 * 60 * 1000);
          const tomorrowYYYY = tomorrowObj.getFullYear();
          const tomorrowMM = String(tomorrowObj.getMonth() + 1).padStart(2, '0');
          const tomorrowDD = String(tomorrowObj.getDate()).padStart(2, '0');
          const tomorrowStr = `${tomorrowYYYY}-${tomorrowMM}-${tomorrowDD}`;

          const filteredFollowups = followups.filter(f => {
            if (!matchBranch(f)) return false;

            if (followupDateFilter === 'all') return true;

            const fDate = normalizeDateToYYYYMMDD(f.followUpDate);
            if (!fDate) return false;

            if (followupDateFilter === 'today') {
              return fDate === todayStr;
            } else if (followupDateFilter === 'tomorrow') {
              return fDate === tomorrowStr;
            } else if (followupDateFilter === 'custom') {
              return fDate === followupCustomDate;
            } else if (followupDateFilter === 'last_month') {
              const firstOfLastMonth = new Date(localToday.getFullYear(), localToday.getMonth() - 1, 1);
              const lastOfLastMonth = new Date(localToday.getFullYear(), localToday.getMonth(), 0, 23, 59, 59);
              const fTime = new Date(fDate + 'T00:00:00').getTime();
              return fTime >= firstOfLastMonth.getTime() && fTime <= lastOfLastMonth.getTime();
            } else if (followupDateFilter === 'last_2_months') {
              const limitDate = new Date(localToday);
              limitDate.setMonth(limitDate.getMonth() - 2);
              const fTime = new Date(fDate + 'T00:00:00').getTime();
              return fTime >= limitDate.getTime() && fTime <= localToday.getTime() + 24 * 60 * 60 * 1000;
            } else if (followupDateFilter === 'last_4_months') {
              const limitDate = new Date(localToday);
              limitDate.setMonth(limitDate.getMonth() - 4);
              const fTime = new Date(fDate + 'T00:00:00').getTime();
              return fTime >= limitDate.getTime() && fTime <= localToday.getTime() + 24 * 60 * 60 * 1000;
            } else if (followupDateFilter === 'upcoming_month') {
              const firstOfNextMonth = new Date(localToday.getFullYear(), localToday.getMonth() + 1, 1);
              const lastOfNextMonth = new Date(localToday.getFullYear(), localToday.getMonth() + 2, 0, 23, 59, 59);
              const fTime = new Date(fDate + 'T00:00:00').getTime();
              return fTime >= firstOfNextMonth.getTime() && fTime <= lastOfNextMonth.getTime();
            } else if (followupDateFilter === 'select_month') {
              return fDate.startsWith(selectedMonthWeb);
            }
            return true;
          });

          // Sort followups chronologically
          filteredFollowups.sort((a, b) => {
            const dateA = normalizeDateToYYYYMMDD(a.followUpDate) || '';
            const dateB = normalizeDateToYYYYMMDD(b.followUpDate) || '';
            return dateA.localeCompare(dateB);
          });

          return (
            <div className="fade-in">
              <div className="flex-between" style={{ marginBottom: '24px' }}>
                <div>
                  <h2>Patient Follow-ups Due</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Track patients scheduled for their next consultation visit</p>
                </div>
              </div>

              {/* Interactive Date Filter Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setFollowupDateFilter('all')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: followupDateFilter === 'all' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: followupDateFilter === 'all' ? '#fff' : 'var(--text-main)',
                      border: followupDateFilter === 'all' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    All Follow-ups
                  </button>
                  <button
                    onClick={() => setFollowupDateFilter('today')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: followupDateFilter === 'today' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: followupDateFilter === 'today' ? '#fff' : 'var(--text-main)',
                      border: followupDateFilter === 'today' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setFollowupDateFilter('tomorrow')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: followupDateFilter === 'tomorrow' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: followupDateFilter === 'tomorrow' ? '#fff' : 'var(--text-main)',
                      border: followupDateFilter === 'tomorrow' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => setFollowupDateFilter('last_month')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: followupDateFilter === 'last_month' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: followupDateFilter === 'last_month' ? '#fff' : 'var(--text-main)',
                      border: followupDateFilter === 'last_month' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    Last Month
                  </button>
                  <button
                    onClick={() => setFollowupDateFilter('last_2_months')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: followupDateFilter === 'last_2_months' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: followupDateFilter === 'last_2_months' ? '#fff' : 'var(--text-main)',
                      border: followupDateFilter === 'last_2_months' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    Last 2 Months
                  </button>
                  <button
                    onClick={() => setFollowupDateFilter('last_4_months')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: followupDateFilter === 'last_4_months' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: followupDateFilter === 'last_4_months' ? '#fff' : 'var(--text-main)',
                      border: followupDateFilter === 'last_4_months' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    Last 4 Months
                  </button>
                  <button
                    onClick={() => setFollowupDateFilter('upcoming_month')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontWeight: '600',
                      fontSize: '13px',
                      background: followupDateFilter === 'upcoming_month' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                      color: followupDateFilter === 'upcoming_month' ? '#fff' : 'var(--text-main)',
                      border: followupDateFilter === 'upcoming_month' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    Upcoming Month
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Select Month:</span>
                    <select
                      value={followupDateFilter === 'select_month' ? selectedMonthWeb : ''}
                      onChange={(e) => {
                        setSelectedMonthWeb(e.target.value);
                        setFollowupDateFilter('select_month');
                      }}
                      className="glass-input"
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-main)',
                        border: followupDateFilter === 'select_month' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="" disabled style={{ background: 'var(--bg-main)' }}>Choose Month</option>
                      {getMonthOptionsWeb().map(opt => (
                        <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-main)' }}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>Custom Date:</span>
                    <input
                      type="date"
                      value={followupCustomDate}
                      onChange={(e) => {
                        setFollowupCustomDate(e.target.value);
                        setFollowupDateFilter('custom');
                      }}
                      className="glass-input"
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        width: '160px',
                        border: followupDateFilter === 'custom' ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="table-container glass-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Contact</th>
                      <th>Doctor</th>
                      <th>Branch</th>
                      <th>Follow-up Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFollowups.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                          No follow-ups due matching the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredFollowups.map(f => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{f.fullName}</span>
                            {(f.source === 'appointments' || f._type === 'online' || f.source === 'UserApp' || f.source === 'Patient App' || f.source === 'Online') && (
                              <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>APP</span>
                            )}
                            {(f.packageId || (f.phone && activePackageMap.has(f.phone.replace(/\D/g, '').slice(-10)))) && (
                              <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>PKG</span>
                            )}
                          </td>
                          <td>{f.phone}</td>
                          <td>{f.doctor}</td>
                          <td>{f.branchName}</td>
                          <td style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>
                            {(() => {
                              const dObj = new Date(f.followUpDate);
                              return isNaN(dObj.getTime()) ? f.followUpDate : `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}/${dObj.getFullYear()}`;
                            })()} ({f.followUpInterval || '15 days'})
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* DOCTOR NO SHOW VIEW */}
        {activeTab === 'noshow' && (() => {
          const uBranchCanonical = getCanonicalBranchName(userData?.branchName || userData?.branchId);

          // Filter doctors who are scheduled in the receptionist's branch
          const branchDoctors = doctors.filter(d => doctorWorksAtBranch(d, userData));

          // Filter no shows matching the receptionist's branch
          const branchNoShows = noShows.filter(ns => {
            const nsBranch = getCanonicalBranchName(ns.branchName || ns.branchId);
            return nsBranch === uBranchCanonical;
          });

          const handleCreateNoShow = async (e) => {
            e.preventDefault();
            if (!noShowForm.doctorId) {
              alert('Please select a doctor.');
              return;
            }
            if (noShowForm.type === 'date' && !noShowForm.date) {
              alert('Please select a date.');
              return;
            }
            if (noShowForm.type === 'date_range' && (!noShowForm.startDate || !noShowForm.endDate)) {
              alert('Please select both start and end dates.');
              return;
            }
            if (noShowForm.type === 'session' && (!noShowForm.date || !noShowForm.session)) {
              alert('Please specify the date and session.');
              return;
            }
            if (noShowForm.type === 'time_range' && (!noShowForm.date || !noShowForm.startTime || !noShowForm.endTime)) {
              alert('Please specify the date, start time, and end time.');
              return;
            }

            const docObj = doctors.find(d => d.id === noShowForm.doctorId);
            if (!docObj) {
              alert('Selected doctor details not found.');
              return;
            }

            // Validate against the doctor's weekly scheduled days at this branch
            if (noShowForm.type === 'date' || noShowForm.type === 'session' || noShowForm.type === 'time_range') {
              const checkDate = new Date(noShowForm.date);
              const works = isDoctorScheduledAtBranchOnDate(docObj, uBranchCanonical, checkDate);
              if (!works) {
                const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
                const sched = getDoctorScheduledDaysAtBranch(docObj, uBranchCanonical);
                alert(`Cannot Add No Show: Dr. ${docObj.name} is not scheduled to work on ${dayName}s at ${uBranchCanonical}.\n\nScheduled days: ${sched}`);
                return;
              }
            } else if (noShowForm.type === 'date_range') {
              const start = new Date(noShowForm.startDate);
              const end = new Date(noShowForm.endDate);
              if (start > end) {
                alert('Start date cannot be after end date.');
                return;
              }

              let hasWorkingDay = false;
              let temp = new Date(start);
              while (temp <= end) {
                if (isDoctorScheduledAtBranchOnDate(docObj, uBranchCanonical, temp)) {
                  hasWorkingDay = true;
                  break;
                }
                temp.setDate(temp.getDate() + 1);
              }

              if (!hasWorkingDay) {
                const sched = getDoctorScheduledDaysAtBranch(docObj, uBranchCanonical);
                alert(`Cannot Add No Show: Dr. ${docObj.name} is not scheduled to work on any day in the range ${noShowForm.startDate} to ${noShowForm.endDate} at ${uBranchCanonical}.\n\nScheduled days: ${sched}`);
                return;
              }
            }

            try {
              const uBranchNameResolved = userData?.branchName || `${userData?.branchId || 'KPHB'} Branch`;
              const uBranchIdResolved = userData?.branchId || 'KPHB';

              const payload = {
                doctorId: noShowForm.doctorId,
                doctorName: docObj.name,
                branchId: uBranchIdResolved,
                branchName: uBranchNameResolved,
                type: noShowForm.type,
                reason: noShowForm.reason || 'Leave/Unavailable',
                createdAt: serverTimestamp(),
                createdBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Reception'
              };

              if (noShowForm.type === 'date') {
                payload.date = noShowForm.date;
              } else if (noShowForm.type === 'date_range') {
                payload.startDate = noShowForm.startDate;
                payload.endDate = noShowForm.endDate;
              } else if (noShowForm.type === 'session') {
                payload.date = noShowForm.date;
                payload.session = noShowForm.session;
              } else if (noShowForm.type === 'time_range') {
                payload.date = noShowForm.date;
                payload.startTime = noShowForm.startTime;
                payload.endTime = noShowForm.endTime;
              }

              await addDoc(collection(db, 'doctor_no_shows'), payload);
              alert('Doctor marked as No Show successfully!');

              // Reset Form
              setNoShowForm({
                doctorId: '',
                type: 'date',
                date: '',
                startDate: '',
                endDate: '',
                session: 'morning',
                startTime: '',
                endTime: '',
                reason: ''
              });
              setNoShowDateWarning('');
            } catch (err) {
              console.error("Error creating Doctor No Show entry:", err);
              alert("Failed to mark Doctor as No Show.");
            }
          };

          const handleDeleteNoShow = async (id) => {
            if (!window.confirm("Are you sure you want to delete this Doctor No Show override?")) {
              return;
            }
            try {
              await deleteDoc(doc(db, 'doctor_no_shows', id));
              alert("No Show override deleted successfully.");
            } catch (err) {
              console.error("Error deleting No Show entry:", err);
              alert("Failed to delete No Show override.");
            }
          };

          return (
            <div className="fade-in">
              <div className="flex-between" style={{ marginBottom: '24px' }}>
                <div>
                  <h2>Doctor No Show Management</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Temporarily override doctor availability for your branch</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* LEFT COLUMN: No Show List */}
                <div style={{ flex: '1.2', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                      Active Overrides ({uBranchCanonical})
                    </h3>

                    {branchNoShows.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0, padding: '12px 0' }}>
                        No temporary unavailability overrides configured currently.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {branchNoShows.map(ns => (
                          <div
                            key={ns.id}
                            style={{
                              padding: '14px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'rgba(255, 255, 255, 0.02)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                {ns.doctorName}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                Reason: <strong style={{ color: 'var(--text-main)' }}>{ns.reason}</strong>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: '600', marginTop: '6px' }}>
                                {(() => {
                                  if (ns.type === 'date') {
                                    return `Full Day: ${ns.date}`;
                                  }
                                  if (ns.type === 'date_range') {
                                    return `Range: ${ns.startDate} to ${ns.endDate}`;
                                  }
                                  if (ns.type === 'session') {
                                    return `Session: ${ns.session.toUpperCase()} on ${ns.date}`;
                                  }
                                  if (ns.type === 'time_range') {
                                    return `Time: ${ns.startTime} - ${ns.endTime} on ${ns.date}`;
                                  }
                                  return 'N/A';
                                })()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteNoShow(ns.id)}
                              style={{
                                border: 'none',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Create Form */}
                <div style={{ flex: '0.8', minWidth: '280px' }}>
                  <form onSubmit={handleCreateNoShow} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>
                      Add Temporary Override
                    </h3>

                    {/* Doctor Selector */}
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                        Select Doctor
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                        <User size={16} color="var(--text-muted)" />
                        <CustomSelect
                          value={doctors.find(d => d.id === noShowForm.doctorId)?.name || ''}
                          placeholder="-- Select Doctor --"
                          onChange={(docName) => {
                            const dId = doctors.find(d => d.name === docName)?.id || '';
                            setNoShowForm({ ...noShowForm, doctorId: dId, date: '', startDate: '', endDate: '' });
                            setNoShowDateWarning('');
                          }}
                          options={branchDoctors.map(d => ({ value: d.name, label: d.name }))}
                        />
                      </div>
                    </div>

                    {/* Doctor Schedule Reference Display */}
                    {noShowForm.doctorId && (() => {
                      const selectedDoc = doctors.find(d => d.id === noShowForm.doctorId);
                      const scheduledDays = getDoctorScheduledDaysAtBranch(selectedDoc, uBranchCanonical);
                      return (
                        <div style={{
                          padding: '10px 12px',
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: '#2563eb',
                          lineHeight: '1.4',
                          marginTop: '-8px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px'
                        }}>
                          <Info size={14} style={{ marginTop: '2px', flexShrink: 0, color: '#2563eb' }} />
                          <div>
                            <strong>Dr. {selectedDoc?.name}'s Schedule:</strong>
                            <div style={{ color: 'var(--text-main)', marginTop: '2px', fontWeight: '500' }}>
                              {scheduledDays}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Override Type */}
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                        Override Type
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                        <Clock size={16} color="var(--text-muted)" />
                        <CustomSelect
                          value={noShowForm.type === 'date' ? 'Full Day' : noShowForm.type === 'date_range' ? 'Date Range' : noShowForm.type === 'session' ? 'Session' : 'Custom Time Range'}
                          placeholder="Select Type"
                          onChange={(val) => {
                            const typeMap = {
                              'Full Day': 'date',
                              'Date Range': 'date_range',
                              'Session': 'session',
                              'Custom Time Range': 'time_range'
                            };
                            setNoShowForm({ ...noShowForm, type: typeMap[val], date: '', startDate: '', endDate: '' });
                            setNoShowDateWarning('');
                          }}
                          options={[
                            { value: 'Full Day', label: 'Full Day' },
                            { value: 'Date Range', label: 'Date Range' },
                            { value: 'Session', label: 'Session (Morning/Evening)' },
                            { value: 'Custom Time Range', label: 'Custom Time Range' }
                          ]}
                        />
                      </div>
                    </div>

                    {/* Date Field (for single date types) */}
                    {noShowForm.type !== 'date_range' && (
                      <div className="form-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                          Date
                        </label>
                        <input
                          type="date"
                          required
                          value={noShowForm.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && noShowForm.doctorId) {
                              const docObj = doctors.find(d => d.id === noShowForm.doctorId);
                              if (docObj) {
                                const checkDate = new Date(val);
                                const works = isDoctorScheduledAtBranchOnDate(docObj, uBranchCanonical, checkDate);
                                if (!works) {
                                  const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
                                  const sched = getDoctorScheduledDaysAtBranch(docObj, uBranchCanonical);
                                  setNoShowDateWarning(`⚠️ Dr. ${docObj.name} does not work on ${dayName}s at ${uBranchCanonical}. Scheduled days: ${sched}`);
                                  return;
                                } else {
                                  setNoShowDateWarning('');
                                }
                              }
                            } else {
                              setNoShowDateWarning('');
                            }
                            setNoShowForm({ ...noShowForm, date: val });
                          }}
                          className="glass-input"
                          style={{ width: '100%', height: '42px', margin: 0, fontSize: '0.85rem' }}
                        />
                        {noShowDateWarning && (
                          <div style={{
                            marginTop: '6px',
                            padding: '8px 10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            lineHeight: '1.4'
                          }}>
                            {noShowDateWarning}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date Range Fields */}
                    {noShowForm.type === 'date_range' && (
                      <>
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            required
                            value={noShowForm.startDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNoShowForm({ ...noShowForm, startDate: val });
                              setNoShowDateWarning('');
                            }}
                            className="glass-input"
                            style={{ width: '100%', height: '42px', margin: 0, fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            required
                            value={noShowForm.endDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              const startVal = noShowForm.startDate;
                              if (val && startVal && noShowForm.doctorId) {
                                const docObj = doctors.find(d => d.id === noShowForm.doctorId);
                                if (docObj) {
                                  const start = new Date(startVal);
                                  const end = new Date(val);
                                  let hasWorkingDay = false;
                                  let temp = new Date(start);
                                  while (temp <= end) {
                                    if (isDoctorScheduledAtBranchOnDate(docObj, uBranchCanonical, temp)) {
                                      hasWorkingDay = true;
                                      break;
                                    }
                                    temp.setDate(temp.getDate() + 1);
                                  }
                                  if (!hasWorkingDay) {
                                    const sched = getDoctorScheduledDaysAtBranch(docObj, uBranchCanonical);
                                    setNoShowDateWarning(`⚠️ Dr. ${docObj.name} has no scheduled working days in this date range at ${uBranchCanonical}. Scheduled days: ${sched}`);
                                  } else {
                                    setNoShowDateWarning('');
                                  }
                                }
                              } else {
                                setNoShowDateWarning('');
                              }
                              setNoShowForm({ ...noShowForm, endDate: val });
                            }}
                            className="glass-input"
                            style={{ width: '100%', height: '42px', margin: 0, fontSize: '0.85rem' }}
                          />
                        </div>
                        {noShowDateWarning && (
                          <div style={{
                            marginTop: '-8px',
                            padding: '8px 10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            lineHeight: '1.4'
                          }}>
                            {noShowDateWarning}
                          </div>
                        )}
                      </>
                    )}

                    {/* Session Selector */}
                    {noShowForm.type === 'session' && (
                      <div className="form-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                          Select Session
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px', height: '42px', backgroundColor: '#fff' }}>
                          <Clock size={16} color="var(--text-muted)" />
                          <CustomSelect
                            value={noShowForm.session === 'morning' ? 'Morning' : noShowForm.session === 'evening' ? 'Evening' : 'All'}
                            placeholder="Select Session"
                            onChange={(val) => {
                              const sessMap = { 'Morning': 'morning', 'Evening': 'evening', 'All': 'all' };
                              setNoShowForm({ ...noShowForm, session: sessMap[val] });
                            }}
                            options={[
                              { value: 'Morning', label: 'Morning Session (Before 2 PM)' },
                              { value: 'Evening', label: 'Evening Session (After 2 PM)' },
                              { value: 'All', label: 'Full Day Block' }
                            ]}
                          />
                        </div>
                      </div>
                    )}

                    {/* Time Range Fields */}
                    {noShowForm.type === 'time_range' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                            Start Time
                          </label>
                          <input
                            type="time"
                            required
                            value={noShowForm.startTime}
                            onChange={(e) => setNoShowForm({ ...noShowForm, startTime: e.target.value })}
                            className="glass-input"
                            style={{ width: '100%', height: '42px', margin: 0, fontSize: '0.85rem' }}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                            End Time
                          </label>
                          <input
                            type="time"
                            required
                            value={noShowForm.endTime}
                            onChange={(e) => setNoShowForm({ ...noShowForm, endTime: e.target.value })}
                            className="glass-input"
                            style={{ width: '100%', height: '42px', margin: 0, fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="form-group">
                      <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                        Reason for Override
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vacation, Sick Leave, Emergency"
                        value={noShowForm.reason}
                        onChange={(e) => setNoShowForm({ ...noShowForm, reason: e.target.value })}
                        className="glass-input"
                        style={{ width: '100%', height: '42px', margin: 0, fontSize: '0.85rem' }}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        backgroundColor: 'var(--primary-color)',
                        color: '#fff',
                        border: 'none',
                        height: '42px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        marginTop: '8px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Save Override
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })()}

        {/* MEDIA MANAGER VIEW */}
        {activeTab === 'media-manager' && (() => {
          const globalF = mediaFolders.filter(f => !f.patientPhone);
          const fItems = selectedFolderWeb ? mediaItems.filter(item => item.folderId === selectedFolderWeb.id) : [];

          const handleCreateFolderWeb = async (e) => {
            e.preventDefault();
            if (!folderNameInput.trim()) return;
            try {
              await addDoc(collection(db, 'media_folders'), {
                name: folderNameInput.trim(),
                patientPhone: null,
                createdAt: serverTimestamp(),
                createdBy: 'Web Receptionist'
              });
              setFolderNameInput('');
              alert('Folder created successfully.');
            } catch (err) {
              console.error(err);
              alert('Failed to create folder.');
            }
          };

          const handleDeleteFolderWeb = async (folder) => {
            if (!window.confirm(`Are you sure you want to delete "${folder.name}" and all of its files?`)) return;
            try {
              // Get all items inside folder
              const qItems = query(collection(db, 'media_items'), where('folderId', '==', folder.id));
              const snap = await getDocs(qItems);
              for (const docSnap of snap.docs) {
                const data = docSnap.data();
                if (data.storagePath) {
                  const storageRef = ref(storage, data.storagePath);
                  await deleteDoc(doc(db, 'media_items', docSnap.id));
                }
              }
              await deleteDoc(doc(db, 'media_folders', folder.id));
              if (selectedFolderWeb?.id === folder.id) {
                setSelectedFolderWeb(null);
              }
              alert('Folder deleted.');
            } catch (err) {
              console.error(err);
            }
          };
          const handleWebUpload = async (e) => {
            const file = e.target.files[0];
            if (!file || !selectedFolderWeb) return;
            setUploadingFileWeb(true);
            setUploadProgressWeb('Uploading file to Firebase Storage...');
            try {
              const fileExt = file.name.split('.').pop() || 'mp4';
              const storagePath = `media_library/${selectedFolderWeb.id}/${Date.now()}_${file.name}`;
              const storageRef = ref(storage, storagePath);
              await uploadBytes(storageRef, file);
              const downloadUrl = await getDownloadURL(storageRef);

              await addDoc(collection(db, 'media_items'), {
                folderId: selectedFolderWeb.id,
                title: file.name,
                type: file.type.startsWith('video/') ? 'video' : 'image',
                url: downloadUrl,
                storagePath: storagePath,
                sharedWithApp: true,
                createdAt: serverTimestamp()
              });
              alert('File uploaded successfully.');
            } catch (err) {
              console.error(err);
              alert('Upload failed.');
            } finally {
              setUploadingFileWeb(false);
              setUploadProgressWeb('');
            }
          };

          const handleDeleteItemWeb = async (item) => {
            if (!window.confirm("Are you sure you want to delete this media file?")) return;
            try {
              await deleteDoc(doc(db, 'media_items', item.id));
              alert('Media deleted.');
            } catch (err) {
              console.error(err);
            }
          };

          return (
            <div className="fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', color: 'var(--text-main)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                  {selectedFolderWeb ? `Media: ${selectedFolderWeb.name}` : 'Global Media Manager'}
                </h2>
                {selectedFolderWeb && (
                  <button onClick={() => setSelectedFolderWeb(null)} className="btn-secondary" style={{ padding: '8px 16px' }}>
                    Back to Folders
                  </button>
                )}
              </div>

              {!selectedFolderWeb ? (
                // Folder management view
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1.5', minWidth: '320px' }}>
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Global Media Folders</h3>
                      {globalF.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No global media folders found. Create one on the right.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                          {globalF.map(folder => (
                            <div key={folder.id} className="glass-panel" style={{
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '12px',
                              cursor: 'pointer',
                              border: '1px solid var(--border-color)',
                              borderRadius: '10px'
                            }} onClick={() => setSelectedFolderWeb(folder)}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FolderOpen size={24} color="var(--primary-color)" />
                                <strong style={{ fontSize: '0.95rem' }}>{folder.name}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFolderWeb(folder); }} style={{
                                  border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'
                                }} title="Delete Folder">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: '0.8', minWidth: '260px' }}>
                    <form onSubmit={handleCreateFolderWeb} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>Create Global Folder</h3>
                      <div className="form-group">
                        <label className="form-label">Folder Name</label>
                        <input
                          type="text"
                          required
                          value={folderNameInput}
                          onChange={(e) => setFolderNameInput(e.target.value)}
                          className="glass-input"
                          placeholder="e.g. Diabetes Education"
                          style={{ width: '100%', height: '40px', margin: 0 }}
                        />
                      </div>
                      <button type="submit" className="btn-primary" style={{ height: '40px', cursor: 'pointer' }}>
                        Create Folder
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                // Folder items view
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Direct File Upload</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Select a local video or image file to upload directly to this folder.
                      </p>
                    </div>
                    <label className="btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                      <Upload size={16} /> Upload Video / Image
                      <input type="file" accept="video/*,image/*" style={{ display: 'none' }} disabled={uploadingFileWeb} onChange={handleWebUpload} />
                    </label>
                  </div>

                  {uploadingFileWeb && (
                    <div style={{ padding: '12px', background: 'rgba(37, 142, 200, 0.08)', border: '1px solid rgba(37, 142, 200, 0.3)', borderRadius: '8px', color: 'var(--secondary-color)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {uploadProgressWeb}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ margin: '0 0 16px 0' }}>Media Files ({fItems.length})</h4>
                    {fItems.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                        No media files uploaded to this folder yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                        {fItems.map(item => (
                          <div key={item.id} className="glass-panel" style={{
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {item.type === 'video' ? <Video size={18} color="var(--primary-color)" /> : <ImageIcon size={18} color="var(--secondary-color)" />}
                              <span style={{ fontSize: '0.85rem', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={item.title}>
                                {item.title}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                              <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 'bold' }}>
                                View / Play
                              </a>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {selectedFolderWeb?.patientPhone && (
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <input type="checkbox" checked={!!item.sharedWithApp} onChange={() => handleToggleItemShareWeb(item)} />
                                    Show in App
                                  </label>
                                )}
                                <button onClick={() => handleDeleteItemWeb(item)} style={{
                                  border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px'
                                }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Pay Modal */}
        {showPayModal && selectedBill && (
          <div className="modal-backdrop" style={{
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1000,
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}>
            <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Coins size={22} color="var(--primary-color)" />
                  <span>Counter Checkout: Collect Fee</span>
                </h3>
                <button onClick={() => { stopQrPolling(); setShowPayModal(false); setSelectedBill(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
                {/* LEFT COLUMN: Patient File & Records */}
                <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>
                  {loadingPayFile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', gap: '12px' }}>
                      <RefreshCw className="spin" size={32} color="var(--primary-color)" />
                      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading Patient File & Records...</span>
                    </div>
                  ) : (
                    <>
                      {/* Patient Basic Info Card */}
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={16} /> Patient Information
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                          <div>Name: <strong style={{ color: 'var(--text-main)' }}>{selectedBill.fullName}</strong></div>
                          <div>Phone: <span style={{ color: 'var(--text-main)' }}>{selectedBill.phone || 'N/A'}</span></div>
                          <div>Age/Gender: <span style={{ color: 'var(--text-main)' }}>{payPatientDoc?.age || 'N/A'} yrs / {payPatientDoc?.gender || 'N/A'}</span></div>
                          <div>Reg ID: <span style={{ color: 'var(--text-main)' }}>{payPatientDoc?.regId || 'N/A'}</span></div>
                        </div>
                        {payComplaint && (
                          <div style={{ marginTop: '12px', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Chief Complaint:</span>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-main)', fontStyle: 'italic' }}>{payComplaint}</p>
                          </div>
                        )}
                      </div>

                      {/* Reception Notes Card */}
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} /> Receptionist Notes & Instructions
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <textarea
                            className="glass-input"
                            style={{ width: '100%', minHeight: '60px', resize: 'vertical', fontSize: '13px', margin: 0 }}
                            placeholder="Add notes, follow-up instructions, or comments here..."
                            value={payNotes}
                            onChange={(e) => setPayNotes(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleUpdatePayNotes}
                            disabled={uploadingPayPrescription}
                            style={{ alignSelf: 'flex-end', padding: '6px 12px', fontSize: '12px', margin: 0 }}
                          >
                            💾 Save Notes
                          </button>
                        </div>
                      </div>

                      {/* Prescriptions (Upload / Remove) Card */}
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Upload size={16} /> Uploaded Prescriptions & Canvas
                          </h4>
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUploadPayPrescription}
                              disabled={uploadingPayPrescription}
                              style={{ display: 'none' }}
                              id="pay-prescription-upload"
                            />
                            <label
                              htmlFor="pay-prescription-upload"
                              className="btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', fontSize: '12px', margin: 0 }}
                            >
                              <Plus size={14} /> Upload Image
                            </label>
                          </div>
                        </div>
                        {uploadingPayPrescription && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw className="spin" size={12} /> Syncing prescriptions...
                          </div>
                        )}
                        {payPrescriptionUrls.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No physical prescriptions uploaded yet.</p>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {payPrescriptionUrls.map((url, idx) => (
                              <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                                <img
                                  src={url}
                                  alt={`Prescription ${idx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                                  onClick={() => setPreviewImage(url)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemovePayPrescription(idx)}
                                  disabled={uploadingPayPrescription}
                                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', padding: 0 }}
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Doctor's Digital Prescription & Notes */}
                      {(selectedBill?.prescriptionText || payPatientDoc?.prescriptionText || (selectedBill?.medicines && selectedBill?.medicines.length > 0) || (payPatientDoc?.medicines && payPatientDoc?.medicines.length > 0) || selectedBill?.medicalHistory || payPatientDoc?.medicalHistory) && (
                        <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', marginTop: '16px' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clipboard size={16} /> Doctor's Consultation Notes
                          </h4>

                          {(selectedBill?.medicalHistory || payPatientDoc?.medicalHistory) && (
                            <div style={{ marginBottom: '12px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                              <strong style={{ color: 'var(--text-muted)' }}>Medical History:</strong>
                              <p style={{ margin: '4px 0 0 0', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{selectedBill?.medicalHistory || payPatientDoc?.medicalHistory}</p>
                            </div>
                          )}

                          {(selectedBill?.prescriptionText || payPatientDoc?.prescriptionText) && (
                            <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                              <strong style={{ color: 'var(--text-muted)' }}>Diagnosis & Notes:</strong>
                              <p style={{ margin: '4px 0 0 0', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{selectedBill?.prescriptionText || payPatientDoc?.prescriptionText}</p>
                            </div>
                          )}

                          {((selectedBill?.medicines && selectedBill.medicines.length > 0) || (payPatientDoc?.medicines && payPatientDoc.medicines.length > 0)) && (
                            <div style={{ fontSize: '13px' }}>
                              <strong style={{ color: 'var(--text-muted)' }}>Prescribed Medicines:</strong>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                {(selectedBill?.medicines || payPatientDoc?.medicines).map((med, idx) => (
                                  <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{med.name} <span style={{ fontWeight: 'normal', fontSize: '11px', color: 'var(--text-muted)' }}>({med.type})</span></div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>Dosage: {med.timing} | Duration: {med.duration}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Diet Plans (Read-Only) Card */}
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Apple size={16} /> Diet Plans (Read-Only)
                          </h4>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', fontSize: '12px', margin: 0 }}
                            onClick={() => {
                              setShowPayModal(false);
                              setConsultationSubTab('nutrition');
                              openPatientFile({ id: selectedBill.id, source: selectedBill.source, raw: selectedBill.raw || selectedBill, ...selectedBill });
                            }}
                          >
                            <Plus size={14} /> Create Diet Plan
                          </button>
                        </div>
                        {payNutritionPlans.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No diet plans found for this patient.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {payNutritionPlans.map((plan) => (
                              <div key={plan.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Plan Date: {plan.startDate || 'N/A'}</span>
                                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: plan.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: plan.paymentStatus === 'paid' ? '#10b981' : '#f59e0b', fontWeight: '700' }}>
                                    {plan.paymentStatus?.toUpperCase()}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                  <div>Doctor: {plan.doctorName || 'General Doctor'}</div>
                                  <div>Deficiencies: {plan.deficiencies?.join(', ') || 'None'}</div>
                                  <div>Disorders: {Object.keys(plan.disorders || {}).filter(k => plan.disorders[k]).join(', ') || 'None'}</div>
                                  <div style={{ marginTop: '6px', color: 'var(--text-main)', display: 'flex', gap: '10px' }}>
                                    <span>Height: {plan.height} cm</span>
                                    <span>Weight: {plan.weight} kg</span>
                                    <span>BMI: {plan.bmi}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Clinical History Card */}
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={16} /> Clinical & Visit History
                        </h4>
                        {payHistory.length === 0 ? (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No completed past visits found.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {payHistory.map((visit) => (
                              <div key={visit.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', fontSize: '12px', background: 'rgba(255,255,255,0.01)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                                  <span>{visit.appointmentDate || visit.dateString || 'N/A'}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>{visit.doctor || 'Doctor'}</span>
                                </div>
                                <div>Complaint: <span style={{ color: 'var(--text-main)' }}>{visit.complaint || 'N/A'}</span></div>
                                {visit.notes && <div style={{ color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>Notes: {visit.notes}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* RIGHT COLUMN: Billing & Payment Processing */}
                <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Billing Summary</div>

                    {/* Consultation Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={includeConsultation}
                          disabled={showBlockMessage || selectedBill.amountLocked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setIncludeConsultation(true);
                              setIncludeMedicine(false);
                              if (consultationFee === 0 || consultationFee === '') {
                                setConsultationFee('');
                              }
                              setMedicineFee(0);
                            } else {
                              setIncludeConsultation(false);
                            }
                          }}
                        />
                        Consultation
                      </label>
                      {includeConsultation && (
                        <input
                          type="number"
                          className="glass-input"
                          style={{ width: '80px', padding: '4px 8px', fontSize: '12px', margin: 0, textAlign: 'right' }}
                          value={consultationFee}
                          disabled={showBlockMessage || selectedBill.amountLocked}
                          onChange={(e) => setConsultationFee(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      )}
                    </div>

                    {/* Consultation & Medicine Fee Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={includeMedicine}
                          disabled={showBlockMessage || selectedBill.amountLocked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setIncludeMedicine(true);
                              setIncludeConsultation(false);
                              if (medicineFee === 0 || medicineFee === '') {
                                const medAmt = selectedBill ? (Number(selectedBill.medicineFeeRequested) || Number(selectedBill.consultationFee) || 0) : 0;
                                setMedicineFee(medAmt || '');
                              }
                              setConsultationFee(0);
                            } else {
                              setIncludeMedicine(false);
                            }
                          }}
                        />
                        Consultation &amp; Medicine Fee
                      </label>
                      {includeMedicine && (
                        <input
                          type="number"
                          className="glass-input"
                          style={{ width: '80px', padding: '4px 8px', fontSize: '12px', margin: 0, textAlign: 'right' }}
                          value={medicineFee}
                          disabled={showBlockMessage || selectedBill.amountLocked}
                          onChange={(e) => setMedicineFee(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      )}
                    </div>

                    {/* Diet Plan Fee Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#10b981', margin: 0 }}>
                        <input type="checkbox" checked={includeDiet} disabled={showBlockMessage || selectedBill.amountLocked} onChange={(e) => setIncludeDiet(e.target.checked)} />
                        Diet Plan Fee
                      </label>
                      {includeDiet && (
                        <input
                          type="number"
                          className="glass-input"
                          style={{ width: '80px', padding: '4px 8px', fontSize: '12px', margin: 0, textAlign: 'right' }}
                          value={dietFee}
                          disabled={showBlockMessage || selectedBill.amountLocked}
                          onChange={(e) => setDietFee(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      )}
                    </div>

                    {/* Itemized Medicines Row */}
                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>Medicines Details</div>

                      <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duration for all:</span>
                        <select
                          className="glass-input"
                          style={{ width: '100%', padding: '10px 14px' }}
                          value={counterPrescriptionDuration}
                          disabled={showBlockMessage || selectedBill?.amountLocked}
                          onChange={(e) => setCounterPrescriptionDuration(e.target.value)}
                        >
                          <option value="" disabled>Select Duration</option>
                          {["15 Days", "1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months", "1 Year"].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {counterMedicines.map((med, index) => (
                        <div key={index} style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="glass-input"
                              placeholder="Medicine Name"
                              style={{ flex: 1, fontSize: '12px', padding: '6px', margin: 0 }}
                              value={med.name}
                              disabled={showBlockMessage || selectedBill?.amountLocked}
                              onChange={(e) => handleCounterMedicineChange(index, 'name', e.target.value)}
                            />
                            <input
                              type="number"
                              className="glass-input"
                              placeholder="Price (?)"
                              style={{ width: '80px', fontSize: '12px', padding: '6px', margin: 0, textAlign: 'right' }}
                              value={med.price || ''}
                              disabled={showBlockMessage || selectedBill?.amountLocked}
                              onChange={(e) => handleCounterMedicineChange(index, 'price', e.target.value)}
                            />
                            {!(showBlockMessage || selectedBill?.amountLocked) && (
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                onClick={() => handleRemoveCounterMedicineRow(index)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              className="glass-input"
                              style={{ flex: 1, fontSize: '12px', padding: '6px', margin: 0 }}
                              value={med.type}
                              disabled={showBlockMessage || selectedBill?.amountLocked}
                              onChange={(e) => handleCounterMedicineChange(index, 'type', e.target.value)}
                            >
                              {["Tablet", "Drops", "Syrup", "Ointment", "Powder", "Injection"].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <select
                              className="glass-input"
                              style={{ flex: 1.5, fontSize: '12px', padding: '6px', margin: 0 }}
                              value={med.dosage}
                              disabled={showBlockMessage || selectedBill?.amountLocked}
                              onChange={(e) => handleCounterMedicineChange(index, 'dosage', e.target.value)}
                            >
                              {["1-0-0 (Morning)", "0-0-1 (Night)", "1-0-1 (Morning, Night)", "1-1-1 (Morning, Afternoon, Night)", "0-1-0 (Afternoon)", "1-1-0 (Morning, Afternoon)", "0-1-1 (Afternoon, Night)", "When Required (SOS)"].map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}

                      {!(showBlockMessage || selectedBill?.amountLocked) && (
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
                          onClick={handleAddCounterMedicineRow}
                        >
                          + Add Row
                        </button>
                      )}
                    </div>

                    {/* Previous Pending Amount Display */}
                    {(Number(selectedBill?.pendingAmount) > 0) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: '700' }}>Previous Pending Amount</span>
                        <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: '800' }}>+ ₹{selectedBill.pendingAmount}</span>
                      </div>
                    )}

                    {/* Pay Later Amount */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', color: '#8b5cf6', fontWeight: '700', margin: 0 }}>Pay Later Amount (Pending)</label>
                      <input
                        type="number"
                        className="glass-input"
                        style={{ width: '80px', padding: '4px 8px', fontSize: '12px', margin: 0, textAlign: 'right' }}
                        value={payLaterAmount}
                        disabled={showBlockMessage || selectedBill?.amountLocked}
                        onChange={(e) => setPayLaterAmount(e.target.value)}
                      />
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Total Checkout (₹):</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-color)' }}>₹{customFeeAmount}</span>
                    </div>

                    {!selectedBill.amountLocked ? (
                      <button
                        type="button"
                        onClick={handleLockGeneralAmount}
                        className="btn-secondary"
                        style={{ width: '100%', marginTop: '8px', padding: '8px', fontSize: '12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid #d97706', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}
                      >
                        🔒 Lock Billing Amount
                      </button>
                    ) : (
                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🔒 Billing amount is locked.</span>
                        </div>
                        {pendingAmountRequest ? (
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '12px', color: '#fbbf24', fontSize: '12px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>⏳ HR Amount Change Request Pending</div>
                            <div>Proposed Amount: <strong>₹{pendingAmountRequest.proposedAmount}</strong></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Reason: {pendingAmountRequest.reason}</div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Request HR Change:</div>
                            <input
                              type="number"
                              className="glass-input"
                              placeholder="Proposed Amount (₹)"
                              value={proposedNewAmount}
                              onChange={e => setProposedNewAmount(e.target.value)}
                              style={{ margin: 0, fontSize: '12px', padding: '6px 10px' }}
                            />
                            <textarea
                              className="glass-input"
                              placeholder="Reason for change"
                              value={amountRequestReason}
                              onChange={e => setAmountRequestReason(e.target.value)}
                              style={{ margin: 0, fontSize: '12px', padding: '6px 10px', minHeight: '40px' }}
                            />
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={handleSubmitAmountChangeRequest}
                              disabled={isSubmittingAmountRequest}
                              style={{ margin: 0, padding: '6px 12px', fontSize: '12px' }}
                            >
                              {isSubmittingAmountRequest ? 'Sending...' : '📩 Request Change to HR'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleCollectPayment}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Payment Breakdown
                      </div>
                      {paymentLegs.map((leg, index) => (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end', marginBottom: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '11px' }}>Method</label>
                            <select
                              className="glass-input"
                              value={leg.method}
                              disabled={showBlockMessage}
                              onChange={e => {
                                stopQrPolling();
                                handleLegChange(index, 'method', e.target.value);
                              }}
                            >
                              <option value="cash" disabled={paymentLegs.some((l, i) => i !== index && l.method === 'cash')}>Cash</option>
                              <option value="card" disabled={paymentLegs.some((l, i) => i !== index && l.method === 'card')}>Card</option>
                              <option value="upi" disabled={paymentLegs.some((l, i) => i !== index && l.method === 'upi')}>Counter UPI</option>
                              {selectedBill.source === 'appointments' && (
                                <option value="app" disabled={paymentLegs.some((l, i) => i !== index && l.method === 'app')}>Send to Patient App</option>
                              )}
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '11px' }}>Amount (₹)</label>
                            <input
                              type="number"
                              required
                              className="glass-input"
                              value={leg.amount}
                              disabled={showBlockMessage}
                              onChange={e => handleLegChange(index, 'amount', e.target.value)}
                            />
                          </div>
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLeg(index)}
                              disabled={showBlockMessage}
                              style={{ padding: '10px', background: 'transparent', border: 'none', color: '#ef4444', cursor: showBlockMessage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remove split"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}

                      {!showBlockMessage && paymentLegs.length < 4 && (
                        <button
                          type="button"
                          onClick={handleAddPaymentLeg}
                          style={{
                            background: 'rgba(41, 143, 202, 0.1)',
                            border: '1px dashed var(--primary-color)',
                            color: 'var(--primary-color)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            width: '100%',
                            justifyContent: 'center',
                            marginTop: '8px'
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                          Add Split Row
                        </button>
                      )}

                      {paymentLegs.reduce((sum, leg) => sum + Number(leg.amount || 0), 0) !== Number(customFeeAmount) && !showBlockMessage && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '8px', textAlign: 'right', fontWeight: '600' }}>
                          Remaining: ₹{(Number(customFeeAmount) - paymentLegs.reduce((sum, leg) => sum + Number(leg.amount || 0), 0)).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {showBlockMessage ? (
                      <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#f87171', fontWeight: '700', textAlign: 'center' }}>
                          ⚠️ Checkout Restricted: Payment already completed for this visit.
                        </div>
                        {unlockRequest?.status === 'pending' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '12px', fontWeight: '600' }}>
                            <RefreshCw className="spin" size={14} /> Request pending HR approval...
                          </div>
                        ) : (
                          <>
                            {unlockRequest?.status === 'rejected' && (
                              <div style={{ fontSize: '11px', color: '#f87171', fontStyle: 'italic', textAlign: 'center' }}>
                                Previous unlock request was rejected by HR.
                              </div>
                            )}
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={requestingUnlock}
                              onClick={handleRequestUnlock}
                              style={{ width: '100%', padding: '10px 16px', fontSize: '13px', background: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
                            >
                              {requestingUnlock ? 'Sending Request...' : '🔑 Request HR Unlock Approval'}
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        {isPaid && isUnlocked && (
                          <div style={{ marginTop: '12px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#34d399', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✓ HR Approved: Additional checkout unlocked.
                          </div>
                        )}

                        {paymentLegs.length === 1 && paymentLegs[0].method === 'razorpay_qr' && (
                          <div style={{ marginTop: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                            {!razorpayQrCode ? (
                              <button
                                type="button"
                                onClick={generateRazorpayQR}
                                className="btn-primary"
                                disabled={loadingQr || !!pendingAmountRequest}
                                style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                              >
                                {loadingQr ? 'Generating QR Code...' : '⚡ Generate UPI QR Code'}
                              </button>
                            ) : (
                              <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Scan the QR code below to pay</p>
                                <img
                                  src={razorpayQrCode.image_url}
                                  alt="UPI QR Code"
                                  style={{ width: '180px', height: '180px', margin: '8px auto', display: 'block', borderRadius: '8px', border: '5px solid #fff' }}
                                />
                                <p style={{ fontSize: '11px', color: '#60a5fa', margin: '8px 0' }}>
                                  ⏳ Waiting for payment confirmation...
                                </p>
                                <button
                                  type="button"
                                  onClick={stopQrPolling}
                                  className="btn-secondary"
                                  style={{ width: '100%', marginTop: '8px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                >
                                  Cancel QR Payment
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {!(paymentLegs.length === 1 && paymentLegs[0].method === 'razorpay_qr') && (
                          <button type="submit" className="btn-primary" disabled={processingRzp || !!pendingAmountRequest} style={{ width: '100%', marginTop: '20px' }}>
                            {paymentLegs.some(l => l.method === 'razorpay_checkout')
                              ? (processingRzp ? 'Opening Checkout...' : '⚡ Launch Razorpay Checkout')
                              : paymentLegs.some(l => l.method === 'app')
                                ? (paymentLegs.length > 1 ? '💰 Confirm Counter Collection + Send Balance to App' : '📱 Send Payment Request to Patient App')
                                : '✅ Mark Bill as Paid'}
                          </button>
                        )}
                      </>
                    )}
                  </form>

                  {/* Print Invoice shortcut for already-paid bills */}
                  {selectedBill?.paymentStatus === 'paid' && (
                    <>
                      <button
                        type="button"
                        onClick={() => generatePaymentInvoice({
                          patientName: selectedBill.fullName || selectedBill.patientName || 'Patient',
                          phone: selectedBill.phone || 'N/A',
                          doctor: selectedBill.doctor || selectedBill.doctorName || 'General Doctor',
                          branch: selectedBill.branchName || userData?.branchName || 'Clinic',
                          date: selectedBill.appointmentDate || selectedBill.dateString || '',
                          timeSlot: selectedBill.appointmentTime || selectedBill.timeSlot || 'N/A',
                          amountPaid: selectedBill.amountPaid || selectedBill.paymentAmount || customFeeAmount,
                          method: selectedBill.paymentMethod || 'cash',
                          paymentId: selectedBill.paymentId || '',
                          isSplit: selectedBill.paymentMethod === 'split',
                          splitDetails: selectedBill.paymentSplitDetails || null, itemsPaid: item.raw?.itemsPaid || item.itemsPaid || selectedBill?.itemsPaid || tx?.itemsPaid || itemsPaid || null
                        })}
                        style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', color: '#10b981', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                      >
                        🖨️ Print Invoice / Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareReceiptWhatsApp(selectedBill)}
                        style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '8px', color: '#25d366', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                      >
                        💬 Share Receipt on WhatsApp
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nutrition Pay Modal */}
        {showNutritionPayModal && selectedNutritionPayPlan && (
          <div className="modal-backdrop" style={{
            display: 'flex',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1000,
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}>
            <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Collect Nutrition Fee</h3>
                <button onClick={() => { setShowNutritionPayModal(false); setSelectedNutritionPayPlan(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Patient Name</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0 10px 0' }}>{selectedNutritionPayPlan.patientName}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Amount Due (₹)</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    className="glass-input"
                    style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary-color)', width: '100%', backgroundColor: selectedNutritionPayPlan.amountLocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)', margin: 0 }}
                    value={customFeeAmount}
                    disabled={selectedNutritionPayPlan.amountLocked}
                    onChange={(e) => setCustomFeeAmount(e.target.value)}
                  />
                  {!selectedNutritionPayPlan.amountLocked && (
                    <button
                      type="button"
                      onClick={handleLockNutritionAmount}
                      className="btn-secondary"
                      style={{ margin: 0, padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '12px' }}
                    >
                      🔒 Lock
                    </button>
                  )}
                </div>

                {/* Nutrition HR Request Controls */}
                {selectedNutritionPayPlan.amountLocked && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', marginBottom: '8px' }}>
                      🔒 Billing amount is locked.
                    </div>
                    {pendingAmountRequest ? (
                      <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '10px', color: '#fbbf24', fontSize: '11px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>⏳ HR Change Request Pending</div>
                        <div>Proposed Amount: <strong>₹{pendingAmountRequest.proposedAmount}</strong></div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Reason: {pendingAmountRequest.reason}</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Request HR Change:</div>
                        <input
                          type="number"
                          className="glass-input"
                          placeholder="Proposed Amount (₹)"
                          value={proposedNewAmount}
                          onChange={e => setProposedNewAmount(e.target.value)}
                          style={{ margin: 0, fontSize: '11px', padding: '6px 8px' }}
                        />
                        <textarea
                          className="glass-input"
                          placeholder="Reason for change"
                          value={amountRequestReason}
                          onChange={e => setAmountRequestReason(e.target.value)}
                          style={{ margin: 0, fontSize: '11px', padding: '6px 8px', minHeight: '35px' }}
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={handleSubmitAmountChangeRequest}
                          disabled={isSubmittingAmountRequest}
                          style={{ margin: 0, padding: '5px 10px', fontSize: '11px', width: '100%' }}
                        >
                          {isSubmittingAmountRequest ? 'Sending...' : '📩 Request Change to HR'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleCollectNutritionPayment}>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="glass-input"
                    value={paymentDetails.method}
                    onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value })}
                  >
                    <option value="upi">Manual UPI / QR Scanner</option>
                    <option value="cash">Cash</option>
                    <option value="split">Split Payment (Cash + UPI)</option>
                  </select>
                </div>

                {paymentDetails.method === 'split' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Cash collected (₹)</label>
                      <input
                        type="number"
                        required
                        className="glass-input"
                        value={paymentDetails.cashAmount}
                        onChange={e => {
                          const cash = e.target.value;
                          const upi = Math.max(0, Number(customFeeAmount) - Number(cash));
                          setPaymentDetails({ ...paymentDetails, cashAmount: cash, upiAmount: upi > 0 ? String(upi) : '' });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">UPI collected (₹)</label>
                      <input
                        type="number"
                        required
                        className="glass-input"
                        value={paymentDetails.upiAmount}
                        onChange={e => {
                          const upi = e.target.value;
                          const cash = Math.max(0, Number(customFeeAmount) - Number(upi));
                          setPaymentDetails({ ...paymentDetails, upiAmount: upi, cashAmount: cash > 0 ? String(cash) : '' });
                        }}
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={!!pendingAmountRequest} style={{ width: '100%', marginTop: '20px' }}>
                  ✅ Mark Nutrition Bill as Paid
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Nutrition Edit Modal */}
        {showNutritionEditModal && selectedNutritionPlan && (() => {
          const isDietPlanEditable = selectedNutritionPlan.paymentStatus !== 'paid' && (userData?.role !== 'receptionist' || (selectedPatientFile && selectedPatientFile.status === 'in-consultation'));
          return (
            <div className="modal-backdrop" style={{
              display: 'flex',
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 1000,
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            }}>
              <div className="glass-panel fade-in" style={{ width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>{!isDietPlanEditable ? 'View' : 'Edit'} Nutrition Plan ({selectedNutritionPlan.patientName})</h3>
                  <button onClick={() => { setShowNutritionEditModal(false); setSelectedNutritionPlan(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleSaveNutritionEdit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Age</label>
                      <input type="number" required className="glass-input" value={editNutritionAge} onChange={(e) => setEditNutritionAge(e.target.value)} disabled={!isDietPlanEditable} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Height (cm)</label>
                      <input type="number" required className="glass-input" value={editNutritionHeight} onChange={(e) => setEditNutritionHeight(e.target.value)} disabled={!isDietPlanEditable} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Weight (kg)</label>
                      <input type="number" required className="glass-input" value={editNutritionWeight} onChange={(e) => setEditNutritionWeight(e.target.value)} disabled={!isDietPlanEditable} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">BMI</label>
                      <input type="text" readOnly className="glass-input" value={editNutritionBmi} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '16px' }}>
                    {/* Deficiencies Checklist */}
                    <div className="glass-panel" style={{ padding: '16px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '10px' }}>Deficiencies checklist</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D", "Vitamin E", "Vitamin K", "Calcium", "Potassium", "Magnesium", "Zinc", "Iron", "Sodium", "Protein", "Manganese", "Phosphorus"].map(def => {
                          const isChecked = editNutritionDeficiencies.includes(def);
                          return (
                            <label key={def} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!isDietPlanEditable}
                                onChange={() => {
                                  if (isChecked) {
                                    setEditNutritionDeficiencies(prev => prev.filter(x => x !== def));
                                  } else {
                                    setEditNutritionDeficiencies(prev => [...prev, def]);
                                  }
                                }}
                              />
                              {def}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Disorders Switch */}
                    <div className="glass-panel" style={{ padding: '16px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '10px' }}>Health Disorders</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {["Sugar (Diabetes)", "High BP (Hypertension)", "Thyroid", "Gastritis", "IBS / IBD", "SIBO", "Bloating", "Acidity", "Piles", "PCOD", "Insulin Resistance", "Hairfall", "Melasma", "Weight Gain", "Weight Loss", "Height Growth", "Adenoids / Tonsillitis", "Allergies"].map(dis => {
                          const isChecked = editNutritionDisorders.includes(dis);
                          return (
                            <button
                              key={dis}
                              type="button"
                              disabled={!isDietPlanEditable}
                              onClick={() => {
                                if (isChecked) {
                                  setEditNutritionDisorders(prev => prev.filter(d => d !== dis));
                                } else {
                                  setEditNutritionDisorders(prev => [...prev, dis]);
                                }
                              }}
                              style={{
                                padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                                border: isChecked ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                                backgroundColor: isChecked ? 'rgba(168, 206, 58, 0.1)' : 'transparent',
                                color: isChecked ? 'var(--primary-color)' : 'var(--text-main)',
                                cursor: isDietPlanEditable ? 'pointer' : 'not-allowed',
                                opacity: isDietPlanEditable ? 1 : 0.6
                              }}
                            >
                              {dis}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Other Diseases/Disorders</label>
                      <input type="text" className="glass-input" value={editNutritionOtherDiseases} onChange={(e) => setEditNutritionOtherDiseases(e.target.value)} disabled={!isDietPlanEditable} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Symptoms/Signs</label>
                      <input type="text" className="glass-input" value={editNutritionSymptoms} onChange={(e) => setEditNutritionSymptoms(e.target.value)} disabled={!isDietPlanEditable} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Foods to Eat</label>
                      <textarea rows="3" className="glass-input" value={editNutritionEat} onChange={(e) => setEditNutritionEat(e.target.value)} style={{ resize: 'vertical' }} disabled={!isDietPlanEditable} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Foods to Avoid</label>
                      <textarea rows="3" className="glass-input" value={editNutritionAvoid} onChange={(e) => setEditNutritionAvoid(e.target.value)} style={{ resize: 'vertical' }} disabled={!isDietPlanEditable} />
                    </div>
                  </div>

                  <div className="form-group" style={{ maxWidth: '200px', marginBottom: '20px' }}>
                    <label className="form-label">Fee Amount (₹)</label>
                    <input type="number" required className="glass-input" value={editNutritionAmount} onChange={(e) => setEditNutritionAmount(e.target.value)} disabled={true} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  </div>

                  {/* 30-Day Grid Section */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="var(--primary-color)" />
                        <h4 style={{ margin: 0, fontWeight: 700 }}>30-Day Diet Plan Menu</h4>
                      </span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingMealsModalOpen(true)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          <Maximize2 size={14} /> Expand / Edit Popup
                        </button>
                        {isDietPlanEditable && (
                          <button
                            type="button"
                            onClick={handleRegenerateNutritionMeals}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                          >
                            ⚡ Prefill/Regenerate Diet Grid
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-main)', zIndex: 10 }}>
                          <tr>
                            <th style={{ padding: '8px', fontSize: '12px', width: '50px' }}>Day</th>
                            <th style={{ padding: '8px', fontSize: '12px' }}>Breakfast</th>
                            <th style={{ padding: '8px', fontSize: '12px' }}>Lunch</th>
                            <th style={{ padding: '8px', fontSize: '12px' }}>Snacks</th>
                            <th style={{ padding: '8px', fontSize: '12px' }}>Dinner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editNutritionMeals.map((meal) => (
                            <tr key={meal.dayNumber}>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', padding: '4px' }}>{meal.dayNumber}</td>
                              <td style={{ padding: '4px' }}>
                                <textarea
                                  className="glass-input"
                                  style={{ padding: '4px 8px', fontSize: '11px', width: '100%', outline: 'none', resize: 'none', height: '48px', border: 'none', background: 'transparent', color: 'var(--text-main)', lineHeight: '1.25', display: 'block', margin: 0 }}
                                  value={meal.breakfast}
                                  disabled={!isDietPlanEditable}
                                  onChange={(e) => {
                                    const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, breakfast: e.target.value } : m);
                                    setEditNutritionMeals(updated);
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px' }}>
                                <textarea
                                  className="glass-input"
                                  style={{ padding: '4px 8px', fontSize: '11px', width: '100%', outline: 'none', resize: 'none', height: '48px', border: 'none', background: 'transparent', color: 'var(--text-main)', lineHeight: '1.25', display: 'block', margin: 0 }}
                                  value={meal.lunch}
                                  disabled={!isDietPlanEditable}
                                  onChange={(e) => {
                                    const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, lunch: e.target.value } : m);
                                    setEditNutritionMeals(updated);
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px' }}>
                                <textarea
                                  className="glass-input"
                                  style={{ padding: '4px 8px', fontSize: '11px', width: '100%', outline: 'none', resize: 'none', height: '48px', border: 'none', background: 'transparent', color: 'var(--text-main)', lineHeight: '1.25', display: 'block', margin: 0 }}
                                  value={meal.snacks}
                                  disabled={!isDietPlanEditable}
                                  onChange={(e) => {
                                    const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, snacks: e.target.value } : m);
                                    setEditNutritionMeals(updated);
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px' }}>
                                <textarea
                                  className="glass-input"
                                  style={{ padding: '4px 8px', fontSize: '11px', width: '100%', outline: 'none', resize: 'none', height: '48px', border: 'none', background: 'transparent', color: 'var(--text-main)', lineHeight: '1.25', display: 'block', margin: 0 }}
                                  value={meal.dinner}
                                  disabled={!isDietPlanEditable}
                                  onChange={(e) => {
                                    const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, dinner: e.target.value } : m);
                                    setEditNutritionMeals(updated);
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setShowNutritionEditModal(false); setSelectedNutritionPlan(null); }}
                      className="btn-secondary"
                      style={{ padding: '10px 20px' }}
                    >
                      {!isDietPlanEditable ? 'Close' : 'Cancel'}
                    </button>
                    {isDietPlanEditable && (
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={savingNutritionEdit}
                        style={{ padding: '10px 24px' }}
                      >
                        {savingNutritionEdit ? 'Saving Plan...' : 'Save Diet Plan Changes'}
                      </button>
                    )}
                  </div>
                </form>

                {/* Pop-up modal for editing / viewing meals list */}
                {isEditingMealsModalOpen && (
                  <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setIsEditingMealsModalOpen(false)}>
                    <div className="glass-panel slide-in" style={{ width: '95%', maxWidth: '1200px', maxHeight: '85vh', overflowY: 'auto', padding: '30px 30px 30px 15px', position: 'relative', background: '#fff' }} onClick={e => e.stopPropagation()}>
                      <button type="button" onClick={() => setIsEditingMealsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} />
                      </button>
                      <h2 style={{ marginBottom: '10px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Apple size={24} color="var(--primary-color)" />
                        30-Day Diet Plan for {selectedNutritionPlan?.patientName || 'Patient'}
                      </h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                        {!isDietPlanEditable ? 'View-only mode. Payment has been processed.' : 'You can view and edit any meal cell in the grid below.'}
                      </p>

                      <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '55vh', overflowY: 'auto' }}>
                        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                          <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                            <tr style={{ background: 'var(--bg-main)' }}>
                              <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', width: '70px', textAlign: 'center' }}>Day</th>
                              <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Breakfast</th>
                              <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Lunch</th>
                              <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Snacks</th>
                              <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Dinner</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editNutritionMeals.map((meal) => (
                              <tr key={meal.dayNumber}>
                                <td style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '12px', textAlign: 'center', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>Day {meal.dayNumber}</td>
                                <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{
                                      width: '100%',
                                      minHeight: '70px',
                                      padding: '8px',
                                      fontSize: '12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: 'rgba(255,255,255,0.05)',
                                      color: 'var(--text-main)',
                                      resize: 'vertical',
                                      lineHeight: '1.4'
                                    }}
                                    value={meal.breakfast || ''}
                                    disabled={!isDietPlanEditable}
                                    onChange={(e) => {
                                      const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, breakfast: e.target.value } : m);
                                      setEditNutritionMeals(updated);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{
                                      width: '100%',
                                      minHeight: '70px',
                                      padding: '8px',
                                      fontSize: '12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: 'rgba(255,255,255,0.05)',
                                      color: 'var(--text-main)',
                                      resize: 'vertical',
                                      lineHeight: '1.4'
                                    }}
                                    value={meal.lunch || ''}
                                    disabled={!isDietPlanEditable}
                                    onChange={(e) => {
                                      const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, lunch: e.target.value } : m);
                                      setEditNutritionMeals(updated);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{
                                      width: '100%',
                                      minHeight: '70px',
                                      padding: '8px',
                                      fontSize: '12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: 'rgba(255,255,255,0.05)',
                                      color: 'var(--text-main)',
                                      resize: 'vertical',
                                      lineHeight: '1.4'
                                    }}
                                    value={meal.snacks || ''}
                                    disabled={!isDietPlanEditable}
                                    onChange={(e) => {
                                      const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, snacks: e.target.value } : m);
                                      setEditNutritionMeals(updated);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{
                                      width: '100%',
                                      minHeight: '70px',
                                      padding: '8px',
                                      fontSize: '12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: 'rgba(255,255,255,0.05)',
                                      color: 'var(--text-main)',
                                      resize: 'vertical',
                                      lineHeight: '1.4'
                                    }}
                                    value={meal.dinner || ''}
                                    disabled={!isDietPlanEditable}
                                    onChange={(e) => {
                                      const updated = editNutritionMeals.map(m => m.dayNumber === meal.dayNumber ? { ...m, dinner: e.target.value } : m);
                                      setEditNutritionMeals(updated);
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '10px 24px' }}
                          onClick={() => setIsEditingMealsModalOpen(false)}
                        >
                          {!isDietPlanEditable ? 'Close' : 'Done / Save Grid'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {/* DAILY REPORT VIEW */}
        {activeTab === 'daily-report' && (
          <DailyReportTab userData={userData} />
        )}

        {/* CLINIC CLEANING VIEW */}
        {activeTab === 'clinic-cleaning' && (
          <ClinicCleaningTab userData={userData} />
        )}
      </main>

      {/* Full-Screen Patient File Workspace (Not a modal) - mirrors DoctorDashboard */}
      {showPatientFileModal && selectedPatientFile && (
        <main className="main-content fade-in" style={{ padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
          {/* Top Navbar for Patient File Workspace */}
          <div style={{ padding: '14px 24px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => { setShowPatientFileModal(false); setSelectedPatientFile(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              >
                <ChevronLeft size={16} /> Back to Dashboard
              </button>
              <h2 style={{ margin: 0, fontSize: '17px', color: '#1e293b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Patient File: {selectedPatientFile.fullName}
                {(selectedPatientFile.isOnline || selectedPatientFile.source === 'appointments' || selectedPatientFile._type === 'online' || selectedPatientFile.source === 'UserApp' || selectedPatientFile.source === 'Patient App' || selectedPatientFile.raw?.source === 'appointments' || selectedPatientFile.raw?.source === 'UserApp' || selectedPatientFile.raw?.source === 'Patient App') && (
                  <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '800' }}>APP</span>
                )}
                {(selectedPatientFile.packageId || (selectedPatientFile.phone && activePackageMap.has(String(selectedPatientFile.phone).replace(/\D/g, '').slice(-10)))) && (
                  <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '800' }}>PKG</span>
                )}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{userData?.name || 'Reception'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>{userData?.role || 'Receptionist'}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(37,142,200,0.12)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', border: '2px solid var(--primary-color)' }}>
                {(userData?.name || 'R').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px', fontFamily: '"Inter", "Roboto", sans-serif' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>

              {/* Left Column: Patient Profile & History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{selectedPatientFile.fullName}</span>
                      <span style={{ fontSize: '10px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '800' }}>APP</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={16} color="#64748b" /> {selectedPatientFile.phone || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="#64748b" /> {selectedPatientFile.branchName || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
                        <Clipboard size={16} color="#258ec8" style={{ marginTop: '2px' }} />
                        <span style={{ color: '#0f172a', fontWeight: '600' }}>Subject: {selectedPatientFile.complaint || selectedPatientFile.subject || 'Fever'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>No active package.</div>
                      <button style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#258ec8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={14} /> Add Package Member
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: '#f0f9ff', borderRadius: '12px', padding: '24px', border: '1px solid #bae6fd', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <Clock size={18} color="#258ec8" />
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#258ec8', fontWeight: '700' }}>Medical History</h3>
                  </div>
                  {!medicalHistory ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', opacity: 0.5 }}>
                      <div style={{ width: '40px', height: '40px', border: '2px solid #cbd5e1', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '20px', height: '2px', backgroundColor: '#cbd5e1', transform: 'rotate(-45deg)' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>No previous visits recorded for this patient.</span>
                    </div>
                  ) : (
                    <textarea
                      value={medicalHistory}
                      onChange={(e) => setMedicalHistory(e.target.value)}
                      placeholder="Enter medical history..."
                      style={{ width: '100%', minHeight: '100px', backgroundColor: 'transparent', border: 'none', color: '#1e293b', fontSize: '14px', resize: 'none', outline: 'none' }}
                    />
                  )}
                </div>

                {/* Uploaded Prescriptions & Canvas */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Upload size={18} color="#258ec8" />
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Uploaded Prescriptions & Canvas</h3>
                  </div>
                  {(() => {
                    const pdUrls = selectedPatientFile?.raw?.prescriptionUrls || (selectedPatientFile?.raw?.prescriptionUrl ? [selectedPatientFile.raw.prescriptionUrl] : []);
                    if (selectedPatientFile?.raw?.diagnosisDrawingUrl && !pdUrls.includes(selectedPatientFile.raw.diagnosisDrawingUrl)) pdUrls.push(selectedPatientFile.raw.diagnosisDrawingUrl);
                    return pdUrls.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>No physical prescriptions or drawings yet.</p>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {pdUrls.map((url, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <img
                              src={url}
                              alt={`Prescription ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                              onClick={() => setPreviewImage(url)}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePrescription(idx)}
                              disabled={updatingFile}
                              style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', padding: 0 }}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPrescription}
                      disabled={updatingFile}
                      style={{ display: 'none' }}
                      id="pf-prescription-upload"
                    />
                    <label
                      htmlFor="pf-prescription-upload"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 12px', fontSize: '13px', fontWeight: '600', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '8px', border: '1px solid #cbd5e1', margin: 0 }}
                    >
                      <Plus size={14} /> Upload Image
                    </label>
                  </div>
                </div>
              </div>
              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setConsultationSubTab('clinical')}
                    style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: consultationSubTab === 'clinical' ? 'var(--primary-color)' : '#64748b', border: 'none', borderBottom: consultationSubTab === 'clinical' ? '2px solid var(--primary-color)' : '2px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Clipboard size={16} /> Clinical Prescription
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultationSubTab('nutrition')}
                    style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: consultationSubTab === 'nutrition' ? '#10b981' : '#64748b', border: 'none', borderBottom: consultationSubTab === 'nutrition' ? '2px solid #10b981' : '2px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Apple size={16} /> Nutrition & Diet Plan
                  </button>
                </div>
                {consultationSubTab === 'clinical' ? (
                  <form onSubmit={handleSaveConsultation} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>Digital Prescription</h3>
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '12px' }}>Diagnosis Notes</label>
                        <textarea
                          required
                          placeholder="Enter detailed clinical notes and diagnosis..."
                          value={prescriptionText}
                          onChange={(e) => setPrescriptionText(e.target.value)}
                          style={{ width: '100%', height: '140px', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', padding: '16px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', resize: 'none', outline: 'none' }}
                        />
                      </div>
                      <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Medicines</label>
                          <button type="button" onClick={() => setMedicines([...medicines, { name: '', type: 'Tablet', timing: '1-0-1 (Morning, Night)', duration: '' }])} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={14} color="#258ec8" /> Add Row
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {medicines.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: '12px', marginBottom: '8px', paddingLeft: '4px' }}>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Medicine Name</div>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Type</div>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Dosage</div>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Duration</div>
                              <div></div>
                            </div>
                          )}
                          {medicines.map((med, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: '12px', alignItems: 'center' }}>
                              <div>
                                <input type="text" placeholder="Name..." value={med.name} onChange={(e) => { const newMeds = [...medicines]; newMeds[index].name = e.target.value; setMedicines(newMeds); }} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                              </div>
                              <div>
                                <select value={med.type} onChange={(e) => { const newMeds = [...medicines]; newMeds[index].type = e.target.value; setMedicines(newMeds); }} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
                                  <option value="Tablet">Tablet</option><option value="Drops">Drops</option><option value="Syrup">Syrup</option><option value="Ointment">Ointment</option>
                                </select>
                              </div>
                              <div>
                                <select value={med.timing} onChange={(e) => { const newMeds = [...medicines]; newMeds[index].timing = e.target.value; setMedicines(newMeds); }} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
                                  <option value="1-0-0 (Morning)">1-0-0 (Morning)</option>
                                  <option value="0-0-1 (Night)">0-0-1 (Night)</option>
                                  <option value="1-0-1 (Morning, Night)">1-0-1 (Morning, Night)</option>
                                  <option value="1-1-1 (Morning, Afternoon, Night)">1-1-1 (Morning, Afternoon, Night)</option>
                                  <option value="0-1-0 (Afternoon)">0-1-0 (Afternoon)</option>
                                  <option value="1-1-0 (Morning, Afternoon)">1-1-0 (Morning, Afternoon)</option>
                                  <option value="0-1-1 (Afternoon, Night)">0-1-1 (Afternoon, Night)</option>
                                  <option value="When Required (SOS)">When Required (SOS)</option>
                                </select>
                              </div>
                              <div>
                                <select value={med.duration || ''} onChange={(e) => { const newMeds = [...medicines]; newMeds[index].duration = e.target.value; setMedicines(newMeds); }} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }}>
                                  <option value="" disabled>Select</option>
                                  <option value="3 Days">3 Days</option>
                                  <option value="5 Days">5 Days</option>
                                  <option value="15 Days">15 Days</option>
                                  <option value="1 Month">1 Month</option>
                                  <option value="2 Months">2 Months</option>
                                  <option value="3 Months">3 Months</option>
                                  <option value="4 Months">4 Months</option>
                                  <option value="5 Months">5 Months</option>
                                  <option value="6 Months">6 Months</option>
                                  <option value="1 Year">1 Year</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                <button type="button" onClick={() => setMedicines(medicines.filter((_, i) => i !== index))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                                  <X size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Physical Prescription (Optional)</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input type="file" multiple accept="image/*,.pdf" onChange={(e) => setPrescriptionFiles(Array.from(e.target.files))} style={{ fontSize: '13px', color: '#475569', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', cursor: 'pointer' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Upload one or multiple photos of the handwritten prescription.</div>
                      </div>

                      <div>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Follow-up Recommendation</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>Follow-up Interval</label>
                            <select value={followUpInterval} onChange={(e) => handleFollowUpIntervalChange(e.target.value)} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', outline: 'none' }}>
                              <option value="No Follow-up">No Follow-up</option>
                              <option value="1 month">1 Month</option>
                              <option value="2 months">2 Months</option>
                              <option value="3 months">3 Months</option>
                              <option value="4 months">4 Months</option>
                              <option value="5 months">5 Months</option>
                              <option value="6 months">6 Months</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>Preferred Follow-up Date</label>
                            <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Consultation & Medicine Fee</h3>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>Pharmacy/Medicine Fee (?)</label>
                          <input type="number" value={doctorMedicineFee} onChange={(e) => setDoctorMedicineFee(e.target.value)} placeholder="Enter amount..." style={{ width: '100%', maxWidth: '300px', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                        </div>
                      </div>

                      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" style={{ padding: '14px 32px', fontSize: '15px', fontWeight: '700', borderRadius: '8px', backgroundColor: '#258ec8', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={submittingConsultation}>
                          {submittingConsultation ? 'Saving...' : 'Save Consultation'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="tab-buttons-container" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        className={`btn-primary ${activeTabNutritionPlan === 'add' ? '' : 'btn-secondary'}`}
                        onClick={() => setActiveTabNutritionPlan('add')}
                        style={{ background: activeTabNutritionPlan === 'add' ? 'var(--primary-color)' : 'transparent', color: activeTabNutritionPlan === 'add' ? '#fff' : 'var(--text-main)', border: activeTabNutritionPlan === 'add' ? 'none' : '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        Create New Plan
                      </button>
                      <button
                        type="button"
                        className={`btn-primary ${activeTabNutritionPlan === 'list' ? '' : 'btn-secondary'}`}
                        onClick={() => setActiveTabNutritionPlan('list')}
                        style={{ background: activeTabNutritionPlan === 'list' ? 'var(--primary-color)' : 'transparent', color: activeTabNutritionPlan === 'list' ? '#fff' : 'var(--text-main)', border: activeTabNutritionPlan === 'list' ? 'none' : '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                      >
                        View Past Plans
                      </button>
                    </div>
                    {activeTabNutritionPlan === 'list' ? (
                      <div className="table-container glass-panel">
                        <table style={{ width: '100%', tableLayout: 'auto' }}>
                          <thead>
                            <tr>
                              <th>Issued On</th>
                              <th>Doctor</th>
                              <th>Payment</th>
                              <th>Validity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nutritionPlans.filter(p => p.patientId === selectedPatientFile.id || p.patientId === selectedPatientFile.patientId || p.patientPhone === selectedPatientFile.phone).length === 0 ? (
                              <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No previous diet plans found for this patient.</td>
                              </tr>
                            ) : (
                              nutritionPlans.filter(p => p.patientId === selectedPatientFile.id || p.patientId === selectedPatientFile.patientId || p.patientPhone === selectedPatientFile.phone).map(plan => (
                                <tr key={plan.id}>
                                  <td>{plan.createdAt?.seconds ? new Date(plan.createdAt.seconds * 1000).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</td>
                                  <td>{plan.doctorName}</td>
                                  <td>
                                    <span className={`badge ${plan.paymentStatus === 'paid' ? 'badge-primary' : 'badge-secondary'}`} style={{ backgroundColor: plan.paymentStatus === 'paid' ? '#059669' : '#4b5563', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>
                                      {plan.paymentStatus?.toUpperCase()}
                                    </span>
                                  </td>
                                  <td>{plan.startDate} to {plan.expiryDate}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveNutritionPlan} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Vitals Form */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                          <div className="form-group">
                            <label className="form-label">Age</label>
                            <input
                              type="number"
                              className="glass-input"
                              required
                              value={nutritionAge}
                              onChange={(e) => setNutritionAge(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Height (cm)</label>
                            <input
                              type="number"
                              className="glass-input"
                              required
                              placeholder="cm"
                              value={nutritionHeight}
                              onChange={(e) => setNutritionHeight(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Weight (kg)</label>
                            <input
                              type="number"
                              className="glass-input"
                              required
                              placeholder="kg"
                              value={nutritionWeight}
                              onChange={(e) => setNutritionWeight(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">BMI (Auto)</label>
                            <input
                              type="text"
                              className="glass-input"
                              readOnly
                              style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontWeight: 'bold' }}
                              value={nutritionBmi}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Diet Plan Fee (₹)</label>
                            <input
                              type="number"
                              className="glass-input"
                              required
                              value={nutritionAmount}
                              onChange={(e) => setNutritionAmount(e.target.value)}
                            />
                          </div>
                        </div>
                        {/* Deficiencies Checklist */}
                        <div>
                          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Deficiencies (Select all that apply)</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D", "Vitamin E", "Vitamin K", "Calcium", "Potassium", "Magnesium", "Zinc", "Iron", "Sodium", "Protein", "Manganese", "Phosphorus"].map(def => {
                              const isChecked = nutritionDeficiencies.includes(def);
                              return (
                                <button
                                  key={def}
                                  type="button"
                                  onClick={() => {
                                    if (isChecked) {
                                      setNutritionDeficiencies(prev => prev.filter(d => d !== def));
                                    } else {
                                      setNutritionDeficiencies(prev => [...prev, def]);
                                    }
                                  }}
                                  style={{
                                    padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                                    border: isChecked ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    backgroundColor: isChecked ? 'rgba(168, 206, 58, 0.1)' : 'transparent',
                                    color: isChecked ? 'var(--primary-color)' : 'var(--text-main)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {def}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Common Disorders Toggles */}
                        <div>
                          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Common Health Disorders</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {["Sugar (Diabetes)", "High BP (Hypertension)", "Thyroid", "Gastritis", "IBS / IBD", "SIBO", "Bloating", "Acidity", "Piles", "PCOD", "Insulin Resistance", "Hairfall", "Melasma", "Weight Gain", "Weight Loss", "Height Growth", "Adenoids / Tonsillitis", "Allergies"].map(dis => {
                              const isChecked = nutritionDisorders.includes(dis);
                              return (
                                <button
                                  key={dis}
                                  type="button"
                                  onClick={() => {
                                    if (isChecked) {
                                      setNutritionDisorders(prev => prev.filter(d => d !== dis));
                                    } else {
                                      setNutritionDisorders(prev => [...prev, dis]);
                                    }
                                  }}
                                  style={{
                                    padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                                    border: isChecked ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    backgroundColor: isChecked ? 'rgba(168, 206, 58, 0.1)' : 'transparent',
                                    color: isChecked ? 'var(--primary-color)' : 'var(--text-main)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {dis}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Other diseases & Symptoms */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label className="form-label">Other Diseases / Disorders</label>
                            <textarea
                              className="glass-input"
                              rows={2}
                              style={{ fontSize: '13px', padding: '8px' }}
                              value={nutritionOtherDiseases}
                              onChange={(e) => setNutritionOtherDiseases(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Signs & Symptoms</label>
                            <textarea
                              className="glass-input"
                              rows={2}
                              style={{ fontSize: '13px', padding: '8px' }}
                              value={nutritionSymptoms}
                              onChange={(e) => setNutritionSymptoms(e.target.value)}
                            />
                          </div>
                        </div>
                        {/* Foods to Eat & Avoid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ color: '#10b981', fontWeight: 'bold' }}>Foods to Eat</label>
                            <textarea
                              className="glass-input"
                              rows={3}
                              style={{ fontSize: '13px', padding: '8px' }}
                              value={nutritionEat}
                              onChange={(e) => setNutritionEat(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ color: '#ef4444', fontWeight: 'bold' }}>Foods to Avoid</label>
                            <textarea
                              className="glass-input"
                              rows={3}
                              style={{ fontSize: '13px', padding: '8px' }}
                              value={nutritionAvoid}
                              onChange={(e) => setNutritionAvoid(e.target.value)}
                            />
                          </div>
                        </div>
                        {/* 30-Day Diet Plan Table */}
                        <div>
                          <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px', fontSize: '14px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileText size={16} color="var(--primary-color)" />
                              30-Day Diet Plan Table
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsEditingMealsModalOpen(true)}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                            >
                              <Maximize2 size={12} /> Expand / Edit Popup
                            </button>
                          </h4>
                          <div className="table-container glass-panel" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '50px', fontSize: '11px', padding: '6px' }}>Day</th>
                                  <th style={{ fontSize: '11px', padding: '6px' }}>Breakfast</th>
                                  <th style={{ fontSize: '11px', padding: '6px' }}>Lunch</th>
                                  <th style={{ fontSize: '11px', padding: '6px' }}>Snacks</th>
                                  <th style={{ fontSize: '11px', padding: '6px' }}>Dinner</th>
                                </tr>
                              </thead>
                              <tbody>
                                {nutritionMeals.map(meal => (
                                  <tr key={meal.dayNumber}>
                                    <td style={{ textAlign: 'center', fontSize: '11px', padding: '4px' }}><strong>Day {meal.dayNumber}</strong></td>
                                    <td style={{ padding: '4px' }}>
                                      <textarea
                                        className="glass-input"
                                        style={{ border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.25', display: 'block', margin: 0 }}
                                        value={meal.breakfast}
                                        onChange={(e) => handleMealCellChange(meal.dayNumber, 'breakfast', e.target.value)}
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <textarea
                                        className="glass-input"
                                        style={{ border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.25', display: 'block', margin: 0 }}
                                        value={meal.lunch}
                                        onChange={(e) => handleMealCellChange(meal.dayNumber, 'lunch', e.target.value)}
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <textarea
                                        className="glass-input"
                                        style={{ border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.25', display: 'block', margin: 0 }}
                                        value={meal.snacks}
                                        onChange={(e) => handleMealCellChange(meal.dayNumber, 'snacks', e.target.value)}
                                      />
                                    </td>
                                    <td style={{ padding: '4px' }}>
                                      <textarea
                                        className="glass-input"
                                        style={{ border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.25', display: 'block', margin: 0 }}
                                        value={meal.dinner}
                                        onChange={(e) => handleMealCellChange(meal.dayNumber, 'dinner', e.target.value)}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '14px' }} disabled={submittingNutrition}>
                          {submittingNutrition ? 'Saving Diet Plan...' : 'Save Diet Plan'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer with Actions */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '12px' }}>
              <button
                onClick={() => { setShowPatientFileModal(false); setSelectedPatientFile(null); }}
                className="btn-secondary"
                style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
              >
                Close
              </button>
            </div>
          </div>
        </main>

      )}



      {/* Reschedule Modal */}
      {showRescheduleModal && rescheduleItem && (
        <div className="modal-backdrop" style={{
          display: 'flex',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '450px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="var(--primary-color)" /> Reschedule Appointment
              </h3>
              <button onClick={() => { setShowRescheduleModal(false); setRescheduleItem(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
              <div style={{ color: 'var(--text-muted)' }}>Patient Name</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', marginTop: '2px', color: 'var(--text-main)' }}>{rescheduleItem.fullName}</div>
            </div>

            <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Select Doctor</label>
                <select
                  className="glass-input"
                  required
                  value={rescheduleDoctor}
                  onChange={(e) => {
                    const docName = e.target.value;
                    const docObj = doctors.find(d => d.name === docName);
                    const branches = (docObj && docObj.timings) ? docObj.timings.map(t => t.branch) : getDoctorBranches(docName);
                    const userBranch = branches.find(b => {
                      if (!userData?.branchId) return false;
                      const normB = normalizeBranch(b);
                      const normUserId = normalizeBranch(userData.branchId);
                      const normUserName = normalizeBranch(userData.branchName);
                      return normB === normUserId || normB === normUserName;
                    }) || branches[0] || '';
                    setRescheduleDoctor(docName);
                    setRescheduleBranch(userBranch);
                    setRescheduleTime(''); // Reset slot
                  }}
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors
                    .filter(d => {
                      if (!userData?.branchId) return true;
                      const doctorBranches = d.timings ? d.timings.map(t => t.branch) : getDoctorBranches(d.name);
                      const normUserId = normalizeBranch(userData.branchId);
                      const normUserName = normalizeBranch(userData.branchName);
                      return doctorBranches.some(b => {
                        const normB = normalizeBranch(b);
                        return normB === normUserId || normB === normUserName;
                      });
                    })
                    .map(d => (
                      <option key={d.id} value={d.name}>{d.name} ({d.specialty || 'Physician'})</option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Branch</label>
                <select
                  className="glass-input"
                  required
                  value={rescheduleBranch}
                  disabled={!rescheduleDoctor || !!userData?.branchId}
                  onChange={(e) => {
                    setRescheduleBranch(e.target.value);
                    setRescheduleTime('');
                  }}
                >
                  {!rescheduleDoctor ? (
                    <option value="">-- Select Doctor First --</option>
                  ) : (
                    (() => {
                      const docObj = doctors.find(d => d.name === rescheduleDoctor);
                      const branches = (docObj && docObj.timings) ? docObj.timings.map(t => t.branch) : getDoctorBranches(rescheduleDoctor);
                      return branches
                        .filter(b => {
                          if (!userData?.branchId) return true;
                          const normB = normalizeBranch(b);
                          const normUserId = normalizeBranch(userData.branchId);
                          const normUserName = normalizeBranch(userData.branchName);
                          return normB === normUserId || normB === normUserName;
                        })
                        .map(b => (
                          <option key={b} value={b}>{b}</option>
                        ));
                    })()
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Appointment Date</label>
                <input
                  type="date"
                  className="glass-input"
                  required
                  min={getTodayString()}
                  max={getThirtyDaysLaterString()}
                  value={rescheduleDate}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    if (selectedVal && rescheduleDoctor && rescheduleBranch) {
                      const docObj = doctors.find(d => d.name === rescheduleDoctor);
                      if (docObj) {
                        const checkDate = new Date(selectedVal);
                        if (!isDoctorScheduledAtBranchOnDate(docObj, rescheduleBranch, checkDate)) {
                          alert(`Dr. ${rescheduleDoctor} is not scheduled to work at ${rescheduleBranch} on ${checkDate.toLocaleDateString('en-US', { weekday: 'long' })}s.`);
                          return;
                        }
                      }
                    }
                    setRescheduleDate(selectedVal);
                    setRescheduleTime('');
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Available Slots / Time</label>
                <select
                  className="glass-input"
                  required
                  value={rescheduleTime}
                  disabled={!rescheduleDoctor || !rescheduleBranch || !rescheduleDate}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                >
                  <option value="">-- Select Time Slot --</option>
                  {(() => {
                    const doctorObj = doctors.find(d => d.name === rescheduleDoctor);
                    const slots = generateSlotsForSelected(rescheduleDoctor, doctorObj, rescheduleBranch, rescheduleDate);
                    const displaySlots = [...slots];
                    if (rescheduleTime && !displaySlots.includes(rescheduleTime)) {
                      displaySlots.unshift(rescheduleTime);
                    }
                    return displaySlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ));
                  })()}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setShowRescheduleModal(false); setRescheduleItem(null); }}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px 0', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={rescheduling}
                  style={{ flex: 1.5, padding: '10px 0', fontSize: '13px' }}
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Lightbox Modal */}
      {lightboxIndex >= 0 && lightboxImages.length > 0 && (
        <div className="modal-backdrop" style={{
          display: 'flex',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 2000,
          justifyContent: 'center',
          alignItems: 'center',
          userSelect: 'none'
        }}>
          {/* Close Button */}
          <button
            onClick={() => setLightboxIndex(-1)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={24} />
          </button>

          {/* Left Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={() => setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
              style={{
                position: 'absolute',
                left: '30px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                transition: 'all 0.2s ease',
                fontSize: '24px',
                lineHeight: '46px',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              ‹
            </button>
          )}

          {/* Main Image Container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '85vw',
            maxHeight: '80vh',
            gap: '16px'
          }}>
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Prescription Page ${lightboxIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            />
            <div style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              background: 'rgba(0,0,0,0.4)',
              padding: '6px 16px',
              borderRadius: '20px'
            }}>
              Image {lightboxIndex + 1} of {lightboxImages.length}
            </div>
          </div>

          {/* Right Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxImages.length)}
              style={{
                position: 'absolute',
                right: '30px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                transition: 'all 0.2s ease',
                fontSize: '24px',
                lineHeight: '46px',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              ›
            </button>
          )}
        </div>
      )}
      {/* SUCCESS CONFIRMATION MODAL */}
      {showBookingSuccess && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="fade-in" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.5rem', fontWeight: 'bold' }}>Booking Confirmed!</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5' }}>
              <strong>{bookedPatientInfo?.name}</strong> has been successfully registered and added to <strong>{bookedPatientInfo?.doctor}</strong>'s waiting queue at {bookedPatientInfo?.branch}.
            </p>
            <button
              onClick={() => {
                setShowBookingSuccess(false);
                setActiveTab('dashboard'); // Redirect to dashboard
              }}
              style={{ backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', width: '100%', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
      {/* SHARE GLOBAL MEDIA MODAL */}
      {showWebShareModal && selectedPatientFile && (
        <div className="modal-backdrop" style={{
          display: 'flex',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1100,
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderOpen size={20} color="var(--primary-color)" />
                <span>Share Global Media to Patient</span>
              </h3>
              <button onClick={() => setShowWebShareModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Sharing this media with <strong>{selectedPatientFile.fullName}</strong> ({selectedPatientFile.phone}) will allow them to view it in their app.
              </p>
              {(() => {
                const globalFolders = mediaFolders.filter(f => !f.patientPhone);
                if (globalFolders.length === 0) {
                  return <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>No global media folders available. Create them in the Media Manager tab.</div>;
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {globalFolders.map(folder => {
                      const folderItems = mediaItems.filter(item => item.folderId === folder.id);
                      const isFolderShared = patientSharedItems.some(si => si.type === 'folder' && si.folderId === folder.id);
                      return (
                        <div key={folder.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              <Folder size={18} color="var(--primary-color)" />
                              <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{folder.name}</strong>
                            </div>
                            <button
                              type="button"
                              className={isFolderShared ? "btn-secondary" : "btn-primary"}
                              onClick={() => {
                                if (isFolderShared) {
                                  unshareGlobalMediaWeb('folder', folder.id);
                                } else {
                                  handleShareGlobalMediaWeb('folder', folder.id);
                                }
                              }}
                              style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', margin: 0 }}
                            >
                              {isFolderShared ? 'Unshare Folder' : 'Share Folder'}
                            </button>
                          </div>

                          <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fff' }}>
                            {folderItems.length === 0 ? (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No files inside this folder.</div>
                            ) : (
                              folderItems.map(item => {
                                const isItemShared = patientSharedItems.some(si => si.type === 'item' && si.itemId === item.id);
                                return (
                                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {item.type === 'video' ? <Video size={14} color="var(--primary-color)" /> : <ImageIcon size={14} color="var(--secondary-color)" />}
                                      <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                                        {item.title}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className={isItemShared ? "btn-secondary" : "btn-primary"}
                                      onClick={() => {
                                        if (isItemShared) {
                                          unshareGlobalMediaWeb('item', item.id);
                                        } else {
                                          handleShareGlobalMediaWeb('item', item.id);
                                        }
                                      }}
                                      style={{ padding: '2px 8px', fontSize: '10px', cursor: 'pointer', margin: 0 }}
                                    >
                                      {isItemShared ? 'Unshare File' : 'Share File'}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {mediaItems.filter(item => !mediaFolders.find(f => f.id === item.folderId && !f.patientPhone)).length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>UNFOLDERED MEDIA:</span>
                        {mediaItems.filter(item => !mediaFolders.find(f => f.id === item.folderId && !f.patientPhone)).map((item) => {
                          const isShared = patientSharedItems.some(si => si.type === 'item' && si.itemId === item.id);
                          return (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.type === 'video' ? <Video size={14} color="var(--primary-color)" /> : <ImageIcon size={14} color="var(--secondary-color)" />}
                                <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{item.title}</span>
                              </div>
                              <button
                                type="button"
                                className={isShared ? "btn-secondary" : "btn-primary"}
                                onClick={() => {
                                  if (isShared) {
                                    unshareGlobalMediaWeb('item', item.id);
                                  } else {
                                    handleShareGlobalMediaWeb('item', item.id);
                                  }
                                }}
                                style={{ padding: '2px 8px', fontSize: '10px', cursor: 'pointer', margin: 0 }}
                              >
                                {isShared ? 'Unshare File' : 'Share File'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowWebShareModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showStatusModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999999 }} onClick={() => setShowStatusModal(false)}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                {statusModalTitle}
              </h3>
              <button onClick={() => setShowStatusModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
            </div>
            <div>
              {statusModalPatients.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No patients found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {statusModalPatients.map((patient, idx) => (
                    <div key={patient.id || idx} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{patient.fullName || patient.raw?.name || patient.raw?.patientName || 'Unknown Patient'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{patient.phone || patient.raw?.phone || patient.raw?.phoneNumber || 'N/A'}</div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: '600' }}>{patient.timeSlot || patient.raw?.timeSlot || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }} onClick={() => setPreviewImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Prescription Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', backgroundColor: '#fff' }} />
            <button onClick={() => setPreviewImage(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReceptionDashboard;
