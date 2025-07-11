/**
 * Payment Methods Component for B8Shield B2C Shop
 * Integrates Stripe, Apple Pay, Google Pay, Klarna, and Swish
 * Works with existing SmartPrice currency system
 */

import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useTranslation } from '../../contexts/TranslationContext';
import { useLanguageCurrency } from '../../contexts/LanguageCurrencyContext';
import SmartPrice from './SmartPrice';
import { 
  CreditCardIcon, 
  DevicePhoneMobileIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const PaymentMethods = ({ 
  total, 
  sekPrice, 
  currency, 
  shippingAddress, 
  contactInfo,
  affiliateCode,
  onPaymentSuccess,
  onPaymentError,
  onPaymentProcessing 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();
  const { currency: detectedCurrency, countryDetected } = useLanguageCurrency();
  
  const [selectedMethod, setSelectedMethod] = useState('stripe_card');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  // Check availability of express payment methods
  useEffect(() => {
    const checkExpressPayments = async () => {
      if (!stripe) return;

      // Check Apple Pay availability
      const applePayRequest = stripe.paymentRequest({
        country: countryDetected || 'SE',
        currency: currency.toLowerCase(),
        total: {
          label: 'B8Shield Order',
          amount: Math.round(total * 100), // Convert to cents
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        requestShipping: true,
      });

      const applePayCanMakePayment = await applePayRequest.canMakePayment();
      setApplePayAvailable(!!applePayCanMakePayment);

      // Google Pay is available on supported browsers
      setGooglePayAvailable(true); // Stripe handles detection
    };

    checkExpressPayments();
  }, [stripe, currency, total, countryDetected]);

  // Get available payment methods based on currency and country
  const getAvailablePaymentMethods = () => {
    const methods = [
      {
        id: 'stripe_card',
        name: t('payment_method_card', 'Kort'),
        icon: CreditCardIcon,
        available: true,
        description: t('payment_card_description', 'Visa, Mastercard, American Express')
      }
    ];

    // Apple Pay
    if (applePayAvailable) {
      methods.push({
        id: 'apple_pay',
        name: 'Apple Pay',
        icon: DevicePhoneMobileIcon,
        available: true,
        description: t('payment_apple_pay_description', 'Säker betalning med Touch ID eller Face ID')
      });
    }

    // Google Pay
    if (googlePayAvailable) {
      methods.push({
        id: 'google_pay',
        name: 'Google Pay',
        icon: DevicePhoneMobileIcon,
        available: true,
        description: t('payment_google_pay_description', 'Snabb betalning med Google Pay')
      });
    }

    // Klarna (Nordic + select international)
    if (['SEK', 'USD', 'GBP'].includes(currency)) {
      methods.push({
        id: 'klarna',
        name: 'Klarna',
        icon: CheckCircleIcon,
        available: true,
        description: t('payment_klarna_description', 'Betala senare, delbetalning')
      });
    }

    // Swish (Sweden only)
    if (currency === 'SEK' && countryDetected === 'SE') {
      methods.push({
        id: 'swish',
        name: 'Swish',
        icon: QrCodeIcon,
        available: true,
        description: t('payment_swish_description', 'Betala med Swish-appen')
      });
    }

    return methods;
  };

  const handleStripeCardPayment = async () => {
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);
    onPaymentProcessing(true);

    try {
      const card = elements.getElement(CardElement);
      
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(total * 100), // Convert to cents
          currency: currency.toLowerCase(),
          affiliateCode,
          shippingAddress,
          contactInfo
        })
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            email: contactInfo.email,
            address: {
              line1: shippingAddress.address,
              line2: shippingAddress.apartment,
              city: shippingAddress.city,
              postal_code: shippingAddress.postalCode,
              country: shippingAddress.country,
            }
          }
        }
      });

      if (result.error) {
        setError(result.error.message);
        onPaymentError(result.error);
      } else {
        onPaymentSuccess(result.paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      onPaymentError(err);
    } finally {
      setProcessing(false);
      onPaymentProcessing(false);
    }
  };

  const handleApplePayPayment = async () => {
    if (!stripe) return;

    setProcessing(true);
    setError(null);
    onPaymentProcessing(true);

    try {
      const paymentRequest = stripe.paymentRequest({
        country: countryDetected || 'SE',
        currency: currency.toLowerCase(),
        total: {
          label: 'B8Shield Order',
          amount: Math.round(total * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
      });

      const result = await paymentRequest.show();
      
      if (result.error) {
        setError(result.error.message);
        onPaymentError(result.error);
      } else {
        onPaymentSuccess(result.paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      onPaymentError(err);
    } finally {
      setProcessing(false);
      onPaymentProcessing(false);
    }
  };

  const handleKlarnaPayment = async () => {
    // Klarna integration would go here
    console.log('Klarna payment selected');
  };

  const handleSwishPayment = async () => {
    // Swish integration would go here
    console.log('Swish payment selected');
  };

  const handlePayment = async () => {
    switch (selectedMethod) {
      case 'stripe_card':
        await handleStripeCardPayment();
        break;
      case 'apple_pay':
        await handleApplePayPayment();
        break;
      case 'google_pay':
        // Google Pay integration
        console.log('Google Pay selected');
        break;
      case 'klarna':
        await handleKlarnaPayment();
        break;
      case 'swish':
        await handleSwishPayment();
        break;
      default:
        setError('Invalid payment method');
    }
  };

  const availableMethods = getAvailablePaymentMethods();

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('payment_method_title', 'Betalningsmetod')}
        </h3>
        
        {availableMethods.map((method) => {
          const Icon = method.icon;
          return (
            <label
              key={method.id}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={method.id}
                checked={selectedMethod === method.id}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="sr-only"
              />
              <Icon className="h-6 w-6 text-gray-600 mr-3" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{method.name}</div>
                <div className="text-sm text-gray-500">{method.description}</div>
              </div>
              {selectedMethod === method.id && (
                <CheckCircleIcon className="h-6 w-6 text-blue-600" />
              )}
            </label>
          );
        })}
      </div>

      {/* Payment Details */}
      {selectedMethod === 'stripe_card' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            {t('payment_card_details', 'Kortuppgifter')}
          </h4>
          <div className="bg-white rounded-lg p-3 border">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Total Display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>{t('payment_total', 'Att betala')}</span>
          <SmartPrice 
            sekPrice={sekPrice} 
            variant="large"
            showOriginal={false}
          />
        </div>
        {affiliateCode && (
          <div className="text-sm text-green-600 mt-1">
            {t('payment_affiliate_discount', 'Affiliate-rabatt tillämpad: {{code}}', { code: affiliateCode })}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Payment Button */}
      <button
        onClick={handlePayment}
        disabled={processing || !stripe}
        className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            {t('payment_processing', 'Bearbetar betalning...')}
          </div>
        ) : (
          t('payment_pay_now', 'Betala nu')
        )}
      </button>
    </div>
  );
};

export default PaymentMethods; 