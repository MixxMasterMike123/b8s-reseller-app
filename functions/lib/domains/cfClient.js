"use strict";
// Cloudflare-for-SaaS client — thin wrapper over the Custom Hostnames + KV APIs.
//
// Credentials are NOT available yet (Slice B is built token-ready). Every call
// therefore resolves its config from Cloud Functions secrets/env at call time
// and throws a CLEAR "Cloudflare not configured" error when anything is missing,
// so the callables above fail gracefully instead of firing half-formed requests.
//
// Secrets (defineSecret / functions env), all four required for live CF calls:
//   CHOPSHOP_CF_API_TOKEN         — scoped API token (SSL for SaaS + Workers KV)
//   CHOPSHOP_CF_ZONE_ID           — the zone that owns the fallback origin
//   CHOPSHOP_CF_ACCOUNT_ID        — account that owns the KV namespace
//   CHOPSHOP_CF_KV_NAMESPACE_ID   — KV namespace bound to the Worker as DOMAIN_MAP
Object.defineProperty(exports, "__esModule", { value: true });
exports.cfCnameTarget = exports.cfKvDelete = exports.cfKvPut = exports.cfDeleteCustomHostname = exports.cfGetCustomHostname = exports.cfCreateCustomHostname = exports.CF_SECRETS = exports.requireCfConfig = exports.getCfConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const CF_API = 'https://api.cloudflare.com/client/v4';
// Resolve the four CF settings from env/secrets. Returns null (never throws) when
// any is absent — callers turn that into a friendly HttpsError so a shop owner who
// clicks "connect domain" before we've provisioned CF gets a clear message.
function getCfConfig() {
    const token = process.env.CHOPSHOP_CF_API_TOKEN || '';
    const zoneId = process.env.CHOPSHOP_CF_ZONE_ID || '';
    const accountId = process.env.CHOPSHOP_CF_ACCOUNT_ID || '';
    const kvNamespaceId = process.env.CHOPSHOP_CF_KV_NAMESPACE_ID || '';
    if (!token || !zoneId || !accountId || !kvNamespaceId)
        return null;
    return { token, zoneId, accountId, kvNamespaceId };
}
exports.getCfConfig = getCfConfig;
// Assert config is present, or throw the canonical "not configured" error.
function requireCfConfig() {
    const cfg = getCfConfig();
    if (!cfg) {
        throw new https_1.HttpsError('failed-precondition', 'Cloudflare not configured — custom domains are not available yet. ' +
            '(Missing CHOPSHOP_CF_API_TOKEN / CHOPSHOP_CF_ZONE_ID / ' +
            'CHOPSHOP_CF_ACCOUNT_ID / CHOPSHOP_CF_KV_NAMESPACE_ID.)');
    }
    return cfg;
}
exports.requireCfConfig = requireCfConfig;
// The secret names — exported so each callable can register them in its onCall
// `secrets:` array (Gen-2 requires declaring secrets to make them readable).
exports.CF_SECRETS = [
    'CHOPSHOP_CF_API_TOKEN',
    'CHOPSHOP_CF_ZONE_ID',
    'CHOPSHOP_CF_ACCOUNT_ID',
    'CHOPSHOP_CF_KV_NAMESPACE_ID',
];
async function cfFetch(cfg, path, init = {}) {
    const { rawBody, body, headers, ...rest } = init;
    const res = await fetch(`${CF_API}${path}`, {
        ...rest,
        headers: {
            Authorization: `Bearer ${cfg.token}`,
            ...(rawBody !== undefined
                ? { 'Content-Type': 'text/plain' }
                : body !== undefined
                    ? { 'Content-Type': 'application/json' }
                    : {}),
            ...(headers || {}),
        },
        body: rawBody !== undefined ? rawBody : body,
        signal: AbortSignal.timeout(20000),
    });
    // KV value endpoints return plain text / 204, not the JSON envelope.
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
        if (!res.ok) {
            throw new https_1.HttpsError('internal', `Cloudflare API error ${res.status}`);
        }
        return undefined;
    }
    const json = (await res.json());
    if (!res.ok || !json.success) {
        const msg = json.errors?.map((e) => `${e.code}: ${e.message}`).join('; ') || `HTTP ${res.status}`;
        throw new https_1.HttpsError('internal', `Cloudflare API error — ${msg}`);
    }
    return json.result;
}
// POST a new custom hostname with HTTP (DCV) SSL validation. HTTP validation lets
// the customer point a CNAME and get a cert with NO extra TXT record dance.
async function cfCreateCustomHostname(cfg, hostname) {
    return cfFetch(cfg, `/zones/${cfg.zoneId}/custom_hostnames`, {
        method: 'POST',
        body: JSON.stringify({
            hostname,
            ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
        }),
    });
}
exports.cfCreateCustomHostname = cfCreateCustomHostname;
async function cfGetCustomHostname(cfg, id) {
    return cfFetch(cfg, `/zones/${cfg.zoneId}/custom_hostnames/${id}`, {
        method: 'GET',
    });
}
exports.cfGetCustomHostname = cfGetCustomHostname;
async function cfDeleteCustomHostname(cfg, id) {
    await cfFetch(cfg, `/zones/${cfg.zoneId}/custom_hostnames/${id}`, {
        method: 'DELETE',
    });
}
exports.cfDeleteCustomHostname = cfDeleteCustomHostname;
// ── Workers KV (hostname → shopId map read by the edge Worker) ───────────────
async function cfKvPut(cfg, key, value) {
    await cfFetch(cfg, `/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.kvNamespaceId}/values/${encodeURIComponent(key)}`, { method: 'PUT', rawBody: value });
}
exports.cfKvPut = cfKvPut;
async function cfKvDelete(cfg, key) {
    await cfFetch(cfg, `/accounts/${cfg.accountId}/storage/kv/namespaces/${cfg.kvNamespaceId}/values/${encodeURIComponent(key)}`, { method: 'DELETE' });
}
exports.cfKvDelete = cfKvDelete;
// The CNAME target a customer points their domain at. For CF for SaaS the target
// is the zone's fallback-origin CNAME; we surface it from env so ops can set the
// exact string once the zone exists, defaulting to a documented placeholder.
function cfCnameTarget() {
    return process.env.CHOPSHOP_CF_CNAME_TARGET || 'cname.chopshop-domains.example';
}
exports.cfCnameTarget = cfCnameTarget;
//# sourceMappingURL=cfClient.js.map