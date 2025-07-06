import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { SHIPPING_COSTS } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import SeoHreflang from '../../components/shop/SeoHreflang';
import { getCountryAwareUrl } from '../../utils/productUrls';

const ShoppingCart = () => {
  const { cart, updateQuantity, removeFromCart, updateShippingCountry, calculateTotals, applyDiscountCode, removeDiscount } = useCart();
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const navigate = useNavigate();
  const [discountCodeInput, setDiscountCodeInput] = useState('');

  const { subtotal, vat, shipping, total, discountAmount, discountCode, discountPercentage } = calculateTotals();
  
  // Pre-fill discount input if a code is applied to the cart from context
  useEffect(() => {
    if (discountCode) {
      setDiscountCodeInput(discountCode);
    } else {
      setDiscountCodeInput('');
    }
  }, [discountCode]);
  
  const getCountryName = (countryCode) => {
    switch(countryCode) {
        case 'SE': return t('country_sweden', 'Sverige');
        case 'NO': return t('country_norway', 'Norge');
        case 'DK': return t('country_denmark', 'Danmark');
        case 'FI': return t('country_finland', 'Finland');
        case 'IS': return t('country_iceland', 'Island');
        default: return t('country_other', 'Övriga länder');
    }
  }
  
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
      toast.success(t('product_removed_from_cart', 'Produkt borttagen från varukorgen'));
    } else {
      updateQuantity(productId, size, newQuantity);
    }
  };

  const handleRemove = (productId, size) => {
    removeFromCart(productId, size);
    toast.success(t('product_removed_from_cart', 'Produkt borttagen från varukorgen'));
  };

  const handleCountryChange = (event) => {
    updateShippingCountry(event.target.value);
  };

  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) {
      toast.error(t('please_enter_discount_code', 'Vänligen ange en rabattkod.'));
      return;
    }
    const result = await applyDiscountCode(discountCodeInput);
    if (result.success) {
      toast.success(result.message);
      setDiscountCodeInput('');
    } else {
      toast.error(result.message);
    }
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error(t('cart_is_empty', 'Din varukorg är tom'));
      return;
    }
    navigate(getCountryAwareUrl('checkout'));
  };

  return (
    <>
      <SeoHreflang />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={t('cart_breadcrumb', 'Varukorg')} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('your_cart_title', 'Din Varukorg')}</h1>

          {cart.items.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('cart_is_empty_heading', 'Din varukorg är tom')}</h2>
              <p className="text-gray-600 mb-8">{t('cart_empty_description', 'Utforska våra produkter och lägg till något i din varukorg.')}</p>
              <Link
                to={getCountryAwareUrl('')}
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {t('continue_shopping', 'Fortsätt handla')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item) => {
                  const itemName = getContentValue(item.name);
                  return (
                    <div
                      key={`${item.id}-${item.size}`}
                      className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 flex items-center gap-6"
                    >
                      <img
                        src={item.image}
                        alt={itemName}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      
                      <div className="flex-grow">
                        <h3 className="text-lg font-semibold text-gray-900">{itemName}</h3>
                        <div className="mt-1 space-y-1 text-sm text-gray-600">
                          {item.color && (
                            <p>
                              {t('color_label', 'Färg: {{color}}', { color: item.color })}
                            </p>
                          )}
                          {item.size && (
                            <p>
                              {t('size_label', 'Storlek: {{size}}', { size: item.size })}
                            </p>
                          )}
                          {item.sku && (
                            <p>
                              {t('sku_label', 'Art.nr: {{sku}}', { sku: item.sku })}
                            </p>
                          )}
                        </div>
                        <p className="mt-2 font-semibold text-blue-600">{formatPrice(item.price)}</p>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex items-center rounded-lg border border-gray-300">
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
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1 space-y-6">
                {/* Shipping Country Selection */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('shipping_country', 'Leveransland')}</h3>
                  <select
                    value={cart.shippingCountry}
                    onChange={handleCountryChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <optgroup label={t('nordic_countries', 'Norden')}>
                      {SHIPPING_COSTS.NORDIC.countries.map(country => (
                        <option key={country} value={country}>
                          {getCountryName(country)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('other_countries_group', 'Övriga')}>
                      <option value="OTHER">{t('country_other', 'Övriga länder')}</option>
                    </optgroup>
                  </select>
                </div>

                {/* Discount Code Section */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('discount_code', 'Rabattkod')}</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value)}
                      placeholder={t('enter_your_code', 'Ange din kod')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!!discountCode}
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={!!discountCode}
                      className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {t('apply_button', 'Applicera')}
                    </button>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('order_summary', 'Ordersammanfattning')}</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-700">
                      <span>{t('subtotal', 'Delsumma')}</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                       <div className="flex justify-between items-center">
                         <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full">
                           {t('affiliate_discount_label', 'Affiliate rabatt, {{percentage}}%', { percentage: discountPercentage })}
                         </span>
                         <span className="text-green-600 font-semibold">- {formatPrice(discountAmount)}</span>
                       </div>
                    )}

                    <div className="flex justify-between text-gray-700">
                      <span>{t('shipping_cost_label', 'Frakt ({{country}})', { country: getCountryName(cart.shippingCountry) })}</span>
                      <span>{formatPrice(shipping)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 my-4"></div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-gray-900 text-xl">
                      <span>{t('total', 'Totalt')}</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-end text-sm text-gray-500">
                      <span>
                        {t('vat_included', 'Varav Moms (25%) {{amount}}', {
                          amount: new Intl.NumberFormat('sv-SE', {
                            style: 'currency',
                            currency: 'SEK',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(vat)
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {t('go_to_checkout', 'Gå till kassan')}
                </button>

                {/* Continue Shopping Link */}
                <Link
                  to={getCountryAwareUrl('')}
                  className="block text-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {t('or_continue_shopping', 'eller fortsätt handla')}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <ShopFooter />
      </div>
    </>
  );
};

export default ShoppingCart; 