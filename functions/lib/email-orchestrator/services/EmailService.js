"use strict";
// EmailService - Unified SMTP Service
// Extracted from V3 EmailService with Gmail SMTP configuration
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer = __importStar(require("nodemailer"));
const config_1 = require("../core/config");
class EmailService {
    constructor() {
        // Gmail SMTP Configuration (V3 Working Configuration)
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
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
    async sendEmail(template, options) {
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
                from: options.from || config_1.EMAIL_CONFIG.SMTP.FROM_EMAIL,
                to: options.to,
                subject: template.subject,
                html: template.html,
                text: textContent,
                replyTo: options.replyTo || config_1.EMAIL_CONFIG.SMTP.REPLY_TO,
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
        }
        catch (error) {
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
    async sendAdminEmail(template, options) {
        const adminEmails = 'info@jphinnovation.se, micke.ohlen@gmail.com';
        return this.sendEmail(template, {
            ...options,
            to: adminEmails
        });
    }
    /**
     * Validate email address format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Convert HTML to plain text
     */
    htmlToText(html) {
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
    async testConnection() {
        try {
            console.log('🧪 EmailService: Testing SMTP connection...');
            await this.transporter.verify();
            console.log('✅ EmailService: SMTP connection successful');
            return { success: true };
        }
        catch (error) {
            console.error('❌ EmailService: SMTP connection failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Connection test failed'
            };
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map