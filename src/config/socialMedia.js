/**
 * Social Media Configuration
 * Platform METADATA (name/icon/color + share endpoints) only — brand-neutral.
 * Per-shop PROFILE links live in Store Identity (store.social.*) and are read
 * via useStoreSettings(); they are NOT hardcoded here. The `url` field below is
 * a per-platform fallback (empty = no profile link unless the shop sets one).
 */
export const SOCIAL_MEDIA_LINKS = {
  facebook: {
    name: 'Facebook',
    url: '',
    icon: 'facebook',
    color: '#1877F2',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php'
  },
  instagram: {
    name: 'Instagram',
    url: '',
    icon: 'instagram',
    color: '#E4405F',
    // Instagram doesn't support direct URL sharing, but we can link to profile
    shareUrl: null
  },
  pinterest: {
    name: 'Pinterest',
    url: '',
    icon: 'pinterest',
    color: '#BD081C',
    shareUrl: 'https://pinterest.com/pin/create/button/'
  },
  youtube: {
    name: 'YouTube',
    url: '',
    icon: 'youtube',
    color: '#FF0000',
    shareUrl: null // YouTube doesn't have direct sharing for external content
  },
  tiktok: {
    name: 'TikTok',
    url: '',
    icon: 'tiktok',
    color: '#000000',
    shareUrl: null // TikTok doesn't support direct URL sharing
  },
  linkedin: {
    name: 'LinkedIn',
    url: '',
    icon: 'linkedin',
    color: '#0A66C2',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite/'
  }
};

/**
 * Generate dynamic sharing content for a product. `brand` (the shop name)
 * is interpolated into the share text; pass store.shopName.
 */
export const generateShareContent = (product, pageUrl, language = 'sv-SE', brand = '') => {
  const isSwedish = language === 'sv-SE';
  const from = brand ? (isSwedish ? ` från ${brand}` : ` from ${brand}`) : '';

  const baseText = isSwedish
    ? `Kolla in ${product.name}${from}!`
    : `Check out ${product.name}${from}!`;

  const tag = brand ? `#${brand.replace(/\s+/g, '')} ` : '';
  const hashtags = isSwedish
    ? `${tag}#Sverige`.trim()
    : `${tag}#Sweden`.trim();

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
    // FIXED: Facebook now includes image parameter for proper product image sharing
    facebook: `${SOCIAL_MEDIA_LINKS.facebook.shareUrl}?u=${encodedUrl}&quote=${encodedText}${encodedImage ? `&picture=${encodedImage}` : ''}`,
    
    pinterest: `${SOCIAL_MEDIA_LINKS.pinterest.shareUrl}?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`,
    
    // FIXED: LinkedIn now includes image parameter for proper product image sharing  
    linkedin: `${SOCIAL_MEDIA_LINKS.linkedin.shareUrl}?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}${encodedImage ? `&source=${encodedImage}` : ''}`,
    
    // FIXED: Twitter now includes image via card meta tags (handled by page meta)
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
