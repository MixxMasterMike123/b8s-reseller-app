// Order status update email template
import { APP_URLS } from '../config';

export interface OrderStatusUpdateData {
  orderData: {
    orderNumber: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
  userData: {
    contactPerson?: string;
    companyName?: string;
    email: string;
  };
  newStatus: string;
  previousStatus?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  notes?: string;
}

// Helper function to get status display info
function getStatusInfo(status: string, lang: string) {
  const statusMap = {
    'sv-SE': {
      'pending': { name: 'Väntande', color: '#6b7280', icon: '⏳' },
      'confirmed': { name: 'Bekräftad', color: '#059669', icon: '✅' },
      'processing': { name: 'Behandlas', color: '#2563eb', icon: '⚙️' },
      'shipped': { name: 'Skickad', color: '#7c3aed', icon: '📦' },
      'delivered': { name: 'Levererad', color: '#059669', icon: '🎉' },
      'cancelled': { name: 'Avbruten', color: '#dc2626', icon: '❌' }
    },
    'en-GB': {
      'pending': { name: 'Pending', color: '#6b7280', icon: '⏳' },
      'confirmed': { name: 'Confirmed', color: '#059669', icon: '✅' },
      'processing': { name: 'Processing', color: '#2563eb', icon: '⚙️' },
      'shipped': { name: 'Shipped', color: '#7c3aed', icon: '📦' },
      'delivered': { name: 'Delivered', color: '#059669', icon: '🎉' },
      'cancelled': { name: 'Cancelled', color: '#dc2626', icon: '❌' }
    },
    'en-US': {
      'pending': { name: 'Pending', color: '#6b7280', icon: '⏳' },
      'confirmed': { name: 'Confirmed', color: '#059669', icon: '✅' },
      'processing': { name: 'Processing', color: '#2563eb', icon: '⚙️' },
      'shipped': { name: 'Shipped', color: '#7c3aed', icon: '📦' },
      'delivered': { name: 'Delivered', color: '#059669', icon: '🎉' },
      'cancelled': { name: 'Canceled', color: '#dc2626', icon: '❌' }
    }
  };

  const langMap = statusMap[lang as keyof typeof statusMap] || statusMap['sv-SE'];
  return langMap[status as keyof typeof langMap] || { name: status, color: '#6b7280', icon: '📋' };
}

// Helper function to get next steps based on status
function getNextSteps(status: string, lang: string): string[] {
  const nextStepsMap = {
    'sv-SE': {
      'confirmed': [
        'Vi förbereder din beställning för behandling',
        'Du får en uppdatering när vi börjar behandla ordern',
        'Beräknad behandlingstid: 1-2 arbetsdagar'
      ],
      'processing': [
        'Din order behandlas och förbereds för leverans',
        'Alla produkter kontrolleras och packas noggrant',
        'Du får spårningsinformation när ordern skickas'
      ],
      'shipped': [
        'Din order är nu på väg till dig',
        'Använd spårningsnumret för att följa leveransen',
        'Kontakta oss om du har frågor om leveransen'
      ],
      'delivered': [
        'Din beställning har levererats framgångsrikt',
        'Vi hoppas du är nöjd med ditt köp',
        'Kontakta oss om du behöver support eller har frågor'
      ],
      'cancelled': [
        'Din beställning har avbrutits',
        'Om betalning har genomförts kommer återbetalning att ske inom 3-5 arbetsdagar',
        'Kontakta vår support om du har frågor'
      ]
    },
    'en-GB': {
      'confirmed': [
        'We are preparing your order for processing',
        'You will receive an update when we start processing your order',
        'Estimated processing time: 1-2 business days'
      ],
      'processing': [
        'Your order is being processed and prepared for shipment',
        'All products are being checked and carefully packed',
        'You will receive tracking information once your order ships'
      ],
      'shipped': [
        'Your order is now on its way to you',
        'Use the tracking number to follow your delivery',
        'Contact us if you have any questions about delivery'
      ],
      'delivered': [
        'Your order has been successfully delivered',
        'We hope you are satisfied with your purchase',
        'Contact us if you need support or have any questions'
      ],
      'cancelled': [
        'Your order has been cancelled',
        'If payment was processed, a refund will be issued within 3-5 business days',
        'Contact our support if you have any questions'
      ]
    },
    'en-US': {
      'confirmed': [
        'We are preparing your order for processing',
        'You will receive an update when we start processing your order',
        'Estimated processing time: 1-2 business days'
      ],
      'processing': [
        'Your order is being processed and prepared for shipment',
        'All products are being checked and carefully packed',
        'You will receive tracking information once your order ships'
      ],
      'shipped': [
        'Your order is now on its way to you',
        'Use the tracking number to follow your delivery',
        'Contact us if you have any questions about delivery'
      ],
      'delivered': [
        'Your order has been successfully delivered',
        'We hope you are satisfied with your purchase',
        'Contact us if you need support or have any questions'
      ],
      'cancelled': [
        'Your order has been canceled',
        'If payment was processed, a refund will be issued within 3-5 business days',
        'Contact our support if you have any questions'
      ]
    }
  };

  const langMap = nextStepsMap[lang as keyof typeof nextStepsMap] || nextStepsMap['sv-SE'];
  return langMap[status as keyof typeof langMap] || [];
}

export function getOrderStatusUpdateTemplate(data: OrderStatusUpdateData, lang: string = 'sv-SE') {
  const { orderData, userData, newStatus, trackingNumber, estimatedDelivery, notes } = data;
  const contactPerson = userData.contactPerson || userData.companyName || '';
  const statusInfo = getStatusInfo(newStatus, lang);
  const nextSteps = getNextSteps(newStatus, lang);
  const supportUrl = `${APP_URLS.B2B_PORTAL}/contact`;

  const templates = {
    'sv-SE': {
      subject: `Orderuppdatering: ${orderData.orderNumber} - ${statusInfo.name}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Vi har en uppdatering om din beställning!</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERINFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Företag:</strong> ${userData.companyName}</p>
    </div>
    
    <div style="background-color: ${statusInfo.color === '#dc2626' ? '#fef2f2' : '#ecfdf5'}; border-left: 4px solid ${statusInfo.color}; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${statusInfo.color}; margin-top: 0; margin-bottom: 15px; display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 10px;">${statusInfo.icon}</span>
        [STATUS] NY STATUS: ${statusInfo.name.toUpperCase()}
      </h3>
      <p style="color: ${statusInfo.color}; margin: 0; font-size: 16px; font-weight: 500;">Din order har uppdaterats till status "${statusInfo.name}"</p>
    </div>
    
    ${trackingNumber ? `
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[SPÅRNING] SPÅRNINGSINFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Spårningsnummer:</strong> <code style="background-color: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${trackingNumber}</code></p>
      ${estimatedDelivery ? `<p style="margin: 8px 0; color: #374151;"><strong>Beräknad leverans:</strong> ${estimatedDelivery}</p>` : ''}
    </div>
    ` : ''}
    
    ${nextSteps.length > 0 ? `
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[NÄSTA STEG] VAD HÄNDER NU:</h3>
      <ol style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
        ${nextSteps.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
    ` : ''}
    
    ${notes ? `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">[MEDDELANDE] YTTERLIGARE INFORMATION:</h3>
      <p style="color: #0369a1; margin: 0; line-height: 1.6;">${notes}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URLS.B2B_PORTAL}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Gå till portalen</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">Om du har några frågor om din beställning, kontakta vår support på <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-GB': {
      subject: `Order Update: ${orderData.orderNumber} - ${statusInfo.name}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">We have an update about your order!</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Company:</strong> ${userData.companyName}</p>
    </div>
    
    <div style="background-color: ${statusInfo.color === '#dc2626' ? '#fef2f2' : '#ecfdf5'}; border-left: 4px solid ${statusInfo.color}; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${statusInfo.color}; margin-top: 0; margin-bottom: 15px; display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 10px;">${statusInfo.icon}</span>
        [STATUS] NEW STATUS: ${statusInfo.name.toUpperCase()}
      </h3>
      <p style="color: ${statusInfo.color}; margin: 0; font-size: 16px; font-weight: 500;">Your order has been updated to "${statusInfo.name}" status</p>
    </div>
    
    ${trackingNumber ? `
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[TRACKING] TRACKING INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Tracking Number:</strong> <code style="background-color: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${trackingNumber}</code></p>
      ${estimatedDelivery ? `<p style="margin: 8px 0; color: #374151;"><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
    </div>
    ` : ''}
    
    ${nextSteps.length > 0 ? `
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[NEXT STEPS] WHAT HAPPENS NOW:</h3>
      <ol style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
        ${nextSteps.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
    ` : ''}
    
    ${notes ? `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">[MESSAGE] ADDITIONAL INFORMATION:</h3>
      <p style="color: #0369a1; margin: 0; line-height: 1.6;">${notes}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URLS.B2B_PORTAL}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Go to Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions about your order, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Kind regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-US': {
      subject: `Order Update: ${orderData.orderNumber} - ${statusInfo.name}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">We have an update about your order!</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Company:</strong> ${userData.companyName}</p>
    </div>
    
    <div style="background-color: ${statusInfo.color === '#dc2626' ? '#fef2f2' : '#ecfdf5'}; border-left: 4px solid ${statusInfo.color}; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: ${statusInfo.color}; margin-top: 0; margin-bottom: 15px; display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 10px;">${statusInfo.icon}</span>
        [STATUS] NEW STATUS: ${statusInfo.name.toUpperCase()}
      </h3>
      <p style="color: ${statusInfo.color}; margin: 0; font-size: 16px; font-weight: 500;">Your order has been updated to "${statusInfo.name}" status</p>
    </div>
    
    ${trackingNumber ? `
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[TRACKING] TRACKING INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Tracking Number:</strong> <code style="background-color: #e0e7ff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${trackingNumber}</code></p>
      ${estimatedDelivery ? `<p style="margin: 8px 0; color: #374151;"><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
    </div>
    ` : ''}
    
    ${nextSteps.length > 0 ? `
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[NEXT STEPS] WHAT HAPPENS NOW:</h3>
      <ol style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
        ${nextSteps.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
    ` : ''}
    
    ${notes ? `
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #0369a1; margin-top: 0; margin-bottom: 15px;">[MESSAGE] ADDITIONAL INFORMATION:</h3>
      <p style="color: #0369a1; margin: 0; line-height: 1.6;">${notes}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URLS.B2B_PORTAL}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Go to Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions about your order, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
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
