import * as functions from 'firebase-functions';
import { onRequest, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { appUrls } from '../config/app-urls';
import { RATE_LIMITS } from '../config/rate-limits';
import { sendEmail, db } from '../email/email-handler';
import { getEmail } from '../../emails';

// Global type declarations for enhanced rate limiting
declare global {
  var orderRateLimit: Map<string, number[]>;
  var bulkModeTracker: Map<string, { 
    enabled: boolean; 
    enabledAt: number; 
    requestTimes: number[]; 
  }>;
}

// Types for order processing
interface OrderProcessingData {
  orderId: string;
  origin?: string;
}

interface OrderData {
  orderNumber: string;
  userId?: string;
  status: string;
  total?: number;
  subtotal?: number;
  totalAmount?: number;
  affiliateCode?: string;
  discountCode?: string;
  affiliateClickId?: string;
  // Stripe payment structure for affiliate data
  affiliate?: {
    code?: string;
    discountPercentage?: number;
    amount?: number;
    clickId?: string;
  };
  source?: string;
  trackingNumber?: string;
  carrier?: string;
  customerInfo?: any;
  b2cCustomerId?: string;
  b2cCustomerAuthId?: string;
  discountAmount?: number;
  shipping?: number;
}

interface UserData {
  email: string;
  companyName?: string;
  contactPerson?: string;
  preferredLang?: string;
}

interface AffiliateData {
  name: string;
  affiliateCode: string;
  commissionRate: number;
  status: string;
  // Add other fields if needed, e.g., clicks, earnings, balance
}

/**
 * Enhanced rate limiting with bulk operation detection
 */
const checkRateLimit = (clientIP: string): { allowed: boolean; bulkMode: boolean; message?: string } => {
  const now = Date.now();
  
  // Initialize tracking maps if needed
  if (!global.orderRateLimit) global.orderRateLimit = new Map();
  if (!global.bulkModeTracker) global.bulkModeTracker = new Map();
  
  // Get current tracking data
  const ipOrders = global.orderRateLimit.get(clientIP) || [];
  const bulkTracker = global.bulkModeTracker.get(clientIP) || { 
    enabled: false, 
    enabledAt: 0, 
    requestTimes: [] 
  };
  
  // Clean up old requests
  const recentOrders = ipOrders.filter((time: number) => now - time < RATE_LIMITS.ORDER_PROCESSING.windowMs);
  
  // Update request times for bulk detection
  bulkTracker.requestTimes.push(now);
  bulkTracker.requestTimes = bulkTracker.requestTimes.filter(
    time => now - time < RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.timeWindow
  );
  
  // Check if bulk mode should be enabled
  if (!bulkTracker.enabled && 
      bulkTracker.requestTimes.length >= RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.rapidRequests) {
    bulkTracker.enabled = true;
    bulkTracker.enabledAt = now;
    console.log(`🔄 Bulk mode enabled for IP ${clientIP} - detected ${bulkTracker.requestTimes.length} rapid requests`);
  }
  
  // Check if bulk mode should be disabled (timeout)
  if (bulkTracker.enabled && 
      now - bulkTracker.enabledAt > RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.BULK_DETECTION.maxBulkDuration) {
    bulkTracker.enabled = false;
    bulkTracker.enabledAt = 0;
    console.log(`⏰ Bulk mode disabled for IP ${clientIP} - timeout after 30 minutes`);
  }
  
  // Apply appropriate rate limits
  let maxRequests: number;
  let windowMs: number;
  let mode: string;
  
  if (bulkTracker.enabled) {
    // Use bulk mode limits
    maxRequests = RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.perWindow;
    windowMs = RATE_LIMITS.ORDER_PROCESSING.BULK_MODE.windowMs;
    mode = 'bulk';
    
    // Filter requests based on bulk window
    const bulkRecentOrders = ipOrders.filter((time: number) => now - time < windowMs);
    
    if (bulkRecentOrders.length >= maxRequests) {
      return {
        allowed: false,
        bulkMode: true,
        message: `Bulk mode: ${maxRequests} orders per ${Math.ceil(windowMs/60000)} minutes limit reached`
      };
    }
  } else {
    // Use normal mode limits
    maxRequests = RATE_LIMITS.ORDER_PROCESSING.perWindow;
    windowMs = RATE_LIMITS.ORDER_PROCESSING.windowMs;
    mode = 'normal';
    
    if (recentOrders.length >= maxRequests) {
      return {
        allowed: false,
        bulkMode: false,
        message: `Normal mode: ${maxRequests} orders per ${Math.ceil(windowMs/60000)} minutes limit reached`
      };
    }
  }
  
  // Update tracking
  recentOrders.push(now);
  global.orderRateLimit.set(clientIP, recentOrders);
  global.bulkModeTracker.set(clientIP, bulkTracker);
  
  console.log(`📦 Order processing request from IP: ${clientIP} (${recentOrders.length}/${maxRequests} in ${Math.ceil(windowMs/60000)} min, ${mode} mode)`);
  
  return {
    allowed: true,
    bulkMode: bulkTracker.enabled
  };
};

// Update the local calculateCommission function to fix double deduction bug
function calculateCommission(orderData: OrderData, affiliate: AffiliateData, vatRate = 0.25) {
  const orderTotal = orderData.total || orderData.subtotal || 0;
  const shipping = orderData.shipping || 0;
  const discountAmount = orderData.discountAmount || 0; // For reporting only
  const rate = (affiliate.commissionRate || 15) / 100;

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
export const processB2COrderCompletionHttp = onRequest(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
  },
  async (req, res) => {
    // 🛡️ ENHANCED ORDER PROTECTION: Smart rate limiting with bulk detection
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(clientIP);
    
    if (!rateCheck.allowed) {
      console.warn(`🚫 Rate limit exceeded for IP: ${clientIP} - ${rateCheck.message}`);
      res.status(429).json({ 
        success: false,
        error: rateCheck.message || 'Rate limit exceeded',
        retryAfter: rateCheck.bulkMode ? 600 : 300, // 10 min for bulk, 5 min for normal
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
      const localDb = db; // Use the correct named database

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

      const orderData = orderSnap.data() as OrderData;
      
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
            'stats.totalOrders': FieldValue.increment(1),
            'stats.totalSpent': FieldValue.increment(orderData.total),
            'stats.lastOrderDate': FieldValue.serverTimestamp(),
            'updatedAt': FieldValue.serverTimestamp()
          });
          console.log(`Successfully updated customer stats for ${orderData.b2cCustomerId}`);
        } catch (customerError) {
          console.error(`Error updating customer stats:`, customerError);
          // Don't fail the whole process if customer stats update fails
        }
      }

      // --- Send B2C Order Confirmation Emails ---
      console.log(`Sending B2C order confirmation emails for order ${orderId}`);
      try {
        const customerEmail = orderData.customerInfo?.email;
        const customerLang = orderData.customerInfo?.preferredLang || 'sv-SE';
        
        if (customerEmail) {
          // Send customer confirmation email
          console.log(`Sending customer confirmation email to ${customerEmail}`);
          
          // Get email template
          const { getEmail } = require('../../emails');
          const customerTemplate = getEmail('b2cOrderPending', customerLang, {
            orderData,
            customerInfo: orderData.customerInfo,
            orderId
          });
          
          // Send customer email using sendEmail function
          const { sendEmail, EMAIL_FROM } = require('../email/email-handler');
          const customerEmailData = {
            to: customerEmail,
            from: EMAIL_FROM.b2c,
            subject: customerTemplate.subject,
            html: customerTemplate.html,
            text: customerTemplate.text
          };
          
          await sendEmail(customerEmailData);
          console.log(`✅ Customer confirmation email sent to ${customerEmail}`);
          
          // Send admin notification email
          console.log('Sending admin notification email');
          const adminTemplate = getEmail('adminB2COrderNotification', 'sv-SE', {
            orderData,
            customerInfo: orderData.customerInfo,
            orderId
          });
          
          const { ADMIN_EMAILS } = require('../email/email-handler');
          const adminEmailData = {
            to: ADMIN_EMAILS,
            from: EMAIL_FROM.system,
            subject: adminTemplate.subject,
            html: adminTemplate.html,
            text: adminTemplate.text
          };
          
          await sendEmail(adminEmailData);
          console.log(`✅ Admin notification email sent for order ${orderData.orderNumber}`);
          
        } else {
          console.warn(`No customer email found for order ${orderId}, skipping customer confirmation`);
        }
        
      } catch (emailError) {
        console.error(`Error sending B2C order emails for order ${orderId}:`, emailError);
        // Don't fail the whole process if emails fail - log error and continue
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
      const affiliate = affiliateDoc.data() as AffiliateData;

      // Calculate commission using unified function
      const { commission: commissionAmount } = calculateCommission(orderData, affiliate);

      console.log(`Commission calculation for order ${orderId}: ${orderData.total} * ${affiliate.commissionRate}% = ${commissionAmount}`);

      // Update affiliate stats
      console.log(`Updating affiliate stats for ${affiliateDoc.id}`);
      await affiliateDoc.ref.update({
        'stats.conversions': FieldValue.increment(1),
        'stats.totalEarnings': FieldValue.increment(commissionAmount),
        'stats.balance': FieldValue.increment(commissionAmount)
      });

      // Update the order with commission information (CRITICAL FIX)
      console.log(`Updating order ${orderId} with commission ${commissionAmount}`);
      await orderRef.update({ 
        affiliateCommission: commissionAmount, 
        affiliateId: affiliateDoc.id,
        conversionProcessed: true,
        conversionProcessedAt: FieldValue.serverTimestamp()
      });
      console.log(`Successfully updated order ${orderId} with commission data`);

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
      } else if (affiliateCode) {
        attributionMethod = 'cookie';
      } else if (discountCode) {
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

    } catch (error) {
      console.error('Error processing B2C order completion:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error processing order' 
      });
    }
  }
);

/**
 * [V2] Callable function for B2C order completion with affiliate processing
 */
export const processB2COrderCompletion = onCall<OrderProcessingData>(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1'
  },
  async (request) => {
    // Validate request origin
    const allowedOrigins = [
      'https://shop.b8shield.com',
      appUrls.B2B_PORTAL,
      'http://localhost:5173' // For local development
    ];
    
    const origin = request.data.origin || request.rawRequest?.headers?.origin || '';
    if (!allowedOrigins.includes(origin)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Origin not allowed'
      );
    }

    const { orderId } = request.data;

    if (!orderId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'The function must be called with an "orderId".'
      );
    }

    console.log(`Processing B2C order completion for orderId: ${orderId}`);
    const localDb = db; // Use the correct named database

    try {
      // --- Start of Affiliate Conversion Logic ---
      const orderRef = localDb.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        console.error(`Order ${orderId} not found in b8s-reseller-db.`);
        return { success: false, error: `Order ${orderId} not found in database` };
      }

      const orderData = orderSnap.data() as OrderData;
      
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
        const affiliate = affiliateDoc.data() as AffiliateData;
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
              
              const currentStats = currentAffiliateDoc.data()!.stats || {};
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
              conversionProcessedAt: FieldValue.serverTimestamp()
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
                  convertedAt: FieldValue.serverTimestamp()
                });
                console.log(`Click document ${clickDoc.id} marked as converted.`);
              } else {
                console.log(`No unconverted clicks found for affiliate code ${affiliateCode}`);
              }
            } catch (clickError) {
              console.error(`Error updating click record:`, clickError);
              // Don't fail the whole process if click update fails
            }

            return { 
              success: true, 
              message: `Processed order ${orderId}`,
              affiliateCommission: commissionAmount,
              affiliateId: affiliateId
            };

          } catch (error) {
            console.error(`Failed to process conversion transaction for order ${orderId}. Error:`, error);
            return { 
              success: false, 
              error: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
          }
        }
        console.log(`Commission amount is 0 for order ${orderId}, skipping affiliate processing`);
        return { success: true, message: `Order ${orderId} processed, but no commission (amount: ${commissionAmount})` };
      } else {
        console.log(`No affiliate code found for order ${orderId}`);
        return { success: true, message: `Order ${orderId} processed (no affiliate)` };
      }
      // --- End of Affiliate Conversion Logic ---

    } catch (error) {
      console.error(`Error processing order completion for ${orderId}:`, error);
      return { 
        success: false, 
        error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
);

/**
 * [V2] Manual function to update order status and test triggers
 */
export const manualStatusUpdate = onRequest(async (req, res) => {
  try {
    console.log('Manual status update test...');
    
    // Get an order with a known valid userId (for testing email functionality)
    const ordersSnapshot = await db.collection('orders')
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
    const orderData = orderDoc.data() as OrderData;
    const orderId = orderDoc.id;
    
    console.log(`Updating order ${orderData.orderNumber} from ${orderData.status} to "delivered"`);
    
    // Update the order status - this should trigger sendOrderStatusUpdateEmail
    await db.collection('orders').doc(orderId).update({
      status: 'delivered',
      updatedAt: FieldValue.serverTimestamp(),
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
    
  } catch (error) {
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
export const testOrderUpdate = onRequest(async (req, res) => {
  try {
    console.log('Testing order status update email...');
    
    // Get an order with a known valid userId (for testing email functionality)
    const ordersSnapshot = await db.collection('orders')
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
    const orderData = orderDoc.data() as OrderData;
    
    console.log(`Found order: ${orderData.orderNumber} with status: ${orderData.status}`);
    
    // Get user data
    if (!orderData.userId) {
      res.status(400).json({ 
        success: false, 
        error: 'Order has no associated user' 
      });
      return;
    }
    
    const userSnapshot = await db.collection('users').doc(orderData.userId).get();
    
    if (!userSnapshot.exists) {
      res.status(404).json({ 
        success: false, 
        error: `User ${orderData.userId} not found` 
      });
      return;
    }
    
    const userData = userSnapshot.data() as UserData;
    console.log(`Found user: ${userData.email}`);
    
    // Create a test status update email
    const template = getEmail('orderShipped', userData.preferredLang || 'sv-SE', { orderData, userData });
    
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
    await sendEmail(testEmail);
    await sendEmail(adminEmail);
    
    console.log('Order status update emails sent successfully');
    
    res.status(200).json({ 
      success: true, 
      message: 'Order status update emails sent successfully',
      order: orderData.orderNumber,
      customer: userData.email,
      status: 'shipped (test)'
    });
    
  } catch (error) {
    console.error('Error testing order status update:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 