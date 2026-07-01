// ============================================================================
// EXTRACT for legal review — CLIENT side. The shop-owner "Aktivera utbetalningar"
// (activate payouts) onboarding UI. It only INVOKES server callables and follows
// the returned Stripe-hosted URL; no Stripe logic, no secrets here.
// from: src/pages/admin/AdminPayments.jsx L56-94
// ============================================================================

// All onboarding actions are server callables (Cloud Functions), passed the shopId:
const call = useCallback(async (name) => {
  const fn = httpsCallable(functions, name);
  const res = await fn({ shopId });
  return res.data;
}, [shopId]);

// On return from Stripe-hosted onboarding, re-poll the REAL status from Stripe
// (returning to ?return=1 is NOT treated as completion):
useEffect(() => {
  const q = new URLSearchParams(window.location.search);
  if (!shopId) return;
  if (q.get('return') === '1' || q.get('refresh') === '1') {
    (async () => {
      await call('refreshConnectStatus');   // server: stripe.accounts.retrieve → persist status
      window.history.replaceState({}, '', '/admin/payments');
    })();
  }
}, [shopId, call]);

// Each button runs a callable and, if it returns a Stripe URL, redirects to it:
const run = async (name, action) => {
  const data = await call(name);
  if (data?.url) { window.location.href = data.url; return; }   // Stripe-hosted onboarding/login URL
};

// Callables used (all server-side, see connectOnboarding.account.ts):
//   createConnectAccount      → create Express account + onboarding link (redirect)
//   createConnectAccountLink  → resume an expired onboarding link
//   refreshConnectStatus      → re-poll Stripe and persist status
//   createConnectLoginLink    → Express dashboard one-time link
//   setShopCommission         → PLATFORM-ONLY: set per-shop commissionBps
