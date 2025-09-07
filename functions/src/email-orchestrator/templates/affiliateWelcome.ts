// Affiliate Welcome Email Template - New Affiliate Onboarding
// Extracted from V3 affiliateWelcome.ts with orchestrator integration
// Used for: New affiliate approval and welcome (different from login credentials)

import { EMAIL_CONFIG } from '../core/config';

export interface AffiliateWelcomeData {
  affiliateInfo: {
    name: string;
    email: string;
    affiliateCode: string;
    commissionRate?: number;
    checkoutDiscount?: number;
  };
  credentials: {
    email: string;
    temporaryPassword?: string;
  };
  wasExistingAuthUser: boolean;
  language: string;
}

export function generateAffiliateWelcomeTemplate(data: AffiliateWelcomeData): { subject: string; html: string } {
  const { affiliateInfo, credentials, wasExistingAuthUser, language } = data;
  
  // Generate URLs with proper language segments
  const languageSegment = language === 'sv-SE' ? 'se' : language === 'en-GB' ? 'uk' : 'us';
  const portalUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/${languageSegment}/affiliate-portal`;
  const referralUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/${languageSegment}/?ref=${affiliateInfo.affiliateCode}`;
  const supportUrl = `${EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;

  // Generate login instructions based on user type
  const loginInstructions = wasExistingAuthUser
    ? getExistingUserInstructions(language, credentials.email)
    : getNewUserInstructions(language, credentials.email, credentials.temporaryPassword);

  const templates = {
    'sv-SE': {
      subject: 'Välkommen till B8Shield Affiliate Program! - Dina inloggningsuppgifter',
      html: generateSwedishTemplate(affiliateInfo, loginInstructions, portalUrl, referralUrl, supportUrl)
    },
    'en-GB': {
      subject: 'Welcome to the B8Shield Affiliate Programme! - Your Login Credentials',
      html: generateEnglishTemplate(affiliateInfo, loginInstructions, portalUrl, referralUrl, supportUrl, 'programme', 'Kind regards')
    },
    'en-US': {
      subject: 'Welcome to the B8Shield Affiliate Program! - Your Login Credentials',
      html: generateEnglishTemplate(affiliateInfo, loginInstructions, portalUrl, referralUrl, supportUrl, 'program', 'Best regards')
    }
  };

  const template = templates[language as keyof typeof templates] || templates['sv-SE'];
  return {
    subject: template.subject,
    html: template.html
  };
}

function getExistingUserInstructions(language: string, email: string): string {
  const instructions = {
    'sv-SE': `<p style="color: #374151; margin: 0;">Du hade redan ett konto hos B8Shield, så du kan logga in med ditt befintliga lösenord. Om du har glömt det kan du återställa det på inloggningssidan.</p>
              <p style="color: #374151; margin: 10px 0 0 0;"><strong>E-post:</strong> ${email}</p>`,
    'en-GB': `<p style="color: #374151; margin: 0;">You already had an account with B8Shield, so you can log in with your existing password. If you've forgotten it, you can reset it on the login page.</p>
              <p style="color: #374151; margin: 10px 0 0 0;"><strong>Email:</strong> ${email}</p>`,
    'en-US': `<p style="color: #374151; margin: 0;">You already had an account with B8Shield, so you can log in with your existing password. If you've forgotten it, you can reset it on the login page.</p>
              <p style="color: #374151; margin: 10px 0 0 0;"><strong>Email:</strong> ${email}</p>`
  };
  
  return instructions[language as keyof typeof instructions] || instructions['sv-SE'];
}

function getNewUserInstructions(language: string, email: string, temporaryPassword?: string): string {
  const instructions = {
    'sv-SE': `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                <li><strong>Användarnamn:</strong> ${email}</li>
                <li><strong>Tillfälligt lösenord:</strong> ${temporaryPassword || '[GENERERAS]'}</li>
              </ul>
              <p style="color: #374151; margin: 10px 0 0 0;">Vi rekommenderar starkt att du byter ditt lösenord efter första inloggningen.</p>`,
    'en-GB': `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                <li><strong>Username:</strong> ${email}</li>
                <li><strong>Temporary password:</strong> ${temporaryPassword || '[GENERATED]'}</li>
              </ul>
              <p style="color: #374151; margin: 10px 0 0 0;">We strongly recommend that you change your password after your first login.</p>`,
    'en-US': `<ul style="color: #374151; margin: 0; padding-left: 20px;">
                <li><strong>Username:</strong> ${email}</li>
                <li><strong>Temporary password:</strong> ${temporaryPassword || '[GENERATED]'}</li>
              </ul>
              <p style="color: #374151; margin: 10px 0 0 0;">We strongly recommend that you change your password after your first login.</p>`
  };
  
  return instructions[language as keyof typeof instructions] || instructions['sv-SE'];
}

function generateSwedishTemplate(affiliateInfo: any, loginInstructions: string, portalUrl: string, referralUrl: string, supportUrl: string): string {
  return `
<div style="font-family: ${EMAIL_CONFIG.FONTS.PRIMARY}; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 24px;">Grattis, ${affiliateInfo.name}!</h2>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Din ansökan till B8Shields affiliate-program har blivit godkänd!</p>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 25px;">Du är nu en officiell B8Shield-affiliate och kan börja tjäna provision på alla försäljningar.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 15px; font-size: 18px;">[INLOGGNING] DINA INLOGGNINGSUPPGIFTER:</h3>
      ${loginInstructions}
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[VIKTIGT] VIKTIG INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>Du måste ändra ditt lösenord vid första inloggningen</li>
        <li>Affiliate-portalen finns på: <a href="${portalUrl}" style="color: ${EMAIL_CONFIG.COLORS.LINK}; font-weight: bold;">${portalUrl}</a></li>
        <li>Ditt konto har aktiverats och du har nu tillgång till alla affiliate-funktioner</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[AFFILIATE] DIN UNIKA AFFILIATE-LÄNK:</h4>
      <p style="color: #065f46; margin-bottom: 15px;">Använd denna länk för att tjäna provision på alla köp:</p>
      <div style="background-color: #d1fae5; padding: 12px; border-radius: 4px; border-left: 4px solid #10b981;">
        <a href="${referralUrl}" style="color: #065f46; text-decoration: none; font-weight: bold; word-break: break-all; font-size: 14px;">${referralUrl}</a>
      </div>
      ${affiliateInfo.commissionRate ? `<p style="color: #065f46; margin-top: 10px; font-size: 14px;"><strong>Din provision:</strong> ${affiliateInfo.commissionRate}% på alla försäljningar</p>` : ''}
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[FUNKTIONER] VAD KAN DU GÖRA I AFFILIATE-PORTALEN:</h4>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
        <li>Se dina försäljningsstatistik och intäkter</li>
        <li>Spåra klick och konverteringar</li>
        <li>Ladda ner marknadsföringsmaterial</li>
        <li>Hantera dina utbetalningar</li>
        <li>Få support och hjälp</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background-color: ${EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Logga in på affiliate-portalen</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 14px;">Om du har några frågor eller behöver hjälp, kontakta vår support på <a href="${supportUrl}" style="color: ${EMAIL_CONFIG.COLORS.LINK};">${supportUrl}</a></p>
    </div>
    
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Vi ser fram emot ett framgångsrikt samarbete!</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`;
}

function generateEnglishTemplate(affiliateInfo: any, loginInstructions: string, portalUrl: string, referralUrl: string, supportUrl: string, programWord: string, signOff: string): string {
  return `
<div style="font-family: ${EMAIL_CONFIG.FONTS.PRIMARY}; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 24px;">Congratulations, ${affiliateInfo.name}!</h2>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">Your application to the B8Shield affiliate ${programWord} has been approved!</p>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 25px;">You are now an official B8Shield affiliate and can start earning commission on all sales.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-top: 0; margin-bottom: 15px; font-size: 18px;">[LOGIN] YOUR LOGIN CREDENTIALS:</h3>
      ${loginInstructions}
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[IMPORTANT] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>You must change your password on first login</li>
        <li>The Affiliate Portal is available at: <a href="${portalUrl}" style="color: ${EMAIL_CONFIG.COLORS.LINK}; font-weight: bold;">${portalUrl}</a></li>
        <li>Your account has been activated and you now have access to all affiliate functions</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[AFFILIATE] YOUR UNIQUE AFFILIATE LINK:</h4>
      <p style="color: #065f46; margin-bottom: 15px;">Use this link to earn commission on ${programWord === 'programme' ? 'every' : 'all'} purchase${programWord === 'programme' ? '' : 's'}:</p>
      <div style="background-color: #d1fae5; padding: 12px; border-radius: 4px; border-left: 4px solid #10b981;">
        <a href="${referralUrl}" style="color: #065f46; text-decoration: none; font-weight: bold; word-break: break-all; font-size: 14px;">${referralUrl}</a>
      </div>
      ${affiliateInfo.commissionRate ? `<p style="color: #065f46; margin-top: 10px; font-size: 14px;"><strong>Your commission:</strong> ${affiliateInfo.commissionRate}% on all sales</p>` : ''}
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[FUNCTIONS] WHAT YOU CAN DO IN THE AFFILIATE PORTAL:</h4>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
        <li>View your sales statistics and earnings</li>
        <li>Track clicks and conversions</li>
        <li>Download marketing materials</li>
        <li>Manage your payouts</li>
        <li>Get support and help</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" style="display: inline-block; background-color: ${EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Login to Affiliate Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 14px;">If you have any questions or need assistance, please contact our support at <a href="${supportUrl}" style="color: ${EMAIL_CONFIG.COLORS.LINK};">${supportUrl}</a></p>
    </div>
    
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px;">We look forward to a successful partnership!</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">${signOff},<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`;
}
