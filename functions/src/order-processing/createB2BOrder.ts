// createB2BOrder — server-side creation of a B2B "Faktura" (pay-by-invoice)
// order. The B2B portal calls this callable; the order is created with the
// Admin SDK (orders are `allow create: if false` for clients).
//
// v1 money model (decided 2026-06-24): the order is FLAGGED Faktura/pending and
// the SHOP invoices the customer externally (Fortnox etc.) + tracks payment via
// the admin status workflow. NO money flows through the platform here, so this
// path is OUTSIDE the Stripe/AML surface entirely.
//
// SECURITY (Admin SDK bypasses Firestore rules — enforce in code):
//  - caller must be authenticated;
//  - caller must be the b2bCustomer themselves (firebaseAuthUid match) OR an
//    admin of the customer's shop;
//  - the b2bCustomer must be ACTIVE (the admin-activation gate);
//  - shopId is taken from the b2bCustomer doc (trustworthy), never the payload;
//  - line prices are recomputed server-side from each product's `b2bPrice`
//    (the client-sent quantities are honored; client-sent prices are ignored);
//  - every product must belong to the SAME shop and be B2B-available.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../config/database';
import { appUrls, commerceConfig } from '../config/app-urls';
import { requireAdminOfShop } from '../email-orchestrator/functions/authGuard';

interface CartLine {
  productId: string;
  quantity: number;
  variantSku?: string | null;
}
interface CreateB2BOrderRequest {
  b2bCustomerId: string;
  items: CartLine[];
}

// Product name may be a plain string or a legacy per-locale object.
function plainName(n: unknown): string {
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object') {
    const obj = n as Record<string, unknown>;
    const sv = obj['sv-SE'];
    if (typeof sv === 'string') return sv;
    const first = Object.values(obj).find((v) => typeof v === 'string');
    return (first as string) || '';
  }
  return '';
}

// Round to 2 decimals (kr) — avoids float drift on VAT/totals.
const round2 = (n: number) => Math.round(n * 100) / 100;

export const createB2BOrder = onCall<CreateB2BOrderRequest>(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, cors: appUrls.CORS_ORIGINS },
  async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid) throw new HttpsError('unauthenticated', 'Authentication required');

    const { b2bCustomerId, items } = request.data || ({} as CreateB2BOrderRequest);
    if (!b2bCustomerId) throw new HttpsError('invalid-argument', 'b2bCustomerId is required');
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one order line is required');
    }

    // 1. Load the b2bCustomer (the trustworthy source of shopId + active state).
    const custSnap = await db.collection('b2bCustomers').doc(b2bCustomerId).get();
    if (!custSnap.exists) throw new HttpsError('not-found', 'B2B customer not found');
    const cust = custSnap.data() as Record<string, any>;
    const shopId: string = cust.shopId;
    if (!shopId) throw new HttpsError('failed-precondition', 'B2B customer has no shopId');

    // 2. Authorize: the customer themselves, OR an admin of the customer's shop.
    const isOwner = authUid === cust.firebaseAuthUid;
    if (!isOwner) {
      // requireAdminOfShop throws permission-denied if the caller isn't an
      // admin of THIS shop (platform admins pass).
      await requireAdminOfShop(shopId, authUid);
    }

    // 3. The customer must be activated by an admin (the gate).
    if (cust.active !== true) {
      throw new HttpsError('permission-denied', 'B2B customer is not activated');
    }

    // 4. Recompute every line server-side from the product's b2bPrice. Reject any
    //    product that's missing, cross-shop, inactive, B2B-unavailable, or has no
    //    wholesale price. (Client-sent prices are ignored entirely.)
    const orderItems: any[] = [];
    let subtotal = 0;
    for (const line of items) {
      const qty = Math.floor(Number(line.quantity) || 0);
      if (!line.productId || qty <= 0) {
        throw new HttpsError('invalid-argument', 'Each line needs a productId and quantity >= 1');
      }
      const prodSnap = await db.collection('products').doc(line.productId).get();
      if (!prodSnap.exists) throw new HttpsError('not-found', `Product not found: ${line.productId}`);
      const p = prodSnap.data() as Record<string, any>;

      if (p.shopId !== shopId) {
        throw new HttpsError('permission-denied', `Product ${line.productId} belongs to another shop`);
      }
      if (p.isActive === false) throw new HttpsError('failed-precondition', `Product not active: ${line.productId}`);
      if (p.availability?.b2b === false) {
        throw new HttpsError('failed-precondition', `Product not available for B2B: ${line.productId}`);
      }
      const price = Number(p.b2bPrice);
      if (!price || price <= 0) {
        throw new HttpsError('failed-precondition', `Product has no wholesale price: ${line.productId}`);
      }

      const lineTotal = round2(price * qty);
      subtotal = round2(subtotal + lineTotal);
      orderItems.push({
        productId: line.productId,
        variantSku: line.variantSku || null,
        sku: p.sku || '',
        name: plainName(p.name),
        price, // ex moms, server-computed
        quantity: qty,
        lineTotal,
        image: p.imageUrl || p.b2cImageUrl || '',
      });
    }

    // 5. VAT + total. b2bPrice is ex moms; add the configured VAT rate.
    const vat = round2(subtotal * commerceConfig.vatRate);
    const total = round2(subtotal + vat);

    // 6. Order number (mirrors the webhook's human-readable format).
    const orderNumber =
      `${commerceConfig.orderNumberPrefix}-${Date.now().toString().slice(-6)}-` +
      `${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 7. Write the order. Shape mirrors the B2C webhook order (subtotal/vat/total,
    //    payment:{method,status}) so the existing admin order pages render it.
    //    userId = firebaseAuthUid + b2bCustomerId so the B2B customer can LIST it
    //    (firestore.rules orders-list b2b branch keys off b2bCustomerId).
    const now = new Date();
    const orderRef = db.collection('orders').doc();
    const orderDoc = {
      orderNumber,
      status: 'pending', // pending → invoiced → paid → shipped → completed
      source: 'b2b',
      shopId,

      userId: cust.firebaseAuthUid,
      b2bCustomerId,

      customerInfo: {
        email: cust.email || '',
        name: cust.companyName || '',
        companyName: cust.companyName || '',
        contactPerson: cust.contactPerson || '',
        orgNumber: cust.orgNumber || '',
        vatNumber: cust.vatNumber || '',
        phone: cust.phone || '',
        preferredLang: cust.preferredLang || 'sv-SE',
      },
      // Ship-to: a distinct delivery address when the customer set one
      // (sameAsCompany === false AND a delivery address is present), else the
      // company/billing address. Wholesale buyers often bill HQ, ship to a store.
      shippingInfo: (cust.sameAsCompany === false && (cust.deliveryAddress || '').trim())
        ? {
            address: cust.deliveryAddress || '',
            postalCode: cust.deliveryPostalCode || '',
            city: cust.deliveryCity || '',
            country: cust.country || 'Sverige',
          }
        : {
            address: cust.address || '',
            postalCode: cust.postalCode || '',
            city: cust.city || '',
            country: cust.country || 'Sverige',
          },

      items: orderItems,
      subtotal,
      shipping: 0, // v1: no shipping line — shop arranges freight separately
      vat,
      discountAmount: 0,
      total,
      currency: commerceConfig.currency,

      // Faktura: pay-by-invoice, the shop invoices externally + tracks payment.
      payment: { method: 'invoice', status: 'pending', invoiceNumber: null },
      paymentMethod: 'Faktura', // legacy-compatible flag

      createdAt: now,
      updatedAt: now,
      statusHistory: [],
    };

    await orderRef.create(orderDoc);

    return { success: true, orderId: orderRef.id, orderNumber, total };
  }
);
