"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAffiliateWelcomeTemplate = void 0;
// Affiliate Welcome Email Template — NORD-aligned, per-shop branded.
// New affiliate approval + welcome (distinct from login credentials).
const config_1 = require("../core/config");
const emailLayout_1 = require("./emailLayout");
function chip(value) {
    return `<span style="font-family:'Courier New',monospace;background-color:${emailLayout_1.emailTokens.card};border:1px solid ${emailLayout_1.emailTokens.border};padding:4px 10px;border-radius:6px;font-size:13px;color:${emailLayout_1.emailTokens.ink};">${(0, emailLayout_1.esc)(value)}</span>`;
}
function generateAffiliateWelcomeTemplate(data) {
    const { affiliateInfo, credentials, wasExistingAuthUser, language } = data;
    const brand = data.brandName || 'ChopShop';
    const en = language.startsWith('en');
    const portalUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/affiliate-portal`;
    const referralUrl = `${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}/?ref=${affiliateInfo.affiliateCode}`;
    const supportUrl = `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;
    // Login block
    const loginBlock = wasExistingAuthUser
        ? (0, emailLayout_1.renderParagraph)(en
            ? `You already had an account, so log in with your existing password. Forgotten it? Reset it on the login page. Email: <strong>${(0, emailLayout_1.esc)(credentials.email)}</strong>.`
            : `Du hade redan ett konto, så logga in med ditt befintliga lösenord. Har du glömt det? Återställ det på inloggningssidan. E-post: <strong>${(0, emailLayout_1.esc)(credentials.email)}</strong>.`, { html: true, muted: true })
        : (0, emailLayout_1.renderPanel)(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:13px;color:${emailLayout_1.emailTokens.muted};">${en ? 'Username' : 'Användarnamn'}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.email)}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:${emailLayout_1.emailTokens.muted};">${en ? 'Temporary password' : 'Tillfälligt lösenord'}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.temporaryPassword || (en ? '[generated]' : '[genereras]'))}</td></tr>
        </table>
        <div style="margin-top:12px;font-size:14px;color:${emailLayout_1.emailTokens.muted};line-height:1.6;">${en ? 'We strongly recommend changing your password after your first login.' : 'Vi rekommenderar starkt att du byter lösenord efter din första inloggning.'}</div>`, en ? 'Your login details' : 'Dina inloggningsuppgifter');
    // Referral panel
    const referralPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderParagraph)(en ? 'Use this link to earn commission on every purchase:' : 'Använd den här länken för att tjäna provision på varje köp:', { muted: true }) +
        (0, emailLayout_1.renderParagraph)(`<a href="${(0, emailLayout_1.esc)(referralUrl)}" style="color:${emailLayout_1.emailTokens.ink};text-decoration:underline;word-break:break-all;font-weight:600;">${(0, emailLayout_1.esc)(referralUrl)}</a>`, { html: true }) +
        (affiliateInfo.commissionRate
            ? (0, emailLayout_1.renderParagraph)(`${en ? 'Your commission' : 'Din provision'}: <strong>${affiliateInfo.commissionRate}%</strong> ${en ? 'on all sales' : 'på alla försäljningar'}.`, { html: true, muted: true })
            : ''), en ? 'Your unique affiliate link' : 'Din unika affiliate-länk');
    const featuresPanel = (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderList)(en
        ? ['See your sales stats and earnings', 'Track clicks and conversions', 'Download marketing materials', 'Manage your payouts', 'Get support']
        : ['Se din försäljningsstatistik och dina intäkter', 'Spåra klick och konverteringar', 'Ladda ner marknadsföringsmaterial', 'Hantera dina utbetalningar', 'Få support']), en ? 'What you can do in the affiliate portal' : 'Vad du kan göra i affiliate-portalen');
    const body = (0, emailLayout_1.renderHeading)(en ? `Congratulations, ${(0, emailLayout_1.esc)(affiliateInfo.name)}!` : `Grattis, ${(0, emailLayout_1.esc)(affiliateInfo.name)}!`) +
        (0, emailLayout_1.renderParagraph)(en
            ? 'Your application to our affiliate programme has been approved. You’re now an official affiliate and can start earning commission on all sales.'
            : 'Din ansökan till vårt affiliateprogram har godkänts. Du är nu en officiell affiliate och kan börja tjäna provision på alla försäljningar.') +
        loginBlock +
        referralPanel +
        featuresPanel +
        (0, emailLayout_1.renderButton)(portalUrl, en ? 'Log in to the affiliate portal' : 'Logga in på affiliate-portalen') +
        (0, emailLayout_1.renderParagraph)(en ? 'We look forward to a great partnership!' : 'Vi ser fram emot ett fint samarbete!', { muted: true });
    const subject = en
        ? 'Welcome to the affiliate programme! – your login details'
        : 'Välkommen till affiliateprogrammet! – dina inloggningsuppgifter';
    return {
        subject,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            footerExtraHtml: (0, emailLayout_1.renderFooterSupport)(supportUrl, language),
            preheader: en ? 'Your affiliate application was approved' : 'Din affiliate-ansökan blev godkänd',
        }),
    };
}
exports.generateAffiliateWelcomeTemplate = generateAffiliateWelcomeTemplate;
//# sourceMappingURL=affiliateWelcome.js.map