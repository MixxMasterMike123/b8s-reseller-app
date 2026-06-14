import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { db, auth } from '../../firebase/config';

// Initialize Firebase Functions
const functions = getFunctions();
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
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import { useShopId } from '../../contexts/ShopContext';
import { withShopId } from '../../config/withShopId';

const Checkout = () => {
  const { cart, calculateTotals, clearCart, updateShippingCountry } = useCart();
  const store = useStoreSettings();
  const shopId = useShopId();
  const { currentUser, login } = useSimpleAuth();
  const { t, currentLanguage } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const navigate = useNavigate();

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

  // Existing-customer linkage passed into the payment metadata so the
  // webhook-created order is tied to the account
  const [customerLinkage, setCustomerLinkage] = useState(null);



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

  // Save customer and shipping info to localStorage for Klarna return flow
  // (never persist the password — only email/marketing are needed on return)
  useEffect(() => {
    if (step === 'payment') {
      const { password, ...safeContactInfo } = contactInfo;
      localStorage.setItem('b8s_checkout_customer', JSON.stringify(safeContactInfo));
      localStorage.setItem('b8s_checkout_shipping', JSON.stringify(shippingInfo));
    }
  }, [step, contactInfo, shippingInfo]);

  // Keep cart shipping country in sync with the address chosen at checkout,
  // so shipping cost and totals reflect the actual destination
  useEffect(() => {
    if (shippingInfo.country && shippingInfo.country !== cart.shippingCountry) {
      updateShippingCountry(shippingInfo.country);
    }
  }, [shippingInfo.country, cart.shippingCountry, updateShippingCountry]);

  const loadCustomerProfile = async () => {
    try {
      setLoadingProfile(true);
      const customersRef = collection(db, 'b2cCustomers');
      const customerQuery = query(customersRef, where('shopId', '==', shopId), where('firebaseAuthUid', '==', currentUser.uid));
      const customerSnapshot = await getDocs(customerQuery);
      
      if (!customerSnapshot.empty) {
        const customerDoc = customerSnapshot.docs[0];
        const customerData = customerDoc.data();

        setCustomerLinkage({
          b2cCustomerId: customerDoc.id,
          b2cCustomerAuthId: currentUser.uid
        });

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

  // Helper function to create B2C customer account
  const createB2CCustomerAccount = async () => {
    if (!contactInfo.password || contactInfo.password.trim().length === 0) {
      return { b2cCustomerId: null, b2cCustomerAuthId: null };
    }

    try {
      console.log('Creating B2C customer account for:', contactInfo.email);

      // Note: no guest-time lookup of existing customers — anonymous visitors
      // cannot (and should not) read b2cCustomers. If the email already has an
      // account, createUserWithEmailAndPassword fails and we tell them to log in.
      {
        // Create new Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          contactInfo.email,
          contactInfo.password
        );
        const b2cCustomerAuthId = userCredential.user.uid;
        console.log('Created Firebase Auth account:', b2cCustomerAuthId);
        
        // Send custom email verification via orchestrator
        try {
          const sendCustomEmailVerification = httpsCallable(functions, 'sendCustomEmailVerification');
          await sendCustomEmailVerification({
            customerInfo: {
              firstName: shippingInfo.firstName,
              lastName: shippingInfo.lastName,
              email: contactInfo.email,
              preferredLang: currentLanguage
            },
            firebaseAuthUid: userCredential.user.uid,
            source: 'checkout',
            language: currentLanguage
          });
          console.log('Custom verification email sent to:', contactInfo.email);
        } catch (verificationError) {
          console.error('Error sending custom verification email:', verificationError);
          // Fallback to Firebase default if custom fails
          await sendEmailVerification(userCredential.user);
          console.log('Fallback verification email sent to:', contactInfo.email);
        }
        
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
        
        const customerDocRef = await addDoc(collection(db, 'b2cCustomers'), withShopId(customerData, shopId));
        const b2cCustomerId = customerDocRef.id;
        console.log('Created B2C customer document:', b2cCustomerId);
        
        toast.success(t('checkout_account_created', 'Konto skapat! Kontrollera din e-post för verifiering.'), {
          duration: 5000
        });
        
        return { b2cCustomerId, b2cCustomerAuthId };
      }
    } catch (customerError) {
      console.error('Error creating B2C customer account:', customerError);

      if (customerError.code === 'auth/email-already-in-use') {
        // The email already has an account; the order still goes through and
        // appears on their account page via email matching once logged in.
        toast(t('checkout_account_exists', 'Du har redan ett konto med denna e-post. Logga in för att se din beställning.'), { duration: 6000 });
      } else {
        toast.error(t('checkout_account_error', 'Kunde inte skapa konto, men din beställning behandlas.'), { duration: 5000 });
      }
      return { b2cCustomerId: null, b2cCustomerAuthId: null };
    }
  };

  // Handle successful Stripe payment.
  // The order itself is created SERVER-SIDE by the Stripe webhook (order doc
  // ID = payment intent ID), so the client never writes orders — it just
  // creates the optional account and navigates to the confirmation page,
  // which waits for the webhook-created order to appear.
  const handlePaymentSuccess = async (paymentIntent) => {
    console.log('✅ Payment successful', paymentIntent.id);

    // Set processing state to prevent empty cart page
    setProcessingPayment(true);

    try {
      // Create B2C customer account if the customer chose a password
      await createB2CCustomerAccount();
    } catch (error) {
      console.error('❌ Account creation after payment failed (order unaffected):', error);
    }

    navigate(getCountryAwareUrl(`order-confirmation/${paymentIntent.id}`));

    // Clear the cart and saved checkout info after navigation
    setTimeout(() => {
      clearCart();
      localStorage.removeItem('b8s_checkout_customer');
      localStorage.removeItem('b8s_checkout_shipping');
      setProcessingPayment(false);
    }, 100);
  };

  // Handle payment errors
  const handlePaymentError = (error) => {
    console.error('❌ Payment failed:', error);
    toast.error(t('checkout_payment_failed_with_message', 'Betalning misslyckades: {{message}}', { message: error.message }));
  };


  if (cart.items.length === 0 && !processingPayment) {
    return (
      <div className="min-h-screen bg-canvas font-body text-ink">
        <ShopNavigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <ShoppingBagIcon className="h-16 w-16 text-ink-faint mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-ink mb-4">
            {t('checkout_empty_cart_title', 'Din varukorg är tom')}
          </h1>
          <p className="text-ink-muted mb-8">
            {t('checkout_empty_cart_description', 'Lägg till produkter i din varukorg för att fortsätta till kassan.')}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-accent text-white px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
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
      <div className="min-h-screen bg-canvas font-body text-ink">
        <ShopNavigation />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent mx-auto mb-4"></div>
          <h1 className="font-display text-2xl font-bold text-ink mb-4">
            {t('checkout_processing_payment', 'Behandlar betalning...')}
          </h1>
          <p className="text-ink-muted mb-8">
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
        {store.logoUrl && <meta property="og:image" content={store.logoUrl} />}
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={getCheckoutSeoTitle()} />
        <meta name="twitter:description" content={getCheckoutSeoDescription()} />
        {store.logoUrl && <meta name="twitter:image" content={store.logoUrl} />}
      </Helmet>
      <SeoHreflang />
      <div className="min-h-screen bg-canvas font-body text-ink">
        <ShopNavigation breadcrumb={t('breadcrumb_checkout', 'Kassa')} />
        
        {/* Header */}
        <div className="bg-white/85 backdrop-blur-md border-b border-ink/10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/cart')}
                  className="flex items-center text-ink-muted hover:text-ink font-medium transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5 mr-1" />
                  {t('checkout_back_to_cart', 'Tillbaka till varukorg')}
                </button>
              </div>
              <div className="font-display text-2xl font-bold text-ink tracking-tight">{store.shopName}</div>
              <div className="flex items-center text-ink-muted text-sm font-medium">
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
                <div className={`flex flex-col items-center space-y-1 ${step === 'contact' ? 'text-accent' : 'text-ink-faint'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    step === 'contact' ? 'bg-accent text-white' : 'bg-white shadow-tile text-ink-muted'
                  }`}>1</div>
                  <span className="text-xs sm:text-sm font-medium text-center">{t('checkout_step_contact', 'Kontakt')}</span>
                </div>
                <div className="flex-1 h-px bg-ink/15 mx-2 sm:mx-4"></div>
                <div className={`flex flex-col items-center space-y-1 ${step === 'shipping' ? 'text-accent' : 'text-ink-faint'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    step === 'shipping' ? 'bg-accent text-white' : 'bg-white shadow-tile text-ink-muted'
                  }`}>2</div>
                  <span className="text-xs sm:text-sm font-medium text-center">{t('checkout_step_shipping', 'Leverans')}</span>
                </div>
                <div className="flex-1 h-px bg-ink/15 mx-2 sm:mx-4"></div>
                <div className={`flex flex-col items-center space-y-1 ${step === 'payment' ? 'text-accent' : 'text-ink-faint'}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    step === 'payment' ? 'bg-accent text-white' : 'bg-white shadow-tile text-ink-muted'
                  }`}>3</div>
                  <span className="text-xs sm:text-sm font-medium text-center">{t('checkout_step_payment', 'Betalning')}</span>
                </div>
              </div>

              {/* Contact Information */}
              {step === 'contact' && (
                <div className="bg-white rounded-tile p-4 sm:p-6 shadow-tile">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink mb-4 sm:mb-6">
                    {t('checkout_contact_info', 'Kontaktinformation')}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        {t('checkout_email_label', 'E-postadress *')}
                        {currentUser && contactInfo.email && (
                          <span className="ml-2 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full font-semibold">
                            {t('checkout_from_account', 'från ditt konto')}
                          </span>
                        )}
                      </label>
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                        placeholder={t('checkout_email_placeholder', 'din@epost.se')}
                        required
                      />
                      
                      {/* Login option for non-logged-in users */}
                      {!currentUser && (
                        <div className="mt-3 p-3 bg-accent/5 rounded-el">
                          <p className="text-sm text-ink mb-2">
                            {t('checkout_has_account', 'Har du redan ett konto?')}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowLoginModal(true)}
                            className="text-accent hover:opacity-80 font-semibold text-sm underline"
                          >
                            {t('checkout_login_to_account', 'Logga in på ditt konto')}
                          </button>
                          <p className="text-xs text-ink-muted mt-1">
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
                        className="h-4 w-4 text-accent accent-[var(--color-accent)] focus:ring-accent/30 border-ink/20 rounded-sm mt-0.5 shrink-0"
                      />
                      <label htmlFor="marketing" className="text-sm text-ink-muted leading-relaxed">
                        {t('checkout_marketing_opt_in', 'Skicka mig nyheter och erbjudanden via e-post')}
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={handleNextStep}
                    className="mt-6 w-full bg-accent text-white px-4 sm:px-6 py-3.5 rounded-full font-bold hover:opacity-90 transition-opacity text-base"
                  >
                    {t('checkout_continue_shipping', 'Fortsätt till leveransadress')}
                  </button>
                </div>
              )}

              {/* Shipping Information */}
              {step === 'shipping' && (
                <div className="bg-white rounded-tile p-4 sm:p-6 shadow-tile">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-ink">
                      {t('checkout_shipping_address', 'Leveransadress')}
                    </h2>
                    <button
                      onClick={handlePreviousStep}
                      className="text-ink-muted hover:text-ink font-medium text-sm sm:text-base underline underline-offset-4"
                    >
                      {t('checkout_change', 'Ändra')}
                    </button>
                  </div>
                  
                  <div className="mb-4 p-3 bg-canvas rounded-el">
                    <div className="text-sm text-ink-muted">{t('checkout_contact_label', 'Kontakt')}</div>
                    <div className="font-medium text-sm sm:text-base">{contactInfo.email}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        {t('checkout_first_name', 'Förnamn *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        {t('checkout_last_name', 'Efternamn *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.lastName}
                        onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      {t('checkout_address', 'Adress *')}
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                      placeholder={t('checkout_address_placeholder', 'Gatuadress')}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      {t('checkout_apartment', 'Lägenhet, svit, etc. (valfritt)')}
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.apartment}
                      onChange={(e) => setShippingInfo({...shippingInfo, apartment: e.target.value})}
                      className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                      placeholder={t('checkout_apartment_placeholder', 'Lägenhetsnummer, våning, etc.')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        {t('checkout_postal_code', 'Postnummer *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                        placeholder={t('checkout_postal_code_placeholder', '123 45')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        {t('checkout_city', 'Stad *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                        placeholder={t('checkout_city_placeholder', 'Stockholm')}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-2">
                        {t('checkout_country', 'Land *')}
                      </label>
                      <select
                        value={shippingInfo.country}
                        onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                        className="w-full px-3 sm:px-4 py-3 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
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
                    <div className="mt-6 p-4 bg-accent/5 rounded-el">
                      <div className="flex items-start space-x-3">
                        <div className="shrink-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center mt-0.5">
                          <LockClosedIcon className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-ink mb-2">
                            {t('checkout_save_info_title', 'Spara dina uppgifter för framtida beställningar')}
                          </h3>
                          <p className="text-sm text-ink-muted mb-3">
                            {t('checkout_save_info_description', 'Lägg till ett lösenord för att skapa ett konto och göra framtida beställningar snabbare.')}
                          </p>
                          <div>
                            <label className="block text-sm font-semibold text-ink mb-2">
                              {t('checkout_password_optional', 'Lösenord (valfritt)')}
                            </label>
                            <input
                              type="password"
                              value={contactInfo.password}
                              onChange={(e) => setContactInfo({...contactInfo, password: e.target.value})}
                              className="w-full px-3 py-2 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent text-base transition-colors"
                              placeholder={t('checkout_password_placeholder', 'Ange lösenord för att skapa konto')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleNextStep}
                    className="mt-6 w-full bg-accent text-white px-4 sm:px-6 py-3.5 rounded-full font-bold hover:opacity-90 transition-opacity text-base"
                  >
                    {t('checkout_continue_payment', 'Fortsätt till betalning')}
                  </button>
                </div>
              )}

              {/* Payment Information */}
              {step === 'payment' && (
                <div className="bg-white rounded-tile p-6 shadow-tile">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-bold text-ink">
                      {t('checkout_payment_title', 'Betalning')}
                    </h2>
                    <button
                      onClick={handlePreviousStep}
                      className="text-ink-muted hover:text-ink font-medium underline underline-offset-4"
                    >
                      {t('checkout_change', 'Ändra')}
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-canvas rounded-el">
                    <div className="text-sm text-ink-muted">{t('checkout_delivery_to', 'Levereras till')}</div>
                    <div className="font-medium">
                      {shippingInfo.firstName} {shippingInfo.lastName}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {shippingInfo.address}
                      {shippingInfo.apartment && `, ${shippingInfo.apartment}`}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {shippingInfo.postalCode} {shippingInfo.city}, {shippingInfo.country}
                    </div>
                  </div>

                  {/* Stripe Payment Form */}
                  <StripePaymentForm
                    customerInfo={{
                      email: contactInfo.email,
                      name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
                      firstName: shippingInfo.firstName,
                      lastName: shippingInfo.lastName,
                      marketing: contactInfo.marketing,
                      preferredLang: currentLanguage
                    }}
                    shippingInfo={{
                      country: shippingInfo.country,
                      firstName: shippingInfo.firstName,
                      lastName: shippingInfo.lastName,
                      address: shippingInfo.address,
                      apartment: shippingInfo.apartment,
                      city: shippingInfo.city,
                      postalCode: shippingInfo.postalCode
                    }}
                    customerLinkage={customerLinkage}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />

                  <p className="text-xs text-center text-ink-faint mt-4">
                    {t('checkout_terms_agreement', 'Genom att slutföra beställningen godkänner du våra')}{' '}
                                    <a href={getCountryAwareUrl('legal/anvandarvillkor')} className="text-accent hover:underline">{t('checkout_terms_link', 'villkor')}</a>{' '}
                {t('checkout_terms_and', 'och')}{' '}
                <a href={getCountryAwareUrl('legal/integritetspolicy')} className="text-accent hover:underline">{t('checkout_privacy_link', 'integritetspolicy')}</a>.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <div className="bg-white rounded-tile p-4 sm:p-6 shadow-tile">
                <h2 className="font-display text-lg sm:text-xl font-bold text-ink mb-4 sm:mb-6">
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
                            <img src={item.image} alt={itemName} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-el bg-canvas" />
                            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-ink text-white text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center tabular-nums">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="ml-3 sm:ml-4">
                            <p className="font-semibold text-sm sm:text-base text-ink">{itemName}</p>
                            {item.size && <p className="text-xs sm:text-sm text-ink-muted">{t('size_label', 'Storlek: {{size}}', { size: item.size })}</p>}
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
                    <span className="text-ink-muted">{t('checkout_subtotal', 'Delsumma')}</span>
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
                      <span className="text-accent text-xs bg-accent/10 px-2 py-1 rounded-full font-semibold">
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
                    <span className="text-ink-muted">{t('checkout_shipping', 'Frakt ({{shippingCountry}})', { shippingCountry: cart.shippingCountry })}</span>
                    <span className="font-medium">
                      <SmartPrice 
                        sekPrice={shipping} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between font-display font-bold text-base sm:text-lg text-ink pt-2 sm:pt-3 border-t border-ink/15">
                    <span>{t('checkout_total', 'Totalt')}</span>
                    <span>
                      <SmartPrice 
                        sekPrice={total} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-ink-faint -mt-1 sm:-mt-2">
                      <span>{t('checkout_vat_rate', 'Varav Moms ({{rate}}%)', { rate: Math.round(store.vatRate * 100) })}</span>
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
          <div className="bg-white rounded-tile p-6 max-w-md w-full mx-4 shadow-lift">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-xl font-bold text-ink">
                {t('checkout_login_title', 'Logga in på ditt konto')}
              </h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-ink-faint hover:text-ink transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-ink-muted mb-4">
              {t('checkout_login_description', 'Logga in för att få alla dina uppgifter automatiskt ifyllda.')}
            </p>
            
            <form onSubmit={handleCheckoutLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('checkout_login_email', 'E-postadress')}
                </label>
                <input
                  type="email"
                  value={loginCredentials.email}
                  onChange={(e) => setLoginCredentials({...loginCredentials, email: e.target.value})}
                  className="w-full px-3 py-2 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  placeholder={t('checkout_login_email_placeholder', 'din@epost.se')}
                  required
                  disabled={loginLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">
                  {t('checkout_login_password', 'Lösenord')}
                </label>
                <input
                  type="password"
                  value={loginCredentials.password}
                  onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
                  className="w-full px-3 py-2 border border-ink/15 bg-white rounded-el focus:outline-hidden focus:ring-4 focus:ring-accent/10 focus:border-accent transition-colors"
                  placeholder={t('checkout_login_password_placeholder', 'Ditt lösenord')}
                  required
                  disabled={loginLoading}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 px-4 py-2 text-ink border border-ink/15 rounded-full hover:bg-canvas disabled:opacity-50 font-medium transition-colors"
                  disabled={loginLoading}
                >
                  {t('checkout_login_cancel', 'Avbryt')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-full hover:opacity-90 disabled:opacity-50 font-bold transition-opacity"
                  disabled={loginLoading}
                >
                  {loginLoading ? t('checkout_login_loading', 'Loggar in...') : t('checkout_login_submit', 'Logga in')}
                </button>
              </div>
            </form>
            
            <div className="mt-4 pt-4 border-t border-ink/10">
              <p className="text-sm text-ink-muted text-center">
                {t('checkout_login_forgot', 'Glömt lösenordet?')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate(getCountryAwareUrl('/forgot-password'));
                  }}
                  className="text-accent hover:opacity-80 underline"
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