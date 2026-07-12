"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmailVerificationTemplate = void 0;
// Email Verification Template — B2C customer email verification.
// Replaces Firebase's default sendEmailVerification emails.
const config_1 = require("../core/config");
const emailLayout_1 = require("./emailLayout");
function generateEmailVerificationTemplate(data) {
    const { customerInfo, verificationCode, language, source } = data;
    const brand = data.brandName || 'ChopShop';
    // Countryless storefront URLs (i18n deferred).
    const verificationUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/verify-email?oobCode=${verificationCode}`;
    const supportUrl = `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;
    const isCheckout = source === 'checkout';
    const en = language.startsWith('en');
    const customerName = customerInfo.firstName || customerInfo.name || (en ? 'there' : 'Kund');
    let body;
    let subject;
    if (en) {
        subject = `Verify your email address – ${brand}`;
        body =
            (0, emailLayout_1.renderHeading)(`Hello ${(0, emailLayout_1.esc)(customerName)}!`) +
                (0, emailLayout_1.renderParagraph)(isCheckout
                    ? 'Thank you for your order! To finish setting up your account, please verify your email address.'
                    : `Welcome to ${(0, emailLayout_1.esc)(brand)}! Please verify your email address to activate your account.`) +
                (0, emailLayout_1.renderButton)(verificationUrl, 'Verify email address') +
                (0, emailLayout_1.renderParagraph)('If the button doesn’t work, copy this link into your browser:', { muted: true }) +
                (0, emailLayout_1.renderParagraph)(`<a href="${(0, emailLayout_1.esc)(verificationUrl)}" style="color:#1A1C1E;text-decoration:underline;word-break:break-all;">${(0, emailLayout_1.esc)(verificationUrl)}</a>`, { muted: true, html: true }) +
                (0, emailLayout_1.renderParagraph)('Once verified, you can:') +
                (0, emailLayout_1.renderList)([
                    'View your order history and track deliveries',
                    'Update your profile and delivery addresses',
                    'Check out faster next time',
                    ...(isCheckout ? ['Download receipts and invoices'] : []),
                ]) +
                (0, emailLayout_1.renderParagraph)(`If you didn’t create an account with ${(0, emailLayout_1.esc)(brand)}, you can safely ignore this email.`, { muted: true });
    }
    else {
        subject = `Verifiera din e-postadress – ${brand}`;
        body =
            (0, emailLayout_1.renderHeading)(`Hej ${(0, emailLayout_1.esc)(customerName)}!`) +
                (0, emailLayout_1.renderParagraph)(isCheckout
                    ? 'Tack för din beställning! För att slutföra ditt konto behöver vi verifiera din e-postadress.'
                    : `Välkommen till ${(0, emailLayout_1.esc)(brand)}! Verifiera din e-postadress för att aktivera ditt konto.`) +
                (0, emailLayout_1.renderButton)(verificationUrl, 'Verifiera e-postadress') +
                (0, emailLayout_1.renderParagraph)('Om knappen inte fungerar, kopiera länken till din webbläsare:', { muted: true }) +
                (0, emailLayout_1.renderParagraph)(`<a href="${(0, emailLayout_1.esc)(verificationUrl)}" style="color:#1A1C1E;text-decoration:underline;word-break:break-all;">${(0, emailLayout_1.esc)(verificationUrl)}</a>`, { muted: true, html: true }) +
                (0, emailLayout_1.renderParagraph)('När du är verifierad kan du:') +
                (0, emailLayout_1.renderList)([
                    'Se din orderhistorik och spåra leveranser',
                    'Uppdatera din profil och dina leveransadresser',
                    'Handla snabbare nästa gång',
                    ...(isCheckout ? ['Ladda ner kvitton och fakturor'] : []),
                ]) +
                (0, emailLayout_1.renderParagraph)(`Om du inte har skapat ett konto hos ${(0, emailLayout_1.esc)(brand)} kan du ignorera detta mejl.`, { muted: true });
    }
    return {
        subject,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            footerExtraHtml: (0, emailLayout_1.renderFooterSupport)(supportUrl, language),
            preheader: en ? 'Verify your email address' : 'Verifiera din e-postadress',
        }),
    };
}
exports.generateEmailVerificationTemplate = generateEmailVerificationTemplate;
//# sourceMappingURL=emailVerification.js.map