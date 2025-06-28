import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
    };
    return initialCart;
  });

  useEffect(() => {
    localStorage.setItem('b8shield_cart', JSON.stringify(cart));
  }, [cart]);

  // Effect to auto-apply affiliate discount and recalculate on cart changes
  useEffect(() => {
    // First, check for an affiliate link in localStorage if no discount is applied yet
    const affiliateRef = localStorage.getItem('b8s_affiliate_ref');
    if (affiliateRef && !cart.discountCode) {
      const { code, expiry } = JSON.parse(affiliateRef);
      if (new Date().getTime() < expiry && code) {
        // Affiliate ref exists and is valid, apply it silently
        applyDiscountCode(code, { silent: true });
        return; // Exit here since applyDiscountCode will trigger a state update
      }
    }

    // If a discount code is already applied, just recalculate the discount amount
    if (cart.discountCode) {
      applyDiscountCode(cart.discountCode, { silent: true });
    }
  }, [cart.items]);

  // Calculate shipping cost based on country
  const getShippingCost = (country) => {
    return SHIPPING_COSTS.NORDIC.countries.includes(country)
      ? SHIPPING_COSTS.NORDIC.cost
      : SHIPPING_COSTS.INTERNATIONAL.cost;
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
      discountPercentage: cart.discountPercentage || 0
    };
  };

  const applyDiscountCode = async (code, options = {}) => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      return { success: false, message: 'Ange en kod.' };
    }

    try {
      const affiliatesRef = collection(db, 'affiliates');
      const q = query(affiliatesRef, where("affiliateCode", "==", trimmedCode), where("status", "==", "active"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setCart(prev => ({ ...prev, discountCode: null, discountAmount: 0, discountPercentage: 0 }));
        return { success: false, message: 'Ogiltig rabattkod.' };
      }

      const affiliateDoc = querySnapshot.docs[0];
      const affiliateData = affiliateDoc.data();
      const discountPercentage = affiliateData.checkoutDiscount || 0;
      
      const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discountValue = subtotal * (discountPercentage / 100);

      // Round the discount to the nearest whole number to avoid floating point issues
      const roundedDiscount = Math.round(discountValue);

      setCart(prev => ({
        ...prev,
        discountCode: trimmedCode,
        discountAmount: roundedDiscount,
        discountPercentage: discountPercentage,
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
    }));
  };

  // Add item to cart
  const addToCart = (product, quantity = 1, selectedSize = null) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.items.findIndex(
        item => item.id === product.id && item.size === selectedSize
      );

      const newItems = [...prevCart.items];

      if (existingItemIndex > -1) {
        // Update quantity if item exists
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity
        };
      } else {
        // Add new item
        newItems.push({
          id: product.id,
          name: product.name,
          price: product.b2cPrice || product.basePrice,
          image: product.b2cImageUrl || product.imageUrl,
          size: selectedSize,
          quantity
        });
      }

      return {
        ...prevCart,
        items: newItems
      };
    });
  };

  // Update item quantity
  const updateQuantity = (productId, size, newQuantity) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map(item =>
        item.id === productId && item.size === size
          ? { ...item, quantity: Math.max(0, newQuantity) }
          : item
      ).filter(item => item.quantity > 0) // Remove items with quantity 0
    }));
  };

  // Remove item from cart
  const removeFromCart = (productId, size) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(
        item => !(item.id === productId && item.size === size)
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
    });
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
    SHIPPING_COSTS
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext; 