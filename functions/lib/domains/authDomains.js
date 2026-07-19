"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAuthorizedDomain = exports.addAuthorizedDomain = void 0;
const google_auth_library_1 = require("google-auth-library");
const IDENTITY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
function projectId() {
    return (process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        'b8shield-reseller-app');
}
async function identityFetch(method, url, body) {
    const auth = new google_auth_library_1.GoogleAuth({ scopes: [IDENTITY_SCOPE] });
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
    return (await res.json());
}
function configUrl() {
    return `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId()}/config`;
}
// Read-modify-write add. Idempotent: adding an already-present host is a no-op.
async function addAuthorizedDomain(hostname) {
    const cfg = await identityFetch('GET', configUrl());
    const current = cfg.authorizedDomains || [];
    if (current.includes(hostname))
        return;
    const next = [...current, hostname];
    await identityFetch('PATCH', `${configUrl()}?updateMask=authorizedDomains`, { authorizedDomains: next });
}
exports.addAuthorizedDomain = addAuthorizedDomain;
// Read-modify-write remove. Idempotent: removing an absent host is a no-op.
async function removeAuthorizedDomain(hostname) {
    const cfg = await identityFetch('GET', configUrl());
    const current = cfg.authorizedDomains || [];
    if (!current.includes(hostname))
        return;
    const next = current.filter((d) => d !== hostname);
    await identityFetch('PATCH', `${configUrl()}?updateMask=authorizedDomains`, { authorizedDomains: next });
}
exports.removeAuthorizedDomain = removeAuthorizedDomain;
//# sourceMappingURL=authDomains.js.map