/**
 * Stripe Webhook Handler for B2C Order Recovery
 * Handles payment_intent.succeeded events to create orders from Stripe metadata
 * This serves as a backup mechanism when client-side order creation fails
 */
export declare const stripeWebhookV2: import("firebase-functions/v2/https").HttpsFunction;
