"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCustomHostname = void 0;
const https_1 = require("firebase-functions/v2/https");
const node_net_1 = require("node:net");
// Platform / infra suffixes a tenant may never claim as their "custom" domain.
const RESERVED_SUFFIXES = [
    'web.app',
    'firebaseapp.com',
    'workers.dev',
    'pages.dev',
    'cloudflare.com',
    'localhost',
];
// The future platform zone — env-overridable so the reserved check tracks whatever
// apex we run CF for SaaS on, without a code change. Defaults to the meteorpr apex.
function platformApex() {
    return (process.env.CHOPSHOP_PLATFORM_APEX || 'meteorpr.com').toLowerCase();
}
// RFC-1123 label: 1–63 chars, alnum + hyphen, no leading/trailing hyphen.
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
// Normalise + validate. Returns the lowercased hostname or throws an HttpsError
// with a Swedish-facing message (matches the storefront UX language convention).
function validateCustomHostname(raw) {
    const input = String(raw || '').trim().toLowerCase();
    if (!input)
        throw new https_1.HttpsError('invalid-argument', 'Domän saknas.');
    // Strip an accidental scheme/path/port ("https://shop.x.se/" → "shop.x.se").
    let host = input;
    if (/^[a-z]+:\/\//.test(host)) {
        try {
            host = new URL(host).hostname;
        }
        catch {
            throw new https_1.HttpsError('invalid-argument', 'Ogiltig domän.');
        }
    }
    host = host.replace(/\.$/, ''); // drop trailing FQDN dot
    if (host.length > 253)
        throw new https_1.HttpsError('invalid-argument', 'Domänen är för lång.');
    if ((0, node_net_1.isIP)(host))
        throw new https_1.HttpsError('invalid-argument', 'En IP-adress kan inte användas som domän.');
    const labels = host.split('.');
    if (labels.length < 2) {
        throw new https_1.HttpsError('invalid-argument', 'Ange en fullständig domän, t.ex. butik.dittforetag.se.');
    }
    if (!labels.every((l) => LABEL.test(l))) {
        throw new https_1.HttpsError('invalid-argument', 'Ogiltiga tecken i domänen.');
    }
    const apex = platformApex();
    if (host === apex || host.endsWith(`.${apex}`)) {
        throw new https_1.HttpsError('invalid-argument', 'Denna domän är reserverad av plattformen.');
    }
    for (const suf of RESERVED_SUFFIXES) {
        if (host === suf || host.endsWith(`.${suf}`)) {
            throw new https_1.HttpsError('invalid-argument', 'Denna domän är reserverad och kan inte användas.');
        }
    }
    return host;
}
exports.validateCustomHostname = validateCustomHostname;
//# sourceMappingURL=hostname.js.map