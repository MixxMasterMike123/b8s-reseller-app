// ImpersonationIntake — the ADMIN-host side of P4.3 "Open Shop Admin".
//
// The platform console opens this host with ?impersonate=<shopId>&audit=<id>.
// This component (mounted once in admin appMode, inside Router + AuthProvider)
// consumes those params exactly once:
//   1. waits for auth to resolve;
//   2. requires the logged-in user to be a platform operator (isPlatform);
//   3. verifies the referenced audit doc exists, is the operator's own, and
//      matches the shopId (defense-in-depth cross-check, per Mikael);
//   4. stores the per-tab impersonation session (config/impersonation.js);
//   5. strips the params and navigates to /admin so the URL is clean and the
//      session is what drives the shopId (ShopProvider honors it in admin mode).
//
// A non-platform user (or a mismatched/absent audit doc) is refused with a toast
// and the params are stripped — no session is created. The DB rules are the hard
// gate regardless; this is the UI guard + accountability cross-check.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { setImpersonation } from '../../config/impersonation';
import toast from 'react-hot-toast';

const ImpersonationIntake = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isPlatform, loading } = useAuth();
  // Guard so the async intake runs once per param arrival (StrictMode double-mount
  // + the post-nav re-render must not re-process or double-write).
  const handledRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlImpersonate = params.get('impersonate');
    const urlAuditId = params.get('audit');

    // STASH-FIRST (survives the login round-trip). When the operator lands here
    // WITHOUT a session (incognito / fresh browser), AdminRoute redirects to
    // /login and DISCARDS the URL — so the ?impersonate=&audit= params are gone
    // by the time they log in and the effect re-runs. To survive that, we copy
    // the params into sessionStorage the INSTANT we see them (before the auth
    // wait below), and treat sessionStorage as the source of truth. It's the
    // per-tab handshake: sessionStorage is scoped to this tab and cleared once
    // consumed or refused, so it can't leak into a later unrelated session.
    const PENDING_KEY = 'nord-impersonation-pending';
    if (urlImpersonate) {
      try {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ impersonate: urlImpersonate, auditId: urlAuditId || '' })
        );
      } catch { /* sessionStorage unavailable → fall back to URL params below */ }
    }

    // Resolve the handshake from the stash first, then the URL (covers both the
    // already-logged-in case and the post-login case where the URL lost them).
    let pending = null;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (raw) pending = JSON.parse(raw);
    } catch { /* ignore */ }
    const impersonate = pending?.impersonate || urlImpersonate;
    const auditId = pending?.auditId || urlAuditId;
    if (!impersonate) return; // nothing to intake

    if (loading) return; // wait for auth to resolve before deciding

    // NOT-YET-AUTHENTICATED is a WAIT, not a refusal — the operator is mid-login.
    // The stash above already preserved the handshake, so once they log in this
    // effect re-runs (currentUser is a dep) and proceeds from sessionStorage.
    if (!currentUser) return;

    if (handledRef.current) return;
    handledRef.current = true;

    const clearPending = () => {
      try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    };

    const stripParams = () => {
      clearPending();
      // Drop ONLY our params if they're still in the URL; preserve any others.
      params.delete('impersonate');
      params.delete('audit');
      const qs = params.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
    };

    const refuse = (msg) => {
      toast.error(msg);
      stripParams();
    };

    (async () => {
      // 1) a logged-in user who is NOT a platform operator → refuse.
      if (!isPlatform) {
        refuse('Endast plattformsadministratörer kan öppna en butiks admin.');
        return;
      }
      // 2) verify the audit doc: exists, is THIS operator's, matches the shop.
      try {
        if (!auditId) {
          refuse('Saknar revisionslogg — impersonering avbruten.');
          return;
        }
        const snap = await getDoc(doc(db, 'impersonationAudit', auditId));
        // Verify the audit doc exists and targets the shop in the URL. We do NOT
        // require the audit's actorUid to equal the lander's uid: the platform
        // console and the shop-admin host are SEPARATE origins with independent
        // Firebase Auth persistence, so an operator who launched as user A on the
        // platform host can legitimately land on the admin host as a DIFFERENT
        // platform operator B (whoever that browser is signed into). Requiring
        // A==B broke that case ("Revisionsloggen matchar inte") without adding
        // real security: data access during impersonation is gated by isPlatform()
        // in the Firestore rules (token.platform), which we already require above
        // (and re-enforce at every read), NOT by this cross-check. So we keep the
        // meaningful gates (doc exists + shop matches + lander isPlatform) and let
        // the AUDIT trail carry the launcher; the SESSION carries who actually
        // operated (the lander) for accurate accountability in the banner.
        if (!snap.exists() || snap.data().shopId !== impersonate) {
          refuse('Revisionsloggen matchar inte — impersonering avbruten.');
          return;
        }
        // 3) store the session, then HARD-reload to a clean /admin. A full
        // reload (not a React navigate) is deliberate: the banner reads the
        // session in its useState initializer at mount, and StoreSettings loads
        // the shop config keyed off the resolved shopId — a reload guarantees
        // both initialize against the now-active impersonation rather than the
        // pre-intake default. (A soft navigate would leave the already-mounted
        // banner with its initial null session.) The success toast would be lost
        // across the reload, so we skip it; the banner IS the confirmation.
        clearPending(); // handshake consumed — don't let it re-fire after reload
        setImpersonation({
          shopId: impersonate,
          shopName: snap.data().shopName || impersonate,
          reason: snap.data().reason || '',
          actorUid: currentUser.uid,
          auditId,
        });
        window.location.replace('/admin');
      } catch (e) {
        console.error('Impersonation intake failed:', e);
        refuse('Kunde inte verifiera impersonering.');
      }
    })();
  }, [loading, location.search, location.pathname, currentUser, isPlatform, navigate]);

  // This component only handles the param handshake; the banner reads the stored
  // session, so an existing session on a soft reload needs nothing here.
  return null;
};

export default ImpersonationIntake;
