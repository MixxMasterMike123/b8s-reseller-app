/**
 * Payment Configuration for B8Shield
 * Manages Stripe, Klarna, and Swish credentials and settings
 */
export interface PaymentConfig {
    stripe: {
        publicKey: string;
        secretKey: string;
        webhookSecret: string;
        apiVersion: string;
    };
    klarna: {
        username: string;
        password: string;
        endpoint: string;
        environment: 'sandbox' | 'production';
    };
    swish: {
        merchantId: string;
        certificatePath: string;
        environment: 'test' | 'production';
        endpoint: string;
    };
}
/**
 * Get payment configuration from environment variables
 */
export declare const getPaymentConfig: () => PaymentConfig;
/**
 * Currency configuration for different payment methods
 */
export declare const CURRENCY_CONFIG: {
    SEK: {
        stripe: boolean;
        klarna: boolean;
        swish: boolean;
        applePay: boolean;
        googlePay: boolean;
        minimumAmount: number;
        maximumAmount: number;
    };
    USD: {
        stripe: boolean;
        klarna: boolean;
        swish: boolean;
        applePay: boolean;
        googlePay: boolean;
        minimumAmount: number;
        maximumAmount: number;
    };
    GBP: {
        stripe: boolean;
        klarna: boolean;
        swish: boolean;
        applePay: boolean;
        googlePay: boolean;
        minimumAmount: number;
        maximumAmount: number;
    };
};
/**
 * Country-specific payment method availability
 */
export declare const COUNTRY_PAYMENT_METHODS: {
    SE: string[];
    NO: string[];
    DK: string[];
    FI: string[];
    US: string[];
    GB: string[];
    DE: string[];
};
/**
 * Get available payment methods for a country
 */
export declare const getPaymentMethodsForCountry: (countryCode: string) => string[];
/**
 * Validate payment amount for currency
 */
export declare const validatePaymentAmount: (amount: number, currency: string) => boolean;
/**
 * Check if payment method is available for currency
 */
export declare const isPaymentMethodAvailable: (method: string, currency: string) => boolean;
