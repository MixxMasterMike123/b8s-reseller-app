"use strict";
// TEMPORARY: Gmail SMTP configuration due to One.com blocking programmatic access
// Gmail SMTP with TLS on port 587
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_EMAILS = exports.EMAIL_FROM = exports.SMTP_CONFIG = void 0;
exports.SMTP_CONFIG = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'b8shield.reseller@gmail.com',
        pass: 'rcfaridkvgluhzom'
    }
};
exports.EMAIL_FROM = {
    system: '"B8Shield System" <b8shield.reseller@gmail.com>',
    affiliate: '"B8Shield Affiliate Program" <b8shield.reseller@gmail.com>',
    b2c: '"B8Shield Shop" <b8shield.reseller@gmail.com>',
    b2b: '"B8Shield Återförsäljarportal" <b8shield.reseller@gmail.com>',
    support: '"B8Shield Support" <b8shield.reseller@gmail.com>'
};
exports.ADMIN_EMAILS = 'info@jphinnovation.se, micke.ohlen@gmail.com';
//# sourceMappingURL=smtp-config.js.map