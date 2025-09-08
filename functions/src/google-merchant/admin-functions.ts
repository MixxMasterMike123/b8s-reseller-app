/**
 * Google Merchant Center Admin Functions
 * 
 * Admin-only functions for managing Google Merchant Center integration.
 * These functions are used by the admin dashboard to monitor and control
 * the Google Shopping sync process.
 */

import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { listProducts, getAccountInfo } from './api-client';
import { mapProductsToGoogleShopping } from './product-mapper';

const db = getFirestore();

/**
 * Get Google Merchant Center account status and statistics
 */
export const getGoogleMerchantStats = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('📊 Getting Google Merchant Center statistics');
      
      // Get account info
      const accountResult = await getAccountInfo();
      if (!accountResult.success) {
        return {
          success: false,
          error: 'Failed to connect to Google Merchant Center',
          details: accountResult.error
        };
      }
      
      // Get products from Google Shopping
      const productsResult = await listProducts(250); // Get more products for stats
      
      // Get products from Firestore for comparison
      const firestoreSnapshot = await db.collection('products').get();
      const firestoreProducts = firestoreSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Calculate stats
      const totalFirestoreProducts = firestoreProducts.length;
      const activeFirestoreProducts = firestoreProducts.filter(p => p.isActive).length;
      const b2cAvailableProducts = firestoreProducts.filter(p => p.isActive && p.availability?.b2c).length;
      
      const googleProducts = productsResult.success ? (productsResult.data?.resources || []) : [];
      const totalGoogleProducts = googleProducts.length;
      
      // Map Firestore products to see how many should be synced
      const mappableProducts = mapProductsToGoogleShopping(firestoreProducts, {
        targetMarket: 'b2c',
        language: 'sv',
        country: 'SE'
      });
      
      const stats = {
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
      
      return {
        success: true,
        stats,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('❌ Failed to get Google Merchant stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get statistics'
      };
    }
  }
);

/**
 * Get detailed sync status for individual products
 */
export const getProductSyncStatus = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      const { limit = 50, offset = 0 } = request.data;
      
      console.log(`📋 Getting product sync status (limit: ${limit}, offset: ${offset})`);
      
      // Get products from Firestore
      const firestoreSnapshot = await db.collection('products')
        .limit(limit)
        .offset(offset)
        .get();
      
      const firestoreProducts = firestoreSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Get products from Google Shopping
      const googleResult = await listProducts(250);
      const googleProducts = googleResult.success ? (googleResult.data?.resources || []) : [];
      
      // Create lookup map for Google products
      const googleProductMap = new Map();
      googleProducts.forEach((product: any) => {
        googleProductMap.set(product.offerId, product);
      });
      
      // Analyze sync status for each product
      const productStatus = firestoreProducts.map(product => {
        const mappedProduct = mapProductsToGoogleShopping([product], {
          targetMarket: 'b2c',
          language: 'sv',
          country: 'SE'
        });
        
        const shouldBeInGoogle = mappedProduct.length > 0;
        const offerId = `${product.id}_b2c_SE`;
        const isInGoogle = googleProductMap.has(offerId);
        
        let status = 'unknown';
        let message = '';
        
        if (!product.isActive) {
          status = 'inactive';
          message = 'Product is inactive';
        } else if (!product.availability?.b2c) {
          status = 'not_b2c';
          message = 'Not available for B2C';
        } else if (shouldBeInGoogle && isInGoogle) {
          status = 'synced';
          message = 'Successfully synced';
        } else if (shouldBeInGoogle && !isInGoogle) {
          status = 'needs_sync';
          message = 'Needs to be synced to Google';
        } else if (!shouldBeInGoogle && isInGoogle) {
          status = 'needs_removal';
          message = 'Should be removed from Google';
        } else {
          status = 'excluded';
          message = 'Excluded from sync';
        }
        
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          isActive: product.isActive,
          b2cAvailable: product.availability?.b2c || false,
          status,
          message,
          offerId,
          isInGoogle,
          shouldBeInGoogle,
          googleProduct: isInGoogle ? googleProductMap.get(offerId) : null
        };
      });
      
      // Calculate summary stats
      const statusCounts = productStatus.reduce((counts, product) => {
        counts[product.status] = (counts[product.status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      console.log('✅ Product sync status calculated:', statusCounts);
      
      return {
        success: true,
        products: productStatus,
        summary: statusCounts,
        pagination: {
          limit,
          offset,
          total: firestoreProducts.length,
          hasMore: firestoreProducts.length === limit
        }
      };
      
    } catch (error: any) {
      console.error('❌ Failed to get product sync status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get sync status'
      };
    }
  }
);

/**
 * Force sync specific products by ID
 */
export const forceSyncProducts = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 120,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      const { productIds } = request.data;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return {
          success: false,
          error: 'Product IDs array is required'
        };
      }
      
      console.log(`🔄 Force syncing ${productIds.length} products:`, productIds);
      
      const results = [];
      
      for (const productId of productIds) {
        try {
          // Get product from Firestore
          const productDoc = await db.collection('products').doc(productId).get();
          
          if (!productDoc.exists) {
            results.push({
              productId,
              success: false,
              error: 'Product not found'
            });
            continue;
          }
          
          // Product data is available in productDoc
          
          // Use the single product sync function
          const { syncSingleProductToGoogle } = await import('./sync-functions');
          const syncResult = await syncSingleProductToGoogle.run({
            data: { productId, targetMarket: 'b2c' }
          } as any);
          
          results.push({
            productId,
            success: syncResult.success,
            error: syncResult.error,
            details: syncResult.success ? 'Synced successfully' : syncResult.error
          });
          
        } catch (error: any) {
          results.push({
            productId,
            success: false,
            error: error.message || 'Unknown error'
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      console.log(`✅ Force sync completed: ${successCount} success, ${failureCount} failures`);
      
      return {
        success: true,
        results,
        summary: {
          total: results.length,
          success: successCount,
          failures: failureCount
        }
      };
      
    } catch (error: any) {
      console.error('❌ Force sync failed:', error);
      return {
        success: false,
        error: error.message || 'Force sync failed'
      };
    }
  }
);
