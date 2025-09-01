// V3 Affiliate Credentials Email Template
import { APP_URLS } from '../config';

export interface AffiliateCredentialsData {
  appData: {
    name: string;
    email: string;
    preferredLang?: string;
  };
  affiliateCode: string;
  tempPassword: string;
  loginInstructions: string;
  wasExistingAuthUser: boolean;
}

export function getAffiliateCredentialsTemplate(data: AffiliateCredentialsData, language: string = 'sv-SE') {
  const { appData, affiliateCode, tempPassword, wasExistingAuthUser } = data;
  
  const resetUrl = `${APP_URLS.PARTNER_URL}/forgot-password`;
  const loginUrl = `${APP_URLS.PARTNER_URL}/login`;
  const supportUrl = `${APP_URLS.PARTNER_URL}/contact`;

  if (language.startsWith('en')) {
    return {
      subject: wasExistingAuthUser ? 'B8Shield Affiliate Credentials Updated' : 'Welcome to B8Shield Affiliate Program - Your Credentials',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>B8Shield Affiliate Credentials</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #459CA8 0%, #357a8a 100%); padding: 40px 30px; text-align: center; }
        .header img { max-width: 200px; height: auto; }
        .content { padding: 40px 30px; }
        .welcome-section { text-align: center; margin-bottom: 30px; }
        .welcome-section h1 { color: #1e293b; font-size: 28px; margin: 0 0 10px 0; font-weight: 600; }
        .welcome-section p { color: #64748b; font-size: 16px; margin: 0; }
        .credentials-card { background-color: #f1f5f9; border-left: 4px solid #459CA8; padding: 25px; margin: 30px 0; border-radius: 8px; }
        .credentials-card h3 { color: #1e293b; margin: 0 0 15px 0; font-size: 18px; }
        .credential-item { margin: 12px 0; }
        .credential-label { color: #475569; font-weight: 600; }
        .credential-value { color: #1e293b; font-family: 'Courier New', monospace; background-color: #e2e8f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-left: 10px; }
        .action-section { text-align: center; margin: 40px 0; }
        .btn-primary { display: inline-block; background-color: #EE7E31; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; border: 2px solid #EE7E31; transition: all 0.3s ease; }
        .btn-primary:hover { background-color: #d6691a; border-color: #d6691a; }
        .btn-secondary { display: inline-block; background-color: transparent; color: #459CA8 !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #459CA8; margin: 0 10px; transition: all 0.3s ease; }
        .btn-secondary:hover { background-color: #459CA8; color: #ffffff !important; }
        .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .info-box h4 { color: #92400e; margin: 0 0 10px 0; font-size: 16px; }
        .info-box p { color: #78350f; margin: 5px 0; font-size: 14px; line-height: 1.5; }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #64748b; font-size: 14px; margin: 5px 0; }
        .footer a { color: #459CA8; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        @media (max-width: 600px) {
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
            .btn-primary, .btn-secondary { display: block; margin: 10px 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${APP_URLS.LOGO_URL}" alt="B8Shield">
        </div>
        
        <div class="content">
            <div class="welcome-section">
                <h1>${wasExistingAuthUser ? 'Credentials Updated' : 'Welcome to B8Shield!'}</h1>
                <p>Hello ${appData.name}, ${wasExistingAuthUser ? 'your affiliate credentials have been updated.' : 'your affiliate account is ready!'}</p>
            </div>

            <div class="credentials-card">
                <h3>🔐 Your Login Credentials</h3>
                <div class="credential-item">
                    <span class="credential-label">Email:</span>
                    <span class="credential-value">${appData.email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Affiliate Code:</span>
                    <span class="credential-value">${affiliateCode}</span>
                </div>
                ${!wasExistingAuthUser ? `
                <div class="credential-item">
                    <span class="credential-label">Temporary Password:</span>
                    <span class="credential-value">${tempPassword}</span>
                </div>` : ''}
            </div>

            ${wasExistingAuthUser ? `
            <div class="info-box">
                <h4>📝 Existing Account</h4>
                <p>You already had an account with B8Shield, so you can continue using your existing password. If you've forgotten it, you can reset it using the link below.</p>
            </div>` : `
            <div class="info-box">
                <h4>🔒 Security Recommendation</h4>
                <p>For your security, please change your password after your first login. You can do this in your account settings.</p>
            </div>`}

            <div class="action-section">
                <a href="${loginUrl}" class="btn-primary">Access Affiliate Portal</a>
                <br><br>
                ${wasExistingAuthUser ? `<a href="${resetUrl}" class="btn-secondary">Reset Password</a>` : ''}
                <a href="${supportUrl}" class="btn-secondary">Contact Support</a>
            </div>
        </div>

        <div class="footer">
            <p><strong>B8Shield Affiliate Program</strong></p>
            <p>Questions? Contact us at <a href="mailto:support@b8shield.com">support@b8shield.com</a></p>
            <p>Visit our partner portal: <a href="${APP_URLS.PARTNER_URL}">${APP_URLS.PARTNER_URL}</a></p>
        </div>
    </div>
</body>
</html>`
    };
  }

  // Swedish (default)
  return {
    subject: wasExistingAuthUser ? 'B8Shield Återförsäljare - Inloggningsuppgifter uppdaterade' : 'Välkommen till B8Shield Återförsäljare - Dina inloggningsuppgifter',
    html: `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>B8Shield Återförsäljare</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #459CA8 0%, #357a8a 100%); padding: 40px 30px; text-align: center; }
        .header img { max-width: 200px; height: auto; }
        .content { padding: 40px 30px; }
        .welcome-section { text-align: center; margin-bottom: 30px; }
        .welcome-section h1 { color: #1e293b; font-size: 28px; margin: 0 0 10px 0; font-weight: 600; }
        .welcome-section p { color: #64748b; font-size: 16px; margin: 0; }
        .credentials-card { background-color: #f1f5f9; border-left: 4px solid #459CA8; padding: 25px; margin: 30px 0; border-radius: 8px; }
        .credentials-card h3 { color: #1e293b; margin: 0 0 15px 0; font-size: 18px; }
        .credential-item { margin: 12px 0; }
        .credential-label { color: #475569; font-weight: 600; }
        .credential-value { color: #1e293b; font-family: 'Courier New', monospace; background-color: #e2e8f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-left: 10px; }
        .action-section { text-align: center; margin: 40px 0; }
        .btn-primary { display: inline-block; background-color: #EE7E31; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; border: 2px solid #EE7E31; transition: all 0.3s ease; }
        .btn-primary:hover { background-color: #d6691a; border-color: #d6691a; }
        .btn-secondary { display: inline-block; background-color: transparent; color: #459CA8 !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #459CA8; margin: 0 10px; transition: all 0.3s ease; }
        .btn-secondary:hover { background-color: #459CA8; color: #ffffff !important; }
        .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .info-box h4 { color: #92400e; margin: 0 0 10px 0; font-size: 16px; }
        .info-box p { color: #78350f; margin: 5px 0; font-size: 14px; line-height: 1.5; }
        .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #64748b; font-size: 14px; margin: 5px 0; }
        .footer a { color: #459CA8; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        @media (max-width: 600px) {
            .content { padding: 30px 20px; }
            .header { padding: 30px 20px; }
            .btn-primary, .btn-secondary { display: block; margin: 10px 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${APP_URLS.LOGO_URL}" alt="B8Shield">
        </div>
        
        <div class="content">
            <div class="welcome-section">
                <h1>${wasExistingAuthUser ? 'Uppgifter uppdaterade' : 'Välkommen till B8Shield!'}</h1>
                <p>Hej ${appData.name}, ${wasExistingAuthUser ? 'dina återförsäljaruppgifter har uppdaterats.' : 'ditt återförsäljarkonto är redo!'}</p>
            </div>

            <div class="credentials-card">
                <h3>🔐 Dina inloggningsuppgifter</h3>
                <div class="credential-item">
                    <span class="credential-label">E-post:</span>
                    <span class="credential-value">${appData.email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Återförsäljarkod:</span>
                    <span class="credential-value">${affiliateCode}</span>
                </div>
                ${!wasExistingAuthUser ? `
                <div class="credential-item">
                    <span class="credential-label">Tillfälligt lösenord:</span>
                    <span class="credential-value">${tempPassword}</span>
                </div>` : ''}
            </div>

            ${wasExistingAuthUser ? `
            <div class="info-box">
                <h4>📝 Befintligt konto</h4>
                <p>Du hade redan ett konto hos B8Shield, så du kan fortsätta använda ditt befintliga lösenord. Om du har glömt det kan du återställa det med länken nedan.</p>
            </div>` : `
            <div class="info-box">
                <h4>🔒 Säkerhetsrekommendation</h4>
                <p>För din säkerhet, vänligen byt ditt lösenord efter din första inloggning. Du kan göra detta i dina kontoinställningar.</p>
            </div>`}

            <div class="action-section">
                <a href="${loginUrl}" class="btn-primary">Gå till återförsäljarportalen</a>
                <br><br>
                ${wasExistingAuthUser ? `<a href="${resetUrl}" class="btn-secondary">Återställ lösenord</a>` : ''}
                <a href="${supportUrl}" class="btn-secondary">Kontakta support</a>
            </div>
        </div>

        <div class="footer">
            <p><strong>B8Shield Återförsäljarprogram</strong></p>
            <p>Frågor? Kontakta oss på <a href="mailto:support@b8shield.com">support@b8shield.com</a></p>
            <p>Besök vår partnerportal: <a href="${APP_URLS.PARTNER_URL}">${APP_URLS.PARTNER_URL}</a></p>
        </div>
    </div>
</body>
</html>`
  };
}
