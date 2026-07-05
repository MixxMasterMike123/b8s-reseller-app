import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { normalizeAffiliateCode } from '../utils/affiliateCalculations';
import { getProductImage } from '../utils/productImages';
import { STORE } from '../config/store';
import { useShopFeatures } from './ShopFeaturesContext';
import { useShopId } from './ShopContext';

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

// Cart persistence is PER SHOP: every storefront shares one origin
// (shop-meteorpr.web.app/{shopId}), so a shop-agnostic localStorage key would
// leak one shop's cart into another shop's checkout. Exported so the two other
// direct cart-storage touchpoints (AffiliateTracker discount-clear, Checkout
// debug panel) key the same way.
export const cartStorageKey = (shopId) => `b8shield_cart_${shopId || 'default'}`;

const emptyCart = () => ({
  items: [],
  shippingCountry: 'SE',
  discountCode: null,
  discountAmount: 0,
  discountPercentage: 0,
  affiliateClickId: null,
});

export const loadStoredCart = (shopId) => {
  try {
    const saved = localStorage.getItem(cartStorageKey(shopId));
    return saved ? JSON.parse(saved) : emptyCart();
  } catch {
    return emptyCart();
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
  // Affiliate add-on gate (default-ON). When the active shop has affiliate
  // disabled, NO checkout discount is applied — this MUST match the server gate
  // in createPaymentIntent.computeOrderTotalsSek or the displayed total and the
  // Stripe charge diverge (total-parity). See P4.5b plan.
  const { isEnabled: isAddonEnabled } = useShopFeatures();
  // The active storefront shop (resolved from the URL via ShopContext). Passed
  // to validateDiscountCode so the affiliate-code lookup is scoped to this shop
  // (tenant isolation — codes are unique only within a shop).
  const shopId = useShopId();
  const [cart, setCart] = useState(() => loadStoredCart(shopId));
  // Which shop the in-memory cart belongs to. On an in-SPA navigation to a
  // DIFFERENT shop we swap state to that shop's saved cart; the ref gates the
  // save effect during the swap so shop A's cart is never written under shop
  // B's key (see effect ordering below).
  const cartShopRef = useRef(shopId);

  // Modal state for "Added to Cart" modal
  const [isAddedToCartModalVisible, setIsAddedToCartModalVisible] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);

  // Delivery method (Click & Collect). A checkout-session choice, deliberately
  // NOT persisted with the cart — it resets to home delivery on reload so a
  // stale pickup selection can never silently zero shipping. 'home' | 'pickup'.
  // When 'pickup', calculateTotals() drops shipping to 0 and the server mirrors
  // it (createPaymentIntent honors deliveryMethod), keeping client + charge in
  // agreement. pickupLocation holds the chosen { id, name, address }.
  const [deliveryMethod, setDeliveryMethod] = useState('home');
  const [pickupLocation, setPickupLocation] = useState(null);
  // The chosen pickup date (ISO YYYY-MM-DD), when the selected location offers
  // specific dates. Session-only like deliveryMethod/pickupLocation. Cleared
  // when leaving pickup or switching location (a date belongs to one location).
  const [pickupDate, setPickupDate] = useState('');

  // Memoized so consumers (Checkout effects) get a stable reference and don't
  // re-run effects on every CartContext render.
  const selectHomeDelivery = useCallback(() => {
    setDeliveryMethod('home');
    setPickupLocation(null);
    setPickupDate('');
  }, []);
  const selectPickup = useCallback((location) => {
    setDeliveryMethod('pickup');
    setPickupLocation((prev) => {
      // Switching to a different location invalidates a previously chosen date.
      if (!location || prev?.id !== location.id) setPickupDate('');
      return location || null;
    });
  }, []);

  // Delivery & Pickup v2: which delivery methods the WHOLE cart allows, derived
  // from each item's per-product delivery flags (default-ON: an item without the
  // field, incl. legacy line items saved before this feature, permits both). A
  // method is allowed only if EVERY item permits it.
  //  • home allowed   ⇔ every item is shippable
  //  • pickup allowed ⇔ every item is pickup-eligible (the SHOP must also have
  //    pickup locations — Checkout AND-combines this with pickupLocations.length)
  // When NEITHER is allowed the cart is a conflicting mix (e.g. a shipping-only
  // item + a pickup-only item): Checkout blocks it (no single method works).
  const cartAllowsHome = cart.items.length > 0 && cart.items.every((i) => i.delivery?.shipping !== false);
  const cartAllowsPickup = cart.items.length > 0 && cart.items.every((i) => i.delivery?.pickup !== false);
  // A non-empty cart where no single method serves every item.
  const hasDeliveryConflict = cart.items.length > 0 && !cartAllowsHome && !cartAllowsPickup;

  // If the current method becomes disallowed (cart changed), switch to an allowed
  // one so a stale 'pickup' can't carry a shipping-only cart (or vice-versa).
  // Only auto-corrects between the two product-level options; the shop-level
  // pickup-locations gate lives in Checkout (which never selects pickup without a
  // location). A conflicting cart is left as-is for Checkout to block.
  useEffect(() => {
    if (cart.items.length === 0 || hasDeliveryConflict) return;
    if (deliveryMethod === 'pickup' && !cartAllowsPickup) {
      setDeliveryMethod('home');
      setPickupLocation(null);
    } else if (deliveryMethod === 'home' && !cartAllowsHome && cartAllowsPickup) {
      // The cart is pickup-only; switch to pickup. Location is chosen in Checkout.
      setDeliveryMethod('pickup');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartAllowsHome, cartAllowsPickup, hasDeliveryConflict, deliveryMethod, cart.items.length]);

  // Persist the cart under the ACTIVE shop's key. Declared BEFORE the shop-swap
  // effect on purpose: when shopId changes, this runs first in the same commit
  // with the ref still pointing at the OLD shop → the guard skips the write, so
  // the old cart can't land under the new shop's key. The swap effect then
  // updates the ref + loads the new shop's cart; the follow-up render re-saves
  // it to its own key (harmless no-op).
  useEffect(() => {
    if (cartShopRef.current !== shopId) return;
    localStorage.setItem(cartStorageKey(shopId), JSON.stringify(cart));
  }, [cart, shopId]);

  // Swap cart state when the active shop changes (per-shop cart isolation).
  useEffect(() => {
    if (cartShopRef.current === shopId) return;
    cartShopRef.current = shopId;
    setCart(loadStoredCart(shopId));
  }, [shopId]);

  // One-time cleanup of the pre-fix shop-agnostic key. Intentionally NOT
  // migrated: a legacy cart can't be attributed to a shop, and mis-assigning it
  // would recreate the exact cross-shop leak this keying closes.
  useEffect(() => {
    localStorage.removeItem('b8shield_cart');
  }, []);

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
                applyDiscountCode(affiliateInfo.code, { silent: true, source: 'link' });
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
      } else if (cart.discountCode && cart.discountSource !== 'manual' && cart.discountSource !== 'campaign') {
        // No affiliate ref but an auto-applied affiliate discount remains - clear
        // it. Manually entered codes AND campaign ("Rabattkoder") codes are kept;
        // neither depends on the affiliate ref in localStorage.
        console.log('🧹 No affiliate ref found but auto-applied discount remains, clearing');
        removeDiscount();
      }

      // If a discount code is already applied, just recalculate the discount amount
      if (cart.discountCode) {
        applyDiscountCode(cart.discountCode, { silent: true, source: cart.discountSource });
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
                applyDiscountCode(affiliateInfo.code, { silent: true, source: 'link' });
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

  // Calculate shipping cost using product shipping data (not hardcoded)
  const getShippingCost = (country) => {
    // If no items in cart, return 0
    if (!cart.items || cart.items.length === 0) {
      return 0;
    }

    // Get the shipping region for the country
    const getShippingRegion = (country) => {
      if (country === 'SE') return 'sweden';
      if (['NO', 'DK', 'FI'].includes(country)) return 'nordic';
      
      const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES'];
      if (euCountries.includes(country)) return 'eu';
      
      return 'worldwide';
    };

    const shippingRegion = getShippingRegion(country);
    
    // Get base shipping cost from FIRST product in cart
    const firstProduct = cart.items[0];
    let baseShippingCost = firstProduct?.shipping?.[shippingRegion]?.cost || 0;

    // Fallback to old hardcoded values if no product shipping data
    if (baseShippingCost === 0) {
      baseShippingCost = country === 'SE' ? 29 : 49;
      console.warn(`⚠️ No product shipping data found for ${shippingRegion}, using fallback: ${baseShippingCost} SEK`);
    }

    // Calculate total weight for shipping tiers
    const totalProductWeight = cart.items.reduce((sum, item) => {
      const itemWeight = item.weight?.value || 10; // Default 10g for single pack if weight missing
      return sum + (itemWeight * item.quantity);
    }, 0);
    
    // Add envelope/packaging weight (20g constant)
    const totalWeight = totalProductWeight + 20;
    
    // Calculate shipping tiers (every 50g = 1 tier, matching PostNord weight limits)
    const shippingTiers = Math.ceil(totalWeight / 50);

    // Final shipping cost = base cost from first product * weight tiers
    const totalShippingCost = baseShippingCost * shippingTiers;

    // Enhanced logging for debugging shipping issues
    console.log(`🚚 ENHANCED SHIPPING DEBUG:`, {
      country,
      shippingRegion,
      firstProduct: {
        name: firstProduct?.name,
        id: firstProduct?.id,
        fullShippingData: firstProduct?.shipping,
        specificRegionData: firstProduct?.shipping?.[shippingRegion],
        baseShippingCost: baseShippingCost
      },
      allCartItems: cart.items.map(item => ({
        name: item.name,
        id: item.lineId,
        weight: item.weight?.value || 10,
        quantity: item.quantity,
        hasShippingData: !!item.shipping,
        shippingData: item.shipping,
        regionCost: item.shipping?.[shippingRegion]?.cost
      })),
      calculation: {
        totalProductWeight,
        envelopeWeight: 20,
        totalWeight,
        shippingTiers,
        baseShippingCost,
        totalShippingCost
      }
    });

    return totalShippingCost;
  };

  // Get total number of items in cart
  const getTotalItems = () => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  // Get shipping tier information for display (product-based)
  const getShippingTierInfo = (country) => {
    // If no items in cart, return zero values
    if (!cart.items || cart.items.length === 0) {
      return {
        totalQuantity: 0,
        totalShippingCost: 0,
        explanation: 'Ingen frakt - tom varukorg'
      };
    }

    const totalQuantity = getTotalItems();
    const shippingCost = getShippingCost(country);
    
    // Get the shipping region for the country
    const getShippingRegion = (country) => {
      if (country === 'SE') return 'sweden';
      if (['NO', 'DK', 'FI'].includes(country)) return 'nordic';
      
      const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES'];
      if (euCountries.includes(country)) return 'eu';
      
      return 'worldwide';
    };

    const regionName = getShippingRegion(country);
    
    return {
      totalQuantity,
      totalShippingCost: shippingCost,
      explanation: `Frakt (${regionName})`
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

    // Click & Collect: no shipping cost. The server (createPaymentIntent)
    // applies the same rule, so the client total and the charge agree.
    const shipping = deliveryMethod === 'pickup' ? 0 : getShippingCost(cart.shippingCountry);
    const discountAmount = cart.discountAmount || 0;

    // Final total is the sum of VAT-inclusive prices (items + shipping) minus discount
    const total = subtotal - discountAmount + shipping;

    // The VAT is the portion of the final total that is tax.
    // It's not added to the total, but extracted from it.
    // Formula: Total - (Total / (1 + vatRate)) — rate from store config
    const vat = total - (total / (1 + STORE.vatRate));

    return {
      subtotal,
      vat,
      shipping,
      total,
      discountAmount,
      discountCode: cart.discountCode,
      discountPercentage: cart.discountPercentage || 0,
      // Which add-on the applied code belongs to ('affiliate' | 'campaign' |
      // 'manual' | 'link' | null) — drives source-aware UI labels in the cart +
      // checkout summaries. No math change.
      discountSource: cart.discountSource || null,
      // Include affiliate data if present
      ...(cart.discountCode && {
        affiliateCode: cart.discountCode,
        affiliateClickId: cart.affiliateClickId
      })
    };
  };

  const applyDiscountCode = async (code, options = {}) => {
    // BOTH discount add-ons OFF for this shop → never apply a discount. Clear any
    // stale discount fields so the client total is full price, matching the
    // server (which also ignores the code when both are off). This is the single
    // client chokepoint — manual entry + both auto-apply paths route here. The
    // callable itself decides WHICH add-on a code belongs to (affiliate vs
    // campaign) and only validates it if that add-on is enabled server-side.
    if (!isAddonEnabled('affiliate') && !isAddonEnabled('discountCodes')) {
      setCart(prev => (
        prev.discountCode || prev.discountAmount
          ? { ...prev, discountCode: null, discountAmount: 0, discountPercentage: 0, affiliateClickId: null, discountSource: null }
          : prev
      ));
      return { success: false, message: 'Rabattkoder är inte tillgängliga.' };
    }

    const normalizedCode = normalizeAffiliateCode(code);
    if (!normalizedCode) {
      return { success: false, message: 'Ange en kod.' };
    }

    try {
      // Validate server-side: anonymous visitors must not read affiliate or
      // discountCode docs directly (affiliate docs contain PII/earnings; the
      // discountCodes collection has no public read). The callable returns a
      // discriminated result (source: 'affiliate' | 'campaign').
      const validate = httpsCallable(getFunctions(), 'validateDiscountCode');
      const { data: validation } = await validate({ code: normalizedCode, shopId });

      if (!validation?.valid) {
        setCart(prev => ({ ...prev, discountCode: null, discountAmount: 0, discountPercentage: 0, affiliateClickId: null, discountSource: null }));
        return { success: false, message: 'Ogiltig rabattkod.' };
      }

      const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // ── Campaign discount code ("Rabattkoder" add-on) ──────────────────────
      // The discount MATH here MUST be byte-equivalent to the server in
      // createPaymentIntent.computeOrderTotalsSek (campaign branch), or the
      // displayed total diverges from the Stripe charge (total-parity).
      if (validation.source === 'campaign') {
        // Minimum purchase amount: compared against the FULL cart subtotal (not
        // the scoped base). Matches the server computeOrderTotalsSek check.
        const minSpend = typeof validation.minSpend === 'number' ? validation.minSpend : null;
        if (minSpend !== null && subtotal < minSpend) {
          setCart(prev => ({ ...prev, discountCode: null, discountAmount: 0, discountPercentage: 0, affiliateClickId: null, discountSource: null }));
          if (!options.silent) {
            return { success: false, message: `Koden gäller vid köp över ${minSpend} kr.` };
          }
          return { success: false };
        }

        // Scope-aware discountable BASE — MUST match the server exactly:
        //   scope 'all'      → whole subtotal
        //   scope 'products' → sum of lines whose productId ∈ productIds
        const scope = validation.scope === 'products' ? 'products' : 'all';
        const productIds = Array.isArray(validation.productIds) ? validation.productIds : [];
        const base = scope === 'products'
          ? cart.items.reduce((sum, item) =>
              sum + (productIds.includes(item.productId || item.id) ? item.price * item.quantity : 0), 0)
          : subtotal;
        const value = Number(validation.value) || 0;
        let discountAmount = 0;
        let discountPercentage = 0;
        if (validation.type === 'fixed') {
          // Math.min(value, base) clamps the fixed discount to the base — matches server
          discountAmount = Math.min(value, base);
        } else {
          // Math.ceil(base * value/100) matches the server-side rounding
          discountAmount = Math.ceil(base * (value / 100));
          discountPercentage = value; // percent only; fixed leaves this 0
        }

        setCart(prev => ({
          ...prev,
          discountCode: normalizedCode,
          discountAmount,
          discountPercentage,
          affiliateClickId: null, // campaign codes carry no affiliate attribution
          discountSource: 'campaign',
        }));

        if (!options.silent) {
          const label = validation.type === 'fixed' ? `${value} kr` : `${value}%`;
          return { success: true, message: `Rabatt på ${label} tillämpad!` };
        }
        return { success: true };
      }

      // ── Affiliate code (existing path) ─────────────────────────────────────
      const discountPercentage = validation.checkoutDiscount || 0;
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
        discountSource: options.source || 'manual',
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
      discountSource: null,
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

  // Add item to cart. Product model v2: an optional `variant` ({sku,label,price})
  // selected on the product page. The line item carries the product id PLUS the
  // chosen variant's sku/label/price; the dedup key is productId + variantSku so
  // two variants of the same product are separate lines. The server reprices from
  // the parent product doc (variant resolved by sku), so price here is display.
  const addToCart = (product, quantity = 1, variant = null) => {
    const variantSku = variant?.sku || null;
    const lineId = `${product.id}::${variantSku || ''}`;
    const unitPrice = (variant && (variant.price ?? null) !== null)
      ? variant.price
      : (product.b2cPrice || product.basePrice);

    const buildItem = (qty) => ({
      lineId,
      productId: product.id,
      variantSku,
      label: variant?.label || null,
      name: product.name,
      price: unitPrice,
      image: variant?.image || getB2cProductImage(product),
      sku: variant?.sku || product.sku,
      weight: product.weight,       // shipping calc (product-level)
      shipping: product.shipping,   // shipping calc (product-level)
      // Per-product delivery modes (Delivery & Pickup v2). Default-ON: a product
      // without the field is both shippable and pickup-eligible. The cart derives
      // which delivery methods the whole cart allows from this (see
      // cartAllowsHome / cartAllowsPickup); the server re-checks the live product.
      delivery: {
        shipping: product.delivery?.shipping !== false,
        pickup: product.delivery?.pickup !== false,
      },
      // Right-of-withdrawal (POD): true = specialtillverkad, no 14-day withdrawal.
      // Carried so the checkout can gate on a required consent (the server
      // re-derives the canonical flag from the live product at order time).
      isPersonalized: product.isPersonalized === true,
      quantity: qty,
    });

    setCart(prevCart => {
      const idx = prevCart.items.findIndex((item) => (item.lineId || `${item.productId || item.id}::${item.variantSku || ''}`) === lineId);
      const newItems = [...prevCart.items];
      let addedItem;

      if (idx > -1) {
        const merged = buildItem(newItems[idx].quantity + quantity);
        newItems[idx] = merged;
        addedItem = { ...merged, quantity, formattedPrice: `${unitPrice} kr` };
      } else {
        const item = buildItem(quantity);
        newItems.push(item);
        addedItem = { ...item, formattedPrice: `${unitPrice} kr` };
      }

      setTimeout(() => showAddedToCartModal(addedItem), 100);
      return { ...prevCart, items: newItems };
    });
  };

  // Update item quantity
  // Cart items are identified by lineId (productId::variantSku).
  const updateQuantity = (lineId, newQuantity) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.map(item =>
        item.lineId === lineId
          ? { ...item, quantity: Math.max(0, newQuantity) }
          : item
      ).filter(item => item.quantity > 0) // Remove items with quantity 0
    }));
  };

  // Remove item from cart
  const removeFromCart = (lineId) => {
    setCart(prevCart => ({
      ...prevCart,
      items: prevCart.items.filter(item => item.lineId !== lineId)
    }));
  };

  // Reconcile persisted cart lines against LIVE product docs. localStorage
  // carts outlive admin edits: a renamed size or deleted variant leaves a
  // variantSku the server rejects at payment ("Unknown variant"), dead-ending
  // checkout. Missing products/variants are dropped; surviving lines refresh
  // price/label/image so the display matches what the server will charge.
  // Returns the display names of removed lines (for a toast).
  const reconcileCart = (productsById) => {
    const removed = [];
    let mutated = false;
    const items = [];
    for (const item of cart.items) {
      const product = productsById[item.productId || item.id];
      if (product === undefined) { items.push(item); continue; } // not fetched — leave untouched
      const displayName = item.label ? `${typeof item.name === 'string' ? item.name : ''} (${item.label})` : (typeof item.name === 'string' ? item.name : item.sku || '');
      if (!product || product.isActive === false || product.availability?.b2c === false) {
        removed.push(displayName);
        mutated = true;
        continue;
      }
      const row = item.variantSku && Array.isArray(product.variants)
        ? product.variants.find((v) => v && v.sku === item.variantSku)
        : null;
      if (item.variantSku && !row) {
        removed.push(displayName);
        mutated = true;
        continue;
      }
      const livePrice = row
        ? ((row.price ?? null) !== null ? row.price : (product.b2cPrice || product.basePrice))
        : (product.b2cPrice || product.basePrice);
      const next = {
        ...item,
        price: livePrice > 0 ? livePrice : item.price,
        label: row ? (row.label || item.label) : item.label,
        image: (row && row.image) ? row.image : item.image,
      };
      if (next.price !== item.price || next.label !== item.label || next.image !== item.image) mutated = true;
      items.push(next);
    }
    if (mutated) setCart((prev) => ({ ...prev, items }));
    return removed;
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
    // Reset the delivery choice so it never carries into a fresh cart.
    setDeliveryMethod('home');
    setPickupLocation(null);
    setPickupDate('');
  };

  const value = {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    updateShippingCountry,
    reconcileCart,
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
    // Delivery method (Click & Collect)
    deliveryMethod,
    pickupLocation,
    pickupDate,
    setPickupDate,
    selectHomeDelivery,
    selectPickup,
    // Per-product delivery modes (Delivery & Pickup v2) — cart-level allowance
    cartAllowsHome,
    cartAllowsPickup,
    hasDeliveryConflict,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext; 