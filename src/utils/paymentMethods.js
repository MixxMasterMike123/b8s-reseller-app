/**
 * Payment method utilities for formatting and displaying payment information
 */

/**
 * Format payment method display name based on Stripe payment method details
 * @param {Object} payment - Payment object from order
 * @returns {string} - Formatted payment method name
 */
export const formatPaymentMethodName = (payment) => {
  if (!payment) return 'Okänd betalning';
  
  // DEBUG: Log payment object structure
  console.log('🔍 PAYMENT DEBUG - Full payment object:', payment);
  console.log('🔍 PAYMENT DEBUG - payment.method:', payment.method);
  console.log('🔍 PAYMENT DEBUG - payment.paymentMethodType:', payment.paymentMethodType);
  console.log('🔍 PAYMENT DEBUG - payment.paymentMethodDetails:', payment.paymentMethodDetails);

  // Handle enhanced payment method details (new format)
  if (payment.paymentMethodDetails) {
    // Apple Pay / Google Pay (card with wallet)
    if (payment.paymentMethodDetails.wallet) {
      const walletType = payment.paymentMethodDetails.wallet;
      if (walletType === 'apple_pay') return 'Apple Pay';
      if (walletType === 'google_pay') return 'Google Pay';
      if (walletType === 'samsung_pay') return 'Samsung Pay';
      return `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} Pay`;
    }

    // Regular card payment
    if (payment.paymentMethodDetails.brand && payment.paymentMethodDetails.last4) {
      const brand = payment.paymentMethodDetails.brand.toUpperCase();
      return `${brand} ****${payment.paymentMethodDetails.last4}`;
    }

    // Klarna payment
    if (payment.paymentMethodDetails.type === 'klarna') {
      return 'Klarna';
    }
  }

  // Handle payment method type (Stripe payment_method.type)
  if (payment.paymentMethodType) {
    switch (payment.paymentMethodType) {
      case 'card':
        return 'Kortbetalning';
      case 'klarna':
        return 'Klarna';
      case 'swish':
        return 'Swish';
      case 'bancontact':
        return 'Bancontact';
      case 'ideal':
        return 'iDEAL';
      case 'sepa_debit':
        return 'SEPA Direct Debit';
      case 'sofort':
        return 'SOFORT';
      default:
        return payment.paymentMethodType.charAt(0).toUpperCase() + payment.paymentMethodType.slice(1);
    }
  }

  // Fallback to basic method detection (legacy format)
  if (payment.method === 'stripe') return 'Stripe';
  if (payment.method === 'klarna') return 'Klarna';
  
  // B2B orders
  if (payment.method === 'invoice' || payment.method === 'faktura') return 'Faktura';
  
  // Return actual method name or unknown
  return payment.method || 'Okänd betalning';
};

/**
 * Get payment method badge color classes
 * @param {Object} payment - Payment object from order
 * @returns {string} - CSS classes for badge styling
 */
export const getPaymentMethodBadgeClasses = (payment) => {
  const methodName = formatPaymentMethodName(payment);
  
  // Apple Pay / Google Pay - special colors
  if (methodName.includes('Apple Pay')) return 'bg-gray-900 text-white';
  if (methodName.includes('Google Pay')) return 'bg-blue-600 text-white';
  if (methodName.includes('Samsung Pay')) return 'bg-blue-800 text-white';
  
  // Card brands
  if (methodName.includes('VISA')) return 'bg-blue-100 text-blue-800';
  if (methodName.includes('MASTERCARD')) return 'bg-red-100 text-red-800';
  if (methodName.includes('AMEX')) return 'bg-green-100 text-green-800';
  
  // Payment methods
  if (methodName === 'Klarna') return 'bg-purple-100 text-purple-800';
  if (methodName === 'Swish') return 'bg-yellow-100 text-yellow-800';
  if (methodName.includes('Stripe')) return 'bg-blue-100 text-blue-800';
  if (methodName === 'Faktura') return 'bg-gray-100 text-gray-800';
  
  // Default
  return 'bg-gray-100 text-gray-800';
};

/**
 * Check if payment method is a digital wallet
 * @param {Object} payment - Payment object from order
 * @returns {boolean} - True if it's a digital wallet payment
 */
export const isDigitalWallet = (payment) => {
  const methodName = formatPaymentMethodName(payment);
  return methodName.includes('Apple Pay') || 
         methodName.includes('Google Pay') || 
         methodName.includes('Samsung Pay');
};
