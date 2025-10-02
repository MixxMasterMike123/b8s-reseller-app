"use strict";
/**
 * Product Data Mapper for Google Merchant Center
 *
 * This module converts B8Shield Firestore product data to Google Shopping format.
 * Handles B2B/B2C availability, pricing, images, and product attributes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGoogleShoppingProduct = exports.mapProductsToGoogleShopping = exports.mapProductToGoogleShopping = void 0;
const config_1 = require("./config");
/**
 * Convert B8Shield product to Google Shopping format
 */
const mapProductToGoogleShopping = (product, options = {}) => {
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
    const googleProduct = {
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
        availability: 'in_stock',
        price: {
            value: price.toString(),
            currency: 'SEK'
        },
        brand: config_1.BRAND_INFO.name,
        googleProductCategory: config_1.GOOGLE_PRODUCT_CATEGORIES.fishing_lure_protection,
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
exports.mapProductToGoogleShopping = mapProductToGoogleShopping;
/**
 * Batch convert multiple products
 */
const mapProductsToGoogleShopping = (products, options = {}) => {
    const mappedProducts = [];
    for (const product of products) {
        const mapped = (0, exports.mapProductToGoogleShopping)(product, options);
        if (mapped) {
            mappedProducts.push(mapped);
        }
    }
    console.log(`📦 Mapped ${mappedProducts.length}/${products.length} products to Google Shopping format`);
    return mappedProducts;
};
exports.mapProductsToGoogleShopping = mapProductsToGoogleShopping;
/**
 * Validate Google Shopping product data
 */
const validateGoogleShoppingProduct = (product) => {
    const errors = [];
    // Required fields
    if (!product.productId)
        errors.push('Missing productId');
    if (!product.title)
        errors.push('Missing title');
    if (!product.description)
        errors.push('Missing description');
    if (!product.link)
        errors.push('Missing link');
    if (!product.imageLink)
        errors.push('Missing imageLink');
    if (!product.price?.value)
        errors.push('Missing price');
    if (!product.brand)
        errors.push('Missing brand');
    if (!product.condition)
        errors.push('Missing condition');
    if (!product.availability)
        errors.push('Missing availability');
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
exports.validateGoogleShoppingProduct = validateGoogleShoppingProduct;
//# sourceMappingURL=product-mapper.js.map