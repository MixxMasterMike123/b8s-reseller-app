"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLoginCredentialsTemplate = void 0;
// Login Credentials Email Template
// Extracted from V3 welcomeCredentials.ts and affiliateCredentials.ts - DESIGN PRESERVED + MOBILE OPTIMIZED
const config_1 = require("../core/config");
function generateLoginCredentialsTemplate(data, lang = 'sv-SE') {
    const { userInfo, credentials, accountType, wasExistingAuthUser } = data;
    // Countryless storefront URLs (i18n deferred).
    let loginUrl;
    let portalName;
    let referralUrl = null;
    if (accountType === 'AFFILIATE') {
        loginUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/affiliate-login`;
        portalName = 'Affiliate-portalen';
        referralUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/?ref=${credentials.affiliateCode}`;
    }
    else {
        // B2B users
        loginUrl = `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}`;
        portalName = 'Återförsäljarportalen';
    }
    const templates = {
        'sv-SE': {
            subject: accountType === 'AFFILIATE'
                ? (wasExistingAuthUser ? 'B8Shield Affiliate-uppgifter uppdaterade' : 'Välkommen till B8Shield Affiliate Program - Dina inloggningsuppgifter')
                : 'Välkommen till B8Shield Återförsäljarportalen - Dina inloggningsuppgifter',
            html: `<div style="font-family: ${config_1.EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <!-- Header with gradient background -->
    <div style="background: linear-gradient(135deg, #459CA8 0%, #357a8a 100%); padding: 30px 20px; text-align: center; border-radius: 6px; margin: -25px -25px 25px -25px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <!-- Welcome Section -->
    <div style="text-align: center; margin-bottom: 25px;">
      <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 10px 0; font-weight: 600;">
        ${wasExistingAuthUser ? 'Uppgifter uppdaterade' :
                accountType === 'AFFILIATE' ? `Grattis, ${userInfo.name}!` : `Hej ${userInfo.contactPerson || userInfo.name},`}
      </h1>
      <p style="color: #64748b; font-size: 15px; margin: 0; line-height: 1.5;">
        ${wasExistingAuthUser ?
                `Dina ${accountType === 'AFFILIATE' ? 'affiliate' : 'återförsäljar'}uppgifter har uppdaterats.` :
                accountType === 'AFFILIATE' ?
                    'Din ansökan till B8Shields affiliate-program har blivit godkänd!' :
                    `Välkommen till B8Shield ${portalName}!`}
      </p>
    </div>

    ${!wasExistingAuthUser && accountType === 'AFFILIATE' ? `
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; font-size: 15px;">Du är nu en officiell B8Shield-affiliate och kan börja tjäna provision på alla försäljningar.</p>
    ` : ''}

    ${!wasExistingAuthUser && accountType === 'B2B' ? `
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; font-size: 15px;">Vi har skapat ett konto för <strong>${userInfo.companyName}</strong> och du kan nu komma åt vår återförsäljarportal.</p>
    ` : ''}

    <!-- Credentials Card -->
    <div style="background-color: #f1f5f9; border-left: 4px solid #459CA8; padding: 20px; margin: 25px 0; border-radius: 6px;">
      <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 16px;">🔐 Dina inloggningsuppgifter</h3>
      
      <div style="margin: 10px 0;">
        <span style="color: #475569; font-weight: 600; font-size: 14px;">E-post:</span>
        <span style="color: #1e293b; font-family: 'Courier New', monospace; background-color: #e2e8f0; padding: 6px 10px; border-radius: 4px; display: inline-block; margin-left: 8px; font-size: 13px;">${credentials.email}</span>
      </div>
      
      ${credentials.affiliateCode ? `
      <div style="margin: 10px 0;">
        <span style="color: #475569; font-weight: 600; font-size: 14px;">${accountType === 'AFFILIATE' ? 'Affiliate-kod' : 'Återförsäljarkod'}:</span>
        <span style="color: #1e293b; font-family: 'Courier New', monospace; background-color: #e2e8f0; padding: 6px 10px; border-radius: 4px; display: inline-block; margin-left: 8px; font-size: 13px;">${credentials.affiliateCode}</span>
      </div>
      ` : ''}
      
      ${!wasExistingAuthUser && credentials.temporaryPassword ? `
      <div style="margin: 10px 0;">
        <span style="color: #475569; font-weight: 600; font-size: 14px;">Tillfälligt lösenord:</span>
        <span style="color: #1e293b; font-family: 'Courier New', monospace; background-color: #e2e8f0; padding: 6px 10px; border-radius: 4px; display: inline-block; margin-left: 8px; font-size: 13px;">${credentials.temporaryPassword}</span>
      </div>
      ` : ''}
    </div>

    <!-- Important Information Box -->
    <div style="background-color: #fef3c7; border-left: 4px solid ${config_1.EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 14px;">
        ${wasExistingAuthUser ? '[BEFINTLIGT KONTO]' : '[VIKTIGT]'} VIKTIG INFORMATION:
      </h4>
      ${wasExistingAuthUser ? `
      <p style="color: #78350f; margin: 5px 0; font-size: 13px; line-height: 1.4;">Du hade redan ett konto hos B8Shield, så du kan fortsätta använda ditt befintliga lösenord. Om du har glömt det kan du återställa det med länken nedan.</p>
      ` : `
      <ul style="color: #92400e; margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.4;">
        <li style="margin-bottom: 4px;">Du måste ändra ditt lösenord vid första inloggningen</li>
        <li style="margin-bottom: 4px;">${portalName} finns på: <a href="${loginUrl}" style="color: #92400e; text-decoration: underline;">${loginUrl}</a></li>
        <li>Ditt konto har aktiverats och du har nu tillgång till alla ${accountType === 'AFFILIATE' ? 'affiliate' : 'återförsäljar'}funktioner</li>
      </ul>
      `}
    </div>

    ${accountType === 'AFFILIATE' && referralUrl ? `
    <!-- Affiliate Referral URL -->
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 10px; font-size: 14px;">[AFFILIATE] DIN REFERRAL-LÄNK:</h4>
      <div style="background-color: white; padding: 10px; border-radius: 4px; border-left: 4px solid #10b981; word-break: break-all; font-size: 13px;">
        <a href="${referralUrl}" style="color: #065f46; text-decoration: none;">${referralUrl}</a>
      </div>
      <p style="color: #065f46; margin: 8px 0 0 0; font-size: 12px;">Dela denna länk för att tjäna provision på försäljningar!</p>
    </div>
    ` : ''}

    ${accountType === 'B2B' ? `
    <!-- B2B Features -->
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 14px;">[FUNKTIONER] VAD KAN DU GÖRA I PORTALEN:</h4>
      <ul style="color: #065f46; margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.4;">
        <li style="margin-bottom: 4px;">Lägga beställningar direkt</li>
        <li style="margin-bottom: 4px;">Se din orderhistorik</li>
        <li style="margin-bottom: 4px;">Ladda ner produktkataloger</li>
        <li>Komma åt marknadsföringsmaterial</li>
      </ul>
    </div>
    ` : ''}

    <!-- Action Button -->
    <div style="text-align: center; margin: 25px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #EE7E31; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid #EE7E31;">
        ${accountType === 'AFFILIATE' ? 'Gå till affiliate-portalen' : 'Logga in på portalen'}
      </a>
    </div>

    ${wasExistingAuthUser ? `
    <div style="text-align: center; margin: 15px 0;">
      <a href="${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/reset-password" style="display: inline-block; background-color: transparent; color: #459CA8; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px; border: 2px solid #459CA8;">Återställ lösenord</a>
    </div>
    ` : ''}

    <!-- Support Information -->
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
      <h4 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-top: 0; margin-bottom: 8px; font-size: 13px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 12px; line-height: 1.4;">
        Om du har några frågor eller problem med inloggningen, kontakta vår support på 
        <a href="${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/contact" style="color: #2563eb; text-decoration: none;">${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/contact</a>
      </p>
    </div>

    ${accountType === 'B2B' ? `
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; font-size: 14px;">Vi ser fram emot ett framgångsrikt samarbete!</p>
    ` : ''}
    
    <!-- Footer -->
    <div style="border-top: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER}; padding-top: 15px; margin-top: 25px;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 13px; margin: 0; line-height: 1.4;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-GB': {
            subject: accountType === 'AFFILIATE'
                ? (wasExistingAuthUser ? 'B8Shield Affiliate Credentials Updated' : 'Welcome to B8Shield Affiliate Program - Your Credentials')
                : 'Welcome to B8Shield Reseller Portal - Your Login Credentials',
            html: `<div>English B2B/Affiliate Credentials Template</div>`
        },
        'en-US': {
            subject: accountType === 'AFFILIATE'
                ? (wasExistingAuthUser ? 'B8Shield Affiliate Credentials Updated' : 'Welcome to B8Shield Affiliate Program - Your Credentials')
                : 'Welcome to B8Shield Reseller Portal - Your Login Credentials',
            html: `<div>US English B2B/Affiliate Credentials Template</div>`
        }
    };
    const template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
exports.generateLoginCredentialsTemplate = generateLoginCredentialsTemplate;
//# sourceMappingURL=loginCredentials.js.map