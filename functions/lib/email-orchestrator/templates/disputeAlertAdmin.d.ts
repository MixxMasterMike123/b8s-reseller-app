export interface DisputeAlertAdminData {
    shopId?: string;
    shopName?: string;
    orderId?: string;
    orderNumber?: string;
    disputeId?: string;
    reason?: string;
    amount?: number | null;
    status?: string;
    alertKind: 'dispute' | 'shortfall';
    recoveryStatus?: string;
    brandName?: string;
}
export declare function generateDisputeAlertAdminTemplate(data: DisputeAlertAdminData): {
    subject: string;
    html: string;
    text: string;
};
