/**
 * Simple Rate Limiter for Firebase Functions
 * Prevents DDOS attacks that could cause massive billing
 */

const rateLimits = new Map();
const blacklistedIPs = new Set();

/**
 * Rate limiter middleware
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 60000,      // 1 minute window
    max = 10,              // 10 requests per window (strict for webhooks)
    message = 'Rate limit exceeded'
  } = options;

  return (request, response, next) => {
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    
    // Block blacklisted IPs immediately
    if (blacklistedIPs.has(ip)) {
      console.warn(`🚫 Blocked blacklisted IP: ${ip}`);
      response.status(429).json({ error: 'IP blocked' });
      return false;
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
      if (requests.length > max * 5) {
        blacklistedIPs.add(ip);
        console.error(`🔴 Auto-blacklisted IP: ${ip} for excessive requests`);
      }
      
      response.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
      return false;
    }

    // Add current request
    requests.push(now);
    rateLimits.set(ip, requests);

    return true; // Allow request
  };
};

/**
 * Webhook-specific rate limiter (very strict)
 */
const webhookRateLimit = rateLimit({
  windowMs: 60000,  // 1 minute
  max: 5,           // Only 5 webhook calls per minute (Stripe shouldn't exceed this)
  message: 'Webhook rate limit exceeded'
});

/**
 * Recovery function rate limiter (moderate)
 */
const recoveryRateLimit = rateLimit({
  windowMs: 300000, // 5 minutes
  max: 3,           // Only 3 recovery attempts per 5 minutes
  message: 'Recovery rate limit exceeded'
});

module.exports = {
  webhookRateLimit,
  recoveryRateLimit,
  rateLimit
};
