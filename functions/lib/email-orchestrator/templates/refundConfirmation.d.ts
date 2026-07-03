export interface RefundConfirmationData {
    orderNumber: string;
    /** Amount actually refunded, in the buyer-facing currency unit (SEK). */
    refundAmountSek: number;
    currency?: string;
    /** True = full refund; false = partial. Drives the copy. */
    isFullRefund: boolean;
    /** True when the order carried a withdrawalRequest (exercised ångerrätt). */
    hasWithdrawal?: boolean;
    customerName?: string;
    brandName?: string;
}
export declare function generateRefundConfirmationTemplate(data: RefundConfirmationData): {
    subject: string;
    html: string;
    text: string;
};
