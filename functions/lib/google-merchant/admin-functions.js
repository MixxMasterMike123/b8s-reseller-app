"use strict";
/**
 * Google Merchant Center Admin Functions
 *
 * Admin-only functions for managing Google Merchant Center integration.
 * These functions are used by the admin dashboard to monitor and control
 * the Google Shopping sync process.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.forceSyncProducts = exports.getProductSyncStatus = exports.getGoogleMerchantStats = void 0;
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-admin/firestore");
var api_client_1 = require("./api-client");
var product_mapper_1 = require("./product-mapper");
var db = (0, firestore_1.getFirestore)();
/**
 * Get Google Merchant Center account status and statistics
 */
exports.getGoogleMerchantStats = (0, https_1.onCall)({
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var accountResult, productsResult, firestoreSnapshot, firestoreProducts, totalFirestoreProducts, activeFirestoreProducts, b2cAvailableProducts, googleProducts, totalGoogleProducts, mappableProducts, stats, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                console.log('📊 Getting Google Merchant Center statistics');
                return [4 /*yield*/, (0, api_client_1.getAccountInfo)()];
            case 1:
                accountResult = _b.sent();
                if (!accountResult.success) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'Failed to connect to Google Merchant Center',
                            details: accountResult.error
                        }];
                }
                return [4 /*yield*/, (0, api_client_1.listProducts)(250)];
            case 2:
                productsResult = _b.sent();
                return [4 /*yield*/, db.collection('products').get()];
            case 3:
                firestoreSnapshot = _b.sent();
                firestoreProducts = firestoreSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                totalFirestoreProducts = firestoreProducts.length;
                activeFirestoreProducts = firestoreProducts.filter(function (p) { return p.isActive; }).length;
                b2cAvailableProducts = firestoreProducts.filter(function (p) { var _a; return p.isActive && ((_a = p.availability) === null || _a === void 0 ? void 0 : _a.b2c); }).length;
                googleProducts = productsResult.success ? (((_a = productsResult.data) === null || _a === void 0 ? void 0 : _a.resources) || []) : [];
                totalGoogleProducts = googleProducts.length;
                mappableProducts = (0, product_mapper_1.mapProductsToGoogleShopping)(firestoreProducts, {
                    targetMarket: 'b2c',
                    language: 'sv',
                    country: 'SE'
                });
                stats = {
                    account: accountResult.data,
                    firestore: {
                        total: totalFirestoreProducts,
                        active: activeFirestoreProducts,
                        b2cAvailable: b2cAvailableProducts,
                        mappable: mappableProducts.length
                    },
                    google: {
                        total: totalGoogleProducts,
                        synced: totalGoogleProducts
                    },
                    sync: {
                        inSync: Math.min(totalGoogleProducts, mappableProducts.length),
                        needsSync: Math.max(0, mappableProducts.length - totalGoogleProducts),
                        syncPercentage: mappableProducts.length > 0
                            ? Math.round((Math.min(totalGoogleProducts, mappableProducts.length) / mappableProducts.length) * 100)
                            : 0
                    }
                };
                console.log('✅ Google Merchant Center stats calculated:', stats);
                return [2 /*return*/, {
                        success: true,
                        stats: stats,
                        lastUpdated: new Date().toISOString()
                    }];
            case 4:
                error_1 = _b.sent();
                console.error('❌ Failed to get Google Merchant stats:', error_1);
                return [2 /*return*/, {
                        success: false,
                        error: error_1.message || 'Failed to get statistics'
                    }];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Get detailed sync status for individual products
 */
exports.getProductSyncStatus = (0, https_1.onCall)({
    memory: '512MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, limit, _c, offset, firestoreSnapshot, firestoreProducts, googleResult, googleProducts, googleProductMap_1, productStatus, statusCounts, error_2;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 3, , 4]);
                _a = request.data, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                console.log("\uD83D\uDCCB Getting product sync status (limit: ".concat(limit, ", offset: ").concat(offset, ")"));
                return [4 /*yield*/, db.collection('products')
                        .limit(limit)
                        .offset(offset)
                        .get()];
            case 1:
                firestoreSnapshot = _e.sent();
                firestoreProducts = firestoreSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                return [4 /*yield*/, (0, api_client_1.listProducts)(250)];
            case 2:
                googleResult = _e.sent();
                googleProducts = googleResult.success ? (((_d = googleResult.data) === null || _d === void 0 ? void 0 : _d.resources) || []) : [];
                googleProductMap_1 = new Map();
                googleProducts.forEach(function (product) {
                    googleProductMap_1.set(product.offerId, product);
                });
                productStatus = firestoreProducts.map(function (product) {
                    var _a, _b;
                    var mappedProduct = (0, product_mapper_1.mapProductsToGoogleShopping)([product], {
                        targetMarket: 'b2c',
                        language: 'sv',
                        country: 'SE'
                    });
                    var shouldBeInGoogle = mappedProduct.length > 0;
                    var offerId = "".concat(product.id, "_b2c_SE");
                    var isInGoogle = googleProductMap_1.has(offerId);
                    var status = 'unknown';
                    var message = '';
                    if (!product.isActive) {
                        status = 'inactive';
                        message = 'Product is inactive';
                    }
                    else if (!((_a = product.availability) === null || _a === void 0 ? void 0 : _a.b2c)) {
                        status = 'not_b2c';
                        message = 'Not available for B2C';
                    }
                    else if (shouldBeInGoogle && isInGoogle) {
                        status = 'synced';
                        message = 'Successfully synced';
                    }
                    else if (shouldBeInGoogle && !isInGoogle) {
                        status = 'needs_sync';
                        message = 'Needs to be synced to Google';
                    }
                    else if (!shouldBeInGoogle && isInGoogle) {
                        status = 'needs_removal';
                        message = 'Should be removed from Google';
                    }
                    else {
                        status = 'excluded';
                        message = 'Excluded from sync';
                    }
                    return {
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        isActive: product.isActive,
                        b2cAvailable: ((_b = product.availability) === null || _b === void 0 ? void 0 : _b.b2c) || false,
                        status: status,
                        message: message,
                        offerId: offerId,
                        isInGoogle: isInGoogle,
                        shouldBeInGoogle: shouldBeInGoogle,
                        googleProduct: isInGoogle ? googleProductMap_1.get(offerId) : null
                    };
                });
                statusCounts = productStatus.reduce(function (counts, product) {
                    counts[product.status] = (counts[product.status] || 0) + 1;
                    return counts;
                }, {});
                console.log('✅ Product sync status calculated:', statusCounts);
                return [2 /*return*/, {
                        success: true,
                        products: productStatus,
                        summary: statusCounts,
                        pagination: {
                            limit: limit,
                            offset: offset,
                            total: firestoreProducts.length,
                            hasMore: firestoreProducts.length === limit
                        }
                    }];
            case 3:
                error_2 = _e.sent();
                console.error('❌ Failed to get product sync status:', error_2);
                return [2 /*return*/, {
                        success: false,
                        error: error_2.message || 'Failed to get sync status'
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Force sync specific products by ID
 */
exports.forceSyncProducts = (0, https_1.onCall)({
    memory: '512MiB',
    timeoutSeconds: 120,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var productIds, results, _i, productIds_1, productId, productDoc, syncSingleProductToGoogle, syncResult, error_3, successCount, failureCount, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 9, , 10]);
                productIds = request.data.productIds;
                if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'Product IDs array is required'
                        }];
                }
                console.log("\uD83D\uDD04 Force syncing ".concat(productIds.length, " products:"), productIds);
                results = [];
                _i = 0, productIds_1 = productIds;
                _a.label = 1;
            case 1:
                if (!(_i < productIds_1.length)) return [3 /*break*/, 8];
                productId = productIds_1[_i];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 6, , 7]);
                return [4 /*yield*/, db.collection('products').doc(productId).get()];
            case 3:
                productDoc = _a.sent();
                if (!productDoc.exists) {
                    results.push({
                        productId: productId,
                        success: false,
                        error: 'Product not found'
                    });
                    return [3 /*break*/, 7];
                }
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./sync-functions'); })];
            case 4:
                syncSingleProductToGoogle = (_a.sent()).syncSingleProductToGoogle;
                return [4 /*yield*/, syncSingleProductToGoogle.run({
                        data: { productId: productId, targetMarket: 'b2c' }
                    })];
            case 5:
                syncResult = _a.sent();
                results.push({
                    productId: productId,
                    success: syncResult.success,
                    error: syncResult.error,
                    details: syncResult.success ? 'Synced successfully' : syncResult.error
                });
                return [3 /*break*/, 7];
            case 6:
                error_3 = _a.sent();
                results.push({
                    productId: productId,
                    success: false,
                    error: error_3.message || 'Unknown error'
                });
                return [3 /*break*/, 7];
            case 7:
                _i++;
                return [3 /*break*/, 1];
            case 8:
                successCount = results.filter(function (r) { return r.success; }).length;
                failureCount = results.length - successCount;
                console.log("\u2705 Force sync completed: ".concat(successCount, " success, ").concat(failureCount, " failures"));
                return [2 /*return*/, {
                        success: true,
                        results: results,
                        summary: {
                            total: results.length,
                            success: successCount,
                            failures: failureCount
                        }
                    }];
            case 9:
                error_4 = _a.sent();
                console.error('❌ Force sync failed:', error_4);
                return [2 /*return*/, {
                        success: false,
                        error: error_4.message || 'Force sync failed'
                    }];
            case 10: return [2 /*return*/];
        }
    });
}); });
