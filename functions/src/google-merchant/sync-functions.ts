/**
 * Google Merchant Center Sync Functions
 * 
 * Firebase Functions for syncing B8Shield products to Google Shopping.
 * Handles both manual sync and automated triggers.
 */

import { onRequest, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { corsHandler } from '../protection/cors/cors-handler';
import { rateLimiter } from '../protection/rate-limiting/rate-limiter';

import { 
  mapProductToGoogleShopping, 
  mapProductsToGoogleShopping
} from './product-mapper';
import { 
  insertProduct, 
  updateProduct, 
  deleteProduct, 
  batchInsertProducts,
  getAccountInfo,
  listProducts 
} from './api-client';
// Types imported for function signatures

const db = getFirestore();

// Collection name for products
const PRODUCTS_COLLECTION = 'products';

/**
 * Manual sync all products to Google Merchant Center
 * Callable function for admin use
 */
export const syncAllProductsToGoogle = onCall(
  {
    memory: '1GiB',
    timeoutSeconds: 540, // 9 minutes
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('🚀 Starting manual sync of all products to Google Merchant Center');
      
      // Get all active products from Firestore
      const productsSnapshot = await db.collection(PRODUCTS_COLLECTION).get();
      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      console.log(`📦 Found ${products.length} products in Firestore`);
      
      // Map products to Google Shopping format (B2C focus)
      const googleProducts = mapProductsToGoogleShopping(products, {
        targetMarket: 'b2c',
        language: 'sv',
        country: 'SE'
      });
      
      if (googleProducts.length === 0) {
        return {
          success: true,
          message: 'No B2C products found to sync',
          stats: {
            total: products.length,
            synced: 0,
            skipped: products.length,
            errors: 0
          }
        };
      }
      
      // Batch insert to Google Merchant Center
      const results = await batchInsertProducts(googleProducts);
      
      // Calculate stats
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;
      
      const stats = {
        total: products.length,
        synced: successCount,
        skipped: products.length - googleProducts.length,
        errors: errorCount
      };
      
      console.log('✅ Manual sync completed:', stats);
      
      return {
        success: true,
        message: `Synced ${successCount}/${googleProducts.length} products to Google Shopping`,
        stats,
        details: results
      };
      
    } catch (error: any) {
      console.error('❌ Manual sync failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during sync',
        details: error
      };
    }
  }
);

/**
 * HTTP endpoint for manual sync (for admin dashboard)
 */
export const syncProductsToGoogleHttp = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    cors: true
  },
  async (req, res) => {
    try {
      // Apply CORS and rate limiting
      if (!corsHandler(req, res)) {
        return;
      }
      
      if (!await rateLimiter(req, res)) {
        return;
      }
      
      // Call the sync function
      const result = await syncAllProductsToGoogle.run({ data: {} } as any);
      
      res.status(200).json(result);
      
    } catch (error: any) {
      console.error('❌ HTTP sync failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Sync failed'
      });
    }
  }
);

/**
 * Sync single product to Google Merchant Center
 */
export const syncSingleProductToGoogle = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      const { productId, targetMarket = 'b2c' } = request.data;
      
      if (!productId) {
        return {
          success: false,
          error: 'Product ID is required'
        };
      }
      
      console.log(`🔄 Syncing single product: ${productId} (${targetMarket})`);
      
      // Get product from Firestore
      const productDoc = await db.collection(PRODUCTS_COLLECTION).doc(productId).get();
      
      if (!productDoc.exists) {
        return {
          success: false,
          error: 'Product not found'
        };
      }
      
      const productData = {
        id: productDoc.id,
        ...productDoc.data()
      } as any;
      
      // Map to Google Shopping format
      const googleProduct = mapProductToGoogleShopping(productData, {
        targetMarket,
        language: 'sv',
        country: 'SE'
      });
      
      if (!googleProduct) {
        return {
          success: false,
          error: `Product not available for ${targetMarket} market or inactive`
        };
      }
      
      // Insert/update in Google Merchant Center
      const result = await insertProduct(googleProduct);
      
      console.log(`✅ Single product sync result:`, result);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Single product sync failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error during single product sync'
      };
    }
  }
);

/**
 * Test Google Merchant Center connection
 */
export const testGoogleMerchantConnection = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('🧪 Testing Google Merchant Center connection');
      
      // Test account access
      const accountResult = await getAccountInfo();
      
      if (!accountResult.success) {
        return {
          success: false,
          error: 'Failed to connect to Google Merchant Center',
          details: accountResult.error
        };
      }
      
      // Test product listing
      const productsResult = await listProducts(5);
      
      return {
        success: true,
        message: 'Google Merchant Center connection successful',
        account: accountResult.data,
        sampleProducts: productsResult.data
      };
      
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Connection test failed'
      };
    }
  }
);

/**
 * Firestore Trigger: Auto-sync when product is created
 */
export const onProductCreated = onDocumentCreated(
  {
    document: `${PRODUCTS_COLLECTION}/{productId}`,
    memory: '512MiB',
    timeoutSeconds: 60
  },
  async (event) => {
    try {
      const productId = event.params.productId;
      const productData = {
        id: productId,
        ...event.data?.data()
      } as any;
      
      console.log(`🆕 Product created, auto-syncing to Google: ${productId}`);
      
      // Only sync B2C products automatically
      if (!productData.availability?.b2c || !productData.isActive) {
        console.log(`⏭️  Skipping auto-sync for ${productId}: not B2C available or inactive`);
        return;
      }
      
      // Map to Google Shopping format
      const googleProduct = mapProductToGoogleShopping(productData, {
        targetMarket: 'b2c',
        language: 'sv',
        country: 'SE'
      });
      
      if (!googleProduct) {
        console.log(`⏭️  Skipping auto-sync for ${productId}: mapping failed`);
        return;
      }
      
      // Insert in Google Merchant Center
      const result = await insertProduct(googleProduct);
      
      if (result.success) {
        console.log(`✅ Auto-sync successful for new product: ${productId}`);
      } else {
        console.error(`❌ Auto-sync failed for new product: ${productId}`, result.error);
      }
      
    } catch (error: any) {
      console.error('❌ Product creation trigger failed:', error);
    }
  }
);

/**
 * Firestore Trigger: Auto-sync when product is updated
 */
export const onProductUpdated = onDocumentUpdated(
  {
    document: `${PRODUCTS_COLLECTION}/{productId}`,
    memory: '512MiB',
    timeoutSeconds: 60
  },
  async (event) => {
    try {
      const productId = event.params.productId;
      const newData = event.data?.after.data();
      const oldData = event.data?.before.data();
      
      if (!newData || !oldData) {
        console.log(`⏭️  Skipping update sync for ${productId}: missing data`);
        return;
      }
      
      const productData = {
        id: productId,
        ...newData
      } as any;
      
      console.log(`🔄 Product updated, auto-syncing to Google: ${productId}`);
      
      // Check if product became inactive or unavailable for B2C
      if (!productData.availability?.b2c || !productData.isActive) {
        // Product should be removed from Google Shopping
        console.log(`🗑️  Product ${productId} became unavailable, removing from Google Shopping`);
        
        const deleteResult = await deleteProduct(
          productId,
          `${productId}_b2c_SE`,
          'sv',
          'SE'
        );
        
        if (deleteResult.success) {
          console.log(`✅ Product ${productId} removed from Google Shopping`);
        } else {
          console.error(`❌ Failed to remove product ${productId} from Google Shopping:`, deleteResult.error);
        }
        
        return;
      }
      
      // Map to Google Shopping format
      const googleProduct = mapProductToGoogleShopping(productData, {
        targetMarket: 'b2c',
        language: 'sv',
        country: 'SE'
      });
      
      if (!googleProduct) {
        console.log(`⏭️  Skipping update sync for ${productId}: mapping failed`);
        return;
      }
      
      // Update in Google Merchant Center
      const result = await updateProduct(googleProduct);
      
      if (result.success) {
        console.log(`✅ Auto-sync update successful for product: ${productId}`);
      } else {
        console.error(`❌ Auto-sync update failed for product: ${productId}`, result.error);
      }
      
    } catch (error: any) {
      console.error('❌ Product update trigger failed:', error);
    }
  }
);

/**
 * Firestore Trigger: Auto-remove when product is deleted
 */
export const onProductDeleted = onDocumentDeleted(
  {
    document: `${PRODUCTS_COLLECTION}/{productId}`,
    memory: '256MiB',
    timeoutSeconds: 30
  },
  async (event) => {
    try {
      const productId = event.params.productId;
      
      console.log(`🗑️  Product deleted, removing from Google Shopping: ${productId}`);
      
      // Remove from Google Merchant Center
      const result = await deleteProduct(
        productId,
        `${productId}_b2c_SE`,
        'sv',
        'SE'
      );
      
      if (result.success) {
        console.log(`✅ Product ${productId} removed from Google Shopping`);
      } else {
        console.error(`❌ Failed to remove deleted product ${productId} from Google Shopping:`, result.error);
      }
      
    } catch (error: any) {
      console.error('❌ Product deletion trigger failed:', error);
    }
  }
);
