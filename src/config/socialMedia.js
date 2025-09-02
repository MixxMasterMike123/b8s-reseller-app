/**
 * B8Shield Social Media Configuration
 * Central configuration for all social media platforms and sharing functionality
 */

export const SOCIAL_MEDIA_LINKS = {
  facebook: {
    name: 'Facebook',
    url: 'https://www.facebook.com/profile.php?id=61562171136878&paipv=0&eav=AfZdnv5jaazitVOcWiybcoEUhM_X525qscf20PEP8l8ivKoQh17uTAiMZqiZhYBAdCU',
    icon: 'facebook',
    color: '#1877F2',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php'
  },
  instagram: {
    name: 'Instagram',
    url: 'https://www.instagram.com/b8shield_official/',
    icon: 'instagram',
    color: '#E4405F',
    // Instagram doesn't support direct URL sharing, but we can link to profile
    shareUrl: null
  },
  pinterest: {
    name: 'Pinterest',
    url: 'https://se.pinterest.com/b8shield/',
    icon: 'pinterest',
    color: '#BD081C',
    shareUrl: 'https://pinterest.com/pin/create/button/'
  },
  youtube: {
    name: 'YouTube',
    url: 'https://www.youtube.com/@B8Shield',
    icon: 'youtube',
    color: '#FF0000',
    shareUrl: null // YouTube doesn't have direct sharing for external content
  },
  tiktok: {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@b8shield',
    icon: 'tiktok',
    color: '#000000',
    shareUrl: null // TikTok doesn't support direct URL sharing
  },
  wikipedia: {
    name: 'Wikipedia',
    url: 'https://sv.m.wikipedia.org/wiki/Anv%C3%A4ndare:B8Shield/B8shield',
    icon: 'wikipedia',
    color: '#000000',
    shareUrl: null
  },
  linkedin: {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/b8shield%E2%84%A2-snag-prevention-077196311/',
    icon: 'linkedin',
    color: '#0A66C2',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite/'
  },
  fishbrain: {
    name: 'FishBrain',
    url: 'https://fishbrain.com/anglers/B8Shield',
    icon: 'fishbrain', // Custom icon
    color: '#1B4F72',
    shareUrl: null // FishBrain doesn't have direct sharing API
  }
};

/**
 * Generate dynamic sharing content for a product
 */
export const generateShareContent = (product, pageUrl, language = 'sv-SE') => {
  const isSwedish = language === 'sv-SE';
  
  const baseText = isSwedish 
    ? `Kolla in ${product.name} från B8Shield - Skydda dina beten från snags!`
    : `Check out ${product.name} from B8Shield - Protect your lures from snags!`;
  
  const hashtags = isSwedish
    ? '#B8Shield #Fiske #Betesskydd #Snagfritt #Sverige'
    : '#B8Shield #Fishing #LureProtection #SnagFree #Sweden';

  return {
    title: product.name,
    description: product.description || baseText,
    url: pageUrl,
    image: product.b2cImageUrl || product.imageUrl || product.imageData,
    text: `${baseText} ${hashtags}`,
    hashtags: hashtags
  };
};

/**
 * Generate platform-specific share URLs
 */
export const generateShareUrls = (shareContent) => {
  const encodedUrl = encodeURIComponent(shareContent.url);
  const encodedText = encodeURIComponent(shareContent.text);
  const encodedTitle = encodeURIComponent(shareContent.title);
  const encodedDescription = encodeURIComponent(shareContent.description);
  const encodedImage = shareContent.image ? encodeURIComponent(shareContent.image) : '';

  return {
    facebook: `${SOCIAL_MEDIA_LINKS.facebook.shareUrl}?u=${encodedUrl}&quote=${encodedText}`,
    
    pinterest: `${SOCIAL_MEDIA_LINKS.pinterest.shareUrl}?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`,
    
    linkedin: `${SOCIAL_MEDIA_LINKS.linkedin.shareUrl}?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    
    whatsapp: `https://wa.me/?text=${encodedText} ${encodedUrl}`,
    
    email: `mailto:?subject=${encodedTitle}&body=${encodedText} ${encodedUrl}`
  };
};

/**
 * Open share dialog for specific platform
 */
export const shareToSocial = (platform, shareContent) => {
  const shareUrls = generateShareUrls(shareContent);
  const shareUrl = shareUrls[platform];
  
  if (!shareUrl) {
    console.warn(`No share URL available for platform: ${platform}`);
    return false;
  }
  
  // Open in new window with appropriate dimensions
  const windowFeatures = 'width=600,height=400,scrollbars=yes,resizable=yes';
  window.open(shareUrl, `share-${platform}`, windowFeatures);
  
  return true;
};

/**
 * Copy share content to clipboard
 */
export const copyToClipboard = async (shareContent) => {
  const textToCopy = `${shareContent.text}\n${shareContent.url}`;
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};
