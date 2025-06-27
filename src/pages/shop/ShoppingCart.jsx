import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { SHIPPING_COSTS } from '../../contexts/CartContext';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';

const ShoppingCart = () => {
  const { cart, updateQuantity, removeFromCart, updateShippingCountry, calculateTotals } = useCart();
  const navigate = useNavigate();

  const { subtotal, vat, shipping, total } = calculateTotals();
  
  // Calculate total items in cart
  const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleQuantityChange = (productId, size, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId, size);
      toast.success('Produkt borttagen från varukorgen');
    } else {
      updateQuantity(productId, size, newQuantity);
    }
  };

  const handleRemove = (productId, size) => {
    removeFromCart(productId, size);
    toast.success('Produkt borttagen från varukorgen');
  };

  const handleCountryChange = (event) => {
    updateShippingCountry(event.target.value);
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error('Din varukorg är tom');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation breadcrumb="Varukorg" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Din Varukorg</h1>

        {cart.items.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Din varukorg är tom</h2>
            <p className="text-gray-600 mb-8">Utforska våra produkter och lägg till något i din varukorg.</p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Fortsätt handla
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={`${item.id}-${item.size}`}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 flex items-center gap-6"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    {item.size && (
                      <p className="text-gray-600">Storlek: {item.size}</p>
                    )}
                    <p className="text-blue-600 font-semibold">{formatPrice(item.price)}</p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.size, item.quantity - 1)}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        −
                      </button>
                      <span className="px-4 py-2 text-lg font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.size, item.quantity + 1)}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleRemove(item.id, item.size)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <svg 
                        className="w-6 h-6" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M6 18L18 6M6 6l12 12" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1 space-y-6">
              {/* Shipping Country Selection */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Leveransland</h3>
                <select
                  value={cart.shippingCountry}
                  onChange={handleCountryChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <optgroup label="Norden">
                    {SHIPPING_COSTS.NORDIC.countries.map(country => (
                      <option key={country} value={country}>
                        {country === 'SE' ? 'Sverige' :
                         country === 'NO' ? 'Norge' :
                         country === 'DK' ? 'Danmark' :
                         country === 'FI' ? 'Finland' :
                         'Island'}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Övriga">
                    <option value="OTHER">Övriga länder</option>
                  </optgroup>
                </select>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ordersammanfattning</h3>
                
                <div className="space-y-3 text-gray-600">
                  <div className="flex justify-between">
                    <span>Delsumma</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moms (25%)</span>
                    <span>{formatPrice(vat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frakt</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold text-gray-900">
                    <span>Totalt</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Gå till kassan
              </button>

              <Link
                to="/"
                className="block text-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                eller fortsätt handla
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart; 