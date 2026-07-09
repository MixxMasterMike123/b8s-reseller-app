// ImpersonateShopModal — the operator's "Open Shop Admin" launch (P4.3).
//
// WorkOS-style audited impersonation: a mandatory reason, then we (1) write the
// START audit doc and (2) open the SHOP-ADMIN host with ?impersonate=<shopId>
// &audit=<id>. The admin host's intake (App.jsx) verifies isPlatform + the audit
// doc, stores the per-tab session, strips the params, and shows a non-dismissible
// banner. Nothing here grants data access — the operator already has it via the
// Phase 3 rules; this is accountability + which-shop routing.
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { APP_URLS } from '../../config/urls';
import { IMPERSONATION_TTL_MS } from '../../config/impersonation';
import { writeImpersonationStart } from '../../config/impersonationAudit';
import toast from 'react-hot-toast';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

const ImpersonateShopModal = ({ shop, onClose }) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [launching, setLaunching] = useState(false);

  const ttlMinutes = Math.round(IMPERSONATION_TTL_MS / 60000);

  const handleLaunch = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 4) {
      toast.error('Ange en anledning (minst 4 tecken).');
      return;
    }
    setLaunching(true);
    try {
      const expiresAt = Date.now() + IMPERSONATION_TTL_MS;
      const auditId = await writeImpersonationStart({
        actor: currentUser,
        shopId: shop.id,
        shopName: shop.name || shop.id,
        reason: trimmed,
        expiresAt,
      });

      // Mint a short-lived custom token for THIS operator's own uid so the admin
      // host (a SEPARATE origin with its own empty auth store) can sign us in
      // silently — otherwise a browser that never logged into the admin host
      // directly lands on a login screen and the handshake is lost. The token is
      // re-materialization of our OWN identity (platform-gated server-side), not
      // a privilege grant; the audit-doc check remains the accountability gate.
      let handoffToken = '';
      try {
        const res = await httpsCallable(functions, 'mintImpersonationToken')({});
        handoffToken = res?.data?.token || '';
      } catch (e) {
        // Non-fatal: fall back to the param-only open. In a browser already
        // logged into the admin host (the pre-existing working case) the token
        // isn't needed; only a session-less browser degrades to a login prompt.
        console.warn('mintImpersonationToken failed; opening without silent sign-in:', e?.message || e);
      }

      // Open the SHOP-ADMIN surface (its own host) with the intake params in the
      // QUERY and the handoff token in the FRAGMENT (#). The fragment is never
      // sent to the server or captured in Referer/access logs, and the intake
      // wipes it from history immediately after consuming it.
      const params = new URLSearchParams({ impersonate: shop.id, audit: auditId });
      const frag = handoffToken ? `#handoff=${encodeURIComponent(handoffToken)}` : '';
      window.open(`${APP_URLS.ADMIN_URL}/admin?${params.toString()}${frag}`, '_blank', 'noopener');

      toast.success(`Öppnar ${shop.name || shop.id} som plattformsadmin`);
      onClose();
    } catch (e) {
      console.error('Impersonation launch failed:', e);
      toast.error('Kunde inte starta impersonering (revisionsloggen misslyckades).');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-900 shadow-2xl">
        <div className="flex items-start gap-3 border-b border-white/10 px-6 py-5">
          <div className="rounded-lg bg-amber-500/15 p-2">
            <ShieldExclamationIcon className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Öppna Shop Admin</h2>
            <p className="mt-0.5 text-sm text-gray-400">
              Du loggar in i <span className="font-medium text-gray-200">{shop.name || shop.id}</span> som
              plattformsadmin. Åtgärden loggas.
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-gray-300">
            Anledning <span className="text-amber-400">*</span>
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="T.ex. felsöker en order åt butiksägaren"
            className="mt-2 w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Sessionen upphör automatiskt efter {ttlMinutes} minuter. En icke-stängbar banner visas i
            butiksadminen tills du avslutar.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            disabled={launching}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {launching ? 'Startar…' : 'Öppna admin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonateShopModal;
