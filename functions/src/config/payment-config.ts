/**
 * Payment Configuration for B8Shield
 * Manages Stripe, Klarna, and Swish credentials and settings
 */

import { logger } from 'firebase-functions';

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
export const getPaymentConfig = (): PaymentConfig => {
  const config: PaymentConfig = {
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
      environment: (process.env.KLARNA_ENV as 'sandbox' | 'production') || 'sandbox',
    },
    swish: {
      merchantId: process.env.SWISH_MERCHANT_ID || '',
      certificatePath: process.env.SWISH_CERTIFICATE_PATH || '',
      environment: (process.env.SWISH_ENV as 'test' | 'production') || 'test',
      endpoint: process.env.SWISH_ENDPOINT || 'https://mss.cpc.getswish.net',
    },
  };

  // Validate required Stripe configuration
  if (!config.stripe.secretKey) {
    logger.error('Missing required Stripe secret key');
    throw new Error('STRIPE_SECRET_KEY is required');
  }

  return config;
};

/**
 * Currency configuration for different payment methods
 */
export const CURRENCY_CONFIG = {
  SEK: {
    stripe: true,
    klarna: true,
    swish: true,
    applePay: true,
    googlePay: true,
    minimumAmount: 100, // 1 SEK in öre
    maximumAmount: 10000000, // 100,000 SEK in öre
  },
  USD: {
    stripe: true,
    klarna: true,
    swish: false,
    applePay: true,
    googlePay: true,
    minimumAmount: 50, // $0.50 in cents
    maximumAmount: 10000000, // $100,000 in cents
  },
  GBP: {
    stripe: true,
    klarna: true,
    swish: false,
    applePay: true,
    googlePay: true,
    minimumAmount: 30, // £0.30 in pence
    maximumAmount: 10000000, // £100,000 in pence
  },
};

/**
 * Country-specific payment method availability
 */
export const COUNTRY_PAYMENT_METHODS = {
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
export const getPaymentMethodsForCountry = (countryCode: string): string[] => {
  return COUNTRY_PAYMENT_METHODS[countryCode as keyof typeof COUNTRY_PAYMENT_METHODS] || 
         ['stripe', 'apple_pay', 'google_pay']; // Default fallback
};

/**
 * Validate payment amount for currency
 */
export const validatePaymentAmount = (amount: number, currency: string): boolean => {
  const currencyConfig = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG];
  if (!currencyConfig) return false;

  return amount >= currencyConfig.minimumAmount && amount <= currencyConfig.maximumAmount;
};

/**
 * Check if payment method is available for currency
 */
export const isPaymentMethodAvailable = (method: string, currency: string): boolean => {
  const currencyConfig = CURRENCY_CONFIG[currency as keyof typeof CURRENCY_CONFIG];
  if (!currencyConfig) return false;

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