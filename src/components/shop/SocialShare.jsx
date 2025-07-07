import React from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import toast from 'react-hot-toast';

// Icons (outlined, lightweight)
import { AiOutlineFacebook, AiOutlineInstagram } from 'react-icons/ai';
import { FaPinterestP, FaXTwitter, FaLinkedinIn, FaTiktok } from 'react-icons/fa6';

const platforms = {
  facebook: {
    icon: AiOutlineFacebook,
    getShareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  instagram: {
    icon: AiOutlineInstagram,
    // No official web share; we will copy link instead
    getShareUrl: null,
  },
  tiktok: {
    icon: FaTiktok,
    getShareUrl: null,
  },
  pinterest: {
    icon: FaPinterestP,
    getShareUrl: (url, { image, title }) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}${image ? `&media=${encodeURIComponent(image)}` : ''}&description=${encodeURIComponent(title)}`,
  },
  twitter: {
    icon: FaXTwitter,
    getShareUrl: (url, { title }) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  linkedin: {
    icon: FaLinkedinIn,
    getShareUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
};

const SocialShare = ({ url, title, image }) => {
  const { t } = useTranslation();

  const handleShare = (platformKey) => {
    const platform = platforms[platformKey];
    if (!platform) return;

    if (platform.getShareUrl) {
      const shareUrl = platform.getShareUrl(url, { title, image });
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(url).then(() => {
        toast.success(t('copied_link', 'Link copied!'));
      });
    }
  };

  return (
    <div className="social-share mt-6">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        {t('share_product', 'Share product')}
      </h4>
      <div className="flex items-center gap-3">
        {Object.keys(platforms).map((key) => {
          const Icon = platforms[key].icon;
          return (
            <button
              key={key}
              onClick={() => handleShare(key)}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-150"
              aria-label={key}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SocialShare; 