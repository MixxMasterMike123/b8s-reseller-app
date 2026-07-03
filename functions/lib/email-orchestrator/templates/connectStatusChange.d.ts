export interface ConnectStatusChangeData {
    /** Human-readable Swedish descriptions of what changed. */
    changes: string[];
    /** Absolute URL to the admin payments page (appUrls.ADMIN_BASE + /admin/payments). */
    paymentsUrl: string;
    brandName?: string;
}
export declare function generateConnectStatusChangeTemplate(data: ConnectStatusChangeData): {
    subject: string;
    html: string;
    text: string;
};
