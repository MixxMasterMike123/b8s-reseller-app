"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmail = void 0;
function getEmail(type, lang = 'sv-SE', data) {
    switch (type) {
        case 'welcomeCredentials':
            const { customerData, temporaryPassword, isResend } = data;
            return {
                subject: isResend ? 'Nya inloggningsuppgifter till B8Shield' : 'Välkommen till B8Shield',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #459CA8;">${isResend ? 'Nya inloggningsuppgifter' : 'Välkommen till B8Shield'}</h1>
            
            ${isResend ? `
              <p>Här kommer dina nya inloggningsuppgifter till B8Shield portalen.</p>
            ` : `
              <p>Välkommen till B8Shield! Vi är glada att ha dig som kund.</p>
              <p>Här kommer dina inloggningsuppgifter till B8Shield portalen.</p>
            `}

            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>E-post:</strong> ${customerData.email}</p>
              <p><strong>Lösenord:</strong> ${temporaryPassword}</p>
            </div>

            <p><strong>Viktigt:</strong> Av säkerhetsskäl ber vi dig byta lösenord vid första inloggningen.</p>

            <p>Logga in på: <a href="https://partner.b8shield.com" style="color: #459CA8;">partner.b8shield.com</a></p>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
              <p>Om du har några frågor, kontakta oss på:</p>
              <p>E-post: <a href="mailto:info@jphinnovation.se" style="color: #459CA8;">info@jphinnovation.se</a></p>
              <p>Telefon: <a href="tel:+46701234567" style="color: #459CA8;">070-123 45 67</a></p>
            </div>
          </div>
        `
            };
        // Add other email templates here
        default:
            throw new Error(`Unknown email template type: ${type}`);
    }
}
exports.getEmail = getEmail;
//# sourceMappingURL=email-templates.js.map