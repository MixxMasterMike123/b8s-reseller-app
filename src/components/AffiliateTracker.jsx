import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { normalizeAffiliateCode } from '../utils/affiliateCalculations';

const AffiliateTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const handleAffiliateLink = async () => {
      const params = new URLSearchParams(location.search);
      const refCode = params.get('ref');
      const campaignCode = params.get('campaign');

      if (refCode) {
        console.log(`🔗 New affiliate code detected from URL: ${refCode}${campaignCode ? ` with campaign: ${campaignCode}` : ''}`);
        
        // Read existing code from localStorage (and clean up any sessionStorage)
        const existingAffiliateRef = localStorage.getItem('b8s_affiliate_ref');
        
        // Clean up any legacy sessionStorage entries
        if (sessionStorage.getItem('b8s_affiliate_ref')) {
          sessionStorage.removeItem('b8s_affiliate_ref');
          console.log('🧹 Cleaned up legacy sessionStorage affiliate ref');
        }
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
        const normalizedRefCode = normalizeAffiliateCode(refCode);
        if (existingCode && existingCode !== normalizedRefCode) {
          console.log(`🔄 Replacing existing affiliate code ${existingCode} with ${normalizedRefCode}`);
          
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
        
        // Always use localStorage for affiliate tracking (business-critical attribution)
        // This is not subject to cookie consent as it's legitimate business interest
        
        // Always store the new affiliate code (with "last ref wins" principle)
        const normalizedCode = normalizeAffiliateCode(refCode);
        const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000; // 30 days
        const affiliateInfo = { 
          code: normalizedCode, 
          expiry: expiry,
          campaign: campaignCode || null // Store campaign code if present
        };
        localStorage.setItem('b8s_affiliate_ref', JSON.stringify(affiliateInfo));
        console.log(`✅ Stored affiliate code in localStorage: ${normalizedCode}${campaignCode ? ` with campaign: ${campaignCode}` : ''}`);

        // sessionStorage cleanup already handled above when reading existing ref

        // Call a cloud function to log the click (fire and forget)
        try {
          const logClick = httpsCallable(functions, 'logAffiliateClickV2');
          const result = await logClick({ 
            affiliateCode: refCode,
            campaignCode: campaignCode || null
          });
          
          // Store the click ID if returned
          if (result.data && result.data.clickId) {
            affiliateInfo.clickId = result.data.clickId;
            localStorage.setItem('b8s_affiliate_ref', JSON.stringify(affiliateInfo));
            console.log(`📊 Click logged for affiliate code: ${refCode}${campaignCode ? ` with campaign: ${campaignCode}` : ''}, ID: ${result.data.clickId}`);
          } else {
            console.log(`📊 Click logged for affiliate code: ${refCode}${campaignCode ? ` with campaign: ${campaignCode}` : ''}`);
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