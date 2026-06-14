import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import DynamicPage from '../../pages/shop/DynamicPage';

/**
 * Handles dynamic routing for B2C shop
 * Checks if the path matches a CMS page slug, otherwise renders children
 */
const DynamicRouteHandler = ({ children }) => {
  const location = useLocation();
  const [isCmsPage, setIsCmsPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cmsSlug, setCmsSlug] = useState(null);

  useEffect(() => {
    const checkForCmsPage = async () => {
      // Countryless URLs: the CMS slug is the path itself (no country prefix).
      const pathSegments = (location.pathname || '/').split('/').filter(Boolean);
      if (pathSegments.length < 1) {
        setLoading(false);
        return;
      }

      const slugPath = pathSegments.join('/');

      // Skip if it's a known (non-CMS) route
      const knownRoutes = [
        'product', 'cart', 'checkout', 'order-confirmation', 'order-return', 'account',
        'privacy', 'terms', 'returns', 'cookies', 'shipping',
        'affiliate-registration', 'affiliate-login', 'affiliate-portal',
        'login', 'register', 'forgot-password', 'reset-password'
      ];

      if (knownRoutes.some(route => slugPath.startsWith(route))) {
        setLoading(false);
        return;
      }

      // Check if this path matches a CMS page slug
      try {
        console.log('🔍 DynamicRouteHandler: Checking for CMS page with slug:', slugPath);

        const pagesRef = collection(db, 'pages');
        const q = query(
          pagesRef,
          where('slug', '==', slugPath),
          where('status', '==', 'published')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log('🔍 DynamicRouteHandler: Found CMS page with slug:', slugPath);
          setIsCmsPage(true);
          setCmsSlug(slugPath);
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