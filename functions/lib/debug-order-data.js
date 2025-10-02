"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugOrderData = void 0;
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("./config/database");
exports.debugOrderData = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true
}, async (req, res) => {
    try {
        console.log('🔍 DEBUG: Fetching recent B2C order...');
        // Get the most recent B2C order
        const ordersSnapshot = await database_1.db.collection('orders')
            .where('source', '==', 'b2c')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (ordersSnapshot.empty) {
            res.json({ error: 'No B2C orders found' });
            return;
        }
        const orderDoc = ordersSnapshot.docs[0];
        const orderData = orderDoc.data();
        console.log('🔍 DEBUG: Order found:', orderDoc.id);
        console.log('🔍 DEBUG: Order items:', JSON.stringify(orderData.items, null, 2));
        const debugInfo = {
            orderId: orderDoc.id,
            orderNumber: orderData.orderNumber,
            source: orderData.source,
            itemCount: orderData.items?.length || 0,
            items: orderData.items?.map((item, index) => ({
                index,
                name: item.name,
                color: item.color,
                size: item.size,
                sku: item.sku,
                quantity: item.quantity,
                price: item.price,
                colorType: typeof item.color,
                sizeType: typeof item.size,
                hasColor: !!item.color,
                hasSize: !!item.size,
                rawItem: item
            })) || [],
            customerEmail: orderData.customerInfo?.email,
            createdAt: orderData.createdAt
        };
        res.json({
            success: true,
            debug: debugInfo,
            fullOrderData: orderData
        });
    }
    catch (error) {
        console.error('🔍 DEBUG ERROR:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=debug-order-data.js.map