import { Request, Response } from 'express';
import { appUrls } from '../../config/app-urls';

type AllowedOrigin = typeof appUrls.CORS_ORIGINS[number];

export const corsHandler = (request: Request, response: Response): boolean => {
  const origin = request.headers.origin;

  // Allow requests from configured domains
  if (origin && isAllowedOrigin(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Access-Control-Allow-Credentials', 'true');
    return true;
  }

  response.status(403).json({ error: 'Unauthorized origin' });
  return false;
};

function isAllowedOrigin(origin: string): origin is AllowedOrigin {
  return appUrls.CORS_ORIGINS.includes(origin as AllowedOrigin);
} 