// Customer types
export interface CustomerData {
  email: string;
  preferredLang?: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  role?: 'user' | 'admin';
  active?: boolean;
  marginal?: number;
  firebaseAuthUid?: string;
  credentialsSent?: boolean;
  credentialsSentAt?: Date;
  credentialsSentBy?: string;
  temporaryPassword?: string;
  requiresPasswordChange?: boolean;
  credentialsHistory?: Array<{
    sentAt: Date;
    sentBy: string;
    isResend: boolean;
  }>;
}

export interface CustomerWelcomeData {
  customerId: string;
}

// Email types
export interface EmailData {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export interface OrderData {
  id: string;
  userId: string;
  status: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    // CRITICAL: Include color and size for email templates
    color?: string;
    size?: string;
    name?: string | { [key: string]: string };
    sku?: string;
    image?: string;
  }>;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailUpdateData {
  customerId: string;
  newEmail: string;
} 