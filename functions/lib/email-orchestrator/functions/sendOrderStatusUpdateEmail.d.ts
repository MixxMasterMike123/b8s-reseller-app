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
export declare const sendOrderStatusUpdateEmail: import("firebase-functions/v2/https").CallableFunction<OrderStatusUpdateRequest, any, unknown>;
export {};
