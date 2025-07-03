/**
 * 🤝 Bidirectional Contact Sync System
 * Keeps B2B and CRM contacts perfectly synchronized
 * 
 * B2B System: users collection (default database)
 * CRM System: diningContacts collection (named database b8s-reseller-db)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

// Import existing B2B → CRM sync functions
import { 
  mapB2BUserToCRMContact, 
  findExistingCRMContact, 
  importB2BUserToCRM 
} from '../wagons/dining-wagon/utils/b2bIntegration';

/**
 * 🔄 CRM → B2B Sync Functions
 */

// Map CRM contact data to B2B user format
export const mapCRMContactToB2BUser = (crmContact, existingB2BUser = null) => {
  // Preserve existing B2B data while updating from CRM
  const baseB2BData = existingB2BUser || {};
  
  return {
    ...baseB2BData,
    
    // Core contact info (CRM can update these)
    companyName: crmContact.companyName || baseB2BData.companyName,
    contactPerson: crmContact.contactPerson || baseB2BData.contactPerson,
    email: crmContact.email || baseB2BData.email,
    phone: crmContact.phoneNumber || baseB2BData.phone,
    
    // Address information (if available in CRM)
    address: crmContact.address || baseB2BData.address,
    city: crmContact.city || baseB2BData.city,
    postalCode: crmContact.postalCode || baseB2BData.postalCode,
    country: crmContact.country || baseB2BData.country,
    
    // CRM-derived fields
    notes: crmContact.notes || baseB2BData.notes,
    
    // Map CRM status to B2B active status
    active: crmContact.status === 'active' ? true : 
            crmContact.status === 'inactive' ? false : 
            baseB2BData.active,
    
    // Preserve critical B2B fields (CRM should NOT override these)
    role: baseB2BData.role || 'user',
    marginal: baseB2BData.marginal || 40,
    firebaseAuthUid: baseB2BData.firebaseAuthUid,
    credentialsSent: baseB2BData.credentialsSent,
    
    // Sync metadata
    lastCRMSync: new Date(),
    updatedAt: new Date().toISOString()
  };
};

// Find existing B2B user by CRM contact
export const findExistingB2BUser = async (crmContact) => {
  try {
    // First try by b2bUserId if available
    if (crmContact.b2bUserId) {
      const b2bUserDoc = await getDoc(doc(db, 'users', crmContact.b2bUserId));
      if (b2bUserDoc.exists()) {
        return { id: b2bUserDoc.id, ...b2bUserDoc.data() };
      }
    }

    // Then try by email
    if (crmContact.email) {
      const q = query(
        collection(db, 'users'),
        where('email', '==', crmContact.email)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() };
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding existing B2B user:', error);
    return null;
  }
};

// Import CRM contact to B2B system
export const importCRMContactToB2B = async (crmContact) => {
  try {
    // 🚫 NEVER create B2B users from CRM - only update existing ones
    // This prevents CRM from creating unauthorized B2B accounts
    
    console.log('🤝 Syncing CRM contact to B2B:', crmContact.companyName);

    // Find existing B2B user
    const existingB2BUser = await findExistingB2BUser(crmContact);
    
    if (!existingB2BUser) {
      console.log('⚠️ No existing B2B user found for CRM contact:', crmContact.email);
      return null; // Don't create new B2B users from CRM
    }

    // 🚫 NEVER sync to admin users - they are internal staff
    if (existingB2BUser.role === 'admin') {
      console.log('🚫 Skipping CRM sync to admin user:', existingB2BUser.email);
      return null;
    }

    // Map CRM data to B2B format
    const b2bUpdateData = mapCRMContactToB2BUser(crmContact, existingB2BUser);

    // Update existing B2B user
    const userRef = doc(db, 'users', existingB2BUser.id);
    await updateDoc(userRef, b2bUpdateData);
    
    console.log('✅ Updated B2B user from CRM:', existingB2BUser.id);
    return existingB2BUser.id;

  } catch (error) {
    console.error('❌ Error importing CRM contact to B2B:', error);
    throw error;
  }
};

/**
 * 🔄 Bidirectional Sync Orchestrator
 */

// Sync contact data bidirectionally
export const syncContactBidirectional = async (sourceSystem, contactId, updates) => {
  try {
    console.log(`🤝 Starting bidirectional sync: ${sourceSystem} → ${sourceSystem === 'b2b' ? 'CRM' : 'B2B'}`);
    
    if (sourceSystem === 'b2b') {
      // B2B → CRM sync (existing functionality)
      await syncB2BToCRM(contactId, updates);
    } else if (sourceSystem === 'crm') {
      // CRM → B2B sync (new functionality)
      await syncCRMToB2B(contactId, updates);
    }
    
    console.log('✅ Bidirectional sync completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Bidirectional sync failed:', error);
    // Don't throw - graceful degradation
    return false;
  }
};

// B2B → CRM sync (enhanced version of existing functionality)
export const syncB2BToCRM = async (b2bUserId, updates) => {
  try {
    // Get full B2B user data
    const b2bUserDoc = await getDoc(doc(db, 'users', b2bUserId));
    if (!b2bUserDoc.exists()) {
      console.log('⚠️ B2B user not found:', b2bUserId);
      return null;
    }
    
    const b2bUser = { id: b2bUserDoc.id, ...b2bUserDoc.data() };
    
    // Use existing B2B → CRM import function
    const crmContactId = await importB2BUserToCRM(b2bUser);
    
    console.log('✅ B2B → CRM sync completed:', crmContactId);
    return crmContactId;
    
  } catch (error) {
    console.error('❌ B2B → CRM sync failed:', error);
    return null;
  }
};

// CRM → B2B sync (new functionality)
export const syncCRMToB2B = async (crmContactId, updates) => {
  try {
    // Get full CRM contact data
    const crmContactDoc = await getDoc(doc(db, 'diningContacts', crmContactId));
    if (!crmContactDoc.exists()) {
      console.log('⚠️ CRM contact not found:', crmContactId);
      return null;
    }
    
    const crmContact = { id: crmContactDoc.id, ...crmContactDoc.data() };
    
    // Use new CRM → B2B import function
    const b2bUserId = await importCRMContactToB2B(crmContact);
    
    console.log('✅ CRM → B2B sync completed:', b2bUserId);
    return b2bUserId;
    
  } catch (error) {
    console.error('❌ CRM → B2B sync failed:', error);
    return null;
  }
};

/**
 * 🔍 Sync Status & Health Monitoring
 */

// Check sync status between B2B and CRM
export const checkSyncStatus = async (contactId, sourceSystem) => {
  try {
    let b2bUser, crmContact;
    
    if (sourceSystem === 'b2b') {
      // Get B2B user and find corresponding CRM contact
      const b2bDoc = await getDoc(doc(db, 'users', contactId));
      if (!b2bDoc.exists()) return { status: 'b2b_not_found' };
      
      b2bUser = { id: b2bDoc.id, ...b2bDoc.data() };
      crmContact = await findExistingCRMContact(b2bUser.id, b2bUser.email);
      
    } else if (sourceSystem === 'crm') {
      // Get CRM contact and find corresponding B2B user
      const crmDoc = await getDoc(doc(db, 'diningContacts', contactId));
      if (!crmDoc.exists()) return { status: 'crm_not_found' };
      
      crmContact = { id: crmDoc.id, ...crmDoc.data() };
      b2bUser = await findExistingB2BUser(crmContact);
    }
    
    // Analyze sync status
    if (!b2bUser && !crmContact) {
      return { status: 'both_not_found' };
    } else if (!b2bUser) {
      return { status: 'b2b_missing', crmContact };
    } else if (!crmContact) {
      return { status: 'crm_missing', b2bUser };
    } else {
      // Both exist - check if they're in sync
      const syncStatus = analyzeSyncHealth(b2bUser, crmContact);
      return { status: 'both_exist', b2bUser, crmContact, syncStatus };
    }
    
  } catch (error) {
    console.error('Error checking sync status:', error);
    return { status: 'error', error: error.message };
  }
};

// Analyze sync health between B2B and CRM data
export const analyzeSyncHealth = (b2bUser, crmContact) => {
  const issues = [];
  const warnings = [];
  
  // Check email consistency
  if (b2bUser.email !== crmContact.email) {
    issues.push('email_mismatch');
  }
  
  // Check company name consistency
  if (b2bUser.companyName !== crmContact.companyName) {
    warnings.push('company_name_differs');
  }
  
  // Check contact person consistency
  if (b2bUser.contactPerson !== crmContact.contactPerson) {
    warnings.push('contact_person_differs');
  }
  
  // Check active status consistency
  const b2bActive = b2bUser.active;
  const crmActive = crmContact.status === 'active';
  if (b2bActive !== crmActive) {
    issues.push('active_status_mismatch');
  }
  
  // Check last sync time
  const b2bLastSync = b2bUser.lastCRMSync ? new Date(b2bUser.lastCRMSync) : null;
  const crmLastSync = crmContact.lastSyncAt ? new Date(crmContact.lastSyncAt) : null;
  
  if (!b2bLastSync || !crmLastSync) {
    warnings.push('missing_sync_timestamp');
  } else {
    const timeDiff = Math.abs(b2bLastSync.getTime() - crmLastSync.getTime());
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      warnings.push('sync_timestamps_differ');
    }
  }
  
  return {
    health: issues.length === 0 ? 'healthy' : 'issues',
    issues,
    warnings,
    lastSyncDiff: b2bLastSync && crmLastSync ? 
      Math.abs(b2bLastSync.getTime() - crmLastSync.getTime()) : null
  };
};

/**
 * 🔧 Sync Utilities
 */

// Bulk sync all contacts (admin utility)
export const bulkSyncAllContacts = async (direction = 'b2b-to-crm') => {
  try {
    console.log(`🤝 Starting bulk sync: ${direction}`);
    
    let results = { success: 0, failed: 0, skipped: 0 };
    
    if (direction === 'b2b-to-crm') {
      // Get all B2B users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      for (const user of users) {
        try {
          if (user.role === 'admin') {
            results.skipped++;
            continue;
          }
          
          await syncB2BToCRM(user.id, {});
          results.success++;
        } catch (error) {
          console.error(`Failed to sync B2B user ${user.id}:`, error);
          results.failed++;
        }
      }
      
    } else if (direction === 'crm-to-b2b') {
      // Get all CRM contacts
      const contactsSnapshot = await getDocs(collection(db, 'diningContacts'));
      const contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      for (const contact of contacts) {
        try {
          await syncCRMToB2B(contact.id, {});
          results.success++;
        } catch (error) {
          console.error(`Failed to sync CRM contact ${contact.id}:`, error);
          results.failed++;
        }
      }
    }
    
    console.log(`✅ Bulk sync completed:`, results);
    return results;
    
  } catch (error) {
    console.error('❌ Bulk sync failed:', error);
    throw error;
  }
};

// Get sync statistics
export const getSyncStatistics = async () => {
  try {
    // Get counts from both systems
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const contactsSnapshot = await getDocs(collection(db, 'diningContacts'));
    
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter out admin users
    const customerUsers = users.filter(user => user.role !== 'admin');
    
    // Count synced contacts
    const syncedContacts = contacts.filter(contact => contact.b2bUserId);
    
    return {
      totalB2BUsers: customerUsers.length,
      totalCRMContacts: contacts.length,
      syncedContacts: syncedContacts.length,
      unsyncedB2BUsers: customerUsers.length - syncedContacts.length,
      orphanedCRMContacts: contacts.length - syncedContacts.length,
      syncRate: contacts.length > 0 ? (syncedContacts.length / contacts.length) * 100 : 0
    };
    
  } catch (error) {
    console.error('Error getting sync statistics:', error);
    return null;
  }
};

/**
 * 🎯 Auto-Sync Hooks
 * These functions should be called whenever data changes in either system
 */

// Auto-sync when B2B user is updated
export const autoSyncB2BUpdate = async (b2bUserId, updates) => {
  try {
    // Only sync if meaningful fields changed
    const syncTriggerFields = ['companyName', 'contactPerson', 'email', 'phone', 'active', 'marginal'];
    const shouldSync = syncTriggerFields.some(field => field in updates);
    
    if (shouldSync) {
      console.log('🔄 Auto-syncing B2B update to CRM:', b2bUserId);
      await syncB2BToCRM(b2bUserId, updates);
    }
    
  } catch (error) {
    console.error('Auto-sync B2B update failed:', error);
    // Don't throw - graceful degradation
  }
};

// Auto-sync when CRM contact is updated
export const autoSyncCRMUpdate = async (crmContactId, updates) => {
  try {
    // Only sync if meaningful fields changed
    const syncTriggerFields = ['companyName', 'contactPerson', 'email', 'phoneNumber', 'status'];
    const shouldSync = syncTriggerFields.some(field => field in updates);
    
    if (shouldSync) {
      console.log('🔄 Auto-syncing CRM update to B2B:', crmContactId);
      await syncCRMToB2B(crmContactId, updates);
    }
    
  } catch (error) {
    console.error('Auto-sync CRM update failed:', error);
    // Don't throw - graceful degradation
  }
};

// Functions are already exported individually above 