// sendOrderStatusUpdateEmail - Unified Order Status Update Function  
// Replaces: sendOrderStatusEmailV3, sendOrderStatusEmail, sendStatusUpdateHttp

import { onCall } from 'firebase-functions/v2/https';
import { EmailOrchestrator } from '../core/EmailOrchestrator';

interface OrderStatusUpdateRequest {
  orderData: {
    orderNumber: string;
    status: string;
    totalAmount: number;
    items?: Array<any>;
  };
  userData: {
    email: string;
    companyName?: string;
    contactPerson?: string;
  };
  newStatus: string;
  previousStatus?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
  userId?: string;
  b2cCustomerId?: string;
  orderId?: string;
  language?: string;
}

export const sendOrderStatusUpdateEmail = onCall<OrderStatusUpdateRequest>(
  {
    region: 'us-central1', 
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
  },
  async (request) => {
    try {
      console.log('📧 sendOrderStatusUpdateEmail: Starting unified status update');
      console.log('📧 Request data:', {
        orderNumber: request.data.orderData.orderNumber,
        newStatus: request.data.newStatus,
        previousStatus: request.data.previousStatus,
        userEmail: request.data.userData.email,
        userId: request.data.userId,
        b2cCustomerId: request.data.b2cCustomerId
      });

      // Validate required data
      if (!request.data.orderData?.orderNumber) {
        throw new Error('Order number is required');
      }
      
      if (!request.data.userData?.email) {
        throw new Error('User email is required');
      }

      if (!request.data.newStatus) {
        throw new Error('New status is required');
      }

      // Initialize EmailOrchestrator
      const orchestrator = new EmailOrchestrator();

      // Prepare context for orchestrator
      const emailContext = {
        emailType: 'ORDER_STATUS_UPDATE' as const,
        userId: request.data.userId,
        b2cCustomerId: request.data.b2cCustomerId,
        customerInfo: {
          email: request.data.userData.email,
          name: request.data.userData.contactPerson || request.data.userData.companyName
        },
        orderId: request.data.orderId,
        language: request.data.language,
        orderData: request.data.orderData,
        additionalData: {
          newStatus: request.data.newStatus,
          previousStatus: request.data.previousStatus,
          trackingNumber: request.data.trackingNumber,
          estimatedDelivery: request.data.estimatedDelivery,
          notes: request.data.notes
        },
        adminEmail: false
      };

      // Send email via orchestrator
      const result = await orchestrator.sendEmail(emailContext);

      if (result.success) {
        console.log('✅ sendOrderStatusUpdateEmail: Success');
        return {
          success: true,
          messageId: result.messageId,
          details: result.details
        };
      } else {
        console.error('❌ sendOrderStatusUpdateEmail: Failed:', result.error);
        throw new Error(result.error || 'Status update email sending failed');
      }

    } catch (error) {
      console.error('❌ sendOrderStatusUpdateEmail: Fatal error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error in status update email');
    }
  }
);
