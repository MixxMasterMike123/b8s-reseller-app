// sendOrderConfirmationEmail - Unified Order Confirmation Function
// Replaces: sendB2COrderPendingEmailV3, sendB2BOrderConfirmationCustomerV3

import { onCall } from 'firebase-functions/v2/https';
import { EmailOrchestrator } from '../core/EmailOrchestrator';

interface OrderConfirmationRequest {
  orderData: {
    orderNumber: string;
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
  };
  customerInfo: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
  };
  orderId: string;
  userId?: string;
  b2cCustomerId?: string;
  source?: string;
  language?: string;
}

export const sendOrderConfirmationEmail = onCall<OrderConfirmationRequest>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('📧 sendOrderConfirmationEmail: Starting unified order confirmation');
      console.log('📧 Request data:', {
        orderNumber: request.data.orderData.orderNumber,
        customerEmail: request.data.customerInfo.email,
        userId: request.data.userId,
        b2cCustomerId: request.data.b2cCustomerId,
        source: request.data.source
      });

      // Validate required data
      if (!request.data.orderData?.orderNumber) {
        throw new Error('Order number is required');
      }
      
      if (!request.data.customerInfo?.email) {
        throw new Error('Customer email is required');
      }

      if (!request.data.orderId) {
        throw new Error('Order ID is required');
      }

      // Initialize EmailOrchestrator
      const orchestrator = new EmailOrchestrator();

      // Send email via orchestrator
      const result = await orchestrator.sendEmail({
        emailType: 'ORDER_CONFIRMATION',
        userId: request.data.userId,
        b2cCustomerId: request.data.b2cCustomerId,
        customerInfo: request.data.customerInfo,
        orderId: request.data.orderId,
        source: request.data.source,
        language: request.data.language,
        orderData: request.data.orderData,
        adminEmail: false
      });

      if (result.success) {
        console.log('✅ sendOrderConfirmationEmail: Success');
        return {
          success: true,
          messageId: result.messageId,
          details: result.details
        };
      } else {
        console.error('❌ sendOrderConfirmationEmail: Failed:', result.error);
        throw new Error(result.error || 'Email sending failed');
      }

    } catch (error) {
      console.error('❌ sendOrderConfirmationEmail: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in order confirmation email');
    }
  }
);
