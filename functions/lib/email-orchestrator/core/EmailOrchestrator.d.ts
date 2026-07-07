import { OrderContext } from '../services/UserResolver';
export type EmailType = 'ORDER_CONFIRMATION' | 'ORDER_STATUS_UPDATE' | 'ORDER_NOTIFICATION_ADMIN' | 'PASSWORD_RESET' | 'LOGIN_CREDENTIALS' | 'AFFILIATE_WELCOME' | 'EMAIL_VERIFICATION' | 'AFFILIATE_APPLICATION_RECEIVED' | 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN' | 'LEAD_NOTIFICATION_ADMIN' | 'WITHDRAWAL_ACKNOWLEDGMENT' | 'REFUND_CONFIRMATION' | 'DISPUTE_ALERT_ADMIN' | 'CONNECT_STATUS_CHANGE' | 'ABANDONED_CHECKOUT_REMINDER' | 'REVIEW_REQUEST';
export interface EmailContext extends OrderContext {
    emailType: EmailType;
    orderData?: any;
    additionalData?: any;
    language?: string;
    adminEmail?: boolean;
    /** Tenant whose identity the email is sent under (from-name + reply-to). */
    shopId?: string;
}
export declare class EmailOrchestrator {
    private userResolver;
    private emailService;
    constructor();
    /**
     * The shop's ACTIVE admin users' emails — the zero-configuration tier of the
     * admin-notification resolution (after storeIdentity fields / ownerEmail,
     * before the platform fallback). Excludes platform operators (they manage
     * many shops but run none) and inactive users; capped to avoid spamming a
     * shop that has many staff accounts. Reply-To is NOT affected by this — a
     * personal admin email must never become the customer-facing reply address
     * unless the shop explicitly sets it as Support-e-post.
     */
    private resolveShopAdminEmails;
    /**
     * Master email sending method
     * Single entry point for ALL emails in the system
     */
    sendEmail(context: EmailContext): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
        details?: any;
    }>;
    /**
     * Generate email template based on type and context
     */
    private loadShopIdentity;
    private generateTemplate;
    /**
     * Get appropriate from address based on email type and user type
     */
    private getFromAddress;
    /**
     * Test the complete email orchestrator system
     */
    testSystem(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
}
