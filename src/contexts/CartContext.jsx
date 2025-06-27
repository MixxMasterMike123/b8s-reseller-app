import React, { createContext, useContext, useState, useEffect } from 'react';

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
    // Load cart from localStorage on initial render
    const savedCart = localStorage.getItem('b8shield_cart');
    return savedCart ? JSON.parse(savedCart) : { items: [], shippingCountry: 'SE' };
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('b8shield_cart', JSON.stringify(cart));
  }, [cart]);

  // Calculate shipping cost based on country
  const getShippingCost = (country) => {
    return SHIPPING_COSTS.NORDIC.countries.includes(country)
      ? SHIPPING_COSTS.NORDIC.cost
      : SHIPPING_COSTS.INTERNATIONAL.cost;
  };

  // Calculate VAT (25% in Sweden)
  const calculateVAT = (subtotal) => {
    return subtotal * 0.25;
  };

  // Calculate cart totals
  const calculateTotals = () => {
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const vat = calculateVAT(subtotal);
    const shipping = getShippingCost(cart.shippingCountry);
    const total = subtotal + shipping;

    return {
      subtotal,
      vat,
      shipping,
      total
    };
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
    setCart({ items: [], shippingCountry: 'SE' });
  };

  const value = {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    updateShippingCountry,
    clearCart,
    calculateTotals,
    SHIPPING_COSTS
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext; 