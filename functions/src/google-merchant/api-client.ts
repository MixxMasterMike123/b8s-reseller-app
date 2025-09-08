/**
 * Google Merchant Center API Client
 * 
 * This module handles direct API communication with Google Merchant Center.
 * Provides functions to create, update, and delete products in Google Shopping.
 */

import { getAuthenticatedClient, MERCHANT_CONFIG } from './config';
import type { GoogleShoppingProduct } from './product-mapper';
import { validateGoogleShoppingProduct } from './product-mapper';

// API response interfaces
export interface MerchantApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface ProductInsertResponse {
  productId: string;
  offerId: string;
  contentLanguage: string;
  targetCountry: string;
  channel: string;
}

/**
 * Make authenticated request to Google Merchant API
 */
const makeApiRequest = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: any
): Promise<MerchantApiResponse> => {
  try {
    const authClient = await getAuthenticatedClient();
    const url = `${MERCHANT_CONFIG.BASE_URL}/content/${MERCHANT_CONFIG.API_VERSION}/${endpoint}`;
    
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
    
  } catch (error: any) {
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
export const insertProduct = async (
  product: GoogleShoppingProduct
): Promise<MerchantApiResponse<ProductInsertResponse>> => {
  // Validate product data first
  const validationErrors = validateGoogleShoppingProduct(product);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: `Product validation failed: ${validationErrors.join(', ')}`,
      details: { validationErrors }
    };
  }
  
  const endpoint = `${MERCHANT_CONFIG.MERCHANT_ID}/products`;
  
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

/**
 * Update an existing product in Google Merchant Center
 */
export const updateProduct = async (
  product: GoogleShoppingProduct
): Promise<MerchantApiResponse<ProductInsertResponse>> => {
  // For now, Google Merchant API treats updates as inserts
  // The API will update if product exists, create if it doesn't
  return await insertProduct(product);
};

/**
 * Delete a product from Google Merchant Center
 */
export const deleteProduct = async (
  productId: string,
  offerId: string,
  contentLanguage: string = 'sv',
  targetCountry: string = 'SE'
): Promise<MerchantApiResponse> => {
  const endpoint = `${MERCHANT_CONFIG.MERCHANT_ID}/products/${productId}`;
  
  const deleteData = {
    productId,
    contentLanguage,
    targetCountry,
    offerId
  };
  
  console.log(`🗑️  Deleting product: ${productId} (${offerId})`);
  return await makeApiRequest('DELETE', endpoint, deleteData);
};

/**
 * Get product status from Google Merchant Center
 */
export const getProductStatus = async (
  productId: string,
  contentLanguage: string = 'sv',
  targetCountry: string = 'SE'
): Promise<MerchantApiResponse> => {
  const endpoint = `${MERCHANT_CONFIG.MERCHANT_ID}/products/${productId}?contentLanguage=${contentLanguage}&targetCountry=${targetCountry}`;
  
  console.log(`📊 Getting product status: ${productId}`);
  return await makeApiRequest('GET', endpoint);
};

/**
 * List all products in Google Merchant Center
 */
export const listProducts = async (
  maxResults: number = 50,
  pageToken?: string
): Promise<MerchantApiResponse> => {
  let endpoint = `${MERCHANT_CONFIG.MERCHANT_ID}/products?maxResults=${maxResults}`;
  
  if (pageToken) {
    endpoint += `&pageToken=${pageToken}`;
  }
  
  console.log(`📋 Listing products (max: ${maxResults})`);
  return await makeApiRequest('GET', endpoint);
};

/**
 * Batch insert multiple products
 */
export const batchInsertProducts = async (
  products: GoogleShoppingProduct[]
): Promise<MerchantApiResponse[]> => {
  console.log(`🚀 Starting batch insert of ${products.length} products`);
  
  const results: MerchantApiResponse[] = [];
  const BATCH_SIZE = 10; // Process in batches to avoid rate limits
  
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}`);
    
    // Process batch in parallel
    const batchPromises = batch.map(product => insertProduct(product));
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

/**
 * Sync product inventory/availability
 */
export const updateProductInventory = async (
  productId: string,
  offerId: string,
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder',
  price?: { value: string; currency: string },
  contentLanguage: string = 'sv',
  targetCountry: string = 'SE'
): Promise<MerchantApiResponse> => {
  const endpoint = `${MERCHANT_CONFIG.MERCHANT_ID}/products/${productId}`;
  
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

/**
 * Get account information
 */
export const getAccountInfo = async (): Promise<MerchantApiResponse> => {
  const endpoint = `accounts/${MERCHANT_CONFIG.MERCHANT_ID}`;
  
  console.log(`ℹ️  Getting account info for merchant: ${MERCHANT_CONFIG.MERCHANT_ID}`);
  return await makeApiRequest('GET', endpoint);
};
