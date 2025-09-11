"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugProductFields = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("./config/database");
exports.debugProductFields = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true
}, async (req, res) => {
    try {
        const productId = 'GvAc6NCtubvgE0edJBGS';
        console.log(`🔍 DEBUG: Testing product fields for: ${productId}`);
        const productRef = database_1.db.collection('products').doc(productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) {
            res.json({ error: 'Product not found' });
            return;
        }
        const productData = productSnap.data();
        console.log('✅ DEBUG: Product found!');
        console.log('🔍 DEBUG: Product color:', productData?.color, '(type:', typeof productData?.color, ')');
        console.log('🔍 DEBUG: Product size:', productData?.size, '(type:', typeof productData?.size, ')');
        console.log('🔍 DEBUG: Product name:', productData?.name);
        console.log('🔍 DEBUG: Product sku:', productData?.sku);
        // Test cart logic
        console.log('\n🧪 DEBUG: Testing cart logic:');
        const cartItem = {
            id: productData?.id || productId,
            name: productData?.name,
            price: productData?.b2cPrice || productData?.basePrice,
            sku: productData?.sku,
            color: productData?.color || null,
            size: productData?.size || null,
            quantity: 1
        };
        console.log('🔍 DEBUG: Cart item would be:', JSON.stringify(cartItem, null, 2));
        const hasColorSize = cartItem.color && cartItem.size;
        console.log(hasColorSize ? '✅ SUCCESS: Cart item has both color and size fields!' : '❌ PROBLEM: Cart item is missing color and/or size fields');
        res.json({
            success: true,
            productData: {
                id: productId,
                color: productData?.color,
                size: productData?.size,
                name: productData?.name,
                sku: productData?.sku
            },
            cartItem,
            hasColorSize
        });
    }
    catch (error) {
        console.error('❌ DEBUG: Error testing product fields:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
//# sourceMappingURL=debug-product-fields.js.map