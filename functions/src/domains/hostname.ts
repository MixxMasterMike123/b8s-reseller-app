// Hostname validation for custom-domain requests. A shop owner supplies the bare
// domain they want to point at their storefront (e.g. "shop.giffarna.se"). We must
// reject anything that isn't a plain public FQDN, and anything reserved to the
// platform itself — otherwise a tenant could "claim" a platform host or a bogus
// value, and the KV/CF state would be corrupt.
//
// This is deliberately a SYNTAX + RESERVED-LIST guard (no DNS resolution): unlike
// the website-scraper's SSRF guard, we are NOT fetching this hostname from inside
// our network here — Cloudflare validates and proxies it. We only guarantee the
// string is a sane, non-platform FQDN before handing it to the CF API.

import { HttpsError } from 'firebase-functions/v2/https';
import { isIP } from 'node:net';

// Platform / infra suffixes a tenant may never claim as their "custom" domain.
const RESERVED_SUFFIXES = [
  'web.app',        // Firebase Hosting default domains (shop-meteorpr.web.app, …)
  'firebaseapp.com',
  'workers.dev',    // Cloudflare Workers default domain
  'pages.dev',      // Cloudflare Pages default domain
  'cloudflare.com',
  'localhost',
];

// The future platform zone — env-overridable so the reserved check tracks whatever
// apex we run CF for SaaS on, without a code change. Defaults to the meteorpr apex.
function platformApex(): string {
  return (process.env.CHOPSHOP_PLATFORM_APEX || 'meteorpr.com').toLowerCase();
}

// RFC-1123 label: 1–63 chars, alnum + hyphen, no leading/trailing hyphen.
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

// Normalise + validate. Returns the lowercased hostname or throws an HttpsError
// with a Swedish-facing message (matches the storefront UX language convention).
export function validateCustomHostname(raw: unknown): string {
  const input = String(raw || '').trim().toLowerCase();
  if (!input) throw new HttpsError('invalid-argument', 'Domän saknas.');

  // Strip an accidental scheme/path/port ("https://shop.x.se/" → "shop.x.se").
  let host = input;
  if (/^[a-z]+:\/\//.test(host)) {
    try {
      host = new URL(host).hostname;
    } catch {
      throw new HttpsError('invalid-argument', 'Ogiltig domän.');
    }
  }
  host = host.replace(/\.$/, ''); // drop trailing FQDN dot

  if (host.length > 253) throw new HttpsError('invalid-argument', 'Domänen är för lång.');
  if (isIP(host)) throw new HttpsError('invalid-argument', 'En IP-adress kan inte användas som domän.');

  const labels = host.split('.');
  if (labels.length < 2) {
    throw new HttpsError('invalid-argument', 'Ange en fullständig domän, t.ex. butik.dittforetag.se.');
  }
  if (!labels.every((l) => LABEL.test(l))) {
    throw new HttpsError('invalid-argument', 'Ogiltiga tecken i domänen.');
  }

  const apex = platformApex();
  if (host === apex || host.endsWith(`.${apex}`)) {
    throw new HttpsError('invalid-argument', 'Denna domän är reserverad av plattformen.');
  }
  for (const suf of RESERVED_SUFFIXES) {
    if (host === suf || host.endsWith(`.${suf}`)) {
      throw new HttpsError('invalid-argument', 'Denna domän är reserverad och kan inte användas.');
    }
  }

  return host;
}
