// affiliateApplicationReceived.ts — sent to an applicant when their affiliate
// application is received. NORD-aligned, per-shop branded. Returns HTML only
// (the subject is composed by the orchestrator).
import { EMAIL_CONFIG } from '../core/config';
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderPanel,
  renderList,
  renderFooterSupport,
  esc,
  emailTokens,
} from './emailLayout';

interface AffiliateApplicationReceivedData {
  applicantInfo: {
    name: string;
    email: string;
    phone?: string;
    promotionMethod?: string;
  };
  applicationId: string;
  language: string;
  brandName?: string;
}

export function generateAffiliateApplicationReceivedTemplate(data: AffiliateApplicationReceivedData): string {
  const { applicantInfo, applicationId, language } = data;
  const brand = data.brandName || 'MeteorPR';
  const en = language.startsWith('en');
  const supportUrl = `${EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;

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

  const idPanel = renderPanel(
    `<div style="font-family:'Courier New',monospace;font-size:15px;font-weight:600;color:${emailTokens.ink};word-break:break-all;">${esc(applicationId)}</div>`,
    en ? 'Application ID' : 'Ansöknings-ID'
  );

  const body =
    renderHeading(en ? 'Thank you for your application!' : 'Tack för din ansökan!') +
    renderParagraph(en ? `Hi ${esc(applicantInfo.name)},` : `Hej ${esc(applicantInfo.name)},`) +
    renderParagraph(
      en
        ? `We’ve received your application to join the ${esc(brand)} affiliate programme.`
        : `Vi har tagit emot din ansökan till ${esc(brand)}s affiliateprogram.`
    ) +
    idPanel +
    renderParagraph(en ? 'What happens next:' : 'Vad händer nu:') +
    renderList(steps) +
    renderParagraph(en ? 'Thanks for your interest!' : 'Tack för ditt intresse!', { muted: true });

  return renderEmailShell({
    brandName: brand,
    bodyHtml: body,
    footerExtraHtml: renderFooterSupport(supportUrl, language),
    preheader: en ? 'We received your affiliate application' : 'Vi har tagit emot din affiliate-ansökan',
  });
}
