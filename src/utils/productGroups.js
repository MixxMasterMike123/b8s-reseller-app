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
  if (!groupId) {
    console.log('🚫 getProductGroupContent: No groupId provided');
    return null;
  }
  
  console.log('🔍 getProductGroupContent called for:', groupId);
  
  try {
    const docRef = doc(db, PRODUCT_GROUPS_COLLECTION, groupId);
    console.log('📄 Document path:', docRef.path);
    
    const docSnap = await getDoc(docRef);
    console.log('📄 Document exists:', docSnap.exists());
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('📄 Document data:', data);
      return {
        id: docSnap.id,
        ...data
      };
    }
    
    console.log('📄 No document found for group:', groupId);
    return null;
  } catch (error) {
    console.error('❌ Error getting product group content:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      groupId
    });
    throw error;
  }
};

/**
 * Create or update product group content
 */
export const saveProductGroupContent = async (groupId, groupData, currentUserUid) => {
  if (!groupId) throw new Error('Group ID is required');
  
  console.log('🔍 saveProductGroupContent called with:', {
    groupId,
    groupData,
    currentUserUid,
    collection: PRODUCT_GROUPS_COLLECTION
  });
  
  try {
    const docRef = doc(db, PRODUCT_GROUPS_COLLECTION, groupId);
    console.log('📝 Document reference created:', docRef.path);
    
    const docSnap = await getDoc(docRef);
    console.log('📖 Document exists:', docSnap.exists());
    
    const now = serverTimestamp();
    const dataToSave = {
      ...groupData,
      lastEditedBy: currentUserUid,
      updatedAt: now
    };
    
    console.log('💾 Data to save:', dataToSave);
    
    if (docSnap.exists()) {
      // Update existing
      console.log('📝 Updating existing document...');
      await updateDoc(docRef, dataToSave);
      console.log('✅ Document updated successfully');
    } else {
      // Create new
      const finalData = {
        ...dataToSave,
        groupId,
        createdAt: now
      };
      console.log('📝 Creating new document with:', finalData);
      await setDoc(docRef, finalData);
      console.log('✅ Document created successfully');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error saving product group content:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
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
    
    // SAFER SORT: Support multilingual name objects (sv-SE, en-GB, en-US)
    const getNameString = (nameObj) => {
      if (!nameObj) return '';
      if (typeof nameObj === 'string') return nameObj;
      if (typeof nameObj === 'object') {
        // Prefer Swedish, then any available language
        return (
          nameObj['sv-SE'] ||
          Object.values(nameObj).find((v) => typeof v === 'string' && v.trim()) ||
          ''
        );
      }
      return '';
    };
    
    return products.sort((a, b) => {
      const nameA = getNameString(a.name).toLowerCase();
      const nameB = getNameString(b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
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
  groupName: '',
  defaultProductId: '' // preferred product for storefront default
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