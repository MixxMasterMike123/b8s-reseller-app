import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useCart } from '../../contexts/CartContext';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { getCountryAwareUrl, getCheckoutSeoTitle, getCheckoutSeoDescription } from '../../utils/productUrls';
import { translateColor } from '../../utils/colorTranslations';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import SeoHreflang from '../../components/shop/SeoHreflang';
import SmartPrice from '../../components/shop/SmartPrice';
import { Helmet } from 'react-helmet-async';
import { 
  ChevronLeftIcon, 
  LockClosedIcon, 
  ShoppingBagIcon 
} from '@heroicons/react/24/outline';
import StripePaymentForm from '../../components/shop/StripePaymentForm';

const Checkout = () => {
  const { cart, calculateTotals, clearCart } = useCart();
  const { currentUser, login } = useSimpleAuth();
  const { t, currentLanguage } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [step, setStep] = useState('contact'); // 'contact', 'shipping', 'payment'
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({
    email: '',
    password: ''
  });
  const [loginLoading, setLoginLoading] = useState(false);

  // Form data
  const [contactInfo, setContactInfo] = useState({
    email: currentUser?.email || '',
    marketing: false,
    password: ''  // Add password field to state
  });

  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    postalCode: '',
    city: '',
    country: 'SE'
  });

  const [paymentMethod, setPaymentMethod] = useState('mock');

  const { subtotal, vat, shipping, total, discountAmount, discountCode, discountPercentage, appliedAffiliate } = calculateTotals();

  // Debug: Show current affiliate status
  const [showDebug, setShowDebug] = useState(false);
  const debugAffiliateStatus = () => {
    const affiliateRef = localStorage.getItem('b8s_affiliate_ref');
    const cartData = localStorage.getItem('b8shield_cart');
    
    return {
      localStorage: affiliateRef ? JSON.parse(affiliateRef) : null,
      cartDiscount: discountCode,
      cartData: cartData ? JSON.parse(cartData) : null
    };
  };

  useEffect(() => {
    // Load customer profile data if user is logged in
    if (currentUser?.uid) {
      loadCustomerProfile();
    }
  }, [currentUser]);

  const loadCustomerProfile = async () => {
    try {
      setLoadingProfile(true);
      const customersRef = collection(db, 'b2cCustomers');
      const customerQuery = query(customersRef, where('firebaseAuthUid', '==', currentUser.uid));
      const customerSnapshot = await getDocs(customerQuery);
      
      if (!customerSnapshot.empty) {
        const customerDoc = customerSnapshot.docs[0];
        const customerData = customerDoc.data();
        
        // Pre-fill contact information
        setContactInfo(prev => ({
          ...prev,
          email: customerData.email || currentUser.email || '',
          marketing: customerData.marketingConsent || false
        }));
        
        // Pre-fill shipping information
        setShippingInfo(prev => ({
          ...prev,
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          address: customerData.address || '',
          apartment: customerData.apartment || '',
          postalCode: customerData.postalCode || '',
          city: customerData.city || '',
          country: customerData.country || 'SE'
        }));
        
        console.log('Customer profile loaded and form pre-filled:', customerData);
        toast.success(t('checkout_profile_loaded', 'Dina uppgifter har fyllts i automatiskt'));
      } else {
        // If no customer profile exists, just pre-fill email
        setContactInfo(prev => ({ ...prev, email: currentUser.email || '' }));
      }
    } catch (error) {
      console.error('Error loading customer profile:', error);
      // Fallback to just pre-filling email
      setContactInfo(prev => ({ ...prev, email: currentUser.email || '' }));
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCheckoutLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      await login(loginCredentials.email, loginCredentials.password);
      toast.success(t('checkout_login_success', 'Inloggning lyckades! Dina uppgifter fylls i automatiskt.'));
      setShowLoginModal(false);
      
      // Clear login form
      setLoginCredentials({
        email: '',
        password: ''
      });
      
      // Customer profile will be loaded automatically by the useEffect watching currentUser
    } catch (error) {
      console.error('Checkout login error:', error);
      toast.error(t('checkout_login_error', 'Inloggningsfel. Kontrollera dina uppgifter och försök igen.'));
    } finally {
      setLoginLoading(false);
    }
  };

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 'contact':
        if (!contactInfo.email || !contactInfo.email.includes('@')) {
          toast.error(t('checkout_invalid_email', 'Vänligen ange en giltig e-postadress.'));
          return false;
        }
        return true;
      case 'shipping':
        const required = ['firstName', 'lastName', 'address', 'postalCode', 'city'];
        const missing = required.filter(field => !shippingInfo[field].trim());
        if (missing.length > 0) {
          toast.error(t('checkout_missing_fields', 'Vänligen fyll i alla obligatoriska fält.'));
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!validateStep(step)) return;
    
    if (step === 'contact') setStep('shipping');
    else if (step === 'shipping') setStep('payment');
  };

  const handlePreviousStep = () => {
    if (step === 'shipping') setStep('contact');
    else if (step === 'payment') setStep('shipping');
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `B8S-${timestamp}${random}`;
  };

  // Handle successful Stripe payment
  const handlePaymentSuccess = async (paymentIntent) => {
    console.log('✅ Payment successful, creating order...', paymentIntent);
    
    // Set processing state to prevent empty cart page
    setProcessingPayment(true);
    
    try {
      // Create the order with payment information
      const orderId = await createOrderFromPayment(paymentIntent);
      console.log('✅ Order created with ID:', orderId);
      
      // Navigate to order confirmation page with the order ID
      // Clear cart AFTER navigation to prevent empty cart page flash
      navigate(getCountryAwareUrl(`order-confirmation/${orderId}`));
      
      // Clear the cart after navigation
      setTimeout(() => {
        clearCart();
        setProcessingPayment(false);
      }, 100);
      
    } catch (error) {
      console.error('❌ Error creating order after payment:', error);
      toast.error('Betalning genomförd men fel vid orderskapande. Kontakta support.');
      setProcessingPayment(false);
    }
  };

  // Handle payment errors
  const handlePaymentError = (error) => {
    console.error('❌ Payment failed:', error);
    toast.error(`Betalning misslyckades: ${error.message}`);
  };

  // Create order from successful payment
  const createOrderFromPayment = async (paymentIntent) => {
    const freshTotals = calculateTotals();
    const orderNumber = generateOrderNumber();

    // Extract cart items from payment intent metadata
    console.log('🔍 Payment Intent metadata:', paymentIntent.metadata);
    
    // Always use current cart items for order creation (includes images)
    // Metadata only stores minimal data due to Stripe's 500-char limit
    const cartItems = cart.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      sku: item.sku,
      image: item.image
    }));
    
    // Log metadata summary for validation (optional)
    try {
      const { itemCount, totalItems, cartSummary, itemIds } = paymentIntent.metadata;
      console.log('✅ Metadata summary:', { itemCount, totalItems, cartSummary, itemIds });
      console.log('✅ Using full cart items for order:', cartItems);
      
      // Validate item count matches
      if (itemCount && parseInt(itemCount) !== cartItems.length) {
        console.warn('⚠️ Cart item count mismatch between metadata and current cart');
      }
    } catch (error) {
      console.warn('⚠️ Could not validate metadata cart summary (non-critical):', error);
    }
    
    const orderData = {
      orderNumber,
      status: 'confirmed', // Stripe payment confirmed
      source: 'b2c',
      items: cartItems,
      customerInfo: {
        email: contactInfo.email,
        name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        firstName: shippingInfo.firstName,
        lastName: shippingInfo.lastName,
        marketingOptIn: contactInfo.marketing,
        preferredLang: currentLanguage // Store user's language preference for emails
      },
      shippingInfo: {
        address: shippingInfo.address,
        apartment: shippingInfo.apartment || '',
        city: shippingInfo.city,
        postalCode: shippingInfo.postalCode,
        country: shippingInfo.country
      },
      // Flat pricing structure to match OrderConfirmation expectations
      subtotal: freshTotals.subtotal,
      shipping: freshTotals.shipping,
      vat: freshTotals.vat,
      discountAmount: freshTotals.discountAmount || 0,
      total: freshTotals.total,
      payment: {
        method: 'stripe',
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from öre to SEK
        currency: paymentIntent.currency,
        status: paymentIntent.status
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
    console.log('✅ Order created:', orderRef.id);

    // 2. Call the post-order processing function for affiliate processing
    try {
      console.log('Calling post-order processing function for Stripe order...');
      const timestamp = Date.now();
      const functionUrl = `https://us-central1-b8shield-reseller-app.cloudfunctions.net/processB2COrderCompletionHttpV2?_=${timestamp}`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ orderId: orderRef.id }),
      });

      if (!response.ok) {
        console.error('CRITICAL: Failed to call post-order processing function for Stripe order.', await response.text());
        // Don't show error to user since payment already succeeded - log for admin review
      } else {
        const result = await response.json();
        console.log('Post-order processing completed successfully for Stripe order:', result);
      }
    } catch (error) {
      console.error('CRITICAL: Failed to call post-order processing function for Stripe order.', error);
      // Don't show error to user since payment already succeeded - log for admin review
    }

    return orderRef.id;
  };

  const handlePlaceOrder = async () => {
    if (!validateStep('shipping')) return;
    if (cart.items.length === 0) {
      toast.error(t('checkout_empty_cart', 'Din varukorg är tom.'));
      return;
    }

    setLoading(true);
    const toastId = toast.loading(t('checkout_placing_order', 'Lägger din beställning...'));

    try {
      // Re-calculate totals directly before creating the order to ensure data is fresh
      const freshTotals = calculateTotals();
      const orderNumber = generateOrderNumber();

      // Create B2C customer account if password provided
      let b2cCustomerId = null;
      let b2cCustomerAuthId = null;
      
      if (contactInfo.password && contactInfo.password.trim().length > 0) {
        try {
          console.log('Creating B2C customer account for:', contactInfo.email);
          
          // Check if customer already exists in b2cCustomers collection
          const existingCustomerQuery = query(
            collection(db, 'b2cCustomers'),
            where('email', '==', contactInfo.email)
          );
          const existingCustomerSnapshot = await getDocs(existingCustomerQuery);
          
          if (!existingCustomerSnapshot.empty) {
            // Customer already exists - use existing customer
            const existingCustomer = existingCustomerSnapshot.docs[0];
            b2cCustomerId = existingCustomer.id;
            b2cCustomerAuthId = existingCustomer.data().firebaseAuthUid;
            console.log('Using existing B2C customer:', b2cCustomerId);
          } else {
            // Create new Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(
              auth, 
              contactInfo.email, 
              contactInfo.password
            );
            b2cCustomerAuthId = userCredential.user.uid;
            console.log('Created Firebase Auth account:', b2cCustomerAuthId);
            
            // Create B2C customer document
            const customerData = {
              email: contactInfo.email,
              firstName: shippingInfo.firstName,
              lastName: shippingInfo.lastName,
              phone: '', // Not collected in checkout yet
              
              // Address info
              address: shippingInfo.address,
              apartment: shippingInfo.apartment || '',
              city: shippingInfo.city,
              postalCode: shippingInfo.postalCode,
              country: shippingInfo.country,
              
              // Account info
              firebaseAuthUid: b2cCustomerAuthId,
              emailVerified: false,
              marketingConsent: contactInfo.marketing,
              
              // Analytics
              stats: {
                totalOrders: 0,
                totalSpent: 0,
                averageOrderValue: 0,
                lastOrderDate: null,
                firstOrderDate: serverTimestamp()
              },
              
              // Metadata
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastLoginAt: null,
              
              // Integration
              preferredLang: currentLanguage,
              customerSegment: 'new',
              source: 'b2c_checkout'
            };
            
            const customerDocRef = await addDoc(collection(db, 'b2cCustomers'), customerData);
            b2cCustomerId = customerDocRef.id;
            console.log('Created B2C customer document:', b2cCustomerId);
            
            toast.success(t('checkout_account_created', 'Konto skapat! Du kan nu logga in med ditt lösenord.'), { duration: 5000 });
          }
        } catch (customerError) {
          console.error('Error creating B2C customer account:', customerError);
          
          // Handle the case where email already exists in Firebase Auth
          if (customerError.code === 'auth/email-already-in-use') {
            console.log('Email already exists in Firebase Auth, attempting to link to existing account...');
            
            try {
              // Try to find existing B2C customer record by email
              const existingCustomerQuery = query(
                collection(db, 'b2cCustomers'),
                where('email', '==', contactInfo.email)
              );
              const existingCustomerSnapshot = await getDocs(existingCustomerQuery);
              
              if (!existingCustomerSnapshot.empty) {
                // B2C customer record exists - use it and update preferred language
                const existingCustomer = existingCustomerSnapshot.docs[0];
                b2cCustomerId = existingCustomer.id;
                b2cCustomerAuthId = existingCustomer.data().firebaseAuthUid;
                
                // Update preferred language to reflect current language choice
                await updateDoc(doc(db, 'b2cCustomers', b2cCustomerId), {
                  preferredLang: currentLanguage,
                  updatedAt: serverTimestamp()
                });
                
                console.log('Linked to existing B2C customer and updated preferred language:', b2cCustomerId, currentLanguage);
                toast.success(t('checkout_existing_account', 'Länkad till ditt befintliga konto.'), { duration: 5000 });
              } else {
                // Email exists in Firebase Auth but no B2C customer record - this shouldn't happen but handle it
                console.log('Email exists in Firebase Auth but no B2C customer record found');
                toast.error(t('checkout_account_conflict', 'E-postadressen är redan registrerad. Vänligen kontakta support.'), { duration: 5000 });
              }
            } catch (linkError) {
              console.error('Error linking to existing account:', linkError);
              toast.error(t('checkout_account_error', 'Kunde inte skapa konto, men din beställning behandlas.'), { duration: 5000 });
            }
          } else {
            // Other errors (not email-already-in-use)
            toast.error(t('checkout_account_error', 'Kunde inte skapa konto, men din beställning behandlas.'), { duration: 5000 });
          }
        }
        }

      const orderData = {
        orderNumber,
        source: 'b2c',
        
        // Customer info from state
        customerInfo: {
          email: contactInfo.email,
          firstName: shippingInfo.firstName,
          lastName: shippingInfo.lastName,
          marketingOptIn: contactInfo.marketing,
          preferredLang: currentLanguage, // Store user's language preference
        },
        
        // Shipping address from state
        shippingAddress: {
          firstName: shippingInfo.firstName,
          lastName: shippingInfo.lastName,
          address: shippingInfo.address,
          apartment: shippingInfo.apartment,
          postalCode: shippingInfo.postalCode,
          city: shippingInfo.city,
          country: shippingInfo.country,
        },
        
        // Order details from fresh calculation
        items: cart.items,
        subtotal: freshTotals.subtotal,
        vat: freshTotals.vat,
        shipping: freshTotals.shipping,
        discountAmount: freshTotals.discountAmount,
        discountPercentage: freshTotals.discountPercentage,
        total: freshTotals.total,
        
        // Payment info (mock for now)
        paymentMethod: 'mock_payment',
        paymentStatus: 'pending',
        
        // System fields
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        shippingCountry: cart.shippingCountry,
        
        // Affiliate tracking from fresh calculation
        // Add affiliate data if present
        ...(cart.discountCode && {
          affiliateCode: cart.discountCode,
          affiliateClickId: cart.affiliateClickId,
          affiliateDiscount: {
            code: cart.discountCode,
            percentage: cart.discountPercentage || 0,
            amount: cart.discountAmount || 0,
          },
        }),
        
        // User reference (if logged in)
        ...(currentUser && { userId: currentUser.uid, userEmail: currentUser.email }),
        
        // B2C Customer reference (if account created)
        ...(b2cCustomerId && { 
          b2cCustomerId: b2cCustomerId,
          b2cCustomerAuthId: b2cCustomerAuthId,
          hasAccount: true 
        }),
      };

      console.log("Submitting the following order data to Firestore:", orderData);

      // 1. Create the main order in the named database ('b8s-reseller-db')
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      console.log("Order created successfully with ID:", docRef.id);

      // 2. Call the post-order processing function
      try {
        console.log('Calling post-order processing function...');
        const timestamp = Date.now();
        const functionUrl = `https://us-central1-b8shield-reseller-app.cloudfunctions.net/processB2COrderCompletionHttpV2?_=${timestamp}`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({ orderId: docRef.id }),
        });

        if (!response.ok) {
          console.error('CRITICAL: Failed to call post-order processing function.', await response.text());
          toast.error(t('checkout_background_error', 'Ett bakgrundsfel inträffade. Din order har tagits emot, men kontakta support om du inte får en bekräftelse.'), { duration: 10000 });
        } else {
          const result = await response.json();
          console.log('Post-order processing completed successfully:', result);
        }
      } catch (error) {
        console.error('CRITICAL: Failed to call post-order processing function.', error);
        toast.error(t('checkout_background_error', 'Ett bakgrundsfel inträffade. Din order har tagits emot, men kontakta support om du inte får en bekräftelse.'), { duration: 10000 });
      }
      
      toast.success(
        t('checkout_order_success', 'Tack för din beställning! Ordernummer: {{orderNumber}}', { orderNumber }), 
        { id: toastId, duration: 8000 }
      );
      
      clearCart();
      
      // Redirect to order confirmation page, only passing the orderNumber
      navigate(getCountryAwareUrl(`order-confirmation/${docRef.id}`), { 
        state: { orderNumber } 
      });

    } catch (error) {
      console.error("Error placing order: ", error);
      toast.error(t('checkout_error', 'Ett fel uppstod vid beställningen. Försök igen.'), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0 && !processingPayment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <ShoppingBagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('checkout_empty_cart_title', 'Din varukorg är tom')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('checkout_empty_cart_description', 'Lägg till produkter i din varukorg för att fortsätta till kassan.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {t('checkout_continue_shopping', 'Fortsätt handla')}
          </button>
        </div>
      </div>
    );
  }

  // Show processing spinner when payment is being processed
  if (processingPayment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('checkout_processing_payment', 'Behandlar betalning...')}
          </h1>
          <p className="text-gray-600 mb-8">
            {t('checkout_processing_description', 'Vi behandlar din betalning och skapar din order. Vänta ett ögonblick...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{getCheckoutSeoTitle()}</title>
        <meta name="description" content={getCheckoutSeoDescription()} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={getCheckoutSeoTitle()} />
        <meta property="og:description" content={getCheckoutSeoDescription()} />
        <meta property="og:image" content="https://shop.b8shield.com/images/B8S_full_logo.svg" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={getCheckoutSeoTitle()} />
        <meta name="twitter:description" content={getCheckoutSeoDescription()} />
        <meta name="twitter:image" content="https://shop.b8shield.com/images/B8S_full_logo.svg" />
      </Helmet>
      <SeoHreflang />
      <div className="min-h-screen bg-gray-50">
        <ShopNavigation breadcrumb={t('breadcrumb_checkout', 'Kassa')} />
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/cart')}
                  className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ChevronLeftIcon className="h-5 w-5 mr-1" />
                  {t('checkout_back_to_cart', 'Tillbaka till varukorg')}
                </button>
              </div>
              <div className="text-2xl font-bold text-gray-900">B8Shield</div>
              <div className="flex items-center text-gray-500">
                <LockClosedIcon className="h-5 w-5 mr-2" />
                {t('checkout_secure_checkout', 'Säker kassa')}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column - Forms */}
            <div className="space-y-8">
              
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-6 sm:mb-8 px-2">
                <div className={`flex flex-col items-center space-y-1 ${step === 'contact' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    step === 'contact' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>1</div>
                  <span className="text-xs sm:text-sm font-medium text-center">{t('checkout_step_contact', 'Kontakt')}</span>
                </div>
                <div className="flex-1 h-px bg-gray-300 mx-2 sm:mx-4"></div>
                <div className={`flex flex-col items-center space-y-1 ${step === 'shipping' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    step === 'shipping' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>2</div>
                  <span className="text-xs sm:text-sm font-medium text-center">{t('checkout_step_shipping', 'Leverans')}</span>
                </div>
                <div className="flex-1 h-px bg-gray-300 mx-2 sm:mx-4"></div>
                <div className={`flex flex-col items-center space-y-1 ${step === 'payment' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    step === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>3</div>
                  <span className="text-xs sm:text-sm font-medium text-center">{t('checkout_step_payment', 'Betalning')}</span>
                </div>
              </div>

              {/* Contact Information */}
              {step === 'contact' && (
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                    {t('checkout_contact_info', 'Kontaktinformation')}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_email_label', 'E-postadress *')}
                        {currentUser && contactInfo.email && (
                          <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                            {t('checkout_from_account', 'från ditt konto')}
                          </span>
                        )}
                      </label>
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        placeholder={t('checkout_email_placeholder', 'din@epost.se')}
                        required
                      />
                      
                      {/* Login option for non-logged-in users */}
                      {!currentUser && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 mb-2">
                            {t('checkout_has_account', 'Har du redan ett konto?')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowLoginModal(true)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                          >
                            {t('checkout_login_to_account', 'Logga in på ditt konto')}
                          </button>
                          <p className="text-xs text-blue-600 mt-1">
                            {t('checkout_login_benefit', 'Få alla dina uppgifter automatiskt ifyllda')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="marketing"
                        checked={contactInfo.marketing}
                        onChange={(e) => setContactInfo({...contactInfo, marketing: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5 flex-shrink-0"
                      />
                      <label htmlFor="marketing" className="text-sm text-gray-700 leading-relaxed">
                        {t('checkout_marketing_opt_in', 'Skicka mig nyheter och erbjudanden via e-post')}
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={handleNextStep}
                    className="mt-6 w-full bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-base"
                  >
                    {t('checkout_continue_shipping', 'Fortsätt till leveransadress')}
                  </button>
                </div>
              )}

              {/* Shipping Information */}
              {step === 'shipping' && (
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                      {t('checkout_shipping_address', 'Leveransadress')}
                    </h2>
                    <button
                      onClick={handlePreviousStep}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
                    >
                      {t('checkout_change', 'Ändra')}
                    </button>
                  </div>
                  
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                    <div className="text-sm text-gray-600">{t('checkout_contact_label', 'Kontakt')}</div>
                    <div className="font-medium text-sm sm:text-base">{contactInfo.email}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_first_name', 'Förnamn *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_last_name', 'Efternamn *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.lastName}
                        onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkout_address', 'Adress *')}
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder={t('checkout_address_placeholder', 'Gatuadress')}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkout_apartment', 'Lägenhet, svit, etc. (valfritt)')}
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.apartment}
                      onChange={(e) => setShippingInfo({...shippingInfo, apartment: e.target.value})}
                      className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      placeholder={t('checkout_apartment_placeholder', 'Lägenhetsnummer, våning, etc.')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_postal_code', 'Postnummer *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        placeholder={t('checkout_postal_code_placeholder', '123 45')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_city', 'Stad *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                        placeholder={t('checkout_city_placeholder', 'Stockholm')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_country', 'Land *')}
                      </label>
                      <select
                        value={shippingInfo.country}
                        onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                      >
                        <option value="SE">{t('checkout_country_sweden', 'Sverige')}</option>
                        <option value="NO">{t('checkout_country_norway', 'Norge')}</option>
                        <option value="DK">{t('checkout_country_denmark', 'Danmark')}</option>
                        <option value="FI">{t('checkout_country_finland', 'Finland')}</option>
                        <option value="DE">{t('checkout_country_germany', 'Tyskland')}</option>
                        <option value="US">{t('checkout_country_usa', 'USA')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Optional Account Creation - Only show if user is not logged in */}
                  {!currentUser && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center mt-0.5">
                          <LockClosedIcon className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-blue-900 mb-2">
                            {t('checkout_save_info_title', 'Spara dina uppgifter för framtida beställningar')}
                          </h3>
                          <p className="text-sm text-blue-700 mb-3">
                            {t('checkout_save_info_description', 'Lägg till ett lösenord för att skapa ett konto och göra framtida beställningar snabbare.')}
                          </p>
                          <div>
                            <label className="block text-sm font-medium text-blue-800 mb-2">
                              {t('checkout_password_optional', 'Lösenord (valfritt)')}
                            </label>
                            <input
                              type="password"
                              value={contactInfo.password}
                              onChange={(e) => setContactInfo({...contactInfo, password: e.target.value})}
                              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                              placeholder={t('checkout_password_placeholder', 'Ange lösenord för att skapa konto')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleNextStep}
                    className="mt-6 w-full bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-base"
                  >
                    {t('checkout_continue_payment', 'Fortsätt till betalning')}
                  </button>
                </div>
              )}

              {/* Payment Information */}
              {step === 'payment' && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {t('checkout_payment_title', 'Betalning')}
                    </h2>
                    <button
                      onClick={handlePreviousStep}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('checkout_change', 'Ändra')}
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                    <div className="text-sm text-gray-600">{t('checkout_delivery_to', 'Levereras till')}</div>
                    <div className="font-medium">
                      {shippingInfo.firstName} {shippingInfo.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {shippingInfo.address}
                      {shippingInfo.apartment && `, ${shippingInfo.apartment}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {shippingInfo.postalCode} {shippingInfo.city}, {shippingInfo.country}
                    </div>
                  </div>

                  {/* Stripe Payment Form */}
                  <StripePaymentForm
                    customerInfo={{
                      email: contactInfo.email,
                      name: `${shippingInfo.firstName} ${shippingInfo.lastName}`
                    }}
                    shippingInfo={{
                      country: shippingInfo.country,
                      address: `${shippingInfo.address}${shippingInfo.apartment ? `, ${shippingInfo.apartment}` : ''}`,
                      city: shippingInfo.city,
                      postalCode: shippingInfo.postalCode
                    }}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />

                  <p className="text-xs text-center text-gray-500 mt-4">
                    {t('checkout_terms_agreement', 'Genom att slutföra beställningen godkänner du våra')}{' '}
                                    <a href={getCountryAwareUrl('legal/anvandarvillkor')} className="text-blue-600 hover:underline">{t('checkout_terms_link', 'villkor')}</a>{' '}
                {t('checkout_terms_and', 'och')}{' '}
                <a href={getCountryAwareUrl('legal/integritetspolicy')} className="text-blue-600 hover:underline">{t('checkout_privacy_link', 'integritetspolicy')}</a>.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                  {t('checkout_order_summary', 'Ordersammanfattning')}
                </h2>
                
                {/* Cart Items */}
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  {cart.items.map((item) => {
                    const itemName = getContentValue(item.name);
                    return (
                      <div key={`${item.id}-${item.size}`} className="flex items-center justify-between py-2">
                        <div className="flex items-center">
                          <div className="relative">
                            <img src={item.image} alt={itemName} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg" />
                            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-gray-800 text-white text-xs rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="ml-3 sm:ml-4">
                            <p className="font-semibold text-sm sm:text-base">{itemName}</p>
                            {item.size && <p className="text-xs sm:text-sm text-gray-600">{t('size_label', 'Storlek: {{size}}', { size: item.size })}</p>}
                          </div>
                        </div>
                        <p className="font-semibold text-sm sm:text-base">
                          <SmartPrice 
                            sekPrice={item.price * item.quantity} 
                            variant="compact"
                            showOriginal={false}
                          />
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">{t('checkout_subtotal', 'Delsumma')}</span>
                    <span className="font-medium">
                      <SmartPrice 
                        sekPrice={subtotal} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 text-xs bg-gray-100 px-2 py-1 rounded">
                        {t('checkout_affiliate_discount', 'Affiliate rabatt, {{discountPercentage}}%', { discountPercentage })}
                      </span>
                      <span className="font-medium text-green-600">
                        - <SmartPrice 
                          sekPrice={discountAmount} 
                          variant="compact"
                          showOriginal={false}
                        />
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">{t('checkout_shipping', 'Frakt ({{shippingCountry}})', { shippingCountry: cart.shippingCountry })}</span>
                    <span className="font-medium">
                      <SmartPrice 
                        sekPrice={shipping} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base sm:text-lg text-gray-900 pt-2 sm:pt-3 border-t border-gray-300">
                    <span>{t('checkout_total', 'Totalt')}</span>
                    <span>
                      <SmartPrice 
                        sekPrice={total} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 -mt-1 sm:-mt-2">
                      <span>{t('checkout_vat', 'Varav Moms (25%)')}</span>
                      <span>
                        <SmartPrice 
                          sekPrice={vat} 
                          variant="compact"
                          showOriginal={false}
                        />
                      </span>
                  </div>
                </div>

                {/* Affiliate Info */}
                {appliedAffiliate && (
                  <div className="mt-3 sm:mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-xs sm:text-sm text-green-800">
                      <div className="font-medium">{t('checkout_affiliate_activated', '🎉 Affiliate-rabatt aktiverad!')}</div>
                      <div className="text-xs mt-1">
                        {t('checkout_affiliate_code', 'Kod: {{code}} • {{discountPercentage}}% rabatt', { 
                          code: appliedAffiliate.code, 
                          discountPercentage 
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* ShopFooter component was removed from imports, so it's removed from here */}
      </div>
      
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('checkout_login_title', 'Logga in på ditt konto')}
              </h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {t('checkout_login_description', 'Logga in för att få alla dina uppgifter automatiskt ifyllda.')}
            </p>
            
            <form onSubmit={handleCheckoutLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('checkout_login_email', 'E-postadress')}
                </label>
                <input
                  type="email"
                  value={loginCredentials.email}
                  onChange={(e) => setLoginCredentials({...loginCredentials, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('checkout_login_email_placeholder', 'din@epost.se')}
                  required
                  disabled={loginLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('checkout_login_password', 'Lösenord')}
                </label>
                <input
                  type="password"
                  value={loginCredentials.password}
                  onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('checkout_login_password_placeholder', 'Ditt lösenord')}
                  required
                  disabled={loginLoading}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  disabled={loginLoading}
                >
                  {t('checkout_login_cancel', 'Avbryt')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={loginLoading}
                >
                  {loginLoading ? t('checkout_login_loading', 'Loggar in...') : t('checkout_login_submit', 'Logga in')}
                </button>
              </div>
            </form>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                {t('checkout_login_forgot', 'Glömt lösenordet?')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate(getCountryAwareUrl('/customer-forgot-password'));
                  }}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  {t('checkout_login_reset', 'Återställ här')}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Checkout;