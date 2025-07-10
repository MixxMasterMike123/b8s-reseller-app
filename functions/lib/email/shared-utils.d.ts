import { FieldValue } from 'firebase-admin/firestore';
import { appUrls } from '../config/app-urls';
import { sendEmail, db, EMAIL_FROM } from './email-handler';
import { getEmail } from '../../emails';
import { EmailData, EmailTemplate, EmailTemplateParams, UserData, OrderData } from './types';
export declare const auth: import("firebase-admin/auth").Auth;
export { sendEmail, db, EMAIL_FROM, getEmail, FieldValue, appUrls };
export declare function createEmailData(to: string, from: string, template: EmailTemplate, params?: EmailTemplateParams): EmailData;
export declare function generateTemporaryPassword(): Promise<string>;
export declare function handleError(error: unknown): never;
export interface OrderStatusData extends OrderData {
    trackingNumber?: string;
    carrier?: string;
}
export interface OrderStatusEmailData {
    userData: UserData;
    orderData: OrderStatusData;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}
export interface AffiliateApplicationData {
    applicationId: string;
    checkoutDiscount?: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    socials?: Record<string, string>;
    promotionMethod?: string;
    message?: string;
    preferredLang?: string;
}
export interface AffiliateRecord {
    id: string;
    affiliateCode: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    socials?: Record<string, string>;
    promotionMethod?: string;
    message?: string;
    status: 'active' | 'pending' | 'suspended';
    commissionRate: number;
    checkoutDiscount: number;
    stats: {
        clicks: number;
        conversions: number;
        totalEarnings: number;
        balance: number;
    };
    createdAt: any;
    updatedAt: any;
}
export interface AffiliateEmailData {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
    appData?: {
        name: string;
        email: string;
        preferredLang?: string;
    };
}
