"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testOrderUpdate = exports.manualStatusUpdate = exports.processB2COrderCompletion = exports.processB2COrderCompletionHttp = void 0;
const functions = __importStar(require("firebase-functions"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_urls_1 = require("../config/app-urls");
const rate_limits_1 = require("../config/rate-limits");
const email_handler_1 = require("../email/email-handler");
const emails_1 = require("../../emails");
/**
 * Enhanced rate limiting with bulk operation detection
 */
const checkRateLimit = (clientIP) => {
    const now = Date.now();
    // Initialize tracking maps if needed
    if (!global.orderRateLimit)
        global.orderRateLimit = new Map();
    if (!global.bulkModeTracker)
        global.bulkModeTracker = new Map();
    // Get current tracking data
    const ipOrders = global.orderRateLimit.get(clientIP) || [];
    const bulkTracker = global.bulkModeTracker.get(clientIP) || {
        enabled: false,
        enabledAt: 0,
        requestTimes: []
    };
    // Clean up old requests
    const recentOrders = ipOrders.filter((time) => now - time < rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.windowMs);
    // Update request times for bulk detection
    bulkTracker.requestTimes.push(now);
    bulkTracker.requestTimes = bulkTracker.requestTimes.filter(time => now - time < rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.timeWindow);
    // Check if bulk mode should be enabled
    if (!bulkTracker.enabled &&
        bulkTracker.requestTimes.length >= rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.rapidRequests) {
        bulkTracker.enabled = true;
        bulkTracker.enabledAt = now;
        console.log(`🔄 Bulk mode enabled for IP ${clientIP} - detected ${bulkTracker.requestTimes.length} rapid requests`);
    }
    // Check if bulk mode should be disabled (timeout)
    if (bulkTracker.enabled &&
        now - bulkTracker.enabledAt > rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.maxBulkDuration) {
        bulkTracker.enabled = false;
        bulkTracker.enabledAt = 0;
        console.log(`⏰ Bulk mode disabled for IP ${clientIP} - timeout after 30 minutes`);
    }
    // Apply appropriate rate limits
    let maxRequests;
    let windowMs;
    let mode;
    if (bulkTracker.enabled) {
        // Use bulk mode limits
        maxRequests = rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.perWindow;
        windowMs = rate_limits_1.RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.windowMs;
        mode = 'bulk';
        // Filter requests based on bulk window
        const bulkRecentOrders = ipOrders.filter((time) => now - time < windowMs);
        if (bulkRecentOrders.length >= maxRequests) {
            return {
                allowed: false,
                bulkMode: true,
                message: `Bulk mode: ${maxRequests} orders per ${Math.ceil(windowMs / 60000)} minutes limit reached`
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
                message: `Normal mode: ${maxRequests} orders per ${Math.ceil(windowMs / 60000)} minutes limit reached`
            };
        }
    }
    // Update tracking
    recentOrders.push(now);
    global.orderRateLimit.set(clientIP, recentOrders);
    global.bulkModeTracker.set(clientIP, bulkTracker);
    console.log(`📦 Order processing request from IP: ${clientIP} (${recentOrders.length}/${maxRequests} in ${Math.ceil(windowMs / 60000)} min, ${mode} mode)`);
    return {
        allowed: true,
        bulkMode: bulkTracker.enabled
    };
};
/**
 * [V2] HTTP endpoint for B2C order processing with affiliate commission handling
 */
exports.processB2COrderCompletionHttp = (0, https_1.onRequest)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, async (req, res) => {
    // 🛡️ ENHANCED ORDER PROTECTION: Smart rate limiting with bulk detection
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(clientIP);
    if (!rateCheck.allowed) {
        console.warn(`🚫 Rate limit exceeded for IP: ${clientIP} - ${rateCheck.message}`);
        res.status(429).json({
            success: false,
            error: rateCheck.message || 'Rate limit exceeded',
            retryAfter: rateCheck.bulkMode ? 600 : 300,
            bulkMode: rateCheck.bulkMode
        });
        return;
    }
    if (rateCheck.bulkMode) {
        console.log(`🔄 Processing in bulk mode for IP: ${clientIP}`);
    }
    // Enable CORS with more permissive settings for testing
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Max-Age', '3600');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const { orderId } = req.body;
        if (!orderId) {
            res.status(400).json({
                success: false,
                error: 'The function must be called with an "orderId".'
            });
            return;
        }
        console.log(`Processing B2C order completion for orderId: ${orderId}`);
        const localDb = email_handler_1.db; // Use the correct named database
        // --- Start of Affiliate Conversion Logic ---
        const orderRef = localDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            console.error(`Order ${orderId} not found in b8s-reseller-db.`);
            res.status(404).json({
                success: false,
                error: `Order ${orderId} not found in database`
            });
            return;
        }
        const orderData = orderSnap.data();
        const { affiliateCode, discountCode } = orderData;
        // --- Update B2C Customer Statistics ---
        if (orderData.b2cCustomerId && orderData.total) {
            console.log(`Updating B2C customer stats for customer: ${orderData.b2cCustomerId}`);
            try {
                const customerRef = localDb.collection('b2cCustomers').doc(orderData.b2cCustomerId);
                await customerRef.update({
                    'stats.totalOrders': firestore_1.FieldValue.increment(1),
                    'stats.totalSpent': firestore_1.FieldValue.increment(orderData.total),
                    'stats.lastOrderDate': firestore_1.FieldValue.serverTimestamp(),
                    'updatedAt': firestore_1.FieldValue.serverTimestamp()
                });
                console.log(`Successfully updated customer stats for ${orderData.b2cCustomerId}`);
            }
            catch (customerError) {
                console.error(`Error updating customer stats:`, customerError);
                // Don't fail the whole process if customer stats update fails
            }
        }
        if (!affiliateCode) {
            console.log('No affiliate code found for order, skipping commission.');
            res.json({ success: true, message: 'Order processed (no affiliate)' });
            return;
        }
        // Get affiliate details
        const affiliateSnap = await localDb
            .collection('affiliates')
            .where('affiliateCode', '==', affiliateCode)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (affiliateSnap.empty) {
            console.error(`No active affiliate found for code: ${affiliateCode}`);
            res.json({ success: true, message: 'Order processed (invalid affiliate)' });
            return;
        }
        const affiliateDoc = affiliateSnap.docs[0];
        const affiliate = affiliateDoc.data();
        // Calculate commission
        const orderTotal = orderData.total || 0;
        const commissionRate = affiliate.commissionRate || 15; // Default 15%
        const commissionAmount = (orderTotal * (commissionRate / 100));
        console.log(`Commission calculation for order ${orderId}: ${orderTotal} * ${commissionRate}% = ${commissionAmount}`);
        // Update affiliate stats
        console.log(`Updating affiliate stats for ${affiliateDoc.id}`);
        await affiliateDoc.ref.update({
            'stats.conversions': firestore_1.FieldValue.increment(1),
            'stats.totalEarnings': firestore_1.FieldValue.increment(commissionAmount),
            'stats.balance': firestore_1.FieldValue.increment(commissionAmount)
        });
        // Update the order with commission information (CRITICAL FIX)
        console.log(`Updating order ${orderId} with commission ${commissionAmount}`);
        await orderRef.update({
            affiliateCommission: commissionAmount,
            affiliateId: affiliateDoc.id,
            conversionProcessed: true,
            conversionProcessedAt: firestore_1.FieldValue.serverTimestamp()
        });
        console.log(`Successfully updated order ${orderId} with commission data`);
        // Update the click to mark conversion
        if (orderData.affiliateClickId) {
            console.log(`Updating affiliate click ${orderData.affiliateClickId}`);
            await localDb
                .collection('affiliateClicks')
                .doc(orderData.affiliateClickId)
                .update({
                converted: true,
                orderId: orderId,
                commissionAmount: commissionAmount
            });
        }
        // Determine attribution method for analytics
        let attributionMethod = null;
        if (orderData.affiliateClickId) {
            attributionMethod = 'server';
        }
        else if (affiliateCode) {
            attributionMethod = 'cookie';
        }
        else if (discountCode) {
            attributionMethod = 'discount';
        }
        if (attributionMethod) {
            await orderRef.update({ attributionMethod });
        }
        console.log(`Successfully processed affiliate commission for order ${orderId}`);
        res.json({
            success: true,
            message: 'Order processed with affiliate commission',
            commission: commissionAmount
        });
    }
    catch (error) {
        console.error('Error processing B2C order completion:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error processing order'
        });
    }
});
/**
 * [V2] Callable function for B2C order completion with affiliate processing
 */
exports.processB2COrderCompletion = (0, https_1.onCall)({
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
}, async (request) => {
    // Validate request origin
    const allowedOrigins = [
        'https://shop.b8shield.com',
        app_urls_1.appUrls.B2B_PORTAL,
        'http://localhost:5173' // For local development
    ];
    const origin = request.data.origin || request.rawRequest?.headers?.origin || '';
    if (!allowedOrigins.includes(origin)) {
        throw new functions.https.HttpsError('permission-denied', 'Origin not allowed');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "orderId".');
    }
    console.log(`Processing B2C order completion for orderId: ${orderId}`);
    const localDb = email_handler_1.db; // Use the correct named database
    try {
        // --- Start of Affiliate Conversion Logic ---
        const orderRef = localDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            console.error(`Order ${orderId} not found in b8s-reseller-db.`);
            return { success: false, error: `Order ${orderId} not found in database` };
        }
        const orderData = orderSnap.data();
        console.log(`Processing order ${orderId}. Affiliate code: ${orderData.affiliateCode || 'none'}`);
        if (orderData.affiliateCode) {
            console.log(`Processing conversion for order ${orderId} with affiliate code: ${orderData.affiliateCode}`);
            // Find the affiliate by code
            const affiliatesRef = localDb.collection('affiliates');
            const q = affiliatesRef.where('affiliateCode', '==', orderData.affiliateCode).where('status', '==', 'active');
            const affiliateSnapshot = await q.get();
            if (affiliateSnapshot.empty) {
                console.error(`No active affiliate found for code: ${orderData.affiliateCode}`);
                return { success: false, error: `No active affiliate found for code: ${orderData.affiliateCode}` };
            }
            const affiliateDoc = affiliateSnapshot.docs[0];
            const affiliate = affiliateDoc.data();
            const affiliateId = affiliateDoc.id;
            console.log(`Found affiliate: ${affiliate.name} (ID: ${affiliateId})`);
            // Calculate commission - try multiple fields for compatibility
            const commissionRate = affiliate.commissionRate / 100;
            const orderAmount = orderData.subtotal || orderData.total || orderData.totalAmount || 0;
            const commissionAmount = orderAmount * commissionRate;
            console.log(`Commission calculation: ${orderAmount} * ${commissionRate} = ${commissionAmount}`);
            if (commissionAmount > 0) {
                try {
                    // Update affiliate stats in a transaction
                    await localDb.runTransaction(async (transaction) => {
                        const affiliateRef = localDb.collection('affiliates').doc(affiliateId);
                        const currentAffiliateDoc = await transaction.get(affiliateRef);
                        if (!currentAffiliateDoc.exists) {
                            throw new Error("Affiliate not found during transaction.");
                        }
                        const currentStats = currentAffiliateDoc.data().stats || {};
                        const newStats = {
                            conversions: (currentStats.conversions || 0) + 1,
                            totalEarnings: (currentStats.totalEarnings || 0) + commissionAmount,
                            balance: (currentStats.balance || 0) + commissionAmount,
                            clicks: currentStats.clicks || 0,
                        };
                        console.log(`Updating affiliate stats:`, newStats);
                        transaction.update(affiliateRef, { stats: newStats });
                    });
                    // Update the order with commission information
                    await orderRef.update({
                        affiliateCommission: commissionAmount,
                        affiliateId: affiliateId,
                        conversionProcessed: true,
                        conversionProcessedAt: firestore_1.FieldValue.serverTimestamp()
                    });
                    console.log(`Successfully updated stats and order for affiliate ${affiliateId}.`);
                    // Try to mark corresponding click as converted
                    // Since we don't have clickId in order, find the most recent click by this affiliate
                    try {
                        const clicksRef = localDb.collection('affiliateClicks');
                        const recentClicksQuery = clicksRef
                            .where('affiliateCode', '==', orderData.affiliateCode)
                            .where('converted', '==', false)
                            .orderBy('timestamp', 'desc')
                            .limit(1);
                        const recentClicksSnapshot = await recentClicksQuery.get();
                        if (!recentClicksSnapshot.empty) {
                            const clickDoc = recentClicksSnapshot.docs[0];
                            await clickDoc.ref.update({
                                converted: true,
                                orderId: orderId,
                                commissionAmount: commissionAmount,
                                convertedAt: firestore_1.FieldValue.serverTimestamp()
                            });
                            console.log(`Click document ${clickDoc.id} marked as converted.`);
                        }
                        else {
                            console.log(`No unconverted clicks found for affiliate code ${orderData.affiliateCode}`);
                        }
                    }
                    catch (clickError) {
                        console.error(`Error updating click record:`, clickError);
                        // Don't fail the whole process if click update fails
                    }
                    return {
                        success: true,
                        message: `Processed order ${orderId}`,
                        affiliateCommission: commissionAmount,
                        affiliateId: affiliateId
                    };
                }
                catch (error) {
                    console.error(`Failed to process conversion transaction for order ${orderId}. Error:`, error);
                    return {
                        success: false,
                        error: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    };
                }
            }
            console.log(`Commission amount is 0 for order ${orderId}, skipping affiliate processing`);
            return { success: true, message: `Order ${orderId} processed, but no commission (amount: ${orderAmount})` };
        }
        else {
            console.log(`No affiliate code found for order ${orderId}`);
            return { success: true, message: `Order ${orderId} processed (no affiliate)` };
        }
        // --- End of Affiliate Conversion Logic ---
    }
    catch (error) {
        console.error(`Error processing order completion for ${orderId}:`, error);
        return {
            success: false,
            error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
});
/**
 * [V2] Manual function to update order status and test triggers
 */
exports.manualStatusUpdate = (0, https_1.onRequest)(async (req, res) => {
    try {
        console.log('Manual status update test...');
        // Get an order with a known valid userId (for testing email functionality)
        const ordersSnapshot = await email_handler_1.db.collection('orders')
            .where('userId', 'in', ['9AudFilG8VeYHcFnKgUtQkByAmn1', 'hC7lYEBKFBcg8y36s0wzJ0onSqt1', 'hCu3TDpe5XZ0adTp5eGLpGxDvL13'])
            .limit(1).get();
        if (ordersSnapshot.empty) {
            res.status(404).json({
                success: false,
                error: 'No orders found'
            });
            return;
        }
        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data();
        const orderId = orderDoc.id;
        console.log(`Updating order ${orderData.orderNumber} from ${orderData.status} to "delivered"`);
        // Update the order status - this should trigger sendOrderStatusUpdateEmail
        await email_handler_1.db.collection('orders').doc(orderId).update({
            status: 'delivered',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            trackingNumber: 'TEST-MANUAL-123',
            carrier: 'PostNord'
        });
        console.log('Order status updated successfully - Firebase Function should trigger');
        res.status(200).json({
            success: true,
            message: 'Order status updated - check logs for Firebase Function trigger',
            orderId: orderId,
            orderNumber: orderData.orderNumber,
            oldStatus: orderData.status,
            newStatus: 'delivered'
        });
    }
    catch (error) {
        console.error('Error in manual status update:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * [V2] Manual order status update test function
 */
exports.testOrderUpdate = (0, https_1.onRequest)(async (req, res) => {
    try {
        console.log('Testing order status update email...');
        // Get an order with a known valid userId (for testing email functionality)
        const ordersSnapshot = await email_handler_1.db.collection('orders')
            .where('userId', 'in', ['9AudFilG8VeYHcFnKgUtQkByAmn1', 'hC7lYEBKFBcg8y36s0wzJ0onSqt1', 'hCu3TDpe5XZ0adTp5eGLpGxDvL13'])
            .limit(1).get();
        if (ordersSnapshot.empty) {
            res.status(404).json({
                success: false,
                error: 'No orders found in database'
            });
            return;
        }
        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data();
        console.log(`Found order: ${orderData.orderNumber} with status: ${orderData.status}`);
        // Get user data
        if (!orderData.userId) {
            res.status(400).json({
                success: false,
                error: 'Order has no associated user'
            });
            return;
        }
        const userSnapshot = await email_handler_1.db.collection('users').doc(orderData.userId).get();
        if (!userSnapshot.exists) {
            res.status(404).json({
                success: false,
                error: `User ${orderData.userId} not found`
            });
            return;
        }
        const userData = userSnapshot.data();
        console.log(`Found user: ${userData.email}`);
        // Create a test status update email
        const template = (0, emails_1.getEmail)('orderShipped', userData.preferredLang || 'sv-SE', { orderData, userData });
        const testEmail = {
            to: userData.email,
            from: `"B8Shield" <info@jphinnovation.se>`,
            subject: template.subject,
            text: template.text,
            html: template.html,
        };
        // Also send to admin
        const adminEmail = {
            to: "micke.ohlen@gmail.com",
            from: `"B8Shield System" <info@jphinnovation.se>`,
            subject: `Manual Test: Order Status Update - ${orderData.orderNumber}`,
            text: `This is a manual test of the order status update email system.\n\nOrder: ${orderData.orderNumber}\nCustomer: ${userData.email}\nTest Status: shipped`,
            html: `<h2>Manual Test: Order Status Update</h2><p>This is a manual test of the order status update email system.</p><p><strong>Order:</strong> ${orderData.orderNumber}</p><p><strong>Customer:</strong> ${userData.email}</p><p><strong>Test Status:</strong> shipped</p>`
        };
        // Send both emails
        await (0, email_handler_1.sendEmail)(testEmail);
        await (0, email_handler_1.sendEmail)(adminEmail);
        console.log('Order status update emails sent successfully');
        res.status(200).json({
            success: true,
            message: 'Order status update emails sent successfully',
            order: orderData.orderNumber,
            customer: userData.email,
            status: 'shipped (test)'
        });
    }
    catch (error) {
        console.error('Error testing order status update:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=functions.js.map