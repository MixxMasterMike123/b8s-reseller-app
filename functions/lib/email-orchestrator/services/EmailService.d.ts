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
}
export declare class EmailService {
    private transporter;
    constructor();
    /**
     * Send email using unified SMTP service
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
     * Test SMTP connection
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
}
