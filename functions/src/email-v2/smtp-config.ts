// TEMPORARY: Gmail SMTP configuration due to One.com blocking programmatic access
// Gmail SMTP with TLS on port 587

export const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'b8shield.reseller@gmail.com',
    pass: 'ConsoleNeveV3!'
  }
};

export const EMAIL_FROM = {
  system: '"B8Shield System" <b8shield.reseller@gmail.com>',
  affiliate: '"B8Shield Affiliate Program" <b8shield.reseller@gmail.com>',
  b2c: '"B8Shield Shop" <b8shield.reseller@gmail.com>',
  b2b: '"B8Shield Återförsäljarportal" <b8shield.reseller@gmail.com>',
  support: '"B8Shield Support" <b8shield.reseller@gmail.com>'
} as const;

export const ADMIN_EMAILS = 'info@jphinnovation.se, micke.ohlen@gmail.com';

