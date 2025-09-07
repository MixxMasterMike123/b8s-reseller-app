export interface OrderStatusUpdateData {
    orderData: {
        orderNumber: string;
        status: string;
        totalAmount: number;
        items?: Array<{
            name: string | {
                [key: string]: string;
            };
            quantity: number;
            price: number;
        }>;
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
    userType: 'B2B' | 'B2C' | 'GUEST';
}
export declare function generateOrderStatusUpdateTemplate(data: OrderStatusUpdateData, lang?: string, orderId?: string): {
    subject: string;
    html: string;
};
