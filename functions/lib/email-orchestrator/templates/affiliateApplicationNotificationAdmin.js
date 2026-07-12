"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAffiliateApplicationNotificationAdminTemplate = void 0;
// affiliateApplicationNotificationAdmin.ts — internal admin notification when a
// new affiliate applies. NORD-aligned, per-shop branded. Swedish (internal).
const emailLayout_1 = require("./emailLayout");
function generateAffiliateApplicationNotificationAdminTemplate(data) {
    const { applicantInfo, applicationId, adminPortalUrl } = data;
    const brand = data.brandName || 'ChopShop';
    const link = (href) => `<a href="${(0, emailLayout_1.esc)(href)}" style="color:${emailLayout_1.emailTokens.ink};text-decoration:underline;word-break:break-all;">${(0, emailLayout_1.esc)(href)}</a>`;
    const socials = applicantInfo.socials || {};
    const socialParts = [];
    if (socials.website)
        socialParts.push(`<strong>Webbplats:</strong> ${link(socials.website)}`);
    if (socials.instagram)
        socialParts.push(`<strong>Instagram:</strong> ${link(socials.instagram)}`);
    if (socials.youtube)
        socialParts.push(`<strong>YouTube:</strong> ${link(socials.youtube)}`);
    if (socials.facebook)
        socialParts.push(`<strong>Facebook:</strong> ${link(socials.facebook)}`);
    if (socials.tiktok)
        socialParts.push(`<strong>TikTok:</strong> ${link(socials.tiktok)}`);
    const socialsHtml = socialParts.length ? socialParts.join('<br>') : 'Inga sociala medier angivna';
    const infoRows = (0, emailLayout_1.renderKeyValueRows)([
        { label: 'Namn', value: (0, emailLayout_1.esc)(applicantInfo.name) },
        { label: 'E-post', value: `<a href="mailto:${(0, emailLayout_1.esc)(applicantInfo.email)}" style="color:${emailLayout_1.emailTokens.ink};text-decoration:underline;">${(0, emailLayout_1.esc)(applicantInfo.email)}</a>` },
        ...(applicantInfo.phone ? [{ label: 'Telefon', value: (0, emailLayout_1.esc)(applicantInfo.phone) }] : []),
        { label: 'Land', value: (0, emailLayout_1.esc)(applicantInfo.country || 'Ej angivet') },
        ...(applicantInfo.promotionMethod ? [{ label: 'Marknadsföringsmetod', value: (0, emailLayout_1.esc)(applicantInfo.promotionMethod) }] : []),
        { label: 'Sociala medier', value: socialsHtml },
        ...(applicantInfo.message ? [{ label: 'Meddelande', value: (0, emailLayout_1.esc)(applicantInfo.message) }] : []),
        { label: 'Ansöknings-ID', value: `<span style="font-family:'Courier New',monospace;">${(0, emailLayout_1.esc)(applicationId)}</span>` },
    ], { rawHtml: true });
    const body = (0, emailLayout_1.renderHeading)('Ny affiliate-ansökan') +
        (0, emailLayout_1.renderParagraph)('En ny affiliate väntar på granskning och godkännande.', { muted: true }) +
        (0, emailLayout_1.renderPanel)(infoRows, 'Ansökaninformation') +
        (0, emailLayout_1.renderButton)(`${adminPortalUrl}/admin/affiliates`, 'Öppna adminpanelen');
    return (0, emailLayout_1.renderEmailShell)({
        brandName: `${brand} System`,
        bodyHtml: body,
        footerNote: 'Detta meddelande skickades automatiskt från affiliatesystemet.',
        preheader: `Ny affiliate-ansökan: ${(0, emailLayout_1.esc)(applicantInfo.name)}`,
    });
}
exports.generateAffiliateApplicationNotificationAdminTemplate = generateAffiliateApplicationNotificationAdminTemplate;
//# sourceMappingURL=affiliateApplicationNotificationAdmin.js.map