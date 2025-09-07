// EmailOrchestrator - Master Email Controller
// Single entry point for ALL email operations in B8Shield system

import { UserResolver, ResolvedUser, OrderContext } from '../services/UserResolver';
import { EmailService, EmailTemplate, EmailOptions } from '../services/EmailService';
import { generateOrderConfirmationTemplate, OrderConfirmationData } from '../templates/orderConfirmation';
import { generateOrderStatusUpdateTemplate, OrderStatusUpdateData } from '../templates/orderStatusUpdate';

export type EmailType = 
  | 'ORDER_CONFIRMATION'
  | 'ORDER_STATUS_UPDATE' 
  | 'ORDER_NOTIFICATION_ADMIN'
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'AFFILIATE_WELCOME'
  | 'VERIFICATION';

export interface EmailContext extends OrderContext {
  emailType: EmailType;
  orderData?: any;
  additionalData?: any;
  language?: string;
  adminEmail?: boolean;
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
      const emailOptions: EmailOptions = {
        to: userData.email,
        from: this.getFromAddress(context.emailType, userData.type),
      };

      // Step 5: Send email
      let result;
      if (context.adminEmail) {
        console.log('📧 EmailOrchestrator: Sending admin email');
        result = await this.emailService.sendAdminEmail(template, emailOptions);
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
  private async generateTemplate(
    emailType: EmailType, 
    data: {
      userData: ResolvedUser;
      language: string;
      orderData?: any;
      additionalData?: any;
      context: EmailContext;
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
          orderType: data.userData.type === 'B2B' ? 'B2B' : 'B2C'
        };
        
        return generateOrderConfirmationTemplate(orderConfirmationData, data.language);

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
          userType: data.userData.type
        };
        
        return generateOrderStatusUpdateTemplate(orderStatusData, data.language, data.context.orderId);

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
  private getFromAddress(emailType: EmailType, userType: ResolvedUser['type']): string {
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
