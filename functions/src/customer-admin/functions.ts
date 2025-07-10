import { onRequest, onCall } from 'firebase-functions/v2/https';
import { getApp } from 'firebase-admin/app';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../email/email-handler';

// Get Firebase Auth from already initialized app
const auth = getAuth(getApp());

// Types for customer and admin functions
interface DeleteCustomerData {
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
    try {
      console.log('Creating admin user in named database...');
      
      // Admin user data based on your login credentials
      const adminUserData = {
        email: 'micke.ohlen@gmail.com',
        companyName: 'B8Shield Admin',
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

// Check Named Database Contents (HTTP endpoint)
export const checkNamedDatabase = onRequest(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
  },
  async (req, res) => {
    try {
      console.log('Checking named database contents...');
      
      // Check all collections in named database
      const collections = ['users', 'orders', 'products', 'orderStatuses', 'settings', 'order-statuses', 'app-settings', 'affiliates', 'marketingMaterials'];
      const results: Record<string, any> = {};
      
      for (const collectionName of collections) {
        try {
          const snapshot = await db.collection(collectionName).get();
          results[collectionName] = {
            count: snapshot.size,
            docs: snapshot.docs.slice(0, 5).map(doc => ({ // Limit to first 5 docs for performance
              id: doc.id,
              data: doc.data()
            }))
          };
          console.log(`Collection ${collectionName}: ${snapshot.size} documents`);
        } catch (error) {
          console.log(`Collection ${collectionName}: Error accessing - ${error instanceof Error ? error.message : 'Unknown error'}`);
          results[collectionName] = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Named database check completed',
        database: 'b8s-reseller-db',
        collections: results
      });
      
    } catch (error) {
      console.error('Error checking named database:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Debug Database Contents (HTTP endpoint)
export const debugDatabase = onRequest(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
  },
  async (req, res) => {
    try {
      console.log('Debugging database contents...');
      
      // Check orders
      const ordersSnapshot = await db.collection('orders').get();
      const orders: any[] = [];
      ordersSnapshot.forEach(doc => {
        orders.push({
          id: doc.id,
          orderNumber: doc.data().orderNumber,
          status: doc.data().status,
          userId: doc.data().userId,
          createdAt: doc.data().createdAt
        });
      });
      
      // Check users
      const usersSnapshot = await db.collection('users').get();
      const users: any[] = [];
      usersSnapshot.forEach(doc => {
        users.push({
          id: doc.id,
          email: doc.data().email,
          companyName: doc.data().companyName,
          role: doc.data().role,
          active: doc.data().active || doc.data().isActive
        });
      });

      // Check products
      const productsSnapshot = await db.collection('products').get();
      const products: any[] = [];
      productsSnapshot.forEach(doc => {
        products.push({
          id: doc.id,
          name: doc.data().name,
          sku: doc.data().sku,
          isActive: doc.data().isActive
        });
      });

      // Check affiliates
      const affiliatesSnapshot = await db.collection('affiliates').get();
      const affiliates: any[] = [];
      affiliatesSnapshot.forEach(doc => {
        affiliates.push({
          id: doc.id,
          email: doc.data().email,
          affiliateCode: doc.data().affiliateCode,
          status: doc.data().status
        });
      });
      
      console.log(`Found ${orders.length} orders, ${users.length} users, ${products.length} products, ${affiliates.length} affiliates`);
      
      res.status(200).json({
        success: true,
        database: 'b8s-reseller-db',
        orders: orders,
        users: users,
        products: products,
        affiliates: affiliates,
        counts: {
          orders: orders.length,
          users: users.length,
          products: products.length,
          affiliates: affiliates.length
        }
      });
      
    } catch (error) {
      console.error('Error debugging database:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
); 