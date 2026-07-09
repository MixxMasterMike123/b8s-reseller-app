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
import { getAuth, signInWithCustomToken } from 'firebase/auth';
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
    // host are SEPARATE origins with independent Firebase Auth sessions, so an
    // operator who is logged in on the platform host has NO session here. The
    // launcher put a short-lived custom token minted for the operator's OWN uid
    // in the URL fragment (#handoff=). If we have no session yet, exchange it so
    // the SAME identity is materialized on this origin — in any browser, with no
    // login prompt. Then the normal flow below proceeds unchanged. In a browser
    // that already has an admin-host session (the pre-existing working case),
    // currentUser is set, so this whole branch is skipped.
    if (!currentUser && !handoffRef.current) {
      const hashParams = new URLSearchParams((location.hash || '').replace(/^#/, ''));
      const handoffToken = hashParams.get('handoff');
      if (handoffToken) {
        handoffRef.current = true;
        // Wipe the token from the address bar + history IMMEDIATELY so it never
        // lingers, regardless of whether the exchange succeeds.
        try { window.history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
        signInWithCustomToken(getAuth(), handoffToken).catch((e) => {
          // Expired (>1h) / invalid token → fall through to the normal
          // un-authenticated path (login), no crash.
          console.warn('Impersonation silent sign-in failed:', e?.message || e);
        });
        // onAuthStateChanged will set currentUser and re-run this effect; wait.
        return;
      }
    }

    // NOT-YET-AUTHENTICATED is not a refusal — it's a wait. The operator may
    // land here un-logged-in (AdminRoute will send them to /login). We must NOT
    // latch/strip the params in that case, or the handshake is lost across the
    // login redirect. currentUser is an effect dep, so once they log in this
    // effect re-runs and proceeds. Only a logged-in NON-platform user is refused.
    if (!currentUser) return;

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
      // 1) require a platform operator. IMPORTANT: read the platform flag from
      // the user's Firestore doc directly rather than the `isPlatform` context
      // flag. After a silent custom-token sign-in (cross-origin handoff), the
      // auth `currentUser` is set a beat BEFORE AuthContext's async users-doc
      // fetch resolves `isPlatform` — so trusting the context flag here refuses
      // a legitimate operator during that window (and the once-per-mount latch
      // then makes the refusal permanent). Reading the doc is authoritative and
      // race-free (same source the context and firestore.rules use).
      let platformOk = isPlatform;
      if (!platformOk) {
        try {
          const meSnap = await getDoc(doc(db, 'users', currentUser.uid));
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
          snap.data().actorUid !== currentUser.uid ||
          snap.data().shopId !== impersonate
        ) {
          refuse('Revisionsloggen matchar inte — impersonering avbruten.');
          return;
        }
        // Freshness bound: an impersonation link must be consumed promptly after
        // launch. A #handoff custom token is exchangeable for ~1h, so this caps
        // the practical replay window of a captured link (e.g. glimpsed on a
        // shared screen) — each launch mints a NEW audit doc, and a stale one is
        // rejected. 2 min is generous for the open+silent-sign-in round-trip.
        const startedAt = snap.data().startedAt;
        const startedMs = startedAt?.toMillis ? startedAt.toMillis() : null;
        if (startedMs !== null && Date.now() - startedMs > 2 * 60 * 1000) {
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
          actorUid: currentUser.uid,
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
