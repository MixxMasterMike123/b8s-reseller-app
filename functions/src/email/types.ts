// Email data structure
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

// Customer data structure
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

// B2C customer info structure
export interface B2CCustomerInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  lang?: string;
  preferredLang?: string;
}

// Order item structure
export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

// Base order structure
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

// Order data structure
export interface OrderData extends BaseOrder {
  // Additional order-specific fields can be added here
}

// B2C order data structure
export interface B2COrderData extends OrderData {
  customerInfo: B2CCustomerInfo;
}

// B2B order confirmation data
export interface B2BOrderConfirmationData {
  userData: UserData;
  orderData: OrderData;
  orderSummary?: string;
  totalAmount?: number;
  customerInfo?: B2CCustomerInfo;
  lang?: string;
}

// User data structure
export interface UserData {
  email: string;
  companyName: string;
  contactPerson?: string;
  isActive?: boolean;
  preferredLang?: string;
  role?: string;
}

// Email template parameters
export interface EmailTemplateParams {
  [key: string]: any;
}

// Email template structure
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

// Affiliate data structure
export interface AffiliateData {
  email: string;
  name?: string;
  affiliateCode?: string;
  preferredLang?: string;
  wasExistingAuthUser?: boolean;
}

// Email request data structures
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