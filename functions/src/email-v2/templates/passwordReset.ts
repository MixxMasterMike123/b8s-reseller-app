// Password reset email template
export interface PasswordResetData {
  email: string;
  resetCode: string;
  userAgent?: string;
  timestamp?: string;
}

export function getPasswordResetTemplate(data: PasswordResetData, lang: string = 'sv-SE') {
  const templates = {
    'sv-SE': {
      subject: 'Återställ ditt lösenord - B8Shield',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #459CA8; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">B8Shield</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">Återställ ditt lösenord</h2>
            <p>Du har begärt att återställa ditt lösenord för ditt B8Shield-konto.</p>
            <p><strong>Återställningskod:</strong> <code style="background: #eee; padding: 5px; font-size: 18px;">${data.resetCode}</code></p>
            <p>Använd denna kod för att återställa ditt lösenord. Koden är giltig i 1 timme.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              Begäran gjord: ${data.timestamp || new Date().toLocaleString('sv-SE')}<br>
              Enhet: ${data.userAgent || 'Okänd'}
            </p>
          </div>
        </div>
      `
    },
    'en-GB': {
      subject: 'Reset your password - B8Shield',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #459CA8; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">B8Shield</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">Reset your password</h2>
            <p>You have requested to reset your password for your B8Shield account.</p>
            <p><strong>Reset code:</strong> <code style="background: #eee; padding: 5px; font-size: 18px;">${data.resetCode}</code></p>
            <p>Use this code to reset your password. The code is valid for 1 hour.</p>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              Request made: ${data.timestamp || new Date().toISOString()}<br>
              Device: ${data.userAgent || 'Unknown'}
            </p>
          </div>
        </div>
      `
    }
  };

  const template = templates[lang as keyof typeof templates] || templates['sv-SE'];
  return {
    subject: template.subject,
    html: template.html
  };
}

