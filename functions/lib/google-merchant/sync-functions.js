"use strict";
/**
 * Google Merchant Center Sync Functions
 *
 * Firebase Functions for syncing B8Shield products to Google Shopping.
 * Handles both manual sync and automated triggers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onProductDeleted = exports.onProductUpdated = exports.onProductCreated = exports.testGoogleMerchantConnection = exports.syncSingleProductToGoogle = exports.syncProductsToGoogleHttp = exports.syncAllProductsToGoogle = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const cors_handler_1 = require("../protection/cors/cors-handler");
const rate_limiter_1 = require("../protection/rate-limiting/rate-limiter");
const product_mapper_1 = require("./product-mapper");
const api_client_1 = require("./api-client");
// Types imported for function signatures
const db = (0, firestore_2.getFirestore)();
// Collection name for products
const PRODUCTS_COLLECTION = 'products';
/**
 * Manual sync all products to Google Merchant Center
 * Callable function for admin use
 */
exports.syncAllProductsToGoogle = (0, https_1.onCall)({
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'us-central1',
    cors: true
}, async (request) => {
    try {
        console.log('🚀 Starting manual sync of all products to Google Merchant Center');
        // Get all active products from Firestore
        const productsSnapshot = await db.collection(PRODUCTS_COLLECTION).get();
        const products = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`📦 Found ${products.length} products in Firestore`);
        // Map products to Google Shopping format (B2C focus)
        const googleProducts = (0, product_mapper_1.mapProductsToGoogleShopping)(products, {
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
        const results = await (0, api_client_1.batchInsertProducts)(googleProducts);
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
    }
    catch (error) {
        console.error('❌ Manual sync failed:', error);
        return {
            success: false,
            error: error.message || 'Unknown error during sync',
            details: error
        };
    }
});
/**
 * HTTP endpoint for manual sync (for admin dashboard)
 */
exports.syncProductsToGoogleHttp = (0, https_1.onRequest)({
    memory: '1GiB',
    timeoutSeconds: 540,
    cors: true
}, async (req, res) => {
    try {
        // Apply CORS and rate limiting
        if (!(0, cors_handler_1.corsHandler)(req, res)) {
            return;
        }
        if (!await (0, rate_limiter_1.rateLimiter)(req, res)) {
            return;
        }
        // Call the sync function
        const result = await exports.syncAllProductsToGoogle.run({ data: {} });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('❌ HTTP sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Sync failed'
        });
    }
});
/**
 * Sync single product to Google Merchant Center
 */
exports.syncSingleProductToGoogle = (0, https_1.onCall)({
    memory: '512MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
    cors: true
}, async (request) => {
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
        };
        // Map to Google Shopping format
        const googleProduct = (0, product_mapper_1.mapProductToGoogleShopping)(productData, {
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
        const result = await (0, api_client_1.insertProduct)(googleProduct);
        console.log(`✅ Single product sync result:`, result);
        return result;
    }
    catch (error) {
        console.error('❌ Single product sync failed:', error);
        return {
            success: false,
            error: error.message || 'Unknown error during single product sync'
        };
    }
});
/**
 * Test Google Merchant Center connection
 */
exports.testGoogleMerchantConnection = (0, https_1.onCall)({
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
    cors: true
}, async (request) => {
    try {
        console.log('🧪 Testing Google Merchant Center connection');
        // Test account access
        const accountResult = await (0, api_client_1.getAccountInfo)();
        if (!accountResult.success) {
            return {
                success: false,
                error: 'Failed to connect to Google Merchant Center',
                details: accountResult.error
            };
        }
        // Test product listing
        const productsResult = await (0, api_client_1.listProducts)(5);
        return {
            success: true,
            message: 'Google Merchant Center connection successful',
            account: accountResult.data,
            sampleProducts: productsResult.data
        };
    }
    catch (error) {
        console.error('❌ Connection test failed:', error);
        return {
            success: false,
            error: error.message || 'Connection test failed'
        };
    }
});
/**
 * Firestore Trigger: Auto-sync when product is created
 */
exports.onProductCreated = (0, firestore_1.onDocumentCreated)({
    document: `${PRODUCTS_COLLECTION}/{productId}`,
    memory: '512MiB',
    timeoutSeconds: 60
}, async (event) => {
    try {
        const productId = event.params.productId;
        const productData = {
            id: productId,
            ...event.data?.data()
        };
        console.log(`🆕 Product created, auto-syncing to Google: ${productId}`);
        // Only sync B2C products automatically
        if (!productData.availability?.b2c || !productData.isActive) {
            console.log(`⏭️  Skipping auto-sync for ${productId}: not B2C available or inactive`);
            return;
        }
        // Map to Google Shopping format
        const googleProduct = (0, product_mapper_1.mapProductToGoogleShopping)(productData, {
            targetMarket: 'b2c',
            language: 'sv',
            country: 'SE'
        });
        if (!googleProduct) {
            console.log(`⏭️  Skipping auto-sync for ${productId}: mapping failed`);
            return;
        }
        // Insert in Google Merchant Center
        const result = await (0, api_client_1.insertProduct)(googleProduct);
        if (result.success) {
            console.log(`✅ Auto-sync successful for new product: ${productId}`);
        }
        else {
            console.error(`❌ Auto-sync failed for new product: ${productId}`, result.error);
        }
    }
    catch (error) {
        console.error('❌ Product creation trigger failed:', error);
    }
});
/**
 * Firestore Trigger: Auto-sync when product is updated
 */
exports.onProductUpdated = (0, firestore_1.onDocumentUpdated)({
    document: `${PRODUCTS_COLLECTION}/{productId}`,
    memory: '512MiB',
    timeoutSeconds: 60
}, async (event) => {
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
        };
        console.log(`🔄 Product updated, auto-syncing to Google: ${productId}`);
        // Check if product became inactive or unavailable for B2C
        if (!productData.availability?.b2c || !productData.isActive) {
            // Product should be removed from Google Shopping
            console.log(`🗑️  Product ${productId} became unavailable, removing from Google Shopping`);
            const deleteResult = await (0, api_client_1.deleteProduct)(productId, `${productId}_b2c_SE`, 'sv', 'SE');
            if (deleteResult.success) {
                console.log(`✅ Product ${productId} removed from Google Shopping`);
            }
            else {
                console.error(`❌ Failed to remove product ${productId} from Google Shopping:`, deleteResult.error);
            }
            return;
        }
        // Map to Google Shopping format
        const googleProduct = (0, product_mapper_1.mapProductToGoogleShopping)(productData, {
            targetMarket: 'b2c',
            language: 'sv',
            country: 'SE'
        });
        if (!googleProduct) {
            console.log(`⏭️  Skipping update sync for ${productId}: mapping failed`);
            return;
        }
        // Update in Google Merchant Center
        const result = await (0, api_client_1.updateProduct)(googleProduct);
        if (result.success) {
            console.log(`✅ Auto-sync update successful for product: ${productId}`);
        }
        else {
            console.error(`❌ Auto-sync update failed for product: ${productId}`, result.error);
        }
    }
    catch (error) {
        console.error('❌ Product update trigger failed:', error);
    }
});
/**
 * Firestore Trigger: Auto-remove when product is deleted
 */
exports.onProductDeleted = (0, firestore_1.onDocumentDeleted)({
    document: `${PRODUCTS_COLLECTION}/{productId}`,
    memory: '256MiB',
    timeoutSeconds: 30
}, async (event) => {
    try {
        const productId = event.params.productId;
        console.log(`🗑️  Product deleted, removing from Google Shopping: ${productId}`);
        // Remove from Google Merchant Center
        const result = await (0, api_client_1.deleteProduct)(productId, `${productId}_b2c_SE`, 'sv', 'SE');
        if (result.success) {
            console.log(`✅ Product ${productId} removed from Google Shopping`);
        }
        else {
            console.error(`❌ Failed to remove deleted product ${productId} from Google Shopping:`, result.error);
        }
    }
    catch (error) {
        console.error('❌ Product deletion trigger failed:', error);
    }
});
//# sourceMappingURL=sync-functions.js.map