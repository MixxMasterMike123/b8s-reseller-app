export interface OrderConfirmationData {
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
    orderType: 'B2B' | 'B2C';
}
export declare function generateOrderConfirmationTemplate(data: OrderConfirmationData, lang?: string): {
    subject: string;
    html: string;
};
