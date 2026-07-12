"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePasswordResetTemplate = void 0;
// Password Reset Email Template — NORD-aligned, per-shop branded.
const config_1 = require("../core/config");
const emailLayout_1 = require("./emailLayout");
function generatePasswordResetTemplate(data, lang = 'sv-SE') {
    const { email, resetCode, userAgent, timestamp, userType } = data;
    const brand = data.brandName || 'ChopShop';
    // Countryless storefront URLs (i18n deferred).
    const resetUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/reset-password?code=${resetCode}`;
    const loginUrl = userType === 'AFFILIATE' || userType === 'B2B'
        ? `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/affiliate-login`
        : `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/login`;
    const en = lang.startsWith('en');
    const securityRows = (userAgent || timestamp)
        ? (0, emailLayout_1.renderKeyValueRows)([
            ...(timestamp ? [{ label: en ? 'Time' : 'Tid', value: timestamp }] : []),
            ...(userAgent ? [{ label: en ? 'Device' : 'Enhet', value: userAgent }] : []),
            { label: en ? 'Email' : 'E-post', value: email },
        ])
        : '';
    let body;
    let subject;
    if (en) {
        subject = `Reset your password – ${brand}`;
        body =
            (0, emailLayout_1.renderHeading)('Reset your password') +
                (0, emailLayout_1.renderParagraph)(`We received a request to reset the password for your ${(0, emailLayout_1.esc)(brand)} account linked to <strong>${(0, emailLayout_1.esc)(email)}</strong>. Click below to choose a new one.`, { html: true }) +
                (0, emailLayout_1.renderButton)(resetUrl, 'Reset password') +
                (0, emailLayout_1.renderParagraph)('This link is valid for 60 minutes and can only be used once. If you didn’t request this, you can safely ignore this email.', { muted: true }) +
                (0, emailLayout_1.renderParagraph)(`Once done, you can log in here: ${loginUrl}`, { muted: true }) +
                (securityRows ? (0, emailLayout_1.renderPanel)(securityRows, 'Request details') : '');
    }
    else {
        subject = `Återställ ditt lösenord – ${brand}`;
        body =
            (0, emailLayout_1.renderHeading)('Återställ ditt lösenord') +
                (0, emailLayout_1.renderParagraph)(`Vi fick en begäran om att återställa lösenordet för ditt konto hos ${(0, emailLayout_1.esc)(brand)} som är kopplat till <strong>${(0, emailLayout_1.esc)(email)}</strong>. Klicka nedan för att välja ett nytt.`, { html: true }) +
                (0, emailLayout_1.renderButton)(resetUrl, 'Återställ lösenord') +
                (0, emailLayout_1.renderParagraph)('Länken är giltig i 60 minuter och kan bara användas en gång. Om du inte begärde detta kan du ignorera mejlet.', { muted: true }) +
                (0, emailLayout_1.renderParagraph)(`När du är klar loggar du in här: ${loginUrl}`, { muted: true }) +
                (securityRows ? (0, emailLayout_1.renderPanel)(securityRows, 'Uppgifter om begäran') : '');
    }
    return {
        subject,
        html: (0, emailLayout_1.renderEmailShell)({ brandName: brand, bodyHtml: body, preheader: en ? 'Reset your password' : 'Återställ ditt lösenord' }),
    };
}
exports.generatePasswordResetTemplate = generatePasswordResetTemplate;
//# sourceMappingURL=passwordReset.js.map