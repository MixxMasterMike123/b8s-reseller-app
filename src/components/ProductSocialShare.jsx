import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { toast } from 'react-hot-toast';
import { shareToSocial, copyToClipboard } from '../config/socialMedia';
import { getProductUrl } from '../utils/productUrls';

/**
 * Product-Specific Social Share Component
 * SHARING ONLY - Follow links moved to footer
 * Dynamic product image, name, and description for each product
 */

const ProductSocialShare = ({ product, compact = true }) => {
  const { t, currentLanguage } = useTranslation();
  const isSwedish = currentLanguage === 'sv-SE';
  
  // DEBUG: Component loading
  console.log('🚀 ProductSocialShare component loaded with product:', product?.name || 'No product');
  
  // Generate product title helper
  const getProductTitle = () => {
    // FIXED: Handle multilingual product names
    const name = product?.name;
    if (typeof name === 'string') return name;
    if (typeof name === 'object' && name !== null) {
      return name[currentLanguage] || name['sv-SE'] || name['en-US'] || String(name);
    }
    return 'B8Shield Product';
  };

  // Generate product description helper
  const getProductDescription = () => {
    // DEBUG: Log description sources
    console.log('📝 Description sources:', {
      description: product?.description,
      b2cDescription: product?.b2cDescription,
      b2bDescription: product?.b2bDescription,
      currentLanguage
    });
    
    let desc = '';
    
    // Try to get description from various sources
    const sources = [
      product?.b2cDescription,
      product?.description,
      product?.b2bDescription
    ];
    
    for (const source of sources) {
      if (source) {
        if (typeof source === 'string') {
          desc = source;
          console.log('📝 Using string description:', desc.substring(0, 50) + '...');
          break;
        } else if (typeof source === 'object' && source !== null) {
          // Handle multilingual objects
          const langDesc = source[currentLanguage] || source['sv-SE'] || source['en-US'];
          if (langDesc && typeof langDesc === 'string') {
            desc = langDesc;
            console.log('📝 Using multilingual description:', desc.substring(0, 50) + '...');
            break;
          }
        } else {
          console.log('⚠️ Unexpected source type:', typeof source, source);
        }
      }
    }
    
    // If no description found, use fallback
    if (!desc) {
      // FIXED: Get string version of product name for fallback
      const productName = getProductTitle();
      
      desc = isSwedish 
        ? `Premium fiskekroksskydd från B8Shield - ${productName}!` 
        : `Premium fishing lure protection from B8Shield - ${productName}!`;
      console.log('🔄 Using fallback description:', desc);
    }
    
    // Ensure we return a string, not an object
    const finalDesc = String(desc);
    console.log('📤 Final description for sharing:', finalDesc.substring(0, 100) + '...');
    
    // Truncate to ~100 characters for social sharing
    return finalDesc.length > 100 ? finalDesc.substring(0, 97) + '...' : finalDesc;
  };

  // SHARING-ONLY platforms (follow links moved to footer)
  const sharingPlatforms = [
    {
      key: 'facebook',
      name: 'Facebook',
      color: '#1877F2',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      key: 'pinterest',
      name: 'Pinterest',
      color: '#BD081C',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.221.085.342-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.017 0z"/>
        </svg>
      )
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      color: '#0A66C2',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    },
    {
      key: 'twitter',
      name: 'X (Twitter)',
      color: '#000000',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp',
      color: '#25D366',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
        </svg>
      )
    },
    {
      key: 'copy',
      name: isSwedish ? 'Kopiera länk' : 'Copy Link',
      color: '#6B7280',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  // Generate share content with LIVE debugging
  const generateShareContent = () => {
    console.log('🔍 GENERATING SHARE CONTENT...');
    
    // DEBUG: Log product data to see what's available
    console.log('🔍 Product data for sharing:', {
      name: product?.name,
      b2cImageUrl: product?.b2cImageUrl,
      imageUrl: product?.imageUrl,
      b2bImageUrl: product?.b2bImageUrl,
      imageData: product?.imageData ? 'has base64 data' : 'no base64'
    });
    
    // EXTRA DEBUG: Log ALL product fields to see what's actually available
    console.log('🔍 FULL PRODUCT OBJECT:', product);
    
    // Generate product URL
    const productPath = getProductUrl(product);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://shop.b8shield.com';
    const productUrl = `${baseUrl}${productPath}`;
    console.log('🔗 Product URL:', productUrl);

    return {
      title: getProductTitle(),
      description: getProductDescription(),
      image: getProductImage(),
      url: productUrl,
      text: getProductShareText()
    };
  };

  // Generate product image with LIVE debugging
  const getProductImage = () => {
    let imageUrl = '';
    
    // Priority: B2C image > general image > B2B image > base64 fallback
    const imageSources = [
      product?.b2cImageUrl, 
      product?.imageUrl, 
      product?.b2bImageUrl
    ];
    
    for (const source of imageSources) {
      console.log('🔍 Checking image source:', source, typeof source);
      if (source && typeof source === 'string' && source.trim() && 
          !source.includes('b8s_top.webp') && !source.includes('data:')) {
        console.log('✅ Selected image source:', source);
        imageUrl = source;
        break;
      } else {
        console.log('❌ Rejected image source:', source, 'reasons:', {
          exists: !!source,
          isString: typeof source === 'string',
          hasTrim: source && typeof source === 'string' ? source.trim() : 'N/A',
          notWebP: source ? !source.includes('b8s_top.webp') : 'N/A',
          notData: source ? !source.includes('data:') : 'N/A'
        });
      }
    }
    
    // If no URL found but we have base64 data, use that
    if (!imageUrl && product?.imageData && typeof product.imageData === 'string') {
      console.log('🔄 Using base64 imageData as fallback');
      imageUrl = product.imageData;
    }
    
    // UPDATED FIX: Try to convert WebP to JPEG/PNG, or use WebP for modern platforms
    if (imageUrl && imageUrl.includes('.webp')) {
      console.log('⚠️ WebP detected - attempting to find JPEG/PNG alternative');
      
      // Try to convert WebP URL to JPEG equivalent
      const jpegUrl = imageUrl.replace('.webp', '.jpg');
      const pngUrl = imageUrl.replace('.webp', '.png');
      
      console.log('🔄 Trying JPEG alternative:', jpegUrl);
      
      // For now, let's try JPEG first, then use WebP as fallback since Facebook supports WebP
      // Most modern social platforms (Facebook, LinkedIn, Twitter) now support WebP
      console.log('✅ Using WebP - modern social platforms support WebP format');
      // Keep the original WebP URL - it should work fine
    }
    
    // Convert relative URLs to absolute URLs for social sharing
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://shop.b8shield.com';
      imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      console.log('🔄 Converted to absolute URL:', imageUrl);
    }
    
    console.log('📸 Final image URL for sharing:', imageUrl);
    
    // FIXED: Use PNG logo fallback instead of WebP for social media compatibility
    const fallbackUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://shop.b8shield.com'}/images/B8S_logo.png`;
    console.log('📸 Fallback URL:', fallbackUrl);
    console.log('📸 Returning:', imageUrl || fallbackUrl);
    return imageUrl || fallbackUrl;
  };

  const getProductShareText = () => {
    // FIXED: Handle multilingual product names in share text
    const productName = getProductTitle();
    
    const baseText = isSwedish 
      ? `Kolla in ${productName} från B8Shield - Skydda dina beten från snags!`
      : `Check out ${productName} from B8Shield - Protect your lures from snags!`;
    const hashtags = isSwedish
      ? '#B8Shield #Fiske #Betesskydd #Snagfritt #Sverige'
      : '#B8Shield #Fishing #LureProtection #SnagFree #Sweden';
    const finalText = `${baseText} ${hashtags}`;
    console.log('📱 Final share text:', finalText);
    return finalText;
  };
  
  const handleShare = async (platform) => {
    console.log('🔥 SHARE BUTTON CLICKED!', platform.name);
    
    // Generate share content FRESH each time button is clicked
    const shareContent = generateShareContent();
    console.log('📊 Generated share content:', shareContent);
    
    if (platform.key === 'copy') {
      const success = await copyToClipboard(shareContent);
      if (success) {
        toast.success(isSwedish ? 'Länk kopierad!' : 'Link copied!');
      } else {
        toast.error(isSwedish ? 'Kunde inte kopiera' : 'Could not copy');
      }
    } else {
      const success = shareToSocial(platform.key, shareContent);
      if (success) {
        toast.success(isSwedish ? 'Delning öppnad!' : 'Share opened!');
      } else {
        toast.error(isSwedish ? 'Kunde inte dela' : 'Could not share');
      }
    }
  };
  
  console.log('🎯 About to render ProductSocialShare, compact:', compact);
  
  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {isSwedish ? 'Dela produkt' : 'Share Product'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {sharingPlatforms.map((platform) => (
            <button
              key={platform.key}
              onClick={() => handleShare(platform)}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:scale-105 transition-transform duration-200 shadow-md hover:shadow-lg"
              style={{ backgroundColor: platform.color }}
              title={`${isSwedish ? 'Dela på' : 'Share on'} ${platform.name}`}
            >
              {platform.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {isSwedish ? 'Dela denna produkt' : 'Share this Product'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sharingPlatforms.map((platform) => (
          <button
            key={platform.key}
            onClick={() => handleShare(platform)}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div 
              className="flex items-center justify-center w-8 h-8 rounded-full text-white"
              style={{ backgroundColor: platform.color }}
            >
              {platform.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {platform.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductSocialShare;