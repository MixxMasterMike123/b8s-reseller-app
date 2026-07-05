"use strict";
// Native product reviews: a small advisory content filter. Returns a list of
// reasons a review's text looks problematic. A NON-EMPTY result routes the review
// to 'pending' (human moderation) instead of auto-publishing; an EMPTY result
// auto-publishes. This is deliberately simple — the goal is to catch obvious
// spam (links, contact-harvesting) and a short profanity list, not to be an
// exhaustive filter (that would risk suppressing legitimate negative reviews,
// which is legally prohibited under the Omnibus/consumer rules).
Object.defineProperty(exports, "__esModule", { value: true });
exports.flagReviewText = void 0;
// Bare URLs / links.
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
// Email addresses (contact harvesting).
const EMAIL_RE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
// Small sv + en profanity list. Word-boundary matched, case-insensitive. Kept
// short on purpose (over-filtering negative-but-legitimate reviews is worse than
// letting a few through to auto-publish).
const PROFANITY = [
    // sv
    'fitta', 'kuk', 'hora', 'jävla', 'jävlar', 'skit', 'fan', 'helvete',
    // en
    'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'bastard',
];
const PROFANITY_RE = new RegExp(`\\b(?:${PROFANITY.join('|')})\\b`, 'i');
/**
 * Returns the list of flag reasons for `text`. Empty array → clean (auto-publish).
 */
function flagReviewText(text) {
    const reasons = [];
    const t = typeof text === 'string' ? text : '';
    if (!t.trim())
        return reasons; // empty text is fine (rating-only review)
    if (URL_RE.test(t))
        reasons.push('url');
    if (EMAIL_RE.test(t))
        reasons.push('email');
    if (PROFANITY_RE.test(t))
        reasons.push('profanity');
    return reasons;
}
exports.flagReviewText = flagReviewText;
//# sourceMappingURL=contentFilter.js.map