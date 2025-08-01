/**
 * Parse referrer URLs into clean domain names
 * 
 * DYNAMIC APPROACH - NO HARDCODED DOMAINS
 * - Extracts clean domain from any URL
 * - Handles internal/development as "Direct" 
 * - Shows actual domain names as-is
 */

export const parseReferrer = (referrerUrl) => {
  // Handle missing or unknown referrers
  if (!referrerUrl || referrerUrl === 'unknown' || referrerUrl === 'direct') {
    return { name: 'Direct', category: 'direct' };
  }

  try {
    const url = new URL(referrerUrl);
    const hostname = url.hostname.toLowerCase();
    
    // Filter out internal/development domains - show as Direct
    if (hostname.includes('localhost') || 
        hostname.includes('127.0.0.1') || 
        hostname.includes('shop.b8shield.com') ||
        hostname.includes('partner.b8shield.com') ||
        hostname.includes('b8shield-reseller-app')) {
      return { name: 'Direct', category: 'direct' };
    }
    
    // Extract clean domain name (remove www.)
    const cleanDomain = hostname.replace('www.', '');
    
    // For very short domains, show as Direct
    if (cleanDomain.length < 4) {
      return { name: 'Direct', category: 'direct' };
    }
    
    // Capitalize first letter for display
    const displayName = cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
    
    return { 
      name: displayName, 
      category: 'website'
    };
    
  } catch (error) {
    // Invalid URL - treat as Direct
    return { name: 'Direct', category: 'direct' };
  }
};

export const getReferrerCategory = (category) => {
  switch (category) {
    case 'website':
      return { color: 'gray', label: 'Website' };
    case 'direct':
      return { color: 'indigo', label: 'Direct' };
    default:
      return { color: 'gray', label: 'Unknown' };
  }
};