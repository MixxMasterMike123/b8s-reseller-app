"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPasswordResetTemplate = void 0;
// Password reset email template with enhanced V2 features
const config_1 = require("../config");
function getPasswordResetTemplate(data, lang = 'sv-SE') {
    // Generate URLs with proper language segments
    const segment = (0, config_1.getLanguageSegment)(lang);
    const resetUrl = `${config_1.APP_URLS.B2C_SHOP}/${segment}/reset-password?code=${data.resetCode}`;
    const loginUrl = `${config_1.APP_URLS.B2C_SHOP}/${segment}/affiliate-login`;
    const supportUrl = `${config_1.APP_URLS.B2B_PORTAL}/contact`;
    const templates = {
        'sv-SE': {
            subject: 'Återställ ditt B8Shield lösenord',
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Återställ ditt lösenord</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hej!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Vi fick en begäran om att återställa lösenordet för ditt B8Shield-konto som är kopplat till <strong>${data.email}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[SÄKERHET] VIKTIG INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>Denna länk är giltig i <strong>60 minuter</strong></li>
        <li>Länken kan endast användas en gång</li>
        <li>Om du inte begärde denna återställning, ignorera detta e-post</li>
      </ul>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[ÅTERSTÄLLNING] KLICKA HÄR FÖR ATT ÅTERSTÄLLA:</h4>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Återställ mitt lösenord</a>
      </div>
      <p style="color: #1e40af; margin-bottom: 10px; font-size: 14px;">Eller kopiera och klistra in denna länk i din webbläsare:</p>
      <div style="background-color: #dbeafe; padding: 12px; border-radius: 4px; border-left: 4px solid #2563eb; word-break: break-all;">
        <a href="${resetUrl}" style="color: #1e40af; text-decoration: none; font-size: 14px;">${resetUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[NÄSTA STEG] EFTER ÅTERSTÄLLNING:</h4>
      <ol style="color: #065f46; margin: 0; padding-left: 20px;">
        <li>Klicka på återställningslänken ovan</li>
        <li>Ange ditt nya lösenord (minst 6 tecken)</li>
        <li>Logga in på din affiliate-portal</li>
        <li>Börja använda ditt konto igen</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #374151; line-height: 1.6; margin-bottom: 15px;">Efter att du återställt ditt lösenord kan du logga in här:</p>
      <a href="${loginUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Logga in på Affiliate Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">Om du inte begärde denna återställning eller har problem, kontakta vår support på <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        <strong>Säkerhetsinfo:</strong> Begäran gjord ${data.timestamp || new Date().toLocaleString('sv-SE')}<br>
        <strong>Enhet:</strong> ${data.userAgent || 'Okänd'}<br>
        <strong>E-post:</strong> ${data.email}
      </p>
      <br>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-GB': {
            subject: 'Reset your B8Shield password',
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Reset your password</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hello!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">We received a request to reset the password for your B8Shield account associated with <strong>${data.email}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[SECURITY] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>This link is valid for <strong>60 minutes</strong></li>
        <li>The link can only be used once</li>
        <li>If you didn't request this reset, please ignore this email</li>
      </ul>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[RESET] CLICK HERE TO RESET:</h4>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; colour: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset my password</a>
      </div>
      <p style="color: #1e40af; margin-bottom: 10px; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <div style="background-color: #dbeafe; padding: 12px; border-radius: 4px; border-left: 4px solid #2563eb; word-break: break-all;">
        <a href="${resetUrl}" style="color: #1e40af; text-decoration: none; font-size: 14px;">${resetUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[NEXT STEPS] AFTER RESET:</h4>
      <ol style="color: #065f46; margin: 0; padding-left: 20px;">
        <li>Click the reset link above</li>
        <li>Enter your new password (minimum 6 characters)</li>
        <li>Log in to your affiliate portal</li>
        <li>Start using your account again</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #374151; line-height: 1.6; margin-bottom: 15px;">After resetting your password, you can log in here:</p>
      <a href="${loginUrl}" style="display: inline-block; background-color: #059669; colour: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Affiliate Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you didn't request this reset or have any issues, contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        <strong>Security info:</strong> Request made ${data.timestamp || new Date().toISOString()}<br>
        <strong>Device:</strong> ${data.userAgent || 'Unknown'}<br>
        <strong>Email:</strong> ${data.email}
      </p>
      <br>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Kind regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-US': {
            subject: 'Reset your B8Shield password',
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Reset your password</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hello!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">We received a request to reset the password for your B8Shield account associated with <strong>${data.email}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[SECURITY] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>This link is valid for <strong>60 minutes</strong></li>
        <li>The link can only be used once</li>
        <li>If you didn't request this reset, please ignore this email</li>
      </ul>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[RESET] CLICK HERE TO RESET:</h4>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset my password</a>
      </div>
      <p style="color: #1e40af; margin-bottom: 10px; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <div style="background-color: #dbeafe; padding: 12px; border-radius: 4px; border-left: 4px solid #2563eb; word-break: break-all;">
        <a href="${resetUrl}" style="color: #1e40af; text-decoration: none; font-size: 14px;">${resetUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[NEXT STEPS] AFTER RESET:</h4>
      <ol style="color: #065f46; margin: 0; padding-left: 20px;">
        <li>Click the reset link above</li>
        <li>Enter your new password (minimum 6 characters)</li>
        <li>Log in to your affiliate portal</li>
        <li>Start using your account again</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: #374151; line-height: 1.6; margin-bottom: 15px;">After resetting your password, you can log in here:</p>
      <a href="${loginUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Affiliate Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you didn't request this reset or have any issues, contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        <strong>Security info:</strong> Request made ${data.timestamp || new Date().toISOString()}<br>
        <strong>Device:</strong> ${data.userAgent || 'Unknown'}<br>
        <strong>Email:</strong> ${data.email}
      </p>
      <br>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        }
    };
    const template = templates[lang] || templates['sv-SE'];
    return {
        subject: template.subject,
        html: template.html
    };
}
exports.getPasswordResetTemplate = getPasswordResetTemplate;
//# sourceMappingURL=passwordReset.js.map