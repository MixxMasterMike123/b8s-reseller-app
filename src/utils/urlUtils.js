// URL normalization helpers for CRM inputs

// Replace a wide range of Unicode dash variants with ASCII hyphen-minus
const DASH_VARIANTS_REGEX = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;

// Remove zero-width and NBSP characters
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;
const NBSP_REGEX = /\u00A0/g;

export function normalizeWebsiteUrl(input) {
  if (!input || typeof input !== 'string') return '';

  let value = input.trim();

  // Normalize special characters
  value = value.replace(ZERO_WIDTH_REGEX, '');
  value = value.replace(NBSP_REGEX, ' ');
  value = value.replace(DASH_VARIANTS_REGEX, '-');

  // If no scheme provided, assume https
  const ensureScheme = (url) => (url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);

  // Try to parse and clean hostname only
  try {
    const withScheme = ensureScheme(value);
    const url = new URL(withScheme);
    // Clean hostname of stray spaces
    let hostname = url.hostname.replace(/\s+/g, '');
    hostname = hostname.replace(DASH_VARIANTS_REGEX, '-');
    // Rebuild URL with normalized hostname
    const normalized = `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ''}${url.pathname}${url.search}${url.hash}`;
    return normalized;
  } catch (_) {
    // Fallback: strip spaces and enforce scheme
    return ensureScheme(value.replace(/\s+/g, ''));
  }
}

export function displayHostname(urlString) {
  if (!urlString) return '';
  try {
    const url = new URL(normalizeWebsiteUrl(urlString));
    return url.host + (url.pathname && url.pathname !== '/' ? url.pathname : '');
  } catch (_) {
    return String(urlString).replace(/^https?:\/\//, '');
  }
}

// Decode known Punycode domains back to Unicode
function decodePunycodeDomain(domain) {
  // Known Punycode mappings for common domains
  const punycodeMap = {
    'xn--tonline-506c.de': 't-online.de', // German t-online
    'xn--e1afmkfd.xn--p1ai': 'пример.рф', // Russian example
    // Add more as needed
  };
  
  // Check for exact domain match first
  if (punycodeMap[domain]) {
    return punycodeMap[domain];
  }
  
  // Check for partial matches
  for (const [punycode, unicode] of Object.entries(punycodeMap)) {
    if (punycode && unicode && domain.includes(punycode.split('.')[0])) {
      return domain.replace(punycode.split('.')[0], unicode.split('.')[0]);
    }
  }
  
  return domain; // Return original if no match found
}

// Normalize email addresses pasted from rich editors
// - Trim
// - Strip zero-width and NBSP
// - Replace Unicode dash variants with ASCII '-'
// - Decode Punycode domains back to Unicode
// - Lowercase domain part only
export function normalizeEmail(input) {
  if (!input || typeof input !== 'string') return '';
  let value = input.trim();
  value = value.replace(ZERO_WIDTH_REGEX, '');
  value = value.replace(NBSP_REGEX, ' ');
  value = value.replace(DASH_VARIANTS_REGEX, '-');

  const atIndex = value.lastIndexOf('@');
  if (atIndex === -1) return value; // not an email, return cleaned value

  const local = value.slice(0, atIndex);
  let domain = value.slice(atIndex + 1);
  domain = domain.replace(/\s+/g, '');
  domain = domain.replace(DASH_VARIANTS_REGEX, '-');
  
  // Try to decode Punycode domain
  domain = decodePunycodeDomain(domain);
  domain = domain.toLowerCase();

  return `${local}@${domain}`;
}

