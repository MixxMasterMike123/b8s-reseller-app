"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.debugDatabase = exports.checkNamedDatabase = exports.createAdminUser = exports.toggleCustomerActiveStatus = exports.deleteB2CCustomerAccount = exports.deleteCustomerAccount = void 0;
var https_1 = require("firebase-functions/v2/https");
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var auth_1 = require("firebase-admin/auth");
var database_1 = require("../config/database");
// Get Firebase Auth from already initialized app
var auth = (0, auth_1.getAuth)((0, app_1.getApp)());
// Delete Customer Account (Admin Only)
exports.deleteCustomerAccount = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userAuth, data, adminDoc, customerId, customerDoc, customerData, authDeletionResult, authError_1, authUser, authError_2, deletionResults, ordersQuery, orderDeletePromises, error_1, materialsQuery, materialDeletePromises, error_2, adminDocsQuery, adminDocDeletePromises, error_3, error_4;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userAuth = request.auth, data = request.data;
                if (!(userAuth === null || userAuth === void 0 ? void 0 : userAuth.uid)) {
                    throw new Error('Måste vara inloggad');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 27, , 28]);
                return [4 /*yield*/, database_1.db.collection('users').doc(userAuth.uid).get()];
            case 2:
                adminDoc = _b.sent();
                if (!adminDoc.exists || ((_a = adminDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                    throw new Error('Måste vara administratör');
                }
                customerId = data.customerId;
                if (!customerId) {
                    throw new Error('Customer ID krävs');
                }
                return [4 /*yield*/, database_1.db.collection('users').doc(customerId).get()];
            case 3:
                customerDoc = _b.sent();
                if (!customerDoc.exists) {
                    throw new Error('Kunden kunde inte hittas');
                }
                customerData = customerDoc.data();
                authDeletionResult = null;
                if (!customerData.firebaseAuthUid) return [3 /*break*/, 7];
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 7]);
                return [4 /*yield*/, auth.deleteUser(customerData.firebaseAuthUid)];
            case 5:
                _b.sent();
                authDeletionResult = 'deleted_by_uid';
                console.log("Deleted Firebase Auth user by UID: ".concat(customerData.firebaseAuthUid));
                return [3 /*break*/, 7];
            case 6:
                authError_1 = _b.sent();
                if (authError_1.code === 'auth/user-not-found') {
                    console.log("Firebase Auth user not found by UID: ".concat(customerData.firebaseAuthUid));
                    authDeletionResult = 'not_found_by_uid';
                }
                else {
                    console.error("Error deleting Firebase Auth user by UID: ".concat(authError_1.message));
                    // Continue with email-based deletion attempt
                }
                return [3 /*break*/, 7];
            case 7:
                if (!(!authDeletionResult || authDeletionResult === 'not_found_by_uid')) return [3 /*break*/, 12];
                _b.label = 8;
            case 8:
                _b.trys.push([8, 11, , 12]);
                return [4 /*yield*/, auth.getUserByEmail(customerData.email)];
            case 9:
                authUser = _b.sent();
                return [4 /*yield*/, auth.deleteUser(authUser.uid)];
            case 10:
                _b.sent();
                authDeletionResult = 'deleted_by_email';
                console.log("Deleted Firebase Auth user by email: ".concat(customerData.email));
                return [3 /*break*/, 12];
            case 11:
                authError_2 = _b.sent();
                if (authError_2.code === 'auth/user-not-found') {
                    console.log("Firebase Auth user not found by email: ".concat(customerData.email));
                    authDeletionResult = 'not_found_by_email';
                }
                else {
                    console.error("Error deleting Firebase Auth user by email: ".concat(authError_2.message));
                    authDeletionResult = 'error';
                }
                return [3 /*break*/, 12];
            case 12:
                deletionResults = {
                    customer: false,
                    orders: 0,
                    marketingMaterials: 0,
                    adminDocuments: 0,
                    authAccount: authDeletionResult
                };
                _b.label = 13;
            case 13:
                _b.trys.push([13, 16, , 17]);
                return [4 /*yield*/, database_1.db.collection('orders').where('userId', '==', customerId).get()];
            case 14:
                ordersQuery = _b.sent();
                orderDeletePromises = ordersQuery.docs.map(function (doc) { return doc.ref["delete"](); });
                return [4 /*yield*/, Promise.all(orderDeletePromises)];
            case 15:
                _b.sent();
                deletionResults.orders = ordersQuery.size;
                console.log("Deleted ".concat(ordersQuery.size, " orders for customer ").concat(customerId));
                return [3 /*break*/, 17];
            case 16:
                error_1 = _b.sent();
                console.error('Error deleting customer orders:', error_1);
                return [3 /*break*/, 17];
            case 17:
                _b.trys.push([17, 20, , 21]);
                return [4 /*yield*/, database_1.db.collection('users').doc(customerId).collection('marketingMaterials').get()];
            case 18:
                materialsQuery = _b.sent();
                materialDeletePromises = materialsQuery.docs.map(function (doc) { return doc.ref["delete"](); });
                return [4 /*yield*/, Promise.all(materialDeletePromises)];
            case 19:
                _b.sent();
                deletionResults.marketingMaterials = materialsQuery.size;
                console.log("Deleted ".concat(materialsQuery.size, " marketing materials for customer ").concat(customerId));
                return [3 /*break*/, 21];
            case 20:
                error_2 = _b.sent();
                console.error('Error deleting customer marketing materials:', error_2);
                return [3 /*break*/, 21];
            case 21:
                _b.trys.push([21, 24, , 25]);
                return [4 /*yield*/, database_1.db.collection('adminCustomerDocuments').where('customerId', '==', customerId).get()];
            case 22:
                adminDocsQuery = _b.sent();
                adminDocDeletePromises = adminDocsQuery.docs.map(function (doc) { return doc.ref["delete"](); });
                return [4 /*yield*/, Promise.all(adminDocDeletePromises)];
            case 23:
                _b.sent();
                deletionResults.adminDocuments = adminDocsQuery.size;
                console.log("Deleted ".concat(adminDocsQuery.size, " admin documents for customer ").concat(customerId));
                return [3 /*break*/, 25];
            case 24:
                error_3 = _b.sent();
                console.error('Error deleting admin documents:', error_3);
                return [3 /*break*/, 25];
            case 25: 
            // Finally, delete the customer document
            return [4 /*yield*/, database_1.db.collection('users').doc(customerId)["delete"]()];
            case 26:
                // Finally, delete the customer document
                _b.sent();
                deletionResults.customer = true;
                console.log("Customer ".concat(customerId, " (").concat(customerData.email, ") deleted successfully by admin ").concat(userAuth.uid));
                return [2 /*return*/, {
                        success: true,
                        message: 'Kund och alla relaterade data har tagits bort framgångsrikt',
                        customerId: customerId,
                        email: customerData.email,
                        companyName: customerData.companyName,
                        deletionResults: deletionResults
                    }];
            case 27:
                error_4 = _b.sent();
                console.error('Error in deleteCustomerAccount:', error_4);
                throw new Error("Kunde inte ta bort kund: ".concat(error_4 instanceof Error ? error_4.message : 'Unknown error'));
            case 28: return [2 /*return*/];
        }
    });
}); });
// Delete B2C Customer Account (Admin Only)
exports.deleteB2CCustomerAccount = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userAuth, data, adminDoc, customerId, customerDoc, customerData, authDeletionResult, authError_3, authUser, authError_4, ordersAffected, ordersWithAccountQuery, accountOrderUpdates, ordersWithEmailQuery, emailOrderUpdates, error_5, auditError_1, error_6;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userAuth = request.auth, data = request.data;
                if (!(userAuth === null || userAuth === void 0 ? void 0 : userAuth.uid)) {
                    throw new Error('Måste vara inloggad');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 23, , 24]);
                return [4 /*yield*/, database_1.db.collection('users').doc(userAuth.uid).get()];
            case 2:
                adminDoc = _b.sent();
                if (!adminDoc.exists || ((_a = adminDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                    throw new Error('Måste vara administratör');
                }
                customerId = data.customerId;
                if (!customerId) {
                    throw new Error('Customer ID krävs');
                }
                return [4 /*yield*/, database_1.db.collection('b2cCustomers').doc(customerId).get()];
            case 3:
                customerDoc = _b.sent();
                if (!customerDoc.exists) {
                    throw new Error('B2C-kunden kunde inte hittas');
                }
                customerData = customerDoc.data();
                authDeletionResult = null;
                if (!customerData.firebaseAuthUid) return [3 /*break*/, 7];
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 7]);
                return [4 /*yield*/, auth.deleteUser(customerData.firebaseAuthUid)];
            case 5:
                _b.sent();
                authDeletionResult = 'deleted_by_uid';
                console.log("Deleted Firebase Auth user by UID: ".concat(customerData.firebaseAuthUid));
                return [3 /*break*/, 7];
            case 6:
                authError_3 = _b.sent();
                if (authError_3.code === 'auth/user-not-found') {
                    console.log("Firebase Auth user not found by UID: ".concat(customerData.firebaseAuthUid));
                    authDeletionResult = 'not_found_by_uid';
                }
                else {
                    console.error("Error deleting Firebase Auth user by UID: ".concat(authError_3.message));
                    // Continue with email-based deletion attempt
                }
                return [3 /*break*/, 7];
            case 7:
                if (!(!authDeletionResult || authDeletionResult === 'not_found_by_uid')) return [3 /*break*/, 12];
                _b.label = 8;
            case 8:
                _b.trys.push([8, 11, , 12]);
                return [4 /*yield*/, auth.getUserByEmail(customerData.email)];
            case 9:
                authUser = _b.sent();
                return [4 /*yield*/, auth.deleteUser(authUser.uid)];
            case 10:
                _b.sent();
                authDeletionResult = 'deleted_by_email';
                console.log("Deleted Firebase Auth user by email: ".concat(customerData.email));
                return [3 /*break*/, 12];
            case 11:
                authError_4 = _b.sent();
                if (authError_4.code === 'auth/user-not-found') {
                    console.log("Firebase Auth user not found by email: ".concat(customerData.email));
                    authDeletionResult = 'not_found_by_email';
                }
                else {
                    console.error("Error deleting Firebase Auth user by email: ".concat(authError_4.message));
                    authDeletionResult = 'error';
                }
                return [3 /*break*/, 12];
            case 12:
                ordersAffected = 0;
                _b.label = 13;
            case 13:
                _b.trys.push([13, 17, , 18]);
                return [4 /*yield*/, database_1.db.collection('orders').where('b2cCustomerId', '==', customerId).get()];
            case 14:
                ordersWithAccountQuery = _b.sent();
                accountOrderUpdates = ordersWithAccountQuery.docs.map(function (doc) {
                    return doc.ref.update({
                        customerDeleted: true,
                        customerDeletedAt: firestore_1.FieldValue.serverTimestamp(),
                        customerDeletedBy: userAuth.uid,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                });
                return [4 /*yield*/, database_1.db.collection('orders')
                        .where('source', '==', 'b2c')
                        .where('customerInfo.email', '==', customerData.email)
                        .get()];
            case 15:
                ordersWithEmailQuery = _b.sent();
                emailOrderUpdates = ordersWithEmailQuery.docs.map(function (doc) {
                    return doc.ref.update({
                        customerDeleted: true,
                        customerDeletedAt: firestore_1.FieldValue.serverTimestamp(),
                        customerDeletedBy: userAuth.uid,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                });
                // Execute all order updates
                return [4 /*yield*/, Promise.all(__spreadArray(__spreadArray([], accountOrderUpdates, true), emailOrderUpdates, true))];
            case 16:
                // Execute all order updates
                _b.sent();
                ordersAffected = ordersWithAccountQuery.size + emailOrderUpdates.length;
                console.log("Marked ".concat(ordersAffected, " orders as orphaned for B2C customer ").concat(customerId));
                return [3 /*break*/, 18];
            case 17:
                error_5 = _b.sent();
                console.error('Error marking orders as orphaned:', error_5);
                return [3 /*break*/, 18];
            case 18:
                _b.trys.push([18, 20, , 21]);
                return [4 /*yield*/, database_1.db.collection('auditLogs').add({
                        action: 'delete_b2c_customer',
                        targetId: customerId,
                        targetType: 'b2cCustomer',
                        targetEmail: customerData.email,
                        targetName: "".concat(customerData.firstName, " ").concat(customerData.lastName),
                        performedBy: userAuth.uid,
                        performedAt: firestore_1.FieldValue.serverTimestamp(),
                        details: {
                            ordersAffected: ordersAffected,
                            firebaseAuthDeleted: !!authDeletionResult && authDeletionResult.startsWith('deleted'),
                            authDeletionMethod: authDeletionResult
                        }
                    })];
            case 19:
                _b.sent();
                console.log('Audit log entry created for B2C customer deletion');
                return [3 /*break*/, 21];
            case 20:
                auditError_1 = _b.sent();
                console.warn('Could not create audit log:', auditError_1);
                return [3 /*break*/, 21];
            case 21: 
            // Finally, delete the B2C customer document
            return [4 /*yield*/, database_1.db.collection('b2cCustomers').doc(customerId)["delete"]()];
            case 22:
                // Finally, delete the B2C customer document
                _b.sent();
                console.log("B2C Customer ".concat(customerId, " (").concat(customerData.email, ") deleted successfully by admin ").concat(userAuth.uid));
                return [2 /*return*/, {
                        success: true,
                        message: 'B2C-kund har tagits bort permanent',
                        customerId: customerId,
                        email: customerData.email,
                        customerName: "".concat(customerData.firstName, " ").concat(customerData.lastName),
                        deletionResults: {
                            customer: true,
                            ordersAffected: ordersAffected,
                            authAccount: authDeletionResult
                        }
                    }];
            case 23:
                error_6 = _b.sent();
                console.error('Error in deleteB2CCustomerAccount:', error_6);
                throw new Error("Kunde inte ta bort B2C-kund: ".concat(error_6 instanceof Error ? error_6.message : 'Unknown error'));
            case 24: return [2 /*return*/];
        }
    });
}); });
// Toggle Customer Active Status (Admin Only)
exports.toggleCustomerActiveStatus = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var userAuth, data, adminDoc, customerId, activeStatus, customerDoc, customerData, authUpdateResult, authError_5, authUser, authError_6, error_7;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                userAuth = request.auth, data = request.data;
                if (!(userAuth === null || userAuth === void 0 ? void 0 : userAuth.uid)) {
                    throw new Error('Måste vara inloggad');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 15, , 16]);
                return [4 /*yield*/, database_1.db.collection('users').doc(userAuth.uid).get()];
            case 2:
                adminDoc = _b.sent();
                if (!adminDoc.exists || ((_a = adminDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                    throw new Error('Måste vara administratör');
                }
                customerId = data.customerId, activeStatus = data.activeStatus;
                if (!customerId || typeof activeStatus !== 'boolean') {
                    throw new Error('Customer ID och aktiv status krävs');
                }
                return [4 /*yield*/, database_1.db.collection('users').doc(customerId).get()];
            case 3:
                customerDoc = _b.sent();
                if (!customerDoc.exists) {
                    throw new Error('Kunden kunde inte hittas');
                }
                customerData = customerDoc.data();
                authUpdateResult = null;
                if (!customerData.firebaseAuthUid) return [3 /*break*/, 7];
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 7]);
                return [4 /*yield*/, auth.updateUser(customerData.firebaseAuthUid, {
                        disabled: !activeStatus // disabled = true when activeStatus = false
                    })];
            case 5:
                _b.sent();
                authUpdateResult = 'updated_by_uid';
                console.log("Updated Firebase Auth user status by UID: ".concat(customerData.firebaseAuthUid, " (disabled: ").concat(!activeStatus, ")"));
                return [3 /*break*/, 7];
            case 6:
                authError_5 = _b.sent();
                if (authError_5.code === 'auth/user-not-found') {
                    console.log("Firebase Auth user not found by UID: ".concat(customerData.firebaseAuthUid));
                    authUpdateResult = 'not_found_by_uid';
                }
                else {
                    console.error("Error updating Firebase Auth user by UID: ".concat(authError_5.message));
                    // Continue with email-based update attempt
                }
                return [3 /*break*/, 7];
            case 7:
                if (!(!authUpdateResult || authUpdateResult === 'not_found_by_uid')) return [3 /*break*/, 13];
                _b.label = 8;
            case 8:
                _b.trys.push([8, 12, , 13]);
                return [4 /*yield*/, auth.getUserByEmail(customerData.email)];
            case 9:
                authUser = _b.sent();
                return [4 /*yield*/, auth.updateUser(authUser.uid, {
                        disabled: !activeStatus
                    })];
            case 10:
                _b.sent();
                authUpdateResult = 'updated_by_email';
                console.log("Updated Firebase Auth user status by email: ".concat(customerData.email, " (disabled: ").concat(!activeStatus, ")"));
                // Update Firestore with the found auth UID
                return [4 /*yield*/, database_1.db.collection('users').doc(customerId).update({
                        firebaseAuthUid: authUser.uid,
                        updatedAt: firestore_1.FieldValue.serverTimestamp()
                    })];
            case 11:
                // Update Firestore with the found auth UID
                _b.sent();
                return [3 /*break*/, 13];
            case 12:
                authError_6 = _b.sent();
                if (authError_6.code === 'auth/user-not-found') {
                    console.log("Firebase Auth user not found by email: ".concat(customerData.email));
                    authUpdateResult = 'not_found_by_email';
                }
                else {
                    console.error("Error updating Firebase Auth user by email: ".concat(authError_6.message));
                    authUpdateResult = 'error';
                }
                return [3 /*break*/, 13];
            case 13: 
            // Update customer status in Firestore
            return [4 /*yield*/, database_1.db.collection('users').doc(customerId).update({
                    active: activeStatus,
                    isActive: activeStatus,
                    updatedAt: firestore_1.FieldValue.serverTimestamp()
                })];
            case 14:
                // Update customer status in Firestore
                _b.sent();
                console.log("Customer ".concat(customerId, " (").concat(customerData.email, ") status updated to ").concat(activeStatus ? 'active' : 'inactive', " by admin ").concat(userAuth.uid));
                return [2 /*return*/, {
                        success: true,
                        message: "Kund ".concat(activeStatus ? 'aktiverad' : 'inaktiverad', " framg\u00E5ngsrikt"),
                        customerId: customerId,
                        email: customerData.email,
                        activeStatus: activeStatus,
                        authUpdateResult: authUpdateResult
                    }];
            case 15:
                error_7 = _b.sent();
                console.error('Error in toggleCustomerActiveStatus:', error_7);
                throw new Error("Kunde inte uppdatera kundstatus: ".concat(error_7 instanceof Error ? error_7.message : 'Unknown error'));
            case 16: return [2 /*return*/];
        }
    });
}); });
// Create Admin User (HTTP endpoint)
exports.createAdminUser = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var adminUserData, existingAdmin, adminDoc, docRef, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 6, , 7]);
                console.log('Creating admin user in named database...');
                adminUserData = {
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
                return [4 /*yield*/, database_1.db.collection('users')
                        .where('email', '==', adminUserData.email)
                        .get()];
            case 1:
                existingAdmin = _a.sent();
                if (!!existingAdmin.empty) return [3 /*break*/, 3];
                console.log('Admin user already exists, updating...');
                adminDoc = existingAdmin.docs[0];
                return [4 /*yield*/, database_1.db.collection('users').doc(adminDoc.id).update(__assign(__assign({}, adminUserData), { updatedAt: firestore_1.FieldValue.serverTimestamp() }))];
            case 2:
                _a.sent();
                res.status(200).json({
                    success: true,
                    message: 'Admin user updated successfully',
                    userId: adminDoc.id,
                    email: adminUserData.email
                });
                return [3 /*break*/, 5];
            case 3: return [4 /*yield*/, database_1.db.collection('users').add(adminUserData)];
            case 4:
                docRef = _a.sent();
                console.log("Created admin user with ID: ".concat(docRef.id));
                res.status(200).json({
                    success: true,
                    message: 'Admin user created successfully',
                    userId: docRef.id,
                    email: adminUserData.email
                });
                _a.label = 5;
            case 5: return [3 /*break*/, 7];
            case 6:
                error_8 = _a.sent();
                console.error('Error creating admin user:', error_8);
                res.status(500).json({
                    success: false,
                    error: error_8 instanceof Error ? error_8.message : 'Unknown error'
                });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
// Check Named Database Contents (HTTP endpoint)
exports.checkNamedDatabase = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var collections, results, _i, collections_1, collectionName, snapshot, error_9, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                console.log('Checking named database contents...');
                collections = ['users', 'orders', 'products', 'orderStatuses', 'settings', 'order-statuses', 'app-settings', 'affiliates', 'marketingMaterials'];
                results = {};
                _i = 0, collections_1 = collections;
                _a.label = 1;
            case 1:
                if (!(_i < collections_1.length)) return [3 /*break*/, 6];
                collectionName = collections_1[_i];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, database_1.db.collection(collectionName).get()];
            case 3:
                snapshot = _a.sent();
                results[collectionName] = {
                    count: snapshot.size,
                    docs: snapshot.docs.slice(0, 5).map(function (doc) { return ({
                        id: doc.id,
                        data: doc.data()
                    }); })
                };
                console.log("Collection ".concat(collectionName, ": ").concat(snapshot.size, " documents"));
                return [3 /*break*/, 5];
            case 4:
                error_9 = _a.sent();
                console.log("Collection ".concat(collectionName, ": Error accessing - ").concat(error_9 instanceof Error ? error_9.message : 'Unknown error'));
                results[collectionName] = { error: error_9 instanceof Error ? error_9.message : 'Unknown error' };
                return [3 /*break*/, 5];
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6:
                res.status(200).json({
                    success: true,
                    message: 'Named database check completed',
                    database: 'b8s-reseller-db',
                    collections: results
                });
                return [3 /*break*/, 8];
            case 7:
                error_10 = _a.sent();
                console.error('Error checking named database:', error_10);
                res.status(500).json({
                    success: false,
                    error: error_10 instanceof Error ? error_10.message : 'Unknown error'
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
// Debug Database Contents (HTTP endpoint)
exports.debugDatabase = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ordersSnapshot, orders_1, usersSnapshot, users_1, productsSnapshot, products_1, affiliatesSnapshot, affiliates_1, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                console.log('Debugging database contents...');
                return [4 /*yield*/, database_1.db.collection('orders').get()];
            case 1:
                ordersSnapshot = _a.sent();
                orders_1 = [];
                ordersSnapshot.forEach(function (doc) {
                    orders_1.push({
                        id: doc.id,
                        orderNumber: doc.data().orderNumber,
                        status: doc.data().status,
                        userId: doc.data().userId,
                        createdAt: doc.data().createdAt
                    });
                });
                return [4 /*yield*/, database_1.db.collection('users').get()];
            case 2:
                usersSnapshot = _a.sent();
                users_1 = [];
                usersSnapshot.forEach(function (doc) {
                    users_1.push({
                        id: doc.id,
                        email: doc.data().email,
                        companyName: doc.data().companyName,
                        role: doc.data().role,
                        active: doc.data().active || doc.data().isActive
                    });
                });
                return [4 /*yield*/, database_1.db.collection('products').get()];
            case 3:
                productsSnapshot = _a.sent();
                products_1 = [];
                productsSnapshot.forEach(function (doc) {
                    products_1.push({
                        id: doc.id,
                        name: doc.data().name,
                        sku: doc.data().sku,
                        isActive: doc.data().isActive
                    });
                });
                return [4 /*yield*/, database_1.db.collection('affiliates').get()];
            case 4:
                affiliatesSnapshot = _a.sent();
                affiliates_1 = [];
                affiliatesSnapshot.forEach(function (doc) {
                    affiliates_1.push({
                        id: doc.id,
                        email: doc.data().email,
                        affiliateCode: doc.data().affiliateCode,
                        status: doc.data().status
                    });
                });
                console.log("Found ".concat(orders_1.length, " orders, ").concat(users_1.length, " users, ").concat(products_1.length, " products, ").concat(affiliates_1.length, " affiliates"));
                res.status(200).json({
                    success: true,
                    database: 'b8s-reseller-db',
                    orders: orders_1,
                    users: users_1,
                    products: products_1,
                    affiliates: affiliates_1,
                    counts: {
                        orders: orders_1.length,
                        users: users_1.length,
                        products: products_1.length,
                        affiliates: affiliates_1.length
                    }
                });
                return [3 /*break*/, 6];
            case 5:
                error_11 = _a.sent();
                console.error('Error debugging database:', error_11);
                res.status(500).json({
                    success: false,
                    error: error_11 instanceof Error ? error_11.message : 'Unknown error'
                });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
