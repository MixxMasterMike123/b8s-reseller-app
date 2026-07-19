/**
 * ChopShop custom-domain edge Worker.
 *
 * For every request on a customer's own domain:
 *   1. Look up the request hostname in KV (env.DOMAIN_MAP) → shopId.
 *      MISS → serve a minimal branded "domain not connected" 404 (do NOT proxy;
 *      an unmapped host must never silently serve some default shop).
 *   2. HIT → proxy the request to the shared storefront origin
 *      (https://<ORIGIN_HOST>) with identical path/query/method/body/headers,
 *      minus CF-specific hop headers.
 *   3. For HTML responses, use HTMLRewriter to inject
 *        <script>window.__SHOP_ID__="<shopId>"</script>
 *      right before </head> so the storefront boots as the right tenant.
 *
 * Caching / content headers from the origin are passed through untouched.
 */

// Hop-by-hop + CF-internal headers that must NOT be forwarded to the origin.
// (Forwarding host/cf-connecting-ip would confuse Firebase Hosting's routing;
// forwarding cf-* leaks edge internals.)
const STRIP_REQUEST_HEADERS = [
  'host',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'x-forwarded-host',
  'x-forwarded-proto',
  'connection',
  'keep-alive',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();

    // 1. Resolve hostname → shopId from KV.
    const shopId = await env.DOMAIN_MAP.get(hostname);
    if (!shopId) {
      return notConnectedResponse(hostname);
    }

    // 2. Proxy to the shared storefront origin.
    const originHost = env.ORIGIN_HOST || 'shop-meteorpr.web.app';
    const originUrl = new URL(request.url);
    originUrl.protocol = 'https:';
    originUrl.hostname = originHost;
    originUrl.port = '';

    const headers = new Headers(request.headers);
    for (const h of STRIP_REQUEST_HEADERS) headers.delete(h);
    // The origin is a *.web.app vhost — set Host to the origin so Hosting routes it.
    headers.set('Host', originHost);
    // Preserve geo for future use: pass CF-IPCountry through as a plain header the
    // origin/storefront can read (the raw cf-ipcountry was stripped above).
    const country = request.headers.get('cf-ipcountry');
    if (country && country !== 'XX') headers.set('X-Country', country);

    const originRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : request.body,
      redirect: 'manual',
    });

    const originResponse = await fetch(originRequest);

    // 3. Inject window.__SHOP_ID__ into HTML responses only. Non-HTML (JS, CSS,
    // images, JSON) passes straight through with all its caching headers intact.
    const contentType = originResponse.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return originResponse;
    }

    const rewritten = new HTMLRewriter()
      .on('head', new ShopIdInjector(shopId))
      .transform(originResponse);

    return rewritten;
  },
};

// Inject the tenant script as the LAST child of <head> (i.e. before </head>),
// so it runs before the app bundle reads window.__SHOP_ID__.
class ShopIdInjector {
  constructor(shopId) {
    this.shopId = shopId;
  }
  element(element) {
    // JSON.stringify safely escapes the shopId into a JS string literal.
    const script = `<script>window.__SHOP_ID__=${JSON.stringify(this.shopId)};</script>`;
    element.append(script, { html: true });
  }
}

// Minimal branded 404 for a hostname that isn't mapped to any shop. Intentionally
// self-contained (no external assets) and cache-safe.
function notConnectedResponse(hostname) {
  const safeHost = hostname.replace(/[<>&"]/g, '');
  const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Domänen är inte kopplad</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0b0b0c; color: #e7e7ea; padding: 2rem; }
  .card { max-width: 30rem; text-align: center; }
  h1 { font-size: 1.4rem; margin: 0 0 .5rem; letter-spacing: -.01em; }
  p { margin: .25rem 0; color: #a1a1aa; }
  code { color: #e7e7ea; }
</style>
</head>
<body>
  <main class="card">
    <h1>Domänen är inte kopplad</h1>
    <p><code>${safeHost}</code> pekar hit men är inte kopplad till någon butik ännu.</p>
    <p>Om du är butiksägare: slutför domänkopplingen i din adminpanel.</p>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
