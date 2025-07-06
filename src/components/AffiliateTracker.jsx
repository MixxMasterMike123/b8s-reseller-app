import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const AffiliateTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const handleAffiliateLink = async () => {
      const params = new URLSearchParams(location.search);
      const refCode = params.get('ref');

      if (refCode) {
        console.log(`🔗 New affiliate code detected from URL: ${refCode}`);
        
        // Read existing code from either storage
        const existingAffiliateRef =
          localStorage.getItem('b8s_affiliate_ref') || sessionStorage.getItem('b8s_affiliate_ref');
        let existingCode = null;
        
        if (existingAffiliateRef) {
          try {
            const existingInfo = JSON.parse(existingAffiliateRef);
            existingCode = existingInfo.code;
          } catch (e) {
            console.warn('Invalid existing affiliate data, will be replaced');
          }
        }

        // If this is a different code than what's stored, clear cart discount
        if (existingCode && existingCode !== refCode.toUpperCase()) {
          console.log(`🔄 Replacing existing affiliate code ${existingCode} with ${refCode}`);
          
          // Clear cart discount from localStorage to force re-application
          const existingCart = localStorage.getItem('b8shield_cart');
          if (existingCart) {
            try {
              const cartData = JSON.parse(existingCart);
              cartData.discountCode = null;
              cartData.discountAmount = 0;
              cartData.discountPercentage = 0;
              cartData.affiliateClickId = null;
              localStorage.setItem('b8shield_cart', JSON.stringify(cartData));
              console.log('🧹 Cleared existing cart discount to allow new affiliate code');
            } catch (e) {
              console.warn('Could not clear cart discount, but continuing with new affiliate code');
            }
          }
        }
        
        // Determine if we have marketing/statistics consent from Cookiebot
        const hasConsent =
          window.Cookiebot?.consent?.marketing || window.Cookiebot?.consent?.statistics;

        // Choose storage based on consent
        const storage = hasConsent ? localStorage : sessionStorage;

        // Always store the new affiliate code (with "last ref wins" principle)
        const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000; // 30 days
        const affiliateInfo = { code: refCode.toUpperCase(), expiry: expiry };
        storage.setItem('b8s_affiliate_ref', JSON.stringify(affiliateInfo));
        console.log(`✅ Stored affiliate code (${hasConsent ? 'permanent' : 'session'}): ${refCode.toUpperCase()}`);

        // If consent not yet given, migrate to localStorage when it is granted later
        if (!hasConsent) {
          const migrateOnConsent = () => {
            if (window.Cookiebot?.consent?.marketing || window.Cookiebot?.consent?.statistics) {
              localStorage.setItem('b8s_affiliate_ref', sessionStorage.getItem('b8s_affiliate_ref'));
              sessionStorage.removeItem('b8s_affiliate_ref');
              window.removeEventListener('CookieConsentDeclaration', migrateOnConsent);
              console.log('🔄 Migrated affiliate ref to localStorage after consent');
            }
          };
          window.addEventListener('CookieConsentDeclaration', migrateOnConsent);
        }

        // Call a cloud function to log the click (fire and forget)
        try {
          const logClick = httpsCallable(functions, 'logAffiliateClick');
          const result = await logClick({ affiliateCode: refCode });
          
          // Store the click ID if returned
          if (result.data && result.data.clickId) {
            affiliateInfo.clickId = result.data.clickId;
            storage.setItem('b8s_affiliate_ref', JSON.stringify(affiliateInfo));
            console.log(`📊 Click logged for affiliate code: ${refCode}, ID: ${result.data.clickId}`);
          } else {
            console.log(`📊 Click logged for affiliate code: ${refCode}`);
          }
        } catch (error) {
          console.error("❌ Error logging affiliate click:", error);
        }

        // Trigger a storage event to notify other components about the change
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'b8s_affiliate_ref',
          newValue: JSON.stringify(affiliateInfo),
          oldValue: existingAffiliateRef
        }));
      }
    };

    handleAffiliateLink();
  }, [location]); // Re-run this effect whenever the location changes

  return null; // This component does not render anything
};

export default AffiliateTracker; 