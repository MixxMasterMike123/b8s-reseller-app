export interface AdminOrderNotificationData {
    orderData: {
        orderNumber: string;
        source?: string;
        customerInfo: {
            firstName?: string;
            lastName?: string;
            name?: string;
            email: string;
            companyName?: string;
            contactPerson?: string;
            phone?: string;
            address?: string;
            city?: string;
            postalCode?: string;
            marginal?: number;
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
    orderSummary?: string;
    orderType: 'B2B' | 'B2C';
}
export declare function generateOrderNotificationAdminTemplate(data: AdminOrderNotificationData, lang?: string): {
    subject: string;
    html: string;
};
