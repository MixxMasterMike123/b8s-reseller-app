/**
 * Google Merchant Center API Client
 *
 * This module handles direct API communication with Google Merchant Center.
 * Provides functions to create, update, and delete products in Google Shopping.
 */
import type { GoogleShoppingProduct } from './product-mapper';
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
 * Insert a single product into Google Merchant Center
 */
export declare const insertProduct: (product: GoogleShoppingProduct) => Promise<MerchantApiResponse<ProductInsertResponse>>;
/**
 * Update an existing product in Google Merchant Center
 */
export declare const updateProduct: (product: GoogleShoppingProduct) => Promise<MerchantApiResponse<ProductInsertResponse>>;
/**
 * Delete a product from Google Merchant Center
 */
export declare const deleteProduct: (productId: string, offerId: string, contentLanguage?: string, targetCountry?: string) => Promise<MerchantApiResponse>;
/**
 * Get product status from Google Merchant Center
 */
export declare const getProductStatus: (productId: string, contentLanguage?: string, targetCountry?: string) => Promise<MerchantApiResponse>;
/**
 * List all products in Google Merchant Center
 */
export declare const listProducts: (maxResults?: number, pageToken?: string) => Promise<MerchantApiResponse>;
/**
 * Batch insert multiple products
 */
export declare const batchInsertProducts: (products: GoogleShoppingProduct[]) => Promise<MerchantApiResponse[]>;
/**
 * Sync product inventory/availability
 */
export declare const updateProductInventory: (productId: string, offerId: string, availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder', price?: {
    value: string;
    currency: string;
}, contentLanguage?: string, targetCountry?: string) => Promise<MerchantApiResponse>;
/**
 * Get account information
 */
export declare const getAccountInfo: () => Promise<MerchantApiResponse>;
