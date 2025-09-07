export interface EmailData {
    to: string;
    from?: string;
    subject: string;
    html: string;
    text?: string;
}
export declare class EmailService {
    private static instance;
    private transporter;
    private constructor();
    static getInstance(): EmailService;
    sendEmail(emailData: EmailData): Promise<string>;
    verifyConnection(): Promise<boolean>;
    private htmlToText;
}
