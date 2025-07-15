/**
 * Affiliate Calculations Utility
 * Centralized commission calculation logic for consistency across frontend and backend.
 * 
 * IMPORTANT: Swedish business logic for affiliate commissions
 * Correct deduction order:
 * 1. Start with order total (VAT-inclusive, discount already applied)
 * 2. Deduct shipping (separate service, not part of product value)
 * 3. Extract VAT from remaining product value (Swedish VAT system)
 * 4. Apply commission rate to the final net product value
 * 
 * NOTE: Affiliate discount is NOT deducted here because order.total already 
 * has the discount applied (it's the final amount after all deductions)
 */

export const calculateCommission = (orderData, affiliateData, vatRate = 0.25) => {
  const orderTotal = orderData.total || orderData.subtotal || 0;
  const shipping = orderData.shipping || 0;
  const discountAmount = orderData.discountAmount || 0; // For reporting only
  const rate = (affiliateData.commissionRate || 15) / 100;

  // Step 1: Deduct shipping from order total (shipping is separate service)
  // Note: orderTotal already has affiliate discount applied
  const productValueWithVAT = Math.max(0, orderTotal - shipping);

  // Step 2: Extract VAT from the remaining product value
  // Swedish VAT system: VAT-exclusive = VAT-inclusive / 1.25
  const productValueExcludingVAT = productValueWithVAT / (1 + vatRate);
  const vatAmount = productValueWithVAT - productValueExcludingVAT;

  // Step 3: Apply commission rate to the final net product value
  const commission = Math.round((productValueExcludingVAT * rate) * 100) / 100;

  return {
    commission,
    deductions: { 
      shipping,
      vat: vatAmount,
      // Note: discount is already applied in orderTotal, not deducted here
      discountAmount: discountAmount // For reporting/transparency only
    },
    netBase: productValueExcludingVAT,
    calculationSteps: {
      orderTotal,
      afterShipping: productValueWithVAT,
      productValueExcludingVAT,
      vatAmount,
      rate,
      final: commission,
      // Include discount info for transparency
      discountAlreadyApplied: discountAmount
    }
  };
};

// Validation helper
export const validateOrderForCommission = (orderData) => {
  const orderTotal = orderData.total || orderData.subtotal || 0;
  if (!orderTotal || orderTotal <= 0) {
    throw new Error('Missing or invalid order total');
  }
  if (orderData.shipping < 0) {
    throw new Error('Shipping cost cannot be negative');
  }
  return true;
};

// Debug helper to compare old vs new calculations
export const compareCalculations = (orderData, affiliateData) => {
  const oldMethod = {
    total: orderData.total || orderData.subtotal || 0,
    commission: (orderData.total || orderData.subtotal || 0) * ((affiliateData.commissionRate || 15) / 100)
  };
  
  const newMethod = calculateCommission(orderData, affiliateData);
  
  return {
    old: oldMethod,
    new: newMethod,
    difference: newMethod.commission - oldMethod.commission,
    percentageDifference: oldMethod.commission > 0 ? 
      ((newMethod.commission - oldMethod.commission) / oldMethod.commission) * 100 : 0
  };
}; 

/**
 * Normalize affiliate code for case-insensitive handling
 * Converts to uppercase and trims whitespace for consistent database queries
 * @param {string} code - The affiliate code to normalize
 * @returns {string} - Normalized affiliate code in uppercase
 */
export const normalizeAffiliateCode = (code) => {
  if (!code || typeof code !== 'string') {
    return '';
  }
  return code.trim().toUpperCase();
};

/**
 * Validate affiliate code format
 * Checks if the code follows the expected pattern (e.g., "NAME-123")
 * @param {string} code - The affiliate code to validate
 * @returns {boolean} - True if valid format
 */
export const isValidAffiliateCodeFormat = (code) => {
  if (!code || typeof code !== 'string') {
    return false;
  }
  const normalized = normalizeAffiliateCode(code);
  // Pattern: 1-8 letters, hyphen, 3 digits (e.g., "EMMA-768", "JOHN-123")
  const pattern = /^[A-Z]{1,8}-\d{3}$/;
  return pattern.test(normalized);
}; 