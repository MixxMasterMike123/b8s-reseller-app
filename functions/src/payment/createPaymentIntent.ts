/**
 * Firebase Function: Create Stripe Payment Intent
 * Handles server-side payment intent creation for B2C checkout
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';
import { corsHandler } from '../protection/cors/cors-handler';
import { db } from '../config/database';

/**
 * Server-side price computation. NEVER trust client-supplied amounts:
 * prices come from the products collection, the discount from the affiliate
 * doc, and shipping from product shipping data (mirrors CartContext logic).
 * All amounts are SEK, VAT-inclusive.
 */
function getShippingRegion(country: string): string {
  if (country === 'SE') return 'sweden';
  if (['NO', 'DK', 'FI'].includes(country)) return 'nordic';
  const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES'];
  return euCountries.includes(country) ? 'eu' : 'worldwide';
}

async function computeOrderTotalsSek(
  cartItems: Array<{ id: string; quantity: number }>,
  shippingCountry: string,
  discountCode?: string
): Promise<{ subtotal: number; discountAmount: number; discountPercentage: number; shipping: number; vat: number; total: number; serverPrices: Record<string, number> }> {
  // Load every product server-side; reject unknown or inactive products
  const loaded = await Promise.all(cartItems.map(async (item) => {
    const quantity = Math.floor(Number(item.quantity));
    if (!item.id || !Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
      throw new Error(`Invalid cart item: ${item.id}`);
    }
    const snap = await db.collection('products').doc(item.id).get();
    if (!snap.exists) {
      throw new Error(`Unknown product: ${item.id}`);
    }
    const product = snap.data() as any;
    if (product.isActive === false) {
      throw new Error(`Product not available: ${item.id}`);
    }
    const price = product.b2cPrice || product.basePrice || 0;
    if (!price || price <= 0) {
      throw new Error(`Product has no valid price: ${item.id}`);
    }
    return { id: item.id, quantity, price, product };
  }));

  const serverPrices: Record<string, number> = {};
  for (const { id, price } of loaded) {
    serverPrices[id] = price;
  }

  const subtotal = loaded.reduce((sum, { price, quantity }) => sum + price * quantity, 0);

  // Discount from the affiliate doc (not from the client)
  let discountAmount = 0;
  let discountPercentage = 0;
  if (discountCode) {
    const affSnap = await db.collection('affiliates')
      .where('affiliateCode', '==', discountCode.toUpperCase())
      .where('status', '==', 'active')
      .limit(1)
      .get();
    if (!affSnap.empty) {
      discountPercentage = affSnap.docs[0].data().checkoutDiscount || 0;
      // Math.ceil matches the client-side CartContext rounding
      discountAmount = Math.ceil(subtotal * (discountPercentage / 100));
    }
  }

  // Shipping mirrors CartContext.getShippingCost: base cost from the first
  // product's shipping table for the region, multiplied by 50g weight tiers
  const region = getShippingRegion(shippingCountry);
  let baseShippingCost = loaded[0]?.product?.shipping?.[region]?.cost || 0;
  if (baseShippingCost === 0) {
    baseShippingCost = shippingCountry === 'SE' ? 29 : 49;
  }
  const totalWeight = loaded.reduce((sum, { product, quantity }) =>
    sum + ((product.weight?.value || 10) * quantity), 0) + 20;
  const shipping = baseShippingCost * Math.ceil(totalWeight / 50);

  const total = subtotal - discountAmount + shipping;
  const vat = total - (total / 1.25);

  return { subtotal, discountAmount, discountPercentage, shipping, vat, total, serverPrices };
}

interface CreatePaymentIntentRequest {
  amount?: number; // Client display amount in SEK — logged for drift detection only; the charge is computed server-side
  currency: string; // Should be 'sek'
  b2cCustomerId?: string; // Existing/just-created customer doc id for order linkage
  b2cCustomerAuthId?: string; // Firebase Auth uid for order linkage
  cartItems: Array<{
    id: string;
    name: string | { 'sv-SE'?: string; 'en-GB'?: string; 'en-US'?: string; [key: string]: string | undefined };
    price: number;
    quantity: number;
    sku: string;
    color?: string; // Product color
    size?: string;  // Product size
    image?: string; // Product image URL
  }>;
  customerInfo: {
    email: string;
    name: string;
    firstName?: string; // For enhanced metadata
    lastName?: string;  // For enhanced metadata
    marketing?: boolean; // Marketing consent
    preferredLang?: string; // Language preference
  };
  shippingInfo: {
    country: string;
    cost: number;
    firstName?: string;   // Shipping address details
    lastName?: string;
    address?: string;
    apartment?: string;
    city?: string;
    postalCode?: string;
  };
  discountInfo?: {
    code: string;
    amount: number;
    percentage: number;
  };
  affiliateInfo?: {
    code: string;
    clickId: string;
  };
  // Enhanced totals for complete order reconstruction
  totals?: {
    subtotal: number;
    vat: number;
    shipping: number;
    discountAmount: number;
    total: number;
  };
}

export const createPaymentIntentV2 = onRequest(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    secrets: ['STRIPE_SECRET_KEY'],
  },
  async (request, response) => {
    try {
      // Handle CORS
      if (!corsHandler(request, response)) {
        return;
      }

      // Handle preflight OPTIONS request
      if (request.method === 'OPTIONS') {
        response.status(200).send('OK');
        return;
      }

      // Only allow POST requests
      if (request.method !== 'POST') {
        response.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Initialize Stripe with secret key from environment variable
      const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
      
      if (!stripeSecretKey) {
        logger.error('❌ STRIPE_SECRET_KEY not found in environment');
        response.status(500).json({ error: 'Payment service configuration error' });
        return;
      }

      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });

      logger.info('💳 Creating Stripe Payment Intent', {
        itemCount: request.body.cartItems?.length || 0,
        currency: request.body.currency,
        hasDiscount: !!(request.body.discountInfo?.code || request.body.affiliateInfo?.code)
      });

      // Validate request
      if (!request.body) {
        response.status(400).json({ error: 'Request body is required' });
        return;
      }

      const {
        amount,
        currency = 'sek',
        cartItems,
        customerInfo,
        shippingInfo,
        discountInfo,
        affiliateInfo
      }: CreatePaymentIntentRequest = request.body;

      // Validate required fields
      if (!cartItems || cartItems.length === 0 || cartItems.length > 100) {
        response.status(400).json({ error: 'Cart items are required' });
        return;
      }

      if (!customerInfo?.email) {
        response.status(400).json({ error: 'Customer email is required' });
        return;
      }

      if (currency.toLowerCase() !== 'sek') {
        // Payments are charged in SEK; other currencies are display-only
        response.status(400).json({ error: 'Unsupported currency' });
        return;
      }

      // 🛡️ SECURITY: compute the amount server-side from the products
      // collection. The client-sent amount is only logged for drift detection.
      const discountCode = discountInfo?.code || affiliateInfo?.code;
      let totals: Awaited<ReturnType<typeof computeOrderTotalsSek>>;
      try {
        totals = await computeOrderTotalsSek(
          cartItems,
          shippingInfo?.country || 'SE',
          discountCode
        );
      } catch (calcError: any) {
        logger.error('❌ Server-side price computation failed', { error: calcError.message });
        response.status(400).json({ error: 'Invalid cart contents' });
        return;
      }

      const amountInOre = Math.round(totals.total * 100);

      if (typeof amount === 'number' && Math.abs(amount - totals.total) > 1) {
        logger.warn('⚠️ Client amount differs from server-computed total — charging server total', {
          clientAmount: amount,
          serverTotal: totals.total
        });
      }

      logger.info('💰 Payment details (server-computed)', {
        amountInSEK: totals.total,
        amountInOre,
        currency,
        itemCount: cartItems.length
      });

      // Create Payment Intent with simplified configuration for live mode
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: amountInOre,
          currency: currency.toLowerCase(),
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            // ✅ ENHANCED METADATA FOR COMPLETE ORDER RECOVERY
            
            // Customer Information (enhanced)
            customerEmail: customerInfo.email,
            customerName: customerInfo.name || '',
            customerFirstName: customerInfo.firstName || shippingInfo.firstName || '',
            customerLastName: customerInfo.lastName || shippingInfo.lastName || '',
            customerMarketing: (customerInfo.marketing || false).toString(),
            customerLang: customerInfo.preferredLang || 'sv-SE',
            
            // Shipping Information (complete address)
            shippingFirstName: shippingInfo.firstName || '',
            shippingLastName: shippingInfo.lastName || '',
            shippingAddress: shippingInfo.address || '',
            shippingApartment: shippingInfo.apartment || '',
            shippingCity: shippingInfo.city || '',
            shippingPostalCode: shippingInfo.postalCode || '',
            shippingCountry: shippingInfo.country || 'SE',
            shippingCost: (shippingInfo.cost || 0).toString(),
            
            // Order Totals (server-computed breakdown — single source of truth)
            subtotal: totals.subtotal.toString(),
            vat: totals.vat.toFixed(2),
            shipping: totals.shipping.toString(),
            discountAmount: totals.discountAmount.toString(),
            total: totals.total.toString(),

            // Discount Information (server-validated)
            ...(discountCode && totals.discountAmount > 0 && {
              discountCode: discountCode.toUpperCase(),
              discountPercentage: totals.discountPercentage.toString(),
            }),
            
            // Affiliate Information (enhanced)
            ...(affiliateInfo && {
              affiliateCode: affiliateInfo.code,
              affiliateClickId: affiliateInfo.clickId,
            }),
            
            // Cart Items (detailed for recovery)
            itemCount: cartItems.length.toString(),
            totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0).toString(),
            
            // Store complete item details as JSON (within Stripe limits).
            // Prices come from the server-side computation, not the client.
            itemDetails: JSON.stringify(cartItems.map(item => ({
              id: item.id,
              sku: item.sku,
              name: typeof item.name === 'string' ? item.name : item.name?.['sv-SE'] || item.name?.['en-US'] || 'Product',
              price: totals.serverPrices[item.id] ?? item.price,
              quantity: item.quantity,
              color: item.color || '',
              size: item.size || '',
              image: item.image || ''
            }))),
            
            // Legacy compatibility (keep existing fields)
            itemIds: cartItems.map(item => item.id.substring(0, 8)).join(','),
            cartSummary: cartItems.map(item => `${item.quantity}x${item.sku}`).join(','),
            
            // B2C customer account linkage (set when the buyer has/creates an account)
            ...(request.body.b2cCustomerId && {
              b2cCustomerId: request.body.b2cCustomerId,
              b2cCustomerAuthId: request.body.b2cCustomerAuthId || ''
            }),

            // System identifiers
            source: 'b2c_shop',
            platform: 'b8shield',
            version: 'enhanced_v2' // server-priced metadata
          },
          receipt_email: customerInfo.email,
          description: `B8Shield Order - ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`,
        });
      } catch (stripeError: any) {
        logger.error('❌ Stripe Payment Intent creation failed', {
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode,
          requestParams: {
            amount: amountInOre,
            currency: currency.toLowerCase(),
            customerEmail: customerInfo.email
          }
        });
        
        response.status(400).json({ 
          error: 'Payment intent creation failed',
          details: stripeError.message,
          success: false
        });
        return;
      }

      logger.info('✅ Payment Intent created successfully', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      });

      response.status(200).json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      });

    } catch (error) {
      logger.error('❌ Error creating Payment Intent', error);
      
      // Handle Stripe errors
      if (error instanceof Stripe.errors.StripeError) {
        response.status(400).json({ error: `Stripe error: ${error.message}` });
        return;
      }

      response.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
);