// sendOrderNotificationAdmin - Unified Admin Order Notification Function
// Replaces: sendB2COrderNotificationAdminV3, sendB2BOrderConfirmationAdminV3

import { onCall } from 'firebase-functions/v2/https';
import { EmailOrchestrator } from '../core/EmailOrchestrator';

interface OrderNotificationAdminRequest {
  orderData: {
    orderNumber: string;
    source?: string;
    customerInfo?: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email: string;
    };
    shippingInfo?: {
      address: string;
      apartment?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    items: Array<{
      name: string | { [key: string]: string };
      color?: string;
      size?: string;
      quantity: number;
      price: number;
      image?: string;
    }>;
    subtotal: number;
    shipping: number;
    vat: number;
    total: number;
    discountAmount?: number;
    affiliateCode?: string;
    affiliate?: { code: string };
    payment?: {
      method: string;
      status: string;
      paymentIntentId?: string;
    };
    createdAt?: string;
  };
  orderId: string;
  userId?: string;
  b2cCustomerId?: string;
  source?: string;
  language?: string;
  orderSummary?: string; // For B2B orders
  adminEmail?: string; // Specific admin email override
}

export const sendOrderNotificationAdmin = onCall<OrderNotificationAdminRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('📧 sendOrderNotificationAdmin: Starting admin order notification');
      console.log('📧 Request data:', {
        orderNumber: request.data.orderData.orderNumber,
        userId: request.data.userId,
        b2cCustomerId: request.data.b2cCustomerId,
        source: request.data.source,
        adminEmail: request.data.adminEmail
      });

      // Validate required data
      if (!request.data.orderData?.orderNumber) {
        throw new Error('Order number is required');
      }
      
      if (!request.data.orderId) {
        throw new Error('Order ID is required');
      }

      // Initialize EmailOrchestrator
      const orchestrator = new EmailOrchestrator();

      // Send admin notification email via orchestrator
      const result = await orchestrator.sendEmail({
        emailType: 'ORDER_NOTIFICATION_ADMIN',
        userId: request.data.userId,
        b2cCustomerId: request.data.b2cCustomerId,
        customerInfo: request.data.orderData.customerInfo,
        orderId: request.data.orderId,
        source: request.data.source,
        language: request.data.language || 'sv-SE',
        orderData: request.data.orderData,
        additionalData: {
          orderSummary: request.data.orderSummary,
          adminEmail: request.data.adminEmail
        },
        adminEmail: true // This is an admin email
      });

      if (result.success) {
        console.log('✅ sendOrderNotificationAdmin: Success');
        return {
          success: true,
          messageId: result.messageId,
          details: result.details
        };
      } else {
        console.error('❌ sendOrderNotificationAdmin: Failed:', result.error);
        throw new Error(result.error || 'Admin email sending failed');
      }

    } catch (error) {
      console.error('❌ sendOrderNotificationAdmin: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in admin notification email');
    }
  }
);
