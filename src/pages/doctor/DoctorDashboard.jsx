import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth, storage } from '../../firebase';
import { signOut } from 'firebase/auth';
import {
  collection, query, where, getDocs, doc, updateDoc, onSnapshot,
  serverTimestamp, addDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import {
  Clock, Play, Eye, Users, LogOut, ChevronLeft, ChevronRight,
  Calendar, FileText, Briefcase, Plus, Search, X, Check, Bell, Award, User, MapPin, Clipboard, Phone, Apple, Maximize2, Pen, Eraser, Save
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../assets/SPH ADMIN.png';
import PackageMembers from '../reception/PackageMembers';
import SignatureCanvas from 'react-signature-canvas';

const DoctorDashboard = () => {
  const { user, userData } = useAuth();

  const sendPushNotification = async (userId, title, body, type = 'general') => {
    if (!userId) return;
    try {
      const userSnap = await getDoc(doc(db, 'patients', userId));
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
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, queue, patients, packages, leave, attendance, payslips, notifications
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');

  const normalizeDateToYYYYMMDD = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.seconds) {
      const d = new Date(dateStr.seconds * 1000);
      return d.toISOString().split('T')[0];
    }
    if (typeof dateStr !== 'string') {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (e) { }
      return '';
    }
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return dateStr;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) { }
    return dateStr;
  };

  // Queue state
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [activePackageMap, setActivePackageMap] = useState(new Map());
  const [allDoctorPatients, setAllDoctorPatients] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [selectedBranch, setSelectedBranch] = useState('All Branches');

  const normalizeBranchName = (name) => {
    if (!name) return 'Unknown';
    const lower = name.toLowerCase();
    if (lower.includes('kphb')) return 'KPHB';
    if (lower.includes('chnr') || lower.includes('chandanagar') || lower.includes('chandnagar')) return 'Chandanagar';
    if (lower.includes('dsnr') || lower.includes('dilsukh') || lower.includes('dilshuk')) return 'Dilsukhnagar';
    if (lower.includes('nallagandla')) return 'Nallagandla';
    return name.trim();
  };

  const isMatchingDate = (dateStr, targetDate) => {
    if (!dateStr) return false;
    const tDay = targetDate.getDate();
    const tMonth = targetDate.getMonth();
    const tYear = targetDate.getFullYear();

    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return y === tYear && m === tMonth && d === tDay;
        } else if (parts[2].length === 4) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return y === tYear && m === tMonth && d === tDay;
        } else {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return y === tYear && m === tMonth && d === tDay;
        }
      }
    }

    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          return y === tYear && m === tMonth && d === tDay;
        } else {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          return y === tYear && m === tMonth && d === tDay;
        }
      }
    }

    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.getDate() === tDay && parsed.getMonth() === tMonth && parsed.getFullYear() === tYear;
      }
    } catch (e) { }

    return false;
  };

  const todayPatients = useMemo(() => {
    const localDate = new Date();
    const filtered = allDoctorPatients.filter(p => {
      return isMatchingDate(p.appointmentDate, localDate);
    });

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

    filtered.sort((a, b) => {
      const order = { 'in-consultation': 1, 'waiting': 2, 'booked': 3, 'completed': 4, 'done': 4 };
      const statusDiff = (order[a.status] || 9) - (order[b.status] || 9);
      if (statusDiff !== 0) return statusDiff;

      const qA = typeof a.queueOrder === 'number' ? a.queueOrder : Infinity;
      const qB = typeof b.queueOrder === 'number' ? b.queueOrder : Infinity;
      if (qA !== qB) return qA - qB;

      const tA = parseTimeStr(a.appointmentTime || a.timeSlot);
      const tB = parseTimeStr(b.appointmentTime || b.timeSlot);
      if (tA !== tB) return tA - tB;

      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeA - timeB;
    });

    return filtered;
  }, [allDoctorPatients]);

  const selectedDayPatients = useMemo(() => {
    const filtered = allDoctorPatients.filter(p => {
      return isMatchingDate(p.appointmentDate, selectedCalendarDate);
    });

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

    filtered.sort((a, b) => {
      const order = { 'in-consultation': 1, 'waiting': 2, 'booked': 3, 'completed': 4, 'done': 4 };
      const statusDiff = (order[a.status] || 9) - (order[b.status] || 9);
      if (statusDiff !== 0) return statusDiff;

      const qA = typeof a.queueOrder === 'number' ? a.queueOrder : Infinity;
      const qB = typeof b.queueOrder === 'number' ? b.queueOrder : Infinity;
      if (qA !== qB) return qA - qB;

      const tA = parseTimeStr(a.appointmentTime || a.timeSlot);
      const tB = parseTimeStr(b.appointmentTime || b.timeSlot);
      if (tA !== tB) return tA - tB;

      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeA - timeB;
    });

    return filtered;
  }, [allDoctorPatients, selectedCalendarDate]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultationSubTab, setConsultationSubTab] = useState('clinical'); // clinical, nutrition
  const [prescriptionText, setPrescriptionText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpInterval, setFollowUpInterval] = useState('No Follow-up');
  const [consultationFee, setConsultationFee] = useState('');
  const [globalDuration, setGlobalDuration] = useState('1 Month');
  const [submitting, setSubmitting] = useState(false);
  const sigCanvas = useRef(null);
  const [drawingMode, setDrawingMode] = useState('pen');
  const [isSavingDrawing, setIsSavingDrawing] = useState(false);

  const handleFollowUpIntervalChange = (val) => {
    setFollowUpInterval(val);
    if (val === 'No Follow-up') {
      setFollowUpDate('');
      return;
    }
    const today = new Date();
    if (val === '1 month') {
      today.setMonth(today.getMonth() + 1);
    } else if (val === '2 months') {
      today.setMonth(today.getMonth() + 2);
    } else if (val === '3 months') {
      today.setMonth(today.getMonth() + 3);
    } else if (val === '4 months') {
      today.setMonth(today.getMonth() + 4);
    } else if (val === '5 months') {
      today.setMonth(today.getMonth() + 5);
    } else if (val === '6 months') {
      today.setMonth(today.getMonth() + 6);
    }
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setFollowUpDate(`${yyyy}-${mm}-${dd}`);
  };

  const [medicalHistory, setMedicalHistory] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [newMedicine, setNewMedicine] = useState({ name: '', type: 'Tablet', timing: '1-0-1 (Morning, Night)', duration: '1 Month' });
  const [prescriptionFiles, setPrescriptionFiles] = useState([]);
  const [successToast, setSuccessToast] = useState('');

  // Package Form State
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [newPackageAmount, setNewPackageAmount] = useState('');
  const [newPackageStartDate, setNewPackageStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPackageEndDate, setNewPackageEndDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  );
  const [savingPackage, setSavingPackage] = useState(false);
  const [patientPackage, setPatientPackage] = useState(null);

  useEffect(() => {
    const normPhone = selectedPatient?.phone ? selectedPatient.phone.replace(/\D/g, '').slice(-10) : '';
    const pkgId = selectedPatient?.packageId || (normPhone ? activePackageMap.get(normPhone) : null);
    if (pkgId) {
      const fetchPackage = async () => {
        try {
          const docRef = doc(db, 'package_members', pkgId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setPatientPackage(docSnap.data());
          } else {
            setPatientPackage(null);
          }
        } catch (error) {
          console.error("Error fetching package details:", error);
        }
      };
      fetchPackage();
    } else {
      setPatientPackage(null);
    }
  }, [selectedPatient?.packageId, selectedPatient?.phone, activePackageMap]);

  const handleAddPackage = async () => {
    if (!newPackageAmount || isNaN(newPackageAmount)) {
      alert('Please enter a valid package amount.');
      return;
    }

    setSavingPackage(true);
    try {
      const total = parseFloat(newPackageAmount);
      const pId = selectedPatient.patientId || selectedPatient.id;

      const packageData = {
        patientId: pId,
        patientName: selectedPatient.fullName,
        patientMobile: selectedPatient.phone,
        packageName: 'Custom Package',
        totalAmount: total,
        paidAmount: 0,
        balanceAmount: total,
        startDate: newPackageStartDate,
        endDate: newPackageEndDate,
        status: 'active',
        branchId: userData?.branchId || selectedPatient.branchId || 'Unknown',
        branchName: userData?.branchName || selectedPatient.branchName || 'Unknown',
        createdAt: serverTimestamp(),
        createdBy: userData?.uid || 'doctor',
        createdByName: userData?.name || 'Doctor'
      };

      // Save to package_members collection
      const docRef = await addDoc(collection(db, 'package_members'), packageData);

      // Update selectedPatient locally to instantly show the package UI
      setSelectedPatient(prev => ({
        ...prev,
        packageId: docRef.id,
        packageName: 'Custom Package'
      }));
      setPatientPackage(packageData);

      // Update patient record in 'patients' collection
      if (pId) {
        await updateDoc(doc(db, 'patients', pId), {
          packageId: docRef.id,
          packageName: 'Custom Package'
        });
      }

      setShowPackageForm(false);
    } catch (error) {
      console.error("Error adding package:", error);
      alert('Failed to add package');
    } finally {
      setSavingPackage(false);
    }
  };

  // Global Patients Directory
  const [patientsList, setPatientsList] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');
  const [historySource, setHistorySource] = useState('All Sources');
  const [historyStatus, setHistoryStatus] = useState('All Statuses');
  const [historyBranch, setHistoryBranch] = useState('All Branches');

  // Patient History Modal
  const [selectedHistoryPatient, setSelectedHistoryPatient] = useState(null);
  const [historyPatientVisits, setHistoryPatientVisits] = useState([]);
  const [loadingHistoryVisits, setLoadingHistoryVisits] = useState(false);
  const [historyPatientNutritionPlans, setHistoryPatientNutritionPlans] = useState([]);

  const handleOpenHistoryModal = async (patient) => {
    setSelectedHistoryPatient(patient);
    setLoadingHistoryVisits(true);
    setHistoryPatientNutritionPlans([]);
    try {
      const q = query(collection(db, 'allpatients'), where('phone', '==', patient.phone));
      const snap = await getDocs(q);
      const visits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      visits.sort((a, b) => {
        const da = a.appointmentDate ? new Date(a.appointmentDate) : new Date(0);
        const db = b.appointmentDate ? new Date(b.appointmentDate) : new Date(0);
        return db - da;
      });
      setHistoryPatientVisits(visits);

      // Fetch nutrition plans
      if (patient.phone) {
        const cleanPhone = patient.phone.replace(/\D/g, '').slice(-10);
        const qNutri = query(collection(db, 'nutrition_plans'), where('patientPhone', '==', patient.phone));
        const snapNutri = await getDocs(qNutri);
        const plans = snapNutri.docs.map(d => ({ id: d.id, ...d.data() }));

        if (cleanPhone && cleanPhone !== patient.phone) {
          const qNutriClean = query(collection(db, 'nutrition_plans'), where('patientPhone', '==', cleanPhone));
          const snapNutriClean = await getDocs(qNutriClean);
          snapNutriClean.forEach(docSnap => {
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
        setHistoryPatientNutritionPlans(plans);
      }
    } catch (e) {
      console.error('Error fetching patient history:', e);
    } finally {
      setLoadingHistoryVisits(false);
    }
  };

  // Doctor Leave States
  const [leaveForm, setLeaveForm] = useState({ category: 'Casual', startDate: '', endDate: '', reason: '' });
  const [leaveList, setLeaveList] = useState([]);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Doctor Attendance States
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Doctor Payslip States
  const [payslips, setPayslips] = useState([]);

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Nutrition states
  const [nutritionSearch, setNutritionSearch] = useState('');
  const [nutritionPatient, setNutritionPatient] = useState(null);
  const [nutritionAge, setNutritionAge] = useState('');
  const [nutritionHeight, setNutritionHeight] = useState('');
  const [nutritionWeight, setNutritionWeight] = useState('');
  const [nutritionBmi, setNutritionBmi] = useState(0);
  const [nutritionAmount, setNutritionAmount] = useState('500');
  const [nutritionDeficiencies, setNutritionDeficiencies] = useState([]);
  const [nutritionDisorders, setNutritionDisorders] = useState([]);
  const [nutritionOtherDiseases, setNutritionOtherDiseases] = useState('');
  const [nutritionSymptoms, setNutritionSymptoms] = useState('');
  const [nutritionAvoid, setNutritionAvoid] = useState('');
  const [nutritionEat, setNutritionEat] = useState('');
  const [nutritionMeals, setNutritionMeals] = useState([]);
  const [submittingNutrition, setSubmittingNutrition] = useState(false);
  const [activeTabNutritionPlan, setActiveTabNutritionPlan] = useState('add'); // add, list
  const [allNutritionPlans, setAllNutritionPlans] = useState([]);
  const [selectedViewPlan, setSelectedViewPlan] = useState(null);
  const [isEditingMealsModalOpen, setIsEditingMealsModalOpen] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

  const generatePrefilledDiet = (age, deficiencies = [], disorders = []) => {
    const baseBreakfast = ["Vegetable Poha", "Oats Upma", "2 Veg Idli with Sambar", "Besan Chilla", "Vegetable Vermicelli"];
    const baseLunch = ["2 Multigrain Rotis, Mixed Veg Curry, Dal Tadka, Salad", "Brown Rice, Palak Dal, Curd, Cabbage Dry Curry", "2 Jowar Rotis, Bhindi Masala, Lentil soup", "Brown Rice, Rajma Curry, Cucumber Raita"];
    const baseSnack = ["Roasted Makhana", "Sprouts Salad", "Roasted Chana", "Handful of Almonds & Walnuts", "Buttermilk with Cumin"];
    const baseDinner = ["Moong Dal Khichdi & Curd", "Paneer Bhurji with 1 Roti", "Oats Khichdi with Veggies", "Vegetable Soup with Sautéed Paneer"];

    const deficiencyMeals = {
      "Iron": {
        breakfast: "Spinach Moong Dal Chilla",
        lunch: "Beetroot Curry, Palak Dal with 2 Rotis",
        snack: "Pomegranate Bowl & Roasted Chana",
        dinner: "Bajra Roti with Lentil Soup & Salad"
      },
      "Calcium": {
        breakfast: "Ragi Dosa with Paneer stuffing",
        lunch: "Paneer Tikka, Spinach Dal with Curd Rice",
        snack: "Til (Sesame) Chikki & Roasted Makhana",
        dinner: "Multigrain Roti with Paneer Bhurji & Curd"
      },
      "Vitamin D": {
        breakfast: "Fortified Oats Porridge with Almond Milk",
        lunch: "Mushroom Matar curry with Brown Rice & Yogurt",
        snack: "Boiled Egg whites or Roasted Almonds",
        dinner: "Sautéed Mushroom Salad with Paneer pane"
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

      if (disorders.includes("Sugar (Diabetes)")) {
        b = b.replace(/Idli/i, "Ragi Idli").replace(/Poha/i, "Methi Poha").replace(/Upma/i, "Millet Upma");
        l = l.replace(/Brown Rice/i, "Millet Khichdi").replace(/Rotis/i, "Missi Rotis (Chana flour)");
        s = s.replace(/Chikki/i, "Roasted Walnuts");
        d = d.replace(/Khichdi/i, "Millet Khichdi").replace(/Roti/i, "Missi Roti");
      }

      if (disorders.includes("High BP (Hypertension)")) {
        b = b + " (Low Sodium)";
        l = l + " (No added salt)";
        s = s + " (Unsalted)";
        d = d + " (Low Sodium)";
      }

      if (disorders.includes("Thyroid")) {
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

  useEffect(() => {
    let avoid = [];
    let eat = [];

    if (nutritionDisorders.includes("Sugar (Diabetes)")) {
      avoid.push("Refined sugar, sweets, white bread, white rice, potatoes, sweet fruits (mango, sapota, banana).");
      eat.push("Bitter gourd (Karela), fenugreek (Methi) seeds, cinnamon, jamun, raw vegetables, millets, brown rice.");
    }
    if (nutritionDisorders.includes("High BP (Hypertension)")) {
      avoid.push("High-salt foods, pickles, papad, processed cheese, bakery items, canned food, salted chips.");
      eat.push("Coconut water, bananas, leafy green vegetables, garlic, watermelon, skimmed milk, low-sodium meals.");
    }
    if (nutritionDisorders.includes("Thyroid")) {
      avoid.push("Raw cabbage, raw cauliflower, raw broccoli, raw soy nuggets, raw tofu.");
      eat.push("Cooked vegetables, iodine-rich foods, zinc-rich foods.");
    }
    if (nutritionDisorders.includes("Gastritis") || nutritionDisorders.includes("Acidity")) {
      avoid.push("Spicy foods, Citrus fruits, Coffee, Alcohol, Fried foods.");
      eat.push("Oatmeal, Ginger, Aloe vera, Melons, Lean meats, Herbal teas.");
    }
    if (nutritionDisorders.includes("IBS / IBD") || nutritionDisorders.includes("Bloating")) {
      avoid.push("Beans, Onions, Garlic, Dairy, Gluten, High-FODMAP foods.");
      eat.push("Lactose-free dairy, Quinoa, Zucchini, Spinach, Blueberries.");
    }
    if (nutritionDisorders.includes("SIBO")) {
      avoid.push("Sugar, Dairy, Grains, Starchy vegetables, Legumes.");
      eat.push("Meat, Fish, Eggs, Leafy greens, Non-starchy vegetables.");
    }
    if (nutritionDisorders.includes("Piles")) {
      avoid.push("Spicy foods, Processed meats, Cheese, White flour, Fried foods.");
      eat.push("High fiber foods, Beans, Lentils, Whole grains, Broccoli, Apples, Water.");
    }
    if (nutritionDisorders.includes("PCOD") || nutritionDisorders.includes("Insulin Resistance")) {
      avoid.push("Refined carbs, Sugary drinks, Processed meats, Solid fats.");
      eat.push("High-fiber veggies, Lean proteins, Anti-inflammatory foods, Berries.");
    }
    if (nutritionDisorders.includes("Hairfall")) {
      eat.push("Eggs, Berries, Spinach, Fatty fish, Sweet potatoes, Avocados, Nuts.");
    }
    if (nutritionDisorders.includes("Melasma")) {
      avoid.push("Excess sugar, Processed foods, Dairy (if sensitive).");
      eat.push("Vitamin C foods, Citrus, Berries, Leafy greens, Antioxidants.");
    }
    if (nutritionDisorders.includes("Weight Gain")) {
      eat.push("Nuts, Avocados, Whole grains, Protein-rich foods, Healthy fats, Dairy.");
    }
    if (nutritionDisorders.includes("Weight Loss")) {
      avoid.push("Sugary drinks, Pastries, Fried foods, White bread.");
      eat.push("Leafy greens, Salmon, Cruciferous veggies, Lean beef, Chicken breast.");
    }
    if (nutritionDisorders.includes("Height Growth")) {
      eat.push("Milk, Yogurt, Beans, Chicken, Almonds, Leafy greens, Sweet potatoes.");
    }
    if (nutritionDisorders.includes("Adenoids / Tonsillitis")) {
      avoid.push("Cold foods, Dairy (if it thickens mucus), Crunchy/hard foods.");
      eat.push("Warm broths, Mashed potatoes, Soft fruits, Honey, Ginger tea.");
    }
    if (nutritionDisorders.includes("Allergies")) {
      avoid.push("Known allergens, Processed foods with preservatives.");
      eat.push("Anti-inflammatory foods, Turmeric, Ginger, Citrus, Berries.");
    }

    if (nutritionDeficiencies.includes("Iron")) {
      eat.push("Iron-rich: Palak, beetroot, pomegranate, dates, sesame seeds, lentils, green leafy vegetables.");
    }
    if (nutritionDeficiencies.includes("Calcium")) {
      eat.push("Calcium-rich: Ragi, milk, yogurt, paneer, tofu, almonds, sesame seeds.");
    }
    if (nutritionDeficiencies.includes("Vitamin D")) {
      eat.push("Vitamin D-rich: Mushrooms, egg yolks, fortified milk, cheese.");
    }
    if (nutritionDeficiencies.includes("Vitamin C")) {
      eat.push("Vitamin C-rich: Amla, oranges, lemons, sweet lime, guavas, bell peppers.");
    }
    if (nutritionDeficiencies.includes("Vitamin A")) {
      eat.push("Vitamin A-rich: Carrots, sweet potatoes, spinach, papaya, pumpkin, mangoes, milk, eggs.");
    }
    if (nutritionDeficiencies.includes("Vitamin B")) {
      eat.push("Vitamin B-rich: Whole grains (oats, barley), milk, cheese, eggs, leafy greens, legumes, almonds.");
    }
    if (nutritionDeficiencies.includes("Vitamin E")) {
      eat.push("Vitamin E-rich: Almonds, sunflower seeds, spinach, avocados, peanuts, vegetable oils.");
    }
    if (nutritionDeficiencies.includes("Vitamin K")) {
      eat.push("Vitamin K-rich: Spinach, kale, broccoli, cabbage, brussels sprouts, fish, eggs.");
    }
    if (nutritionDeficiencies.includes("Potassium")) {
      eat.push("Potassium-rich: Bananas, coconut water, potatoes, sweet potatoes, spinach, curd, oranges.");
    }
    if (nutritionDeficiencies.includes("Magnesium")) {
      eat.push("Magnesium-rich: Pumpkin seeds, almonds, spinach, cashews, dark chocolate, bananas, avocados.");
    }
    if (nutritionDeficiencies.includes("Zinc")) {
      eat.push("Zinc-rich: Chickpeas, lentils, pumpkin seeds, sesame seeds, almonds, curd, whole grains.");
    }
    if (nutritionDeficiencies.includes("Sodium")) {
      eat.push("Sodium-rich: Salt, Celery, Beets, Milk, Natural cheeses.");
    }
    if (nutritionDeficiencies.includes("Protein")) {
      eat.push("Protein-rich: Chicken, Eggs, Lentils, Greek yogurt, Almonds, Quinoa, Paneer.");
    }
    if (nutritionDeficiencies.includes("Manganese")) {
      eat.push("Manganese-rich: Nuts, Beans, Legumes, Oatmeal, Whole wheat, Spinach.");
    }
    if (nutritionDeficiencies.includes("Phosphorus")) {
      eat.push("Phosphorus-rich: Chicken, Turkey, Pork, Seafood, Seeds, Nuts.");
    }
    setNutritionAvoid(avoid.join("\n"));
    setNutritionEat(eat.join("\n"));
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
      setNutritionBmi((w / (h * h)).toFixed(1));
    } else {
      setNutritionBmi(0);
    }
  }, [nutritionHeight, nutritionWeight]);
  const handleMealCellChange = (dayNum, field, val) => {
    setNutritionMeals(prev => prev.map(m => m.dayNumber === dayNum ? { ...m, [field]: val } : m));
  };
  const handleSaveNutritionPlan = async (e) => {
    e.preventDefault();
    if (!nutritionPatient) return;
    setSubmittingNutrition(true);
    try {
      const start = new Date();
      const startStr = start.toISOString().split('T')[0];
      const expiry = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiryStr = expiry.toISOString().split('T')[0];

      const planData = {
        // For app-booked patients: patientId is the Firebase Auth UID (stored in appointments.patientId)
        // For walk-in patients: patientId is the Firestore document ID
        // DietPlan.js queries by patientId==user.uid first, then falls back to patientPhone
        patientId: nutritionPatient.patientId || nutritionPatient.id,
        patientName: nutritionPatient.fullName,
        patientPhone: nutritionPatient.phone,
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
        doctorId: user.uid,
        doctorName: userData?.name || 'Doctor',
        branchId: nutritionPatient.branchId || userData?.branchId || 'KPHB',
        branchName: nutritionPatient.branchName || userData?.branchName || 'KPHB Branch',
        meals: nutritionMeals,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'nutrition_plans'), planData);

      const targetUserId = nutritionPatient.id || nutritionPatient.patientId;
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        title: '🥦 30-Day Nutrition Plan Issued!',
        body: `Dr. ${userData?.name || 'Physician'} has created a custom 30-day diet plan for you. Complete the payment of ₹${nutritionAmount} at the reception to unlock the plan.`,
        type: 'payment_requested',
        isRead: false,
        createdAt: serverTimestamp()
      });

      if (targetUserId && targetUserId !== 'WALKIN_USER') {
        sendPushNotification(
          targetUserId,
          '🥦 30-Day Nutrition Plan Issued!',
          `Dr. ${userData?.name || 'Physician'} has created a custom 30-day diet plan for you. Complete the payment of ₹${nutritionAmount} at the reception to unlock the plan.`,
          'payment_requested'
        );
      }

      alert('Diet Plan created successfully! A pending billing request has been sent to the receptionist.');

      setNutritionSearch('');
      setNutritionPatient(null);
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
      if (selectedPatient) {
        setConsultationSubTab('clinical');
      } else {
        setActiveTabNutritionPlan('list');
      }
    } catch (err) {
      console.error('Error saving nutrition plan:', err);
      alert('Failed to save nutrition plan: ' + err.message);
    } finally {
      setSubmittingNutrition(false);
    }
  };
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
                <td style="padding: 4px 0;"><strong>Prescribed By:</strong> Dr. ${plan.doctorName ? plan.doctorName.replace(/^(?:dr\.?|doctor)\s+/i, '') : 'Physician'}</td>
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

  const toggleSidebar = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('sidebar-collapsed', String(nextVal));
  };

  // Live clock state — ticks every second
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  const normalizeDoctorName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/^dr\.\s*/i, '')
      .replace(/^dr\s*/i, '')
      .replace(/\./g, '')
      .replace(/\s+/g, '')
      .trim();
  };

  useEffect(() => {
    if (!userData) return;
    setPatientsLoading(true);

    // 0. Package Members listener
    const qPkg = collection(db, 'package_members');
    const unsubscribePkg = onSnapshot(qPkg, (snapshot) => {
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
      console.error("Error listening to package members on Doctor Dashboard:", error);
    });

    let latestWalkins = [];
    let latestOnline = [];

    const combineAndSet = () => {
      setAllDoctorPatients([...latestWalkins, ...latestOnline]);
      setPatientsLoading(false);
    };

    // 1. Live Consultation Queue listener (including booked paid appointments)
    const q = query(
      collection(db, 'allpatients'),
      where('status', 'in', ['booked', 'waiting', 'in-consultation', 'completed', 'done'])
    );

    const unsubscribeQueue = onSnapshot(q, (snapshot) => {
      const list = [];
      const docNorm = normalizeDoctorName(userData.name || '');
      snapshot.forEach(doc => {
        const p = doc.data();
        const patDocNorm = normalizeDoctorName(p.doctor || '');
        const isMine = patDocNorm && docNorm && (
          patDocNorm.includes(docNorm) || docNorm.includes(patDocNorm)
        );
        if (isMine) {
          // Bypassing booked but unpaid appointments
          if (p.status === 'booked' && p.paymentStatus !== 'paid') {
            return;
          }
          list.push({ id: doc.id, _type: 'walkin', firestoreCollection: 'patients', ...p });
        }
      });

      latestWalkins = list;
      combineAndSet();
    });

    // 1.5. Online Appointments listener - scope to a date window to avoid fetching all historical records
    const now = new Date();
    const pastDate = new Date(now); pastDate.setDate(now.getDate() - 7);
    const futureDate = new Date(now); futureDate.setDate(now.getDate() + 30);
    const pastStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
    const futureStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

    const qAppts = query(
      collection(db, 'appointments'),
      where('dateString', '>=', pastStr),
      where('dateString', '<=', futureStr)
    );

    const unsubscribeAppts = onSnapshot(qAppts, (snapshot) => {
      const list = [];
      const docNorm = normalizeDoctorName(userData.name || '');
      snapshot.forEach(doc => {
        const appt = doc.data();
        if (appt.checkedInAt) {
          return;
        }
        const patDocNorm = normalizeDoctorName(appt.doctorName || appt.doctor || '');
        const isMine = patDocNorm && docNorm && (
          patDocNorm.includes(docNorm) || docNorm.includes(patDocNorm)
        );
        if (isMine) {
          if (appt.status === 'booked' && appt.paymentStatus !== 'paid') {
            return;
          }
          // Get the date string (YYYY-MM-DD) from dateString, or extract from ISO date
          let rawDate = appt.dateString || '';
          if (!rawDate && appt.date) {
            // appt.date may be an ISO string like "2026-06-12T18:30:00.000Z"
            rawDate = String(appt.date).split('T')[0];
          }
          // Convert YYYY-MM-DD → DD/MM/YYYY for isMatchingDate compatibility
          let formattedDate = rawDate;
          if (rawDate && rawDate.includes('-')) {
            const parts = rawDate.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
              formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
          }
          // Normalize status
          let mappedStatus = appt.status || 'waiting';
          if (mappedStatus === 'pending' || mappedStatus === 'confirmed') mappedStatus = 'waiting';

          list.push({
            ...appt,
            id: doc.id,
            _type: 'online',
            firestoreCollection: 'appointments',
            source: appt.source || 'UserApp',
            fullName: appt.patientName || 'Online Patient',
            regId: appt.registrationId || 'ONLINE',
            phone: appt.phone || 'N/A',
            email: appt.email || '',
            appointmentDate: formattedDate,
            appointmentTime: appt.timeSlot || 'N/A',
            doctor: appt.doctorName ? `Dr. ${appt.doctorName.replace(/^(?:dr\.?|doctor)\s+/i, '')}` : 'General Doctor',
            status: mappedStatus,
            createdAt: appt.createdAt
          });
        }
      });
      latestOnline = list;
      combineAndSet();
    }, (error) => {
      console.error('Appointments listener error:', error);
      // If range query fails (missing index), fall back to a simpler query
      combineAndSet();
    });

    // 2. Patient Directory real-time listener (walk-in patients)
    let latestWalkinsForNutri = [];
    let latestOnlineForNutri = [];

    const mergeAndSetPatientsList = () => {
      // Merge walk-in and online patients; do not deduplicate by phone to preserve full appointment history
      const merged = [...latestWalkinsForNutri, ...latestOnlineForNutri];
      // Deduplicate by exact document ID to avoid react key collisions
      const uniqueMap = new Map();
      merged.forEach(p => uniqueMap.set(p.id, p));
      setPatientsList(Array.from(uniqueMap.values()));
    };

    const qAllPat = query(collection(db, 'allpatients'));
    const unsubscribeAllPat = onSnapshot(qAllPat, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, _type: 'walkin', ...d.data() }));
      latestWalkinsForNutri = list;
      mergeAndSetPatientsList();
    });

    // Also include online booked patients so they can receive nutrition plans & show in History
    const qOnlinePat = query(collection(db, 'appointments'));
    const unsubscribeOnlinePat = onSnapshot(qOnlinePat, (snap) => {
      const list = [];
      snap.forEach(d => {
        const appt = d.data();
        const apptPhone = (appt.phone || '').replace(/\D/g, '').slice(-10);
        
        let rawDate = appt.dateString || '';
        if (!rawDate && appt.date) {
          rawDate = String(appt.date).split('T')[0];
        }
        let formattedDate = rawDate;
        if (rawDate && rawDate.includes('-')) {
          const parts = rawDate.split('-');
          if (parts.length === 3 && parts[0].length === 4) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        list.push({
          id: d.id,
          _type: 'online',
          patientId: appt.patientId || d.id, // patientId is user.uid for app-booked
          fullName: appt.patientName || 'Online Patient',
          phone: apptPhone || appt.phone,
          registrationId: appt.registrationId || 'APP',
          branchId: appt.branchId || '',
          branchName: appt.branchName || '',
          age: appt.age || '',
          height: appt.height || '',
          weight: appt.weight || '',
          // Mapped fields required for History tab filtering & rendering:
          doctor: appt.doctorName || appt.doctorId || '',
          doctorName: appt.doctorName || appt.doctorId || '',
          appointmentDate: formattedDate,
          appointmentTime: appt.timeSlot || 'N/A',
          status: appt.status || 'waiting',
          subject: appt.subject || appt.symptoms || '',
          complaint: appt.subject || appt.symptoms || '',
          source: appt.source || 'UserApp',
          createdAt: appt.createdAt
        });
      });
      latestOnlineForNutri = list;
      mergeAndSetPatientsList();
    });

    // 3. My Leaves listener
    const qLeaves = query(collection(db, 'leave_requests'), where('userId', '==', user.uid));
    const unsubscribeLeaves = onSnapshot(qLeaves, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setLeaveList(list);
    });

    // 4. My Attendance Logs
    const qLogs = query(collection(db, 'activity_logs'), where('userId', '==', user.uid));
    const unsubscribeLogs = onSnapshot(qLogs, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setAttendanceLogs(list);
    });

    // 5. My Payslips
    const qPay = query(collection(db, 'salaries'), where('staffId', '==', user.uid));
    const unsubscribePay = onSnapshot(qPay, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPayslips(list);
    });

    // 6. Notifications
    const qNotif = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsubscribeNotif = onSnapshot(qNotif, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(list);
    });

    // 7. Nutrition Plans listener
    const qNutri = query(collection(db, 'nutrition_plans'), where('doctorId', '==', user.uid));
    const unsubscribeNutri = onSnapshot(qNutri, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAllNutritionPlans(list);
    });

    return () => {
      unsubscribePkg();
      unsubscribeQueue();
      unsubscribeAppts();
      unsubscribeAllPat();
      unsubscribeOnlinePat();
      unsubscribeLeaves();
      unsubscribeLogs();
      unsubscribePay();
      unsubscribeNotif();
      unsubscribeNutri();
    };
  }, [userData]);

  const handleStartConsultation = async (patient) => {
    try {
      const collectionName = patient.firestoreCollection || (patient._type === 'online' ? 'appointments' : 'patients');
      await updateDoc(doc(db, collectionName, patient.id), {
        status: 'in-consultation',
        consultationStartedAt: serverTimestamp()
      });
      handleOpenPrescribeModal(patient);
    } catch (e) {
      console.error('Error starting consultation:', e);
      alert('Failed to start consultation: ' + (e.message || e));
    }
  };

  const handleOpenPrescribeModal = (patient) => {
    setSelectedPatient(patient);
    setPrescriptionText(patient.prescriptionNotes || '');
    setMedicalHistory(patient.medicalHistory || '');
    setMedicines([]);
    setFollowUpDate(patient.followUpDate || '');
    setFollowUpInterval(patient.followUpInterval || '15 days');
    setConsultationFee(patient.consultationFee || '');
    setGlobalDuration('1 Month');
    setConsultationSubTab('clinical');
    if (sigCanvas.current && sigCanvas.current.clear) {
      sigCanvas.current.clear();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDrawing = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert("Canvas is empty. Please draw something before saving.");
      return;
    }
    setIsSavingDrawing(true);
    try {
      const dataURL = sigCanvas.current.getCanvas().toDataURL('image/png');
      const fileRef = ref(storage, `prescriptions/${selectedPatient.id}_${Date.now()}_canvas.png`);
      await uploadString(fileRef, dataURL, 'data_url');
      const url = await getDownloadURL(fileRef);

      const collectionName = selectedPatient.firestoreCollection || (selectedPatient._type === 'online' ? 'appointments' : 'patients');
      
      const currentUrls = selectedPatient.prescriptionUrls || (selectedPatient.prescriptionUrl ? [selectedPatient.prescriptionUrl] : []);
      const newUrls = [...currentUrls, url];
      
      await updateDoc(doc(db, collectionName, selectedPatient.id), {
        prescriptionUrls: newUrls,
        prescriptionUrl: newUrls[0]
      });

      try {
        const qpl = query(collection(db, 'patient_list'), where('patientId', '==', selectedPatient.id));
        const snap = await getDocs(qpl);
        if (!snap.empty) {
          snap.forEach(d => {
            updateDoc(doc(db, 'patient_list', d.id), {
               prescriptionUrls: newUrls,
               prescriptionUrl: newUrls[0]
            });
          });
        }
      } catch (err) {}

      setSelectedPatient(prev => ({ ...prev, prescriptionUrls: newUrls, prescriptionUrl: newUrls[0] }));
      
      sigCanvas.current.clear();
      alert("Drawing saved successfully to patient history!");
    } catch (e) {
      console.error("Error saving drawing:", e);
      alert("Failed to save drawing.");
    } finally {
      setIsSavingDrawing(false);
    }
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    const hasCanvas = sigCanvas.current && !sigCanvas.current.isEmpty();
    if (!prescriptionText.trim() && prescriptionFiles.length === 0 && !hasCanvas) {
      alert('Please write prescription notes, draw, or upload a prescription file.');
      return;
    }
    if (medicines && medicines.length > 0) {
      if (!globalDuration || !globalDuration.trim()) {
        alert('Please specify the duration to use for all medicines (e.g. 1 Month).');
        return;
      }
    }
    setSubmitting(true);
    try {
      const uploadedUrls = [];
      if (prescriptionFiles.length > 0) {
        for (const file of prescriptionFiles) {
          const fileRef = ref(storage, `prescriptions/${selectedPatient.id}_${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          uploadedUrls.push(url);
        }
      }

      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const dataURL = sigCanvas.current.getCanvas().toDataURL('image/png');
        const fileRef = ref(storage, `prescriptions/${selectedPatient.id}_${Date.now()}_canvas.png`);
        await uploadString(fileRef, dataURL, 'data_url');
        const url = await getDownloadURL(fileRef);
        uploadedUrls.push(url);
      }

      const updateData = {
        status: 'completed',
        subject: selectedPatient.complaint || selectedPatient.subject || 'Consultation',
        followUpDate: followUpDate || '',
        followUpInterval: followUpInterval,
        prescriptionNotes: prescriptionText,
        diagnosisNotes: prescriptionText,
        diagnosisMode: 'text',
        consultationFee: consultationFee ? Number(consultationFee) : 0,
        medicines: medicines.length > 0 ? medicines.map(m => ({ ...m, duration: globalDuration })) : [],
        medicalHistory: medicalHistory,
        prescribedAt: serverTimestamp()
      };

      if (uploadedUrls.length > 0) {
        const currentUrls = selectedPatient.prescriptionUrls || (selectedPatient.prescriptionUrl ? [selectedPatient.prescriptionUrl] : []);
        updateData.prescriptionUrls = [...currentUrls, ...uploadedUrls];
        updateData.prescriptionUrl = uploadedUrls[0];
      }

      const collectionName = selectedPatient.firestoreCollection || (selectedPatient._type === 'online' ? 'appointments' : 'patients');
      await updateDoc(doc(db, collectionName, selectedPatient.id), updateData);

      await addDoc(collection(db, 'patient_list'), {
        patientId: selectedPatient.id,
        fullName: selectedPatient.fullName || 'Patient',
        phone: selectedPatient.phone || '',
        email: selectedPatient.email || '',
        regId: selectedPatient.registrationId || '',
        doctor: userData?.name || 'Doctor',
        branchId: selectedPatient.branchId || userData?.branchId || 'KPHB',
        branchName: selectedPatient.branchName || userData?.branchName || 'KPHB Branch',
        status: 'completed',
        consultationFee: consultationFee ? Number(consultationFee) : 0,
        followUpDate: followUpDate || '',
        followUpInterval: followUpInterval,
        prescriptionNotes: prescriptionText,
        medicalHistory: medicalHistory,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'medicine_requests'), {
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        phone: selectedPatient.phone || '',
        doctorName: userData?.name || 'Doctor',
        branchId: selectedPatient.branchId || userData?.branchId || 'KPHB',
        branchName: selectedPatient.branchName || userData?.branchName || 'KPHB Branch',
        subject: selectedPatient.complaint || selectedPatient.subject || 'Consultation',
        status: 'pending',
        requestedAt: serverTimestamp(),
        medicines: medicines.length > 0 ? medicines : []
      });

      // Close the consultation panel FIRST so the panel disappears immediately
      setSelectedPatient(null);
      // Show a non-blocking toast message
      setSuccessToast('✅ Prescription submitted successfully! Sent to receptionist counter.');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (e) {
      alert('Failed to submit prescription: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      alert('Please fill out the reason for leave.');
      return;
    }
    setSubmittingLeave(true);
    try {
      await addDoc(collection(db, 'leave_requests'), {
        userId: user.uid,
        staffName: userData?.name || 'Doctor',
        staffRole: 'doctor',
        branchId: userData?.branchId || 'KPHB',
        branchName: userData?.branchName || 'KPHB Branch',
        category: leaveForm.category,
        leaveType: leaveForm.category,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      alert('Leave request submitted successfully.');
      setLeaveForm({ category: 'Casual', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      alert('Error submitting leave: ' + err.message);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const filteredPatientsList = patientsList.filter(p => {
    // 1. Doctor check (always enforced)
    const docNorm = normalizeDoctorName(userData?.name || '');
    const patDocNorm = normalizeDoctorName(p.doctor || p.doctorName || '');
    const isMine = patDocNorm && docNorm && (patDocNorm.includes(docNorm) || docNorm.includes(patDocNorm));
    if (!isMine) return false;

    // 2. Date/Month check
    if (historyDate) {
      const d1 = new Date(historyDate);
      if (isNaN(d1.getTime())) return false;
      const d1Str = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;

      const pDate = p.appointmentDate || p.dateString || p.date;
      if (!pDate) return false;
      let pDateStr = '';
      if (pDate.includes('-')) {
        const parts = pDate.split('-');
        pDateStr = parts[0].length === 4 ? pDate : `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (pDate.includes('/')) {
        const parts = pDate.split('/');
        pDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      if (pDateStr !== d1Str) return false;
    } else if (historyMonth) {
      const pDate = p.appointmentDate || p.dateString || p.date;
      if (!pDate) return false;
      let dObj = null;
      if (typeof pDate === 'string' && pDate.includes('-')) {
        const parts = pDate.split('-');
        if (parts.length === 3) dObj = new Date(parts[0].length === 4 ? pDate : `${parts[2]}-${parts[1]}-${parts[0]}`);
      } else if (typeof pDate === 'string' && pDate.includes('/')) {
        const parts = pDate.split('/');
        if (parts.length === 3) dObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      if (dObj && !isNaN(dObj.getTime())) {
        const m = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
        if (m !== historyMonth) return false;
      } else {
        return false;
      }
    } else {
      // Default: Today and yesterday
      const localToday = new Date();
      const localYesterday = new Date();
      localYesterday.setDate(localYesterday.getDate() - 1);

      const isToday = isMatchingDate(p.appointmentDate || p.dateString || p.date, localToday);
      const isYesterday = isMatchingDate(p.appointmentDate || p.dateString || p.date, localYesterday);

      if (!isToday && !isYesterday) return false;
    }

    // 3. Search check
    const q = patientSearch.toLowerCase().trim();
    if (q && !(p.fullName?.toLowerCase().includes(q) || p.phone?.includes(q))) return false;

    // 4. Source check
    if (historySource !== 'All Sources') {
      const pSource = (p.source === 'appointments' || p.source === 'UserApp' || p._type === 'online' || p.source === 'Patient App' || p.source === 'Online') ? 'Online' : (p.source || 'Walk-in');
      if (pSource !== historySource) return false;
    }

    // 5. Status check
    if (historyStatus !== 'All Statuses' && p.status !== historyStatus) return false;

    // 6. Branch check
    if (historyBranch !== 'All Branches' && p.branchName !== historyBranch) return false;

    return true;
  });

  const activeQueue = todayPatients.filter(p => p.status === 'booked' || p.status === 'waiting' || p.status === 'in-consultation');
  const completedQueue = todayPatients.filter(p => p.status === 'completed' || p.status === 'done');

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ display: selectedPatient ? 'none' : 'flex' }}>
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
                SPH Doctor Portal
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
        <p className="sidebar-text" style={{ color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, textAlign: 'center', marginTop: '-12px', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          DOCTOR PORTAL
        </p>


        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '20px' }}>
          <button onClick={() => setActiveTab('dashboard')} className={`sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>
            <Calendar size={16} />
            <span className="sidebar-text">Dashboard</span>
          </button>

          <button onClick={() => setActiveTab('queue')} className={`sidebar-btn ${activeTab === 'queue' ? 'active' : ''}`}>
            <Clock size={16} />
            <span className="sidebar-text">Consultation Queue</span>
          </button>

          <button onClick={() => setActiveTab('patients')} className={`sidebar-btn ${activeTab === 'patients' ? 'active' : ''}`}>
            <Users size={16} />
            <span className="sidebar-text">History</span>
          </button>

          <button onClick={() => setActiveTab('packages')} className={`sidebar-btn ${activeTab === 'packages' ? 'active' : ''}`}>
            <Award size={16} />
            <span className="sidebar-text">Packages</span>
          </button>

          <button onClick={() => setActiveTab('nutrition')} className={`sidebar-btn ${activeTab === 'nutrition' ? 'active' : ''}`}>
            <FileText size={16} />
            <span className="sidebar-text">Nutrition Plans</span>
          </button>

          {/* Hidden Tabs
          <button onClick={() => setActiveTab('leave')} className={`sidebar-btn ${activeTab === 'leave' ? 'active' : ''}`}>
            <Calendar size={16} />
            <span className="sidebar-text">Apply Leave</span>
          </button>

          <button onClick={() => setActiveTab('attendance')} className={`sidebar-btn ${activeTab === 'attendance' ? 'active' : ''}`}>
            <Clock size={16} />
            <span className="sidebar-text">My Attendance</span>
          </button>

          <button onClick={() => setActiveTab('payslips')} className={`sidebar-btn ${activeTab === 'payslips' ? 'active' : ''}`}>
            <Briefcase size={16} />
            <span className="sidebar-text">My Payslips</span>
          </button>

          <button onClick={() => setActiveTab('notifications')} className={`sidebar-btn ${activeTab === 'notifications' ? 'active' : ''}`}>
            <Bell size={16} />
            <span className="sidebar-text">Notifications ({notifications.length})</span>
          </button>
          */}
        </nav>

        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: '#fca5a5', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '13px', marginTop: 'auto' }}>
          <LogOut size={16} />
          <span className="sidebar-text">Sign Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ display: selectedPatient ? 'none' : 'block' }}>
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

        {/* ═══════════════ DOCTOR PROFESSIONAL HEADER ═══════════════ */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px',
          marginBottom: '28px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(37, 142, 200, 0.15)',
          boxShadow: '0 2px 16px rgba(37, 142, 200, 0.08)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left — doctor identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Avatar initials */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #1565c0, #258ec8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(21,101,192,0.3)'
            }}>
              <span style={{ color: '#fff', fontWeight: '800', fontSize: '17px', letterSpacing: '-0.5px' }}>
                {(userData?.name || 'Dr').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '2px' }}>
                Good {liveTime.getHours() < 12 ? 'Morning' : liveTime.getHours() < 17 ? 'Afternoon' : 'Evening'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#1565c0', lineHeight: '1.1', letterSpacing: '-0.3px' }}>
                {userData?.name ? `Dr. ${userData.name.replace(/^(?:dr\.?|doctor)\s+/i, '')}` : 'Doctor'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '2px' }}>
                Physician · SPH Clinic
              </div>
            </div>
          </div>

          {/* Right — live clock + date */}
          <div style={{ textAlign: 'right' }}>
            {/* Live time in 12-hr format */}
            <div style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#1565c0',
              letterSpacing: '-1px',
              lineHeight: '1',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {(() => {
                const h = liveTime.getHours();
                const h12 = h % 12 || 12;
                const mm = String(liveTime.getMinutes()).padStart(2, '0');
                const ss = String(liveTime.getSeconds()).padStart(2, '0');
                const ampm = h < 12 ? 'AM' : 'PM';
                return (
                  <>
                    {String(h12).padStart(2, '0')}:{mm}
                    <span style={{ fontSize: '20px', fontWeight: '600', color: 'rgba(21,101,192,0.45)', margin: '0 4px' }}>:{ss}</span>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#258ec8', verticalAlign: 'super' }}>{ampm}</span>
                  </>
                );
              })()}
            </div>
            {/* Date */}
            <div style={{ marginTop: '5px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
              {liveTime.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* TAB 0: DASHBOARD */}
        {activeTab === 'dashboard' && (() => {
          // Date helpers
          const localToday = new Date();
          const localTodayStrYYYYMMDD = localToday.toISOString().split('T')[0];

          // Calendar calculations
          const handlePrevMonth = () => {
            setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
          };

          const handleNextMonth = () => {
            setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
          };

          const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
          const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

          const renderCalendar = () => {
            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth();
            const daysInMonth = getDaysInMonth(year, month);
            const firstDay = getFirstDayOfMonth(year, month);
            const days = [];

            // Padding days from previous month
            for (let i = 0; i < firstDay; i++) {
              days.push(<div key={`pad-${i}`} style={{ width: '40px', height: '40px' }} />);
            }

            // Current month days
            for (let dNum = 1; dNum <= daysInMonth; dNum++) {
              const dateVal = new Date(year, month, dNum);
              const isToday = dateVal.toDateString() === new Date().toDateString();
              const isSelected = dateVal.toDateString() === selectedCalendarDate.toDateString();

              // Has appointments
              const dYYYY = dateVal.getFullYear();
              const dMM = String(dateVal.getMonth() + 1).padStart(2, '0');
              const dDD = String(dateVal.getDate()).padStart(2, '0');
              const dateStrYYYYMMDD = `${dYYYY}-${dMM}-${dDD}`;
              const dateStrDDMMYYYY = `${dDD}/${dMM}/${dYYYY}`;

              const hasAppts = allDoctorPatients.some(p => {
                const apptDate = String(p.appointmentDate || '').trim();
                return apptDate === dateStrYYYYMMDD || apptDate === dateStrDDMMYYYY;
              });

              days.push(
                <button
                  key={`day-${dNum}`}
                  onClick={() => setSelectedCalendarDate(dateVal)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    background: isSelected ? 'var(--primary-color)' : isToday ? 'rgba(168, 206, 58, 0.15)' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? 'var(--primary-color)' : 'var(--text-main)',
                    fontWeight: isSelected || isToday ? 'bold' : 'normal',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                  }}
                  className={isSelected ? '' : 'calendar-day-btn'}
                >
                  {dNum}
                  {hasAppts && (
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: isSelected ? '#fff' : 'var(--secondary)',
                        position: 'absolute',
                        bottom: '4px'
                      }}
                    />
                  )}
                </button>
              );
            }

            return days;
          };

          // Filter queue-wise for the selected day and branch
          const branchFilteredPatients = selectedBranch === 'All Branches' ? selectedDayPatients : selectedDayPatients.filter(p => normalizeBranchName(p.branchName || p.branchId) === selectedBranch);
          const bookedAppts = branchFilteredPatients.filter(p => p.status === 'booked');
          const waitingAppts = branchFilteredPatients.filter(p => p.status === 'waiting');
          const activeAppts = branchFilteredPatients.filter(p => p.status === 'in-consultation');
          const completedAppts = branchFilteredPatients.filter(p => p.status === 'completed' || p.status === 'done');

          // Compute unified active queue sorted strictly by queueOrder -> slot time -> createdAt
          const activeList = branchFilteredPatients.filter(p => p.status === 'booked' || p.status === 'waiting' || p.status === 'in-consultation');

          const parseTimeStr = (timeStr) => {
            if (!timeStr || typeof timeStr !== 'string') return 0;
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
          };

          const sortedActive = [...activeList].sort((a, b) => {
            const qA = typeof a.queueOrder === 'number' ? a.queueOrder : Infinity;
            const qB = typeof b.queueOrder === 'number' ? b.queueOrder : Infinity;
            if (qA !== qB) return qA - qB;

            const tA = parseTimeStr(a.appointmentTime || a.timeSlot);
            const tB = parseTimeStr(b.appointmentTime || b.timeSlot);
            if (tA !== tB) return tA - tB;

            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeA - timeB;
          });

          return (
            <div className="fade-in">
              {/* Welcome Card */}
              <div style={{ marginBottom: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Welcome back, {userData?.name ? `Dr. ${userData.name.replace(/^(?:dr\.?|doctor)\s+/i, '')}` : 'Dr. Physician'}!
                </h1>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  View your complete consultation schedule across all branches.
                </p>
              </div>

              {/* Full Width Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>

                {/* Queue Container */}
                <div>
                  {/* Summary Metric Boxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>

                    {/* Total Appointments Card */}
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', boxShadow: '0 6px 16px rgba(2, 132, 199, 0.2)', position: 'relative', overflow: 'hidden', color: '#fff' }}>
                      <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: 0.15 }}>
                        <Users size={70} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Users size={14} color="#e0f2fe" />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total Appointments</span>
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: '800', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{branchFilteredPatients.length}</div>
                    </div>

                    {/* Ongoing / Waiting Card */}
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 6px 16px rgba(14, 165, 233, 0.2)', position: 'relative', overflow: 'hidden', color: '#fff' }}>
                      <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: 0.15 }}>
                        <Clock size={70} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Clock size={14} color="#e0f2fe" />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Ongoing / Waiting</span>
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: '800', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{activeAppts.length + waitingAppts.length}</div>
                    </div>

                    {/* Completed Card */}
                    <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 6px 16px rgba(16, 185, 129, 0.2)', position: 'relative', overflow: 'hidden', color: '#fff' }}>
                      <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: 0.15 }}>
                        <Check size={70} color="#fff" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Check size={14} color="#d1fae5" />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#d1fae5', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Completed</span>
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: '800', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{completedAppts.length}</div>
                    </div>

                  </div>

                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                      <Clock size={15} color="var(--primary-color)" />
                      Consultation Queue
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Calendar Picker */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px' }}>
                        <Calendar size={16} color="var(--primary-color)" style={{ marginRight: '8px' }} />
                        <input
                          type="date"
                          value={
                            selectedCalendarDate.getFullYear() + '-' +
                            String(selectedCalendarDate.getMonth() + 1).padStart(2, '0') + '-' +
                            String(selectedCalendarDate.getDate()).padStart(2, '0')
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              const [y, m, d] = e.target.value.split('-');
                              setSelectedCalendarDate(new Date(y, m - 1, d));
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
                        />
                      </div>

                      {/* Branch Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px' }}>
                        <MapPin size={16} color="var(--primary-color)" style={{ marginRight: '8px' }} />
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', fontSize: '13px', width: '130px' }}
                        >
                          <option value="All Branches" style={{ color: '#000' }}>All Branches</option>
                          {Array.from(new Set(allDoctorPatients.map(p => normalizeBranchName(p.branchName || p.branchId)).filter(Boolean))).map(branch => (
                            <option key={branch} value={branch} style={{ color: '#000' }}>{branch}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {selectedDayPatients.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No appointments scheduled for this date.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* 1. Booked & Paid */}
                      {bookedAppts.length > 0 && (
                        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', borderTop: '3px solid #0369a1' }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ backgroundColor: '#e0f2fe', padding: '4px', borderRadius: '6px' }}><Calendar size={13} color="#0369a1" /></div>
                              Booked &amp; Paid
                            </span>
                            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 'bold' }}>{bookedAppts.length} Patients</span>
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {bookedAppts.map(p => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px -2px rgba(0,0,0,0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.5fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(140px, 2fr) minmax(100px, 1fr)', gap: '12px', flex: 1, alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', background: '#bae6fd', color: '#0369a1', padding: '3px 6px', borderRadius: '5px' }}>
                                      Q{sortedActive.findIndex(item => item.id === p.id) + 1}
                                    </span>
                                    <div>
                                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{p.fullName}</span>
                                        {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp') && (
                                          <span style={{ fontSize: '8px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 3px', borderRadius: '3px', display: 'inline-block' }}>APP</span>
                                        )}
                                        {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                                          <span style={{ fontSize: '8px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 3px', borderRadius: '3px', display: 'inline-block' }}>PKG</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{p.appointmentTime || 'N/A'}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Reg ID</div>
                                    <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: '600' }}>{p.regId || p.registrationId || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Branch</div>
                                    <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.branchName || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Subject / Complaint</div>
                                    <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.complaint || p.subject || p.symptoms || 'None'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Mobile</div>
                                    <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: '500' }}>{p.phone || 'N/A'}</div>
                                  </div>
                                </div>
                                <button onClick={() => handleStartConsultation(p)} style={{ padding: '7px 14px', backgroundColor: '#0369a1', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap', marginLeft: '12px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#075985'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}>
                                  Start Consultation
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Waiting Room */}
                      {waitingAppts.length > 0 && (
                        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderTop: '4px solid #0ea5e9' }}>
                          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ backgroundColor: '#e0f2fe', padding: '6px', borderRadius: '8px' }}><Clock size={18} color="#0ea5e9" /></div>
                              Waiting Room
                            </span>
                            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{waitingAppts.length} Patients</span>
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {waitingAppts.map(p => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 12px -3px rgba(0, 0, 0, 0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(180px, 2fr) minmax(120px, 1fr)', gap: '16px', flex: 1, alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#bae6fd', color: '#0284c7', padding: '4px 8px', borderRadius: '6px' }}>
                                      Q{sortedActive.findIndex(item => item.id === p.id) + 1}
                                    </span>
                                    <div>
                                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>{p.fullName}</span>
                                        {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp') && (
                                          <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 4px', borderRadius: '4px', display: 'inline-block' }}>APP</span>
                                        )}
                                        {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                                          <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 4px', borderRadius: '4px', display: 'inline-block' }}>PKG</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.appointmentTime || 'N/A'}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Reg ID</div>
                                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>{p.regId || p.registrationId || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Branch</div>
                                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.branchName || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Subject / Complaint</div>
                                    <div style={{ fontSize: '0.9rem', color: '#0ea5e9', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.complaint || p.subject || p.symptoms || 'None'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Mobile</div>
                                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500' }}>{p.phone || 'N/A'}</div>
                                  </div>
                                </div>
                                <button onClick={() => handleStartConsultation(p)} style={{ padding: '10px 20px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap', marginLeft: '16px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0ea5e9'}>
                                  Start Consultation
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. In Consultation */}
                      {activeAppts.length > 0 && (
                        <div style={{
                          borderRadius: '14px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 24px rgba(5,150,105,0.10)',
                          border: '1px solid rgba(52,211,153,0.25)'
                        }}>
                          {/* Section Header */}
                          <div style={{
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                            padding: '12px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {/* Pulse dot */}
                              <span style={{ position: 'relative', display: 'inline-flex' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffffff', display: 'inline-block', boxShadow: '0 0 0 0 rgba(255,255,255,0.6)', animation: 'pulse-ring 1.4s ease-out infinite' }} />
                              </span>
                              <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                In Consultation
                              </span>
                            </div>
                            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '3px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                              {activeAppts.length} {activeAppts.length === 1 ? 'Patient' : 'Patients'}
                            </span>
                          </div>

                          {/* Cards */}
                          <div style={{ background: '#f0fdf4', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeAppts.map(p => {
                              const initials = (p.fullName || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                              const qNum = sortedActive.findIndex(item => item.id === p.id) + 1;
                              return (
                                <div key={p.id} style={{
                                  background: '#ffffff',
                                  borderRadius: '12px',
                                  padding: '14px 16px',
                                  border: '1px solid #a7f3d0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '14px',
                                  boxShadow: '0 2px 10px rgba(5,150,105,0.06)',
                                  transition: 'box-shadow 0.2s',
                                }}
                                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(5,150,105,0.13)'}
                                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(5,150,105,0.06)'}
                                >
                                  {/* Queue badge */}
                                  <div style={{
                                    minWidth: '36px', height: '36px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #059669, #34d399)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(5,150,105,0.35)', flexShrink: 0
                                  }}>
                                    <span style={{ color: '#fff', fontWeight: '800', fontSize: '11px' }}>Q{qNum}</span>
                                  </div>

                                  {/* Avatar */}
                                  <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid #34d399', flexShrink: 0
                                  }}>
                                    <span style={{ fontWeight: '800', fontSize: '13px', color: '#059669' }}>{initials}</span>
                                  </div>

                                  {/* Patient info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#064e3b' }}>{p.fullName}</span>
                                      {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp') && (
                                        <span style={{ fontSize: '8px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>APP</span>
                                      )}
                                      {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                                        <span style={{ fontSize: '8px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>PKG</span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {[
                                        { label: 'ID', value: p.regId || p.registrationId || 'N/A' },
                                        { label: 'Time', value: p.appointmentTime || 'N/A' },
                                        { label: 'Branch', value: p.branchName || 'N/A' },
                                        { label: 'Complaint', value: p.complaint || p.subject || p.symptoms || 'None' },
                                      ].map(({ label, value }) => (
                                        <span key={label} style={{
                                          fontSize: '0.68rem', background: '#f0fdf4', color: '#374151',
                                          padding: '2px 8px', borderRadius: '6px', border: '1px solid #d1fae5',
                                          fontWeight: '600', whiteSpace: 'nowrap'
                                        }}>
                                          <span style={{ color: '#059669', fontWeight: '700' }}>{label}:</span> {value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Action button */}
                                  <button
                                    onClick={() => handleOpenPrescribeModal(p)}
                                    style={{
                                      padding: '9px 16px',
                                      background: 'linear-gradient(135deg, #059669, #10b981)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '9px',
                                      fontWeight: '700',
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0,
                                      boxShadow: '0 3px 12px rgba(5,150,105,0.35)',
                                      transition: 'all 0.2s',
                                      letterSpacing: '0.3px'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(5,150,105,0.45)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(5,150,105,0.35)'; }}
                                  >
                                    Finish &amp; Prescribe
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. Completed */}
                      {completedAppts.length > 0 && (
                        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderTop: '4px solid #059669' }}>
                          <h4 style={{ margin: '0 0 16px 0', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ backgroundColor: '#d1fae5', padding: '6px', borderRadius: '8px' }}><Check size={18} color="#059669" /></div>
                              Completed Consultations
                            </span>
                            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{completedAppts.length} Patients</span>
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {completedAppts.map(p => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(180px, 2fr) minmax(120px, 1fr)', gap: '16px', flex: 1, alignItems: 'center', opacity: 0.7 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div>
                                      <div style={{ fontWeight: '700', color: '#64748b', fontSize: '1.05rem', textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ textDecoration: 'line-through' }}>{p.fullName}</span>
                                        {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp') && (
                                          <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>APP</span>
                                        )}
                                        {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                                          <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>PKG</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.appointmentTime || 'N/A'}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Reg ID</div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>{p.regId || p.registrationId || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Branch</div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.branchName || 'N/A'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Subject / Complaint</div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.complaint || p.subject || p.symptoms || 'None'}</div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Mobile</div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>{p.phone || 'N/A'}</div>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#d1fae5', color: '#059669', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '16px', whiteSpace: 'nowrap' }}>
                                  <Check size={14} /> Done
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()}

        {/* TAB 1: CONSULTATION QUEUE */}
        {activeTab === 'queue' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '24px' }}>Live Queue Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
              <div>
                <h3 style={{ marginBottom: '16px' }}>Checked-in Patients ({activeQueue.length})</h3>
                {patientsLoading ? (
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>Loading queue...</div>
                ) : activeQueue.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No patients checked in for consultation today.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeQueue.map((p, index) => (
                      <div key={p.id} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', background: 'rgba(37, 142, 200, 0.1)', color: 'var(--secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                              Q{index + 1}
                            </span>
                            <span>{p.fullName}</span>
                            {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp') && (
                              <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>APP</span>
                            )}
                            {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                              <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>PKG</span>
                            )}
                          </h4>
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
                            Phone: {p.phone} | Age: {p.age || 'N/A'} | Complaint: {p.complaint || p.subject || p.symptoms || 'N/A'}
                          </p>
                        </div>
                        <div>
                          {p.status === 'waiting' || p.status === 'booked' ? (
                            <button className="btn-primary" onClick={() => handleStartConsultation(p)}>
                              Start Consult
                            </button>
                          ) : (
                            <button className="btn-secondary" style={{ border: '1px solid var(--primary-color)' }} onClick={() => handleOpenPrescribeModal(p)}>
                              Prescribe Notes
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ marginBottom: '16px' }}>Consultations Completed Today ({completedQueue.length})</h3>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {completedQueue.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>No consultations completed yet today.</p>
                  ) : (
                    completedQueue.map((p) => (
                      <div key={p.id} style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ margin: '0 0 4px 0', textDecoration: 'line-through', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ textDecoration: 'line-through' }}>{p.fullName}</span>
                          {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp') && (
                            <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>APP</span>
                          )}
                          {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                            <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 4px', borderRadius: '4px', display: 'inline-block', textDecoration: 'none' }}>PKG</span>
                          )}
                        </h4>
                        <p style={{ margin: 0, color: 'var(--primary-color)', fontSize: '12px' }}>Prescribed & Dispatched</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PATIENT DIRECTORY */}
        {activeTab === 'patients' && (
          <div className="fade-in">
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <div>
                <h2>History</h2>
                <p style={{ color: 'var(--text-muted)' }}>Yesterday & Today's Consultations</p>
              </div>
              <div style={{ position: 'relative', width: '300px' }}>
                <input
                  type="text"
                  placeholder="Search by Name or Phone..."
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.5)' }}>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    const d = new Date();
                    setHistoryDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                  }}
                  className={`btn-secondary`}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    background: historyDate === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() ? 'var(--primary-color)' : 'white',
                    color: historyDate === (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() ? 'white' : 'var(--text-main)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setHistoryDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                  }}
                  className={`btn-secondary`}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    background: historyDate === (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() ? 'var(--primary-color)' : 'white',
                    color: historyDate === (() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() ? 'white' : 'var(--text-main)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => { setHistoryDate(''); setPatientSearch(''); }}
                  className={`btn-secondary`}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    background: !historyDate ? 'var(--primary-color)' : 'white',
                    color: !historyDate ? 'white' : 'var(--text-main)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Both
                </button>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                {(historyDate || patientSearch) && (
                  <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }} onClick={() => { setHistoryDate(''); setPatientSearch(''); }}>
                    <X size={14} /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredPatientsList.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
                  <h3 style={{ color: 'var(--text-main)', margin: '0 0 8px 0' }}>No Consultations Found</h3>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Try adjusting your filters to see more history.</p>
                </div>
              ) : (
                filteredPatientsList.map(p => (
                  <div key={p.id} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer', background: 'linear-gradient(90deg, rgba(37, 142, 200, 0.05) 0%, rgba(255,255,255,0) 100%)', borderLeft: `4px solid ${p.status === 'completed' || p.status === 'done' ? '#10b981' : '#f59e0b'}` }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    onClick={() => handleOpenHistoryModal(p)}>

                    {/* Patient Info Column */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 250px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', boxShadow: '0 4px 10px rgba(37, 142, 200, 0.3)' }}>
                        {p.fullName ? p.fullName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{p.fullName}</span>
                          {(p.source === 'appointments' || p._type === 'online' || p.source === 'UserApp') && (
                            <span style={{ fontSize: '9px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>APP</span>
                          )}
                          {(p.packageId || (p.phone && activePackageMap.has(p.phone.replace(/\D/g, '').slice(-10)))) && (
                            <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '1px 4px', borderRadius: '4px', display: 'inline-block' }}>PKG</span>
                          )}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {p.phone || 'N/A'}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> Age: {p.age || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visit Info Column */}
                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="var(--primary-color)" /> {p.appointmentDate || p.dateString || 'N/A'}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#8b5cf6" /> {p.branchName || 'N/A'}
                      </div>
                    </div>

                    {/* Clinical Info Column */}
                    <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        <strong style={{ color: 'var(--text-muted)' }}>Complaint:</strong> {p.complaint || p.subject || 'N/A'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        <strong style={{ color: 'var(--text-muted)' }}>Notes:</strong> {p.prescriptionNotes || 'N/A'}
                      </div>
                    </div>

                    {/* Status & Action Column */}
                    <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', backgroundColor: p.status === 'completed' || p.status === 'done' ? '#d1fae5' : '#fef3c7', color: p.status === 'completed' || p.status === 'done' ? '#059669' : '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {p.status || 'Unknown'}
                      </span>
                      {p.followUpDate && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> F/U: {p.followUpDate}
                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PACKAGE MEMBERS */}
        {activeTab === 'packages' && (
          <div className="fade-in">
            <PackageMembers />
          </div>
        )}

        {/* TAB 4: LEAVE REQUESTS */}
        {activeTab === 'leave' && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '30px' }}>
            <div>
              <h3 style={{ marginBottom: '16px' }}>Apply For Leave</h3>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <form onSubmit={handleApplyLeave}>
                  <div className="form-group">
                    <label className="form-label">Leave Category</label>
                    <select
                      className="glass-input"
                      value={leaveForm.category}
                      onChange={e => setLeaveForm({ ...leaveForm, category: e.target.value })}
                    >
                      <option value="Casual">Casual Leave</option>
                      <option value="Sick">Sick Leave</option>
                      <option value="Earned">Earned Leave</option>
                      <option value="Other">Other Leave</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="glass-input"
                      required
                      value={leaveForm.startDate}
                      onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="glass-input"
                      required
                      value={leaveForm.endDate}
                      onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason</label>
                    <textarea
                      className="glass-input"
                      rows={3}
                      required
                      placeholder="Explain the reason for leave..."
                      value={leaveForm.reason}
                      onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submittingLeave}>
                    {submittingLeave ? 'Submitting...' : 'Submit Application'}
                  </button>
                </form>
              </div>
            </div>

            <div>
              <h3 style={{ marginBottom: '16px' }}>Leave Status History</h3>
              <div className="table-container glass-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveList.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leaves applied yet.</td>
                      </tr>
                    ) : (
                      leaveList.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.category || item.leaveType}</strong></td>
                          <td>{item.startDate} to {item.endDate}</td>
                          <td>{item.reason}</td>
                          <td>
                            <span className={`badge ${item.status === 'approved' ? 'badge-primary' : item.status === 'rejected' ? 'badge-secondary' : ''}`}>
                              {item.status?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MY ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '24px' }}>My Attendance Punch Logs</h2>
            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Date / Time</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No logs recorded.</td>
                    </tr>
                  ) : (
                    attendanceLogs.map(l => (
                      <tr key={l.id}>
                        <td>
                          <span className={`badge ${l.action === 'login' ? 'badge-primary' : 'badge-secondary'}`}>
                            {l.action?.toUpperCase() === 'LOGIN' ? 'PUNCH IN' : 'PUNCH OUT'}
                          </span>
                        </td>
                        <td>{l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString('en-IN') : 'N/A'}</td>
                        <td>{l.device || 'Mobile App'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: MY PAYSLIPS */}
        {activeTab === 'payslips' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '24px' }}>My Payslip History</h2>
            <div className="table-container glass-panel">
              <table>
                <thead>
                  <tr>
                    <th>Month / Year</th>
                    <th>Base Salary</th>
                    <th>Bonus</th>
                    <th>Deductions</th>
                    <th>Net Paid</th>
                    <th>Date Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No payslips generated.</td>
                    </tr>
                  ) : (
                    payslips.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.month} {p.year}</strong></td>
                        <td>₹{p.amount?.toLocaleString('en-IN')}</td>
                        <td>₹{p.bonus?.toLocaleString('en-IN')}</td>
                        <td>₹{p.deductions?.toLocaleString('en-IN')}</td>
                        <td style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>₹{p.netSalary?.toLocaleString('en-IN')}</td>
                        <td>{p.amountDate || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '24px' }}>System Notifications</h2>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>No notifications found.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                    <h4 style={{ margin: '0 0 4px 0' }}>{n.title}</h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>{n.body}</p>
                    <small style={{ color: 'rgba(255,255,255,0.3)' }}>{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString('en-IN') : 'N/A'}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 8: NUTRITION */}
        {activeTab === 'nutrition' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Nutrition & Diet Planning</h2>
              <div className="tab-buttons-container" style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={`btn-primary ${activeTabNutritionPlan === 'add' ? '' : 'btn-secondary'}`}
                  onClick={() => setActiveTabNutritionPlan('add')}
                  style={{ background: activeTabNutritionPlan === 'add' ? 'var(--primary-color)' : 'transparent', color: activeTabNutritionPlan === 'add' ? '#fff' : 'var(--text-main)', border: activeTabNutritionPlan === 'add' ? 'none' : '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  Create New Plan
                </button>
                <button
                  className={`btn-primary ${activeTabNutritionPlan === 'list' ? '' : 'btn-secondary'}`}
                  onClick={() => setActiveTabNutritionPlan('list')}
                  style={{ background: activeTabNutritionPlan === 'list' ? 'var(--primary-color)' : 'transparent', color: activeTabNutritionPlan === 'list' ? '#fff' : 'var(--text-main)', border: activeTabNutritionPlan === 'list' ? 'none' : '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  View Past Plans
                </button>
              </div>
            </div>

            {activeTabNutritionPlan === 'add' ? (
              <div className="glass-panel" style={{ padding: '24px' }}>
                {/* Search Patient */}
                <div style={{ marginBottom: '24px' }}>
                  <label className="form-label">Search Patient (Name or Mobile)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="glass-input"
                      placeholder="Type patient name or 10-digit phone number..."
                      value={nutritionSearch}
                      onChange={(e) => {
                        setNutritionSearch(e.target.value);
                        if (!e.target.value.trim()) {
                          setNutritionPatient(null);
                        }
                      }}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', outline: 'none' }}
                    />
                  </div>
                  {nutritionSearch.trim() && !nutritionPatient && (
                    <div style={{
                      backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)',
                      marginTop: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px', zIndex: 100, position: 'absolute', width: '90%'
                    }}>
                      {patientsList.filter(p =>
                        (p.fullName && p.fullName.toLowerCase().includes(nutritionSearch.toLowerCase())) ||
                        (p.phone && p.phone.includes(nutritionSearch.trim()))
                      ).slice(0, 10).map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setNutritionPatient(p);
                            setNutritionSearch(p.fullName + " (" + p.phone + ")");
                            setNutritionAge(p.age || '30');
                            setNutritionHeight(p.height || '');
                            setNutritionWeight(p.weight || '');
                          }}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: '#000' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {p.fullName} - {p.phone} ({p.registrationId || 'Walk-in'})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {nutritionPatient ? (
                  <form onSubmit={handleSaveNutritionPlan}>
                    {/* Patient Summary Header */}
                    <div style={{ backgroundColor: 'rgba(37, 142, 200, 0.05)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '24px', backgroundColor: 'var(--primary-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                        {nutritionPatient.fullName?.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>{nutritionPatient.fullName}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                          Mobile: {nutritionPatient.phone} | Reg ID: {nutritionPatient.registrationId || 'Walk-in'}
                        </p>
                      </div>
                    </div>

                    {/* Vitals Form */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
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
                          placeholder="e.g. 170"
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
                          placeholder="e.g. 70"
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
                        <label className="form-label">Plan Fee (₹)</label>
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
                    <div style={{ marginBottom: '24px' }}>
                      <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Deficiencies (Select all that apply)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
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
                                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
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
                    <div style={{ marginBottom: '24px' }}>
                      <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Common Health Disorders</label>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                      <div className="form-group">
                        <label className="form-label">Other Diseases / Disorders</label>
                        <textarea
                          className="glass-input"
                          rows={2}
                          value={nutritionOtherDiseases}
                          onChange={(e) => setNutritionOtherDiseases(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Signs & Symptoms</label>
                        <textarea
                          className="glass-input"
                          rows={2}
                          value={nutritionSymptoms}
                          onChange={(e) => setNutritionSymptoms(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Foods to Eat & Avoid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: '#10b981', fontWeight: 'bold' }}>Foods to Eat (Default pre-filled, editable)</label>
                        <textarea
                          className="glass-input"
                          rows={4}
                          value={nutritionEat}
                          onChange={(e) => setNutritionEat(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ color: '#ef4444', fontWeight: 'bold' }}>Foods to Avoid (Default pre-filled, editable)</label>
                        <textarea
                          className="glass-input"
                          rows={4}
                          value={nutritionAvoid}
                          onChange={(e) => setNutritionAvoid(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 30-Day Diet Plan Table */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={18} color="var(--primary-color)" />
                          30-Day Diet Plan Table (Edit any meal directly)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingMealsModalOpen(true)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          <Maximize2 size={14} /> Expand / Edit Popup
                        </button>
                      </h4>
                      <div className="table-container glass-panel" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '60px', fontSize: '11px', padding: '8px 6px' }}>Day</th>
                              <th style={{ fontSize: '11px', padding: '8px 6px' }}>Breakfast</th>
                              <th style={{ fontSize: '11px', padding: '8px 6px' }}>Lunch</th>
                              <th style={{ fontSize: '11px', padding: '8px 6px' }}>Snacks</th>
                              <th style={{ fontSize: '11px', padding: '8px 6px' }}>Dinner</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nutritionMeals.map(meal => (
                              <tr key={meal.dayNumber}>
                                <td style={{ textAlign: 'center', padding: '4px' }}><strong style={{ fontSize: '11px' }}>Day {meal.dayNumber}</strong></td>
                                <td style={{ padding: '4px' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{ border: 'none', background: 'transparent', padding: '4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.3', display: 'block', margin: 0 }}
                                    value={meal.breakfast}
                                    onChange={(e) => handleMealCellChange(meal.dayNumber, 'breakfast', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{ border: 'none', background: 'transparent', padding: '4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.3', display: 'block', margin: 0 }}
                                    value={meal.lunch}
                                    onChange={(e) => handleMealCellChange(meal.dayNumber, 'lunch', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{ border: 'none', background: 'transparent', padding: '4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.3', display: 'block', margin: 0 }}
                                    value={meal.snacks}
                                    onChange={(e) => handleMealCellChange(meal.dayNumber, 'snacks', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px' }}>
                                  <textarea
                                    className="glass-input"
                                    style={{ border: 'none', background: 'transparent', padding: '4px', fontSize: '11px', color: 'var(--text-main)', width: '100%', outline: 'none', resize: 'none', height: '48px', lineHeight: '1.3', display: 'block', margin: 0 }}
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
                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }} disabled={submittingNutrition}>
                      {submittingNutrition ? 'Saving Diet Plan...' : 'Save & Issue 30-Day Diet Plan'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '40px 0' }}>Please select a patient using the search field above to create a diet plan.</p>
                )}
              </div>
            ) : (
              /* View Past Nutrition Plans */
              <div className="table-container glass-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Mobile</th>
                      <th>BMI</th>
                      <th>Deficiencies & Disorders</th>
                      <th>Fee</th>
                      <th>Billing Status</th>
                      <th>Duration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allNutritionPlans.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No diet plans created yet.</td>
                      </tr>
                    ) : (
                      allNutritionPlans.map(plan => (
                        <tr key={plan.id}>
                          <td><strong>{plan.patientName}</strong></td>
                          <td>{plan.patientPhone}</td>
                          <td>{plan.bmi}</td>
                          <td>
                            {plan.deficiencies?.join(", ") || 'None'}
                            {plan.disorders?.sugar && <span className="badge badge-secondary" style={{ marginLeft: '4px', background: '#d97706' }}>Sugar</span>}
                            {plan.disorders?.bp && <span className="badge badge-secondary" style={{ marginLeft: '4px', background: '#2563eb' }}>BP</span>}
                            {plan.disorders?.thyroid && <span className="badge badge-secondary" style={{ marginLeft: '4px', background: '#7c3aed' }}>Thyroid</span>}
                          </td>
                          <td>₹{plan.amount}</td>
                          <td>
                            <span className={`badge ${plan.paymentStatus === 'paid' ? 'badge-primary' : 'badge-secondary'}`} style={{ backgroundColor: plan.paymentStatus === 'paid' ? '#059669' : '#4b5563' }}>
                              {plan.paymentStatus?.toUpperCase()}
                            </span>
                          </td>
                          <td>{plan.startDate} to {plan.expiryDate}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => setSelectedViewPlan(plan)}
                              >
                                View Diet Grid
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGenerateAndShareDietPDF(plan)}
                                className="btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px', background: '#3b82f6', borderColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}
                                disabled={generatingPdfId === plan.id}
                              >
                                {generatingPdfId === plan.id ? '⏳...' : '📄'} {plan.pdfUrl ? 'Share Diet PDF' : 'Gen & Share PDF'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Full-Screen Consultation Page View (Not a modal) */}
      {selectedPatient && (
        <main className="main-content fade-in" style={{ padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
          {/* Top Navbar for Consultation */}
          <div style={{ padding: '16px 32px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setSelectedPatient(null)}
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
                <ChevronLeft size={16} /> Go Back to Dashboard
              </button>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>Active Consultation</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>Dr. {userData?.name || 'S.A Rahman'}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Doctor</div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#fbeafa', color: '#d946ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                {userData?.name?.charAt(0) || 'D'}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px', fontFamily: '"Inter", "Roboto", sans-serif' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '40px', maxWidth: '1200px', margin: '0 auto' }}>

                {/* Left Column: Patient Profile & History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Main Profile Card */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>

                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{selectedPatient.fullName}</span>
                        {(selectedPatient.source === 'appointments' || selectedPatient._type === 'online' || selectedPatient.source === 'UserApp') && (
                          <span style={{ fontSize: '10px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '800' }}>APP</span>
                        )}
                        {(selectedPatient.packageId || (selectedPatient.phone && activePackageMap.has(selectedPatient.phone.replace(/\D/g, '').slice(-10)))) && (
                          <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '800' }}>PKG</span>
                        )}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={16} color="#64748b" /> {selectedPatient.phone || 'N/A'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MapPin size={16} color="#64748b" /> {selectedPatient.branchName || 'N/A'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '4px' }}>
                          <Clipboard size={16} color="#258ec8" style={{ marginTop: '2px' }} />
                          <span style={{ color: '#0f172a', fontWeight: '600' }}>Subject: {selectedPatient.complaint || selectedPatient.subject || selectedPatient.symptoms || 'No specific subject'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Package Member Box */}
                    {(selectedPatient.packageId || (selectedPatient.phone && activePackageMap.has(selectedPatient.phone.replace(/\D/g, '').slice(-10)))) ? (
                      <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ backgroundColor: '#258ec8', borderRadius: '6px', padding: '6px' }}><Award size={16} color="#fff" /></div>
                            <span style={{ fontWeight: '700', color: '#258ec8', fontSize: '14px' }}>Package Member</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Duration</div>
                            <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '700' }}>{patientPackage?.startDate || 'N/A'} to {patientPackage?.endDate || 'N/A'}</div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Package</div>
                            <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>₹{patientPackage?.totalAmount || 0}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: '700', textTransform: 'uppercase' }}>Paid So Far</div>
                            <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: '800' }}>₹{patientPackage?.paidAmount || 0}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700', textTransform: 'uppercase' }}>Pending Pay</div>
                            <div style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '800' }}>₹{patientPackage?.balanceAmount || 0}</div>
                          </div>
                        </div>

                        <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                          Patient can pay installments at the reception anytime.
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '24px' }}>
                        {!showPackageForm ? (
                          <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>No active package.</div>
                            <button onClick={() => setShowPackageForm(true)} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#258ec8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                              <Plus size={14} /> Add Package Member
                            </button>
                          </div>
                        ) : (
                          <div style={{ backgroundColor: '#f0f9ff', borderRadius: '12px', padding: '16px', border: '1px solid #bae6fd' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <h4 style={{ margin: 0, fontSize: '14px', color: '#0369a1', fontWeight: '700' }}>Register Package</h4>
                              <button onClick={() => setShowPackageForm(false)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase' }}>Total Value (₹)</label>
                                <input type="number" placeholder="Amount" value={newPackageAmount} onChange={(e) => setNewPackageAmount(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bae6fd', outline: 'none', marginTop: '4px' }} />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase' }}>Start Date</label>
                                  <input type="date" value={newPackageStartDate} onChange={(e) => setNewPackageStartDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bae6fd', outline: 'none', marginTop: '4px' }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase' }}>End Date</label>
                                  <input type="date" value={newPackageEndDate} onChange={(e) => setNewPackageEndDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bae6fd', outline: 'none', marginTop: '4px' }} />
                                </div>
                              </div>
                              <button onClick={handleAddPackage} disabled={savingPackage} style={{ backgroundColor: '#0ea5e9', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '700', marginTop: '8px', cursor: 'pointer' }}>
                                {savingPackage ? 'Saving...' : 'Add Package'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Medical History Card */}
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

                </div>

                {/* Right Column: Digital Prescription Form & Diet Plan Tabs */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Tab Selector */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setConsultationSubTab('clinical')}
                      style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: consultationSubTab === 'clinical' ? 'var(--primary-color)' : '#64748b',
                        border: 'none',
                        borderBottom: consultationSubTab === 'clinical' ? '2px solid var(--primary-color)' : '2px solid transparent',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Clipboard size={16} /> Clinical Prescription
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConsultationSubTab('nutrition');
                        setNutritionPatient(selectedPatient);
                        setNutritionAge(selectedPatient.age || '30');
                        setNutritionHeight(selectedPatient.height || '');
                        setNutritionWeight(selectedPatient.weight || '');
                      }}
                      style={{
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: consultationSubTab === 'nutrition' ? '#10b981' : '#64748b',
                        border: 'none',
                        borderBottom: consultationSubTab === 'nutrition' ? '2px solid #10b981' : '2px solid transparent',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Apple size={16} /> Nutrition & Diet Plan
                    </button>
                  </div>

                  {consultationSubTab === 'clinical' ? (
                    <form onSubmit={handleSavePrescription} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                      <div>
                        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>Digital Prescription</h3>

                        <div style={{ marginBottom: '24px' }}>
                          <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '12px' }}>Diagnosis Notes</label>
                          <textarea
                            required
                            placeholder="Enter detailed clinical notes and diagnosis..."
                            value={prescriptionText}
                            onChange={(e) => setPrescriptionText(e.target.value)}
                            style={{ width: '100%', height: '140px', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', padding: '16px', borderRadius: '8px', fontFamily: 'inherit', fontSize: '14px', resize: 'none', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}
                            onFocus={(e) => e.target.style.borderColor = '#258ec8'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                          />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Medicines</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Duration for all:</label>
                                <input list="global-duration-options" type="text" placeholder="e.g. 5 Days" value={globalDuration} onChange={(e) => setGlobalDuration(e.target.value)} style={{ width: '120px', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', outline: 'none', color: '#1e293b' }} />
                                <datalist id="global-duration-options" style={{ display: 'none' }}>
                                  <option value="3 Days" />
                                  <option value="5 Days" />
                                  <option value="1 Week" />
                                  <option value="15 Days" />
                                  <option value="1 Month" />
                                  <option value="2 Months" />
                                  <option value="3 Months" />
                                  <option value="4 Months" />
                                  <option value="5 Months" />
                                  <option value="6 Months" />
                                </datalist>
                              </div>
                            </div>
                            <button type="button" onClick={() => { setMedicines([...medicines, { name: '', type: 'Tablet', timing: '1-0-1 (Morning, Night)' }]); }} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                              <Plus size={14} color="#258ec8" /> Add Row
                            </button>
                          </div>

                          {medicines.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '12px', marginBottom: '8px', paddingLeft: '4px' }}>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Medicine Name</div>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Type</div>
                              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Dosage</div>
                              <div></div>
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {medicines.map((med, index) => (
                              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '12px', alignItems: 'center' }}>
                                <div>
                                  <input type="text" placeholder="Name..." value={med.name} onChange={(e) => { const newMeds = [...medicines]; newMeds[index].name = e.target.value; setMedicines(newMeds); }} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }} />
                                </div>
                                <div>
                                  <select value={med.type} onChange={(e) => { const newMeds = [...medicines]; newMeds[index].type = e.target.value; setMedicines(newMeds); }} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }}>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Drops">Drops</option>
                                    <option value="Syrup">Syrup</option>
                                    <option value="Ointment">Ointment</option>
                                  </select>
                                </div>
                                <div>
                                  <select value={med.timing} onChange={(e) => { const newMeds = [...medicines]; newMeds[index].timing = e.target.value; setMedicines(newMeds); }} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }}>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Draw Prescription (Optional)</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="button" onClick={() => setDrawingMode('pen')} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '600', color: drawingMode === 'pen' ? '#fff' : '#475569', backgroundColor: drawingMode === 'pen' ? '#298FCA' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Pen size={14} /> Pen
                              </button>
                              <button type="button" onClick={() => setDrawingMode('eraser')} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '600', color: drawingMode === 'eraser' ? '#fff' : '#475569', backgroundColor: drawingMode === 'eraser' ? '#ef4444' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Eraser size={14} /> Eraser
                              </button>
                              <button type="button" onClick={() => { if(sigCanvas.current) sigCanvas.current.clear(); }} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '600', color: '#64748b', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={14} /> Clear
                              </button>
                              <button type="button" onClick={handleSaveDrawing} disabled={isSavingDrawing} style={{ padding: '6px 12px', fontSize: '13px', fontWeight: '600', color: '#fff', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: isSavingDrawing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: isSavingDrawing ? 0.7 : 1 }}>
                                <Save size={14} /> {isSavingDrawing ? 'Saving...' : 'Save Drawing'}
                              </button>
                            </div>
                          </div>
                          <div style={{ border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', position: 'relative' }}>
                            <SignatureCanvas 
                              ref={sigCanvas}
                              penColor={drawingMode === 'eraser' ? '#ffffff' : '#0f172a'}
                              minWidth={drawingMode === 'eraser' ? 15 : 1}
                              maxWidth={drawingMode === 'eraser' ? 20 : 2.5}
                              canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '350px', backgroundColor: '#fff', cursor: drawingMode === 'eraser' ? 'cell' : 'crosshair', display: 'block' } }}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Physical Prescription (Optional)</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf"
                              onChange={(e) => setPrescriptionFiles(Array.from(e.target.files))}
                              style={{
                                fontSize: '13px',
                                color: '#475569',
                                backgroundColor: '#f8fafc',
                                padding: '8px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                width: '100%',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Upload one or multiple photos of the handwritten prescription. {prescriptionFiles.length > 0 && <strong style={{ color: '#0ea5e9' }}>{prescriptionFiles.length} file(s) selected.</strong>}</div>
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
                          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Amount Fee (₹)</h3>
                          <input type="number" required placeholder="Enter amount fee..." value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} style={{ width: '100%', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '24px' }} />
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="submit" style={{ padding: '14px 32px', fontSize: '15px', fontWeight: '700', borderRadius: '8px', backgroundColor: '#258ec8', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(37, 142, 200, 0.2)' }} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Submit Consultation'}
                          </button>
                        </div>

                      </div>
                    </form>
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
                          <label className="form-label">Plan Fee (₹)</label>
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
                        {submittingNutrition ? 'Saving Diet Plan...' : 'Save & Issue 30-Day Diet Plan'}
                      </button>
                    </form>
                  )}
                </div>

              </div>
            </div>
          </div>
        </main>
      )}

      {/* Patient History Modal */}
      {selectedHistoryPatient && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedHistoryPatient(null)}>
          <div className="glass-panel slide-in" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', position: 'relative', background: '#fff' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedHistoryPatient(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px', boxShadow: '0 4px 10px rgba(37, 142, 200, 0.3)' }}>
                {selectedHistoryPatient.fullName ? selectedHistoryPatient.fullName.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', color: 'var(--text-main)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{selectedHistoryPatient.fullName}</span>
                  {(selectedHistoryPatient.source === 'appointments' || selectedHistoryPatient._type === 'online' || selectedHistoryPatient.source === 'UserApp') && (
                    <span style={{ fontSize: '10px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '800' }}>APP</span>
                  )}
                  {(selectedHistoryPatient.packageId || (selectedHistoryPatient.phone && activePackageMap.has(selectedHistoryPatient.phone.replace(/\D/g, '').slice(-10)))) && (
                    <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', fontWeight: '800' }}>PKG</span>
                  )}
                </h2>
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {selectedHistoryPatient.phone || 'N/A'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> Age: {selectedHistoryPatient.age || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Nutrition & Diet Plans Section */}
            <div style={{ marginBottom: '24px', background: 'rgba(37, 142, 200, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Apple size={18} color="var(--primary-color)" /> Prescribed Diet Plans
              </h3>
              {loadingHistoryVisits ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading diet plans...</div>
              ) : historyPatientNutritionPlans.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom diet plans prescribed for this patient.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {historyPatientNutritionPlans.map(plan => (
                    <div key={plan.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>₹{plan.amount} Plan</span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: plan.paymentStatus === 'paid' ? '#d1fae5' : '#fee2e2',
                          color: plan.paymentStatus === 'paid' ? '#059669' : '#ef4444'
                        }}>
                          {plan.paymentStatus?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        By {plan.doctorName} on {plan.startDate || 'N/A'}
                      </div>
                      {plan.deficiencies && plan.deficiencies.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Deficiencies: {plan.deficiencies.join(', ')}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', margin: 0 }}
                          onClick={() => setSelectedViewPlan(plan)}
                        >
                          View Diet Grid
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={generatingPdfId === plan.id}
                          style={{ padding: '4px 8px', fontSize: '11px', background: '#3b82f6', borderColor: '#3b82f6', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '2px' }}
                          onClick={() => handleGenerateAndShareDietPDF(plan)}
                        >
                          {generatingPdfId === plan.id ? '⏳' : '📄'} {plan.pdfUrl ? 'PDF' : 'Gen PDF'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--primary-color)" /> Full Patient History
            </h3>

            {loadingHistoryVisits ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading past visits...</div>
            ) : historyPatientVisits.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-light)', borderRadius: '12px' }}>No past visits found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {historyPatientVisits.map((v, idx) => (
                  <div key={v.id} style={{ padding: '20px', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ background: 'var(--primary-color)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Visit {historyPatientVisits.length - idx}</span>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontSize: '15px' }}><Calendar size={14} /> {v.appointmentDate || v.dateString || 'Unknown Date'}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {v.branchName || 'N/A'}</span>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', backgroundColor: v.status === 'completed' || v.status === 'done' ? '#d1fae5' : '#f1f5f9', color: v.status === 'completed' || v.status === 'done' ? '#059669' : '#64748b', textTransform: 'uppercase' }}>{v.status || 'Unknown'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Chief Complaint</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{v.complaint || v.subject || 'N/A'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Doctor Consulted</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> {v.doctor || v.doctorName || 'N/A'}</div>
                      </div>
                    </div>

                    <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Prescription Notes</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{v.prescriptionNotes || v.diagnosisNotes || 'No notes provided.'}</div>
                    </div>

                    {v.medicines && v.medicines.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Medicines</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {v.medicines.map((m, mIdx) => (
                            <div key={mIdx} style={{ fontSize: '13px', background: '#fff', padding: '8px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                              <span><strong>{m.name}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({m.type})</span></span>
                              <span>{m.timing} {m.duration && <span style={{ color: 'var(--text-muted)' }}>({m.duration})</span>}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {v.followUpDate && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} /> Recommended Follow-up: {v.followUpDate}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected View Plan Modal */}
      {selectedViewPlan && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedViewPlan(null)}>
          <div className="glass-panel slide-in" style={{ width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: '30px 30px 30px 15px', position: 'relative', background: '#fff' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedViewPlan(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '20px', color: 'var(--text-main)' }}>30-Day Diet Plan for {selectedViewPlan.patientName}</h2>

            {/* Plan Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div><strong>Age:</strong> {selectedViewPlan.age} yrs</div>
              <div><strong>Height / Weight:</strong> {selectedViewPlan.height} cm / {selectedViewPlan.weight} kg</div>
              <div><strong>BMI:</strong> {selectedViewPlan.bmi}</div>
              <div><strong>Fee / Status:</strong> ₹{selectedViewPlan.amount} ({selectedViewPlan.paymentStatus?.toUpperCase()})</div>
              <div><strong>Duration:</strong> {selectedViewPlan.startDate} to {selectedViewPlan.expiryDate}</div>
            </div>

            {/* Eat / Avoid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                <h4 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>Foods to Avoid</h4>
                <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-line', color: 'var(--text-main)' }}>{selectedViewPlan.foodsToAvoid || 'None specified.'}</p>
              </div>
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                <h4 style={{ color: '#16a34a', margin: '0 0 8px 0' }}>Foods to Eat</h4>
                <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-line', color: 'var(--text-main)' }}>{selectedViewPlan.foodsToEat || 'None specified.'}</p>
              </div>
            </div>

            {/* Meals Grid */}
            <h3 style={{ marginBottom: '12px' }}>Diet Schedule</h3>
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr style={{ background: 'var(--bg-main)' }}>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', width: '60px' }}>Day</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Breakfast</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Lunch</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Snacks</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedViewPlan.meals?.map((m) => (
                    <tr key={m.dayNumber}>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: '11px', textAlign: 'center', color: 'var(--text-main)' }}>Day {m.dayNumber}</td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-main)', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{m.breakfast}</td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-main)', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{m.lunch}</td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-main)', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{m.snacks}</td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-main)', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{m.dinner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className="btn-primary"
                style={{ padding: '10px 24px' }}
                onClick={() => setSelectedViewPlan(null)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen / Wide Edit Diet Meals Modal */}
      {isEditingMealsModalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setIsEditingMealsModalOpen(false)}>
          <div className="glass-panel slide-in" style={{ width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: '30px 30px 30px 15px', position: 'relative', background: '#fff' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsEditingMealsModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-light)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Apple size={24} color="var(--primary-color)" />
              Edit 30-Day Diet Plan Table for {nutritionPatient?.fullName || 'Patient'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              You can view and edit any meal cell in the grid below. All changes will be saved to the active plan.
            </p>

            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr style={{ background: 'var(--bg-main)' }}>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', width: '70px', textAlign: 'center' }}>Day</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Breakfast</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Lunch</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Snacks</th>
                    <th style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {nutritionMeals.map((meal) => (
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
                          value={meal.breakfast}
                          onChange={(e) => handleMealCellChange(meal.dayNumber, 'breakfast', e.target.value)}
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
                          value={meal.lunch}
                          onChange={(e) => handleMealCellChange(meal.dayNumber, 'lunch', e.target.value)}
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
                          value={meal.snacks}
                          onChange={(e) => handleMealCellChange(meal.dayNumber, 'snacks', e.target.value)}
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
                          value={meal.dinner}
                          onChange={(e) => handleMealCellChange(meal.dayNumber, 'dinner', e.target.value)}
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
                Done / Save Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {successToast && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          backgroundColor: '#059669',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)',
          fontSize: '14px',
          fontWeight: '600',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideInFromRight 0.3s ease',
          maxWidth: '400px'
        }}>
          {successToast}
        </div>
      )}

    </div>
  );
};

export default DoctorDashboard;
