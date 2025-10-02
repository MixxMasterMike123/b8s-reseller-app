"use strict";
// verifyEmailCode - Custom Email Verification Handler
// Handles verification of custom email verification codes
// Updates Firebase Auth user emailVerified status + B2C customer records
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
exports.verifyEmailCode = void 0;
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-admin/firestore");
var auth_1 = require("firebase-admin/auth");
// Initialize Firebase services
var db = (0, firestore_1.getFirestore)('b8s-reseller-db');
var auth = (0, auth_1.getAuth)();
exports.verifyEmailCode = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var verificationDoc, verificationData, now, expiresAt, authError_1, b2cQuery, b2cCustomerDoc, b2cError_1, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 13, , 14]);
                console.log('✅ verifyEmailCode: Starting email verification process');
                console.log('✅ Verification code:', request.data.verificationCode);
                // Validate required data
                if (!request.data.verificationCode) {
                    throw new Error('Verification code is required');
                }
                // Get verification record
                console.log('🔍 Looking up verification record...');
                return [4 /*yield*/, db.collection('emailVerifications').doc(request.data.verificationCode).get()];
            case 1:
                verificationDoc = _a.sent();
                if (!verificationDoc.exists) {
                    throw new Error('Invalid verification code');
                }
                verificationData = verificationDoc.data();
                if (!verificationData) {
                    throw new Error('Verification data not found');
                }
                // Check if already verified
                if (verificationData.verified) {
                    console.log('ℹ️ Email already verified for:', verificationData.email);
                    return [2 /*return*/, {
                            success: true,
                            message: 'Email already verified',
                            email: verificationData.email,
                            alreadyVerified: true
                        }];
                }
                now = new Date();
                expiresAt = verificationData.expiresAt.toDate();
                if (now > expiresAt) {
                    console.log('❌ Verification code expired for:', verificationData.email);
                    throw new Error('Verification code has expired');
                }
                console.log('✅ Verification record valid, processing verification...');
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, auth.updateUser(verificationData.firebaseAuthUid, {
                        emailVerified: true
                    })];
            case 3:
                _a.sent();
                console.log('✅ Firebase Auth user email verified:', verificationData.firebaseAuthUid);
                return [3 /*break*/, 5];
            case 4:
                authError_1 = _a.sent();
                console.error('❌ Error updating Firebase Auth user:', authError_1);
                return [3 /*break*/, 5];
            case 5:
                _a.trys.push([5, 10, , 11]);
                console.log('🔍 Looking for B2C customer record...');
                return [4 /*yield*/, db.collection('b2cCustomers')
                        .where('firebaseAuthUid', '==', verificationData.firebaseAuthUid)
                        .limit(1)
                        .get()];
            case 6:
                b2cQuery = _a.sent();
                if (!!b2cQuery.empty) return [3 /*break*/, 8];
                b2cCustomerDoc = b2cQuery.docs[0];
                return [4 /*yield*/, b2cCustomerDoc.ref.update({
                        emailVerified: true,
                        updatedAt: new Date()
                    })];
            case 7:
                _a.sent();
                console.log('✅ B2C customer record updated:', b2cCustomerDoc.id);
                return [3 /*break*/, 9];
            case 8:
                console.log('ℹ️ No B2C customer record found for:', verificationData.firebaseAuthUid);
                _a.label = 9;
            case 9: return [3 /*break*/, 11];
            case 10:
                b2cError_1 = _a.sent();
                console.error('❌ Error updating B2C customer:', b2cError_1);
                return [3 /*break*/, 11];
            case 11: 
            // Mark verification as completed
            return [4 /*yield*/, verificationDoc.ref.update({
                    verified: true,
                    verifiedAt: new Date()
                })];
            case 12:
                // Mark verification as completed
                _a.sent();
                console.log('✅ Verification record marked as completed');
                console.log('🎉 Email verification completed successfully for:', verificationData.email);
                return [2 /*return*/, {
                        success: true,
                        message: 'Email verified successfully',
                        email: verificationData.email,
                        customerInfo: verificationData.customerInfo,
                        source: verificationData.source,
                        verifiedAt: new Date().toISOString()
                    }];
            case 13:
                error_1 = _a.sent();
                console.error('❌ verifyEmailCode: Fatal error:', error_1);
                throw new Error(error_1 instanceof Error ? error_1.message : 'Unknown error in email verification');
            case 14: return [2 /*return*/];
        }
    });
}); });
