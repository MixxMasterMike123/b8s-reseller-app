export interface B2BOrderConfirmationCustomerData {
    userData: {
        contactPerson?: string;
        companyName: string;
        email: string;
    };
    orderData: {
        orderNumber: string;
        items?: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
    };
    orderSummary: string;
    totalAmount: number;
}
export declare function getB2BOrderConfirmationCustomerTemplate(data: B2BOrderConfirmationCustomerData, lang?: string): {
    subject: string;
    html: string;
};
