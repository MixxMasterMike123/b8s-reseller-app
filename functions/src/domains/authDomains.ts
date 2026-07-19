// Firebase Auth authorized-domains management via the Identity Toolkit Admin API.
//
// WHY: Firebase Auth rejects sign-in / OAuth redirect flows whose origin isn't in
// the project's authorizedDomains allowlist. When a custom domain goes live the
// storefront is served FROM that domain, so its hostname must be added — or login
// on the customer's own domain silently breaks.
//
// This uses google-auth-library (already a functions dependency) with Application
// Default Credentials — inside Cloud Functions the runtime service account is used,
// which must hold the Firebase Authentication Admin role for the PATCH to succeed.
//
// CRITICAL: authorizedDomains is a WHOLE-ARRAY field. We READ the current list,
// then MODIFY, then WRITE it back with updateMask=authorizedDomains — never a blind
// overwrite, so we can never drop Firebase's own defaults (localhost, <project>.
// firebaseapp.com, <project>.web.app) or another shop's live custom domain.

import { GoogleAuth } from 'google-auth-library';

const IDENTITY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

function projectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    'b8shield-reseller-app'
  );
}

interface IdentityConfig {
  authorizedDomains?: string[];
}

async function identityFetch<T>(method: string, url: string, body?: unknown): Promise<T> {
  const auth = new GoogleAuth({ scopes: [IDENTITY_SCOPE] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Identity Toolkit ${method} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

function configUrl(): string {
  return `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId()}/config`;
}

// Read-modify-write add. Idempotent: adding an already-present host is a no-op.
export async function addAuthorizedDomain(hostname: string): Promise<void> {
  const cfg = await identityFetch<IdentityConfig>('GET', configUrl());
  const current = cfg.authorizedDomains || [];
  if (current.includes(hostname)) return;
  const next = [...current, hostname];
  await identityFetch<IdentityConfig>(
    'PATCH',
    `${configUrl()}?updateMask=authorizedDomains`,
    { authorizedDomains: next }
  );
}

// Read-modify-write remove. Idempotent: removing an absent host is a no-op.
export async function removeAuthorizedDomain(hostname: string): Promise<void> {
  const cfg = await identityFetch<IdentityConfig>('GET', configUrl());
  const current = cfg.authorizedDomains || [];
  if (!current.includes(hostname)) return;
  const next = current.filter((d) => d !== hostname);
  await identityFetch<IdentityConfig>(
    'PATCH',
    `${configUrl()}?updateMask=authorizedDomains`,
    { authorizedDomains: next }
  );
}
