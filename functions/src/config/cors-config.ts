import { appUrls } from './app-urls';

export const CORS_OPTIONS = {
  origin: appUrls,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
} as const; 