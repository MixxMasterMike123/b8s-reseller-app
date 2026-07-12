"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAffiliateApplicationReceivedTemplate = void 0;
// affiliateApplicationReceived.ts — sent to an applicant when their affiliate
// application is received. NORD-aligned, per-shop branded. Returns HTML only
// (the subject is composed by the orchestrator).
const config_1 = require("../core/config");
const emailLayout_1 = require("./emailLayout");
function generateAffiliateApplicationReceivedTemplate(data) {
    const { applicantInfo, applicationId, language } = data;
    const brand = data.brandName || 'ChopShop';
    const en = language.startsWith('en');
    const supportUrl = `${config_1.EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;
    const steps = en
        ? [
            'We review your application within 1–3 business days',
            'We check your social media and marketing channels',
            'You’ll receive an email with our decision',
            'If approved, you’ll get your login details and affiliate link',
        ]
        : [
            'Vi granskar din ansökan inom 1–3 arbetsdagar',
            'Vi tittar på dina sociala medier och marknadsföringskanaler',
            'Du får ett mejl med vårt beslut',
            'Vid godkännande får du dina inloggningsuppgifter och din affiliate-länk',
        ];
    const idPanel = (0, emailLayout_1.renderPanel)(`<div style="font-family:'Courier New',monospace;font-size:15px;font-weight:600;color:${emailLayout_1.emailTokens.ink};word-break:break-all;">${(0, emailLayout_1.esc)(applicationId)}</div>`, en ? 'Application ID' : 'Ansöknings-ID');
    const body = (0, emailLayout_1.renderHeading)(en ? 'Thank you for your application!' : 'Tack för din ansökan!') +
        (0, emailLayout_1.renderParagraph)(en ? `Hi ${(0, emailLayout_1.esc)(applicantInfo.name)},` : `Hej ${(0, emailLayout_1.esc)(applicantInfo.name)},`) +
        (0, emailLayout_1.renderParagraph)(en
            ? `We’ve received your application to join the ${(0, emailLayout_1.esc)(brand)} affiliate programme.`
            : `Vi har tagit emot din ansökan till ${(0, emailLayout_1.esc)(brand)}s affiliateprogram.`) +
        idPanel +
        (0, emailLayout_1.renderParagraph)(en ? 'What happens next:' : 'Vad händer nu:') +
        (0, emailLayout_1.renderList)(steps) +
        (0, emailLayout_1.renderParagraph)(en ? 'Thanks for your interest!' : 'Tack för ditt intresse!', { muted: true });
    return (0, emailLayout_1.renderEmailShell)({
        brandName: brand,
        bodyHtml: body,
        footerExtraHtml: (0, emailLayout_1.renderFooterSupport)(supportUrl, language),
        preheader: en ? 'We received your affiliate application' : 'Vi har tagit emot din affiliate-ansökan',
    });
}
exports.generateAffiliateApplicationReceivedTemplate = generateAffiliateApplicationReceivedTemplate;
//# sourceMappingURL=affiliateApplicationReceived.js.map