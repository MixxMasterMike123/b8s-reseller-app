import { onRequest } from 'firebase-functions/v2/https';
import { corsHandler } from './protection/cors/cors-handler';
import { rateLimiter } from './protection/rate-limiting/rate-limiter';

// Export email functions
export * from './email/functions';

// Order status update email
export { sendOrderStatusEmail } from './email/functions';

// B2C order emails
export { sendB2COrderNotificationAdmin, sendB2COrderPendingEmail } from './email/functions';

// Firestore triggers for email notifications
export { 
  sendOrderConfirmationEmails,
  sendUserActivationEmail,
  sendOrderStatusUpdateEmail,
  testEmail 
} from './email/functions';

// Customer email update
export { updateCustomerEmail } from './email/functions';

// Example protected HTTP function
export const exampleProtectedFunction = onRequest(
  { cors: true },
  async (request, response) => {
    // Apply CORS protection
    if (!corsHandler(request, response)) {
      return;
    }

    // Apply rate limiting
    if (!await rateLimiter(request, response)) {
      return;
    }

    // Function logic here
    response.json({ message: 'Protected function executed successfully' });
  }
); 