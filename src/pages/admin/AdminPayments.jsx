import React, { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { useShopId } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
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
      <Page title="Utbetalningar">
        <Card className="flex items-center justify-center py-16">
          <span className="text-[13px] text-admin-text-muted">Laddar…</span>
        </Card>
      </Page>
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
              : 'Plattformsavgift sätts av plattformen.'}
          </p>
          {isPlatform && (
            <p className="mt-2 text-[12px] text-admin-text-muted">
              (Avgiften redigeras från plattformskonsolen.)
            </p>
          )}
        </CardSection>
      </div>
    </Page>
  );
};

export default AdminPayments;
