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
// V3 Email System - imports handled dynamically in functions
const database_1 = require("../config/database");
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
// Campaign matching function (simplified for Firebase Functions)
function checkCampaignMatch(orderData, campaign, affiliateId, affiliateCode) {
    // Campaign must be active and within date range
    if (campaign.status !== 'active')
        return false;
    const now = new Date();
    const startDate = campaign.startDate?.toDate ? campaign.startDate.toDate() : new Date(campaign.startDate);
    const endDate = campaign.endDate?.toDate ? campaign.endDate.toDate() : new Date(campaign.endDate);
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
        const orderProductIds = orderData.items?.map((item) => item.id) || [];
        const hasMatchingProduct = campaign.productIds.some((productId) => orderProductIds.includes(productId));
        if (!hasMatchingProduct)
            return false;
    }
    // Check campaign code requirement (optional)
    if (campaign.code) {
        const orderAffiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
        if (orderAffiliateCode !== affiliateCode)
            return false;
    }
    return true;
}
// Universal Campaign Revenue Tracking for Special Edition Products
async function processUniversalCampaignRevenue(orderData, db) {
    try {
        // Check if this order contains special edition products
        const specialEditionItems = orderData.items?.filter((item) => item.group === 'B8Shield-special-edition') || [];
        if (specialEditionItems.length === 0) {
            console.log('📊 No special edition products found in order');
            return;
        }
        console.log(`📊 Found ${specialEditionItems.length} special edition products`);
        // Get active revenue share campaigns
        const campaignsRef = db.collection('campaigns');
        const campaignsQuery = campaignsRef.where('status', '==', 'active').where('isRevenueShare', '==', true);
        const campaignsSnap = await campaignsQuery.get();
        if (campaignsSnap.empty) {
            console.log('📊 No active revenue share campaigns found');
            return;
        }
        // Process each special edition item for each applicable campaign
        for (const item of specialEditionItems) {
            const itemRevenue = calculateItemRevenue(item, orderData);
            console.log(`📊 Processing item: ${item.name} (Revenue: ${itemRevenue.campaignEligibleRevenue} SEK)`);
            campaignsSnap.docs.forEach(async (campaignDoc) => {
                const campaign = campaignDoc.data();
                const campaignId = campaignDoc.id;
                // Check if campaign applies to this product
                if (shouldCampaignTrackProduct(campaign, item)) {
                    const campaignShare = itemRevenue.campaignEligibleRevenue * (campaign.revenueShareRate || 50) / 100;
                    console.log(`📊 ${campaign.name?.['sv-SE']} gets ${campaignShare} SEK from ${item.name}`);
                    // Update campaign statistics
                    await campaignDoc.ref.update({
                        totalConversions: firestore_1.FieldValue.increment(1),
                        totalRevenue: firestore_1.FieldValue.increment(itemRevenue.campaignEligibleRevenue),
                        totalCampaignShare: firestore_1.FieldValue.increment(campaignShare)
                    });
                    // Create detailed tracking record
                    await db.collection('campaignRevenueTracking').add({
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
                    });
                }
            });
        }
        console.log('📊 Universal campaign revenue tracking completed');
    }
    catch (error) {
        console.error('📊 Error in universal campaign revenue tracking:', error);
        // Don't throw - this shouldn't break order processing
    }
}
// Calculate revenue breakdown for a single item
function calculateItemRevenue(item, orderData, vatRate = 0.25) {
    const itemTotal = (item.price || 0) * (item.quantity || 1);
    const itemDiscountRate = orderData.discountPercentage ? (orderData.discountPercentage / 100) : 0;
    // Step 1: Apply customer discount
    const customerDiscount = itemTotal * itemDiscountRate;
    const afterDiscount = itemTotal - customerDiscount;
    // Step 2: Remove VAT
    const vatAmount = afterDiscount * vatRate / (1 + vatRate);
    const afterVAT = afterDiscount - vatAmount;
    // Step 3: Calculate affiliate commission (if any)
    let affiliateCommission = 0;
    if (orderData.affiliateCode) {
        // Assume 20% commission rate (could be made dynamic)
        affiliateCommission = afterVAT * 0.20;
    }
    // Step 4: Campaign eligible revenue (after all deductions)
    const campaignEligibleRevenue = afterVAT - affiliateCommission;
    return {
        itemTotal,
        customerDiscount,
        afterDiscount,
        vatAmount,
        afterVAT,
        affiliateCommission,
        campaignEligibleRevenue
    };
}
// Check if campaign should track this product
function shouldCampaignTrackProduct(campaign, item) {
    // For KAJJAN and EMMA campaigns, track their respective special edition products
    const campaignName = campaign.name?.['sv-SE'] || '';
    const itemName = item.name || '';
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
function calculateComplexCommission(orderData, affiliate, campaign, vatRate = 0.25) {
    const originalTotal = orderData.total || orderData.subtotal || 0;
    const shipping = orderData.shipping || 0;
    // Step 1: Calculate base product value (after customer discount, excluding shipping)
    const productValueWithVAT = Math.max(0, originalTotal - shipping);
    const productValueExcludingVAT = productValueWithVAT / (1 + vatRate);
    // Step 2: Calculate affiliate commission (from discounted price, excluding VAT)
    const affiliateRate = (affiliate.commissionRate || 20) / 100;
    const affiliateCommission = Math.round((productValueExcludingVAT * affiliateRate) * 100) / 100;
    // Step 3: Calculate remaining amount after affiliate commission
    const remainingAfterAffiliate = productValueExcludingVAT - affiliateCommission;
    // Step 4: Calculate campaign revenue share (if applicable)
    let campaignShare = 0;
    let companyShare = remainingAfterAffiliate;
    if (campaign.isRevenueShare && remainingAfterAffiliate > 0) {
        const shareRate = (campaign.revenueShareRate || 50) / 100;
        campaignShare = Math.round((remainingAfterAffiliate * shareRate) * 100) / 100;
        companyShare = remainingAfterAffiliate - campaignShare;
    }
    return {
        affiliateCommission,
        campaignShare,
        companyShare,
        productValueExcludingVAT,
        remainingAfterAffiliate
    };
}
// Update the local calculateCommission function to fix double deduction bug
function calculateCommission(orderData, affiliate, vatRate = 0.25, campaignRate) {
    const orderTotal = orderData.total || orderData.subtotal || 0;
    const shipping = orderData.shipping || 0;
    const discountAmount = orderData.discountAmount || 0; // For reporting only
    // Use campaign rate if provided, otherwise use affiliate's default rate
    const rate = (campaignRate || affiliate.commissionRate || 15) / 100;
    // Step 1: Deduct shipping from order total (shipping is separate service)
    // Note: orderTotal already has affiliate discount applied
    const productValueWithVAT = Math.max(0, orderTotal - shipping);
    // Step 2: Extract VAT from the remaining product value
    // Swedish VAT system: VAT-exclusive = VAT-inclusive / 1.25
    const productValueExcludingVAT = productValueWithVAT / (1 + vatRate);
    const vatAmount = productValueWithVAT - productValueExcludingVAT;
    // Step 3: Apply commission rate to the final net product value
    const commission = Math.round((productValueExcludingVAT * rate) * 100) / 100;
    return {
        commission,
        deductions: {
            shipping,
            vat: vatAmount,
            // Note: discount is already applied in orderTotal, not deducted here
            discountAmount: discountAmount // For reporting/transparency only
        },
        netBase: productValueExcludingVAT,
        calculationSteps: {
            orderTotal,
            afterShipping: productValueWithVAT,
            productValueExcludingVAT,
            vatAmount,
            rate,
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
        const localDb = database_1.db; // Use the correct named database
        // Initialize commission amount (will be calculated if there's an affiliate)
        let commissionAmount = 0;
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
        // DEBUG: Log the actual order data structure to see what items look like
        console.log('🔍 Order Processing - Full order data:', JSON.stringify(orderData, null, 2));
        const orderItems = orderData.items;
        console.log('🔍 Order Processing - Order items:', JSON.stringify(orderItems, null, 2));
        if (orderItems && orderItems.length > 0) {
            console.log('🔍 Order Processing - First item details:');
            console.log('🔍 Order Processing - item.color:', orderItems[0].color);
            console.log('🔍 Order Processing - item.size:', orderItems[0].size);
            console.log('🔍 Order Processing - item.name:', orderItems[0].name);
        }
        // Handle different affiliate data structures (Stripe vs Mock payments)
        const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
        const discountCode = orderData.discountCode || orderData.affiliate?.code;
        const affiliateClickId = orderData.affiliateClickId || orderData.affiliate?.clickId;
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
        // --- Send B2C Order Confirmation Emails ---
        console.log(`Sending B2C order confirmation emails for order ${orderId}`);
        try {
            const customerEmail = orderData.customerInfo?.email;
            // customerLang removed - V3 functions handle language detection automatically
            if (customerEmail) {
                // Send customer confirmation email using orchestrator system
                console.log(`Sending customer confirmation email to ${customerEmail} using orchestrator system`);
                try {
                    // Call orchestrator customer email function
                    const { EmailOrchestrator } = require('../email-orchestrator/core/EmailOrchestrator');
                    const orchestrator = new EmailOrchestrator();
                    await orchestrator.sendEmail({
                        emailType: 'ORDER_CONFIRMATION',
                        customerInfo: orderData.customerInfo,
                        orderId: orderId,
                        source: 'b2c',
                        language: orderData.customerInfo?.preferredLang || 'sv-SE',
                        orderData: orderData
                    });
                    console.log(`✅ Orchestrator Customer confirmation email sent to ${customerEmail}`);
                }
                catch (customerEmailError) {
                    console.error(`❌ Orchestrator Customer email failed for ${customerEmail}:`, customerEmailError);
                }
                try {
                    // Send admin notification email using orchestrator system
                    console.log('Sending admin notification email using orchestrator system');
                    const { EmailOrchestrator } = require('../email-orchestrator/core/EmailOrchestrator');
                    const orchestrator = new EmailOrchestrator();
                    await orchestrator.sendEmail({
                        emailType: 'ORDER_NOTIFICATION_ADMIN',
                        customerInfo: orderData.customerInfo,
                        orderId: orderId,
                        source: 'b2c',
                        language: 'sv-SE',
                        orderData: orderData,
                        adminEmail: true
                    });
                    console.log(`✅ Orchestrator Admin notification email sent for order ${orderData.orderNumber}`);
                }
                catch (adminEmailError) {
                    console.error(`❌ Orchestrator Admin email failed for order ${orderId}:`, adminEmailError);
                }
            }
            else {
                console.warn(`No customer email found for order ${orderId}, skipping customer confirmation`);
            }
        }
        catch (emailError) {
            console.error(`Error sending B2C order emails for order ${orderId}:`, emailError);
            // Don't fail the whole process if emails fail - log error and continue
        }
        // --- Universal Campaign Revenue Tracking (ALWAYS runs) ---
        // Track revenue for special campaigns regardless of affiliate attribution
        console.log('🎯 Processing universal campaign revenue tracking...');
        await processUniversalCampaignRevenue(orderData, localDb);
        let commissionProcessed = false;
        if (!affiliateCode) {
            console.log('No affiliate code found for order, skipping commission.');
            commissionProcessed = false;
        }
        else {
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
            // Check for active campaigns that might affect this order
            console.log('Checking for active campaigns...');
            const campaignsRef = localDb.collection('campaigns');
            const activeCampaignsQuery = campaignsRef.where('status', '==', 'active');
            const activeCampaignsSnap = await activeCampaignsQuery.get();
            let matchingCampaign = null;
            let campaignShare = 0;
            if (!activeCampaignsSnap.empty) {
                // Import campaign utilities (we'll need to make this available in functions)
                for (const campaignDoc of activeCampaignsSnap.docs) {
                    const campaign = campaignDoc.data();
                    // Check if this campaign matches the order
                    const isMatch = checkCampaignMatch(orderData, campaign, affiliateDoc.id, affiliateCode);
                    if (isMatch) {
                        matchingCampaign = { id: campaignDoc.id, ...campaign };
                        console.log(`Found matching campaign: ${campaign.name?.['sv-SE'] || 'Unknown Campaign'}`);
                        break;
                    }
                }
            }
            // Calculate commission (standard or campaign-enhanced)
            let commissionBreakdown;
            if (matchingCampaign && matchingCampaign.isRevenueShare) {
                // Use complex commission calculation for revenue share campaigns
                commissionBreakdown = calculateComplexCommission(orderData, affiliate, matchingCampaign);
                commissionAmount = commissionBreakdown.affiliateCommission;
                campaignShare = commissionBreakdown.campaignShare;
                console.log(`Complex commission calculation for campaign "${matchingCampaign.name?.['sv-SE']}":
          - Affiliate (${affiliateCode}): ${commissionAmount} SEK
          - Campaign share: ${campaignShare} SEK
          - Company share: ${commissionBreakdown.companyShare} SEK`);
            }
            else {
                // Standard commission calculation
                const result = calculateCommission(orderData, affiliate);
                commissionAmount = result.commission;
                console.log(`Standard commission calculation for order ${orderId}: ${orderData.total} * ${affiliate.commissionRate}% = ${commissionAmount}`);
            }
            // Update affiliate stats
            console.log(`Updating affiliate stats for ${affiliateDoc.id}`);
            await affiliateDoc.ref.update({
                'stats.conversions': firestore_1.FieldValue.increment(1),
                'stats.totalEarnings': firestore_1.FieldValue.increment(commissionAmount),
                'stats.balance': firestore_1.FieldValue.increment(commissionAmount)
            });
            // Update the order with commission information (CRITICAL FIX)
            console.log(`Updating order ${orderId} with commission ${commissionAmount}`);
            const orderUpdateData = {
                affiliateCommission: commissionAmount,
                affiliateId: affiliateDoc.id,
                conversionProcessed: true,
                conversionProcessedAt: firestore_1.FieldValue.serverTimestamp()
            };
            // Add campaign information if applicable
            if (matchingCampaign) {
                orderUpdateData.campaignId = matchingCampaign.id;
                orderUpdateData.campaignName = matchingCampaign.name?.['sv-SE'] || 'Unknown Campaign';
                if (campaignShare > 0) {
                    orderUpdateData.campaignShare = campaignShare;
                    orderUpdateData.campaignCommissionBreakdown = commissionBreakdown;
                }
            }
            await orderRef.update(orderUpdateData);
            console.log(`Successfully updated order ${orderId} with commission data`);
            // Update campaign statistics if applicable
            if (matchingCampaign && campaignShare > 0) {
                console.log(`Updating campaign stats for ${matchingCampaign.id}`);
                const campaignRef = localDb.collection('campaigns').doc(matchingCampaign.id);
                await campaignRef.update({
                    totalConversions: firestore_1.FieldValue.increment(1),
                    totalRevenue: firestore_1.FieldValue.increment(orderData.total || 0)
                });
                // Create campaign participation record for tracking
                await localDb.collection('campaignParticipants').add({
                    campaignId: matchingCampaign.id,
                    orderId: orderId,
                    affiliateId: affiliateDoc.id,
                    affiliateCode: affiliateCode,
                    campaignShare: campaignShare,
                    orderTotal: orderData.total || 0,
                    participatedAt: firestore_1.FieldValue.serverTimestamp()
                });
            }
            // Update the click to mark conversion
            if (affiliateClickId) {
                console.log(`Updating affiliate click ${affiliateClickId}`);
                await localDb
                    .collection('affiliateClicks')
                    .doc(affiliateClickId)
                    .update({
                    converted: true,
                    orderId: orderId,
                    commissionAmount: commissionAmount
                });
            }
            // Determine attribution method for analytics
            let attributionMethod = null;
            if (affiliateClickId) {
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
            commissionProcessed = true;
        }
        // Send final response
        res.json({
            success: true,
            message: commissionProcessed ? 'Order processed with affiliate commission' : 'Order processed (no affiliate)',
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
    const localDb = database_1.db; // Use the correct named database
    try {
        // --- Start of Affiliate Conversion Logic ---
        const orderRef = localDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            console.error(`Order ${orderId} not found in b8s-reseller-db.`);
            return { success: false, error: `Order ${orderId} not found in database` };
        }
        const orderData = orderSnap.data();
        // Handle different affiliate data structures (Stripe vs Mock payments)
        const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
        console.log(`Processing order ${orderId}. Affiliate code: ${affiliateCode || 'none'}`);
        if (affiliateCode) {
            console.log(`Processing conversion for order ${orderId} with affiliate code: ${affiliateCode}`);
            // Find the affiliate by code
            const affiliatesRef = localDb.collection('affiliates');
            const q = affiliatesRef.where('affiliateCode', '==', affiliateCode).where('status', '==', 'active');
            const affiliateSnapshot = await q.get();
            if (affiliateSnapshot.empty) {
                console.error(`No active affiliate found for code: ${affiliateCode}`);
                return { success: false, error: `No active affiliate found for code: ${affiliateCode}` };
            }
            const affiliateDoc = affiliateSnapshot.docs[0];
            const affiliate = affiliateDoc.data();
            const affiliateId = affiliateDoc.id;
            console.log(`Found affiliate: ${affiliate.name} (ID: ${affiliateId})`);
            // Calculate commission using unified function
            const { commission: commissionAmount } = calculateCommission(orderData, affiliate);
            console.log(`Commission calculation: ${orderData.subtotal} * ${affiliate.commissionRate}% = ${commissionAmount}`);
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
                            .where('affiliateCode', '==', affiliateCode)
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
                            console.log(`No unconverted clicks found for affiliate code ${affiliateCode}`);
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
            return { success: true, message: `Order ${orderId} processed, but no commission (amount: ${commissionAmount})` };
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
        const ordersSnapshot = await database_1.db.collection('orders')
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
        await database_1.db.collection('orders').doc(orderId).update({
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
        const ordersSnapshot = await database_1.db.collection('orders')
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
        const userSnapshot = await database_1.db.collection('users').doc(orderData.userId).get();
        if (!userSnapshot.exists) {
            res.status(404).json({
                success: false,
                error: `User ${orderData.userId} not found`
            });
            return;
        }
        const userData = userSnapshot.data();
        console.log(`Found user: ${userData.email}`);
        // Use orchestrator email system for order status updates
        try {
            const { EmailOrchestrator } = require('../email-orchestrator/core/EmailOrchestrator');
            const orchestrator = new EmailOrchestrator();
            await orchestrator.sendEmail({
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
            });
            console.log(`✅ Orchestrator Order status test email sent to ${userData.email}`);
        }
        catch (emailError) {
            console.error(`❌ Orchestrator Order status test email failed:`, emailError);
            // Fallback: just log the test
            console.log(`TEST: Would send order status update to ${userData.email} for order ${orderData.orderNumber}`);
        }
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