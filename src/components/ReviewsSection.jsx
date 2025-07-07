import React, { useState, useEffect } from 'react';
import TrustpilotWidget from './TrustpilotWidget';
import { getAverageRating, getReviewStats, getAllReviews } from '../utils/trustpilotAPI';
import { useTranslation } from '../contexts/TranslationContext';

const ReviewsSection = ({ 
  businessId, 
  domain, 
  manualReviews = [],
  showTrustpilot = true,
  showManualReviews = true,
  className = '' 
}) => {
  const { t, currentLanguage } = useTranslation();
  const [displayMode, setDisplayMode] = useState('manual');
  const [trustpilotFailed, setTrustpilotFailed] = useState(false);
  const [allReviews, setAllReviews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  // Helper: get language code (sv or en)
  const getLang = () => {
    if (currentLanguage?.startsWith('sv')) return 'sv';
    return 'en';
  };

  // Load reviews from API
  useEffect(() => {
    const loadReviews = async () => {
      try {
        // Load all reviews (CSV or fallback) then pick random ones
        const all = await getAllReviews();
        const langFiltered = all.filter(r => r.lang === getLang());
        const shuffled = [...langFiltered].sort(() => 0.5 - Math.random());

        const avgRating = await getAverageRating();
        const stats = await getReviewStats();

        setAllReviews(shuffled);
        setCurrentIndex(0);
        setReviews(shuffled.slice(0, 3));
        setAverageRating(avgRating);
        setTotalReviews(stats.totalReviews);
      } catch (error) {
        console.error('Error loading reviews:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReviews();
  }, [currentLanguage]);

  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <svg 
            key={i} 
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'} fill-current`} 
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    // Use Swedish or English locale
    const locale = getLang() === 'sv' ? 'sv-SE' : 'en-GB';
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`reviews-section ${className}`}>
      {/* Header with Rating Summary */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-2">
          {renderStars(Math.round(averageRating))}
          <span className="ml-2 text-lg font-semibold text-gray-700">
            {averageRating} {t('reviews_out_of_5', 'av 5')}
          </span>
        </div>
        <p className="text-gray-600">
          {t('reviews_based_on_count', 'Baserat på {{count}} recensioner', { count: totalReviews })}
        </p>
      </div>

      {/* Toggle between Trustpilot and Manual reviews */}
      {showTrustpilot && showManualReviews && (
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setDisplayMode('trustpilot')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                displayMode === 'trustpilot' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('reviews_trustpilot_tab', 'Trustpilot')}
            </button>
            <button
              onClick={() => setDisplayMode('manual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                displayMode === 'manual' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('reviews_manual_tab', 'Kundrecensioner')}
            </button>
          </div>
        </div>
      )}

      {/* Trustpilot Widget */}
      {(displayMode === 'trustpilot' || (!showManualReviews && showTrustpilot)) && businessId && (
        <div className="mb-8">
          <TrustpilotWidget 
            businessId={businessId}
            domain={domain}
            locale={getLang() === 'sv' ? 'sv-SE' : 'en-GB'}
            theme="light"
            showReviews={true}
            showStars={false} // We show our own stars above
            className="w-full"
          />
        </div>
      )}

      {/* Manual Reviews */}
      {(displayMode === 'manual' || !showTrustpilot || trustpilotFailed) && showManualReviews && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center text-gray-500">{t('reviews_loading', 'Laddar recensioner...')}</div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {renderStars(review.rating)}
                    {review.verified && (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {t('reviews_verified_purchase', 'Verifierat köp')}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(review.date)}
                  </span>
                </div>
                {review.title && (
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {review.title}
                  </h4>
                )}
                <blockquote className="text-gray-700 italic mb-3">
                  "{review.text}"
                </blockquote>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-gray-700">
                      {review.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {review.author}
                    </p>
                    {review.location && (
                      <p className="text-xs text-gray-500">
                        {review.location}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CTA to read more reviews and leave a review */}
      <div className="text-center mt-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a 
            href="https://www.trustpilot.com/review/b8shield.com?languages=all"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {t('reviews_read_all', 'Läs alla recensioner')}
          </a>
          <a 
            href="https://www.trustpilot.com/evaluate/b8shield.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {t('reviews_leave_review', 'Lämna en recension')}
          </a>
          <button 
            onClick={() => {
              if (allReviews.length <= 3) return; // nothing to cycle
              setLoading(true);

              // Calculate next index
              const nextIndex = currentIndex + 3;
              if (nextIndex + 3 <= allReviews.length) {
                setCurrentIndex(nextIndex);
                setReviews(allReviews.slice(nextIndex, nextIndex + 3));
                setLoading(false);
              } else {
                // Reshuffle to get fresh order and start over
                const reshuffled = [...allReviews].sort(() => 0.5 - Math.random());
                setAllReviews(reshuffled);
                setCurrentIndex(0);
                setReviews(reshuffled.slice(0, 3));
                setLoading(false);
              }
            }}
            className="inline-flex items-center justify-center bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('reviews_show_other', 'Visa andra recensioner')}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {t('reviews_help_others', 'Dina recensioner hjälper andra kunder och oss att förbättra våra produkter')}
        </p>
      </div>
    </div>
  );
};

export default ReviewsSection; 