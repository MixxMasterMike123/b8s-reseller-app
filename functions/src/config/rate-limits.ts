export const RATE_LIMITS = {
  // AI/Content Generation (expensive operations)
  AI_REQUESTS: {
    perMinute: 30,      // 30 requests/minute per IP (good for 10-20 active users per IP)
    windowMs: 60000     // 1 minute window
  },
  
  // Order Processing (business critical)
  ORDER_PROCESSING: {
    perWindow: 15,      // 15 orders per 5 minutes per IP (handles bulk customers)
    windowMs: 300000    // 5 minute window
  },
  
  // Email Sending (spam prevention)
  EMAIL_SENDING: {
    perMinute: 20,      // 20 emails/minute per IP (handles status updates)
    windowMs: 60000     // 1 minute window
  },
  
  // Weather/Data API calls (moderate cost)
  API_CALLS: {
    perMinute: 100,     // 100 calls/minute per IP (generous for legitimate use)
    windowMs: 60000     // 1 minute window
  }
} as const;

// Cost protection thresholds (in SEK)
export const COST_THRESHOLDS = {
  DAILY_WARNING: 20,     // Alert at 20 SEK/day
  DAILY_EMERGENCY: 50,   // Emergency shutdown at 50 SEK/day
  MONTHLY_WARNING: 500,  // Alert at 500 SEK/month
  MONTHLY_EMERGENCY: 1000 // Emergency shutdown at 1000 SEK/month
} as const;

export type RateLimit = keyof typeof RATE_LIMITS; 