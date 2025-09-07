interface OrderConfirmationRequest {
    orderData: {
        orderNumber: string;
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
export declare const sendOrderConfirmationEmail: import("firebase-functions/v2/https").CallableFunction<OrderConfirmationRequest, any, unknown>;
export {};
