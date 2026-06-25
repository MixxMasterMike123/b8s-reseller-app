/**
 * Right-of-withdrawal gate — pure helper unit tests (Slice D).
 *
 * Verifies the checkout-gate decision + notice resolution + proof fingerprint
 * directly against the client util (src/utils/withdrawal.js). The gate decides
 * whether a cart needs the no-withdrawal consent (any personalized item), and
 * the notice resolves a shop override or the neutral default with a stable
 * version + fingerprint persisted as proof on the order.
 *
 * RUN: node rules-tests/withdrawal-gate.test.mjs
 */
import {
  requiresWithdrawalGate,
  resolveWithdrawalNotice,
  noticeFingerprint,
  DEFAULT_NO_WITHDRAWAL_NOTICE,
  WITHDRAWAL_NOTICE_VERSION,
} from '../src/utils/withdrawal.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };

console.log('\n=== requiresWithdrawalGate (any personalized item → gate) ===');
ok(requiresWithdrawalGate([{ isPersonalized: true }]) === true, 'one personalized item → gate required');
ok(requiresWithdrawalGate([{ isPersonalized: false }, { isPersonalized: true }]) === true, 'mixed cart with a personalized item → gate required');
ok(requiresWithdrawalGate([{ isPersonalized: false }, {}]) === false, 'all standard items → no gate');
ok(requiresWithdrawalGate([]) === false, 'empty cart → no gate');
ok(requiresWithdrawalGate(null) === false, 'null cart → no gate (no throw)');
ok(requiresWithdrawalGate(undefined) === false, 'undefined cart → no gate (no throw)');
ok(requiresWithdrawalGate([{ isPersonalized: 'true' }]) === false, 'truthy-but-not-boolean isPersonalized → NOT a gate (strict ===true)');

console.log('\n=== resolveWithdrawalNotice (shop override vs neutral default) ===');
{
  const r = resolveWithdrawalNotice(undefined);
  ok(r.text === DEFAULT_NO_WITHDRAWAL_NOTICE, 'no legal config → neutral default text');
  ok(r.version === WITHDRAWAL_NOTICE_VERSION, 'no legal config → default version');
  ok(r.fingerprint === noticeFingerprint(DEFAULT_NO_WITHDRAWAL_NOTICE), 'fingerprint matches the default text');
}
{
  const legal = { noWithdrawalNotice: '  Egen text om ångerrätt.  ', withdrawalNoticeVersion: 'shop-2026-06-25' };
  const r = resolveWithdrawalNotice(legal);
  ok(r.text === 'Egen text om ångerrätt.', 'shop override used + trimmed');
  ok(r.version === 'shop-2026-06-25', 'shop version used');
  ok(r.fingerprint === noticeFingerprint('Egen text om ångerrätt.'), 'fingerprint tracks the override text');
}
{
  // Empty/whitespace override → falls back to default (never an empty notice).
  const r = resolveWithdrawalNotice({ noWithdrawalNotice: '   ' });
  ok(r.text === DEFAULT_NO_WITHDRAWAL_NOTICE, 'blank override → neutral default (never empty)');
}

console.log('\n=== noticeFingerprint (stable, distinguishes wording) ===');
ok(noticeFingerprint('abc') === noticeFingerprint('abc'), 'deterministic for the same text');
ok(noticeFingerprint('abc') !== noticeFingerprint('abd'), 'different text → different fingerprint');
ok(noticeFingerprint('') === noticeFingerprint(''), 'empty text stable');
ok(/^h[0-9a-f]+$/.test(noticeFingerprint('hello')), 'fingerprint format h<hex>');

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
