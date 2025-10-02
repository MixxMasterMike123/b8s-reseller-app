"use strict";
/**
 * Product Data Mapper for Google Merchant Center
 *
 * This module converts B8Shield Firestore product data to Google Shopping format.
 * Handles B2B/B2C availability, pricing, images, and product attributes.
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.validateGoogleShoppingProduct = exports.mapProductsToGoogleShopping = exports.mapProductToGoogleShopping = void 0;
var config_1 = require("./config");
/**
 * Convert B8Shield product to Google Shopping format
 */
var mapProductToGoogleShopping = function (product, options) {
    var _a, _b, _c, _d;
    if (options === void 0) { options = {}; }
    var _e = options.targetMarket, targetMarket = _e === void 0 ? 'b2c' : _e, _f = options.language, language = _f === void 0 ? 'sv' : _f, _g = options.country, country = _g === void 0 ? 'SE' : _g;
    // Skip if product is not active
    if (!product.isActive) {
        console.log("\u23ED\uFE0F  Skipping inactive product: ".concat(product.name));
        return null;
    }
    // Skip if not available for target market
    if (targetMarket === 'b2c' && !((_a = product.availability) === null || _a === void 0 ? void 0 : _a.b2c)) {
        console.log("\u23ED\uFE0F  Skipping B2C unavailable product: ".concat(product.name));
        return null;
    }
    if (targetMarket === 'b2b' && !((_b = product.availability) === null || _b === void 0 ? void 0 : _b.b2b)) {
        console.log("\u23ED\uFE0F  Skipping B2B unavailable product: ".concat(product.name));
        return null;
    }
    // Determine price based on target market
    var price = targetMarket === 'b2c'
        ? (product.b2cPrice || product.basePrice)
        : product.basePrice;
    // Determine description based on target market
    var description = targetMarket === 'b2c'
        ? (((_c = product.descriptions) === null || _c === void 0 ? void 0 : _c.b2c) || product.description)
        : (((_d = product.descriptions) === null || _d === void 0 ? void 0 : _d.b2b) || product.description);
    // Determine image based on target market
    var imageUrl = targetMarket === 'b2c'
        ? (product.b2cImageUrl || product.imageUrl)
        : (product.b2bImageUrl || product.imageUrl);
    // Additional images for B2C
    var additionalImages = targetMarket === 'b2c' && product.b2cImageGallery
        ? product.b2cImageGallery.filter(function (url) { return url !== imageUrl; })
        : [];
    // Generate product URL
    var productUrl = targetMarket === 'b2c'
        ? "https://shop.b8shield.com/".concat(country.toLowerCase(), "/product/").concat(product.id)
        : "https://partner.b8shield.com/products/".concat(product.id);
    // Create unique offer ID for this market
    var offerId = "".concat(product.id, "_").concat(targetMarket, "_").concat(country);
    // Build Google Shopping product
    var googleProduct = {
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
        customLabel3: product.sku || product.id
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
var mapProductsToGoogleShopping = function (products, options) {
    if (options === void 0) { options = {}; }
    var mappedProducts = [];
    for (var _i = 0, products_1 = products; _i < products_1.length; _i++) {
        var product = products_1[_i];
        var mapped = (0, exports.mapProductToGoogleShopping)(product, options);
        if (mapped) {
            mappedProducts.push(mapped);
        }
    }
    console.log("\uD83D\uDCE6 Mapped ".concat(mappedProducts.length, "/").concat(products.length, " products to Google Shopping format"));
    return mappedProducts;
};
exports.mapProductsToGoogleShopping = mapProductsToGoogleShopping;
/**
 * Validate Google Shopping product data
 */
var validateGoogleShoppingProduct = function (product) {
    var _a, _b;
    var errors = [];
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
    if (!((_a = product.price) === null || _a === void 0 ? void 0 : _a.value))
        errors.push('Missing price');
    if (!product.brand)
        errors.push('Missing brand');
    if (!product.condition)
        errors.push('Missing condition');
    if (!product.availability)
        errors.push('Missing availability');
    // Validate price format
    if (((_b = product.price) === null || _b === void 0 ? void 0 : _b.value) && isNaN(Number(product.price.value))) {
        errors.push('Invalid price format');
    }
    // Validate URLs
    var urlFields = __spreadArray(['link', 'imageLink'], (product.additionalImageLinks || []), true);
    for (var _i = 0, urlFields_1 = urlFields; _i < urlFields_1.length; _i++) {
        var url = urlFields_1[_i];
        if (url && !url.startsWith('http')) {
            errors.push("Invalid URL: ".concat(url));
        }
    }
    return errors;
};
exports.validateGoogleShoppingProduct = validateGoogleShoppingProduct;
