// affiliateApplicationNotificationAdmin.ts — internal admin notification when a
// new affiliate applies. NORD-aligned, per-shop branded. Swedish (internal).
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderPanel,
  renderKeyValueRows,
  esc,
  emailTokens,
} from './emailLayout';

interface AffiliateApplicationAdminData {
  applicantInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    promotionMethod?: string;
    message?: string;
    socials?: {
      website?: string;
      instagram?: string;
      youtube?: string;
      facebook?: string;
      tiktok?: string;
    };
  };
  applicationId: string;
  adminPortalUrl: string;
  brandName?: string;
}

export function generateAffiliateApplicationNotificationAdminTemplate(data: AffiliateApplicationAdminData): string {
  const { applicantInfo, applicationId, adminPortalUrl } = data;
  const brand = data.brandName || 'MeteorPR';

  const link = (href: string) =>
    `<a href="${esc(href)}" style="color:${emailTokens.ink};text-decoration:underline;word-break:break-all;">${esc(href)}</a>`;

  const socials = applicantInfo.socials || {};
  const socialParts: string[] = [];
  if (socials.website) socialParts.push(`<strong>Webbplats:</strong> ${link(socials.website)}`);
  if (socials.instagram) socialParts.push(`<strong>Instagram:</strong> ${link(socials.instagram)}`);
  if (socials.youtube) socialParts.push(`<strong>YouTube:</strong> ${link(socials.youtube)}`);
  if (socials.facebook) socialParts.push(`<strong>Facebook:</strong> ${link(socials.facebook)}`);
  if (socials.tiktok) socialParts.push(`<strong>TikTok:</strong> ${link(socials.tiktok)}`);
  const socialsHtml = socialParts.length ? socialParts.join('<br>') : 'Inga sociala medier angivna';

  const infoRows = renderKeyValueRows(
    [
      { label: 'Namn', value: esc(applicantInfo.name) },
      { label: 'E-post', value: `<a href="mailto:${esc(applicantInfo.email)}" style="color:${emailTokens.ink};text-decoration:underline;">${esc(applicantInfo.email)}</a>` },
      ...(applicantInfo.phone ? [{ label: 'Telefon', value: esc(applicantInfo.phone) }] : []),
      { label: 'Land', value: esc(applicantInfo.country || 'Ej angivet') },
      ...(applicantInfo.promotionMethod ? [{ label: 'Marknadsföringsmetod', value: esc(applicantInfo.promotionMethod) }] : []),
      { label: 'Sociala medier', value: socialsHtml },
      ...(applicantInfo.message ? [{ label: 'Meddelande', value: esc(applicantInfo.message) }] : []),
      { label: 'Ansöknings-ID', value: `<span style="font-family:'Courier New',monospace;">${esc(applicationId)}</span>` },
    ],
    { rawHtml: true }
  );

  const body =
    renderHeading('Ny affiliate-ansökan') +
    renderParagraph('En ny affiliate väntar på granskning och godkännande.', { muted: true }) +
    renderPanel(infoRows, 'Ansökaninformation') +
    renderButton(`${adminPortalUrl}/admin/affiliates`, 'Öppna adminpanelen');

  return renderEmailShell({
    brandName: `${brand} System`,
    bodyHtml: body,
    footerNote: 'Detta meddelande skickades automatiskt från affiliatesystemet.',
    preheader: `Ny affiliate-ansökan: ${esc(applicantInfo.name)}`,
  });
}
