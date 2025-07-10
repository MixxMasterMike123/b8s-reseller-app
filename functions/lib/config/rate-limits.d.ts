export declare const RATE_LIMITS: {
    readonly AI_REQUESTS: {
        readonly perMinute: 30;
        readonly windowMs: 60000;
    };
    readonly ORDER_PROCESSING: {
        readonly perWindow: 15;
        readonly windowMs: 300000;
    };
    readonly EMAIL_SENDING: {
        readonly perMinute: 20;
        readonly windowMs: 60000;
    };
    readonly API_CALLS: {
        readonly perMinute: 100;
        readonly windowMs: 60000;
    };
};
export declare const COST_THRESHOLDS: {
    readonly DAILY_WARNING: 20;
    readonly DAILY_EMERGENCY: 50;
    readonly MONTHLY_WARNING: 500;
    readonly MONTHLY_EMERGENCY: 1000;
};
export type RateLimit = keyof typeof RATE_LIMITS;
