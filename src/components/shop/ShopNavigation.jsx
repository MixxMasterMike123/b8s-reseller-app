import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';

const ShopNavigation = ({ breadcrumb }) => {
  const { cart } = useCart();
  
  // Calculate total items in cart
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

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
        </div>
      </div>
    </nav>
  );
};

export default ShopNavigation; 