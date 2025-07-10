import { CustomerData } from '../types';
interface EmailTemplate {
    subject: string;
    html: string;
}
interface WelcomeEmailData {
    customerData: CustomerData;
    temporaryPassword: string;
    isResend?: boolean;
}
export declare function getEmail(type: 'welcomeCredentials' | 'orderConfirmation' | 'orderStatus', lang: string | undefined, data: WelcomeEmailData | any): EmailTemplate;
export {};
