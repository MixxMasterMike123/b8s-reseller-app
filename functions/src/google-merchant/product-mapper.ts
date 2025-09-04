/**
 * Product Data Mapper for Google Merchant Center
 * 
 * This module converts B8Shield Firestore product data to Google Shopping format.
 * Handles B2B/B2C availability, pricing, images, and product attributes.
 */

import { GOOGLE_PRODUCT_CATEGORIES, BRAND_INFO } from './config';

// Export interfaces and types for use in other modules

// B8Shield product interface (based on your Firestore structure)
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
  
  // Image URLs (Firebase Storage)
  imageUrl?: string;
  b2bImageUrl?: string;
  b2cImageUrl?: string;
  b2cImageGallery?: string[];
  eanImagePngUrl?: string;
  eanImageSvgUrl?: string;
  
  // B2B/B2C specific fields
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
  
  // Physical attributes for Google Shopping
  weight?: {
    value: number;
    unit: string; // 'g', 'kg', 'oz', 'lb'
  };
  dimensions?: {
    length: { value: number; unit: string };
    width: { value: number; unit: string };
    height: { value: number; unit: string };
  };
  
  // Shipping configuration
  shipping?: {
    sweden: { cost: number; service: string };
    nordic: { cost: number; service: string };
    eu: { cost: number; service: string };
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Google Shopping Product interface
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
export const mapProductToGoogleShopping = (
  product: B8ShieldProduct,
  options: {
    targetMarket?: 'b2b' | 'b2c';
    language?: string;
    country?: string;
  } = {}
): GoogleShoppingProduct | null => {
  const { targetMarket = 'b2c', language = 'sv', country = 'SE' } = options;
  
  // Skip if product is not active
  if (!product.isActive) {
    console.log(`⏭️  Skipping inactive product: ${product.name}`);
    return null;
  }
  
  // Skip if not available for target market
  if (targetMarket === 'b2c' && !product.availability?.b2c) {
    console.log(`⏭️  Skipping B2C unavailable product: ${product.name}`);
    return null;
  }
  
  if (targetMarket === 'b2b' && !product.availability?.b2b) {
    console.log(`⏭️  Skipping B2B unavailable product: ${product.name}`);
    return null;
  }
  
  // Determine price based on target market
  const price = targetMarket === 'b2c' 
    ? (product.b2cPrice || product.basePrice)
    : product.basePrice;
  
  // Determine description based on target market
  const description = targetMarket === 'b2c'
    ? (product.descriptions?.b2c || product.description)
    : (product.descriptions?.b2b || product.description);
  
  // Determine image based on target market
  const imageUrl = targetMarket === 'b2c'
    ? (product.b2cImageUrl || product.imageUrl)
    : (product.b2bImageUrl || product.imageUrl);
  
  // Additional images for B2C
  const additionalImages = targetMarket === 'b2c' && product.b2cImageGallery
    ? product.b2cImageGallery.filter(url => url !== imageUrl)
    : [];
  
  // Generate product URL
  const productUrl = targetMarket === 'b2c'
    ? `https://shop.b8shield.com/${country.toLowerCase()}/product/${product.id}`
    : `https://partner.b8shield.com/products/${product.id}`;
  
  // Create unique offer ID for this market
  const offerId = `${product.id}_${targetMarket}_${country}`;
  
  // Build Google Shopping product
  const googleProduct: GoogleShoppingProduct = {
    productId: product.id,
    contentLanguage: language,
    targetCountry: country,
    channel: 'online',
    offerId: offerId,
    title: product.name,
    description: description || product.name,
    link: productUrl,
    imageLink: imageUrl || '',
    condition: 'new',
    availability: 'in_stock', // TODO: Connect to actual inventory
    price: {
      value: price.toString(),
      currency: 'SEK'
    },
    brand: BRAND_INFO.name,
    googleProductCategory: GOOGLE_PRODUCT_CATEGORIES.fishing_lure_protection,
    customLabel0: product.size || 'Standard',
    customLabel1: product.color || 'Default',
    customLabel2: targetMarket.toUpperCase(),
    customLabel3: product.sku || product.id,
  };
  
  // Add additional images if available
  if (additionalImages.length > 0) {
    googleProduct.additionalImageLinks = additionalImages.slice(0, 10); // Google limit
  }
  
  // Add GTIN if available
  if (product.eanCode) {
    googleProduct.gtin = product.eanCode;
  }
  
  // Add MPN (use SKU as manufacturer part number)
  if (product.sku) {
    googleProduct.mpn = product.sku;
  }
  
  // Add physical dimensions and weight
  if (product.weight) {
    googleProduct.productWeight = {
      value: product.weight.value,
      unit: product.weight.unit
    };
  }
  
  if (product.dimensions) {
    if (product.dimensions.length) {
      googleProduct.productLength = {
        value: product.dimensions.length.value,
        unit: product.dimensions.length.unit
      };
    }
    if (product.dimensions.width) {
      googleProduct.productWidth = {
        value: product.dimensions.width.value,
        unit: product.dimensions.width.unit
      };
    }
    if (product.dimensions.height) {
      googleProduct.productHeight = {
        value: product.dimensions.height.value,
        unit: product.dimensions.height.unit
      };
    }
  }
  
  // Add shipping information
  googleProduct.shipping = [
    {
      country: 'SE',
      service: 'Standard',
      price: {
        value: '29',
        currency: 'SEK'
      }
    },
    {
      country: 'NO',
      service: 'Nordic',
      price: {
        value: '49',
        currency: 'SEK'
      }
    },
    {
      country: 'DK',
      service: 'Nordic',
      price: {
        value: '49',
        currency: 'SEK'
      }
    }
  ];
  
  return googleProduct;
};

/**
 * Batch convert multiple products
 */
export const mapProductsToGoogleShopping = (
  products: B8ShieldProduct[],
  options: {
    targetMarket?: 'b2b' | 'b2c';
    language?: string;
    country?: string;
  } = {}
): GoogleShoppingProduct[] => {
  const mappedProducts: GoogleShoppingProduct[] = [];
  
  for (const product of products) {
    const mapped = mapProductToGoogleShopping(product, options);
    if (mapped) {
      mappedProducts.push(mapped);
    }
  }
  
  console.log(`📦 Mapped ${mappedProducts.length}/${products.length} products to Google Shopping format`);
  return mappedProducts;
};

/**
 * Validate Google Shopping product data
 */
export const validateGoogleShoppingProduct = (product: GoogleShoppingProduct): string[] => {
  const errors: string[] = [];
  
  // Required fields
  if (!product.productId) errors.push('Missing productId');
  if (!product.title) errors.push('Missing title');
  if (!product.description) errors.push('Missing description');
  if (!product.link) errors.push('Missing link');
  if (!product.imageLink) errors.push('Missing imageLink');
  if (!product.price?.value) errors.push('Missing price');
  if (!product.brand) errors.push('Missing brand');
  if (!product.condition) errors.push('Missing condition');
  if (!product.availability) errors.push('Missing availability');
  
  // Validate price format
  if (product.price?.value && isNaN(Number(product.price.value))) {
    errors.push('Invalid price format');
  }
  
  // Validate URLs
  const urlFields = ['link', 'imageLink', ...(product.additionalImageLinks || [])];
  for (const url of urlFields) {
    if (url && !url.startsWith('http')) {
      errors.push(`Invalid URL: ${url}`);
    }
  }
  
  return errors;
};
