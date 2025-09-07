import { OrderContext } from '../services/UserResolver';
export type EmailType = 'ORDER_CONFIRMATION' | 'ORDER_STATUS_UPDATE' | 'ORDER_NOTIFICATION_ADMIN' | 'WELCOME' | 'PASSWORD_RESET' | 'AFFILIATE_WELCOME' | 'VERIFICATION';
export interface EmailContext extends OrderContext {
    emailType: EmailType;
    orderData?: any;
    additionalData?: any;
    language?: string;
    adminEmail?: boolean;
}
export declare class EmailOrchestrator {
    private userResolver;
    private emailService;
    constructor();
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
