import { Request, Response } from 'express';

// Simple in-memory rate limiter
const rateLimits = new Map<string, { count: number; timestamp: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute

const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }
  return request.ip || 'unknown';
};

export const rateLimiter = async (request: Request, response: Response): Promise<boolean> => {
  const ip = getClientIp(request);
  const now = Date.now();

  // Clean up old entries
  for (const [key, value] of rateLimits.entries()) {
    if (now - value.timestamp > WINDOW_MS) {
      rateLimits.delete(key);
    }
  }

  // Get or create rate limit entry
  const limit = rateLimits.get(ip) || { count: 0, timestamp: now };

  // Reset count if window expired
  if (now - limit.timestamp > WINDOW_MS) {
    limit.count = 0;
    limit.timestamp = now;
  }

  // Increment count
  limit.count++;
  rateLimits.set(ip, limit);

  // Check if limit exceeded
  if (limit.count > MAX_REQUESTS) {
    response.status(429).json({ error: 'Too many requests' });
    return false;
  }

  return true;
}; 