"use strict";
// approveAffiliate - Unified Affiliate Approval Function
// Replaces: approveAffiliateV3
// Complete workflow: Creates Firebase Auth user + Affiliate record + Sends welcome email via orchestrator
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
exports.__esModule = true;
exports.approveAffiliate = void 0;
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-admin/firestore");
var auth_1 = require("firebase-admin/auth");
var EmailOrchestrator_1 = require("../core/EmailOrchestrator");
// Initialize Firebase services
var db = (0, firestore_1.getFirestore)('b8s-reseller-db');
var auth = (0, auth_1.getAuth)();
// Helper function for admin authentication
function verifyAdminAuth(authUid) {
    return __awaiter(this, void 0, void 0, function () {
        var userDoc, userData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!authUid) {
                        throw new Error('Authentication required');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db.collection('users').doc(authUid).get()];
                case 2:
                    userDoc = _a.sent();
                    userData = userDoc.data();
                    if (!userData || userData.role !== 'admin') {
                        throw new Error('Admin access required');
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('Admin verification failed:', error_1);
                    throw new Error('Unauthorized access');
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.approveAffiliate = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, applicationId, checkoutDiscount, phone, address, postalCode, city, country, socials, promotionMethod, message, applicationRef, applicationDoc, appData, tempPassword, authUser, wasExistingAuthUser, error_2, affiliateCode, affiliateData, orchestrator, emailResult, error_3;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 17, , 18]);
                console.log('🎉 approveAffiliate: Starting unified affiliate approval workflow');
                console.log('🎉 Request data:', {
                    applicationId: request.data.applicationId,
                    checkoutDiscount: request.data.checkoutDiscount
                });
                // Verify admin authentication
                return [4 /*yield*/, verifyAdminAuth((_b = request.auth) === null || _b === void 0 ? void 0 : _b.uid)];
            case 1:
                // Verify admin authentication
                _d.sent();
                _a = request.data, applicationId = _a.applicationId, checkoutDiscount = _a.checkoutDiscount, phone = _a.phone, address = _a.address, postalCode = _a.postalCode, city = _a.city, country = _a.country, socials = _a.socials, promotionMethod = _a.promotionMethod, message = _a.message;
                if (!applicationId) {
                    throw new Error('Application ID is required');
                }
                // 1. Get application data
                console.log('📄 Fetching affiliate application...');
                applicationRef = db.collection('affiliateApplications').doc(applicationId);
                return [4 /*yield*/, applicationRef.get()];
            case 2:
                applicationDoc = _d.sent();
                if (!applicationDoc.exists) {
                    throw new Error('Affiliate application not found');
                }
                appData = applicationDoc.data();
                if (!appData) {
                    throw new Error('Application data is missing');
                }
                // 2. Create Firebase Auth user
                console.log('🔐 Creating Firebase Auth user...');
                tempPassword = Math.random().toString(36).substring(2, 15);
                authUser = void 0;
                wasExistingAuthUser = false;
                _d.label = 3;
            case 3:
                _d.trys.push([3, 5, , 10]);
                return [4 /*yield*/, auth.createUser({
                        email: appData.email,
                        password: tempPassword,
                        displayName: appData.name,
                        emailVerified: true
                    })];
            case 4:
                authUser = _d.sent();
                console.log("\u2705 Created new Firebase Auth user for ".concat(appData.email));
                return [3 /*break*/, 10];
            case 5:
                error_2 = _d.sent();
                if (!(error_2.code === 'auth/email-already-exists')) return [3 /*break*/, 8];
                return [4 /*yield*/, auth.getUserByEmail(appData.email)];
            case 6:
                authUser = _d.sent();
                return [4 /*yield*/, auth.updateUser(authUser.uid, {
                        password: tempPassword
                    })];
            case 7:
                _d.sent();
                wasExistingAuthUser = true;
                console.log("\u2705 Updated existing user password for ".concat(appData.email));
                return [3 /*break*/, 9];
            case 8: throw error_2;
            case 9: return [3 /*break*/, 10];
            case 10:
                affiliateCode = "".concat(appData.name.substring(0, 3).toUpperCase()).concat(Math.random().toString(36).substring(2, 8).toUpperCase());
                console.log("\uD83C\uDFF7\uFE0F Generated affiliate code: ".concat(affiliateCode));
                // 4. Create affiliate record
                console.log('📝 Creating affiliate record...');
                affiliateData = {
                    id: authUser.uid,
                    affiliateCode: affiliateCode,
                    name: appData.name,
                    email: appData.email,
                    phone: phone || appData.phone || '',
                    address: address || appData.address || '',
                    postalCode: postalCode || appData.postalCode || '',
                    city: city || appData.city || '',
                    country: country || appData.country || 'SE',
                    socials: socials || appData.socials || {},
                    promotionMethod: promotionMethod || appData.promotionMethod || '',
                    message: message || appData.message || '',
                    status: 'active',
                    commissionRate: 15,
                    checkoutDiscount: Number(checkoutDiscount) || 10,
                    preferredLang: appData.preferredLang || 'sv-SE',
                    stats: {
                        clicks: 0,
                        conversions: 0,
                        totalEarnings: 0,
                        balance: 0
                    },
                    firebaseAuthUid: authUser.uid,
                    credentialsSent: false,
                    credentialsSentAt: null,
                    credentialsSentBy: null,
                    temporaryPassword: tempPassword,
                    requiresPasswordChange: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                return [4 /*yield*/, db.collection('affiliates').doc(authUser.uid).set(affiliateData)];
            case 11:
                _d.sent();
                console.log('✅ Affiliate record created successfully');
                // 5. Send welcome email via orchestrator
                console.log('📧 Sending welcome email via orchestrator...');
                orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'AFFILIATE_WELCOME',
                        customerInfo: {
                            email: appData.email,
                            name: appData.name
                        },
                        language: appData.preferredLang || 'sv-SE',
                        additionalData: {
                            affiliateInfo: {
                                name: appData.name,
                                email: appData.email,
                                affiliateCode: affiliateCode,
                                commissionRate: 15,
                                checkoutDiscount: Number(checkoutDiscount) || 10
                            },
                            credentials: {
                                email: appData.email,
                                temporaryPassword: tempPassword
                            },
                            wasExistingAuthUser: wasExistingAuthUser
                        }
                    })];
            case 12:
                emailResult = _d.sent();
                if (!!emailResult.success) return [3 /*break*/, 13];
                console.error('❌ Welcome email failed:', emailResult.error);
                return [3 /*break*/, 15];
            case 13:
                console.log('✅ Welcome email sent successfully');
                // Update affiliate record with email sent info
                return [4 /*yield*/, db.collection('affiliates').doc(authUser.uid).update({
                        credentialsSent: true,
                        credentialsSentAt: new Date(),
                        credentialsSentBy: ((_c = request.auth) === null || _c === void 0 ? void 0 : _c.uid) || 'system'
                    })];
            case 14:
                // Update affiliate record with email sent info
                _d.sent();
                _d.label = 15;
            case 15:
                // 6. Delete application record
                console.log('🗑️ Cleaning up application record...');
                return [4 /*yield*/, applicationRef["delete"]()];
            case 16:
                _d.sent();
                console.log('✅ Application record deleted');
                console.log('🎉 Affiliate approval workflow completed successfully');
                return [2 /*return*/, {
                        success: true,
                        email: appData.email,
                        affiliateCode: affiliateCode,
                        affiliateId: authUser.uid,
                        wasExistingAuthUser: wasExistingAuthUser,
                        language: appData.preferredLang || 'sv-SE',
                        messageId: emailResult.messageId,
                        emailSent: emailResult.success,
                        commissionRate: 15,
                        checkoutDiscount: Number(checkoutDiscount) || 10
                    }];
            case 17:
                error_3 = _d.sent();
                console.error('❌ approveAffiliate: Fatal error:', error_3);
                throw new Error(error_3 instanceof Error ? error_3.message : 'Unknown error in affiliate approval');
            case 18: return [2 /*return*/];
        }
    });
}); });
