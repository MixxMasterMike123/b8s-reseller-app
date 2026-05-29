// Trustpilot API Integration for B8Shield
// Fetches real reviews from shop.b8shield.com Trustpilot profile

import { loadReviewsFromCsv } from './csvReviews';

const TRUSTPILOT_CONFIG = {
  DOMAIN: 'shop.b8shield.com',
  BUSINESS_EMAIL: 'info@b8shield.com',
  // Business Unit ID will be set after Trustpilot verification
  BUSINESS_UNIT_ID: '', // Get this from Trustpilot dashboard
  API_KEY: '', // Get this from Trustpilot dashboard
  
  // Public endpoints (no auth required)
  PUBLIC_API_BASE: 'https://api.trustpilot.com/v1',
  BUSINESS_UNITS_ENDPOINT: '/business-units/find',
  
  // Cache settings
  CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
};

// Cache for reviews to avoid excessive API calls
let reviewsCache = {
  data: null,
  timestamp: null,
  isValid: function() {
    return this.data && this.timestamp && 
           (Date.now() - this.timestamp) < TRUSTPILOT_CONFIG.CACHE_DURATION;
  }
};

/**
 * Find B8Shield's business unit ID using the domain
 */
export const findBusinessUnit = async () => {
  try {
    const response = await fetch(
      `${TRUSTPILOT_CONFIG.PUBLIC_API_BASE}${TRUSTPILOT_CONFIG.BUSINESS_UNITS_ENDPOINT}?name=${encodeURIComponent(TRUSTPILOT_CONFIG.DOMAIN)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Trustpilot API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error finding business unit:', error);
    return null;
  }
};

/**
 * Fetch reviews from Trustpilot (when API is set up)
 */
export const fetchTrustpilotReviews = async (businessUnitId) => {
  try {
    // This would be the actual API call when credentials are set up
    const response = await fetch(
      `${TRUSTPILOT_CONFIG.PUBLIC_API_BASE}/business-units/${businessUnitId}/reviews?perPage=50&orderBy=createdat.desc`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          // 'ApiKey': TRUSTPILOT_CONFIG.API_KEY, // When API key is available
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Trustpilot reviews API error: ${response.status}`);
    }

    const data = await response.json();
    return data.reviews || [];
  } catch (error) {
    console.error('Error fetching Trustpilot reviews:', error);
    return [];
  }
};

/**
 * Manual reviews fallback.
 * Emptied during de-branding: previously held hardcoded B8Shield fishing reviews.
 * A real shop should populate reviews via the CSV import (loadReviewsFromCsv)
 * or a live Trustpilot integration. Returning [] means no reviews render.
 */
const getManualReviews = () => [];

/**
 * Get 3 random reviews for display
 */
export const getRandomReviews = (count = 3, lang = 'sv') => {
  const allReviews = getManualReviews().filter(r => r.lang === lang);
  const shuffled = [...allReviews].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Get all reviews (for main reviews section)
 */
export const getAllReviews = async () => {
  if (reviewsCache.isValid()) return reviewsCache.data;

  // 1. Try CSV file first
  try {
    const csvReviews = await loadReviewsFromCsv();
    if (csvReviews?.length) {
      reviewsCache.data = csvReviews;
      reviewsCache.timestamp = Date.now();
      return csvReviews;
    }
  } catch (err) {
    console.warn('CSV reviews not available – falling back to manual reviews', err);
  }

  // 2. Fallback to manual reviews
    const manualReviews = getManualReviews();
    reviewsCache.data = manualReviews;
    reviewsCache.timestamp = Date.now();
    return manualReviews;
};

/**
 * Format Trustpilot API response to our review format
 */
const formatTrustpilotReviews = (trustpilotReviews) => {
  return trustpilotReviews.map((review, index) => ({
    id: `trustpilot_${review.id || index}`,
    rating: review.stars || 5,
    title: review.title || 'Trustpilot Review',
    text: review.text || review.content || '',
    author: review.consumer?.displayName || 'Trustpilot Customer',
    date: review.createdAt || new Date().toISOString().split('T')[0],
    verified: true,
    location: review.consumer?.countryCode ? `${review.consumer.countryCode}` : 'Sverige',
    source: 'trustpilot'
  }));
};

/**
 * Calculate average rating from all reviews
 */
export const getAverageRating = async () => {
  const reviews = await getAllReviews();
  if (reviews.length === 0) return 0;
  
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return (sum / reviews.length).toFixed(1);
};

/**
 * Get review statistics
 */
export const getReviewStats = async () => {
  const reviews = await getAllReviews();
  return {
    totalReviews: reviews.length,
    averageRating: await getAverageRating(),
    distribution: {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    }
  };
};

export default {
  getRandomReviews,
  getAllReviews,
  getAverageRating,
  getReviewStats,
  findBusinessUnit,
  fetchTrustpilotReviews
}; 