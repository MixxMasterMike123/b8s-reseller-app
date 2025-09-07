// Password Reset Email Template
// Extracted from V3 passwordReset template - DESIGN PRESERVED + MOBILE OPTIMIZED
import { EMAIL_CONFIG, getLanguageSegment } from '../core/config';

export interface PasswordResetData {
  email: string;
  resetCode: string;
  userAgent?: string;
  timestamp?: string;
  userType: 'B2B' | 'B2C' | 'AFFILIATE';
}

export function generatePasswordResetTemplate(data: PasswordResetData, lang: string = 'sv-SE') {
  const { email, resetCode, userAgent, timestamp, userType } = data;
  
  // Generate appropriate URLs based on user type
  const segment = getLanguageSegment(lang);
  let resetUrl: string;
  let loginUrl: string;
  
  if (userType === 'AFFILIATE' || userType === 'B2B') {
    resetUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/reset-password?code=${resetCode}`;
    loginUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/affiliate-login`;
  } else {
    // B2C customers
    resetUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/reset-password?code=${resetCode}`;
    loginUrl = `${EMAIL_CONFIG.URLS.B2C_SHOP}/${segment}/customer-login`;
  }

  const templates = {
    'sv-SE': {
      subject: 'Återställ ditt B8Shield-lösenord',
      html: `<div style="font-family: ${EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 18px; font-size: 20px; line-height: 1.3;">Återställ ditt lösenord</h2>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 18px; font-size: 15px;">Hej!</p>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; font-size: 15px;">Vi fick en begäran om att återställa lösenordet för ditt B8Shield-konto som är kopplat till <strong>${email}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid ${EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 15px;">[SÄKERHET] VIKTIG INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.4;">
        <li style="margin-bottom: 5px;">Denna länk är giltig i <strong>60 minuter</strong></li>
        <li style="margin-bottom: 5px;">Länken kan endast användas en gång</li>
        <li>Om du inte begärde denna återställning, ignorera detta e-post</li>
      </ul>
    </div>
    
    <div style="background-color: #eff6ff; padding: 18px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 12px; font-size: 15px;">[ÅTERSTÄLLNING] KLICKA HÄR FÖR ATT ÅTERSTÄLLA:</h4>
      <div style="text-align: center; margin: 18px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: ${EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Återställ mitt lösenord</a>
      </div>
      <p style="color: #1e40af; margin-bottom: 8px; font-size: 13px;">Eller kopiera och klistra in denna länk i din webbläsare:</p>
      <div style="background-color: #dbeafe; padding: 10px; border-radius: 4px; border-left: 4px solid #2563eb; word-break: break-all; font-size: 13px;">
        <a href="${resetUrl}" style="color: #1e40af; text-decoration: none;">${resetUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 15px;">[NÄSTA STEG] EFTER ÅTERSTÄLLNING:</h4>
      <ol style="color: #065f46; margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.4;">
        <li style="margin-bottom: 5px;">Klicka på återställningslänken ovan</li>
        <li style="margin-bottom: 5px;">Ange ditt nya lösenord (minst 6 tecken)</li>
        <li style="margin-bottom: 5px;">Logga in på ditt konto</li>
        <li>Börja använda ditt konto igen</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 12px; font-size: 14px;">Efter att du har återställt ditt lösenord kan du logga in här:</p>
      <a href="${loginUrl}" style="display: inline-block; background-color: transparent; color: ${EMAIL_CONFIG.COLORS.PRIMARY}; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Logga in på B8Shield</a>
    </div>

    ${userAgent || timestamp ? `
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
      <h4 style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-top: 0; margin-bottom: 8px; font-size: 13px;">[SÄKERHETSINFO] BEGÄRAN GJORD FRÅN:</h4>
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 12px; font-family: monospace;">
        ${timestamp ? `<strong>Tid:</strong> ${timestamp}<br>` : ''}
        ${userAgent ? `<strong>Enhet:</strong> ${userAgent}<br>` : ''}
        <strong>E-post:</strong> ${email}
      </p>
    </div>
    ` : ''}
    
    <div style="border-top: 1px solid ${EMAIL_CONFIG.COLORS.BORDER}; padding-top: 15px; margin-top: 25px;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 13px; margin: 0; line-height: 1.4;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-GB': {
      subject: 'Reset your B8Shield password',
      html: `<div style="font-family: ${EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 18px; font-size: 20px; line-height: 1.3;">Reset your password</h2>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 18px; font-size: 15px;">Hello!</p>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; font-size: 15px;">We received a request to reset the password for your B8Shield account associated with <strong>${email}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid ${EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 15px;">[SECURITY] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.4;">
        <li style="margin-bottom: 5px;">This link is valid for <strong>60 minutes</strong></li>
        <li style="margin-bottom: 5px;">The link can only be used once</li>
        <li>If you didn't request this reset, please ignore this email</li>
      </ul>
    </div>
    
    <div style="background-color: #eff6ff; padding: 18px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 12px; font-size: 15px;">[RESET] CLICK HERE TO RESET:</h4>
      <div style="text-align: center; margin: 18px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: ${EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Reset my password</a>
      </div>
      <p style="color: #1e40af; margin-bottom: 8px; font-size: 13px;">Or copy and paste this link into your browser:</p>
      <div style="background-color: #dbeafe; padding: 10px; border-radius: 4px; border-left: 4px solid #2563eb; word-break: break-all; font-size: 13px;">
        <a href="${resetUrl}" style="color: #1e40af; text-decoration: none;">${resetUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 15px;">[NEXT STEPS] AFTER RESET:</h4>
      <ol style="color: #065f46; margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.4;">
        <li style="margin-bottom: 5px;">Click the reset link above</li>
        <li style="margin-bottom: 5px;">Enter your new password (minimum 6 characters)</li>
        <li style="margin-bottom: 5px;">Log in to your account</li>
        <li>Start using your account again</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 12px; font-size: 14px;">After resetting your password, you can log in here:</p>
      <a href="${loginUrl}" style="display: inline-block; background-color: transparent; color: ${EMAIL_CONFIG.COLORS.PRIMARY}; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Log in to B8Shield</a>
    </div>

    ${userAgent || timestamp ? `
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
      <h4 style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-top: 0; margin-bottom: 8px; font-size: 13px;">[SECURITY INFO] REQUEST MADE FROM:</h4>
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 12px; font-family: monospace;">
        ${timestamp ? `<strong>Time:</strong> ${timestamp}<br>` : ''}
        ${userAgent ? `<strong>Device:</strong> ${userAgent}<br>` : ''}
        <strong>Email:</strong> ${email}
      </p>
    </div>
    ` : ''}
    
    <div style="border-top: 1px solid ${EMAIL_CONFIG.COLORS.BORDER}; padding-top: 15px; margin-top: 25px;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 13px; margin: 0; line-height: 1.4;">Best regards,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-US': {
      subject: 'Reset your B8Shield password',
      html: `<div style="font-family: ${EMAIL_CONFIG.TEMPLATES.FONT_FAMILY}; max-width: ${EMAIL_CONFIG.TEMPLATES.MAX_WIDTH}; margin: 0 auto; background-color: ${EMAIL_CONFIG.COLORS.BACKGROUND}; padding: 15px;">
  <div style="background-color: white; border-radius: ${EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS}; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${EMAIL_CONFIG.URLS.LOGO_URL}" alt="B8Shield" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
    </div>
    
    <h2 style="color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY}; margin-bottom: 18px; font-size: 20px; line-height: 1.3;">Reset your password</h2>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 18px; font-size: 15px;">Hello!</p>
    <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 20px; font-size: 15px;">We received a request to reset the password for your B8Shield account associated with <strong>${email}</strong>.</p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid ${EMAIL_CONFIG.COLORS.WARNING}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px; font-size: 15px;">[SECURITY] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.4;">
        <li style="margin-bottom: 5px;">This link is valid for <strong>60 minutes</strong></li>
        <li style="margin-bottom: 5px;">The link can only be used once</li>
        <li>If you didn't request this reset, please ignore this email</li>
      </ul>
    </div>
    
    <div style="background-color: #eff6ff; padding: 18px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #1e40af; margin-top: 0; margin-bottom: 12px; font-size: 15px;">[RESET] CLICK HERE TO RESET:</h4>
      <div style="text-align: center; margin: 18px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: ${EMAIL_CONFIG.COLORS.PRIMARY}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Reset my password</a>
      </div>
      <p style="color: #1e40af; margin-bottom: 8px; font-size: 13px;">Or copy and paste this link into your browser:</p>
      <div style="background-color: #dbeafe; padding: 10px; border-radius: 4px; border-left: 4px solid #2563eb; word-break: break-all; font-size: 13px;">
        <a href="${resetUrl}" style="color: #1e40af; text-decoration: none;">${resetUrl}</a>
      </div>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 12px; font-size: 15px;">[NEXT STEPS] AFTER RESET:</h4>
      <ol style="color: #065f46; margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.4;">
        <li style="margin-bottom: 5px;">Click the reset link above</li>
        <li style="margin-bottom: 5px;">Enter your new password (minimum 6 characters)</li>
        <li style="margin-bottom: 5px;">Log in to your account</li>
        <li>Start using your account again</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY}; line-height: 1.6; margin-bottom: 12px; font-size: 14px;">After resetting your password, you can log in here:</p>
      <a href="${loginUrl}" style="display: inline-block; background-color: transparent; color: ${EMAIL_CONFIG.COLORS.PRIMARY}; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px; border: 2px solid ${EMAIL_CONFIG.COLORS.PRIMARY};">Log in to B8Shield</a>
    </div>

    ${userAgent || timestamp ? `
    <div style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
      <h4 style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin-top: 0; margin-bottom: 8px; font-size: 13px;">[SECURITY INFO] REQUEST MADE FROM:</h4>
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; margin: 0; font-size: 12px; font-family: monospace;">
        ${timestamp ? `<strong>Time:</strong> ${timestamp}<br>` : ''}
        ${userAgent ? `<strong>Device:</strong> ${userAgent}<br>` : ''}
        <strong>Email:</strong> ${email}
      </p>
    </div>
    ` : ''}
    
    <div style="border-top: 1px solid ${EMAIL_CONFIG.COLORS.BORDER}; padding-top: 15px; margin-top: 25px;">
      <p style="color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED}; font-size: 13px; margin: 0; line-height: 1.4;">Best regards,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    }
  };

  const template = templates[lang as keyof typeof templates] || templates['sv-SE'];
  return {
    subject: template.subject,
    html: template.html
  };
}
