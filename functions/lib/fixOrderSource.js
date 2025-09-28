/**
 * Quick Fix: Update Order Source for Recovery Orders
 */

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firestore with named database
const db = getFirestore('b8s-reseller-db');

exports.fixOrderSourceV2 = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  invoker: 'public',
}, async (request, response) => {
  try {
    // Only allow POST requests
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { orderIds, newSource } = request.body;

    if (!orderIds || !newSource) {
      response.status(400).json({ error: 'orderIds and newSource required' });
      return;
    }

    logger.info('🔧 Fixing order source', { orderIds, newSource });

    const results = [];
    for (const orderId of orderIds) {
      try {
        await db.collection('orders').doc(orderId).update({
          source: newSource,
          updatedAt: new Date().toISOString()
        });
        
        logger.info('✅ Updated order source', { orderId, newSource });
        results.push({ orderId, success: true });
      } catch (error) {
        logger.error('❌ Failed to update order', { orderId, error: error.message });
        results.push({ orderId, success: false, error: error.message });
      }
    }

    response.status(200).json({ 
      success: true,
      updated: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

  } catch (error) {
    logger.error('❌ Fix order source error', { error: error.message });
    response.status(500).json({ error: 'Internal server error' });
  }
});
