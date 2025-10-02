"use strict";
// sendAffiliateWelcomeEmail - New Affiliate Onboarding Function
// Replaces: sendAffiliateWelcomeEmailV3, approveAffiliateV3 email functionality
// Used for: New affiliate approval and welcome (different from login credentials)
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
exports.sendAffiliateWelcomeEmail = void 0;
var https_1 = require("firebase-functions/v2/https");
var EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendAffiliateWelcomeEmail = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var orchestrator, language, wasExistingAuthUser, result, error_1;
    var _a, _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                console.log('🎉 sendAffiliateWelcomeEmail: Starting affiliate welcome onboarding');
                console.log('🎉 Request data:', {
                    affiliateName: request.data.affiliateInfo.name,
                    affiliateEmail: request.data.affiliateInfo.email,
                    affiliateCode: request.data.affiliateInfo.affiliateCode,
                    wasExistingAuthUser: request.data.wasExistingAuthUser,
                    language: request.data.language
                });
                // Validate required data
                if (!((_a = request.data.affiliateInfo) === null || _a === void 0 ? void 0 : _a.name)) {
                    throw new Error('Affiliate name is required');
                }
                if (!((_b = request.data.affiliateInfo) === null || _b === void 0 ? void 0 : _b.email)) {
                    throw new Error('Affiliate email is required');
                }
                if (!((_c = request.data.affiliateInfo) === null || _c === void 0 ? void 0 : _c.affiliateCode)) {
                    throw new Error('Affiliate code is required');
                }
                if (!((_d = request.data.credentials) === null || _d === void 0 ? void 0 : _d.email)) {
                    throw new Error('Credentials email is required');
                }
                orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
                language = request.data.language || request.data.affiliateInfo.preferredLang || 'sv-SE';
                wasExistingAuthUser = request.data.wasExistingAuthUser || false;
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'AFFILIATE_WELCOME',
                        customerInfo: {
                            email: request.data.affiliateInfo.email,
                            name: request.data.affiliateInfo.name
                        },
                        language: language,
                        additionalData: {
                            affiliateInfo: {
                                name: request.data.affiliateInfo.name,
                                email: request.data.affiliateInfo.email,
                                affiliateCode: request.data.affiliateInfo.affiliateCode,
                                commissionRate: request.data.affiliateInfo.commissionRate,
                                checkoutDiscount: request.data.affiliateInfo.checkoutDiscount
                            },
                            credentials: {
                                email: request.data.credentials.email,
                                temporaryPassword: request.data.credentials.temporaryPassword
                            },
                            wasExistingAuthUser: wasExistingAuthUser
                        }
                    })];
            case 1:
                result = _e.sent();
                if (result.success) {
                    console.log('✅ sendAffiliateWelcomeEmail: Success - Welcome email sent');
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messageId,
                            details: result.details,
                            affiliateCode: request.data.affiliateInfo.affiliateCode,
                            email: request.data.affiliateInfo.email,
                            wasExistingAuthUser: wasExistingAuthUser,
                            language: language
                        }];
                }
                else {
                    console.error('❌ sendAffiliateWelcomeEmail: Failed:', result.error);
                    throw new Error(result.error || 'Affiliate welcome email sending failed');
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _e.sent();
                console.error('❌ sendAffiliateWelcomeEmail: Fatal error:', error_1);
                throw new Error(error_1 instanceof Error ? error_1.message : 'Unknown error in affiliate welcome email');
            case 3: return [2 /*return*/];
        }
    });
}); });
