import * as nodemailer from 'nodemailer';
import { SMTP_CONFIG, EMAIL_FROM } from './smtp-config';

export interface EmailData {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;

  private constructor() {
    console.log('🔧 EmailService: Initializing with One.com SMTP...');
    console.log(`🔧 SMTP Config - Host: ${SMTP_CONFIG.host}, Port: ${SMTP_CONFIG.port}, User: ${SMTP_CONFIG.auth.user}`);
    
    this.transporter = nodemailer.createTransport(SMTP_CONFIG);
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public async sendEmail(emailData: EmailData): Promise<string> {
    try {
      console.log(`📧 Sending email to: ${emailData.to}`);
      console.log(`📧 Subject: ${emailData.subject}`);
      
      const mailOptions = {
        from: emailData.from || EMAIL_FROM.system,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || this.htmlToText(emailData.html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully! Message ID: ${result.messageId}`);
      
      return result.messageId;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing SMTP connection...');
      await this.transporter.verify();
      console.log('✅ SMTP connection verified!');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}

