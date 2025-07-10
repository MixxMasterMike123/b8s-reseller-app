import { onDocumentCreated } from 'firebase-functions/v2/firestore';

/**
 * DEPRECATED: Process affiliate conversion (Firestore trigger)
 * This trigger is no longer reliable due to named database limitations.
 * It has been replaced by the processB2COrderCompletion callable function.
 * Keeping for reference and pattern consistency.
 */
export const processAffiliateConversionV2 = onDocumentCreated(
  {
    document: 'order-triggers/{orderId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
  },
  async (event) => {
    const orderId = event.params?.orderId;
    console.log(`DEPRECATED trigger fired for ${orderId}. No action taken.`);
    return null;
  }
); 