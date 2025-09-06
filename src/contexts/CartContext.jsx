import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { calculateCommission, normalizeAffiliateCode } from '../utils/affiliateCalculations';
import { getProductImage } from '../utils/productImages';

// Shipping cost constants
export const SHIPPING_COSTS = {
  NORDIC: {
    cost: 19,
    countries: ['SE', 'NO', 'DK', 'FI', 'IS'], // Sweden, Norway, Denmark, Finland, Iceland
    label: 'Norden'
  },
  INTERNATIONAL: {
    cost: 59,
    label: 'Internationellt'
  }
};

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('b8shield_cart');
    const initialCart = savedCart ? JSON.parse(savedCart) : { 
      items: [], 
      shippingCountry: 'SE',
      discountCode: null,
      discountAmount: 0,
      discountPercentage: 0,
      affiliateClickId: null,
    };
    return initialCart;
  });

  // Modal state for "Added to Cart" modal
  const [isAddedToCartModalVisible, setIsAddedToCartModalVisible] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);

  useEffect(() => {
    localStorage.setItem('b8shield_cart', JSON.stringify(cart));
  }, [cart]);

  // Effect to auto-apply affiliate discount and recalculate on cart changes
  useEffect(() => {
    const checkAndApplyAffiliateCode = () => {
      const affiliateRef = localStorage.getItem('b8s_affiliate_ref');
      if (affiliateRef) {
        try {
          const affiliateInfo = JSON.parse(affiliateRef);
          // Ensure the object has the properties we expect
          if (affiliateInfo && affiliateInfo.code && typeof affiliateInfo.expiry === 'number') {
            if (new Date().getTime() < affiliateInfo.expiry) {
              // Check if this is a different code than currently applied
              if (cart.discountCode !== affiliateInfo.code) {
                console.log(`🔄 Applying new affiliate code: ${affiliateInfo.code} (was: ${cart.discountCode || 'none'})`);
                applyDiscountCode(affiliateInfo.code, { silent: true });
                return;
              }
            } else {
              // It's expired, remove it
              console.log('🕒 Affiliate code expired, removing');
              localStorage.removeItem('b8s_affiliate_ref');
              if (cart.discountCode) {
                removeDiscount();
              }
            }
          } else {
            // Malformed object, remove it
            console.warn('🚨 Malformed affiliate data, removing');
            localStorage.removeItem('b8s_affiliate_ref');
            if (cart.discountCode) {
              removeDiscount();
            }
          }
        } catch (error) {
          // Not valid JSON, remove it
          console.error("❌ Error parsing affiliate ref from localStorage:", error);
          localStorage.removeItem('b8s_affiliate_ref');
          if (cart.discountCode) {
            removeDiscount();
          }
        }
      } else if (cart.discountCode) {
        // No affiliate ref but discount is applied - this shouldn't happen, clear it
        console.log('🧹 No affiliate ref found but discount applied, clearing');
        removeDiscount();
      }

      // If a discount code is already applied, just recalculate the discount amount
      if (cart.discountCode) {
        applyDiscountCode(cart.discountCode, { silent: true });
      }
    };

    checkAndApplyAffiliateCode();
  }, [cart.items]);

  // Listen for storage events to handle affiliate code changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'b8s_affiliate_ref') {
        console.log('📡 Affiliate code changed in storage, re-checking');
        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          const affiliateRef = localStorage.getItem('b8s_affiliate_ref');
          if (affiliateRef) {
            try {
              const affiliateInfo = JSON.parse(affiliateRef);
              if (affiliateInfo && affiliateInfo.code && cart.discountCode !== affiliateInfo.code) {
                console.log(`🔄 Storage event: Applying affiliate code ${affiliateInfo.code}`);
                applyDiscountCode(affiliateInfo.code, { silent: true });
              }
            } catch (error) {
              console.error('❌ Error parsing affiliate code from storage event:', error);
            }
          }
        }, 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [cart.discountCode]);

  // Get shipping region name for display
  const getShippingRegion = (country) => {
    if (country === 'SE') {
      return 'Sverige';
    } else if (SHIPPING_COSTS.NORDIC.countries.includes(country)) {
      return 'Norden';
    } else {
      const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES'];
      return euCountries.includes(country) ? 'EU' : 'Världen';
    }
  };

  // Calculate shipping cost based on total weight (weight-based PostNord tiers)
  const getShippingCost = (country) => {
    // If no items in cart, return 0
    if (!cart.items || cart.items.length === 0) {
      return 0;
    }

    // Calculate total product weight from all items
    const totalProductWeight = cart.items.reduce((sum, item) => {
      const itemWeight = item.weight?.value || 10; // Default 10g for single pack if weight missing
      return sum + (itemWeight * item.quantity);
    }, 0);
    
    // Add envelope/packaging weight (20g constant)
    const totalWeight = totalProductWeight + 20;
    
    // Calculate shipping tiers (every 50g = 1 tier, matching PostNord weight limits)
    const shippingTiers = Math.ceil(totalWeight / 50);

    // Base shipping cost per tier (simplified, no product overrides)
    const baseShippingCost = country === 'SE' ? 29 : 49;

    // Log weight calculation for debugging (remove in production if needed)
    console.log(`📦 Weight-based shipping calculation:`, {
      country,
      items: cart.items.map(item => ({ 
        name: item.name, 
        weight: item.weight?.value || 10, 
        quantity: item.quantity,
        totalWeight: (item.weight?.value || 10) * item.quantity
      })),
      totalProductWeight,
      envelopeWeight: 20,
      totalWeight,
      shippingTiers,
      baseShippingCost,
      totalShippingCost: shippingTiers * baseShippingCost
    });

    // Return base shipping cost multiplied by number of tiers
    return shippingTiers * baseShippingCost;
  };

  // Get total number of items in cart
  const getTotalItems = () => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  // Get shipping tier information for display (weight-based)
  const getShippingTierInfo = (country) => {
    // If no items in cart, return zero values
    if (!cart.items || cart.items.length === 0) {
      return {
        totalQuantity: 0,
        totalWeight: 0,
        shippingTiers: 0,
        baseShippingCost: country === 'SE' ? 29 : 49,
        totalShippingCost: 0,
        explanation: 'Ingen frakt - tom varukorg'
      };
    }

    const totalQuantity = getTotalItems();
    
    // Calculate total weight (same logic as getShippingCost)
    const totalProductWeight = cart.items.reduce((sum, item) => {
      const itemWeight = item.weight?.value || 10;
      return sum + (itemWeight * item.quantity);
    }, 0);
    
    const totalWeight = totalProductWeight + 20; // +envelope
    const shippingTiers = Math.ceil(totalWeight / 50);
    const baseShippingCost = country === 'SE' ? 29 : 49;
    
    return {
      totalQuantity,
      totalWeight,
      shippingTiers,
      baseShippingCost,
      totalShippingCost: baseShippingCost * shippingTiers,
      explanation: `Frakt (${getShippingRegion(country)})`
    };
  };

  // Modal functions
  const showAddedToCartModal = (item) => {
    setLastAddedItem(item);
    setIsAddedToCartModalVisible(true);
  };

  const hideAddedToCartModal = () => {
    setIsAddedToCartModalVisible(false);
    setLastAddedItem(null);
  };

  // Calculate cart totals based on VAT-inclusive prices
  const calculateTotals = () => {
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const shipping = getShippingCost(cart.shippingCountry);
    const discountAmount = cart.discountAmount || 0;

    // Final total is the sum of VAT-inclusive prices (items + shipping) minus discount
    const total = subtotal - discountAmount + shipping;

    // The VAT is the portion of the final total that is tax.
    // It's not added to the total, but extracted from it.
    // Formula: Total - (Total / 1.25)
    const vat = total - (total / 1.25);

    return {
      subtotal,
      vat,
      shipping,
      total,
      discountAmount,
      discountCode: cart.discountCode,
      discountPercentage: cart.discountPercentage || 0,
      // Include affiliate data if present
      ...(cart.discountCode && {
        affiliateCode: cart.discountCode,
        affiliateClickId: cart.affiliateClickId
      })
    };
  };

  const applyDiscountCode = async (code, options = {}) => {
    const normalizedCode = normalizeAffiliateCode(code);
    if (!normalizedCode) {
      return { success: false, message: 'Ange en kod.' };
    }

    try {
      const affiliatesRef = collection(db, 'affiliates');
      const affiliateQuery = query(affiliatesRef, where("affiliateCode", "==", normalizedCode), where("status", "==", "active"));
      const querySnapshot = await getDocs(affiliateQuery);

      if (querySnapshot.empty) {
        setCart(prev => ({ ...prev, discountCode: null, discountAmount: 0, discountPercentage: 0, affiliateClickId: null }));
        return { success: false, message: 'Ogiltig rabattkod.' };
      }

      const affiliateDoc = querySnapshot.docs[0];
      const affiliateData = affiliateDoc.data();
      const discountPercentage = affiliateData.checkoutDiscount || 0;
      
      const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discountValue = subtotal * (discountPercentage / 100);

      // Use Math.ceil to ensure small discounts (like 0.2 SEK) are not rounded to 0
      // This ensures customers always get their discount, even if it's small
      const roundedDiscount = Math.ceil(discountValue);

      // Get the affiliate click ID from localStorage
      let affiliateClickId = null;
      const affiliateRef = localStorage.getItem('b8s_affiliate_ref');
      if (affiliateRef) {
        try {
          const affiliateInfo = JSON.parse(affiliateRef);
          if (affiliateInfo && affiliateInfo.clickId) {
            affiliateClickId = affiliateInfo.clickId;
          }
        } catch (error) {
          console.error("Error parsing affiliate click ID:", error);
        }
      }

      setCart(prev => ({
        ...prev,
        discountCode: normalizedCode,
        discountAmount: roundedDiscount,
        discountPercentage: discountPercentage,
        affiliateClickId: affiliateClickId,
      }));
      
      if (!options.silent) {
        return { success: true, message: `Rabatt på ${discountPercentage}% tillämpad!` };
      }
      return { success: true };

    } catch (error) {
      console.error("Error applying discount code:", error);
      if (!options.silent) {
        return { success: false, message: 'Ett fel uppstod. Försök igen.' };
      }
      return { success: false };
    }
  };
  
  const removeDiscount = () => {
    setCart(prev => ({
      ...prev,
      discountCode: null,
      discountAmount: 0,
      discountPercentage: 0,
      affiliateClickId: null,
    }));
  };

  // Get the best available image for B2C display (same logic as PublicStorefront)
  const getB2cProductImage = (product) => {
    // Priority: B2C main image > B2C gallery first image > generated image
    if (product.b2cImageUrl) return product.b2cImageUrl;
    if (product.b2cImageGallery && product.b2cImageGallery.length > 0) return product.b2cImageGallery[0];
    
    // Generate consumer-focused image if no B2C images available
    return getProductImage(product); // Pass the product object to use color field
  };

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.items.findIndex(
        item => item.id === product.id
      );

      const newItems = [...prevCart.items];
      let addedItem = null;

      if (existingItemIndex > -1) {
        // Update quantity and refresh data if item exists
        const existingItem = newItems[existingItemIndex];
        newItems[existingItemIndex] = {
          // Overwrite with fresh product data to prevent stale fields
          id: product.id,
          name: product.name,
          price: product.b2cPrice || product.basePrice,
          image: getB2cProductImage(product),
          sku: product.sku,
          color: product.color,
          size: product.size,
          weight: product.weight, // Include weight for shipping calculations
          shipping: product.shipping, // Include shipping information
          // And update the quantity
          quantity: existingItem.quantity + quantity
        };
        addedItem = {
          ...newItems[existingItemIndex],
          quantity: quantity, // Show only the quantity that was just added
          formattedPrice: `${product.b2cPrice || product.basePrice} kr`
        };
      } else {
        // Add new item
        const newItem = {
          id: product.id,
          name: product.name,
          price: product.b2cPrice || product.basePrice,
          image: getB2cProductImage(product),
          sku: product.sku,
          color: product.color,
          size: product.size,
          weight: product.weight, // Include weight for shipping calculations
          shipping: product.shipping, // Include shipping information
          quantity
        };
        newItems.push(newItem);
        addedItem = {
          ...newItem,
          formattedPrice: `${product.b2cPrice || product.basePrice} kr`
        };
      }

      // Show the "Added to Cart" modal
      setTimeout(() => {
        showAddedToCartModal(addedItem);
      }, 100); // Small delay to ensure state is updated

      return {
        ...prevCart,
        items: newItems
      };
    });
  };

  // Update item quantity
  const updateQuantity = (productId, newQuantity) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map(item =>
        item.id === productId
          ? { ...item, quantity: Math.max(0, newQuantity) }
          : item
      ).filter(item => item.quantity > 0) // Remove items with quantity 0
    }));
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(
        item => !(item.id === productId)
      )
    }));
  };

  // Update shipping country
  const updateShippingCountry = (country) => {
    setCart(prevCart => ({
      ...prevCart,
      shippingCountry: country
    }));
  };

  // Clear cart
  const clearCart = () => {
    setCart({ 
      items: [], 
      shippingCountry: 'SE',
      discountCode: null,
      discountAmount: 0,
      discountPercentage: 0,
      affiliateClickId: null,
    });
  };

  const previewCommission = (affiliateRate = 15) => {
    const totals = calculateTotals();
    const mockOrder = { subtotal: totals.subtotal, discountAmount: totals.discountAmount, shipping: totals.shipping };
    const mockAffiliate = { commissionRate: affiliateRate };
    const { commission } = calculateCommission(mockOrder, mockAffiliate);
    return commission;
  };

  const value = {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    updateShippingCountry,
    clearCart,
    calculateTotals,
    applyDiscountCode,
    removeDiscount,
    getTotalItems,
    getShippingRegion,
    getShippingTierInfo,
    SHIPPING_COSTS,
    isAddedToCartModalVisible,
    showAddedToCartModal,
    hideAddedToCartModal,
    lastAddedItem,
    previewCommission
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext; 