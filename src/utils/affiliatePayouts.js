import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { toast } from 'react-hot-toast';

const storage = getStorage();

/**
 * Upload invoice PDF to Firebase Storage
 */
export const uploadInvoicePDF = async (file, affiliateId, invoiceNumber) => {
  try {
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('Endast PDF-filer är tillåtna för fakturor');
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Fakturafilen är för stor (max 10MB)');
    }

    // Create storage reference
    const timestamp = Date.now();
    const fileName = `invoice_${invoiceNumber}_${timestamp}.pdf`;
    const storageRef = ref(storage, `affiliates/${affiliateId}/invoices/${fileName}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      fileName: fileName,
      size: file.size
    };
  } catch (error) {
    console.error('Error uploading invoice:', error);
    throw error;
  }
};

/**
 * Process affiliate payout
 */
export const processAffiliatePayout = async (affiliateId, payoutData) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      // Get current affiliate data
      const affiliateRef = doc(db, 'affiliates', affiliateId);
      const affiliateDoc = await transaction.get(affiliateRef);
      
      if (!affiliateDoc.exists()) {
        throw new Error('Affiliate hittades inte');
      }

      const affiliateData = affiliateDoc.data();
      const currentStats = affiliateData.stats || {};
      const currentBalance = currentStats.balance || 0;

      // Validate payout amount
      if (payoutData.payoutAmount > currentBalance) {
        throw new Error('Utbetalningsbeloppet kan inte vara större än nuvarande saldo');
      }

      // Create payout record
      const payoutRecord = {
        affiliateId: affiliateId,
        affiliateCode: affiliateData.affiliateCode,
        payoutAmount: payoutData.payoutAmount,
        invoiceNumber: payoutData.invoiceNumber,
        invoiceUrl: payoutData.invoiceUrl,
        invoiceFileName: payoutData.invoiceFileName,
        payoutDate: Timestamp.now(),
        notes: payoutData.notes || '',
        processedBy: payoutData.processedBy,
        status: 'completed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Add payout record to collection
      const payoutRef = collection(db, 'affiliatePayouts');
      const newPayoutRef = doc(payoutRef);
      transaction.set(newPayoutRef, payoutRecord);

      // Update affiliate stats
      const updatedStats = {
        ...currentStats,
        balance: currentBalance - payoutData.payoutAmount, // Reset balance
        totalPaidOut: (currentStats.totalPaidOut || 0) + payoutData.payoutAmount,
        lastPayoutDate: Timestamp.now(),
        payoutCount: (currentStats.payoutCount || 0) + 1
        // totalEarnings remains unchanged - keeps accumulating
      };

      // Update affiliate document
      transaction.update(affiliateRef, {
        stats: updatedStats,
        updatedAt: Timestamp.now()
      });

      return {
        payoutId: newPayoutRef.id,
        updatedStats: updatedStats
      };
    });

    return result;
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
};

/**
 * Get payout history for an affiliate
 */
export const getAffiliatePayoutHistory = async (affiliateId) => {
  try {
    const payoutsQuery = query(
      collection(db, 'affiliatePayouts'),
      where('affiliateId', '==', affiliateId),
      orderBy('payoutDate', 'desc')
    );
    
    const snapshot = await getDocs(payoutsQuery);
    const payouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return payouts;
  } catch (error) {
    console.error('Error fetching payout history:', error);
    throw error;
  }
};

/**
 * Get all payouts (admin view)
 */
export const getAllPayouts = async () => {
  try {
    const payoutsQuery = query(
      collection(db, 'affiliatePayouts'),
      orderBy('payoutDate', 'desc')
    );
    
    const snapshot = await getDocs(payoutsQuery);
    const payouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return payouts;
  } catch (error) {
    console.error('Error fetching all payouts:', error);
    throw error;
  }
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('sv-SE', { 
    style: 'currency', 
    currency: 'SEK' 
  }).format(amount || 0);
};

/**
 * Format date for display
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Validate invoice number format
 */
export const validateInvoiceNumber = (invoiceNumber) => {
  if (!invoiceNumber || invoiceNumber.trim().length === 0) {
    return 'Fakturanummer krävs';
  }
  
  if (invoiceNumber.length < 3) {
    return 'Fakturanummer måste vara minst 3 tecken';
  }
  
  if (invoiceNumber.length > 50) {
    return 'Fakturanummer får inte vara längre än 50 tecken';
  }
  
  return null;
};

/**
 * Calculate affiliate earnings summary
 */
export const calculateEarningsSummary = (affiliateStats, payoutHistory) => {
  const stats = affiliateStats || {};
  const payouts = payoutHistory || [];
  
  return {
    totalEarnings: stats.totalEarnings || 0,
    currentBalance: stats.balance || 0,
    totalPaidOut: stats.totalPaidOut || 0,
    payoutCount: stats.payoutCount || 0,
    lastPayoutDate: stats.lastPayoutDate,
    averagePayoutAmount: payouts.length > 0 
      ? payouts.reduce((sum, p) => sum + p.payoutAmount, 0) / payouts.length 
      : 0
  };
}; 