import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Product Groups collection for B2C shared content
const PRODUCT_GROUPS_COLLECTION = 'productGroups';

/**
 * Get product group content by group ID
 */
export const getProductGroupContent = async (groupId) => {
  if (!groupId) return null;
  
  try {
    const docRef = doc(db, PRODUCT_GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting product group content:', error);
    throw error;
  }
};

/**
 * Create or update product group content
 */
export const saveProductGroupContent = async (groupId, groupData, currentUserUid) => {
  if (!groupId) throw new Error('Group ID is required');
  
  try {
    const docRef = doc(db, PRODUCT_GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(docRef);
    
    const now = serverTimestamp();
    const dataToSave = {
      ...groupData,
      lastEditedBy: currentUserUid,
      updatedAt: now
    };
    
    if (docSnap.exists()) {
      // Update existing
      await updateDoc(docRef, dataToSave);
    } else {
      // Create new
      await setDoc(docRef, {
        ...dataToSave,
        groupId,
        createdAt: now
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving product group content:', error);
    throw error;
  }
};

/**
 * Get all product groups for admin management
 */
export const getAllProductGroups = async () => {
  try {
    const q = query(collection(db, PRODUCT_GROUPS_COLLECTION));
    const querySnapshot = await getDocs(q);
    
    const groups = [];
    querySnapshot.forEach((doc) => {
      groups.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return groups.sort((a, b) => a.groupName?.localeCompare(b.groupName) || 0);
  } catch (error) {
    console.error('Error getting all product groups:', error);
    throw error;
  }
};

/**
 * Get products that belong to a specific group
 */
export const getProductsInGroup = async (groupId) => {
  if (!groupId) return [];
  
  try {
    const q = query(
      collection(db, 'products'),
      where('group', '==', groupId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return products.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting products in group:', error);
    throw error;
  }
};

/**
 * Default empty group content structure
 */
export const getDefaultGroupContent = () => ({
  sizeGuide: '',
  sizeAndFit: '',
  shippingReturns: '',
  howItsMade: '',
  groupName: ''
});

/**
 * Validate group content before saving
 */
export const validateGroupContent = (groupData) => {
  const errors = [];
  
  if (!groupData.groupName?.trim()) {
    errors.push('Group name is required');
  }
  
  // Optional validation for content fields
  // Add more validation rules as needed
  
  return errors;
}; 