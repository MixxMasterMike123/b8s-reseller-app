import { UserData, OrderData, B2BOrderConfirmationData, CustomerWelcomeData, AffiliateWelcomeData, B2COrderEmailData } from './types';
export declare const sendCustomerWelcomeEmail: import("firebase-functions/v2/https").CallableFunction<CustomerWelcomeData, any, unknown>;
export declare const sendAffiliateWelcomeEmail: import("firebase-functions/v2/https").CallableFunction<AffiliateWelcomeData, any, unknown>;
export declare const sendB2BOrderConfirmationAdmin: import("firebase-functions/v2/https").CallableFunction<B2BOrderConfirmationData, any, unknown>;
export declare const sendB2BOrderConfirmationCustomer: import("firebase-functions/v2/https").CallableFunction<B2BOrderConfirmationData, any, unknown>;
interface OrderStatusData extends OrderData {
    trackingNumber?: string;
    carrier?: string;
}
interface OrderStatusEmailData {
    userData: UserData;
    orderData: OrderStatusData;
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}
export declare const sendOrderStatusEmail: import("firebase-functions/v2/https").CallableFunction<OrderStatusEmailData, any, unknown>;
export declare const sendB2COrderNotificationAdmin: import("firebase-functions/v2/https").CallableFunction<B2COrderEmailData, any, unknown>;
export declare const sendB2COrderPendingEmail: import("firebase-functions/v2/https").CallableFunction<B2COrderEmailData, any, unknown>;
export declare const sendOrderConfirmationEmails: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    orderId: string;
}>>;
export declare const sendUserActivationEmail: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    userId: string;
}>>;
export declare const sendOrderStatusUpdateEmail: import("firebase-functions/core").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions/v2/firestore").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    orderId: string;
}>>;
export declare const updateCustomerEmail: import("firebase-functions/v2/https").CallableFunction<{
    userId: string;
    newEmail: string;
}, any, unknown>;
export declare const testEmail: import("firebase-functions/v2/https").HttpsFunction;
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
export declare const approveAffiliate: import("firebase-functions/v2/https").CallableFunction<AffiliateApplicationData, any, unknown>;
export declare const sendStatusUpdateHttp: import("firebase-functions/v2/https").HttpsFunction;
/**
 * Send email verification to a B2C customer (Admin only)
 */
export declare const sendVerificationEmail: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    message: string;
}>, unknown>;
export declare const sendAffiliateCredentialsV2: import("firebase-functions/v2/https").CallableFunction<{
    affiliateId: string;
}, any, unknown>;
export {};
