"use strict";
// EmailOrchestrator - Master Email Controller
// Single entry point for ALL email operations in B8Shield system
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
exports.EmailOrchestrator = void 0;
var UserResolver_1 = require("../services/UserResolver");
var EmailService_1 = require("../services/EmailService");
var orderConfirmation_1 = require("../templates/orderConfirmation");
var orderStatusUpdate_1 = require("../templates/orderStatusUpdate");
var orderNotificationAdmin_1 = require("../templates/orderNotificationAdmin");
var passwordReset_1 = require("../templates/passwordReset");
var loginCredentials_1 = require("../templates/loginCredentials");
var affiliateWelcome_1 = require("../templates/affiliateWelcome");
var emailVerification_1 = require("../templates/emailVerification");
var affiliateApplicationReceived_1 = require("../templates/affiliateApplicationReceived");
var affiliateApplicationNotificationAdmin_1 = require("../templates/affiliateApplicationNotificationAdmin");
var EmailOrchestrator = /** @class */ (function () {
    function EmailOrchestrator() {
        this.userResolver = new UserResolver_1.UserResolver();
        this.emailService = new EmailService_1.EmailService();
        console.log('🎼 EmailOrchestrator: Initialized with unified email system');
    }
    /**
     * Master email sending method
     * Single entry point for ALL emails in the system
     */
    EmailOrchestrator.prototype.sendEmail = function (context) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var userData, language, template, emailOptions, result, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, , 8]);
                        console.log('🎼 EmailOrchestrator: Processing email request');
                        console.log('🎼 EmailOrchestrator: Email type:', context.emailType);
                        console.log('🎼 EmailOrchestrator: Context:', {
                            userId: context.userId,
                            b2cCustomerId: context.b2cCustomerId,
                            customerEmail: (_a = context.customerInfo) === null || _a === void 0 ? void 0 : _a.email,
                            source: context.source,
                            adminEmail: context.adminEmail
                        });
                        return [4 /*yield*/, this.userResolver.resolve(context)];
                    case 1:
                        userData = _b.sent();
                        console.log('✅ EmailOrchestrator: User resolved:', {
                            email: userData.email,
                            type: userData.type,
                            name: userData.name
                        });
                        language = context.language || userData.language || 'sv-SE';
                        console.log('🌍 EmailOrchestrator: Language selected:', language);
                        return [4 /*yield*/, this.generateTemplate(context.emailType, {
                                userData: userData,
                                language: language,
                                orderData: context.orderData,
                                additionalData: context.additionalData,
                                context: context
                            })];
                    case 2:
                        template = _b.sent();
                        console.log('📧 EmailOrchestrator: Template generated:', template.subject);
                        emailOptions = {
                            to: userData.email,
                            from: this.getFromAddress(context.emailType, userData.type)
                        };
                        result = void 0;
                        if (!context.adminEmail) return [3 /*break*/, 4];
                        console.log('📧 EmailOrchestrator: Sending admin email');
                        return [4 /*yield*/, this.emailService.sendAdminEmail(template, emailOptions)];
                    case 3:
                        result = _b.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        console.log('📧 EmailOrchestrator: Sending customer email');
                        return [4 /*yield*/, this.emailService.sendEmail(template, emailOptions)];
                    case 5:
                        result = _b.sent();
                        _b.label = 6;
                    case 6:
                        if (result.success) {
                            console.log('✅ EmailOrchestrator: Email sent successfully');
                            return [2 /*return*/, {
                                    success: true,
                                    messageId: result.messageId,
                                    details: {
                                        emailType: context.emailType,
                                        recipient: userData.email,
                                        userType: userData.type,
                                        language: language,
                                        subject: template.subject
                                    }
                                }];
                        }
                        else {
                            console.error('❌ EmailOrchestrator: Email sending failed:', result.error);
                            return [2 /*return*/, {
                                    success: false,
                                    error: result.error
                                }];
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_1 = _b.sent();
                        console.error('❌ EmailOrchestrator: Fatal error:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown orchestrator error'
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate email template based on type and context
     */
    EmailOrchestrator.prototype.generateTemplate = function (emailType, data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
        return __awaiter(this, void 0, void 0, function () {
            var orderConfirmationData, orderStatusData, adminNotificationData, loginCredentialsData, passwordResetData, affiliateWelcomeData, emailVerificationData;
            return __generator(this, function (_y) {
                console.log('📝 EmailOrchestrator: Generating template for:', emailType);
                switch (emailType) {
                    case 'ORDER_CONFIRMATION':
                        if (!data.orderData) {
                            throw new Error('Order data is required for order confirmation email');
                        }
                        orderConfirmationData = {
                            orderData: data.orderData,
                            customerInfo: {
                                email: data.userData.email,
                                name: data.userData.name,
                                firstName: (_a = data.context.customerInfo) === null || _a === void 0 ? void 0 : _a.firstName,
                                lastName: (_b = data.context.customerInfo) === null || _b === void 0 ? void 0 : _b.lastName
                            },
                            orderId: data.context.orderId || '',
                            orderType: data.userData.type === 'B2B' ? 'B2B' : 'B2C'
                        };
                        return [2 /*return*/, (0, orderConfirmation_1.generateOrderConfirmationTemplate)(orderConfirmationData, data.language, data.context.orderId)];
                    case 'ORDER_STATUS_UPDATE':
                        if (!data.orderData) {
                            throw new Error('Order data is required for order status update email');
                        }
                        orderStatusData = {
                            orderData: data.orderData,
                            userData: data.userData,
                            newStatus: ((_c = data.additionalData) === null || _c === void 0 ? void 0 : _c.newStatus) || data.orderData.status,
                            previousStatus: (_d = data.additionalData) === null || _d === void 0 ? void 0 : _d.previousStatus,
                            trackingNumber: (_e = data.additionalData) === null || _e === void 0 ? void 0 : _e.trackingNumber,
                            estimatedDelivery: (_f = data.additionalData) === null || _f === void 0 ? void 0 : _f.estimatedDelivery,
                            notes: (_g = data.additionalData) === null || _g === void 0 ? void 0 : _g.notes,
                            userType: data.userData.type
                        };
                        return [2 /*return*/, (0, orderStatusUpdate_1.generateOrderStatusUpdateTemplate)(orderStatusData, data.language, data.context.orderId)];
                    case 'ORDER_NOTIFICATION_ADMIN':
                        if (!data.orderData) {
                            throw new Error('Order data is required for admin notification email');
                        }
                        adminNotificationData = {
                            orderData: {
                                orderNumber: data.orderData.orderNumber || data.context.orderId || '',
                                source: data.context.source,
                                customerInfo: {
                                    firstName: (_h = data.context.customerInfo) === null || _h === void 0 ? void 0 : _h.firstName,
                                    lastName: (_j = data.context.customerInfo) === null || _j === void 0 ? void 0 : _j.lastName,
                                    name: data.userData.name,
                                    email: data.userData.email,
                                    companyName: data.userData.companyName,
                                    contactPerson: data.userData.contactPerson,
                                    phone: data.userData.phone,
                                    address: data.userData.address,
                                    city: data.userData.city,
                                    postalCode: data.userData.postalCode,
                                    marginal: data.userData.marginal
                                },
                                shippingInfo: data.orderData.shippingInfo,
                                items: data.orderData.items || [],
                                subtotal: data.orderData.subtotal || 0,
                                shipping: data.orderData.shipping || 0,
                                vat: data.orderData.vat || 0,
                                total: data.orderData.total || 0,
                                discountAmount: data.orderData.discountAmount,
                                affiliateCode: data.orderData.affiliateCode,
                                affiliate: data.orderData.affiliate,
                                payment: data.orderData.payment,
                                createdAt: data.orderData.createdAt
                            },
                            orderSummary: (_k = data.additionalData) === null || _k === void 0 ? void 0 : _k.orderSummary,
                            orderType: data.userData.type === 'B2B' ? 'B2B' : 'B2C'
                        };
                        return [2 /*return*/, (0, orderNotificationAdmin_1.generateOrderNotificationAdminTemplate)(adminNotificationData, data.language)];
                    case 'LOGIN_CREDENTIALS':
                        if (!((_l = data.additionalData) === null || _l === void 0 ? void 0 : _l.credentials)) {
                            throw new Error('Credentials data is required for login credentials email');
                        }
                        loginCredentialsData = {
                            userInfo: {
                                name: data.userData.name || data.userData.contactPerson || '',
                                email: data.userData.email,
                                companyName: data.userData.companyName,
                                contactPerson: data.userData.contactPerson
                            },
                            credentials: data.additionalData.credentials,
                            accountType: (data.additionalData.accountType === 'AFFILIATE') ? 'AFFILIATE' : 'B2B',
                            wasExistingAuthUser: data.additionalData.wasExistingAuthUser || false
                        };
                        return [2 /*return*/, (0, loginCredentials_1.generateLoginCredentialsTemplate)(loginCredentialsData, data.language)];
                    case 'PASSWORD_RESET':
                        if (!((_m = data.additionalData) === null || _m === void 0 ? void 0 : _m.resetCode)) {
                            throw new Error('Reset code is required for password reset email');
                        }
                        passwordResetData = {
                            email: data.userData.email,
                            resetCode: data.additionalData.resetCode,
                            userAgent: data.additionalData.userAgent,
                            timestamp: data.additionalData.timestamp,
                            userType: data.additionalData.userType || (data.userData.type === 'B2B' ? 'B2B' : 'B2C')
                        };
                        return [2 /*return*/, (0, passwordReset_1.generatePasswordResetTemplate)(passwordResetData, data.language)];
                    case 'AFFILIATE_WELCOME':
                        if (!((_o = data.additionalData) === null || _o === void 0 ? void 0 : _o.affiliateInfo) || !((_p = data.additionalData) === null || _p === void 0 ? void 0 : _p.credentials)) {
                            throw new Error('Affiliate info and credentials are required for affiliate welcome email');
                        }
                        affiliateWelcomeData = {
                            affiliateInfo: data.additionalData.affiliateInfo,
                            credentials: data.additionalData.credentials,
                            wasExistingAuthUser: data.additionalData.wasExistingAuthUser || false,
                            language: data.language
                        };
                        return [2 /*return*/, (0, affiliateWelcome_1.generateAffiliateWelcomeTemplate)(affiliateWelcomeData)];
                    case 'EMAIL_VERIFICATION':
                        if (!((_q = data.additionalData) === null || _q === void 0 ? void 0 : _q.verificationCode)) {
                            throw new Error('Verification code is required for email verification');
                        }
                        emailVerificationData = {
                            customerInfo: {
                                firstName: (_r = data.context.customerInfo) === null || _r === void 0 ? void 0 : _r.firstName,
                                lastName: (_s = data.context.customerInfo) === null || _s === void 0 ? void 0 : _s.lastName,
                                name: ((_t = data.context.customerInfo) === null || _t === void 0 ? void 0 : _t.name) || data.userData.name,
                                email: data.userData.email
                            },
                            verificationCode: data.additionalData.verificationCode,
                            language: data.language,
                            source: data.additionalData.source
                        };
                        return [2 /*return*/, (0, emailVerification_1.generateEmailVerificationTemplate)(emailVerificationData)];
                    case 'AFFILIATE_APPLICATION_RECEIVED':
                        if (!((_u = data.additionalData) === null || _u === void 0 ? void 0 : _u.applicantInfo) || !((_v = data.additionalData) === null || _v === void 0 ? void 0 : _v.applicationId)) {
                            throw new Error('Affiliate application received requires applicantInfo and applicationId');
                        }
                        return [2 /*return*/, {
                                subject: data.language === 'en-GB' || data.language === 'en-US'
                                    ? 'Affiliate Application Received - B8Shield'
                                    : 'Affiliate-ansökan mottagen - B8Shield',
                                html: (0, affiliateApplicationReceived_1.generateAffiliateApplicationReceivedTemplate)({
                                    applicantInfo: data.additionalData.applicantInfo,
                                    applicationId: data.additionalData.applicationId,
                                    language: data.language
                                }),
                                text: "Thank you for your affiliate application! Your application ID: ".concat(data.additionalData.applicationId)
                            }];
                    case 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN':
                        if (!((_w = data.additionalData) === null || _w === void 0 ? void 0 : _w.applicantInfo) || !((_x = data.additionalData) === null || _x === void 0 ? void 0 : _x.applicationId)) {
                            throw new Error('Affiliate application admin notification requires applicantInfo and applicationId');
                        }
                        return [2 /*return*/, {
                                subject: "Ny Affiliate-ans\u00F6kan: ".concat(data.additionalData.applicantInfo.name),
                                html: (0, affiliateApplicationNotificationAdmin_1.generateAffiliateApplicationNotificationAdminTemplate)({
                                    applicantInfo: data.additionalData.applicantInfo,
                                    applicationId: data.additionalData.applicationId,
                                    adminPortalUrl: data.additionalData.adminPortalUrl || 'https://partner.b8shield.com'
                                }),
                                text: "New affiliate application from ".concat(data.additionalData.applicantInfo.name, " (").concat(data.additionalData.applicantInfo.email, "). Application ID: ").concat(data.additionalData.applicationId)
                            }];
                    default:
                        throw new Error("Unknown email type: ".concat(emailType));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get appropriate from address based on email type and user type
     */
    EmailOrchestrator.prototype.getFromAddress = function (emailType, userType) {
        var fromAddresses = {
            'ORDER_CONFIRMATION': userType === 'B2B'
                ? '"B8Shield Återförsäljarportal" <b8shield.reseller@gmail.com>'
                : '"B8Shield Shop" <b8shield.reseller@gmail.com>',
            'ORDER_STATUS_UPDATE': '"B8Shield" <b8shield.reseller@gmail.com>',
            'ORDER_NOTIFICATION_ADMIN': '"B8Shield System" <b8shield.reseller@gmail.com>',
            'LOGIN_CREDENTIALS': '"B8Shield" <b8shield.reseller@gmail.com>',
            'PASSWORD_RESET': '"B8Shield Security" <b8shield.reseller@gmail.com>',
            'AFFILIATE_WELCOME': '"B8Shield Affiliate Program" <b8shield.reseller@gmail.com>',
            'EMAIL_VERIFICATION': '"B8Shield Shop" <b8shield.reseller@gmail.com>',
            'AFFILIATE_APPLICATION_RECEIVED': '"B8Shield Affiliate Program" <b8shield.reseller@gmail.com>',
            'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN': '"B8Shield System" <b8shield.reseller@gmail.com>'
        };
        return fromAddresses[emailType] || '"B8Shield" <b8shield.reseller@gmail.com>';
    };
    /**
     * Test the complete email orchestrator system
     */
    EmailOrchestrator.prototype.testSystem = function () {
        return __awaiter(this, void 0, void 0, function () {
            var smtpTest, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('🧪 EmailOrchestrator: Running system test...');
                        return [4 /*yield*/, this.emailService.testConnection()];
                    case 1:
                        smtpTest = _a.sent();
                        if (!smtpTest.success) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: "SMTP connection failed: ".concat(smtpTest.error)
                                }];
                        }
                        console.log('✅ EmailOrchestrator: System test passed');
                        return [2 /*return*/, {
                                success: true,
                                details: {
                                    smtp: 'connected',
                                    userResolver: 'ready',
                                    orchestrator: 'ready'
                                }
                            }];
                    case 2:
                        error_2 = _a.sent();
                        console.error('❌ EmailOrchestrator: System test failed:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'System test failed'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return EmailOrchestrator;
}());
exports.EmailOrchestrator = EmailOrchestrator;
