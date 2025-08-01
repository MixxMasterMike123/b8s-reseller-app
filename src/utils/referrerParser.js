/**
 * Parse and format referrer URLs for better display
 * Converts raw referrer URLs to human-readable source names
 * 
 * BUSINESS LOGIC:
 * - Internal B8Shield domains → "Direct" (not useful to show shop.b8shield.com as referrer)
 * - External social/search/websites → Show actual source (valuable for attribution)
 * - Unknown/invalid → "Direct" (clean fallback)
 * 
 * This provides meaningful traffic source data for affiliate and admin analytics
 */

export const parseReferrer = (referrer) => {
  if (!referrer || referrer === 'unknown' || referrer === 'direct') {
    return { name: 'Direkt', icon: 'LINK', category: 'direct' };
  }

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    
    // Filter out internal B8Shield domains - these should be "Direct"
    if (hostname.includes('b8shield.com') || 
        hostname.includes('b8shield-reseller-app.web.app') ||
        hostname.includes('b8shield-reseller-app.firebaseapp.com')) {
      return { name: 'Direkt', icon: 'LINK', category: 'direct' };
    }
    
    // Social Media Platforms
    if (hostname.includes('instagram.com')) {
      return { name: 'Instagram', icon: 'PHOTO', category: 'social' };
    }
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return { name: 'YouTube', icon: 'VIDEO', category: 'social' };
    }
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      return { name: 'Facebook', icon: 'USERS', category: 'social' };
    }
    if (hostname.includes('tiktok.com')) {
      return { name: 'TikTok', icon: 'MUSIC', category: 'social' };
    }
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return { name: 'X (Twitter)', icon: 'BIRD', category: 'social' };
    }
    if (hostname.includes('linkedin.com')) {
      return { name: 'LinkedIn', icon: 'WORK', category: 'social' };
    }
    if (hostname.includes('pinterest.com')) {
      return { name: 'Pinterest', icon: 'PIN', category: 'social' };
    }
    if (hostname.includes('whatsapp.com')) {
      return { name: 'WhatsApp', icon: 'CHAT', category: 'social' };
    }
    
    // Search Engines
    if (hostname.includes('google.')) {
      return { name: 'Google', icon: 'SEARCH', category: 'search' };
    }
    if (hostname.includes('bing.com')) {
      return { name: 'Bing', icon: 'SEARCH', category: 'search' };
    }
    if (hostname.includes('yahoo.com')) {
      return { name: 'Yahoo', icon: 'SEARCH', category: 'search' };
    }
    if (hostname.includes('duckduckgo.com')) {
      return { name: 'DuckDuckGo', icon: 'SEARCH', category: 'search' };
    }
    
    // Email Providers
    if (hostname.includes('gmail.com') || hostname.includes('mail.google.com')) {
      return { name: 'Gmail', icon: 'EMAIL', category: 'email' };
    }
    if (hostname.includes('outlook.com') || hostname.includes('hotmail.com')) {
      return { name: 'Outlook', icon: 'EMAIL', category: 'email' };
    }
    
    // News & Media
    if (hostname.includes('reddit.com')) {
      return { name: 'Reddit', icon: 'FORUM', category: 'social' };
    }
    if (hostname.includes('discord.com') || hostname.includes('discordapp.com')) {
      return { name: 'Discord', icon: 'GAME', category: 'social' };
    }
    
    // Swedish Sites
    if (hostname.includes('aftonbladet.se')) {
      return { name: 'Aftonbladet', icon: 'NEWS', category: 'news' };
    }
    if (hostname.includes('expressen.se')) {
      return { name: 'Expressen', icon: 'NEWS', category: 'news' };
    }
    if (hostname.includes('svt.se')) {
      return { name: 'SVT', icon: 'TV', category: 'news' };
    }
    if (hostname.includes('dn.se')) {
      return { name: 'DN', icon: 'NEWS', category: 'news' };
    }
    
    // Fishing/Outdoor Sites
    if (hostname.includes('fiskejournalen.se')) {
      return { name: 'Fiskejournalen', icon: 'FISH', category: 'fishing' };
    }
    if (hostname.includes('sportfiskarna.se')) {
      return { name: 'Sportfiskarna', icon: 'FISH', category: 'fishing' };
    }
    if (hostname.includes('fiske.se')) {
      return { name: 'Fiske.se', icon: 'FISH', category: 'fishing' };
    }
    
    // Generic website - show clean domain name
    const cleanDomain = hostname.replace('www.', '');
    
    // For very short or suspicious domains, show as Direct to avoid clutter
    if (cleanDomain.length < 4 || cleanDomain.includes('localhost') || cleanDomain.includes('127.0.0.1')) {
      return { name: 'Direkt', icon: 'LINK', category: 'direct' };
    }
    
    return { 
      name: cleanDomain, 
      icon: 'WEB', 
      category: 'website',
      fullUrl: referrer 
    };
    
  } catch (error) {
    // Invalid URL or parsing error - treat as Direct
    return { name: 'Direkt', icon: 'LINK', category: 'direct' };
  }
};

export const getReferrerCategory = (category) => {
  switch (category) {
    case 'social':
      return { color: 'purple', label: 'Social Media' };
    case 'search':
      return { color: 'blue', label: 'Sökmotor' };
    case 'email':
      return { color: 'green', label: 'E-post' };
    case 'news':
      return { color: 'red', label: 'Nyheter' };
    case 'fishing':
      return { color: 'teal', label: 'Fiske' };
    case 'website':
      return { color: 'gray', label: 'Webbplats' };
    case 'direct':
      return { color: 'indigo', label: 'Direkt' };
    default:
      return { color: 'gray', label: 'Okänd' };
  }
};