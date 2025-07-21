import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import DynamicPage from '../../pages/shop/DynamicPage';

/**
 * Handles dynamic routing for B2C shop
 * Checks if the path matches a CMS page slug, otherwise renders children
 */
const DynamicRouteHandler = ({ children }) => {
  const { countryCode } = useParams();
  const location = useLocation();
  const [isCmsPage, setIsCmsPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cmsSlug, setCmsSlug] = useState(null);

  useEffect(() => {
    const checkForCmsPage = async () => {
      // Extract the path after country code
      const pathSegments = location.pathname.split('/').filter(Boolean);
      if (pathSegments.length < 2) {
        setLoading(false);
        return;
      }

      // Remove country code from path segments
      const pathAfterCountry = pathSegments.slice(1).join('/');
      
      // Skip if it's a known route
      const knownRoutes = [
        'product', 'cart', 'checkout', 'order-confirmation', 'account',
        'privacy', 'terms', 'returns', 'cookies', 'shipping',
        'affiliate-registration', 'affiliate-login', 'affiliate-portal'
      ];

      if (knownRoutes.some(route => pathAfterCountry.startsWith(route))) {
        setLoading(false);
        return;
      }

      // Check if this path matches a CMS page slug
      try {
        console.log('🔍 DynamicRouteHandler: Checking for CMS page with slug:', pathAfterCountry);
        
        const pagesRef = collection(db, 'pages');
        const q = query(
          pagesRef,
          where('slug', '==', pathAfterCountry),
          where('status', '==', 'published')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log('🔍 DynamicRouteHandler: Found CMS page with slug:', pathAfterCountry);
          setIsCmsPage(true);
          setCmsSlug(pathAfterCountry);
        } else {
          console.log('🔍 DynamicRouteHandler: No CMS page found, rendering children');
        }
      } catch (error) {
        console.error('Error checking for CMS page:', error);
      }
      
      setLoading(false);
    };

    checkForCmsPage();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DynamicPage 
      slug={cmsSlug} 
      isCmsPage={isCmsPage}
      children={children}
    />
  );
};

export default DynamicRouteHandler; 