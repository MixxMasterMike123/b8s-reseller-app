// Custom-domain callables — let a shop owner connect their OWN domain (e.g.
// butik.giffarna.se) to their storefront, fronted by Cloudflare for SaaS + a CF
// Worker that injects window.__SHOP_ID__ from a KV hostname→shopId map.
//
// FLOW (3 states the client polls through):
//   requestCustomDomain      → creates the CF custom hostname, writes docs,
//                              returns the CNAME the owner must add (pending_dns).
//   checkCustomDomainStatus  → polls CF; on active, writes the KV map + Auth
//                              authorized domain and flips both docs to active.
//   removeCustomDomain       → tears everything down (CF hostname, KV, docs, Auth).
//
// SECURITY: every callable is requireAdminOfShop(shopId) — a platform admin may act
// on any shop, a shop admin only on their own. domainMappings is a GLOBAL uniqueness
// index (doc id == hostname) so a hostname can be claimed by at most one shop; the
// claim is taken inside a transaction to avoid a race between two shops.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { appUrls } from '../config/app-urls';
import { db } from '../config/database';
import { requireAdminOfShop } from '../email-orchestrator/functions/authGuard';
import { validateCustomHostname } from './hostname';
import { addAuthorizedDomain, removeAuthorizedDomain } from './authDomains';
import {
  requireCfConfig,
  CF_SECRETS,
  cfCreateCustomHostname,
  cfGetCustomHostname,
  cfDeleteCustomHostname,
  cfKvPut,
  cfKvDelete,
  cfCnameTarget,
  type CfCustomHostname,
} from './cfClient';

const COMMON = {
  region: 'us-central1' as const,
  memory: '256MiB' as const,
  timeoutSeconds: 60,
  cors: appUrls.CORS_ORIGINS,
  secrets: [...CF_SECRETS],
};

// Our domain lifecycle states, mapped from CF's ssl/hostname status.
type DomainStatus = 'pending_dns' | 'verifying' | 'active' | 'error';

// Map a CF custom-hostname response to our state + a human reason (Swedish).
function mapCfStatus(ch: CfCustomHostname): { status: DomainStatus; reason?: string } {
  const ssl = ch.ssl?.status || '';
  const host = ch.status || '';
  if (host === 'active' && ssl === 'active') return { status: 'active' };
  // Errors surface from either the hostname verification or the SSL DCV.
  const sslErr = ch.ssl?.validation_errors?.map((e) => e.message).filter(Boolean) || [];
  const verErr = ch.verification_errors || [];
  const errs = [...verErr, ...sslErr];
  if (host.includes('deletion')) return { status: 'error', reason: 'Domänkopplingen tas bort.' };
  if (errs.length) return { status: 'error', reason: errs.join('; ') };
  // Hostname seen but cert still validating/deploying → verifying; otherwise DNS pending.
  if (ssl === 'pending_validation' || ssl === 'pending_deployment' || ssl === 'initializing') {
    return { status: 'verifying' };
  }
  if (host === 'active' && ssl !== 'active') return { status: 'verifying' };
  return { status: 'pending_dns' };
}

// ── requestCustomDomain ──────────────────────────────────────────────────────
interface RequestReq { shopId: string; hostname: string; }

export const requestCustomDomain = onCall<RequestReq>(COMMON, async (request) => {
  const ctx = await requireAdminOfShop(request.data.shopId, request.auth?.uid);
  const shopId = (request.data.shopId || '').trim();
  if (!shopId) throw new HttpsError('invalid-argument', 'shopId saknas.');

  const hostname = validateCustomHostname(request.data.hostname);
  const cfg = requireCfConfig();

  // The shop must exist (don't strand a domain on a non-existent tenant).
  const shopRef = db.collection('shops').doc(shopId);
  const shopSnap = await shopRef.get();
  if (!shopSnap.exists) throw new HttpsError('not-found', `Butiken "${shopId}" finns inte.`);

  // Atomically claim the hostname in the global index. If it already maps to a
  // DIFFERENT shop, reject; if it maps to THIS shop, we'll re-drive CF idempotently.
  const mapRef = db.collection('domainMappings').doc(hostname);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(mapRef);
    if (existing.exists && existing.data()?.shopId !== shopId) {
      throw new HttpsError('already-exists', 'Domänen är redan kopplad till en annan butik.');
    }
    // Placeholder claim inside the txn; the cfHostnameId is filled in right after
    // the CF call succeeds (below). Reserving here closes the two-shop race window.
    tx.set(mapRef, { shopId, status: 'pending_dns', cfHostnameId: null }, { merge: true });
  });

  // Create the CF custom hostname (HTTP DCV — customer only adds a CNAME).
  let ch: CfCustomHostname;
  try {
    ch = await cfCreateCustomHostname(cfg, hostname);
  } catch (err) {
    // Roll back the claim so a failed CF call doesn't leave a dangling mapping.
    await mapRef.delete().catch(() => {});
    throw err;
  }

  const now = FieldValue.serverTimestamp();
  await Promise.all([
    shopRef.set(
      {
        customDomain: {
          hostname,
          status: 'pending_dns',
          cfHostnameId: ch.id,
          // The admin UI renders the CNAME instruction table straight off this
          // doc (live snapshot), so the target must live here, not only in the
          // callable's return value.
          cnameTarget: cfCnameTarget(),
          requestedAt: now,
          requestedBy: ctx.uid,
        },
      },
      { merge: true }
    ),
    mapRef.set({ shopId, status: 'pending_dns', cfHostnameId: ch.id }, { merge: true }),
  ]);

  // Instructions data for the admin UI (Slice C renders it): point a CNAME at our
  // fallback origin, then poll checkCustomDomainStatus.
  return {
    hostname,
    status: 'pending_dns' as DomainStatus,
    cfHostnameId: ch.id,
    dns: {
      type: 'CNAME',
      name: hostname,
      target: cfCnameTarget(),
    },
    ownership: ch.ownership_verification || null,
  };
});

// ── checkCustomDomainStatus ──────────────────────────────────────────────────
interface CheckReq { shopId: string; }

export const checkCustomDomainStatus = onCall<CheckReq>(COMMON, async (request) => {
  await requireAdminOfShop(request.data.shopId, request.auth?.uid);
  const shopId = (request.data.shopId || '').trim();
  if (!shopId) throw new HttpsError('invalid-argument', 'shopId saknas.');
  const cfg = requireCfConfig();

  const shopRef = db.collection('shops').doc(shopId);
  const shopSnap = await shopRef.get();
  const cd = shopSnap.data()?.customDomain;
  if (!cd?.cfHostnameId || !cd?.hostname) {
    throw new HttpsError('failed-precondition', 'Ingen domän är begärd för denna butik.');
  }
  const hostname: string = cd.hostname;

  const ch = await cfGetCustomHostname(cfg, cd.cfHostnameId);
  const { status, reason } = mapCfStatus(ch);
  const wasActive = cd.status === 'active';

  // On the transition INTO active, wire up the live plumbing exactly once:
  // KV map (so the Worker resolves the hostname), Auth authorized domain (so
  // login works on the custom domain). Both are idempotent.
  if (status === 'active' && !wasActive) {
    await cfKvPut(cfg, hostname, shopId);
    await addAuthorizedDomain(hostname);
  }

  const mapRef = db.collection('domainMappings').doc(hostname);
  await Promise.all([
    shopRef.set(
      { customDomain: { ...cd, status, ...(reason ? { reason } : {}),
        ...(status === 'active' && !wasActive ? { activatedAt: FieldValue.serverTimestamp() } : {}) } },
      { merge: true }
    ),
    mapRef.set({ shopId, status, cfHostnameId: cd.cfHostnameId }, { merge: true }),
  ]);

  return { hostname, status, reason: reason || null };
});

// ── removeCustomDomain ───────────────────────────────────────────────────────
interface RemoveReq { shopId: string; }

export const removeCustomDomain = onCall<RemoveReq>(COMMON, async (request) => {
  await requireAdminOfShop(request.data.shopId, request.auth?.uid);
  const shopId = (request.data.shopId || '').trim();
  if (!shopId) throw new HttpsError('invalid-argument', 'shopId saknas.');
  const cfg = requireCfConfig();

  const shopRef = db.collection('shops').doc(shopId);
  const shopSnap = await shopRef.get();
  const cd = shopSnap.data()?.customDomain;
  if (!cd?.hostname) {
    throw new HttpsError('failed-precondition', 'Ingen domän att ta bort.');
  }
  const hostname: string = cd.hostname;

  // Best-effort teardown of each external side-effect; a failure in one must not
  // block the rest, or a partial state would strand the tenant. We still clear
  // our own docs at the end so the UI reflects "removed".
  if (cd.cfHostnameId) {
    await cfDeleteCustomHostname(cfg, cd.cfHostnameId).catch((e) =>
      console.warn('removeCustomDomain: CF hostname delete failed', e)
    );
  }
  await cfKvDelete(cfg, hostname).catch((e) =>
    console.warn('removeCustomDomain: KV delete failed', e)
  );
  await removeAuthorizedDomain(hostname).catch((e) =>
    console.warn('removeCustomDomain: Auth domain removal failed', e)
  );

  await Promise.all([
    db.collection('domainMappings').doc(hostname).delete().catch(() => {}),
    shopRef.set({ customDomain: FieldValue.delete() }, { merge: true }),
  ]);

  return { hostname, status: 'removed' as const };
});
