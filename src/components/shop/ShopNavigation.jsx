import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import ShopLanguageSwitcher from './ShopLanguageSwitcher';
import CountrySwitcher from './CountrySwitcher';
import { useTranslation } from '../../contexts/TranslationContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

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
    navigate('/');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            B8Shield™
          </Link>
          
          {/* Breadcrumb */}
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-blue-600 transition-colors">Hem</Link>
            {breadcrumb && (
              <>
                <span>/</span>
                <span className="text-gray-900">{breadcrumb}</span>
              </>
            )}
          </div>
          
          <Link to="/cart" className="text-gray-700 hover:text-blue-600 transition-colors font-medium relative">
            Varukorg
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
          <div className="flex items-center ml-4 space-x-4">
            <CountrySwitcher />
            <ShopLanguageSwitcher />
            {affiliateData && (affiliateData.affiliateCode || affiliateData.name) && (
              <div className="flex items-center px-2 py-1 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs font-medium">
                <span>
                  {affiliateData.name
                    ? t('affiliate_logged_in_as_name', 'Inloggad som affiliate ({{name}})', { name: affiliateData.name })
                    : t('affiliate_logged_in_as_email', 'Inloggad som affiliate ({{email}})', { email: currentUser?.email || affiliateData.affiliateCode })}
                </span>
                <button
                  className="ml-2 p-1 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onClick={handleAffiliateLogout}
                  aria-label={t('affiliate_logout', 'Logga ut')}
                  title={t('affiliate_logout', 'Logga ut')}
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