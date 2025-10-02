"use strict";
// UserResolver Service
// Intelligently resolves user data from any order type (B2B/B2C/Guest)
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
exports.UserResolver = void 0;
var firestore_1 = require("firebase-admin/firestore");
var UserResolver = /** @class */ (function () {
    function UserResolver() {
        this.db = (0, firestore_1.getFirestore)('b8s-reseller-db');
    }
    /**
     * Resolve user data from any order context
     * Tries multiple identification methods in order of preference
     */
    UserResolver.prototype.resolve = function (context) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var b2bUser, b2cUser, guestUser, b2cUser;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log('🔍 UserResolver: Starting resolution with context:', {
                            userId: context.userId,
                            b2cCustomerId: context.b2cCustomerId,
                            customerEmail: (_a = context.customerInfo) === null || _a === void 0 ? void 0 : _a.email,
                            source: context.source
                        });
                        if (!context.userId) return [3 /*break*/, 2];
                        console.log('🔍 UserResolver: Trying B2B user lookup');
                        return [4 /*yield*/, this.getB2BUser(context.userId)];
                    case 1:
                        b2bUser = _c.sent();
                        if (b2bUser) {
                            console.log('✅ UserResolver: Found B2B user:', b2bUser.email);
                            return [2 /*return*/, b2bUser];
                        }
                        _c.label = 2;
                    case 2:
                        if (!context.b2cCustomerId) return [3 /*break*/, 4];
                        console.log('🔍 UserResolver: Trying B2C customer lookup');
                        return [4 /*yield*/, this.getB2CUser(context.b2cCustomerId)];
                    case 3:
                        b2cUser = _c.sent();
                        if (b2cUser) {
                            console.log('✅ UserResolver: Found B2C customer:', b2cUser.email);
                            return [2 /*return*/, b2cUser];
                        }
                        _c.label = 4;
                    case 4:
                        // Method 3: Guest order with email
                        if ((_b = context.customerInfo) === null || _b === void 0 ? void 0 : _b.email) {
                            console.log('🔍 UserResolver: Creating guest user profile');
                            guestUser = this.createGuestUser(context.customerInfo);
                            console.log('✅ UserResolver: Created guest user:', guestUser.email);
                            return [2 /*return*/, guestUser];
                        }
                        if (!context.userId) return [3 /*break*/, 6];
                        console.log('🔍 UserResolver: Trying B2C lookup with userId as fallback');
                        return [4 /*yield*/, this.getB2CUser(context.userId)];
                    case 5:
                        b2cUser = _c.sent();
                        if (b2cUser) {
                            console.log('✅ UserResolver: Found B2C customer via userId fallback:', b2cUser.email);
                            return [2 /*return*/, b2cUser];
                        }
                        _c.label = 6;
                    case 6:
                        console.error('❌ UserResolver: No user identification method succeeded');
                        console.error('Available context:', Object.keys(context));
                        throw new Error('Unable to resolve user from order context - no valid user identifier found');
                }
            });
        });
    };
    /**
     * Get B2B user from users collection
     */
    UserResolver.prototype.getB2BUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var userDoc, userData, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.collection('users').doc(userId).get()];
                    case 1:
                        userDoc = _a.sent();
                        if (!userDoc.exists) {
                            console.log('🔍 UserResolver: B2B user not found in users collection');
                            return [2 /*return*/, null];
                        }
                        userData = userDoc.data();
                        return [2 /*return*/, {
                                email: userData.email,
                                name: userData.contactPerson || userData.companyName || 'B2B Customer',
                                companyName: userData.companyName,
                                contactPerson: userData.contactPerson,
                                type: 'B2B',
                                language: userData.preferredLang || 'sv-SE'
                            }];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ UserResolver: Error fetching B2B user:', error_1);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get B2C customer from b2cCustomers collection
     */
    UserResolver.prototype.getB2CUser = function (customerId) {
        return __awaiter(this, void 0, void 0, function () {
            var customerDoc, customerData, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.collection('b2cCustomers').doc(customerId).get()];
                    case 1:
                        customerDoc = _a.sent();
                        if (!customerDoc.exists) {
                            console.log('🔍 UserResolver: B2C customer not found in b2cCustomers collection');
                            return [2 /*return*/, null];
                        }
                        customerData = customerDoc.data();
                        return [2 /*return*/, {
                                email: customerData.email,
                                name: customerData.name || 'B2C Customer',
                                type: 'B2C',
                                language: customerData.preferredLang || 'sv-SE'
                            }];
                    case 2:
                        error_2 = _a.sent();
                        console.error('❌ UserResolver: Error fetching B2C customer:', error_2);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create guest user profile from order customer info
     */
    UserResolver.prototype.createGuestUser = function (customerInfo) {
        var name = customerInfo.firstName && customerInfo.lastName
            ? "".concat(customerInfo.firstName, " ").concat(customerInfo.lastName)
            : customerInfo.name || 'Guest Customer';
        return {
            email: customerInfo.email,
            name: name,
            type: 'GUEST',
            language: 'sv-SE' // Default to Swedish for guests
        };
    };
    /**
     * Detect order type from context
     */
    UserResolver.prototype.detectOrderType = function (context) {
        var _a;
        if (context.userId && !context.b2cCustomerId)
            return 'B2B';
        if (context.b2cCustomerId)
            return 'B2C';
        if ((_a = context.customerInfo) === null || _a === void 0 ? void 0 : _a.email)
            return 'GUEST';
        return 'GUEST'; // Default fallback
    };
    return UserResolver;
}());
exports.UserResolver = UserResolver;
