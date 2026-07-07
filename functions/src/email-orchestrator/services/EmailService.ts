// EmailService — transport layer. Sends via the Resend HTTP API (native fetch,
// Node 20; no SDK dependency). Replaced the dead one.com/nodemailer SMTP
// transport 2026-07-03. The public interface is unchanged so the orchestrator
// and templates are untouched: sendEmail(template, options) → { success, ... }.
// Auth: RESEND_API_KEY from Secret Manager (declared per sending function).

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
  /**
   * Extra admin recipients merged with (and deduped against) the global
   * ADMIN_RECIPIENTS by sendAdminEmail — used to route tenant admin mail to the
   * shop's own supportEmail as well as the platform. Ignored by sendEmail.
   */
  extraAdminRecipients?: string[];
  /**
   * Extra transport headers (e.g. List-Unsubscribe for the abandoned-checkout
   * reminder). Passed straight through to Resend.
   */
  headers?: Record<string, string>;
}

const RESEND_API = 'https://api.resend.com';

// ⚠️ TEMPORARY launch-verification copy — remove after launch confidence.
// A single, greppable seam: every outgoing email (customer AND admin — both
// funnel through sendEmail below) is silently BCC'd to this address so the
// platform owner can verify correctness during the live launch window.
// Recipients never see it (BCC). To disable: set VERIFICATION_BCC='' (or the
// env override) and this whole block is a no-op; delete both lines to remove.
const VERIFICATION_BCC = (process.env.VERIFICATION_BCC ?? 'micke.ohlen@gmail.com').trim();

// Comma-separated address string → clean array (Resend takes arrays).
const toList = (s: string): string[] => s.split(',').map((e) => e.trim()).filter(Boolean);

export class EmailService {
  private apiKey: string;

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
  async sendEmail(template: EmailTemplate, options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

      const replyTo = options.replyTo || EMAIL_CONFIG.SMTP.REPLY_TO;

      // ⚠️ TEMPORARY launch-verification copy — remove after launch confidence.
      // Merge VERIFICATION_BCC with any caller-supplied bcc, then drop it if it
      // already appears in to/cc/bcc so nobody is mailed twice / de-anonymised.
      const explicitBcc = options.bcc ? toList(options.bcc) : [];
      const alreadyAddressed = new Set(
        [...toList(options.to), ...(options.cc ? toList(options.cc) : []), ...explicitBcc]
          .map((e) => e.toLowerCase())
      );
      const bccList = [...explicitBcc];
      if (VERIFICATION_BCC && !alreadyAddressed.has(VERIFICATION_BCC.toLowerCase())) {
        bccList.push(VERIFICATION_BCC);
      }

      const payload: Record<string, unknown> = {
        from: options.from || EMAIL_CONFIG.SMTP.FROM_EMAIL,
        to: toList(options.to),
        subject: template.subject,
        html: template.html,
        text: textContent,
        // Empty reply-to is OMITTED (Resend rejects empty strings).
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(options.cc ? { cc: toList(options.cc) } : {}),
        ...(bccList.length ? { bcc: bccList } : {}),
        // Extra transport headers (e.g. List-Unsubscribe). Omitted when empty.
        ...(options.headers && Object.keys(options.headers).length ? { headers: options.headers } : {}),
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

      const data = (await res.json()) as { id?: string };
      console.log('✅ EmailService: Email sent, id:', data.id);

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
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
  async sendAdminEmail(template: EmailTemplate, options: Omit<EmailOptions, 'to'>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Multi-tenant recipients: shop-scoped admin mail goes to the SHOP's own
    // notification address(es) (extraAdminRecipients) — the shop owner runs
    // everything around their shop, so the platform admins are NOT copied when
    // the shop resolved a real address. The orchestrator only passes extras
    // for a correctly-configured shop; when it passes NONE (unconfigured shop,
    // or a platform-level mail like a lead notification) we fall back to the
    // platform ADMIN_RECIPIENTS. Deduped case-insensitively either way.
    // NOTE: the temporary VERIFICATION_BCC (sendEmail) still copies the
    // platform owner on every send during launch, independent of this routing.
    const extras = (options.extraAdminRecipients || []).filter(Boolean);
    const source = extras.length ? extras : EMAIL_CONFIG.ADMIN_RECIPIENTS;
    const seen = new Set<string>();
    const recipients: string[] = [];
    for (const addr of source) {
      const key = addr.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      recipients.push(addr.trim());
    }

    return this.sendEmail(template, {
      ...options,
      to: recipients.join(', '),
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
    const emails = email.split(',').map((e) => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // All emails must be valid
    return emails.every((e) => emailRegex.test(e));
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
   * Test the transport: verifies the API key against Resend (lists domains).
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
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
    } catch (error) {
      console.error('❌ EmailService: Resend connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }
}
