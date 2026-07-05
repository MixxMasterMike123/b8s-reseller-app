export interface AbandonedCheckoutItem {
    name?: string;
    label?: string;
    quantity?: number;
    price?: number;
}
export interface AbandonedCheckoutReminderData {
    brandName: string;
    customerFirstName?: string;
    items: AbandonedCheckoutItem[];
    totals?: {
        subtotal?: number;
        vat?: number;
        shipping?: number;
        discountAmount?: number;
        total?: number;
    };
    recoveryUrl: string;
    unsubscribeUrl: string;
}
export declare function generateAbandonedCheckoutReminderTemplate(data: AbandonedCheckoutReminderData, lang?: string): {
    subject: string;
    html: string;
};
