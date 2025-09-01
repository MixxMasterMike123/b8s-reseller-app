// Customer welcome credentials email template
import { APP_URLS } from '../config';
// import { getLanguageSegment } from '../config'; // TODO: Will be needed for language-specific URLs

export interface WelcomeCredentialsData {
  customerData: {
    companyName: string;
    contactPerson: string;
    email: string;
  };
  temporaryPassword: string;
}

export function getWelcomeCredentialsTemplate(data: WelcomeCredentialsData, lang: string = 'sv-SE') {
  const { customerData, temporaryPassword } = data;
  const { companyName, contactPerson, email } = customerData;
  
  // Generate URLs with proper language segments
  // const segment = getLanguageSegment(lang); // TODO: Will be needed for language-specific URLs
  const loginUrl = `${APP_URLS.B2B_PORTAL}`;
  const supportUrl = `${APP_URLS.B2B_PORTAL}/contact`;

  const templates = {
    'sv-SE': {
      subject: 'Välkommen till B8Shield Återförsäljarportalen - Dina inloggningsuppgifter',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Välkommen till B8Shield Återförsäljarportalen!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">Vi har skapat ett konto för <strong>${companyName}</strong> och du kan nu komma åt vår återförsäljarportal.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[INLOGGNING] DINA INLOGGNINGSUPPGIFTER:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>E-post:</strong> ${email}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Tillfälligt lösenord:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: bold;">${temporaryPassword}</code></p>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[VIKTIGT] VIKTIG INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>Du måste ändra ditt lösenord vid första inloggningen</li>
        <li>Portalen finns på: <a href="${loginUrl}" style="color: #2563eb; font-weight: bold;">${loginUrl}</a></li>
        <li>Ditt konto har aktiverats och du har nu tillgång till alla återförsäljarfunktioner</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[FUNKTIONER] VAD KAN DU GÖRA I PORTALEN:</h4>
      <ul style="color: #065f46; margin: 0; padding-left: 20px;">
        <li>Lägga beställningar direkt</li>
        <li>Se din orderhistorik</li>
        <li>Ladda ner produktkataloger</li>
        <li>Komma åt marknadsföringsmaterial</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Logga in på portalen</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] BEHÖVER DU HJÄLP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">Om du har några frågor eller problem med inloggningen, kontakta vår support på <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Vi ser fram emot ett framgångsrikt samarbete!</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Med vänliga hälsningar,<br><strong>B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-GB': {
      subject: 'Welcome to B8Shield Reseller Portal - Your Login Credentials',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Welcome to the B8Shield Reseller Portal!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">We have created an account for <strong>${companyName}</strong> and you can now access our reseller portal.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[LOGIN] YOUR LOGIN CREDENTIALS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: bold;">${temporaryPassword}</code></p>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[IMPORTANT] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>You must change your password on first login</li>
        <li>The portal is available at: <a href="${loginUrl}" style="color: #2563eb; font-weight: bold;">${loginUrl}</a></li>
        <li>Your account has been activated and you now have access to all reseller functions</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[FEATURES] WHAT YOU CAN DO IN THE PORTAL:</h4>
      <ul style="color: #065f46; margin: 0; padding-left: 20px;">
        <li>Place orders directly</li>
        <li>View your order history</li>
        <li>Download product catalogues</li>
        <li>Access marketing materials</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Login to Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions or problems with logging in, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">We look forward to a successful partnership!</p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Kind regards,<br><strong>The B8Shield Team</strong><br>JPH Innovation AB</p>
    </div>
  </div>
</div>`
    },
    'en-US': {
      subject: 'Welcome to B8Shield Reseller Portal - Your Login Credentials',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${APP_URLS.LOGO_URL}" alt="B8Shield" style="max-width: 200px; height: auto;">
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${contactPerson},</h2>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">Welcome to the B8Shield Reseller Portal!</p>
    <p style="color: #374151; line-height: 1.6; margin-bottom: 25px;">We have created an account for <strong>${companyName}</strong> and you can now access our reseller portal.</p>
    
    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px;">[LOGIN] YOUR LOGIN CREDENTIALS:</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: bold;">${temporaryPassword}</code></p>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
      <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">[IMPORTANT] IMPORTANT INFORMATION:</h4>
      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
        <li>You must change your password on first login</li>
        <li>The portal is available at: <a href="${loginUrl}" style="color: #2563eb; font-weight: bold;">${loginUrl}</a></li>
        <li>Your account has been activated and you now have access to all reseller functions</li>
      </ul>
    </div>
    
    <div style="background-color: #ecfdf5; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #065f46; margin-top: 0; margin-bottom: 15px;">[FEATURES] WHAT YOU CAN DO IN THE PORTAL:</h4>
      <ul style="color: #065f46; margin: 0; padding-left: 20px;">
        <li>Place orders directly</li>
        <li>View your order history</li>
        <li>Download product catalogs</li>
        <li>Access marketing materials</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: 2px solid #1d4ed8;">Login to Portal</a>
    </div>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h4 style="color: #374151; margin-top: 0; margin-bottom: 10px;">[SUPPORT] NEED HELP?</h4>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">If you have any questions or problems with logging in, please contact our support at <a href="${supportUrl}" style="color: #2563eb;">${supportUrl}</a></p>
    </div>
    
    <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">We look forward to a successful partnership!</p>
    
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
