"use strict";
// Simple, working One.com SMTP configuration
// Based on successful local test: Config 1: Port 587 with STARTTLS
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_EMAILS = exports.EMAIL_FROM = exports.SMTP_CONFIG = void 0;
exports.SMTP_CONFIG = {
    host: 'send.one.com',
    port: 587,
    secure: false,
    auth: {
        user: 'info@jphinnovation.se',
        pass: 'cuteSe@l54'
    }
};
exports.EMAIL_FROM = {
    system: '"B8Shield System" <info@jphinnovation.se>',
    affiliate: '"B8Shield Affiliate Program" <info@jphinnovation.se>',
    b2c: '"B8Shield Shop" <info@jphinnovation.se>',
    b2b: '"B8Shield Återförsäljarportal" <info@jphinnovation.se>',
    support: '"B8Shield Support" <info@jphinnovation.se>'
};
exports.ADMIN_EMAILS = 'info@jphinnovation.se, micke.ohlen@gmail.com';
//# sourceMappingURL=smtp-config.js.map