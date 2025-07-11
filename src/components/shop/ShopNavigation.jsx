import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import LanguageCurrencySelector from './LanguageCurrencySelector';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
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
        const q = query(affiliatesRef, where('email', '==', currentUser.email), where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
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
          
          <Link to={getCountryAwareUrl('cart')} className="text-gray-700 hover:text-blue-600 transition-colors font-medium relative">
            {t('nav_cart', 'Varukorg')}
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
          <div className="flex items-center ml-4 space-x-4">
            {/* Upgraded to intelligent Language + Currency selector */}
            <LanguageCurrencySelector size="small" />
            {affiliateData && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{affiliateData.name}</span>
                <button
                  onClick={handleAffiliateLogout}
                  className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                  title={t('nav_logout', 'Logga ut')}
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default ShopNavigation; 