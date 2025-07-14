import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getCountryAwareUrl } from '../../utils/productUrls';

const ShopNavigation = ({ breadcrumb }) => {
  const { cart } = useCart();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, logout } = useSimpleAuth();
  const [affiliateData, setAffiliateData] = useState(null);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  
  // Calculate total items in cart
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const fetchAffiliateData = async () => {
      if (!currentUser?.email) {
        setAffiliateData(null);
        return;
      }
      try {
        const affiliatesRef = collection(db, 'affiliates');
            const affiliateQuery = query(affiliatesRef, where('email', '==', currentUser.email), where('status', '==', 'active'));
    const querySnapshot = await getDocs(affiliateQuery);
        if (!querySnapshot.empty) {
          setAffiliateData(querySnapshot.docs[0].data());
        } else {
          setAffiliateData(null);
        }
      } catch {
        setAffiliateData(null);
      }
    };
    fetchAffiliateData();
  }, [currentUser]);

  const handleAffiliateLogout = async () => {
    await logout();
    navigate(getCountryAwareUrl(''));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.login-dropdown')) {
        setShowLoginDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={getCountryAwareUrl('')} className="flex items-center">
            <img src="/images/B8S_full_logo.svg" alt="B8Shield" className="h-8 w-auto" />
          </Link>
          
          {/* Breadcrumb */}
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
            <Link to={getCountryAwareUrl('')} className="hover:text-blue-600 transition-colors">
              {t('nav_home', 'Hem')}
            </Link>
            {breadcrumb && (
              <>
                <span>/</span>
                <span className="text-gray-900">{breadcrumb}</span>
              </>
            )}
          </div>
          
          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            {/* Search Icon - Placeholder for future implementation */}
            <button 
              className="p-2 text-gray-700 hover:text-blue-600 transition-colors"
              title={t('nav_search', 'Sök')}
              onClick={() => {
                // TODO: Implement search functionality
                toast.success(t('search_coming_soon', 'Sökfunktion kommer snart!'));
              }}
            >
              <MagnifyingGlassIcon className="h-6 w-6" />
            </button>

            {/* Smart User Profile Section */}
            {currentUser ? (
              <div className="flex items-center space-x-2">
                {/* User Account Link */}
                <Link 
                  to={affiliateData ? getCountryAwareUrl('affiliate-portal') : getCountryAwareUrl('account')}
                  className="p-2 text-gray-700 hover:text-blue-600 transition-colors"
                  title={affiliateData ? t('nav_affiliate_portal', 'Affiliate Portal') : t('nav_my_account', 'Mitt konto')}
                >
                  <UserIcon className="h-6 w-6" />
                </Link>

                {/* User Name Display */}
                <div className="flex items-center space-x-2">
                  <span className="hidden sm:inline text-sm text-gray-600 max-w-[120px] truncate">
                    {affiliateData ? affiliateData.name : (currentUser.displayName || currentUser.email?.split('@')[0])}
                  </span>
                  <span className="sm:hidden text-xs text-gray-500 max-w-[60px] truncate">
                    {affiliateData ? affiliateData.name : (currentUser.displayName || currentUser.email?.split('@')[0])}
                  </span>
                  
                  {/* Status Indicators */}
                  {affiliateData && (
                    <span className="text-green-500 text-xs">●</span>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={affiliateData ? handleAffiliateLogout : () => {
                    logout();
                    navigate(getCountryAwareUrl(''));
                  }}
                  className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                  title={t('nav_logout', 'Logga ut')}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              /* Smart Login Dropdown for Non-authenticated Users */
              <div className="relative login-dropdown">
                <button
                  onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                  onMouseEnter={() => setShowLoginDropdown(true)}
                  className="flex items-center p-2 text-gray-700 hover:text-blue-600 transition-colors"
                  title={t('nav_login', 'Logga in')}
                >
                  <UserIcon className="h-6 w-6" />
                  <ChevronDownIcon className="h-3 w-3 ml-1 hidden sm:block" />
                </button>

                {/* Login Dropdown Menu */}
                {showLoginDropdown && (
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                    onMouseLeave={() => setShowLoginDropdown(false)}
                  >
                    <div className="py-2">
                      <Link
                        to="/login"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        onClick={() => setShowLoginDropdown(false)}
                      >
                        <UserIcon className="h-4 w-4 mr-3" />
                        {t('nav_login_customer', 'Logga in som kund')}
                      </Link>
                      
                      <Link
                        to="/affiliate-login"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        onClick={() => setShowLoginDropdown(false)}
                      >
                        <div className="h-4 w-4 mr-3 flex items-center justify-center">
                          <span className="text-green-500 text-xs">●</span>
                        </div>
                        {t('nav_login_affiliate', 'Logga in som affiliate')}
                      </Link>
                    </div>
                    
                    {/* Footer with registration links */}
                    <div className="border-t border-gray-100 py-2">
                      <Link
                        to="/register"
                        className="block px-4 py-2 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        onClick={() => setShowLoginDropdown(false)}
                      >
                        {t('nav_register_customer', 'Skapa kundkonto')}
                      </Link>
                      <Link
                        to="/affiliate-registration"
                        className="block px-4 py-2 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        onClick={() => setShowLoginDropdown(false)}
                      >
                        {t('nav_register_affiliate', 'Ansök som affiliate')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Shopping Cart Icon */}
            <Link 
              to={getCountryAwareUrl('cart')} 
              className="p-2 text-gray-700 hover:text-blue-600 transition-colors relative"
              title={t('nav_cart', 'Varukorg')}
            >
              <ShoppingBagIcon className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ShopNavigation; 