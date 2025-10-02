"use strict";
/**
 * Google Merchant Center API Client
 *
 * This module handles direct API communication with Google Merchant Center.
 * Provides functions to create, update, and delete products in Google Shopping.
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
exports.getAccountInfo = exports.updateProductInventory = exports.batchInsertProducts = exports.listProducts = exports.getProductStatus = exports.deleteProduct = exports.updateProduct = exports.insertProduct = void 0;
var config_1 = require("./config");
var product_mapper_1 = require("./product-mapper");
/**
 * Make authenticated request to Google Merchant API
 */
var makeApiRequest = function (method, endpoint, data) { return __awaiter(void 0, void 0, void 0, function () {
    var authClient, url, response, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                return [4 /*yield*/, (0, config_1.getAuthenticatedClient)()];
            case 1:
                authClient = _b.sent();
                url = "".concat(config_1.MERCHANT_CONFIG.BASE_URL, "/content/").concat(config_1.MERCHANT_CONFIG.API_VERSION, "/").concat(endpoint);
                console.log("\uD83D\uDCE1 Making ".concat(method, " request to: ").concat(url));
                return [4 /*yield*/, authClient.request({
                        url: url,
                        method: method,
                        data: data,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })];
            case 2:
                response = _b.sent();
                console.log("\u2705 API request successful:", response.status);
                return [2 /*return*/, {
                        success: true,
                        data: response.data
                    }];
            case 3:
                error_1 = _b.sent();
                console.error("\u274C API request failed:", error_1);
                return [2 /*return*/, {
                        success: false,
                        error: error_1.message || 'Unknown API error',
                        details: ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) || error_1
                    }];
            case 4: return [2 /*return*/];
        }
    });
}); };
/**
 * Insert a single product into Google Merchant Center
 */
var insertProduct = function (product) { return __awaiter(void 0, void 0, void 0, function () {
    var validationErrors, endpoint, apiProduct;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                validationErrors = (0, product_mapper_1.validateGoogleShoppingProduct)(product);
                if (validationErrors.length > 0) {
                    return [2 /*return*/, {
                            success: false,
                            error: "Product validation failed: ".concat(validationErrors.join(', ')),
                            details: { validationErrors: validationErrors }
                        }];
                }
                endpoint = "".concat(config_1.MERCHANT_CONFIG.MERCHANT_ID, "/products");
                apiProduct = {
                    productId: product.productId,
                    contentLanguage: product.contentLanguage,
                    targetCountry: product.targetCountry,
                    channel: product.channel,
                    offerId: product.offerId,
                    product: {
                        title: product.title,
                        description: product.description,
                        link: product.link,
                        imageLink: product.imageLink,
                        additionalImageLinks: product.additionalImageLinks,
                        condition: product.condition,
                        availability: product.availability,
                        price: product.price,
                        brand: product.brand,
                        gtin: product.gtin,
                        mpn: product.mpn,
                        googleProductCategory: product.googleProductCategory,
                        productTypes: product.productTypes,
                        customLabel0: product.customLabel0,
                        customLabel1: product.customLabel1,
                        customLabel2: product.customLabel2,
                        customLabel3: product.customLabel3,
                        customLabel4: product.customLabel4,
                        shipping: product.shipping,
                        productWeight: product.productWeight,
                        productLength: product.productLength,
                        productWidth: product.productWidth,
                        productHeight: product.productHeight
                    }
                };
                console.log("\uD83D\uDCE6 Inserting product: ".concat(product.title, " (").concat(product.offerId, ")"));
                return [4 /*yield*/, makeApiRequest('POST', endpoint, apiProduct)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.insertProduct = insertProduct;
/**
 * Update an existing product in Google Merchant Center
 */
var updateProduct = function (product) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.insertProduct)(product)];
            case 1: 
            // For now, Google Merchant API treats updates as inserts
            // The API will update if product exists, create if it doesn't
            return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.updateProduct = updateProduct;
/**
 * Delete a product from Google Merchant Center
 */
var deleteProduct = function (productId, offerId, contentLanguage, targetCountry) {
    if (contentLanguage === void 0) { contentLanguage = 'sv'; }
    if (targetCountry === void 0) { targetCountry = 'SE'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var endpoint, deleteData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    endpoint = "".concat(config_1.MERCHANT_CONFIG.MERCHANT_ID, "/products/").concat(productId);
                    deleteData = {
                        productId: productId,
                        contentLanguage: contentLanguage,
                        targetCountry: targetCountry,
                        offerId: offerId
                    };
                    console.log("\uD83D\uDDD1\uFE0F  Deleting product: ".concat(productId, " (").concat(offerId, ")"));
                    return [4 /*yield*/, makeApiRequest('DELETE', endpoint, deleteData)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
};
exports.deleteProduct = deleteProduct;
/**
 * Get product status from Google Merchant Center
 */
var getProductStatus = function (productId, contentLanguage, targetCountry) {
    if (contentLanguage === void 0) { contentLanguage = 'sv'; }
    if (targetCountry === void 0) { targetCountry = 'SE'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var endpoint;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    endpoint = "".concat(config_1.MERCHANT_CONFIG.MERCHANT_ID, "/products/").concat(productId, "?contentLanguage=").concat(contentLanguage, "&targetCountry=").concat(targetCountry);
                    console.log("\uD83D\uDCCA Getting product status: ".concat(productId));
                    return [4 /*yield*/, makeApiRequest('GET', endpoint)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
};
exports.getProductStatus = getProductStatus;
/**
 * List all products in Google Merchant Center
 */
var listProducts = function (maxResults, pageToken) {
    if (maxResults === void 0) { maxResults = 50; }
    return __awaiter(void 0, void 0, void 0, function () {
        var endpoint;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    endpoint = "".concat(config_1.MERCHANT_CONFIG.MERCHANT_ID, "/products?maxResults=").concat(maxResults);
                    if (pageToken) {
                        endpoint += "&pageToken=".concat(pageToken);
                    }
                    console.log("\uD83D\uDCCB Listing products (max: ".concat(maxResults, ")"));
                    return [4 /*yield*/, makeApiRequest('GET', endpoint)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
};
exports.listProducts = listProducts;
/**
 * Batch insert multiple products
 */
var batchInsertProducts = function (products) { return __awaiter(void 0, void 0, void 0, function () {
    var results, BATCH_SIZE, i, batch, batchPromises, batchResults, successCount, failureCount;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("\uD83D\uDE80 Starting batch insert of ".concat(products.length, " products"));
                results = [];
                BATCH_SIZE = 10;
                i = 0;
                _a.label = 1;
            case 1:
                if (!(i < products.length)) return [3 /*break*/, 5];
                batch = products.slice(i, i + BATCH_SIZE);
                console.log("\uD83D\uDCE6 Processing batch ".concat(Math.floor(i / BATCH_SIZE) + 1, "/").concat(Math.ceil(products.length / BATCH_SIZE)));
                batchPromises = batch.map(function (product) { return (0, exports.insertProduct)(product); });
                return [4 /*yield*/, Promise.all(batchPromises)];
            case 2:
                batchResults = _a.sent();
                results.push.apply(results, batchResults);
                if (!(i + BATCH_SIZE < products.length)) return [3 /*break*/, 4];
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                i += BATCH_SIZE;
                return [3 /*break*/, 1];
            case 5:
                successCount = results.filter(function (r) { return r.success; }).length;
                failureCount = results.length - successCount;
                console.log("\u2705 Batch insert completed: ".concat(successCount, " success, ").concat(failureCount, " failures"));
                return [2 /*return*/, results];
        }
    });
}); };
exports.batchInsertProducts = batchInsertProducts;
/**
 * Sync product inventory/availability
 */
var updateProductInventory = function (productId, offerId, availability, price, contentLanguage, targetCountry) {
    if (contentLanguage === void 0) { contentLanguage = 'sv'; }
    if (targetCountry === void 0) { targetCountry = 'SE'; }
    return __awaiter(void 0, void 0, void 0, function () {
        var endpoint, updateData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    endpoint = "".concat(config_1.MERCHANT_CONFIG.MERCHANT_ID, "/products/").concat(productId);
                    updateData = __assign({ productId: productId, contentLanguage: contentLanguage, targetCountry: targetCountry, offerId: offerId, availability: availability }, (price && { price: price }));
                    console.log("\uD83D\uDCCA Updating inventory for: ".concat(productId, " (").concat(availability, ")"));
                    return [4 /*yield*/, makeApiRequest('POST', endpoint, updateData)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
};
exports.updateProductInventory = updateProductInventory;
/**
 * Get account information
 */
var getAccountInfo = function () { return __awaiter(void 0, void 0, void 0, function () {
    var endpoint;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                endpoint = "accounts/".concat(config_1.MERCHANT_CONFIG.MERCHANT_ID);
                console.log("\u2139\uFE0F  Getting account info for merchant: ".concat(config_1.MERCHANT_CONFIG.MERCHANT_ID));
                return [4 /*yield*/, makeApiRequest('GET', endpoint)];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.getAccountInfo = getAccountInfo;
