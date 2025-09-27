/**
 * Stripe Payment Form Component
 * Integrates Stripe Elements with B8Shield checkout flow
 */

import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, STRIPE_CONFIG } from '../../utils/stripeClient';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { getCountryAwareUrl } from '../../utils/productUrls';
import toast from 'react-hot-toast';

const PaymentForm = ({ customerInfo, shippingInfo, onPaymentSuccess, onPaymentError, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { cart, calculateTotals, clearCart } = useCart();
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      console.error('❌ Stripe not loaded');
      toast.error(t('stripe_payment_system_not_ready', 'Betalningssystem inte redo. Vänta och försök igen.'));
      return;
    }

    if (!isElementReady) {
      console.error('❌ Payment Element not ready');
      toast.error(t('stripe_payment_form_not_ready', 'Betalningsformulär inte redo. Vänta och försök igen.'));
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Get cart totals
      const totals = calculateTotals();
      
      console.log('💳 Processing payment...', {
        total: totals.total,
        items: cart.items.length,
        customer: customerInfo.email
      });

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${getCountryAwareUrl('order-return')}`,
          receipt_email: customerInfo.email,
        },
        redirect: 'if_required'
      });

      if (error) {
        console.error('❌ Payment failed:', error);
        setPaymentError(error.message);
        onPaymentError?.(error);
        toast.error(`Betalning misslyckades: ${error.message}`);
      } else if (paymentIntent) {
        console.log('💳 Payment Intent status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
          // Payment completed immediately (cards)
          console.log('✅ Payment succeeded immediately!', paymentIntent);
          
          // Clear cart after successful payment
          clearCart();
          
          // Call success callback
          onPaymentSuccess?.(paymentIntent);
          
          toast.success(t('stripe_payment_completed', 'Betalning genomförd!'));
          
        } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_source_action') {
          // Payment requires additional action (Klarna, 3D Secure, etc.)
          console.log('🔄 Payment requires action, redirecting...', paymentIntent.status);
          toast.info(t('stripe_redirecting_to_provider', 'Omdirigerar till betalningsleverantör...'));
          
          // User will be redirected to complete payment, then return to return_url
          // The order creation will happen on the return page
          
        } else if (paymentIntent.status === 'processing') {
          // Payment is being processed (some payment methods)
          console.log('⏳ Payment processing...', paymentIntent);
          toast.info(t('stripe_payment_processing', 'Betalning behandlas...'));
          
        } else {
          // Other statuses
          console.log('❓ Unexpected payment status:', paymentIntent.status);
          toast.warning(t('stripe_unexpected_payment_status', 'Oväntat betalningsstatus. Kontakta support om problemet kvarstår.'));
        }
      }

    } catch (error) {
      console.error('❌ Payment processing error:', error);
      setPaymentError(error.message);
      onPaymentError?.(error);
      toast.error('Ett fel uppstod vid betalning');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render the form if we don't have a valid client secret
  if (!clientSecret || !clientSecret.startsWith('pi_')) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Initierar betalning...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('payment_method', 'Betalningsmetod')}
        </h3>
        
        <PaymentElement 
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                name: customerInfo.name,
                email: customerInfo.email,
              }
            }
          }}
          onReady={() => {
            console.log('✅ Payment Element ready');
            setIsElementReady(true);
          }}
          onFocus={() => {
            console.log('🎯 Payment Element focused');
          }}
          onBlur={() => {
            console.log('👋 Payment Element blurred');
          }}
          onChange={(event) => {
            console.log('🔄 Payment Element changed:', event.complete ? 'Complete' : 'Incomplete');
            if (event.error) {
              console.error('❌ Payment Element error:', event.error);
              setPaymentError(event.error.message);
            } else {
              setPaymentError(null);
            }
          }}
        />
      </div>

      {/* Error Display */}
      {paymentError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {t('payment_error', 'Betalningsfel')}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {paymentError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || !isElementReady || isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          isProcessing || !stripe || !elements || !isElementReady
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('processing_payment', 'Bearbetar betalning...')}
          </div>
        ) : !isElementReady ? (
          t('loading_payment', 'Laddar betalning...')
        ) : (
          `${t('pay_now', 'Betala nu')} - ${calculateTotals().total.toFixed(2)} kr`
        )}
      </button>

      {/* Test Card Info (only in development) */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
          <h4 className="font-semibold text-yellow-800 mb-2">Testkort (endast utveckling):</h4>
          <div className="text-yellow-700 space-y-1">
            <div><strong>Visa:</strong> 4242 4242 4242 4242</div>
            <div><strong>Mastercard:</strong> 5555 5555 5555 4444</div>
            <div><strong>Datum:</strong> Vilket som helst framtida datum</div>
            <div><strong>CVC:</strong> Vilka tre siffror som helst</div>
          </div>
        </div>
      )}
    </form>
  );
};

const StripePaymentForm = ({ customerInfo, shippingInfo, onPaymentSuccess, onPaymentError }) => {
  const { cart, calculateTotals } = useCart();
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const totals = calculateTotals();
        
        console.log('🔄 Creating payment intent...', {
          total: totals.total,
          items: cart.items.length
        });

        // Create payment intent on server via HTTP
        const response = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/createPaymentIntentV2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: totals.total, // Amount in SEK
            currency: 'sek',
            cartItems: cart.items,
            customerInfo,
            shippingInfo: {
              country: cart.shippingCountry,
              cost: totals.shipping,
              // Enhanced shipping info will be passed from checkout context
              ...shippingInfo
            },
            // Enhanced totals breakdown for complete order recovery
            totals: {
              subtotal: totals.subtotal,
              vat: totals.vat,
              shipping: totals.shipping,
              discountAmount: totals.discountAmount,
              total: totals.total
            },
            ...(totals.discountCode && {
              discountInfo: {
                code: totals.discountCode,
                amount: totals.discountAmount,
                percentage: totals.discountPercentage
              }
            }),
            ...(totals.affiliateClickId && {
              affiliateInfo: {
                code: totals.discountCode,
                clickId: totals.affiliateClickId
              }
            })
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Payment intent creation failed:', errorData);
          throw new Error(errorData.details || errorData.error || 'Failed to create payment intent');
        }

        const result = await response.json();
        
        if (result.success) {
          setClientSecret(result.paymentIntent.client_secret);
          console.log('✅ Payment intent created:', result.paymentIntent.id);
        } else {
          console.error('❌ Payment intent result failed:', result);
          throw new Error(result.details || result.error || 'Failed to create payment intent');
        }

      } catch (error) {
        console.error('❌ Error initializing payment:', error);
        setError(error.message);
        toast.error('Kunde inte initiera betalning');
      } finally {
        setIsLoading(false);
      }
    };

    if (cart.items.length > 0 && customerInfo?.email) {
      initializePayment();
    }
  }, [cart.items, customerInfo, shippingInfo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Förbereder betalning...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Kunde inte ladda betalning</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Väntar på betalningsinformation...</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: STRIPE_CONFIG.appearance,
    locale: STRIPE_CONFIG.locale
  };

  return (
    <Elements stripe={getStripe()} options={options}>
      <PaymentForm 
        customerInfo={customerInfo}
        shippingInfo={shippingInfo}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        clientSecret={clientSecret} // Pass clientSecret to form for validation
      />
    </Elements>
  );
};

export default StripePaymentForm;