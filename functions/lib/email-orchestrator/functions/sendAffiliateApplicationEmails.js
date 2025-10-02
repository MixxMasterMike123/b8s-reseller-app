"use strict";
// sendAffiliateApplicationEmails.ts - Send both affiliate and admin emails when application is submitted
// Replaces missing affiliate application notification system
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
exports.sendAffiliateApplicationEmails = void 0;
var https_1 = require("firebase-functions/v2/https");
var EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendAffiliateApplicationEmails = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var orchestrator, applicantResult, adminResult, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                console.log('📧 sendAffiliateApplicationEmails: Starting dual email send');
                console.log('📧 Request data:', {
                    applicantName: request.data.applicantInfo.name,
                    applicantEmail: request.data.applicantInfo.email,
                    applicationId: request.data.applicationId,
                    language: request.data.language
                });
                // Validate required data
                if (!request.data.applicantInfo || !request.data.applicationId) {
                    throw new Error('Applicant info and application ID are required');
                }
                if (!request.data.applicantInfo.name || !request.data.applicantInfo.email) {
                    throw new Error('Applicant name and email are required');
                }
                orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
                // 1. Send confirmation email to affiliate applicant
                console.log('📧 Sending confirmation email to applicant...');
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'AFFILIATE_APPLICATION_RECEIVED',
                        customerInfo: {
                            email: request.data.applicantInfo.email,
                            name: request.data.applicantInfo.name
                        },
                        language: request.data.language || 'sv-SE',
                        additionalData: {
                            applicantInfo: request.data.applicantInfo,
                            applicationId: request.data.applicationId
                        },
                        adminEmail: false
                    })];
            case 1:
                applicantResult = _a.sent();
                if (!applicantResult.success) {
                    console.error('❌ Failed to send applicant confirmation email:', applicantResult.error);
                    throw new Error("Failed to send confirmation email: ".concat(applicantResult.error));
                }
                // 2. Send notification email to admin
                console.log('📧 Sending notification email to admin...');
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN',
                        customerInfo: {
                            email: 'micke.ohlen@gmail.com',
                            name: 'B8Shield Admin'
                        },
                        language: 'sv-SE',
                        additionalData: {
                            applicantInfo: request.data.applicantInfo,
                            applicationId: request.data.applicationId,
                            adminPortalUrl: 'https://partner.b8shield.com'
                        },
                        adminEmail: true
                    })];
            case 2:
                adminResult = _a.sent();
                if (!adminResult.success) {
                    console.error('❌ Failed to send admin notification email:', adminResult.error);
                    // Don't fail the entire operation if admin email fails
                    console.log('⚠️ Continuing despite admin email failure');
                }
                console.log('✅ sendAffiliateApplicationEmails: Success');
                return [2 /*return*/, {
                        success: true,
                        applicantEmailSent: applicantResult.success,
                        adminEmailSent: adminResult.success,
                        applicantMessageId: applicantResult.messageId,
                        adminMessageId: adminResult.messageId,
                        details: {
                            applicant: applicantResult.details,
                            admin: adminResult.details
                        }
                    }];
            case 3:
                error_1 = _a.sent();
                console.error('❌ sendAffiliateApplicationEmails: Fatal error:', error_1);
                throw new Error(error_1 instanceof Error ? error_1.message : 'Unknown error in affiliate application emails');
            case 4: return [2 /*return*/];
        }
    });
}); });
