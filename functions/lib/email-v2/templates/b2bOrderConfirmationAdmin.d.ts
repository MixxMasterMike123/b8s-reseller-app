export interface B2BOrderConfirmationAdminData {
    userData: {
        contactPerson?: string;
        companyName: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        postalCode?: string;
        marginal?: number;
    };
    orderData: {
        orderNumber: string;
        items?: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
        createdAt?: string;
    };
    orderSummary: string;
    totalAmount: number;
}
export declare function getB2BOrderConfirmationAdminTemplate(data: B2BOrderConfirmationAdminData, lang?: string): {
    subject: string;
    html: string;
};
