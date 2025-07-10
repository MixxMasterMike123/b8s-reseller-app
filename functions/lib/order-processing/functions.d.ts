import * as functions from 'firebase-functions';
declare global {
    var orderRateLimit: Map<string, number[]>;
}
interface OrderProcessingData {
    orderId: string;
    origin?: string;
}
/**
 * [V2] HTTP endpoint for B2C order processing with affiliate commission handling
 */
export declare const processB2COrderCompletionHttp: functions.https.HttpsFunction;
/**
 * [V2] Callable function for B2C order completion with affiliate processing
 */
export declare const processB2COrderCompletion: functions.https.CallableFunction<OrderProcessingData, any, unknown>;
/**
 * [V2] Manual function to update order status and test triggers
 */
export declare const manualStatusUpdate: functions.https.HttpsFunction;
/**
 * [V2] Manual order status update test function
 */
export declare const testOrderUpdate: functions.https.HttpsFunction;
export {};
