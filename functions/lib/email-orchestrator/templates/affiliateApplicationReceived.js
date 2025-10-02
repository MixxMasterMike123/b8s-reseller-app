"use strict";
// affiliateApplicationReceived.ts - Email sent to affiliate when application is received
// Confirms application received and sets expectations
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAffiliateApplicationReceivedTemplate = void 0;
const config_1 = require("../core/config");
function generateAffiliateApplicationReceivedTemplate(data) {
    const { applicantInfo, applicationId, language } = data;
    // Multi-language content
    const content = {
        'sv-SE': {
            subject: 'Affiliate-ansökan mottagen - B8Shield',
            title: 'Tack för din affiliate-ansökan!',
            greeting: `Hej ${applicantInfo.name}!`,
            receivedMessage: 'Vi har mottagit din ansökan till B8Shields affiliate-program.',
            applicationIdLabel: 'Ansöknings-ID',
            reviewProcess: 'Vad händer nu?',
            reviewSteps: [
                'Vi granskar din ansökan inom 1-3 arbetsdagar',
                'Vi kontrollerar dina sociala medier och marknadsföringskanaler',
                'Du får ett e-postmeddelande med vårt beslut',
                'Vid godkännande får du dina inloggningsuppgifter och affiliate-länk'
            ],
            contactInfo: 'Har du frågor? Kontakta oss på info@jphinnovation.se',
            thanks: 'Tack för ditt intresse för B8Shield!',
            teamSignature: 'Vänliga hälsningar,<br/>B8Shield Affiliate Team'
        },
        'en-GB': {
            subject: 'Affiliate Application Received - B8Shield',
            title: 'Thank you for your affiliate application!',
            greeting: `Hello ${applicantInfo.name}!`,
            receivedMessage: 'We have received your application to join the B8Shield affiliate programme.',
            applicationIdLabel: 'Application ID',
            reviewProcess: 'What happens next?',
            reviewSteps: [
                'We will review your application within 1-3 business days',
                'We will check your social media and marketing channels',
                'You will receive an email with our decision',
                'If approved, you will receive your login credentials and affiliate link'
            ],
            contactInfo: 'Have questions? Contact us at info@jphinnovation.se',
            thanks: 'Thank you for your interest in B8Shield!',
            teamSignature: 'Best regards,<br/>B8Shield Affiliate Team'
        },
        'en-US': {
            subject: 'Affiliate Application Received - B8Shield',
            title: 'Thank you for your affiliate application!',
            greeting: `Hello ${applicantInfo.name}!`,
            receivedMessage: 'We have received your application to join the B8Shield affiliate program.',
            applicationIdLabel: 'Application ID',
            reviewProcess: 'What happens next?',
            reviewSteps: [
                'We will review your application within 1-3 business days',
                'We will check your social media and marketing channels',
                'You will receive an email with our decision',
                'If approved, you will receive your login credentials and affiliate link'
            ],
            contactInfo: 'Have questions? Contact us at info@jphinnovation.se',
            thanks: 'Thank you for your interest in B8Shield!',
            teamSignature: 'Best regards,<br/>B8Shield Affiliate Team'
        }
    };
    const t = content[language] || content['sv-SE'];
    return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
  <style>
    body {
      font-family: ${config_1.EMAIL_CONFIG.FONTS.PRIMARY};
      line-height: 1.6;
      color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY};
      margin: 0;
      padding: 0;
      background-color: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND};
    }
    .container {
      max-width: ${config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH};
      margin: 0 auto;
      background: white;
      border-radius: ${config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS};
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${config_1.EMAIL_CONFIG.COLORS.PRIMARY} 0%, #1e40af 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY};
    }
    .message {
      font-size: 16px;
      margin-bottom: 25px;
      line-height: 1.6;
    }
    .application-id {
      background: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND};
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};
      margin: 25px 0;
    }
    .application-id-label {
      font-weight: 600;
      color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .application-id-value {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 16px;
      font-weight: 600;
      color: ${config_1.EMAIL_CONFIG.COLORS.PRIMARY};
      background: white;
      padding: 10px 15px;
      border-radius: 6px;
      border: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER};
    }
    .review-section {
      margin: 30px 0;
    }
    .review-title {
      font-size: 18px;
      font-weight: 600;
      color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY};
      margin-bottom: 15px;
    }
    .review-steps {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .review-step {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15px;
      padding: 15px;
      background: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND};
      border-radius: 8px;
      border-left: 3px solid ${config_1.EMAIL_CONFIG.COLORS.SUCCESS};
    }
    .step-number {
      background: ${config_1.EMAIL_CONFIG.COLORS.SUCCESS};
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      margin-right: 15px;
      flex-shrink: 0;
    }
    .step-text {
      flex: 1;
      font-size: 15px;
      line-height: 1.5;
    }
    .contact-info {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      text-align: center;
    }
    .contact-info-text {
      font-size: 15px;
      color: #856404;
      margin: 0;
    }
    .thanks-message {
      font-size: 16px;
      font-weight: 600;
      color: ${config_1.EMAIL_CONFIG.COLORS.SUCCESS};
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #f0f9ff;
      border-radius: 8px;
      border: 1px solid #bae6fd;
    }
    .footer {
      background: ${config_1.EMAIL_CONFIG.COLORS.BACKGROUND};
      padding: 30px;
      text-align: center;
      border-top: 1px solid ${config_1.EMAIL_CONFIG.COLORS.BORDER};
    }
    .signature {
      font-size: 16px;
      color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY};
      margin-bottom: 20px;
    }
    .company-info {
      font-size: 14px;
      color: ${config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED};
      line-height: 1.4;
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
      .greeting {
        font-size: 16px;
      }
      .message {
        font-size: 15px;
      }
      .review-title {
        font-size: 16px;
      }
      .step-text {
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">B8Shield</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${t.title}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">${t.greeting}</div>
      
      <div class="message">
        ${t.receivedMessage}
      </div>
      
      <div class="application-id">
        <div class="application-id-label">${t.applicationIdLabel}</div>
        <div class="application-id-value">${applicationId}</div>
      </div>
      
      <div class="review-section">
        <div class="review-title">${t.reviewProcess}</div>
        <ul class="review-steps">
          ${t.reviewSteps.map((step, index) => `
            <li class="review-step">
              <div class="step-number">${index + 1}</div>
              <div class="step-text">${step}</div>
            </li>
          `).join('')}
        </ul>
      </div>
      
      <div class="contact-info">
        <p class="contact-info-text">${t.contactInfo}</p>
      </div>
      
      <div class="thanks-message">
        ${t.thanks}
      </div>
    </div>
    
    <div class="footer">
      <div class="signature">${t.teamSignature}</div>
      <div class="company-info">
        <strong>JPH Innovation AB</strong><br>
        B8Shield Affiliate Program<br>
        ${config_1.EMAIL_CONFIG.URLS.B2C_SHOP}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
exports.generateAffiliateApplicationReceivedTemplate = generateAffiliateApplicationReceivedTemplate;
//# sourceMappingURL=affiliateApplicationReceived.js.map