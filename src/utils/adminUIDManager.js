/**
 * Admin UID Manager - Phase 2: Parallel admin UID tracking system
 * 
 * 🛡️ SAFETY: This is a parallel system that doesn't modify existing functionality
 * Current storage rules continue using hardcoded UIDs as backup
 */

import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  collection,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';

// 🔒 Current hardcoded admin UIDs (from storage.rules and .cursorrules)
export const CURRENT_ADMIN_UIDS = [
  { 
    uid: '9AudFilG8VeYHcFnKgUtQkByAmn1', 
    email: 'micke.ohlen@gmail.com',
    level: 'super',
    note: 'Primary admin - from storage.rules'
  },
  { 
    uid: '9yKlFQEhb4dbSwa206BxXVZWdgs2', 
    email: 'admin2@b8shield.com',
    level: 'admin',
    note: 'Admin 2 - from storage.rules'
  },
  { 
    uid: 'hCu3TDpe5XZ0adTp5eGLpGxDvL13', 
    email: 'admin3@b8shield.com',
    level: 'admin',
    note: 'Admin 3 - from storage.rules'
  }
];

/**
 * Add a user to the adminUIDs collection
 * 🛡️ SAFE: Only adds to parallel collection, doesn't modify existing systems
 */
export const addAdminUID = async (uid, email, level = 'admin', createdBy = 'system') => {
  try {
    console.log(`🔧 AdminUID: Adding admin UID ${uid} (${email}) with level ${level}`);
    
    const adminUIDData = {
      uid,
      email,
      level, // 'super', 'admin', 'limited'
      createdAt: serverTimestamp(),
      createdBy,
      addedAt: serverTimestamp(),
      source: 'admin-uid-manager',
      active: true
    };

    await setDoc(doc(db, 'adminUIDs', uid), adminUIDData);
    console.log(`✅ AdminUID: Successfully added ${uid} to adminUIDs collection`);
    
    return { success: true, uid, email, level };
  } catch (error) {
    console.error(`❌ AdminUID: Error adding admin UID ${uid}:`, error);
    throw new Error(`Failed to add admin UID: ${error.message}`);
  }
};

/**
 * Remove a user from the adminUIDs collection
 * 🛡️ SAFE: Only removes from parallel collection, existing systems unaffected
 */
export const removeAdminUID = async (uid) => {
  try {
    console.log(`🔧 AdminUID: Removing admin UID ${uid}`);
    
    await deleteDoc(doc(db, 'adminUIDs', uid));
    console.log(`✅ AdminUID: Successfully removed ${uid} from adminUIDs collection`);
    
    return { success: true, uid };
  } catch (error) {
    console.error(`❌ AdminUID: Error removing admin UID ${uid}:`, error);
    throw new Error(`Failed to remove admin UID: ${error.message}`);
  }
};

/**
 * Check if a UID exists in the adminUIDs collection
 * 🛡️ SAFE: Read-only operation, no side effects
 */
export const isAdminUID = async (uid) => {
  try {
    const adminDoc = await getDoc(doc(db, 'adminUIDs', uid));
    const exists = adminDoc.exists() && adminDoc.data()?.active !== false;
    
    console.log(`🔍 AdminUID: UID ${uid} ${exists ? 'IS' : 'is NOT'} in adminUIDs collection`);
    return exists;
  } catch (error) {
    console.error(`❌ AdminUID: Error checking admin UID ${uid}:`, error);
    return false;
  }
};

/**
 * Get all admin UIDs from the collection
 * 🛡️ SAFE: Read-only operation for monitoring and debugging
 */
export const getAllAdminUIDs = async () => {
  try {
    console.log('🔍 AdminUID: Fetching all admin UIDs');
    
    const adminUIDsQuery = query(
      collection(db, 'adminUIDs'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(adminUIDsQuery);
    const adminUIDs = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.active !== false) { // Only include active admin UIDs
        adminUIDs.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    console.log(`✅ AdminUID: Found ${adminUIDs.length} active admin UIDs`);
    return adminUIDs;
  } catch (error) {
    console.error('❌ AdminUID: Error fetching admin UIDs:', error);
    return [];
  }
};

/**
 * Populate the adminUIDs collection with current hardcoded UIDs
 * 🛡️ SAFE: One-time setup function, doesn't modify existing systems
 */
export const populateAdminUIDs = async () => {
  try {
    console.log('🚀 AdminUID: Populating adminUIDs collection with current hardcoded UIDs');
    
    const results = [];
    
    for (const admin of CURRENT_ADMIN_UIDS) {
      try {
        // Check if already exists
        const exists = await isAdminUID(admin.uid);
        if (exists) {
          console.log(`ℹ️ AdminUID: ${admin.uid} already exists, skipping`);
          results.push({ ...admin, status: 'already_exists' });
          continue;
        }
        
        // Add to collection
        await addAdminUID(admin.uid, admin.email, admin.level, 'system-population');
        results.push({ ...admin, status: 'added' });
        
      } catch (error) {
        console.error(`❌ AdminUID: Failed to add ${admin.uid}:`, error);
        results.push({ ...admin, status: 'failed', error: error.message });
      }
    }
    
    console.log('✅ AdminUID: Population complete:', results);
    return { success: true, results };
    
  } catch (error) {
    console.error('❌ AdminUID: Population failed:', error);
    throw new Error(`Failed to populate admin UIDs: ${error.message}`);
  }
};

/**
 * Sync check: Compare hardcoded UIDs with adminUIDs collection
 * 🛡️ SAFE: Read-only operation for monitoring consistency
 */
export const checkAdminUIDSync = async () => {
  try {
    console.log('🔍 AdminUID: Checking sync between hardcoded UIDs and collection');
    
    const collectionUIDs = await getAllAdminUIDs();
    const collectionUIDSet = new Set(collectionUIDs.map(admin => admin.uid));
    const hardcodedUIDSet = new Set(CURRENT_ADMIN_UIDS.map(admin => admin.uid));
    
    const inBoth = CURRENT_ADMIN_UIDS.filter(admin => collectionUIDSet.has(admin.uid));
    const onlyHardcoded = CURRENT_ADMIN_UIDS.filter(admin => !collectionUIDSet.has(admin.uid));
    const onlyCollection = collectionUIDs.filter(admin => !hardcodedUIDSet.has(admin.uid));
    
    const syncStatus = {
      inSync: onlyHardcoded.length === 0,
      inBoth: inBoth.length,
      onlyHardcoded: onlyHardcoded.length,
      onlyCollection: onlyCollection.length,
      details: {
        inBoth,
        onlyHardcoded, 
        onlyCollection
      }
    };
    
    console.log('📊 AdminUID: Sync status:', syncStatus);
    return syncStatus;
    
  } catch (error) {
    console.error('❌ AdminUID: Sync check failed:', error);
    return { inSync: false, error: error.message };
  }
}; 