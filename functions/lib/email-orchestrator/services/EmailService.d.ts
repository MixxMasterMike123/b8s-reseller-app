export interface EmailTemplate {
    subject: string;
    html: string;
    text?: string;
}
export interface EmailOptions {
    to: string;
    from?: string;
    replyTo?: string;
    cc?: string;
    bcc?: string;
    /**
     * Extra admin recipients merged with (and deduped against) the global
     * ADMIN_RECIPIENTS by sendAdminEmail — used to route tenant admin mail to the
     * shop's own supportEmail as well as the platform. Ignored by sendEmail.
     */
    extraAdminRecipients?: string[];
}
export declare class EmailService {
    private apiKey;
    constructor();
    /**
     * Send email via the Resend API.
     */
    sendEmail(template: EmailTemplate, options: EmailOptions): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    /**
     * Send email to admin addresses
     */
    sendAdminEmail(template: EmailTemplate, options: Omit<EmailOptions, 'to'>): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    /**
     * Validate email address format (supports single email or comma-separated multiple emails)
     */
    private isValidEmail;
    /**
     * Convert HTML to plain text
     */
    private htmlToText;
    /**
     * Test the transport: verifies the API key against Resend (lists domains).
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
}
