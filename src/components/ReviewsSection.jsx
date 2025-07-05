import React, { useState, useEffect } from 'react';
import TrustpilotWidget from './TrustpilotWidget';

const ReviewsSection = ({ 
  businessId, 
  domain, 
  manualReviews = [],
  showTrustpilot = true,
  showManualReviews = true,
  className = '' 
}) => {
  const [displayMode, setDisplayMode] = useState('trustpilot');
  const [trustpilotFailed, setTrustpilotFailed] = useState(false);

  // Sample manual reviews as fallback
  const defaultReviews = [
    {
      id: 'manual1',
      rating: 5,
      text: 'Med B8Shield kunde jag obehindrat fiska på platser som annars hade varit omöjliga, utan att tappa ett enda fiskedrag – otroligt effektivt skydd!',
      author: 'Paul Wieringa',
      title: 'Sportfiskarna Sverige',
      date: '2024-11-15',
      verified: true
    },
    {
      id: 'manual2',
      rating: 5,
      text: 'Fantastisk produkt! Har använt B8Shield i över 6 månader och har inte förlorat en enda jigg sedan dess. Rekommenderas varmt!',
      author: 'Erik S.',
      title: 'Verified Purchase',
      date: '2024-11-20',
      verified: true
    },
    {
      id: 'manual3',
      rating: 4,
      text: 'Mycket bra kvalitet och fungerar som det ska. Lite dyrt men värt pengarna för att slippa förlora fiskedrag.',
      author: 'Maria L.',
      title: 'Verified Purchase',
      date: '2024-11-25',
      verified: true
    }
  ];

  const allReviews = [...manualReviews, ...defaultReviews];

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
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const averageRating = allReviews.length > 0 
    ? (allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length).toFixed(1)
    : 0;

  return (
    <div className={`reviews-section ${className}`}>
      {/* Header with Rating Summary */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-2">
          {renderStars(Math.round(averageRating))}
          <span className="ml-2 text-lg font-semibold text-gray-700">
            {averageRating} av 5
          </span>
        </div>
        <p className="text-gray-600">
          Baserat på {allReviews.length} recensioner
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
              Trustpilot
            </button>
            <button
              onClick={() => setDisplayMode('manual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                displayMode === 'manual' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kundrecensioner
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
            locale="sv-SE"
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
          {allReviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  {renderStars(review.rating)}
                  {review.verified && (
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      Verifierat köp
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(review.date)}
                </span>
              </div>
              
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
                  {review.title && (
                    <p className="text-xs text-gray-500">
                      {review.title}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA to leave a review */}
      <div className="text-center mt-8">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Lämna en recension
        </button>
      </div>
    </div>
  );
};

export default ReviewsSection; 