"use strict";
// EmailOrchestrator - Master Email Controller
// Single entry point for ALL email operations in B8Shield system
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailOrchestrator = void 0;
const UserResolver_1 = require("../services/UserResolver");
const EmailService_1 = require("../services/EmailService");
const orderConfirmation_1 = require("../templates/orderConfirmation");
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
                return (0, orderConfirmation_1.generateOrderConfirmationTemplate)(orderConfirmationData, data.language);
            case 'ORDER_STATUS_UPDATE':
                // TO BE IMPLEMENTED
                throw new Error('Order status update template not yet implemented');
            case 'ORDER_NOTIFICATION_ADMIN':
                // TO BE IMPLEMENTED  
                throw new Error('Admin notification template not yet implemented');
            case 'WELCOME':
                // TO BE IMPLEMENTED
                throw new Error('Welcome email template not yet implemented');
            case 'PASSWORD_RESET':
                // TO BE IMPLEMENTED
                throw new Error('Password reset template not yet implemented');
            case 'AFFILIATE_WELCOME':
                // TO BE IMPLEMENTED
                throw new Error('Affiliate welcome template not yet implemented');
            case 'VERIFICATION':
                // TO BE IMPLEMENTED
                throw new Error('Verification email template not yet implemented');
            default:
                throw new Error(`Unknown email type: ${emailType}`);
        }
    }
    /**
     * Get appropriate from address based on email type and user type
     */
    getFromAddress(emailType, userType) {
        const fromAddresses = {
            'ORDER_CONFIRMATION': userType === 'B2B'
                ? '"B8Shield Återförsäljarportal" <b8shield.reseller@gmail.com>'
                : '"B8Shield Shop" <b8shield.reseller@gmail.com>',
            'ORDER_STATUS_UPDATE': '"B8Shield" <b8shield.reseller@gmail.com>',
            'ORDER_NOTIFICATION_ADMIN': '"B8Shield System" <b8shield.reseller@gmail.com>',
            'WELCOME': '"B8Shield" <b8shield.reseller@gmail.com>',
            'PASSWORD_RESET': '"B8Shield Security" <b8shield.reseller@gmail.com>',
            'AFFILIATE_WELCOME': '"B8Shield Affiliate Program" <b8shield.reseller@gmail.com>',
            'VERIFICATION': '"B8Shield" <b8shield.reseller@gmail.com>'
        };
        return fromAddresses[emailType] || '"B8Shield" <b8shield.reseller@gmail.com>';
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