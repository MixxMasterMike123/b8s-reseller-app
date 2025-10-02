"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.scrapeWebsiteMeta = void 0;
var https_1 = require("firebase-functions/v2/https");
var cors_handler_1 = require("../protection/cors/cors-handler");
var rate_limiter_1 = require("../protection/rate-limiting/rate-limiter");
// Simple language detection patterns
var LANGUAGE_PATTERNS = {
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
var SIMPLE_TRANSLATIONS = {
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
    var lowerText = text.toLowerCase();
    var scores = {};
    // Initialize scores
    Object.keys(LANGUAGE_PATTERNS).forEach(function (lang) {
        scores[lang] = 0;
    });
    // Score based on common words
    Object.entries(LANGUAGE_PATTERNS).forEach(function (_a) {
        var lang = _a[0], patterns = _a[1];
        patterns.words.forEach(function (word) {
            var regex = new RegExp("\\b".concat(word, "\\b"), 'gi');
            var matches = (lowerText.match(regex) || []).length;
            scores[lang] += matches * 2; // Common words get 2 points
        });
        patterns.businessTerms.forEach(function (term) {
            var regex = new RegExp("\\b".concat(term, "\\b"), 'gi');
            var matches = (lowerText.match(regex) || []).length;
            scores[lang] += matches * 3; // Business terms get 3 points
        });
    });
    // Find highest scoring language
    var detected = Object.entries(scores).reduce(function (a, b) {
        return scores[a[0]] > scores[b[0]] ? a : b;
    })[0];
    return scores[detected] > 0 ? detected : 'unknown';
}
/**
 * Simple translation of common business terms
 */
function simpleTranslate(text, fromLang) {
    if (fromLang === 'sv')
        return text; // Already Swedish
    var translated = text;
    Object.entries(SIMPLE_TRANSLATIONS).forEach(function (_a) {
        var original = _a[0], swedish = _a[1];
        var regex = new RegExp("\\b".concat(original, "\\b"), 'gi');
        translated = translated.replace(regex, swedish);
    });
    return translated === text ? '' : translated; // Return empty if no changes
}
/**
 * Extract META description and other relevant meta tags from HTML
 */
function extractMetaData(html) {
    var metaData = {};
    // META description
    var descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (descMatch)
        metaData.description = descMatch[1];
    // Title tag
    var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch)
        metaData.title = titleMatch[1];
    // META keywords
    var keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
    if (keywordsMatch)
        metaData.keywords = keywordsMatch[1];
    // Open Graph description
    var ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    if (ogDescMatch)
        metaData.ogDescription = ogDescMatch[1];
    // Open Graph title
    var ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
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
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var url, websiteUrl, response, html, fetchError_1, errorMessage, metaData, description, title, textToAnalyze, detectedLanguage, simpleTranslation, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                // Handle CORS
                if (!(0, cors_handler_1.corsHandler)(req, res)) {
                    return [2 /*return*/];
                }
                return [4 /*yield*/, (0, rate_limiter_1.rateLimiter)(req, res)];
            case 1:
                // Apply rate limiting
                if (!(_a.sent())) {
                    return [2 /*return*/];
                }
                // Only allow POST
                if (req.method !== 'POST') {
                    res.status(405).json({ success: false, error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                url = req.body.url;
                if (!url) {
                    res.status(400).json({
                        success: false,
                        error: 'URL is required'
                    });
                    return [2 /*return*/];
                }
                websiteUrl = void 0;
                try {
                    // Add https if missing
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        websiteUrl = "https://".concat(url);
                    }
                    else {
                        websiteUrl = url;
                    }
                    new URL(websiteUrl); // Validate URL format
                }
                catch (error) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid URL format'
                    });
                    return [2 /*return*/];
                }
                console.log("Scraping META data from: ".concat(websiteUrl));
                response = void 0;
                html = void 0;
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                return [4 /*yield*/, fetch(websiteUrl, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'B8Shield-MetaScraper/1.0 (+https://partner.b8shield.com)'
                        },
                        // Timeout after 20 seconds
                        signal: AbortSignal.timeout(20000)
                    })];
            case 3:
                response = _a.sent();
                if (!response.ok) {
                    res.status(400).json({
                        success: false,
                        error: "Failed to fetch website: ".concat(response.status, " ").concat(response.statusText)
                    });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, response.text()];
            case 4:
                html = _a.sent();
                return [3 /*break*/, 6];
            case 5:
                fetchError_1 = _a.sent();
                errorMessage = 'Failed to connect to website';
                if (fetchError_1.code === 'ENOTFOUND') {
                    errorMessage = 'Website not found - check the URL';
                }
                else if (fetchError_1.name === 'AbortError') {
                    errorMessage = 'Website took too long to respond (timeout)';
                }
                else if (fetchError_1.code === 'ECONNREFUSED') {
                    errorMessage = 'Website refused connection';
                }
                else if (fetchError_1.message) {
                    errorMessage = "Connection error: ".concat(fetchError_1.message);
                }
                res.status(400).json({
                    success: false,
                    error: errorMessage
                });
                return [2 /*return*/];
            case 6:
                metaData = extractMetaData(html);
                description = metaData.description || metaData.ogDescription || '';
                title = metaData.title || metaData.ogTitle || '';
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
                    return [2 /*return*/];
                }
                textToAnalyze = "".concat(title, " ").concat(description).trim();
                detectedLanguage = detectLanguage(textToAnalyze);
                simpleTranslation = detectedLanguage !== 'sv' ?
                    simpleTranslate(description, detectedLanguage) : '';
                res.json({
                    success: true,
                    data: {
                        description: description,
                        title: title,
                        keywords: metaData.keywords || '',
                        detectedLanguage: detectedLanguage,
                        simpleTranslation: simpleTranslation,
                        scrapedAt: new Date().toISOString(),
                        sourceUrl: websiteUrl
                    }
                });
                return [3 /*break*/, 8];
            case 7:
                error_1 = _a.sent();
                console.error('Error scraping website META:', error_1);
                // Handle timeout
                if (error_1.name === 'AbortError') {
                    res.status(408).json({
                        success: false,
                        error: 'Website took too long to respond (timeout)'
                    });
                    return [2 /*return*/];
                }
                res.status(500).json({
                    success: false,
                    error: 'Failed to scrape website META data'
                });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
