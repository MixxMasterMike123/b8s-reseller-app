"use strict";
// sendPasswordResetEmail - Unified Password Reset Function
// Replaces: sendPasswordResetV3, sendPasswordReset
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
exports.sendPasswordResetEmail = void 0;
var https_1 = require("firebase-functions/v2/https");
var EmailOrchestrator_1 = require("../core/EmailOrchestrator");
var database_1 = require("../../config/database");
exports.sendPasswordResetEmail = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var expiresAt, orchestrator, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                console.log('📧 sendPasswordResetEmail: Starting unified password reset');
                console.log('📧 Request data:', {
                    email: request.data.email,
                    userType: request.data.userType,
                    language: request.data.language,
                    hasResetCode: !!request.data.resetCode
                });
                // Validate required data
                if (!request.data.email) {
                    throw new Error('Email is required');
                }
                if (!request.data.resetCode) {
                    throw new Error('Reset code is required');
                }
                expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
                return [4 /*yield*/, database_1.db.collection('passwordResets').add({
                        email: request.data.email,
                        resetCode: request.data.resetCode,
                        expiresAt: expiresAt,
                        used: false,
                        createdAt: new Date(),
                        userType: request.data.userType || 'B2C'
                    })];
            case 1:
                _a.sent();
                console.log('✅ Reset code stored in Firestore with 1 hour expiry');
                orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'PASSWORD_RESET',
                        customerInfo: {
                            email: request.data.email
                        },
                        language: request.data.language || 'sv-SE',
                        additionalData: {
                            resetCode: request.data.resetCode,
                            userAgent: request.data.userAgent,
                            timestamp: request.data.timestamp,
                            userType: request.data.userType || 'B2C'
                        },
                        adminEmail: false
                    })];
            case 2:
                result = _a.sent();
                if (result.success) {
                    console.log('✅ sendPasswordResetEmail: Success');
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messageId,
                            details: result.details
                        }];
                }
                else {
                    console.error('❌ sendPasswordResetEmail: Failed:', result.error);
                    throw new Error(result.error || 'Password reset email sending failed');
                }
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('❌ sendPasswordResetEmail: Fatal error:', error_1);
                throw new Error(error_1 instanceof Error ? error_1.message : 'Unknown error in password reset email');
            case 4: return [2 /*return*/];
        }
    });
}); });
