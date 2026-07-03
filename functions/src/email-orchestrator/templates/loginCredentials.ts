// Login Credentials Email Template — NORD-aligned, per-shop branded.
import { EMAIL_CONFIG } from '../core/config';
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderPanel,
  renderList,
  renderFooterSupport,
  esc,
  emailTokens,
} from './emailLayout';

export interface LoginCredentialsData {
  userInfo: {
    name: string;
    email: string;
    companyName?: string;
    contactPerson?: string;
  };
  credentials: {
    email: string;
    temporaryPassword?: string;
    affiliateCode?: string;
  };
  accountType: 'B2B' | 'AFFILIATE';
  wasExistingAuthUser: boolean;
  brandName?: string;
}

// A monospace value chip, reused for credential values.
function chip(value: string): string {
  return `<span style="font-family:'Courier New',monospace;background-color:${emailTokens.card};border:1px solid ${emailTokens.border};padding:4px 10px;border-radius:6px;font-size:13px;color:${emailTokens.ink};">${esc(value)}</span>`;
}

export function generateLoginCredentialsTemplate(data: LoginCredentialsData, lang: string = 'sv-SE') {
  const { userInfo, credentials, accountType, wasExistingAuthUser } = data;
  const brand = data.brandName || 'MeteorPR';
  const en = lang.startsWith('en');

  const isAffiliate = accountType === 'AFFILIATE';
  const loginUrl = isAffiliate
    ? `${EMAIL_CONFIG.URLS.B2C_SHOP}/affiliate-login`
    : `${EMAIL_CONFIG.URLS.B2B_PORTAL}`;
  const referralUrl = isAffiliate ? `${EMAIL_CONFIG.URLS.B2C_SHOP}/?ref=${credentials.affiliateCode}` : null;
  const supportUrl = `${EMAIL_CONFIG.URLS.B2B_PORTAL}/contact`;
  const resetUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/reset-password`;

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
      ? (en ? `Congratulations, ${esc(userInfo.name)}!` : `Grattis, ${esc(userInfo.name)}!`)
      : (en ? `Hi ${esc(userInfo.contactPerson || userInfo.name)},` : `Hej ${esc(userInfo.contactPerson || userInfo.name)},`);

  const intro = wasExistingAuthUser
    ? (en
        ? `Your ${isAffiliate ? 'affiliate' : 'reseller'} details have been updated.`
        : `Dina ${isAffiliate ? 'affiliate' : 'återförsäljar'}uppgifter har uppdaterats.`)
    : isAffiliate
      ? (en
          ? 'Your application to our affiliate programme has been approved. You’re now an official affiliate and can start earning commission on sales.'
          : 'Din ansökan till vårt affiliateprogram har godkänts. Du är nu en officiell affiliate och kan börja tjäna provision på försäljningar.')
      : (en
          ? `We’ve created an account for ${esc(userInfo.companyName || userInfo.name)} — you can now access ${portalName}.`
          : `Vi har skapat ett konto för ${esc(userInfo.companyName || userInfo.name)} — du har nu tillgång till ${portalName}.`);

  // Credentials panel
  const credRows: string[] = [
    `<tr><td style="padding:6px 0;font-size:13px;color:${emailTokens.muted};">${en ? 'Email' : 'E-post'}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.email)}</td></tr>`,
  ];
  if (credentials.affiliateCode) {
    credRows.push(
      `<tr><td style="padding:6px 0;font-size:13px;color:${emailTokens.muted};">${esc(codeLabel)}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.affiliateCode)}</td></tr>`
    );
  }
  if (!wasExistingAuthUser && credentials.temporaryPassword) {
    credRows.push(
      `<tr><td style="padding:6px 0;font-size:13px;color:${emailTokens.muted};">${en ? 'Temporary password' : 'Tillfälligt lösenord'}</td><td style="padding:6px 0 6px 12px;text-align:right;">${chip(credentials.temporaryPassword)}</td></tr>`
    );
  }
  const credentialsPanel = renderPanel(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${credRows.join('')}</table>`,
    en ? 'Your login details' : 'Dina inloggningsuppgifter'
  );

  // Important info
  const importantInfo = wasExistingAuthUser
    ? renderParagraph(
        en
          ? 'You already had an account, so keep using your existing password. Forgotten it? Reset it with the button below.'
          : 'Du hade redan ett konto, så fortsätt använda ditt befintliga lösenord. Har du glömt det? Återställ det med knappen nedan.',
        { muted: true }
      )
    : renderList(
        en
          ? ['Please change your password the first time you log in.', 'Your account is active with full access.']
          : ['Byt lösenord vid din första inloggning.', 'Ditt konto är aktivt med full åtkomst.'],
        { muted: true }
      );

  // Affiliate referral / B2B features
  let extra = '';
  if (isAffiliate && referralUrl) {
    extra = renderPanel(
      renderParagraph(
        `<a href="${esc(referralUrl)}" style="color:${emailTokens.ink};text-decoration:underline;word-break:break-all;">${esc(referralUrl)}</a>`,
        { html: true }
      ) +
        renderParagraph(
          en ? 'Share this link to earn commission on sales.' : 'Dela den här länken för att tjäna provision på försäljningar.',
          { muted: true }
        ),
      en ? 'Your referral link' : 'Din referral-länk'
    );
  } else if (!isAffiliate) {
    extra = renderPanel(
      renderList(
        en
          ? ['Place orders directly', 'View your order history', 'Download product catalogues', 'Access marketing materials']
          : ['Lägg beställningar direkt', 'Se din orderhistorik', 'Ladda ner produktkataloger', 'Kom åt marknadsföringsmaterial']
      ),
      en ? 'What you can do in the portal' : 'Vad du kan göra i portalen'
    );
  }

  const primaryCta = renderButton(
    loginUrl,
    isAffiliate
      ? (en ? 'Go to the affiliate portal' : 'Gå till affiliate-portalen')
      : (en ? 'Log in to the portal' : 'Logga in på portalen')
  );

  const resetCta = wasExistingAuthUser
    ? renderButton(resetUrl, en ? 'Reset password' : 'Återställ lösenord')
    : '';

  const body =
    renderHeading(heading) +
    renderParagraph(intro) +
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
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      footerExtraHtml: renderFooterSupport(supportUrl, lang),
      preheader: en ? 'Your login details' : 'Dina inloggningsuppgifter',
    }),
  };
}
