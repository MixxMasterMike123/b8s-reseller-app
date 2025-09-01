// B2B order confirmation admin email template
import { APP_URLS } from '../config';

export interface B2BOrderConfirmationAdminData {
  userData: {
    contactPerson?: string;
    companyName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    marginal?: number;
  };
  orderData: {
    orderNumber: string;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    createdAt?: string;
  };
  orderSummary: string;
  totalAmount: number;
}

// Helper function to format price
function formatPrice(price: number): string {
  return `${price.toFixed(0)} SEK`;
}

export function getB2BOrderConfirmationAdminTemplate(data: B2BOrderConfirmationAdminData, lang: string = 'sv-SE') {
  const { userData, orderData, orderSummary, totalAmount } = data;
  const adminPortalUrl = `${APP_URLS.B2B_PORTAL}/admin/orders`;

  const templates = {
    'sv-SE': {
      subject: `Ny B2B-beställning: ${orderData.orderNumber} från ${userData.companyName}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Ny B2B-beställning mottagen</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">En ny beställning har skapats i B2B-portalen och behöver behandling.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDERINFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Skapad:</strong> ${orderData.createdAt || 'Just nu'}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">Ny - Behöver behandling</span></p>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[KUND] KUNDINFORMATION:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <p style="margin: 8px 0; color: #374151;"><strong>Företag:</strong> ${userData.companyName}</p>
        <p style="margin: 8px 0; color: #374151;"><strong>E-post:</strong> <a href="mailto:${userData.email}" style="color: #2563eb;">${userData.email}</a></p>
        <p style="margin: 8px 0; color: #374151;"><strong>Kontaktperson:</strong> ${userData.contactPerson || 'Ej angiven'}</p>
        ${userData.phone ? `<p style="margin: 8px 0; color: #374151;"><strong>Telefon:</strong> <a href="tel:${userData.phone}" style="color: #2563eb;">${userData.phone}</a></p>` : ''}
        ${userData.address ? `<p style="margin: 8px 0; color: #374151;"><strong>Adress:</strong> ${userData.address}${userData.postalCode && userData.city ? `, ${userData.postalCode} ${userData.city}` : ''}</p>` : ''}
        ${userData.marginal ? `<p style="margin: 8px 0; color: #374151;"><strong>Kundmarginal:</strong> ${userData.marginal}%</p>` : ''}
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[BESTÄLLNING] ORDERDETALJER:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="white-space: pre-line; color: #374151; line-height: 1.6; font-family: monospace; font-size: 14px;">${orderSummary}</div>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTALT] ORDERSAMMANFATTNING:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${formatPrice(totalAmount)}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Inklusive kundens återförsäljarmarginal</div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 15px;">[ÅTGÄRD] ÅTGÄRDER BEHÖVS:</h3>
      <ol style="color: #dc2626; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Granska orderdetaljer och kunduppgifter</li>
        <li>Bekräfta lagerstatus för alla produkter</li>
        <li>Uppdatera orderstatus till "Bekräftad" eller "Behandlas"</li>
        <li>Skicka orderbekräftelse till kunden</li>
        <li>Planera leverans och packning</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${adminPortalUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Hantera order</a>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">B8Shield Admin Notification<br><strong>B2B Orderhantering</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-GB': {
      subject: `New B2B Order: ${orderData.orderNumber} from ${userData.companyName}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">New B2B Order Received</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">A new order has been created in the B2B portal and requires processing.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Created:</strong> ${orderData.createdAt || 'Just now'}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">New - Requires Processing</span></p>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[CUSTOMER] CUSTOMER INFORMATION:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <p style="margin: 8px 0; color: #374151;"><strong>Company:</strong> ${userData.companyName}</p>
        <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> <a href="mailto:${userData.email}" style="color: #2563eb;">${userData.email}</a></p>
        <p style="margin: 8px 0; color: #374151;"><strong>Contact Person:</strong> ${userData.contactPerson || 'Not specified'}</p>
        ${userData.phone ? `<p style="margin: 8px 0; color: #374151;"><strong>Phone:</strong> <a href="tel:${userData.phone}" style="color: #2563eb;">${userData.phone}</a></p>` : ''}
        ${userData.address ? `<p style="margin: 8px 0; color: #374151;"><strong>Address:</strong> ${userData.address}${userData.postalCode && userData.city ? `, ${userData.postalCode} ${userData.city}` : ''}</p>` : ''}
        ${userData.marginal ? `<p style="margin: 8px 0; color: #374151;"><strong>Customer Margin:</strong> ${userData.marginal}%</p>` : ''}
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER DETAILS:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="white-space: pre-line; color: #374151; line-height: 1.6; font-family: monospace; font-size: 14px;">${orderSummary}</div>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTAL] ORDER SUMMARY:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${formatPrice(totalAmount)}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Including customer reseller margin</div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 15px;">[ACTION] ACTIONS REQUIRED:</h3>
      <ol style="color: #dc2626; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Review order details and customer information</li>
        <li>Confirm stock availability for all products</li>
        <li>Update order status to "Confirmed" or "Processing"</li>
        <li>Send order confirmation to customer</li>
        <li>Plan delivery and packaging</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${adminPortalUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Manage Order</a>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">B8Shield Admin Notification<br><strong>B2B Order Management</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-US': {
      subject: `New B2B Order: ${orderData.orderNumber} from ${userData.companyName}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">New B2B Order Received</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">A new order has been created in the B2B portal and requires processing.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER INFORMATION:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Created:</strong> ${orderData.createdAt || 'Just now'}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">New - Requires Processing</span></p>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[CUSTOMER] CUSTOMER INFORMATION:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <p style="margin: 8px 0; color: #374151;"><strong>Company:</strong> ${userData.companyName}</p>
        <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> <a href="mailto:${userData.email}" style="color: #2563eb;">${userData.email}</a></p>
        <p style="margin: 8px 0; color: #374151;"><strong>Contact Person:</strong> ${userData.contactPerson || 'Not specified'}</p>
        ${userData.phone ? `<p style="margin: 8px 0; color: #374151;"><strong>Phone:</strong> <a href="tel:${userData.phone}" style="color: #2563eb;">${userData.phone}</a></p>` : ''}
        ${userData.address ? `<p style="margin: 8px 0; color: #374151;"><strong>Address:</strong> ${userData.address}${userData.postalCode && userData.city ? `, ${userData.postalCode} ${userData.city}` : ''}</p>` : ''}
        ${userData.marginal ? `<p style="margin: 8px 0; color: #374151;"><strong>Customer Margin:</strong> ${userData.marginal}%</p>` : ''}
      </div>
    </div>
    
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px;">[ORDER] ORDER DETAILS:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="white-space: pre-line; color: #374151; line-height: 1.6; font-family: monospace; font-size: 14px;">${orderSummary}</div>
      </div>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #92400e; margin-top: 0; margin-bottom: 15px;">[TOTAL] ORDER SUMMARY:</h3>
      <div style="background-color: white; border-radius: 4px; padding: 15px;">
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #1f2937;">${formatPrice(totalAmount)}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Including customer reseller margin</div>
        </div>
      </div>
    </div>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 15px;">[ACTION] ACTIONS REQUIRED:</h3>
      <ol style="color: #dc2626; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Review order details and customer information</li>
        <li>Confirm stock availability for all products</li>
        <li>Update order status to "Confirmed" or "Processing"</li>
        <li>Send order confirmation to customer</li>
        <li>Plan delivery and packaging</li>
      </ol>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${adminPortalUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Manage Order</a>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">B8Shield Admin Notification<br><strong>B2B Order Management</strong><br>JPH Innovation AB</p>
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
