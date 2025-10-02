import { Request, Response } from 'express';
export declare const rateLimiter: (request: Request, response: Response) => Promise<boolean>;
