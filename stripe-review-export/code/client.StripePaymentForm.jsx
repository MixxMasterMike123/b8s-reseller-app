// ============================================================================
// EXTRACT for legal review — CLIENT side. How the storefront initiates a charge.
// The client sends cart/customer/totals to the server function; the SERVER
// recomputes prices/totals and creates the PaymentIntent (client amounts are not
// trusted). No secrets here (publishable key only, by design).
// ============================================================================

// from: src/components/shop/StripePaymentForm.jsx L245-311 (build payload + call function)
const paymentData = {
  amount: totals.total,           // SEK (server recomputes authoritatively)
  currency: 'sek',
  shopId,                          // tenant id → server stamps into PI metadata → order
  cartItems: cart.items,
  customerInfo,
  shippingInfo: { ...shippingInfo, cost: totals.shipping },
  // delivery method (home | pickup), pickup location/date when applicable …
  totals: { subtotal: totals.subtotal, vat: totals.vat, shipping: totals.shipping, discountAmount: totals.discountAmount, total: totals.total },
  // discountInfo / affiliateInfo / b2cCustomerId linkage (optional) …
};

const response = await fetch(functionUrl('createPaymentIntentV2'), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paymentData),
});
// → returns { clientSecret } from the server-created PaymentIntent.

// from: src/components/shop/StripePaymentForm.jsx L54-61 (confirm the payment)
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}${getCountryAwareUrl('order-return')}`,
    receipt_email: customerInfo.email,
  },
  redirect: 'if_required',
});

// from: src/utils/stripeClient.js (publishable key — public by design)
//   const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;  // value = <REDACTED>
//   stripePromise = loadStripe(stripePublishableKey, { apiVersion: '2023-10-16', locale: 'sv' });

// NOTE: the client never sees the secret key, never sets Connect params, and
// never creates the charge — all Connect/fee/MoR logic is server-side.
