"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getB2BOrderConfirmationCustomerTemplate = void 0;
// B2B order confirmation customer email template
const config_1 = require("../config");
// Helper function to format price
function formatPrice(price) {
    return `${price.toFixed(0)} SEK`;
}
function getB2BOrderConfirmationCustomerTemplate(data, lang = 'sv-SE') {
    const { userData, orderData, orderSummary, totalAmount } = data;
    const supportUrl = `${config_1.APP_URLS.B2B_PORTAL}/contact`;
    const templates = {
        'sv-SE': {
            subject: `Orderbekräftelse: ${orderData.orderNumber}`,
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Orderbekräftelse</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hej ${userData.contactPerson || userData.companyName},</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERDETALJER:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Företag:</strong> ${userData.companyName}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Kontaktperson:</strong> ${userData.contactPerson || 'Ej angiven'}</p>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[BESTÄLLNING] DIN BESTÄLLNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="white-space: pre-line; color: #374151; line-height: 1.6;">${orderSummary}</div>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTALT] ORDERSAMMANFATTNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${formatPrice(totalAmount)}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Inklusive din återförsäljarmarginal</div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[NÄSTA STEG] VAD HÄNDER NU:</h3>
      <ol style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Vi behandlar din beställning inom 1-2 arbetsdagar</li>
        <li>Du får en bekräftelse när ordern skickas</li>
        <li>Spårningsinformation skickas via e-post</li>
        <li>Leverans sker normalt inom 3-5 arbetsdagar</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${config_1.APP_URLS.B2B_PORTAL}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Gå till portalen</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">Om du har några frågor om din beställning, kontakta vår support på <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Du kommer att få ytterligare uppdateringar när din order behandlas.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-GB': {
            subject: `Order Confirmation: ${orderData.orderNumber}`,
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Order Confirmation</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hello ${userData.contactPerson || userData.companyName},</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Thank you for your order! We have received your order and will process it shortly.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER DETAILS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Company:</strong> ${userData.companyName}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Contact Person:</strong> ${userData.contactPerson || 'Not specified'}</p>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[ORDER] YOUR ORDER:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="white-space: pre-line; color: #374151; line-height: 1.6;">${orderSummary}</div>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTAL] ORDER SUMMARY:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${formatPrice(totalAmount)}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Including your reseller margin</div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[NEXT STEPS] WHAT HAPPENS NOW:</h3>
      <ol style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>We will process your order within 1-2 business days</li>
        <li>You will receive confirmation when the order ships</li>
        <li>Tracking information will be sent via email</li>
        <li>Delivery typically takes 3-5 business days</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${config_1.APP_URLS.B2B_PORTAL}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Go to Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions about your order, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">You will receive further updates as your order progresses.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Kind regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
        },
        'en-US': {
            subject: `Order Confirmation: ${orderData.orderNumber}`,
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${config_1.APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Order Confirmation</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Hello ${userData.contactPerson || userData.companyName},</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Thank you for your order! We have received your order and will process it shortly.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER DETAILS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Company:</strong> ${userData.companyName}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Contact Person:</strong> ${userData.contactPerson || 'Not specified'}</p>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[ORDER] YOUR ORDER:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="white-space: pre-line; color: #374151; line-height: 1.6;">${orderSummary}</div>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTAL] ORDER SUMMARY:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${formatPrice(totalAmount)}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Including your reseller margin</div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[NEXT STEPS] WHAT HAPPENS NOW:</h3>
      <ol style="color: #1e40af; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>We will process your order within 1-2 business days</li>
        <li>You will receive confirmation when the order ships</li>
        <li>Tracking information will be sent via email</li>
        <li>Delivery typically takes 3-5 business days</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${config_1.APP_URLS.B2B_PORTAL}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Go to Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions about your order, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">You will receive further updates as your order progresses.</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
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
exports.getB2BOrderConfirmationCustomerTemplate = getB2BOrderConfirmationCustomerTemplate;
//# sourceMappingURL=b2bOrderConfirmationCustomer.js.map