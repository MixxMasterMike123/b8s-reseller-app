// impersonationAudit writes — the accountability trail for P4.3 "Open Shop Admin".
//
// One Firestore doc per impersonation session. Written PLATFORM-side at launch
// (start) and stamped at session end. Rules (firestore.rules) gate the whole
// collection to isPlatform() with create requiring actorUid == caller and no
// deletes, so this is an append-only, operator-only trail.
//
// Schema (impersonationAudit/{autoId}):
//   actorUid    string   the platform operator (== request.auth.uid; rule-enforced)
//   actorEmail  string   operator email (display convenience)
//   shopId      string   the impersonated tenant
//   shopName    string   tenant display name at launch time
//   reason      string   mandatory operator-entered reason
//   startedAt   serverTs when the session was launched
//   expiresAt   number   ms epoch the UI override auto-expires
//   userAgent   string   launching browser UA
//   endedAt     serverTs|null  stamped when the operator ends the session
//   endReason   string         'manual' | 'expired' (best-effort)

import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Write the START audit doc. Returns the new doc id (carried to the admin host
 * as ?audit= so intake can verify it). Throws on failure — the caller must NOT
 * launch impersonation without an audit record.
 */
export async function writeImpersonationStart({ actor, shopId, shopName, reason, expiresAt }) {
  const ref = await addDoc(collection(db, 'impersonationAudit'), {
    actorUid: actor?.uid || '',
    actorEmail: actor?.email || '',
    shopId,
    shopName: shopName || shopId,
    reason: reason || '',
    startedAt: serverTimestamp(),
    expiresAt: expiresAt || null,
    userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || '',
    endedAt: null,
    endReason: null,
  });
  return ref.id;
}

/**
 * Stamp the END of a session. Best-effort: a failure here must not block the
 * operator from leaving impersonation, so callers should catch + continue.
 */
export async function writeImpersonationEnd(auditId, endReason = 'manual') {
  if (!auditId) return;
  await updateDoc(doc(db, 'impersonationAudit', auditId), {
    endedAt: serverTimestamp(),
    endReason,
  });
}
