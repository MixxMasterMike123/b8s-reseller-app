# ChopShop custom-domain edge Worker

Fronts customer-owned domains (e.g. `butik.giffarna.se`) for the shared ChopShop
storefront. The Worker:

1. looks up the request hostname in Workers KV (`DOMAIN_MAP`) → `shopId`,
2. proxies the request to the shared Firebase Hosting storefront
   (`shop-meteorpr.web.app`) if mapped (404 branded page if not),
3. injects `<script>window.__SHOP_ID__="<shopId>"</script>` into HTML so the
   storefront boots as the correct tenant.

The KV map is written by the Cloud Functions callables in
`functions/src/domains/` (`requestCustomDomain` / `checkCustomDomainStatus` /
`removeCustomDomain`) via Cloudflare's KV REST API. The Worker only READS KV.

## How this fits together

```
customer domain ──DNS CNAME──▶ Cloudflare (SSL for SaaS custom hostname)
                                  │
                                  ▼
                          this Worker (KV lookup + inject)
                                  │  proxy
                                  ▼
                        shop-meteorpr.web.app (shared storefront)
```

- **Custom Hostnames** (SSL for SaaS) terminate TLS for each tenant domain.
- **Fallback origin** on the zone is what the customer CNAMEs to; the Worker is
  attached to those hostnames so every tenant request runs through it.
- **KV** is the single source of truth the edge reads; Firestore
  `domainMappings/{hostname}` is the app-side mirror (public read).

## One-time provisioning

Prerequisite: a Cloudflare account + a zone enabled for **SSL / SSL for SaaS**
(Cloudflare for SaaS). Credentials are **not** wired up yet — this is the runbook
for when they are.

### 1. Authenticate wrangler

```
wrangler login          # interactive, or:
export CLOUDFLARE_API_TOKEN=...   # token with Workers Scripts + Workers KV edit
```

### 2. Create the KV namespace

```
wrangler kv namespace create DOMAIN_MAP
```

Paste the returned `id` into `wrangler.toml` (`[[kv_namespaces]] id`). This **same
id** must be set as the Cloud Functions secret `CHOPSHOP_CF_KV_NAMESPACE_ID` so the
callables write to the namespace the Worker reads.

### 3. Configure Cloud Functions secrets

Set these (Firebase functions secrets / env) so the domains callables can talk to
Cloudflare:

| Secret | Value |
| --- | --- |
| `CHOPSHOP_CF_API_TOKEN` | API token: *SSL and Certificates* (SSL for SaaS) + *Workers KV Storage* edit |
| `CHOPSHOP_CF_ZONE_ID` | the zone that owns the fallback origin |
| `CHOPSHOP_CF_ACCOUNT_ID` | account that owns the KV namespace |
| `CHOPSHOP_CF_KV_NAMESPACE_ID` | the id from step 2 |
| `CHOPSHOP_CF_CNAME_TARGET` | (optional) exact CNAME target shown to shop owners |
| `CHOPSHOP_PLATFORM_APEX` | (optional) platform apex to reserve, default `meteorpr.com` |
| `CORS_CUSTOM_DOMAIN_REGEX` | (optional) regex matching live custom-domain origins for CORS |

Until all four required secrets are present the callables return a clear
"Cloudflare not configured" error and make no CF calls.

### 4. SSL for SaaS + fallback origin

In the CF dashboard for the zone:

1. Enable **SSL for SaaS** (Custom Hostnames).
2. Set the **fallback origin** to a hostname that resolves to Cloudflare (the
   Worker is bound to it). Give shop owners this hostname as their CNAME target
   (or set `CHOPSHOP_CF_CNAME_TARGET` to it).
3. Custom hostnames are created programmatically by `requestCustomDomain` with
   **HTTP (DCV)** SSL validation — the customer only adds the CNAME, no TXT record.

### 5. Deploy the Worker

```
cd cf-worker
wrangler deploy
```

Attach the Worker to the custom-hostname traffic (worker route on the fallback
origin / Custom Hostnames routing) so every tenant request executes it.

## Local development

```
cd cf-worker
wrangler dev
# seed a test mapping into the local KV:
wrangler kv key put --binding DOMAIN_MAP "butik.example.se" "giffarna" --local
```

Then request `http://localhost:8787` with a `Host: butik.example.se` header to
exercise the lookup + inject path.

## Runtime flow (per request)

1. `env.DOMAIN_MAP.get(hostname)` → `shopId` (or 404 branded page on miss).
2. Proxy to `https://<ORIGIN_HOST>` with hop/CF headers stripped, `Host` rewritten,
   and `CF-IPCountry` forwarded as `X-Country` for future geo.
3. HTML responses: `HTMLRewriter` appends the `window.__SHOP_ID__` script to
   `<head>`. All other content types pass through untouched (caching preserved).
