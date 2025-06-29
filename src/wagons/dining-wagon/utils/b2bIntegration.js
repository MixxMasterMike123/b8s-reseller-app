import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import toast from 'react-hot-toast';

/**
 * 🚂🍽️ B2B Customer → CRM Integration
 * Seamlessly sync B2B customers into The Dining Wagon™ CRM
 */

// Map B2B user data to CRM contact format
export const mapB2BUserToCRMContact = (b2bUser) => {
  // Map B2B status to CRM status
  const getStatusMapping = (b2bUser) => {
    if (!b2bUser.active) return 'prospect'; // Not activated yet
    if (b2bUser.active && b2bUser.role === 'user') return 'active'; // Active customer
    if (b2bUser.role === 'admin') return 'active'; // Admin users are active
    return 'prospect';
  };

  // Map priority based on B2B user data
  const getPriorityMapping = (b2bUser) => {
    if (b2bUser.role === 'admin') return 'high';
    if (b2bUser.marginal && b2bUser.marginal > 40) return 'high'; // High margin customers
    if (b2bUser.marginal && b2bUser.marginal > 30) return 'medium';
    return 'medium';
  };

  return {
    // Core contact info
    companyName: b2bUser.companyName || 'Okänt företag',
    contactPerson: b2bUser.contactPerson || 'Okänd kontakt',
    email: b2bUser.email,
    phoneNumber: b2bUser.phoneNumber || b2bUser.phone,
    
    // Address information
    address: b2bUser.address,
    city: b2bUser.city,
    postalCode: b2bUser.postalCode,
    country: b2bUser.country || 'Sverige',
    
    // CRM-specific fields
    status: getStatusMapping(b2bUser),
    priority: getPriorityMapping(b2bUser),
    source: 'b2b-import', // Single source field
    tags: ['B2B-Kund'],
    
    // B2B integration fields
    b2bUserId: b2bUser.id || b2bUser.uid,
    b2bMarginal: b2bUser.marginal,
    b2bRole: b2bUser.role,
    b2bActive: b2bUser.active,
    
    // Metadata
    importedAt: new Date(),
    createdAt: b2bUser.createdAt ? new Date(b2bUser.createdAt) : new Date(),
    updatedAt: new Date()
  };
};

// Check if B2B user already exists in CRM
export const findExistingCRMContact = async (b2bUserId, email) => {
  try {
    // First check by B2B user ID
    if (b2bUserId) {
      const q1 = query(
        collection(db, 'diningContacts'),
        where('b2bUserId', '==', b2bUserId)
      );
      const snapshot1 = await getDocs(q1);
      if (!snapshot1.empty) {
        return { id: snapshot1.docs[0].id, ...snapshot1.docs[0].data() };
      }
    }

    // Then check by email
    if (email) {
      const q2 = query(
        collection(db, 'diningContacts'),
        where('email', '==', email)
      );
      const snapshot2 = await getDocs(q2);
      if (!snapshot2.empty) {
        return { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() };
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding existing CRM contact:', error);
    return null;
  }
};

// Import single B2B user to CRM
export const importB2BUserToCRM = async (b2bUser) => {
  try {
    // 🚫 Double-check: Never import admin users
    if (b2bUser.role === 'admin') {
      console.log('🚫 Skipping admin user import:', b2bUser.email);
      return null;
    }

    console.log('🚂🍽️ Importing B2B customer to CRM:', b2bUser.companyName);

    // Check if already exists
    const existing = await findExistingCRMContact(b2bUser.id || b2bUser.uid, b2bUser.email);
    
    const crmContactData = mapB2BUserToCRMContact(b2bUser);

    if (existing) {
      // Update existing contact
      const contactRef = doc(db, 'diningContacts', existing.id);
      await updateDoc(contactRef, {
        ...crmContactData,
        updatedAt: new Date(),
        lastSyncAt: new Date()
      });
      
      console.log('✅ Updated existing CRM contact:', existing.id);
      return existing.id;
    } else {
      // Create new contact
      const docRef = await addDoc(collection(db, 'diningContacts'), crmContactData);
      
      console.log('✅ Created new CRM contact:', docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error('❌ Error importing B2B user to CRM:', error);
    throw error;
  }
};

// Bulk import all B2B users to CRM
export const bulkImportB2BUsersToCRM = async (b2bUsers) => {
  try {
    // 🚫 Filter out admin users - they should not be in CRM
    const customerUsers = b2bUsers.filter(user => user.role !== 'admin');
    
    console.log('🚂🍽️ Starting bulk import of B2B customers to CRM:', customerUsers.length);
    console.log(`🚫 Filtered out ${b2bUsers.length - customerUsers.length} admin users from import`);
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    let skipped = b2bUsers.length - customerUsers.length; // Admin users skipped

    for (const b2bUser of customerUsers) {
      try {
        const existing = await findExistingCRMContact(b2bUser.id || b2bUser.uid, b2bUser.email);
        
        if (existing) {
          await importB2BUserToCRM(b2bUser); // This will update
          updated++;
        } else {
          await importB2BUserToCRM(b2bUser); // This will create
          imported++;
        }
      } catch (error) {
        console.error('Error importing user:', b2bUser.email, error);
        errors++;
      }
    }

    const result = { imported, updated, errors, skipped, total: b2bUsers.length };
    console.log('🚂🍽️ Bulk import completed:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Bulk import failed:', error);
    throw error;
  }
};

// Auto-import function to call on B2B registration
export const autoImportNewB2BUser = async (b2bUser) => {
  try {
    // 🚫 NEVER import admin users to CRM - they are internal staff, not customers
    if (b2bUser.role === 'admin') {
      console.log('🚂🍽️ Skipping CRM import for admin user:', b2bUser.email);
      return null;
    }

    console.log('🚂🍽️ Auto-importing new B2B customer registration:', b2bUser.email);
    
    const crmContactId = await importB2BUserToCRM(b2bUser);
    
    toast.success(`🍽️ Ny gäst tillagd i CRM: ${b2bUser.companyName}`);
    
    return crmContactId;
  } catch (error) {
    console.error('❌ Auto-import failed:', error);
    // Don't throw - don't break registration if CRM import fails
    toast.error('Kunde inte lägga till i CRM (registrering lyckades)');
    return null;
  }
};

// Update CRM contact when B2B user status changes
export const syncB2BStatusToCRM = async (b2bUserId, b2bUpdates) => {
  try {
    console.log('🚂🍽️ Syncing B2B status to CRM:', b2bUserId);

    // Find CRM contact
    const existing = await findExistingCRMContact(b2bUserId, null);
    
    if (!existing) {
      console.log('⚠️ No CRM contact found for B2B user:', b2bUserId);
      return null;
    }

    // 🚫 Skip sync if this is an admin user (shouldn't be in CRM anyway)
    if (existing.b2bRole === 'admin' || b2bUpdates.role === 'admin') {
      console.log('🚫 Skipping CRM sync for admin user:', b2bUserId);
      return null;
    }

    // Map B2B updates to CRM updates
    const crmUpdates = {};
    
    if (b2bUpdates.active !== undefined) {
      crmUpdates.status = b2bUpdates.active ? 'active' : 'prospect';
      crmUpdates.b2bActive = b2bUpdates.active;
    }
    
    if (b2bUpdates.marginal !== undefined) {
      crmUpdates.b2bMarginal = b2bUpdates.marginal;
      // Update priority based on new margin
      if (b2bUpdates.marginal > 40) crmUpdates.priority = 'high';
      else if (b2bUpdates.marginal > 30) crmUpdates.priority = 'medium';
      else crmUpdates.priority = 'low';
    }

    if (b2bUpdates.role !== undefined) {
      crmUpdates.b2bRole = b2bUpdates.role;
      if (b2bUpdates.role === 'admin') {
        crmUpdates.priority = 'high';
        crmUpdates.tags = [...(existing.tags || []), 'Admin'];
      }
    }

    if (Object.keys(crmUpdates).length > 0) {
      crmUpdates.updatedAt = new Date();
      crmUpdates.lastSyncAt = new Date();

      const contactRef = doc(db, 'diningContacts', existing.id);
      await updateDoc(contactRef, crmUpdates);
      
      console.log('✅ CRM contact synced:', existing.id);
      return existing.id;
    }

    return existing.id;
  } catch (error) {
    console.error('❌ Error syncing B2B status to CRM:', error);
    // Don't throw - don't break B2B operations if CRM sync fails
    return null;
  }
};

// Get CRM contact for B2B user
export const getCRMContactForB2BUser = async (b2bUserId, email) => {
  return await findExistingCRMContact(b2bUserId, email);
};

// Statistics for integration
export const getB2BIntegrationStats = async () => {
  try {
    // Get all CRM contacts with B2B links
    const q = query(
      collection(db, 'diningContacts'),
      where('source', '==', 'b2b-import')
    );
    const snapshot = await getDocs(q);
    
    const b2bContacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
      totalB2BContacts: b2bContacts.length,
      activeB2BContacts: b2bContacts.filter(c => c.status === 'active').length,
      prospectB2BContacts: b2bContacts.filter(c => c.status === 'prospect').length,
      highPriorityB2BContacts: b2bContacts.filter(c => c.priority === 'high').length
    };
  } catch (error) {
    console.error('Error getting B2B integration stats:', error);
    return { totalB2BContacts: 0, activeB2BContacts: 0, prospectB2BContacts: 0, highPriorityB2BContacts: 0 };
  }
}; 