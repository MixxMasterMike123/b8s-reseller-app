// Simple, working One.com SMTP configuration
// Based on successful local test: Config 1: Port 587 with STARTTLS

export const SMTP_CONFIG = {
  host: 'send.one.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'info@jphinnovation.se',
    pass: 'cuteSe@l54'
  }
};

export const EMAIL_FROM = {
  system: '"B8Shield System" <info@jphinnovation.se>',
  affiliate: '"B8Shield Affiliate Program" <info@jphinnovation.se>',
  b2c: '"B8Shield Shop" <info@jphinnovation.se>',
  b2b: '"B8Shield Återförsäljarportal" <info@jphinnovation.se>',
  support: '"B8Shield Support" <info@jphinnovation.se>'
} as const;

export const ADMIN_EMAILS = 'info@jphinnovation.se, micke.ohlen@gmail.com';

