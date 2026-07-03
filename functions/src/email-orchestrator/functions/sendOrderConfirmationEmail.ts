// sendOrderConfirmationEmail - Unified Order Confirmation Function
// Replaces: sendB2COrderPendingEmailV3, sendB2BOrderConfirmationCustomerV3

import { onCall } from 'firebase-functions/v2/https';
import { appUrls } from '../../config/app-urls';
import { EmailOrchestrator } from '../core/EmailOrchestrator';
import { requireAuth, requireAdminOfShop } from './authGuard';
import { db } from '../../config/database';

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
    secrets: ['RESEND_API_KEY'],
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: appUrls.CORS_ORIGINS
  },
  async (request) => {
    try {
      // SECURITY: privileged mailer - basic auth gate; full shop-parity check
      // happens AFTER the order is loaded server-side (the order doc's own
      // shopId is the trustworthy source). Admin-SDK bypasses Firestore rules.
      requireAuth(request.auth?.uid);

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

      // TENANT ISOLATION: load the order server-side and enforce shop parity
      // against the order's OWN shopId (trustworthy source) — a shop admin may
      // only send confirmations for their own shop's orders; platform may send
      // for any.
      const orderSnap = await db.collection('orders').doc(request.data.orderId).get();
      if (!orderSnap.exists) {
        throw new Error('Order not found');
      }
      const orderData = orderSnap.data();
      await requireAdminOfShop(orderData?.shopId, request.auth?.uid);

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
        adminEmail: false,
        shopId: orderData?.shopId // tenant identity from the ORDER (trustworthy)
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
