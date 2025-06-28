import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useSimpleAuth } from '../../contexts/SimpleAuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import ShopNavigation from '../../components/shop/ShopNavigation';

const Checkout = () => {
  const { cart, calculateTotals, clearCart } = useCart();
  const { user } = useSimpleAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { subtotal, vat, shipping, total, discountAmount, discountCode, appliedAffiliate } = calculateTotals();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(price);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Du måste vara inloggad för att kunna beställa.');
      navigate('/login?redirect=/checkout');
      return;
    }
    if (cart.items.length === 0) {
      toast.error('Din varukorg är tom.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Lägger din beställning...');

    try {
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        items: cart.items,
        subtotal,
        vat,
        shipping,
        discountAmount,
        total,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        shippingCountry: cart.shippingCountry,
        // Affiliate and discount details
        ...(appliedAffiliate && {
          affiliateCode: appliedAffiliate.code,
          appliedAffiliate: appliedAffiliate,
          discountApplied: discountAmount
        })
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      toast.success(`Tack för din beställning! Ordernummer: ${docRef.id.substring(0, 8).toUpperCase()}`, { id: toastId, duration: 6000 });
      
      clearCart();
      navigate('/account'); // Redirect to account page after successful order

    } catch (error) {
      console.error("Error placing order: ", error);
      toast.error('Ett fel uppstod vid beställningen.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ShopNavigation breadcrumb="Kassa" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Kassa</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Din Beställning</h2>
            <div className="space-y-4">
              {cart.items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{item.name} x {item.quantity}</span>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delsumma</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frakt</span>
                  <span className="font-medium">{formatPrice(shipping)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="font-medium">Rabatt ({discountCode})</span>
                    <span className="font-medium">- {formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-300">
                  <span>Att betala</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Payment Method */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
             <h2 className="text-xl font-semibold text-gray-900 mb-6">Betalning</h2>
             <div className="text-center py-10 bg-gray-100 rounded-xl">
                <p className="text-gray-600">Fullständig betalningsintegration<br/>(Stripe/Klarna) kommer snart.</p>
             </div>
             <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="mt-8 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? 'Bearbetar...' : 'Slutför beställning (Test)'}
              </button>
               <p className="text-xs text-center text-gray-500 mt-4">Genom att klicka på knappen skapas en testorder utan betalning.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 