"use strict";
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
const smtp_config_1 = require("./smtp-config");
class EmailService {
    constructor() {
        console.log('🔧 EmailService: Initializing with One.com SMTP...');
        console.log(`🔧 SMTP Config - Host: ${smtp_config_1.SMTP_CONFIG.host}, Port: ${smtp_config_1.SMTP_CONFIG.port}, User: ${smtp_config_1.SMTP_CONFIG.auth.user}`);
        this.transporter = nodemailer.createTransport(smtp_config_1.SMTP_CONFIG);
    }
    static getInstance() {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }
    async sendEmail(emailData) {
        try {
            console.log(`📧 Sending email to: ${emailData.to}`);
            console.log(`📧 Subject: ${emailData.subject}`);
            const mailOptions = {
                from: emailData.from || smtp_config_1.EMAIL_FROM.system,
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text || this.htmlToText(emailData.html)
            };
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully! Message ID: ${result.messageId}`);
            return result.messageId;
        }
        catch (error) {
            console.error('❌ Email sending failed:', error);
            throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async verifyConnection() {
        try {
            console.log('🔗 Testing SMTP connection...');
            await this.transporter.verify();
            console.log('✅ SMTP connection verified!');
            return true;
        }
        catch (error) {
            console.error('❌ SMTP connection failed:', error);
            return false;
        }
    }
    htmlToText(html) {
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
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map