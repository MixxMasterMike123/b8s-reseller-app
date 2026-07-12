"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLoginCredentialsTemplate = void 0;
// Login Credentials Email Template — NORD-aligned, per-shop branded.
const config_1 = require("../core/config");
const emailLayout_1 = require("./emailLayout");
// A monospace value chip, reused for credential values.
function chip(value) {
    return `<span style="font-family:'Courier New',monospace;background-color:${emailLayout_1.emailTokens.card};border:1px solid ${emailLayout_1.emailTokens.border};padding:4px 10px;border-radius:6px;font-size:13px;color:${emailLayout_1.emailTokens.ink};">${(0, emailLayout_1.esc)(value)}</span>`;
}
function generateLoginCredentialsTemplate(data, lang = 'sv-SE') {
    const { userInfo, credentials, accountType, wasExistingAuthUser } = data;
    const brand = data.brandName || 'ChopShop';
    const en = lang.startsWith('en');
    const isAffiliate = accountType === 'AFFILIATE';
    const loginUrl = isAffiliate
        ? `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/affiliate-login`
        : `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}`;
    const referralUrl = isAffiliate ? `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/?ref=${credentials.affiliateCode}` : null;
    const supportUrl = `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;
    const resetUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/reset-password`;
    const portalName = en
        ? (isAffiliate ? 'the affiliate portal' : 'the reseller portal')
        : (isAffiliate ? 'affiliate-portalen' : 'återförsäljarportalen');
    const codeLabel = en
        ? (isAffiliate ? 'Affiliate code' : 'Reseller code')
        : (isAffiliate ? 'Affiliate-kod' : 'Återförsäljarkod');
    // Heading + intro
    const heading = wasExistingAuthUser
        ? (en ? 'Details updated' : 'Uppgifter uppdaterade')
        : isAffiliate
            ? (en ? `Congratulations, ${(0, emailLayout_1.esc)(userInfo.name)}!` : `Grattis, ${(0, emailLayout_1.esc)(userInfo.name)}!`)
            : (en ? `Hi ${(0, emailLayout_1.esc)(userInfo.contactPerson || userInfo.name)},` : `Hej ${(0, emailLayout_1.esc)(userInfo.contactPerson || userInfo.name)},`);
    const intro = wasExistingAuthUser
        ? (en
            ? `Your ${isAffiliate ? 'affiliate' : 'reseller'} details have been updated.`
            : `Dina ${isAffiliate ? 'affiliate' : 'återförsäljar'}uppgifter har uppdaterats.`)
        : isAffiliate
            ? (en
                ? 'Your application to our affiliate programme has been approved. You’re now an official affiliate and can start earning commission on sales.'
                : 'Din ansökan till vårt affiliateprogram har godkänts. Du är nu en officiell affiliate och kan börja tjäna provision på försäljningar.')
            : (en
                ? `We’ve created an account for ${(0, emailLayout_1.esc)(userInfo.companyName || userInfo.name)} — you can now access ${portalName}.`
                : `Vi har skapat ett konto för ${(0, emailLayout_1.esc)(userInfo.companyName || userInfo.name)} — du har nu tillgång till ${portalName}.`);
    // Credentials panel
    const credRows = [
        `<tr><td style="padding:6px 0;font-size:13px;color:${emailLayout_1.emailTokens.muted};">${en ? 'Email' : 'E-post'}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.email)}</td></tr>`,
    ];
    if (credentials.affiliateCode) {
        credRows.push(`<tr><td style="padding:6px 0;font-size:13px;color:${emailLayout_1.emailTokens.muted};">${(0, emailLayout_1.esc)(codeLabel)}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.affiliateCode)}</td></tr>`);
    }
    if (!wasExistingAuthUser && credentials.temporaryPassword) {
        credRows.push(`<tr><td style="padding:6px 0;font-size:13px;color:${emailLayout_1.emailTokens.muted};">${en ? 'Temporary password' : 'Tillfälligt lösenord'}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.temporaryPassword)}</td></tr>`);
    }
    const credentialsPanel = (0, emailLayout_1.renderPanel)(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${credRows.join('')}</table>`, en ? 'Your login details' : 'Dina inloggningsuppgifter');
    // Important info
    const importantInfo = wasExistingAuthUser
        ? (0, emailLayout_1.renderParagraph)(en
            ? 'You already had an account, so keep using your existing password. Forgotten it? Reset it with the button below.'
            : 'Du hade redan ett konto, så fortsätt använda ditt befintliga lösenord. Har du glömt det? Återställ det med knappen nedan.', { muted: true })
        : (0, emailLayout_1.renderList)(en
            ? ['Please change your password the first time you log in.', 'Your account is active with full access.']
            : ['Byt lösenord vid din första inloggning.', 'Ditt konto är aktivt med full åtkomst.'], { muted: true });
    // Affiliate referral / B2B features
    let extra = '';
    if (isAffiliate && referralUrl) {
        extra = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderParagraph)(`<a href="${(0, emailLayout_1.esc)(referralUrl)}" style="color:${emailLayout_1.emailTokens.ink};text-decoration:underline;word-break:break-all;">${(0, emailLayout_1.esc)(referralUrl)}</a>`, { html: true }) +
            (0, emailLayout_1.renderParagraph)(en ? 'Share this link to earn commission on sales.' : 'Dela den här länken för att tjäna provision på försäljningar.', { muted: true }), en ? 'Your referral link' : 'Din referral-länk');
    }
    else if (!isAffiliate) {
        extra = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderList)(en
            ? ['Place orders directly', 'View your order history', 'Download product catalogues', 'Access marketing materials']
            : ['Lägg beställningar direkt', 'Se din orderhistorik', 'Ladda ner produktkataloger', 'Kom åt marknadsföringsmaterial']), en ? 'What you can do in the portal' : 'Vad du kan göra i portalen');
    }
    const primaryCta = (0, emailLayout_1.renderButton)(loginUrl, isAffiliate
        ? (en ? 'Go to the affiliate portal' : 'Gå till affiliate-portalen')
        : (en ? 'Log in to the portal' : 'Logga in på portalen'));
    const resetCta = wasExistingAuthUser
        ? (0, emailLayout_1.renderButton)(resetUrl, en ? 'Reset password' : 'Återställ lösenord')
        : '';
    const body = (0, emailLayout_1.renderHeading)(heading) +
        (0, emailLayout_1.renderParagraph)(intro) +
        credentialsPanel +
        importantInfo +
        extra +
        primaryCta +
        resetCta;
    const subject = en
        ? isAffiliate
            ? (wasExistingAuthUser ? 'Affiliate details updated' : `Welcome to the affiliate programme – your login details`)
            : 'Welcome to the reseller portal – your login details'
        : isAffiliate
            ? (wasExistingAuthUser ? 'Affiliate-uppgifter uppdaterade' : 'Välkommen till affiliateprogrammet – dina inloggningsuppgifter')
            : 'Välkommen till återförsäljarportalen – dina inloggningsuppgifter';
    return {
        subject,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            footerExtraHtml: (0, emailLayout_1.renderFooterSupport)(supportUrl, lang),
            preheader: en ? 'Your login details' : 'Dina inloggningsuppgifter',
        }),
    };
}
exports.generateLoginCredentialsTemplate = generateLoginCredentialsTemplate;
//# sourceMappingURL=loginCredentials.js.map