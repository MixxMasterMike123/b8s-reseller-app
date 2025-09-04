"use strict";
/**
 * Google Merchant Center API Client
 *
 * This module handles direct API communication with Google Merchant Center.
 * Provides functions to create, update, and delete products in Google Shopping.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountInfo = exports.updateProductInventory = exports.batchInsertProducts = exports.listProducts = exports.getProductStatus = exports.deleteProduct = exports.updateProduct = exports.insertProduct = void 0;
const config_1 = require("./config");
const product_mapper_1 = require("./product-mapper");
/**
 * Make authenticated request to Google Merchant API
 */
const makeApiRequest = async (method, endpoint, data) => {
    try {
        const authClient = await (0, config_1.getAuthenticatedClient)();
        const url = `${config_1.MERCHANT_CONFIG.BASE_URL}/content/${config_1.MERCHANT_CONFIG.API_VERSION}/${endpoint}`;
        console.log(`📡 Making ${method} request to: ${url}`);
        const response = await authClient.request({
            url,
            method,
            data,
            headers: {
                'Content-Type': 'application/json',
            }
        });
        console.log(`✅ API request successful:`, response.status);
        return {
            success: true,
            data: response.data
        };
    }
    catch (error) {
        console.error(`❌ API request failed:`, error);
        return {
            success: false,
            error: error.message || 'Unknown API error',
            details: error.response?.data || error
        };
    }
};
/**
 * Insert a single product into Google Merchant Center
 */
const insertProduct = async (product) => {
    // Validate product data first
    const validationErrors = (0, product_mapper_1.validateGoogleShoppingProduct)(product);
    if (validationErrors.length > 0) {
        return {
            success: false,
            error: `Product validation failed: ${validationErrors.join(', ')}`,
            details: { validationErrors }
        };
    }
    const endpoint = `${config_1.MERCHANT_CONFIG.MERCHANT_ID}/products`;
    // Format product data for API
    const apiProduct = {
        productId: product.productId,
        contentLanguage: product.contentLanguage,
        targetCountry: product.targetCountry,
        channel: product.channel,
        offerId: product.offerId,
        product: {
            title: product.title,
            description: product.description,
            link: product.link,
            imageLink: product.imageLink,
            additionalImageLinks: product.additionalImageLinks,
            condition: product.condition,
            availability: product.availability,
            price: product.price,
            brand: product.brand,
            gtin: product.gtin,
            mpn: product.mpn,
            googleProductCategory: product.googleProductCategory,
            productTypes: product.productTypes,
            customLabel0: product.customLabel0,
            customLabel1: product.customLabel1,
            customLabel2: product.customLabel2,
            customLabel3: product.customLabel3,
            customLabel4: product.customLabel4,
            shipping: product.shipping,
            productWeight: product.productWeight,
            productLength: product.productLength,
            productWidth: product.productWidth,
            productHeight: product.productHeight,
        }
    };
    console.log(`📦 Inserting product: ${product.title} (${product.offerId})`);
    return await makeApiRequest('POST', endpoint, apiProduct);
};
exports.insertProduct = insertProduct;
/**
 * Update an existing product in Google Merchant Center
 */
const updateProduct = async (product) => {
    // For now, Google Merchant API treats updates as inserts
    // The API will update if product exists, create if it doesn't
    return await (0, exports.insertProduct)(product);
};
exports.updateProduct = updateProduct;
/**
 * Delete a product from Google Merchant Center
 */
const deleteProduct = async (productId, offerId, contentLanguage = 'sv', targetCountry = 'SE') => {
    const endpoint = `${config_1.MERCHANT_CONFIG.MERCHANT_ID}/products/${productId}`;
    const deleteData = {
        productId,
        contentLanguage,
        targetCountry,
        offerId
    };
    console.log(`🗑️  Deleting product: ${productId} (${offerId})`);
    return await makeApiRequest('DELETE', endpoint, deleteData);
};
exports.deleteProduct = deleteProduct;
/**
 * Get product status from Google Merchant Center
 */
const getProductStatus = async (productId, contentLanguage = 'sv', targetCountry = 'SE') => {
    const endpoint = `${config_1.MERCHANT_CONFIG.MERCHANT_ID}/products/${productId}?contentLanguage=${contentLanguage}&targetCountry=${targetCountry}`;
    console.log(`📊 Getting product status: ${productId}`);
    return await makeApiRequest('GET', endpoint);
};
exports.getProductStatus = getProductStatus;
/**
 * List all products in Google Merchant Center
 */
const listProducts = async (maxResults = 50, pageToken) => {
    let endpoint = `${config_1.MERCHANT_CONFIG.MERCHANT_ID}/products?maxResults=${maxResults}`;
    if (pageToken) {
        endpoint += `&pageToken=${pageToken}`;
    }
    console.log(`📋 Listing products (max: ${maxResults})`);
    return await makeApiRequest('GET', endpoint);
};
exports.listProducts = listProducts;
/**
 * Batch insert multiple products
 */
const batchInsertProducts = async (products) => {
    console.log(`🚀 Starting batch insert of ${products.length} products`);
    const results = [];
    const BATCH_SIZE = 10; // Process in batches to avoid rate limits
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}`);
        // Process batch in parallel
        const batchPromises = batch.map(product => (0, exports.insertProduct)(product));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        // Small delay between batches to respect rate limits
        if (i + BATCH_SIZE < products.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    console.log(`✅ Batch insert completed: ${successCount} success, ${failureCount} failures`);
    return results;
};
exports.batchInsertProducts = batchInsertProducts;
/**
 * Sync product inventory/availability
 */
const updateProductInventory = async (productId, offerId, availability, price, contentLanguage = 'sv', targetCountry = 'SE') => {
    const endpoint = `${config_1.MERCHANT_CONFIG.MERCHANT_ID}/products/${productId}`;
    const updateData = {
        productId,
        contentLanguage,
        targetCountry,
        offerId,
        availability,
        ...(price && { price })
    };
    console.log(`📊 Updating inventory for: ${productId} (${availability})`);
    return await makeApiRequest('POST', endpoint, updateData);
};
exports.updateProductInventory = updateProductInventory;
/**
 * Get account information
 */
const getAccountInfo = async () => {
    const endpoint = `${config_1.MERCHANT_CONFIG.MERCHANT_ID}`;
    console.log(`ℹ️  Getting account info for merchant: ${config_1.MERCHANT_CONFIG.MERCHANT_ID}`);
    return await makeApiRequest('GET', endpoint);
};
exports.getAccountInfo = getAccountInfo;
//# sourceMappingURL=api-client.js.map