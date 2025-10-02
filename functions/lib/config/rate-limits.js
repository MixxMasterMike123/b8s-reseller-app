"use strict";
exports.__esModule = true;
exports.COST_THRESHOLDS = exports.RATE_LIMITS = void 0;
exports.RATE_LIMITS = {
    // AI/Content Generation (expensive operations)
    AI_REQUESTS: {
        perMinute: 30,
        windowMs: 60000 // 1 minute window
    },
    // Order Processing (business critical) - Enhanced with bulk support
    ORDER_PROCESSING: {
        perWindow: 15,
        windowMs: 300000,
        // Bulk operation limits (for affiliate commission fixes, etc.)
        BULK_MODE: {
            perWindow: 50,
            windowMs: 600000,
            // Detection criteria for bulk operations
            BULK_DETECTION: {
                rapidRequests: 5,
                timeWindow: 30000,
                maxBulkDuration: 1800000 // 30 minutes max bulk mode duration
            }
        }
    },
    // Email Sending (spam prevention)
    EMAIL_SENDING: {
        perMinute: 20,
        windowMs: 60000 // 1 minute window
    },
    // Weather/Data API calls (moderate cost)
    API_CALLS: {
        perMinute: 100,
        windowMs: 60000 // 1 minute window
    }
};
// Cost protection thresholds (in SEK)
exports.COST_THRESHOLDS = {
    DAILY_WARNING: 20,
    DAILY_EMERGENCY: 50,
    MONTHLY_WARNING: 500,
    MONTHLY_EMERGENCY: 1000 // Emergency shutdown at 1000 SEK/month
};
