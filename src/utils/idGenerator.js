import { db } from '../firebase';
import { doc, runTransaction } from 'firebase/firestore';

export const getBranchShortcut = (branchNameOrId) => {
  const normalized = (branchNameOrId || 'UNKNOWN').toUpperCase();
  if (normalized.includes('KPHB') || normalized.includes('KPHP')) return 'KPHP';
  if (normalized.includes('CHANDNAGAR') || normalized.includes('CHN')) return 'CHN';
  if (normalized.includes('NALLAGANDLA') || normalized.includes('NLG')) return 'NLG';
  if (normalized.includes('DILSHUKNAGAR') || normalized.includes('DSN')) return 'DSN';
  return normalized.substring(0, 4).replace(/[^A-Z]/g, '') || 'GEN';
};

export const generateRegistrationId = async (branchNameOrId) => {
  const shortcut = getBranchShortcut(branchNameOrId);
  const counterRef = doc(db, 'counters', `registration_${shortcut}`);

  try {
    const newId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;

      if (counterDoc.exists()) {
        newCount = (counterDoc.data().count || 0) + 1;
        transaction.update(counterRef, { count: newCount });
      } else {
        transaction.set(counterRef, { count: newCount });
      }

      return newCount;
    });

    const formattedCount = String(newId).padStart(3, '0');
    return `SPH${shortcut}-${formattedCount}`;
  } catch (error) {
    console.error("Error generating registration ID: ", error);
    // Fallback if transaction fails
    const fallbackCount = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `SPH${shortcut}-FB${fallbackCount}`;
  }
};
