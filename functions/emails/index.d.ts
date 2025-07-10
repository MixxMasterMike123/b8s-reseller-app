interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface EmailData {
  orderData?: any;
  userData?: any;
  customerData?: any;
  temporaryPassword?: string;
  newEmail?: string;
  loginInstructions?: string;
  wasExistingAuthUser?: boolean;
  affiliateCode?: string;
}

declare function getEmail(type: string, lang?: string, data?: EmailData): EmailTemplate;

export { getEmail, EmailTemplate, EmailData }; 