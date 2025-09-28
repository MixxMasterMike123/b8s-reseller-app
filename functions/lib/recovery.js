/**
 * Manual Order Recovery Function
 * Processes missing orders from old payments without Stripe signature validation
 */

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');
const { recoveryRateLimit } = require('./rateLimiter');

// Initialize Firestore with named database (Firebase Admin already initialized in main index.js)
const db = getFirestore('b8s-reseller-db');

exports.recoverMissingOrderV2 = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  invoker: 'public', // Allow manual calls
}, async (request, response) => {
  try {
    // 🛡️ DDOS PROTECTION: Rate limiting for recovery
    if (!recoveryRateLimit(request, response)) {
      return; // Rate limit exceeded, response already sent
    }

    logger.info('🔄 Manual order recovery initiated', {
      ip: request.ip || 'unknown'
    });

    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { paymentIntentId, metadata } = request.body;

    if (!paymentIntentId || !metadata) {
      response.status(400).json({ error: 'paymentIntentId and metadata required' });
      return;
    }

    // Check if order already exists
    const existingOrderQuery = db.collection('orders')
      .where('payment.paymentIntentId', '==', paymentIntentId);
    const existingOrders = await existingOrderQuery.get();
    
    if (!existingOrders.empty) {
      logger.info('✅ Order already exists for payment intent', { 
        paymentIntentId,
        orderId: existingOrders.docs[0].id 
      });
      response.status(200).json({ 
        success: true, 
        existing: true,
        orderId: existingOrders.docs[0].id 
      });
      return;
    }

    // Parse item details
    let cartItems;
    try {
      cartItems = JSON.parse(metadata.itemDetails);
    } catch (err) {
      logger.error('❌ Failed to parse itemDetails JSON', { 
        paymentIntentId,
        itemDetails: metadata.itemDetails 
      });
      response.status(400).json({ error: 'Invalid itemDetails format' });
      return;
    }

    // Generate order number
    const orderNumber = `B8S-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create order data
    const orderData = {
      orderNumber,
      status: 'confirmed',
      source: 'b2c', // B2C order (recovery mode noted in recovery field)
      
      // Customer information
      customerInfo: {
        email: metadata.customerEmail,
        firstName: metadata.customerFirstName || '',
        lastName: metadata.customerLastName || '',
        marketingOptIn: metadata.customerMarketing === 'true',
        preferredLang: metadata.customerLang || 'sv-SE'
      },

      // Shipping information (marked as incomplete)
      shippingInfo: {
        firstName: metadata.shippingFirstName || metadata.customerFirstName || '',
        lastName: metadata.shippingLastName || metadata.customerLastName || '',
        address: metadata.shippingAddress || 'ADDRESS MISSING - MANUAL FOLLOWUP REQUIRED',
        apartment: metadata.shippingApartment || '',
        city: metadata.shippingCity || 'CITY MISSING',
        postalCode: metadata.shippingPostalCode || 'POSTAL CODE MISSING',
        country: metadata.shippingCountry || 'SE'
      },

      // Order items
      items: cartItems.map(item => ({
        productId: item.id || 'unknown',
        sku: item.sku,
        name: item.name,
        price: parseFloat(item.price || '0'),
        quantity: parseInt(item.quantity || '1', 10),
        color: item.color || '',
        size: item.size || '',
        image: item.image || '',
        total: parseFloat(item.price || '0') * parseInt(item.quantity || '1', 10)
      })),

      // Financial totals
      subtotal: parseFloat(metadata.subtotal || '0'),
      vat: parseFloat(metadata.vat || '0'),
      shipping: parseFloat(metadata.shipping || metadata.shippingCost || '0'),
      discountAmount: parseFloat(metadata.discountAmount || '0'),
      total: parseFloat(metadata.total || '0'),

      // Payment information
      payment: {
        method: 'stripe',
        paymentIntentId: paymentIntentId,
        amount: parseFloat(metadata.total || '0'),
        currency: 'SEK',
        status: 'completed'
      },

      // Recovery metadata
      recovery: {
        processed: true,
        processedAt: new Date().toISOString(),
        addressMissing: true,
        requiresFollowup: true,
        notes: 'Order recovered from missing payment - shipping address needed'
      },

      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create order in Firestore
    const orderRef = await db.collection('orders').add(orderData);

    logger.info('✅ Recovery order created successfully', { 
      paymentIntentId,
      orderId: orderRef.id,
      orderNumber,
      customerEmail: metadata.customerEmail
    });

    // Call post-order processing function for emails
    try {
      logger.info('📧 Calling post-order processing for recovery order...');
      const timestamp = Date.now();
      const functionUrl = `https://us-central1-b8shield-reseller-app.cloudfunctions.net/processB2COrderCompletionHttpV2?_=${timestamp}`;
      
      const fetchResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ orderId: orderRef.id }),
      });

      if (!fetchResponse.ok) {
        logger.error('❌ Failed to call post-order processing for recovery order', { 
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          orderId: orderRef.id
        });
      } else {
        const result = await fetchResponse.json();
        logger.info('✅ Post-order processing completed for recovery order', { 
          orderId: orderRef.id,
          result
        });
      }
    } catch (error) {
      logger.error('❌ Error calling post-order processing for recovery order', { 
        error: error.message,
        orderId: orderRef.id
      });
    }

    response.status(200).json({ 
      success: true,
      created: true,
      orderId: orderRef.id,
      orderNumber,
      addressMissing: true,
      requiresFollowup: true
    });

  } catch (error) {
    logger.error('❌ Recovery function error', { error: error.message });
    response.status(500).json({ error: 'Internal server error' });
  }
});
