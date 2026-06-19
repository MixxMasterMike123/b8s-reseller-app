/**
 * Stripe Connect — money-path param unit tests (no Stripe, no network).
 *
 * Asserts the EXACT params the checkout + refund handlers send to Stripe, via
 * the pure builders the handlers actually call (functions/src/payment/
 * connectParams.ts → compiled lib). These are the bugs that would actually
 * hurt: a Connect shop missing transfer_data, a wrong application_fee, a legacy
 * shop accidentally getting Connect params, or a Connect refund missing the
 * transfer reversal (which would make the platform eat the refund).
 *
 * RUN: node rules-tests/connect-params.test.cjs
 */
const path = require('path');
const LIB = path.join(__dirname, '..', 'functions', 'lib', 'payment');
const { buildConnectChargeParams, buildRefundParams } = require(path.join(LIB, 'connectParams'));

let pass = 0, fail = 0;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };

console.log('\n=== Destination-charge params (createPaymentIntent path) ===');

// Connect-enabled shop → destination charge with the platform cut.
{
  const pay = { chargesEnabled: true, stripeAccountId: 'acct_X', commissionBps: 500 };
  const b = buildConnectChargeParams(pay, 12500, 500);
  ok(b.useConnect === true, 'Connect shop → useConnect true');
  ok(eq(b.params.transfer_data, { destination: 'acct_X' }), 'transfer_data.destination = acct_X');
  ok(b.params.application_fee_amount === 625, 'application_fee_amount = 625 öre (5% of 125.00 kr)');
  ok(b.meta.connectedAccountId === 'acct_X', 'metadata carries connectedAccountId');
  ok(b.meta.applicationFeeAmount === '625', 'metadata applicationFeeAmount = "625"');
  ok(b.meta.commissionBps === '500', 'metadata commissionBps = "500"');
  ok(!('on_behalf_of' in b.params), 'NO on_behalf_of (platform stays VAT merchant of record)');
}

// Per-shop commission overrides the platform default.
{
  const pay = { chargesEnabled: true, stripeAccountId: 'acct_Y', commissionBps: 1000 };
  const b = buildConnectChargeParams(pay, 10000, 500);
  ok(b.params.application_fee_amount === 1000, 'per-shop 10% overrides default 5% → 1000 öre');
}

// Shop with no per-shop rate → platform default applies.
{
  const pay = { chargesEnabled: true, stripeAccountId: 'acct_Z' };
  const b = buildConnectChargeParams(pay, 10000, 700);
  ok(b.params.application_fee_amount === 700, 'no per-shop bps → platform default 7% → 700 öre');
}

// NOT-onboarded shop (connectEnabled but chargesEnabled false) → LEGACY (empty).
{
  const pay = { connectEnabled: true, chargesEnabled: false, stripeAccountId: 'acct_PENDING' };
  const b = buildConnectChargeParams(pay, 12500, 500);
  ok(b.useConnect === false, 'onboarding-incomplete shop → useConnect false');
  ok(eq(b.params, {}), 'legacy: NO transfer_data / application_fee (params empty)');
  ok(eq(b.meta, {}), 'legacy: NO connect metadata');
}

// Shop with no payments map at all → LEGACY.
{
  const b = buildConnectChargeParams(undefined, 12500, 500);
  ok(b.useConnect === false && eq(b.params, {}), 'no payments map → legacy (byte-identical charge)');
}

// chargesEnabled true but no account id (shouldn't happen) → LEGACY, never a broken transfer.
{
  const b = buildConnectChargeParams({ chargesEnabled: true }, 10000, 500);
  ok(b.useConnect === false, 'chargesEnabled without stripeAccountId → legacy (no broken transfer)');
}

console.log('\n=== Refund params (connectRefund path) ===');

// Connect order → must reverse the transfer AND refund the application fee.
{
  const order = { payment: { paymentIntentId: 'pi_1' }, connect: { isDestinationCharge: true } };
  const p = buildRefundParams(order);
  ok(p.payment_intent === 'pi_1', 'refund targets the payment intent');
  ok(p.reverse_transfer === true, 'Connect refund: reverse_transfer = true (claw back from shop)');
  ok(p.refund_application_fee === true, 'Connect refund: refund_application_fee = true (return our fee)');
  ok(!('amount' in p), 'full refund: no amount');
}

// Connect partial refund → amount in öre + still reverses.
{
  const order = { payment: { paymentIntentId: 'pi_2' }, connect: { isDestinationCharge: true } };
  const p = buildRefundParams(order, 50); // 50.00 kr partial
  ok(p.amount === 5000, 'partial refund amount = 5000 öre (50.00 kr)');
  ok(p.reverse_transfer === true && p.refund_application_fee === true, 'partial Connect refund still reverses + refunds fee');
}

// LEGACY order (no connect) → plain refund, NO reversal params.
{
  const order = { payment: { paymentIntentId: 'pi_3' } };
  const p = buildRefundParams(order);
  ok(p.payment_intent === 'pi_3', 'legacy refund targets the payment intent');
  ok(!('reverse_transfer' in p), 'legacy refund: NO reverse_transfer');
  ok(!('refund_application_fee' in p), 'legacy refund: NO refund_application_fee');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
