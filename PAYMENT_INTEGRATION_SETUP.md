# B8Shield Payment Integration Setup Guide

## 🎯 Overview
This guide walks through integrating Stripe, Klarna, Apple Pay, Google Pay, and Swish into your B8Shield B2C shop with multi-currency support.

## 📋 Prerequisites

### 1. **Stripe Account Setup**
- [ ] Transfer existing Stripe account from WooCommerce
- [ ] Enable multi-currency support (SEK, USD, GBP)
- [ ] Configure webhooks for order confirmation
- [ ] Get API keys (public/secret for test and live)

### 2. **Klarna Account Setup**
- [ ] Create Klarna merchant account
- [ ] Get API credentials (username/password)
- [ ] Configure for Nordic markets
- [ ] Set up webhooks

### 3. **Swish Setup (Sweden)**
- [ ] Apply for Swish merchant account
- [ ] Get merchant ID and certificates
- [ ] Configure for Swedish market only

## 🔧 Installation Steps

### Step 1: Install Dependencies

```bash
# Frontend packages
cd /Users/mikaelohlen/Cursor\ Apps/b8shield_portal
npm install @stripe/stripe-js @stripe/react-stripe-js

# Backend packages
cd functions
npm install stripe @klarna/sdk-node
```

### Step 2: Environment Configuration

Create/update `.env` files:

**functions/.env**
```bash
# Stripe Configuration
STRIPE_PUBLIC_KEY_TEST=pk_test_your_test_key
STRIPE_SECRET_KEY_TEST=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET_TEST=whsec_your_test_webhook_secret

STRIPE_PUBLIC_KEY_LIVE=pk_live_your_live_key
STRIPE_SECRET_KEY_LIVE=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET_LIVE=whsec_your_live_webhook_secret

# Use test or live keys based on environment
STRIPE_PUBLIC_KEY=${STRIPE_PUBLIC_KEY_TEST}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY_TEST}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET_TEST}

# Klarna Configuration
KLARNA_USERNAME=your_klarna_username
KLARNA_PASSWORD=your_klarna_password
KLARNA_ENDPOINT=https://api.playground.klarna.com  # Use https://api.klarna.com for production
KLARNA_ENV=sandbox  # or 'production'

# Swish Configuration (Sweden only)
SWISH_MERCHANT_ID=your_swish_merchant_id
SWISH_CERTIFICATE_PATH=path/to/swish/certificate.p12
SWISH_ENDPOINT=https://mss.cpc.getswish.net/swish-cpcapi/api/v1  # Test endpoint
SWISH_ENV=test  # or 'production'
```

### Step 3: Firebase Functions Configuration

Set environment variables in Firebase:

```bash
# Navigate to functions directory
cd functions

# Set Stripe configuration
firebase functions:config:set stripe.public_key="pk_test_your_key"
firebase functions:config:set stripe.secret_key="sk_test_your_key"
firebase functions:config:set stripe.webhook_secret="whsec_your_secret"

# Set Klarna configuration
firebase functions:config:set klarna.username="your_username"
firebase functions:config:set klarna.password="your_password"
firebase functions:config:set klarna.endpoint="https://api.playground.klarna.com"

# Set Swish configuration
firebase functions:config:set swish.merchant_id="your_merchant_id"
firebase functions:config:set swish.endpoint="https://mss.cpc.getswish.net"
```

### Step 4: Update Checkout Component

Replace the mock payment section in `src/pages/shop/Checkout.jsx`:

```jsx
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentMethods from '../../components/shop/PaymentMethods';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// In your checkout component:
{step === 'payment' && (
  <Elements stripe={stripePromise}>
    <PaymentMethods
      total={total}
      sekPrice={total} // Your total in SEK
      currency={currency}
      shippingAddress={shippingInfo}
      contactInfo={contactInfo}
      affiliateCode={cart.discountCode}
      onPaymentSuccess={handlePaymentSuccess}
      onPaymentError={handlePaymentError}
      onPaymentProcessing={setPaymentProcessing}
    />
  </Elements>
)}
```

### Step 5: Deploy Functions

```bash
# Build and deploy payment functions
cd functions
npm run build
firebase deploy --only functions:createPaymentIntent,functions:handleStripeWebhook
```

## 🌍 Currency Integration

Your existing `SmartPrice` component handles currency conversion perfectly:

```jsx
<SmartPrice 
  sekPrice={totalInSEK} 
  variant="large"
  showOriginal={false}
/>
```

**How it works:**
1. All prices stored in SEK in your database
2. `SmartPrice` converts to user's detected currency (USD, GBP, SEK)
3. Stripe processes payment in the user's currency
4. Affiliate commissions calculated in SEK

## 🔗 Webhook Configuration

### Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-functions-url/handleStripeWebhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.requires_action`

### Klarna Webhooks

1. Configure in Klarna merchant portal
2. Add endpoint: `https://your-functions-url/handleKlarnaWebhook`
3. Select order events

## 📱 Payment Method Availability

**Sweden (SEK):**
- ✅ Stripe Cards
- ✅ Klarna Pay Later
- ✅ Apple Pay
- ✅ Google Pay
- ✅ Swish

**International (USD, GBP):**
- ✅ Stripe Cards
- ✅ Klarna Pay Later
- ✅ Apple Pay
- ✅ Google Pay
- ❌ Swish (Sweden only)

## 🧪 Testing

### Test Cards (Stripe)

```
# Success
4242 4242 4242 4242

# Declined
4000 0000 0000 0002

# 3D Secure
4000 0000 0000 3220
```

### Test Klarna

Use Klarna's test credentials in sandbox mode.

### Test Swish

Use Swish test environment with test merchant ID.

## 📊 Payment Flow

1. **User selects payment method** → PaymentMethods component
2. **Create payment intent** → `createPaymentIntent` function
3. **Process payment** → Stripe/Klarna/Swish APIs
4. **Webhook confirmation** → `handleStripeWebhook` function
5. **Update order status** → Firebase order processing
6. **Process affiliate commission** → Existing affiliate system
7. **Send confirmation emails** → Existing email system

## 🔐 Security Considerations

- [ ] All sensitive keys stored as environment variables
- [ ] Webhook signature verification enabled
- [ ] Rate limiting on payment endpoints
- [ ] CORS properly configured
- [ ] Input validation on all payment data
- [ ] PCI compliance for card processing

## 🚀 Go Live Checklist

- [ ] Switch to live Stripe keys
- [ ] Switch to production Klarna environment
- [ ] Switch to production Swish environment
- [ ] Update webhook URLs to production
- [ ] Test all payment methods in production
- [ ] Monitor payment success rates
- [ ] Set up payment failure alerts

## 📞 Support Contacts

- **Stripe Support:** https://support.stripe.com
- **Klarna Support:** https://developers.klarna.com/support
- **Swish Support:** https://www.getswish.se/foretag/kontakt/

## 🎨 Integration Benefits

**Perfect Integration with Existing System:**
- ✅ Works with your SmartPrice currency conversion
- ✅ Preserves affiliate tracking and commissions
- ✅ Integrates with existing order processing
- ✅ Maintains multi-currency support (SEK, USD, GBP)
- ✅ Supports international shipping rates
- ✅ Professional Swedish checkout experience

**Implementation Time:**
- **Phase 1 (Stripe):** 1-2 weeks
- **Phase 2 (Apple/Google Pay):** 1 week
- **Phase 3 (Klarna):** 1 week
- **Phase 4 (Swish):** 1 week
- **Total:** 4-5 weeks to full payment integration

Your B8Shield system is already perfectly architected for payment integration! 🎉 