import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Elements, useStripe } from '@stripe/react-stripe-js';
import { getStripe } from '../../utils/stripeClient';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getCountryAwareUrl } from '../../utils/productUrls';
import toast from 'react-hot-toast';

const OrderReturnInner = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const stripe = useStripe();
  const { cart, calculateTotals, clearCart } = useCart();
  const { t } = useTranslation();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!stripe) return;

    const clientSecret = searchParams.get('payment_intent_client_secret');
    if (!clientSecret) {
      setStatus('error');
      setErrorMessage(t('order_return_no_payment_info', 'Ingen betalningsinformation hittades'));
      return;
    }

    const handlePaymentReturn = async () => {
      try {
        console.log('🔄 Retrieving payment intent after return...');
        
        // Retrieve the payment intent
        const { error, paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

        if (error) {
          console.error('❌ Error retrieving payment intent:', error);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        console.log('💳 Payment Intent status after return:', paymentIntent.status);

        if (paymentIntent.status === 'succeeded') {
          // Payment was successful, create the order
          console.log('✅ Klarna payment succeeded, creating order...');
          
          const orderId = await createOrderFromPayment(paymentIntent);
          console.log('✅ Order created with ID:', orderId);
          
          // Clear cart and redirect to confirmation
          clearCart();
          setStatus('success');
          
          // Redirect to order confirmation
          setTimeout(() => {
            navigate(getCountryAwareUrl(`order-confirmation/${orderId}`));
          }, 2000);
          
        } else if (paymentIntent.status === 'processing') {
          console.log('⏳ Payment still processing...');
          setStatus('processing');
          
          // Check again after a delay
          setTimeout(() => {
            window.location.reload();
          }, 3000);
          
        } else if (paymentIntent.status === 'canceled') {
          console.log('❌ Payment was canceled');
          setStatus('error');
          setErrorMessage(t('order_return_payment_cancelled', 'Betalning avbröts'));
          
        } else {
          console.log('❌ Payment failed with status:', paymentIntent.status);
          setStatus('error');
          setErrorMessage(t('order_return_payment_failed', 'Betalning misslyckades'));
        }

      } catch (error) {
        console.error('❌ Error handling payment return:', error);
        setStatus('error');
        setErrorMessage(t('order_return_unexpected_error', 'Ett oväntat fel uppstod'));
      }
    };

    handlePaymentReturn();
  }, [stripe, searchParams]);

  const createOrderFromPayment = async (paymentIntent) => {
    // IDEMPOTENCY CHECK: Prevent duplicate orders
    console.log('🔍 Checking for existing order with payment intent:', paymentIntent.id);
    
    try {
      const existingOrderQuery = query(
        collection(db, 'orders'),
        where('payment.paymentIntentId', '==', paymentIntent.id)
      );
      const existingOrders = await getDocs(existingOrderQuery);
      
      if (!existingOrders.empty) {
        const existingOrder = existingOrders.docs[0];
        console.log('✅ Order already exists for this payment intent:', existingOrder.id);
        console.log('🔄 Returning existing order ID instead of creating duplicate');
        return existingOrder.id;
      }
    } catch (error) {
      console.error('❌ Error checking for existing order:', error);
      // Continue with order creation if check fails
    }

    const freshTotals = calculateTotals();
    const orderNumber = generateOrderNumber();

    // Get customer info from localStorage with comprehensive validation
    let customerInfo = {};
    let shippingInfo = {};
    
    try {
      customerInfo = JSON.parse(localStorage.getItem('b8s_checkout_customer') || '{}');
      shippingInfo = JSON.parse(localStorage.getItem('b8s_checkout_shipping') || '{}');
    } catch (error) {
      console.error('❌ Failed to parse checkout data from localStorage:', error);
    }

    // CRITICAL VALIDATION: Prevent zero-value orders
    const isValidCustomerInfo = customerInfo.email && customerInfo.email.includes('@');
    const isValidShippingInfo = shippingInfo.firstName && shippingInfo.lastName && shippingInfo.address && shippingInfo.city;
    const isValidCart = cart.items && cart.items.length > 0 && freshTotals.total > 0;

    console.log('🔍 Order validation check:', {
      customerValid: isValidCustomerInfo,
      shippingValid: isValidShippingInfo,
      cartValid: isValidCart,
      cartItemCount: cart.items?.length || 0,
      totalAmount: freshTotals.total,
      customerEmail: customerInfo.email || 'MISSING',
      paymentIntentId: paymentIntent.id
    });

    // PREVENT ZERO-VALUE ORDER CREATION
    if (!isValidCustomerInfo || !isValidShippingInfo || !isValidCart) {
      console.error('❌ CRITICAL: Invalid order data detected, preventing order creation', {
        customerInfo: { email: customerInfo.email || 'MISSING' },
        shippingInfo: { 
          firstName: shippingInfo.firstName || 'MISSING',
          lastName: shippingInfo.lastName || 'MISSING',
          address: shippingInfo.address || 'MISSING'
        },
        cart: { itemCount: cart.items?.length || 0, total: freshTotals.total }
      });

      // Show user-friendly error message
      setStatus('error');
      setErrorMessage(t('order_return_missing_order_info', 'Orderinformation saknas. Ingen betalning har genomförts. Vänligen försök igen från början.'));
      
      // Return early to prevent order creation
      return;
    }

    // Extract cart items
    const cartItems = cart.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      sku: item.sku,
      color: item.color, // CRITICAL: Include color for emails
      size: item.size,   // CRITICAL: Include size for emails
      image: item.image
    }));

    const orderData = {
      orderNumber,
      status: 'confirmed',
      source: 'b2c',
      items: cartItems,
      customerInfo: {
        email: customerInfo.email,
        name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        firstName: shippingInfo.firstName,
        lastName: shippingInfo.lastName,
        marketingOptIn: customerInfo.marketing || false,
        preferredLang: 'sv-SE'
      },
      shippingInfo: {
        address: shippingInfo.address,
        apartment: shippingInfo.apartment || '',
        city: shippingInfo.city,
        postalCode: shippingInfo.postalCode,
        country: shippingInfo.country
      },
      subtotal: freshTotals.subtotal,
      shipping: freshTotals.shipping,
      vat: freshTotals.vat,
      discountAmount: freshTotals.discountAmount || 0,
      total: freshTotals.total,
      payment: {
        method: 'klarna',
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        // Enhanced payment method details from Stripe (only store if defined)
        ...(paymentIntent.payment_method?.type && {
          paymentMethodType: paymentIntent.payment_method.type
        }),
        ...(paymentIntent.payment_method?.klarna && {
          paymentMethodDetails: { type: 'klarna' }
        }),
        ...(paymentIntent.payment_method?.card && {
          paymentMethodDetails: {
            brand: paymentIntent.payment_method.card.brand,
            last4: paymentIntent.payment_method.card.last4,
            ...(paymentIntent.payment_method.card.wallet?.type && {
              wallet: paymentIntent.payment_method.card.wallet.type
            })
          }
        })
      },
      affiliate: freshTotals.discountCode ? {
        code: freshTotals.discountCode,
        discountPercentage: freshTotals.discountPercentage,
        clickId: freshTotals.affiliateClickId
      } : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Add order to database
    const orderRef = await addDoc(collection(db, 'orders'), orderData);
    console.log('✅ Order added to database, V3 trigger will handle email notifications automatically');
    
    // 2. Call the post-order processing function for affiliate processing
    try {
      console.log('Calling post-order processing function for Klarna order...');
      const timestamp = Date.now();
      const functionUrl = `https://api.b8shield.com/processB2COrderCompletionHttpV2?_=${timestamp}`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ orderId: orderRef.id }),
      });

      if (!response.ok) {
        console.error('CRITICAL: Failed to call post-order processing function for Klarna order.', await response.text());
        // Don't show error to user since payment already succeeded - log for admin review
      } else {
        const result = await response.json();
        console.log('Post-order processing completed successfully for Klarna order:', result);
      }
    } catch (error) {
      console.error('CRITICAL: Failed to call post-order processing function for Klarna order.', error);
      // Don't show error to user since payment already succeeded - log for admin review
    }
    
    return orderRef.id;
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `B8S-${timestamp}-${random}`;
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('processing_payment', 'Behandlar betalning...')}
          </h2>
          <p className="text-gray-600">
            {t('payment_processing_message', 'Vänta medan vi bekräftar din betalning.')}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('payment_successful', 'Betalning genomförd!')}
          </h2>
          <p className="text-gray-600">
            {t('redirecting_to_confirmation', 'Omdirigerar till orderbekräftelse...')}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('payment_failed', 'Betalning misslyckades')}
          </h2>
          <p className="text-gray-600 mb-4">
            {errorMessage || t('payment_error_message', 'Ett fel uppstod vid betalning.')}
          </p>
          <button
            onClick={() => navigate(getCountryAwareUrl('checkout'))}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('try_again', 'Försök igen')}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

const OrderReturn = () => {
  return (
    <Elements stripe={getStripe()}>
      <OrderReturnInner />
    </Elements>
  );
};

export default OrderReturn;
