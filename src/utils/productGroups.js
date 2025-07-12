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

// PERFORMANCE OPTIMIZATION: Cache product group content to prevent duplicate Firebase calls
const productGroupCache = new Map();
const pendingRequests = new Map(); // ADDED: Prevent race conditions
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (shorter than translations since this changes more frequently)

// Generate cache key for product group
const getCacheKey = (groupId) => {
  return `productGroup_${groupId}`;
};

// Check if cached result is still valid
const isCacheValid = (cacheEntry) => {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_DURATION;
};

/**
 * Get product group content by group ID
 * PERFORMANCE OPTIMIZED: Caches results to prevent duplicate Firebase calls
 */
export const getProductGroupContent = async (groupId) => {
  if (!groupId) {
    console.log('🚫 getProductGroupContent: No groupId provided');
    return null;
  }
  
  console.log('🔍 getProductGroupContent called for:', groupId);
  
  // Check cache first
  const cacheKey = getCacheKey(groupId);
  const cached = productGroupCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    console.log(`📋 Using cached product group content for: ${groupId}`);
    return cached.result;
  }
  
  // ADDED: Check if request is already pending to prevent race conditions
  if (pendingRequests.has(groupId)) {
    console.log(`📋 Waiting for pending product group request: ${groupId}`);
    return await pendingRequests.get(groupId);
  }
  
  // Create pending request promise
  const requestPromise = (async () => {
    try {
      const docRef = doc(db, PRODUCT_GROUPS_COLLECTION, groupId);
      console.log('📄 Document path:', docRef.path);
      
      const docSnap = await getDoc(docRef);
      console.log('📄 Document exists:', docSnap.exists());
      
      let result = null;
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📄 Document data:', data);
        result = {
          id: docSnap.id,
          ...data
        };
      } else {
        console.log('📄 No document found for group:', groupId);
      }
      
      // Cache the result (even if null)
      productGroupCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error getting product group content:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        groupId
      });
      throw error;
    } finally {
      // Remove pending request
      pendingRequests.delete(groupId);
    }
  })();
  
  // Store pending request
  pendingRequests.set(groupId, requestPromise);
  
  return await requestPromise;
};

/**
 * Create or update product group content
 * PERFORMANCE OPTIMIZATION: Clears cache when content is updated
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
    
    // Clear cache for this group since content was updated
    const cacheKey = getCacheKey(groupId);
    productGroupCache.delete(cacheKey);
    console.log(`🗑️ Cleared cache for group: ${groupId}`);
    
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

/**
 * Clear product group cache (useful for testing or manual refresh)
 */
export const clearProductGroupCache = () => {
  productGroupCache.clear();
  console.log('📋 Product group cache cleared');
};

/**
 * Get cache statistics (for debugging)
 */
export const getProductGroupCacheStats = () => {
  const now = Date.now();
  const entries = Array.from(productGroupCache.entries());
  
  return {
    totalEntries: entries.length,
    validEntries: entries.filter(([_, value]) => isCacheValid(value)).length,
    expiredEntries: entries.filter(([_, value]) => !isCacheValid(value)).length,
    oldestEntry: entries.length > 0 ? Math.min(...entries.map(([_, value]) => value.timestamp)) : null,
    cacheAge: entries.length > 0 ? now - Math.min(...entries.map(([_, value]) => value.timestamp)) : 0
  };
}; 