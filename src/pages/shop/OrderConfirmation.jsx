import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircleIcon, ShoppingBagIcon, TruckIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import SeoHreflang from '../../components/shop/SeoHreflang';
import { getCountryAwareUrl } from '../../utils/productUrls';
import { getEnhancedOrderDistribution, getDisplayColor, getDisplaySize } from '../../utils/orderUtils';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get order number from navigation state for immediate display while fetching full order
  const orderNumberFromState = location.state?.orderNumber;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        toast.error(t('order_confirmation_no_id', 'Ingen order ID hittades.'));
        navigate(getCountryAwareUrl(''));
        return;
      }
      try {
        setLoading(true);
        const docRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No such order document!");
          toast.error(t('order_confirmation_not_found', 'Kunde inte hitta din beställning.'));
          navigate(getCountryAwareUrl(''));
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error(t('order_confirmation_fetch_error', 'Ett fel uppstod när din beställning skulle hämtas.'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate, t]);

  const formatPrice = (price) => {
    if (typeof price !== 'number') return 'N/A';
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(price);
  };
  
  const formattedDate = order?.createdAt?.seconds 
    ? format(new Date(order.createdAt.seconds * 1000), 'd MMMM yyyy, HH:mm', { locale: sv }) 
    : t('order_confirmation_processing', 'Bearbetar...');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation breadcrumb={t('breadcrumb_order_confirmation', 'Orderbekräftelse')} />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('order_confirmation_loading', 'Laddar orderbekräftelse...')}</p>
        </div>
        <ShopFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation breadcrumb={t('breadcrumb_order_confirmation', 'Orderbekräftelse')} />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('order_confirmation_not_found_title', 'Order hittades inte')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('order_confirmation_not_found_description', 'Vi kunde inte hitta den begärda ordern.')}
          </p>
          <button
            onClick={() => navigate(getCountryAwareUrl(''))}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('order_confirmation_back_to_shop', 'Tillbaka till butiken')}
          </button>
        </div>
        <ShopFooter />
      </div>
    );
  }

  return (
    <>
      <SeoHreflang />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <ShopNavigation breadcrumb={t('breadcrumb_order_confirmation', 'Orderbekräftelse')} />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('order_confirmation_thank_you', 'Tack för din beställning!')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('order_confirmation_received', 'Din beställning har tagits emot och kommer att behandlas inom kort.')}
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg inline-block">
              <p className="text-sm text-blue-800">
                <strong>{t('order_confirmation_order_number', 'Ordernummer:')} </strong> 
                {order.orderNumber || orderNumberFromState}
              </p>
              <p className="text-sm text-blue-600">
                {t('order_confirmation_ordered', 'Beställd:')}: {formattedDate}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Customer Information */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('order_confirmation_customer_info', 'Kunduppgifter')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {t('order_confirmation_contact_info', 'Kontaktinformation')}
                    </h3>
                    <p className="text-gray-600">{order.customerInfo?.email}</p>
                    {order.customerInfo?.marketingOptIn && (
                      <p className="text-sm text-green-600 mt-1">
                        {t('order_confirmation_newsletter_subscription', '✓ Prenumererar på nyhetsbrev')}
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {t('order_confirmation_shipping_address', 'Leveransadress')}
                    </h3>
                    <div className="text-gray-600">
                      <p>{order.shippingAddress?.firstName} {order.shippingAddress?.lastName}</p>
                      <p>{order.shippingAddress?.address}</p>
                      {order.shippingAddress?.apartment && <p>{order.shippingAddress.apartment}</p>}
                      <p>{order.shippingAddress?.postalCode} {order.shippingAddress?.city}</p>
                      <p>{order.shippingAddress?.country}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('order_confirmation_order_contents', 'Orderinnehåll')}
                </h2>
                <div className="space-y-4">
                  {getEnhancedOrderDistribution(order).map((item, index) => {
                    const itemName = getContentValue(item.name);
                    return (
                      <div key={index} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={itemName} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <ShoppingBagIcon className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{itemName}</h3>
                          <p className="text-sm text-gray-500">
                            {t('order_confirmation_quantity', 'Antal: {{quantity}}', { quantity: item.quantity })}
                          </p>
                          {/* Show color and size separately */}
                          <div className="text-sm text-gray-500 space-x-2">
                            {item.color && (
                              <span className="inline-block bg-gray-100 px-2 py-1 rounded-full text-xs">
                                {t('order_confirmation_color', 'Färg: {{color}}', { color: getDisplayColor(item.color) })}
                              </span>
                            )}
                            {item.size && (
                              <span className="inline-block bg-gray-100 px-2 py-1 rounded-full text-xs">
                                {t('order_confirmation_size', 'Storlek: {{size}}', { size: getDisplaySize(item.size) })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="font-medium text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Affiliate Information (if applicable) */}
              {(() => {
                const affiliateCode = order.affiliateCode || order.affiliate?.code;
                const discountPercentage = order.discountPercentage || order.affiliate?.discountPercentage || order.affiliateDiscount?.percentage;
                const discountAmount = order.discountAmount || order.affiliate?.amount || order.affiliateDiscount?.amount;
                
                return affiliateCode && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-green-800 mb-4">
                      {t('order_confirmation_affiliate_applied', '🎉 Affiliate-rabatt tillämpad')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-green-700 font-medium">
                          {t('order_confirmation_affiliate_code', 'Affiliate-kod')}
                        </p>
                        <p className="text-green-900 font-semibold">{affiliateCode}</p>
                      </div>
                      {(discountPercentage || discountAmount) && (
                        <div>
                          <p className="text-sm text-green-700 font-medium">
                            {t('order_confirmation_discount', 'Rabatt')}
                          </p>
                          <p className="text-green-900 font-semibold">
                            {discountPercentage}% ({formatPrice(discountAmount)})
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        <strong>{t('order_confirmation_tracking_status', 'Spårningsstatus:')}</strong> {' '}
                        {t('order_confirmation_affiliate_tracking_description', 'Denna beställning har registrerats för affiliate-provision. Affiliate-partnern kommer att få kredit för denna försäljning.')}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Next Steps */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('order_confirmation_next_steps', 'Nästa steg')}
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <EnvelopeIcon className="h-6 w-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {t('order_confirmation_email_confirmation', 'Orderbekräftelse via e-post')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('order_confirmation_email_sent', 'En bekräftelse har skickats till {{email}}', { 
                          email: order.customerInfo?.email 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TruckIcon className="h-6 w-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {t('order_confirmation_shipping_updates', 'Leveransuppdateringar')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('order_confirmation_shipping_updates_description', 'Du kommer att få uppdateringar när din beställning skickas')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  {t('order_confirmation_order_summary', 'Ordersammanfattning')}
                </h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('order_confirmation_subtotal', 'Delsumma')}</span>
                    <span className="font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('order_confirmation_shipping', 'Frakt')}</span>
                    <span className="font-medium">{formatPrice(order.shipping)}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="font-medium">
                        {(() => {
                          // Handle different affiliate data structures
                          const affiliateCode = order.affiliateCode || order.affiliate?.code || 'AFFILIATE';
                          const discountPercentage = order.discountPercentage || order.affiliate?.discountPercentage || order.affiliateDiscount?.percentage || 0;
                          
                          return t('order_confirmation_discount_with_code', 'Rabatt ({{affiliateCode}}) {{discountPercentage}}%', { 
                            affiliateCode, 
                            discountPercentage 
                          });
                        })()}
                      </span>
                      <span className="font-medium">- {formatPrice(order.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('order_confirmation_vat', 'Moms (25%)')}</span>
                    <span className="font-medium">{formatPrice(order.vat)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gray-900 pt-3 border-t border-gray-300">
                    <span>{t('order_confirmation_total', 'Totalt')}</span>
                    <span>SEK {formatPrice(order.total)}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      {t('order_confirmation_payment_status', 'Betalningsstatus')}
                    </p>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      {t('order_confirmation_payment_pending', 'Väntar på betalning (Test)')}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => navigate(getCountryAwareUrl(''))}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t('order_confirmation_continue_shopping', 'Fortsätt handla')}
                  </button>
                  <button
                    onClick={() => navigate(getCountryAwareUrl('account'))}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    {t('order_confirmation_view_orders', 'Visa mina beställningar')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ShopFooter />
    </>
  );
};

export default OrderConfirmation; 