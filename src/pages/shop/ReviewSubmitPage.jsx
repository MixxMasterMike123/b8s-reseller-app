import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { Helmet } from 'react-helmet-async';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import { useShopId } from '../../contexts/ShopContext';
import { useTranslation } from '../../contexts/TranslationContext';

/**
 * Review submit page — /{shopId}/recensera/:token.
 *
 * Reached from the review-request email. On mount it resolves the request
 * server-side (resolveReviewRequest — returns only line refs + which products are
 * already reviewed, NO PII). For each not-yet-reviewed product it shows a star
 * input + optional text + name field; the buyer submits each product's review
 * independently (submitReview). Already-reviewed products render as done.
 *
 * States: loading → (invalid → shop home) | (expired → friendly panel) |
 * (open → form; when every product is reviewed → success panel). Works even if
 * the add-on was later disabled (no AddonGate) — the link must never dead-end.
 */

// Interactive 1–5 star input (accessible buttons).
const StarInput = ({ value, onChange, label }) => (
  <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        aria-label={`${n}`}
        onClick={() => onChange(n)}
        className={`text-3xl leading-none transition-colors ${
          n <= value ? 'text-accent' : 'text-ink/20 hover:text-ink/40'
        }`}
      >
        ★
      </button>
    ))}
  </div>
);

const ReviewSubmitPage = () => {
  const shopId = useShopId();
  const { token } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  const [status, setStatus] = useState('loading'); // loading | expired | open | error
  const [items, setItems] = useState([]);
  const [reviewedIds, setReviewedIds] = useState([]);
  // Per-product form state, keyed by productId.
  const [forms, setForms] = useState({}); // { [pid]: { rating, text, name, anonymous, submitting } }

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const functions = getFunctions(undefined, 'us-central1');
        const resolveReviewRequest = httpsCallable(functions, 'resolveReviewRequest');
        const res = await resolveReviewRequest({ shopId, token });
        const data = res?.data || {};

        if (data.status === 'invalid') {
          navigate(`/${shopId}`, { replace: true });
          return;
        }
        if (data.status === 'expired') {
          setStatus('expired');
          return;
        }
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
        setReviewedIds(Array.isArray(data.reviewedProductIds) ? data.reviewedProductIds : []);
        const initial = {};
        list.forEach((it) => {
          initial[it.productId] = { rating: 0, text: '', name: '', anonymous: false, submitting: false };
        });
        setForms(initial);
        setStatus('open');
      } catch (err) {
        console.error('resolveReviewRequest failed', err);
        setStatus('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (pid, patch) =>
    setForms((prev) => ({ ...prev, [pid]: { ...prev[pid], ...patch } }));

  const submitOne = async (pid) => {
    const form = forms[pid] || {};
    if (!form.rating || form.rating < 1) {
      const toast = (await import('react-hot-toast')).default;
      toast.error(t('review_submit_need_rating', 'Välj ett betyg först.'));
      return;
    }
    updateForm(pid, { submitting: true });
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const submitReview = httpsCallable(functions, 'submitReview');
      await submitReview({
        shopId,
        token,
        productId: pid,
        rating: form.rating,
        text: form.text || '',
        displayName: form.name || '',
        anonymous: !!form.anonymous,
      });
      setReviewedIds((prev) => (prev.includes(pid) ? prev : [...prev, pid]));
      const toast = (await import('react-hot-toast')).default;
      toast.success(t('review_submit_thanks_toast', 'Tack för ditt omdöme!'));
    } catch (err) {
      console.error('submitReview failed', err);
      const toast = (await import('react-hot-toast')).default;
      const code = err?.code || '';
      if (code === 'functions/already-exists') {
        setReviewedIds((prev) => (prev.includes(pid) ? prev : [...prev, pid]));
        toast(t('review_submit_already', 'Du har redan lämnat ett omdöme för den här produkten.'));
      } else {
        toast.error(t('review_submit_error', 'Något gick fel. Försök igen.'));
      }
    } finally {
      updateForm(pid, { submitting: false });
    }
  };

  const allReviewed = items.length > 0 && items.every((it) => reviewedIds.includes(it.productId));

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Helmet>
        <title>{t('review_submit_title', 'Lämna ett omdöme')}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <ShopNavigation />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {status === 'loading' && (
          <div className="bg-white rounded-tile shadow-xs border border-ink/5 p-10 text-center">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-accent" />
            <p className="mt-4 text-ink/70">{t('review_submit_loading', 'Laddar…')}</p>
          </div>
        )}

        {status === 'expired' && (
          <div className="bg-white rounded-tile shadow-xs border border-ink/5 p-8">
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight mb-3">
              {t('review_submit_expired_title', 'Länken har gått ut')}
            </h1>
            <p className="text-ink/70 mb-6 leading-relaxed">
              {t('review_submit_expired_body', 'Den här recensionslänken är inte längre giltig. Tack ändå för att du ville dela med dig!')}
            </p>
            <a
              href={`/${shopId}`}
              className="inline-block bg-accent text-white px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              {t('review_submit_back_to_shop', 'Till butiken')}
            </a>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-tile shadow-xs border border-ink/5 p-8">
            <p className="text-ink/80 mb-6">
              {t('review_submit_error_panel', 'Något gick fel. Gå till butiken och försök igen.')}
            </p>
            <a
              href={`/${shopId}`}
              className="inline-block bg-accent text-white px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              {t('review_submit_back_to_shop', 'Till butiken')}
            </a>
          </div>
        )}

        {status === 'open' && allReviewed && (
          <div className="bg-white rounded-tile shadow-xs border border-ink/5 p-8 text-center">
            <div className="text-4xl mb-3" aria-hidden="true">✓</div>
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight mb-3">
              {t('review_submit_success_title', 'Tack för ditt omdöme!')}
            </h1>
            <p className="text-ink/70 mb-6 leading-relaxed">
              {t('review_submit_success_body', 'Ditt omdöme hjälper andra kunder. Vi uppskattar att du tog dig tiden.')}
            </p>
            <a
              href={`/${shopId}`}
              className="inline-block bg-accent text-white px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              {t('review_submit_back_to_shop', 'Till butiken')}
            </a>
          </div>
        )}

        {status === 'open' && !allReviewed && (
          <div>
            <h1 className="font-display text-3xl font-bold text-ink tracking-tight mb-2">
              {t('review_submit_heading', 'Vad tyckte du om ditt köp?')}
            </h1>
            <p className="text-ink/70 mb-8 leading-relaxed">
              {t('review_submit_intro', 'Lämna gärna ett omdöme för varje produkt. Det tar bara en minut.')}
            </p>

            <div className="space-y-5">
              {items.map((it) => {
                const done = reviewedIds.includes(it.productId);
                const form = forms[it.productId] || {};
                return (
                  <div
                    key={it.productId}
                    className="bg-white rounded-tile shadow-xs border border-ink/5 p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {it.image && (
                        <img
                          src={it.image}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover border border-ink/10 shrink-0"
                        />
                      )}
                      <h2 className="font-display text-lg font-bold text-ink leading-snug">
                        {it.name}
                      </h2>
                    </div>

                    {done ? (
                      <p className="text-sm font-semibold text-accent flex items-center gap-1.5">
                        <span aria-hidden="true">✓</span>
                        {t('review_submit_done', 'Omdöme lämnat')}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-ink mb-1.5">
                            {t('review_submit_rating_label', 'Ditt betyg')}
                          </label>
                          <StarInput
                            value={form.rating || 0}
                            onChange={(n) => updateForm(it.productId, { rating: n })}
                            label={t('review_submit_rating_label', 'Ditt betyg')}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-ink mb-1.5">
                            {t('review_submit_text_label', 'Din recension (valfritt)')}
                          </label>
                          <textarea
                            value={form.text || ''}
                            maxLength={2000}
                            rows={4}
                            onChange={(e) => updateForm(it.productId, { text: e.target.value })}
                            placeholder={t('review_submit_text_placeholder', 'Vad tyckte du om produkten?')}
                            className="w-full rounded-tile border border-ink/15 bg-canvas px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-ink mb-1.5">
                            {t('review_submit_name_label', 'Ditt namn (visas med omdömet)')}
                          </label>
                          <input
                            type="text"
                            value={form.name || ''}
                            maxLength={60}
                            disabled={form.anonymous}
                            onChange={(e) => updateForm(it.productId, { name: e.target.value })}
                            placeholder={t('review_submit_name_placeholder', 'Förnamn')}
                            className="w-full rounded-tile border border-ink/15 bg-canvas px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
                          />
                          <label className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              checked={!!form.anonymous}
                              onChange={(e) => updateForm(it.productId, { anonymous: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <span className="text-sm text-ink/70">
                              {t('review_submit_anonymous', 'Visa som anonym')}
                            </span>
                          </label>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => submitOne(it.productId)}
                            disabled={form.submitting}
                            className="bg-accent text-white px-6 py-2.5 rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
                          >
                            {form.submitting
                              ? t('review_submit_sending', 'Skickar…')
                              : t('review_submit_button', 'Skicka omdöme')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <ShopFooter />
    </div>
  );
};

export default ReviewSubmitPage;
