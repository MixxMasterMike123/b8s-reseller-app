export interface PrintOrderNotificationLine {
    productName: string;
    sku: string;
    quantity: number;
    placement: string;
}
export interface PrintOrderNotificationData {
    orderNumber: string;
    shopName: string;
    deliveryMethod: 'pickup' | 'home';
    lines: PrintOrderNotificationLine[];
    printPortalUrl: string;
    brandName?: string;
}
export declare function generatePrintOrderNotificationTemplate(data: PrintOrderNotificationData): {
    subject: string;
    html: string;
    text: string;
};
