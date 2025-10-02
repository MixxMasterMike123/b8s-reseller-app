"use strict";
/**
 * Google Merchant Center Sync Functions
 *
 * Firebase Functions for syncing B8Shield products to Google Shopping.
 * Handles both manual sync and automated triggers.
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
exports.onProductDeleted = exports.onProductUpdated = exports.onProductCreated = exports.testGoogleMerchantConnection = exports.syncSingleProductToGoogle = exports.syncProductsToGoogleHttp = exports.syncAllProductsToGoogle = void 0;
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-functions/v2/firestore");
var firestore_2 = require("firebase-admin/firestore");
var cors_handler_1 = require("../protection/cors/cors-handler");
var rate_limiter_1 = require("../protection/rate-limiting/rate-limiter");
var product_mapper_1 = require("./product-mapper");
var api_client_1 = require("./api-client");
// Types imported for function signatures
var db = (0, firestore_2.getFirestore)();
// Collection name for products
var PRODUCTS_COLLECTION = 'products';
/**
 * Manual sync all products to Google Merchant Center
 * Callable function for admin use
 */
exports.syncAllProductsToGoogle = (0, https_1.onCall)({
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var productsSnapshot, products, googleProducts, results, successCount, errorCount, stats, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                console.log('🚀 Starting manual sync of all products to Google Merchant Center');
                return [4 /*yield*/, db.collection(PRODUCTS_COLLECTION).get()];
            case 1:
                productsSnapshot = _a.sent();
                products = productsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                console.log("\uD83D\uDCE6 Found ".concat(products.length, " products in Firestore"));
                googleProducts = (0, product_mapper_1.mapProductsToGoogleShopping)(products, {
                    targetMarket: 'b2c',
                    language: 'sv',
                    country: 'SE'
                });
                if (googleProducts.length === 0) {
                    return [2 /*return*/, {
                            success: true,
                            message: 'No B2C products found to sync',
                            stats: {
                                total: products.length,
                                synced: 0,
                                skipped: products.length,
                                errors: 0
                            }
                        }];
                }
                return [4 /*yield*/, (0, api_client_1.batchInsertProducts)(googleProducts)];
            case 2:
                results = _a.sent();
                successCount = results.filter(function (r) { return r.success; }).length;
                errorCount = results.length - successCount;
                stats = {
                    total: products.length,
                    synced: successCount,
                    skipped: products.length - googleProducts.length,
                    errors: errorCount
                };
                console.log('✅ Manual sync completed:', stats);
                return [2 /*return*/, {
                        success: true,
                        message: "Synced ".concat(successCount, "/").concat(googleProducts.length, " products to Google Shopping"),
                        stats: stats,
                        details: results
                    }];
            case 3:
                error_1 = _a.sent();
                console.error('❌ Manual sync failed:', error_1);
                return [2 /*return*/, {
                        success: false,
                        error: error_1.message || 'Unknown error during sync',
                        details: error_1
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * HTTP endpoint for manual sync (for admin dashboard)
 */
exports.syncProductsToGoogleHttp = (0, https_1.onRequest)({
    memory: '1GiB',
    timeoutSeconds: 540,
    cors: true
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                // Apply CORS and rate limiting
                if (!(0, cors_handler_1.corsHandler)(req, res)) {
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, rate_limiter_1.rateLimiter)(req, res)];
            case 1:
                if (!(_a.sent())) {
                    return [2 /*return*/];
                }
                return [4 /*yield*/, exports.syncAllProductsToGoogle.run({ data: {} })];
            case 2:
                result = _a.sent();
                res.status(200).json(result);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                console.error('❌ HTTP sync failed:', error_2);
                res.status(500).json({
                    success: false,
                    error: error_2.message || 'Sync failed'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Sync single product to Google Merchant Center
 */
exports.syncSingleProductToGoogle = (0, https_1.onCall)({
    memory: '512MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, productId, _b, targetMarket, productDoc, productData, googleProduct, result, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                _a = request.data, productId = _a.productId, _b = _a.targetMarket, targetMarket = _b === void 0 ? 'b2c' : _b;
                if (!productId) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'Product ID is required'
                        }];
                }
                console.log("\uD83D\uDD04 Syncing single product: ".concat(productId, " (").concat(targetMarket, ")"));
                return [4 /*yield*/, db.collection(PRODUCTS_COLLECTION).doc(productId).get()];
            case 1:
                productDoc = _c.sent();
                if (!productDoc.exists) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'Product not found'
                        }];
                }
                productData = __assign({ id: productDoc.id }, productDoc.data());
                googleProduct = (0, product_mapper_1.mapProductToGoogleShopping)(productData, {
                    targetMarket: targetMarket,
                    language: 'sv',
                    country: 'SE'
                });
                if (!googleProduct) {
                    return [2 /*return*/, {
                            success: false,
                            error: "Product not available for ".concat(targetMarket, " market or inactive")
                        }];
                }
                return [4 /*yield*/, (0, api_client_1.insertProduct)(googleProduct)];
            case 2:
                result = _c.sent();
                console.log("\u2705 Single product sync result:", result);
                return [2 /*return*/, result];
            case 3:
                error_3 = _c.sent();
                console.error('❌ Single product sync failed:', error_3);
                return [2 /*return*/, {
                        success: false,
                        error: error_3.message || 'Unknown error during single product sync'
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Test Google Merchant Center connection
 */
exports.testGoogleMerchantConnection = (0, https_1.onCall)({
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var accountResult, productsResult, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                console.log('🧪 Testing Google Merchant Center connection');
                return [4 /*yield*/, (0, api_client_1.getAccountInfo)()];
            case 1:
                accountResult = _a.sent();
                if (!accountResult.success) {
                    return [2 /*return*/, {
                            success: false,
                            error: 'Failed to connect to Google Merchant Center',
                            details: accountResult.error
                        }];
                }
                return [4 /*yield*/, (0, api_client_1.listProducts)(5)];
            case 2:
                productsResult = _a.sent();
                return [2 /*return*/, {
                        success: true,
                        message: 'Google Merchant Center connection successful',
                        account: accountResult.data,
                        sampleProducts: productsResult.data
                    }];
            case 3:
                error_4 = _a.sent();
                console.error('❌ Connection test failed:', error_4);
                return [2 /*return*/, {
                        success: false,
                        error: error_4.message || 'Connection test failed'
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Firestore Trigger: Auto-sync when product is created
 */
exports.onProductCreated = (0, firestore_1.onDocumentCreated)({
    document: "".concat(PRODUCTS_COLLECTION, "/{productId}"),
    memory: '512MiB',
    timeoutSeconds: 60
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, productData, googleProduct, result, error_5;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                productId = event.params.productId;
                productData = __assign({ id: productId }, (_a = event.data) === null || _a === void 0 ? void 0 : _a.data());
                console.log("\uD83C\uDD95 Product created, auto-syncing to Google: ".concat(productId));
                // Only sync B2C products automatically
                if (!((_b = productData.availability) === null || _b === void 0 ? void 0 : _b.b2c) || !productData.isActive) {
                    console.log("\u23ED\uFE0F  Skipping auto-sync for ".concat(productId, ": not B2C available or inactive"));
                    return [2 /*return*/];
                }
                googleProduct = (0, product_mapper_1.mapProductToGoogleShopping)(productData, {
                    targetMarket: 'b2c',
                    language: 'sv',
                    country: 'SE'
                });
                if (!googleProduct) {
                    console.log("\u23ED\uFE0F  Skipping auto-sync for ".concat(productId, ": mapping failed"));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, api_client_1.insertProduct)(googleProduct)];
            case 1:
                result = _c.sent();
                if (result.success) {
                    console.log("\u2705 Auto-sync successful for new product: ".concat(productId));
                }
                else {
                    console.error("\u274C Auto-sync failed for new product: ".concat(productId), result.error);
                }
                return [3 /*break*/, 3];
            case 2:
                error_5 = _c.sent();
                console.error('❌ Product creation trigger failed:', error_5);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Firestore Trigger: Auto-sync when product is updated
 */
exports.onProductUpdated = (0, firestore_1.onDocumentUpdated)({
    document: "".concat(PRODUCTS_COLLECTION, "/{productId}"),
    memory: '512MiB',
    timeoutSeconds: 60
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, newData, oldData, productData, deleteResult, googleProduct, result, error_6;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 4, , 5]);
                productId = event.params.productId;
                newData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
                oldData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before.data();
                if (!newData || !oldData) {
                    console.log("\u23ED\uFE0F  Skipping update sync for ".concat(productId, ": missing data"));
                    return [2 /*return*/];
                }
                productData = __assign({ id: productId }, newData);
                console.log("\uD83D\uDD04 Product updated, auto-syncing to Google: ".concat(productId));
                if (!(!((_c = productData.availability) === null || _c === void 0 ? void 0 : _c.b2c) || !productData.isActive)) return [3 /*break*/, 2];
                // Product should be removed from Google Shopping
                console.log("\uD83D\uDDD1\uFE0F  Product ".concat(productId, " became unavailable, removing from Google Shopping"));
                return [4 /*yield*/, (0, api_client_1.deleteProduct)(productId, "".concat(productId, "_b2c_SE"), 'sv', 'SE')];
            case 1:
                deleteResult = _d.sent();
                if (deleteResult.success) {
                    console.log("\u2705 Product ".concat(productId, " removed from Google Shopping"));
                }
                else {
                    console.error("\u274C Failed to remove product ".concat(productId, " from Google Shopping:"), deleteResult.error);
                }
                return [2 /*return*/];
            case 2:
                googleProduct = (0, product_mapper_1.mapProductToGoogleShopping)(productData, {
                    targetMarket: 'b2c',
                    language: 'sv',
                    country: 'SE'
                });
                if (!googleProduct) {
                    console.log("\u23ED\uFE0F  Skipping update sync for ".concat(productId, ": mapping failed"));
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, api_client_1.updateProduct)(googleProduct)];
            case 3:
                result = _d.sent();
                if (result.success) {
                    console.log("\u2705 Auto-sync update successful for product: ".concat(productId));
                }
                else {
                    console.error("\u274C Auto-sync update failed for product: ".concat(productId), result.error);
                }
                return [3 /*break*/, 5];
            case 4:
                error_6 = _d.sent();
                console.error('❌ Product update trigger failed:', error_6);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Firestore Trigger: Auto-remove when product is deleted
 */
exports.onProductDeleted = (0, firestore_1.onDocumentDeleted)({
    document: "".concat(PRODUCTS_COLLECTION, "/{productId}"),
    memory: '256MiB',
    timeoutSeconds: 30
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, result, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                productId = event.params.productId;
                console.log("\uD83D\uDDD1\uFE0F  Product deleted, removing from Google Shopping: ".concat(productId));
                return [4 /*yield*/, (0, api_client_1.deleteProduct)(productId, "".concat(productId, "_b2c_SE"), 'sv', 'SE')];
            case 1:
                result = _a.sent();
                if (result.success) {
                    console.log("\u2705 Product ".concat(productId, " removed from Google Shopping"));
                }
                else {
                    console.error("\u274C Failed to remove deleted product ".concat(productId, " from Google Shopping:"), result.error);
                }
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                console.error('❌ Product deletion trigger failed:', error_7);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
