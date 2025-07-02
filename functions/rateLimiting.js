// Rate Limiting Protection for Firebase Functions
// Prevents bot attacks that could cause massive Firebase bills

const rateLimits = new Map();
const blacklistedIPs = new Set([
  // Common attack IPs - add known bad actors
  '10.0.0.0',  // Example - replace with actual bad IPs
]);

/**
 * Simple rate limiter to prevent function spam
 * Use this on ALL HTTP functions to prevent massive billing
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 60000,      // 1 minute window
    max = 30,              // 30 requests per window
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later.'
  } = options;

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Block blacklisted IPs immediately
    if (blacklistedIPs.has(ip)) {
      console.warn(`🚫 Blocked blacklisted IP: ${ip}`);
      res.status(429).json({ error: 'IP blocked' });
      return;
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, requests] of rateLimits.entries()) {
      rateLimits.set(key, requests.filter(time => time > windowStart));
      if (rateLimits.get(key).length === 0) {
        rateLimits.delete(key);
      }
    }

    // Get current requests for this IP
    const requests = rateLimits.get(ip) || [];
    
    // Check if limit exceeded
    if (requests.length >= max) {
      console.warn(`🚫 Rate limit exceeded for IP: ${ip} (${requests.length}/${max})`);
      
      // Auto-blacklist if way over limit (probably a bot)
      if (requests.length > max * 3) {
        blacklistedIPs.add(ip);
        console.error(`🔴 Auto-blacklisted IP: ${ip} for excessive requests`);
      }
      
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
      return;
    }

    // Add current request
    requests.push(now);
    rateLimits.set(ip, requests);

    next();
  };
};

/**
 * Strict rate limiter for expensive operations (AI, etc.)
 */
const strictRateLimit = rateLimit({
  windowMs: 60000,    // 1 minute
  max: 5,             // Only 5 requests per minute
  message: 'Rate limit exceeded for this resource. Please wait before trying again.'
});

/**
 * Standard rate limiter for normal operations
 */
const standardRateLimit = rateLimit({
  windowMs: 60000,    // 1 minute
  max: 30,            // 30 requests per minute
  message: 'Too many requests. Please slow down.'
});

/**
 * Lenient rate limiter for public endpoints
 */
const publicRateLimit = rateLimit({
  windowMs: 60000,    // 1 minute
  max: 100,           // 100 requests per minute
  message: 'Rate limit exceeded. Please try again later.'
});

/**
 * Origin validation middleware
 */
const validateOrigin = (req, res, next) => {
  const allowedOrigins = [
    'https://partner.b8shield.com',
    'https://shop.b8shield.com',
    'https://b8shield-reseller-app.web.app',
    'http://localhost:5173',  // Development
    'http://localhost:3000'   // Development
  ];

  const origin = req.headers.origin;
  
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`🚫 Blocked unauthorized origin: ${origin}`);
    res.status(403).json({ error: 'Unauthorized origin' });
    return;
  }

  next();
};

/**
 * Simple daily usage tracking
 */
let dailyUsage = {
  date: new Date().toDateString(),
  requests: 0,
  uniqueIPs: new Set()
};

const trackUsage = (req, res, next) => {
  const today = new Date().toDateString();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Reset daily counter
  if (dailyUsage.date !== today) {
    dailyUsage = {
      date: today,
      requests: 0,
      uniqueIPs: new Set()
    };
  }
  
  dailyUsage.requests++;
  dailyUsage.uniqueIPs.add(ip);
  
  // Emergency brake - stop if way too many requests
  if (dailyUsage.requests > 50000) {
    console.error(`🚨 EMERGENCY: Daily request limit exceeded: ${dailyUsage.requests}`);
    res.status(503).json({ 
      error: 'Service temporarily unavailable due to high traffic',
      message: 'Please try again tomorrow'
    });
    return;
  }
  
  next();
};

/**
 * Get current usage stats
 */
const getUsageStats = () => {
  return {
    daily: {
      ...dailyUsage,
      uniqueIPs: dailyUsage.uniqueIPs.size
    },
    blacklistedIPs: blacklistedIPs.size,
    activeLimits: rateLimits.size
  };
};

module.exports = {
  strictRateLimit,      // Use for AI/expensive functions
  standardRateLimit,    // Use for normal functions  
  publicRateLimit,      // Use for public endpoints
  validateOrigin,       // Always use this
  trackUsage,           // Optional usage tracking
  getUsageStats,        // Get current stats
  blacklistedIPs       // Manual IP management
}; 