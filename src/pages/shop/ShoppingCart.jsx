import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { SHIPPING_COSTS } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { translateColor } from '../../utils/colorTranslations';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import SeoHreflang from '../../components/shop/SeoHreflang';
import { getCountryAwareUrl, getCartSeoTitle, getCartSeoDescription } from '../../utils/productUrls';
import SmartPrice from '../../components/shop/SmartPrice';
import { Helmet } from 'react-helmet-async';

const ShoppingCart = () => {
  const { cart, updateQuantity, removeFromCart, updateShippingCountry, calculateTotals, applyDiscountCode, removeDiscount, getTotalItems, getShippingTierInfo } = useCart();
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const navigate = useNavigate();
  const [discountCodeInput, setDiscountCodeInput] = useState('');

  console.log('[ShoppingCart] Rendering with cart items:', cart.items);

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
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
  };

  const handleCountryChange = (event) => {
    updateShippingCountry(event.target.value);
  };

  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) return;
    
    try {
      await applyDiscountCode(discountCodeInput.trim());
      toast.success(t('discount_code_applied', 'Rabattkod applicerad!'));
    } catch (error) {
      console.error('Error applying discount code:', error);
      toast.error(t('invalid_discount_code', 'Ogiltig rabattkod'));
    }
  };

  const handleCheckout = () => {
    navigate(getCountryAwareUrl('checkout'));
  };

  return (
    <>
      <Helmet>
        <title>{getCartSeoTitle()}</title>
        <meta name="description" content={getCartSeoDescription()} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={getCartSeoTitle()} />
        <meta property="og:description" content={getCartSeoDescription()} />
        <meta property="og:image" content="https://shop.b8shield.com/images/B8S_full_logo.svg" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={getCartSeoTitle()} />
        <meta name="twitter:description" content={getCartSeoDescription()} />
        <meta name="twitter:image" content="https://shop.b8shield.com/images/B8S_full_logo.svg" />
      </Helmet>
      <SeoHreflang />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={t('cart_breadcrumb', 'Varukorg')} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">{t('your_cart_title', 'Din Varukorg')}</h1>

          {cart.items.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">{t('cart_is_empty_heading', 'Din varukorg är tom')}</h2>
              <p className="text-gray-600 mb-6 sm:mb-8 px-4">{t('cart_empty_description', 'Utforska våra produkter och lägg till något i din varukorg.')}</p>
              <Link
                to={getCountryAwareUrl('')}
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                {t('continue_shopping', 'Fortsätt handla')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item) => {
                  const itemName = getContentValue(item.name);
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200"
                    >
                      {/* Mobile: Stacked layout, Desktop: Horizontal layout */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        {/* Product Image */}
                        <img
                          src={item.image}
                          alt={itemName}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg self-center sm:self-start"
                        />
                        
                        {/* Product Details */}
                        <div className="flex-grow text-center sm:text-left">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{itemName}</h3>
                          
                          {/* Product Specs - Mobile: Compact, Desktop: Detailed */}
                          <div className="space-y-1 text-sm text-gray-600 mb-3">
                            {item.color && (
                              <p className="inline-block bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1">
                                {translateColor(item.color, t)}
                              </p>
                            )}
                            {item.size && (
                              <p className="inline-block bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1">
                                {t('size_label', 'Storlek: {{size}}', { size: item.size })}
                              </p>
                            )}
                            {item.sku && (
                              <p className="text-xs text-gray-500 block sm:hidden">
                                {item.sku}
                              </p>
                            )}
                          </div>
                          
                          {/* Price - Mobile: Large, Desktop: Normal */}
                          <div className="mb-4 sm:mb-2">
                            <SmartPrice 
                              sekPrice={item.price} 
                              variant="compact"
                              showOriginal={false}
                              className="font-bold text-lg sm:text-base text-blue-600"
                            />
                          </div>
                        </div>

                        {/* Quantity and Remove - Mobile: Stacked, Desktop: Horizontal */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                          {/* Quantity Selector - Mobile: Large touch targets */}
                          <div className="flex items-center rounded-xl border-2 border-gray-300 bg-gray-50">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors rounded-l-lg"
                            >
                              <span className="text-xl font-bold">−</span>
                            </button>
                            <span className="w-16 h-12 sm:w-12 sm:h-10 flex items-center justify-center text-lg font-bold bg-white border-x border-gray-300">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors rounded-r-lg"
                            >
                              <span className="text-xl font-bold">+</span>
                            </button>
                          </div>
                          
                          {/* Remove Button - Mobile: Large touch target */}
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="w-12 h-12 sm:w-8 sm:h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <svg 
                              className="w-6 h-6 sm:w-5 sm:h-5" 
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
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                {/* Shipping Country Selection */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('shipping_country', 'Leveransland')}</h3>
                  <select
                    value={cart.shippingCountry}
                    onChange={handleCountryChange}
                    className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
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
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('discount_code', 'Rabattkod')}</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value)}
                      placeholder={t('enter_your_code', 'Ange din kod')}
                      className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      disabled={!!discountCode}
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={!!discountCode}
                      className="px-4 sm:px-6 py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
                    >
                      {t('apply_button', 'Applicera')}
                    </button>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('order_summary', 'Ordersammanfattning')}</h3>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between text-gray-700 text-sm sm:text-base">
                      <span>{t('subtotal', 'Delsumma')}</span>
                      <SmartPrice 
                        sekPrice={subtotal} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </div>

                    {discountAmount > 0 && (
                       <div className="flex justify-between items-center">
                         <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded-full">
                           {t('affiliate_discount_label', 'Affiliate rabatt, {{percentage}}%', { percentage: discountPercentage })}
                         </span>
                         <span className="text-green-600 font-semibold text-sm sm:text-base">
                           - <SmartPrice 
                             sekPrice={discountAmount} 
                             variant="compact"
                             showOriginal={false}
                           />
                         </span>
                       </div>
                    )}

                    <div className="flex justify-between text-gray-700 text-sm sm:text-base">
                      <span>{t('shipping_cost_label', 'Frakt ({{country}})', { country: getCountryName(cart.shippingCountry) })}</span>
                      <SmartPrice 
                        sekPrice={shipping} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </div>
                    
                    {/* Shipping tier explanation */}
                    {getTotalItems() > 3 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const tierInfo = getShippingTierInfo(cart.shippingCountry);
                          return tierInfo.explanation;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 my-3 sm:my-4"></div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-gray-900 text-lg sm:text-xl">
                      <span>{t('total', 'Totalt')}</span>
                      <SmartPrice 
                        sekPrice={total} 
                        variant="large"
                        showOriginal={false}
                        className="font-bold text-lg sm:text-xl"
                      />
                    </div>
                    <div className="flex justify-end text-xs sm:text-sm text-gray-500">
                      <span>
                        {t('vat_included', 'Varav Moms (25%) {{amount}}', {
                          amount: vat // We'll handle VAT conversion in the translation
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 sm:px-8 py-4 rounded-xl text-base sm:text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
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