"use strict";
// Email Verification Template - B2C Customer Email Verification
// Replaces: Firebase's default sendEmailVerification emails
// Used for: B2C customer email verification during registration/checkout
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmailVerificationTemplate = void 0;
const config_1 = require("../core/config");
function generateEmailVerificationTemplate(data) {
    const { customerInfo, verificationCode, language, source } = data;
    // Generate verification URL
    const languageSegment = language === 'sv-SE' ? 'se' : language === 'en-GB' ? 'uk' : 'us';
    const verificationUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/${languageSegment}/verify-email?oobCode=${verificationCode}`;
    const shopUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/${languageSegment}`;
    const supportUrl = `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;
    // Get customer name
    const customerName = customerInfo.firstName || customerInfo.name || 'Kund';
    const templates = {
        'sv-SE': {
            subject: 'Verifiera din e-postadress - B8Shield',
            html: generateSwedishTemplate(customerName, verificationUrl, shopUrl, supportUrl, source)
        },
        'en-GB': {
            subject: 'Verify your email address - B8Shield',
            html: generateEnglishTemplate(customerName, verificationUrl, shopUrl, supportUrl, source, 'programme', 'Kind regards')
        },
        'en-US': {
            subject: 'Verify your email address - B8Shield',
            html: generateEnglishTemplate(customerName, verificationUrl, shopUrl, supportUrl, source, 'program', 'Best regards')
        }
    };
    const template = templates[language] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
exports.generateEmailVerificationTemplate = generateEmailVerificationTemplate;
function generateSwedishTemplate(customerName, verificationUrl, shopUrl, supportUrl, source) {
    const isCheckout = source === 'checkout';
    return `
<div style="font-family: ${config_1.EMAIL_CONFIG.FONTS.PRIMARY}; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 24px; text-align: center;">Hej ${customerName}!</h2>
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; text-align: center;">
      ${isCheckout
        ? 'Tack för din beställning! För att slutföra din kontoregistrering behöver vi verifiera din e-postadress.'
        : 'Välkommen till B8Shield! För att aktivera ditt konto behöver vi verifiera din e-postadress.'}
    </p>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #10b981;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 18px;">[VERIFIERING] Bekräfta din e-postadress</h3>
      <p style="color: #065f46; margin-bottom: 15px; font-size: 14px;">
        Klicka på knappen nedan för att verifiera din e-postadress och ${isCheckout ? 'få tillgång till din orderhistorik' : 'aktivera ditt konto'}:
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="display: inline-block; background-color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; border: 2px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};">Verifiera e-postadress</a>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[VIKTIGT] Om knappen inte fungerar</h4>
      <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
        Kopiera och klistra in denna länk i din webbläsare:<br>
        <a href="${verificationUrl}" style="color: #92400e; word-break: break-all; font-size: 12px;">${verificationUrl}</a>
      </p>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[KONTO] Vad du får tillgång till:</h4>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px;">
        <li>Se din orderhistorik och spåra leveranser</li>
        <li>Uppdatera din profil och leveransadresser</li>
        <li>Få exklusiva erbjudanden och nyheter</li>
        <li>Snabbare checkout vid framtida köp</li>
        ${isCheckout ? '<li>Ladda ner kvitton och fakturor</li>' : ''}
      </ul>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin-bottom: 15px;">
        Eller besök vår butik direkt:
      </p>
      <a href="${shopUrl}" style="color: ${config_1.EMAIL_CONFIG.COLORS.LINK}; text-decoration: none; font-weight: 600;">shop.b8shield.com</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[SUPPORT] Behöver du hjälp?</h4>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 14px;">
        Om du har problem med verifieringen eller andra frågor, kontakta vår support på <a href="${supportUrl}" style="color: ${config_1.EMAIL_CONFIG.COLORS.LINK};">${supportUrl}</a>
      </p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 12px; margin: 10px 0 0 0;">
        Om du inte har skapat ett konto hos B8Shield kan du ignorera detta e-postmeddelande.
      </p>
    </div>
  </div>
</div>`;
}
function generateEnglishTemplate(customerName, verificationUrl, shopUrl, supportUrl, source, programWord, signOff) {
    const isCheckout = source === 'checkout';
    return `
<div style="font-family: ${config_1.EMAIL_CONFIG.FONTS.PRIMARY}; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 20px; font-size: 24px; text-align: center;">Hello ${customerName}!</h2>
    <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; text-align: center;">
      ${isCheckout
        ? 'Thank you for your order! To complete your account registration, we need to verify your email address.'
        : 'Welcome to B8Shield! To activate your account, we need to verify your email address.'}
    </p>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #10b981;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px; font-size: 18px;">[VERIFICATION] Confirm your email address</h3>
      <p style="color: #065f46; margin-bottom: 15px; font-size: 14px;">
        Click the button below to verify your email address and ${isCheckout ? 'access your order history' : 'activate your account'}:
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="display: inline-block; background-color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; border: 2px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};">Verify Email Address</a>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[IMPORTANT] If the button doesn't work</h4>
      <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
        Copy and paste this link into your browser:<br>
        <a href="${verificationUrl}" style="color: #92400e; word-break: break-all; font-size: 12px;">${verificationUrl}</a>
      </p>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px; font-size: 16px;">[ACCOUNT] What you'll get access to:</h4>
      <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px;">
        <li>View your order history and track deliveries</li>
        <li>Update your profile and delivery addresses</li>
        <li>Receive exclusive offers and news</li>
        <li>Faster checkout for future purchases</li>
        ${isCheckout ? '<li>Download receipts and invoices</li>' : ''}
      </ul>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin-bottom: 15px;">
        Or visit our shop directly:
      </p>
      <a href="${shopUrl}" style="color: ${config_1.EMAIL_CONFIG.COLORS.LINK}; text-decoration: none; font-weight: 600;">shop.b8shield.com</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; margin-top: 0; margin-bottom: 10px; font-size: 16px;">[SUPPORT] Need help?</h4>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 14px;">
        If you're having trouble with verification or have other questions, please contact our support at <a href="${supportUrl}" style="color: ${config_1.EMAIL_CONFIG.COLORS.LINK};">${supportUrl}</a>
      </p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 14px; margin: 0;">${signOff || 'Best regards'},<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
      <p style="color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 12px; margin: 10px 0 0 0;">
        If you didn't create an account with B8Shield, you can safely ignore this email.
      </p>
    </div>
  </div>
</div>`;
}
//# sourceMappingURL=emailVerification.js.map