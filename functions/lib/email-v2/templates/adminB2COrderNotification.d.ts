export interface AdminB2COrderNotificationData {
    orderData: {
        orderNumber: string;
        source?: string;
        customerInfo: {
            firstName: string;
            lastName?: string;
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
    };
}
export declare function getAdminB2COrderNotificationTemplate(data: AdminB2COrderNotificationData, lang?: string): {
    subject: string;
    html: string;
};
