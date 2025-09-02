import React, { useState } from 'react';
import { 
  ShareIcon, 
  LinkIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { 
  SOCIAL_MEDIA_LINKS, 
  generateShareContent, 
  shareToSocial, 
  copyToClipboard 
} from '../config/socialMedia';

/**
 * FishBrain Custom Icon Component
 */
const FishBrainIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <circle cx="50" cy="50" r="45" fill="currentColor"/>
    <path 
      d="M25 45 C25 35, 35 30, 45 35 L65 45 C70 47, 75 52, 70 58 L60 65 C55 70, 45 65, 40 60 L25 45 Z" 
      fill="white"
    />
    <path 
      d="M35 50 L55 40 L65 45 L70 50 L65 55 L55 60 L35 50 Z" 
      fill="white"
    />
    <circle cx="55" cy="42" r="3" fill="currentColor"/>
    <path 
      d="M45 35 L40 25 L50 20 L60 25 L55 35" 
      fill="white"
    />
  </svg>
);

/**
 * Social Media Icon Component
 */
const SocialIcon = ({ platform, className }) => {
  const iconClass = `${className} transition-colors`;
  
  switch (platform) {
    case 'facebook':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    
    case 'instagram':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.52.204 5.015.388a6.5 6.5 0 0 0-2.346 1.527A6.5 6.5 0 0 0 1.142 4.26c-.184.505-.306 1.08-.34 2.027C.768 7.235.756 7.642.756 11.263c0 3.621.012 4.028.047 4.975.034.947.156 1.522.34 2.027a6.5 6.5 0 0 0 1.527 2.346 6.5 6.5 0 0 0 2.346 1.527c.505.184 1.08.306 2.027.34.947.035 1.354.047 4.975.047 3.621 0 4.028-.012 4.975-.047.947-.034 1.522-.156 2.027-.34a6.5 6.5 0 0 0 2.346-1.527 6.5 6.5 0 0 0 1.527-2.346c.184-.505.306-1.08.34-2.027.035-.947.047-1.354.047-4.975 0-3.621-.012-4.028-.047-4.975-.034-.947-.156-1.522-.34-2.027a6.5 6.5 0 0 0-1.527-2.346A6.5 6.5 0 0 0 16.982.388C16.477.204 15.902.082 14.955.048 14.009.013 13.602.001 9.981.001h2.036zm-.024 5.924a6.16 6.16 0 1 1 0 12.32 6.16 6.16 0 0 1 0-12.32zm0 10.163a4.002 4.002 0 1 0 0-8.005 4.002 4.002 0 0 0 0 8.005zm7.846-10.405a1.441 1.441 0 1 1-2.883 0 1.441 1.441 0 0 1 2.883 0z"/>
        </svg>
      );
    
    case 'pinterest':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.221.085.342-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.017 0z"/>
        </svg>
      );
    
    case 'youtube':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    
    case 'tiktok':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      );
    
    case 'wikipedia':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127 1.907-1.532 2.483-1.284 1.836-2.604 2.526-3.717 2.526-.945 0-1.688-.328-2.229-.984-.541-.656-.812-1.569-.812-2.738 0-.984.328-2.013.984-3.086l4.548-7.447c.328-.656.656-1.074.984-1.253.328-.179.738-.269 1.229-.269.328 0 .656.09.984.269.328.179.656.597.984 1.253l1.074 2.013.328-.656c.328-.656.656-1.074.984-1.253.328-.179.738-.269 1.229-.269.328 0 .656.09.984.269.328.179.656.597.984 1.253l4.548 7.447c.656 1.074.984 2.102.984 3.086 0 1.169-.271 2.082-.812 2.738-.541.656-1.284.984-2.229.984-1.113 0-2.433-.69-3.717-2.526-.405-.576-.916-1.409-1.532-2.483-.636-1.18-1.917-3.796-2.853-5.728z"/>
        </svg>
      );
    
    case 'linkedin':
      return (
        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    
    case 'fishbrain':
      return <FishBrainIcon className={iconClass} />;
    
    default:
      return <ShareIcon className={iconClass} />;
  }
};

/**
 * Social Media Share Component
 * Displays social media links and sharing options for products
 */
const SocialMediaShare = ({ 
  product, 
  pageUrl = window.location.href, 
  language = 'sv-SE',
  showFollowLinks = true,
  showShareButtons = true,
  compact = false
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareContent = generateShareContent(product, pageUrl, language);
  
  const isSwedish = language === 'sv-SE';
  
  const handleShare = async (platform) => {
    const success = shareToSocial(platform, shareContent);
    if (success) {
      toast.success(isSwedish ? 'Delning öppnad!' : 'Share opened!');
    } else {
      toast.error(isSwedish ? 'Kunde inte dela' : 'Could not share');
    }
  };
  
  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareContent);
    if (success) {
      toast.success(isSwedish ? 'Länk kopierad!' : 'Link copied!');
    } else {
      toast.error(isSwedish ? 'Kunde inte kopiera' : 'Could not copy');
    }
  };
  
  const shareablePlatforms = ['facebook', 'pinterest', 'linkedin', 'twitter', 'whatsapp', 'email'];
  const followPlatforms = Object.keys(SOCIAL_MEDIA_LINKS);
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {showShareButtons && (
          <button
            onClick={() => setIsShareOpen(!isShareOpen)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            title={isSwedish ? 'Dela produkt' : 'Share product'}
          >
            <ShareIcon className="h-4 w-4" />
            {isSwedish ? 'Dela' : 'Share'}
          </button>
        )}
        
        {isShareOpen && (
          <div className="flex items-center gap-2 ml-2">
            {shareablePlatforms.slice(0, 3).map(platform => (
              <button
                key={platform}
                onClick={() => handleShare(platform)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ color: SOCIAL_MEDIA_LINKS[platform]?.color || '#666' }}
                title={`${isSwedish ? 'Dela på' : 'Share on'} ${SOCIAL_MEDIA_LINKS[platform]?.name || platform}`}
              >
                <SocialIcon platform={platform} className="h-5 w-5" />
              </button>
            ))}
            <button
              onClick={handleCopyLink}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
              title={isSwedish ? 'Kopiera länk' : 'Copy link'}
            >
              <LinkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {showFollowLinks && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {isSwedish ? 'Följ B8Shield' : 'Follow B8Shield'}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {followPlatforms.map(platform => {
              const social = SOCIAL_MEDIA_LINKS[platform];
              return (
                <a
                  key={platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
                  style={{ '--hover-color': social.color }}
                  title={`${isSwedish ? 'Besök oss på' : 'Visit us on'} ${social.name}`}
                >
                  <SocialIcon 
                    platform={platform} 
                    className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-[var(--hover-color)] transition-colors" 
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {social.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
      
      {showShareButtons && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {isSwedish ? 'Dela denna produkt' : 'Share this product'}
          </h3>
          <div className="flex flex-wrap gap-3">
            {shareablePlatforms.map(platform => {
              const social = SOCIAL_MEDIA_LINKS[platform] || { name: platform, color: '#666' };
              return (
                <button
                  key={platform}
                  onClick={() => handleShare(platform)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
                  style={{ '--hover-color': social.color }}
                  title={`${isSwedish ? 'Dela på' : 'Share on'} ${social.name}`}
                >
                  <SocialIcon 
                    platform={platform} 
                    className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-[var(--hover-color)] transition-colors" 
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {social.name}
                  </span>
                </button>
              );
            })}
            
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              title={isSwedish ? 'Kopiera länk' : 'Copy link'}
            >
              <LinkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {isSwedish ? 'Kopiera länk' : 'Copy Link'}
              </span>
            </button>
            
            <button
              onClick={() => handleShare('email')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              title={isSwedish ? 'Dela via e-post' : 'Share via email'}
            >
              <EnvelopeIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {isSwedish ? 'E-post' : 'Email'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaShare;
