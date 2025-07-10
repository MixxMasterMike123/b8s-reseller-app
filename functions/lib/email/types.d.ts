interface BaseEmailData {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
}
export interface EmailData extends BaseEmailData {
    customerInfo?: {
        email: string;
        firstName?: string;
        lastName?: string;
        lang?: string;
    };
    appData?: {
        name: string;
        email: string;
        preferredLang?: string;
        [key: string]: any;
    };
    orderData?: OrderData;
    userData?: UserData;
    affiliateCode?: string;
    tempPassword?: string;
    wasExistingAuthUser?: boolean;
    status?: string;
    affiliateData?: AffiliateData;
}
export interface CustomerData {
    email: string;
    companyName: string;
    contactPerson?: string;
    customerId?: string;
    isActive?: boolean;
    preferredLang?: string;
    role?: string;
    lang?: string;
}
export interface B2CCustomerInfo {
    email: string;
    firstName?: string;
    lastName?: string;
    lang?: string;
}
export interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}
export interface BaseOrder {
    source?: 'b2c' | 'b2b';
    userId?: string;
    orderNumber: string;
    items?: OrderItem[];
    totalAmount?: number;
    total?: number;
    affiliateCode?: string;
    customerInfo?: B2CCustomerInfo;
    trackingNumber?: string;
    carrier?: string;
    status: string;
}
export interface OrderData extends BaseOrder {
}
export interface B2COrderData extends OrderData {
    customerInfo: B2CCustomerInfo;
}
export interface B2BOrderConfirmationData {
    userData: UserData;
    orderData: OrderData;
    orderSummary?: string;
    totalAmount?: number;
    customerInfo?: B2CCustomerInfo;
    lang?: string;
}
export interface UserData {
    email: string;
    companyName: string;
    contactPerson?: string;
    isActive?: boolean;
    preferredLang?: string;
    role?: string;
}
export interface EmailTemplateParams {
    [key: string]: any;
}
export interface EmailTemplate {
    subject: string;
    html: string;
    text?: string;
}
export interface AffiliateData {
    email: string;
    name?: string;
    affiliateCode?: string;
    preferredLang?: string;
    wasExistingAuthUser?: boolean;
}
export interface CustomerWelcomeData {
    customerId: string;
}
export interface AffiliateWelcomeData {
    affiliateData: AffiliateData;
    temporaryPassword: string;
}
export interface B2COrderEmailData {
    orderData: B2COrderData;
    customerInfo?: B2CCustomerInfo;
    lang?: string;
}
export {};
