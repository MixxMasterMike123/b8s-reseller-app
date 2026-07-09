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
import { signInWithCustomToken } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
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
  // Guard so the silent sign-in handoff is attempted only once per tab, even
  // across the effect re-runs that the sign-in itself triggers.
  const handoffRef = useRef(false);

  useEffect(() => {
    if (loading) return; // wait for auth to resolve before deciding
    const params = new URLSearchParams(location.search);
    const impersonate = params.get('impersonate');
    const auditId = params.get('audit');
    if (!impersonate) return; // nothing to intake

    // SILENT SIGN-IN (cross-origin handoff). The platform host and this admin
    // host are SEPARATE origins with independent Firebase Auth sessions. The
    // launcher put a short-lived custom token minted for the launching operator's
    // OWN uid in the URL fragment (#handoff=). We ALWAYS exchange it when present
    // (once per tab) — NOT only when session-less — because the admin-host tab
    // may already hold a DIFFERENT operator's stale session (e.g. from earlier
    // testing). Proceeding with that wrong session makes the audit check fail
    // ("Revisionsloggen matchar inte", since actorUid was written for the
    // LAUNCHER). Signing in with the handoff re-materializes the correct
    // operator; if the tab is already that same operator it's a harmless re-auth.
    // The pre-existing working case (already signed in as the launcher, no
    // handoff token e.g. a manually-typed link) still skips this — no token → no
    // exchange.
    //
    // The exchange is AWAITED inside the intake below and the intake continues
    // with the user the exchange returns — it must NOT fire-and-return relying
    // on a currentUser re-render to re-enter this effect. A same-operator
    // re-auth produces NO context state change (currentUser is the same user,
    // isPlatform already true), so the effect never re-runs and the intake
    // stalls forever behind AdminRoute's "Öppnar butik…" spinner.
    let handoffToken = null;
    if (!handoffRef.current) {
      const hashParams = new URLSearchParams((location.hash || '').replace(/^#/, ''));
      handoffToken = hashParams.get('handoff');
      if (handoffToken) {
        handoffRef.current = true;
        // Wipe the token from the address bar + history IMMEDIATELY so it never
        // lingers, regardless of whether the exchange succeeds.
        try { window.history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
      }
    }

    // NOT-YET-AUTHENTICATED (and no token to exchange) is not a refusal — it's
    // a wait. The operator may land here un-logged-in (AdminRoute will send them
    // to /login WITH the params). We must NOT latch/strip the params in that
    // case, or the handshake is lost across the login redirect. currentUser is
    // an effect dep, so once they log in this effect re-runs and proceeds. Only
    // a logged-in NON-platform user is refused.
    if (!currentUser && !handoffToken) return;

    if (handledRef.current) return;
    handledRef.current = true;

    const stripParams = () => {
      // Drop ONLY our params; preserve any others + the current path.
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
      // 0) resolve WHO is doing the intake — in THIS pass. If a handoff token
      // is present, exchange it and continue with the user it returns; on an
      // expired/invalid token fall back to whatever session the tab already has
      // (with none, the login path takes over on the next effect run).
      let user = currentUser;
      if (handoffToken) {
        try {
          const cred = await signInWithCustomToken(auth, handoffToken);
          user = cred.user; // the launching operator, freshly materialized
        } catch (e) {
          console.warn('Impersonation silent sign-in failed:', e?.message || e);
        }
        if (!user) {
          // No session at all: un-latch so the manual-login fallback (AdminRoute
          // preserves the params to /login) can re-enter this intake afterwards.
          handledRef.current = false;
          return;
        }
      }

      // 1) require a platform operator. IMPORTANT: read the platform flag from
      // the user's Firestore doc directly rather than the `isPlatform` context
      // flag. After a silent custom-token sign-in (cross-origin handoff), the
      // auth `currentUser` is set a beat BEFORE AuthContext's async users-doc
      // fetch resolves `isPlatform` — so trusting the context flag here refuses
      // a legitimate operator during that window (and the once-per-mount latch
      // then makes the refusal permanent). Reading the doc is authoritative and
      // race-free (same source the context and firestore.rules use). The context
      // flag is only a fast-path when it provably describes THIS user (a handoff
      // may have just switched the session away from the stale context uid).
      let platformOk = isPlatform && currentUser && currentUser.uid === user.uid;
      if (!platformOk) {
        try {
          const meSnap = await getDoc(doc(db, 'users', user.uid));
          platformOk = meSnap.exists() && meSnap.data().platform === true;
        } catch {
          platformOk = false;
        }
      }
      if (!platformOk) {
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
        if (
          !snap.exists() ||
          snap.data().actorUid !== user.uid ||
          snap.data().shopId !== impersonate
        ) {
          refuse('Revisionsloggen matchar inte — impersonering avbruten.');
          return;
        }
        // Freshness bound: an impersonation link must be consumed promptly after
        // launch. A #handoff custom token is exchangeable for ~1h, so this caps
        // the practical replay window of a captured link (e.g. glimpsed on a
        // shared screen) — each launch mints a NEW audit doc, and a stale one is
        // rejected. NOTE: startedAt is a SERVER timestamp but Date.now() is the
        // admin-host CLIENT clock — a fast-running operator clock eats into the
        // window, so it must absorb realistic skew (a few minutes) on top of the
        // open+silent-sign-in round-trip. 5 min covers both; the ~1h token and
        // the fresh-audit-per-launch remain the outer bounds.
        const startedAt = snap.data().startedAt;
        const startedMs = startedAt?.toMillis ? startedAt.toMillis() : null;
        if (startedMs !== null && Date.now() - startedMs > 5 * 60 * 1000) {
          refuse('Impersoneringslänken har gått ut — starta om från plattformen.');
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
        setImpersonation({
          shopId: impersonate,
          shopName: snap.data().shopName || impersonate,
          reason: snap.data().reason || '',
          actorUid: user.uid,
          auditId,
        });
        window.location.replace('/admin');
      } catch (e) {
        console.error('Impersonation intake failed:', e);
        refuse('Kunde inte verifiera impersonering.');
      }
    })();
  }, [loading, location.search, location.pathname, location.hash, currentUser, isPlatform, navigate]);

  // This component only handles the param handshake; the banner reads the stored
  // session, so an existing session on a soft reload needs nothing here.
  return null;
};

export default ImpersonationIntake;
