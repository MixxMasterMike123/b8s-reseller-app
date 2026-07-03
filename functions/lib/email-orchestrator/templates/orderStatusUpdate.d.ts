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
    /** Pickup location name for the 'ready_for_pickup' status (Click & Collect). */
    pickupLocationName?: string;
    userType: 'B2B' | 'B2C' | 'GUEST';
    brandName?: string;
}
export declare function generateOrderStatusUpdateTemplate(data: OrderStatusUpdateData, lang?: string, orderId?: string): {
    subject: string;
    html: string;
};
