// EmailService - Unified SMTP Service
// Extracted from V3 EmailService with Gmail SMTP configuration

import * as nodemailer from 'nodemailer';
import { EMAIL_CONFIG } from '../core/config';

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

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Gmail SMTP Configuration (V3 Working Configuration)
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: 'b8shield.reseller@gmail.com',
        pass: 'rcfaridkvgluhzom' // Gmail App Password
      }
    });

    console.log('📧 EmailService: Initialized with Gmail SMTP');
  }

  /**
   * Send email using unified SMTP service
   */
  async sendEmail(template: EmailTemplate, options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📧 EmailService: Preparing to send email');
      console.log('📧 EmailService: To:', options.to);
      console.log('📧 EmailService: Subject:', template.subject);

      // Validate template
      if (!template.subject || !template.html) {
        throw new Error('Email template missing required fields (subject or html)');
      }

      // Validate recipient
      if (!options.to || !this.isValidEmail(options.to)) {
        throw new Error('Invalid recipient email address');
      }

      // Convert HTML to text if not provided
      const textContent = template.text || this.htmlToText(template.html);

      // Prepare email
      const mailOptions = {
        from: options.from || EMAIL_CONFIG.SMTP.FROM_EMAIL,
        to: options.to,
        subject: template.subject,
        html: template.html,
        text: textContent,
        replyTo: options.replyTo || EMAIL_CONFIG.SMTP.REPLY_TO,
        cc: options.cc,
        bcc: options.bcc
      };

      console.log('📧 EmailService: Sending email via Gmail SMTP...');
      
      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ EmailService: Email sent successfully');
      console.log('📧 EmailService: Message ID:', result.messageId);

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ EmailService: Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  /**
   * Send email to admin addresses
   */
  async sendAdminEmail(template: EmailTemplate, options: Omit<EmailOptions, 'to'>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const adminEmails = ['info@jphinnovation.se', 'micke.ohlen@gmail.com'];
    
    return this.sendEmail(template, {
      ...options,
      to: adminEmails.join(', ')
    });
  }

  /**
   * Validate email address format (supports single email or comma-separated multiple emails)
   */
  private isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') {
      return false;
    }
    
    // Handle comma-separated emails
    const emails = email.split(',').map(e => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // All emails must be valid
    return emails.every(e => emailRegex.test(e));
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    // Handle undefined or null HTML
    if (!html || typeof html !== 'string') {
      console.warn('⚠️ EmailService: htmlToText received invalid HTML:', typeof html);
      return '';
    }

    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Test SMTP connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🧪 EmailService: Testing SMTP connection...');
      await this.transporter.verify();
      console.log('✅ EmailService: SMTP connection successful');
      return { success: true };
    } catch (error) {
      console.error('❌ EmailService: SMTP connection failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}
