"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.createTransporter = exports.EMAIL_FROM = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const nodemailer = __importStar(require("nodemailer"));
const params_1 = require("firebase-functions/params");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
// Runtime configuration parameters
const smtpHost = (0, params_1.defineString)('SMTP_HOST', { default: 'send.one.com' });
const smtpPort = (0, params_1.defineString)('SMTP_PORT', { default: '587' });
const smtpUser = (0, params_1.defineString)('SMTP_USER', { default: 'info@jphinnovation.se' });
const smtpPass = (0, params_1.defineString)('SMTP_PASS');
// Initialize Firestore with named database
exports.db = (0, firestore_1.getFirestore)('b8s-reseller-db');
exports.db.settings({ ignoreUndefinedProperties: true });
// Email constants
exports.EMAIL_FROM = {
    b2b: '"B8Shield Återförsäljarportal" <info@jphinnovation.se>',
    affiliate: '"B8Shield Affiliate Program" <info@jphinnovation.se>',
    b2c: '"B8Shield Shop" <info@jphinnovation.se>',
    system: '"B8Shield System" <info@jphinnovation.se>',
    support: '"B8Shield Support" <info@jphinnovation.se>'
};
// Initialize nodemailer transporter
const createTransporter = () => nodemailer.createTransport({
    host: smtpHost.value(),
    port: parseInt(smtpPort.value()),
    secure: false,
    auth: {
        user: smtpUser.value(),
        pass: smtpPass.value()
    }
});
exports.createTransporter = createTransporter;
// Core email sending function
const sendEmail = async (emailData) => {
    try {
        const transporter = (0, exports.createTransporter)();
        const mailOptions = {
            from: emailData.from || exports.EMAIL_FROM.system,
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text
        };
        await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error('Error sending email:', error instanceof Error ? error.message : 'Unknown error');
        throw new Error('Failed to send email');
    }
};
exports.sendEmail = sendEmail;
//# sourceMappingURL=email-handler.js.map