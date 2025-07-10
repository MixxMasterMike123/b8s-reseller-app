import * as functions from 'firebase-functions';
import { onRequest, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { appUrls } from '../config/app-urls';
import { RATE_LIMITS } from '../config/rate-limits';
import { sendEmail, db } from '../email/email-handler';
import { getEmail } from '../../emails';

// Global type declarations for rate limiting
declare global {
  var orderRateLimit: Map<string, number[]>;
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
  source?: string;
  trackingNumber?: string;
  carrier?: string;
  customerInfo?: any;
}

interface UserData {
  email: string;
  companyName?: string;
  contactPerson?: string;
  preferredLang?: string;
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
    // 🛡️ ORDER SPAM PROTECTION: Limit order processing per IP
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = RATE_LIMITS.ORDER_PROCESSING.windowMs;
    const maxOrders = RATE_LIMITS.ORDER_PROCESSING.perWindow;
    
    if (!global.orderRateLimit) global.orderRateLimit = new Map();
    
    const ipOrders = global.orderRateLimit.get(clientIP) || [];
    const recentOrders = ipOrders.filter((time: number) => now - time < windowMs);
    
    if (recentOrders.length >= maxOrders) {
      console.warn(`🚫 Order spam detected from IP: ${clientIP}`);
      res.status(429).json({ 
        success: false,
        error: 'Order processing limit reached. Please wait 5 minutes before placing more orders.',
        retryAfter: Math.ceil(windowMs / 1000),
        limit: maxOrders,
        window: '5 minutes'
      });
      return;
    }
    
    // Track this order request
    recentOrders.push(now);
    global.orderRateLimit.set(clientIP, recentOrders);
    
    console.log(`📦 Order processing request from IP: ${clientIP} (${recentOrders.length}/${maxOrders} in ${Math.ceil(windowMs/60000)} min)`);

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
      const { affiliateCode, discountCode } = orderData;

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

      // Update affiliate stats
      await affiliateDoc.ref.update({
        'stats.conversions': FieldValue.increment(1),
        'stats.totalEarnings': FieldValue.increment(commissionAmount),
        'stats.balance': FieldValue.increment(commissionAmount)
      });

      // Update the click to mark conversion
      if (orderData.affiliateClickId) {
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
                  convertedAt: FieldValue.serverTimestamp()
                });
                console.log(`Click document ${clickDoc.id} marked as converted.`);
              } else {
                console.log(`No unconverted clicks found for affiliate code ${orderData.affiliateCode}`);
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
        return { success: true, message: `Order ${orderId} processed, but no commission (amount: ${orderAmount})` };
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
    
    // Get the first order
    const ordersSnapshot = await db.collection('orders').limit(1).get();
    
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
    
    // Get the first order from Firestore
    const ordersSnapshot = await db.collection('orders').limit(1).get();
    
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