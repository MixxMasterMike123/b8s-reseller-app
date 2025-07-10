import * as functions from 'firebase-functions';
import { UserData, OrderData, B2BOrderConfirmationData, CustomerWelcomeData, AffiliateWelcomeData, B2COrderEmailData } from './types';
export declare const sendCustomerWelcomeEmail: functions.https.CallableFunction<CustomerWelcomeData, any, unknown>;
export declare const sendAffiliateWelcomeEmail: functions.https.CallableFunction<AffiliateWelcomeData, any, unknown>;
export declare const sendB2BOrderConfirmationAdmin: functions.https.CallableFunction<B2BOrderConfirmationData, any, unknown>;
export declare const sendB2BOrderConfirmationCustomer: functions.https.CallableFunction<B2BOrderConfirmationData, any, unknown>;
interface OrderStatusData extends OrderData {
    trackingNumber?: string;
    carrier?: string;
}
interface OrderStatusEmailData {
    userData: UserData;
    orderData: OrderStatusData;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}
export declare const sendOrderStatusEmail: functions.https.CallableFunction<OrderStatusEmailData, any, unknown>;
export declare const sendB2COrderNotificationAdmin: functions.https.CallableFunction<B2COrderEmailData, any, unknown>;
export declare const sendB2COrderPendingEmail: functions.https.CallableFunction<B2COrderEmailData, any, unknown>;
export declare const sendOrderConfirmationEmails: functions.CloudFunction<functions.firestore.FirestoreEvent<functions.firestore.QueryDocumentSnapshot | undefined, {
    orderId: string;
}>>;
export declare const sendUserActivationEmail: functions.CloudFunction<functions.firestore.FirestoreEvent<functions.firestore.Change<functions.firestore.QueryDocumentSnapshot> | undefined, {
    userId: string;
}>>;
export declare const sendOrderStatusUpdateEmail: functions.CloudFunction<functions.firestore.FirestoreEvent<functions.firestore.Change<functions.firestore.QueryDocumentSnapshot> | undefined, {
    orderId: string;
}>>;
export declare const updateCustomerEmail: functions.https.CallableFunction<{
    userId: string;
    newEmail: string;
}, any, unknown>;
export declare const testEmail: functions.https.HttpsFunction;
interface AffiliateApplicationData {
    applicationId: string;
    checkoutDiscount?: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    socials?: Record<string, string>;
    promotionMethod?: string;
    message?: string;
    preferredLang?: string;
}
export declare const approveAffiliate: functions.https.CallableFunction<AffiliateApplicationData, any, unknown>;
export {};
