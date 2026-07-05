// EmailOrchestrator - Master Email Controller
// Single entry point for ALL email operations on the platform.
// MULTI-TENANT IDENTITY (Option 1, 2026-07-03): callers thread `shopId` in the
// context; the orchestrator loads that shop's Store Identity and sends as
// `"{shopName}" <no-reply@platform-domain>` with replyTo = shop supportEmail.
// Without a shopId the neutral platform defaults apply.

import { UserResolver, ResolvedUser, OrderContext } from '../services/UserResolver';
import { db } from '../../config/database';
import { EmailService, EmailTemplate, EmailOptions } from '../services/EmailService';
import { generateOrderConfirmationTemplate, OrderConfirmationData } from '../templates/orderConfirmation';
import { generateOrderStatusUpdateTemplate, OrderStatusUpdateData } from '../templates/orderStatusUpdate';
import { generateOrderNotificationAdminTemplate, AdminOrderNotificationData } from '../templates/orderNotificationAdmin';
import { generatePasswordResetTemplate, PasswordResetData } from '../templates/passwordReset';
import { generateLoginCredentialsTemplate, LoginCredentialsData } from '../templates/loginCredentials';
import { generateAffiliateWelcomeTemplate, AffiliateWelcomeData } from '../templates/affiliateWelcome';
import { generateEmailVerificationTemplate, EmailVerificationData } from '../templates/emailVerification';
import { generateAffiliateApplicationReceivedTemplate } from '../templates/affiliateApplicationReceived';
import { generateAffiliateApplicationNotificationAdminTemplate } from '../templates/affiliateApplicationNotificationAdmin';
import { generateRefundConfirmationTemplate } from '../templates/refundConfirmation';
import { generateDisputeAlertAdminTemplate } from '../templates/disputeAlertAdmin';
import { generateConnectStatusChangeTemplate } from '../templates/connectStatusChange';
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderKeyValueRows,
  renderList,
  renderPanel,
  esc,
} from '../templates/emailLayout';
import { EMAIL_CONFIG } from './config';
import { appUrls } from '../../config/app-urls';

export type EmailType = 
  | 'ORDER_CONFIRMATION'
  | 'ORDER_STATUS_UPDATE' 
  | 'ORDER_NOTIFICATION_ADMIN'
  | 'PASSWORD_RESET'
  | 'LOGIN_CREDENTIALS'
  | 'AFFILIATE_WELCOME'
  | 'EMAIL_VERIFICATION'
  | 'AFFILIATE_APPLICATION_RECEIVED'
  | 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN'
  | 'LEAD_NOTIFICATION_ADMIN'
  | 'WITHDRAWAL_ACKNOWLEDGMENT'
  | 'REFUND_CONFIRMATION'
  | 'DISPUTE_ALERT_ADMIN'
  | 'CONNECT_STATUS_CHANGE';

export interface EmailContext extends OrderContext {
  emailType: EmailType;
  orderData?: any;
  additionalData?: any;
  language?: string;
  adminEmail?: boolean;
  /** Tenant whose identity the email is sent under (from-name + reply-to). */
  shopId?: string;
}

// The slice of a shop's Store Identity the email layer uses.
interface ShopEmailIdentity {
  shopName?: string;
  supportEmail?: string;
}

export class EmailOrchestrator {
  private userResolver: UserResolver;
  private emailService: EmailService;

  constructor() {
    this.userResolver = new UserResolver();
    this.emailService = new EmailService();
    console.log('🎼 EmailOrchestrator: Initialized with unified email system');
  }

  /**
   * Master email sending method
   * Single entry point for ALL emails in the system
   */
  async sendEmail(context: EmailContext): Promise<{ success: boolean; messageId?: string; error?: string; details?: any }> {
    try {
      console.log('🎼 EmailOrchestrator: Processing email request');
      console.log('🎼 EmailOrchestrator: Email type:', context.emailType);
      console.log('🎼 EmailOrchestrator: Context:', {
        userId: context.userId,
        b2cCustomerId: context.b2cCustomerId,
        customerEmail: context.customerInfo?.email,
        source: context.source,
        adminEmail: context.adminEmail
      });

      // Step 1: Resolve user data
      const userData = await this.userResolver.resolve(context);
      console.log('✅ EmailOrchestrator: User resolved:', { 
        email: userData.email, 
        type: userData.type,
        name: userData.name 
      });

      // Step 2: Determine language
      const language = context.language || userData.language || 'sv-SE';
      console.log('🌍 EmailOrchestrator: Language selected:', language);

      // Step 2b: Resolve the tenant's sender identity (neutral fallback).
      const shopIdentity = await this.loadShopIdentity(context.shopId);
      const brandName = shopIdentity?.shopName || EMAIL_CONFIG.SMTP.FROM_NAME;

      // Step 3: Generate template
      const template = await this.generateTemplate(context.emailType, {
        userData,
        language,
        orderData: context.orderData,
        additionalData: context.additionalData,
        context,
        brandName
      });
      console.log('📧 EmailOrchestrator: Template generated:', template.subject);

      // Step 4: Prepare email options
      const emailOptions: EmailOptions = {
        to: userData.email,
        from: this.getFromAddress(context.emailType, userData.type, shopIdentity?.shopName),
        // Replies go to the SHOP, not the platform (when the shop has set one).
        ...(shopIdentity?.supportEmail ? { replyTo: shopIdentity.supportEmail } : {}),
      };

      // Step 5: Send email
      let result;
      if (context.adminEmail) {
        console.log('📧 EmailOrchestrator: Sending admin email');
        // Multi-tenant admin routing: when this shop resolved a valid
        // supportEmail, the shop gets the notification alongside the platform
        // (deduped in sendAdminEmail). No shopId / no supportEmail → platform only.
        const extraAdminRecipients = shopIdentity?.supportEmail ? [shopIdentity.supportEmail] : [];
        result = await this.emailService.sendAdminEmail(template, { ...emailOptions, extraAdminRecipients });
      } else {
        console.log('📧 EmailOrchestrator: Sending customer email');
        result = await this.emailService.sendEmail(template, emailOptions);
      }

      if (result.success) {
        console.log('✅ EmailOrchestrator: Email sent successfully');
        return {
          success: true,
          messageId: result.messageId,
          details: {
            emailType: context.emailType,
            recipient: userData.email,
            userType: userData.type,
            language: language,
            subject: template.subject
          }
        };
      } else {
        console.error('❌ EmailOrchestrator: Email sending failed:', result.error);
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      console.error('❌ EmailOrchestrator: Fatal error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown orchestrator error'
      };
    }
  }

  /**
   * Generate email template based on type and context
   */
  // Load the tenant's Store Identity slice for sender identity. Best-effort:
  // any failure falls back to the neutral platform defaults (an email must
  // never fail because a shop doc read did).
  private async loadShopIdentity(shopId?: string): Promise<ShopEmailIdentity | null> {
    if (!shopId) return null;
    try {
      const snap = await db.collection('shops').doc(shopId).get();
      if (!snap.exists) return null;
      const si = snap.data()?.storeIdentity || {};
      const shopName = typeof si.shopName === 'string' && si.shopName.trim() ? si.shopName.trim() : undefined;
      const supportEmail = typeof si.supportEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(si.supportEmail.trim())
        ? si.supportEmail.trim()
        : undefined;
      return { shopName, supportEmail };
    } catch (error) {
      console.warn('⚠️ EmailOrchestrator: shop identity load failed (using platform defaults):', error);
      return null;
    }
  }

  private async generateTemplate(
    emailType: EmailType,
    data: {
      userData: ResolvedUser;
      language: string;
      orderData?: any;
      additionalData?: any;
      context: EmailContext;
      brandName: string;
    }
  ): Promise<EmailTemplate> {
    
    console.log('📝 EmailOrchestrator: Generating template for:', emailType);

    switch (emailType) {
      case 'ORDER_CONFIRMATION':
        if (!data.orderData) {
          throw new Error('Order data is required for order confirmation email');
        }
        
        const orderConfirmationData: OrderConfirmationData = {
          orderData: data.orderData,
          customerInfo: {
            email: data.userData.email,
            name: data.userData.name,
            firstName: data.context.customerInfo?.firstName,
            lastName: data.context.customerInfo?.lastName
          },
          orderId: data.context.orderId || '',
          orderType: data.userData.type === 'B2B' ? 'B2B' : 'B2C',
          brandName: data.brandName
        };

        return generateOrderConfirmationTemplate(orderConfirmationData, data.language, data.context.orderId);

      case 'ORDER_STATUS_UPDATE':
        if (!data.orderData) {
          throw new Error('Order data is required for order status update email');
        }
        
        const orderStatusData: OrderStatusUpdateData = {
          orderData: data.orderData,
          userData: data.userData,
          newStatus: data.additionalData?.newStatus || data.orderData.status,
          previousStatus: data.additionalData?.previousStatus,
          trackingNumber: data.additionalData?.trackingNumber,
          estimatedDelivery: data.additionalData?.estimatedDelivery,
          notes: data.additionalData?.notes,
          // Click & Collect: pickup location name for the ready_for_pickup step.
          // Prefer an explicit additionalData value, else read the order doc.
          pickupLocationName: data.additionalData?.pickupLocationName || data.orderData?.pickupLocation?.name,
          userType: data.userData.type,
          brandName: data.brandName
        };

        return generateOrderStatusUpdateTemplate(orderStatusData, data.language, data.context.orderId);

      case 'ORDER_NOTIFICATION_ADMIN':
        if (!data.orderData) {
          throw new Error('Order data is required for admin notification email');
        }
        
        const adminNotificationData: AdminOrderNotificationData = {
          orderData: {
            orderNumber: data.orderData.orderNumber || data.context.orderId || '',
            source: data.context.source,
            customerInfo: {
              firstName: data.context.customerInfo?.firstName,
              lastName: data.context.customerInfo?.lastName,
              name: data.userData.name,
              email: data.userData.email,
              companyName: data.userData.companyName,
              contactPerson: data.userData.contactPerson,
              phone: (data.userData as any).phone,
              address: (data.userData as any).address,
              city: (data.userData as any).city,
              postalCode: (data.userData as any).postalCode,
              marginal: (data.userData as any).marginal,
            },
            shippingInfo: data.orderData.shippingInfo,
            items: data.orderData.items || [],
            subtotal: data.orderData.subtotal || 0,
            shipping: data.orderData.shipping || 0,
            vat: data.orderData.vat || 0,
            total: data.orderData.total || 0,
            discountAmount: data.orderData.discountAmount,
            affiliateCode: data.orderData.affiliateCode,
            affiliate: data.orderData.affiliate,
            payment: data.orderData.payment,
            createdAt: data.orderData.createdAt,
          },
          orderSummary: data.additionalData?.orderSummary,
          orderType: data.userData.type === 'B2B' ? 'B2B' : 'B2C',
          brandName: data.brandName
        };

        return generateOrderNotificationAdminTemplate(adminNotificationData, data.language);

      case 'LOGIN_CREDENTIALS':
        if (!data.additionalData?.credentials) {
          throw new Error('Credentials data is required for login credentials email');
        }
        
        const loginCredentialsData: LoginCredentialsData = {
          userInfo: {
            name: data.userData.name || data.userData.contactPerson || '',
            email: data.userData.email,
            companyName: data.userData.companyName,
            contactPerson: data.userData.contactPerson
          },
          credentials: data.additionalData.credentials,
          accountType: (data.additionalData.accountType === 'AFFILIATE') ? 'AFFILIATE' : 'B2B',
          wasExistingAuthUser: data.additionalData.wasExistingAuthUser || false,
          brandName: data.brandName
        };

        return generateLoginCredentialsTemplate(loginCredentialsData, data.language);

      case 'PASSWORD_RESET':
        if (!data.additionalData?.resetCode) {
          throw new Error('Reset code is required for password reset email');
        }
        
        const passwordResetData: PasswordResetData = {
          email: data.userData.email,
          resetCode: data.additionalData.resetCode,
          userAgent: data.additionalData.userAgent,
          timestamp: data.additionalData.timestamp,
          userType: data.additionalData.userType || (data.userData.type === 'B2B' ? 'B2B' : 'B2C'),
          brandName: data.brandName
        };

        return generatePasswordResetTemplate(passwordResetData, data.language);

      case 'AFFILIATE_WELCOME':
        if (!data.additionalData?.affiliateInfo || !data.additionalData?.credentials) {
          throw new Error('Affiliate info and credentials are required for affiliate welcome email');
        }
        
        const affiliateWelcomeData: AffiliateWelcomeData = {
          affiliateInfo: data.additionalData.affiliateInfo,
          credentials: data.additionalData.credentials,
          wasExistingAuthUser: data.additionalData.wasExistingAuthUser || false,
          language: data.language,
          brandName: data.brandName
        };

        return generateAffiliateWelcomeTemplate(affiliateWelcomeData);

      case 'EMAIL_VERIFICATION':
        if (!data.additionalData?.verificationCode) {
          throw new Error('Verification code is required for email verification');
        }
        
        const emailVerificationData: EmailVerificationData = {
          customerInfo: {
            firstName: data.context.customerInfo?.firstName,
            lastName: data.context.customerInfo?.lastName,
            name: data.context.customerInfo?.name || data.userData.name,
            email: data.userData.email
          },
          verificationCode: data.additionalData.verificationCode,
          language: data.language,
          source: data.additionalData.source,
          brandName: data.brandName
        };

        return generateEmailVerificationTemplate(emailVerificationData);

      case 'AFFILIATE_APPLICATION_RECEIVED':
        if (!data.additionalData?.applicantInfo || !data.additionalData?.applicationId) {
          throw new Error('Affiliate application received requires applicantInfo and applicationId');
        }
        
        return {
          subject: data.language === 'en-GB' || data.language === 'en-US'
            ? `Affiliate Application Received - ${data.brandName}`
            : `Affiliate-ansökan mottagen - ${data.brandName}`,
          html: generateAffiliateApplicationReceivedTemplate({
            applicantInfo: data.additionalData.applicantInfo,
            applicationId: data.additionalData.applicationId,
            language: data.language,
            brandName: data.brandName
          }),
          text: `Thank you for your affiliate application! Your application ID: ${data.additionalData.applicationId}`
        };

      case 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN':
        if (!data.additionalData?.applicantInfo || !data.additionalData?.applicationId) {
          throw new Error('Affiliate application admin notification requires applicantInfo and applicationId');
        }
        
        return {
          subject: `Ny Affiliate-ansökan: ${data.additionalData.applicantInfo.name}`,
          html: generateAffiliateApplicationNotificationAdminTemplate({
            applicantInfo: data.additionalData.applicantInfo,
            applicationId: data.additionalData.applicationId,
            adminPortalUrl: data.additionalData.adminPortalUrl || EMAIL_CONFIG.URLS.B2B_PORTAL,
            brandName: data.brandName
          }),
          text: `New affiliate application from ${data.additionalData.applicantInfo.name} (${data.additionalData.applicantInfo.email}). Application ID: ${data.additionalData.applicationId}`
        };

      case 'LEAD_NOTIFICATION_ADMIN': {
        // Platform-admin alert: a prospective merchant submitted the landing-
        // page lead form ("Vill du ha en egen butik?"). Fired best-effort from
        // leads/submitLead.ts AFTER the lead doc is written. Platform-level —
        // no shop identity involved.
        const lead = data.additionalData?.lead;
        if (!lead) {
          throw new Error('Lead data is required for lead admin notification');
        }
        const leadBody =
          renderHeading('Ny intresseanmälan — egen butik') +
          renderParagraph('Någon har skickat in lead-formuläret på landningssidan.') +
          renderKeyValueRows([
            { label: 'Namn', value: String(lead.name || '') },
            { label: 'Företag', value: String(lead.company || '—') },
            { label: 'E-post', value: String(lead.email || '') },
            { label: 'Lead-ID', value: String(data.additionalData?.leadId || '') },
          ]) +
          (lead.message ? renderPanel(renderParagraph(String(lead.message)), 'Meddelande') : '') +
          renderParagraph('Leaden är sparad i `leads` med status "new".', { muted: true });
        return {
          subject: `Ny intresseanmälan: ${lead.name || lead.email}`,
          html: renderEmailShell({
            brandName: data.brandName,
            bodyHtml: leadBody,
            preheader: `Ny intresseanmälan från ${lead.name || lead.email}`,
          }),
          text:
            `Ny intresseanmälan — egen butik\n` +
            `Namn: ${lead.name || ''}\nFöretag: ${lead.company || ''}\n` +
            `E-post: ${lead.email || ''}\n\n${lead.message || ''}`
        };
      }

      case 'WITHDRAWAL_ACKNOWLEDGMENT': {
        // Mottagningsbevis (acknowledgement of receipt) for an exercised right of
        // withdrawal — DAL 2 kap. 10 a § / CRD Art. 11a. Must include the content
        // + the date and time of submission. The durable acknowledgement object
        // is computed server-side in withdrawal/functions.ts and passed through.
        const ack = data.additionalData?.acknowledgement || data.orderData?.acknowledgement;
        if (!ack) {
          throw new Error('Acknowledgement data is required for withdrawal acknowledgement email');
        }
        // Legal content (order number, submittedAt, withdrawn items, statement,
        // "spara detta mottagningsbevis" instruction) is preserved verbatim — only
        // the presentation is restyled onto the shared NORD shell.
        const withdrawnItems: string[] = Array.isArray(ack.withdrawnItems) && ack.withdrawnItems.length
          ? ack.withdrawnItems.map((it: any) =>
              `${esc(it.name || '')}${it.sku ? ` (${esc(it.sku)})` : ''} × ${esc(it.quantity || 1)}`)
          : [];
        const ackBody =
          renderHeading('Mottagningsbevis – ångrat köp') +
          renderParagraph(`Hej ${esc(ack.consumerName || '')},`) +
          renderParagraph('Vi bekräftar att vi har tagit emot ditt meddelande om att du ångrar ditt köp.') +
          renderKeyValueRows([
            { label: 'Order', value: String(ack.orderNumber || '') },
            { label: 'Mottaget', value: String(ack.submittedAt || '') },
          ]) +
          (withdrawnItems.length
            ? renderPanel(renderList(withdrawnItems), 'Ångrade varor')
            : '') +
          (ack.statement ? renderParagraph(String(ack.statement)) : '') +
          renderParagraph('Spara detta mottagningsbevis. Återbetalning hanteras enligt våra villkor.', { muted: true });
        return {
          subject: `Mottagningsbevis – ångrat köp ${ack.orderNumber || ''}`.trim(),
          html: renderEmailShell({
            brandName: data.brandName,
            bodyHtml: ackBody,
            preheader: `Mottagningsbevis – ångrat köp ${ack.orderNumber || ''}`.trim(),
          }),
          text:
            `Mottagningsbevis – ångrat köp ${ack.orderNumber || ''}\n` +
            `Mottaget: ${ack.submittedAt || ''}\n` +
            `${ack.statement || ''}\n` +
            `Spara detta mottagningsbevis. Återbetalning hanteras enligt våra villkor.`
        };
      }

      case 'REFUND_CONFIRMATION': {
        // Buyer-facing refund receipt. Fired from connectRefund.ts after the
        // refund succeeds. `refundAmountSek` = amount actually refunded (partial
        // or full); `isFullRefund` distinguishes the copy; `hasWithdrawal` adds
        // the ångerrätt-completion line when the order carried a withdrawalRequest.
        const ad = data.additionalData || {};
        return generateRefundConfirmationTemplate({
          orderNumber: String(ad.orderNumber || data.orderData?.orderNumber || data.context.orderId || ''),
          refundAmountSek: Number(ad.refundAmountSek || 0),
          currency: ad.currency || 'SEK',
          isFullRefund: ad.isFullRefund !== false,
          hasWithdrawal: !!ad.hasWithdrawal,
          customerName: data.userData.name,
          brandName: data.brandName,
        });
      }

      case 'DISPUTE_ALERT_ADMIN': {
        // Platform-admin alert for a chargeback / shortfall. Best-effort from the
        // Stripe webhook. Names the shop so a multi-shop platform inbox can triage.
        const ad = data.additionalData || {};
        return generateDisputeAlertAdminTemplate({
          shopId: ad.shopId,
          shopName: ad.shopName,
          orderId: ad.orderId,
          orderNumber: ad.orderNumber,
          disputeId: ad.disputeId,
          reason: ad.reason,
          amount: ad.amount,
          status: ad.status,
          alertKind: ad.alertKind === 'shortfall' ? 'shortfall' : 'dispute',
          recoveryStatus: ad.recoveryStatus,
          brandName: data.brandName,
        });
      }

      case 'CONNECT_STATUS_CHANGE': {
        // Shop-owner alert: their Stripe Connect account status changed in a way
        // that can block payouts. Fired from the account.updated webhook only on
        // meaningful transitions. CTA → the admin payments page.
        const ad = data.additionalData || {};
        return generateConnectStatusChangeTemplate({
          changes: Array.isArray(ad.changes) ? ad.changes : [],
          paymentsUrl: `${appUrls.ADMIN_BASE.replace(/\/$/, '')}/admin/payments`,
          brandName: data.brandName,
        });
      }

      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }
  }

  /**
   * Get appropriate from address based on email type and user type
   */
  private getFromAddress(emailType: EmailType, _userType: ResolvedUser['type'], shopName?: string): string {
    // Customer-facing mail sends as the SHOP (or the neutral platform name);
    // admin notifications carry a System suffix so they sort visibly.
    const brand = shopName || EMAIL_CONFIG.SMTP.FROM_NAME;
    const from = (displayName: string) => `"${displayName}" <${EMAIL_CONFIG.SMTP.FROM_EMAIL}>`;

    if (
      emailType === 'ORDER_NOTIFICATION_ADMIN' ||
      emailType === 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN' ||
      emailType === 'LEAD_NOTIFICATION_ADMIN' ||
      emailType === 'DISPUTE_ALERT_ADMIN'
    ) {
      return from(`${brand} System`);
    }
    return from(brand);
  }

  /**
   * Test the complete email orchestrator system
   */
  async testSystem(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('🧪 EmailOrchestrator: Running system test...');
      
      // Test SMTP connection
      const smtpTest = await this.emailService.testConnection();
      if (!smtpTest.success) {
        return {
          success: false,
          error: `SMTP connection failed: ${smtpTest.error}`
        };
      }

      console.log('✅ EmailOrchestrator: System test passed');
      return {
        success: true,
        details: {
          smtp: 'connected',
          userResolver: 'ready',
          orchestrator: 'ready'
        }
      };

    } catch (error) {
      console.error('❌ EmailOrchestrator: System test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'System test failed'
      };
    }
  }
}
