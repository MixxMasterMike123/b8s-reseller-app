"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeWebsiteMeta = void 0;
const https_1 = require("firebase-functions/v2/https");
const promises_1 = require("node:dns/promises");
const node_net_1 = require("node:net");
const cors_handler_1 = require("../protection/cors/cors-handler");
const rate_limiter_1 = require("../protection/rate-limiting/rate-limiter");
const app_urls_1 = require("../config/app-urls");
// ── SSRF guard (2026-07-01 audit) ────────────────────────────────────────────
// This endpoint fetches a CALLER-SUPPLIED URL from inside Google's network, so
// it must never reach loopback, RFC1918/private, link-local, or the cloud
// metadata service (169.254.169.254 = credential theft). Scheme is forced to
// http(s); the hostname's RESOLVED addresses are checked (an innocent-looking
// hostname can point anywhere); redirects are followed MANUALLY so every hop is
// re-validated. Residual DNS-rebinding window (fetch re-resolves after the
// check) is accepted for this rate-limited internal CRM tool.
function isPrivateAddress(addr) {
    if (addr.includes(':')) {
        const a = addr.toLowerCase();
        if (a === '::' || a === '::1')
            return true;
        if (a.startsWith('fe80:') || a.startsWith('fc') || a.startsWith('fd'))
            return true;
        const v4 = a.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        return v4 ? isPrivateAddress(v4[1]) : false;
    }
    const parts = addr.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
        return true; // unparseable → refuse
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127)
        return true;
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    if (a === 192 && b === 168)
        return true;
    if (a === 169 && b === 254)
        return true; // link-local incl. cloud metadata
    if (a >= 224)
        return true; // multicast + reserved
    return false;
}
async function assertPublicHttpUrl(raw) {
    const u = new URL(raw); // throws on malformed → caller maps to 400
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('Only http/https URLs are allowed');
    }
    const host = u.hostname;
    if ((0, node_net_1.isIP)(host)) {
        if (isPrivateAddress(host))
            throw new Error('URL points to a private address');
        return;
    }
    const bare = host.toLowerCase();
    if (bare === 'localhost' || bare.endsWith('.local') || bare.endsWith('.internal')) {
        throw new Error('URL points to a private address');
    }
    const addrs = await (0, promises_1.lookup)(bare, { all: true, verbatim: true });
    if (!addrs.length || addrs.some((r) => isPrivateAddress(r.address))) {
        throw new Error('URL points to a private address');
    }
}
// Simple language detection patterns
const LANGUAGE_PATTERNS = {
    'sv': {
        words: ['och', 'det', 'är', 'för', 'med', 'till', 'av', 'på', 'som', 'har', 'vi', 'från', 'att', 'våra', 'vårt', 'Sverige', 'svenska'],
        businessTerms: ['företag', 'tjänster', 'produkter', 'kundservice', 'kontakt', 'om oss', 'kvalitet', 'lösningar']
    },
    'en': {
        words: ['and', 'the', 'is', 'for', 'with', 'to', 'of', 'on', 'as', 'have', 'we', 'from', 'that', 'our', 'about'],
        businessTerms: ['company', 'services', 'products', 'customer', 'contact', 'about us', 'quality', 'solutions']
    },
    'de': {
        words: ['und', 'der', 'die', 'das', 'ist', 'für', 'mit', 'zu', 'von', 'auf', 'als', 'haben', 'wir', 'aus', 'unser'],
        businessTerms: ['unternehmen', 'dienstleistungen', 'produkte', 'kunde', 'kontakt', 'über uns', 'qualität', 'lösungen']
    }
};
// Simple business term translations
const SIMPLE_TRANSLATIONS = {
    // English to Swedish
    'company': 'företag',
    'business': 'företag',
    'services': 'tjänster',
    'products': 'produkter',
    'solutions': 'lösningar',
    'quality': 'kvalitet',
    'customer': 'kund',
    'contact': 'kontakt',
    'about us': 'om oss',
    'experience': 'erfarenhet',
    'professional': 'professionell',
    'innovation': 'innovation',
    'technology': 'teknik',
    'leading': 'ledande',
    'expertise': 'expertis',
    'reliable': 'pålitlig',
    'trusted': 'betrodd',
    // German to Swedish  
    'unternehmen': 'företag',
    'dienstleistungen': 'tjänster',
    'produkte': 'produkter',
    'lösungen': 'lösningar',
    'qualität': 'kvalitet',
    'kunde': 'kund',
    'kontakt': 'kontakt',
    'über uns': 'om oss',
    'erfahrung': 'erfarenhet',
    'professionell': 'professionell',
    'technologie': 'teknik',
    'führend': 'ledande',
    'kompetenz': 'expertis',
    'zuverlässig': 'pålitlig',
    'vertrauenswürdig': 'betrodd'
};
/**
 * Detect language based on common words and patterns
 */
function detectLanguage(text) {
    const lowerText = text.toLowerCase();
    const scores = {};
    // Initialize scores
    Object.keys(LANGUAGE_PATTERNS).forEach(lang => {
        scores[lang] = 0;
    });
    // Score based on common words
    Object.entries(LANGUAGE_PATTERNS).forEach(([lang, patterns]) => {
        patterns.words.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = (lowerText.match(regex) || []).length;
            scores[lang] += matches * 2; // Common words get 2 points
        });
        patterns.businessTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            const matches = (lowerText.match(regex) || []).length;
            scores[lang] += matches * 3; // Business terms get 3 points
        });
    });
    // Find highest scoring language
    const detected = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    return scores[detected] > 0 ? detected : 'unknown';
}
/**
 * Simple translation of common business terms
 */
function simpleTranslate(text, fromLang) {
    if (fromLang === 'sv')
        return text; // Already Swedish
    let translated = text;
    Object.entries(SIMPLE_TRANSLATIONS).forEach(([original, swedish]) => {
        const regex = new RegExp(`\\b${original}\\b`, 'gi');
        translated = translated.replace(regex, swedish);
    });
    return translated === text ? '' : translated; // Return empty if no changes
}
/**
 * Extract META description and other relevant meta tags from HTML
 */
function extractMetaData(html) {
    const metaData = {};
    // META description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch)
        metaData.description = descMatch[1];
    // Title tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch)
        metaData.title = titleMatch[1];
    // META keywords
    const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    if (keywordsMatch)
        metaData.keywords = keywordsMatch[1];
    // Open Graph description
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    if (ogDescMatch)
        metaData.ogDescription = ogDescMatch[1];
    // Open Graph title
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (ogTitleMatch)
        metaData.ogTitle = ogTitleMatch[1];
    return metaData;
}
/**
 * Firebase Function to scrape website META data
 */
exports.scrapeWebsiteMeta = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30
}, async (req, res) => {
    try {
        // Handle CORS
        if (!(0, cors_handler_1.corsHandler)(req, res)) {
            return;
        }
        // Apply rate limiting
        if (!await (0, rate_limiter_1.rateLimiter)(req, res)) {
            return;
        }
        // Only allow POST
        if (req.method !== 'POST') {
            res.status(405).json({ success: false, error: 'Method not allowed' });
            return;
        }
        const { url } = req.body;
        if (!url) {
            res.status(400).json({
                success: false,
                error: 'URL is required'
            });
            return;
        }
        // Validate URL format + SSRF guard (scheme, private-address resolution)
        let websiteUrl;
        try {
            // Add https if missing
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                websiteUrl = `https://${url}`;
            }
            else {
                websiteUrl = url;
            }
            await assertPublicHttpUrl(websiteUrl);
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error?.message?.includes('private') || error?.message?.includes('http')
                    ? error.message
                    : 'Invalid URL format'
            });
            return;
        }
        console.log(`Scraping META data from: ${websiteUrl}`);
        // Fetch website HTML with proper error handling
        let response;
        let html;
        try {
            // Follow redirects MANUALLY, re-validating every hop — a public URL
            // must not be able to bounce the fetch to an internal address.
            let currentUrl = websiteUrl;
            response = undefined;
            for (let hop = 0; hop < 4; hop++) {
                if (hop > 0)
                    await assertPublicHttpUrl(currentUrl);
                response = await fetch(currentUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': `${app_urls_1.commerceConfig.shopName}-MetaScraper/1.0 (+${app_urls_1.appUrls.B2B_PORTAL})`
                    },
                    redirect: 'manual',
                    // Timeout after 20 seconds
                    signal: AbortSignal.timeout(20000)
                });
                const location = response.headers.get('location');
                if (response.status >= 300 && response.status < 400 && location) {
                    currentUrl = new URL(location, currentUrl).toString();
                    continue;
                }
                break;
            }
            if (!response.ok) {
                res.status(400).json({
                    success: false,
                    error: `Failed to fetch website: ${response.status} ${response.statusText}`
                });
                return;
            }
            html = await response.text();
        }
        catch (fetchError) {
            // Handle network errors, DNS failures, timeouts, etc.
            let errorMessage = 'Failed to connect to website';
            if (fetchError.code === 'ENOTFOUND') {
                errorMessage = 'Website not found - check the URL';
            }
            else if (fetchError.name === 'AbortError') {
                errorMessage = 'Website took too long to respond (timeout)';
            }
            else if (fetchError.code === 'ECONNREFUSED') {
                errorMessage = 'Website refused connection';
            }
            else if (fetchError.message) {
                errorMessage = `Connection error: ${fetchError.message}`;
            }
            res.status(400).json({
                success: false,
                error: errorMessage
            });
            return;
        }
        // Extract META data
        const metaData = extractMetaData(html);
        // Use description from META tag, fallback to Open Graph
        const description = metaData.description || metaData.ogDescription || '';
        const title = metaData.title || metaData.ogTitle || '';
        if (!description && !title) {
            res.json({
                success: true,
                data: {
                    description: '',
                    title: '',
                    detectedLanguage: 'unknown',
                    simpleTranslation: '',
                    message: 'Ingen META beskrivning hittades på webbsidan'
                }
            });
            return;
        }
        // Detect language
        const textToAnalyze = `${title} ${description}`.trim();
        const detectedLanguage = detectLanguage(textToAnalyze);
        // Simple translation if not Swedish
        const simpleTranslation = detectedLanguage !== 'sv' ?
            simpleTranslate(description, detectedLanguage) : '';
        res.json({
            success: true,
            data: {
                description,
                title,
                keywords: metaData.keywords || '',
                detectedLanguage,
                simpleTranslation,
                scrapedAt: new Date().toISOString(),
                sourceUrl: websiteUrl
            }
        });
    }
    catch (error) {
        console.error('Error scraping website META:', error);
        // Handle timeout
        if (error.name === 'AbortError') {
            res.status(408).json({
                success: false,
                error: 'Website took too long to respond (timeout)'
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to scrape website META data'
        });
    }
});
//# sourceMappingURL=functions.js.map