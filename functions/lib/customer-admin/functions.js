"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugDatabase = exports.checkNamedDatabase = exports.createAdminUser = exports.toggleCustomerActiveStatus = exports.deleteB2CCustomerAccount = exports.deleteCustomerAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const email_handler_1 = require("../email/email-handler");
// Get Firebase Auth from already initialized app
const auth = (0, auth_1.getAuth)((0, app_1.getApp)());
// Delete Customer Account (Admin Only)
exports.deleteCustomerAccount = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth, data } = request;
    if (!userAuth?.uid) {
        throw new Error('Måste vara inloggad');
    }
    try {
        // Get admin user data to verify permissions
        const adminDoc = await email_handler_1.db.collection('users').doc(userAuth.uid).get();
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new Error('Måste vara administratör');
        }
        const { customerId } = data;
        if (!customerId) {
            throw new Error('Customer ID krävs');
        }
        // Get customer data
        const customerDoc = await email_handler_1.db.collection('users').doc(customerId).get();
        if (!customerDoc.exists) {
            throw new Error('Kunden kunde inte hittas');
        }
        const customerData = customerDoc.data();
        let authDeletionResult = null;
        // Delete Firebase Auth account if it exists
        if (customerData.firebaseAuthUid) {
            try {
                await auth.deleteUser(customerData.firebaseAuthUid);
                authDeletionResult = 'deleted_by_uid';
                console.log(`Deleted Firebase Auth user by UID: ${customerData.firebaseAuthUid}`);
            }
            catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`Firebase Auth user not found by UID: ${customerData.firebaseAuthUid}`);
                    authDeletionResult = 'not_found_by_uid';
                }
                else {
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
            }
            catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`Firebase Auth user not found by email: ${customerData.email}`);
                    authDeletionResult = 'not_found_by_email';
                }
                else {
                    console.error(`Error deleting Firebase Auth user by email: ${authError.message}`);
                    authDeletionResult = 'error';
                }
            }
        }
        // Delete related data
        const deletionResults = {
            customer: false,
            orders: 0,
            marketingMaterials: 0,
            adminDocuments: 0,
            authAccount: authDeletionResult
        };
        // Delete customer's orders
        try {
            const ordersQuery = await email_handler_1.db.collection('orders').where('userId', '==', customerId).get();
            const orderDeletePromises = ordersQuery.docs.map(doc => doc.ref.delete());
            await Promise.all(orderDeletePromises);
            deletionResults.orders = ordersQuery.size;
            console.log(`Deleted ${ordersQuery.size} orders for customer ${customerId}`);
        }
        catch (error) {
            console.error('Error deleting customer orders:', error);
        }
        // Delete customer's marketing materials
        try {
            const materialsQuery = await email_handler_1.db.collection('users').doc(customerId).collection('marketingMaterials').get();
            const materialDeletePromises = materialsQuery.docs.map(doc => doc.ref.delete());
            await Promise.all(materialDeletePromises);
            deletionResults.marketingMaterials = materialsQuery.size;
            console.log(`Deleted ${materialsQuery.size} marketing materials for customer ${customerId}`);
        }
        catch (error) {
            console.error('Error deleting customer marketing materials:', error);
        }
        // Delete admin documents for this customer
        try {
            const adminDocsQuery = await email_handler_1.db.collection('adminCustomerDocuments').where('customerId', '==', customerId).get();
            const adminDocDeletePromises = adminDocsQuery.docs.map(doc => doc.ref.delete());
            await Promise.all(adminDocDeletePromises);
            deletionResults.adminDocuments = adminDocsQuery.size;
            console.log(`Deleted ${adminDocsQuery.size} admin documents for customer ${customerId}`);
        }
        catch (error) {
            console.error('Error deleting admin documents:', error);
        }
        // Finally, delete the customer document
        await email_handler_1.db.collection('users').doc(customerId).delete();
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
    }
    catch (error) {
        console.error('Error in deleteCustomerAccount:', error);
        throw new Error(`Kunde inte ta bort kund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// Delete B2C Customer Account (Admin Only)
exports.deleteB2CCustomerAccount = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth, data } = request;
    if (!userAuth?.uid) {
        throw new Error('Måste vara inloggad');
    }
    try {
        // Get admin user data to verify permissions
        const adminDoc = await email_handler_1.db.collection('users').doc(userAuth.uid).get();
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new Error('Måste vara administratör');
        }
        const { customerId } = data;
        if (!customerId) {
            throw new Error('Customer ID krävs');
        }
        // Get B2C customer data
        const customerDoc = await email_handler_1.db.collection('b2cCustomers').doc(customerId).get();
        if (!customerDoc.exists) {
            throw new Error('B2C-kunden kunde inte hittas');
        }
        const customerData = customerDoc.data();
        let authDeletionResult = null;
        // Delete Firebase Auth account if it exists
        if (customerData.firebaseAuthUid) {
            try {
                await auth.deleteUser(customerData.firebaseAuthUid);
                authDeletionResult = 'deleted_by_uid';
                console.log(`Deleted Firebase Auth user by UID: ${customerData.firebaseAuthUid}`);
            }
            catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`Firebase Auth user not found by UID: ${customerData.firebaseAuthUid}`);
                    authDeletionResult = 'not_found_by_uid';
                }
                else {
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
            }
            catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`Firebase Auth user not found by email: ${customerData.email}`);
                    authDeletionResult = 'not_found_by_email';
                }
                else {
                    console.error(`Error deleting Firebase Auth user by email: ${authError.message}`);
                    authDeletionResult = 'error';
                }
            }
        }
        // Mark orders as orphaned (customer deleted) instead of deleting them
        let ordersAffected = 0;
        try {
            // Find orders with b2cCustomerId
            const ordersWithAccountQuery = await email_handler_1.db.collection('orders').where('b2cCustomerId', '==', customerId).get();
            const accountOrderUpdates = ordersWithAccountQuery.docs.map(doc => doc.ref.update({
                customerDeleted: true,
                customerDeletedAt: firestore_1.FieldValue.serverTimestamp(),
                customerDeletedBy: userAuth.uid,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            }));
            // Find orders by email (guest orders)
            const ordersWithEmailQuery = await email_handler_1.db.collection('orders')
                .where('source', '==', 'b2c')
                .where('customerInfo.email', '==', customerData.email)
                .get();
            const emailOrderUpdates = ordersWithEmailQuery.docs.map(doc => doc.ref.update({
                customerDeleted: true,
                customerDeletedAt: firestore_1.FieldValue.serverTimestamp(),
                customerDeletedBy: userAuth.uid,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            }));
            // Execute all order updates
            await Promise.all([...accountOrderUpdates, ...emailOrderUpdates]);
            ordersAffected = ordersWithAccountQuery.size + emailOrderUpdates.length;
            console.log(`Marked ${ordersAffected} orders as orphaned for B2C customer ${customerId}`);
        }
        catch (error) {
            console.error('Error marking orders as orphaned:', error);
        }
        // Create audit log entry
        try {
            await email_handler_1.db.collection('auditLogs').add({
                action: 'delete_b2c_customer',
                targetId: customerId,
                targetType: 'b2cCustomer',
                targetEmail: customerData.email,
                targetName: `${customerData.firstName} ${customerData.lastName}`,
                performedBy: userAuth.uid,
                performedAt: firestore_1.FieldValue.serverTimestamp(),
                details: {
                    ordersAffected: ordersAffected,
                    firebaseAuthDeleted: !!authDeletionResult && authDeletionResult.startsWith('deleted'),
                    authDeletionMethod: authDeletionResult
                }
            });
            console.log('Audit log entry created for B2C customer deletion');
        }
        catch (auditError) {
            console.warn('Could not create audit log:', auditError);
            // Continue even if audit logging fails
        }
        // Finally, delete the B2C customer document
        await email_handler_1.db.collection('b2cCustomers').doc(customerId).delete();
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
    }
    catch (error) {
        console.error('Error in deleteB2CCustomerAccount:', error);
        throw new Error(`Kunde inte ta bort B2C-kund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// Toggle Customer Active Status (Admin Only)
exports.toggleCustomerActiveStatus = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth, data } = request;
    if (!userAuth?.uid) {
        throw new Error('Måste vara inloggad');
    }
    try {
        // Get admin user data to verify permissions
        const adminDoc = await email_handler_1.db.collection('users').doc(userAuth.uid).get();
        if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
            throw new Error('Måste vara administratör');
        }
        const { customerId, activeStatus } = data;
        if (!customerId || typeof activeStatus !== 'boolean') {
            throw new Error('Customer ID och aktiv status krävs');
        }
        // Get customer data
        const customerDoc = await email_handler_1.db.collection('users').doc(customerId).get();
        if (!customerDoc.exists) {
            throw new Error('Kunden kunde inte hittas');
        }
        const customerData = customerDoc.data();
        let authUpdateResult = null;
        // Update Firebase Auth account if it exists
        if (customerData.firebaseAuthUid) {
            try {
                await auth.updateUser(customerData.firebaseAuthUid, {
                    disabled: !activeStatus // disabled = true when activeStatus = false
                });
                authUpdateResult = 'updated_by_uid';
                console.log(`Updated Firebase Auth user status by UID: ${customerData.firebaseAuthUid} (disabled: ${!activeStatus})`);
            }
            catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`Firebase Auth user not found by UID: ${customerData.firebaseAuthUid}`);
                    authUpdateResult = 'not_found_by_uid';
                }
                else {
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
                await email_handler_1.db.collection('users').doc(customerId).update({
                    firebaseAuthUid: authUser.uid,
                    updatedAt: firestore_1.FieldValue.serverTimestamp()
                });
            }
            catch (authError) {
                if (authError.code === 'auth/user-not-found') {
                    console.log(`Firebase Auth user not found by email: ${customerData.email}`);
                    authUpdateResult = 'not_found_by_email';
                }
                else {
                    console.error(`Error updating Firebase Auth user by email: ${authError.message}`);
                    authUpdateResult = 'error';
                }
            }
        }
        // Update customer status in Firestore
        await email_handler_1.db.collection('users').doc(customerId).update({
            active: activeStatus,
            isActive: activeStatus,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
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
    }
    catch (error) {
        console.error('Error in toggleCustomerActiveStatus:', error);
        throw new Error(`Kunde inte uppdatera kundstatus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// Create Admin User (HTTP endpoint)
exports.createAdminUser = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, async (req, res) => {
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        // Check if admin user already exists
        const existingAdmin = await email_handler_1.db.collection('users')
            .where('email', '==', adminUserData.email)
            .get();
        if (!existingAdmin.empty) {
            console.log('Admin user already exists, updating...');
            const adminDoc = existingAdmin.docs[0];
            await email_handler_1.db.collection('users').doc(adminDoc.id).update({
                ...adminUserData,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
            res.status(200).json({
                success: true,
                message: 'Admin user updated successfully',
                userId: adminDoc.id,
                email: adminUserData.email
            });
        }
        else {
            // Create new admin user
            const docRef = await email_handler_1.db.collection('users').add(adminUserData);
            console.log(`Created admin user with ID: ${docRef.id}`);
            res.status(200).json({
                success: true,
                message: 'Admin user created successfully',
                userId: docRef.id,
                email: adminUserData.email
            });
        }
    }
    catch (error) {
        console.error('Error creating admin user:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Check Named Database Contents (HTTP endpoint)
exports.checkNamedDatabase = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, async (req, res) => {
    try {
        console.log('Checking named database contents...');
        // Check all collections in named database
        const collections = ['users', 'orders', 'products', 'orderStatuses', 'settings', 'order-statuses', 'app-settings', 'affiliates', 'marketingMaterials'];
        const results = {};
        for (const collectionName of collections) {
            try {
                const snapshot = await email_handler_1.db.collection(collectionName).get();
                results[collectionName] = {
                    count: snapshot.size,
                    docs: snapshot.docs.slice(0, 5).map(doc => ({
                        id: doc.id,
                        data: doc.data()
                    }))
                };
                console.log(`Collection ${collectionName}: ${snapshot.size} documents`);
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Error checking named database:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Debug Database Contents (HTTP endpoint)
exports.debugDatabase = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, async (req, res) => {
    try {
        console.log('Debugging database contents...');
        // Check orders
        const ordersSnapshot = await email_handler_1.db.collection('orders').get();
        const orders = [];
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
        const usersSnapshot = await email_handler_1.db.collection('users').get();
        const users = [];
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
        const productsSnapshot = await email_handler_1.db.collection('products').get();
        const products = [];
        productsSnapshot.forEach(doc => {
            products.push({
                id: doc.id,
                name: doc.data().name,
                sku: doc.data().sku,
                isActive: doc.data().isActive
            });
        });
        // Check affiliates
        const affiliatesSnapshot = await email_handler_1.db.collection('affiliates').get();
        const affiliates = [];
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
    }
    catch (error) {
        console.error('Error debugging database:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=functions.js.map