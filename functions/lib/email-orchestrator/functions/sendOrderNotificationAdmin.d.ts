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
            name: string | {
                [key: string]: string;
            };
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
        affiliate?: {
            code: string;
        };
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
    orderSummary?: string;
    adminEmail?: string;
}
export declare const sendOrderNotificationAdmin: import("firebase-functions/v2/https").CallableFunction<OrderNotificationAdminRequest, any, unknown>;
export {};
