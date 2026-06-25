"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createB2BOrder = void 0;
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
const https_1 = require("firebase-functions/v2/https");
const database_1 = require("../config/database");
const app_urls_1 = require("../config/app-urls");
const authGuard_1 = require("../email-orchestrator/functions/authGuard");
// Product name may be a plain string or a legacy per-locale object.
function plainName(n) {
    if (typeof n === 'string')
        return n;
    if (n && typeof n === 'object') {
        const obj = n;
        const sv = obj['sv-SE'];
        if (typeof sv === 'string')
            return sv;
        const first = Object.values(obj).find((v) => typeof v === 'string');
        return first || '';
    }
    return '';
}
// Round to 2 decimals (kr) — avoids float drift on VAT/totals.
const round2 = (n) => Math.round(n * 100) / 100;
exports.createB2BOrder = (0, https_1.onCall)({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, cors: app_urls_1.appUrls.CORS_ORIGINS }, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    const { b2bCustomerId, items } = request.data || {};
    if (!b2bCustomerId)
        throw new https_1.HttpsError('invalid-argument', 'b2bCustomerId is required');
    if (!Array.isArray(items) || items.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'At least one order line is required');
    }
    // 1. Load the b2bCustomer (the trustworthy source of shopId + active state).
    const custSnap = await database_1.db.collection('b2bCustomers').doc(b2bCustomerId).get();
    if (!custSnap.exists)
        throw new https_1.HttpsError('not-found', 'B2B customer not found');
    const cust = custSnap.data();
    const shopId = cust.shopId;
    if (!shopId)
        throw new https_1.HttpsError('failed-precondition', 'B2B customer has no shopId');
    // 2. Authorize: the customer themselves, OR an admin of the customer's shop.
    const isOwner = authUid === cust.firebaseAuthUid;
    if (!isOwner) {
        // requireAdminOfShop throws permission-denied if the caller isn't an
        // admin of THIS shop (platform admins pass).
        await (0, authGuard_1.requireAdminOfShop)(shopId, authUid);
    }
    // 3. The customer must be activated by an admin (the gate).
    if (cust.active !== true) {
        throw new https_1.HttpsError('permission-denied', 'B2B customer is not activated');
    }
    // 4. Recompute every line server-side from the product's b2bPrice. Reject any
    //    product that's missing, cross-shop, inactive, B2B-unavailable, or has no
    //    wholesale price. (Client-sent prices are ignored entirely.)
    const orderItems = [];
    let subtotal = 0;
    for (const line of items) {
        const qty = Math.floor(Number(line.quantity) || 0);
        if (!line.productId || qty <= 0) {
            throw new https_1.HttpsError('invalid-argument', 'Each line needs a productId and quantity >= 1');
        }
        const prodSnap = await database_1.db.collection('products').doc(line.productId).get();
        if (!prodSnap.exists)
            throw new https_1.HttpsError('not-found', `Product not found: ${line.productId}`);
        const p = prodSnap.data();
        if (p.shopId !== shopId) {
            throw new https_1.HttpsError('permission-denied', `Product ${line.productId} belongs to another shop`);
        }
        if (p.isActive === false)
            throw new https_1.HttpsError('failed-precondition', `Product not active: ${line.productId}`);
        if (p.availability?.b2b === false) {
            throw new https_1.HttpsError('failed-precondition', `Product not available for B2B: ${line.productId}`);
        }
        const price = Number(p.b2bPrice);
        if (!price || price <= 0) {
            throw new https_1.HttpsError('failed-precondition', `Product has no wholesale price: ${line.productId}`);
        }
        const lineTotal = round2(price * qty);
        subtotal = round2(subtotal + lineTotal);
        orderItems.push({
            productId: line.productId,
            variantSku: line.variantSku || null,
            sku: p.sku || '',
            name: plainName(p.name),
            price,
            quantity: qty,
            lineTotal,
            image: p.imageUrl || p.b2cImageUrl || '',
        });
    }
    // 5. VAT + total. b2bPrice is ex moms; add the configured VAT rate.
    const vat = round2(subtotal * app_urls_1.commerceConfig.vatRate);
    const total = round2(subtotal + vat);
    // 6. Order number (mirrors the webhook's human-readable format).
    const orderNumber = `${app_urls_1.commerceConfig.orderNumberPrefix}-${Date.now().toString().slice(-6)}-` +
        `${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    // 7. Write the order. Shape mirrors the B2C webhook order (subtotal/vat/total,
    //    payment:{method,status}) so the existing admin order pages render it.
    //    userId = firebaseAuthUid + b2bCustomerId so the B2B customer can LIST it
    //    (firestore.rules orders-list b2b branch keys off b2bCustomerId).
    const now = new Date();
    const orderRef = database_1.db.collection('orders').doc();
    const orderDoc = {
        orderNumber,
        status: 'pending',
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
        shipping: 0,
        vat,
        discountAmount: 0,
        total,
        currency: app_urls_1.commerceConfig.currency,
        // Faktura: pay-by-invoice, the shop invoices externally + tracks payment.
        payment: { method: 'invoice', status: 'pending', invoiceNumber: null },
        paymentMethod: 'Faktura',
        createdAt: now,
        updatedAt: now,
        statusHistory: [],
    };
    await orderRef.create(orderDoc);
    return { success: true, orderId: orderRef.id, orderNumber, total };
});
//# sourceMappingURL=createB2BOrder.js.map