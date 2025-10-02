"use strict";
// affiliateApplicationReceived.ts - Email sent to affiliate when application is received
// Confirms application received and sets expectations
exports.__esModule = true;
exports.generateAffiliateApplicationReceivedTemplate = void 0;
var config_1 = require("../core/config");
function generateAffiliateApplicationReceivedTemplate(data) {
    var applicantInfo = data.applicantInfo, applicationId = data.applicationId, language = data.language;
    // Multi-language content
    var content = {
        'sv-SE': {
            subject: 'Affiliate-ansökan mottagen - B8Shield',
            title: 'Tack för din affiliate-ansökan!',
            greeting: "Hej ".concat(applicantInfo.name, "!"),
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
            greeting: "Hello ".concat(applicantInfo.name, "!"),
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
            greeting: "Hello ".concat(applicantInfo.name, "!"),
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
    var t = content[language] || content['sv-SE'];
    return "\n<!DOCTYPE html>\n<html lang=\"".concat(language, "\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>").concat(t.subject, "</title>\n  <style>\n    body {\n      font-family: ").concat(config_1.EMAIL_CONFIG.FONTS.PRIMARY, ";\n      line-height: 1.6;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, ";\n      margin: 0;\n      padding: 0;\n      background-color: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, ";\n    }\n    .container {\n      max-width: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.MAX_WIDTH, ";\n      margin: 0 auto;\n      background: white;\n      border-radius: ").concat(config_1.EMAIL_CONFIG.TEMPLATES.BORDER_RADIUS, ";\n      overflow: hidden;\n      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n    }\n    .header {\n      background: linear-gradient(135deg, ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, " 0%, #1e40af 100%);\n      color: white;\n      padding: 30px;\n      text-align: center;\n    }\n    .logo {\n      font-size: 28px;\n      font-weight: bold;\n      margin-bottom: 10px;\n    }\n    .content {\n      padding: 40px 30px;\n    }\n    .greeting {\n      font-size: 18px;\n      font-weight: 600;\n      margin-bottom: 20px;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, ";\n    }\n    .message {\n      font-size: 16px;\n      margin-bottom: 25px;\n      line-height: 1.6;\n    }\n    .application-id {\n      background: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, ";\n      padding: 20px;\n      border-radius: 8px;\n      border-left: 4px solid ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, ";\n      margin: 25px 0;\n    }\n    .application-id-label {\n      font-weight: 600;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\n      font-size: 14px;\n      text-transform: uppercase;\n      letter-spacing: 0.5px;\n      margin-bottom: 8px;\n    }\n    .application-id-value {\n      font-family: 'Monaco', 'Menlo', monospace;\n      font-size: 16px;\n      font-weight: 600;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.PRIMARY, ";\n      background: white;\n      padding: 10px 15px;\n      border-radius: 6px;\n      border: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, ";\n    }\n    .review-section {\n      margin: 30px 0;\n    }\n    .review-title {\n      font-size: 18px;\n      font-weight: 600;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_PRIMARY, ";\n      margin-bottom: 15px;\n    }\n    .review-steps {\n      list-style: none;\n      padding: 0;\n      margin: 0;\n    }\n    .review-step {\n      display: flex;\n      align-items: flex-start;\n      margin-bottom: 15px;\n      padding: 15px;\n      background: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, ";\n      border-radius: 8px;\n      border-left: 3px solid ").concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, ";\n    }\n    .step-number {\n      background: ").concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, ";\n      color: white;\n      width: 24px;\n      height: 24px;\n      border-radius: 50%;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      font-size: 12px;\n      font-weight: 600;\n      margin-right: 15px;\n      flex-shrink: 0;\n    }\n    .step-text {\n      flex: 1;\n      font-size: 15px;\n      line-height: 1.5;\n    }\n    .contact-info {\n      background: #fff3cd;\n      border: 1px solid #ffeaa7;\n      border-radius: 8px;\n      padding: 20px;\n      margin: 30px 0;\n      text-align: center;\n    }\n    .contact-info-text {\n      font-size: 15px;\n      color: #856404;\n      margin: 0;\n    }\n    .thanks-message {\n      font-size: 16px;\n      font-weight: 600;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.SUCCESS, ";\n      text-align: center;\n      margin: 30px 0;\n      padding: 20px;\n      background: #f0f9ff;\n      border-radius: 8px;\n      border: 1px solid #bae6fd;\n    }\n    .footer {\n      background: ").concat(config_1.EMAIL_CONFIG.COLORS.BACKGROUND, ";\n      padding: 30px;\n      text-align: center;\n      border-top: 1px solid ").concat(config_1.EMAIL_CONFIG.COLORS.BORDER, ";\n    }\n    .signature {\n      font-size: 16px;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_SECONDARY, ";\n      margin-bottom: 20px;\n    }\n    .company-info {\n      font-size: 14px;\n      color: ").concat(config_1.EMAIL_CONFIG.COLORS.TEXT_MUTED, ";\n      line-height: 1.4;\n    }\n    \n    /* Mobile responsiveness */\n    @media only screen and (max-width: 600px) {\n      .container {\n        margin: 0;\n        border-radius: 0;\n      }\n      .header, .content, .footer {\n        padding: 20px;\n      }\n      .greeting {\n        font-size: 16px;\n      }\n      .message {\n        font-size: 15px;\n      }\n      .review-title {\n        font-size: 16px;\n      }\n      .step-text {\n        font-size: 14px;\n      }\n    }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <div class=\"logo\">B8Shield</div>\n      <h1 style=\"margin: 0; font-size: 24px; font-weight: 600;\">").concat(t.title, "</h1>\n    </div>\n    \n    <div class=\"content\">\n      <div class=\"greeting\">").concat(t.greeting, "</div>\n      \n      <div class=\"message\">\n        ").concat(t.receivedMessage, "\n      </div>\n      \n      <div class=\"application-id\">\n        <div class=\"application-id-label\">").concat(t.applicationIdLabel, "</div>\n        <div class=\"application-id-value\">").concat(applicationId, "</div>\n      </div>\n      \n      <div class=\"review-section\">\n        <div class=\"review-title\">").concat(t.reviewProcess, "</div>\n        <ul class=\"review-steps\">\n          ").concat(t.reviewSteps.map(function (step, index) { return "\n            <li class=\"review-step\">\n              <div class=\"step-number\">".concat(index + 1, "</div>\n              <div class=\"step-text\">").concat(step, "</div>\n            </li>\n          "); }).join(''), "\n        </ul>\n      </div>\n      \n      <div class=\"contact-info\">\n        <p class=\"contact-info-text\">").concat(t.contactInfo, "</p>\n      </div>\n      \n      <div class=\"thanks-message\">\n        ").concat(t.thanks, "\n      </div>\n    </div>\n    \n    <div class=\"footer\">\n      <div class=\"signature\">").concat(t.teamSignature, "</div>\n      <div class=\"company-info\">\n        <strong>JPH Innovation AB</strong><br>\n        B8Shield Affiliate Program<br>\n        ").concat(config_1.EMAIL_CONFIG.URLS.B2C_SHOP, "\n      </div>\n    </div>\n  </div>\n</body>\n</html>\n  ").trim();
}
exports.generateAffiliateApplicationReceivedTemplate = generateAffiliateApplicationReceivedTemplate;
