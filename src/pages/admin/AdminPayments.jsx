import React, { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { useShopId } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import { Page, Card, CardSection, Button, StatusPill } from '../../components/admin/ui';

/**
 * AdminPayments — per-shop Stripe Connect onboarding + payout status.
 *
 * The front door for a shop to start receiving payouts: it shows the connected-
 * account status and the right CTA for each state, all driven by the
 * connectOnboarding callables. The shop boundary is enforced server-side
 * (requireAdminOfShop) — this page only ever acts on the admin's managed shop
 * (useShopId). The platform commission rate is shown read-only here; it's set
 * from the platform console (Slice 3).
 *
 * Onboarding gotcha handled: returning from Stripe-hosted onboarding (?return=1)
 * does NOT mean it finished, so on mount with ?return/?refresh we re-poll via
 * refreshConnectStatus rather than trusting the redirect.
 */

const STATUS_UI = {
  none:       { tone: 'neutral',  label: 'Ej aktiverat' },
  onboarding: { tone: 'info',     label: 'Onboarding påbörjad' },
  pending:    { tone: 'warning',  label: 'Granskas av Stripe' },
  restricted: { tone: 'danger',   label: 'Åtgärd krävs' },
  active:     { tone: 'success',  label: 'Aktivt' },
};

const AdminPayments = () => {
  const shopId = useShopId();
  const { isPlatform } = useAuth();

  const [pay, setPay] = useState(null);       // shops/{id}.payments
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');        // which action is running
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Live subscription to the shop's payments map.
  useEffect(() => {
    if (!shopId) return;
    const unsub = onSnapshot(
      doc(db, 'shops', shopId),
      (snap) => {
        setPay((snap.data() || {}).payments || {});
        setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); }
    );
    return () => unsub();
  }, [shopId]);

  const call = useCallback(async (name) => {
    const fn = httpsCallable(functions, name);
    const res = await fn({ shopId });
    return res.data;
  }, [shopId]);

  // On return from Stripe onboarding, re-poll the real status (don't trust ?return).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (!shopId) return;
    if (q.get('return') === '1' || q.get('refresh') === '1') {
      (async () => {
        try {
          setBusy('refresh');
          await call('refreshConnectStatus');
          setNotice('Status uppdaterad från Stripe.');
        } catch (e) {
          setError(e.message || 'Kunde inte uppdatera status.');
        } finally {
          setBusy('');
          // Strip the query params so a reload doesn't re-trigger.
          window.history.replaceState({}, '', '/admin/payments');
        }
      })();
    }
  }, [shopId, call]);

  const run = async (name, action) => {
    setError(''); setNotice(''); setBusy(action);
    try {
      const data = await call(name);
      if (data?.url) { window.location.href = data.url; return; }
      if (name === 'refreshConnectStatus') setNotice('Status uppdaterad.');
    } catch (e) {
      setError(e.message || 'Något gick fel.');
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Page title="Utbetalningar">
          <Card className="flex items-center justify-center py-16">
            <span className="text-[13px] text-admin-text-muted">Laddar…</span>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  const status = pay?.connectStatus || 'none';
  const ui = STATUS_UI[status] || STATUS_UI.none;
  const connectEnabled = pay?.connectEnabled === true || isPlatform;
  const hasAccount = !!pay?.stripeAccountId;
  const chargesEnabled = pay?.chargesEnabled === true;
  const requirementsDue = Array.isArray(pay?.requirementsDue) ? pay.requirementsDue : [];
  const commissionBps = Number.isInteger(pay?.commissionBps) ? pay.commissionBps : null;

  return (
    <AppLayout>
    <Page
      title="Utbetalningar"
      subtitle="Ta emot betalningar och få utbetalt via Stripe"
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border-l-4 border-red-400 p-3 text-[13px] text-red-700">{error}</div>
        )}
        {notice && (
          <div className="rounded-md bg-sky-50 border-l-4 border-sky-400 p-3 text-[13px] text-sky-700">{notice}</div>
        )}

        <CardSection title="Status">
          <div className="flex items-center gap-3 mb-3">
            <StatusPill tone={ui.tone}>{ui.label}</StatusPill>
            {chargesEnabled && <span className="text-[13px] text-admin-text-muted">Du kan ta emot betalningar.</span>}
          </div>

          {!connectEnabled && (
            <p className="text-[13px] text-admin-text-muted">
              Utbetalningar är inte aktiverade för din butik ännu. Kontakta oss för att komma igång.
            </p>
          )}

          {connectEnabled && status === 'none' && (
            <>
              <p className="text-[13px] text-admin-text-muted mb-4">
                Aktivera utbetalningar för att ta emot pengar från dina försäljningar.
                Stripe sköter onboarding och utbetalningar till ditt bankkonto.
              </p>
              <Button variant="primary" disabled={busy === 'start'} onClick={() => run('createConnectAccount', 'start')}>
                {busy === 'start' ? 'Öppnar…' : 'Aktivera utbetalningar'}
              </Button>
            </>
          )}

          {connectEnabled && hasAccount && !chargesEnabled && (
            <>
              <p className="text-[13px] text-admin-text-muted mb-3">
                {status === 'restricted'
                  ? 'Stripe behöver mer information innan du kan ta emot betalningar.'
                  : 'Slutför onboardingen hos Stripe för att aktivera utbetalningar.'}
              </p>
              {requirementsDue.length > 0 && (
                <ul className="mb-3 text-[12px] text-admin-text-muted list-disc pl-5">
                  {requirementsDue.slice(0, 8).map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
              <div className="flex items-center gap-3">
                <Button variant="primary" disabled={busy === 'continue'} onClick={() => run('createConnectAccountLink', 'continue')}>
                  {busy === 'continue' ? 'Öppnar…' : 'Fortsätt onboarding'}
                </Button>
                <Button variant="secondary" disabled={busy === 'refresh'} onClick={() => run('refreshConnectStatus', 'refresh')}>
                  {busy === 'refresh' ? 'Uppdaterar…' : 'Uppdatera status'}
                </Button>
              </div>
            </>
          )}

          {chargesEnabled && (
            <div className="flex items-center gap-3">
              <Button variant="secondary" disabled={busy === 'dashboard'} onClick={() => run('createConnectLoginLink', 'dashboard')}>
                {busy === 'dashboard' ? 'Öppnar…' : 'Öppna Stripe-panel'}
              </Button>
              <Button variant="plain" disabled={busy === 'refresh'} onClick={() => run('refreshConnectStatus', 'refresh')}>
                {busy === 'refresh' ? 'Uppdaterar…' : 'Uppdatera status'}
              </Button>
            </div>
          )}
        </CardSection>

        <CardSection title="Avgift">
          <p className="text-[13px] text-admin-text-muted">
            {commissionBps != null
              ? `Plattformsavgift: ${(commissionBps / 100).toFixed(2)} % per försäljning.`
              : 'Plattformsavgift: plattformens standard tillämpas (sätt en egen nedan).'}
          </p>
          {isPlatform ? (
            <CommissionEditor shopId={shopId} currentBps={commissionBps} />
          ) : (
            <p className="mt-2 text-[12px] text-admin-text-muted">
              Avgiften sätts av plattformen.
            </p>
          )}
        </CardSection>

        {/* Balance & payout risk — only meaningful once the account exists. */}
        {hasAccount && (
          <CardSection title="Saldo & utbetalningsrisk">
            <BalancePanel shopId={shopId} isPlatform={isPlatform} />
          </CardSection>
        )}
      </div>
    </Page>
    </AppLayout>
  );
};

// Connected-account balance + (platform-only) per-account payout-delay control.
// The balance read is shop-admin-allowed (own shop); setting the delay is a
// platform risk decision (setConnectPayoutDelay is requirePlatform server-side).
const BalancePanel = ({ shopId, isPlatform }) => {
  const [bal, setBal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      setLoading(true);
      const res = await httpsCallable(functions, 'getConnectBalance')({ shopId });
      setBal(res.data);
    } catch (e) {
      setErr(e.message || 'Kunde inte hämta saldo.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-[13px] text-admin-text-muted">Hämtar saldo…</p>;
  if (err) return <p className="text-[13px] text-red-700">{err}</p>;
  if (!bal?.hasAccount) return <p className="text-[13px] text-admin-text-muted">Inget anslutet konto ännu.</p>;

  const sek = (ore) => `${(ore / 100).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;

  return (
    <div className="space-y-3">
      {bal.negative && (
        <div className="rounded-md bg-red-50 border-l-4 border-red-400 p-3 text-[13px] text-red-700">
          ⚠️ Negativt saldo på det anslutna kontot ({sek(bal.availableOre)}). Stripe drar inte automatiskt
          från säljarens bankkonto i SE/EU — saldot kan ligga kvar tills det regleras.
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 text-[13px]">
        <div>
          <div className="text-[12px] text-admin-text-muted">Tillgängligt</div>
          <div className={`tabular-nums ${bal.negative ? 'text-red-700 font-semibold' : 'text-admin-text'}`}>{sek(bal.availableOre)}</div>
        </div>
        <div>
          <div className="text-[12px] text-admin-text-muted">Väntande</div>
          <div className="tabular-nums text-admin-text">{sek(bal.pendingOre)}</div>
        </div>
        {bal.reservedOre > 0 && (
          <div>
            <div className="text-[12px] text-admin-text-muted">Reserverat</div>
            <div className="tabular-nums text-admin-text">{sek(bal.reservedOre)}</div>
          </div>
        )}
      </div>
      <Button variant="plain" onClick={load}>Uppdatera saldo</Button>

      {isPlatform && <PayoutDelayEditor shopId={shopId} current={bal.payoutDelayDays} onSaved={load} />}
    </div>
  );
};

// Platform-only: hold a SPECIFIC seller's payouts longer (targeted risk control,
// not a blanket hold). 'minimum' resets to the account-country floor.
const PayoutDelayEditor = ({ shopId, current, onSaved }) => {
  const [days, setDays] = useState(typeof current === 'number' ? String(current) : '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async (value) => {
    setMsg('');
    try {
      setSaving(true);
      await httpsCallable(functions, 'setConnectPayoutDelay')({ shopId, delayDays: value });
      setMsg('Sparat.');
      onSaved?.();
    } catch (e) {
      setMsg(e.message || 'Kunde inte spara.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-admin-border-soft pt-3">
      <label className="block text-[12px] font-semibold text-admin-text-muted mb-1">
        Utbetalningsfördröjning (dagar) — riskkontroll för denna säljare
      </label>
      <div className="flex items-end gap-3">
        <input
          type="number" min="0" max="365" step="1" value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="t.ex. 7"
          className="w-28 rounded-md border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text"
        />
        <Button variant="primary" disabled={saving} onClick={() => {
          const n = parseInt(days, 10);
          if (!Number.isInteger(n) || n < 0 || n > 365) { setMsg('Ange 0–365 dagar.'); return; }
          save(n);
        }}>
          {saving ? 'Sparar…' : 'Sätt fördröjning'}
        </Button>
        <Button variant="plain" disabled={saving} onClick={() => save('minimum')}>
          Återställ till minimum
        </Button>
        {msg && <span className="text-[12px] text-admin-text-muted">{msg}</span>}
      </div>
      {typeof current !== 'undefined' && current !== null && (
        <p className="mt-1 text-[12px] text-admin-text-muted">Nuvarande: {current === 'minimum' ? 'minimum' : `${current} dagar`}</p>
      )}
    </div>
  );
};

// Platform-only: edit a shop's per-sale commission. Input is a percentage for
// humans; stored as integer basis points (server validates 0..10000). The
// firestore.rules payments-map guard means this MUST go through the callable.
const CommissionEditor = ({ shopId, currentBps }) => {
  const [pct, setPct] = useState(currentBps != null ? (currentBps / 100).toString() : '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setMsg('');
    const n = parseFloat((pct || '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) { setMsg('Ange 0–100 %.'); return; }
    const bps = Math.round(n * 100);
    try {
      setSaving(true);
      await httpsCallable(functions, 'setShopCommission')({ shopId, commissionBps: bps });
      setMsg(`Sparat: ${(bps / 100).toFixed(2)} %`);
    } catch (e) {
      setMsg(e.message || 'Kunde inte spara.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex items-end gap-3">
      <div>
        <label className="block text-[12px] font-semibold text-admin-text-muted mb-1">Plattformsavgift (%)</label>
        <input
          type="number" min="0" max="100" step="0.01" value={pct}
          onChange={(e) => setPct(e.target.value)}
          placeholder="t.ex. 5"
          className="w-28 rounded-md border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text"
        />
      </div>
      <Button variant="primary" disabled={saving} onClick={save}>
        {saving ? 'Sparar…' : 'Spara avgift'}
      </Button>
      {msg && <span className="text-[12px] text-admin-text-muted">{msg}</span>}
    </div>
  );
};

export default AdminPayments;
