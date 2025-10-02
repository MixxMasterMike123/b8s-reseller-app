"use strict";
// sendLoginCredentialsEmail - Unified Login Credentials Function
// Replaces: sendWelcomeCredentialsV3, sendAffiliateCredentialsV3, "Skicka inloggningsuppgifter" buttons
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
exports.sendLoginCredentialsEmail = void 0;
var https_1 = require("firebase-functions/v2/https");
var EmailOrchestrator_1 = require("../core/EmailOrchestrator");
exports.sendLoginCredentialsEmail = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var orchestrator, result, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                console.log('📧 sendLoginCredentialsEmail: Starting unified credentials email');
                console.log('📧 Request data:', {
                    userEmail: request.data.userInfo.email,
                    accountType: request.data.accountType,
                    wasExistingAuthUser: request.data.wasExistingAuthUser,
                    hasTemporaryPassword: !!request.data.credentials.temporaryPassword,
                    hasAffiliateCode: !!request.data.credentials.affiliateCode
                });
                // Validate required data
                if (!((_a = request.data.userInfo) === null || _a === void 0 ? void 0 : _a.email)) {
                    throw new Error('User email is required');
                }
                if (!((_b = request.data.userInfo) === null || _b === void 0 ? void 0 : _b.name)) {
                    throw new Error('User name is required');
                }
                if (!((_c = request.data.credentials) === null || _c === void 0 ? void 0 : _c.email)) {
                    throw new Error('Credentials email is required');
                }
                if (!request.data.accountType) {
                    throw new Error('Account type is required');
                }
                orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'LOGIN_CREDENTIALS',
                        userId: request.data.userId,
                        customerInfo: {
                            email: request.data.userInfo.email,
                            name: request.data.userInfo.name
                        },
                        language: request.data.language || 'sv-SE',
                        additionalData: {
                            credentials: request.data.credentials,
                            wasExistingAuthUser: request.data.wasExistingAuthUser || false,
                            userInfo: request.data.userInfo,
                            accountType: request.data.accountType
                        },
                        adminEmail: false
                    })];
            case 1:
                result = _d.sent();
                if (result.success) {
                    console.log('✅ sendLoginCredentialsEmail: Success');
                    return [2 /*return*/, {
                            success: true,
                            messageId: result.messageId,
                            details: result.details
                        }];
                }
                else {
                    console.error('❌ sendLoginCredentialsEmail: Failed:', result.error);
                    throw new Error(result.error || 'Login credentials email sending failed');
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('❌ sendLoginCredentialsEmail: Fatal error:', error_1);
                throw new Error(error_1 instanceof Error ? error_1.message : 'Unknown error in login credentials email');
            case 3: return [2 /*return*/];
        }
    });
}); });
