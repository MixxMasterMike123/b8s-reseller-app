/**
 * Product Data Mapper for Google Merchant Center
 *
 * This module converts B8Shield Firestore product data to Google Shopping format.
 * Handles B2B/B2C availability, pricing, images, and product attributes.
 */
interface B8ShieldProduct {
    id: string;
    name: string;
    sku: string;
    description: string;
    size: string;
    color: string;
    basePrice: number;
    manufacturingCost: number;
    isActive: boolean;
    eanCode?: string;
    imageUrl?: string;
    b2bImageUrl?: string;
    b2cImageUrl?: string;
    b2cImageGallery?: string[];
    eanImagePngUrl?: string;
    eanImageSvgUrl?: string;
    b2cPrice?: number;
    availability?: {
        b2b: boolean;
        b2c: boolean;
        b2bMinQuantity?: number;
        b2cMaxQuantity?: number;
    };
    descriptions?: {
        b2b: string;
        b2c: string;
    };
    weight?: {
        value: number;
        unit: string;
    };
    dimensions?: {
        length: {
            value: number;
            unit: string;
        };
        width: {
            value: number;
            unit: string;
        };
        height: {
            value: number;
            unit: string;
        };
    };
    shipping?: {
        sweden: {
            cost: number;
            service: string;
        };
        nordic: {
            cost: number;
            service: string;
        };
        eu: {
            cost: number;
            service: string;
        };
    };
    createdAt?: string;
    updatedAt?: string;
}
export interface GoogleShoppingProduct {
    productId: string;
    contentLanguage: string;
    targetCountry: string;
    channel: string;
    offerId: string;
    title: string;
    description: string;
    link: string;
    imageLink: string;
    additionalImageLinks?: string[];
    condition: string;
    availability: string;
    price: {
        value: string;
        currency: string;
    };
    brand: string;
    gtin?: string;
    mpn?: string;
    googleProductCategory: string;
    productTypes?: string[];
    customLabel0?: string;
    customLabel1?: string;
    customLabel2?: string;
    customLabel3?: string;
    customLabel4?: string;
    shipping?: Array<{
        country: string;
        service: string;
        price: {
            value: string;
            currency: string;
        };
    }>;
    productWeight?: {
        value: number;
        unit: string;
    };
    productLength?: {
        value: number;
        unit: string;
    };
    productWidth?: {
        value: number;
        unit: string;
    };
    productHeight?: {
        value: number;
        unit: string;
    };
}
/**
 * Convert B8Shield product to Google Shopping format
 */
export declare const mapProductToGoogleShopping: (product: B8ShieldProduct, options?: {
    targetMarket?: 'b2b' | 'b2c';
    language?: string;
    country?: string;
}) => GoogleShoppingProduct | null;
/**
 * Batch convert multiple products
 */
export declare const mapProductsToGoogleShopping: (products: B8ShieldProduct[], options?: {
    targetMarket?: 'b2b' | 'b2c';
    language?: string;
    country?: string;
}) => GoogleShoppingProduct[];
/**
 * Validate Google Shopping product data
 */
export declare const validateGoogleShoppingProduct: (product: GoogleShoppingProduct) => string[];
export {};
