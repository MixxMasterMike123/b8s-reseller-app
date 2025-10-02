"use strict";
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
exports.testOrderUpdate = exports.manualStatusUpdate = exports.processB2COrderCompletion = exports.processB2COrderCompletionHttp = void 0;
var functions = require("firebase-functions");
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-admin/firestore");
var app_urls_1 = require("../config/app-urls");
var rate_limits_1 = require("../config/rate-limits");
// V3 Email System - imports handled dynamically in functions
var database_1 = require("../config/database");
/**
 * Enhanced rate limiting with bulk operation detection
 */
var checkRateLimit = function (clientIP) {
    var now = Date.now();
    // Initialize tracking maps if needed
    if (!global.orderRateLimit)
        global.orderRateLimit = new Map();
    if (!global.bulkModeTracker)
        global.bulkModeTracker = new Map();
    // Get current tracking data
    var ipOrders = global.orderRateLimit.get(clientIP) || [];
    var bulkTracker = global.bulkModeTracker.get(clientIP) || {
        enabled: false,
        enabledAt: 0,
        requestTimes: []
    };
    // Clean up old requests
    var recentOrders = ipOrders.filter(function (time) { return now - time < rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.windowMs; });
    // Update request times for bulk detection
    bulkTracker.requestTimes.push(now);
    bulkTracker.requestTimes = bulkTracker.requestTimes.filter(function (time) { return now - time < rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.timeWindow; });
    // Check if bulk mode should be enabled
    if (!bulkTracker.enabled &&
        bulkTracker.requestTimes.length >= rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.rapidRequests) {
        bulkTracker.enabled = true;
        bulkTracker.enabledAt = now;
        console.log("\uD83D\uDD04 Bulk mode enabled for IP ".concat(clientIP, " - detected ").concat(bulkTracker.requestTimes.length, " rapid requests"));
    }
    // Check if bulk mode should be disabled (timeout)
    if (bulkTracker.enabled &&
        now - bulkTracker.enabledAt > rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.maxBulkDuration) {
        bulkTracker.enabled = false;
        bulkTracker.enabledAt = 0;
        console.log("\u23F0 Bulk mode disabled for IP ".concat(clientIP, " - timeout after 30 minutes"));
    }
    // Apply appropriate rate limits
    var maxRequests;
    var windowMs;
    var mode;
    if (bulkTracker.enabled) {
        // Use bulk mode limits
        maxRequests = rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.perWindow;
        windowMs = rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.windowMs;
        mode = 'bulk';
        // Filter requests based on bulk window
        var bulkRecentOrders = ipOrders.filter(function (time) { return now - time < windowMs; });
        if (bulkRecentOrders.length >= maxRequests) {
            return {
                allowed: false,
                bulkMode: true,
                message: "Bulk mode: ".concat(maxRequests, " orders per ").concat(Math.ceil(windowMs / 60000), " minutes limit reached")
            };
        }
    }
    else {
        // Use normal mode limits
        maxRequests = rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.perWindow;
        windowMs = rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.windowMs;
        mode = 'normal';
        if (recentOrders.length >= maxRequests) {
            return {
                allowed: false,
                bulkMode: false,
                message: "Normal mode: ".concat(maxRequests, " orders per ").concat(Math.ceil(windowMs / 60000), " minutes limit reached")
            };
        }
    }
    // Update tracking
    recentOrders.push(now);
    global.orderRateLimit.set(clientIP, recentOrders);
    global.bulkModeTracker.set(clientIP, bulkTracker);
    console.log("\uD83D\uDCE6 Order processing request from IP: ".concat(clientIP, " (").concat(recentOrders.length, "/").concat(maxRequests, " in ").concat(Math.ceil(windowMs / 60000), " min, ").concat(mode, " mode)"));
    return {
        allowed: true,
        bulkMode: bulkTracker.enabled
    };
};
// Campaign matching function (simplified for Firebase Functions)
function checkCampaignMatch(orderData, campaign, affiliateId, affiliateCode) {
    var _a, _b, _c, _d;
    // Campaign must be active and within date range
    if (campaign.status !== 'active')
        return false;
    var now = new Date();
    var startDate = ((_a = campaign.startDate) === null || _a === void 0 ? void 0 : _a.toDate) ? campaign.startDate.toDate() : new Date(campaign.startDate);
    var endDate = ((_b = campaign.endDate) === null || _b === void 0 ? void 0 : _b.toDate) ? campaign.endDate.toDate() : new Date(campaign.endDate);
    if (now < startDate || now > endDate)
        return false;
    // Check affiliate targeting
    if (campaign.selectedAffiliates === 'selected') {
        if (!campaign.affiliateIds || !campaign.affiliateIds.includes(affiliateId)) {
            return false;
        }
    }
    // Check product targeting
    if (campaign.applicableProducts === 'selected' && campaign.productIds) {
        var orderProductIds_1 = ((_c = orderData.items) === null || _c === void 0 ? void 0 : _c.map(function (item) { return item.id; })) || [];
        var hasMatchingProduct = campaign.productIds.some(function (productId) {
            return orderProductIds_1.includes(productId);
        });
        if (!hasMatchingProduct)
            return false;
    }
    // Check campaign code requirement (optional)
    if (campaign.code) {
        var orderAffiliateCode = orderData.affiliateCode || ((_d = orderData.affiliate) === null || _d === void 0 ? void 0 : _d.code);
        if (orderAffiliateCode !== affiliateCode)
            return false;
    }
    return true;
}
// Universal Campaign Revenue Tracking for Special Edition Products
function processUniversalCampaignRevenue(orderData, db) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var specialEditionItems, campaignsRef, campaignsQuery, campaignsSnap, _loop_1, _i, specialEditionItems_1, item, error_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    specialEditionItems = ((_a = orderData.items) === null || _a === void 0 ? void 0 : _a.filter(function (item) {
                        return item.group === 'B8Shield-special-edition';
                    })) || [];
                    if (specialEditionItems.length === 0) {
                        console.log('📊 No special edition products found in order');
                        return [2 /*return*/];
                    }
                    console.log("\uD83D\uDCCA Found ".concat(specialEditionItems.length, " special edition products"));
                    campaignsRef = db.collection('campaigns');
                    campaignsQuery = campaignsRef.where('status', '==', 'active').where('isRevenueShare', '==', true);
                    return [4 /*yield*/, campaignsQuery.get()];
                case 1:
                    campaignsSnap = _b.sent();
                    if (campaignsSnap.empty) {
                        console.log('📊 No active revenue share campaigns found');
                        return [2 /*return*/];
                    }
                    _loop_1 = function (item) {
                        var itemRevenue = calculateItemRevenue(item, orderData);
                        console.log("\uD83D\uDCCA Processing item: ".concat(item.name, " (Revenue: ").concat(itemRevenue.campaignEligibleRevenue, " SEK)"));
                        campaignsSnap.docs.forEach(function (campaignDoc) { return __awaiter(_this, void 0, void 0, function () {
                            var campaign, campaignId, campaignShare;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        campaign = campaignDoc.data();
                                        campaignId = campaignDoc.id;
                                        if (!shouldCampaignTrackProduct(campaign, item)) return [3 /*break*/, 3];
                                        campaignShare = itemRevenue.campaignEligibleRevenue * (campaign.revenueShareRate || 50) / 100;
                                        console.log("\uD83D\uDCCA ".concat((_a = campaign.name) === null || _a === void 0 ? void 0 : _a['sv-SE'], " gets ").concat(campaignShare, " SEK from ").concat(item.name));
                                        // Update campaign statistics
                                        return [4 /*yield*/, campaignDoc.ref.update({
                                                totalConversions: firestore_1.FieldValue.increment(1),
                                                totalRevenue: firestore_1.FieldValue.increment(itemRevenue.campaignEligibleRevenue),
                                                totalCampaignShare: firestore_1.FieldValue.increment(campaignShare)
                                            })];
                                    case 1:
                                        // Update campaign statistics
                                        _b.sent();
                                        // Create detailed tracking record
                                        return [4 /*yield*/, db.collection('campaignRevenueTracking').add({
                                                campaignId: campaignId,
                                                orderId: orderData.id || 'unknown',
                                                productId: item.id,
                                                productName: item.name,
                                                productGroup: item.group,
                                                itemQuantity: item.quantity || 1,
                                                itemPrice: item.price || 0,
                                                customerDiscount: itemRevenue.customerDiscount,
                                                affiliateCommission: itemRevenue.affiliateCommission,
                                                vatAmount: itemRevenue.vatAmount,
                                                campaignEligibleRevenue: itemRevenue.campaignEligibleRevenue,
                                                campaignShare: campaignShare,
                                                companyShare: itemRevenue.campaignEligibleRevenue - campaignShare,
                                                affiliateCode: orderData.affiliateCode || null,
                                                hasAffiliateAttribution: !!orderData.affiliateCode,
                                                trackedAt: firestore_1.FieldValue.serverTimestamp()
                                            })];
                                    case 2:
                                        // Create detailed tracking record
                                        _b.sent();
                                        _b.label = 3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                    };
                    // Process each special edition item for each applicable campaign
                    for (_i = 0, specialEditionItems_1 = specialEditionItems; _i < specialEditionItems_1.length; _i++) {
                        item = specialEditionItems_1[_i];
                        _loop_1(item);
                    }
                    console.log('📊 Universal campaign revenue tracking completed');
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    console.error('📊 Error in universal campaign revenue tracking:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Calculate revenue breakdown for a single item
function calculateItemRevenue(item, orderData, vatRate) {
    if (vatRate === void 0) { vatRate = 0.25; }
    var itemTotal = (item.price || 0) * (item.quantity || 1);
    var itemDiscountRate = orderData.discountPercentage ? (orderData.discountPercentage / 100) : 0;
    // Step 1: Apply customer discount
    var customerDiscount = itemTotal * itemDiscountRate;
    var afterDiscount = itemTotal - customerDiscount;
    // Step 2: Remove VAT
    var vatAmount = afterDiscount * vatRate / (1 + vatRate);
    var afterVAT = afterDiscount - vatAmount;
    // Step 3: Calculate affiliate commission (if any)
    var affiliateCommission = 0;
    if (orderData.affiliateCode) {
        // Assume 20% commission rate (could be made dynamic)
        affiliateCommission = afterVAT * 0.20;
    }
    // Step 4: Campaign eligible revenue (after all deductions)
    var campaignEligibleRevenue = afterVAT - affiliateCommission;
    return {
        itemTotal: itemTotal,
        customerDiscount: customerDiscount,
        afterDiscount: afterDiscount,
        vatAmount: vatAmount,
        afterVAT: afterVAT,
        affiliateCommission: affiliateCommission,
        campaignEligibleRevenue: campaignEligibleRevenue
    };
}
// Check if campaign should track this product
function shouldCampaignTrackProduct(campaign, item) {
    var _a;
    // For KAJJAN and EMMA campaigns, track their respective special edition products
    var campaignName = ((_a = campaign.name) === null || _a === void 0 ? void 0 : _a['sv-SE']) || '';
    var itemName = item.name || '';
    if (campaignName.includes('KAJJAN') && itemName.includes('KAJJAN')) {
        return true;
    }
    if (campaignName.includes('EMMA') && itemName.includes('EMMA')) {
        return true;
    }
    // Fallback: if campaign targets specific products
    if (campaign.applicableProducts === 'selected' && campaign.productIds) {
        return campaign.productIds.includes(item.id);
    }
    // Default: track all special edition products for revenue share campaigns
    return item.group === 'B8Shield-special-edition';
}
// Complex commission calculation for revenue share campaigns
function calculateComplexCommission(orderData, affiliate, campaign, vatRate) {
    if (vatRate === void 0) { vatRate = 0.25; }
    var originalTotal = orderData.total || orderData.subtotal || 0;
    var shipping = orderData.shipping || 0;
    // Step 1: Calculate base product value (after customer discount, excluding shipping)
    var productValueWithVAT = Math.max(0, originalTotal - shipping);
    var productValueExcludingVAT = productValueWithVAT / (1 + vatRate);
    // Step 2: Calculate affiliate commission (from discounted price, excluding VAT)
    var affiliateRate = (affiliate.commissionRate || 20) / 100;
    var affiliateCommission = Math.round((productValueExcludingVAT * affiliateRate) * 100) / 100;
    // Step 3: Calculate remaining amount after affiliate commission
    var remainingAfterAffiliate = productValueExcludingVAT - affiliateCommission;
    // Step 4: Calculate campaign revenue share (if applicable)
    var campaignShare = 0;
    var companyShare = remainingAfterAffiliate;
    if (campaign.isRevenueShare && remainingAfterAffiliate > 0) {
        var shareRate = (campaign.revenueShareRate || 50) / 100;
        campaignShare = Math.round((remainingAfterAffiliate * shareRate) * 100) / 100;
        companyShare = remainingAfterAffiliate - campaignShare;
    }
    return {
        affiliateCommission: affiliateCommission,
        campaignShare: campaignShare,
        companyShare: companyShare,
        productValueExcludingVAT: productValueExcludingVAT,
        remainingAfterAffiliate: remainingAfterAffiliate
    };
}
// Update the local calculateCommission function to fix double deduction bug
function calculateCommission(orderData, affiliate, vatRate, campaignRate) {
    if (vatRate === void 0) { vatRate = 0.25; }
    var orderTotal = orderData.total || orderData.subtotal || 0;
    var shipping = orderData.shipping || 0;
    var discountAmount = orderData.discountAmount || 0; // For reporting only
    // Use campaign rate if provided, otherwise use affiliate's default rate
    var rate = (campaignRate || affiliate.commissionRate || 15) / 100;
    // Step 1: Deduct shipping from order total (shipping is separate service)
    // Note: orderTotal already has affiliate discount applied
    var productValueWithVAT = Math.max(0, orderTotal - shipping);
    // Step 2: Extract VAT from the remaining product value
    // Swedish VAT system: VAT-exclusive = VAT-inclusive / 1.25
    var productValueExcludingVAT = productValueWithVAT / (1 + vatRate);
    var vatAmount = productValueWithVAT - productValueExcludingVAT;
    // Step 3: Apply commission rate to the final net product value
    var commission = Math.round((productValueExcludingVAT * rate) * 100) / 100;
    return {
        commission: commission,
        deductions: {
            shipping: shipping,
            vat: vatAmount,
            // Note: discount is already applied in orderTotal, not deducted here
            discountAmount: discountAmount // For reporting/transparency only
        },
        netBase: productValueExcludingVAT,
        calculationSteps: {
            orderTotal: orderTotal,
            afterShipping: productValueWithVAT,
            productValueExcludingVAT: productValueExcludingVAT,
            vatAmount: vatAmount,
            rate: rate,
            final: commission,
            // Include discount info for transparency
            discountAlreadyApplied: discountAmount
        }
    };
}
/**
 * [V2] HTTP endpoint for B2C order processing with affiliate commission handling
 */
exports.processB2COrderCompletionHttp = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var clientIP, rateCheck, orderId, localDb, commissionAmount, orderRef, orderSnap, orderData, orderItems, affiliateCode, discountCode, affiliateClickId, customerRef, customerError_1, customerEmail, EmailOrchestrator, orchestrator, customerEmailError_1, EmailOrchestrator, orchestrator, adminEmailError_1, emailError_1, commissionProcessed, affiliateSnap, affiliateDoc, affiliate, campaignsRef, activeCampaignsQuery, activeCampaignsSnap, matchingCampaign, campaignShare, _i, _a, campaignDoc, campaign, isMatch, commissionBreakdown, result, orderUpdateData, campaignRef, attributionMethod, error_2;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return __generator(this, function (_l) {
        switch (_l.label) {
            case 0:
                clientIP = req.ip || ((_b = req.connection) === null || _b === void 0 ? void 0 : _b.remoteAddress) || 'unknown';
                rateCheck = checkRateLimit(clientIP);
                if (!rateCheck.allowed) {
                    console.warn("\uD83D\uDEAB Rate limit exceeded for IP: ".concat(clientIP, " - ").concat(rateCheck.message));
                    res.status(429).json({
                        success: false,
                        error: rateCheck.message || 'Rate limit exceeded',
                        retryAfter: rateCheck.bulkMode ? 600 : 300,
                        bulkMode: rateCheck.bulkMode
                    });
                    return [2 /*return*/];
                }
                if (rateCheck.bulkMode) {
                    console.log("\uD83D\uDD04 Processing in bulk mode for IP: ".concat(clientIP));
                }
                // Enable CORS with more permissive settings for testing
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.set('Access-Control-Allow-Headers', '*');
                res.set('Access-Control-Max-Age', '3600');
                // Handle preflight requests
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                // Only allow POST
                if (req.method !== 'POST') {
                    res.status(405).send('Method Not Allowed');
                    return [2 /*return*/];
                }
                _l.label = 1;
            case 1:
                _l.trys.push([1, 33, , 34]);
                orderId = req.body.orderId;
                if (!orderId) {
                    res.status(400).json({
                        success: false,
                        error: 'The function must be called with an "orderId".'
                    });
                    return [2 /*return*/];
                }
                console.log("Processing B2C order completion for orderId: ".concat(orderId));
                localDb = database_1.db;
                commissionAmount = 0;
                orderRef = localDb.collection('orders').doc(orderId);
                return [4 /*yield*/, orderRef.get()];
            case 2:
                orderSnap = _l.sent();
                if (!orderSnap.exists) {
                    console.error("Order ".concat(orderId, " not found in b8s-reseller-db."));
                    res.status(404).json({
                        success: false,
                        error: "Order ".concat(orderId, " not found in database")
                    });
                    return [2 /*return*/];
                }
                orderData = orderSnap.data();
                // DEBUG: Log the actual order data structure to see what items look like
                console.log('🔍 Order Processing - Full order data:', JSON.stringify(orderData, null, 2));
                orderItems = orderData.items;
                console.log('🔍 Order Processing - Order items:', JSON.stringify(orderItems, null, 2));
                if (orderItems && orderItems.length > 0) {
                    console.log('🔍 Order Processing - First item details:');
                    console.log('🔍 Order Processing - item.color:', orderItems[0].color);
                    console.log('🔍 Order Processing - item.size:', orderItems[0].size);
                    console.log('🔍 Order Processing - item.name:', orderItems[0].name);
                }
                affiliateCode = orderData.affiliateCode || ((_c = orderData.affiliate) === null || _c === void 0 ? void 0 : _c.code);
                discountCode = orderData.discountCode || ((_d = orderData.affiliate) === null || _d === void 0 ? void 0 : _d.code);
                affiliateClickId = orderData.affiliateClickId || ((_e = orderData.affiliate) === null || _e === void 0 ? void 0 : _e.clickId);
                if (!(orderData.b2cCustomerId && orderData.total)) return [3 /*break*/, 6];
                console.log("Updating B2C customer stats for customer: ".concat(orderData.b2cCustomerId));
                _l.label = 3;
            case 3:
                _l.trys.push([3, 5, , 6]);
                customerRef = localDb.collection('b2cCustomers').doc(orderData.b2cCustomerId);
                return [4 /*yield*/, customerRef.update({
                        'stats.totalOrders': firestore_1.FieldValue.increment(1),
                        'stats.totalSpent': firestore_1.FieldValue.increment(orderData.total),
                        'stats.lastOrderDate': firestore_1.FieldValue.serverTimestamp(),
                        'updatedAt': firestore_1.FieldValue.serverTimestamp()
                    })];
            case 4:
                _l.sent();
                console.log("Successfully updated customer stats for ".concat(orderData.b2cCustomerId));
                return [3 /*break*/, 6];
            case 5:
                customerError_1 = _l.sent();
                console.error("Error updating customer stats:", customerError_1);
                return [3 /*break*/, 6];
            case 6:
                // --- Send B2C Order Confirmation Emails ---
                console.log("Sending B2C order confirmation emails for order ".concat(orderId));
                _l.label = 7;
            case 7:
                _l.trys.push([7, 17, , 18]);
                customerEmail = (_f = orderData.customerInfo) === null || _f === void 0 ? void 0 : _f.email;
                if (!customerEmail) return [3 /*break*/, 15];
                // Send customer confirmation email using orchestrator system
                console.log("Sending customer confirmation email to ".concat(customerEmail, " using orchestrator system"));
                _l.label = 8;
            case 8:
                _l.trys.push([8, 10, , 11]);
                EmailOrchestrator = require('../email-orchestrator/core/EmailOrchestrator').EmailOrchestrator;
                orchestrator = new EmailOrchestrator();
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'ORDER_CONFIRMATION',
                        customerInfo: orderData.customerInfo,
                        orderId: orderId,
                        source: 'b2c',
                        language: ((_g = orderData.customerInfo) === null || _g === void 0 ? void 0 : _g.preferredLang) || 'sv-SE',
                        orderData: orderData
                    })];
            case 9:
                _l.sent();
                console.log("\u2705 Orchestrator Customer confirmation email sent to ".concat(customerEmail));
                return [3 /*break*/, 11];
            case 10:
                customerEmailError_1 = _l.sent();
                console.error("\u274C Orchestrator Customer email failed for ".concat(customerEmail, ":"), customerEmailError_1);
                return [3 /*break*/, 11];
            case 11:
                _l.trys.push([11, 13, , 14]);
                // Send admin notification email using orchestrator system
                console.log('Sending admin notification email using orchestrator system');
                EmailOrchestrator = require('../email-orchestrator/core/EmailOrchestrator').EmailOrchestrator;
                orchestrator = new EmailOrchestrator();
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'ORDER_NOTIFICATION_ADMIN',
                        customerInfo: orderData.customerInfo,
                        orderId: orderId,
                        source: 'b2c',
                        language: 'sv-SE',
                        orderData: orderData,
                        adminEmail: true
                    })];
            case 12:
                _l.sent();
                console.log("\u2705 Orchestrator Admin notification email sent for order ".concat(orderData.orderNumber));
                return [3 /*break*/, 14];
            case 13:
                adminEmailError_1 = _l.sent();
                console.error("\u274C Orchestrator Admin email failed for order ".concat(orderId, ":"), adminEmailError_1);
                return [3 /*break*/, 14];
            case 14: return [3 /*break*/, 16];
            case 15:
                console.warn("No customer email found for order ".concat(orderId, ", skipping customer confirmation"));
                _l.label = 16;
            case 16: return [3 /*break*/, 18];
            case 17:
                emailError_1 = _l.sent();
                console.error("Error sending B2C order emails for order ".concat(orderId, ":"), emailError_1);
                return [3 /*break*/, 18];
            case 18:
                // --- Universal Campaign Revenue Tracking (ALWAYS runs) ---
                // Track revenue for special campaigns regardless of affiliate attribution
                console.log('🎯 Processing universal campaign revenue tracking...');
                return [4 /*yield*/, processUniversalCampaignRevenue(orderData, localDb)];
            case 19:
                _l.sent();
                commissionProcessed = false;
                if (!!affiliateCode) return [3 /*break*/, 20];
                console.log('No affiliate code found for order, skipping commission.');
                commissionProcessed = false;
                return [3 /*break*/, 32];
            case 20: return [4 /*yield*/, localDb
                    .collection('affiliates')
                    .where('affiliateCode', '==', affiliateCode)
                    .where('status', '==', 'active')
                    .limit(1)
                    .get()];
            case 21:
                affiliateSnap = _l.sent();
                if (affiliateSnap.empty) {
                    console.error("No active affiliate found for code: ".concat(affiliateCode));
                    res.json({ success: true, message: 'Order processed (invalid affiliate)' });
                    return [2 /*return*/];
                }
                affiliateDoc = affiliateSnap.docs[0];
                affiliate = affiliateDoc.data();
                // Check for active campaigns that might affect this order
                console.log('Checking for active campaigns...');
                campaignsRef = localDb.collection('campaigns');
                activeCampaignsQuery = campaignsRef.where('status', '==', 'active');
                return [4 /*yield*/, activeCampaignsQuery.get()];
            case 22:
                activeCampaignsSnap = _l.sent();
                matchingCampaign = null;
                campaignShare = 0;
                if (!activeCampaignsSnap.empty) {
                    // Import campaign utilities (we'll need to make this available in functions)
                    for (_i = 0, _a = activeCampaignsSnap.docs; _i < _a.length; _i++) {
                        campaignDoc = _a[_i];
                        campaign = campaignDoc.data();
                        isMatch = checkCampaignMatch(orderData, campaign, affiliateDoc.id, affiliateCode);
                        if (isMatch) {
                            matchingCampaign = __assign({ id: campaignDoc.id }, campaign);
                            console.log("Found matching campaign: ".concat(((_h = campaign.name) === null || _h === void 0 ? void 0 : _h['sv-SE']) || 'Unknown Campaign'));
                            break;
                        }
                    }
                }
                commissionBreakdown = void 0;
                if (matchingCampaign && matchingCampaign.isRevenueShare) {
                    // Use complex commission calculation for revenue share campaigns
                    commissionBreakdown = calculateComplexCommission(orderData, affiliate, matchingCampaign);
                    commissionAmount = commissionBreakdown.affiliateCommission;
                    campaignShare = commissionBreakdown.campaignShare;
                    console.log("Complex commission calculation for campaign \"".concat((_j = matchingCampaign.name) === null || _j === void 0 ? void 0 : _j['sv-SE'], "\":\n          - Affiliate (").concat(affiliateCode, "): ").concat(commissionAmount, " SEK\n          - Campaign share: ").concat(campaignShare, " SEK\n          - Company share: ").concat(commissionBreakdown.companyShare, " SEK"));
                }
                else {
                    result = calculateCommission(orderData, affiliate);
                    commissionAmount = result.commission;
                    console.log("Standard commission calculation for order ".concat(orderId, ": ").concat(orderData.total, " * ").concat(affiliate.commissionRate, "% = ").concat(commissionAmount));
                }
                // Update affiliate stats
                console.log("Updating affiliate stats for ".concat(affiliateDoc.id));
                return [4 /*yield*/, affiliateDoc.ref.update({
                        'stats.conversions': firestore_1.FieldValue.increment(1),
                        'stats.totalEarnings': firestore_1.FieldValue.increment(commissionAmount),
                        'stats.balance': firestore_1.FieldValue.increment(commissionAmount)
                    })];
            case 23:
                _l.sent();
                // Update the order with commission information (CRITICAL FIX)
                console.log("Updating order ".concat(orderId, " with commission ").concat(commissionAmount));
                orderUpdateData = {
                    affiliateCommission: commissionAmount,
                    affiliateId: affiliateDoc.id,
                    conversionProcessed: true,
                    conversionProcessedAt: firestore_1.FieldValue.serverTimestamp()
                };
                // Add campaign information if applicable
                if (matchingCampaign) {
                    orderUpdateData.campaignId = matchingCampaign.id;
                    orderUpdateData.campaignName = ((_k = matchingCampaign.name) === null || _k === void 0 ? void 0 : _k['sv-SE']) || 'Unknown Campaign';
                    if (campaignShare > 0) {
                        orderUpdateData.campaignShare = campaignShare;
                        orderUpdateData.campaignCommissionBreakdown = commissionBreakdown;
                    }
                }
                return [4 /*yield*/, orderRef.update(orderUpdateData)];
            case 24:
                _l.sent();
                console.log("Successfully updated order ".concat(orderId, " with commission data"));
                if (!(matchingCampaign && campaignShare > 0)) return [3 /*break*/, 27];
                console.log("Updating campaign stats for ".concat(matchingCampaign.id));
                campaignRef = localDb.collection('campaigns').doc(matchingCampaign.id);
                return [4 /*yield*/, campaignRef.update({
                        totalConversions: firestore_1.FieldValue.increment(1),
                        totalRevenue: firestore_1.FieldValue.increment(orderData.total || 0)
                    })];
            case 25:
                _l.sent();
                // Create campaign participation record for tracking
                return [4 /*yield*/, localDb.collection('campaignParticipants').add({
                        campaignId: matchingCampaign.id,
                        orderId: orderId,
                        affiliateId: affiliateDoc.id,
                        affiliateCode: affiliateCode,
                        campaignShare: campaignShare,
                        orderTotal: orderData.total || 0,
                        participatedAt: firestore_1.FieldValue.serverTimestamp()
                    })];
            case 26:
                // Create campaign participation record for tracking
                _l.sent();
                _l.label = 27;
            case 27:
                if (!affiliateClickId) return [3 /*break*/, 29];
                console.log("Updating affiliate click ".concat(affiliateClickId));
                return [4 /*yield*/, localDb
                        .collection('affiliateClicks')
                        .doc(affiliateClickId)
                        .update({
                        converted: true,
                        orderId: orderId,
                        commissionAmount: commissionAmount
                    })];
            case 28:
                _l.sent();
                _l.label = 29;
            case 29:
                attributionMethod = null;
                if (affiliateClickId) {
                    attributionMethod = 'server';
                }
                else if (affiliateCode) {
                    attributionMethod = 'cookie';
                }
                else if (discountCode) {
                    attributionMethod = 'discount';
                }
                if (!attributionMethod) return [3 /*break*/, 31];
                return [4 /*yield*/, orderRef.update({ attributionMethod: attributionMethod })];
            case 30:
                _l.sent();
                _l.label = 31;
            case 31:
                console.log("Successfully processed affiliate commission for order ".concat(orderId));
                commissionProcessed = true;
                _l.label = 32;
            case 32:
                // Send final response
                res.json({
                    success: true,
                    message: commissionProcessed ? 'Order processed with affiliate commission' : 'Order processed (no affiliate)',
                    commission: commissionAmount
                });
                return [3 /*break*/, 34];
            case 33:
                error_2 = _l.sent();
                console.error('Error processing B2C order completion:', error_2);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error processing order'
                });
                return [3 /*break*/, 34];
            case 34: return [2 /*return*/];
        }
    });
}); });
/**
 * [V2] Callable function for B2C order completion with affiliate processing
 */
exports.processB2COrderCompletion = (0, https_1.onCall)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var allowedOrigins, origin, orderId, localDb, orderRef, orderSnap, orderData, affiliateCode, affiliatesRef, q, affiliateSnapshot, affiliateDoc, affiliate, affiliateId_1, commissionAmount_1, clicksRef, recentClicksQuery, recentClicksSnapshot, clickDoc, clickError_1, error_3, error_4;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                allowedOrigins = [
                    'https://shop.b8shield.com',
                    app_urls_1.appUrls.B2B_PORTAL,
                    'http://localhost:5173' // For local development
                ];
                origin = request.data.origin || ((_b = (_a = request.rawRequest) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.origin) || '';
                if (!allowedOrigins.includes(origin)) {
                    throw new functions.https.HttpsError('permission-denied', 'Origin not allowed');
                }
                orderId = request.data.orderId;
                if (!orderId) {
                    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "orderId".');
                }
                console.log("Processing B2C order completion for orderId: ".concat(orderId));
                localDb = database_1.db;
                _d.label = 1;
            case 1:
                _d.trys.push([1, 18, , 19]);
                orderRef = localDb.collection('orders').doc(orderId);
                return [4 /*yield*/, orderRef.get()];
            case 2:
                orderSnap = _d.sent();
                if (!orderSnap.exists) {
                    console.error("Order ".concat(orderId, " not found in b8s-reseller-db."));
                    return [2 /*return*/, { success: false, error: "Order ".concat(orderId, " not found in database") }];
                }
                orderData = orderSnap.data();
                affiliateCode = orderData.affiliateCode || ((_c = orderData.affiliate) === null || _c === void 0 ? void 0 : _c.code);
                console.log("Processing order ".concat(orderId, ". Affiliate code: ").concat(affiliateCode || 'none'));
                if (!affiliateCode) return [3 /*break*/, 16];
                console.log("Processing conversion for order ".concat(orderId, " with affiliate code: ").concat(affiliateCode));
                affiliatesRef = localDb.collection('affiliates');
                q = affiliatesRef.where('affiliateCode', '==', affiliateCode).where('status', '==', 'active');
                return [4 /*yield*/, q.get()];
            case 3:
                affiliateSnapshot = _d.sent();
                if (affiliateSnapshot.empty) {
                    console.error("No active affiliate found for code: ".concat(affiliateCode));
                    return [2 /*return*/, { success: false, error: "No active affiliate found for code: ".concat(affiliateCode) }];
                }
                affiliateDoc = affiliateSnapshot.docs[0];
                affiliate = affiliateDoc.data();
                affiliateId_1 = affiliateDoc.id;
                console.log("Found affiliate: ".concat(affiliate.name, " (ID: ").concat(affiliateId_1, ")"));
                commissionAmount_1 = calculateCommission(orderData, affiliate).commission;
                console.log("Commission calculation: ".concat(orderData.subtotal, " * ").concat(affiliate.commissionRate, "% = ").concat(commissionAmount_1));
                if (!(commissionAmount_1 > 0)) return [3 /*break*/, 15];
                _d.label = 4;
            case 4:
                _d.trys.push([4, 14, , 15]);
                // Update affiliate stats in a transaction
                return [4 /*yield*/, localDb.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                        var affiliateRef, currentAffiliateDoc, currentStats, newStats;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    affiliateRef = localDb.collection('affiliates').doc(affiliateId_1);
                                    return [4 /*yield*/, transaction.get(affiliateRef)];
                                case 1:
                                    currentAffiliateDoc = _a.sent();
                                    if (!currentAffiliateDoc.exists) {
                                        throw new Error("Affiliate not found during transaction.");
                                    }
                                    currentStats = currentAffiliateDoc.data().stats || {};
                                    newStats = {
                                        conversions: (currentStats.conversions || 0) + 1,
                                        totalEarnings: (currentStats.totalEarnings || 0) + commissionAmount_1,
                                        balance: (currentStats.balance || 0) + commissionAmount_1,
                                        clicks: currentStats.clicks || 0
                                    };
                                    console.log("Updating affiliate stats:", newStats);
                                    transaction.update(affiliateRef, { stats: newStats });
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 5:
                // Update affiliate stats in a transaction
                _d.sent();
                // Update the order with commission information
                return [4 /*yield*/, orderRef.update({
                        affiliateCommission: commissionAmount_1,
                        affiliateId: affiliateId_1,
                        conversionProcessed: true,
                        conversionProcessedAt: firestore_1.FieldValue.serverTimestamp()
                    })];
            case 6:
                // Update the order with commission information
                _d.sent();
                console.log("Successfully updated stats and order for affiliate ".concat(affiliateId_1, "."));
                _d.label = 7;
            case 7:
                _d.trys.push([7, 12, , 13]);
                clicksRef = localDb.collection('affiliateClicks');
                recentClicksQuery = clicksRef
                    .where('affiliateCode', '==', affiliateCode)
                    .where('converted', '==', false)
                    .orderBy('timestamp', 'desc')
                    .limit(1);
                return [4 /*yield*/, recentClicksQuery.get()];
            case 8:
                recentClicksSnapshot = _d.sent();
                if (!!recentClicksSnapshot.empty) return [3 /*break*/, 10];
                clickDoc = recentClicksSnapshot.docs[0];
                return [4 /*yield*/, clickDoc.ref.update({
                        converted: true,
                        orderId: orderId,
                        commissionAmount: commissionAmount_1,
                        convertedAt: firestore_1.FieldValue.serverTimestamp()
                    })];
            case 9:
                _d.sent();
                console.log("Click document ".concat(clickDoc.id, " marked as converted."));
                return [3 /*break*/, 11];
            case 10:
                console.log("No unconverted clicks found for affiliate code ".concat(affiliateCode));
                _d.label = 11;
            case 11: return [3 /*break*/, 13];
            case 12:
                clickError_1 = _d.sent();
                console.error("Error updating click record:", clickError_1);
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/, {
                    success: true,
                    message: "Processed order ".concat(orderId),
                    affiliateCommission: commissionAmount_1,
                    affiliateId: affiliateId_1
                }];
            case 14:
                error_3 = _d.sent();
                console.error("Failed to process conversion transaction for order ".concat(orderId, ". Error:"), error_3);
                return [2 /*return*/, {
                        success: false,
                        error: "Transaction failed: ".concat(error_3 instanceof Error ? error_3.message : 'Unknown error')
                    }];
            case 15:
                console.log("Commission amount is 0 for order ".concat(orderId, ", skipping affiliate processing"));
                return [2 /*return*/, { success: true, message: "Order ".concat(orderId, " processed, but no commission (amount: ").concat(commissionAmount_1, ")") }];
            case 16:
                console.log("No affiliate code found for order ".concat(orderId));
                return [2 /*return*/, { success: true, message: "Order ".concat(orderId, " processed (no affiliate)") }];
            case 17: return [3 /*break*/, 19];
            case 18:
                error_4 = _d.sent();
                console.error("Error processing order completion for ".concat(orderId, ":"), error_4);
                return [2 /*return*/, {
                        success: false,
                        error: "Processing failed: ".concat(error_4 instanceof Error ? error_4.message : 'Unknown error')
                    }];
            case 19: return [2 /*return*/];
        }
    });
}); });
/**
 * [V2] Manual function to update order status and test triggers
 */
exports.manualStatusUpdate = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ordersSnapshot, orderDoc, orderData, orderId, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                console.log('Manual status update test...');
                return [4 /*yield*/, database_1.db.collection('orders')
                        .where('userId', 'in', ['9AudFilG8VeYHcFnKgUtQkByAmn1', 'hC7lYEBKFBcg8y36s0wzJ0onSqt1', 'hCu3TDpe5XZ0adTp5eGLpGxDvL13'])
                        .limit(1).get()];
            case 1:
                ordersSnapshot = _a.sent();
                if (ordersSnapshot.empty) {
                    res.status(404).json({
                        success: false,
                        error: 'No orders found'
                    });
                    return [2 /*return*/];
                }
                orderDoc = ordersSnapshot.docs[0];
                orderData = orderDoc.data();
                orderId = orderDoc.id;
                console.log("Updating order ".concat(orderData.orderNumber, " from ").concat(orderData.status, " to \"delivered\""));
                // Update the order status - this should trigger sendOrderStatusUpdateEmail
                return [4 /*yield*/, database_1.db.collection('orders').doc(orderId).update({
                        status: 'delivered',
                        updatedAt: firestore_1.FieldValue.serverTimestamp(),
                        trackingNumber: 'TEST-MANUAL-123',
                        carrier: 'PostNord'
                    })];
            case 2:
                // Update the order status - this should trigger sendOrderStatusUpdateEmail
                _a.sent();
                console.log('Order status updated successfully - Firebase Function should trigger');
                res.status(200).json({
                    success: true,
                    message: 'Order status updated - check logs for Firebase Function trigger',
                    orderId: orderId,
                    orderNumber: orderData.orderNumber,
                    oldStatus: orderData.status,
                    newStatus: 'delivered'
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error('Error in manual status update:', error_5);
                res.status(500).json({
                    success: false,
                    error: error_5 instanceof Error ? error_5.message : 'Unknown error'
                });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * [V2] Manual order status update test function
 */
exports.testOrderUpdate = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ordersSnapshot, orderDoc, orderData, userSnapshot, userData, EmailOrchestrator, orchestrator, emailError_2, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                console.log('Testing order status update email...');
                return [4 /*yield*/, database_1.db.collection('orders')
                        .where('userId', 'in', ['9AudFilG8VeYHcFnKgUtQkByAmn1', 'hC7lYEBKFBcg8y36s0wzJ0onSqt1', 'hCu3TDpe5XZ0adTp5eGLpGxDvL13'])
                        .limit(1).get()];
            case 1:
                ordersSnapshot = _a.sent();
                if (ordersSnapshot.empty) {
                    res.status(404).json({
                        success: false,
                        error: 'No orders found in database'
                    });
                    return [2 /*return*/];
                }
                orderDoc = ordersSnapshot.docs[0];
                orderData = orderDoc.data();
                console.log("Found order: ".concat(orderData.orderNumber, " with status: ").concat(orderData.status));
                // Get user data
                if (!orderData.userId) {
                    res.status(400).json({
                        success: false,
                        error: 'Order has no associated user'
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, database_1.db.collection('users').doc(orderData.userId).get()];
            case 2:
                userSnapshot = _a.sent();
                if (!userSnapshot.exists) {
                    res.status(404).json({
                        success: false,
                        error: "User ".concat(orderData.userId, " not found")
                    });
                    return [2 /*return*/];
                }
                userData = userSnapshot.data();
                console.log("Found user: ".concat(userData.email));
                _a.label = 3;
            case 3:
                _a.trys.push([3, 5, , 6]);
                EmailOrchestrator = require('../email-orchestrator/core/EmailOrchestrator').EmailOrchestrator;
                orchestrator = new EmailOrchestrator();
                return [4 /*yield*/, orchestrator.sendEmail({
                        emailType: 'ORDER_STATUS_UPDATE',
                        userData: userData,
                        orderId: orderDoc.id,
                        language: userData.preferredLang || 'sv-SE',
                        orderData: orderData,
                        additionalData: {
                            newStatus: 'shipped',
                            previousStatus: orderData.status,
                            trackingNumber: 'TEST-123456789SE',
                            estimatedDelivery: '2025-01-25',
                            notes: 'Test order status update email',
                            userType: 'B2B'
                        }
                    })];
            case 4:
                _a.sent();
                console.log("\u2705 Orchestrator Order status test email sent to ".concat(userData.email));
                return [3 /*break*/, 6];
            case 5:
                emailError_2 = _a.sent();
                console.error("\u274C Orchestrator Order status test email failed:", emailError_2);
                // Fallback: just log the test
                console.log("TEST: Would send order status update to ".concat(userData.email, " for order ").concat(orderData.orderNumber));
                return [3 /*break*/, 6];
            case 6:
                console.log('Order status update emails sent successfully');
                res.status(200).json({
                    success: true,
                    message: 'Order status update emails sent successfully',
                    order: orderData.orderNumber,
                    customer: userData.email,
                    status: 'shipped (test)'
                });
                return [3 /*break*/, 8];
            case 7:
                error_6 = _a.sent();
                console.error('Error testing order status update:', error_6);
                res.status(500).json({
                    success: false,
                    error: error_6 instanceof Error ? error_6.message : 'Unknown error'
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
