// Password Reset Email Template — NORD-aligned, per-shop branded.
import { EMAIL_CONFIG } from '../core/config';
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderPanel,
  renderKeyValueRows,
  esc,
} from './emailLayout';

export interface PasswordResetData {
  email: string;
  resetCode: string;
  userAgent?: string;
  timestamp?: string;
  userType: 'B2B' | 'B2C' | 'AFFILIATE';
  brandName?: string;
}

export function generatePasswordResetTemplate(data: PasswordResetData, lang: string = 'sv-SE') {
  const { email, resetCode, userAgent, timestamp, userType } = data;
  const brand = data.brandName || 'MeteorPR';

  // Countryless storefront URLs (i18n deferred).
  const resetUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/reset-password?code=${resetCode}`;
  const loginUrl =
    userType === 'AFFILIATE' || userType === 'B2B'
      ? `${EMAIL_CONFIG.URLS.B2C_SHOP}/affiliate-login`
      : `${EMAIL_CONFIG.URLS.B2C_SHOP}/login`;

  const en = lang.startsWith('en');

  const securityRows = (userAgent || timestamp)
    ? renderKeyValueRows(
        [
          ...(timestamp ? [{ label: en ? 'Time' : 'Tid', value: timestamp }] : []),
          ...(userAgent ? [{ label: en ? 'Device' : 'Enhet', value: userAgent }] : []),
          { label: en ? 'Email' : 'E-post', value: email },
        ]
      )
    : '';

  let body: string;
  let subject: string;

  if (en) {
    subject = `Reset your password – ${brand}`;
    body =
      renderHeading('Reset your password') +
      renderParagraph(
        `We received a request to reset the password for your ${esc(brand)} account linked to <strong>${esc(email)}</strong>. Click below to choose a new one.`,
        { html: true }
      ) +
      renderButton(resetUrl, 'Reset password') +
      renderParagraph('This link is valid for 60 minutes and can only be used once. If you didn’t request this, you can safely ignore this email.', { muted: true }) +
      renderParagraph(`Once done, you can log in here: ${loginUrl}`, { muted: true }) +
      (securityRows ? renderPanel(securityRows, 'Request details') : '');
  } else {
    subject = `Återställ ditt lösenord – ${brand}`;
    body =
      renderHeading('Återställ ditt lösenord') +
      renderParagraph(
        `Vi fick en begäran om att återställa lösenordet för ditt konto hos ${esc(brand)} som är kopplat till <strong>${esc(email)}</strong>. Klicka nedan för att välja ett nytt.`,
        { html: true }
      ) +
      renderButton(resetUrl, 'Återställ lösenord') +
      renderParagraph('Länken är giltig i 60 minuter och kan bara användas en gång. Om du inte begärde detta kan du ignorera mejlet.', { muted: true }) +
      renderParagraph(`När du är klar loggar du in här: ${loginUrl}`, { muted: true }) +
      (securityRows ? renderPanel(securityRows, 'Uppgifter om begäran') : '');
  }

  return {
    subject,
    html: renderEmailShell({ brandName: brand, bodyHtml: body, preheader: en ? 'Reset your password' : 'Återställ ditt lösenord' }),
  };
}
