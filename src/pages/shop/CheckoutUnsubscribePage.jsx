import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { Helmet } from 'react-helmet-async';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { useShopId } from '../../contexts/ShopContext';
import { useTranslation } from '../../contexts/TranslationContext';

/**
 * Checkout-reminder unsubscribe page — /{shopId}/avregistrera/:token.
 *
 * Reached from the one-click List-Unsubscribe / footer link in the abandoned-
 * checkout reminder email. Calls unsubscribeCheckout on mount (idempotent
 * server-side) and confirms. Any failure still shows a generic "you're
 * unsubscribed" — the call is idempotent so re-clicking is harmless.
 * No AddonGate — must work even if the add-on was later disabled.
 */
const CheckoutUnsubscribePage = () => {
  const shopId = useShopId();
  const { token } = useParams();
  const { t } = useTranslation();

  const [done, setDone] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const functions = getFunctions(undefined, 'us-central1');
        const unsubscribeCheckout = httpsCallable(functions, 'unsubscribeCheckout');
        await unsubscribeCheckout({ shopId, token });
      } catch (err) {
        // Idempotent server-side; show the generic confirmation regardless.
        console.warn('unsubscribeCheckout failed (showing generic confirmation)', err?.message);
      } finally {
        setDone(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Helmet>
        <title>{t('checkout_unsub_title', 'Avregistrera påminnelser')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <ShopNavigation />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-tile shadow-xs border border-ink/5 p-8">
          {done ? (
            <>
              <h1 className="font-display text-3xl font-bold text-ink tracking-tight mb-3">
                {t('checkout_unsub_done_title', 'Du är avregistrerad från påminnelser')}
              </h1>
              <p className="text-ink/70 mb-6 leading-relaxed">
                {t('checkout_unsub_done_body', 'Vi skickar inte längre påminnelser om din varukorg. Du kan alltid handla i butiken som vanligt.')}
              </p>
              <a
                href={`/${shopId}`}
                className="inline-block bg-accent text-white px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
              >
                {t('checkout_unsub_back_to_shop', 'Till butiken')}
              </a>
            </>
          ) : (
            <div className="text-center py-6">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-accent" />
              <p className="mt-4 text-ink/70">
                {t('checkout_unsub_loading', 'Avregistrerar…')}
              </p>
            </div>
          )}
        </div>
      </main>

      <ShopFooter />
    </div>
  );
};

export default CheckoutUnsubscribePage;
