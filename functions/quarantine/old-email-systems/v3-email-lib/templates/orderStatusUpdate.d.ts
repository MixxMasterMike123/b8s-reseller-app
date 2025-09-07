export interface OrderStatusUpdateData {
    orderData: {
        orderNumber: string;
        items?: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
    };
    userData: {
        contactPerson?: string;
        companyName?: string;
        email: string;
    };
    newStatus: string;
    previousStatus?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    notes?: string;
}
export declare function getOrderStatusUpdateTemplate(data: OrderStatusUpdateData, lang?: string): {
    subject: string;
    html: string;
};
