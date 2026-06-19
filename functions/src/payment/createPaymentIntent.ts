/**
 * Firebase Function: Create Stripe Payment Intent
 * Handles server-side payment intent creation for B2C checkout
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';
import { commerceConfig } from '../config/app-urls';
import { corsHandler } from '../protection/cors/cors-handler';
import { db } from '../config/database';
import { DEFAULT_SHOP_ID } from '../config/tenancy';
import { isShopFeatureEnabled } from '../config/shopFeatures';
import { computeApplicationFeeOre, resolveCommissionBps } from './connectFee';

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
  cartItems: Array<{ productId?: string; id?: string; variantSku?: string | null; quantity: number }>,
  shippingCountry: string,
  discountCode: string | undefined,
  shopId: string,
  deliveryMethod: string
): Promise<{ subtotal: number; discountAmount: number; discountPercentage: number; shipping: number; vat: number; total: number; serverPrices: Record<string, number> }> {
  // Product model v2: line items reference the PARENT product by productId plus
  // an optional variantSku. We load the parent doc and resolve the variant's
  // price from the embedded variants array — never trusting the client price.
  const loaded = await Promise.all(cartItems.map(async (item) => {
    const productId = item.productId || item.id; // tolerate either key
    const quantity = Math.floor(Number(item.quantity));
    if (!productId || !Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
      throw new Error(`Invalid cart item: ${productId}`);
    }
    const snap = await db.collection('products').doc(productId).get();
    if (!snap.exists) {
      throw new Error(`Unknown product: ${productId}`);
    }
    const product = snap.data() as any;
    if (product.isActive === false) {
      throw new Error(`Product not available: ${productId}`);
    }

    // Per-product delivery modes (Delivery & Pickup v2). Default-ON: a product
    // without the `delivery` field permits both methods. Reject a charge whose
    // delivery method is disabled for this product — anti-tamper backstop for the
    // client-side restriction (a tampered client could otherwise send 'pickup'
    // for a shipping-only product to zero shipping, or 'home' for a pickup-only
    // one). The legitimate client never sends a disabled method.
    if (deliveryMethod === 'pickup' && product.delivery?.pickup === false) {
      throw new Error(`Product not available for pickup: ${productId}`);
    }
    if (deliveryMethod === 'home' && product.delivery?.shipping === false) {
      throw new Error(`Product not available for home delivery: ${productId}`);
    }

    // Resolve price: a chosen variant's price (matched by sku) wins, else the
    // product price. A variantSku that doesn't match any variant is rejected.
    let price = product.b2cPrice || product.basePrice || 0;
    const variantSku = item.variantSku || null;
    if (variantSku) {
      const variant = Array.isArray(product.variants)
        ? product.variants.find((v: any) => v && v.sku === variantSku)
        : null;
      if (!variant) {
        throw new Error(`Unknown variant ${variantSku} for product ${productId}`);
      }
      price = (variant.price ?? null) !== null ? variant.price : price;
    }
    if (!price || price <= 0) {
      throw new Error(`Product has no valid price: ${productId}`);
    }
    const lineKey = `${productId}::${variantSku || ''}`;
    return { lineKey, productId, variantSku, quantity, price, product };
  }));

  const serverPrices: Record<string, number> = {};
  for (const { lineKey, price } of loaded) {
    serverPrices[lineKey] = price;
  }

  const subtotal = loaded.reduce((sum, { price, quantity }) => sum + price * quantity, 0);

  // Discount from the affiliate doc (not from the client). GATED on the
  // affiliate add-on: when the shop has affiliate disabled, the code is ignored
  // and no discount applies — this MUST match the client gate in
  // CartContext.applyDiscountCode, or the charge diverges from the displayed
  // total (total-parity). Default-ON (existing shops unaffected).
  let discountAmount = 0;
  let discountPercentage = 0;
  if (discountCode && await isShopFeatureEnabled(shopId, 'affiliate')) {
    const affSnap = await db.collection('affiliates')
      .where('shopId', '==', shopId)
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
  // product's shipping table for the region, multiplied by 50g weight tiers.
  // Click & Collect (pickup) has NO shipping — mirrors the client (CartContext
  // calculateTotals), so the server-computed total matches the charge.
  let shipping = 0;
  if (deliveryMethod !== 'pickup') {
    const region = getShippingRegion(shippingCountry);
    let baseShippingCost = loaded[0]?.product?.shipping?.[region]?.cost || 0;
    if (baseShippingCost === 0) {
      baseShippingCost = shippingCountry === 'SE' ? 29 : 49;
    }
    const totalWeight = loaded.reduce((sum, { product, quantity }) =>
      sum + ((product.weight?.value || 10) * quantity), 0) + 20;
    shipping = baseShippingCost * Math.ceil(totalWeight / 50);
  }

  const total = subtotal - discountAmount + shipping;
  const vat = total - (total / (1 + commerceConfig.vatRate));

  return { subtotal, discountAmount, discountPercentage, shipping, vat, total, serverPrices };
}

interface CreatePaymentIntentRequest {
  amount?: number; // Client display amount in SEK — logged for drift detection only; the charge is computed server-side
  currency: string; // Should be 'sek'
  b2cCustomerId?: string; // Existing/just-created customer doc id for order linkage
  b2cCustomerAuthId?: string; // Firebase Auth uid for order linkage
  shopId?: string; // Tenant id — written into metadata; webhook stamps it on the order
  cartItems: Array<{
    productId?: string;      // v2: parent product id
    id?: string;             // legacy fallback
    variantSku?: string | null; // v2: chosen variant sku (null = no variant)
    label?: string;          // v2: variant label snapshot
    name: string | { 'sv-SE'?: string; 'en-GB'?: string; 'en-US'?: string; [key: string]: string | undefined };
    price: number;
    quantity: number;
    sku: string;
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
  // Delivery method (Click & Collect). When method==='pickup', shipping is 0
  // (server-enforced) and the pickup location is carried to the order.
  deliveryInfo?: {
    method: 'home' | 'pickup';
    pickupLocationId?: string;
    pickupLocationName?: string;
    pickupLocationAddress?: string;
    pickupLocationDate?: string; // chosen pickup date, ISO YYYY-MM-DD (optional)
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
        currency = commerceConfig.currency.toLowerCase(),
        cartItems,
        customerInfo,
        shippingInfo,
        discountInfo,
        affiliateInfo,
        deliveryInfo,
        shopId
      }: CreatePaymentIntentRequest = request.body;

      // Click & Collect: 'pickup' makes shipping free and is stamped on the order.
      const deliveryMethod = deliveryInfo?.method === 'pickup' ? 'pickup' : 'home';

      // Tenant id for the order. Phase 0/1 is single-shop, so this normalizes
      // to the default; the field is carried through metadata → webhook → order
      // so the plumbing is correct before multi-shop exists.
      const resolvedShopId = shopId || DEFAULT_SHOP_ID;

      // TENANT ISOLATION (H1): validate the (client-supplied) shopId names a real
      // shop before charging against it — reject unknown tenants. Deriving the
      // shopId from the request origin instead of trusting the payload is a
      // future hardening pass (H1, out of scope here).
      const shopSnap = await db.collection('shops').doc(resolvedShopId).get();
      if (!shopSnap.exists) {
        response.status(400).json({ error: 'Unknown shop' });
        return;
      }

      // Validate required fields
      if (!cartItems || cartItems.length === 0 || cartItems.length > 100) {
        response.status(400).json({ error: 'Cart items are required' });
        return;
      }

      if (!customerInfo?.email) {
        response.status(400).json({ error: 'Customer email is required' });
        return;
      }

      if (currency.toLowerCase() !== commerceConfig.currency.toLowerCase()) {
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
          discountCode,
          resolvedShopId,
          deliveryMethod
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

      // 💸 STRIPE CONNECT (opt-in per shop). If this shop has a usable connected
      // account, make this a DESTINATION CHARGE: the full amount transfers to
      // the shop's account minus the platform's cut (application_fee_amount).
      // A shop WITHOUT chargesEnabled stays on the legacy single-account flow —
      // connectParams/connectMeta are then empty and the create call below is
      // byte-identical to before. NO on_behalf_of → platform stays VAT merchant
      // of record. The fee is taken off the GROSS total (documented choice).
      const pay = (shopSnap.data() as any)?.payments || {};
      const useConnect = pay.chargesEnabled === true && !!pay.stripeAccountId;
      let connectParams: Record<string, any> = {};
      let connectMeta: Record<string, string> = {};
      if (useConnect) {
        // Resolve the per-shop commission, falling back to the platform default
        // (settings/platform.defaultCommissionBps, else commerceConfig env).
        let platformDefaultBps = commerceConfig.defaultCommissionBps;
        try {
          const ps = await db.collection('settings').doc('platform').get();
          const v = ps.exists ? (ps.data() as any)?.defaultCommissionBps : undefined;
          if (Number.isInteger(v)) platformDefaultBps = v;
        } catch { /* keep env default */ }
        const bps = resolveCommissionBps(pay.commissionBps, platformDefaultBps);
        const feeOre = computeApplicationFeeOre(amountInOre, bps);
        connectParams = {
          transfer_data: { destination: pay.stripeAccountId },
          application_fee_amount: feeOre,
        };
        connectMeta = {
          connectedAccountId: pay.stripeAccountId,
          applicationFeeAmount: feeOre.toString(),
          commissionBps: bps.toString(),
        };
        logger.info('💸 Destination charge', { shopId: resolvedShopId, connectedAccountId: pay.stripeAccountId, feeOre, bps });
      }

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

            // Delivery method (Click & Collect) — carried to the order by the webhook.
            deliveryMethod,
            ...(deliveryMethod === 'pickup' && {
              pickupLocationId: deliveryInfo?.pickupLocationId || '',
              pickupLocationName: deliveryInfo?.pickupLocationName || '',
              pickupLocationAddress: deliveryInfo?.pickupLocationAddress || '',
              pickupLocationDate: deliveryInfo?.pickupLocationDate || '',
            }),
            
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
            // v2: productId + variantSku + label snapshot.
            itemDetails: JSON.stringify(cartItems.map(item => {
              const productId = (item as any).productId || (item as any).id;
              const variantSku = (item as any).variantSku || '';
              const lineKey = `${productId}::${variantSku}`;
              return {
                productId,
                variantSku,
                sku: item.sku,
                name: typeof item.name === 'string' ? item.name : item.name?.['sv-SE'] || item.name?.['en-US'] || 'Product',
                label: (item as any).label || '',
                price: totals.serverPrices[lineKey] ?? item.price,
                quantity: item.quantity,
                image: item.image || ''
              };
            })),

            // Legacy compatibility (keep existing fields)
            itemIds: cartItems.map(item => String((item as any).productId || (item as any).id || '').substring(0, 8)).join(','),
            cartSummary: cartItems.map(item => `${item.quantity}x${item.sku}`).join(','),
            
            // B2C customer account linkage (set when the buyer has/creates an account)
            ...(request.body.b2cCustomerId && {
              b2cCustomerId: request.body.b2cCustomerId,
              b2cCustomerAuthId: request.body.b2cCustomerAuthId || ''
            }),

            // System identifiers
            source: 'b2c_shop',
            platform: 'b8shield',
            shopId: resolvedShopId, // tenant id — webhook stamps it on the order
            version: 'enhanced_v2', // server-priced metadata

            // Stripe Connect (empty for legacy shops → metadata unchanged)
            ...connectMeta
          },
          receipt_email: customerInfo.email,
          description: `${commerceConfig.shopName} Order - ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`,

          // Stripe Connect destination-charge params (empty {} for legacy shops)
          ...connectParams
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