// Email Verification Template — B2C customer email verification.
// Replaces Firebase's default sendEmailVerification emails.
import { EMAIL_CONFIG } from '../core/config';
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderList,
  renderFooterSupport,
  esc,
} from './emailLayout';

export interface EmailVerificationData {
  customerInfo: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
  };
  verificationCode: string;
  language: string;
  source?: string; // 'registration' | 'checkout'
  brandName?: string;
}

export function generateEmailVerificationTemplate(data: EmailVerificationData): { subject: string; html: string } {
  const { customerInfo, verificationCode, language, source } = data;
  const brand = data.brandName || 'MeteorPR';

  // Countryless storefront URLs (i18n deferred).
  const verificationUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/verify-email?oobCode=${verificationCode}`;
  const supportUrl = `${EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;

  const isCheckout = source === 'checkout';
  const en = language.startsWith('en');
  const customerName = customerInfo.firstName || customerInfo.name || (en ? 'there' : 'Kund');

  let body: string;
  let subject: string;

  if (en) {
    subject = `Verify your email address – ${brand}`;
    body =
      renderHeading(`Hello ${esc(customerName)}!`) +
      renderParagraph(
        isCheckout
          ? 'Thank you for your order! To finish setting up your account, please verify your email address.'
          : `Welcome to ${esc(brand)}! Please verify your email address to activate your account.`
      ) +
      renderButton(verificationUrl, 'Verify email address') +
      renderParagraph('If the button doesn’t work, copy this link into your browser:', { muted: true }) +
      renderParagraph(`<a href="${esc(verificationUrl)}" style="color:#1A1C1E;text-decoration:underline;word-break:break-all;">${esc(verificationUrl)}</a>`, { muted: true, html: true }) +
      renderParagraph('Once verified, you can:') +
      renderList([
        'View your order history and track deliveries',
        'Update your profile and delivery addresses',
        'Check out faster next time',
        ...(isCheckout ? ['Download receipts and invoices'] : []),
      ]) +
      renderParagraph(`If you didn’t create an account with ${esc(brand)}, you can safely ignore this email.`, { muted: true });
  } else {
    subject = `Verifiera din e-postadress – ${brand}`;
    body =
      renderHeading(`Hej ${esc(customerName)}!`) +
      renderParagraph(
        isCheckout
          ? 'Tack för din beställning! För att slutföra ditt konto behöver vi verifiera din e-postadress.'
          : `Välkommen till ${esc(brand)}! Verifiera din e-postadress för att aktivera ditt konto.`
      ) +
      renderButton(verificationUrl, 'Verifiera e-postadress') +
      renderParagraph('Om knappen inte fungerar, kopiera länken till din webbläsare:', { muted: true }) +
      renderParagraph(`<a href="${esc(verificationUrl)}" style="color:#1A1C1E;text-decoration:underline;word-break:break-all;">${esc(verificationUrl)}</a>`, { muted: true, html: true }) +
      renderParagraph('När du är verifierad kan du:') +
      renderList([
        'Se din orderhistorik och spåra leveranser',
        'Uppdatera din profil och dina leveransadresser',
        'Handla snabbare nästa gång',
        ...(isCheckout ? ['Ladda ner kvitton och fakturor'] : []),
      ]) +
      renderParagraph(`Om du inte har skapat ett konto hos ${esc(brand)} kan du ignorera detta mejl.`, { muted: true });
  }

  return {
    subject,
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      footerExtraHtml: renderFooterSupport(supportUrl, language),
      preheader: en ? 'Verify your email address' : 'Verifiera din e-postadress',
    }),
  };
}
