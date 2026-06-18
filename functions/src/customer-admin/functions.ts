import { onRequest, onCall } from 'firebase-functions/v2/https';
import { getApp } from 'firebase-admin/app';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../config/database';
import { adminSeedConfig, commerceConfig } from '../config/app-urls';

// Get Firebase Auth from already initialized app
const auth = getAuth(getApp());

// 🛡️ SECURITY: Shared-secret guard for the createAdminUser bootstrap endpoint.
// This onRequest endpoint is an operator-only tool, NOT called by the client app.
// Previously it was fully unauthenticated — anyone who knew the URL could promote
// an admin. It now requires an ADMIN_MAINTENANCE_SECRET, supplied via the
// `x-admin-secret` header or `?secret=` query param.
// (The former checkNamedDatabase / debugDatabase debug endpoints were removed.)
//
// Set the secret before deploying, e.g.:
//   firebase functions:config:set admin.maintenance_secret="<random-64-char-hex>"
// or via process.env.ADMIN_MAINTENANCE_SECRET in the runtime environment.
// If no secret is configured, the endpoints are DENIED by default (fail closed).
function isMaintenanceAuthorized(req: { headers: Record<string, any>; query: Record<string, any> }): boolean {
  const configured = process.env.ADMIN_MAINTENANCE_SECRET;
  // Fail closed: no secret configured means these endpoints are disabled.
  if (!configured) {
    return false;
  }
  const provided =
    (req.headers['x-admin-secret'] as string | undefined) ||
    (req.query?.secret as string | undefined);
  if (!provided) {
    return false;
  }
  // Constant-time-ish comparison to avoid trivial timing leaks.
  if (provided.length !== configured.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < configured.length; i++) {
    diff |= provided.charCodeAt(i) ^ configured.charCodeAt(i);
  }
  return diff === 0;
}

// Types for customer and admin functions
interface DeleteCustomerData {
  customerId: string;
}

interface DeleteB2CCustomerData {
  customerId: string;
}

interface ToggleCustomerStatusData {
  customerId: string;
  activeStatus: boolean;
}

interface CustomerData {
  email: string;
  companyName?: string;
  contactPerson?: string;
  firebaseAuthUid?: string;
  [key: string]: any;
}

interface DeletionResults {
  customer: boolean;
  orders: number;
  marketingMaterials: number;
  adminDocuments: number;
  authAccount: string | null;
}

// Delete Customer Account (Admin Only)
export const deleteCustomerAccount = onCall<DeleteCustomerData>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Måste vara inloggad');
  }

  try {
    // Get admin user data to verify permissions
    const adminDoc = await db.collection('users').doc(userAuth.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new Error('Måste vara administratör');
    }

    const { customerId } = data;
    if (!customerId) {
      throw new Error('Customer ID krävs');
    }

    // Get customer data
    const customerDoc = await db.collection('users').doc(customerId).get();
    if (!customerDoc.exists) {
      throw new Error('Kunden kunde inte hittas');
    }

    const customerData = customerDoc.data() as CustomerData;

    // 🛡️ TENANT ISOLATION: Admin SDK bypasses Firestore rules, so the shop
    // boundary MUST be enforced here. A platform super-admin may delete in any
    // shop; a shop admin only within their OWN shop. The target's shopId is read
    // from the resource doc (trustworthy), never from the request payload.
    const adminData = adminDoc.data();
    if (adminData?.platform !== true && adminData?.shopId !== customerData.shopId) {
      throw new Error('Du har inte behörighet att hantera kunder i en annan butik');
    }

    let authDeletionResult: string | null = null;

    // Delete Firebase Auth account if it exists
    if (customerData.firebaseAuthUid) {
      try {
        await auth.deleteUser(customerData.firebaseAuthUid);
        authDeletionResult = 'deleted_by_uid';
        console.log(`Deleted Firebase Auth user by UID: ${customerData.firebaseAuthUid}`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`Firebase Auth user not found by UID: ${customerData.firebaseAuthUid}`);
          authDeletionResult = 'not_found_by_uid';
        } else {
          console.error(`Error deleting Firebase Auth user by UID: ${authError.message}`);
          // Continue with email-based deletion attempt
        }
      }
    }

    // Fallback: try to delete by email if UID deletion failed
    if (!authDeletionResult || authDeletionResult === 'not_found_by_uid') {
      try {
        const authUser = await auth.getUserByEmail(customerData.email);
        await auth.deleteUser(authUser.uid);
        authDeletionResult = 'deleted_by_email';
        console.log(`Deleted Firebase Auth user by email: ${customerData.email}`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`Firebase Auth user not found by email: ${customerData.email}`);
          authDeletionResult = 'not_found_by_email';
        } else {
          console.error(`Error deleting Firebase Auth user by email: ${authError.message}`);
          authDeletionResult = 'error';
        }
      }
    }

    // Delete related data
    const deletionResults: DeletionResults = {
      customer: false,
      orders: 0,
      marketingMaterials: 0,
      adminDocuments: 0,
      authAccount: authDeletionResult
    };

    // Delete customer's orders
    try {
      const ordersQuery = await db.collection('orders').where('userId', '==', customerId).get();
      const orderDeletePromises = ordersQuery.docs.map(doc => doc.ref.delete());
      await Promise.all(orderDeletePromises);
      deletionResults.orders = ordersQuery.size;
      console.log(`Deleted ${ordersQuery.size} orders for customer ${customerId}`);
    } catch (error) {
      console.error('Error deleting customer orders:', error);
    }

    // Delete customer's marketing materials
    try {
      const materialsQuery = await db.collection('users').doc(customerId).collection('marketingMaterials').get();
      const materialDeletePromises = materialsQuery.docs.map(doc => doc.ref.delete());
      await Promise.all(materialDeletePromises);
      deletionResults.marketingMaterials = materialsQuery.size;
      console.log(`Deleted ${materialsQuery.size} marketing materials for customer ${customerId}`);
    } catch (error) {
      console.error('Error deleting customer marketing materials:', error);
    }

    // Delete admin documents for this customer
    try {
      const adminDocsQuery = await db.collection('adminCustomerDocuments').where('customerId', '==', customerId).get();
      const adminDocDeletePromises = adminDocsQuery.docs.map(doc => doc.ref.delete());
      await Promise.all(adminDocDeletePromises);
      deletionResults.adminDocuments = adminDocsQuery.size;
      console.log(`Deleted ${adminDocsQuery.size} admin documents for customer ${customerId}`);
    } catch (error) {
      console.error('Error deleting admin documents:', error);
    }

    // Finally, delete the customer document
    await db.collection('users').doc(customerId).delete();
    deletionResults.customer = true;

    console.log(`Customer ${customerId} (${customerData.email}) deleted successfully by admin ${userAuth.uid}`);

    return {
      success: true,
      message: 'Kund och alla relaterade data har tagits bort framgångsrikt',
      customerId: customerId,
      email: customerData.email,
      companyName: customerData.companyName,
      deletionResults: deletionResults
    };

  } catch (error) {
    console.error('Error in deleteCustomerAccount:', error);
    throw new Error(`Kunde inte ta bort kund: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Delete B2C Customer Account (Admin Only)
export const deleteB2CCustomerAccount = onCall<DeleteB2CCustomerData>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Måste vara inloggad');
  }

  try {
    // Get admin user data to verify permissions
    const adminDoc = await db.collection('users').doc(userAuth.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new Error('Måste vara administratör');
    }

    const { customerId } = data;
    if (!customerId) {
      throw new Error('Customer ID krävs');
    }

    // Get B2C customer data
    const customerDoc = await db.collection('b2cCustomers').doc(customerId).get();
    if (!customerDoc.exists) {
      throw new Error('B2C-kunden kunde inte hittas');
    }

    const customerData = customerDoc.data() as any;

    // 🛡️ TENANT ISOLATION (Admin SDK bypasses rules): platform may delete in any
    // shop; a shop admin only their own. Target shopId from the resource doc.
    const adminData = adminDoc.data();
    if (adminData?.platform !== true && adminData?.shopId !== customerData.shopId) {
      throw new Error('Du har inte behörighet att hantera kunder i en annan butik');
    }

    let authDeletionResult: string | null = null;

    // Delete Firebase Auth account if it exists
    if (customerData.firebaseAuthUid) {
      try {
        await auth.deleteUser(customerData.firebaseAuthUid);
        authDeletionResult = 'deleted_by_uid';
        console.log(`Deleted Firebase Auth user by UID: ${customerData.firebaseAuthUid}`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`Firebase Auth user not found by UID: ${customerData.firebaseAuthUid}`);
          authDeletionResult = 'not_found_by_uid';
        } else {
          console.error(`Error deleting Firebase Auth user by UID: ${authError.message}`);
          // Continue with email-based deletion attempt
        }
      }
    }

    // Fallback: try to delete by email if UID deletion failed
    if (!authDeletionResult || authDeletionResult === 'not_found_by_uid') {
      try {
        const authUser = await auth.getUserByEmail(customerData.email);
        await auth.deleteUser(authUser.uid);
        authDeletionResult = 'deleted_by_email';
        console.log(`Deleted Firebase Auth user by email: ${customerData.email}`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`Firebase Auth user not found by email: ${customerData.email}`);
          authDeletionResult = 'not_found_by_email';
        } else {
          console.error(`Error deleting Firebase Auth user by email: ${authError.message}`);
          authDeletionResult = 'error';
        }
      }
    }

    // Mark orders as orphaned (customer deleted) instead of deleting them
    let ordersAffected = 0;
    try {
      // Find orders with b2cCustomerId — scoped to the customer's shop so a
      // colliding id/email in another shop is never touched (tenant isolation).
      const ordersWithAccountQuery = await db.collection('orders')
        .where('b2cCustomerId', '==', customerId)
        .where('shopId', '==', customerData.shopId)
        .get();
      const accountOrderUpdates = ordersWithAccountQuery.docs.map(doc =>
        doc.ref.update({
          customerDeleted: true,
          customerDeletedAt: FieldValue.serverTimestamp(),
          customerDeletedBy: userAuth.uid,
          updatedAt: FieldValue.serverTimestamp()
        })
      );

      // Find orders by email (guest orders) — also shop-scoped.
      const ordersWithEmailQuery = await db.collection('orders')
        .where('source', '==', 'b2c')
        .where('customerInfo.email', '==', customerData.email)
        .where('shopId', '==', customerData.shopId)
        .get();
      
      const emailOrderUpdates = ordersWithEmailQuery.docs.map(doc => 
        doc.ref.update({
          customerDeleted: true,
          customerDeletedAt: FieldValue.serverTimestamp(),
          customerDeletedBy: userAuth.uid,
          updatedAt: FieldValue.serverTimestamp()
        })
      );
      
      // Execute all order updates
      await Promise.all([...accountOrderUpdates, ...emailOrderUpdates]);
      ordersAffected = ordersWithAccountQuery.size + emailOrderUpdates.length;
      console.log(`Marked ${ordersAffected} orders as orphaned for B2C customer ${customerId}`);
    } catch (error) {
      console.error('Error marking orders as orphaned:', error);
    }

    // Create audit log entry
    try {
      await db.collection('auditLogs').add({
        action: 'delete_b2c_customer',
        targetId: customerId,
        targetType: 'b2cCustomer',
        targetEmail: customerData.email,
        targetName: `${customerData.firstName} ${customerData.lastName}`,
        performedBy: userAuth.uid,
        performedAt: FieldValue.serverTimestamp(),
        details: {
          ordersAffected: ordersAffected,
          firebaseAuthDeleted: !!authDeletionResult && authDeletionResult.startsWith('deleted'),
          authDeletionMethod: authDeletionResult
        }
      });
      console.log('Audit log entry created for B2C customer deletion');
    } catch (auditError) {
      console.warn('Could not create audit log:', auditError);
      // Continue even if audit logging fails
    }

    // Finally, delete the B2C customer document
    await db.collection('b2cCustomers').doc(customerId).delete();

    console.log(`B2C Customer ${customerId} (${customerData.email}) deleted successfully by admin ${userAuth.uid}`);

    return {
      success: true,
      message: 'B2C-kund har tagits bort permanent',
      customerId: customerId,
      email: customerData.email,
      customerName: `${customerData.firstName} ${customerData.lastName}`,
      deletionResults: {
        customer: true,
        ordersAffected: ordersAffected,
        authAccount: authDeletionResult
      }
    };

  } catch (error) {
    console.error('Error in deleteB2CCustomerAccount:', error);
    throw new Error(`Kunde inte ta bort B2C-kund: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Toggle Customer Active Status (Admin Only)
export const toggleCustomerActiveStatus = onCall<ToggleCustomerStatusData>(async (request) => {
  const { auth: userAuth, data } = request;
  if (!userAuth?.uid) {
    throw new Error('Måste vara inloggad');
  }

  try {
    // Get admin user data to verify permissions
    const adminDoc = await db.collection('users').doc(userAuth.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      throw new Error('Måste vara administratör');
    }

    const { customerId, activeStatus } = data;
    if (!customerId || typeof activeStatus !== 'boolean') {
      throw new Error('Customer ID och aktiv status krävs');
    }

    // Get customer data
    const customerDoc = await db.collection('users').doc(customerId).get();
    if (!customerDoc.exists) {
      throw new Error('Kunden kunde inte hittas');
    }

    const customerData = customerDoc.data() as CustomerData;

    // 🛡️ TENANT ISOLATION (Admin SDK bypasses rules): platform may toggle in any
    // shop; a shop admin only their own. Target shopId from the resource doc.
    const adminData = adminDoc.data();
    if (adminData?.platform !== true && adminData?.shopId !== customerData.shopId) {
      throw new Error('Du har inte behörighet att hantera kunder i en annan butik');
    }

    let authUpdateResult: string | null = null;

    // Update Firebase Auth account if it exists
    if (customerData.firebaseAuthUid) {
      try {
        await auth.updateUser(customerData.firebaseAuthUid, {
          disabled: !activeStatus // disabled = true when activeStatus = false
        });
        authUpdateResult = 'updated_by_uid';
        console.log(`Updated Firebase Auth user status by UID: ${customerData.firebaseAuthUid} (disabled: ${!activeStatus})`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`Firebase Auth user not found by UID: ${customerData.firebaseAuthUid}`);
          authUpdateResult = 'not_found_by_uid';
        } else {
          console.error(`Error updating Firebase Auth user by UID: ${authError.message}`);
          // Continue with email-based update attempt
        }
      }
    }

    // Fallback: try to update by email if UID update failed
    if (!authUpdateResult || authUpdateResult === 'not_found_by_uid') {
      try {
        const authUser = await auth.getUserByEmail(customerData.email);
        await auth.updateUser(authUser.uid, {
          disabled: !activeStatus
        });
        authUpdateResult = 'updated_by_email';
        console.log(`Updated Firebase Auth user status by email: ${customerData.email} (disabled: ${!activeStatus})`);
        
        // Update Firestore with the found auth UID
        await db.collection('users').doc(customerId).update({
          firebaseAuthUid: authUser.uid,
          updatedAt: FieldValue.serverTimestamp()
        });
        
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.log(`Firebase Auth user not found by email: ${customerData.email}`);
          authUpdateResult = 'not_found_by_email';
        } else {
          console.error(`Error updating Firebase Auth user by email: ${authError.message}`);
          authUpdateResult = 'error';
        }
      }
    }

    // Update customer status in Firestore
    await db.collection('users').doc(customerId).update({
      active: activeStatus,
      isActive: activeStatus, // Update both properties for compatibility
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`Customer ${customerId} (${customerData.email}) status updated to ${activeStatus ? 'active' : 'inactive'} by admin ${userAuth.uid}`);

    return {
      success: true,
      message: `Kund ${activeStatus ? 'aktiverad' : 'inaktiverad'} framgångsrikt`,
      customerId: customerId,
      email: customerData.email,
      activeStatus: activeStatus,
      authUpdateResult: authUpdateResult
    };

  } catch (error) {
    console.error('Error in toggleCustomerActiveStatus:', error);
    throw new Error(`Kunde inte uppdatera kundstatus: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Create Admin User (HTTP endpoint)
export const createAdminUser = onRequest(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
  },
  async (req, res) => {
    if (!isMaintenanceAuthorized(req)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    try {
      console.log('Creating admin user in named database...');
      
      // Admin user data based on your login credentials
      const adminUserData = {
        email: adminSeedConfig.email,
        companyName: `${commerceConfig.shopName} Admin`,
        role: 'admin',
        isActive: true,
        active: true,
        contactPerson: 'Micke Ohlén',
        phone: '+46123456789',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      // Check if admin user already exists
      const existingAdmin = await db.collection('users')
        .where('email', '==', adminUserData.email)
        .get();
      
      if (!existingAdmin.empty) {
        console.log('Admin user already exists, updating...');
        const adminDoc = existingAdmin.docs[0];
        await db.collection('users').doc(adminDoc.id).update({
          ...adminUserData,
          updatedAt: FieldValue.serverTimestamp()
        });
        
        res.status(200).json({
          success: true,
          message: 'Admin user updated successfully',
          userId: adminDoc.id,
          email: adminUserData.email
        });
      } else {
        // Create new admin user
        const docRef = await db.collection('users').add(adminUserData);
        console.log(`Created admin user with ID: ${docRef.id}`);
        
        res.status(200).json({
          success: true,
          message: 'Admin user created successfully',
          userId: docRef.id,
          email: adminUserData.email
        });
      }
      
    } catch (error) {
      console.error('Error creating admin user:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);


/**
 * Maintenance endpoint: syncs the `role: admin` custom auth claim from the
 * users collection (named DB) onto Firebase Auth users. Storage rules cannot
 * read the named Firestore database (cross-service rules only support
 * (default)), so storage admin checks use this custom claim instead of a
 * hardcoded UID allowlist. Guarded by ADMIN_MAINTENANCE_SECRET (fail-closed).
 * Admins must re-login (or wait up to 1h for token refresh) after syncing.
 */
export const syncAdminClaims = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120
  },
  async (req, res) => {
    if (!isMaintenanceAuthorized(req as any)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    try {
      const adminUsers = await db.collection('users').where('role', '==', 'admin').get();
      const results: Array<{ uid: string; email?: string; status: string }> = [];

      for (const docSnap of adminUsers.docs) {
        const uid = docSnap.id;
        try {
          const userData = docSnap.data() || {};
          // Multi-tenant claims: shopId scopes a shop-admin; platform bypasses
          // scoping (super-admin). Storage rules can't read the named DB, so
          // these must live in the token. Firestore rules can read the doc but
          // also honor the claim. (Phase 3.)
          const desired = {
            role: 'admin' as const,
            shopId: userData.shopId || null,
            platform: userData.platform === true,
          };
          const userRecord = await auth.getUser(uid);
          const existingClaims = userRecord.customClaims || {};
          const upToDate =
            existingClaims.role === desired.role &&
            existingClaims.shopId === desired.shopId &&
            existingClaims.platform === desired.platform;
          if (!upToDate) {
            await auth.setCustomUserClaims(uid, { ...existingClaims, ...desired });
            results.push({ uid, email: userRecord.email, status: 'claim-set' });
          } else {
            results.push({ uid, email: userRecord.email, status: 'already-set' });
          }
        } catch (userError: any) {
          results.push({ uid, status: `error: ${userError.message}` });
        }
      }

      res.json({ success: true, adminCount: adminUsers.size, results });
    } catch (error: any) {
      console.error('syncAdminClaims failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
