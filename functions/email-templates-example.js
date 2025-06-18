// Example: Enhanced Email Templates with Professional Styling
// File: functions/index.js (lines 27-140)

const getEmailTemplate = (status, orderData, userData) => {
  const orderNumber = orderData.orderNumber;
  const companyName = userData.companyName;
  const contactPerson = userData.contactPerson;
  
  // Enhanced templates with professional styling
  const templates = {
    shipped: {
      subject: `📦 Din order har skickats - ${orderNumber}`,
      text: `
        Hej ${contactPerson},
        
        Fantastiska nyheter! Din B8Shield-order har skickats och är nu på väg till dig.
        
        📋 ORDERDETALJER:
        Ordernummer: ${orderNumber}
        Status: Skickad
        ${orderData.trackingNumber ? `Spårningsnummer: ${orderData.trackingNumber}` : ''}
        ${orderData.carrier ? `Transportör: ${orderData.carrier}` : ''}
        
        📅 FÖRVÄNTAD LEVERANS:
        Din order kommer att levereras inom 1-3 arbetsdagar.
        
        📞 BEHÖVER DU HJÄLP?
        Kontakta oss på info@b8shield.com eller +46 XX XXX XX XX
        
        Tack för att du valde B8Shield!
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Din order har skickats</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-badge { background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .tracking-info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Din order har skickats!</h1>
              <p>Tack ${contactPerson}, din B8Shield-beställning är på väg!</p>
            </div>
            
            <div class="content">
              <div class="order-details">
                <h3>📋 Orderdetaljer</h3>
                <p><strong>Ordernummer:</strong> ${orderNumber}</p>
                <span class="status-badge">✅ Skickad</span>
                
                ${orderData.trackingNumber ? `
                <div class="tracking-info">
                  <h4>📍 Spårningsinformation</h4>
                  <p><strong>Spårningsnummer:</strong> ${orderData.trackingNumber}</p>
                  ${orderData.carrier ? `<p><strong>Transportör:</strong> ${orderData.carrier}</p>` : ''}
                  <a href="https://www.postnord.se/verktyg/spara/spara-brev-och-paket" class="button">Spåra ditt paket</a>
                </div>
                ` : ''}
              </div>
              
              <h3>📅 Vad händer nu?</h3>
              <p>Din order kommer att levereras inom <strong>1-3 arbetsdagar</strong>.</p>
              
              <h3>📞 Behöver du hjälp?</h3>
              <p>Kontakta oss gärna:</p>
              <ul>
                <li>📧 Email: <a href="mailto:info@b8shield.com">info@b8shield.com</a></li>
                <li>📱 Telefon: +46 XX XXX XX XX</li>
                <li>🌐 Hemsida: <a href="https://b8shield.com">www.b8shield.com</a></li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Tack för att du valde B8Shield!<br>
              <strong>B8Shield Team</strong></p>
              <p><small>Detta är ett automatiskt meddelande. Svara inte på detta email.</small></p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  };
  
  return templates[status] || templates.processing;
};

// CUSTOMIZATION EXAMPLES:

// 1. ADD COMPANY LOGO:
// In HTML template, add: <img src="https://yourdomain.com/logo.png" alt="B8Shield Logo" style="max-width: 200px;">

// 2. CHANGE COLORS:
// Update the CSS variables in the <style> section

// 3. ADD TRACKING LINKS:
// For PostNord: https://www.postnord.se/verktyg/spara/spara-brev-och-paket
// For DHL: https://www.dhl.com/tracking
// For UPS: https://www.ups.com/track

// 4. ADD PERSONALIZATION:
// Use userData.companyName, userData.contactPerson, etc.

// 5. ADD ORDER ITEMS:
// Access orderData.antalForpackningar, orderData.color, orderData.size, etc.

// 6. ADD CONDITIONAL CONTENT:
// Use ${condition ? 'show this' : 'or this'} syntax 