"use strict";
// EmailService — transport layer. Sends via the Resend HTTP API (native fetch,
// Node 20; no SDK dependency). Replaced the dead one.com/nodemailer SMTP
// transport 2026-07-03. The public interface is unchanged so the orchestrator
// and templates are untouched: sendEmail(template, options) → { success, ... }.
// Auth: RESEND_API_KEY from Secret Manager (declared per sending function).
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const config_1 = require("../core/config");
const RESEND_API = 'https://api.resend.com';
// Comma-separated address string → clean array (Resend takes arrays).
const toList = (s) => s.split(',').map((e) => e.trim()).filter(Boolean);
class EmailService {
    constructor() {
        // The API key comes from the runtime environment (Secret Manager in prod,
        // functions/.env.local under the emulator) — never hardcoded.
        const key = (process.env.RESEND_API_KEY || '').trim();
        if (!key) {
            throw new Error('EmailService: RESEND_API_KEY must be set in the environment');
        }
        this.apiKey = key;
        console.log('📧 EmailService: Initialized (Resend transport)');
    }
    /**
     * Send email via the Resend API.
     */
    async sendEmail(template, options) {
        try {
            console.log('📧 EmailService: To:', options.to, '| Subject:', template.subject);
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
            const replyTo = options.replyTo || config_1.EMAIL_CONFIG.SMTP.REPLY_TO;
            const payload = {
                from: options.from || config_1.EMAIL_CONFIG.SMTP.FROM_EMAIL,
                to: toList(options.to),
                subject: template.subject,
                html: template.html,
                text: textContent,
                // Empty reply-to is OMITTED (Resend rejects empty strings).
                ...(replyTo ? { reply_to: replyTo } : {}),
                ...(options.cc ? { cc: toList(options.cc) } : {}),
                ...(options.bcc ? { bcc: toList(options.bcc) } : {}),
            };
            const res = await fetch(`${RESEND_API}/emails`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                // Surface Resend's error message (truncated) without ever logging the key.
                const errBody = await res.text().catch(() => '');
                throw new Error(`Resend API ${res.status}: ${errBody.slice(0, 300)}`);
            }
            const data = (await res.json());
            console.log('✅ EmailService: Email sent, id:', data.id);
            return {
                success: true,
                messageId: data.id,
            };
        }
        catch (error) {
            console.error('❌ EmailService: Failed to send email:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown email error',
            };
        }
    }
    /**
     * Send email to admin addresses
     */
    async sendAdminEmail(template, options) {
        const adminEmails = config_1.EMAIL_CONFIG.ADMIN_RECIPIENTS;
        return this.sendEmail(template, {
            ...options,
            to: adminEmails.join(', '),
        });
    }
    /**
     * Validate email address format (supports single email or comma-separated multiple emails)
     */
    isValidEmail(email) {
        if (!email || email.trim() === '') {
            return false;
        }
        // Handle comma-separated emails
        const emails = email.split(',').map((e) => e.trim());
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // All emails must be valid
        return emails.every((e) => emailRegex.test(e));
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
     * Test the transport: verifies the API key against Resend (lists domains).
     */
    async testConnection() {
        try {
            console.log('🧪 EmailService: Testing Resend API access...');
            const res = await fetch(`${RESEND_API}/domains`, {
                headers: { Authorization: `Bearer ${this.apiKey}` },
            });
            if (!res.ok) {
                throw new Error(`Resend API ${res.status}`);
            }
            console.log('✅ EmailService: Resend API access OK');
            return { success: true };
        }
        catch (error) {
            console.error('❌ EmailService: Resend connection test failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map