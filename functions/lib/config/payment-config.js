"use strict";
/**
 * Payment Configuration for B8Shield
 * Manages Stripe, Klarna, and Swish credentials and settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPaymentMethodAvailable = exports.validatePaymentAmount = exports.getPaymentMethodsForCountry = exports.COUNTRY_PAYMENT_METHODS = exports.CURRENCY_CONFIG = exports.getPaymentConfig = void 0;
const firebase_functions_1 = require("firebase-functions");
/**
 * Get payment configuration from environment variables
 */
const getPaymentConfig = () => {
    const config = {
        stripe: {
            publicKey: process.env.STRIPE_PUBLIC_KEY || '',
            secretKey: process.env.STRIPE_SECRET_KEY || '',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
            apiVersion: '2023-10-16',
        },
        klarna: {
            username: process.env.KLARNA_USERNAME || '',
            password: process.env.KLARNA_PASSWORD || '',
            endpoint: process.env.KLARNA_ENDPOINT || 'https://api.klarna.com',
            environment: process.env.KLARNA_ENV || 'sandbox',
        },
        swish: {
            merchantId: process.env.SWISH_MERCHANT_ID || '',
            certificatePath: process.env.SWISH_CERTIFICATE_PATH || '',
            environment: process.env.SWISH_ENV || 'test',
            endpoint: process.env.SWISH_ENDPOINT || 'https://mss.cpc.getswish.net',
        },
    };
    // Validate required Stripe configuration
    if (!config.stripe.secretKey) {
        firebase_functions_1.logger.error('Missing required Stripe secret key');
        throw new Error('STRIPE_SECRET_KEY is required');
    }
    return config;
};
exports.getPaymentConfig = getPaymentConfig;
/**
 * Currency configuration for different payment methods
 */
exports.CURRENCY_CONFIG = {
    SEK: {
        stripe: true,
        klarna: true,
        swish: true,
        applePay: true,
        googlePay: true,
        minimumAmount: 100,
        maximumAmount: 10000000, // 100,000 SEK in öre
    },
    USD: {
        stripe: true,
        klarna: true,
        swish: false,
        applePay: true,
        googlePay: true,
        minimumAmount: 50,
        maximumAmount: 10000000, // $100,000 in cents
    },
    GBP: {
        stripe: true,
        klarna: true,
        swish: false,
        applePay: true,
        googlePay: true,
        minimumAmount: 30,
        maximumAmount: 10000000, // £100,000 in pence
    },
};
/**
 * Country-specific payment method availability
 */
exports.COUNTRY_PAYMENT_METHODS = {
    SE: ['stripe', 'klarna', 'swish', 'apple_pay', 'google_pay'],
    NO: ['stripe', 'klarna', 'apple_pay', 'google_pay'],
    DK: ['stripe', 'klarna', 'apple_pay', 'google_pay'],
    FI: ['stripe', 'klarna', 'apple_pay', 'google_pay'],
    US: ['stripe', 'klarna', 'apple_pay', 'google_pay'],
    GB: ['stripe', 'klarna', 'apple_pay', 'google_pay'],
    DE: ['stripe', 'klarna', 'apple_pay', 'google_pay'],
    // Add more countries as needed
};
/**
 * Get available payment methods for a country
 */
const getPaymentMethodsForCountry = (countryCode) => {
    return exports.COUNTRY_PAYMENT_METHODS[countryCode] ||
        ['stripe', 'apple_pay', 'google_pay']; // Default fallback
};
exports.getPaymentMethodsForCountry = getPaymentMethodsForCountry;
/**
 * Validate payment amount for currency
 */
const validatePaymentAmount = (amount, currency) => {
    const currencyConfig = exports.CURRENCY_CONFIG[currency];
    if (!currencyConfig)
        return false;
    return amount >= currencyConfig.minimumAmount && amount <= currencyConfig.maximumAmount;
};
exports.validatePaymentAmount = validatePaymentAmount;
/**
 * Check if payment method is available for currency
 */
const isPaymentMethodAvailable = (method, currency) => {
    const currencyConfig = exports.CURRENCY_CONFIG[currency];
    if (!currencyConfig)
        return false;
    switch (method) {
        case 'stripe':
            return currencyConfig.stripe;
        case 'klarna':
            return currencyConfig.klarna;
        case 'swish':
            return currencyConfig.swish;
        case 'apple_pay':
            return currencyConfig.applePay;
        case 'google_pay':
            return currencyConfig.googlePay;
        default:
            return false;
    }
};
exports.isPaymentMethodAvailable = isPaymentMethodAvailable;
//# sourceMappingURL=payment-config.js.map