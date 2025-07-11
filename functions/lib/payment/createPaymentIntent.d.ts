/**
 * Firebase Function for creating Stripe Payment Intents
 * Handles multi-currency payments with affiliate tracking
 */
import { https } from 'firebase-functions/v2';
/**
 * Creates a Stripe Payment Intent for B8Shield orders
 * Supports multi-currency and affiliate tracking
 */
export declare const createPaymentIntent: https.HttpsFunction;
/**
 * Webhook handler for Stripe events
 * Processes payment confirmations and updates orders
 */
export declare const handleStripeWebhook: https.HttpsFunction;
