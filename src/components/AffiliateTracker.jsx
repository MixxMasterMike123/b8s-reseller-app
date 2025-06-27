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
        console.log(`Affiliate code detected from URL change: ${refCode}`);
        
        // Store the affiliate code in localStorage with a 30-day expiry
        const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000; // 30 days
        const affiliateInfo = { code: refCode, expiry: expiry };
        localStorage.setItem('b8s_affiliate_ref', JSON.stringify(affiliateInfo));

        // Call a cloud function to log the click (fire and forget)
        try {
          const logClick = httpsCallable(functions, 'logAffiliateClick');
          await logClick({ affiliateCode: refCode });
          console.log(`Successfully logged click for affiliate code: ${refCode}`);
        } catch (error) {
          console.error("Error logging affiliate click:", error);
        }
      }
    };

    handleAffiliateLink();
  }, [location]); // Re-run this effect whenever the location changes

  return null; // This component does not render anything
};

export default AffiliateTracker; 