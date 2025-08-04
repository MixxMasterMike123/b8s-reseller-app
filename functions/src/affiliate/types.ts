// Affiliate System Types for V2 Functions

export interface AffiliateClickData {
  affiliateCode: string;
  campaignCode?: string; // Optional campaign tracking
}

export interface AffiliateClickResponse {
  success: boolean;
  message: string;
  clickId: string;
}

export interface AffiliateData {
  id: string;
  affiliateCode: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  socials?: Record<string, string>;
  promotionMethod?: string;
  message?: string;
  status: 'active' | 'pending' | 'suspended';
  commissionRate: number;
  checkoutDiscount: number;
  stats: {
    clicks: number;
    conversions: number;
    totalEarnings: number;
    balance: number;
  };
  createdAt: any;
  updatedAt: any;
}

export interface AffiliateClickRecord {
  affiliateCode: string;
  affiliateId: string;
  campaignCode?: string; // Optional campaign tracking
  timestamp: any; // Firestore Timestamp
  ipAddress: string;
  userAgent: string;
  landingPage: string;
  converted: boolean;
  orderId?: string;
  commissionAmount?: number;
}

export interface AffiliateConversionData {
  orderId: string;
  affiliateCode?: string;
  affiliateClickId?: string;
  discountCode?: string;
  orderTotal: number;
  commissionAmount?: number;
} 