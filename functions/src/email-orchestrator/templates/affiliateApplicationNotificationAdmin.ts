// affiliateApplicationNotificationAdmin.ts - Admin notification when new affiliate applies
// Notifies admins of new affiliate applications requiring review

import { EMAIL_CONFIG } from '../core/config';

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
}

export function generateAffiliateApplicationNotificationAdminTemplate(data: AffiliateApplicationAdminData): string {
  const { applicantInfo, applicationId, adminPortalUrl } = data;

  // Format social media links
  const formatSocialLinks = (socials: any) => {
    if (!socials) return 'Inga sociala medier angivna';
    
    const links = [];
    if (socials.website) links.push(`<strong>Webbplats:</strong> <a href="${socials.website}" style="color: ${EMAIL_CONFIG.COLORS.LINK};">${socials.website}</a>`);
    if (socials.instagram) links.push(`<strong>Instagram:</strong> <a href="${socials.instagram}" style="color: ${EMAIL_CONFIG.COLORS.LINK};">${socials.instagram}</a>`);
    if (socials.youtube) links.push(`<strong>YouTube:</strong> <a href="${socials.youtube}" style="color: ${EMAIL_CONFIG.COLORS.LINK};">${socials.youtube}</a>`);
    if (socials.facebook) links.push(`<strong>Facebook:</strong> <a href="${socials.facebook}" style="color: ${EMAIL_CONFIG.COLORS.LINK};">${socials.facebook}</a>`);
    if (socials.tiktok) links.push(`<strong>TikTok:</strong> <a href="${socials.tiktok}" style="color: ${EMAIL_CONFIG.COLORS.LINK};">${socials.tiktok}</a>`);
    
    return links.length > 0 ? links.join('<br>') : 'Inga sociala medier angivna';
  };

  return `
<!DOCTYPE html>
<html lang="sv-SE">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ny Affiliate-ansökan - ${applicantInfo.name}</title>
  <style>
    body {
      font-family: ${EMAIL_CONFIG.FONTS.PRIMARY};
      line-height: 1.6;
      color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY};
      margin: 0;
      padding: 0;
      background-color: ${EMAIL_CONFIG.COLORS.BACKGROUND};
    }
    .container {
      max-width: ${EMAIL_CONFIG.TEMPLATES.MAX_WIDTH};
      margin: 0 auto;
      background: white;
      border-radius: ${EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS};
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header-icon {
      font-size: 48px;
      margin-bottom: 15px;
    }
    .header-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }
    .urgent-banner {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      color: #92400e;
      padding: 15px;
      text-align: center;
      font-weight: 600;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .application-summary {
      background: ${EMAIL_CONFIG.COLORS.BACKGROUND};
      border-radius: 12px;
      padding: 25px;
      margin: 25px 0;
      border-left: 5px solid ${EMAIL_CONFIG.COLORS.PRIMARY};
    }
    .summary-title {
      font-size: 18px;
      font-weight: 600;
      color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY};
      margin-bottom: 20px;
      display: flex;
      align-items: center;
    }
    .summary-icon {
      margin-right: 10px;
      font-size: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }
    .info-item {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid ${EMAIL_CONFIG.COLORS.BORDER};
    }
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .info-value {
      font-size: 15px;
      color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY};
      font-weight: 500;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .social-links {
      font-size: 14px;
      line-height: 1.8;
    }
    .action-section {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
      border: 2px solid #0ea5e9;
    }
    .action-title {
      font-size: 20px;
      font-weight: 600;
      color: ${EMAIL_CONFIG.COLORS.TEXT_PRIMARY};
      margin-bottom: 15px;
    }
    .action-description {
      font-size: 16px;
      color: ${EMAIL_CONFIG.COLORS.TEXT_SECONDARY};
      margin-bottom: 25px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, ${EMAIL_CONFIG.COLORS.PRIMARY} 0%, #1e40af 100%);
      color: white;
      padding: 15px 35px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
      transition: all 0.3s ease;
    }
    .application-id {
      font-family: 'Monaco', 'Menlo', monospace;
      background: #1f2937;
      color: #10b981;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
      border: 1px solid #374151;
    }
    .footer {
      background: ${EMAIL_CONFIG.COLORS.BACKGROUND};
      padding: 30px;
      text-align: center;
      border-top: 1px solid ${EMAIL_CONFIG.COLORS.BORDER};
    }
    .footer-text {
      font-size: 14px;
      color: ${EMAIL_CONFIG.COLORS.TEXT_MUTED};
      margin: 0;
    }
    
    /* Mobile responsiveness */
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .header, .content, .footer {
        padding: 20px;
      }
      .info-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }
      .action-section {
        padding: 20px;
      }
      .cta-button {
        padding: 12px 25px;
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">🚨</div>
      <h1 class="header-title">Ny Affiliate-ansökan</h1>
    </div>
    
    <div class="urgent-banner">
      ⚡ KRÄVER GRANSKNING: Ny affiliate väntar på godkännande
    </div>
    
    <div class="content">
      <div class="application-summary">
        <div class="summary-title">
          <span class="summary-icon">👤</span>
          Ansökaninformation
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Namn</div>
            <div class="info-value">${applicantInfo.name}</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">E-post</div>
            <div class="info-value">
              <a href="mailto:${applicantInfo.email}" style="color: ${EMAIL_CONFIG.COLORS.LINK}; text-decoration: none;">
                ${applicantInfo.email}
              </a>
            </div>
          </div>
          
          ${applicantInfo.phone ? `
          <div class="info-item">
            <div class="info-label">Telefon</div>
            <div class="info-value">${applicantInfo.phone}</div>
          </div>
          ` : ''}
          
          <div class="info-item">
            <div class="info-label">Land</div>
            <div class="info-value">${applicantInfo.country || 'Ej angivet'}</div>
          </div>
          
          ${applicantInfo.promotionMethod ? `
          <div class="info-item full-width">
            <div class="info-label">Marknadsföringsmetod</div>
            <div class="info-value">${applicantInfo.promotionMethod}</div>
          </div>
          ` : ''}
          
          <div class="info-item full-width">
            <div class="info-label">Sociala Medier</div>
            <div class="info-value social-links">
              ${formatSocialLinks(applicantInfo.socials)}
            </div>
          </div>
          
          ${applicantInfo.message ? `
          <div class="info-item full-width">
            <div class="info-label">Meddelande</div>
            <div class="info-value">${applicantInfo.message}</div>
          </div>
          ` : ''}
        </div>
        
        <div class="application-id">
          Ansöknings-ID: ${applicationId}
        </div>
      </div>
      
      <div class="action-section">
        <div class="action-title">Granska och Godkänn</div>
        <div class="action-description">
          Klicka nedan för att granska ansökan och fatta beslut om godkännande.
        </div>
        <a href="${adminPortalUrl}/admin/affiliates" class="cta-button">
          Öppna Admin Panel →
        </a>
      </div>
    </div>
    
    <div class="footer">
      <p class="footer-text">
        Detta meddelande skickades automatiskt från B8Shield Affiliate System.<br>
        <strong>JPH Innovation AB</strong> | B8Shield Admin
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
