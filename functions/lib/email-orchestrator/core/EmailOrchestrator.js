"use strict";
// EmailOrchestrator - Master Email Controller
// Single entry point for ALL email operations in B8Shield system
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailOrchestrator = void 0;
const UserResolver_1 = require("../services/UserResolver");
const EmailService_1 = require("../services/EmailService");
const orderConfirmation_1 = require("../templates/orderConfirmation");
const orderStatusUpdate_1 = require("../templates/orderStatusUpdate");
const orderNotificationAdmin_1 = require("../templates/orderNotificationAdmin");
const passwordReset_1 = require("../templates/passwordReset");
const loginCredentials_1 = require("../templates/loginCredentials");
const affiliateWelcome_1 = require("../templates/affiliateWelcome");
const emailVerification_1 = require("../templates/emailVerification");
const affiliateApplicationReceived_1 = require("../templates/affiliateApplicationReceived");
const affiliateApplicationNotificationAdmin_1 = require("../templates/affiliateApplicationNotificationAdmin");
const config_1 = require("./config");
class EmailOrchestrator {
    constructor() {
        this.userResolver = new UserResolver_1.UserResolver();
        this.emailService = new EmailService_1.EmailService();
        console.log('🎼 EmailOrchestrator: Initialized with unified email system');
    }
    /**
     * Master email sending method
     * Single entry point for ALL emails in the system
     */
    async sendEmail(context) {
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
            // Step 3: Generate template
            const template = await this.generateTemplate(context.emailType, {
                userData,
                language,
                orderData: context.orderData,
                additionalData: context.additionalData,
                context
            });
            console.log('📧 EmailOrchestrator: Template generated:', template.subject);
            // Step 4: Prepare email options
            const emailOptions = {
                to: userData.email,
                from: this.getFromAddress(context.emailType, userData.type),
            };
            // Step 5: Send email
            let result;
            if (context.adminEmail) {
                console.log('📧 EmailOrchestrator: Sending admin email');
                result = await this.emailService.sendAdminEmail(template, emailOptions);
            }
            else {
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
            }
            else {
                console.error('❌ EmailOrchestrator: Email sending failed:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }
        }
        catch (error) {
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
    async generateTemplate(emailType, data) {
        console.log('📝 EmailOrchestrator: Generating template for:', emailType);
        switch (emailType) {
            case 'ORDER_CONFIRMATION':
                if (!data.orderData) {
                    throw new Error('Order data is required for order confirmation email');
                }
                const orderConfirmationData = {
                    orderData: data.orderData,
                    customerInfo: {
                        email: data.userData.email,
                        name: data.userData.name,
                        firstName: data.context.customerInfo?.firstName,
                        lastName: data.context.customerInfo?.lastName
                    },
                    orderId: data.context.orderId || '',
                    orderType: data.userData.type === 'B2B' ? 'B2B' : 'B2C'
                };
                return (0, orderConfirmation_1.generateOrderConfirmationTemplate)(orderConfirmationData, data.language, data.context.orderId);
            case 'ORDER_STATUS_UPDATE':
                if (!data.orderData) {
                    throw new Error('Order data is required for order status update email');
                }
                const orderStatusData = {
                    orderData: data.orderData,
                    userData: data.userData,
                    newStatus: data.additionalData?.newStatus || data.orderData.status,
                    previousStatus: data.additionalData?.previousStatus,
                    trackingNumber: data.additionalData?.trackingNumber,
                    estimatedDelivery: data.additionalData?.estimatedDelivery,
                    notes: data.additionalData?.notes,
                    userType: data.userData.type
                };
                return (0, orderStatusUpdate_1.generateOrderStatusUpdateTemplate)(orderStatusData, data.language, data.context.orderId);
            case 'ORDER_NOTIFICATION_ADMIN':
                if (!data.orderData) {
                    throw new Error('Order data is required for admin notification email');
                }
                const adminNotificationData = {
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
                            phone: data.userData.phone,
                            address: data.userData.address,
                            city: data.userData.city,
                            postalCode: data.userData.postalCode,
                            marginal: data.userData.marginal,
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
                    orderType: data.userData.type === 'B2B' ? 'B2B' : 'B2C'
                };
                return (0, orderNotificationAdmin_1.generateOrderNotificationAdminTemplate)(adminNotificationData, data.language);
            case 'LOGIN_CREDENTIALS':
                if (!data.additionalData?.credentials) {
                    throw new Error('Credentials data is required for login credentials email');
                }
                const loginCredentialsData = {
                    userInfo: {
                        name: data.userData.name || data.userData.contactPerson || '',
                        email: data.userData.email,
                        companyName: data.userData.companyName,
                        contactPerson: data.userData.contactPerson
                    },
                    credentials: data.additionalData.credentials,
                    accountType: (data.additionalData.accountType === 'AFFILIATE') ? 'AFFILIATE' : 'B2B',
                    wasExistingAuthUser: data.additionalData.wasExistingAuthUser || false
                };
                return (0, loginCredentials_1.generateLoginCredentialsTemplate)(loginCredentialsData, data.language);
            case 'PASSWORD_RESET':
                if (!data.additionalData?.resetCode) {
                    throw new Error('Reset code is required for password reset email');
                }
                const passwordResetData = {
                    email: data.userData.email,
                    resetCode: data.additionalData.resetCode,
                    userAgent: data.additionalData.userAgent,
                    timestamp: data.additionalData.timestamp,
                    userType: data.additionalData.userType || (data.userData.type === 'B2B' ? 'B2B' : 'B2C')
                };
                return (0, passwordReset_1.generatePasswordResetTemplate)(passwordResetData, data.language);
            case 'AFFILIATE_WELCOME':
                if (!data.additionalData?.affiliateInfo || !data.additionalData?.credentials) {
                    throw new Error('Affiliate info and credentials are required for affiliate welcome email');
                }
                const affiliateWelcomeData = {
                    affiliateInfo: data.additionalData.affiliateInfo,
                    credentials: data.additionalData.credentials,
                    wasExistingAuthUser: data.additionalData.wasExistingAuthUser || false,
                    language: data.language
                };
                return (0, affiliateWelcome_1.generateAffiliateWelcomeTemplate)(affiliateWelcomeData);
            case 'EMAIL_VERIFICATION':
                if (!data.additionalData?.verificationCode) {
                    throw new Error('Verification code is required for email verification');
                }
                const emailVerificationData = {
                    customerInfo: {
                        firstName: data.context.customerInfo?.firstName,
                        lastName: data.context.customerInfo?.lastName,
                        name: data.context.customerInfo?.name || data.userData.name,
                        email: data.userData.email
                    },
                    verificationCode: data.additionalData.verificationCode,
                    language: data.language,
                    source: data.additionalData.source
                };
                return (0, emailVerification_1.generateEmailVerificationTemplate)(emailVerificationData);
            case 'AFFILIATE_APPLICATION_RECEIVED':
                if (!data.additionalData?.applicantInfo || !data.additionalData?.applicationId) {
                    throw new Error('Affiliate application received requires applicantInfo and applicationId');
                }
                return {
                    subject: data.language === 'en-GB' || data.language === 'en-US'
                        ? 'Affiliate Application Received - B8Shield'
                        : 'Affiliate-ansökan mottagen - B8Shield',
                    html: (0, affiliateApplicationReceived_1.generateAffiliateApplicationReceivedTemplate)({
                        applicantInfo: data.additionalData.applicantInfo,
                        applicationId: data.additionalData.applicationId,
                        language: data.language
                    }),
                    text: `Thank you for your affiliate application! Your application ID: ${data.additionalData.applicationId}`
                };
            case 'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN':
                if (!data.additionalData?.applicantInfo || !data.additionalData?.applicationId) {
                    throw new Error('Affiliate application admin notification requires applicantInfo and applicationId');
                }
                return {
                    subject: `Ny Affiliate-ansökan: ${data.additionalData.applicantInfo.name}`,
                    html: (0, affiliateApplicationNotificationAdmin_1.generateAffiliateApplicationNotificationAdminTemplate)({
                        applicantInfo: data.additionalData.applicantInfo,
                        applicationId: data.additionalData.applicationId,
                        adminPortalUrl: data.additionalData.adminPortalUrl || config_1.EMAIL_CONFIG.URLS.B2B_PORTAL
                    }),
                    text: `New affiliate application from ${data.additionalData.applicantInfo.name} (${data.additionalData.applicantInfo.email}). Application ID: ${data.additionalData.applicationId}`
                };
            case 'WITHDRAWAL_ACKNOWLEDGMENT': {
                // Mottagningsbevis (acknowledgement of receipt) for an exercised right of
                // withdrawal — DAL 2 kap. 10 a § / CRD Art. 11a. Must include the content
                // + the date and time of submission. The durable acknowledgement object
                // is computed server-side in withdrawal/functions.ts and passed through.
                const ack = data.additionalData?.acknowledgement || data.orderData?.acknowledgement;
                if (!ack) {
                    throw new Error('Acknowledgement data is required for withdrawal acknowledgement email');
                }
                const itemsHtml = Array.isArray(ack.withdrawnItems) && ack.withdrawnItems.length
                    ? '<ul>' + ack.withdrawnItems.map((it) => `<li>${(it.name || '').toString()}${it.sku ? ` (${it.sku})` : ''} × ${it.quantity || 1}</li>`).join('') + '</ul>'
                    : '';
                return {
                    subject: `Mottagningsbevis – ångrat köp ${ack.orderNumber || ''}`.trim(),
                    html: `<p>Hej ${ack.consumerName || ''},</p>` +
                        `<p>Vi bekräftar att vi har tagit emot ditt meddelande om att du ångrar ditt köp.</p>` +
                        `<p><strong>Order:</strong> ${ack.orderNumber || ''}<br/>` +
                        `<strong>Mottaget:</strong> ${ack.submittedAt || ''}</p>` +
                        (itemsHtml ? `<p><strong>Ångrade varor:</strong></p>${itemsHtml}` : '') +
                        `<p>${ack.statement || ''}</p>` +
                        `<p>Spara detta mottagningsbevis. Återbetalning hanteras enligt våra villkor.</p>`,
                    text: `Mottagningsbevis – ångrat köp ${ack.orderNumber || ''}\n` +
                        `Mottaget: ${ack.submittedAt || ''}\n` +
                        `${ack.statement || ''}\n` +
                        `Spara detta mottagningsbevis. Återbetalning hanteras enligt våra villkor.`
                };
            }
            default:
                throw new Error(`Unknown email type: ${emailType}`);
        }
    }
    /**
     * Get appropriate from address based on email type and user type
     */
    getFromAddress(emailType, userType) {
        const brand = config_1.EMAIL_CONFIG.SMTP.FROM_NAME;
        const from = (displayName) => `"${displayName}" <${config_1.EMAIL_CONFIG.SMTP.FROM_EMAIL}>`;
        const fromAddresses = {
            'ORDER_CONFIRMATION': userType === 'B2B'
                ? from(`${brand} Återförsäljarportal`)
                : from(`${brand} Shop`),
            'ORDER_STATUS_UPDATE': from(brand),
            'ORDER_NOTIFICATION_ADMIN': from(`${brand} System`),
            'LOGIN_CREDENTIALS': from(brand),
            'PASSWORD_RESET': from(`${brand} Security`),
            'AFFILIATE_WELCOME': from(`${brand} Affiliate Program`),
            'EMAIL_VERIFICATION': from(`${brand} Shop`),
            'AFFILIATE_APPLICATION_RECEIVED': from(`${brand} Affiliate Program`),
            'AFFILIATE_APPLICATION_NOTIFICATION_ADMIN': from(`${brand} System`),
            'WITHDRAWAL_ACKNOWLEDGMENT': from(`${brand} Shop`)
        };
        return fromAddresses[emailType] || from(brand);
    }
    /**
     * Test the complete email orchestrator system
     */
    async testSystem() {
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
        }
        catch (error) {
            console.error('❌ EmailOrchestrator: System test failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'System test failed'
            };
        }
    }
}
exports.EmailOrchestrator = EmailOrchestrator;
//# sourceMappingURL=EmailOrchestrator.js.map