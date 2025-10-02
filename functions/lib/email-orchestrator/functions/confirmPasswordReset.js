"use strict";
// confirmPasswordReset - Unified Password Reset Confirmation Function
// Replaces: confirmPasswordResetV2, confirmPasswordResetV3
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
exports.confirmPasswordReset = void 0;
var https_1 = require("firebase-functions/v2/https");
var auth_1 = require("firebase-admin/auth");
var database_1 = require("../../config/database");
exports.confirmPasswordReset = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, resetCode, newPassword, resetQuery, resetDoc, resetData, now, expiresAt, auth, userRecord, error_1, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, resetCode = _a.resetCode, newPassword = _a.newPassword;
                if (!resetCode || !newPassword) {
                    throw new https_1.HttpsError('invalid-argument', 'Reset code and new password are required');
                }
                if (newPassword.length < 6) {
                    throw new https_1.HttpsError('invalid-argument', 'Password must be at least 6 characters');
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 10]);
                console.log("\uD83D\uDD0D Processing password reset confirmation for code: ".concat(resetCode));
                return [4 /*yield*/, database_1.db.collection('passwordResets')
                        .where('resetCode', '==', resetCode)
                        .where('used', '==', false)
                        .get()];
            case 2:
                resetQuery = _b.sent();
                if (resetQuery.empty) {
                    throw new https_1.HttpsError('invalid-argument', 'Invalid or already used reset code');
                }
                resetDoc = resetQuery.docs[0];
                resetData = resetDoc.data();
                now = new Date();
                expiresAt = resetData.expiresAt.toDate();
                if (now > expiresAt) {
                    throw new https_1.HttpsError('invalid-argument', 'Reset code has expired');
                }
                auth = (0, auth_1.getAuth)();
                userRecord = void 0;
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, auth.getUserByEmail(resetData.email)];
            case 4:
                userRecord = _b.sent();
                return [3 /*break*/, 6];
            case 5:
                error_1 = _b.sent();
                throw new https_1.HttpsError('not-found', 'User not found');
            case 6: 
            // Update the user's password using Firebase Admin
            return [4 /*yield*/, auth.updateUser(userRecord.uid, {
                    password: newPassword
                })];
            case 7:
                // Update the user's password using Firebase Admin
                _b.sent();
                // Mark the reset code as used
                return [4 /*yield*/, resetDoc.ref.update({
                        used: true,
                        usedAt: new Date()
                    })];
            case 8:
                // Mark the reset code as used
                _b.sent();
                console.log("\u2705 Password successfully reset for user: ".concat(resetData.email));
                return [2 /*return*/, {
                        success: true,
                        email: resetData.email
                    }];
            case 9:
                error_2 = _b.sent();
                console.error('❌ Error confirming password reset:', error_2);
                if (error_2 instanceof https_1.HttpsError) {
                    throw error_2;
                }
                throw new https_1.HttpsError('internal', 'Failed to reset password');
            case 10: return [2 /*return*/];
        }
    });
}); });
