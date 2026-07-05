// ImpersonationBanner — the non-dismissible "you are viewing X as platform"
// banner shown across shop admin while an operator impersonation session is
// active (P4.3). Mounted at the top of AppLayout so it sits above every admin
// page. It cannot be dismissed except by "Avsluta" (which ends the session and
// writes the end-audit) — a banner you can hide would defeat the point.
//
// It also enforces expiry on the client: a 1s tick re-reads the session, and
// when it has expired (or been cleared) the banner ends the session the same
// way. getImpersonation() itself fails closed on expiry, so the banner simply
// reflects that.
import React, { useEffect, useState, useCallback } from 'react';
import { getImpersonation, clearImpersonation } from '../../config/impersonation';
import { writeImpersonationEnd } from '../../config/impersonationAudit';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const ImpersonationBanner = () => {
  const [session, setSession] = useState(() => getImpersonation());
  const [ending, setEnding] = useState(false);

  // End the session: stamp the audit (best-effort), clear, and hard-reload to
  // /admin so ShopProvider re-resolves to the default shop with no stale state.
  const endSession = useCallback(
    async (endReason) => {
      if (ending) return;
      setEnding(true);
      const current = getImpersonation();
      clearImpersonation();
      try {
        if (current?.auditId) await writeImpersonationEnd(current.auditId, endReason);
      } catch (e) {
        console.error('Failed to stamp impersonation end:', e);
      }
      window.location.replace('/admin');
    },
    [ending]
  );

  // Tick every second to refresh the countdown and catch expiry.
  useEffect(() => {
    if (!session) return undefined;
    const id = setInterval(() => {
      const current = getImpersonation(); // null once expired (fails closed)
      if (!current) {
        clearInterval(id);
        endSession('expired');
        return;
      }
      setSession(current);
    }, 1000);
    return () => clearInterval(id);
  }, [session, endSession]);

  if (!session) return null;

  const remaining = session.expiresAt - Date.now();

  return (
    // h-10 is load-bearing: AppLayout offsets the fixed left nav by exactly
    // this height (top-24 = 56px bar + 40px banner) while a session is active.
    <div className="sticky top-0 z-50 h-10 bg-amber-500 text-amber-950 shadow-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldExclamationIcon className="h-5 w-5 shrink-0" />
          <p className="truncate text-sm font-medium">
            Plattformsläge: du visar{' '}
            <span className="font-semibold">{session.shopName || session.shopId}</span> som
            plattformsadmin
            {session.reason ? ` · ${session.reason}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden sm:inline text-xs font-medium tabular-nums">
            Upphör om {formatRemaining(remaining)}
          </span>
          <button
            onClick={() => endSession('manual')}
            disabled={ending}
            className="rounded-md bg-amber-950/90 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-950 disabled:opacity-50"
          >
            {ending ? 'Avslutar…' : 'Avsluta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
