import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import { useShopId } from '../../contexts/ShopContext';
import AppLayout from '../../components/layout/AppLayout';
import { Page, Card, CardSection, Button, StatusPill } from '../../components/admin/ui';

/**
 * AdminDomain — shop owner connects their own custom domain via Cloudflare for
 * SaaS. The whole flow is driven by three callables (server enforces the shop
 * boundary; this page only ever acts on the managed shop via useShopId):
 *   requestCustomDomain({shopId, hostname}) → {cnameTarget, hostname}
 *   checkCustomDomainStatus({shopId})       → {status, reason?}
 *   removeCustomDomain({shopId})
 * Live state streams from shops/{shopId}.customDomain (onSnapshot). The callables
 * only nudge the backend; the doc is the source of truth for what we render.
 *
 * States: empty (no domain) → pending_dns/verifying (show DNS instructions) →
 * active (green, live link) → error (reason + retry).
 */

// customDomain.status → badge. Both 'pending_dns' and 'verifying' sit in the
// "waiting" family but read differently to the owner (DNS not seen yet vs.
// Cloudflare issuing the certificate).
const STATUS_UI = {
  pending_dns: { tone: 'warning', label: 'Väntar på DNS' },
  verifying:   { tone: 'info',    label: 'Verifierar / certifikat utfärdas' },
  active:      { tone: 'success', label: 'Aktiv' },
  error:       { tone: 'danger',  label: 'Fel' },
};

// FQDN validation — a single hostname label chain, no protocol/path/port.
// Kept deliberately strict: lowercase letters/digits/hyphens per label, at
// least two labels (a TLD), no leading/trailing dot.
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

// Normalize what the owner pastes: strip protocol, path, port, whitespace, a
// stray "www." is left intact (their choice), lowercase.
const normalizeHostname = (raw) =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:.*$/, '')
    .replace(/\.$/, '');

// An apex/naked domain (exactly two labels, e.g. "dindomän.se") can't use a
// CNAME at the root on most Swedish DNS hosts — warn but don't block.
const isApex = (host) => host.split('.').filter(Boolean).length === 2;

// Neutral, un-scary error rendering. The backend surfaces a specific code when
// Cloudflare for SaaS isn't wired up on the platform yet — treat that as "not
// enabled" rather than a failure the owner can act on.
const NOT_CONFIGURED_RE = /cloudflare.*(not|inte).*(config|aktiver)|not[-_ ]?configured|failed-precondition/i;

const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — owner can still select the text manually */
    }
  };
  return (
    <Button variant="plain" onClick={copy} className="shrink-0">
      {copied ? 'Kopierat ✓' : 'Kopiera'}
    </Button>
  );
};

const COOLDOWN_MS = 15000; // polite gap between manual status checks

const AdminDomain = () => {
  const shopId = useShopId();

  const [domain, setDomain] = useState(null); // shops/{id}.customDomain | undefined
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');       // '' | 'request' | 'check' | 'remove'
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  const [hostnameInput, setHostnameInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Live subscription to the shop's customDomain map.
  useEffect(() => {
    if (!shopId) return;
    const unsub = onSnapshot(
      doc(db, 'shops', shopId),
      (snap) => {
        setDomain((snap.data() || {}).customDomain || null);
        setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); }
    );
    return () => unsub();
  }, [shopId]);

  // Tick a clock only while a cooldown is pending, so the "vänta N s" hint
  // counts down live without a permanent interval.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const handleCallableError = useCallback((e, fallback) => {
    const msg = e?.message || fallback;
    if (NOT_CONFIGURED_RE.test(`${e?.code || ''} ${msg}`)) {
      setNotConfigured(true);
      return;
    }
    setError(msg);
  }, []);

  const requestDomain = async () => {
    const host = normalizeHostname(hostnameInput);
    setInputError('');
    if (!HOSTNAME_RE.test(host)) {
      setInputError('Ange en giltig domän, t.ex. butik.dindomän.se (utan http:// och utan snedstreck).');
      return;
    }
    setError(''); setNotice(''); setNotConfigured(false); setBusy('request');
    try {
      await httpsCallable(functions, 'requestCustomDomain')({ shopId, hostname: host });
      setHostnameInput('');
      // The onSnapshot listener renders the pending state once the doc is written.
    } catch (e) {
      handleCallableError(e, 'Kunde inte begära domänen. Försök igen.');
    } finally {
      setBusy('');
    }
  };

  const checkStatus = async () => {
    if (Date.now() < cooldownUntil) return;
    setError(''); setNotice(''); setNotConfigured(false); setBusy('check');
    try {
      const res = await httpsCallable(functions, 'checkCustomDomainStatus')({ shopId });
      const status = res?.data?.status;
      if (status === 'active') {
        setNotice('Domänen är nu aktiv!');
      } else if (status === 'error') {
        setError(res?.data?.reason || 'Domänen kunde inte verifieras.');
      } else {
        setNotice('Status kontrollerad — inväntar fortfarande DNS/certifikat.');
      }
    } catch (e) {
      handleCallableError(e, 'Kunde inte kontrollera status.');
    } finally {
      setBusy('');
      setCooldownUntil(Date.now() + COOLDOWN_MS);
    }
  };

  const removeDomain = async () => {
    setError(''); setNotice(''); setNotConfigured(false); setBusy('remove');
    try {
      await httpsCallable(functions, 'removeCustomDomain')({ shopId });
      setConfirmRemove(false);
      // onSnapshot returns us to the empty state once the doc clears.
    } catch (e) {
      handleCallableError(e, 'Kunde inte koppla från domänen.');
    } finally {
      setBusy('');
    }
  };

  const previewHost = normalizeHostname(hostnameInput);
  const previewApexWarn = previewHost && HOSTNAME_RE.test(previewHost) && isApex(previewHost);

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const inCooldown = cooldownLeft > 0;

  const status = domain?.status;
  const ui = STATUS_UI[status] || null;

  const banners = (
    <>
      {error && (
        <div className="rounded-md bg-red-50 border-l-4 border-red-400 p-3 text-[13px] text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-md bg-sky-50 border-l-4 border-sky-400 p-3 text-[13px] text-sky-700">{notice}</div>
      )}
      {notConfigured && (
        <div className="rounded-md bg-admin-neutral-bg border-l-4 border-admin-neutral-dot p-3 text-[13px] text-admin-neutral-text">
          Funktionen för egen domän är inte aktiverad ännu. Kontakta oss så hjälper vi dig igång.
        </div>
      )}
    </>
  );

  if (loading) {
    return (
      <AppLayout>
        <Page title="Domän">
          <Card className="flex items-center justify-center py-16">
            <span className="text-[13px] text-admin-text-muted">Laddar…</span>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page
        title="Domän"
        subtitle="Använd din egen domän för butiken"
      >
        <div className="space-y-4">
          {banners}

          {/* EMPTY STATE — no domain connected yet. */}
          {!domain && !notConfigured && (
            <CardSection title="Använd din egen domän">
              <p className="text-[13px] text-admin-text-muted mb-2">
                Koppla din egen domän till butiken så att kunderna når den på t.ex.
                <span className="font-medium text-admin-text"> butik.dindomän.se</span> i stället för
                plattformens adress. Din butik fungerar precis som vanligt — bara på din egen adress,
                med giltigt SSL-certifikat.
              </p>
              <p className="text-[13px] text-admin-text-muted mb-4">
                Vi rekommenderar en <span className="font-medium text-admin-text">underdomän</span>{' '}
                (t.ex. <span className="font-mono text-[12px]">butik.dindomän.se</span> eller{' '}
                <span className="font-mono text-[12px]">shop.dindomän.se</span>). En toppdomän utan
                prefix (<span className="font-mono text-[12px]">dindomän.se</span>) och{' '}
                <span className="font-mono text-[12px]">www</span> går ofta inte att peka med en
                CNAME hos svenska DNS-leverantörer — välj därför helst en underdomän.
              </p>

              <label className="block text-[13px] font-medium text-admin-text mb-1" htmlFor="domain-input">
                Din domän
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-start max-w-xl">
                <div className="flex-1">
                  <input
                    id="domain-input"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={hostnameInput}
                    placeholder="butik.dindomän.se"
                    onChange={(e) => { setHostnameInput(e.target.value); setInputError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && busy !== 'request') requestDomain(); }}
                    className="w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]"
                  />
                  {inputError && <p className="mt-1 text-[12px] text-red-600">{inputError}</p>}
                  {!inputError && previewApexWarn && (
                    <p className="mt-1 text-[12px] text-admin-caution-text">
                      <span className="font-medium">{previewHost}</span> ser ut som en toppdomän. Använd
                      hellre en underdomän som <span className="font-mono">butik.{previewHost}</span>.
                    </p>
                  )}
                </div>
                <Button variant="primary" disabled={busy === 'request'} onClick={requestDomain}>
                  {busy === 'request' ? 'Ansluter…' : 'Anslut domän'}
                </Button>
              </div>
            </CardSection>
          )}

          {/* PENDING STATES — DNS instructions + status check. */}
          {domain && (status === 'pending_dns' || status === 'verifying') && (
            <>
              <CardSection title="Status">
                <div className="flex flex-wrap items-center gap-3">
                  {ui && <StatusPill tone={ui.tone}>{ui.label}</StatusPill>}
                  <span className="text-[13px] text-admin-text-muted">
                    {domain.hostname}
                  </span>
                </div>
                <p className="mt-3 text-[13px] text-admin-text-muted">
                  Lägg till DNS-posten nedan hos din domänleverantör. När vi ser posten verifieras
                  domänen och ett SSL-certifikat utfärdas automatiskt. Det kan ta upp till någon timme
                  innan allt är klart — du behöver inte hålla den här sidan öppen.
                </p>
              </CardSection>

              <CardSection title="DNS-post att lägga till">
                <p className="text-[13px] text-admin-text-muted mb-3">
                  Skapa en <span className="font-medium text-admin-text">CNAME</span>-post med följande värden:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] border border-admin-border rounded-[var(--radius-admin-el)] overflow-hidden">
                    <thead>
                      <tr className="bg-admin-neutral-bg text-admin-text-muted text-left">
                        <th className="px-3 py-2 font-medium">Typ</th>
                        <th className="px-3 py-2 font-medium">Namn</th>
                        <th className="px-3 py-2 font-medium">Värde</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-admin-border">
                        <td className="px-3 py-2 font-mono">CNAME</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono break-all">{domain.hostname || '—'}</span>
                            {domain.hostname && <CopyButton value={domain.hostname} />}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono break-all">{domain.cnameTarget || '—'}</span>
                            {domain.cnameTarget && <CopyButton value={domain.cnameTarget} />}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[12px] text-admin-text-muted">
                  Tips: som <span className="font-medium">Namn</span> anger vissa leverantörer bara
                  prefixet (t.ex. <span className="font-mono">butik</span>) i stället för hela domänen —
                  fyll i det din leverantör förväntar sig.
                </p>

                <div className="mt-4 border-t border-admin-border pt-4 space-y-2">
                  <h4 className="text-[13px] font-semibold text-admin-text">Så här gör du hos vanliga leverantörer</h4>
                  <ul className="text-[13px] text-admin-text-muted list-disc pl-5 space-y-1">
                    <li>
                      <span className="font-medium text-admin-text">Loopia:</span> logga in → Mina domäner →
                      välj domänen → DNS-inställningar → lägg till post → välj CNAME.
                    </li>
                    <li>
                      <span className="font-medium text-admin-text">One.com:</span> logga in → DNS-inställningar →
                      DNS-poster → lägg till CNAME.
                    </li>
                    <li>
                      <span className="font-medium text-admin-text">Binero:</span> logga in → Domäner →
                      DNS → lägg till post → välj CNAME.
                    </li>
                  </ul>
                </div>
              </CardSection>

              <CardSection title="Kontrollera status">
                <p className="text-[13px] text-admin-text-muted mb-3">
                  Statusen uppdateras automatiskt, men du kan även kontrollera den själv när du lagt
                  till DNS-posten.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    disabled={busy === 'check' || inCooldown}
                    onClick={checkStatus}
                  >
                    {busy === 'check' ? 'Kontrollerar…' : 'Kontrollera status'}
                  </Button>
                  {inCooldown && (
                    <span className="text-[12px] text-admin-text-muted">Vänta {cooldownLeft} s…</span>
                  )}
                </div>
              </CardSection>

              <CardSection title="Koppla från">
                <p className="text-[13px] text-admin-text-muted mb-3">
                  Ångrat dig? Du kan avbryta och ta bort domänen.
                </p>
                <RemoveControl
                  confirm={confirmRemove}
                  setConfirm={setConfirmRemove}
                  busy={busy === 'remove'}
                  onRemove={removeDomain}
                />
              </CardSection>
            </>
          )}

          {/* ACTIVE STATE. */}
          {domain && status === 'active' && (
            <CardSection title="Din domän är aktiv">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <StatusPill tone="success">Aktiv</StatusPill>
                <a
                  href={`https://${domain.hostname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-[var(--color-admin-primary)] underline break-all"
                >
                  https://{domain.hostname}
                </a>
              </div>
              <p className="text-[13px] text-admin-text-muted mb-4">
                Din butik nås nu på din egen domän med giltigt SSL-certifikat. Behåll DNS-posten
                (CNAME) så länge du vill använda domänen.
              </p>
              <div className="border-t border-admin-border pt-4">
                <RemoveControl
                  confirm={confirmRemove}
                  setConfirm={setConfirmRemove}
                  busy={busy === 'remove'}
                  onRemove={removeDomain}
                  label="Koppla från domän"
                />
              </div>
            </CardSection>
          )}

          {/* ERROR STATE. */}
          {domain && status === 'error' && (
            <CardSection title="Något gick fel med domänen">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <StatusPill tone="danger">Fel</StatusPill>
                <span className="text-[13px] text-admin-text-muted break-all">{domain.hostname}</span>
              </div>
              <div className="mb-4 rounded-md bg-red-50 border-l-4 border-red-400 p-3 text-[13px] text-red-700">
                {domain.reason || 'Domänen kunde inte verifieras. Kontrollera att DNS-posten (CNAME) är korrekt inlagd.'}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  disabled={busy === 'check' || inCooldown}
                  onClick={checkStatus}
                >
                  {busy === 'check' ? 'Försöker…' : 'Försök igen'}
                </Button>
                {inCooldown && (
                  <span className="text-[12px] text-admin-text-muted">Vänta {cooldownLeft} s…</span>
                )}
                <RemoveControl
                  confirm={confirmRemove}
                  setConfirm={setConfirmRemove}
                  busy={busy === 'remove'}
                  onRemove={removeDomain}
                  label="Ta bort domän"
                />
              </div>
            </CardSection>
          )}
        </div>
      </Page>
    </AppLayout>
  );
};

// Two-step "remove" — a plain button flips to an inline confirm so a misclick
// never disconnects a live domain. Shared by pending/active/error states.
const RemoveControl = ({ confirm, setConfirm, busy, onRemove, label = 'Koppla från domän' }) => {
  if (!confirm) {
    return (
      <Button variant="secondary" disabled={busy} onClick={() => setConfirm(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-admin-text">Är du säker?</span>
      <Button variant="secondary" disabled={busy} onClick={onRemove}>
        {busy ? 'Tar bort…' : 'Ja, koppla från'}
      </Button>
      <Button variant="plain" disabled={busy} onClick={() => setConfirm(false)}>
        Avbryt
      </Button>
    </div>
  );
};

export default AdminDomain;
