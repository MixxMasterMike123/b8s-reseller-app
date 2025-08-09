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

