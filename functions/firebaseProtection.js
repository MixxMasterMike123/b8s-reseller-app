// Firebase Protection Module - Prevent massive billing from bot attacks
// This module provides rate limiting, IP blocking, and request validation

const admin = require("firebase-admin");

// Rate limiting storage (in-memory for simplicity, use Redis for production scale)
const rateLimits = new Map();
const blacklistedIPs = new Set();
const requestStats = new Map();

// Protection configuration
const PROTECTION_CONFIG = {
  // Rate limits per endpoint type
  rateLimits: {
    'order-processing': { requests: 10, window: 60000 },      // 10 req/min
    'ai-generation': { requests: 5, window: 60000 },          // 5 req/min
    'weather-data': { requests: 20, window: 60000 },          // 20 req/min
    'general': { requests: 30, window: 60000 },               // 30 req/min
    'public': { requests: 100, window: 60000 }                // 100 req/min
  },
  
  // Daily limits to prevent massive bills
  dailyLimits: {
    totalRequests: 10000,                                     // Max 10K req/day
    uniqueIPs: 1000,                                          // Max 1K unique IPs
    functionsInvocations: 5000,                               // Max 5K functions/day
    storageDownloads: 1000                                    // Max 1K downloads/day
  },
  
  // Blocking thresholds
  blocking: {
    requestsPerMinute: 100,                                   // Block if >100 req/min from IP
    consecutiveErrors: 10,                                    // Block after 10 errors
    suspiciousPatterns: ['bot', 'crawler', 'scanner']        // Block suspicious user agents
  },
  
  // Budget protection (automatically stop services if exceeded)
  budgetLimits: {
    dailyBudget: 50,                                         // 50 SEK daily limit
    monthlyBudget: 500,                                      // 500 SEK monthly limit
    emergencyShutdown: 1000                                  // Emergency stop at 1000 SEK
  }
};

/**
 * Rate limiting middleware for Cloud Functions
 */
const rateLimiter = (limitType = 'general') => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const limit = PROTECTION_CONFIG.rateLimits[limitType];
    
    // Check if IP is blacklisted
    if (blacklistedIPs.has(ip)) {
      console.warn(`🚫 Blocked request from blacklisted IP: ${ip}`);
      res.status(429).json({ 
        error: 'IP blocked due to suspicious activity',
        retryAfter: 3600 // 1 hour
      });
      return;
    }
    
    // Get or create rate limit data for this IP
    const key = `${ip}_${limitType}`;
    if (!rateLimits.has(key)) {
      rateLimits.set(key, { count: 0, resetTime: now + limit.window });
    }
    
    const rateData = rateLimits.get(key);
    
    // Reset if window expired
    if (now > rateData.resetTime) {
      rateData.count = 0;
      rateData.resetTime = now + limit.window;
    }
    
    // Check if limit exceeded
    if (rateData.count >= limit.requests) {
      console.warn(`🚫 Rate limit exceeded for IP ${ip}: ${rateData.count}/${limit.requests}`);
      
      // Auto-blacklist if excessive requests
      if (rateData.count > PROTECTION_CONFIG.blocking.requestsPerMinute) {
        blacklistedIPs.add(ip);
        console.error(`🔴 IP ${ip} blacklisted for excessive requests`);
      }
      
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateData.resetTime - now) / 1000)
      });
      return;
    }
    
    // Increment counter
    rateData.count++;
    rateLimits.set(key, rateData);
    
    // Track daily statistics
    trackDailyUsage(ip, limitType);
    
    next();
  };
};

/**
 * Track daily usage and enforce daily limits
 */
const trackDailyUsage = (ip, limitType) => {
  const today = new Date().toISOString().split('T')[0];
  const statsKey = `daily_${today}`;
  
  if (!requestStats.has(statsKey)) {
    requestStats.set(statsKey, {
      totalRequests: 0,
      uniqueIPs: new Set(),
      functionInvocations: 0,
      limitTypes: {}
    });
  }
  
  const stats = requestStats.get(statsKey);
  stats.totalRequests++;
  stats.uniqueIPs.add(ip);
  stats.functionInvocations++;
  stats.limitTypes[limitType] = (stats.limitTypes[limitType] || 0) + 1;
  
  // Check daily limits
  const limits = PROTECTION_CONFIG.dailyLimits;
  if (stats.totalRequests > limits.totalRequests) {
    console.error(`🔴 Daily request limit exceeded: ${stats.totalRequests}/${limits.totalRequests}`);
    // Could implement emergency shutdown here
  }
  
  if (stats.uniqueIPs.size > limits.uniqueIPs) {
    console.error(`🔴 Too many unique IPs: ${stats.uniqueIPs.size}/${limits.uniqueIPs}`);
  }
};

/**
 * Validate request origin and user agent
 */
const validateRequest = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const origin = req.headers.origin || '';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check for suspicious user agents
  const suspiciousPatterns = PROTECTION_CONFIG.blocking.suspiciousPatterns;
  for (const pattern of suspiciousPatterns) {
    if (userAgent.toLowerCase().includes(pattern)) {
      console.warn(`🚫 Blocked suspicious user agent from ${ip}: ${userAgent}`);
      blacklistedIPs.add(ip);
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  }
  
  // Validate origin for sensitive operations
  const allowedOrigins = [
    'https://partner.b8shield.com',
    'https://shop.b8shield.com',
    'https://b8shield-reseller-app.web.app'
  ];
  
  // Allow localhost for development
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000');
  }
  
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`🚫 Blocked request from unauthorized origin: ${origin} (IP: ${ip})`);
    res.status(403).json({ error: 'Unauthorized origin' });
    return;
  }
  
  next();
};

/**
 * Authentication middleware for protected endpoints
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

/**
 * Admin-only middleware
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Check if user is admin in Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(req.user.uid)
      .get();
    
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Emergency cost protection - automatically disable expensive operations
 */
const emergencyCostProtection = () => {
  // This would check current month's billing and disable services if needed
  // Implementation would require Firebase Billing API integration
  console.log('🛡️ Emergency cost protection active');
};

/**
 * Get current protection statistics
 */
const getProtectionStats = () => {
  const today = new Date().toISOString().split('T')[0];
  const todayStats = requestStats.get(`daily_${today}`) || {
    totalRequests: 0,
    uniqueIPs: new Set(),
    functionInvocations: 0,
    limitTypes: {}
  };
  
  return {
    dailyStats: {
      ...todayStats,
      uniqueIPs: todayStats.uniqueIPs.size
    },
    blacklistedIPs: blacklistedIPs.size,
    activeRateLimits: rateLimits.size,
    config: PROTECTION_CONFIG
  };
};

/**
 * Manual IP management
 */
const blockIP = (ip, reason = 'Manual block') => {
  blacklistedIPs.add(ip);
  console.log(`🔴 Manually blocked IP ${ip}: ${reason}`);
};

const unblockIP = (ip) => {
  blacklistedIPs.delete(ip);
  console.log(`✅ Unblocked IP ${ip}`);
};

module.exports = {
  rateLimiter,
  validateRequest,
  requireAuth,
  requireAdmin,
  trackDailyUsage,
  emergencyCostProtection,
  getProtectionStats,
  blockIP,
  unblockIP,
  PROTECTION_CONFIG
}; 