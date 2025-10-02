"use strict";
// EmailOrchestrator Functions Index
// Unified email functions replacing ALL V1/V2/V3 email functions
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
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
exports.testEmailOrchestrator = exports.sendAffiliateApplicationEmails = exports.confirmPasswordReset = exports.verifyEmailCode = exports.sendCustomEmailVerification = exports.sendEmailVerification = exports.approveAffiliate = exports.sendAffiliateWelcomeEmail = exports.sendLoginCredentialsEmail = exports.sendPasswordResetEmail = exports.sendOrderNotificationAdmin = exports.sendOrderStatusUpdateEmail = exports.sendOrderConfirmationEmail = void 0;
// Import all unified email functions
var sendOrderConfirmationEmail_1 = require("./sendOrderConfirmationEmail");
__createBinding(exports, sendOrderConfirmationEmail_1, "sendOrderConfirmationEmail");
var sendOrderStatusUpdateEmail_1 = require("./sendOrderStatusUpdateEmail");
__createBinding(exports, sendOrderStatusUpdateEmail_1, "sendOrderStatusUpdateEmail");
var sendOrderNotificationAdmin_1 = require("./sendOrderNotificationAdmin");
__createBinding(exports, sendOrderNotificationAdmin_1, "sendOrderNotificationAdmin");
var sendPasswordResetEmail_1 = require("./sendPasswordResetEmail");
__createBinding(exports, sendPasswordResetEmail_1, "sendPasswordResetEmail");
var sendLoginCredentialsEmail_1 = require("./sendLoginCredentialsEmail");
__createBinding(exports, sendLoginCredentialsEmail_1, "sendLoginCredentialsEmail");
var sendAffiliateWelcomeEmail_1 = require("./sendAffiliateWelcomeEmail");
__createBinding(exports, sendAffiliateWelcomeEmail_1, "sendAffiliateWelcomeEmail");
var approveAffiliate_1 = require("./approveAffiliate");
__createBinding(exports, approveAffiliate_1, "approveAffiliate");
var sendEmailVerification_1 = require("./sendEmailVerification");
__createBinding(exports, sendEmailVerification_1, "sendEmailVerification");
var sendCustomEmailVerification_1 = require("./sendCustomEmailVerification");
__createBinding(exports, sendCustomEmailVerification_1, "sendCustomEmailVerification");
var verifyEmailCode_1 = require("./verifyEmailCode");
__createBinding(exports, verifyEmailCode_1, "verifyEmailCode");
var confirmPasswordReset_1 = require("./confirmPasswordReset");
__createBinding(exports, confirmPasswordReset_1, "confirmPasswordReset");
var sendAffiliateApplicationEmails_1 = require("./sendAffiliateApplicationEmails");
__createBinding(exports, sendAffiliateApplicationEmails_1, "sendAffiliateApplicationEmails");
// export { sendB2BApplicationEmails } from './sendB2BApplicationEmails'; // TEMPORARILY DISABLED
// TODO: Implement remaining functions
// Test function for EmailOrchestrator system
var https_1 = require("firebase-functions/v2/https");
var EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.testEmailOrchestrator = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var orchestrator, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                console.log('🧪 testEmailOrchestrator: Running system test');
                orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
                return [4 /*yield*/, orchestrator.testSystem()];
            case 1:
                result = _a.sent();
                console.log('🧪 testEmailOrchestrator: Test completed');
                return [2 /*return*/, result];
            case 2:
                error_1 = _a.sent();
                console.error('❌ testEmailOrchestrator: Test failed:', error_1);
                return [2 /*return*/, {
                        success: false,
                        error: error_1 instanceof Error ? error_1.message : 'Test failed'
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); });
