const fs = require('fs');
const file = 'src/pages/reception/ReceptionDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Inject States
const statesToInject = `
  const [nutritionDeficiencies, setNutritionDeficiencies] = useState([]);
  const [nutritionDisorders, setNutritionDisorders] = useState({ sugar: false, bp: false, thyroid: false });
  const [nutritionOtherDiseases, setNutritionOtherDiseases] = useState('');
  const [nutritionSymptoms, setNutritionSymptoms] = useState('');
  const [nutritionAvoid, setNutritionAvoid] = useState('');
  const [nutritionEat, setNutritionEat] = useState('');
  const [nutritionMeals, setNutritionMeals] = useState([]);
  const [submittingNutrition, setSubmittingNutrition] = useState(false);
`;
content = content.replace(
  "const [savingDietPlan, setSavingDietPlan] = useState(false);",
  "const [savingDietPlan, setSavingDietPlan] = useState(false);\n" + statesToInject
);

// 2. Inject Form
const placeholder = `                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      Nutrition & Diet Plan functionality is currently disabled for reception staff.
                    </div>
                  )}`;
const docContent = fs.readFileSync('src/pages/doctor/DoctorDashboard.jsx', 'utf8');
const formContentMatch = docContent.split("                  ) : (")[1];
if (formContentMatch) {
  const formContent = formContentMatch.split("                  )}")[0] + "                  )}";
  content = content.replace(placeholder, "                  ) : (\n" + formContent);
} else {
  console.log("Could not extract form content from DoctorDashboard.jsx");
}

// 3. Inject handlers and useEffects
const effectsAndHandlers = `
  useEffect(() => {
    let avoid = "";
    let eat = "";
    if (nutritionDisorders.sugar) {
      avoid += "Sugar, Sweets, Jaggery, Honey, Fruit juices, Maida, White rice, Potatoes.\\n";
      eat += "Millets, Brown rice, Oats, High fiber vegetables, Bitter gourd, Fenugreek.\\n";
    }
    if (nutritionDisorders.bp) {
      avoid += "Excess salt, Pickles, Papads, Processed foods, Canned soups, Salty snacks.\\n";
      eat += "Bananas, Spinach, Beetroot, Citrus fruits, Garlic, Potassium-rich foods.\\n";
    }
    if (nutritionDisorders.thyroid) {
      avoid += "Cabbage, Cauliflower, Broccoli, Soy products, Processed meats.\\n";
      eat += "Brazil nuts, Seaweed, Eggs, Fish, Dairy products, Lean proteins.\\n";
    }

    if (nutritionDeficiencies.includes("Iron")) {
      eat += "Spinach, Liver, Red meat, Legumes, Pumpkin seeds, Quinoa.\\n";
    }
    if (nutritionDeficiencies.includes("Calcium")) {
      eat += "Milk, Cheese, Yogurt, Sardines, Almonds, Leafy greens.\\n";
    }
    if (nutritionDeficiencies.includes("Vitamin D")) {
      eat += "Fatty fish, Egg yolks, Fortified foods, Mushrooms.\\n";
    }
    if (nutritionDeficiencies.includes("Vitamin C")) {
      eat += "Citrus fruits, Bell peppers, Strawberries, Tomatoes, Broccoli.\\n";
    }
    if (nutritionDeficiencies.includes("Vitamin A")) {
      eat += "Carrots, Sweet potatoes, Spinach, Liver, Cantaloupe.\\n";
    }
    if (nutritionDeficiencies.includes("Vitamin B")) {
      eat += "Whole grains, Meat, Eggs, Legumes, Seeds, Nuts.\\n";
    }
    if (nutritionDeficiencies.includes("Vitamin E")) {
      eat += "Sunflower seeds, Almonds, Spinach, Avocados, Squash.\\n";
    }
    if (nutritionDeficiencies.includes("Vitamin K")) {
      eat += "Kale, Spinach, Broccoli, Brussels sprouts, Cabbage.\\n";
    }
    if (nutritionDeficiencies.includes("Potassium")) {
      eat += "Bananas, Oranges, Cantaloupe, Honeydew, Apricots, Grapefruit.\\n";
    }
    if (nutritionDeficiencies.includes("Magnesium")) {
      eat += "Dark chocolate, Avocados, Nuts, Legumes, Tofu, Seeds.\\n";
    }
    if (nutritionDeficiencies.includes("Zinc")) {
      eat += "Meat, Shellfish, Legumes, Seeds, Nuts, Dairy, Eggs.\\n";
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
        doctorId: user?.uid || 'reception',
        doctorName: userData?.name || 'Reception',
        branchId: selectedPatientFile.branchId || userData?.branchId || 'KPHB',
        branchName: selectedPatientFile.branchName || userData?.branchName || 'KPHB Branch',
        meals: nutritionMeals,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'nutrition_plans'), planData);

      const targetUserId = selectedPatientFile.id || selectedPatientFile.patientId;
      await addDoc(collection(db, 'notifications'), {
        userId: targetUserId,
        title: '🥦 30-Day Nutrition Plan Issued!',
        body: \`A custom 30-day diet plan has been issued. Complete the payment of ₹\${nutritionAmount} at the reception to unlock the plan.\`,
        type: 'payment_requested',
        isRead: false,
        createdAt: serverTimestamp()
      });

      alert('Diet Plan created successfully!');
      
      setNutritionAge('');
      setNutritionHeight('');
      setNutritionWeight('');
      setNutritionBmi(0);
      setNutritionDeficiencies([]);
      setNutritionDisorders({ sugar: false, bp: false, thyroid: false });
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
`;

content = content.replace(
  "  const handleFollowUpIntervalChange = (val) => {",
  effectsAndHandlers + "\n\n  const handleFollowUpIntervalChange = (val) => {"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Nutrition UI successfully injected!');
