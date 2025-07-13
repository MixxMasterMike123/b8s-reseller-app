import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { useCart } from '../../contexts/CartContext';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { getCountryAwareUrl } from '../../utils/productUrls';
import { translateColor } from '../../utils/colorTranslations';
import toast from 'react-hot-toast';
import ShopNavigation from '../../components/shop/ShopNavigation';
import SeoHreflang from '../../components/shop/SeoHreflang';
import SmartPrice from '../../components/shop/SmartPrice';
import { 
  ChevronLeftIcon, 
  LockClosedIcon, 
  ShoppingBagIcon 
} from '@heroicons/react/24/outline';

const Checkout = () => {
  const { cart, calculateTotals, clearCart } = useCart();
  const { currentUser } = useSimpleAuth();
  const { t, currentLanguage } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [step, setStep] = useState('contact'); // 'contact', 'shipping', 'payment'

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

  if (cart.items.length === 0) {
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

  return (
    <>
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
              <div className="flex items-center space-x-4 mb-8">
                <div className={`flex items-center space-x-2 ${step === 'contact' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 'contact' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>1</div>
                  <span className="font-medium">{t('checkout_step_contact', 'Kontakt')}</span>
                </div>
                <div className="w-8 h-px bg-gray-300"></div>
                <div className={`flex items-center space-x-2 ${step === 'shipping' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 'shipping' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>2</div>
                  <span className="font-medium">{t('checkout_step_shipping', 'Leverans')}</span>
                </div>
                <div className="w-8 h-px bg-gray-300"></div>
                <div className={`flex items-center space-x-2 ${step === 'payment' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>3</div>
                  <span className="font-medium">{t('checkout_step_payment', 'Betalning')}</span>
                </div>
              </div>

              {/* Contact Information */}
              {step === 'contact' && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('checkout_email_placeholder', 'din@epost.se')}
                        required
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="marketing"
                        checked={contactInfo.marketing}
                        onChange={(e) => setContactInfo({...contactInfo, marketing: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="marketing" className="ml-2 text-sm text-gray-700">
                        {t('checkout_marketing_opt_in', 'Skicka mig nyheter och erbjudanden via e-post')}
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={handleNextStep}
                    className="mt-6 w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t('checkout_continue_shipping', 'Fortsätt till leveransadress')}
                  </button>
                </div>
              )}

              {/* Shipping Information */}
              {step === 'shipping' && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {t('checkout_shipping_address', 'Leveransadress')}
                    </h2>
                    <button
                      onClick={handlePreviousStep}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('checkout_change', 'Ändra')}
                    </button>
                  </div>
                  
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                    <div className="text-sm text-gray-600">{t('checkout_contact_label', 'Kontakt')}</div>
                    <div className="font-medium">{contactInfo.email}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_first_name', 'Förnamn *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('checkout_apartment_placeholder', 'Lägenhetsnummer, våning, etc.')}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout_postal_code', 'Postnummer *')}
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.postalCode}
                        onChange={(e) => setShippingInfo({...shippingInfo, postalCode: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                  {/* Optional Account Creation */}
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
                            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder={t('checkout_password_placeholder', 'Minst 6 tecken')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="mt-6 w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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

                  {/* Mock Payment Options */}
                  <div className="space-y-4 mb-6">
                    <h3 className="font-medium text-gray-900">{t('checkout_payment_method', 'Betalningsmetod')}</h3>
                    
                    {/* Shopify-style payment options */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-purple-600 text-white p-4 text-center font-semibold">
                        Shop Pay (Mock)
                      </div>
                      <div className="bg-orange-500 text-white p-4 text-center font-semibold">
                        PayPal (Mock)
                      </div>
                      <div className="bg-black text-white p-4 text-center font-semibold">
                        Apple Pay (Mock)
                      </div>
                    </div>

                    <div className="text-center text-gray-500 text-sm">
                      {t('checkout_quick_checkout', 'Alternativ för snabb utcheckning')}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">{t('checkout_or', 'ELLER')}</span>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="text-yellow-600 font-semibold">
                          {t('checkout_dev_mode', '🚧 Utvecklingsläge')}
                        </div>
                      </div>
                      <p className="text-center text-sm text-yellow-700 mt-2">
                        {t('checkout_dev_description', 'Betalningsintegrationen (Stripe/Klarna/Swish) implementeras i nästa fas. Denna testorder skapas utan betalning för att testa affiliate-spårning.')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('checkout_processing', 'Bearbetar beställning...') : t('checkout_complete_order', 'Slutför beställning (Test)')}
                  </button>

                  <p className="text-xs text-center text-gray-500 mt-4">
                    {t('checkout_terms_agreement', 'Genom att slutföra beställningen godkänner du våra')}{' '}
                    <a href={getCountryAwareUrl('terms')} className="text-blue-600 hover:underline">{t('checkout_terms_link', 'villkor')}</a>{' '}
                    {t('checkout_terms_and', 'och')}{' '}
                    <a href={getCountryAwareUrl('privacy')} className="text-blue-600 hover:underline">{t('checkout_privacy_link', 'integritetspolicy')}</a>.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  {t('checkout_order_summary', 'Ordersammanfattning')}
                </h2>
                
                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {cart.items.map((item) => {
                    const itemName = getContentValue(item.name);
                    return (
                      <div key={`${item.id}-${item.size}`} className="flex items-center justify-between py-2">
                        <div className="flex items-center">
                          <div className="relative">
                            <img src={item.image} alt={itemName} className="w-16 h-16 object-cover rounded-lg" />
                            <span className="absolute -top-2 -right-2 bg-gray-800 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="ml-4">
                            <p className="font-semibold">{itemName}</p>
                            {item.size && <p className="text-sm text-gray-600">{t('size_label', 'Storlek: {{size}}', { size: item.size })}</p>}
                          </div>
                        </div>
                        <p className="font-semibold">
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
                  <div className="flex justify-between text-sm">
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
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 text-xs bg-gray-100 px-2 py-1 rounded">
                        {t('checkout_affiliate_discount', 'Affiliate rabatt, {{discountPercentage}}%', { discountPercentage })}
                      </span>
                      <span className="font-medium">
                        - <SmartPrice 
                          sekPrice={discountAmount} 
                          variant="compact"
                          showOriginal={false}
                        />
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('checkout_shipping', 'Frakt ({{shippingCountry}})', { shippingCountry: cart.shippingCountry })}</span>
                    <span className="font-medium">
                      <SmartPrice 
                        sekPrice={shipping} 
                        variant="compact"
                        showOriginal={false}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-gray-900 pt-3 border-t border-gray-300">
                    <span>{t('checkout_total', 'Totalt')}</span>
                    <span>
                      <SmartPrice 
                        sekPrice={total} 
                        variant="large"
                        showOriginal={false}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 -mt-2">
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
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-800">
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
    </>
  );
};

export default Checkout;