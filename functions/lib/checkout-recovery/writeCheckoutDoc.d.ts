interface CheckoutTotals {
    subtotal?: number;
    vat?: number;
    shipping?: number;
    discountAmount?: number;
    total?: number;
}
export interface WriteAbandonedCheckoutParams {
    paymentIntentId: string;
    shopId: string;
    customerInfo: {
        email: string;
        name?: string;
        firstName?: string;
        marketing?: boolean;
        remindMe?: boolean;
        preferredLang?: string;
    };
    /** JSON string from createPaymentIntent.buildItemDetailsJson(false). */
    itemsJson: string;
    totals?: CheckoutTotals;
}
/**
 * Write (or overwrite) the abandoned-checkout doc for this PaymentIntent. Keyed
 * on the paymentIntentId so a retried checkout naturally supersedes its own doc.
 */
export declare function writeAbandonedCheckoutDoc(params: WriteAbandonedCheckoutParams): Promise<void>;
export {};
