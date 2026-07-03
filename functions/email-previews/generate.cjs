/* eslint-disable */
// Email preview generator.
//
//   cd functions && npm run build && node email-previews/generate.cjs
//
// Requires the COMPILED templates from lib/ (run `npm run build` first) and
// renders every generator with realistic Swedish dummy data into one .html
// file per template + language, right next to this script. The .html output is
// git-ignored; this script is not.

const fs = require('fs');
const path = require('path');

const LIB = path.join(__dirname, '..', 'lib', 'email-orchestrator');
const OUT = __dirname;

function req(rel) {
  const p = path.join(LIB, rel);
  if (!fs.existsSync(p)) {
    throw new Error(`Compiled template not found: ${p}\nDid you run "npm run build"?`);
  }
  return require(p);
}

const { generatePasswordResetTemplate } = req('templates/passwordReset.js');
const { generateEmailVerificationTemplate } = req('templates/emailVerification.js');
const { generateOrderConfirmationTemplate } = req('templates/orderConfirmation.js');
const { generateOrderStatusUpdateTemplate } = req('templates/orderStatusUpdate.js');
const { generateOrderNotificationAdminTemplate } = req('templates/orderNotificationAdmin.js');
const { generateLoginCredentialsTemplate } = req('templates/loginCredentials.js');
const { generateAffiliateWelcomeTemplate } = req('templates/affiliateWelcome.js');
const { generateAffiliateApplicationReceivedTemplate } = req('templates/affiliateApplicationReceived.js');
const { generateAffiliateApplicationNotificationAdminTemplate } = req('templates/affiliateApplicationNotificationAdmin.js');
const { generateRefundConfirmationTemplate } = req('templates/refundConfirmation.js');
const { generateDisputeAlertAdminTemplate } = req('templates/disputeAlertAdmin.js');
const { generateConnectStatusChangeTemplate } = req('templates/connectStatusChange.js');

const BRAND = 'Sillmans';

// --- realistic Swedish dummy data ---------------------------------------
const orderData = {
  orderNumber: 'ORD-250703-AB12',
  items: [
    { name: 'Fjällräven Kånken Ryggsäck', color: 'Ockragul', size: 'Standard', quantity: 1, price: 899 },
    { name: 'Bomullströja med tryck', color: 'Marinblå', size: 'L', quantity: 2, price: 349 },
  ],
  subtotal: 1597,
  shipping: 49,
  vat: 411.5,
  total: 2057.5,
  discountAmount: 160,
  affiliateCode: 'SILL10',
  createdAt: '2026-07-03 14:22',
  payment: { method: 'stripe', status: 'paid', paymentIntentId: 'pi_3Ptest123' },
  shippingInfo: { address: 'Storgatan 12', apartment: '3 tr', postalCode: '114 55', city: 'Stockholm', country: 'Sverige' },
  customerInfo: {
    firstName: 'Anna', lastName: 'Karlsson', name: 'Anna Karlsson', email: 'anna.karlsson@example.se',
    companyName: 'Karlssons Fiske AB', contactPerson: 'Anna Karlsson', phone: '070-123 45 67',
    address: 'Storgatan 12', city: 'Stockholm', postalCode: '114 55', marginal: 35,
  },
};

const customerInfo = { firstName: 'Anna', lastName: 'Karlsson', name: 'Anna Karlsson', email: 'anna.karlsson@example.se' };
const applicantInfo = {
  name: 'Erik Lindqvist', email: 'erik.lindqvist@example.se', phone: '073-987 65 43',
  country: 'Sverige', promotionMethod: 'Instagram + egen fiskeblogg',
  message: 'Jag har cirka 12 000 följare inom sportfiske och vill gärna representera er.',
  socials: { website: 'https://fiskeliv.se', instagram: 'https://instagram.com/fiskeliv', youtube: 'https://youtube.com/@fiskeliv' },
};

const files = [];
function write(name, html) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, typeof html === 'string' ? html : String(html), 'utf8');
  files.push(name);
}

// --- render everything ---------------------------------------------------
// passwordReset: sv + en
write('passwordReset.sv.html', generatePasswordResetTemplate({ email: customerInfo.email, resetCode: 'abc123XYZ', userType: 'B2C', timestamp: '2026-07-03 14:22', userAgent: 'Chrome on macOS', brandName: BRAND }, 'sv-SE').html);
write('passwordReset.en.html', generatePasswordResetTemplate({ email: customerInfo.email, resetCode: 'abc123XYZ', userType: 'B2C', timestamp: '2026-07-03 14:22', userAgent: 'Chrome on macOS', brandName: BRAND }, 'en-GB').html);

// emailVerification: sv + en
write('emailVerification.sv.html', generateEmailVerificationTemplate({ customerInfo, verificationCode: 'oob_verify_code_123', language: 'sv-SE', source: 'registration', brandName: BRAND }).html);
write('emailVerification.en.html', generateEmailVerificationTemplate({ customerInfo, verificationCode: 'oob_verify_code_123', language: 'en-GB', source: 'checkout', brandName: BRAND }).html);

// orderConfirmation: B2C sv/en + B2B sv/en
write('orderConfirmation.b2c.sv.html', generateOrderConfirmationTemplate({ orderData, customerInfo, orderId: 'dbid123', orderType: 'B2C', brandName: BRAND }, 'sv-SE', 'dbid123').html);
write('orderConfirmation.b2c.en.html', generateOrderConfirmationTemplate({ orderData, customerInfo, orderId: 'dbid123', orderType: 'B2C', brandName: BRAND }, 'en-GB', 'dbid123').html);
write('orderConfirmation.b2b.sv.html', generateOrderConfirmationTemplate({ orderData, customerInfo: { ...customerInfo, name: 'Karlssons Fiske AB' }, orderId: 'dbid123', orderType: 'B2B', brandName: BRAND }, 'sv-SE', 'dbid123').html);
write('orderConfirmation.b2b.en.html', generateOrderConfirmationTemplate({ orderData, customerInfo: { ...customerInfo, name: 'Karlssons Fiske AB' }, orderId: 'dbid123', orderType: 'B2B', brandName: BRAND }, 'en-GB', 'dbid123').html);

// orderStatusUpdate: sv + en
write('orderStatusUpdate.sv.html', generateOrderStatusUpdateTemplate({ orderData: { orderNumber: orderData.orderNumber, status: 'shipped', totalAmount: orderData.total }, userData: { email: customerInfo.email, contactPerson: 'Anna Karlsson' }, newStatus: 'shipped', previousStatus: 'processing', trackingNumber: 'SE123456789', estimatedDelivery: '2026-07-05', notes: 'Vi packade extra noga.', userType: 'B2C', brandName: BRAND }, 'sv-SE', 'dbid123').html);
write('orderStatusUpdate.en.html', generateOrderStatusUpdateTemplate({ orderData: { orderNumber: orderData.orderNumber, status: 'shipped', totalAmount: orderData.total }, userData: { email: customerInfo.email, contactPerson: 'Anna Karlsson' }, newStatus: 'shipped', previousStatus: 'processing', trackingNumber: 'SE123456789', estimatedDelivery: '2026-07-05', userType: 'B2C', brandName: BRAND }, 'en-GB', 'dbid123').html);
// orderStatusUpdate: Click & Collect ready-for-pickup (sv)
write('orderStatusUpdate.pickup.sv.html', generateOrderStatusUpdateTemplate({ orderData: { orderNumber: orderData.orderNumber, status: 'ready_for_pickup', totalAmount: orderData.total }, userData: { email: customerInfo.email, contactPerson: 'Anna Karlsson' }, newStatus: 'ready_for_pickup', previousStatus: 'processing', pickupLocationName: 'Sillmans Fiskebutik, Storgatan 12', userType: 'B2C', brandName: BRAND }, 'sv-SE', 'dbid123').html);

// refundConfirmation: full + partial (with ångerrätt)
write('refundConfirmation.full.sv.html', generateRefundConfirmationTemplate({ orderNumber: orderData.orderNumber, refundAmountSek: 2057, currency: 'SEK', isFullRefund: true, hasWithdrawal: false, customerName: 'Anna Karlsson', brandName: BRAND }).html);
write('refundConfirmation.partial.sv.html', generateRefundConfirmationTemplate({ orderNumber: orderData.orderNumber, refundAmountSek: 899, currency: 'SEK', isFullRefund: false, hasWithdrawal: true, customerName: 'Anna Karlsson', brandName: BRAND }).html);

// disputeAlertAdmin: new dispute + shortfall
write('disputeAlertAdmin.dispute.sv.html', generateDisputeAlertAdminTemplate({ shopId: 'sillmans', shopName: 'Sillmans', orderId: 'pi_3Ptest123', orderNumber: orderData.orderNumber, disputeId: 'dp_1Ptest', reason: 'fraudulent', amount: 205750, status: 'needs_response', alertKind: 'dispute', brandName: BRAND }).html);
write('disputeAlertAdmin.shortfall.sv.html', generateDisputeAlertAdminTemplate({ shopId: 'sillmans', shopName: 'Sillmans', orderId: 'pi_3Ptest123', orderNumber: orderData.orderNumber, disputeId: 'dp_1Ptest', reason: 'product_not_received', amount: 205750, status: 'lost', alertKind: 'shortfall', recoveryStatus: 'shortfall', brandName: BRAND }).html);

// connectStatusChange: shop-owner payout alert
write('connectStatusChange.sv.html', generateConnectStatusChangeTemplate({ changes: ['Utbetalningar har pausats för ditt konto.', 'Stripe behöver ytterligare uppgifter från dig för att fortsätta.'], paymentsUrl: 'https://meteorpr.web.app/admin/payments', brandName: BRAND }).html);

// orderNotificationAdmin: B2C sv + B2B sv (admin = Swedish internal)
write('orderNotificationAdmin.b2c.sv.html', generateOrderNotificationAdminTemplate({ orderData, orderType: 'B2C', brandName: BRAND }, 'sv-SE').html);
write('orderNotificationAdmin.b2b.sv.html', generateOrderNotificationAdminTemplate({ orderData, orderType: 'B2B', orderSummary: '2x Bomullströja (L)\n1x Kånken Ryggsäck', brandName: BRAND }, 'sv-SE').html);

// loginCredentials: B2B sv/en + AFFILIATE sv + existing-user sv
write('loginCredentials.b2b.sv.html', generateLoginCredentialsTemplate({ userInfo: { name: 'Anna Karlsson', email: customerInfo.email, companyName: 'Karlssons Fiske AB', contactPerson: 'Anna Karlsson' }, credentials: { email: customerInfo.email, temporaryPassword: 'Tmp!2026xz' }, accountType: 'B2B', wasExistingAuthUser: false, brandName: BRAND }, 'sv-SE').html);
write('loginCredentials.b2b.en.html', generateLoginCredentialsTemplate({ userInfo: { name: 'Anna Karlsson', email: customerInfo.email, companyName: 'Karlssons Fiske AB', contactPerson: 'Anna Karlsson' }, credentials: { email: customerInfo.email, temporaryPassword: 'Tmp!2026xz' }, accountType: 'B2B', wasExistingAuthUser: false, brandName: BRAND }, 'en-GB').html);
write('loginCredentials.affiliate.sv.html', generateLoginCredentialsTemplate({ userInfo: { name: 'Erik Lindqvist', email: applicantInfo.email }, credentials: { email: applicantInfo.email, temporaryPassword: 'Tmp!2026xz', affiliateCode: 'ERIK15' }, accountType: 'AFFILIATE', wasExistingAuthUser: false, brandName: BRAND }, 'sv-SE').html);
write('loginCredentials.existing.sv.html', generateLoginCredentialsTemplate({ userInfo: { name: 'Erik Lindqvist', email: applicantInfo.email }, credentials: { email: applicantInfo.email, affiliateCode: 'ERIK15' }, accountType: 'AFFILIATE', wasExistingAuthUser: true, brandName: BRAND }, 'sv-SE').html);

// affiliateWelcome: sv + en + existing-user sv
write('affiliateWelcome.sv.html', generateAffiliateWelcomeTemplate({ affiliateInfo: { name: 'Erik Lindqvist', email: applicantInfo.email, affiliateCode: 'ERIK15', commissionRate: 15 }, credentials: { email: applicantInfo.email, temporaryPassword: 'Tmp!2026xz' }, wasExistingAuthUser: false, language: 'sv-SE', brandName: BRAND }).html);
write('affiliateWelcome.en.html', generateAffiliateWelcomeTemplate({ affiliateInfo: { name: 'Erik Lindqvist', email: applicantInfo.email, affiliateCode: 'ERIK15', commissionRate: 15 }, credentials: { email: applicantInfo.email, temporaryPassword: 'Tmp!2026xz' }, wasExistingAuthUser: false, language: 'en-GB', brandName: BRAND }).html);
write('affiliateWelcome.existing.sv.html', generateAffiliateWelcomeTemplate({ affiliateInfo: { name: 'Erik Lindqvist', email: applicantInfo.email, affiliateCode: 'ERIK15', commissionRate: 15 }, credentials: { email: applicantInfo.email }, wasExistingAuthUser: true, language: 'sv-SE', brandName: BRAND }).html);

// affiliateApplicationReceived: sv + en (returns HTML string)
write('affiliateApplicationReceived.sv.html', generateAffiliateApplicationReceivedTemplate({ applicantInfo, applicationId: 'APP-2026-0042', language: 'sv-SE', brandName: BRAND }));
write('affiliateApplicationReceived.en.html', generateAffiliateApplicationReceivedTemplate({ applicantInfo, applicationId: 'APP-2026-0042', language: 'en-GB', brandName: BRAND }));

// affiliateApplicationNotificationAdmin: sv (admin, HTML string)
write('affiliateApplicationNotificationAdmin.sv.html', generateAffiliateApplicationNotificationAdminTemplate({ applicantInfo, applicationId: 'APP-2026-0042', adminPortalUrl: 'https://meteorpr.web.app', brandName: BRAND }));

console.log(`Generated ${files.length} preview files in ${OUT}:`);
files.forEach((f) => console.log('  - ' + f));
